'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { agreimadoSchema, type AgreimadoInput } from '@/lib/validations/schemas'

export interface AgremiadoResult {
  success: boolean
  error?: string
  agremiadoId?: string
}

/**
 * registrarAgremiado
 *
 * Server action to safely register a new member after validation and check for duplicates.
 */
export async function registrarAgremiado(rawData: AgreimadoInput): Promise<AgremiadoResult> {
  // 1. Validate input schema with Zod
  const parsed = agreimadoSchema.safeParse(rawData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Datos de agremiado inválidos'
    return { success: false, error: firstError }
  }

  const data = parsed.data

  // 2. Verify authenticated session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autorizado. Por favor inicia sesión nuevamente.' }
  }

  // Use service client to bypass RLS writes securely on server
  const db = createServiceClient()

  try {
    // 3. Search for duplicates (Cédula or FPV)
    const { data: existing, error: searchError } = await db
      .from('agremiados')
      .select('id, cedula, fpv')
      .or(`cedula.eq."${data.cedula}",fpv.eq."${data.fpv}"`)

    if (searchError) {
      console.error('[registrarAgremiado] Error buscando duplicados:', searchError)
      return { 
        success: false, 
        error: `Error al verificar duplicados: ${searchError.message} (Código: ${searchError.code})` 
      }
    }

    if (existing && existing.length > 0) {
      // Find which one is duplicated
      const dup = existing.find(
        (x) => x.cedula.toLowerCase() === data.cedula.toLowerCase()
      )
      if (dup) {
        return { success: false, error: `Ya existe un agremiado registrado con la Cédula: ${data.cedula}` }
      }
      
      const dupFpv = existing.find(
        (x) => x.fpv.toLowerCase() === data.fpv.toLowerCase()
      )
      if (dupFpv) {
        return { success: false, error: `Ya existe un agremiado registrado con el FPV: ${data.fpv}` }
      }
    }

    // 4. Construct payload and insert record
    const payload = {
      cedula: data.cedula.trim(),
      fpv: data.fpv.trim(),
      nombres: data.nombres.trim(),
      apellidos: data.apellidos.trim(),
      correo: data.correo?.trim() || null,
      telefono: data.telefono?.trim() || null,
      fecha_inscripcion: data.fecha_inscripcion,
      fecha_recepcion_titulo: data.fecha_recepcion_titulo || null,
    }

    const { data: inserted, error: insertError } = await db
      .from('agremiados')
      .insert(payload)
      .select('id')
      .single()

    if (insertError || !inserted) {
      console.error('[registrarAgremiado] Error al insertar agremiado:', insertError)
      const errorMsg = insertError 
        ? `${insertError.message} (Código: ${insertError.code})`
        : 'No se retornó el ID del agremiado insertado.'
      return { success: false, error: `Error de base de datos al registrar: ${errorMsg}` }
    }

    // 5. Invalidate client-side caches
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/agremiados')

    return { success: true, agremiadoId: inserted.id }
  } catch (err: any) {
    console.error('[registrarAgremiado] Excepción:', err)
    return { success: false, error: err?.message || 'Error interno del servidor al registrar agremiado.' }
  }
}

/**
 * editarAgremiado
 *
 * Server action to update an existing member's profile.
 */
export async function editarAgremiado(id: string, rawData: AgreimadoInput): Promise<AgremiadoResult> {
  const parsed = agreimadoSchema.safeParse(rawData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Datos de agremiado inválidos'
    return { success: false, error: firstError }
  }

  const data = parsed.data
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autorizado. Por favor inicia sesión nuevamente.' }
  }

  const db = createServiceClient()
  try {
    const payload = {
      cedula: data.cedula.trim(),
      fpv: data.fpv.trim(),
      nombres: data.nombres.trim(),
      apellidos: data.apellidos.trim(),
      correo: data.correo?.trim() || null,
      telefono: data.telefono?.trim() || null,
      fecha_inscripcion: data.fecha_inscripcion,
      fecha_recepcion_titulo: data.fecha_recepcion_titulo || null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await db
      .from('agremiados')
      .update(payload)
      .eq('id', id)

    if (error) {
      console.error('[editarAgremiado] Error al actualizar:', error)
      return { success: false, error: `Error de base de datos al actualizar: ${error.message} (Código: ${error.code})` }
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/agremiados')
    revalidatePath(`/dashboard/agremiados/${id}`)

    return { success: true }
  } catch (err: any) {
    console.error('[editarAgremiado] Excepción:', err)
    return { success: false, error: err?.message || 'Error interno del servidor al editar agremiado.' }
  }
}
