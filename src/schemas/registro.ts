import { z } from 'zod'

export const registroPublicoSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  apellido: z.string().min(2, 'El apellido debe tener al menos 2 caracteres').max(100),
  cedula: z.string()
    .min(6, 'La cédula debe tener al menos 6 dígitos')
    .max(15)
    .regex(/^[VEJvej]?-?\d{6,9}$/, 'Formato: V-12345678 o solo números'),
  correo: z.string().email('Ingresa un correo electrónico válido'),
  direccion: z.string().min(10, 'La dirección debe tener al menos 10 caracteres'),
  numero_fpv: z.string().optional().or(z.literal('')),
  colegio_pertenece: z.string().min(2, 'Debe indicar a qué colegio pertenece'),
  
  // Archivos (Simulados con placeholders estéticos)
  foto_carnet: z.string().min(1, 'La foto de carnet es obligatoria (simulada)'),
  planilla_fpv: z.string().min(1, 'La planilla FPV es obligatoria (simulada)'),
  cedula_digitalizada: z.string().min(1, 'La cédula digitalizada es obligatoria (simulada)'),
  rif_digitalizado: z.string().min(1, 'El RIF digitalizado es obligatorio (simulada)'),
  titulo_graduacion: z.string().min(1, 'El título de graduación es obligatorio (simulado)'),
  comprobante_pago: z.string().min(1, 'El comprobante de pago es obligatorio (simulado)'),
  
  // Datos de Pago
  fecha_pago: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha: YYYY-MM-DD'),
  metodo_pago: z.enum([
    'Transferencia Bancaria',
    'Pago Móvil',
    'Efectivo',
    'Punto de venta'
  ], { message: 'Selecciona un método de pago válido' }),
  concepto_pago: z.enum([
    '50$ inscripción y solvencia egresados 2026',
    '70$ inscripción y solvencia egresados 2025',
    '90$ inscripción y solvencia egresados 2024',
    '110$ inscripción y solvencia egresados 2023 y años anteriores',
    '20$ Solvencia 2026',
    '40$ Solvencia 2025',
    '60$ Solvencia 2024',
    '80$ Solvencia 2023'
  ], { message: 'Selecciona un concepto de pago válido' }),
  referencia_bancaria: z.string().min(4, 'Ingresa el número de referencia o detalles de la transacción'),
})

export type RegistroPublicoInput = z.infer<typeof registroPublicoSchema>
