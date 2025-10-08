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
          telefono: string | null
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          barbershop_id: string
          nombre: string
          telefono?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          barbershop_id?: string
          nombre?: string
          telefono?: string | null
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
          }
        ]
      }
      financial_categories: {
        Row: {
          id: string
          barbershop_id: string
          nombre: string
          tipo: 'ingreso' | 'gasto'
          descripcion: string | null
          color: string
          activo: boolean
          orden: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          barbershop_id: string
          nombre: string
          tipo: 'ingreso' | 'gasto'
          descripcion?: string | null
          color?: string
          activo?: boolean
          orden?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          barbershop_id?: string
          nombre?: string
          tipo?: 'ingreso' | 'gasto'
          descripcion?: string | null
          color?: string
          activo?: boolean
          orden?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_barbershop_id_fkey"
            columns: ["barbershop_id"]
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          }
        ]
      }
      financial_transactions: {
        Row: {
          id: string
          barbershop_id: string
          appointment_id: string | null
          category_id: string
          barber_id: string | null
          tipo: 'ingreso' | 'gasto'
          metodo_pago: 'efectivo' | 'sinpe' | 'tarjeta_credito' | 'tarjeta_debito' | 'transferencia'
          monto: number
          moneda: string
          concepto: string
          descripcion: string | null
          numero_factura: string | null
          numero_referencia: string | null
          estado: 'pendiente' | 'completada' | 'cancelada'
          fecha_transaccion: string
          fecha_vencimiento: string | null
          es_recurrente: boolean
          frecuencia_recurrencia: string | null
          tags: string[] | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          barbershop_id: string
          appointment_id?: string | null
          category_id: string
          barber_id?: string | null
          tipo: 'ingreso' | 'gasto'
          metodo_pago: 'efectivo' | 'sinpe' | 'tarjeta_credito' | 'tarjeta_debito' | 'transferencia'
          monto: number
          moneda?: string
          concepto: string
          descripcion?: string | null
          numero_factura?: string | null
          numero_referencia?: string | null
          estado?: 'pendiente' | 'completada' | 'cancelada'
          fecha_transaccion?: string
          fecha_vencimiento?: string | null
          es_recurrente?: boolean
          frecuencia_recurrencia?: string | null
          tags?: string[] | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          barbershop_id?: string
          appointment_id?: string | null
          category_id?: string
          barber_id?: string | null
          tipo?: 'ingreso' | 'gasto'
          metodo_pago?: 'efectivo' | 'sinpe' | 'tarjeta_credito' | 'tarjeta_debito' | 'transferencia'
          monto?: number
          moneda?: string
          concepto?: string
          descripcion?: string | null
          numero_factura?: string | null
          numero_referencia?: string | null
          estado?: 'pendiente' | 'completada' | 'cancelada'
          fecha_transaccion?: string
          fecha_vencimiento?: string | null
          es_recurrente?: boolean
          frecuencia_recurrencia?: string | null
          tags?: string[] | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_appointment_id_fkey"
            columns: ["appointment_id"]
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_barber_id_fkey"
            columns: ["barber_id"]
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          }
        ]
      }
      financial_settings: {
        Row: {
          id: string
          barbershop_id: string
          moneda_principal: string
          simbolo_moneda: string
          decimales: number
          comision_barbero_porcentaje: number
          comision_barbero_activa: boolean
          impuesto_ventas_porcentaje: number
          incluir_impuestos: boolean
          incluir_logo_pdf: boolean
          incluir_firma_digital: boolean
          plantilla_pdf: string
          alerta_objetivo_diario: number | null
          alerta_gastos_excesivos: number | null
          notificar_objetivos: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          barbershop_id: string
          moneda_principal?: string
          simbolo_moneda?: string
          decimales?: number
          comision_barbero_porcentaje?: number
          comision_barbero_activa?: boolean
          impuesto_ventas_porcentaje?: number
          incluir_impuestos?: boolean
          incluir_logo_pdf?: boolean
          incluir_firma_digital?: boolean
          plantilla_pdf?: string
          alerta_objetivo_diario?: number | null
          alerta_gastos_excesivos?: number | null
          notificar_objetivos?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          barbershop_id?: string
          moneda_principal?: string
          simbolo_moneda?: string
          decimales?: number
          comision_barbero_porcentaje?: number
          comision_barbero_activa?: boolean
          impuesto_ventas_porcentaje?: number
          incluir_impuestos?: boolean
          incluir_logo_pdf?: boolean
          incluir_firma_digital?: boolean
          plantilla_pdf?: string
          alerta_objetivo_diario?: number | null
          alerta_gastos_excesivos?: number | null
          notificar_objetivos?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_settings_barbershop_id_fkey"
            columns: ["barbershop_id"]
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          }
        ]
      }
      financial_goals: {
        Row: {
          id: string
          barbershop_id: string
          titulo: string
          descripcion: string | null
          tipo: string
          monto_objetivo: number
          fecha_inicio: string
          fecha_fin: string
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          barbershop_id: string
          titulo: string
          descripcion?: string | null
          tipo: string
          monto_objetivo: number
          fecha_inicio: string
          fecha_fin: string
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          barbershop_id?: string
          titulo?: string
          descripcion?: string | null
          tipo?: string
          monto_objetivo?: number
          fecha_inicio?: string
          fecha_fin?: string
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_goals_barbershop_id_fkey"
            columns: ["barbershop_id"]
            referencedRelation: "barbershops"
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
      transaction_type: 'ingreso' | 'gasto'
      payment_method: 'efectivo' | 'sinpe' | 'tarjeta_credito' | 'tarjeta_debito' | 'transferencia'
      transaction_status: 'pendiente' | 'completada' | 'cancelada'
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

// Tipos para el módulo financiero
export type FinancialCategory = Database['public']['Tables']['financial_categories']['Row']
export type FinancialTransaction = Database['public']['Tables']['financial_transactions']['Row']
export type FinancialSettings = Database['public']['Tables']['financial_settings']['Row']
export type FinancialGoal = Database['public']['Tables']['financial_goals']['Row']

export type TransactionType = 'ingreso' | 'gasto'
export type PaymentMethod = 'efectivo' | 'sinpe' | 'tarjeta_credito' | 'tarjeta_debito' | 'transferencia'
export type TransactionStatus = 'pendiente' | 'completada' | 'cancelada'

export type FinancialTransactionWithDetails = FinancialTransaction & {
  category: FinancialCategory
  appointment?: Appointment & {
    clients: Client
  }
}

export interface FinancialSummary {
  total_ingresos: number
  total_gastos: number
  ganancia_neta: number
  total_transacciones: number
  efectivo_recibido: number
  sinpe_recibido: number
  promedio_diario: number
}
