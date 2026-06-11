import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Migración — Módulo en Desarrollo | ColPsi',
}

export default function MigrationPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] bg-white border border-slate-200 rounded-2xl p-8 md:p-16 text-center shadow-xs max-w-4xl mx-auto">
      {/* Icon Area */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-indigo-100 rounded-full blur-xl opacity-50 scale-150 animate-pulse" />
        <div className="relative w-24 h-24 bg-gradient-to-tr from-indigo-500 to-violet-400 rounded-full flex items-center justify-center text-white shadow-lg">
          <svg className="w-12 h-12 animate-bounce-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
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
        Migración de Datos
      </h1>
      <p className="text-slate-500 max-w-lg mx-auto text-sm md:text-base leading-relaxed mb-8">
        Estamos trabajando en la herramienta de migración masiva. Desde aquí podrás importar bases de datos heredadas en formatos Excel/CSV, sincronizar el registro histórico de agremiados y resolver conflictos de duplicación de forma automatizada.
      </p>

      {/* Action */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
        <Link
          href="/dashboard"
          className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Volver al Dashboard
        </Link>
      </div>

      {/* Custom slow bounce animation */}
      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
