import { NextRequest, NextResponse } from 'next/server'
import { sendAppointmentNotification } from '@/lib/whatsapp-service'

// API para enviar notificación cuando se crea una nueva cita
export async function POST(request: NextRequest) {
  try {
    const { appointmentId, type = 'created' } = await request.json()

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Se requiere el ID de la cita' },
        { status: 400 }
      )
    }

    // Validar tipo de notificación
    const validTypes = ['created', 'reminder', 'cancelled', 'rescheduled']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Tipo de notificación inválido' },
        { status: 400 }
      )
    }

    // Enviar notificación
    const success = await sendAppointmentNotification(appointmentId, type)

    if (success) {
      return NextResponse.json({
        message: `Notificación ${type} enviada exitosamente`,
        success: true
      })
    } else {
      return NextResponse.json({
        message: 'No se pudo enviar la notificación',
        success: false
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error en API de notificaciones:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}