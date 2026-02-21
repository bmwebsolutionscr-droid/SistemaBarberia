import { supabase } from './supabase'
import { addMinutes, format, isAfter, isBefore, parse } from 'date-fns'

export interface BarbershopConfig {
  hora_apertura: string
  hora_cierre: string
  hora_almuerzo_inicio: string
  hora_almuerzo_fin: string
  almuerzo_activo: boolean
  dias_laborales: string[]
  duracion_cita: number
  duracion_corte_barba: number
  precio_corte_adulto: number
  precio_corte_nino: number
  precio_barba: number
  precio_combo: number
  whatsapp_activo: boolean
  whatsapp_numero: string | null
  tiempo_cancelacion: number
  tipos_servicio: Array<{ key: string; label: string; precio: number; duracion: number }>
}

// Configuración por defecto
const defaultConfig: BarbershopConfig = {
  hora_apertura: '08:00',
  hora_cierre: '18:00',
  hora_almuerzo_inicio: '12:00',
  hora_almuerzo_fin: '13:00',
  almuerzo_activo: true,
  dias_laborales: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'],
  duracion_cita: 30,
  duracion_corte_barba: 60,
  precio_corte_adulto: 15000,
  precio_corte_nino: 10000,
  precio_barba: 8000,
  precio_combo: 20000,
  whatsapp_activo: true,
  whatsapp_numero: null,
  tiempo_cancelacion: 120 // 2 horas en minutos
}

// Default services list
const defaultServiceTypes = [
  { key: 'corte', label: 'Corte Normal', precio: 15000, duracion: 30 },
  { key: 'corte_barba', label: 'Corte + Barba', precio: 20000, duracion: 60 }
]

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

    // Debug: verificar campos de almuerzo en BD (logs eliminados en producción)

    // Función auxiliar para normalizar valores de tiempo
    const normalizeTimeValue = (value: any, fallback: string) => {
      if (!value) return fallback
      
      // Si es un string, limpiar y validar
      if (typeof value === 'string') {
        const cleaned = value.trim()
        // Si viene como "13:00:00", convertir a "13:00"
        if (cleaned.match(/^\d{2}:\d{2}:\d{2}$/)) {
          return cleaned.substring(0, 5) // tomar solo HH:mm
        }
        return cleaned
      }
      
      // Si es un objeto Date, formatear
      if (value instanceof Date) {
        return format(value, 'HH:mm')
      }
      
      return fallback
    }

    // Parsear tipos_servicio si viene como string
    let tiposFromDb: any = undefined
    try {
      if (barbershopData.tipos_servicio) {
        tiposFromDb = typeof barbershopData.tipos_servicio === 'string' ? JSON.parse(barbershopData.tipos_servicio) : barbershopData.tipos_servicio
      }
    } catch (e) {
      console.error('Error parsing tipos_servicio in getBarbershopConfig:', e, barbershopData.tipos_servicio)
      tiposFromDb = undefined
    }

    // Derivar duraciones desde tipos_servicio cuando sea posible
    const corteTipo = tiposFromDb && Array.isArray(tiposFromDb) ? tiposFromDb.find((s: any) => s.key === 'corte') : undefined
    const corteBarbaTipo = tiposFromDb && Array.isArray(tiposFromDb) ? tiposFromDb.find((s: any) => s.key === 'corte_barba') : undefined

    const config = {
      hora_apertura: normalizeTimeValue(barbershopData.hora_apertura, defaultConfig.hora_apertura),
      hora_cierre: normalizeTimeValue(barbershopData.hora_cierre, defaultConfig.hora_cierre),
      hora_almuerzo_inicio: normalizeTimeValue(barbershopData.hora_almuerzo_inicio, defaultConfig.hora_almuerzo_inicio),
      hora_almuerzo_fin: normalizeTimeValue(barbershopData.hora_almuerzo_fin, defaultConfig.hora_almuerzo_fin),
      almuerzo_activo: barbershopData.almuerzo_activo ?? defaultConfig.almuerzo_activo,
      dias_laborales: barbershopData.dias_laborales || defaultConfig.dias_laborales,
      duracion_cita: (corteTipo && corteTipo.duracion) || barbershopData.duracion_cita || defaultConfig.duracion_cita,
      duracion_corte_barba: (corteBarbaTipo && corteBarbaTipo.duracion) || barbershopData.duracion_corte_barba || defaultConfig.duracion_corte_barba,
      precio_corte_adulto: barbershopData.precio_corte_adulto || defaultConfig.precio_corte_adulto,
      precio_corte_nino: barbershopData.precio_corte_nino || defaultConfig.precio_corte_nino,
      precio_barba: barbershopData.precio_barba || defaultConfig.precio_barba,
      precio_combo: barbershopData.precio_combo || defaultConfig.precio_combo,
      whatsapp_activo: barbershopData.whatsapp_activo ?? defaultConfig.whatsapp_activo,
      whatsapp_numero: barbershopData.whatsapp_numero || defaultConfig.whatsapp_numero,
      tiempo_cancelacion: barbershopData.tiempo_cancelacion || defaultConfig.tiempo_cancelacion
      ,
      tipos_servicio: tiposFromDb || defaultServiceTypes
    }

    // Configuración final cargada (log eliminado en producción)
    return config
  } catch (error) {
    console.error('Error al cargar configuración:', error)
    return defaultConfig
  }
}

