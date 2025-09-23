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

    // Debug: Verificar si los campos de almuerzo existen
    console.log('🍽️ Debug - Campos de almuerzo en BD:', {
      hora_almuerzo_inicio: barbershopData.hora_almuerzo_inicio,
      hora_almuerzo_fin: barbershopData.hora_almuerzo_fin,
      almuerzo_activo: barbershopData.almuerzo_activo,
      tipos: {
        hora_almuerzo_inicio: typeof barbershopData.hora_almuerzo_inicio,
        hora_almuerzo_fin: typeof barbershopData.hora_almuerzo_fin,
        almuerzo_activo: typeof barbershopData.almuerzo_activo
      },
      exists: {
        hora_almuerzo_inicio: 'hora_almuerzo_inicio' in barbershopData,
        hora_almuerzo_fin: 'hora_almuerzo_fin' in barbershopData,
        almuerzo_activo: 'almuerzo_activo' in barbershopData
      }
    })

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

    const config = {
      hora_apertura: normalizeTimeValue(barbershopData.hora_apertura, defaultConfig.hora_apertura),
      hora_cierre: normalizeTimeValue(barbershopData.hora_cierre, defaultConfig.hora_cierre),
      hora_almuerzo_inicio: normalizeTimeValue(barbershopData.hora_almuerzo_inicio, defaultConfig.hora_almuerzo_inicio),
      hora_almuerzo_fin: normalizeTimeValue(barbershopData.hora_almuerzo_fin, defaultConfig.hora_almuerzo_fin),
      almuerzo_activo: barbershopData.almuerzo_activo ?? defaultConfig.almuerzo_activo,
      dias_laborales: barbershopData.dias_laborales || defaultConfig.dias_laborales,
      duracion_cita: barbershopData.duracion_cita || defaultConfig.duracion_cita,
      duracion_corte_barba: barbershopData.duracion_corte_barba || defaultConfig.duracion_corte_barba,
      precio_corte_adulto: barbershopData.precio_corte_adulto || defaultConfig.precio_corte_adulto,
      precio_corte_nino: barbershopData.precio_corte_nino || defaultConfig.precio_corte_nino,
      precio_barba: barbershopData.precio_barba || defaultConfig.precio_barba,
      precio_combo: barbershopData.precio_combo || defaultConfig.precio_combo,
      whatsapp_activo: barbershopData.whatsapp_activo ?? defaultConfig.whatsapp_activo,
      whatsapp_numero: barbershopData.whatsapp_numero || defaultConfig.whatsapp_numero,
      tiempo_cancelacion: barbershopData.tiempo_cancelacion || defaultConfig.tiempo_cancelacion
    }

    console.log('🍽️ Debug - Configuración final cargada:', config)
    return config
  } catch (error) {
    console.error('Error al cargar configuración:', error)
    return defaultConfig
  }
}

export function generateTimeSlots(config: BarbershopConfig): string[] {
  const slots: string[] = []
  
  // Debug: Log de la configuración recibida
  console.log('🍽️ Debug - generateTimeSlots recibió configuración:', {
    almuerzo_activo: config.almuerzo_activo,
    hora_almuerzo_inicio: config.hora_almuerzo_inicio,
    hora_almuerzo_fin: config.hora_almuerzo_fin,
    hora_apertura: config.hora_apertura,
    hora_cierre: config.hora_cierre
  })
  
  try {
    const startTime = parse(config.hora_apertura, 'HH:mm', new Date())
    const endTime = parse(config.hora_cierre, 'HH:mm', new Date())
    const duration = config.duracion_cita

    // Parsear horarios de almuerzo si están activos
    let lunchStart: Date | null = null
    let lunchEnd: Date | null = null
    
    console.log('🍽️ Debug - Valores de almuerzo recibidos:', {
      almuerzo_activo: config.almuerzo_activo,
      hora_almuerzo_inicio: config.hora_almuerzo_inicio,
      hora_almuerzo_fin: config.hora_almuerzo_fin,
      tipo_inicio: typeof config.hora_almuerzo_inicio,
      tipo_fin: typeof config.hora_almuerzo_fin
    })
    
    if (config.almuerzo_activo && config.hora_almuerzo_inicio && config.hora_almuerzo_fin) {
      try {
        // Validar que los valores de tiempo sean strings válidos
        const inicioStr = String(config.hora_almuerzo_inicio).trim()
        const finStr = String(config.hora_almuerzo_fin).trim()
        
        console.log('🍽️ Debug - Strings de tiempo:', { inicioStr, finStr })
        
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
        
        console.log('🍽️ Debug - Horario de almuerzo ACTIVO y válido:', {
          lunchStart: format(lunchStart, 'HH:mm'),
          lunchEnd: format(lunchEnd, 'HH:mm')
        })
      } catch (error) {
        console.error('🚨 Error al parsear horarios de almuerzo:', error)
        console.log('🔧 Desactivando almuerzo por error en el parseo')
        lunchStart = null
        lunchEnd = null
      }
    } else {
      console.log('🍽️ Debug - Horario de almuerzo DESACTIVADO o campos faltantes')
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
        if (isLunchTime) {
          console.log(`🍽️ Debug - Slot ${timeString} está en horario de almuerzo (${config.hora_almuerzo_inicio} - ${config.hora_almuerzo_fin})`)
        }
      }
      
      // Solo agregar el slot si NO está en horario de almuerzo
      if (!isLunchTime) {
        slots.push(timeString)
        console.log(`✅ Debug - Slot ${timeString} INCLUIDO (disponible)`)
      } else {
        console.log(`❌ Debug - Slot ${timeString} EXCLUIDO por horario de almuerzo`)
      }
      
      currentTime = addMinutes(currentTime, duration)
    }
  } catch (error) {
    console.error('Error al generar slots de tiempo:', error)
    // Slots por defecto si hay error (sin horario de almuerzo para seguridad)
    return ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
            '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30']
  }

  console.log('🍽️ Debug - Slots finales generados:', slots)
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

export function getServiceDuration(serviceType: 'corte' | 'corte_barba', config: BarbershopConfig): number {
  return serviceType === 'corte_barba' ? config.duracion_corte_barba : config.duracion_cita
}

export function getServicePrice(serviceType: 'corte' | 'corte_barba', config: BarbershopConfig): number {
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
