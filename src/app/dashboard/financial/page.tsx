'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Navigation from '@/components/Navigation'
import { 
  DollarSign, 
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  User,
  Phone
} from 'lucide-react'
import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'

interface PendingAppointment {
  id: string
  cliente_nombre: string
  cliente_telefono: string
  barbero_nombre: string
  fecha: string
  hora: string
  tipo_servicio: string
  precio: number
  estado: string
  prioridad_cobro: string
}

export default function FinancialPage() {
  const [barbershop, setBarbershop] = useState<any>(null)
  const [pendingAppointments, setPendingAppointments] = useState<PendingAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<PendingAppointment | null>(null)
  const [processingPayment, setProcessingPayment] = useState(false)

  // Estados del formulario de pago
  const [paymentData, setPaymentData] = useState({
    metodo_pago: 'efectivo',
    monto_pagado: '',
    descuento: '0',
    propina: '0',
    notas: ''
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  // Función auxiliar para crear fechas de manera segura
  const createSafeDate = (dateString: string) => {
    const fechaParts = dateString.split('-');
    return new Date(
      parseInt(fechaParts[0]), // año
      parseInt(fechaParts[1]) - 1, // mes (0-indexado)
      parseInt(fechaParts[2]) // día
    );
  }

  // Función auxiliar para calcular precio dinámico
  const calcularPrecioDinamico = (tipoServicio: string, barbershopData: any) => {
    if (!barbershopData) return 0;
    
    switch (tipoServicio) {
      case 'corte':
        return barbershopData.precio_corte_adulto || 0;
      case 'corte_barba':
        return barbershopData.precio_combo || 0;
      default:
        return barbershopData.precio_corte_adulto || 0;
    }
  }

  const loadInitialData = async () => {
    try {
      // Cargar barbería actual
      const { data: barbershopData, error: barbershopError } = await supabase
        .from('barbershops')
        .select('*')
        .single()

      if (barbershopError) throw barbershopError
      setBarbershop(barbershopData)

      // Cargar citas pendientes usando consulta directa
      await loadPendingAppointments((barbershopData as any).id, barbershopData as any)

    } catch (error) {
      console.error('Error loading initial data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPendingAppointments = async (barbershopId: string, barbershopData?: any) => {
    try {
      console.log('Loading appointments for barbershop:', barbershopId)
      
      // Consulta directa para obtener citas pendientes con precios dinámicos
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          fecha,
          hora,
          tipo_servicio,
          precio,
          estado,
          pagado,
          clients!inner(nombre, telefono),
          barbers!inner(nombre),
          barbershops!inner(precio_corte_adulto, precio_combo, precio_barba, precio_corte_nino)
        `)
        .eq('barbershop_id', barbershopId)
        .in('estado', ['programada', 'confirmada'])
        .or('pagado.is.null,pagado.eq.false')
        .gte('fecha', format(subDays(new Date(), 7), 'yyyy-MM-dd'))
        .order('fecha')
        .order('hora')

      if (error) {
        console.error('Error loading appointments:', error)
        return
      }

      console.log('Raw appointment data:', data)

      // Procesar y mapear los datos
      const processedAppointments = (data || []).map((appointment: any) => {
        // Crear fecha de manera segura para evitar problemas de zona horaria
        const appointmentDate = createSafeDate(appointment.fecha);
        
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        let prioridad_cobro = 'PRÓXIMA'
        
        if (appointmentDate < today) {
          prioridad_cobro = 'VENCIDA'
        } else if (appointmentDate.getTime() === today.getTime()) {
          prioridad_cobro = 'HOY'
        } else if (appointmentDate.getTime() === new Date(today.getTime() + 24 * 60 * 60 * 1000).getTime()) {
          prioridad_cobro = 'MAÑANA'
        } else if (appointmentDate.getTime() <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).getTime()) {
          prioridad_cobro = 'ESTA SEMANA'
        }

        // Calcular precio dinámico según el tipo de servicio
        let precio_dinamico = appointment.precio || 0; // Usar precio existente como fallback
        
        console.log('Processing appointment:', {
          id: appointment.id,
          tipo_servicio: appointment.tipo_servicio,
          precio_original: appointment.precio,
          barbershops: appointment.barbershops
        });
        
        // Intentar obtener precio de los datos de barbershop en la consulta
        if (appointment.barbershops && appointment.barbershops.length > 0) {
          const precios = appointment.barbershops[0];
          console.log('Precios disponibles desde consulta:', precios);
          precio_dinamico = calcularPrecioDinamico(appointment.tipo_servicio, precios);
          console.log('Precio dinámico desde consulta:', precio_dinamico);
        } else {
          console.log('No hay datos de barbershops en consulta, usando fallback');
          // Fallback: usar los precios de la barbería principal
          precio_dinamico = calcularPrecioDinamico(appointment.tipo_servicio, barbershopData);
          console.log('Precio dinámico desde fallback:', precio_dinamico);
        }

        return {
          id: appointment.id,
          cliente_nombre: appointment.clients?.nombre || 'Cliente',
          cliente_telefono: appointment.clients?.telefono || '',
          barbero_nombre: appointment.barbers?.nombre || 'Barbero',
          fecha: appointment.fecha,
          hora: appointment.hora,
          tipo_servicio: appointment.tipo_servicio,
          precio: precio_dinamico, // Usar precio dinámico calculado
          estado: appointment.estado,
          prioridad_cobro
        }
      })

      console.log('Processed appointments with dynamic pricing:', processedAppointments)
      setPendingAppointments(processedAppointments)

    } catch (error) {
      console.error('Error loading pending appointments:', error)
    }
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAppointment || !barbershop) return

    setProcessingPayment(true)
    try {
      // Calcular precio dinámico actualizado usando la función auxiliar
      let precio_final = selectedAppointment.precio;
      
      // Si no hay precio o queremos asegurar que esté actualizado, calcularlo
      if (!precio_final || precio_final === 0) {
        precio_final = calcularPrecioDinamico(selectedAppointment.tipo_servicio, barbershop);
      }

      // Actualizar la cita directamente
      const montoFinal = (parseFloat(paymentData.monto_pagado) || precio_final) - parseFloat(paymentData.descuento)
      
      // Usar un update más simple
      const { error: updateError } = await (supabase as any)
        .from('appointments')
        .update({
          estado: 'completada',
          pagado: true,
          precio: precio_final,
          fecha_pago: new Date().toISOString(),
          metodo_pago: paymentData.metodo_pago,
          monto_pagado: montoFinal
        })
        .eq('id', (selectedAppointment as any).id)

      if (updateError) throw updateError

      setShowPaymentModal(false)
      setSelectedAppointment(null)
      setPaymentData({
        metodo_pago: 'efectivo',
        monto_pagado: '',
        descuento: '0',
        propina: '0',
        notas: ''
      })
      
      // Recargar datos
      if (barbershop) {
        await loadPendingAppointments(barbershop.id, barbershop)
      }
      
      alert(`Pago procesado exitosamente para ${selectedAppointment.cliente_nombre} - Monto: ${formatCurrency(montoFinal)}`)

    } catch (error) {
      console.error('Error processing payment:', error)
      alert('Error al procesar el pago')
    } finally {
      setProcessingPayment(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'VENCIDA': return 'text-red-600 bg-red-50 border-red-200'
      case 'HOY': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'MAÑANA': return 'text-green-600 bg-green-50 border-green-200'
      case 'ESTA SEMANA': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'PRÓXIMA': return 'text-purple-600 bg-purple-50 border-purple-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'VENCIDA': return <AlertTriangle className="h-4 w-4" />
      case 'HOY': return <Calendar className="h-4 w-4" />
      case 'MAÑANA': return <Clock className="h-4 w-4" />
      case 'ESTA SEMANA': return <Calendar className="h-4 w-4" />
      case 'PRÓXIMA': return <Calendar className="h-4 w-4" />
      default: return <Calendar className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando datos financieros...</p>
        </div>
      </div>
    )
  }

  // Calcular resúmenes
  const citas_hoy = pendingAppointments.filter(a => a.prioridad_cobro === 'HOY').length
  const citas_manana = pendingAppointments.filter(a => a.prioridad_cobro === 'MAÑANA').length
  const citas_esta_semana = pendingAppointments.filter(a => a.prioridad_cobro === 'ESTA SEMANA').length
  const citas_vencidas = pendingAppointments.filter(a => a.prioridad_cobro === 'VENCIDA').length

  const monto_hoy = pendingAppointments.filter(a => a.prioridad_cobro === 'HOY').reduce((sum, a) => sum + a.precio, 0)
  const monto_manana = pendingAppointments.filter(a => a.prioridad_cobro === 'MAÑANA').reduce((sum, a) => sum + a.precio, 0)
  const monto_esta_semana = pendingAppointments.filter(a => a.prioridad_cobro === 'ESTA SEMANA').reduce((sum, a) => sum + a.precio, 0)
  const monto_vencido = pendingAppointments.filter(a => a.prioridad_cobro === 'VENCIDA').reduce((sum, a) => sum + a.precio, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">💰 Finalizar Citas y Cobros</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Selecciona las citas que ya terminaron para procesar el pago
                </p>
              </div>
            </div>
          </div>

          {/* Resumen de citas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-4 text-white">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium opacity-90">📅 Citas de Hoy</p>
                  <p className="text-2xl font-bold">{citas_hoy}</p>
                  <p className="text-xs opacity-90">{formatCurrency(monto_hoy)}</p>
                </div>
                <Calendar className="h-8 w-8 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg p-4 text-white">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium opacity-90">🌅 Mañana</p>
                  <p className="text-2xl font-bold">{citas_manana}</p>
                  <p className="text-xs opacity-90">{formatCurrency(monto_manana)}</p>
                </div>
                <Clock className="h-8 w-8 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg shadow-lg p-4 text-white">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium opacity-90">📆 Esta Semana</p>
                  <p className="text-2xl font-bold">{citas_esta_semana}</p>
                  <p className="text-xs opacity-90">{formatCurrency(monto_esta_semana)}</p>
                </div>
                <Calendar className="h-8 w-8 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg shadow-lg p-4 text-white">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium opacity-90">⚠️ Vencidas</p>
                  <p className="text-2xl font-bold">{citas_vencidas}</p>
                  <p className="text-xs opacity-90">{formatCurrency(monto_vencido)}</p>
                </div>
                <AlertTriangle className="h-8 w-8 opacity-80" />
              </div>
            </div>
          </div>

          {/* Lista de citas para finalizar */}
          <div className="bg-white rounded-lg shadow-lg mb-8">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    ✂️ Citas Listas para Finalizar
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Selecciona las citas que ya terminaron para procesarles el pago
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total citas:</p>
                  <p className="text-lg font-semibold text-green-600">
                    {pendingAppointments.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {pendingAppointments.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">🎉 ¡Excelente trabajo!</h4>
                  <p className="text-gray-500">Todas las citas están finalizadas y pagadas</p>
                  <p className="text-sm text-gray-400 mt-2">No hay citas pendientes de finalizar</p>
                </div>
              ) : (
                pendingAppointments.map((appointment) => (
                  <div key={appointment.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        {/* Prioridad y estado */}
                        <div className="flex items-center space-x-3 mb-3">
                          <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(appointment.prioridad_cobro)}`}>
                            <div className="flex items-center space-x-1">
                              {getPriorityIcon(appointment.prioridad_cobro)}
                              <span>
                                {appointment.prioridad_cobro === 'HOY' ? '📅 HOY' :
                                 appointment.prioridad_cobro === 'MAÑANA' ? '🌅 MAÑANA' :
                                 appointment.prioridad_cobro === 'ESTA SEMANA' ? '📆 ESTA SEMANA' :
                                 appointment.prioridad_cobro === 'VENCIDA' ? '⚠️ VENCIDA' :
                                 appointment.prioridad_cobro}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {appointment.estado.toUpperCase()}
                          </span>
                          {appointment.fecha && (
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                              {format(createSafeDate(appointment.fecha), 'dd/MM', { locale: es })}
                            </span>
                          )}
                        </div>
                        
                        {/* Información del cliente */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-lg font-semibold text-gray-900 flex items-center">
                              <User className="h-5 w-5 mr-2 text-blue-500" />
                              {appointment.cliente_nombre}
                            </p>
                            <p className="text-sm text-gray-600 flex items-center ml-7">
                              <Phone className="h-4 w-4 mr-1" />
                              {appointment.cliente_telefono}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-gray-600 flex items-center">
                              <Calendar className="h-4 w-4 mr-2 text-green-500" />
                              <span className="font-medium">
                                {format(createSafeDate(appointment.fecha), 'EEEE, dd MMMM yyyy', { locale: es })}
                              </span>
                            </p>
                            <p className="text-sm text-gray-600 flex items-center">
                              <Clock className="h-4 w-4 mr-2 text-orange-500" />
                              <span className="font-medium">{appointment.hora}</span>
                            </p>
                            <p className="text-sm text-gray-600 flex items-center">
                              <span className="text-scissors mr-2">✂️</span>
                              <span className="font-medium capitalize">{appointment.tipo_servicio}</span>
                            </p>
                            <p className="text-sm text-gray-600 flex items-center">
                              <span className="mr-2">👨‍💼</span>
                              <span className="font-medium">{appointment.barbero_nombre}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Precio y botón de cobro */}
                      <div className="flex items-center space-x-6 ml-6">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(appointment.precio)}
                          </p>
                          <p className="text-sm text-gray-500">
                            Precio del servicio
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedAppointment(appointment)
                            setPaymentData({
                              ...paymentData,
                              monto_pagado: appointment.precio.toString()
                            })
                            setShowPaymentModal(true)
                          }}
                          className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 text-sm font-bold shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center space-x-2"
                        >
                          <DollarSign className="h-5 w-5" />
                          <span>Finalizar y Cobrar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Modal de pago de cita */}
          {showPaymentModal && selectedAppointment && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl bg-white rounded-lg shadow-xl">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                    ✂️ Finalizar Cita y Procesar Pago
                  </h3>
                  <div className="mt-3 p-4 bg-blue-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-semibold text-gray-700">👤 Cliente:</p>
                        <p className="text-blue-700 font-medium">{selectedAppointment.cliente_nombre}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">📞 Teléfono:</p>
                        <p className="text-gray-600">{selectedAppointment.cliente_telefono}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">✂️ Servicio:</p>
                        <p className="text-gray-600 capitalize">{selectedAppointment.tipo_servicio}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">👨‍💼 Barbero:</p>
                        <p className="text-gray-600">{selectedAppointment.barbero_nombre}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <form onSubmit={handlePayment} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        💰 Monto a Cobrar
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">₡</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={paymentData.monto_pagado}
                          onChange={(e) => setPaymentData({ ...paymentData, monto_pagado: e.target.value })}
                          className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-semibold"
                          placeholder="0.00"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Precio original: {formatCurrency(selectedAppointment.precio)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        💳 Método de Pago
                      </label>
                      <select
                        value={paymentData.metodo_pago}
                        onChange={(e) => setPaymentData({ ...paymentData, metodo_pago: e.target.value })}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                      >
                        <option value="efectivo">💵 Efectivo</option>
                        <option value="sinpe">📱 SINPE</option>
                        <option value="tarjeta_credito">💳 Tarjeta Crédito</option>
                        <option value="tarjeta_debito">💳 Tarjeta Débito</option>
                        <option value="transferencia">🏦 Transferencia</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        🏷️ Descuento
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">₡</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={paymentData.descuento}
                          onChange={(e) => setPaymentData({ ...paymentData, descuento: e.target.value })}
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        💝 Propina
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">₡</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={paymentData.propina}
                          onChange={(e) => setPaymentData({ ...paymentData, propina: e.target.value })}
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Resumen del pago */}
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h4 className="font-bold text-green-800 mb-2">💰 Resumen del Pago</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-700">Precio base:</span>
                        <span className="font-medium">{formatCurrency(parseFloat(paymentData.monto_pagado) || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-600">Descuento:</span>
                        <span className="font-medium">-{formatCurrency(parseFloat(paymentData.descuento) || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-600">Propina:</span>
                        <span className="font-medium">+{formatCurrency(parseFloat(paymentData.propina) || 0)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-bold text-green-800">TOTAL:</span>
                        <span className="font-bold text-xl text-green-800">
                          {formatCurrency(
                            (parseFloat(paymentData.monto_pagado) || 0) - 
                            (parseFloat(paymentData.descuento) || 0) + 
                            (parseFloat(paymentData.propina) || 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      📝 Notas (opcional)
                    </label>
                    <textarea
                      value={paymentData.notas}
                      onChange={(e) => setPaymentData({ ...paymentData, notas: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Comentarios adicionales sobre el pago..."
                    />
                  </div>

                  <div className="flex justify-end space-x-4 pt-6 border-t">
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(false)}
                      className="px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      ❌ Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={processingPayment}
                      className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 text-sm font-bold disabled:opacity-50 transition-all duration-200 shadow-lg"
                    >
                      {processingPayment ? (
                        <span className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Procesando...
                        </span>
                      ) : (
                        '✅ Finalizar Cita y Cobrar'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </Navigation>
    </div>
  )
}