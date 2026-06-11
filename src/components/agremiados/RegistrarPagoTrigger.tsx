'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormularioPago } from './FormularioPago'
import type { DeudaCalculada } from '@/hooks/useCalculadoraDeuda'

interface RegistrarPagoTriggerProps {
  agremiado_id: string
  nombreCompleto: string
  deuda: DeudaCalculada
  fecha_recepcion_titulo?: string | null
  fecha_inscripcion?: string | null
}

export function RegistrarPagoTrigger({
  agremiado_id,
  nombreCompleto,
  deuda,
  fecha_recepcion_titulo,
  fecha_inscripcion
}: RegistrarPagoTriggerProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const handleSuccess = () => {
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        id="btn-registrar-pago"
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-none bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-sm cursor-pointer shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all"
        title="Registrar nuevo pago (Solvencia, Inscripción, Custodia, Carnet)"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Registrar Pago
      </button>

      {open && (
        <FormularioPago
          agremiado_id={agremiado_id}
          nombreCompleto={nombreCompleto}
          deuda={deuda}
          fecha_recepcion_titulo={fecha_recepcion_titulo}
          fecha_inscripcion={fecha_inscripcion}
          onSuccess={handleSuccess}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
