'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Navigation from '@/components/Navigation'
import type { AppointmentWithClient, Client, Barber, Barbershop } from '@/types/supabase'
import { getBarbershopConfig, generateTimeSlots, isDateAvailable, getDayNameFromDate, getServiceDuration, doTimeSlotsOverlap, formatPrice } from '@/lib/barbershop-config'
import type { BarbershopConfig } from '@/lib/barbershop-config'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Calendar as CalendarIcon,
  Phone,
  User,
  ChevronDown,
  AlertCircle,
  Clock
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format, parseISO, parse, addMinutes } from 'date-fns'
import { es } from 'date-fns/locale'

interface AppointmentFormData {
  id?: string
  clientName: string
  clientPhone: string
  fecha: string
  hora: string
  barberId: string
  tipo_servicio: string
  estado: 'programada' | 'confirmada' | 'cancelada' | 'completada'
  notas?: string
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentWithClient[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [currentBarbershop, setCurrentBarbershop] = useState<Barbershop | null>(null)
  const [config, setConfig] = useState<BarbershopConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBarber, setSelectedBarber] = useState<string>('')
  
  const [formData, setFormData] = useState<AppointmentFormData>({
    clientName: '',
    clientPhone: '',
    fecha: '',
    hora: '',
    barberId: '',
    tipo_servicio: 'corte',
    estado: 'programada',
    notas: ''
  })

