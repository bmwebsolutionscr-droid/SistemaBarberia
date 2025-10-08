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
  const [selectedPeriod, setSelectedPeriod] = useState('7days')
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
            .eq('barbershop_id', (barbershopData as any).id)
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
    
    try {
      if (!barbershop) {
        throw new Error('No se encontró información de la barbería')
      }

      // Calcular fechas según el período seleccionado
      const endDate = new Date()
      let startDate = new Date()
      
      switch (selectedPeriod) {
        case '7days':
          startDate = addDays(endDate, -7)
          break
        case '15days':
          startDate = addDays(endDate, -15)
          break
        case '30days':
          startDate = addDays(endDate, -30)
          break
        case 'week':
          startDate = startOfWeek(endDate, { weekStartsOn: 1 })
          break
        default:
          startDate = addDays(endDate, -7)
      }

      console.log('Generando reporte para período:', { startDate, endDate })

      // Obtener datos financieros del período
      const { data: financialSummary, error: summaryError } = await supabase
        .rpc('get_financial_summary_by_period', {
          p_barbershop_id: barbershop.id,
          p_start_date: format(startDate, 'yyyy-MM-dd'),
          p_end_date: format(endDate, 'yyyy-MM-dd')
        } as any)

      if (summaryError) {
        console.error('Error al obtener resumen financiero:', summaryError)
        throw summaryError
      }

      // Obtener detalle de pagos
      const { data: paidAppointments, error: paymentsError } = await supabase
        .rpc('get_paid_appointments_detail', {
          p_barbershop_id: barbershop.id,
          p_start_date: format(startDate, 'yyyy-MM-dd'),
          p_end_date: format(endDate, 'yyyy-MM-dd')
        } as any)

      if (paymentsError) {
        console.error('Error al obtener pagos:', paymentsError)
        throw paymentsError
      }

      // Obtener rendimiento por barbero
      const { data: barberPerformance, error: barberError } = await supabase
        .rpc('get_barber_performance_by_period', {
          p_barbershop_id: barbershop.id,
          p_start_date: format(startDate, 'yyyy-MM-dd'),
          p_end_date: format(endDate, 'yyyy-MM-dd')
        } as any)

      if (barberError) {
        console.error('Error al obtener rendimiento barberos:', barberError)
        throw barberError
      }

      console.log('Datos obtenidos:', {
        financialSummary,
        paidAppointments,
        barberPerformance
      })

      // Generar PDF
      await generateFinancialPDF({
        barbershop,
        startDate,
        endDate,
        selectedPeriod,
        financialSummary: financialSummary?.[0] || {},
        paidAppointments: paidAppointments || [],
        barberPerformance: barberPerformance || []
      })

    } catch (error) {
      console.error('Error al generar reporte:', error)
      alert('Error al generar el reporte. Por favor, intenta de nuevo.')
    } finally {
      setIsGeneratingReport(false)
    }
  }

  // Función para generar PDF con jsPDF mejorado
  const generateFinancialPDF = async (data: {
    barbershop: any,
    startDate: Date,
    endDate: Date,
    selectedPeriod: string,
    financialSummary: any,
    paidAppointments: any[],
    barberPerformance: any[]
  }) => {
    const { jsPDF } = await import('jspdf')
    const pdf = new jsPDF()
    
    const {
      barbershop,
      startDate,
      endDate,
      selectedPeriod,
      financialSummary,
      paidAppointments,
      barberPerformance
    } = data

    const pageWidth = pdf.internal.pageSize.width
    const pageHeight = pdf.internal.pageSize.height
    const margin = 15
    let yPosition = margin

    // Configuración de colores corporativos mejorados (simplificado para evitar errores TypeScript)
    const colors = {
      primary: [13, 71, 161] as [number, number, number],
      secondary: [25, 118, 210] as [number, number, number],
      accent: [255, 193, 7] as [number, number, number],
      success: [46, 125, 50] as [number, number, number],
      danger: [211, 47, 47] as [number, number, number],
      light: [245, 245, 245] as [number, number, number],
      lightGray: [238, 238, 238] as [number, number, number],
      mediumGray: [189, 189, 189] as [number, number, number],
      darkGray: [66, 66, 66] as [number, number, number],
      text: [33, 33, 33] as [number, number, number],
      white: [255, 255, 255] as [number, number, number]
    }

    // Función mejorada para verificar salto de página
    const checkPageBreak = (requiredHeight: number, addHeader = false) => {
      if (yPosition + requiredHeight > pageHeight - 35) {
        pdf.addPage()
        yPosition = margin
        if (addHeader) {
          addPageHeader()
          yPosition += 25
        }
        return true
      }
      return false
    }

    // Función para formatear moneda mejorada
    const formatMoney = (amount: number) => {
      const formatted = new Intl.NumberFormat('es-CR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount || 0)
      return `¢${formatted}`
    }

    // Función para formatear porcentajes
    const formatPercentage = (value: number, total: number) => {
      if (total === 0) return '0%'
      return `${((value / total) * 100).toFixed(1)}%`
    }

    // Función para agregar encabezado de página secundaria
    const addPageHeader = () => {
      pdf.setFillColor(...colors.primary)
      pdf.rect(0, 0, pageWidth, 20, 'F')
      
      pdf.setTextColor(...colors.white)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('REPORTE FINANCIERO', pageWidth / 2, 13, { align: 'center' })
    }

    // ENCABEZADO PRINCIPAL MEJORADO
    // Fondo degradado simulado con múltiples rectángulos
    for (let i = 0; i < 45; i++) {
      const alpha = 1 - (i / 45) * 0.3
      pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
      pdf.rect(0, i, pageWidth, 1, 'F')
    }
    
    // Título principal sin logo
    pdf.setTextColor(...colors.white)
    pdf.setFontSize(26)
    pdf.setFont('helvetica', 'bold')
    pdf.text('REPORTE FINANCIERO', pageWidth / 2, 30, { align: 'center' })
    
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Análisis Detallado de Ingresos y Pagos', pageWidth / 2, 40, { align: 'center' })
    
    yPosition = 65

    // Información de la empresa en caja elegante
    pdf.setFillColor(...colors.light)
    pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 25, 'F')
    pdf.setDrawColor(...colors.mediumGray)
    pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 25, 'S')
    
    pdf.setTextColor(...colors.text)
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`${barbershop.nombre || 'BARBERÍA PROFESIONAL'}`, margin + 5, yPosition + 5)
    
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    const periodText = selectedPeriod === '7days' ? 'Últimos 7 días' : 
                      selectedPeriod === '15days' ? 'Últimos 15 días' : 
                      selectedPeriod === '30days' ? 'Últimos 30 días' : 
                      selectedPeriod === 'week' ? 'Esta semana' :
                      selectedPeriod === 'month' ? 'Este mes' : 'Este trimestre'
    
    pdf.text(`Período: ${periodText} (${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')})`, margin + 5, yPosition + 12)
    pdf.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, pageWidth - margin - 60, yPosition + 12)
    
    yPosition += 35

    // TARJETAS DE MÉTRICAS PRINCIPALES
    const metrics = [
      { 
        title: 'Total Citas', 
        value: financialSummary.total_appointments || 0, 
        color: colors.secondary
      },
      { 
        title: 'Citas Pagadas', 
        value: financialSummary.total_paid || 0, 
        color: colors.success,
        percentage: formatPercentage(financialSummary.total_paid || 0, financialSummary.total_appointments || 1)
      },
      { 
        title: 'Total Recaudado', 
        value: formatMoney(financialSummary.total_amount_paid || 0), 
        color: colors.accent
      },
      { 
        title: 'Ticket Promedio', 
        value: formatMoney(financialSummary.average_ticket || 0), 
        color: colors.primary
      }
    ]

    const cardWidth = (pageWidth - 2 * margin - 15) / 2 // 2 tarjetas por fila
    const cardHeight = 30

    for (let i = 0; i < metrics.length; i++) {
      const metric = metrics[i]
      const row = Math.floor(i / 2)
      const col = i % 2
      const x = margin + col * (cardWidth + 5)
      const y = yPosition + row * (cardHeight + 5)

      // Sombra de tarjeta
      pdf.setFillColor(220, 220, 220)
      pdf.rect(x + 1, y + 1, cardWidth, cardHeight, 'F')
      
      // Tarjeta principal
      pdf.setFillColor(...colors.white)
      pdf.rect(x, y, cardWidth, cardHeight, 'F')
      
      // Borde izquierdo colorido
      pdf.setFillColor(...metric.color)
      pdf.rect(x, y, 4, cardHeight, 'F')
      
      // Contenido de tarjeta
      pdf.setTextColor(...colors.text)
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      pdf.text(metric.title, x + 10, y + 8)
      
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text(metric.value.toString(), x + 10, y + 18)
      
      if (metric.percentage) {
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(...colors.success)
        pdf.text(metric.percentage, x + 10, y + 25)
      }
    }

    yPosition += cardHeight * 2 + 25

    // SECCIÓN DE MÉTODOS DE PAGO CON GRÁFICO VISUAL
    checkPageBreak(80, true)
    
    // Título de sección con diseño mejorado
    pdf.setFillColor(...colors.primary)
    pdf.rect(margin, yPosition - 2, pageWidth - 2 * margin, 18, 'F')
    
    pdf.setTextColor(...colors.white)
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('MÉTODOS DE PAGO', margin + 5, yPosition + 10)
    
    yPosition += 25

    const paymentMethods = [
      { name: 'Efectivo', amount: financialSummary.efectivo_amount || 0, color: colors.success },
      { name: 'SINPE Móvil', amount: financialSummary.sinpe_amount || 0, color: colors.accent },
      { name: 'Tarjeta', amount: financialSummary.tarjeta_amount || 0, color: colors.secondary },
      { name: 'Transferencia', amount: financialSummary.transferencia_amount || 0, color: colors.primary }
    ]

    const totalPayments = paymentMethods.reduce((sum, method) => sum + method.amount, 0)

    // Tabla mejorada de métodos de pago
    const tableHeaders = ['Método', 'Monto', 'Porcentaje']
    const colWidths = [60, 50, 40]
    const headerHeight = 12

    // Encabezados con gradiente
    pdf.setFillColor(...colors.lightGray)
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, headerHeight, 'F')
    
    pdf.setTextColor(...colors.text)
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    
    let currentX = margin + 5
    tableHeaders.forEach((header, index) => {
      pdf.text(header, currentX, yPosition + 8)
      currentX += colWidths[index]
    })

    yPosition += headerHeight

    // Filas de datos con alternancia de colores
    paymentMethods.forEach((method, index) => {
      const rowHeight = 14
      
      if (index % 2 === 0) {
        pdf.setFillColor(...colors.light)
        pdf.rect(margin, yPosition, pageWidth - 2 * margin, rowHeight, 'F')
      }
      
      // Indicador de color del método
      pdf.setFillColor(...method.color)
      pdf.rect(margin + 2, yPosition + 3, 3, rowHeight - 6, 'F')
      
      pdf.setTextColor(...colors.text)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      
      currentX = margin + 8
      pdf.text(method.name, currentX, yPosition + 9)
      currentX += colWidths[0]
      
      pdf.setFont('helvetica', 'bold')
      pdf.text(formatMoney(method.amount), currentX, yPosition + 9)
      currentX += colWidths[1]
      
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(...method.color)
      pdf.text(formatPercentage(method.amount, totalPayments), currentX, yPosition + 9)
      
      yPosition += rowHeight
    })

    yPosition += 20

    // ANÁLISIS DE SERVICIOS
    checkPageBreak(60, true)
    
    pdf.setFillColor(...colors.primary)
    pdf.rect(margin, yPosition - 2, pageWidth - 2 * margin, 18, 'F')
    
    pdf.setTextColor(...colors.white)
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('ANÁLISIS POR SERVICIOS', margin + 5, yPosition + 10)
    
    yPosition += 25

    const services = [
      { 
        name: 'Corte Simple', 
        count: financialSummary.corte_count || 0, 
        amount: financialSummary.corte_amount || 0,
        color: colors.secondary
      },
      { 
        name: 'Corte + Barba', 
        count: financialSummary.corte_barba_count || 0, 
        amount: financialSummary.corte_barba_amount || 0,
        color: colors.accent
      }
    ]

    // Tabla de servicios mejorada
    const serviceHeaders = ['Servicio', 'Cantidad', 'Ingresos', 'Promedio']
    const serviceColWidths = [50, 30, 45, 35]

    pdf.setFillColor(...colors.lightGray)
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, headerHeight, 'F')
    
    pdf.setTextColor(...colors.text)
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    
    currentX = margin + 5
    serviceHeaders.forEach((header, index) => {
      pdf.text(header, currentX, yPosition + 8)
      currentX += serviceColWidths[index]
    })

    yPosition += headerHeight

    services.forEach((service, index) => {
      const rowHeight = 16
      
      if (index % 2 === 0) {
        pdf.setFillColor(...colors.light)
        pdf.rect(margin, yPosition, pageWidth - 2 * margin, rowHeight, 'F')
      }
      
      pdf.setFillColor(...service.color)
      pdf.rect(margin + 2, yPosition + 3, 3, rowHeight - 6, 'F')
      
      pdf.setTextColor(...colors.text)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      
      const avgPrice = service.count > 0 ? service.amount / service.count : 0
      
      currentX = margin + 8
      pdf.text(service.name, currentX, yPosition + 10)
      currentX += serviceColWidths[0]
      
      pdf.setFont('helvetica', 'bold')
      pdf.text(service.count.toString(), currentX, yPosition + 10)
      currentX += serviceColWidths[1]
      
      pdf.text(formatMoney(service.amount), currentX, yPosition + 10)
      currentX += serviceColWidths[2]
      
      pdf.setFont('helvetica', 'normal')
      pdf.text(formatMoney(avgPrice), currentX, yPosition + 10)
      
      yPosition += rowHeight
    })

    yPosition += 25

    // RENDIMIENTO POR BARBERO
    if (barberPerformance.length > 0) {
      checkPageBreak(50 + barberPerformance.length * 18, true)
      
      pdf.setFillColor(...colors.primary)
      pdf.rect(margin, yPosition - 2, pageWidth - 2 * margin, 18, 'F')
      
      pdf.setTextColor(...colors.white)
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('RENDIMIENTO POR BARBERO', margin + 5, yPosition + 10)
      
      yPosition += 25

      // Encabezados de barberos
      const barberHeaders = ['Barbero', 'Citas', 'Pagadas', 'Ingresos', 'Eficiencia']
      const barberColWidths = [40, 25, 25, 35, 30]

      pdf.setFillColor(...colors.lightGray)
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, headerHeight, 'F')
      
      pdf.setTextColor(...colors.text)
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'bold')
      
      currentX = margin + 5
      barberHeaders.forEach((header, index) => {
        pdf.text(header, currentX, yPosition + 8)
        currentX += barberColWidths[index]
      })

      yPosition += headerHeight

      barberPerformance.forEach((barber, index) => {
        const rowHeight = 16
        
        if (index % 2 === 0) {
          pdf.setFillColor(...colors.light)
          pdf.rect(margin, yPosition, pageWidth - 2 * margin, rowHeight, 'F')
        }
        
        const efficiency = barber.total_appointments > 0 ? 
          (barber.paid_appointments / barber.total_appointments) * 100 : 0
        const efficiencyColor = efficiency >= 80 ? colors.success :
                               efficiency >= 60 ? colors.accent : colors.danger
        
        pdf.setTextColor(...colors.text)
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'normal')
        
        currentX = margin + 5
        pdf.text((barber.barber_name || 'N/A').substring(0, 12), currentX, yPosition + 10)
        currentX += barberColWidths[0]
        
        pdf.setFont('helvetica', 'bold')
        pdf.text((barber.total_appointments || 0).toString(), currentX, yPosition + 10)
        currentX += barberColWidths[1]
        
        pdf.text((barber.paid_appointments || 0).toString(), currentX, yPosition + 10)
        currentX += barberColWidths[2]
        
        pdf.text(formatMoney(barber.total_earned || 0), currentX, yPosition + 10)
        currentX += barberColWidths[3]
        
        pdf.setTextColor(...efficiencyColor)
        pdf.setFont('helvetica', 'normal')
        pdf.text(`${efficiency.toFixed(0)}%`, currentX, yPosition + 10)
        
        yPosition += rowHeight
      })

      yPosition += 25
    }

    // DETALLE DE TRANSACCIONES EN NUEVA PÁGINA
    if (paidAppointments.length > 0) {
      pdf.addPage()
      yPosition = margin
      addPageHeader()
      yPosition += 30
      
      pdf.setFillColor(...colors.primary)
      pdf.rect(margin, yPosition - 2, pageWidth - 2 * margin, 18, 'F')
      
      pdf.setTextColor(...colors.white)
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('DETALLE DE TRANSACCIONES', margin + 5, yPosition + 10)
      
      yPosition += 25

      // Encabezados de transacciones
      const transactionHeaders = ['Fecha', 'Cliente', 'Servicio', 'Método', 'Monto']
      const transactionColWidths = [25, 45, 30, 30, 30]

      pdf.setFillColor(...colors.lightGray)
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, headerHeight, 'F')
      
      pdf.setTextColor(...colors.text)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      
      currentX = margin + 3
      transactionHeaders.forEach((header, index) => {
        pdf.text(header, currentX, yPosition + 8)
        currentX += transactionColWidths[index]
      })

      yPosition += headerHeight

      paidAppointments.slice(0, 30).forEach((transaction, index) => {
        checkPageBreak(12, true)
        
        const rowHeight = 12
        
        if (index % 2 === 0) {
          pdf.setFillColor(...colors.light)
          pdf.rect(margin, yPosition, pageWidth - 2 * margin, rowHeight, 'F')
        }
        
        pdf.setTextColor(...colors.text)
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'normal')
        
        const date = transaction.service_date ? 
          format(new Date(transaction.service_date), 'dd/MM', { locale: es }) : 'N/A'
        
        const serviceText = transaction.service_type === 'corte' ? 'Corte' : 'C+Barba'
        
        currentX = margin + 3
        pdf.text(date, currentX, yPosition + 8)
        currentX += transactionColWidths[0]
        
        pdf.text((transaction.client_name || 'N/A').substring(0, 18), currentX, yPosition + 8)
        currentX += transactionColWidths[1]
        
        pdf.text(serviceText, currentX, yPosition + 8)
        currentX += transactionColWidths[2]
        
        pdf.text((transaction.payment_method || 'N/A').substring(0, 10), currentX, yPosition + 8)
        currentX += transactionColWidths[3]
        
        pdf.setFont('helvetica', 'bold')
        pdf.text(formatMoney(transaction.amount || 0), currentX, yPosition + 8)
        
        yPosition += rowHeight
      })

      if (paidAppointments.length > 30) {
        yPosition += 10
        pdf.setTextColor(...colors.mediumGray)
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'italic')
        pdf.text(`... y ${paidAppointments.length - 30} transacciones más`, margin + 5, yPosition)
      }
    }

    // PIE DE PÁGINA MEJORADO
    const addEnhancedFooter = (pageNum: number, totalPages: number) => {
      // Línea superior
      pdf.setDrawColor(...colors.lightGray)
      pdf.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25)
      
      // Fondo del pie
      pdf.setFillColor(...colors.light)
      pdf.rect(0, pageHeight - 20, pageWidth, 20, 'F')
      
      pdf.setTextColor(...colors.darkGray)
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      
      // Información del sistema
      pdf.text('Sistema de Barbería implementado por bmwebsolutionscr', margin, pageHeight - 10)
      
      // Número de página
      pdf.text(`Página ${pageNum} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
      
      // Fecha y hora
      pdf.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - margin, pageHeight - 10, { align: 'right' })
    }

    // Agregar pie de página mejorado a todas las páginas
    const pageCount = (pdf as any).getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i)
      addEnhancedFooter(i, pageCount)
    }

    // Descargar PDF
    const fileName = `reporte-financiero-${selectedPeriod}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
    pdf.save(fileName)
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
      
      ;(existingAppointments || []).forEach((apt: any) => {
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
                      {selectedPeriod === '7days' && 'Últimos 7 días'}
                      {selectedPeriod === '15days' && 'Últimos 15 días'}
                      {selectedPeriod === '30days' && 'Últimos 30 días'}
                      {selectedPeriod === 'week' && 'Esta semana'}
                      {selectedPeriod === 'month' && 'Este mes'}
                      {selectedPeriod === 'quarter' && 'Este trimestre'}
                    </span>
                    <span className="sm:hidden">
                      {selectedPeriod === '7days' && '7 días'}
                      {selectedPeriod === '15days' && '15 días'}
                      {selectedPeriod === '30days' && '30 días'}
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
                        { value: '7days', label: 'Últimos 7 días' },
                        { value: '15days', label: 'Últimos 15 días' },
                        { value: '30days', label: 'Últimos 30 días' },
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
