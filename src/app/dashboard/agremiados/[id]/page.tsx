import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { calcularDeuda, formatUSD } from '@/hooks/useCalculadoraDeuda'
import type { VistaSolvencia, Pago, SolvenciaAnual } from '@/types/database.types'
import { notFound } from 'next/navigation'

export const metadata: Metadata = { title: 'Perfil de Agremiado' }

interface Props {
  params: Promise<{ id: string }>
}

type PagoConSolvencias = Pago & {
  solvencias_anuales: Pick<SolvenciaAnual, 'anio_correspondiente'>[]
}

export default async function AgreiadoDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // Obtener datos del agremiado con tipo explícito
  const agreiadoResult = await (supabase as any)
    .from('vista_solvencia_agremiados')
    .select('*')
    .eq('id', id)
    .single() as { data: VistaSolvencia | null }

  const agremiado = agreiadoResult.data
  if (!agremiado) notFound()

  // Obtener historial de pagos
  const pagosResult = await supabase
    .from('pagos')
    .select('*, solvencias_anuales(anio_correspondiente)')
    .eq('agremiado_id', id)
    .order('fecha_pago', { ascending: false })

  const pagos = pagosResult.data as PagoConSolvencias[] | null

  const deuda = calcularDeuda({ aniosSolventes: agremiado.anios_solventes ?? [] })

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 20, fontSize: 13, color: '#64748b' }}>
        <a href="/dashboard/agremiados" style={{ color: '#2563eb', textDecoration: 'none' }}>
          Directorio
        </a>
        {' / '}
        <span>{agremiado.apellidos}, {agremiado.nombres}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 28, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 22,
              fontWeight: 700,
            }}>
              {agremiado.nombres[0]}{agremiado.apellidos[0]}
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
                {agremiado.nombres} {agremiado.apellidos}
              </h1>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
                <span className="font-mono" style={{ fontSize: 13, color: '#64748b' }}>
                  C.I. {agremiado.cedula}
                </span>
                <span style={{ color: '#e2e8f0' }}>•</span>
                <span className="font-mono" style={{ fontSize: 13, color: '#2563eb', fontWeight: 600 }}>
                  FPV: {agremiado.fpv}
                </span>
                {deuda.semaforo === 'verde' ? (
                  <span className="badge-solvente">Solvente</span>
                ) : (
                  <span className="badge-moroso">Moroso</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Información personal */}
          <div className="card">
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Información Personal</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { label: 'Correo', value: agremiado.correo || '—' },
                { label: 'Teléfono', value: agremiado.telefono || '—' },
                { label: 'Fecha de Inscripción', value: new Date(agremiado.fecha_inscripcion).toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' }) },
                { label: 'Total Años Solventes', value: `${agremiado.total_anios_solventes} año(s)` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Historial de pagos */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>Historial de Pagos</h2>
            </div>
            {!pagos || pagos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 20px', color: '#94a3b8' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>💳</div>
                <div style={{ fontSize: 13 }}>Sin pagos registrados</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Referencia</th>
                    <th>Método</th>
                    <th style={{ textAlign: 'right' }}>Monto USD</th>
                    <th>Años acreditados</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((pago) => (
                    <tr key={pago.id}>
                      <td style={{ fontSize: 13 }}>
                        {new Date(pago.fecha_pago).toLocaleDateString('es-VE')}
                      </td>
                      <td>
                        <span className="font-mono" style={{ fontSize: 12, color: '#64748b' }}>
                          {pago.referencia}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 20,
                          fontSize: 11.5,
                          fontWeight: 600,
                          background: '#f1f5f9',
                          color: '#475569',
                          textTransform: 'capitalize',
                        }}>
                          {pago.metodo_pago.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
                          {formatUSD(pago.monto_usd)}
                        </span>
                      </td>
                      <td style={{ fontSize: 12.5, color: '#64748b' }}>
                        {pago.solvencias_anuales.map(s => s.anio_correspondiente).join(', ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right column — Deuda Card */}
        <div>
          <div className="deuda-card">
            <div className="deuda-card-title">Estado de Deuda</div>
            <div className={`deuda-amount ${deuda.semaforo}`}>
              {deuda.esSolvente ? '$0.00' : formatUSD(deuda.totalUSD)}
            </div>
            {!deuda.esSolvente && (
              <div className="deuda-breakdown">
                {deuda.deudaPreBlock > 0 && (
                  <div className="deuda-row">
                    <span>Bloque Pre-2023 ({deuda.aniosPendientesPre.length} años)</span>
                    <span>{formatUSD(deuda.deudaPreBlock)}</span>
                  </div>
                )}
                {deuda.deudaPostBlock > 0 && (
                  <div className="deuda-row">
                    <span>Post-2023 ({deuda.aniosPendientesPost.length} años × $20)</span>
                    <span>{formatUSD(deuda.deudaPostBlock)}</span>
                  </div>
                )}
                <div className="deuda-row" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, marginTop: 4 }}>
                  <span style={{ fontWeight: 700, color: '#e2e8f0' }}>Total a pagar</span>
                  <span style={{ color: '#f87171', fontSize: 14 }}>{formatUSD(deuda.totalUSD)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Años pendientes post-2023 */}
          {deuda.aniosPendientesPost.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                Años pendientes (Post-2023)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {deuda.aniosPendientesPost.map((anio) => (
                  <span key={anio} style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 700,
                    background: '#fef2f2',
                    color: '#dc2626',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}>
                    {anio}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Pre-2023 status */}
          <div className="card" style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Bloque 2010–2022
            </div>
            {deuda.deudaPrePagada ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#16a34a' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Bloque cancelado</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  Pendiente — ${deuda.deudaPreBlock} flat
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
