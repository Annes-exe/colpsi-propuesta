import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { calcularDeuda } from '@/hooks/useCalculadoraDeuda'
import type { VistaSolvencia } from '@/types/database.types'

export const metadata: Metadata = { title: 'Dashboard' }

async function getStats() {
  const supabase = await createClient()

  const [totalResult, solvenciasResult, pagosResult, pendingApprovalsResult] = await Promise.all([
    supabase.from('agremiados').select('*', { count: 'exact', head: true }).neq('estado_cuenta', 'por_verificar'),
    (supabase as any).from('vista_solvencia_agremiados').select('anios_solventes').neq('estado_cuenta', 'por_verificar') as Promise<{ data: Pick<VistaSolvencia, 'anios_solventes'>[] | null }>,
    supabase.from('pagos').select('fecha_pago, monto_usd'),
    supabase.from('agremiados').select('*', { count: 'exact', head: true }).eq('estado_cuenta', 'por_verificar'),
  ])

  const totalAgremiados = totalResult.count ?? 0
  const solvencias = solvenciasResult.data ?? []
  const pagos = pagosResult.data ?? []
  const pendingApprovals = pendingApprovalsResult.count ?? 0

  let solventes = 0
  let morosos = 0

  for (const row of solvencias) {
    const { esSolvente } = calcularDeuda({ aniosSolventes: row.anios_solventes ?? [] })
    if (esSolvente) solventes++
    else morosos++
  }

  // Agrupar cobros de los últimos 5 meses
  const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const chartData = []
  const hoy = new Date()

  for (let i = 4; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    chartData.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: `${mesesNombres[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,
      total: 0,
    })
  }

  for (const pago of pagos) {
    if (!pago.fecha_pago) continue
    const pDate = new Date(pago.fecha_pago + 'T00:00:00')
    const key = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`
    const item = chartData.find((c) => c.key === key)
    if (item) {
      item.total += pago.monto_usd ?? 0
    }
  }

  const totalRecaudadoReales = chartData.reduce((acc, c) => acc + c.total, 0)
  const isDemoData = totalRecaudadoReales === 0

  if (isDemoData) {
    // Seeding mock data for visual completeness if database has no payments
    chartData[0].total = 120
    chartData[1].total = 220
    chartData[2].total = 180
    chartData[3].total = 310
    chartData[4].total = 250
  }

  return {
    totalAgremiados,
    solventes,
    morosos,
    porcentajeSolventes: totalAgremiados ? Math.round((solventes / totalAgremiados) * 100) : 0,
    chartData,
    isDemoData,
    pendingApprovals,
  }
}

