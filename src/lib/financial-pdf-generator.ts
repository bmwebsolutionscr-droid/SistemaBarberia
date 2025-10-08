import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Extender jsPDF para incluir autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

export interface FinancialReportData {
  barbershop: {
    nombre: string
    email: string
    telefono?: string
    direccion?: string
  }
  summary: {
    total_ingresos: number
    total_gastos: number
    ganancia_neta: number
    total_transacciones: number
    efectivo_recibido: number
    sinpe_recibido: number
    promedio_diario: number
  }
  transactions: Array<{
    fecha_transaccion: string
    tipo: 'ingreso' | 'gasto'
    concepto: string
    categoria: string
    metodo_pago: string
    monto: number
    descripcion?: string
  }>
  period: {
    start: Date
    end: Date
    label: string
  }
}

export class FinancialPDFGenerator {
  private doc: jsPDF
  private pageHeight: number
  private pageWidth: number
  private margin: number
  private currentY: number

  constructor() {
    this.doc = new jsPDF()
    this.pageHeight = this.doc.internal.pageSize.height
    this.pageWidth = this.doc.internal.pageSize.width
    this.margin = 20
    this.currentY = this.margin
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0
    }).format(amount)
  }

  private addHeader(barbershop: FinancialReportData['barbershop']) {
    // Título principal
    this.doc.setFontSize(20)
    this.doc.setTextColor(31, 41, 55) // gray-800
    this.doc.text('REPORTE FINANCIERO', this.pageWidth / 2, this.currentY, { align: 'center' })
    this.currentY += 15

    // Información de la barbería
    this.doc.setFontSize(16)
    this.doc.setTextColor(59, 130, 246) // blue-600
    this.doc.text(barbershop.nombre, this.pageWidth / 2, this.currentY, { align: 'center' })
    this.currentY += 10

    if (barbershop.direccion) {
      this.doc.setFontSize(10)
      this.doc.setTextColor(107, 114, 128) // gray-500
      this.doc.text(barbershop.direccion, this.pageWidth / 2, this.currentY, { align: 'center' })
      this.currentY += 8
    }

    if (barbershop.telefono) {
      this.doc.setFontSize(10)
      this.doc.text(`Tel: ${barbershop.telefono}`, this.pageWidth / 2, this.currentY, { align: 'center' })
      this.currentY += 8
    }

    this.doc.setFontSize(10)
    this.doc.text(`Email: ${barbershop.email}`, this.pageWidth / 2, this.currentY, { align: 'center' })
    this.currentY += 20
  }

  private addPeriodInfo(period: FinancialReportData['period']) {
    // Línea separadora
    this.doc.setDrawColor(229, 231, 235) // gray-200
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY)
    this.currentY += 10

    // Información del período
    this.doc.setFontSize(12)
    this.doc.setTextColor(31, 41, 55) // gray-800
    this.doc.text(`Período: ${period.label}`, this.margin, this.currentY)
    this.currentY += 8

    const dateRange = `${format(period.start, 'dd/MM/yyyy', { locale: es })} - ${format(period.end, 'dd/MM/yyyy', { locale: es })}`
    this.doc.setFontSize(10)
    this.doc.setTextColor(107, 114, 128) // gray-500
    this.doc.text(`Fecha: ${dateRange}`, this.margin, this.currentY)
    this.currentY += 8

    this.doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, this.margin, this.currentY)
    this.currentY += 20
  }

  private addSummarySection(summary: FinancialReportData['summary']) {
    // Título de sección
    this.doc.setFontSize(14)
    this.doc.setTextColor(31, 41, 55) // gray-800
    this.doc.text('RESUMEN FINANCIERO', this.margin, this.currentY)
    this.currentY += 15

    // Crear tabla de resumen
    const summaryData = [
      ['Total Ingresos', this.formatCurrency(summary.total_ingresos)],
      ['Total Gastos', this.formatCurrency(summary.total_gastos)],
      ['Ganancia Neta', this.formatCurrency(summary.ganancia_neta)],
      ['Total Transacciones', summary.total_transacciones.toString()],
      ['Promedio Diario', this.formatCurrency(summary.promedio_diario)]
    ]

    this.doc.autoTable({
      startY: this.currentY,
      head: [['Concepto', 'Valor']],
      body: summaryData,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246], // blue-600
        textColor: [255, 255, 255],
        fontSize: 11,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 10
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 60, halign: 'right' }
      },
      margin: { left: this.margin, right: this.margin }
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 20
  }

  private addPaymentMethodsSection(summary: FinancialReportData['summary']) {
    // Título de sección
    this.doc.setFontSize(14)
    this.doc.setTextColor(31, 41, 55) // gray-800
    this.doc.text('MÉTODOS DE PAGO', this.margin, this.currentY)
    this.currentY += 15

    const paymentData = [
      ['Efectivo', this.formatCurrency(summary.efectivo_recibido)],
      ['SINPE', this.formatCurrency(summary.sinpe_recibido)],
      ['Otros', this.formatCurrency(summary.total_ingresos - summary.efectivo_recibido - summary.sinpe_recibido)]
    ]

    this.doc.autoTable({
      startY: this.currentY,
      head: [['Método', 'Monto']],
      body: paymentData,
      theme: 'grid',
      headStyles: {
        fillColor: [16, 185, 129], // green-600
        textColor: [255, 255, 255],
        fontSize: 11,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 10
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 60, halign: 'right' }
      },
      margin: { left: this.margin, right: this.margin }
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 20
  }

  private addTransactionsSection(transactions: FinancialReportData['transactions']) {
    // Verificar si necesita nueva página
    if (this.currentY > this.pageHeight - 100) {
      this.doc.addPage()
      this.currentY = this.margin
    }

    // Título de sección
    this.doc.setFontSize(14)
    this.doc.setTextColor(31, 41, 55) // gray-800
    this.doc.text('DETALLE DE TRANSACCIONES', this.margin, this.currentY)
    this.currentY += 15

    // Preparar datos de transacciones
    const transactionData = transactions.map(transaction => [
      format(new Date(transaction.fecha_transaccion), 'dd/MM', { locale: es }),
      transaction.tipo === 'ingreso' ? 'Ingreso' : 'Gasto',
      transaction.concepto,
      transaction.categoria,
      transaction.metodo_pago.toUpperCase(),
      this.formatCurrency(transaction.monto)
    ])

    // Agregar totales por tipo
    const totalIngresos = transactions
      .filter(t => t.tipo === 'ingreso')
      .reduce((sum, t) => sum + t.monto, 0)
    
    const totalGastos = transactions
      .filter(t => t.tipo === 'gasto')
      .reduce((sum, t) => sum + t.monto, 0)

    // Añadir filas de totales
    transactionData.push(
      ['', '', '', '', 'TOTAL INGRESOS:', this.formatCurrency(totalIngresos)],
      ['', '', '', '', 'TOTAL GASTOS:', this.formatCurrency(totalGastos)],
      ['', '', '', '', 'GANANCIA NETA:', this.formatCurrency(totalIngresos - totalGastos)]
    )

    this.doc.autoTable({
      startY: this.currentY,
      head: [['Fecha', 'Tipo', 'Concepto', 'Categoría', 'Método', 'Monto']],
      body: transactionData,
      theme: 'striped',
      headStyles: {
        fillColor: [75, 85, 99], // gray-600
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 20 },
        2: { cellWidth: 40 },
        3: { cellWidth: 30 },
        4: { cellWidth: 25 },
        5: { cellWidth: 30, halign: 'right' }
      },
      didParseCell: (data: any) => {
        // Resaltar las filas de totales
        if (data.row.index >= transactionData.length - 3) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = [243, 244, 246] // gray-100
        }
        
        // Colorear según tipo de transacción
        if (data.column.index === 1 && data.cell.text[0]) {
          if (data.cell.text[0] === 'Ingreso') {
            data.cell.styles.textColor = [16, 185, 129] // green-600
          } else if (data.cell.text[0] === 'Gasto') {
            data.cell.styles.textColor = [239, 68, 68] // red-600
          }
        }
      },
      margin: { left: this.margin, right: this.margin }
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 20
  }

  private addFooter() {
    const pageCount = this.doc.internal.getNumberOfPages()
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i)
      
      // Línea separadora
      this.doc.setDrawColor(229, 231, 235) // gray-200
      this.doc.line(this.margin, this.pageHeight - 30, this.pageWidth - this.margin, this.pageHeight - 30)
      
      // Información del pie
      this.doc.setFontSize(8)
      this.doc.setTextColor(107, 114, 128) // gray-500
      this.doc.text(
        'Sistema de Gestión de Barbería - Reporte generado automáticamente',
        this.margin,
        this.pageHeight - 20
      )
      
      this.doc.text(
        `Página ${i} de ${pageCount}`,
        this.pageWidth - this.margin,
        this.pageHeight - 20,
        { align: 'right' }
      )
    }
  }

  public generateReport(data: FinancialReportData): Blob {
    // Resetear documento
    this.currentY = this.margin

    // Agregar secciones
    this.addHeader(data.barbershop)
    this.addPeriodInfo(data.period)
    this.addSummarySection(data.summary)
    this.addPaymentMethodsSection(data.summary)
    this.addTransactionsSection(data.transactions)
    this.addFooter()

    // Retornar como blob
    return this.doc.output('blob')
  }

  public downloadReport(data: FinancialReportData, filename?: string) {
    const blob = this.generateReport(data)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    
    link.href = url
    link.download = filename || `reporte-financiero-${format(new Date(), 'yyyy-MM-dd')}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

// Función helper para generar reporte desde componentes
export const generateFinancialReport = (data: FinancialReportData, download = true) => {
  const generator = new FinancialPDFGenerator()
  
  if (download) {
    const filename = `reporte-financiero-${data.barbershop.nombre.toLowerCase().replace(/\s+/g, '-')}-${format(data.period.start, 'yyyy-MM-dd')}.pdf`
    generator.downloadReport(data, filename)
  } else {
    return generator.generateReport(data)
  }
}