import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { calcularDeuda } from '@/hooks/useCalculadoraDeuda'
import type { VistaSolvencia } from '@/types/database.types'

export const metadata: Metadata = { title: 'Dashboard' }

async function getStats() {
  const supabase = await createClient()

  const [totalResult, solvenciasResult] = await Promise.all([
    supabase.from('agremiados').select('*', { count: 'exact', head: true }),
    (supabase as any).from('vista_solvencia_agremiados').select('anios_solventes') as Promise<{ data: Pick<VistaSolvencia, 'anios_solventes'>[] | null }>,
  ])
  const totalAgremiados = totalResult.count
  const solvencias = solvenciasResult.data

  let solventes = 0
  let morosos = 0

  for (const row of solvencias ?? []) {
    const { esSolvente } = calcularDeuda({ aniosSolventes: row.anios_solventes ?? [] })
    if (esSolvente) solventes++
    else morosos++
  }

  return {
    totalAgremiados: totalAgremiados ?? 0,
    solventes,
    morosos,
    porcentajeSolventes: totalAgremiados
      ? Math.round((solventes / totalAgremiados) * 100)
      : 0,
  }
}

export default async function DashboardPage() {
  const stats = await getStats()

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
          Dashboard General
        </h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>
          Vista consolidada del estado de solvencia del colegio
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid-stats">
        {/* Total Agremiados */}
        <div className="stat-card">
          <div className="stat-card-icon blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
          <div>
            <div className="stat-card-label">Total Agremiados</div>
            <div className="stat-card-value">{stats.totalAgremiados.toLocaleString()}</div>
            <div className="stat-card-sub">Profesionales registrados</div>
          </div>
        </div>

        {/* Solventes */}
        <div className="stat-card">
          <div className="stat-card-icon green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div>
            <div className="stat-card-label">Solventes</div>
            <div className="stat-card-value" style={{ color: '#16a34a' }}>{stats.solventes.toLocaleString()}</div>
            <div className="stat-card-sub">{stats.porcentajeSolventes}% del total</div>
          </div>
        </div>

        {/* Pendientes */}
        <div className="stat-card">
          <div className="stat-card-icon red">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div>
            <div className="stat-card-label">Pendientes</div>
            <div className="stat-card-value" style={{ color: '#dc2626' }}>{stats.morosos.toLocaleString()}</div>
            <div className="stat-card-sub">{100 - stats.porcentajeSolventes}% con deuda pendiente</div>
          </div>
        </div>

        {/* Índice de Solvencia */}
        <div className="stat-card">
          <div className="stat-card-icon amber">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </div>
          <div>
            <div className="stat-card-label">Índice de Solvencia</div>
            <div className="stat-card-value" style={{
              color: stats.porcentajeSolventes >= 70 ? '#16a34a' :
                     stats.porcentajeSolventes >= 40 ? '#d97706' : '#dc2626'
            }}>
              {stats.porcentajeSolventes}%
            </div>
            <div className="stat-card-sub">
              {stats.porcentajeSolventes >= 70 ? '✓ Nivel saludable' :
               stats.porcentajeSolventes >= 40 ? '⚠ Nivel moderado' : '✗ Nivel crítico'}
            </div>
          </div>
        </div>
      </div>

      {/* Reglas de Negocio */}
      <div className="card" style={{ maxWidth: 700 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#0f172a' }}>
          📋 Normativa de Cálculo de Deuda
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{
            padding: 16,
            background: '#fee2e2',
            borderRadius: 10,
            border: '1px solid #fecaca'
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Tarifa Estándar (2023–Presente)
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626', fontFamily: 'JetBrains Mono, monospace' }}>
              $20.00 / año
            </div>
            <div style={{ fontSize: 12, color: '#7f1d1d', marginTop: 4 }}>
              Costo por cada año fiscal individual no cancelado (si tiene algún pago previo registrado).
            </div>
          </div>
          <div style={{
            padding: 16,
            background: '#fef3c7',
            borderRadius: 10,
            border: '1px solid #fde68a'
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Tarifa de Nivelación
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#b45309', fontFamily: 'JetBrains Mono, monospace' }}>
              $80.00
            </div>
            <div style={{ fontSize: 12, color: '#78350f', marginTop: 4 }}>
              Monto fijo único si el agremiado no ha realizado absolutamente ningún pago desde el año 2023.
            </div>
          </div>
        </div>
        <div style={{
          marginTop: 16,
          padding: '12px 14px',
          background: '#f0fdf4',
          borderRadius: 8,
          border: '1px solid #bbf7d0',
          fontSize: 13,
          color: '#166534',
          lineHeight: 1.5
        }}>
          <strong>Ejemplos prácticos:</strong><br />
          • Agremiado sin ningún pago post-2023 → <strong>Tarifa plana de nivelación: $80.00</strong> para ponerse al día.<br />
          • Agremiado con algún año pagado (ej: 2023 solvente) que debe 2024, 2025 y 2026 → <strong>3 años × $20 = $60.00</strong>.
        </div>
      </div>
    </div>
  )
}
