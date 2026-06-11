import { z } from 'zod'

const isClient = typeof window !== 'undefined'

const fileValidation = z.any()
  .refine((val) => {
    if (!val) return false
    if (isClient && val instanceof FileList) return val.length > 0
    if (val instanceof File) return val.name !== '' && val.size > 0
    return false
  }, 'El archivo digitalizado es obligatorio')
  .refine((val) => {
    let file: File | null = null
    if (isClient && val instanceof FileList) file = val[0]
    else if (val instanceof File) file = val
    
    if (!file) return false
    return file.size <= 5 * 1024 * 1024
  }, 'El archivo debe pesar menos de 5MB')
  .refine((val) => {
    let file: File | null = null
    if (isClient && val instanceof FileList) file = val[0]
    else if (val instanceof File) file = val
    
    if (!file) return false
    return ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)
  }, 'Formato inválido. Solo se admiten JPG, PNG o PDF')

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
  
  // Archivos
  foto_carnet: fileValidation,
  planilla_fpv: fileValidation,
  cedula_digitalizada: fileValidation,
  rif_digitalizado: fileValidation,
  titulo_graduacion: fileValidation,
  comprobante_pago: fileValidation,
  
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
