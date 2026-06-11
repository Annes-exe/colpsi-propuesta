/**
 * useCalculadoraDeuda
 *
 * Motor de cálculo de deuda de solvencias a partir de 2023 (año de inicio de cobro):
 *
 * TARIFA ESTÁNDAR (2023 – año_actual):
 *   Cada año adeudado tiene un costo de $20.00.
 *
 * TARIFA DE NIVELACIÓN:
 *   Si el agremiado no ha realizado ningún pago desde 2023 (cero años pagados >= 2023),
 *   se le aplica una tarifa plana única de $80.00 para ponerse al día de golpe.
 *   Si ya ha cancelado algún año en este rango, se cobra la tarifa estándar de $20.00
 *   por cada año restante adeudado.
 */

import { useMemo } from 'react'

// ─── Constantes de negocio ───────────────────────────────────────────────────

// A partir de 2023 inicia el cobro de solvencias. Los años anteriores no se cobran.
export const ANIO_INICIO_PRE = 2023 
export const ANIO_FIN_PRE = 2022
export const ANIO_INICIO_POST = 2023
export const MONTO_PRE_BLOCK_USD = 80.00
export const MONTO_POR_ANIO_POST_USD = 20.00

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface DeudaCalculada {
  /** Años del bloque pre-2023 que faltan (2010–2022) */
  aniosPendientesPre: number[]
  /** Monto del bloque pre-2023: 0 o 80 */
  deudaPreBlock: number
  /** Deuda del bloque pre-2522 ya pagada */
  deudaPrePagada: boolean
  /** Años del bloque post-2023 que faltan (2023–anioActual) */
  aniosPendientesPost: number[]
  /** Monto del bloque post-2023: N × $20 */
  deudaPostBlock: number
  /** Deuda de inscripción: $30 si no ha pagado, $0 si ya pagó */
  deudaInscripcion: number
  /** Deuda de custodia: N meses pendientes × $5 */
  deudaCustodia: number
  /** Listado de meses pendientes de custodia ("YYYY-MM") */
  mesesPendientesCustodia: string[]
  /** Si ha pagado la inscripción y es considerado agremiado activo */
  esAgremiadoActivo: boolean
  /** Deuda total en USD */
  totalUSD: number
  /** El agremiado está completamente solvente */
  esSolvente: boolean
  /** Color del semáforo */
  semaforo: 'verde' | 'rojo'
  /** Año fiscal actual considerado en el cálculo */
  anioActual: number
  /** Total de años del período activo */
  totalAniosPeriodo: number
  /** Años completamente solventes */
  aniosSolventes: number[]
  /** Indica si se aplicó la tarifa de nivelación plana de $80.00 para el bloque post-2023 */
  tarifaNivelacionAplicada?: boolean
}

export interface CalculadoraInput {
  /** Array de años por los que el agremiado YA tiene solvencia registrada */
  aniosSolventes: number[]
  fechaInscripcion?: string
  fechaRecepcionTitulo?: string | null
  mesesCustodiaPagados?: string[]
  hasPaidInscription?: boolean
  /**
   * Año fiscal actual a considerar. Por defecto: año del sistema.
   * Útil para pruebas unitarias o cálculos retroactivos.
   */
  anioActualOverride?: number
}

// ─── Función pura de cálculo ─────────────────────────────────────────────────

