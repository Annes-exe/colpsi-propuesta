'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { agreimadoSchema, type AgreimadoInput } from '@/lib/validations/schemas'
import { registrarAgremiado } from '@/app/actions/agremiados'

// ─── Design Tokens (Premium Palette) ─────────────────────────────────────────
const T = {
  bg: '#ffffff',
  border: '#e2e8f0',
  errorText: { color: '#dc2626', fontSize: 11.5, marginTop: 4, display: 'block' as const },
  label: { 
    fontSize: 11.5, 
    fontWeight: 700, 
    color: '#64748b', 
    textTransform: 'uppercase' as const, 
    letterSpacing: '0.06em', 
    marginBottom: 6, 
    display: 'block' as const 
  },
  input: {
    width: '100%', 
    boxSizing: 'border-box' as const,
    padding: '10px 12px', 
    borderRadius: 8, 
    border: '1.5px solid #e2e8f0',
    fontSize: 14, 
    color: '#0f172a', 
    background: '#f8fafc',
    outline: 'none', 
    fontFamily: 'inherit', 
    transition: 'all 0.2s',
  },
}

export default function NuevoAgremiadoPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AgreimadoInput>({
    resolver: zodResolver(agreimadoSchema),
    defaultValues: {
      cedula: '',
      fpv: '',
      nombres: '',
      apellidos: '',
      correo: '',
      telefono: '',
      fecha_inscripcion: new Date().toISOString().split('T')[0],
      fecha_recepcion_titulo: '',
    },
  })

  const onSubmit = (data: AgreimadoInput) => {
    setServerError(null)
    setSuccessMsg(null)

    startTransition(async () => {
      const res = await registrarAgremiado(data)
      if (!res.success) {
        setServerError(res.error || 'Error desconocido al registrar agremiado.')
      } else {
        setSuccessMsg('¡Agremiado registrado exitosamente!')
        reset()
        // Redirigir al directorio tras 2 segundos para que se pueda ver el mensaje de éxito
        setTimeout(() => {
          router.push('/dashboard/agremiados')
        }, 1500)
      }
    })
  }

  // Estilo dinámico de los inputs
  const getInputStyle = (fieldName: keyof AgreimadoInput) => {
    return {
      ...T.input,
      borderColor: errors[fieldName] ? '#f87171' : '#e2e8f0',
      background: errors[fieldName] ? '#fef2f2' : '#f8fafc',
      boxShadow: errors[fieldName] ? '0 0 0 1px #f87171' : 'none',
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '12px 16px' }}>
      
      {/* ── Breadcrumb & Navigation ────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <Link 
          href="/dashboard/agremiados" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 6, 
            color: '#2563eb', 
            fontSize: 13, 
            fontWeight: 600, 
            textDecoration: 'none' 
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          Volver al Directorio
        </Link>
      </div>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
          Registrar Nuevo Agremiado
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
          Ingresa los datos del profesional. El sistema validará automáticamente duplicados de Cédula y FPV.
        </p>
      </div>

      {/* ── Alertas Globales ────────────────────────────────────────────────── */}
      {serverError && (
        <div style={{
          display: 'flex', gap: 10, alignItems: 'center', padding: '12px 16px',
          background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10,
          color: '#b91c1c', fontSize: 13.5, marginBottom: 20, fontWeight: 500
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{serverError}</span>
        </div>
      )}

      {successMsg && (
        <div style={{
          display: 'flex', gap: 10, alignItems: 'center', padding: '12px 16px',
          background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10,
          color: '#166534', fontSize: 13.5, marginBottom: 20, fontWeight: 500
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span>{successMsg} Redireccionando...</span>
        </div>
      )}

      {/* ── Form Card ──────────────────────────────────────────────────────── */}
      <form 
        onSubmit={handleSubmit(onSubmit)} 
        style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
          overflow: 'hidden'
        }}
        noValidate
      >
        {/* Card Header con Gradiente Premium */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          padding: '20px 24px',
          color: '#ffffff'
        }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Información del Agremiado</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#94a3b8' }}>Completa todos los campos obligatorios (*)</p>
        </div>

        {/* Card Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Fila 1: Nombres y Apellidos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="nombres" style={T.label}>Nombres <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                id="nombres"
                type="text"
                placeholder="Nombre del agremiado"
                style={getInputStyle('nombres')}
                disabled={isPending}
                {...register('nombres')}
              />
              {errors.nombres && <span style={T.errorText}>{errors.nombres.message}</span>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="apellidos" style={T.label}>Apellidos <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                id="apellidos"
                type="text"
                placeholder="Apellido del agremiado"
                style={getInputStyle('apellidos')}
                disabled={isPending}
                {...register('apellidos')}
              />
              {errors.apellidos && <span style={T.errorText}>{errors.apellidos.message}</span>}
            </div>
          </div>

          {/* Fila 2: Cédula e Identificación FPV */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="cedula" style={T.label}>Cédula <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                id="cedula"
                type="text"
                placeholder="Ej: V-12345678"
                style={getInputStyle('cedula')}
                disabled={isPending}
                {...register('cedula')}
              />
              {errors.cedula && <span style={T.errorText}>{errors.cedula.message}</span>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="fpv" style={T.label}>Número FPV <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                id="fpv"
                type="text"
                placeholder="Ej: 12345"
                style={getInputStyle('fpv')}
                disabled={isPending}
                {...register('fpv')}
              />
              {errors.fpv && <span style={T.errorText}>{errors.fpv.message}</span>}
            </div>
          </div>

          {/* Fila 3: Correo y Teléfono */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="correo" style={T.label}>Correo Electrónico</label>
              <input
                id="correo"
                type="email"
                placeholder="correo@ejemplo.com"
                style={getInputStyle('correo')}
                disabled={isPending}
                {...register('correo')}
              />
              {errors.correo && <span style={T.errorText}>{errors.correo.message}</span>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="telefono" style={T.label}>Teléfono de Contacto</label>
              <input
                id="telefono"
                type="text"
                placeholder="Ej: +58 412 1234567"
                style={getInputStyle('telefono')}
                disabled={isPending}
                {...register('telefono')}
              />
              {errors.telefono && <span style={T.errorText}>{errors.telefono.message}</span>}
            </div>
          </div>

          {/* Fila 4: Fecha de Inscripción y Recepción del Título */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="fecha_inscripcion" style={T.label}>Fecha de Inscripción <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                id="fecha_inscripcion"
                type="date"
                style={getInputStyle('fecha_inscripcion')}
                disabled={isPending}
                {...register('fecha_inscripcion')}
              />
              {errors.fecha_inscripcion && <span style={T.errorText}>{errors.fecha_inscripcion.message}</span>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="fecha_recepcion_titulo" style={T.label}>Recepción del Título <span style={{ fontSize: 10, color: '#64748b', textTransform: 'none' }}>(Opcional)</span></label>
              <input
                id="fecha_recepcion_titulo"
                type="date"
                style={getInputStyle('fecha_recepcion_titulo')}
                disabled={isPending}
                {...register('fecha_recepcion_titulo')}
              />
              {errors.fecha_recepcion_titulo && <span style={T.errorText}>{errors.fecha_recepcion_titulo.message}</span>}
            </div>
          </div>

        </div>

        {/* Card Footer */}
        <div style={{
          background: '#f8fafc',
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12
        }}>
          <Link
            href="/dashboard/agremiados"
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              textAlign: 'center',
              display: 'inline-flex',
              alignItems: 'center',
              cursor: isPending ? 'not-allowed' : 'pointer'
            }}
          >
            Cancelar
          </Link>

          <button
            type="submit"
            disabled={isPending}
            style={{
              padding: '9px 20px',
              borderRadius: 8,
              border: 'none',
              background: isPending ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              cursor: isPending ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
            }}
          >
            {isPending ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{
                  animation: 'spin 1s linear infinite'
                }}>
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
                Registrando...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                Guardar Agremiado
              </>
            )}
          </button>
        </div>

      </form>
      
      {/* Dynamic Keyframe Injection for loading spinner */}
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>

    </div>
  )
}
