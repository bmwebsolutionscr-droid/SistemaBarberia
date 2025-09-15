'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Navigation from '@/components/Navigation'
import type { AppointmentWithClient, Barber, Barbershop } from '@/types/supabase'
import { getBarbershopConfig, BarbershopConfig, generateTimeSlots, isDateAvailable, getServiceDuration } from '@/lib/barbershop-config'
import { 
  BarChart3, 
  Calendar, 
  Download, 
  TrendingUp, 
  Users, 
  MessageCircle, 
  Clock,
  ChevronDown,
  DollarSign,
  RefreshCw
} from 'lucide-react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, addDays, isToday, isPast, parse, addMinutes } from 'date-fns'
import { es } from 'date-fns/locale'

interface AvailableSlot {
  date: string
  time: string
  weekday: string
  isToday: boolean
  isPastTime: boolean
}

interface WhatsAppStats {
  weeklyMessages: number
  weeklyAppointments: number
  weeklyConfirmations: number
  weeklyReminders: number
  weeklyAppointmentRate: number
  conversions: { date: string; messages: number; appointments: number }[]
}

export default function Reports() {
  const [appointments, setAppointments] = useState<AppointmentWithClient[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null)
  const [barbershopConfig, setBarbershopConfig] = useState<BarbershopConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('week')
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [whatsappStats, setWhatsappStats] = useState<WhatsAppStats>({
    weeklyMessages: 0,
    weeklyAppointments: 0,
    weeklyConfirmations: 0,
    weeklyReminders: 0,
    weeklyAppointmentRate: 0,
    conversions: []
  })
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)
  const [whatsAppDays, setWhatsAppDays] = useState('7')
  const [selectedBarber, setSelectedBarber] = useState('')
  const [whatsAppMessage, setWhatsAppMessage] = useState('')
  const [isGeneratingWhatsApp, setIsGeneratingWhatsApp] = useState(false)

  // Cargar configuración de la barbería
  useEffect(() => {
    const loadBarbershopConfig = async () => {
      const config = await getBarbershopConfig()
      setBarbershopConfig(config)
    }
    loadBarbershopConfig()
  }, [])

  // Función para generar todos los slots ocupados por una cita
  const getOccupiedSlots = (appointment: any): string[] => {
    if (!barbershopConfig) return []
    
    let startTime = appointment.hora
    const duracion = appointment.duracion_minutos || getServiceDuration(appointment.tipo_servicio, barbershopConfig)
    const slots: string[] = []
    
    // Normalizar formato de hora - remover segundos si existen
    if (startTime.includes(':') && startTime.split(':').length === 3) {
      // Si viene como "11:00:00", convertir a "11:00"
      startTime = startTime.substring(0, 5)
    }
    
    // Generar slots cada 15 minutos
    let currentTime = parse(startTime, 'HH:mm', new Date())
    const endTime = addMinutes(currentTime, duracion)
    
    while (currentTime < endTime) {
      slots.push(format(currentTime, 'HH:mm'))
      currentTime = addMinutes(currentTime, 15)
    }
    
    return slots
  }

  // Función para obtener todos los slots ocupados en una fecha específica
  const getOccupiedSlotsForDate = (date: string): Set<string> => {
    const occupiedSlots = new Set<string>()
    
    appointments.forEach(appointment => {
      if (appointment.fecha === date && appointment.estado !== 'cancelada') {
        const slots = getOccupiedSlots(appointment)
        slots.forEach(slot => occupiedSlots.add(slot))
      }
    })
    
    return occupiedSlots
  }

  const getAvailableSlots = useCallback((): AvailableSlot[] => {
    if (!barbershopConfig) return []
    
    const slots: AvailableSlot[] = []
    const startDate = addDays(new Date(), 1) // Empezar desde mañana
    const endDate = addWeeks(startDate, 2) // Próximas 2 semanas
    
    // Usar horarios de la configuración
    const timeSlots = generateTimeSlots(barbershopConfig)

    eachDayOfInterval({ start: startDate, end: endDate }).forEach(date => {
      // Solo días laborables según la configuración de la barbería
      if (isDateAvailable(date, barbershopConfig)) {
        const dayName = format(date, 'EEEE', { locale: es })
        const dateStr = format(date, 'yyyy-MM-dd')
        const occupiedSlotsForDate = getOccupiedSlotsForDate(dateStr)
        
        timeSlots.forEach((time: string) => {
          // Solo agregar el slot si no está ocupado
          if (!occupiedSlotsForDate.has(time)) {
            slots.push({
              date: dateStr,
              time,
              weekday: dayName,
              isToday: isToday(date),
              isPastTime: isPast(new Date(`${dateStr} ${time}`))
            })
          }
        })
      }
    })

    return slots.filter(slot => !slot.isPastTime)
  }, [barbershopConfig, appointments])

  // Obtener datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Obtener citas
        const { data: appointmentsData } = await supabase
          .from('appointments')
          .select(`
            *,
            clients(*),
            barbers(*)
          `)
          .order('fecha', { ascending: false })
          .limit(100)

        // Obtener configuración de barbería
        const { data: barbershopData, error: barbershopError } = await supabase
          .from('barbershops')
          .select('*')
          .single()

        console.log('Barbershop query result:', { barbershopData, barbershopError })

        // Solo proceder si tenemos una barbería
        let activeBarbersForShop: any[] = []
        if (barbershopData) {
          // Obtener barberos de esta barbería
          const { data: barbersData, error: barbersError } = await supabase
            .from('barbers')
            .select('*')
            .eq('barbershop_id', barbershopData.id)
            .eq('activo', true)
            .order('nombre')

          console.log('Barberos query result:', { barbersData, barbersError })
          activeBarbersForShop = barbersData || []
        }

        // Debug: Verificar si la consulta a barbershops funciona
        const { data: allBarbershopsDebug } = await supabase
          .from('barbershops')
          .select('*')
        console.log('All barbershops:', allBarbershopsDebug)

        // Debug: Verificar si la consulta a barbers funciona  
        const { data: allBarbersDebug } = await supabase
          .from('barbers')
          .select('*')
        console.log('All barbers:', allBarbersDebug)

        if (appointmentsData) setAppointments(appointmentsData)
        if (activeBarbersForShop) setBarbers(activeBarbersForShop)
        if (barbershopData) setBarbershop(barbershopData)

        // Simulamos datos de WhatsApp (en una implementación real, estos vendrían de la API de WhatsApp)
        setWhatsappStats({
          weeklyMessages: 45,
          weeklyAppointments: 23,
          weeklyConfirmations: 18,
          weeklyReminders: 12,
          weeklyAppointmentRate: 51.1,
          conversions: [
            { date: '2024-01-15', messages: 8, appointments: 4 },
            { date: '2024-01-16', messages: 12, appointments: 6 },
            { date: '2024-01-17', messages: 6, appointments: 3 },
            { date: '2024-01-18', messages: 10, appointments: 5 },
            { date: '2024-01-19', messages: 9, appointments: 5 },
          ]
        })
      } catch (error) {
        console.error('Error cargando datos:', error)
      } finally {
        setLoading(false)
      }
    }

    if (barbershopConfig) {
      fetchData()
    }
  }, [barbershopConfig])

  // Efecto para actualizar slots disponibles cuando cambien las citas o la configuración
  useEffect(() => {
    if (barbershopConfig && appointments.length >= 0) {
      setAvailableSlots(getAvailableSlots())
    }
  }, [barbershopConfig, appointments])

  // Calcular estadísticas del período seleccionado
  const getPeriodDates = () => {
    const now = new Date()
    switch (selectedPeriod) {
      case 'week':
        return {
          start: startOfWeek(now, { locale: es }),
          end: endOfWeek(now, { locale: es })
        }
      case 'month':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0)
        }
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3)
        return {
          start: new Date(now.getFullYear(), quarter * 3, 1),
          end: new Date(now.getFullYear(), (quarter + 1) * 3, 0)
        }
      default:
        return {
          start: startOfWeek(now, { locale: es }),
          end: endOfWeek(now, { locale: es })
        }
    }
  }

  const { start: periodStart, end: periodEnd } = getPeriodDates()

  // Filtrar citas del período
  const periodAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.fecha)
    return aptDate >= periodStart && aptDate <= periodEnd
  })

  // Calcular estadísticas
  const stats = {
    totalAppointments: periodAppointments.length,
    completedAppointments: periodAppointments.filter(apt => apt.estado === 'completada').length,
    cancelledAppointments: periodAppointments.filter(apt => apt.estado === 'cancelada').length,
    totalRevenue: periodAppointments
      .filter(apt => apt.estado === 'completada')
      .reduce((sum, apt) => sum + (apt.precio || 0), 0),
    averagePerDay: periodAppointments.length / Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)),
    topBarber: barbers.reduce((top, barber) => {
      const barberAppointments = periodAppointments.filter(apt => apt.barber_id === barber.id)
      return barberAppointments.length > (top?.count || 0) 
        ? { ...barber, count: barberAppointments.length }
        : top
    }, null as any)
  }

  const generateReport = async () => {
    setIsGeneratingReport(true)
    
    // Simular generación de reporte
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // En una implementación real, aquí se generaría un PDF o Excel
    const reportData = {
      period: selectedPeriod,
      dates: { start: periodStart, end: periodEnd },
      stats,
      appointments: periodAppointments,
      whatsappStats,
      availableSlots
    }
    
    console.log('Reporte generado:', reportData)
    
    // Simular descarga
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-${selectedPeriod}-${format(new Date(), 'yyyy-MM-dd')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    setIsGeneratingReport(false)
  }

  const generateWhatsAppMessage = async () => {
    if (!barbershopConfig) return

    setIsGeneratingWhatsApp(true)
    const days = parseInt(whatsAppDays)
    const selectedBarberData = barbers.find(b => b.id === selectedBarber)
    
    const startDate = addDays(new Date(), 1) // Empezar desde mañana
    const endDate = addDays(startDate, days - 1) // Días seleccionados
    
    try {
      // Obtener citas confirmadas/programadas en el rango de fechas
      let appointmentsQuery = supabase
        .from('appointments')
        .select('fecha, hora, barber_id, estado, duracion_minutos, tipo_servicio')
        .gte('fecha', format(startDate, 'yyyy-MM-dd'))
        .lte('fecha', format(endDate, 'yyyy-MM-dd'))
        .in('estado', ['confirmada', 'programada']) // Solo citas confirmadas o programadas

      // Si se seleccionó un barbero específico, filtrar por ese barbero
      if (selectedBarber) {
        appointmentsQuery = appointmentsQuery.eq('barber_id', selectedBarber)
      }

      const { data: existingAppointments, error } = await appointmentsQuery

      if (error) {
        console.error('Error al obtener citas:', error)
        setWhatsAppMessage('Error al verificar disponibilidad. Intenta nuevamente.')
        return
      }



      // Crear un Set de slots ocupados considerando la duración completa de cada cita
      const occupiedSlots = new Set<string>()
      
      ;(existingAppointments || []).forEach(apt => {
        // Asegurar formato consistente de fecha (YYYY-MM-DD)
        let normalizedDate = apt.fecha
        if (apt.fecha.includes('/')) {
          // Si viene en formato DD/MM/YYYY, convertir a YYYY-MM-DD
          const parts = apt.fecha.split('/')
          if (parts.length === 3) {
            normalizedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
          }
        }
        
        // Obtener todos los slots ocupados por esta cita (considerando su duración)
        const appointmentSlots = getOccupiedSlots(apt)
        
        appointmentSlots.forEach(slot => {
          const slotKey = `${normalizedDate}_${slot}_${apt.barber_id}`
          occupiedSlots.add(slotKey)
        })
      })
      
      // Generar slots disponibles
      const timeSlots = generateTimeSlots(barbershopConfig)
      const availableSlots: { date: Date; time: string; dayName: string }[] = []

      eachDayOfInterval({ start: startDate, end: endDate }).forEach(date => {
        if (isDateAvailable(date, barbershopConfig)) {
          const dayName = format(date, 'EEEE', { locale: es })
          const dateKey = format(date, 'yyyy-MM-dd')
          
          timeSlots.forEach((time: string) => {
            const slotDateTime = new Date(`${dateKey} ${time}`)
            if (!isPast(slotDateTime)) {
              // Verificar si el slot está ocupado
              let isSlotAvailable = true
              
              if (selectedBarber) {
                // Si hay un barbero específico seleccionado
                const slotKey = `${dateKey}_${time}_${selectedBarber}`
                isSlotAvailable = !occupiedSlots.has(slotKey)
                

              } else {
                // Si no hay barbero específico, verificar disponibilidad con cualquier barbero
                // El slot está disponible si al menos un barbero está libre
                const barberosDisponibles = barbers.filter(barber => {
                  const slotKey = `${dateKey}_${time}_${barber.id}`
                  const disponible = !occupiedSlots.has(slotKey)
                  
                  // Debug para fecha problemática
                  if (dateKey === '2025-09-15' && (time === '11:00' || time === '11:30' || time === '12:00' || time === '12:30')) {
                    console.log(`   Barbero ${barber.nombre} (${barber.id}): ${disponible ? 'LIBRE' : 'OCUPADO'} - slot: ${slotKey}`)
                  }
                  
                  return disponible
                })
                
                isSlotAvailable = barberosDisponibles.length > 0
                
                // Debug final para fecha problemática
                if (dateKey === '2025-09-15' && (time === '11:00' || time === '11:30' || time === '12:00' || time === '12:30')) {
                  console.log(`   RESULTADO FINAL para ${time}: ${isSlotAvailable ? 'DISPONIBLE' : 'OCUPADO'} (${barberosDisponibles.length} barberos libres)`)
                }
              }
              
              if (isSlotAvailable) {
                availableSlots.push({
                  date,
                  time,
                  dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1)
                })
              }
            }
          })
        }
      })

      console.log(`Slots disponibles encontrados: ${availableSlots.length}`)

      // Agrupar por día
      const slotsByDay = availableSlots.reduce((acc, slot) => {
        const dateKey = format(slot.date, 'yyyy-MM-dd')
        if (!acc[dateKey]) {
          acc[dateKey] = {
            date: slot.date,
            dayName: slot.dayName,
            times: []
          }
        }
        acc[dateKey].times.push(slot.time)
        return acc
      }, {} as Record<string, { date: Date; dayName: string; times: string[] }>)

      // Generar mensaje
      let message = `🪒 *${barbershop?.nombre || 'Barbería'}* 🪒\n\n`
      message += `📅 *DISPONIBILIDAD PRÓXIMOS ${days} DÍAS*\n\n`
      
      if (selectedBarberData) {
        message += `👨‍💼 Barbero: *${selectedBarberData.nombre}*\n`
        if (selectedBarberData.especialidad) {
          message += `🎯 Especialidad: ${selectedBarberData.especialidad}\n`
        }
        message += `\n`
      }

      const sortedDays = Object.values(slotsByDay).sort((a, b) => a.date.getTime() - b.date.getTime())

      if (sortedDays.length === 0) {
        message += `❌ No hay disponibilidad en los próximos ${days} días.\n\n`
        message += `📞 Contáctanos para coordinar una cita en fechas posteriores.`
      } else {
        sortedDays.forEach((day, index) => {
          message += `📆 *${day.dayName} ${format(day.date, 'dd/MM')}*\n`
          message += `🕒 ${day.times.join(' | ')}\n`
          if (index < sortedDays.length - 1) message += `\n`
        })

        message += `\n\n💬 *Para agendar tu cita:*\n`
        message += `Responde con:\n`
        message += `"CITA [DÍA] [HORA]"\n`
        message += `Ejemplo: "CITA Lunes 09:00"\n\n`
        message += `📍 ${barbershop?.direccion || 'Dirección disponible al agendar'}\n`
        
        if ((barbershop as any)?.whatsapp_numero) {
          message += `📱 WhatsApp: ${(barbershop as any).whatsapp_numero}\n`
        }
      }

      setWhatsAppMessage(message)
      
    } catch (error) {
      console.error('Error al generar mensaje de WhatsApp:', error)
      setWhatsAppMessage('Error al generar mensaje. Intenta nuevamente.')
    } finally {
      setIsGeneratingWhatsApp(false)
    }
  }

  const copyWhatsAppMessage = () => {
    navigator.clipboard.writeText(whatsAppMessage)
    // Aquí podrías agregar una notificación de éxito
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <RefreshCw className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Cargando reportes...</p>
            </div>
          </div>
        </Navigation>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation>
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reportes y Análisis</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
                Análisis detallado del rendimiento de {barbershop?.nombre || 'la barbería'}
              </p>
            </div>
            
            {/* Selector de período y acciones */}
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:gap-4">
              <div className="relative">
                <button
                  onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                  className="w-full sm:w-auto flex items-center justify-between sm:justify-center gap-2 bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {selectedPeriod === 'week' && 'Esta semana'}
                      {selectedPeriod === 'month' && 'Este mes'}
                      {selectedPeriod === 'quarter' && 'Este trimestre'}
                    </span>
                    <span className="sm:hidden">
                      {selectedPeriod === 'week' && 'Semana'}
                      {selectedPeriod === 'month' && 'Mes'}
                      {selectedPeriod === 'quarter' && 'Trimestre'}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </button>
                
                {showPeriodDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                    <div className="py-1">
                      {[
                        { value: 'week', label: 'Esta semana' },
                        { value: 'month', label: 'Este mes' },
                        { value: 'quarter', label: 'Este trimestre' }
                      ].map(period => (
                        <button
                          key={period.value}
                          onClick={() => {
                            setSelectedPeriod(period.value)
                            setShowPeriodDropdown(false)
                          }}
                          className={`block w-full text-left px-4 py-2 text-sm ${
                            selectedPeriod === period.value 
                              ? 'bg-blue-50 text-blue-600' 
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {period.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:gap-3">
                <button
                  onClick={() => setShowWhatsAppModal(true)}
                  className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">WhatsApp</span>
                  <span className="sm:hidden">Mensaje WhatsApp</span>
                </button>
                
                <button
                  onClick={generateReport}
                  disabled={isGeneratingReport}
                  className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isGeneratingReport ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">
                    {isGeneratingReport ? 'Generando...' : 'Exportar'}
                  </span>
                  <span className="sm:hidden">
                    {isGeneratingReport ? 'Generando...' : 'Exportar Reporte'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1 min-w-0">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Citas Totales
                  </dt>
                  <dd className="text-base sm:text-lg font-medium text-gray-900">
                    {stats.totalAppointments}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1 min-w-0">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Completadas
                  </dt>
                  <dd className="text-base sm:text-lg font-medium text-gray-900">
                    {stats.completedAppointments}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1 min-w-0">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Ingresos
                  </dt>
                  <dd className="text-base sm:text-lg font-medium text-gray-900">
                    ₡{stats.totalRevenue.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1 min-w-0">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Promedio/Día
                  </dt>
                  <dd className="text-base sm:text-lg font-medium text-gray-900">
                    {stats.averagePerDay.toFixed(1)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-8">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              Estadísticas WhatsApp
            </h3>
            
            <div className="space-y-3 sm:space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-gray-600">Mensajes recibidos</span>
                <span className="font-medium text-sm sm:text-base">{whatsappStats.weeklyMessages}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-gray-600">Citas por WhatsApp</span>
                <span className="font-medium text-sm sm:text-base">{whatsappStats.weeklyAppointments}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-gray-600">Confirmaciones</span>
                <span className="font-medium text-sm sm:text-base">{whatsappStats.weeklyConfirmations}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-gray-600">Recordatorios</span>
                <span className="font-medium text-sm sm:text-base">{whatsappStats.weeklyReminders}</span>
              </div>
              
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm font-medium text-gray-900">Tasa de conversión</span>
                  <span className="text-base sm:text-lg font-bold text-green-600">{whatsappStats.weeklyAppointmentRate}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Disponibilidad de citas */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              <span className="hidden sm:inline">Disponibilidad (próximas 2 semanas)</span>
              <span className="sm:hidden">Disponibilidad</span>
            </h3>
            
            <div className="space-y-3">
              <div className="text-xs sm:text-sm text-gray-600 mb-3">
                Slots disponibles: <span className="font-medium text-gray-900">{availableSlots.length}</span>
              </div>
              
              <div className="max-h-40 overflow-y-auto">
                {availableSlots.slice(0, 10).map((slot, index) => (
                  <div key={`${slot.date}-${slot.time}`} 
                       className="flex justify-between items-center py-1 text-xs sm:text-sm">
                    <span className="text-gray-600 truncate">
                      {format(new Date(slot.date), 'dd MMM', { locale: es })} - {slot.weekday}
                    </span>
                    <span className="font-medium ml-2 flex-shrink-0">{slot.time}</span>
                  </div>
                ))}
              </div>
              
              {availableSlots.length > 10 && (
                <p className="text-xs text-gray-500 text-center pt-2 border-t">
                  Y {availableSlots.length - 10} slots más...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Top Barber */}
        {stats.topBarber && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-8">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
              <span className="hidden sm:inline">Barbero Destacado del Período</span>
              <span className="sm:hidden">Barbero Destacado</span>
            </h3>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="min-w-0 flex-1">
                <h4 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{stats.topBarber.nombre}</h4>
                <p className="text-sm sm:text-base text-gray-600">{stats.topBarber.count} citas completadas</p>
                {stats.topBarber.especialidad && (
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
                    Especialidad: {stats.topBarber.especialidad}
                  </p>
                )}
              </div>
              <div className="text-left sm:text-right flex-shrink-0">
                <div className="text-xl sm:text-2xl font-bold text-indigo-600">
                  {((stats.topBarber.count / stats.completedAppointments) * 100).toFixed(1)}%
                </div>
                <div className="text-xs sm:text-sm text-gray-500">del total</div>
              </div>
            </div>
          </div>
        )}

        {/* Citas recientes */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">
              Citas del Período Seleccionado
            </h3>
          </div>
          
          {/* Versión móvil - Cards */}
          <div className="block sm:hidden">
            {periodAppointments.slice(0, 10).map((appointment) => {
              const barber = barbers.find(b => b.id === appointment.barber_id)
              return (
                <div key={appointment.id} className="border-b border-gray-200 p-4 last:border-b-0">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {appointment.clients?.nombre || 'Cliente no especificado'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(`${appointment.fecha} ${appointment.hora}`), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        appointment.estado === 'completada' 
                          ? 'bg-green-100 text-green-800'
                          : appointment.estado === 'cancelada'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {appointment.estado === 'completada' && 'Completada'}
                        {appointment.estado === 'cancelada' && 'Cancelada'}
                        {appointment.estado === 'confirmada' && 'Confirmada'}
                        {appointment.estado === 'programada' && 'Programada'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-gray-500">
                        Barbero: {barber?.nombre || 'No asignado'}
                      </p>
                      <p className="text-xs text-gray-900 font-medium">
                        {appointment.precio ? `₡${appointment.precio.toLocaleString()}` : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {periodAppointments.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No hay citas en el período seleccionado
              </div>
            )}
          </div>
          
          {/* Versión desktop - Tabla */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha y Hora
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Barbero
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {periodAppointments.slice(0, 10).map((appointment) => {
                  const barber = barbers.find(b => b.id === appointment.barber_id)
                  return (
                    <tr key={appointment.id}>
                      <td className="px-4 lg:px-6 py-4 text-sm font-medium text-gray-900">
                        <div className="max-w-xs truncate">
                          {appointment.clients?.nombre || 'Cliente no especificado'}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(`${appointment.fecha} ${appointment.hora}`), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-gray-500">
                        <div className="max-w-xs truncate">
                          {barber?.nombre || 'No asignado'}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          appointment.estado === 'completada' 
                            ? 'bg-green-100 text-green-800'
                            : appointment.estado === 'cancelada'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {appointment.estado === 'completada' && 'Completada'}
                          {appointment.estado === 'cancelada' && 'Cancelada'}
                          {appointment.estado === 'confirmada' && 'Confirmada'}
                          {appointment.estado === 'programada' && 'Programada'}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {appointment.precio ? `₡${appointment.precio.toLocaleString()}` : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            
            {periodAppointments.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No hay citas en el período seleccionado
              </div>
            )}
          </div>
        </div>

        {/* Modal WhatsApp */}
        {showWhatsAppModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  <span className="hidden sm:inline">Generar Mensaje WhatsApp</span>
                  <span className="sm:hidden">WhatsApp</span>
                </h3>
                <button
                  onClick={() => setShowWhatsAppModal(false)}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 mb-4 sm:mb-6">
                {/* Debug info */}
                <div className="bg-gray-100 p-2 sm:p-3 rounded text-xs">
                  <strong>Debug Info:</strong><br/>
                  Barberos cargados: {barbers.length}<br/>
                  Barbería: {barbershop?.nombre || 'No cargada'}<br/>
                  Config disponible: {barbershopConfig ? 'Sí' : 'No'}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Días a futuro
                  </label>
                  <select
                    value={whatsAppDays}
                    onChange={(e) => setWhatsAppDays(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="7">7 días</option>
                    <option value="15">15 días</option>
                    <option value="30">30 días</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Barbero (opcional)
                  </label>
                  <select
                    value={selectedBarber}
                    onChange={(e) => setSelectedBarber(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Todos los barberos</option>
                    {barbers.length === 0 ? (
                      <option value="" disabled>No hay barberos disponibles</option>
                    ) : (
                      barbers.map(barber => (
                        <option key={barber.id} value={barber.id}>
                          {barber.nombre}
                          {barber.especialidad && ` - ${barber.especialidad}`}
                        </option>
                      ))
                    )}
                  </select>
                  {barbers.length === 0 && (
                    <p className="text-xs sm:text-sm text-yellow-600 mt-1">
                      ⚠️ No se encontraron barberos activos. Verifica la configuración de la base de datos.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
                <button
                  onClick={generateWhatsAppMessage}
                  disabled={isGeneratingWhatsApp}
                  className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <RefreshCw className={`h-4 w-4 ${isGeneratingWhatsApp ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">
                    {isGeneratingWhatsApp ? 'Verificando disponibilidad...' : 'Generar Mensaje'}
                  </span>
                  <span className="sm:hidden">
                    {isGeneratingWhatsApp ? 'Verificando...' : 'Generar'}
                  </span>
                </button>
                
                {whatsAppMessage && (
                  <button
                    onClick={copyWhatsAppMessage}
                    className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                  >
                    <Download className="h-4 w-4" />
                    Copiar
                  </button>
                )}
              </div>

              {whatsAppMessage && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mensaje generado:
                  </label>
                  <textarea
                    value={whatsAppMessage}
                    readOnly
                    className="w-full h-48 sm:h-64 border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 font-mono text-xs sm:text-sm resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Este mensaje está listo para copiar y enviar por WhatsApp
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Navigation>
    </div>
  )
}
