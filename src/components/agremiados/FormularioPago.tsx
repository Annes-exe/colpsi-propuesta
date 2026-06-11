'use client'

import { useEffect, useState, useTransition, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { pagoSchema, type PagoInput } from '@/lib/validations/schemas'
import { registrarPago, fetchTasaBCV } from '@/app/actions/pagos'
import {
  convertirVESaUSD,
  formatUSD,
  formatVES,
  MONTO_POR_ANIO_POST_USD,
} from '@/hooks/useCalculadoraDeuda'
import type { DeudaCalculada } from '@/hooks/useCalculadoraDeuda'
import { createClient } from '@/lib/supabase/client'

interface FormularioPagoProps {
  agremiado_id: string
  nombreCompleto: string
  deuda: DeudaCalculada
  fecha_recepcion_titulo?: string | null
  fecha_inscripcion?: string | null
  onSuccess?: () => void
  onClose?: () => void
}

const METODOS_PAGO = [
  { value: 'transferencia', label: '🏦 Transferencia Bancaria' },
  { value: 'pago_movil',   label: '📱 Pago Móvil' },
  { value: 'efectivo_usd', label: '💵 Efectivo USD' },
  { value: 'zelle',        label: '💜 Zelle' },
  { value: 'otro',         label: '🔖 Otro' },
] as const

const MESES_NOMBRES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

// Helper para formatear entrada de VES
function formatVESInput(value: string): string {
  let clean = value.replace(/[^0-9.]/g, '')
  const parts = clean.split('.')
  if (parts.length > 2) {
    clean = parts[0] + '.' + parts.slice(1).join('')
  }
  let [integer, decimal] = clean.split('.')
  if (integer && integer.length > 1 && integer.startsWith('0')) {
    integer = integer.replace(/^0+/, '')
    if (integer === '') integer = '0'
  }
  if (integer) {
    integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }
  if (decimal !== undefined) {
    return `${integer || '0'}.${decimal.slice(0, 2)}`
  }
  return integer || ''
}

export function FormularioPago({
  agremiado_id,
  nombreCompleto,
  deuda,
  fecha_recepcion_titulo,
  fecha_inscripcion,
  onSuccess,
  onClose,
}: FormularioPagoProps) {
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [tasa, setTasa] = useState<number>(0)
  const [tasaFuente, setTasaFuente] = useState<string>('')
  const [loadingTasa, setLoadingTasa] = useState(false)
  const [montoUSD, setMontoUSD] = useState<number>(0)
  const [custodiaYear, setCustodiaYear] = useState<number>(new Date().getFullYear())
  const [isCustomTasa, setIsCustomTasa] = useState(false)
  const [tasaHistory, setTasaHistory] = useState<{ fecha: string; tasa: number }[]>([])
  const [comprobanteName, setComprobanteName] = useState<string | null>(null)

  const handleSimulatedComprobanteUpload = () => {
    setComprobanteName(comprobanteName ? null : 'comprobante_pago_referencia.pdf')
  }

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PagoInput>({
    resolver: zodResolver(pagoSchema),
    defaultValues: {
      agremiado_id,
      fecha_pago: new Date().toISOString().split('T')[0],
      monto_ves: 0,
      tasa_cambio: 0,
      referencia: '',
      metodo_pago: 'transferencia',
      notas: '',
      tipo_pago: 'solvencia',
      anios_correspondientes: [],
      meses_custodia: [],
    },
  })

  const fechaPago = watch('fecha_pago')
  const montoVES = watch('monto_ves')
  const tipoPago = watch('tipo_pago')
  const aniosSeleccionados = watch('anios_correspondientes') || []
  const mesesCustodiaSeleccionados = watch('meses_custodia') || []
  const tasaCambioVal = watch('tasa_cambio')

  // ── Cargar tasa al cambiar fecha ──────────────────────────────────────────
  const cargarTasa = useCallback(async (fecha: string) => {
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return
    setLoadingTasa(true)
    try {
      const res = await fetchTasaBCV(fecha)
      setTasa(res.tasa)
      setTasaFuente(res.fuente)
      if (!isCustomTasa) {
        setValue('tasa_cambio', res.tasa, { shouldValidate: true })
      }
    } catch {
      setTasa(0)
    } finally {
      setLoadingTasa(false)
    }
  }, [setValue, isCustomTasa])

  useEffect(() => {
    cargarTasa(fechaPago)
  }, [fechaPago, cargarTasa])

  // ── Cargar historial de tasas registradas ──────────────────────────────────
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('pagos')
          .select('fecha_pago, tasa_cambio')
          .order('fecha_pago', { ascending: false })
          .limit(50)
        
        if (data) {
          const seenDates = new Set<string>()
          const uniqueHistory: { fecha: string; tasa: number }[] = []
          for (const item of data) {
            if (!seenDates.has(item.fecha_pago)) {
              seenDates.add(item.fecha_pago)
              uniqueHistory.push({ fecha: item.fecha_pago, tasa: item.tasa_cambio })
            }
            if (uniqueHistory.length >= 5) break
          }
          setTasaHistory(uniqueHistory)
        }
      } catch (err) {
        console.error('Error fetching rate history:', err)
      }
    }
    fetchHistory()
  }, [])

  // ── Calcular USD en tiempo real ────────────────────────────────────────────
  useEffect(() => {
    setMontoUSD(convertirVESaUSD(Number(montoVES) || 0, tasaCambioVal))
  }, [montoVES, tasaCambioVal])

  // ── Helper para cortesía de custodia ──────────────────────────────────────
  const esMesCortesia = useCallback((year: number, monthIndex: number) => {
    const inicioStr = fecha_recepcion_titulo || fecha_inscripcion
    if (!inicioStr) return false
    const inicio = new Date(inicioStr + 'T00:00:00')
    const finCortesia = new Date(inicio)
    finCortesia.setMonth(finCortesia.getMonth() + 3)

    const inicioDelMes = new Date(year, monthIndex, 1)
    return inicioDelMes < finCortesia
  }, [fecha_recepcion_titulo, fecha_inscripcion])

  // ── Monto esperado según tipo de pago y selecciones ────────────────────────
  const montoEsperadoUSD = (() => {
    if (tipoPago === 'solvencia') {
      const cantPost = aniosSeleccionados.filter((a) => a >= 2023).length
      if (deuda.tarifaNivelacionAplicada && cantPost === deuda.aniosPendientesPost.length) {
        return 80.00
      }
      return cantPost * MONTO_POR_ANIO_POST_USD
    }
    if (tipoPago === 'inscripcion') {
      return 30.00
    }
    if (tipoPago === 'carnet') {
      return 15.00
    }
    if (tipoPago === 'custodia') {
      // Solo sumamos los meses que NO sean de cortesía
      const billedCount = mesesCustodiaSeleccionados.filter((m) => {
        const [y, mIdx] = m.split('-').map(Number)
        return !esMesCortesia(y, mIdx - 1)
      }).length
      return billedCount * 5.00
    }
    return 0
  })()

  // ── Toggle año individual (Solvencia) ──────────────────────────────────────
  const toggleAnio = (anio: number) => {
    const cur = aniosSeleccionados
    setValue(
      'anios_correspondientes',
      cur.includes(anio) ? cur.filter((a) => a !== anio) : [...cur, anio],
      { shouldValidate: true }
    )
  }

  // ── Toggle mes individual (Custodia) ───────────────────────────────────────
  const toggleMesCustodia = (mesStr: string) => {
    const cur = mesesCustodiaSeleccionados
    setValue(
      'meses_custodia',
      cur.includes(mesStr) ? cur.filter((m) => m !== mesStr) : [...cur, mesStr],
      { shouldValidate: true }
    )
  }

  // ── Al cambiar de tipo de pago, limpiar selecciones ────────────────────────
  useEffect(() => {
    setValue('anios_correspondientes', [])
    setValue('meses_custodia', [])
  }, [tipoPago, setValue])

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = (data: PagoInput) => {
    setServerError(null)
    setSuccessMsg(null)
    startTransition(async () => {
      const result = await registrarPago(data)
      if (result.success) {
        setSuccessMsg('¡Pago registrado exitosamente!')
        reset()
        setTimeout(() => onSuccess?.(), 1400)
      } else {
        setServerError(result.error ?? 'Error desconocido.')
      }
    })
  }

  const isLoading = isPending || isSubmitting
  const montoMatch = montoEsperadoUSD > 0 && Math.abs(montoUSD - montoEsperadoUSD) < 1

  return (
    <>
      {/* Backdrop */}
      <div
        role="presentation"
        onClick={onClose}
        className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Registrar pago"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col font-sans transition-transform duration-300 transform translate-x-0"
      >
        {/* Header */}
        <div className="px-6 py-5 flex items-start justify-between flex-shrink-0 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-inner">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="1" y="4" width="22" height="16" rx="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              </div>
              <h2 className="text-base font-extrabold tracking-tight m-0">Registrar Pago</h2>
            </div>
            <p className="text-xs text-slate-400 pl-10 m-0">{nombreCompleto}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Deuda General Info Banner */}
        {!deuda.esSolvente && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Deuda pendiente de Solvencia:</span>
            <span className="font-mono text-sm font-extrabold text-red-600">{formatUSD(deuda.totalUSD)}</span>
          </div>
        )}

        {/* Server Errors / Alerts */}
        {serverError && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2.5 text-xs text-red-600" role="alert">
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="font-medium">{serverError}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-600" role="status">
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5"
        >
          <input type="hidden" {...register('agremiado_id')} />
          <input type="hidden" {...register('tasa_cambio', { valueAsNumber: true })} />

          {/* Tipo de Pago Selector */}
          <div className="flex flex-col">
            <label htmlFor="fp-tipo" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo de Pago</label>
            <select
              id="fp-tipo"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-slate-50 outline-hidden focus:border-blue-500 focus:bg-white transition-all cursor-pointer font-medium"
              {...register('tipo_pago')}
            >
              <option value="solvencia">Solvencia (Anualidad - $20.00)</option>
              <option value="inscripcion">Inscripción (Obligatoria - $30.00)</option>
              <option value="carnet">Carnet de Inscripción (Opcional - $15.00)</option>
              <option value="custodia">Custodia de Título (Opcional - $5.00/mes)</option>
            </select>
          </div>

          <div className="border-b border-slate-100 my-1" />

          {/* Fecha + Tasa Cambiaria */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label htmlFor="fp-fecha" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Fecha de Pago</label>
              <input
                id="fp-fecha"
                type="date"
                max={new Date().toISOString().split('T')[0]}
                className={`w-full px-3 py-2 rounded-lg border text-sm text-slate-900 bg-slate-50 outline-hidden focus:border-blue-500 focus:bg-white transition-all ${
                  errors.fecha_pago ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                }`}
                {...register('fecha_pago')}
              />
              {errors.fecha_pago && <span className="text-[11px] text-red-500 mt-1">{errors.fecha_pago.message}</span>}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tasa Cambiaria</label>
                <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isCustomTasa}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setIsCustomTasa(checked)
                      if (!checked) {
                        setValue('tasa_cambio', tasa || 0, { shouldValidate: true })
                      }
                    }}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Tasa manual</span>
                </label>
              </div>

              <div className="relative">
                {!isCustomTasa ? (
                  <div className={`px-3 py-2 rounded-lg border text-sm flex flex-col justify-center min-h-[38px] ${
                    tasa > 0 ? 'bg-sky-50/50 border-sky-100' : 'bg-slate-50 border-slate-200'
                  }`}>
                    {loadingTasa ? (
                      <span className="text-xs text-slate-400 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin" />
                        Consultando...
                      </span>
                    ) : tasa > 0 ? (
                      <>
                        <span className="font-mono font-bold text-slate-900">Bs. {tasa.toFixed(2)}</span>
                        <span className="text-[9px] text-slate-500 mt-0.5 leading-none">{tasaFuente}</span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Elige una fecha</span>
                    )}
                  </div>
                ) : (
                  <Controller
                    name="tasa_cambio"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className={`w-full px-3 py-2 rounded-lg border text-sm text-slate-900 bg-white outline-hidden focus:border-blue-500 font-mono font-bold ${
                          errors.tasa_cambio ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                        }`}
                        {...field}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0
                          field.onChange(val)
                        }}
                      />
                    )}
                  />
                )}
                {errors.tasa_cambio && <span className="text-[11px] text-red-500 mt-1">{errors.tasa_cambio.message}</span>}
              </div>
            </div>
          </div>

          {/* Historial de Tasas Recientes */}
          {tasaHistory.length > 0 && (
            <div className="flex flex-col bg-slate-50 rounded-lg p-2.5 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                Tasas registradas recientemente
              </span>
              <div className="flex flex-wrap gap-1.5">
                {tasaHistory.map((item) => (
                  <button
                    key={item.fecha}
                    type="button"
                    onClick={() => {
                      setIsCustomTasa(true)
                      setValue('tasa_cambio', item.tasa, { shouldValidate: true })
                    }}
                    className="text-[11px] font-medium px-2 py-1 bg-white border border-slate-200 hover:border-blue-500 rounded-md font-mono text-slate-700 hover:text-blue-600 transition-colors flex items-center gap-1 cursor-pointer"
                    title={`Click para aplicar tasa de fecha ${item.fecha}`}
                  >
                    <span>{new Date(item.fecha + 'T00:00:00').toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}:</span>
                    <strong className="text-slate-950 font-bold">Bs. {item.tasa.toFixed(2)}</strong>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Método + Referencia */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label htmlFor="fp-metodo" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Método de Pago</label>
              <Controller
                name="metodo_pago"
                control={control}
                render={({ field }) => (
                  <select
                    id="fp-metodo"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-slate-50 outline-hidden focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                    {...field}
                  >
                    {METODOS_PAGO.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                )}
              />
            </div>

            <div className="flex flex-col">
              <label htmlFor="fp-ref" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Referencia / ID</label>
              <input
                id="fp-ref"
                type="text"
                placeholder="Ej: 987654"
                className={`w-full px-3 py-2 rounded-lg border text-sm text-slate-900 bg-slate-50 outline-hidden focus:border-blue-500 focus:bg-white transition-all ${
                  errors.referencia ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                }`}
                {...register('referencia')}
              />
              {errors.referencia && <span className="text-[11px] text-red-500 mt-1">{errors.referencia.message}</span>}
            </div>
          </div>

          {/* Monto VES + USD Equivalente */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label htmlFor="fp-ves" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Monto en Bolívares (VES)</label>
              <Controller
                name="monto_ves"
                control={control}
                render={({ field: { onChange, value } }) => {
                  const [displayVal, setDisplayVal] = useState(() => {
                    if (!value || isNaN(value)) return ''
                    return formatVESInput(String(value))
                  })

                  useEffect(() => {
                    const numVal = Number(value) || 0
                    if (numVal === 0) {
                      setDisplayVal('')
                    } else {
                      const cleanDisplay = parseFloat(displayVal.replace(/,/g, '')) || 0
                      if (cleanDisplay !== numVal) {
                        setDisplayVal(formatVESInput(numVal.toFixed(2)))
                      }
                    }
                  }, [value])

                  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                    const inputVal = e.target.value
                    const formatted = formatVESInput(inputVal)
                    setDisplayVal(formatted)
                    const numericVal = parseFloat(formatted.replace(/,/g, '')) || 0
                    onChange(numericVal)
                  }

                  return (
                    <input
                      id="fp-ves"
                      type="text"
                      placeholder="0.00"
                      value={displayVal}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 rounded-lg border text-sm text-slate-900 bg-slate-50 outline-hidden focus:border-blue-500 focus:bg-white transition-all font-mono font-semibold ${
                        errors.monto_ves ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                      }`}
                    />
                  )
                }}
              />
              {errors.monto_ves && <span className="text-[11px] text-red-500 mt-1">{errors.monto_ves.message}</span>}
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Equivalente USD</label>
              <div className={`px-3 py-2 rounded-lg border text-sm flex flex-col justify-center min-h-[38px] transition-all ${
                montoUSD > 0 && (aniosSeleccionados.length > 0 || tipoPago !== 'solvencia')
                  ? montoMatch
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
                <span className="font-mono font-bold">{montoUSD > 0 ? formatUSD(montoUSD) : '—'}</span>
                {montoEsperadoUSD > 0 && (
                  <span className="text-[10px] font-semibold mt-0.5 leading-none">
                    {montoMatch ? '✓ Coincide con tarifa' : `Esperado: ${formatUSD(montoEsperadoUSD)}`}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="border-b border-slate-100 my-1" />

          {/* ── SECCIÓN DINÁMICA SEGÚN TIPO PAGO ── */}

          {/* 1. SOLVENCIA: Selección de Años */}
          {tipoPago === 'solvencia' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Años a solventar</span>
                {aniosSeleccionados.length > 0 && (
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-extrabold normal-case">
                    {aniosSeleccionados.length} seleccionado{aniosSeleccionados.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {deuda.aniosPendientesPost.length === 0 ? (
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center gap-2.5 text-xs font-medium text-emerald-800">
                  <span>✅ El agremiado está al día en todas las solvencias post-2023.</span>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-slate-150 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Períodos Pendientes</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">
                      ${MONTO_POR_ANIO_POST_USD}/año
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {deuda.aniosPendientesPost.map((anio) => {
                      const sel = aniosSeleccionados.includes(anio)
                      return (
                        <button
                          key={anio}
                          type="button"
                          id={`fp-anio-${anio}`}
                          onClick={() => toggleAnio(anio)}
                          className={`px-4 py-2 rounded-lg border text-sm font-bold font-mono cursor-pointer transition-all flex items-center gap-1.5 ${
                            sel
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {sel && (
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                          {anio}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              {errors.anios_correspondientes && (
                <span className="text-[11px] text-red-500">{String(errors.anios_correspondientes.message)}</span>
              )}
            </div>
          )}

          {/* 2. CUSTODIA: Selección de Meses + Regla Cortesía */}
          {tipoPago === 'custodia' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Meses de Custodia</span>
                <div className="flex items-center gap-2">
                  <select
                    value={custodiaYear}
                    onChange={(e) => setCustodiaYear(Number(e.target.value))}
                    className="border border-slate-200 rounded px-1.5 py-0.5 text-xs bg-white font-medium"
                  >
                    {[2023, 2024, 2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-150 bg-slate-50/50">
                <div className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                  📌 La tarifa de custodia es de <strong className="text-slate-800">$5.00/mes</strong>. Los primeros 3 meses desde la entrega/recepción del título son de cortesía (gratis).
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {MESES_NOMBRES.map((nombre, idx) => {
                    const mesStr = `${custodiaYear}-${String(idx + 1).padStart(2, '0')}`
                    const isCort = esMesCortesia(custodiaYear, idx)
                    const sel = mesesCustodiaSeleccionados.includes(mesStr)

                    if (isCort) {
                      return (
                        <div
                          key={mesStr}
                          className="flex items-center justify-between p-2 rounded-lg border border-emerald-100 bg-emerald-50/50 opacity-80"
                        >
                          <span className="text-xs font-medium text-emerald-800">{nombre}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">Cortesía</span>
                        </div>
                      )
                    }

                    return (
                      <button
                        key={mesStr}
                        type="button"
                        onClick={() => toggleMesCustodia(mesStr)}
                        className={`flex items-center justify-between p-2 rounded-lg border text-left cursor-pointer transition-all ${
                          sel
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-slate-250 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-xs font-medium">{nombre}</span>
                        {sel ? (
                          <span className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-400">$5.00</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
              {errors.anios_correspondientes && (
                <span className="text-[11px] text-red-500">{String(errors.anios_correspondientes.message)}</span>
              )}
            </div>
          )}

          {/* 3. INSCRIPCIÓN / CARNET: Información de Costo Fijo */}
          {tipoPago === 'inscripcion' && (
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-100 text-purple-950 space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-purple-800">Inscripción del Agremiado</div>
              <div className="text-xs leading-relaxed">
                Este es el pago único obligatorio de inscripción correspondiente a un valor fijo de <strong className="text-purple-900">$30.00</strong>.
              </div>
            </div>
          )}

          {tipoPago === 'carnet' && (
            <div className="p-4 rounded-xl bg-violet-50 border border-violet-100 text-violet-950 space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-violet-800">Carnet de Inscripción</div>
              <div className="text-xs leading-relaxed">
                Pago único opcional por concepto de emisión física del carnet de agremiado con costo fijo de <strong className="text-violet-900">$15.00</strong>.
              </div>
            </div>
          )}

          {/* Adjuntar Comprobante (Estético / Mock placeholder) */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Comprobante de Pago (Estético)</span>
            <button
              type="button"
              onClick={handleSimulatedComprobanteUpload}
              className={`w-full p-4 rounded-xl border border-dashed text-left flex items-center justify-between transition-all ${
                comprobanteName
                  ? 'border-emerald-300 bg-emerald-50/30 text-emerald-800'
                  : 'border-slate-300 bg-slate-50 hover:bg-slate-100/70 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-3">
                {comprobanteName ? (
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold">{comprobanteName ? '✓ Comprobante Cargado' : 'Adjuntar Comprobante'}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{comprobanteName ? comprobanteName : 'Formatos: PDF, JPG, PNG (Máx 5MB)'}</div>
                </div>
              </div>
              {comprobanteName && (
                <span className="text-[10px] font-bold text-red-500 hover:underline">Quitar</span>
              )}
            </button>
          </div>

          {/* Notas */}
          <div className="flex flex-col">
            <label htmlFor="fp-notas" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notas / Observaciones (Opcional)</label>
            <textarea
              id="fp-notas"
              rows={2}
              placeholder="Detalles sobre transferencia, banco emisor..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-slate-50 outline-hidden focus:border-blue-500 focus:bg-white transition-all resize-y"
              {...register('notas')}
            />
          </div>

          {/* Resumen Transacción */}
          {montoVES > 0 && tasa > 0 && (
            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2.5 mt-auto shadow-md">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Resumen de Transacción</div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Concepto</span>
                  <span className="font-bold text-slate-200 capitalize">
                    {tipoPago === 'solvencia' && 'Solvencia Anual'}
                    {tipoPago === 'inscripcion' && 'Inscripción'}
                    {tipoPago === 'carnet' && 'Carnet de Inscripción'}
                    {tipoPago === 'custodia' && 'Custodia de Título'}
                  </span>
                </div>
                {tipoPago === 'solvencia' && aniosSeleccionados.length > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Años a solventar</span>
                    <span className="font-mono text-slate-200">{aniosSeleccionados.sort((a,b)=>a-b).join(', ')}</span>
                  </div>
                )}
                {tipoPago === 'custodia' && mesesCustodiaSeleccionados.length > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Meses facturados</span>
                    <span className="font-mono text-slate-200 max-w-[200px] truncate" title={mesesCustodiaSeleccionados.sort().join(', ')}>
                      {mesesCustodiaSeleccionados.sort().map(m => m.split('-')[1]).join(', ')} ({mesesCustodiaSeleccionados.length}m)
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Monto VES</span>
                  <span className="font-mono text-slate-200">{formatVES(montoVES)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Tasa cambiaria BCV</span>
                  <span className="font-mono text-slate-200">Bs. {tasa.toFixed(2)}</span>
                </div>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-200">Total USD equivalente</span>
                <span className="text-base font-extrabold text-emerald-400 font-mono">{formatUSD(montoUSD)}</span>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-sm hover:bg-slate-100 hover:text-slate-900 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            id="fp-submit"
            disabled={isLoading || tasa === 0}
            onClick={(e) => {
              e.preventDefault()
              handleSubmit(onSubmit)()
            }}
            className={`flex-2 py-2.5 px-4 rounded-xl text-white font-bold text-sm cursor-pointer shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 ${
              isLoading || tasa === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-850 hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Registrar Pago
              </>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
