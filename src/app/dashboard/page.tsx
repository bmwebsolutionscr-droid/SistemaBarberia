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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bienvenido a {currentBarbershop?.nombre}
          </h1>
          <p className="text-gray-600">
            Resumen del estado actual de tu barbería
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Citas Hoy</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todayAppointments}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Citas Mañana</p>
                <p className="text-2xl font-bold text-gray-900">{stats.tomorrowAppointments}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Clientes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Citas Este Mes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.monthlyAppointments}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Scissors className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Barberos Activos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeBarbers}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Barberos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalBarbers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Próximas Citas */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Próximas Citas</h3>
            <div className="space-y-3">
              {appointments.slice(0, 5).map((appointment) => (
                <div key={appointment.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {appointment.clients.nombre}
                    </p>
                    <p className="text-sm text-gray-500">
                      {appointment.barbers?.nombre || 'Sin barbero asignado'}
                    </p>
                    <div className="flex items-center text-xs text-gray-400">
                      <Calendar className="w-3 h-3 mr-1" />
                      {format(parseISO(appointment.fecha), 'dd MMM', { locale: es })} {appointment.hora}
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.estado)}`}>
                    {getStatusText(appointment.estado)}
                  </span>
                </div>
              ))}
              {appointments.length === 0 && (
                <div className="text-center py-6">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No hay citas programadas</p>
                </div>
              )}
            </div>
          </div>

          {/* Equipo de Barberos */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Equipo de Barberos</h3>
            <div className="space-y-3">
              {barbers.slice(0, 5).map((barber) => (
                <div key={barber.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <Scissors className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {barber.nombre}
                    </p>
                    {barber.especialidad && (
                      <p className="text-sm text-gray-500">
                        {barber.especialidad}
                      </p>
                    )}
                    {barber.telefono && (
                      <div className="flex items-center text-xs text-gray-400">
                        <Phone className="w-3 h-3 mr-1" />
                        {barber.telefono}
                      </div>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    barber.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {barber.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              ))}
              {barbers.length === 0 && (
                <div className="text-center py-6">
                  <Scissors className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No hay barberos registrados</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Acciones Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/dashboard/appointments"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Calendar className="w-8 h-8 text-primary-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Nueva Cita</p>
                <p className="text-sm text-gray-500">Agendar nueva cita</p>
              </div>
            </a>
            
            <a
              href="/dashboard/barbers"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Scissors className="w-8 h-8 text-primary-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Gestión Barberos</p>
                <p className="text-sm text-gray-500">Administrar equipo</p>
              </div>
            </a>
            
            <a
              href="/dashboard/reports"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <TrendingUp className="w-8 h-8 text-primary-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Ver Reportes</p>
                <p className="text-sm text-gray-500">Estadísticas y análisis</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </Navigation>
  )
}
