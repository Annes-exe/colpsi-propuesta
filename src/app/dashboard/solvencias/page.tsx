import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Solvencias' }

export default function SolvenciasPage() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
          Gestión de Solvencias
        </h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>
          Registro y validación de solvencias anuales por agremiado
        </p>
      </div>
      <div className="card" style={{ textAlign: 'center', padding: '60px 40px', color: '#64748b' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>
          Módulo en Desarrollo
        </div>
        <div style={{ fontSize: 14 }}>
          Las solvencias se gestionan desde el perfil individual de cada agremiado.
        </div>
        <a href="/dashboard/agremiados" className="btn btn-primary" style={{ marginTop: 24, display: 'inline-flex' }}>
          Ir al Directorio
        </a>
      </div>
    </div>
  )
}
