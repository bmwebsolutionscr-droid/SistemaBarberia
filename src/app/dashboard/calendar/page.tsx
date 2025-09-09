'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Navigation from '@/components/Navigation'
import type { AppointmentWithClient, Barber } from '@/types/supabase'
import { getBarbershopConfig, isDateAvailable, getDayNameFromDate, getServiceDuration, formatPrice } from '@/lib/barbershop-config'
import type { BarbershopConfig } from '@/lib/barbershop-config'
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  User,
  Phone,
  X,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  startOfWeek, 
  endOfWeek,
  isSameMonth,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
  parseISO
} from 'date-fns'
import { es } from 'date-fns/locale'

interface CalendarDay {
  date: Date
  appointments: AppointmentWithClient[]
  isCurrentMonth: boolean
  isToday: boolean
  isWorkingDay: boolean
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<AppointmentWithClient[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [config, setConfig] = useState<BarbershopConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)
  const [showDayModal, setShowDayModal] = useState(false)

  // Cargar datos
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        // Cargar configuración de barbería
        const barbershopConfig = await getBarbershopConfig()
        setConfig(barbershopConfig)

        // Obtener rango del mes actual
        const monthStart = startOfMonth(currentDate)
        const monthEnd = endOfMonth(currentDate)
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Lunes como primer día
        const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

