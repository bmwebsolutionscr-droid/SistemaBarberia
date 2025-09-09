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
      barbershops: {
        Row: {
          id: string
          nombre: string
          email: string
          telefono: string | null
          direccion: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          email: string
          telefono?: string | null
          direccion?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          email?: string
          telefono?: string | null
          direccion?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      barbers: {
        Row: {
          id: string
          barbershop_id: string
          nombre: string
          telefono: string | null
          especialidad: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          barbershop_id: string
          nombre: string
          telefono?: string | null
          especialidad?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          barbershop_id?: string
          nombre?: string
          telefono?: string | null
          especialidad?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "barbers_barbershop_id_fkey"
            columns: ["barbershop_id"]
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          }
        ]
      }
      clients: {
        Row: {
          id: string
          barbershop_id: string
          nombre: string
          telefono: string
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          barbershop_id: string
          nombre: string
          telefono: string
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          barbershop_id?: string
          nombre?: string
          telefono?: string
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_barbershop_id_fkey"
            columns: ["barbershop_id"]
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          }
        ]
      }
      appointments: {
        Row: {
          id: string
          barbershop_id: string
          barber_id: string
          client_id: string
          fecha: string
          hora: string
          duracion: number | null
          precio: number | null
          estado: 'programada' | 'confirmada' | 'cancelada' | 'completada'
          tipo_servicio: 'corte' | 'corte_barba'
          duracion_minutos: number
          notas?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          barbershop_id: string
          barber_id: string
          client_id: string
          fecha: string
          hora: string
          duracion?: number | null
          precio?: number | null
          estado?: 'programada' | 'confirmada' | 'cancelada' | 'completada'
          tipo_servicio?: 'corte' | 'corte_barba'
          duracion_minutos?: number
          notas?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          barbershop_id?: string
          barber_id?: string
          client_id?: string
          fecha?: string
          hora?: string
          duracion?: number | null
          precio?: number | null
          estado?: 'programada' | 'confirmada' | 'cancelada' | 'completada'
          tipo_servicio?: 'corte' | 'corte_barba'
          duracion_minutos?: number
          notas?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barbershop_id_fkey"
            columns: ["barbershop_id"]
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      reports: {
        Row: {
          id: string
          barbershop_id: string
          barber_id: string | null
          fecha_inicio: string
          fecha_fin: string
          total_citas: number
          created_at: string
        }
        Insert: {
          id?: string
          barbershop_id: string
          barber_id?: string | null
          fecha_inicio: string
          fecha_fin: string
          total_citas: number
          created_at?: string
        }
        Update: {
          id?: string
          barbershop_id?: string
          barber_id?: string | null
          fecha_inicio?: string
          fecha_fin?: string
          total_citas?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_barbershop_id_fkey"
            columns: ["barbershop_id"]
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_barber_id_fkey"
            columns: ["barber_id"]
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      appointment_status: 'programada' | 'confirmada' | 'cancelada' | 'completada'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Tipos auxiliares
export type Barbershop = Database['public']['Tables']['barbershops']['Row']
export type Barber = Database['public']['Tables']['barbers']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type Appointment = Database['public']['Tables']['appointments']['Row']
export type Report = Database['public']['Tables']['reports']['Row']

export type AppointmentWithDetails = Appointment & {
  barbers: Barber
  clients: Client
}

export type AppointmentWithClient = Appointment & {
  clients: Client
  barbers?: Barber
}

export type BarberWithAppointments = Barber & {
  appointments: Appointment[]
}
