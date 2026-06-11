import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { calcularDeuda, formatUSD, formatVES } from '@/hooks/useCalculadoraDeuda'
import { RegistrarPagoTrigger } from '@/components/agremiados/RegistrarPagoTrigger'
import type { VistaSolvencia, Pago, SolvenciaAnual } from '@/types/database.types'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ id: string }>
}

type PagoConSolvencias = Pago & {
  solvencias_anuales: Pick<SolvenciaAnual, 'anio_correspondiente'>[]
}

// ─── Metadata dinámica ────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('vista_solvencia_agremiados')
    .select('nombres, apellidos')
    .eq('id', id)
    .single()

  if (!data) return { title: 'Agremiado no encontrado' }
  return {
    title: `${data.apellidos}, ${data.nombres} — Perfil | ColPsi`,
    description: `Detalle de solvencias y pagos del agremiado ${data.nombres} ${data.apellidos}`,
  }
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function MetodoBadge({ metodo }: { metodo: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    transferencia: { label: 'Transferencia', bg: '#dbeafe', color: '#1e40af' },
    pago_movil:   { label: 'Pago Móvil',    bg: '#dcfce7', color: '#15803d' },
    efectivo_usd: { label: 'Efectivo USD',  bg: '#fef9c3', color: '#a16207' },
    zelle:        { label: 'Zelle',         bg: '#ede9fe', color: '#6d28d9' },
    otro:         { label: 'Otro',          bg: '#f1f5f9', color: '#475569' },
  }
  const m = map[metodo] ?? { label: metodo, bg: '#f1f5f9', color: '#475569' }
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 20,
      fontSize: 11.5,
      fontWeight: 600,
      background: m.bg,
      color: m.color,
      whiteSpace: 'nowrap',
    }}>
      {m.label}
    </span>
  )
}

