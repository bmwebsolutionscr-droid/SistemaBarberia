import { NextRequest, NextResponse } from 'next/server'
import { whatsAppService } from '@/lib/whatsapp-service'
import { supabase } from '@/lib/supabase'

// API para configurar y probar WhatsApp
export async function POST(request: NextRequest) {
  try {
    const { action, barberShopId, phoneNumber, testMessage } = await request.json()

    switch (action) {
      case 'test':
        // Probar envío de mensaje
        if (!phoneNumber) {
          return NextResponse.json(
            { error: 'Se requiere número de teléfono para la prueba' },
            { status: 400 }
          )
        }

        const message = testMessage || '🧪 Mensaje de prueba del sistema de notificaciones Barber Magic'
        const success = await whatsAppService.sendMessage(phoneNumber, message)

        return NextResponse.json({
          success,
          message: success 
            ? 'Mensaje de prueba enviado exitosamente' 
            : 'No se pudo enviar el mensaje de prueba'
        })

      case 'enable':
        // Habilitar WhatsApp para una barbería
        if (!barberShopId) {
          return NextResponse.json(
            { error: 'Se requiere ID de barbería' },
            { status: 400 }
          )
        }

        const { error: enableError } = await supabase
          .from('barbershops')
          .update({ 
            whatsapp_activo: true,
            whatsapp_numero: phoneNumber 
          })
          .eq('id', barberShopId)

        if (enableError) {
          return NextResponse.json(
            { error: 'Error habilitando WhatsApp' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'WhatsApp habilitado exitosamente'
        })

      case 'disable':
        // Deshabilitar WhatsApp para una barbería
        if (!barberShopId) {
          return NextResponse.json(
            { error: 'Se requiere ID de barbería' },
            { status: 400 }
          )
        }

        const { error: disableError } = await supabase
          .from('barbershops')
          .update({ whatsapp_activo: false })
          .eq('id', barberShopId)

        if (disableError) {
          return NextResponse.json(
            { error: 'Error deshabilitando WhatsApp' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'WhatsApp deshabilitado exitosamente'
        })

      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error en configuración WhatsApp:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// Obtener configuración actual de WhatsApp
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const barberShopId = searchParams.get('barberShopId')

    if (!barberShopId) {
      return NextResponse.json(
        { error: 'Se requiere ID de barbería' },
        { status: 400 }
      )
    }

    const config = await whatsAppService.getBarberShopWhatsAppConfig(barberShopId)

    if (!config) {
      return NextResponse.json(
        { error: 'No se encontró configuración' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      whatsapp_activo: config.whatsapp_activo,
      whatsapp_numero: config.whatsapp_numero,
      success: true
    })

  } catch (error) {
    console.error('Error obteniendo configuración WhatsApp:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}