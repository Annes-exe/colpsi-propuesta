// ─── Auto-generado desde Supabase (bwxagkrepywwphcaahkt) ─────────────────────
// Generado: 2026-06-11

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
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
          created_at: string | null
          updated_at: string | null
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
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          cedula?: string
          fpv?: string
          nombres?: string
          apellidos?: string
          correo?: string | null
          telefono?: string | null
          fecha_inscripcion?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pagos: {
        Row: {
          id: string
          agremiado_id: string
          fecha_pago: string
          monto_ves: number
          tasa_cambio: number
          monto_usd: number | null
          referencia: string
          metodo_pago: string
          notas: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          agremiado_id: string
          fecha_pago: string
          monto_ves: number
          tasa_cambio: number
          monto_usd?: number | null
          referencia: string
          metodo_pago: string
          notas?: string | null
          created_at?: string | null
        }
        Update: {
          agremiado_id?: string
          fecha_pago?: string
          monto_ves?: number
          tasa_cambio?: number
          monto_usd?: number | null
          referencia?: string
          metodo_pago?: string
          notas?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_agremiado_id_fkey"
            columns: ["agremiado_id"]
            isOneToOne: false
            referencedRelation: "agremiados"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string | null
          role: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          username: string
          full_name?: string | null
          role?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          username?: string
          full_name?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      solvencias_anuales: {
        Row: {
          id: string
          agremiado_id: string
          pago_id: string
          anio_correspondiente: number
          created_at: string | null
        }
        Insert: {
          id?: string
          agremiado_id: string
          pago_id: string
          anio_correspondiente: number
          created_at?: string | null
        }
        Update: {
          id?: string
          agremiado_id?: string
          pago_id?: string
          anio_correspondiente?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solvencias_anuales_agremiado_id_fkey"
            columns: ["agremiado_id"]
            isOneToOne: false
            referencedRelation: "agremiados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solvencias_anuales_pago_id_fkey"
            columns: ["pago_id"]
            isOneToOne: false
            referencedRelation: "pagos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vista_solvencia_agremiados: {
        Row: {
          id: string | null
          cedula: string | null
          fpv: string | null
          nombres: string | null
          apellidos: string | null
          correo: string | null
          telefono: string | null
          fecha_inscripcion: string | null
          anios_solventes: number[] | null
          total_anios_solventes: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ─── Aliases de conveniencia ──────────────────────────────────────────────────

export type MetodoPago = 'transferencia' | 'pago_movil' | 'efectivo_usd' | 'zelle' | 'otro'

export type Agremiado = Database['public']['Tables']['agremiados']['Row']
export type AgreiadoInsert = Database['public']['Tables']['agremiados']['Insert']
export type AgreiadoUpdate = Database['public']['Tables']['agremiados']['Update']

export type Pago = Database['public']['Tables']['pagos']['Row']
export type PagoInsert = Database['public']['Tables']['pagos']['Insert']
export type PagoUpdate = Database['public']['Tables']['pagos']['Update']

export type SolvenciaAnual = Database['public']['Tables']['solvencias_anuales']['Row']
export type SolvenciaInsert = Database['public']['Tables']['solvencias_anuales']['Insert']

export type Profile = Database['public']['Tables']['profiles']['Row']

export type VistaSolvencia = Database['public']['Views']['vista_solvencia_agremiados']['Row']