export default async function DashboardPage() {
  const stats = await getStats()

  // Donut SVG Math
  const radius = 50
  const circ = 2 * Math.PI * radius
  const solventPercentage = stats.porcentajeSolventes
  const strokeOffset = circ - (circ * solventPercentage) / 100

  // Bar Chart Math
  const maxVal = Math.max(...stats.chartData.map((d) => d.total), 100)

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Dashboard General</h1>
        <p className="text-xs text-slate-500 mt-1">Colegio de Psicólogos — Consolidado de Solvencias y Pagos</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* Total Agremiados */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 hover:shadow-xs transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Agremiados</div>
            <div className="text-2xl font-extrabold text-slate-950 font-mono mt-0.5">{stats.totalAgremiados.toLocaleString()}</div>
            <div className="text-[10px] text-slate-400 font-medium">Agremiados activos/morosos</div>
          </div>
        </div>

        {/* Solventes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 hover:shadow-xs transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Solventes</div>
            <div className="text-2xl font-extrabold text-emerald-600 font-mono mt-0.5">{stats.solventes.toLocaleString()}</div>
            <div className="text-[10px] text-slate-400 font-medium">{stats.porcentajeSolventes}% del total activo</div>
          </div>
        </div>

        {/* Pendientes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 hover:shadow-xs transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Pendientes</div>
            <div className="text-2xl font-extrabold text-rose-600 font-mono mt-0.5">{stats.morosos.toLocaleString()}</div>
            <div className="text-[10px] text-slate-400 font-medium">{100 - stats.porcentajeSolventes}% con deudas activas</div>
          </div>
        </div>

        {/* Indice Solvencia */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 hover:shadow-xs transition-shadow">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            stats.porcentajeSolventes >= 70
              ? 'bg-emerald-50 text-emerald-600'
              : stats.porcentajeSolventes >= 40
              ? 'bg-amber-50 text-amber-600'
              : 'bg-rose-50 text-rose-600'
          }`}>
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Índice Solvencia</div>
            <div className={`text-2xl font-extrabold font-mono mt-0.5 ${
              stats.porcentajeSolventes >= 70
                ? 'text-emerald-600'
                : stats.porcentajeSolventes >= 40
                ? 'text-amber-600'
                : 'text-rose-600'
            }`}>{stats.porcentajeSolventes}%</div>
            <div className="text-[10px] text-slate-400 font-medium">
              {stats.porcentajeSolventes >= 70 ? '✓ Nivel saludable' : stats.porcentajeSolventes >= 40 ? '⚠ Nivel moderado' : '✗ Nivel crítico'}
            </div>
          </div>
        </div>

        {/* Solicitudes Pendientes (Aprobaciones) */}
        <Link
          href="/dashboard/aprobaciones"
          className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 hover:shadow-xs hover:border-amber-300 transition-all group"
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            stats.pendingApprovals > 0
              ? 'bg-amber-50 text-amber-600 animate-pulse border border-amber-200'
              : 'bg-slate-50 text-slate-400'
          }`}>
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Por Verificar</div>
            <div className={`text-2xl font-extrabold font-mono mt-0.5 ${
              stats.pendingApprovals > 0 ? 'text-amber-600' : 'text-slate-500'
            }`}>
              {stats.pendingApprovals.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Revisión requerida</div>
          </div>
        </Link>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Solvencia Donut Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Distribución de Solvencia</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 my-auto py-2">
            {/* SVG Donut */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={radius} fill="none" stroke="#fee2e2" strokeWidth="12" />
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="12"
                  strokeDasharray={circ}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-slate-900 font-mono leading-none">{stats.porcentajeSolventes}%</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">Solvente</span>
              </div>
            </div>

            {/* Legends */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded bg-emerald-500 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-500">Agremiados Solventes</div>
                  <div className="text-base font-extrabold text-slate-800 font-mono mt-0.5">{stats.solventes.toLocaleString()}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded bg-red-400 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-500">Agremiados Pendientes</div>
                  <div className="text-base font-extrabold text-slate-800 font-mono mt-0.5">{stats.morosos.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Collections Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Recaudación Mensual ($ USD)</h2>
            {stats.isDemoData && (
              <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded">
                Simulado (Sin pagos)
              </span>
            )}
          </div>

          {/* SVG Bar Chart */}
          <div className="w-full my-auto flex items-end justify-between gap-3 h-36 pt-4 px-2">
            {stats.chartData.map((d) => {
              const heightPct = Math.round((d.total / maxVal) * 100)
              return (
                <div key={d.key} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 bg-slate-900 text-white font-bold font-mono text-[10px] px-2 py-0.5 rounded absolute -translate-y-8 transition-opacity duration-200 shadow-xs z-10">
                    ${d.total.toFixed(0)}
                  </div>
                  {/* Bar */}
                  <div className="w-full bg-slate-100 rounded-t-lg h-24 flex items-end">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-gradient-to-t from-blue-600 to-blue-500 rounded-t-lg group-hover:from-blue-500 group-hover:to-sky-400 transition-all duration-500 shadow-xs"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate max-w-full text-center">
                    {d.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Quick Access & Normativa */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Access */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Accesos Rápidos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/dashboard/directorio/nuevo"
              className="flex flex-col items-center text-center p-4 rounded-xl border border-slate-150 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-200 group transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="16" y1="11" x2="22" y2="11" />
                </svg>
              </div>
              <span className="text-xs font-bold text-slate-800">Registrar Agremiado</span>
            </Link>

            <Link
              href="/dashboard/agremiados"
              className="flex flex-col items-center text-center p-4 rounded-xl border border-slate-150 bg-slate-50 hover:bg-emerald-50/50 hover:border-emerald-200 group transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="1" y="4" width="22" height="16" rx="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              </div>
              <span className="text-xs font-bold text-slate-800">Registrar Pago</span>
            </Link>

            <Link
              href="/dashboard/agremiados"
              className="flex flex-col items-center text-center p-4 rounded-xl border border-slate-150 bg-slate-50 hover:bg-purple-50/50 hover:border-purple-200 group transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <span className="text-xs font-bold text-slate-800">Ver Directorio</span>
            </Link>
          </div>
        </div>

        {/* Normativa */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2.5">Normativa de Solvencias</h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-2.5 bg-red-50 border border-red-100 rounded-xl">
                <span className="text-[10px] font-bold text-red-800 uppercase tracking-wide">Tarifa Solvencia</span>
                <div className="text-base font-extrabold text-red-600 font-mono mt-0.5">$20.00 / año</div>
                <p className="text-[10px] text-red-800 mt-1 leading-snug">Costo anual individual a partir de 2023.</p>
              </div>
              <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">Tarifa Nivelación</span>
                <div className="text-base font-extrabold text-amber-700 font-mono mt-0.5">$80.00</div>
                <p className="text-[10px] text-amber-800 mt-1 leading-snug">Monto plano si debe todo desde 2023.</p>
              </div>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-150 leading-relaxed">
            <strong>Inscripción:</strong> Obligatorio $30.00. <strong>Carnet:</strong> $15.00. <strong>Custodia:</strong> $5.00/mes (exentos primeros 3 meses cortesía).
          </div>
        </div>
      </div>
    </div>
  )
}
