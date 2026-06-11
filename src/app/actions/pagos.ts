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
  const montoUSD = convertirVESaUSD(data.monto_ves, data.tasa_cambio)

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
    monto_ves: data.monto_ves,
    tasa_cambio: data.tasa_cambio,
    monto_usd: montoUSD,
    referencia: data.referencia,
    metodo_pago: data.metodo_pago,
    notas: data.notas ?? null,
  }

  const { data: pago, error: pagoError } = await db
    .from('pagos')
    .insert(pagoPayload)
    .select('id')
    .single()

  if (pagoError || !pago) {
    console.error('[registrarPago] Error insertando pago:', pagoError)
    if (pagoError?.code === '23505') {
      return { success: false, error: 'Ya existe un pago con ese número de referencia.' }
    }
    return { success: false, error: 'Error al registrar el pago. Intente nuevamente.' }
  }

  // ── 4. Insertar solvencias anuales ─────────────────────────────────────────
  const solvenciasPayload: SolvenciaInsert[] = data.anios_correspondientes.map((anio) => ({
    agremiado_id: data.agremiado_id,
    pago_id: pago.id,
    anio_correspondiente: anio,
  }))

  const { error: solvenciasError } = await db
    .from('solvencias_anuales')
    .insert(solvenciasPayload)

  if (solvenciasError) {
    console.error('[registrarPago] Error insertando solvencias:', solvenciasError)
    // Rollback manual: eliminar el pago para mantener consistencia
    await db.from('pagos').delete().eq('id', pago.id)

    if (solvenciasError.code === '23505') {
      return {
        success: false,
        error: 'Uno o más años seleccionados ya tienen solvencia registrada.',
      }
    }
    return { success: false, error: 'Error al registrar las solvencias. El pago fue revertido.' }
  }

  // ── 5. Invalidar caché ─────────────────────────────────────────────────────
  revalidatePath(`/dashboard/agremiados/${data.agremiado_id}`)
  revalidatePath('/dashboard/agremiados')
  revalidatePath('/dashboard')

  return { success: true, pagoId: pago.id }
}

// ─── Mock de Tasa BCV ─────────────────────────────────────────────────────────

/**
 * fetchTasaBCV
 *
 * Obtiene la tasa de cambio BCV para una fecha dada.
 * Actualmente retorna un valor simulado.
 * TODO: Integrar con https://pydolarve.org/api/v1/dollar?page=bcv
 */
export async function fetchTasaBCV(fecha: string): Promise<{ tasa: number; fuente: string }> {
  void fecha
  const seed = new Date(fecha).getDate()
  const tasa = Math.round((36 + (seed % 5) * 0.1) * 100) / 100
  return { tasa, fuente: 'Mock BCV (pendiente integración real)' }
}

export type { PagoInput }
