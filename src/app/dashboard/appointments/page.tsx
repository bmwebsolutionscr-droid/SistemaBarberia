'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Navigation from '@/components/Navigation'
import type { AppointmentWithClient, Client, Barber, Barbershop } from '@/types/supabase'
import { getBarbershopConfig, generateTimeSlots, isDateAvailable, getDayNameFromDate } from '@/lib/barbershop-config'
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
  AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface AppointmentFormData {
  id?: string
  clientName: string
  clientPhone: string
  fecha: string
  hora: string
  barberId: string
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
      await loadBarbers(barbershop.id)
      
      // Cargar citas de todos los barberos
      await loadAppointments(barbershop.id)
      
      // Cargar clientes
      await loadClients(barbershop.id)
      
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
    if (!validateForm()) {
      return
    }
    
    setLoading(true)

    try {
      // Primero, buscar o crear el cliente
      let clientId = ''
      const existingClient = clients.find(c => 
        c.telefono === formData.clientPhone || c.nombre.toLowerCase() === formData.clientName.toLowerCase()
      )

      if (existingClient) {
        clientId = existingClient.id
        // Actualizar información del cliente si es necesario
        if (existingClient.nombre !== formData.clientName || existingClient.telefono !== formData.clientPhone) {
          await supabase
            .from('clients')
            .update({
              nombre: formData.clientName,
              telefono: formData.clientPhone
            })
            .eq('id', clientId)
        }
      } else {
        // Crear nuevo cliente
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            barbershop_id: currentBarbershop.id,
            nombre: formData.clientName,
            telefono: formData.clientPhone
          })
          .select()
          .single()

        if (clientError) throw clientError
        clientId = newClient.id
      }

      // Crear o actualizar la cita
      if (editingAppointment) {
        const { error } = await supabase
          .from('appointments')
          .update({
            client_id: clientId,
            barber_id: formData.barberId,
            fecha: formData.fecha,
            hora: formData.hora,
            estado: formData.estado,
            notas: formData.notas
          })
          .eq('id', editingAppointment)

        if (error) throw error
        toast.success('Cita actualizada exitosamente')
      } else {
        const { error } = await supabase
          .from('appointments')
          .insert({
            barbershop_id: currentBarbershop.id,
            client_id: clientId,
            barber_id: formData.barberId,
            fecha: formData.fecha,
            hora: formData.hora,
            estado: formData.estado,
            notas: formData.notas
          })

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

  // Obtener horas disponibles según la configuración
  const getAvailableTimeSlots = (): string[] => {
    if (!config) return []
    return generateTimeSlots(config)
  }

  // Validar el formulario antes de enviar
  const validateForm = (): boolean => {
    if (!formData.clientName.trim()) {
      toast.error('El nombre del cliente es requerido')
      return false
    }

    if (!formData.clientPhone.trim()) {
      toast.error('El teléfono del cliente es requerido')
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

    return true
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Citas</h1>
            <p className="text-gray-600">Administra las citas de {currentBarbershop?.nombre}</p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
            className="btn-primary flex items-center"
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

        {/* Appointments Table */}
        <div className="card">
          <div className="overflow-x-auto">
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
            
            {filteredAppointments.length === 0 && (
              <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm ? 'No se encontraron citas' : 'No hay citas programadas'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingAppointment ? 'Editar Cita' : 'Nueva Cita'}
                </h3>
                
                {/* Información de horarios */}
                {config && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Información de Horarios</h4>
                    <div className="text-xs text-blue-700 space-y-1">
                      <p><strong>Horario:</strong> {config.hora_apertura} - {config.hora_cierre}</p>
                      <p><strong>Días laborales:</strong> {config.dias_laborales.join(', ')}</p>
                      <p><strong>Duración por cita:</strong> {config.duracion_cita} minutos</p>
                    </div>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Cliente *
                    </label>
                    <input
                      type="text"
                      value={formData.clientName}
                      onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono del Cliente
                    </label>
                    <input
                      type="tel"
                      value={formData.clientPhone}
                      onChange={(e) => setFormData({...formData, clientPhone: e.target.value})}
                      className="input-field"
                      placeholder="+506 8888-1234"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Barbero *
                    </label>
                    <select
                      value={formData.barberId}
                      onChange={(e) => setFormData({...formData, barberId: e.target.value})}
                      className="input-field"
                      required
                    >
                      <option value="">Seleccionar barbero</option>
                      {barbers.map(barber => (
                        <option key={barber.id} value={barber.id}>{barber.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha *
                      </label>
                      <input
                        type="date"
                        value={formData.fecha}
                        onChange={(e) => setFormData({...formData, fecha: e.target.value, hora: ''})}
                        className="input-field"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hora *
                      </label>
                      <select
                        value={formData.hora}
                        onChange={(e) => setFormData({...formData, hora: e.target.value})}
                        className="input-field"
                        required
                        disabled={!formData.fecha || !isValidAppointmentDate(formData.fecha)}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado
                    </label>
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData({...formData, estado: e.target.value as any})}
                      className="input-field"
                    >
                      <option value="programada">Programada</option>
                      <option value="confirmada">Confirmada</option>
                      <option value="completada">Completada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notas
                    </label>
                    <textarea
                      value={formData.notas}
                      onChange={(e) => setFormData({...formData, notas: e.target.value})}
                      className="input-field"
                      rows={3}
                      placeholder="Notas adicionales sobre la cita..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="btn-secondary"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary disabled:opacity-50"
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
