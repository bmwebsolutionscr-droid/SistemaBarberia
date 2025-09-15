'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Navigation from '@/components/Navigation'
import type { Appointment, AppointmentWithClient, Barber, Barbershop } from '@/types/supabase'
import { Calendar, Clock, Users, TrendingUp, Scissors, Award, Phone } from 'lucide-react'
import { format, isToday, isTomorrow, parseISO, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

export default function DashboardPage() {
  const [appointments, setAppointments] = useState<AppointmentWithClient[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [currentBarbershop, setCurrentBarbershop] = useState<Barbershop | null>(null)
  const [stats, setStats] = useState({
    todayAppointments: 0,
    tomorrowAppointments: 0,
    totalClients: 0,
    monthlyAppointments: 0,
    totalBarbers: 0,
    activeBarbers: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !user.email) return

      // Obtener información de la barbería
      const { data: barbershop } = await supabase
        .from('barbershops')
        .select('*')
        .eq('email', user.email)
        .single()

      if (!barbershop) return
      setCurrentBarbershop(barbershop)

      // Cargar barberos
      const { data: barbersData } = await supabase
        .from('barbers')
        .select('*')
        .eq('barbershop_id', barbershop.id)
        .order('nombre')

      if (barbersData) {
        setBarbers(barbersData)
      }

      // Obtener IDs de todos los barberos
      const barberIds = barbersData?.map(b => b.id) || []

      // Obtener citas recientes con información del cliente y barbero
      const today = new Date().toISOString().split('T')[0]
      const { data: recentAppointments } = await supabase
        .from('appointments')
        .select(`
          *,
          clients (*),
          barbers (*)
        `)
        .in('barber_id', barberIds)
        .gte('fecha', today)
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true })
        .limit(10)

      if (recentAppointments) {
        setAppointments(recentAppointments as AppointmentWithClient[])
      }

      // Calcular estadísticas
      await calculateStats(barbershop.id, barberIds)

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = async (barbershopId: string, barberIds: string[]) => {
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const monthStart = startOfMonth(new Date()).toISOString().split('T')[0]
    const monthEnd = endOfMonth(new Date()).toISOString().split('T')[0]

    // Citas de hoy
    const { count: todayCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .in('barber_id', barberIds)
      .eq('fecha', today)
      .neq('estado', 'cancelada')

    // Citas de mañana
    const { count: tomorrowCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .in('barber_id', barberIds)
      .eq('fecha', tomorrow)
      .neq('estado', 'cancelada')

    // Citas del mes
    const { count: monthlyCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .in('barber_id', barberIds)
      .gte('fecha', monthStart)
      .lte('fecha', monthEnd)

    // Clientes únicos
    const { data: clientsData } = await supabase
      .from('clients')
      .select('id')
      .eq('barbershop_id', barbershopId)

    setStats({
      todayAppointments: todayCount || 0,
      tomorrowAppointments: tomorrowCount || 0,
      totalClients: clientsData?.length || 0,
      monthlyAppointments: monthlyCount || 0,
      totalBarbers: barbers.length,
      activeBarbers: barbers.filter(b => b.activo).length
    })
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
        <div className="text-center lg:text-left">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Bienvenido a {currentBarbershop?.nombre}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Resumen del estado actual de tu barbería
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="card p-4 sm:p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Citas Hoy</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.todayAppointments}</p>
              </div>
            </div>
          </div>

          <div className="card p-4 sm:p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Citas Mañana</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.tomorrowAppointments}</p>
              </div>
            </div>
          </div>

          <div className="card p-4 sm:p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Clientes</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalClients}</p>
              </div>
            </div>
          </div>

          <div className="card p-4 sm:p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Citas Este Mes</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.monthlyAppointments}</p>
              </div>
            </div>
          </div>

          <div className="card p-4 sm:p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Scissors className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Barberos Activos</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.activeBarbers}</p>
              </div>
            </div>
          </div>

          <div className="card p-4 sm:p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Award className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Barberos</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalBarbers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Próximas Citas */}
          <div className="card p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Próximas Citas</h3>
            <div className="space-y-2 sm:space-y-3">
              {appointments.slice(0, 5).map((appointment) => (
                <div key={appointment.id} className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                      {appointment.clients.nombre}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">
                      {appointment.barbers?.nombre || 'Sin barbero asignado'}
                    </p>
                    <div className="flex items-center text-xs text-gray-400">
                      <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">
                        {format(parseISO(appointment.fecha), 'dd MMM', { locale: es })} {appointment.hora}
                      </span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(appointment.estado)}`}>
                    <span className="hidden sm:inline">{getStatusText(appointment.estado)}</span>
                    <span className="sm:hidden">•</span>
                  </span>
                </div>
              ))}
              {appointments.length === 0 && (
                <div className="text-center py-6">
                  <Calendar className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm sm:text-base text-gray-500">No hay citas programadas</p>
                </div>
              )}
            </div>
          </div>

          {/* Equipo de Barberos */}
          <div className="card p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Equipo de Barberos</h3>
            <div className="space-y-2 sm:space-y-3">
              {barbers.slice(0, 5).map((barber) => (
                <div key={barber.id} className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Scissors className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                      {barber.nombre}
                    </p>
                    {barber.especialidad && (
                      <p className="text-xs sm:text-sm text-gray-500 truncate">
                        {barber.especialidad}
                      </p>
                    )}
                    {barber.telefono && (
                      <div className="flex items-center text-xs text-gray-400">
                        <Phone className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{barber.telefono}</span>
                      </div>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                    barber.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    <span className="hidden sm:inline">{barber.activo ? 'Activo' : 'Inactivo'}</span>
                    <span className="sm:hidden">{barber.activo ? '✓' : '✗'}</span>
                  </span>
                </div>
              ))}
              {barbers.length === 0 && (
                <div className="text-center py-6">
                  <Scissors className="w-8 h-8 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm sm:text-base text-gray-500">No hay barberos registrados</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Acciones Rápidas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <a
              href="/dashboard/appointments"
              className="flex items-center p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600 mr-2 sm:mr-3 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-base font-medium text-gray-900">Nueva Cita</p>
                <p className="text-xs sm:text-sm text-gray-500">Agendar nueva cita</p>
              </div>
            </a>
            
            <a
              href="/dashboard/barbers"
              className="flex items-center p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Scissors className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600 mr-2 sm:mr-3 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-base font-medium text-gray-900">Gestión Barberos</p>
                <p className="text-xs sm:text-sm text-gray-500">Administrar equipo</p>
              </div>
            </a>
            
            <a
              href="/dashboard/reports"
              className="flex items-center p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600 mr-2 sm:mr-3 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-base font-medium text-gray-900">Ver Reportes</p>
                <p className="text-xs sm:text-sm text-gray-500">Estadísticas y análisis</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </Navigation>
  )
}