export function generateTimeSlots(config: BarbershopConfig): string[] {
  const slots: string[] = []
  
  // generateTimeSlots recibió configuración (log eliminado en producción)
  
  try {
    const startTime = parse(config.hora_apertura, 'HH:mm', new Date())
    const endTime = parse(config.hora_cierre, 'HH:mm', new Date())
    // Usar granularidad mínima de 15 minutos para permitir servicios con diferente duración
    const step = 15

    // Parsear horarios de almuerzo si están activos
    let lunchStart: Date | null = null
    let lunchEnd: Date | null = null
    
    // Valores de almuerzo recibidos (log eliminado en producción)
    
    if (config.almuerzo_activo && config.hora_almuerzo_inicio && config.hora_almuerzo_fin) {
      try {
        // Validar que los valores de tiempo sean strings válidos
        const inicioStr = String(config.hora_almuerzo_inicio).trim()
        const finStr = String(config.hora_almuerzo_fin).trim()
        
        // Strings de tiempo verificados (log eliminado en producción)
        
        // Validar formato básico HH:mm o HH:mm:ss
        const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/
        if (!timeRegex.test(inicioStr) || !timeRegex.test(finStr)) {
          throw new Error(`Formato de tiempo inválido: inicio="${inicioStr}", fin="${finStr}"`)
        }
        
        lunchStart = parse(inicioStr, 'HH:mm', new Date())
        lunchEnd = parse(finStr, 'HH:mm', new Date())
        
        // Verificar que el parseo fue exitoso
        if (isNaN(lunchStart.getTime()) || isNaN(lunchEnd.getTime())) {
          throw new Error(`Fechas inválidas después del parseo: inicio=${lunchStart}, fin=${lunchEnd}`)
        }
        
        // Horario de almuerzo activo y válido (log eliminado en producción)
      } catch (error) {
        console.error('🚨 Error al parsear horarios de almuerzo:', error)
        // Desactivando almuerzo por error en el parseo (log eliminado)
        lunchStart = null
        lunchEnd = null
      }
    } else {
      // Horario de almuerzo desactivado o campos faltantes (log eliminado)
    }

    let currentTime = startTime

    while (isBefore(currentTime, endTime) || currentTime.getTime() === endTime.getTime()) {
      const timeString = format(currentTime, 'HH:mm')
      
      // Verificar si el slot actual está dentro del horario de almuerzo
      let isLunchTime = false
      if (lunchStart && lunchEnd) {
        // Un slot está en horario de almuerzo si está >= hora_inicio Y < hora_fin
        // Usamos >= para incluir la hora exacta de inicio del almuerzo
        // Usamos < para excluir la hora exacta de fin del almuerzo (para que puedan agendar justo cuando termina)
        isLunchTime = (currentTime.getTime() >= lunchStart.getTime()) && 
                     (currentTime.getTime() < lunchEnd.getTime())
        
        // Debug detallado para este slot específico
        // Slot en horario de almuerzo (log eliminado)
      }
      
      // Solo agregar el slot si NO está en horario de almuerzo
        if (!isLunchTime) {
          slots.push(timeString)
        } else {
          // slot excluido por almuerzo (log eliminado)
        }
      
      currentTime = addMinutes(currentTime, step)
    }
  } catch (error) {
    console.error('Error al generar slots de tiempo:', error)
    // Slots por defecto si hay error (sin horario de almuerzo para seguridad)
    return ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
            '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30']
  }

  // Slots finales generados (log eliminado en producción)
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

export function getServiceDuration(serviceType: string, config: BarbershopConfig): number {
  try {
    const found = config.tipos_servicio.find(s => s.key === serviceType)
    if (found) return found.duracion
  } catch (e) {
    // fallthrough
  }
  return serviceType === 'corte_barba' ? config.duracion_corte_barba : config.duracion_cita
}

export function getServicePrice(serviceType: string, config: BarbershopConfig): number {
  try {
    const found = config.tipos_servicio.find(s => s.key === serviceType)
    if (found) return found.precio
  } catch (e) {
    // fallthrough
  }
  return serviceType === 'corte_barba' ? config.precio_combo : config.precio_corte_adulto
}

export function getTimeSlotEnd(startTime: string, durationMinutes: number): string {
  try {
    const startDate = parse(startTime, 'HH:mm', new Date())
    const endDate = addMinutes(startDate, durationMinutes)
    return format(endDate, 'HH:mm')
  } catch (error) {
    console.error('Error al calcular hora final:', error)
    return startTime
  }
}

export function doTimeSlotsOverlap(
  start1: string, 
  duration1: number, 
  start2: string, 
  duration2: number
): boolean {
  try {
    const startTime1 = parse(start1, 'HH:mm', new Date())
    const endTime1 = addMinutes(startTime1, duration1)
    const startTime2 = parse(start2, 'HH:mm', new Date())
    const endTime2 = addMinutes(startTime2, duration2)

    // Verificar si hay solapamiento
    return (
      (isAfter(startTime1, startTime2) && isBefore(startTime1, endTime2)) ||
      (isAfter(startTime2, startTime1) && isBefore(startTime2, endTime1)) ||
      startTime1.getTime() === startTime2.getTime()
    )
  } catch (error) {
    console.error('Error al verificar solapamiento:', error)
    return true // Por seguridad, asumir que hay conflicto si hay error
  }
}
