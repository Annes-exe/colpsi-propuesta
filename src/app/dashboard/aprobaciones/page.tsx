import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AprobacionesClient, type Solicitud } from '@/components/agremiados/AprobacionesClient'

export const metadata: Metadata = {
  title: 'Bandeja de Aprobaciones | ColPsi',
  description: 'Panel de revisión administrativa para nuevos registros del portal público.',
}

async function getSignedUrlOrFallback(supabase: any, url: string | null): Promise<string | null> {
  if (!url) return null
  if (url.startsWith('/placeholders/')) return url
  if (url.startsWith('http')) return url
  
  try {
    const { data } = await supabase.storage
      .from('expedientes')
      .createSignedUrl(url, 3600) // Valid for 1 hour
    
    return data?.signedUrl || url
  } catch (e) {
    console.error('Error signing storage URL:', e)
    return url
  }
}

export default async function AprobacionesPage() {
  const supabase = await createClient()
  
  // Verify auth session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch all pending registrations
  const { data: rawSolicitudes, error } = await supabase
    .from('agremiados')
    .select(`
      id,
      cedula,
      fpv,
      nombres,
      apellidos,
      fecha_inscripcion,
      colegio_pertenece,
      direccion,
      foto_carnet,
      planilla_fpv,
      cedula_digitalizada,
      rif_digitalizado,
      titulo_graduacion,
      pagos(
        id,
        fecha_pago,
        monto_ves,
        tasa_cambio,
        referencia,
        metodo_pago,
        comprobante_pago,
        notas
      )
    `)
    .eq('estado_cuenta', 'por_verificar')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching pending registrations:', error)
  }

  // Map and generate secure signed URLs for private files
  const solicitudesWithSignedUrls: Solicitud[] = await Promise.all(
    ((rawSolicitudes ?? []) as any[]).map(async (sol) => {
      const [foto, planilla, cedula, rif, titulo] = await Promise.all([
        getSignedUrlOrFallback(supabase, sol.foto_carnet),
        getSignedUrlOrFallback(supabase, sol.planilla_fpv),
        getSignedUrlOrFallback(supabase, sol.cedula_digitalizada),
        getSignedUrlOrFallback(supabase, sol.rif_digitalizado),
        getSignedUrlOrFallback(supabase, sol.titulo_graduacion)
      ])

      const paymentsWithSignedUrls = await Promise.all(
        (sol.pagos || []).map(async (p: any) => {
          const comprobante = await getSignedUrlOrFallback(supabase, p.comprobante_pago)
          return {
            id: p.id,
            fecha_pago: p.fecha_pago,
            monto_ves: p.monto_ves,
            tasa_cambio: p.tasa_cambio,
            referencia: p.referencia,
            metodo_pago: p.metodo_pago,
            comprobante_pago: comprobante,
            notas: p.notas
          }
        })
      )

      return {
        id: sol.id,
        cedula: sol.cedula,
        fpv: sol.fpv,
        nombres: sol.nombres,
        apellidos: sol.apellidos,
        fecha_inscripcion: sol.fecha_inscripcion,
        colegio_pertenece: sol.colegio_pertenece,
        direccion: sol.direccion,
        foto_carnet: foto,
        planilla_fpv: planilla,
        cedula_digitalizada: cedula,
        rif_digitalizado: rif,
        titulo_graduacion: titulo,
        pagos: paymentsWithSignedUrls
      }
    })
  )

  return (
    <div className="space-y-6 font-sans">
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
        <a href="/dashboard" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
          Dashboard
        </a>
        <span style={{ color: '#cbd5e1' }}>/</span>
        <span style={{ fontWeight: 600, color: '#0f172a' }}>Aprobaciones</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Bandeja de Aprobaciones</h1>
        <p className="text-xs text-slate-500 mt-1">Filtro Humano para validar las credenciales de inscripción y los pagos declarados.</p>
      </div>

      {/* Content Grid */}
      <AprobacionesClient solicitudesIniciales={solicitudesWithSignedUrls} />
    </div>
  )
}
