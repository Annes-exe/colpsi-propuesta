'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { aprobarSolicitud, rechazarSolicitud } from '@/app/actions/aprobaciones'
import { formatUSD, formatVES } from '@/hooks/useCalculadoraDeuda'

export interface Solicitud {
  id: string
  cedula: string
  fpv: string
  nombres: string
  apellidos: string
  fecha_inscripcion: string
  colegio_pertenece: string | null
  direccion: string | null
  foto_carnet: string | null
  planilla_fpv: string | null
  cedula_digitalizada: string | null
  rif_digitalizado: string | null
  titulo_graduacion: string | null
  created_at?: string | null
  pagos: {
    id: string
    fecha_pago: string
    monto_ves: number
    tasa_cambio: number
    referencia: string
    metodo_pago: string
    comprobante_pago: string | null
    notas: string | null
  }[]
}

interface AprobacionesClientProps {
  solicitudesIniciales: Solicitud[]
}

type LighboxDocType = 'foto' | 'planilla' | 'cedula' | 'rif' | 'titulo' | 'comprobante' | null

export function AprobacionesClient({ solicitudesIniciales }: AprobacionesClientProps) {
  const router = useRouter()
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>(solicitudesIniciales)
  const [selected, setSelected] = useState<Solicitud | null>(null)
  const [viewingDoc, setViewingDoc] = useState<LighboxDocType>(null)
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)

  // Filter
  const filtered = solicitudes.filter(s => {
    const term = search.toLowerCase()
    return (
      s.nombres.toLowerCase().includes(term) ||
      s.apellidos.toLowerCase().includes(term) ||
      s.cedula.includes(term) ||
      (s.pagos[0]?.referencia ?? '').includes(term)
    )
  })

  const handleApprove = (id: string) => {
    setActionError(null)
    startTransition(async () => {
      const res = await aprobarSolicitud(id)
      if (res.success) {
        setSelected(null)
        setSolicitudes(prev => prev.filter(s => s.id !== id))
        router.refresh()
      } else {
        setActionError(res.error ?? 'Ocurrió un error al aprobar la solicitud.')
      }
    })
  }

  const handleReject = (id: string) => {
    if (!confirm('¿Estás seguro de que deseas rechazar y eliminar esta solicitud de registro? Esta acción borrará todos los archivos adjuntos permanentemente y no se puede deshacer.')) {
      return
    }
    setActionError(null)
    startTransition(async () => {
      const res = await rechazarSolicitud(id)
      if (res.success) {
        setSelected(null)
        setSolicitudes(prev => prev.filter(s => s.id !== id))
        router.refresh()
      } else {
        setActionError(res.error ?? 'Ocurrió un error al rechazar la solicitud.')
      }
    })
  }

  const getMetodoPagoLabel = (metodo?: string) => {
    const map: Record<string, string> = {
      transferencia: 'Transferencia Bancaria',
      pago_movil: 'Pago Móvil',
      efectivo_usd: 'Efectivo USD',
      zelle: 'Zelle',
      otro: 'Otro Método'
    }
    return map[metodo ?? ''] || metodo || 'No registrado'
  }

  const getConceptoPago = (notas?: string | null) => {
    if (!notas) return 'Inscripción Inicial'
    const lines = notas.split('\n')
    const conceptoLine = lines.find(l => l.toLowerCase().startsWith('concepto:'))
    if (conceptoLine) return conceptoLine.replace(/concepto:/i, '').trim()
    return 'Inscripción Inicial'
  }

  return (
    <div className="table-container font-sans">
      {/* Table Header Controls */}
      <div className="table-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="table-title text-base font-extrabold text-slate-800">Filtro Humano de Registro</div>
          <div className="table-subtitle text-xs text-slate-400 mt-1">
            {solicitudes.length} solicitud{solicitudes.length !== 1 ? 'es' : ''} pendiente{solicitudes.length !== 1 ? 'es' : ''} por verificar
          </div>
        </div>

        <div className="search-input-wrapper max-w-sm w-full">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por Cédula, nombre o referencia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* solicitudes DataGrid */}
      <div className="overflow-x-auto">
        <table className="data-table w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
              <th className="p-4">Fecha Solicitud</th>
              <th className="p-4">Cédula</th>
              <th className="p-4">Nombre Completo</th>
              <th className="p-4">Concepto de Pago</th>
              <th className="p-4">Referencia</th>
              <th className="p-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="text-slate-700 text-xs">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-12 text-slate-400">
                  <div className="text-3xl mb-2">📥</div>
                  <div className="font-bold text-slate-650">No hay solicitudes pendientes</div>
                  <div className="text-[11px] text-slate-400 mt-1">Todas las solicitudes han sido verificadas.</div>
                </td>
              </tr>
            ) : (
              filtered.map((sol) => {
                const pago = sol.pagos[0]
                const concepto = getConceptoPago(pago?.notas)
                return (
                  <tr key={sol.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-mono text-slate-500 text-[11px]">
                      {pago?.fecha_pago 
                        ? new Date(pago.fecha_pago + 'T00:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'
                      }
                    </td>
                    <td className="p-4 font-bold font-mono">V-{sol.cedula}</td>
                    <td className="p-4 font-semibold text-slate-900 uppercase">
                      {sol.apellidos}, {sol.nombres}
                    </td>
                    <td className="p-4 text-slate-600 font-medium">{concepto}</td>
                    <td className="p-4">
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-650">
                        {pago?.referencia ?? '—'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelected(sol)}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all flex items-center gap-1.5 mx-auto"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <circle cx="10" cy="13" r="2" />
                          <path d="M15 18a3 3 0 0 0-6 0" />
                        </svg>
                        Revisar Expediente
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Expediente Modal Viewer */}
      {selected && (
        <>
          <div
            role="presentation"
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-[1000] bg-slate-950/50 backdrop-blur-xs"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Revisar Expediente"
            className="fixed inset-4 md:inset-x-12 md:inset-y-6 lg:max-w-5xl lg:mx-auto z-[1001] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm shadow-md">
                  {selected.nombres[0].toUpperCase()}{selected.apellidos[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wide leading-none">{selected.apellidos}, {selected.nombres}</h2>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">Expediente de Registro Gremial • C.I. V-{selected.cedula}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="w-8 h-8 rounded-lg border border-slate-800 bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer flex items-center justify-center transition-colors"
              >
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Error alerts */}
            {actionError && (
              <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs text-rose-600 flex-shrink-0" role="alert">
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span className="font-bold">{actionError}</span>
              </div>
            )}

            {/* Split Panel Body */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Left Pane: Financial & Info */}
              <div className="md:col-span-5 flex flex-col gap-5">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2">Información del Solicitante</h3>
                  
                  <div className="grid grid-cols-1 gap-3.5 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Nombre Completo</span>
                      <span className="font-bold text-slate-800 uppercase">{selected.nombres} {selected.apellidos}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Cédula de Identidad</span>
                        <span className="font-bold text-slate-800 font-mono">V-{selected.cedula}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Número FPV</span>
                        <span className="font-bold text-slate-850 font-mono">{selected.fpv.includes('PENDIENTE') ? 'Pendiente por Asignar' : selected.fpv}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Colegio Perteneciente</span>
                      <span className="font-bold text-slate-800 uppercase">{selected.colegio_pertenece || 'No indicado'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Dirección de Habitación</span>
                      <span className="font-medium text-slate-700 leading-normal">{selected.direccion || 'No indicada'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-150 shadow-xs flex flex-col gap-4">
                  <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider border-b border-blue-200 pb-2">Detalles de la Transacción</h3>
                  
                  {selected.pagos[0] ? (
                    <div className="grid grid-cols-1 gap-3.5 text-xs text-blue-900">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-blue-500 block font-bold uppercase">Método de Pago</span>
                          <span className="font-bold text-blue-955">{getMetodoPagoLabel(selected.pagos[0].metodo_pago)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-blue-500 block font-bold uppercase">Fecha de Pago</span>
                          <span className="font-bold text-blue-955 font-mono">
                            {new Date(selected.pagos[0].fecha_pago + 'T00:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-blue-500 block font-bold uppercase">Concepto Declarado</span>
                        <span className="font-bold text-blue-955">{getConceptoPago(selected.pagos[0].notas)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-blue-500 block font-bold uppercase">Referencia de Transacción</span>
                        <span className="font-mono bg-blue-100/70 border border-blue-200 px-2.5 py-1 rounded text-blue-900 font-extrabold text-[11px] tracking-wide inline-block mt-0.5">
                          {selected.pagos[0].referencia}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 border-t border-blue-200 pt-3 mt-1">
                        <div>
                          <span className="text-[10px] text-blue-500 block font-bold uppercase">Tasa Cambio BCV</span>
                          <span className="font-mono font-bold text-blue-955">{selected.pagos[0].tasa_cambio.toFixed(2)} VES</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-blue-500 block font-bold uppercase">Monto Total</span>
                          <span className="font-mono font-extrabold text-blue-955 text-sm">{formatVES(selected.pagos[0].monto_ves)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-blue-500 italic">No se registraron datos de pago para esta solicitud.</span>
                  )}
                </div>
              </div>

              {/* Right Pane: Document Files Grid */}
              <div className="md:col-span-7 flex flex-col gap-4">
                <div className="border border-slate-200 p-5 rounded-2xl flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Carpeta de Documentos Digitalizados</h3>
                    <span className="text-[9px] font-black bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded uppercase">6 Archivos</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {[
                      { type: 'foto' as const, label: 'Foto Carnet', icon: '👤', url: selected.foto_carnet },
                      { type: 'planilla' as const, label: 'Planilla FPV', icon: '📝', url: selected.planilla_fpv },
                      { type: 'cedula' as const, label: 'Cédula de Identidad', icon: '🆔', url: selected.cedula_digitalizada },
                      { type: 'rif' as const, label: 'RIF Digitalizado', icon: '🏛', url: selected.rif_digitalizado },
                      { type: 'titulo' as const, label: 'Título Profesional', icon: '🎓', url: selected.titulo_graduacion },
                      { type: 'comprobante' as const, label: 'Comprobante de Pago', icon: '💳', url: selected.pagos[0]?.comprobante_pago }
                    ].map((doc) => {
                      const exists = !!doc.url
                      return (
                        <div
                          key={doc.type}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                            exists 
                              ? 'border-slate-200 bg-slate-50 hover:bg-slate-100/50' 
                              : 'border-slate-150 bg-slate-50/20 opacity-55'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">{doc.icon}</span>
                            <div>
                              <div className="text-[11px] font-bold text-slate-800 leading-tight">{doc.label}</div>
                              <div className="text-[9px] text-slate-400 mt-0.5 truncate max-w-[120px] font-mono">
                                {exists ? getFileName(doc.url) : 'No disponible'}
                              </div>
                            </div>
                          </div>

                          {exists ? (
                            <button
                              type="button"
                              onClick={() => setViewingDoc(doc.type)}
                              className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-250 text-[10px] font-bold text-slate-700 transition-all cursor-pointer shadow-xs flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                              Ver
                            </button>
                          ) : (
                            <span className="text-[9px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-400">Falta</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0 bg-slate-50">
              <button
                type="button"
                onClick={() => setSelected(null)}
                disabled={isPending}
                className="py-2.5 px-4 rounded-xl border border-slate-200 bg-white text-slate-650 font-bold text-xs hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={() => handleReject(selected.id)}
                disabled={isPending}
                className="flex-1 py-2.5 px-4 rounded-xl text-white font-bold text-xs bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-sm hover:shadow flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <span>Procesando...</span>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Rechazar Solicitud
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleApprove(selected.id)}
                disabled={isPending}
                className="flex-2 py-2.5 px-4 rounded-xl text-white font-bold text-xs bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Aprobar y Activar Agremiado
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Lightbox for Specific Document Viewers */}
      {viewingDoc && selected && (
        <div className="fixed inset-0 z-[2000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full flex flex-col items-center">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setViewingDoc(null)}
              className="absolute -top-12 right-0 md:-right-8 text-white/75 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full cursor-pointer transition-all"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Document Renderers */}
            {viewingDoc === 'foto' && (
              <div className="w-64 aspect-[3/4] bg-white border-[8px] border-slate-300 p-4 rounded-lg shadow-2xl flex flex-col items-center justify-between text-center select-none animate-in zoom-in-95 duration-155">
                <div className="text-[9px] font-bold text-slate-400 tracking-wider uppercase border-b border-slate-200 pb-1.5 w-full">
                  FOTOGRAFÍA OFICIAL DE AGREMIADO
                </div>
                <div className="w-40 h-40 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden relative shadow-inner my-auto flex items-center justify-center">
                  {selected.foto_carnet && !selected.foto_carnet.includes('placeholder') ? (
                    <img src={selected.foto_carnet} alt="Foto Carnet" className="w-full h-full object-cover" />
                  ) : (
                    <svg viewBox="0 0 120 120" className="w-32 h-32 text-slate-400">
                      <circle cx="60" cy="45" r="20" fill="currentColor" opacity="0.3" />
                      <path d="M20 100c0-15 15-25 40-25s40 10 40 25" fill="currentColor" opacity="0.3" />
                    </svg>
                  )}
                </div>
                <div className="w-full">
                  <div className="text-xs font-black text-slate-800 uppercase leading-none">{selected.nombres} {selected.apellidos}</div>
                  <div className="text-[9px] font-mono text-slate-500 mt-1">C.I. V-{selected.cedula}</div>
                </div>
              </div>
            )}

            {viewingDoc === 'planilla' && (
              <div className="w-full aspect-[1/1.3] max-w-xl bg-white border border-slate-300 p-8 rounded-lg shadow-2xl relative flex flex-col justify-between font-sans text-slate-800 text-[10px] select-none animate-in zoom-in-95 duration-155">
                <div className="text-center border-b border-slate-250 pb-4">
                  <h3 className="text-xs font-extrabold tracking-wider uppercase text-slate-900 leading-tight">Federación de Psicólogos de Venezuela</h3>
                  <h4 className="text-[9px] tracking-wide text-slate-500 font-bold uppercase mt-1">Planilla de Inscripción Gremial Nacional</h4>
                </div>

                <div className="my-auto space-y-4 py-4 font-mono text-[9px] text-slate-700">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-400 block text-[8px] uppercase">Nombres y Apellidos</span>
                      <span className="font-bold text-slate-800 uppercase">{selected.nombres} {selected.apellidos}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[8px] uppercase">Cédula de Identidad</span>
                      <span className="font-bold text-slate-800">V-{selected.cedula}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-400 block text-[8px] uppercase">Nº de Inscripción FPV</span>
                      <span className="font-bold text-blue-600 text-xs">{selected.fpv.includes('PENDIENTE') ? 'PENDIENTE ASIGNACIÓN' : selected.fpv}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[8px] uppercase">Fecha de Afiliación</span>
                      <span className="font-bold text-slate-800">{new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                  </div>
                  <div className="border-t border-dashed border-slate-200 pt-3">
                    <span className="text-slate-400 block text-[8px] uppercase">Estado de Trámite</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-150 text-emerald-800 text-[9px] font-black uppercase inline-block mt-1">
                      EN PROCESO DE VALIDACIÓN
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4 flex justify-between items-end">
                  <div className="text-[8px] text-slate-400">
                    FPV-REG-VAL-2026<br />
                    Filtro de verificación humana administrativo.
                  </div>
                  <div className="w-16 h-16 rounded-full border-4 border-amber-600/30 flex items-center justify-center relative rotate-12">
                    <span className="text-[8px] font-extrabold text-amber-600/70 text-center tracking-tighter">FPV<br />REVISIÓN</span>
                  </div>
                </div>
              </div>
            )}

            {viewingDoc === 'cedula' && (
              <div className="w-[420px] h-[260px] bg-gradient-to-r from-slate-100 to-slate-200 border-4 border-slate-400 rounded-2xl shadow-2xl p-4 flex justify-between relative select-none font-sans text-slate-800 animate-in zoom-in-95 duration-155">
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-400 via-blue-500 to-red-500 rounded-t-xl" />
                <div className="w-[120px] flex flex-col justify-between items-center pt-2">
                  <div className="w-24 h-28 bg-slate-350 rounded border-2 border-slate-400/50 overflow-hidden flex items-center justify-center shadow-inner">
                    <svg viewBox="0 0 100 100" className="w-20 h-20 text-slate-500">
                      <circle cx="50" cy="40" r="18" fill="currentColor" opacity="0.4" />
                      <path d="M15 90c0-12 12-22 35-22s35 10 35 22" fill="currentColor" opacity="0.4" />
                    </svg>
                  </div>
                  <div className="text-[7px] text-center font-bold text-slate-400 uppercase tracking-widest mt-1">
                    REPÚBLICA DE VENEZUELA
                  </div>
                </div>
                <div className="flex-1 pl-4 pt-2 flex flex-col justify-between">
                  <div>
                    <h3 className="text-[10px] font-extrabold text-blue-900 tracking-wider">CÉDULA DE IDENTIDAD</h3>
                    <div className="mt-2 space-y-1.5 font-mono text-[9px] text-slate-700">
                      <div>
                        <span className="text-slate-400 text-[7px] block">NOMBRES</span>
                        <span className="font-bold">{selected.nombres}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[7px] block">APELLIDOS</span>
                        <span className="font-bold">{selected.apellidos}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[7px] block">NÚMERO</span>
                        <span className="font-black text-xs text-red-700">V-{selected.cedula}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[7px] text-right text-slate-400 font-bold pr-2 pb-1">
                    DOCUMENTO PERSONAL E INSTRANSMISIBLE
                  </div>
                </div>
              </div>
            )}

            {viewingDoc === 'rif' && (
              <div className="w-full aspect-[1/1.3] max-w-xl bg-white border border-slate-350 p-6 rounded-lg shadow-2xl relative flex flex-col justify-between font-sans text-slate-800 text-[9px] select-none animate-in zoom-in-95 duration-155">
                <div className="border border-slate-300 p-4 rounded bg-slate-50/50">
                  <div className="flex justify-between items-start border-b border-slate-200 pb-3 mb-3">
                    <div>
                      <h3 className="font-extrabold uppercase text-slate-800 leading-tight">REPÚBLICA BOLIVARIANA DE VENEZUELA</h3>
                      <h4 className="font-bold text-[8px] text-slate-500 uppercase">SERVICIO INTEGRADO DE ADMINISTRACIÓN TRIBUTARIA</h4>
                      <h2 className="font-black text-xs text-blue-900 uppercase mt-1 tracking-wider">SENIAT</h2>
                    </div>
                    <div className="text-right">
                      <div className="px-2 py-1 bg-blue-900 text-white font-extrabold rounded text-[8px]">
                        RIF: V-{selected.cedula}-0
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 font-mono">
                    <div>
                      <span className="text-slate-400 block text-[7px] uppercase">NOMBRE O RAZÓN SOCIAL</span>
                      <span className="font-bold text-slate-800 uppercase">{selected.nombres} {selected.apellidos}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[7px] uppercase">DOMICILIO FISCAL</span>
                      <span className="font-medium text-slate-750 uppercase">{selected.direccion || 'MIRANDA, VENEZUELA'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-slate-400 block text-[7px] uppercase">FECHA INSCRIPCIÓN</span>
                        <span className="font-medium text-slate-800">{new Date().toLocaleDateString('es-VE')}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center text-slate-400 text-[7.5px]">
                  <span>DOCUMENTO VALIDO DE ACUERDO CON PROVIDENCIA SENIAT Nº 0048</span>
                  <span>PÁGINA 1 DE 1</span>
                </div>
              </div>
            )}

            {viewingDoc === 'titulo' && (
              <div className="w-full aspect-[4/3] max-w-2xl bg-amber-50/95 border-[10px] border-amber-900/10 p-8 rounded-lg shadow-2xl relative flex flex-col justify-between items-center text-center font-serif text-amber-950 select-none animate-in zoom-in-95 duration-155">
                <div className="absolute inset-2 border border-amber-800/20 rounded-xs pointer-events-none" />
                <div className="absolute inset-3 border border-amber-850/40 rounded-xs pointer-events-none" />
                <div>
                  <h3 className="text-xs uppercase tracking-[0.2em] font-extrabold text-amber-900 leading-tight">República Bolivariana de Venezuela</h3>
                  <h4 className="text-[10px] uppercase tracking-widest text-amber-800 mt-1 font-bold">Colegio de Psicólogos</h4>
                </div>
                <div className="my-auto space-y-4">
                  <div className="text-[10px] italic text-amber-800">Por cuanto ha cumplido los requisitos legales correspondientes, concede el presente</div>
                  <h2 className="text-2xl md:text-3xl tracking-wide uppercase font-extrabold text-amber-950">Título Profesional</h2>
                  <div className="text-sm font-semibold tracking-wide border-b border-amber-800/30 pb-1 w-fit mx-auto text-amber-900 px-6 font-sans">
                    {selected.nombres} {selected.apellidos}
                  </div>
                  <p className="text-[10px] max-w-md mx-auto leading-relaxed text-amber-800 font-sans">
                    Para ejercer legalmente la profesión de <strong>Psicólogo</strong> en todo el territorio nacional, habiéndose inscrito bajo la matrícula gremial correspondiente.
                  </p>
                </div>
                <div className="w-full flex justify-between items-end px-4 font-sans text-[8px] text-amber-800">
                  <div className="text-left space-y-1">
                    <div>Cédula de Identidad: <strong>V-{selected.cedula}</strong></div>
                    <div>Matrícula FPV: <strong>Nº {selected.fpv}</strong></div>
                    <div>Fecha de Registro: <strong>{new Date().toLocaleDateString('es-VE')}</strong></div>
                  </div>
                  <div className="w-14 h-14 bg-yellow-500/10 rounded-full border-4 border-double border-yellow-600 flex items-center justify-center relative shadow-sm">
                    <span className="text-[7px] font-black text-yellow-750">SELLO</span>
                  </div>
                  <div className="border-t border-amber-800/30 pt-1 w-24 text-right">Junta Directiva</div>
                </div>
              </div>
            )}

            {viewingDoc === 'comprobante' && selected.pagos[0] && (
              <div className="w-96 bg-white border border-slate-300 p-6 rounded-2xl shadow-2xl flex flex-col justify-between font-sans text-slate-800 text-[10px] select-none animate-in zoom-in-95 duration-155">
                <div className="text-center border-b border-slate-200 pb-3 mb-4 flex justify-between items-center">
                  <div className="text-left">
                    <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">Comprobante de Pago</h3>
                    <p className="text-[8px] text-slate-400 uppercase mt-0.5">Recibo electrónico de transferencia</p>
                  </div>
                  <div className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[8px] uppercase">
                    PROCESADO
                  </div>
                </div>

                <div className="space-y-3 font-mono text-[9px] text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-400 text-[7px] uppercase">BANCO ORIGEN</span>
                    <span className="font-bold text-slate-800">BANCO DE VENEZUELA</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-400 text-[7px] uppercase">REFERENCIA</span>
                    <span className="font-bold text-slate-900 text-xs">{selected.pagos[0].referencia}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-400 text-[7px] uppercase">CONCEPTO</span>
                    <span className="font-bold text-slate-800 uppercase">{getConceptoPago(selected.pagos[0].notas)}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-400 text-[7px] uppercase">FECHA DE PAGO</span>
                    <span className="font-bold text-slate-800">
                      {new Date(selected.pagos[0].fecha_pago + 'T00:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-400 text-[7px] uppercase">TASA BCV</span>
                    <span className="font-bold text-slate-800">{selected.pagos[0].tasa_cambio.toFixed(2)} VES</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-450 font-bold uppercase text-[8px] text-slate-500">MONTO DEPOSITADO</span>
                    <span className="font-black text-xs text-emerald-600">{formatVES(selected.pagos[0].monto_ves)}</span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3 mt-4 text-[7px] text-slate-400 text-center font-mono uppercase">
                  VERIFICADO POR PLATAFORMA INTEGRAL COLPSI
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}

function getFileName(path: string | null) {
  if (!path) return ''
  return path.replace(/^\/placeholders\//, '')
}
