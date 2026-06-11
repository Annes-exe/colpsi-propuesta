import { z } from 'zod'

// ─── Auth Schemas ─────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  username: z
    .string()
    .min(3, 'El nombre de usuario debe tener al menos 3 caracteres')
    .max(30, 'Máximo 30 caracteres')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Solo se permiten letras, números, guiones y puntos'),
  email: z
    .string()
    .min(1, 'El correo es obligatorio')
    .email('Ingresa un correo electrónico válido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

export const registerSchema = loginSchema
  .extend({
    fullName: z
      .string()
      .min(2, 'El nombre completo debe tener al menos 2 caracteres')
      .max(100),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>

// ─── Agremiado Schemas ────────────────────────────────────────────────────────

export const agreimadoSchema = z.object({
  cedula: z
    .string()
    .min(6, 'La cédula debe tener al menos 6 dígitos')
    .max(15)
    .regex(/^[VEJvej]?-?\d{6,9}$/, 'Formato: V-12345678 o solo números'),
  fpv: z
    .string()
    .min(4, 'El FPV debe tener al menos 4 caracteres')
    .max(20),
  nombres: z
    .string()
    .min(2, 'Los nombres son obligatorios')
    .max(100),
  apellidos: z
    .string()
    .min(2, 'Los apellidos son obligatorios')
    .max(100),
  correo: z
    .string()
    .email('Ingresa un correo válido')
    .optional()
    .or(z.literal('')),
  telefono: z
    .string()
    .regex(/^[\d\s\-\+\(\)]{7,20}$/, 'Número de teléfono inválido')
    .optional()
    .or(z.literal('')),
  fecha_inscripcion: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha: YYYY-MM-DD'),
  fecha_recepcion_titulo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha: YYYY-MM-DD')
    .optional()
    .or(z.literal(''))
    .or(z.null()),
})

export type AgreimadoInput = z.infer<typeof agreimadoSchema>

// ─── Pago Schemas ─────────────────────────────────────────────────────────────

export const pagoSchema = z.object({
  agremiado_id: z.string().uuid('ID de agremiado inválido'),
  fecha_pago: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha: YYYY-MM-DD'),
  monto_ves: z
    .number({ error: 'Monto VES inválido' })
    .positive('El monto debe ser mayor a 0'),
  tasa_cambio: z
    .number({ error: 'Tasa de cambio inválida' })
    .positive('La tasa de cambio debe ser mayor a 0'),
  referencia: z
    .string()
    .min(4, 'La referencia debe tener al menos 4 caracteres')
    .max(100),
  metodo_pago: z.enum(['transferencia', 'pago_movil', 'efectivo_usd', 'zelle', 'otro']),
  notas: z.string().max(500).optional(),
  tipo_pago: z.enum(['solvencia', 'inscripcion', 'custodia', 'carnet']),
  anios_correspondientes: z
    .array(z.number().int().min(2023).max(2099)),
  meses_custodia: z
    .array(z.string()),
}).refine((data) => {
  if (data.tipo_pago === 'solvencia') {
    return data.anios_correspondientes.length > 0
  }
  if (data.tipo_pago === 'custodia') {
    return data.meses_custodia.length > 0
  }
  return true
}, {
  message: 'Debes seleccionar los períodos correspondientes al tipo de pago',
  path: ['anios_correspondientes'],
})

export type PagoInput = z.infer<typeof pagoSchema>

// ─── Webhook Schema (PHP → Next.js) ──────────────────────────────────────────

export const webhookPhpSchema = z.object({
  cedula: z.string().min(6).max(15),
  fpv: z.string().min(4).max(20),
  nombres: z.string().min(2).max(100),
  apellidos: z.string().min(2).max(100),
  correo: z.string().email().optional().or(z.literal('')),
  telefono: z.string().optional().or(z.literal('')),
  fecha_inscripcion: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
})

export type WebhookPhpPayload = z.infer<typeof webhookPhpSchema>
