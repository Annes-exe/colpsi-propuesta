export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string | null
          role: 'admin' | 'superadmin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          full_name?: string | null
          role?: 'admin' | 'superadmin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string | null
          role?: 'admin' | 'superadmin'
          updated_at?: string
        }
      }
      agremiados: {
        Row: {
          id: string
          cedula: string
          fpv: string
          nombres: string
          apellidos: string
          correo: string | null
          telefono: string | null
          fecha_inscripcion: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cedula: string
          fpv: string
          nombres: string
          apellidos: string
          correo?: string | null
          telefono?: string | null
          fecha_inscripcion: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          cedula?: string
          fpv?: string
          nombres?: string
          apellidos?: string
          correo?: string | null
          telefono?: string | null
          fecha_inscripcion?: string
          updated_at?: string
        }
      }
      pagos: {
        Row: {
          id: string
          agremiado_id: string
          fecha_pago: string
          monto_ves: number
          tasa_cambio: number
          monto_usd: number
          referencia: string
          metodo_pago: MetodoPago
          notas: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agremiado_id: string
          fecha_pago: string
          monto_ves: number
          tasa_cambio: number
          referencia: string
          metodo_pago: MetodoPago
          notas?: string | null
          created_at?: string
        }
        Update: {
          fecha_pago?: string
          monto_ves?: number
          tasa_cambio?: number
          referencia?: string
          metodo_pago?: MetodoPago
          notas?: string | null
        }
      }
      solvencias_anuales: {
        Row: {
          id: string
          agremiado_id: string
          pago_id: string
          anio_correspondiente: number
          created_at: string
        }
        Insert: {
          id?: string
          agremiado_id: string
          pago_id: string
          anio_correspondiente: number
          created_at?: string
        }
        Update: {
          anio_correspondiente?: number
        }
      }
    }
    Views: {
      vista_solvencia_agremiados: {
        Row: {
          id: string
          cedula: string
          fpv: string
          nombres: string
          apellidos: string
          correo: string | null
          telefono: string | null
          fecha_inscripcion: string
          anios_solventes: number[] | null
          total_anios_solventes: number
        }
      }
    }
    Functions: {}
    Enums: {}
  }
}

export type MetodoPago = 'transferencia' | 'pago_movil' | 'efectivo_usd' | 'zelle' | 'otro'

export type Agremiado = Database['public']['Tables']['agremiados']['Row']
export type AgreiadoInsert = Database['public']['Tables']['agremiados']['Insert']
export type AgreiadoUpdate = Database['public']['Tables']['agremiados']['Update']

export type Pago = Database['public']['Tables']['pagos']['Row']
export type PagoInsert = Database['public']['Tables']['pagos']['Insert']

export type SolvenciaAnual = Database['public']['Tables']['solvencias_anuales']['Row']
export type SolvenciaInsert = Database['public']['Tables']['solvencias_anuales']['Insert']

export type Profile = Database['public']['Tables']['profiles']['Row']

export type VistaSolvencia = Database['public']['Views']['vista_solvencia_agremiados']['Row']
