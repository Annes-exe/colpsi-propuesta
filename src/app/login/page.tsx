'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { loginAction } from '@/app/actions/auth'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await loginAction(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div className="auth-logo-text">
            <h1>ColPsi</h1>
            <p>Sistema de Agremiados</p>
          </div>
        </div>

        <h2 className="auth-heading">Iniciar Sesión</h2>
        <p className="auth-subheading">
          Ingresa tus credenciales administrativas para acceder al sistema
        </p>

        <form onSubmit={handleSubmit} noValidate>
          {/* Error global */}
          {error && (
            <div className="toast toast-error" style={{ marginBottom: 20, borderRadius: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Username */}
          <div className="form-group">
            <label className="form-label" htmlFor="username">
              Nombre de Usuario <span className="required">*</span>
            </label>
            <input
              id="username"
              name="username"
              type="text"
              className="form-input"
              placeholder="tu_usuario"
              autoComplete="username"
              required
              disabled={isPending}
            />
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Correo Electrónico <span className="required">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              placeholder="correo@ejemplo.com"
              autoComplete="email"
              required
              disabled={isPending}
            />
          </div>

          {/* Password */}
          <div className="form-group" style={{ marginBottom: 8 }}>
            <label className="form-label" htmlFor="password">
              Contraseña <span className="required">*</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              disabled={isPending}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isPending}
            style={{ marginTop: 20, height: 44, fontSize: 15 }}
          >
            {isPending ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
                Verificando...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/>
                  <polyline points="10 17 15 12 10 7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                Acceder al Sistema
              </>
            )}
          </button>
        </form>

        {/* Aviso de seguridad */}
        <div style={{
          marginTop: 24,
          padding: '12px 14px',
          background: '#f8fafc',
          borderRadius: 8,
          border: '1px solid #e2e8f0'
        }}>
          <p style={{ fontSize: 11.5, color: '#64748b', lineHeight: 1.5, margin: 0 }}>
            🔒 <strong>Acceso restringido.</strong> Este sistema requiere la combinación exacta de
            usuario, correo y contraseña para garantizar la trazabilidad y auditoría interna.
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#64748b' }}>
          ¿Necesitas acceso?{' '}
          <Link href="/register" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
            Solicitar registro
          </Link>
        </p>
      </div>
    </div>
  )
}
