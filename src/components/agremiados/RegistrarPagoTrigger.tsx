'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormularioPago } from './FormularioPago'
import type { DeudaCalculada } from '@/hooks/useCalculadoraDeuda'

interface RegistrarPagoTriggerProps {
  agremiado_id: string
  nombreCompleto: string
  deuda: DeudaCalculada
}

export function RegistrarPagoTrigger({ agremiado_id, nombreCompleto, deuda }: RegistrarPagoTriggerProps) {
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
        disabled={deuda.esSolvente}
        title={deuda.esSolvente ? 'El agremiado está solvente' : 'Registrar nuevo pago'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          borderRadius: 10,
          border: 'none',
          background: deuda.esSolvente
            ? '#e2e8f0'
            : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          color: deuda.esSolvente ? '#94a3b8' : '#fff',
          fontSize: 14,
          fontWeight: 700,
          cursor: deuda.esSolvente ? 'not-allowed' : 'pointer',
          boxShadow: deuda.esSolvente ? 'none' : '0 4px 14px rgba(37,99,235,0.35)',
          transition: 'all 0.2s',
          fontFamily: 'inherit',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
          onSuccess={handleSuccess}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
