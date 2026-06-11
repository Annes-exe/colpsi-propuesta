'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient, createClient } from '@/lib/supabase/server'

export interface ActionResponse {
  success: boolean
  error?: string
}

function extractStoragePath(url: string | null): string | null {
  if (!url || url.startsWith('/placeholders/')) return null
  
  try {
    const signMarker = '/object/sign/expedientes/'
    const publicMarker = '/object/public/expedientes/'
    
    if (url.includes(signMarker)) {
      return decodeURIComponent(url.split(signMarker)[1].split('?')[0])
    }
    if (url.includes(publicMarker)) {
      return decodeURIComponent(url.split(publicMarker)[1])
    }
    
    // If it's a simple path name saved in database
    if (!url.startsWith('http') && !url.startsWith('/')) {
      return url
    }
  } catch (e) {
    console.error('Error parsing file URL:', e)
  }
  return null
}

/**
 * Approves a registration request by changing the status to 'Activo'.
 */
export async function aprobarSolicitud(id: string): Promise<ActionResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autorizado. Por favor inicia sesión.' }
  }

  const db = createServiceClient()
  try {
    const { error } = await db
      .from('agremiados')
      .update({ estado_cuenta: 'Activo', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Error approving member:', error)
      return { success: false, error: `Error al activar agremiado: ${error.message}` }
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/agremiados')
    revalidatePath('/dashboard/aprobaciones')
    revalidatePath(`/dashboard/agremiados/${id}`)

    return { success: true }
  } catch (err: any) {
    console.error('Exception in aprobarSolicitud:', err)
    return { success: false, error: err?.message || 'Error interno del servidor.' }
  }
}

/**
 * Rejects a registration request by deleting the database records and any uploaded files from storage.
 */
export async function rechazarSolicitud(id: string): Promise<ActionResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autorizado. Por favor inicia sesión.' }
  }

  const db = createServiceClient()
  try {
    // 1. Fetch file paths from member record
    const { data: agremiado, error: fetchError } = await db
      .from('agremiados')
      .select('foto_carnet, planilla_fpv, cedula_digitalizada, rif_digitalizado, titulo_graduacion')
      .eq('id', id)
      .single()

    if (fetchError || !agremiado) {
      console.error('Error fetching member files for deletion:', fetchError)
      return { success: false, error: 'No se encontró el agremiado para procesar el rechazo.' }
    }

    // 2. Fetch comprobante from associated payments
    const { data: pagos } = await db
      .from('pagos')
      .select('comprobante_pago')
      .eq('agremiado_id', id)

    // Collect all paths to delete from storage
    const fileUrls = [
      agremiado.foto_carnet,
      agremiado.planilla_fpv,
      agremiado.cedula_digitalizada,
      agremiado.rif_digitalizado,
      agremiado.titulo_graduacion,
      ...(pagos?.map(p => p.comprobante_pago) ?? [])
    ]

    const pathsToDelete = fileUrls
      .map(url => extractStoragePath(url))
      .filter((path): path is string => !!path)

    // 3. Delete files from Supabase Storage
    if (pathsToDelete.length > 0) {
      console.log('Deleting files from storage:', pathsToDelete)
      const { error: storageError } = await db.storage
        .from('expedientes')
        .remove(pathsToDelete)

      if (storageError) {
        console.error('Warning: Error deleting files from storage bucket:', storageError)
        // We do not fail the request, but we log the warning so we can proceed with DB cleanup
      }
    }

    // 4. Delete DB records manually (dependencies first to satisfy foreign keys)
    await db.from('solvencias_anuales').delete().eq('agremiado_id', id)
    await db.from('pagos').delete().eq('agremiado_id', id)
    
    const { error: deleteError } = await db
      .from('agremiados')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting member record:', deleteError)
      return { success: false, error: `Error al eliminar el registro de base de datos: ${deleteError.message}` }
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/agremiados')
    revalidatePath('/dashboard/aprobaciones')

    return { success: true }
  } catch (err: any) {
    console.error('Exception in rechazarSolicitud:', err)
    return { success: false, error: err?.message || 'Error interno del servidor.' }
  }
}
