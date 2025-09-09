import { supabase } from './supabase'
import { addMinutes, format, isAfter, isBefore, parse } from 'date-fns'

export interface BarbershopConfig {
  hora_apertura: string
  hora_cierre: string
  dias_laborales: string[]
  duracion_cita: number
  precio_corte_adulto: number
  precio_corte_nino: number
  precio_barba: number
  precio_combo: number
  whatsapp_activo: boolean
  whatsapp_numero: string | null
  tiempo_cancelacion: number
}

// Configuración por defecto
const defaultConfig: BarbershopConfig = {
  hora_apertura: '08:00',
  hora_cierre: '18:00',
  dias_laborales: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'],
  duracion_cita: 30,
  precio_corte_adulto: 15000,
  precio_corte_nino: 10000,
  precio_barba: 8000,
  precio_combo: 20000,
  whatsapp_activo: true,
  whatsapp_numero: null,
  tiempo_cancelacion: 120 // 2 horas en minutos
}

export async function getBarbershopConfig(): Promise<BarbershopConfig> {
  try {
    const { data: barbershop, error } = await supabase
      .from('barbershops')
      .select('*')
      .single()

    if (error) {
      console.error('Error al obtener configuración de barbería:', error)
      return defaultConfig
    }

    if (!barbershop) {
      return defaultConfig
    }

    // Usar any para acceder a propiedades que pueden no estar en el tipo
    const barbershopData = barbershop as any

    return {
      hora_apertura: barbershopData.hora_apertura || defaultConfig.hora_apertura,
      hora_cierre: barbershopData.hora_cierre || defaultConfig.hora_cierre,
      dias_laborales: barbershopData.dias_laborales || defaultConfig.dias_laborales,
      duracion_cita: barbershopData.duracion_cita || defaultConfig.duracion_cita,
      precio_corte_adulto: barbershopData.precio_corte_adulto || defaultConfig.precio_corte_adulto,
      precio_corte_nino: barbershopData.precio_corte_nino || defaultConfig.precio_corte_nino,
      precio_barba: barbershopData.precio_barba || defaultConfig.precio_barba,
      precio_combo: barbershopData.precio_combo || defaultConfig.precio_combo,
      whatsapp_activo: barbershopData.whatsapp_activo ?? defaultConfig.whatsapp_activo,
      whatsapp_numero: barbershopData.whatsapp_numero || defaultConfig.whatsapp_numero,
      tiempo_cancelacion: barbershopData.tiempo_cancelacion || defaultConfig.tiempo_cancelacion
    }
  } catch (error) {
    console.error('Error al cargar configuración:', error)
    return defaultConfig
  }
}

export function generateTimeSlots(config: BarbershopConfig): string[] {
  const slots: string[] = []
  
  try {
    const startTime = parse(config.hora_apertura, 'HH:mm', new Date())
    const endTime = parse(config.hora_cierre, 'HH:mm', new Date())
    const duration = config.duracion_cita

    let currentTime = startTime

    while (isBefore(currentTime, endTime) || currentTime.getTime() === endTime.getTime()) {
      slots.push(format(currentTime, 'HH:mm'))
      currentTime = addMinutes(currentTime, duration)
    }
  } catch (error) {
    console.error('Error al generar slots de tiempo:', error)
    // Slots por defecto si hay error
    return ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
            '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', 
            '16:00', '16:30', '17:00', '17:30']
  }

  return slots
}

export function isDateAvailable(date: Date, config: BarbershopConfig): boolean {
  try {
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    const dayName = dayNames[date.getDay()]
    
    return config.dias_laborales.includes(dayName)
  } catch (error) {
    console.error('Error al verificar disponibilidad de fecha:', error)
    return true // Por defecto permitir la fecha si hay error
  }
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price)
}

export function getServicePrice(serviceType: 'adulto' | 'nino' | 'barba' | 'combo', config: BarbershopConfig): number {
  switch (serviceType) {
    case 'adulto':
      return config.precio_corte_adulto
    case 'nino':
      return config.precio_corte_nino
    case 'barba':
      return config.precio_barba
    case 'combo':
      return config.precio_combo
    default:
      return config.precio_corte_adulto
  }
}

export function canCancelAppointment(appointmentDate: Date, appointmentTime: string, config: BarbershopConfig): boolean {
  try {
    const appointmentDateTime = parse(`${format(appointmentDate, 'yyyy-MM-dd')} ${appointmentTime}`, 'yyyy-MM-dd HH:mm', new Date())
    const now = new Date()
    const minCancelTime = addMinutes(now, config.tiempo_cancelacion)
    
    return isAfter(appointmentDateTime, minCancelTime)
  } catch (error) {
    console.error('Error al verificar si se puede cancelar cita:', error)
    return false
  }
}

export function getDayNameFromDate(date: Date): string {
  const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  return dayNames[date.getDay()]
}
