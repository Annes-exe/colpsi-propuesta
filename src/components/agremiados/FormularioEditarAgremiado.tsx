'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { agreimadoSchema, type AgreimadoInput } from '@/lib/validations/schemas'
import { editarAgremiado } from '@/app/actions/agremiados'

interface FormularioEditarProps {
  agremiado: {
    id: string
    cedula: string
    fpv: string
    nombres: string
    apellidos: string
    correo: string | null
    telefono: string | null
    fecha_inscripcion: string
  }
  fechaRecepcionTitulo: string | null
  onSuccess?: () => void
  onClose?: () => void
}

export function FormularioEditarAgremiado({
  agremiado,
  fechaRecepcionTitulo,
  onSuccess,
  onClose,
}: FormularioEditarProps) {
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Estados locales para simular la subida de archivos (placeholders de alta fidelidad)
  const [fotoPerfilName, setFotoPerfilName] = useState<string | null>(null)
  const [tituloFrenteName, setTituloFrenteName] = useState<string | null>(null)
  const [tituloReversoName, setTituloReversoName] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AgreimadoInput>({
    resolver: zodResolver(agreimadoSchema),
    defaultValues: {
      cedula: agremiado.cedula || '',
      fpv: agremiado.fpv || '',
      nombres: agremiado.nombres || '',
      apellidos: agremiado.apellidos || '',
      correo: agremiado.correo || '',
      telefono: agremiado.telefono || '',
      fecha_inscripcion: agremiado.fecha_inscripcion
        ? new Date(agremiado.fecha_inscripcion + 'T00:00:00').toISOString().split('T')[0]
        : '',
      fecha_recepcion_titulo: fechaRecepcionTitulo
        ? new Date(fechaRecepcionTitulo + 'T00:00:00').toISOString().split('T')[0]
        : '',
    },
  })

  // Simulación de interacción de archivos
  const handleSimulatedUpload = (type: 'foto' | 'frente' | 'reverso') => {
    if (type === 'foto') {
      setFotoPerfilName(fotoPerfilName ? null : 'foto_perfil_agremiado.png')
    } else if (type === 'frente') {
      setTituloFrenteName(tituloFrenteName ? null : 'titulo_frente_profesional.pdf')
    } else if (type === 'reverso') {
      setTituloReversoName(tituloReversoName ? null : 'titulo_reverso_profesional.pdf')
    }
  }

  const onSubmit = (data: AgreimadoInput) => {
    setServerError(null)
    setSuccessMsg(null)
    startTransition(async () => {
      const result = await editarAgremiado(agremiado.id, data)
      if (result.success) {
        setSuccessMsg('¡Datos actualizados exitosamente!')
        setTimeout(() => {
          onSuccess?.()
        }, 1200)
      } else {
        setServerError(result.error ?? 'Error al actualizar el registro.')
      }
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        role="presentation"
        onClick={onClose}
        className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Editar agremiado"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col font-sans transition-transform duration-300 transform translate-x-0"
      >
        {/* Header */}
        <div className="px-6 py-5 flex items-start justify-between flex-shrink-0 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-inner">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <h2 className="text-base font-extrabold tracking-tight m-0">Editar Agremiado</h2>
            </div>
            <p className="text-xs text-slate-400 pl-10 m-0">Actualiza la información del perfil y adjuntos</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Server Errors / Alerts */}
        {serverError && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2.5 text-xs text-red-600" role="alert">
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="font-medium">{serverError}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-600" role="status">
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5"
        >
          {/* Fila 1: Nombres y Apellidos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label htmlFor="edit-nombres" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nombres *</label>
              <input
                id="edit-nombres"
                type="text"
                className={`w-full px-3 py-2 rounded-lg border text-sm text-slate-900 bg-slate-50 outline-hidden focus:border-blue-500 focus:bg-white transition-all ${
                  errors.nombres ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                }`}
                {...register('nombres')}
              />
              {errors.nombres && <span className="text-[11px] text-red-500 mt-1">{errors.nombres.message}</span>}
            </div>

            <div className="flex flex-col">
              <label htmlFor="edit-apellidos" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Apellidos *</label>
              <input
                id="edit-apellidos"
                type="text"
                className={`w-full px-3 py-2 rounded-lg border text-sm text-slate-900 bg-slate-50 outline-hidden focus:border-blue-500 focus:bg-white transition-all ${
                  errors.apellidos ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                }`}
                {...register('apellidos')}
              />
              {errors.apellidos && <span className="text-[11px] text-red-500 mt-1">{errors.apellidos.message}</span>}
            </div>
          </div>

          {/* Fila 2: Cédula y FPV */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label htmlFor="edit-cedula" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cédula *</label>
              <input
                id="edit-cedula"
                type="text"
                className={`w-full px-3 py-2 rounded-lg border text-sm text-slate-900 bg-slate-50 outline-hidden focus:border-blue-500 focus:bg-white transition-all ${
                  errors.cedula ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                }`}
                {...register('cedula')}
              />
              {errors.cedula && <span className="text-[11px] text-red-500 mt-1">{errors.cedula.message}</span>}
            </div>

            <div className="flex flex-col">
              <label htmlFor="edit-fpv" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">FPV *</label>
              <input
                id="edit-fpv"
                type="text"
                className={`w-full px-3 py-2 rounded-lg border text-sm text-slate-900 bg-slate-50 outline-hidden focus:border-blue-500 focus:bg-white transition-all ${
                  errors.fpv ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                }`}
                {...register('fpv')}
              />
              {errors.fpv && <span className="text-[11px] text-red-500 mt-1">{errors.fpv.message}</span>}
            </div>
          </div>

          {/* Fila 3: Correo y Teléfono */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label htmlFor="edit-correo" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Correo</label>
              <input
                id="edit-correo"
                type="email"
                className={`w-full px-3 py-2 rounded-lg border text-sm text-slate-900 bg-slate-50 outline-hidden focus:border-blue-500 focus:bg-white transition-all ${
                  errors.correo ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                }`}
                {...register('correo')}
              />
              {errors.correo && <span className="text-[11px] text-red-500 mt-1">{errors.correo.message}</span>}
            </div>

            <div className="flex flex-col">
              <label htmlFor="edit-telefono" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Teléfono</label>
              <input
                id="edit-telefono"
                type="text"
                className={`w-full px-3 py-2 rounded-lg border text-sm text-slate-900 bg-slate-50 outline-hidden focus:border-blue-500 focus:bg-white transition-all ${
                  errors.telefono ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                }`}
                {...register('telefono')}
              />
              {errors.telefono && <span className="text-[11px] text-red-500 mt-1">{errors.telefono.message}</span>}
            </div>
          </div>

          {/* Fila 4: Fecha Inscripción y Recepción Título */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label htmlFor="edit-fecha-inscripcion" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Fecha Inscripción *</label>
              <input
                id="edit-fecha-inscripcion"
                type="date"
                className={`w-full px-3 py-2 rounded-lg border text-sm text-slate-900 bg-slate-50 outline-hidden focus:border-blue-500 focus:bg-white transition-all ${
                  errors.fecha_inscripcion ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                }`}
                {...register('fecha_inscripcion')}
              />
              {errors.fecha_inscripcion && <span className="text-[11px] text-red-500 mt-1">{errors.fecha_inscripcion.message}</span>}
            </div>

            <div className="flex flex-col">
              <label htmlFor="edit-recepcion-titulo" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Recepción del Título</label>
              <input
                id="edit-recepcion-titulo"
                type="date"
                className={`w-full px-3 py-2 rounded-lg border text-sm text-slate-900 bg-slate-50 outline-hidden focus:border-blue-500 focus:bg-white transition-all ${
                  errors.fecha_recepcion_titulo ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                }`}
                {...register('fecha_recepcion_titulo')}
              />
              {errors.fecha_recepcion_titulo && <span className="text-[11px] text-red-500 mt-1">{errors.fecha_recepcion_titulo.message}</span>}
            </div>
          </div>

          <div className="border-b border-slate-100 my-1" />

          {/* Adjuntar Archivos (Estéticos / Mock placeholders) */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Documentación Adjunta (Estético)</span>

            {/* Foto de Perfil Dropzone */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-slate-500">Fotografía de Perfil (Fondo Blanco)</span>
              <button
                type="button"
                onClick={() => handleSimulatedUpload('foto')}
                className={`w-full p-4 rounded-xl border border-dashed text-left flex items-center justify-between transition-all ${
                  fotoPerfilName
                    ? 'border-emerald-300 bg-emerald-50/30 text-emerald-800'
                    : 'border-slate-300 bg-slate-50 hover:bg-slate-100/70 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  {fotoPerfilName ? (
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold">{fotoPerfilName ? '✓ Foto Seleccionada' : 'Seleccionar Foto'}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{fotoPerfilName ? fotoPerfilName : 'Formatos: PNG, JPG (Máx 2MB)'}</div>
                  </div>
                </div>
                {fotoPerfilName && (
                  <span className="text-[10px] font-bold text-red-500 hover:underline">Quitar</span>
                )}
              </button>
            </div>

            {/* Título de Psicólogo (Frente) Dropzone */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-slate-500">Título Profesional (Frente)</span>
              <button
                type="button"
                onClick={() => handleSimulatedUpload('frente')}
                className={`w-full p-4 rounded-xl border border-dashed text-left flex items-center justify-between transition-all ${
                  tituloFrenteName
                    ? 'border-emerald-300 bg-emerald-50/30 text-emerald-800'
                    : 'border-slate-300 bg-slate-50 hover:bg-slate-100/70 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  {tituloFrenteName ? (
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold">{tituloFrenteName ? '✓ Título (Frente) Cargado' : 'Seleccionar Documento'}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{tituloFrenteName ? tituloFrenteName : 'Formatos: PDF, JPG (Máx 5MB)'}</div>
                  </div>
                </div>
                {tituloFrenteName && (
                  <span className="text-[10px] font-bold text-red-500 hover:underline">Quitar</span>
                )}
              </button>
            </div>

            {/* Título de Psicólogo (Reverso) Dropzone */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-slate-500">Título Profesional (Reverso)</span>
              <button
                type="button"
                onClick={() => handleSimulatedUpload('reverso')}
                className={`w-full p-4 rounded-xl border border-dashed text-left flex items-center justify-between transition-all ${
                  tituloReversoName
                    ? 'border-emerald-300 bg-emerald-50/30 text-emerald-800'
                    : 'border-slate-300 bg-slate-50 hover:bg-slate-100/70 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  {tituloReversoName ? (
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold">{tituloReversoName ? '✓ Título (Reverso) Cargado' : 'Seleccionar Documento'}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{tituloReversoName ? tituloReversoName : 'Formatos: PDF, JPG (Máx 5MB)'}</div>
                  </div>
                </div>
                {tituloReversoName && (
                  <span className="text-[10px] font-bold text-red-500 hover:underline">Quitar</span>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-sm hover:bg-slate-100 hover:text-slate-900 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault()
              handleSubmit(onSubmit)()
            }}
            className={`flex-2 py-2.5 px-4 rounded-xl text-white font-bold text-sm cursor-pointer shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 ${
              isPending
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-805 hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {isPending ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Guardar Cambios
              </>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
