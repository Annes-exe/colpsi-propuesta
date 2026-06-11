import type { Metadata } from 'next'
import { AgreiadosDataGrid } from '@/components/agremiados/AgreiadosDataGrid'

export const metadata: Metadata = { title: 'Directorio de Agremiados' }

export default function AgreiadosPage() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
            Directorio de Agremiados
          </h1>
          <p style={{ fontSize: 14, color: '#64748b' }}>
            Búsqueda ultra-rápida por Cédula o FPV. Semáforo de solvencia en tiempo real.
          </p>
        </div>
        <a href="/dashboard/directorio/nuevo" className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Registrar Agremiado
        </a>
      </div>

      <AgreiadosDataGrid />
    </div>
  )
}
