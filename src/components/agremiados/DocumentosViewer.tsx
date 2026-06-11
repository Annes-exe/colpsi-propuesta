'use client'

import { useState } from 'react'

interface DocumentosViewerProps {
  nombreCompleto: string
  cedula: string
  fpv: string
  fechaInscripcion: string
  fotoCarnetUrl?: string | null
  planillaFpvUrl?: string | null
  cedulaDigitalizadaUrl?: string | null
  rifDigitalizadoUrl?: string | null
  tituloGraduacionUrl?: string | null
}

type DocType = 'foto_carnet' | 'planilla_fpv' | 'cedula_digitalizada' | 'rif_digitalizado' | 'titulo_frente' | 'titulo_reverso' | null

export function DocumentosViewer({
  nombreCompleto,
  cedula,
  fpv,
  fechaInscripcion,
  fotoCarnetUrl,
  planillaFpvUrl,
  cedulaDigitalizadaUrl,
  rifDigitalizadoUrl,
  tituloGraduacionUrl,
}: DocumentosViewerProps) {
  const [viewingDoc, setViewingDoc] = useState<DocType>(null)

  const formattedDate = new Date(fechaInscripcion + 'T00:00:00').toLocaleDateString('es-VE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const getFileName = (path?: string | null) => {
    if (!path) return null
    return path.replace(/^\/placeholders\//, '')
  }

  const docs = [
    {
      id: 'foto_carnet' as const,
      label: 'Fotografía de Carnet',
      description: 'Foto tipo carnet fondo blanco',
      url: fotoCarnetUrl,
      fileName: getFileName(fotoCarnetUrl),
      badge: 'JPG / PNG',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      )
    },
    {
      id: 'planilla_fpv' as const,
      label: 'Planilla FPV',
      description: 'Formulario oficial de afiliación FPV',
      url: planillaFpvUrl,
      fileName: getFileName(planillaFpvUrl),
      badge: 'PDF',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    },
    {
      id: 'cedula_digitalizada' as const,
      label: 'Cédula de Identidad',
      description: 'Documento de identidad digitalizado',
      url: cedulaDigitalizadaUrl,
      fileName: getFileName(cedulaDigitalizadaUrl),
      badge: 'PDF / JPG',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="12" r="3" />
          <path d="M14 9h5M14 13h5M14 17h2" />
        </svg>
      )
    },
    {
      id: 'rif_digitalizado' as const,
      label: 'RIF Digitalizado',
      description: 'Registro de Información Fiscal SENIAT',
      url: rifDigitalizadoUrl,
      fileName: getFileName(rifDigitalizadoUrl),
      badge: 'PDF',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <circle cx="10" cy="13" r="2" />
          <path d="M15 18a3 3 0 0 0-6 0" />
        </svg>
      )
    },
    {
      id: 'titulo_frente' as const,
      label: 'Título de Psicólogo (Frente)',
      description: 'Diploma profesional acreditado',
      url: tituloGraduacionUrl,
      fileName: getFileName(tituloGraduacionUrl),
      badge: 'Diploma',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
        </svg>
      )
    },
    {
      id: 'titulo_reverso' as const,
      label: 'Título de Psicólogo (Reverso)',
      description: 'Registros, firmas y sellos traseros',
      url: tituloGraduacionUrl,
      fileName: getFileName(tituloGraduacionUrl) ? 'reverso_' + getFileName(tituloGraduacionUrl) : null,
      badge: 'Endosos',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M21 7.5H3M21 12H3M21 16.5H3" />
        </svg>
      )
    }
  ]

  return (
    <>
      {/* Attached Files Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expediente Digital</h2>
          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 uppercase">Expediente Activo</span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {docs.map((doc) => {
            const exists = !!doc.url
            return (
              <div
                key={doc.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  exists
                    ? 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                    : 'border-slate-150 bg-slate-50/20 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    exists ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {doc.icon}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">{doc.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {exists ? doc.fileName : 'Documento no adjuntado'}
                    </div>
                  </div>
                </div>

                {exists ? (
                  <button
                    type="button"
                    onClick={() => setViewingDoc(doc.id)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    Ver
                  </button>
                ) : (
                  <span className="px-2 py-1 rounded bg-slate-100 text-slate-400 text-[9px] font-bold">
                    Pendiente
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Lightbox Modal */}
      {viewingDoc && (
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

            {/* Render specialized vector document previews */}
            {viewingDoc === 'foto_carnet' && (
              <div className="w-64 aspect-[3/4] bg-white border-[8px] border-slate-300 p-4 rounded-lg shadow-2xl flex flex-col items-center justify-between text-center select-none">
                <div className="text-[9px] font-bold text-slate-400 tracking-wider uppercase border-b border-slate-200 pb-1.5 w-full">
                  FOTOGRAFÍA OFICIAL DE AGREMIADO
                </div>
                {/* Simulated Photo */}
                <div className="w-40 h-40 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden relative shadow-inner my-auto flex items-center justify-center">
                  <svg viewBox="0 0 120 120" className="w-32 h-32 text-slate-400">
                    <circle cx="60" cy="45" r="20" fill="currentColor" opacity="0.3" />
                    <path d="M20 100c0-15 15-25 40-25s40 10 40 25" fill="currentColor" opacity="0.3" />
                  </svg>
                </div>
                <div className="w-full">
                  <div className="text-xs font-black text-slate-800 uppercase leading-none">{nombreCompleto}</div>
                  <div className="text-[9px] font-mono text-slate-500 mt-1">C.I. V-{cedula}</div>
                </div>
              </div>
            )}

            {viewingDoc === 'planilla_fpv' && (
              <div className="w-full aspect-[1/1.3] max-w-xl bg-white border border-slate-300 p-8 rounded-lg shadow-2xl relative flex flex-col justify-between font-sans text-slate-800 text-[10px] select-none">
                <div className="text-center border-b border-slate-250 pb-4">
                  <h3 className="text-xs font-extrabold tracking-wider uppercase text-slate-900 leading-tight">Federación de Psicólogos de Venezuela</h3>
                  <h4 className="text-[9px] tracking-wide text-slate-500 font-bold uppercase mt-1">Planilla de Inscripción Gremial Nacional</h4>
                </div>

                <div className="my-auto space-y-4 py-4 font-mono text-[9px] text-slate-700">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-400 block text-[8px] uppercase">Nombres y Apellidos</span>
                      <span className="font-bold text-slate-800 uppercase">{nombreCompleto}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[8px] uppercase">Cédula de Identidad</span>
                      <span className="font-bold text-slate-800">V-{cedula}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-400 block text-[8px] uppercase">Nº de Inscripción FPV</span>
                      <span className="font-bold text-blue-600 text-xs">Nº {fpv}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[8px] uppercase">Fecha de Afiliación</span>
                      <span className="font-bold text-slate-800">{formattedDate}</span>
                    </div>
                  </div>
                  <div className="border-t border-dashed border-slate-200 pt-3">
                    <span className="text-slate-400 block text-[8px] uppercase">Estado de Trámite</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-150 text-emerald-800 text-[9px] font-black uppercase inline-block mt-1">
                      AFILIADO REGISTRADO Y VALIDADO
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4 flex justify-between items-end">
                  <div className="text-[8px] text-slate-400">
                    FPV-REG-VAL-2026<br />
                    Firma autorizada por la Secretaría General.
                  </div>
                  <div className="w-16 h-16 rounded-full border-4 border-emerald-600/30 flex items-center justify-center relative rotate-12">
                    <span className="text-[8px] font-extrabold text-emerald-600/70 text-center tracking-tighter">FPV<br />APROBADO</span>
                  </div>
                </div>
              </div>
            )}

            {viewingDoc === 'cedula_digitalizada' && (
              <div className="w-[420px] h-[260px] bg-gradient-to-r from-slate-100 to-slate-200 border-4 border-slate-400 rounded-2xl shadow-2xl p-4 flex justify-between relative select-none font-sans text-slate-800">
                {/* Yellow/Blue stripe highlights */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-400 via-blue-500 to-red-500 rounded-t-xl" />
                
                {/* Left section: Photo & Gold Seal */}
                <div className="w-[120px] flex flex-col justify-between items-center pt-2">
                  <div className="w-24 h-28 bg-slate-300/80 rounded border-2 border-slate-400/50 overflow-hidden flex items-center justify-center shadow-inner">
                    <svg viewBox="0 0 100 100" className="w-20 h-20 text-slate-500">
                      <circle cx="50" cy="40" r="18" fill="currentColor" opacity="0.4" />
                      <path d="M15 90c0-12 12-22 35-22s35 10 35 22" fill="currentColor" opacity="0.4" />
                    </svg>
                  </div>
                  <div className="text-[7px] text-center font-bold text-slate-400 uppercase tracking-widest mt-1">
                    REPÚBLICA DE VENEZUELA
                  </div>
                </div>

                {/* Right section: details */}
                <div className="flex-1 pl-4 pt-2 flex flex-col justify-between">
                  <div>
                    <h3 className="text-[10px] font-extrabold text-blue-900 tracking-wider">CÉDULA DE IDENTIDAD</h3>
                    <div className="mt-2 space-y-1.5 font-mono text-[9px] text-slate-700">
                      <div>
                        <span className="text-slate-400 text-[7px] block">NOMBRES</span>
                        <span className="font-bold">{nombreCompleto.split(' ')[0]}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[7px] block">APELLIDOS</span>
                        <span className="font-bold">{nombreCompleto.split(' ').slice(1).join(' ') || 'PSICÓLOGO'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[7px] block">NÚMERO</span>
                        <span className="font-black text-xs text-red-700">V-{cedula}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[7px] text-right text-slate-400 font-bold pr-2 pb-1">
                    DOCUMENTO PERSONAL E INSTRANSMISIBLE
                  </div>
                </div>
              </div>
            )}

            {viewingDoc === 'rif_digitalizado' && (
              <div className="w-full aspect-[1/1.3] max-w-xl bg-white border border-slate-350 p-6 rounded-lg shadow-2xl relative flex flex-col justify-between font-sans text-slate-800 text-[9px] select-none">
                <div className="border border-slate-300 p-4 rounded bg-slate-50/50">
                  <div className="flex justify-between items-start border-b border-slate-200 pb-3 mb-3">
                    <div>
                      <h3 className="font-extrabold uppercase text-slate-800 leading-tight">REPÚBLICA BOLIVARIANA DE VENEZUELA</h3>
                      <h4 className="font-bold text-[8px] text-slate-500 uppercase">SERVICIO INTEGRADO DE ADMINISTRACIÓN TRIBUTARIA</h4>
                      <h2 className="font-black text-xs text-blue-900 uppercase mt-1 tracking-wider">SENIAT</h2>
                    </div>
                    <div className="text-right">
                      <div className="px-2 py-1 bg-blue-900 text-white font-extrabold rounded text-[8px]">
                        RIF: V-{cedula}-0
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 font-mono">
                    <div>
                      <span className="text-slate-400 block text-[7px] uppercase">NOMBRE O RAZÓN SOCIAL</span>
                      <span className="font-bold text-slate-800 uppercase">{nombreCompleto}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[7px] uppercase">DOMICILIO FISCAL</span>
                      <span className="font-medium text-slate-800">MIRANDA, VENEZUELA (DIRECCIÓN REGISTRADA EN SISTEMA)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-slate-400 block text-[7px] uppercase">FECHA INSCRIPCIÓN</span>
                        <span className="font-medium text-slate-800">{formattedDate}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[7px] uppercase">FIRMA AUTORIZADA</span>
                        <span className="font-medium text-slate-800">VALIDACIÓN ONLINE</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[7px] text-slate-400">
                  <span>DOCUMENTO VALIDO DE ACUERDO CON PROVIDENCIA SENIAT Nº 0048</span>
                  <span>PÁGINA 1 DE 1</span>
                </div>
              </div>
            )}

            {/* Document Vector Frame (Título Frente) */}
            {viewingDoc === 'titulo_frente' && (
              <div className="w-full aspect-[4/3] max-w-2xl bg-amber-50/95 border-[10px] border-amber-900/10 p-8 rounded-lg shadow-2xl relative flex flex-col justify-between items-center text-center font-serif text-amber-950 select-none">
                {/* Thin gold borders */}
                <div className="absolute inset-2 border border-amber-800/20 rounded-xs pointer-events-none" />
                <div className="absolute inset-3 border border-amber-850/40 rounded-xs pointer-events-none" />

                {/* Header */}
                <div>
                  <h3 className="text-xs uppercase tracking-[0.2em] font-extrabold text-amber-900 leading-tight">República Bolivariana de Venezuela</h3>
                  <h4 className="text-[10px] uppercase tracking-widest text-amber-800 mt-1 font-bold">Colegio de Psicólogos</h4>
                </div>

                {/* Main Body */}
                <div className="my-auto space-y-4">
                  <div className="text-[10px] italic text-amber-800">Por cuanto ha cumplido los requisitos legales correspondientes, concede el presente</div>
                  <h2 className="text-2xl md:text-3xl tracking-wide uppercase font-extrabold text-amber-950">Título Profesional</h2>
                  <div className="text-sm font-semibold tracking-wide border-b border-amber-800/30 pb-1 w-fit mx-auto text-amber-900 px-6 font-sans">
                    {nombreCompleto}
                  </div>
                  <p className="text-[10px] max-w-md mx-auto leading-relaxed text-amber-800 font-sans">
                    Para ejercer legalmente la profesión de <strong>Psicólogo</strong> en todo el territorio nacional, habiéndose inscrito bajo la matrícula gremial correspondiente.
                  </p>
                </div>

                {/* Footer / Gold Seal */}
                <div className="w-full flex justify-between items-end px-4">
                  <div className="text-left font-sans text-[8px] text-amber-800 space-y-1">
                    <div>Cédula de Identidad: <strong>V-{cedula}</strong></div>
                    <div>Matrícula FPV: <strong>Nº {fpv}</strong></div>
                    <div>Fecha de Registro: <strong>{formattedDate}</strong></div>
                  </div>

                  {/* Gold Seal */}
                  <div className="w-14 h-14 bg-yellow-500/10 rounded-full border-4 border-double border-yellow-600 flex items-center justify-center relative shadow-sm">
                    <div className="absolute w-10 h-10 border border-dashed border-yellow-600 rounded-full flex items-center justify-center text-[7px] font-black text-yellow-700 tracking-tighter">
                      SELLO
                    </div>
                  </div>

                  <div className="text-right font-sans text-[8px] text-amber-800 space-y-3">
                    <div className="border-t border-amber-800/30 pt-1 w-24">Junta Directiva</div>
                  </div>
                </div>
              </div>
            )}

            {/* Document Vector Frame (Título Reverso) */}
            {viewingDoc === 'titulo_reverso' && (
              <div className="w-full aspect-[4/3] max-w-2xl bg-white border border-slate-200 p-8 rounded-lg shadow-2xl relative flex flex-col justify-between select-none font-sans text-slate-800 text-[9px] leading-relaxed">
                <h3 className="text-xs font-bold border-b border-slate-250 pb-2 mb-2 text-slate-500 uppercase tracking-wide">Registro e Historial de Endoso</h3>

                <div className="grid grid-cols-2 gap-6 my-auto">
                  {/* Stamp 1 */}
                  <div className="border border-slate-300 p-3 rounded-lg bg-slate-50/50 relative">
                    <div className="absolute top-2 right-2 w-7 h-7 border border-blue-600/30 rounded-full flex items-center justify-center text-[6px] font-bold text-blue-600/60 rotate-12">
                      MPPEU
                    </div>
                    <div className="font-bold text-slate-700 uppercase tracking-wide mb-1 text-[8px]">1. Registro Principal</div>
                    <p className="text-slate-500 font-mono text-[8px]">
                      Quedó registrado bajo el número de Tomo IV, Folio 112, del Registro de Títulos del Ministerio del Poder Popular para la Educación Universitaria.
                      <br />
                      Fecha: 12/03/2024
                    </p>
                  </div>

                  {/* Stamp 2 */}
                  <div className="border border-slate-300 p-3 rounded-lg bg-slate-50/50 relative">
                    <div className="absolute top-2 right-2 w-7 h-7 border border-red-600/30 rounded-full flex items-center justify-center text-[6px] font-bold text-red-600/60 -rotate-12">
                      SAIME
                    </div>
                    <div className="font-bold text-slate-700 uppercase tracking-wide mb-1 text-[8px]">2. Identificación</div>
                    <p className="text-slate-500 font-mono text-[8px]">
                      Cotejado y verificado con el documento de identidad original V-{cedula}. Conforme a los registros SAIME vigentes.
                      <br />
                      Firma del Registrador.
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-slate-400 text-[8px]">
                  <span>EXP: {fpv}-T-2024</span>
                  <span>Documento verificado digitalmente</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
