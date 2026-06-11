'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { pagoSchema, type PagoInput } from '@/lib/validations/schemas'
import { convertirVESaUSD } from '@/hooks/useCalculadoraDeuda'
import type { PagoInsert, SolvenciaInsert } from '@/types/database.types'

// ─── Response Shape ───────────────────────────────────────────────────────────

export interface ActionResult {
  success: boolean
  error?: string
  pagoId?: string
}

// ─── Server Action ────────────────────────────────────────────────────────────

/**
 * registrarPago
 *
 * Procesa la inserción transaccional de un nuevo pago:
 *   1. Valida el payload con Zod.
 *   2. Verifica sesión autenticada.
 *   3. Inserta en `pagos` via service client (bypass RLS controlado).
 *   4. Obtiene el pago_id e inserta registros en `solvencias_anuales`.
 *   5. Rollback manual si el paso 4 falla.
 *   6. Invalida la caché del agremiado.
 */
export async function registrarPago(rawData: PagoInput): Promise<ActionResult> {
  // ── 1. Validación Zod ──────────────────────────────────────────────────────
  const parsed = pagoSchema.safeParse(rawData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Datos inválidos'
    return { success: false, error: firstError }
  }

  const data = parsed.data

  // Saneamiento estricto: forzar tipos numéricos (float)
  const montoVesFloat = parseFloat(String(data.monto_ves))
  const tasaCambioFloat = parseFloat(String(data.tasa_cambio))
  
  if (isNaN(montoVesFloat) || montoVesFloat <= 0) {
    return { success: false, error: 'El monto en Bolívares (VES) debe ser un número positivo.' }
  }
  if (isNaN(tasaCambioFloat) || tasaCambioFloat <= 0) {
    return { success: false, error: 'La tasa de cambio debe ser un número positivo.' }
  }

  const calculoUSD = convertirVESaUSD(montoVesFloat, tasaCambioFloat)
  const montoUsdFloat = parseFloat(calculoUSD.toFixed(2))

  // ── 2. Verificar sesión activa ─────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autorizado. Inicia sesión nuevamente.' }
  }

  // Usamos el service client para las inserciones (evita restricciones RLS en
  // operaciones de escritura admin — solo en contexto server-side de confianza)
  const db = createServiceClient()

  // ── 3. Insertar pago ───────────────────────────────────────────────────────
  const pagoPayload: PagoInsert = {
    agremiado_id: data.agremiado_id,
    fecha_pago: data.fecha_pago,
    monto_ves: montoVesFloat,
    tasa_cambio: tasaCambioFloat,
    referencia: data.referencia.trim(),
    metodo_pago: data.metodo_pago,
    notas: data.notas?.trim() || null,
    tipo_pago: data.tipo_pago,
    meses_custodia: data.meses_custodia,
  }

  const { data: pago, error: pagoError } = await db
    .from('pagos')
    .insert(pagoPayload)
    .select('id')
    .single()

  if (pagoError || !pago) {
    console.error('[registrarPago] Error insertando pago en Supabase:', pagoError)
    if (pagoError?.code === '23505') {
      return { success: false, error: 'Ya existe un pago con ese número de referencia.' }
    }
    const msgError = pagoError
      ? `${pagoError.message} (Código: ${pagoError.code}, Detalles: ${pagoError.details || 'Ninguno'})`
      : 'No se recibió el ID del pago insertado.'
    return { success: false, error: `Error en base de datos al registrar pago: ${msgError}` }
  }

  // ── 4. Insertar solvencias anuales ─────────────────────────────────────────
  if (data.tipo_pago === 'solvencia' && data.anios_correspondientes.length > 0) {
    const solvenciasPayload: SolvenciaInsert[] = data.anios_correspondientes.map((anio) => ({
      agremiado_id: data.agremiado_id,
      pago_id: pago.id,
      anio_correspondiente: anio,
    }))

    const { error: solvenciasError } = await db
      .from('solvencias_anuales')
      .insert(solvenciasPayload)

    if (solvenciasError) {
      console.error('[registrarPago] Error insertando solvencias en Supabase:', solvenciasError)
      // Rollback manual: eliminar el pago para mantener consistencia
      const rollback = await db.from('pagos').delete().eq('id', pago.id)
      if (rollback.error) {
        console.error('[registrarPago] Error en rollback al borrar pago:', rollback.error)
      }

      if (solvenciasError.code === '23505') {
        return {
          success: false,
          error: 'Uno o más años seleccionados ya tienen solvencia registrada.',
        }
      }
      const msgError = `${solvenciasError.message} (Código: ${solvenciasError.code}, Detalles: ${solvenciasError.details || 'Ninguno'})`
      return { success: false, error: `Error en base de datos al registrar solvencias: ${msgError}. El pago fue revertido.` }
    }
  }

  // ── 5. Invalidar caché ─────────────────────────────────────────────────────
  revalidatePath(`/dashboard/agremiados/${data.agremiado_id}`)
  revalidatePath('/dashboard/agremiados')
  revalidatePath('/dashboard')

  return { success: true, pagoId: pago.id }
}