        // Obtener citas del rango visible
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            *,
            clients(*),
            barbers(*)
          `)
          .gte('fecha', format(calendarStart, 'yyyy-MM-dd'))
          .lte('fecha', format(calendarEnd, 'yyyy-MM-dd'))
          .order('fecha')
          .order('hora')

        if (appointmentsError) {
          console.error('Error al cargar citas:', appointmentsError)
        }

        // Obtener barberos
        const { data: barbersData, error: barbersError } = await supabase
          .from('barbers')
          .select('*')
          .eq('activo', true)
          .order('nombre')

        if (barbersError) {
          console.error('Error al cargar barberos:', barbersError)
        }

        setAppointments(appointmentsData || [])
        setBarbers(barbersData || [])
      } catch (error) {
        console.error('Error al cargar datos:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [currentDate])

  // Generar días del calendario
  const generateCalendarDays = (): CalendarDay[] => {
    if (!config) return []
    
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    return days.map(date => {
      const dayAppointments = appointments.filter(apt => 
        isSameDay(parseISO(apt.fecha), date)
      )

      const isWorkingDay = isDateAvailable(date, config)

      return {
        date,
        appointments: dayAppointments,
        isCurrentMonth: isSameMonth(date, currentDate),
        isToday: isToday(date),
        isWorkingDay
      }
    })
  }

  const calendarDays = generateCalendarDays()

  // Navegación del calendario
  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Abrir modal de día
  const handleDayClick = (day: CalendarDay) => {
    if (day.isWorkingDay && (day.appointments.length > 0 || day.isCurrentMonth)) {
      setSelectedDay(day)
      setShowDayModal(true)
    }
  }

  // Cerrar modal
  const closeModal = () => {
    setShowDayModal(false)
    setSelectedDay(null)
  }

  // Obtener color según estado de cita
  const getAppointmentStatusColor = (status: string) => {
    switch (status) {
      case 'confirmada':
        return 'bg-green-500 text-white'
      case 'programada':
        return 'bg-blue-500 text-white'
      case 'cancelada':
        return 'bg-red-500 text-white'
      case 'completada':
        return 'bg-gray-500 text-white'
      default:
        return 'bg-gray-300 text-gray-700'
    }
  }

  // Obtener ícono según estado
  const getAppointmentStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmada':
        return <CheckCircle className="h-4 w-4" />
      case 'programada':
        return <AlertCircle className="h-4 w-4" />
      case 'cancelada':
        return <XCircle className="h-4 w-4" />
      case 'completada':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando calendario...</p>
            </div>
          </div>
        </Navigation>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation>
        <div className="p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header del calendario */}
            <div className="bg-white rounded-lg shadow mb-6 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <CalendarIcon className="h-8 w-8 text-blue-600" />
                    Calendario de Citas
                  </h1>
                  <button
                    onClick={goToToday}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Hoy
                  </button>
                </div>
                
                <div className="flex items-center gap-4">
                  <button
                    onClick={goToPreviousMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  
                  <h2 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">
                    {format(currentDate, 'MMMM yyyy', { locale: es })}
                  </h2>
                  
                  <button
                    onClick={goToNextMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Leyenda de estados */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Confirmada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Programada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Cancelada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                  <span>Completada</span>
                </div>
              </div>
            </div>

            {/* Calendario */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {/* Cabecera de días de la semana */}
              <div className="grid grid-cols-7 bg-gray-50">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                  <div key={day} className="p-3 text-center font-medium text-gray-700">
                    {day}
                  </div>
                ))}
              </div>

              {/* Días del calendario */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={`
                      min-h-[120px] p-2 border-r border-b border-gray-200 transition-colors
                      ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
                      ${day.isToday ? 'bg-blue-50 border-blue-200' : ''}
                      ${!day.isWorkingDay ? 'bg-gray-100 opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}
                    `}
                    onClick={() => handleDayClick(day)}
                  >
                    <div className={`
                      text-sm font-medium mb-1
                      ${day.isToday ? 'text-blue-600' : 
                        !day.isWorkingDay ? 'text-gray-400 line-through' : 
                        day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                    `}>
                      {format(day.date, 'd')}
                    </div>
                    
                    {/* Indicadores de citas */}
                    <div className="space-y-1">
                      {day.appointments.slice(0, 3).map((appointment, idx) => (
                        <div
                          key={appointment.id}
                          className={`
                            text-xs px-2 py-1 rounded truncate
                            ${getAppointmentStatusColor(appointment.estado)}
                          `}
                          title={`${appointment.hora} - ${appointment.clients?.nombre}`}
                        >
                          {appointment.hora} {appointment.clients?.nombre}
                        </div>
                      ))}
                      
                      {day.appointments.length > 3 && (
                        <div className="text-xs text-gray-500 px-2">
                          +{day.appointments.length - 3} más
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal de día */}
        {showDayModal && selectedDay && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              {/* Header del modal */}
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  Citas del {format(selectedDay.date, 'EEEE, d \'de\' MMMM \'de\' yyyy', { locale: es })}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Contenido del modal */}
              <div className="p-6">
                {selectedDay.appointments.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No hay citas programadas para este día</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedDay.appointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`
                                px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2
                                ${getAppointmentStatusColor(appointment.estado)}
                              `}>
                                {getAppointmentStatusIcon(appointment.estado)}
                                {appointment.estado.charAt(0).toUpperCase() + appointment.estado.slice(1)}
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <Clock className="h-4 w-4" />
                                {appointment.hora}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <div className="flex items-center gap-2 text-gray-900 mb-1">
                                  <User className="h-4 w-4" />
                                  <strong>Cliente:</strong> {appointment.clients?.nombre}
                                </div>
                                {appointment.clients?.telefono && (
                                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                                    <Phone className="h-4 w-4" />
                                    {appointment.clients.telefono}
                                  </div>
                                )}
                              </div>
                              
                              <div>
                                <div className="text-gray-900 mb-1">
                                  <strong>Barbero:</strong> {appointment.barbers?.nombre}
                                </div>
                                <div className="text-gray-900 mb-1">
                                  <strong>Servicio:</strong> {
                                    appointment.tipo_servicio === 'corte' ? 'Corte' : 
                                    appointment.tipo_servicio === 'corte_barba' ? 'Corte + Barba' : 
                                    'No especificado'
                                  }
                                </div>
                                <div className="text-gray-600 text-sm mb-1">
                                  <strong>Duración:</strong> {
                                    config ? 
                                    `${getServiceDuration(appointment.tipo_servicio || 'corte', config)} minutos` : 
                                    'No disponible'
                                  }
                                </div>
                                {appointment.precio && (
                                  <div className="text-gray-600 text-sm">
                                    <strong>Precio:</strong> ₡{appointment.precio.toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {appointment.notas && (
                              <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                                <strong>Notas:</strong> {appointment.notas}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Navigation>
    </div>
  )
}
