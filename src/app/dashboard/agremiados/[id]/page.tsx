import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { calcularDeuda, formatUSD, formatVES } from '@/hooks/useCalculadoraDeuda'
import { RegistrarPagoTrigger } from '@/components/agremiados/RegistrarPagoTrigger'
import { EditarPerfilTrigger } from '@/components/agremiados/EditarPerfilTrigger'
import { DocumentosViewer } from '@/components/agremiados/DocumentosViewer'
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

  const [agremiadoRes, agremiadoTableRes] = await Promise.all([
    supabase.from('vista_solvencia_agremiados').select('*').eq('id', id).single(),
    supabase.from('agremiados').select('fecha_recepcion_titulo').eq('id', id).single(),
  ])

  const agremiado = agremiadoRes.data as VistaSolvencia | null
  if (!agremiado) notFound()

  const fechaRecepcionTitulo = agremiadoTableRes.data?.fecha_recepcion_titulo ?? null

  const { data: pagos } = await supabase
    .from('pagos')
    .select('*, solvencias_anuales(anio_correspondiente)')
    .eq('agremiado_id', id)
    .order('fecha_pago', { ascending: false }) as { data: PagoConSolvencias[] | null }

  const hasPaidInscription = pagos?.some(p => p.tipo_pago === 'inscripcion') ?? false
  const mesesCustodiaPagados = pagos
    ?.filter(p => p.tipo_pago === 'custodia')
    .flatMap(p => p.meses_custodia ?? []) ?? []

  const deuda = calcularDeuda({
    aniosSolventes: agremiado.anios_solventes ?? [],
    fechaInscripcion: agremiado.fecha_inscripcion ?? '',
    fechaRecepcionTitulo: fechaRecepcionTitulo,
    mesesCustodiaPagados: mesesCustodiaPagados,
    hasPaidInscription: hasPaidInscription
  })
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
          <div style={{ ...S.avatar, overflow: 'hidden', padding: 0 }}>
            {agremiado.foto_carnet && !agremiado.foto_carnet.includes('placeholder') ? (
              <img src={agremiado.foto_carnet} alt={nombreCompleto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg viewBox="0 0 120 120" className="w-full h-full">
                <rect width="120" height="120" fill="#2563eb" />
                {/* Head */}
                <circle cx="60" cy="50" r="22" fill="#fed7aa" />
                {/* Shoulders */}
                <path d="M20 100c0-18 18-30 40-30s40 12 40 30" fill="#3b82f6" />
                {/* Tie */}
                <path d="M60 70l-6 16h12z" fill="#1d4ed8" />
                {/* Suit collars */}
                <path d="M40 70l20 30 20-30" fill="none" stroke="#1e40af" strokeWidth="3" />
                {/* Hair/Cap */}
                <path d="M38 50c0-15 10-22 22-22s22 7 22 22v3H38z" fill="#475569" />
              </svg>
            )}
          </div>
          <div>
            <h1 style={S.nombre}>{agremiado.nombres ?? '—'} {agremiado.apellidos ?? '—'}</h1>
            <div style={S.metaRow}>
              <span style={S.metaItem}>C.I. {agremiado.cedula ?? '—'}</span>
              <span style={S.metaSep}>•</span>
              <span style={S.metaFPV}>FPV: {agremiado.fpv ?? '—'}</span>
              <span style={S.metaSep}>•</span>
              {!deuda.esAgremiadoActivo ? (
                <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600, background:'#fef3c7', color:'#d97706', border:'1px solid #fcd34d' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d97706', flexShrink: 0, display: 'inline-block' }} />
                  Registrado (Inscripción Pendiente)
                </span>
              ) : deuda.esSolvente ? (
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
              <span style={S.metaSep}>•</span>
              {!deuda.esAgremiadoActivo ? (
                <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600, background:'#f1f5f9', color:'#475569', border:'1px solid #cbd5e1' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#64748b', flexShrink: 0, display: 'inline-block' }} />
                  Pre-agremiado (No Activo)
                </span>
              ) : agremiado.fecha_inscripcion && new Date(agremiado.fecha_inscripcion + 'T00:00:00').getFullYear() >= 2023 ? (
                <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600, background:'#ede9fe', color:'#6d28d9' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8b5cf6', flexShrink: 0, display: 'inline-block' }} />
                  Nuevo Agremiado
                </span>
              ) : (
                <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600, background:'#e2e8f0', color:'#475569' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#64748b', flexShrink: 0, display: 'inline-block' }} />
                  Viejo Agremiado
                </span>
              )}
            </div>
          </div>
        </div>
 
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <EditarPerfilTrigger
            agremiado={{
              id: id,
              cedula: agremiado.cedula ?? '',
              fpv: agremiado.fpv ?? '',
              nombres: agremiado.nombres ?? '',
              apellidos: agremiado.apellidos ?? '',
              correo: agremiado.correo,
              telefono: agremiado.telefono,
              fecha_inscripcion: agremiado.fecha_inscripcion ?? '',
              direccion: agremiado.direccion,
              colegio_pertenece: agremiado.colegio_pertenece,
              foto_carnet: agremiado.foto_carnet,
              planilla_fpv: agremiado.planilla_fpv,
              cedula_digitalizada: agremiado.cedula_digitalizada,
              rif_digitalizado: agremiado.rif_digitalizado,
              titulo_graduacion: agremiado.titulo_graduacion,
            }}
            fechaRecepcionTitulo={fechaRecepcionTitulo}
          />
          <RegistrarPagoTrigger
            agremiado_id={id}
            nombreCompleto={nombreCompleto}
            deuda={deuda}
            fecha_recepcion_titulo={fechaRecepcionTitulo}
            fecha_inscripcion={agremiado.fecha_inscripcion}
          />
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
                  label: 'Colegio Perteneciente',
                  value: agremiado.colegio_pertenece
                    ? <span style={{ fontWeight: 500 }}>{agremiado.colegio_pertenece}</span>
                    : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No registrado</span>,
                },
                {
                  label: 'Dirección de Habitación',
                  value: agremiado.direccion
                    ? <span style={{ fontWeight: 500 }}>{agremiado.direccion}</span>
                    : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No registrada</span>,
                },
                {
                  label: 'Fecha de Inscripción',
                  value: agremiado.fecha_inscripcion
                    ? new Date(agremiado.fecha_inscripcion + 'T00:00:00').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })
                    : '—',
                },
                {
                  label: 'Recepción del Título',
                  value: fechaRecepcionTitulo
                    ? new Date(fechaRecepcionTitulo + 'T00:00:00').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })
                    : <span style={{ color: '#64748b', fontStyle: 'italic', fontSize: '13px' }}>No registrada (se asume fecha de inscripción)</span>,
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
                <svg style={{ width: 40, height: 40, color: '#cbd5e1', margin: '0 auto 12px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
                <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>Sin pagos registrados</p>
                <span style={{ fontSize: 12.5 }}>Los pagos aparecerán aquí una vez registrados.</span>
              </div>
            ) : (
              <div style={S.tableWrapper}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Fecha', 'Referencia', 'Método', 'Tasa BCV', 'Monto VES', 'Monto USD', 'Concepto / Período'].map((h, i) => (
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
                          {(!pago.tipo_pago || pago.tipo_pago === 'solvencia') && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {pago.solvencias_anuales && pago.solvencias_anuales.length > 0 ? (
                                pago.solvencias_anuales
                                  .sort((a, b) => a.anio_correspondiente - b.anio_correspondiente)
                                  .map((s) => (
                                    <AnioTag key={s.anio_correspondiente} anio={s.anio_correspondiente} tipo="solvente" />
                                  ))
                              ) : (
                                <span style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>Solvencia</span>
                              )}
                            </div>
                          )}
                          {pago.tipo_pago === 'inscripcion' && (
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11.5,
                              fontWeight: 750,
                              background: '#f3e8ff',
                              color: '#6b21a8'
                            }}>
                              Inscripción
                            </span>
                          )}
                          {pago.tipo_pago === 'carnet' && (
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11.5,
                              fontWeight: 750,
                              background: '#ddd6fe',
                              color: '#5b21b6'
                            }}>
                              Carnet
                            </span>
                          )}
                          {pago.tipo_pago === 'custodia' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontSize: 11.5,
                                fontWeight: 750,
                                background: '#fef3c7',
                                color: '#92400e',
                                width: 'fit-content'
                              }}>
                                Custodia
                              </span>
                              {pago.meses_custodia && pago.meses_custodia.length > 0 && (
                                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b' }}>
                                  Meses: {pago.meses_custodia.sort().map(m => m.split('-')[1]).join(', ')}
                                </span>
                              )}
                            </div>
                          )}
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
                {deuda.deudaInscripcion > 0 && (
                  <div style={S.deudaRow}>
                    <span>
                      Inscripción (Obligatoria)
                      <br />
                      <span style={{ opacity: 0.6, fontSize: 11 }}>(Pago único pendiente)</span>
                    </span>
                    <span style={{ color: '#e2e8f0', fontWeight: 700, fontFamily: 'monospace' }}>{formatUSD(deuda.deudaInscripcion)}</span>
                  </div>
                )}
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
                      Solvencias {deuda.tarifaNivelacionAplicada ? '(Tarifa Nivelación)' : ''}
                      <br />
                      <span style={{ opacity: 0.6, fontSize: 11 }}>
                        {deuda.tarifaNivelacionAplicada 
                          ? 'Todos los años pendientes' 
                          : `(${deuda.aniosPendientesPost.length} año${deuda.aniosPendientesPost.length !== 1 ? 's' : ''} × $20)`}
                      </span>
                    </span>
                    <span style={{ color: '#e2e8f0', fontWeight: 700, fontFamily: 'monospace' }}>{formatUSD(deuda.deudaPostBlock)}</span>
                  </div>
                )}
                {deuda.deudaCustodia > 0 && (
                  <div style={S.deudaRow}>
                    <span>
                      Custodia de Título
                      <br />
                      <span style={{ opacity: 0.6, fontSize: 11 }}>({deuda.mesesPendientesCustodia.length} mes{deuda.mesesPendientesCustodia.length !== 1 ? 'es' : ''} × $5)</span>
                    </span>
                    <span style={{ color: '#e2e8f0', fontWeight: 700, fontFamily: 'monospace' }}>{formatUSD(deuda.deudaCustodia)}</span>
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

          {/* Expediente / Adjuntos */}
          <DocumentosViewer
            nombreCompleto={nombreCompleto}
            cedula={agremiado.cedula ?? ''}
            fpv={agremiado.fpv ?? ''}
            fechaInscripcion={agremiado.fecha_inscripcion ?? ''}
            fotoCarnetUrl={agremiado.foto_carnet}
            planillaFpvUrl={agremiado.planilla_fpv}
            cedulaDigitalizadaUrl={agremiado.cedula_digitalizada}
            rifDigitalizadoUrl={agremiado.rif_digitalizado}
            tituloGraduacionUrl={agremiado.titulo_graduacion}
          />

        </div>
      </div>
    </div>
  )
}
