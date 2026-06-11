'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calcularDeuda, formatUSD } from '@/hooks/useCalculadoraDeuda'
import type { VistaSolvencia } from '@/types/database.types'

const PAGE_SIZE = 15

interface AgreiadoRow extends VistaSolvencia {
  deudaTotal: number
  semaforo: 'verde' | 'rojo'
}

export function AgreiadosDataGrid() {
  const supabase = createClient()

  const [rows, setRows] = useState<AgreiadoRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [filtroSolvencia, setFiltroSolvencia] = useState<'todos' | 'solventes' | 'pendientes'>('todos')
  const searchRef = useRef<HTMLInputElement>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchAgremiados = useCallback(async (q: string, p: number, filtro: string) => {
    setLoading(true)
    try {
      let query = (supabase as any)
        .from('vista_solvencia_agremiados')
        .select('*', { count: 'exact' })

      // Búsqueda por cédula o FPV (ultra-rápida por índice)
      if (q.trim()) {
        query = query.or(`cedula.ilike.%${q}%,fpv.ilike.%${q}%,nombres.ilike.%${q}%,apellidos.ilike.%${q}%`)
      }

      const { data, count, error } = await query
        .order('apellidos', { ascending: true })
        .range(p * PAGE_SIZE, (p + 1) * PAGE_SIZE - 1)

      if (error) throw error

      const mapped: AgreiadoRow[] = ((data ?? []) as VistaSolvencia[]).map((row: VistaSolvencia) => {
        const { totalUSD, semaforo } = calcularDeuda({
          aniosSolventes: row.anios_solventes ?? [],
        })
        return { ...row, deudaTotal: totalUSD, semaforo }
      })

      // Filtrar por estado de solvencia en cliente
      const filtered = filtro === 'solventes'
        ? mapped.filter(r => r.semaforo === 'verde')
        : filtro === 'pendientes'
        ? mapped.filter(r => r.semaforo === 'rojo')
        : mapped

      setRows(filtered)
      setTotal(count ?? 0)
    } catch (err) {
      console.error('Error fetching agremiados:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Debounce search input
  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setPage(0)
      fetchAgremiados(value, 0, filtroSolvencia)
    }, 300)
  }

  useEffect(() => {
    fetchAgremiados(search, page, filtroSolvencia)
  }, [page, filtroSolvencia])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const inicio = page * PAGE_SIZE + 1
  const fin = Math.min((page + 1) * PAGE_SIZE, total)

  return (
    <div className="table-container">
      {/* Header */}
      <div className="table-header">
        <div>
          <div className="table-title">Directorio de Agremiados</div>
          <div className="table-subtitle">
            {total.toLocaleString()} profesionales registrados
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Filtro Solvencia */}
          <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
            {(['todos', 'solventes', 'pendientes'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFiltroSolvencia(f); setPage(0) }}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12.5,
                  fontWeight: 600,
                  transition: 'all 0.15s',
                  background: filtroSolvencia === f ? '#fff' : 'transparent',
                  color: filtroSolvencia === f
                    ? f === 'solventes' ? '#16a34a' : f === 'pendientes' ? '#dc2626' : '#0f172a'
                    : '#64748b',
                  boxShadow: filtroSolvencia === f ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {f === 'todos' ? 'Todos' : f === 'solventes' ? '🟢 Solventes' : '🔴 Pendientes'}
              </button>
            ))}
          </div>

          {/* Búsqueda */}
          <div className="search-input-wrapper">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={searchRef}
              type="text"
              className="search-input"
              placeholder="Buscar por Cédula, FPV o nombre..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              id="busqueda-agremiados"
            />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Cédula</th>
              <th>FPV</th>
              <th>Nombre Completo</th>
              <th>Correo</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Deuda USD</th>
              <th>Años Solventes</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j}>
                      <div className="loading-skeleton" style={{ height: 16, width: j === 2 ? 140 : 80 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                  <div style={{ fontWeight: 600 }}>No se encontraron resultados</div>
                  <div style={{ fontSize: 12.5, marginTop: 4 }}>Intenta con otro término de búsqueda</div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className="font-mono" style={{ fontSize: 13, fontWeight: 600 }}>
                      {row.cedula}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono" style={{ fontSize: 13, color: '#2563eb', fontWeight: 600 }}>
                      {row.fpv}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>
                      {row.apellidos ?? '—'}, {row.nombres ?? '—'}
                    </div>
                  </td>
                  <td style={{ color: '#64748b', fontSize: 13 }}>
                    {row.correo || <span style={{ color: '#94a3b8' }}>—</span>}
                  </td>
                  <td>
                    {row.semaforo === 'verde' ? (
                      <span className="badge-solvente">Solvente</span>
                    ) : (
                      <span className="badge-pendiente">Pendiente</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span
                      className="font-mono"
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: row.deudaTotal === 0 ? '#16a34a' : '#dc2626',
                      }}
                    >
                      {row.deudaTotal === 0 ? '$0.00' : formatUSD(row.deudaTotal)}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      {(row.total_anios_solventes ?? 0) > 0
                        ? `${row.total_anios_solventes} año${row.total_anios_solventes !== 1 ? 's' : ''}`
                        : <span style={{ color: '#94a3b8' }}>Ninguno</span>
                      }
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <a
                        href={`/dashboard/agremiados/${row.id}`}
                        className="btn btn-secondary btn-sm"
                        title="Ver detalle"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        Ver
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {total > PAGE_SIZE && (
        <div className="pagination">
          <div className="pagination-info">
            Mostrando {inicio}–{fin} de {total.toLocaleString()} agremiados
          </div>
          <div className="pagination-controls">
            <button
              className="page-btn"
              onClick={() => setPage(0)}
              disabled={page === 0}
              title="Primera página"
            >
              «
            </button>
            <button
              className="page-btn"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              ‹
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(0, Math.min(page - 2, totalPages - 5))
              const p = start + i
              return (
                <button
                  key={p}
                  className={`page-btn ${p === page ? 'active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p + 1}
                </button>
              )
            })}

            <button
              className="page-btn"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              ›
            </button>
            <button
              className="page-btn"
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              title="Última página"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