export function calcularDeuda(input: CalculadoraInput): DeudaCalculada {
  const anioActual = input.anioActualOverride ?? new Date().getFullYear()
  const solventes = new Set(input.aniosSolventes)

  // ── Bloque PRE-2023 ──────────────────────────────────────────────────────
  const aniosPendientesPre: number[] = []
  for (let anio = ANIO_INICIO_PRE; anio <= ANIO_FIN_PRE; anio++) {
    if (!solventes.has(anio)) {
      aniosPendientesPre.push(anio)
    }
  }

  // Si hay CUALQUIER año pendiente en el bloque → deuda plana $80
  const deudaPreBlock = aniosPendientesPre.length > 0 ? MONTO_PRE_BLOCK_USD : 0
  const deudaPrePagada = aniosPendientesPre.length === 0

  // ── Bloque POST-2023 ─────────────────────────────────────────────────────
  let yearOfInscription = ANIO_INICIO_POST
  if (input.fechaInscripcion) {
    try {
      const parsedYear = new Date(input.fechaInscripcion + 'T00:00:00').getFullYear()
      if (!isNaN(parsedYear)) {
        yearOfInscription = parsedYear
      }
    } catch (e) {
      console.error('Error parsing fechaInscripcion:', e)
    }
  }
  const anioInicioPost = Math.max(ANIO_INICIO_POST, yearOfInscription)

  const aniosPendientesPost: number[] = []
  for (let anio = anioInicioPost; anio <= anioActual; anio++) {
    if (!solventes.has(anio)) {
      aniosPendientesPost.push(anio)
    }
  }

  // Tarifa de Nivelación:
  // Si no ha pagado absolutamente nada desde 2023 hasta anioActual, se le aplica un monto fijo de $80.00
  // para ponerse al día con todos los años adeudados de golpe.
  // Si ya tiene algún año pagado en ese rango, se multiplica los años restantes adeudados por $20.00.
  const tienePagosPost = input.aniosSolventes.some((a) => a >= anioInicioPost && a <= anioActual)
  let deudaPostBlock = 0
  let tarifaNivelacionAplicada = false

  if (aniosPendientesPost.length > 0) {
    // La tarifa de nivelación solo aplica si no tiene pagos y el costo acumulado sería >= $80
    if (!tienePagosPost && (aniosPendientesPost.length * MONTO_POR_ANIO_POST_USD >= MONTO_PRE_BLOCK_USD)) {
      deudaPostBlock = MONTO_PRE_BLOCK_USD // Tarifa plana de $80
      tarifaNivelacionAplicada = true
    } else {
      deudaPostBlock = aniosPendientesPost.length * MONTO_POR_ANIO_POST_USD // $20 por año
    }
  }

  // ── Inscripción ──────────────────────────────────────────────────────────
  // Si es un agremiado "viejo" (inscrito antes de 2023), no se le cobra inscripción.
  // Si es un agremiado "nuevo" (desde 2023), se requiere pago de inscripción.
  const isNuevo = input.fechaInscripcion
    ? new Date(input.fechaInscripcion + 'T00:00:00').getFullYear() >= 2023
    : true

  const esAgremiadoActivo = isNuevo
    ? (input.hasPaidInscription ?? false)
    : true

  const deudaInscripcion = esAgremiadoActivo ? 0 : 30.00

  // ── Custodia ─────────────────────────────────────────────────────────────
  const mesesPendientesCustodia: string[] = []
  const custodiaPagados = input.mesesCustodiaPagados ?? []

  if (input.fechaRecepcionTitulo) {
    try {
      const inicio = new Date(input.fechaRecepcionTitulo + 'T00:00:00')
      const finCortesia = new Date(inicio)
      finCortesia.setMonth(finCortesia.getMonth() + 3)

      const cursor = new Date(inicio)
      cursor.setDate(1) // Primero del mes

      const hoyCursor = new Date(anioActual, new Date().getMonth(), 1)

      while (cursor <= hoyCursor) {
        const y = cursor.getFullYear()
        const mIdx = cursor.getMonth()
        const mStr = `${y}-${String(mIdx + 1).padStart(2, '0')}`

        // ¿Este mes está fuera de la cortesía?
        const inicioDelMes = new Date(y, mIdx, 1)
        const isCort = inicioDelMes < finCortesia

        if (!isCort) {
          if (!custodiaPagados.includes(mStr)) {
            mesesPendientesCustodia.push(mStr)
          }
        }
        cursor.setMonth(cursor.getMonth() + 1)
      }
    } catch (e) {
      console.error('Error calculando deuda de custodia:', e)
    }
  }

  const deudaCustodia = mesesPendientesCustodia.length * 5.00

  // ── Totales ──────────────────────────────────────────────────────────────
  const totalUSD = deudaPreBlock + deudaPostBlock + deudaInscripcion + deudaCustodia
  const esSolvente = totalUSD === 0
  const semaforo: 'verde' | 'rojo' = esSolvente ? 'verde' : 'rojo'

  // Años en el período activo total (año de inscripción o 2023 → anioActual)
  const totalAniosPeriodo = anioActual - anioInicioPost + 1

  // Años solventes que caen dentro del período activo
  const aniosSolventesEnPeriodo = input.aniosSolventes.filter(
    (a) => a >= anioInicioPost && a <= anioActual
  )

  return {
    aniosPendientesPre,
    deudaPreBlock,
    deudaPrePagada,
    aniosPendientesPost,
    deudaPostBlock,
    deudaInscripcion,
    deudaCustodia,
    mesesPendientesCustodia,
    esAgremiadoActivo,
    totalUSD,
    esSolvente,
    semaforo,
    anioActual,
    totalAniosPeriodo,
    aniosSolventes: aniosSolventesEnPeriodo,
    tarifaNivelacionAplicada,
  }
}

// ─── Custom Hook ─────────────────────────────────────────────────────────────

/**
 * Hook React que calcula la deuda de un agremiado de forma memoizada.
 */
export function useCalculadoraDeuda(input: CalculadoraInput): DeudaCalculada {
  return useMemo(() => calcularDeuda(input), [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(input.aniosSolventes.sort()),
    JSON.stringify(input.mesesCustodiaPagados?.sort()),
    input.fechaInscripcion,
    input.fechaRecepcionTitulo,
    input.hasPaidInscription,
    input.anioActualOverride,
  ])
}

// ─── Helpers de formato ───────────────────────────────────────────────────────

/** Formatea monto en USD con 2 decimales y símbolo */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

/** Formatea monto en VES (bolívares) */
export function formatVES(amount: number): string {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'VES',
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Calcula el monto en USD a partir de VES y tasa de cambio.
 * Redondea a 2 decimales (igual que la columna GENERATED en PostgreSQL).
 */
export function convertirVESaUSD(montoVES: number, tasaCambio: number): number {
  if (tasaCambio <= 0) return 0
  return Math.round((montoVES / tasaCambio) * 100) / 100
}
