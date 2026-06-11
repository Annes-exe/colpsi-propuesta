'use client'

import { useState } from 'react'

interface DocumentosViewerProps {
  nombreCompleto: string
  cedula: string
  fpv: string
  fechaInscripcion: string
}

export function DocumentosViewer({
  nombreCompleto,
  cedula,
  fpv,
  fechaInscripcion,
}: DocumentosViewerProps) {
  const [viewingDoc, setViewingDoc] = useState<'frente' | 'reverso' | null>(null)

  const formattedDate = new Date(fechaInscripcion + 'T00:00:00').toLocaleDateString('es-VE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <>
      {/* Attached Files Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expediente de Título</h2>
          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 uppercase">Ficheros Mock</span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {/* Título Profesional Frente */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Título Profesional (Frente)</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Vista frontal digitalizada • PDF/JPG</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setViewingDoc('frente')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1.5 transition-all shadow-xs"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Ver
            </button>
          </div>

          {/* Título Profesional Reverso */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Título Profesional (Reverso)</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Sellos y firmas notariales • PDF/JPG</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setViewingDoc('reverso')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1.5 transition-all shadow-xs"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Ver
            </button>
          </div>
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

            {/* Document Vector Frame */}
            {viewingDoc === 'frente' ? (
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
                  <p className="text-[10px] max-w-md mx-auto leading-relaxed text-amber-800">
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

                  {/* Gold Badge Seal */}
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
            ) : (
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
