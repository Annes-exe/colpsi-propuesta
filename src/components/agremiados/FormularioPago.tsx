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
  MONTO_PRE_BLOCK_USD,
  MONTO_POR_ANIO_POST_USD,
} from '@/hooks/useCalculadoraDeuda'
import type { DeudaCalculada } from '@/hooks/useCalculadoraDeuda'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormularioPagoProps {
  agremiado_id: string
  nombreCompleto: string
  deuda: DeudaCalculada
  onSuccess?: () => void
  onClose?: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const METODOS_PAGO = [
  { value: 'transferencia', label: '🏦 Transferencia Bancaria' },
  { value: 'pago_movil',   label: '📱 Pago Móvil' },
  { value: 'efectivo_usd', label: '💵 Efectivo USD' },
  { value: 'zelle',        label: '💜 Zelle' },
  { value: 'otro',         label: '🔖 Otro' },
] as const

// ─── Design Tokens ────────────────────────────────────────────────────────────

const T = {
  bg: '#ffffff',
  border: '#e2e8f0',
  borderFocus: '#2563eb',
  radius: 10,
  radiusSm: 7,
  label: { fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 6, display: 'block' as const },
  input: {
    width: '100%', boxSizing: 'border-box' as const,
    padding: '10px 12px', borderRadius: 9, border: '1.5px solid #e2e8f0',
    fontSize: 14, color: '#0f172a', background: '#f8fafc',
    outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s',
  },
  inputError: { borderColor: '#f87171', background: '#fef2f2' },
  errorText: { color: '#dc2626', fontSize: 11.5, marginTop: 4, display: 'block' as const },
  field: { display: 'flex' as const, flexDirection: 'column' as const, gap: 0 },
  section: { display: 'flex' as const, flexDirection: 'column' as const, gap: 14 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.08em', paddingBottom: 10, borderBottom: '1px solid #f1f5f9', marginBottom: 2 },
} as const

// Helper para formatear entrada de VES
function formatVESInput(value: string): string {
  // Elimina cualquier carácter que no sea número o punto
  let clean = value.replace(/[^0-9.]/g, '')

  // Si hay más de un punto, dejamos solo el primero
  const parts = clean.split('.')
  if (parts.length > 2) {
    clean = parts[0] + '.' + parts.slice(1).join('')
  }

  let [integer, decimal] = clean.split('.')

  // Evitar ceros a la izquierda inválidos
  if (integer && integer.length > 1 && integer.startsWith('0')) {
    integer = integer.replace(/^0+/, '')
    if (integer === '') integer = '0'
  }

  // Formatear parte entera con comas
  if (integer) {
    integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  if (decimal !== undefined) {
    return `${integer || '0'}.${decimal.slice(0, 2)}`
  }

  return integer || ''
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FormularioPago({ agremiado_id, nombreCompleto, deuda, onSuccess, onClose }: FormularioPagoProps) {
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [tasa, setTasa] = useState<number>(0)
  const [tasaFuente, setTasaFuente] = useState<string>('')
  const [loadingTasa, setLoadingTasa] = useState(false)
  const [montoUSD, setMontoUSD] = useState<number>(0)

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
      anios_correspondientes: [],
    },
  })

  const fechaPago = watch('fecha_pago')
  const montoVES = watch('monto_ves')
  const aniosSeleccionados = watch('anios_correspondientes')

  // ── Cargar tasa al cambiar fecha ──────────────────────────────────────────
  const cargarTasa = useCallback(async (fecha: string) => {
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return
    setLoadingTasa(true)
    try {
      const res = await fetchTasaBCV(fecha)
      setTasa(res.tasa)
      setTasaFuente(res.fuente)
      setValue('tasa_cambio', res.tasa, { shouldValidate: true })
    } catch { setTasa(0) }
    finally { setLoadingTasa(false) }
  }, [setValue])

  useEffect(() => { cargarTasa(fechaPago) }, [fechaPago, cargarTasa])

  // ── Calcular USD en tiempo real ────────────────────────────────────────────
  useEffect(() => {
    setMontoUSD(convertirVESaUSD(Number(montoVES) || 0, tasa))
  }, [montoVES, tasa])

  // ── Monto esperado según años elegidos ────────────────────────────────────
  const montoEsperadoUSD = (() => {
    const cantPost = aniosSeleccionados.filter((a) => a >= 2023).length
    if (deuda.tarifaNivelacionAplicada && cantPost === deuda.aniosPendientesPost.length) {
      return 80.00
    }
    return cantPost * MONTO_POR_ANIO_POST_USD
  })()

  // ── Toggle año individual ─────────────────────────────────────────────────
  const toggleAnio = (anio: number) => {
    const cur = aniosSeleccionados
    setValue('anios_correspondientes',
      cur.includes(anio) ? cur.filter(a => a !== anio) : [...cur, anio],
      { shouldValidate: true })
  }



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

  // ── Input style helper ─────────────────────────────────────────────────────
  const inputStyle = (_name: string, hasError: boolean): React.CSSProperties => ({
    ...T.input,
    ...(hasError ? T.inputError : {}),
  })

  return (
    <>
      {/* Backdrop */}
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15,23,42,0.5)',
          backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Registrar pago"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 1001,
          width: '100%', maxWidth: 480,
          background: '#fff',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
          animation: 'slideInRight 0.28s cubic-bezier(0.16,1,0.3,1)',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexShrink: 0,
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              </div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: 0 }}>Registrar Pago</h2>
            </div>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, paddingLeft: 42 }}>{nombreCompleto}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.07)', color: '#94a3b8',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.15s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Deuda banner ─────────────────────────────────────────────────── */}
        {!deuda.esSolvente && (
          <div style={{
            padding: '12px 24px',
            background: 'linear-gradient(90deg, #fef2f2, #fff)',
            borderBottom: '1px solid #fee2e2',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 12.5, color: '#64748b', fontWeight: 500 }}>Deuda total pendiente</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 800, color: '#dc2626' }}>
              {formatUSD(deuda.totalUSD)}
            </span>
          </div>
        )}

        {/* ── Alerts ───────────────────────────────────────────────────────── */}
        {serverError && (
          <div style={{
            margin: '12px 24px 0', padding: '10px 14px', borderRadius: 9,
            background: '#fef2f2', border: '1px solid #fecaca',
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#dc2626', flexShrink: 0,
          }} role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {serverError}
          </div>
        )}
        {successMsg && (
          <div style={{
            margin: '12px 24px 0', padding: '10px 14px', borderRadius: 9,
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#16a34a', flexShrink: 0,
          }} role="status">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {successMsg}
          </div>
        )}

        {/* ── Form (scrollable) ─────────────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}
        >
          <input type="hidden" {...register('agremiado_id')} />
          <input type="hidden" {...register('tasa_cambio', { valueAsNumber: true })} />

          {/* ── Sección 1: Identificación del Pago ─────────────────────────── */}
          <div style={T.section}>
            <div style={T.sectionTitle}>Identificación del pago</div>

            {/* Fecha + Tasa BCV */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={T.field}>
                <label htmlFor="fp-fecha" style={T.label}>Fecha del pago</label>
                <input
                  id="fp-fecha"
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  style={inputStyle('fecha', !!errors.fecha_pago)}
                  {...register('fecha_pago')}
                />
                {errors.fecha_pago && <span style={T.errorText}>{errors.fecha_pago.message}</span>}
              </div>

              <div style={T.field}>
                <label style={T.label}>Tasa BCV</label>
                <div style={{
                  padding: '10px 12px', borderRadius: 9,
                  border: '1.5px solid #e2e8f0',
                  background: loadingTasa ? '#f8fafc' : tasa > 0 ? '#f0f9ff' : '#f8fafc',
                  minHeight: 42, display: 'flex', flexDirection: 'column', justifyContent: 'center',
                }}>
                  {loadingTasa ? (
                    <span style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%',
                        border: '2px solid #cbd5e1', borderTopColor: '#2563eb',
                        display: 'inline-block', animation: 'spin 0.7s linear infinite',
                      }} />
                      Consultando…
                    </span>
                  ) : tasa > 0 ? (
                    <>
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', fontFamily: 'JetBrains Mono, monospace' }}>
                        Bs. {tasa.toFixed(2)}
                      </span>
                      <span style={{ fontSize: 10.5, color: '#64748b', marginTop: 1 }}>{tasaFuente}</span>
                    </>
                  ) : (
                    <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Selecciona una fecha</span>
                  )}
                </div>
              </div>
            </div>

            {/* Método */}
            <div style={T.field}>
              <label htmlFor="fp-metodo" style={T.label}>Método de pago</label>
              <Controller
                name="metodo_pago"
                control={control}
                render={({ field }) => (
                  <select
                    id="fp-metodo"
                    style={{ ...T.input, cursor: 'pointer' }}
                    {...field}
                  >
                    {METODOS_PAGO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                )}
              />
            </div>

            {/* Referencia */}
            <div style={T.field}>
              <label htmlFor="fp-ref" style={T.label}>Número de referencia</label>
              <input
                id="fp-ref"
                type="text"
                placeholder="Ej: 0123456789"
                style={inputStyle('ref', !!errors.referencia)}
                {...register('referencia')}
              />
              {errors.referencia && <span style={T.errorText}>{errors.referencia.message}</span>}
            </div>
          </div>

          {/* ── Sección 2: Monto ─────────────────────────────────────────────── */}
          <div style={T.section}>
            <div style={T.sectionTitle}>Monto</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={T.field}>
                <label htmlFor="fp-ves" style={T.label}>Monto en Bolívares (VES)</label>
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
                        style={inputStyle('ves', !!errors.monto_ves)}
                      />
                    )
                  }}
                />
                {errors.monto_ves && <span style={T.errorText}>{errors.monto_ves.message}</span>}
              </div>

              <div style={T.field}>
                <label style={T.label}>Equivalente USD</label>
                <div style={{
                  padding: '10px 12px', borderRadius: 9,
                  border: `1.5px solid ${montoUSD > 0 && aniosSeleccionados.length > 0 ? (montoMatch ? '#bbf7d0' : '#fecaca') : '#e2e8f0'}`,
                  background: montoUSD > 0 && aniosSeleccionados.length > 0 ? (montoMatch ? '#f0fdf4' : '#fef2f2') : '#f8fafc',
                  minHeight: 42, display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}>
                  <span style={{ fontSize: 15, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: montoUSD > 0 ? '#16a34a' : '#94a3b8' }}>
                    {montoUSD > 0 ? formatUSD(montoUSD) : '—'}
                  </span>
                  {montoEsperadoUSD > 0 && aniosSeleccionados.length > 0 && (
                    <span style={{ fontSize: 10.5, color: montoMatch ? '#16a34a' : '#dc2626', marginTop: 1, fontWeight: 600 }}>
                      {montoMatch ? '✓ Monto correcto' : `Esperado: ${formatUSD(montoEsperadoUSD)}`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Sección 3: Años a acreditar ──────────────────────────────────── */}
          <div style={T.section}>
            <div style={{ ...T.sectionTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Años a acreditar</span>
              {aniosSeleccionados.length > 0 && (
                <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                  {aniosSeleccionados.length} seleccionado{aniosSeleccionados.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {deuda.aniosPendientesPost.length === 0 ? (
              <div style={{
                padding: '16px', borderRadius: 9, background: '#f0fdf4', border: '1px solid #bbf7d0',
                display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#15803d', fontWeight: 500,
              }}>
                <span style={{ fontSize: 20 }}>✅</span>
                El agremiado está solvente en todos los períodos.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Bloque Post-2023 */}
                {deuda.aniosPendientesPost.length > 0 && (
                  <div style={{ padding: '12px 14px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fafafa' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Períodos Pendientes</span>
                      <span style={{
                        padding: '2px 8px', borderRadius: 20,
                        fontSize: 11, fontWeight: 600, background: '#ede9fe', color: '#6d28d9',
                      }}>
                        ${MONTO_POR_ANIO_POST_USD}/año
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {deuda.aniosPendientesPost.map(anio => {
                        const sel = aniosSeleccionados.includes(anio)
                        return (
                          <button
                            key={anio}
                            type="button"
                            id={`fp-anio-${anio}`}
                            onClick={() => toggleAnio(anio)}
                            style={{
                              padding: '8px 16px', borderRadius: 8,
                              border: sel ? '2px solid #2563eb' : '2px solid #e2e8f0',
                              background: sel ? 'linear-gradient(135deg, #eff6ff, #dbeafe)' : '#fff',
                              color: sel ? '#1d4ed8' : '#475569',
                              fontSize: 14, fontWeight: 700, cursor: 'pointer',
                              fontFamily: 'JetBrains Mono, monospace',
                              transition: 'all 0.15s',
                              display: 'flex', alignItems: 'center', gap: 6,
                            }}
                          >
                            {sel && (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
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
              </div>
            )}
            {errors.anios_correspondientes && (
              <span style={T.errorText}>{String(errors.anios_correspondientes.message)}</span>
            )}
          </div>

          {/* ── Sección 4: Notas ─────────────────────────────────────────────── */}
          <div style={T.section}>
            <div style={T.sectionTitle}>Notas <span style={{ textTransform: 'none', fontWeight: 500 }}>(opcional)</span></div>
            <textarea
              id="fp-notas"
              rows={2}
              placeholder="Observaciones adicionales…"
              style={{ ...T.input, resize: 'vertical', lineHeight: 1.5 }}
              {...register('notas')}
            />
          </div>

          {/* ── Resumen de transacción ────────────────────────────────────────── */}
          {aniosSeleccionados.length > 0 && montoVES > 0 && tasa > 0 && (
            <div style={{
              padding: '14px 16px', borderRadius: 10,
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              border: '1px solid #334155',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                Resumen de la transacción
              </div>
              {[
                { label: 'Años a acreditar', value: aniosSeleccionados.sort((a,b)=>a-b).join(', ') },
                { label: 'Monto VES', value: formatVES(montoVES) },
                { label: 'Tasa BCV', value: `Bs. ${tasa.toFixed(2)}` },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: '#94a3b8' }}>{label}</span>
                  <span style={{ color: '#e2e8f0', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, paddingTop: 10, marginTop: 2 }}>
                <span style={{ color: '#e2e8f0', fontWeight: 700 }}>Total USD equivalente</span>
                <span style={{ color: '#4ade80', fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: 16 }}>{formatUSD(montoUSD)}</span>
              </div>
            </div>
          )}
        </form>

        {/* ── Footer / Actions ──────────────────────────────────────────────── */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex', gap: 10,
          flexShrink: 0, background: '#fff',
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            style={{
              flex: 1, padding: '11px 16px', borderRadius: 9,
              border: '1.5px solid #e2e8f0', background: '#f8fafc',
              color: '#475569', fontSize: 14, fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            id="fp-submit"
            form=""
            onClick={(e) => {
              e.preventDefault()
              handleSubmit(onSubmit)()
            }}
            disabled={isLoading || tasa === 0}
            style={{
              flex: 2, padding: '11px 16px', borderRadius: 9, border: 'none',
              background: isLoading || tasa === 0
                ? '#e2e8f0'
                : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: isLoading || tasa === 0 ? '#94a3b8' : '#fff',
              fontSize: 14, fontWeight: 700,
              cursor: isLoading || tasa === 0 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: isLoading || tasa === 0 ? 'none' : '0 4px 14px rgba(37,99,235,0.35)',
              transition: 'all 0.2s', fontFamily: 'inherit',
            }}
          >
            {isLoading ? (
              <>
                <span style={{
                  width: 14, height: 14, borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  display: 'inline-block',
                  animation: 'spin 0.7s linear infinite',
                }} />
                Registrando…
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Registrar Pago
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Animaciones CSS ────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </>
  )
}
