import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pagos' }

export default function PagosPage() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
          Registro de Pagos
        </h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>
          Historial completo de pagos y conversión VES/USD
        </p>
      </div>
      <div className="card" style={{ textAlign: 'center', padding: '60px 40px', color: '#64748b' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💳</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>
          Módulo en Desarrollo
        </div>
        <div style={{ fontSize: 14 }}>
          Los pagos se registran desde el perfil individual de cada agremiado.
        </div>
        <a href="/dashboard/agremiados" className="btn btn-primary" style={{ marginTop: 24, display: 'inline-flex' }}>
          Ir al Directorio
        </a>
      </div>
    </div>
  )
}
