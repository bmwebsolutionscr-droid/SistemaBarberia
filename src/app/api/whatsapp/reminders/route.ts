import { NextRequest, NextResponse } from 'next/server'
import { sendAutomaticReminders } from '@/lib/whatsapp-service'

// API para enviar recordatorios automáticos (se puede ejecutar con cron job)
export async function POST(request: NextRequest) {
  try {
    // Verificar que sea una llamada autorizada (opcional: agregar autenticación)
    const authHeader = request.headers.get('authorization')
    const apiKey = process.env.CRON_API_KEY || 'demo-key-12345'
    
    if (authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Enviar recordatorios automáticos
    const sentCount = await sendAutomaticReminders()

    return NextResponse.json({
      message: `Recordatorios enviados: ${sentCount}`,
      count: sentCount,
      timestamp: new Date().toISOString(),
      success: true
    })

  } catch (error) {
    console.error('Error enviando recordatorios automáticos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// Endpoint GET para verificar el estado del servicio
export async function GET() {
  try {
    return NextResponse.json({
      status: 'active',
      service: 'WhatsApp Reminders',
      timestamp: new Date().toISOString(),
      message: 'Servicio de recordatorios WhatsApp funcionando'
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error del servicio' },
      { status: 500 }
    )
  }
}