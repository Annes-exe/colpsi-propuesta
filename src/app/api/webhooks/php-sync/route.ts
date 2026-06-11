import { NextRequest, NextResponse } from 'next/server'
import { webhookPhpSchema } from '@/lib/validations/schemas'
import { createServiceClient } from '@/lib/supabase/server'
import type { AgreiadoInsert } from '@/types/database.types'

/**
 * POST /api/webhooks/php-sync
 *
 * Endpoint de integración para recibir nuevos agremiados desde el portal PHP.
 * Autenticación: API Key en header `x-webhook-secret`.
 * Operación: UPSERT por cédula (no duplica, actualiza si ya existe).
 *
 * Payload esperado:
 * {
 *   "cedula": "V-12345678",
 *   "fpv": "PSI-001234",
 *   "nombres": "Juan Carlos",
 *   "apellidos": "Pérez García",
 *   "correo": "jperez@ejemplo.com",      // opcional
 *   "telefono": "+58 424 1234567",        // opcional
 *   "fecha_inscripcion": "2024-03-15"
 * }
 */
export async function POST(request: NextRequest) {
  // ── 1. Validar API Key ────────────────────────────────────────────────────
  const apiKey = request.headers.get('x-webhook-secret')
  const expectedKey = process.env.WEBHOOK_SECRET

  if (!expectedKey) {
    console.error('[webhook] WEBHOOK_SECRET no configurado en variables de entorno')
    return NextResponse.json(
      { success: false, error: 'Configuración del servidor incompleta' },
      { status: 500 }
    )
  }

  if (!apiKey || apiKey !== expectedKey) {
    console.warn('[webhook] Intento de acceso no autorizado — IP:', request.headers.get('x-forwarded-for'))
    return NextResponse.json(
      { success: false, error: 'No autorizado' },
      { status: 401 }
    )
  }

  // ── 2. Parsear y validar body ─────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Payload JSON inválido' },
      { status: 400 }
    )
  }

  const parsed = webhookPhpSchema.safeParse(body)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`)
    return NextResponse.json(
      { success: false, error: 'Datos inválidos', details: errors },
      { status: 422 }
    )
  }

  const payload = parsed.data

  // ── 3. Insertar / actualizar en Supabase ──────────────────────────────────
  try {
    const supabase = createServiceClient()

    const insertData: Omit<AgreiadoInsert, 'id' | 'created_at'> = {
      cedula: payload.cedula.toUpperCase(),
      fpv: payload.fpv.toUpperCase(),
      nombres: payload.nombres.trim(),
      apellidos: payload.apellidos.trim(),
      correo: payload.correo?.toLowerCase() || null,
      telefono: payload.telefono?.trim() || null,
      fecha_inscripcion: payload.fecha_inscripcion,
      updated_at: new Date().toISOString(),
    }

    const upsertResult = await (supabase as any)
      .from('agremiados')
      .upsert(insertData, {
        onConflict: 'cedula',
        ignoreDuplicates: false,
      })
      .select('id, cedula, fpv')
      .single() as { data: { id: string; cedula: string; fpv: string } | null; error: { code: string; message: string } | null }

    const { data, error } = upsertResult

    if (error) {
      console.error('[webhook] Error Supabase:', error.message)

      // Detectar conflicto de FPV duplicado
      if (error.code === '23505' && error.message.includes('fpv')) {
        return NextResponse.json(
          { success: false, error: 'El FPV ya está registrado para otro agremiado', code: 'FPV_CONFLICT' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { success: false, error: 'Error al guardar el registro' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'No se pudo recuperar el registro insertado' },
        { status: 500 }
      )
    }

    console.info(`[webhook] Agremiado sincronizado — cédula: ${data.cedula} | id: ${data.id}`)

    return NextResponse.json(
      {
        success: true,
        message: 'Agremiado registrado/actualizado exitosamente',
        data: {
          id: data.id,
          cedula: data.cedula,
          fpv: data.fpv,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[webhook] Error inesperado:', err)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/webhooks/php-sync
 * Health check — permite verificar que el endpoint está activo
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'php-sync webhook',
    version: '1.0',
    timestamp: new Date().toISOString(),
  })
}
