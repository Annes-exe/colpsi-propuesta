'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { registroPublicoSchema } from '@/schemas/registro'
import { fetchTasaBCV } from '@/app/actions/pagos'
import type { PagoInsert } from '@/types/database.types'

export interface ActionResponse {
  success: boolean
  error?: string
  message?: string
}

const BUCKET_NAME = 'documentos_agremiados'

// Metodo de pago mapper to DB constraints: 'transferencia', 'pago_movil', 'efectivo_usd', 'zelle', 'otro'
const MAP_METODO_PAGO: Record<string, 'transferencia' | 'pago_movil' | 'efectivo_usd' | 'zelle' | 'otro'> = {
  'Transferencia Bancaria': 'transferencia',
  'Pago Móvil': 'pago_movil',
  'Efectivo': 'efectivo_usd',
  'Punto de venta': 'otro'
}

/**
 * Server Action to handle public self-registration.
 */
export async function registrarAgremiadoPublico(formData: FormData): Promise<ActionResponse> {
  try {
    // 1. Reconstruct data from FormData for Zod validation
    const rawData = {
      nombre: formData.get('nombre'),
      apellido: formData.get('apellido'),
      cedula: formData.get('cedula'),
      correo: formData.get('correo'),
      direccion: formData.get('direccion'),
      numero_fpv: formData.get('numero_fpv'),
      colegio_pertenece: formData.get('colegio_pertenece'),
      
      // Files
      foto_carnet: formData.get('foto_carnet'),
      planilla_fpv: formData.get('planilla_fpv'),
      cedula_digitalizada: formData.get('cedula_digitalizada'),
      rif_digitalizado: formData.get('rif_digitalizado'),
      titulo_graduacion: formData.get('titulo_graduacion'),
      comprobante_pago: formData.get('comprobante_pago'),
      
      // Payment Info
      fecha_pago: formData.get('fecha_pago'),
      metodo_pago: formData.get('metodo_pago'),
      concepto_pago: formData.get('concepto_pago'),
      referencia_bancaria: formData.get('referencia_bancaria'),
    }

    const parsed = registroPublicoSchema.safeParse(rawData)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Datos de formulario inválidos'
      return { success: false, error: firstError }
    }

    const data = parsed.data
    const cleanCedula = data.cedula.trim()

    // 2. Initialize Supabase Service Role Client to bypass public RLS restrictions
    const db = createServiceClient()

    // Verify if agremiado already exists by Cédula
    const { data: existingAgremiado, error: checkError } = await db
      .from('agremiados')
      .select('id')
      .eq('cedula', cleanCedula)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing member:', checkError)
      return { success: false, error: 'Error al verificar disponibilidad de Cédula.' }
    }

    if (existingAgremiado) {
      return { success: false, error: 'Esta cédula ya se encuentra registrada en el sistema.' }
    }

    // 3. Upload files to Supabase Storage Documents bucket
    const fileFields = [
      { key: 'foto_carnet', file: data.foto_carnet as File },
      { key: 'planilla_fpv', file: data.planilla_fpv as File },
      { key: 'cedula_digitalizada', file: data.cedula_digitalizada as File },
      { key: 'rif_digitalizado', file: data.rif_digitalizado as File },
      { key: 'titulo_graduacion', file: data.titulo_graduacion as File },
      { key: 'comprobante_pago', file: data.comprobante_pago as File },
    ]

    const urls: Record<string, string> = {}

    for (const field of fileFields) {
      const file = field.file
      const fileExt = file.name.split('.').pop() || 'pdf'
      const filePath = `${cleanCedula}/${field.key}_${Date.now()}.${fileExt}`

      const fileBuffer = await file.arrayBuffer()
      const { error: uploadError } = await db.storage
        .from(BUCKET_NAME)
        .upload(filePath, Buffer.from(fileBuffer), {
          contentType: file.type,
          upsert: true
        })

      if (uploadError) {
        console.error(`Error uploading ${field.key}:`, uploadError)
        return { success: false, error: `Error al subir el archivo: ${field.key}. Inténtelo de nuevo.` }
      }

      // Get public URL
      const { data: publicUrlData } = db.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath)

      urls[field.key] = publicUrlData.publicUrl
    }

    // 4. Calculate Payment amounts in VES using historical BCV rate
    let amountUsd = 0
    if (data.concepto_pago.includes('50$')) amountUsd = 50
    else if (data.concepto_pago.includes('70$')) amountUsd = 70
    else if (data.concepto_pago.includes('90$')) amountUsd = 90
    else if (data.concepto_pago.includes('110$')) amountUsd = 110
    else if (data.concepto_pago.includes('20$')) amountUsd = 20
    else if (data.concepto_pago.includes('40$')) amountUsd = 40
    else if (data.concepto_pago.includes('60$')) amountUsd = 60
    else if (data.concepto_pago.includes('80$')) amountUsd = 80

    const { tasa } = await fetchTasaBCV(data.fecha_pago)
    const montoVes = amountUsd * tasa

    // 5. Insert new Agremiado record
    // Since FPV unique key is mandatory in database, if they don't provide one,
    // we prefix 'PENDIENTE-' + Cédula to keep constraints unique and clean.
    const cleanFpv = data.numero_fpv?.trim() 
      ? data.numero_fpv.trim() 
      : `PENDIENTE-${cleanCedula}`

    const { data: newAgremiado, error: agremiadoError } = await db
      .from('agremiados')
      .insert({
        cedula: cleanCedula,
        fpv: cleanFpv,
        nombres: data.nombre.trim(),
        apellidos: data.apellido.trim(),
        correo: data.correo.trim(),
        fecha_inscripcion: new Date().toISOString().split('T')[0]
      })
      .select('id')
      .single()

    if (agremiadoError || !newAgremiado) {
      console.error('Error creating agremiado:', agremiadoError)
      if (agremiadoError?.code === '23505') {
        return { success: false, error: 'El número de Cédula o FPV ingresado ya existe.' }
      }
      return { success: false, error: 'Error al registrar los datos personales en la base de datos.' }
    }

    // 6. Insert Payment record linked to the member
    const isInscription = data.concepto_pago.toLowerCase().includes('inscripción') || data.concepto_pago.toLowerCase().includes('inscripcion')
    const mappedMetodo = MAP_METODO_PAGO[data.metodo_pago] || 'otro'

    const notasStr = `Registro Público Inicial\n` +
      `Concepto: ${data.concepto_pago}\n` +
      `Colegio: ${data.colegio_pertenece}\n` +
      `Dirección: ${data.direccion}\n\n` +
      `Documentos Adjuntos:\n` +
      `- Foto Carnet: ${urls.foto_carnet}\n` +
      `- Planilla FPV: ${urls.planilla_fpv}\n` +
      `- Cédula Digitalizada: ${urls.cedula_digitalizada}\n` +
      `- RIF Digitalizado: ${urls.rif_digitalizado}\n` +
      `- Título Profesional: ${urls.titulo_graduacion}\n` +
      `- Comprobante de Pago: ${urls.comprobante_pago}`

    const pagoPayload: PagoInsert = {
      agremiado_id: newAgremiado.id,
      fecha_pago: data.fecha_pago,
      monto_ves: montoVes,
      tasa_cambio: tasa,
      referencia: data.referencia_bancaria.trim(),
      metodo_pago: mappedMetodo,
      tipo_pago: isInscription ? 'inscripcion' : 'solvencia',
      notas: notasStr,
      meses_custodia: []
    }

    const { data: newPago, error: pagoError } = await db
      .from('pagos')
      .insert(pagoPayload)
      .select('id')
      .single()

    if (pagoError || !newPago) {
      console.error('Error creating payment:', pagoError)
      // Attempt rollback of created member
      await db.from('agremiados').delete().eq('id', newAgremiado.id)
      return { success: false, error: 'Error al registrar el pago en el sistema. Registro revertido.' }
    }

    // 7. Auto-create Solvencia Anual if a year is parsed from the concept
    const matches = data.concepto_pago.match(/\b(202\d)\b/)
    const year = matches ? parseInt(matches[1], 10) : null

    if (year && year >= 2010 && year <= 2099) {
      const { error: solvenciaError } = await db
        .from('solvencias_anuales')
        .insert({
          agremiado_id: newAgremiado.id,
          pago_id: newPago.id,
          anio_correspondiente: year
        })

      if (solvenciaError) {
        console.error('Error creating associated annual solvencia:', solvenciaError)
      }
    }

    return { 
      success: true, 
      message: 'Registro recibido con éxito. Su solicitud será revisada por el administrador para la activación de su solvencia.' 
    }
  } catch (err: any) {
    console.error('Unexpected error in registration server action:', err)
    return { success: false, error: 'Ocurrió un error inesperado al procesar su solicitud.' }
  }
}