  useEffect(() => {
    loadData()
  }, [])



  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !user.email) return

      // Cargar configuración de barbería
      const barbershopConfig = await getBarbershopConfig()
      setConfig(barbershopConfig)

      // Obtener información de la barbería
      const { data: barbershop } = await supabase
        .from('barbershops')
        .select('*')
        .eq('email', user.email)
        .single()

      if (!barbershop) return
      setCurrentBarbershop(barbershop)

      // Cargar barberos
      await loadBarbers((barbershop as any).id)
      
      // Cargar citas de todos los barberos
      await loadAppointments((barbershop as any).id)
      
      // Cargar clientes
      await loadClients((barbershop as any).id)
      
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const loadBarbers = async (barbershopId: string) => {
    const { data, error } = await supabase
      .from('barbers')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('activo', true)
      .order('nombre')

    if (error) {
      console.error('Error loading barbers:', error)
      return
    }

    setBarbers(data)
    if (data.length > 0 && !selectedBarber) {
      setSelectedBarber('all')
    }
  }

  const loadAppointments = async (barbershopId: string, barberId?: string) => {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        clients (*),
        barbers (*)
      `)

    // Filtrar por barbero si se especifica
    if (barberId && barberId !== 'all') {
      query = query.eq('barber_id', barberId)
    } else {
      // Filtrar por barberos de la barbería
      const barberIds = barbers.map(b => b.id)
      if (barberIds.length > 0) {
        query = query.in('barber_id', barberIds)
      }
    }

    const { data, error } = await query
      .order('fecha', { ascending: false })
      .order('hora', { ascending: true })

    if (error) {
      console.error('Error loading appointments:', error)
      return
    }

    setAppointments(data as AppointmentWithClient[])
  }

  const loadClients = async (barbershopId: string) => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('nombre')

    if (error) {
      console.error('Error loading clients:', error)
      return
    }

    setClients(data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentBarbershop) return
    
    // Validar el formulario primero
    const isValid = await validateForm()
    if (!isValid) {
      return
    }
    
    setLoading(true)

    try {
      // Primero, buscar o crear el cliente
      let clientId = ''
      const existingClient = clients.find(c => {
        // Buscar por nombre exacto Y información compatible
        const nameMatches = c.nombre.toLowerCase() === formData.clientName.toLowerCase()
        
        // Si no hay teléfono en el formulario, usar cualquier cliente con el mismo nombre
        if (!formData.clientPhone.trim()) {
          return nameMatches
        }
        
        // Si hay teléfono en el formulario, debe coincidir con el teléfono existente
        // o el cliente existente debe no tener teléfono
        const phoneMatches = c.telefono === formData.clientPhone.trim() || !c.telefono
        
        return nameMatches && phoneMatches
      })

      if (existingClient) {
        clientId = existingClient.id
        // NO actualizamos la información del cliente existente para preservar la información histórica
        // Si el usuario quiere actualizar la información del cliente, debe hacerlo manualmente
        // desde la sección de gestión de clientes
      } else {
        // Crear nuevo cliente
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            barbershop_id: currentBarbershop.id,
            nombre: formData.clientName,
            telefono: formData.clientPhone.trim() || null
          } as any)
          .select()
          .single()

        if (clientError) throw clientError
        clientId = (newClient as any).id
      }

      // Crear o actualizar la cita
      if (editingAppointment) {
        const serviceDuration = config ? getServiceDuration(formData.tipo_servicio, config) : 30
        // Validar si se está reactivando una cita cancelada y el horario ya está ocupado
        const citaOriginal = appointments.find(a => a.id === editingAppointment)
        const reactivandoCancelada = citaOriginal && citaOriginal.estado === 'cancelada' && (formData.estado === 'programada' || formData.estado === 'confirmada')
        if (reactivandoCancelada) {
          // Verificar si el horario está ocupado por otra cita
          const conflicto = appointments.some(a =>
            a.id !== editingAppointment &&
            a.barber_id === formData.barberId &&
            a.fecha === formData.fecha &&
            a.hora === formData.hora &&
            a.estado !== 'cancelada'
          )
          if (conflicto) {
            toast.error('Lo siento, esta cita estaba cancelada y ya no está disponible este horario.')
            setLoading(false)
            return
          }
        }
        const { error } = await (supabase
          .from('appointments') as any)
          .update({
            client_id: clientId,
            barber_id: formData.barberId,
            fecha: formData.fecha,
            hora: formData.hora,
            tipo_servicio: formData.tipo_servicio,
            duracion_minutos: serviceDuration,
            estado: formData.estado,
            notas: formData.notas
          })
          .eq('id', editingAppointment)

        if (error) throw error
        toast.success('Cita actualizada exitosamente')
      } else {
        const serviceDuration = config ? getServiceDuration(formData.tipo_servicio, config) : 30
        const { error } = await supabase
          .from('appointments')
          .insert({
            barbershop_id: currentBarbershop.id,
            client_id: clientId,
            barber_id: formData.barberId,
            fecha: formData.fecha,
            hora: formData.hora,
            tipo_servicio: formData.tipo_servicio,
            duracion_minutos: serviceDuration,
            estado: formData.estado,
            notas: formData.notas
          } as any)

        if (error) throw error
        toast.success('Cita agendada exitosamente')
      }

      // Recargar datos
      await loadAppointments(currentBarbershop.id, selectedBarber)
      await loadClients(currentBarbershop.id)
      resetForm()
      setShowModal(false)

    } catch (error) {
      console.error('Error saving appointment:', error)
      toast.error('Error al guardar la cita')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (appointment: AppointmentWithClient) => {
    setEditingAppointment(appointment.id)
    setFormData({
      clientName: appointment.clients.nombre,
      clientPhone: appointment.clients.telefono || '',
      fecha: appointment.fecha,
      hora: appointment.hora,
      barberId: appointment.barber_id,
      tipo_servicio: (appointment as any).tipo_servicio || 'corte',
      estado: appointment.estado,
      notas: appointment.notas || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (appointmentId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta cita?')) return

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId)

      if (error) throw error

      toast.success('Cita eliminada exitosamente')
      if (currentBarbershop) {
        await loadAppointments(currentBarbershop.id, selectedBarber)
      }
    } catch (error) {
      console.error('Error deleting appointment:', error)
      toast.error('Error al eliminar la cita')
    }
  }

  const resetForm = () => {
    setFormData({
      clientName: '',
      clientPhone: '',
      fecha: '',
      hora: '',
      barberId: barbers.length > 0 ? barbers[0].id : '',
      tipo_servicio: 'corte',
      estado: 'programada',
      notas: ''
    })
    setEditingAppointment(null)
  }

  // Validar si una fecha es válida para agendar
  const isValidAppointmentDate = (dateString: string): boolean => {
    if (!config || !dateString) return false
    
    try {
      const selectedDate = parseISO(dateString)
      return isDateAvailable(selectedDate, config)
    } catch (error) {
      return false
    }
  }

  // Función para generar todos los slots ocupados por una cita
  const getOccupiedSlots = (appointment: AppointmentWithClient): string[] => {
    if (!config) return []
    
    const startTime = appointment.hora
    const duracion = appointment.duracion_minutos || getServiceDuration(appointment.tipo_servicio, config)
    const slots: string[] = []
    
    // Limpiar la hora - remover segundos si existen
    const cleanTime = startTime.substring(0, 5) // '09:00:00' -> '09:00'
    
    // Generar slots cada 15 minutos
    let currentTime = parse(cleanTime, 'HH:mm', new Date())
    const endTime = addMinutes(currentTime, duracion)
    
    while (currentTime < endTime) {
      const slotTime = format(currentTime, 'HH:mm')
      slots.push(slotTime)
      currentTime = addMinutes(currentTime, 15)
    }
    
    return slots
  }

  // Función para obtener todos los slots ocupados en una fecha específica para un barbero específico
  const getOccupiedSlotsForDate = (date: string): Set<string> => {
    const occupiedSlots = new Set<string>()
    
    appointments.forEach(appointment => {
      if (appointment.fecha === date && 
          appointment.barber_id === formData.barberId && // Solo conflictos con el mismo barbero
          appointment.estado !== 'cancelada' && 
          appointment.id !== editingAppointment) { // Excluir la cita que se está editando
        const slots = getOccupiedSlots(appointment)
        slots.forEach(slot => occupiedSlots.add(slot))
      }
    })
    
    return occupiedSlots
  }

  // Obtener horas disponibles según la configuración
  const getAvailableTimeSlots = (): string[] => {
    if (!config || !formData.fecha || !formData.barberId) return []
    
    const allSlots = generateTimeSlots(config)
    const occupiedSlots = getOccupiedSlotsForDate(formData.fecha)
    
    // Filtrar slots ocupados considerando la duración del servicio (sub-slots de 15min)
    const serviceDuration = getServiceDuration(formData.tipo_servicio, config)

    const availableSlots = allSlots.filter(slot => {
      // Mantener la hora original cuando estamos editando (permitir seleccionar la hora actual)
      if (editingAppointment && formData.hora === slot) {
        return true
      }

      // Para cada slot candidato, generar sus sub-slots de 15 minutos según la duración
      // y verificar que ninguno esté en los occupiedSlots
      try {
        const start = parse(slot, 'HH:mm', new Date())
        const end = addMinutes(start, serviceDuration)
        let cur = start
        while (cur < end) {
          const sub = format(cur, 'HH:mm')
          if (occupiedSlots.has(sub)) return false
          cur = addMinutes(cur, 15)
        }
      } catch (e) {
        // En caso de error al parsear, descartar el slot por seguridad
        return false
      }

      return true
    })

    // Asegurar que la hora actual esté incluida si estamos editando
    if (editingAppointment && formData.hora && !availableSlots.includes(formData.hora)) {
      availableSlots.push(formData.hora)
      availableSlots.sort()
    }

    return availableSlots
  }

  // Validar el formulario antes de enviar
  const validateForm = async (): Promise<boolean> => {
    if (!formData.clientName.trim()) {
      toast.error('El nombre del cliente es requerido')
      return false
    }

    // El teléfono ya no es obligatorio
    // Solo validar formato si se proporciona
    if (formData.clientPhone.trim() && !/^\+?[\d\s\-()]+$/.test(formData.clientPhone.trim())) {
      toast.error('Por favor ingresa un número de teléfono válido')
      return false
    }

    if (!formData.fecha) {
      toast.error('La fecha es requerida')
      return false
    }

    if (!isValidAppointmentDate(formData.fecha)) {
      const selectedDate = parseISO(formData.fecha)
      const dayName = getDayNameFromDate(selectedDate)
      toast.error(`No se puede agendar citas el día ${dayName}. Días laborales: ${config?.dias_laborales.join(', ')}`)
      return false
    }

    if (!formData.hora) {
      toast.error('La hora es requerida')
      return false
    }

    const availableSlots = getAvailableTimeSlots()
    if (!availableSlots.includes(formData.hora)) {
      toast.error(`La hora seleccionada no está disponible. Horarios disponibles: ${config?.hora_apertura} - ${config?.hora_cierre}`)
      return false
    }

    if (!formData.barberId) {
      toast.error('El barbero es requerido')
      return false
    }

    // Verificar conflictos de horario
    if (config) {
      const serviceDuration = getServiceDuration(formData.tipo_servicio, config)
      const hasConflict = await checkTimeSlotConflicts(
        formData.fecha, 
        formData.hora, 
        serviceDuration, 
        formData.barberId,
        editingAppointment || undefined
      )

      if (hasConflict) {
        const serviceTypeText = config?.tipos_servicio?.find(s => s.key === formData.tipo_servicio)?.label || formData.tipo_servicio
        toast.error(`Conflicto de horario: Ya hay una cita programada que se solapa con ${serviceTypeText} (${serviceDuration} min)`)
        return false
      }
    }

    return true
  }

  // Verificar conflictos de horario
  const checkTimeSlotConflicts = async (date: string, startTime: string, duration: number, barberId: string, excludeId?: string): Promise<boolean> => {
    try {
      // Obtener citas existentes para el barbero en esa fecha
      const { data: existingAppointments, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('barber_id', barberId)
        .eq('fecha', date)
        .in('estado', ['programada', 'confirmada'])

      if (error) {
        console.error('Error checking conflicts:', error)
        return true // Asumir conflicto si hay error
      }

      if (!existingAppointments) return false

      // Verificar solapamientos con citas existentes
      for (const appointment of existingAppointments) {
        if (excludeId && (appointment as any).id === excludeId) continue

        const existingDuration = (appointment as any).duracion_minutos || config?.duracion_cita || 30
        const hasOverlap = doTimeSlotsOverlap(
          startTime,
          duration,
          (appointment as any).hora,
          existingDuration
        )

        if (hasOverlap) {
          return true
        }
      }

      return false
    } catch (error) {
      console.error('Error checking time conflicts:', error)
      return true // Por seguridad, asumir conflicto
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'programada': return 'bg-blue-100 text-blue-800'
      case 'confirmada': return 'bg-green-100 text-green-800'
      case 'completada': return 'bg-gray-100 text-gray-800'
      case 'cancelada': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'programada': return 'Programada'
      case 'confirmada': return 'Confirmada'
      case 'completada': return 'Completada'
      case 'cancelada': return 'Cancelada'
      default: return status
    }
  }

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = appointment.clients.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (appointment.clients.telefono && appointment.clients.telefono.includes(searchTerm))
    
    const matchesBarber = selectedBarber === 'all' || appointment.barber_id === selectedBarber

    return matchesSearch && matchesBarber
  })

  if (loading) {
    return (
      <Navigation>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Navigation>
    )
  }

  return (
    <Navigation>
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
          <div className="text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gestión de Citas</h1>
            <p className="text-sm sm:text-base text-gray-600">Administra las citas de {currentBarbershop?.nombre}</p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
            className="btn-primary flex items-center justify-center w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Cita
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por cliente o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 input-field"
            />
          </div>

          {/* Barber Filter */}
          <div className="relative">
            <select
              value={selectedBarber}
              onChange={(e) => {
                setSelectedBarber(e.target.value)
                if (currentBarbershop) {
                  loadAppointments(currentBarbershop.id, e.target.value)
                }
              }}
              className="input-field appearance-none pr-8 min-w-[200px]"
            >
              <option value="all">Todos los barberos</option>
              {barbers.map(barber => (
                <option key={barber.id} value={barber.id}>{barber.nombre}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Appointments List */}
        <div className="card">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-3 text-left">Cliente</th>
                  <th className="px-6 py-3 text-left">Barbero</th>
                  <th className="px-6 py-3 text-left">Fecha y Hora</th>
                  <th className="px-6 py-3 text-left">Estado</th>
                  <th className="px-6 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAppointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-primary-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {appointment.clients.nombre}
                          </div>
                          {appointment.clients.telefono && (
                            <div className="text-sm text-gray-500 flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {appointment.clients.telefono}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {appointment.barbers?.nombre || 'Barbero no encontrado'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                        <div>
                          <div>{format(parseISO(appointment.fecha), 'PPP', { locale: es })}</div>
                          <div className="text-xs text-gray-500">{appointment.hora}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.estado)}`}>
                        {getStatusText(appointment.estado)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(appointment)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(appointment.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {filteredAppointments.map((appointment) => (
              <div key={appointment.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                {/* Client Info */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center flex-1">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-primary-600" />
                    </div>
                    <div className="ml-3 min-w-0 flex-1">
                      <div className="font-medium text-gray-900 truncate">
                        {appointment.clients.nombre}
                      </div>
                      {appointment.clients.telefono && (
                        <div className="text-sm text-gray-500 flex items-center mt-1">
                          <Phone className="w-4 h-4 mr-1 flex-shrink-0" />
                          <span className="truncate">{appointment.clients.telefono}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 ${getStatusColor(appointment.estado)}`}>
                    {getStatusText(appointment.estado)}
                  </span>
                </div>

                {/* Appointment Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{appointment.barbers?.nombre || 'Barbero no encontrado'}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{format(parseISO(appointment.fecha), 'PPP', { locale: es })}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{appointment.hora}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => handleEdit(appointment)}
                    className="flex-1 flex items-center justify-center px-3 py-2 text-sm bg-primary-50 text-primary-700 rounded-md hover:bg-primary-100 transition-colors"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(appointment.id)}
                    className="flex-1 flex items-center justify-center px-3 py-2 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
            
          {filteredAppointments.length === 0 && (
            <div className="text-center py-8">
              <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'No se encontraron citas' : 'No hay citas programadas'}
              </p>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-2 sm:p-4">
            <div className="relative top-4 sm:top-20 mx-auto p-4 sm:p-5 border w-full max-w-md shadow-lg rounded-md bg-white min-h-[calc(100vh-2rem)] sm:min-h-0">
              <div className="mt-2 sm:mt-3">
                <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-4 text-center sm:text-left">
                  {editingAppointment ? 'Editar Cita' : 'Nueva Cita'}
                </h3>
                
                {/* Información de horarios */}
                {config && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Información de Horarios</h4>
                    <div className="text-xs sm:text-sm text-blue-700 space-y-1">
                      <p><strong>Horario:</strong> {config.hora_apertura} - {config.hora_cierre}</p>
                      <p><strong>Días:</strong> {config.dias_laborales.join(', ')}</p>
                      <p><strong>Duración:</strong> {config.duracion_cita} min</p>
                    </div>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Cliente *
                    </label>
                    <input
                      type="text"
                      value={formData.clientName}
                      onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                      className="input-field h-12 text-base"
                      required
                      placeholder="Ingrese el nombre completo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono del Cliente (Opcional)
                    </label>
                    <input
                      type="tel"
                      value={formData.clientPhone}
                      onChange={(e) => setFormData({...formData, clientPhone: e.target.value})}
                      className="input-field h-12 text-base"
                      placeholder="+506 8888-1234 (opcional)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Opcional - para notificaciones
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Barbero *
                    </label>
                    <select
                      value={formData.barberId}
                      onChange={(e) => setFormData({...formData, barberId: e.target.value})}
                      className="input-field h-12 text-base"
                      required
                    >
                      <option value="">Seleccionar barbero</option>
                      {barbers.map(barber => (
                        <option key={barber.id} value={barber.id}>{barber.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Servicio *
                    </label>
                    <select
                      value={formData.tipo_servicio}
                      onChange={(e) => setFormData({...formData, tipo_servicio: e.target.value, hora: editingAppointment ? formData.hora : ''})}
                      className="input-field h-12 text-base"
                      required
                    >
                      {(config?.tipos_servicio || []).map(s => (
                        <option key={s.key} value={s.key}>
                          {s.label} ({s.duracion} min - {formatPrice(s.precio)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha *
                      </label>
                      <input
                        type="date"
                        value={formData.fecha}
                        onChange={(e) => setFormData({...formData, fecha: e.target.value, hora: editingAppointment ? formData.hora : ''})}
                        className="input-field h-12 text-base"
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                      {formData.fecha && !isValidAppointmentDate(formData.fecha) && (
                        <div className="flex items-center gap-1 mt-1 text-red-600 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          <span>Día no laboral según configuración</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hora *
                      </label>
                      <select
                        value={formData.hora}
                        onChange={(e) => setFormData({...formData, hora: e.target.value})}
                        className="input-field h-12 text-base"
                        required
                        disabled={!formData.fecha || !formData.barberId || !isValidAppointmentDate(formData.fecha)}
                      >
                        <option value="">Selecciona una hora</option>
                        {getAvailableTimeSlots().map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                      {config && (
                        <p className="text-xs text-gray-500 mt-1">
                          Horario: {config.hora_apertura} - {config.hora_cierre}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado
                    </label>
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData({...formData, estado: e.target.value as any})}
                      className="input-field h-12 text-base"
                    >
                      <option value="programada">Programada</option>
                      <option value="confirmada">Confirmada</option>
                      <option value="completada">Completada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notas
                    </label>
                    <textarea
                      value={formData.notas}
                      onChange={(e) => setFormData({...formData, notas: e.target.value})}
                      className="input-field text-base"
                      rows={3}
                      placeholder="Notas adicionales sobre la cita..."
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="btn-secondary w-full sm:w-auto h-12 text-base"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary disabled:opacity-50 w-full sm:w-auto h-12 text-base"
                    >
                      {loading ? 'Guardando...' : (editingAppointment ? 'Actualizar' : 'Agendar')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Navigation>
  )
}
