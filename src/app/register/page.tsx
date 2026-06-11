'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { registerAction } from '@/app/actions/auth'

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await registerAction(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 500 }}>
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
            <p>Registro de Administrador</p>
          </div>
        </div>

        <h2 className="auth-heading">Crear Cuenta</h2>
        <p className="auth-subheading">
          Completa los tres campos de identidad para el acceso tripartito al sistema
        </p>

        <form onSubmit={handleSubmit} noValidate>
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

          {/* Full Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="fullName">
              Nombre Completo <span className="required">*</span>
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              className="form-input"
              placeholder="Nombre y Apellido"
              required
              disabled={isPending}
            />
          </div>

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
              placeholder="usuario_unico"
              autoComplete="username"
              required
              disabled={isPending}
            />
            <span className="form-hint">Solo letras, números, guiones y puntos. Sin espacios.</span>
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
          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Contraseña <span className="required">*</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input"
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              required
              disabled={isPending}
            />
          </div>

          {/* Confirm Password */}
          <div className="form-group" style={{ marginBottom: 8 }}>
            <label className="form-label" htmlFor="confirmPassword">
              Confirmar Contraseña <span className="required">*</span>
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              className="form-input"
              placeholder="Repite la contraseña"
              autoComplete="new-password"
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
                Creando cuenta...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <line x1="19" y1="8" x2="19" y2="14"/>
                  <line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
                Crear Cuenta Administrativa
              </>
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#64748b' }}>
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
