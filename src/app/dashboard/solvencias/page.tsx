import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Solvencias — Módulo en Desarrollo | ColPsi',
}

export default function SolvenciasPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] bg-white border border-slate-200 rounded-2xl p-8 md:p-16 text-center shadow-xs max-w-4xl mx-auto">
      {/* Icon Area */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-emerald-100 rounded-full blur-xl opacity-50 scale-150 animate-pulse" />
        <div className="relative w-24 h-24 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-full flex items-center justify-center text-white shadow-lg">
          <svg className="w-11 h-11 animate-pulse-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
      </div>

      {/* Badge */}
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 mb-4 tracking-wider uppercase">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
        Módulo en Desarrollo
      </span>

      {/* Title & Description */}
      <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
        Gestión de Solvencias
      </h1>
      <p className="text-slate-500 max-w-lg mx-auto text-sm md:text-base leading-relaxed mb-8">
        Estamos construyendo el panel central de solvencias para emitir certificados masivos y consultar filtros globales de solvencia. Actualmente, puedes consultar y gestionar el estado de solvencia de cada agremiado desde su perfil individual.
      </p>

      {/* Action */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
        <Link
          href="/dashboard/agremiados"
          className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Ir al Directorio
        </Link>
      </div>

      {/* Custom slow pulse animation */}
      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(0.96); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
