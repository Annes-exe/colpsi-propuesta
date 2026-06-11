'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { registroPublicoSchema, type RegistroPublicoInput } from '@/schemas/registro'
import { registrarAgremiadoPublico, type ActionResponse } from '@/app/actions/registro-publico'

export default function RegistroPublicoPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<ActionResponse | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<RegistroPublicoInput>({
    resolver: zodResolver(registroPublicoSchema)
  })

  const onSubmit = async (data: RegistroPublicoInput) => {
    setIsLoading(true)
    setResponse(null)
    try {
      const formData = new FormData()
      
      // Append all simulated text values to FormData
      Object.keys(data).forEach((key) => {
        const val = data[key as keyof RegistroPublicoInput]
        if (val !== undefined && val !== null) {
          formData.append(key, String(val))
        }
      })

      const res = await registrarAgremiadoPublico(formData)
      setResponse(res)
      if (res.success) {
        reset()
      }
    } catch (err) {
      console.error(err)
      setResponse({ success: false, error: 'Ocurrió un error inesperado al enviar el formulario.' })
    } finally {
      setIsLoading(false)
    }
  }

  const renderFileInput = (name: keyof RegistroPublicoInput, label: string, dummyFilename: string) => {
    const value = watch(name) as string
    const hasError = !!errors[name]

    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
          {label} <span className="text-red-500">*</span>
        </label>
        <input type="hidden" {...register(name)} />
        <button
          type="button"
          onClick={() => {
            if (value) {
              setValue(name, '', { shouldValidate: true })
            } else {
              setValue(name, dummyFilename, { shouldValidate: true })
            }
          }}
          className={`group border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all w-full text-left outline-none ${
            value 
              ? 'border-blue-500 bg-blue-50/20' 
              : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50'
          } ${hasError ? 'border-red-400 bg-red-50/10' : ''}`}
        >
          <div className="flex flex-col items-center justify-center text-center w-full">
            {value ? (
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 mb-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500 mb-2 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
            )}
            <span className="text-xs text-slate-700 font-bold max-w-[180px] truncate block">
              {value || 'Simular Adjunto'}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 font-medium">
              {value ? '✓ Clic para quitar' : 'Clic para cargar arquetipo'}
            </span>
          </div>
        </button>
        {hasError && (
          <span className="text-xs text-red-500 font-semibold">
            {errors[name]?.message as string}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans relative">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white text-2xl font-black shadow-lg shadow-blue-500/30 mb-4">
            Ψ
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight sm:text-4xl">
            Portal de Registro Público
          </h1>
          <p className="mt-2 text-sm text-slate-600 font-medium max-w-md mx-auto">
            Completa tus datos personales, adjunta la documentación solicitada y registra tu comprobante de pago para procesar tu agremiación.
          </p>
        </div>

        {/* Alerts */}
        {response && (
          <div className={`mb-8 p-4 rounded-xl border flex items-start gap-3 shadow-sm ${
            response.success 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
              : 'bg-red-50 border-red-200 text-red-950'
          }`}>
            <span className="text-lg leading-none">{response.success ? '✅' : '⚠️'}</span>
            <div className="flex-1">
              <h4 className="text-sm font-bold block">
                {response.success ? '¡Registro Exitoso!' : 'Error de Registro'}
              </h4>
              <p className="text-xs font-semibold mt-1 leading-relaxed">
                {response.success ? response.message : response.error}
              </p>
            </div>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          {/* SECCIÓN 1: DATOS PERSONALES */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="h-6 w-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black">1</span>
                Datos Personales
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">Ingresa tus datos de identidad e información básica de contacto.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nombres */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Nombres <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej. Juan Carlos"
                  className={`h-10 px-3.5 rounded-xl border outline-none text-sm font-medium transition-all ${
                    errors.nombre ? 'border-red-400 focus:ring-1 focus:ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
                  }`}
                  {...register('nombre')}
                />
                {errors.nombre && <span className="text-xs text-red-500 font-semibold">{errors.nombre.message}</span>}
              </div>

              {/* Apellidos */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Apellidos <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej. Pérez Gómez"
                  className={`h-10 px-3.5 rounded-xl border outline-none text-sm font-medium transition-all ${
                    errors.apellido ? 'border-red-400 focus:ring-1 focus:ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
                  }`}
                  {...register('apellido')}
                />
                {errors.apellido && <span className="text-xs text-red-500 font-semibold">{errors.apellido.message}</span>}
              </div>

              {/* Cédula */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Cédula de Identidad <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej. V-12345678"
                  className={`h-10 px-3.5 rounded-xl border outline-none text-sm font-medium transition-all ${
                    errors.cedula ? 'border-red-400 focus:ring-1 focus:ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
                  }`}
                  {...register('cedula')}
                />
                {errors.cedula && <span className="text-xs text-red-500 font-semibold">{errors.cedula.message}</span>}
              </div>

              {/* Correo */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Correo Electrónico <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="juan.perez@example.com"
                  className={`h-10 px-3.5 rounded-xl border outline-none text-sm font-medium transition-all ${
                    errors.correo ? 'border-red-400 focus:ring-1 focus:ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
                  }`}
                  {...register('correo')}
                />
                {errors.correo && <span className="text-xs text-red-500 font-semibold">{errors.correo.message}</span>}
              </div>

              {/* Número FPV */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Número FPV <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej. 12345"
                  className="h-10 px-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none text-sm font-medium transition-all"
                  {...register('numero_fpv')}
                />
                {errors.numero_fpv && <span className="text-xs text-red-500 font-semibold">{errors.numero_fpv.message}</span>}
              </div>

              {/* Colegio al que pertenece */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Colegio al que Pertenece <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej. Miranda, Distrito Capital"
                  className={`h-10 px-3.5 rounded-xl border outline-none text-sm font-medium transition-all ${
                    errors.colegio_pertenece ? 'border-red-400 focus:ring-1 focus:ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
                  }`}
                  {...register('colegio_pertenece')}
                />
                {errors.colegio_pertenece && <span className="text-xs text-red-500 font-semibold">{errors.colegio_pertenece.message}</span>}
              </div>

              {/* Dirección */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Dirección de Habitación <span className="text-red-500">*</span>
                </label>
                <textarea
                  placeholder="Ingresa tu dirección completa de domicilio..."
                  rows={3}
                  className={`p-3.5 rounded-xl border outline-none text-sm font-medium transition-all ${
                    errors.direccion ? 'border-red-400 focus:ring-1 focus:ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
                  }`}
                  {...register('direccion')}
                />
                {errors.direccion && <span className="text-xs text-red-500 font-semibold">{errors.direccion.message}</span>}
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: DOCUMENTOS DIGITALIZADOS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="h-6 w-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black">2</span>
                Documentos Digitalizados (Simulados)
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">Haz clic en cada tarjeta para simular la carga del documento digitalizado.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {renderFileInput('foto_carnet', 'Foto de Carnet', 'foto_carnet_agremiado.png')}
              {renderFileInput('planilla_fpv', 'Planilla FPV', 'planilla_fpv_registro.pdf')}
              {renderFileInput('cedula_digitalizada', 'Cédula Digitalizada', 'cedula_identidad_copia.pdf')}
              {renderFileInput('rif_digitalizado', 'RIF Digitalizado', 'rif_vigente_digital.pdf')}
              {renderFileInput('titulo_graduacion', 'Título de Graduación', 'titulo_psicologo_graduado.pdf')}
              {renderFileInput('comprobante_pago', 'Comprobante de Pago', 'comprobante_banco_bcv.pdf')}
            </div>
          </div>

          {/* SECCIÓN 3: DATOS DE PAGO */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="h-6 w-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black">3</span>
                Información del Pago
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">Ingresa los datos del depósito, transferencia o transacción de pago.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Fecha de Pago */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Fecha de Transacción <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className={`h-10 px-3.5 rounded-xl border outline-none text-sm font-medium transition-all ${
                    errors.fecha_pago ? 'border-red-400 focus:ring-1 focus:ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
                  }`}
                  {...register('fecha_pago')}
                />
                {errors.fecha_pago && <span className="text-xs text-red-500 font-semibold">{errors.fecha_pago.message}</span>}
              </div>

              {/* Método de Pago */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Método de Pago <span className="text-red-500">*</span>
                </label>
                <select
                  className={`h-10 px-3.5 rounded-xl border outline-none text-sm font-medium transition-all bg-white ${
                    errors.metodo_pago ? 'border-red-400 focus:ring-1 focus:ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
                  }`}
                  {...register('metodo_pago')}
                >
                  <option value="">Seleccione un método</option>
                  <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                  <option value="Pago Móvil">Pago Móvil</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Punto de venta">Punto de venta</option>
                </select>
                {errors.metodo_pago && <span className="text-xs text-red-500 font-semibold">{errors.metodo_pago.message}</span>}
              </div>

              {/* Concepto de Pago */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Concepto de Arancel <span className="text-red-500">*</span>
                </label>
                <select
                  className={`h-10 px-3.5 rounded-xl border outline-none text-sm font-medium transition-all bg-white ${
                    errors.concepto_pago ? 'border-red-400 focus:ring-1 focus:ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
                  }`}
                  {...register('concepto_pago')}
                >
                  <option value="">Seleccione el arancel cancelado</option>
                  <option value="50$ inscripción y solvencia egresados 2026">50$ inscripción y solvencia egresados 2026</option>
                  <option value="70$ inscripción y solvencia egresados 2025">70$ inscripción y solvencia egresados 2025</option>
                  <option value="90$ inscripción y solvencia egresados 2024">90$ inscripción y solvencia egresados 2024</option>
                  <option value="110$ inscripción y solvencia egresados 2023 y años anteriores">110$ inscripción y solvencia egresados 2023 y años anteriores</option>
                  <option value="20$ Solvencia 2026">20$ Solvencia 2026</option>
                  <option value="40$ Solvencia 2025">40$ Solvencia 2025</option>
                  <option value="60$ Solvencia 2024">60$ Solvencia 2024</option>
                  <option value="80$ Solvencia 2023">80$ Solvencia 2023</option>
                </select>
                {errors.concepto_pago && <span className="text-xs text-red-500 font-semibold">{errors.concepto_pago.message}</span>}
              </div>

              {/* Referencia o Detalles */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Referencia Bancaria / Observaciones <span className="text-red-500">*</span>
                </label>
                <textarea
                  placeholder="Número de referencia de transferencia / pago móvil, o detalles de efectivo..."
                  rows={2}
                  className={`p-3.5 rounded-xl border outline-none text-sm font-medium transition-all ${
                    errors.referencia_bancaria ? 'border-red-400 focus:ring-1 focus:ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'
                  }`}
                  {...register('referencia_bancaria')}
                />
                {errors.referencia_bancaria && <span className="text-xs text-red-500 font-semibold">{errors.referencia_bancaria.message}</span>}
              </div>
            </div>
          </div>

          {/* Botón de Enviar */}
          <div className="flex justify-center pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm tracking-wide shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-blue-400 disabled:cursor-not-allowed min-w-[200px]"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Procesando...
                </>
              ) : (
                'Registrarse'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Subtle Intranet Link in Bottom-Right Corner */}
      <div className="fixed bottom-4 right-4 z-40">
        <Link
          href="/login"
          className="text-xs font-semibold text-slate-400 hover:text-slate-600 bg-white/95 hover:bg-white border border-slate-200/60 hover:border-slate-350 px-3 py-1.5 rounded-lg shadow-xs transition-all tracking-wide"
        >
          Intranet
        </Link>
      </div>
    </div>
  )
}
