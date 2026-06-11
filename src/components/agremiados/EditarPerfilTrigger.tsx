'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormularioEditarAgremiado } from './FormularioEditarAgremiado'

interface EditarPerfilTriggerProps {
  agremiado: {
    id: string
    cedula: string
    fpv: string
    nombres: string
    apellidos: string
    correo: string | null
    telefono: string | null
    fecha_inscripcion: string
    direccion?: string | null
    colegio_pertenece?: string | null
    foto_carnet?: string | null
    planilla_fpv?: string | null
    cedula_digitalizada?: string | null
    rif_digitalizado?: string | null
    titulo_graduacion?: string | null
  }
  fechaRecepcionTitulo: string | null
}

export function EditarPerfilTrigger({ agremiado, fechaRecepcionTitulo }: EditarPerfilTriggerProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const handleSuccess = () => {
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        id="btn-editar-perfil"
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm cursor-pointer shadow-xs hover:shadow-sm transition-all"
        title="Editar datos del agremiado"
      >
        <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        Editar Perfil
      </button>

      {open && (
        <FormularioEditarAgremiado
          agremiado={agremiado}
          fechaRecepcionTitulo={fechaRecepcionTitulo}
          onSuccess={handleSuccess}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