// ─── Tasa BCV (DolarApi) ──────────────────────────────────────────────────────

// Estructura del JSON que devuelve la API para Venezuela
interface DolarApiResponse {
  moneda: string;
  nombre: string;
  compra: number;
  venta: number;
  promedio: number; // Este es el valor que nos interesa
  fechaActualizacion: string;
}

/**
 * formatearFechaTasa
 *
 * Convierte una fecha ISO "YYYY-MM-DD..." a formato legible "DD/MM/YYYY".
 */
function formatearFechaTasa(fechaIso: string): string {
  try {
    const datePart = fechaIso.split('T')[0]
    const parts = datePart?.split('-')
    if (parts && parts.length === 3) {
      const [y, m, d] = parts
      return `${d}/${m}/${y}`
    }
  } catch (e) {
    console.error("Error al formatear fecha de tasa:", e)
  }
  return ''
}

/**
 * obtenerTasaBCV
 *
 * Consume el endpoint oficial de DolarAPI para Venezuela.
 * Configura la revalidación cada hora para evitar saturación de la API.
 */
export async function obtenerTasaBCV(): Promise<{ promedio: number; fechaActualizacion: string } | null> {
  try {
    const respuesta = await fetch("https://ve.dolarapi.com/v1/dolares/oficial", {
      next: { revalidate: 3600 }
    });

    if (!respuesta.ok) {
      throw new Error("Error al consultar DolarAPI");
    }

    const data: DolarApiResponse = await respuesta.json();
    return {
      promedio: data.promedio,
      fechaActualizacion: data.fechaActualizacion
    };
  } catch (error) {
    console.error("Error en el fetch de la tasa cambiaria:", error);
    return null;
  }
}

/**
 * obtenerTasaBCVHistorico
 *
 * Consulta la tasa histórica oficial del BCV para una fecha específica (formato YYYY-MM-DD).
 */
export async function obtenerTasaBCVHistorico(fecha: string): Promise<{ promedio: number; fechaActualizacion: string } | null> {
  try {
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null
    const [anio, mes, dia] = fecha.split('-')
    const url = `https://ve.dolarapi.com/v1/historicos/dolares/${anio}/${mes}/${dia}`
    
    const respuesta = await fetch(url, {
      next: { revalidate: 3600 }
    })

    if (!respuesta.ok) {
      throw new Error(`Error en DolarAPI histórico: ${respuesta.status}`)
    }

    const data = await respuesta.json()
    
    if (Array.isArray(data)) {
      const oficial = data.find(
        (x: any) => x.fuente?.toLowerCase() === 'oficial' || x.moneda?.toLowerCase() === 'oficial'
      )
      if (oficial) {
        return {
          promedio: oficial.promedio,
          fechaActualizacion: oficial.fechaActualizacion || fecha
        }
      }
      if (data[0]) {
        return {
          promedio: data[0].promedio,
          fechaActualizacion: data[0].fechaActualizacion || fecha
        }
      }
    } else if (data && typeof data === 'object') {
      return {
        promedio: data.promedio,
        fechaActualizacion: data.fechaActualizacion || fecha
      }
    }
    return null
  } catch (error) {
    console.error(`Error en fetch de tasa histórica para ${fecha}:`, error)
    return null
  }
}

/**
 * fetchTasaBCV
 *
 * Wrapper que intenta usar obtenerTasaBCVHistorico(fecha) y cae en la tasa actual o simulación si falla.
 */
export async function fetchTasaBCV(fecha: string): Promise<{ tasa: number; fuente: string }> {
  // 1. Intentar tasa histórica
  const histInfo = await obtenerTasaBCVHistorico(fecha)
  if (histInfo !== null) {
    const fechaFormateada = formatearFechaTasa(histInfo.fechaActualizacion)
    const fuente = `Histórica BCV del ${fechaFormateada || fecha}`
    return { tasa: histInfo.promedio, fuente }
  }

  // 2. Fallback a tasa actual
  const tasaInfo = await obtenerTasaBCV()
  if (tasaInfo !== null) {
    const fechaFormateada = formatearFechaTasa(tasaInfo.fechaActualizacion)
    const fuente = fechaFormateada
      ? `Oficial BCV del ${fechaFormateada}`
      : 'Oficial BCV'
    return { tasa: tasaInfo.promedio, fuente }
  }

  // 3. Fallback final simulado
  const seed = new Date(fecha).getDate()
  const tasa = Math.round((36 + (seed % 5) * 0.1) * 100) / 100
  return { tasa, fuente: 'BCV (Simulada por fallo de API)' }
}