function AnioTag({ anio, tipo }: { anio: number; tipo: 'solvente' | 'pendiente' }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 6,
      fontSize: 12.5,
      fontWeight: 700,
      fontFamily: 'JetBrains Mono, monospace',
      background: tipo === 'solvente' ? '#dcfce7' : '#fef2f2',
      color: tipo === 'solvente' ? '#15803d' : '#dc2626',
    }}>
      {anio}
    </span>
  )
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{
      height: 6,
      background: '#e2e8f0',
      borderRadius: 99,
      overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        width: `${Math.min(100, Math.max(0, pct))}%`,
        background: color,
        borderRadius: 99,
        transition: 'width 0.6s ease',
      }} />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AgreiadoDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: agremiado } = await supabase
    .from('vista_solvencia_agremiados')
    .select('*')
    .eq('id', id)
    .single() as { data: VistaSolvencia | null }

  if (!agremiado) notFound()

  const { data: pagos } = await supabase
    .from('pagos')
    .select('*, solvencias_anuales(anio_correspondiente)')
    .eq('agremiado_id', id)
    .order('fecha_pago', { ascending: false }) as { data: PagoConSolvencias[] | null }

  const deuda = calcularDeuda({ aniosSolventes: agremiado.anios_solventes ?? [] })
  const nombreCompleto = `${agremiado.nombres ?? ''} ${agremiado.apellidos ?? ''}`
  const iniciales = `${(agremiado.nombres ?? 'A')[0]}${(agremiado.apellidos ?? 'A')[0]}`.toUpperCase()
  const anioActual = new Date().getFullYear()
  const totalPeriodos = deuda.totalAniosPeriodo
  const pctPost = deuda.aniosSolventes.length / totalPeriodos * 100

  // ─── Estilos de tokens ─────────────────────────────────────────────────────
  const S = {
    // Layout
    page: { fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14, color: '#0f172a' } as React.CSSProperties,
    // Breadcrumb
    breadcrumb: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: '#64748b' } as React.CSSProperties,
    bcLink: { display: 'inline-flex', alignItems: 'center', gap: 5, color: '#2563eb', textDecoration: 'none', fontWeight: 500 } as React.CSSProperties,
    bcSep: { color: '#cbd5e1' } as React.CSSProperties,
    bcCurrent: { fontWeight: 600, color: '#0f172a' } as React.CSSProperties,
    // Header
    header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' } as React.CSSProperties,
    headerLeft: { display: 'flex', alignItems: 'center', gap: 16 } as React.CSSProperties,
    avatar: {
      width: 56, height: 56, borderRadius: '50%',
      background: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 20, fontWeight: 800, flexShrink: 0,
      boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
    } as React.CSSProperties,
    nombre: { fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: 1.2, margin: 0 } as React.CSSProperties,
    metaRow: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6 } as React.CSSProperties,
    metaItem: { fontSize: 13, color: '#64748b', fontFamily: 'JetBrains Mono, monospace' } as React.CSSProperties,
    metaSep: { color: '#e2e8f0' } as React.CSSProperties,
    metaFPV: { fontSize: 13, color: '#2563eb', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' } as React.CSSProperties,
    badgeSolvente: { display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600, background:'#dcfce7', color:'#166534' } as React.CSSProperties,
    badgePendiente: { display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600, background:'#fee2e2', color:'#991b1b' } as React.CSSProperties,
    // Layout grid
    grid: { display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' } as React.CSSProperties,
    colMain: { display: 'flex', flexDirection: 'column', gap: 20 } as React.CSSProperties,
    // Card
    card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' } as React.CSSProperties,
    cardFlush: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' } as React.CSSProperties,
    cardHeader: { padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } as React.CSSProperties,
    sectionTitle: { fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 } as React.CSSProperties,
    // Info grid
    infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 } as React.CSSProperties,
    infoLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 } as React.CSSProperties,
    infoValue: { fontSize: 14, color: '#0f172a', fontWeight: 500 } as React.CSSProperties,
    // Deuda card
    deudaCard: (solvente: boolean): React.CSSProperties => ({
      background: solvente
        ? 'linear-gradient(135deg, #14532d, #166534)'
        : 'linear-gradient(135deg, #1e293b, #0f172a)',
      borderRadius: 12, padding: 20, color: '#fff',
    }),
    deudaTitle: { fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 } as React.CSSProperties,
    deudaAmt: (solvente: boolean): React.CSSProperties => ({
      fontSize: 32, fontWeight: 800,
      fontFamily: 'JetBrains Mono, monospace',
      color: solvente ? '#4ade80' : '#f87171',
      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4,
    }),
    breakdown: { marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 8 } as React.CSSProperties,
    deudaRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: 12.5, color: '#94a3b8' } as React.CSSProperties,
    deudaRowTotal: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 700, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 4 } as React.CSSProperties,
    // Table
    tableWrapper: { overflowX: 'auto' as const },
    th: { padding: '11px 14px', textAlign: 'left' as const, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.06em', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', whiteSpace: 'nowrap' as const },
    td: { padding: '13px 14px', fontSize: 13.5, color: '#0f172a', borderBottom: '1px solid #f8fafc', verticalAlign: 'middle' as const },
    // Badge count
    badgeCount: { padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#f1f5f9', color: '#64748b' } as React.CSSProperties,
    // Empty state
    emptyState: { textAlign: 'center', padding: '48px 20px', color: '#94a3b8' } as React.CSSProperties,
    // Bloque header
    bloqueHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, fontWeight: 600, color: '#64748b', marginBottom: 6 } as React.CSSProperties,
    microLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 } as React.CSSProperties,
  } as const

  return (
    <div style={S.page}>

      {/* Breadcrumb */}
      <nav style={S.breadcrumb}>
        <a href="/dashboard/agremiados" style={S.bcLink}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          Directorio
        </a>
        <span style={S.bcSep}>/</span>
        <span style={S.bcCurrent}>{agremiado.apellidos ?? '—'}, {agremiado.nombres ?? '—'}</span>
      </nav>

      {/* Header */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.avatar}>{iniciales}</div>
          <div>
            <h1 style={S.nombre}>{agremiado.nombres ?? '—'} {agremiado.apellidos ?? '—'}</h1>
            <div style={S.metaRow}>
              <span style={S.metaItem}>C.I. {agremiado.cedula ?? '—'}</span>
              <span style={S.metaSep}>•</span>
              <span style={S.metaFPV}>FPV: {agremiado.fpv ?? '—'}</span>
              <span style={S.metaSep}>•</span>
              {deuda.esSolvente ? (
                <span style={S.badgeSolvente}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', flexShrink: 0, display: 'inline-block' }} />
                  Solvente
                </span>
              ) : (
                <span style={S.badgePendiente}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626', flexShrink: 0, display: 'inline-block' }} />
                  Con Deuda
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <RegistrarPagoTrigger agremiado_id={id} nombreCompleto={nombreCompleto} deuda={deuda} />
        </div>
      </div>

      {/* Grid principal */}
      <div style={S.grid}>

        {/* Columna principal */}
        <div style={S.colMain}>

          {/* Información Personal */}
          <section style={S.card}>
            <h2 style={{ ...S.sectionTitle, marginBottom: 16 }}>Información Personal</h2>
            <div style={S.infoGrid}>
              {[
                {
                  label: 'Correo Electrónico',
                  value: agremiado.correo
                    ? <a href={`mailto:${agremiado.correo}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>{agremiado.correo}</a>
                    : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No registrado</span>,
                },
                {
                  label: 'Teléfono',
                  value: agremiado.telefono
                    ? <a href={`tel:${agremiado.telefono}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>{agremiado.telefono}</a>
                    : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No registrado</span>,
                },
                {
                  label: 'Fecha de Inscripción',
                  value: agremiado.fecha_inscripcion
                    ? new Date(agremiado.fecha_inscripcion + 'T00:00:00').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })
                    : '—',
                },
                {
                  label: 'Años Solventes',
                  value: `${agremiado.total_anios_solventes ?? 0} de ${totalPeriodos} períodos`,
                },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={S.infoLabel}>{label}</div>
                  <div style={S.infoValue}>{value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Historial de Pagos */}
          <section style={S.cardFlush}>
            <div style={S.cardHeader}>
              <h2 style={S.sectionTitle}>Historial de Pagos</h2>
              {pagos && pagos.length > 0 && (
                <span style={S.badgeCount}>{pagos.length} registro{pagos.length !== 1 ? 's' : ''}</span>
              )}
            </div>

            {!pagos || pagos.length === 0 ? (
              <div style={S.emptyState}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>💳</div>
                <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>Sin pagos registrados</p>
                <span style={{ fontSize: 12.5 }}>Los pagos aparecerán aquí una vez registrados.</span>
              </div>
            ) : (
              <div style={S.tableWrapper}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Fecha', 'Referencia', 'Método', 'Tasa BCV', 'Monto VES', 'Monto USD', 'Años acreditados'].map((h, i) => (
                        <th key={h} style={{ ...S.th, textAlign: i >= 4 && i <= 5 ? 'right' : 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagos.map((pago, ri) => (
                      <tr key={pago.id} style={{ background: ri % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ ...S.td, whiteSpace: 'nowrap', fontSize: 13 }}>
                          {new Date(pago.fecha_pago + 'T00:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={S.td}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#64748b' }}>
                            {pago.referencia}
                          </span>
                        </td>
                        <td style={S.td}>
                          <MetodoBadge metodo={pago.metodo_pago} />
                        </td>
                        <td style={S.td}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#64748b' }}>
                            {pago.tasa_cambio.toFixed(2)}
                          </span>
                        </td>
                        <td style={{ ...S.td, textAlign: 'right' }}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#374151' }}>
                            {formatVES(pago.monto_ves)}
                          </span>
                        </td>
                        <td style={{ ...S.td, textAlign: 'right' }}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
                            {formatUSD(pago.monto_usd ?? 0)}
                          </span>
                        </td>
                        <td style={S.td}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {pago.solvencias_anuales
                              .sort((a, b) => a.anio_correspondiente - b.anio_correspondiente)
                              .map((s) => (
                                <AnioTag key={s.anio_correspondiente} anio={s.anio_correspondiente} tipo="solvente" />
                              ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Columna derecha — Estado de cuenta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Tarjeta deuda */}
          <div style={S.deudaCard(deuda.esSolvente)}>
            <div style={S.deudaTitle}>Estado de Cuenta</div>
            <div style={S.deudaAmt(deuda.esSolvente)}>
              {deuda.esSolvente ? (
                <>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Solvente
                </>
              ) : formatUSD(deuda.totalUSD)}
            </div>

            {!deuda.esSolvente && (
              <div style={S.breakdown}>
                {deuda.deudaPreBlock > 0 && (
                  <div style={S.deudaRow}>
                    <span>
                      Bloque 2010–2022
                      <br />
                      <span style={{ opacity: 0.6, fontSize: 11 }}>({deuda.aniosPendientesPre.length} años — pago único)</span>
                    </span>
                    <span style={{ color: '#e2e8f0', fontWeight: 700, fontFamily: 'monospace' }}>{formatUSD(deuda.deudaPreBlock)}</span>
                  </div>
                )}
                {deuda.deudaPostBlock > 0 && (
                  <div style={S.deudaRow}>
                    <span>
                      Post-2023
                      <br />
                      <span style={{ opacity: 0.6, fontSize: 11 }}>({deuda.aniosPendientesPost.length} años × $20)</span>
                    </span>
                    <span style={{ color: '#e2e8f0', fontWeight: 700, fontFamily: 'monospace' }}>{formatUSD(deuda.deudaPostBlock)}</span>
                  </div>
                )}
                <div style={S.deudaRowTotal}>
                  <span style={{ color: '#e2e8f0' }}>Total a pagar</span>
                  <span style={{ color: '#f87171', fontFamily: 'JetBrains Mono, monospace' }}>{formatUSD(deuda.totalUSD)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Progreso de solvencia */}
          <div style={S.card}>
            <div style={{ ...S.microLabel, marginBottom: 14 }}>Progreso de Solvencia</div>

            {/* Post-2023 */}
            <div>
              <div style={S.bloqueHeader}>
                <span>Períodos 2023–{anioActual}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#475569' }}>
                  {deuda.aniosSolventes.length}/{totalPeriodos} años
                </span>
              </div>
              <ProgressBar pct={pctPost} color="linear-gradient(90deg, #22c55e, #16a34a)" />
            </div>
          </div>

          {/* Años pendientes */}
          {deuda.aniosPendientesPost.length > 0 && (
            <div style={S.card}>
              <div style={S.microLabel}>Años pendientes</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {deuda.aniosPendientesPost.map(a => <AnioTag key={a} anio={a} tipo="pendiente" />)}
              </div>
            </div>
          )}

          {/* Años solventes */}
          {deuda.aniosSolventes.length > 0 && (
            <div style={S.card}>
              <div style={S.microLabel}>Años con solvencia</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {deuda.aniosSolventes.sort((a, b) => b - a).map(a => <AnioTag key={a} anio={a} tipo="solvente" />)}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
