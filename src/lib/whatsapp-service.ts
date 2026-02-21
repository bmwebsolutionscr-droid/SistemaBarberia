// Servicio básico de WhatsApp - Implementación placeholder
// En el futuro se puede integrar con WhatsApp Business API

export interface WhatsAppMessage {
  to: string
  message: string
  type?: 'text' | 'template'
}

export interface WhatsAppResponse {
  success: boolean
  messageId?: string
  error?: string
}

class WhatsAppService {
  private apiUrl: string | null = null
  private apiKey: string | null = null
  private isConfigured = false

  constructor() {
    // Configuración desde variables de entorno (opcional)
    this.apiUrl = process.env.WHATSAPP_API_URL || null
    this.apiKey = process.env.WHATSAPP_API_KEY || null
    this.isConfigured = !!(this.apiUrl && this.apiKey)
  }

  async configure(config: { apiUrl: string; apiKey: string }) {
    this.apiUrl = config.apiUrl
    this.apiKey = config.apiKey
    this.isConfigured = true
    return { success: true }
  }

  async sendMessage(params: WhatsAppMessage): Promise<WhatsAppResponse> {
    try {
      // Por ahora, solo simulamos el envío (logs eliminados)

      // En el futuro aquí iría la integración real con WhatsApp Business API
      if (this.isConfigured && this.apiUrl && this.apiKey) {
        // Implementación real con fetch a WhatsApp API
        /*
        const response = await fetch(`${this.apiUrl}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: params.to,
            message: {
              type: 'text',
              text: { body: params.message }
            }
          })
        })

        if (response.ok) {
          const result = await response.json()
          return { success: true, messageId: result.id }
        } else {
          throw new Error(`WhatsApp API error: ${response.status}`)
        }
        */
      }

      // Simulación de éxito
      return {
        success: true,
        messageId: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }

    } catch (error) {
      console.error('Error enviando mensaje WhatsApp:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

  async sendAppointmentReminder(appointment: {
    clientName: string
    clientPhone: string
    date: string
    time: string
    barberName: string
    barbershopName: string
  }) {
    const message = `
🪒 *${appointment.barbershopName}*

Hola ${appointment.clientName}! 👋

⏰ Te recordamos tu cita:
📅 ${appointment.date}
🕒 ${appointment.time}
👨‍💼 Barbero: ${appointment.barberName}

¡Te esperamos! 💈

Para cancelar o cambiar tu cita, responde a este mensaje.
    `.trim()

    return this.sendMessage({
      to: appointment.clientPhone,
      message,
      type: 'text'
    })
  }

  async sendAppointmentConfirmation(appointment: {
    clientName: string
    clientPhone: string
    date: string
    time: string
    barberName: string
    barbershopName: string
    service: string
    price?: number
  }) {
    let message = `
🎉 *Cita Confirmada* 

${appointment.barbershopName}

Hola ${appointment.clientName}!

Tu cita ha sido confirmada:
📅 ${appointment.date}
🕒 ${appointment.time}
👨‍💼 Barbero: ${appointment.barberName}
✂️ Servicio: ${appointment.service}
    `

    if (appointment.price) {
      message += `💰 Precio: ₡${appointment.price.toLocaleString()}\n`
    }

    message += `
¡Nos vemos pronto! 💈

Para cualquier cambio, responde a este mensaje.
    `.trim()

    return this.sendMessage({
      to: appointment.clientPhone,
      message,
      type: 'text'
    })
  }

  async sendPromotionalMessage(params: {
    clientPhone: string
    clientName: string
    barbershopName: string
    promotion: string
  }) {
    const message = `
🎯 *Promoción Especial*

Hola ${params.clientName}! 

${params.barbershopName} tiene algo especial para ti:

${params.promotion}

¡No te lo pierdas! Agenda tu cita respondiendo a este mensaje.

💈 ${params.barbershopName}
    `.trim()

    return this.sendMessage({
      to: params.clientPhone,
      message,
      type: 'text'
    })
  }

  getStatus() {
    return {
      configured: this.isConfigured,
      apiUrl: this.apiUrl ? '***configured***' : null,
      ready: this.isConfigured
    }
  }

  async getBarberShopWhatsAppConfig(barberShopId: string) {
    try {
      // Por ahora retornamos una configuración simulada
      // En el futuro esto vendría de la base de datos
      // Obteniendo configuración WhatsApp para barbería (log eliminado)
      
      return {
        whatsapp_activo: true,
        whatsapp_numero: '+50688888888', // Número simulado
        barbershop_id: barberShopId
      }
    } catch (error) {
      console.error('Error obteniendo configuración WhatsApp:', error)
      return null
    }
  }
}

// Singleton instance
export const whatsAppService = new WhatsAppService()

// Funciones de utilidad
export const formatPhoneNumber = (phone: string): string => {
  // Eliminar espacios, guiones y paréntesis
  let cleaned = phone.replace(/[\s\-\(\)]/g, '')
  
  // Si no tiene código de país, asumir Costa Rica (+506)
  if (!cleaned.startsWith('+') && !cleaned.startsWith('506')) {
    if (cleaned.length === 8) {
      cleaned = '+506' + cleaned
    }
  }
  
  return cleaned
}

export const validatePhoneNumber = (phone: string): boolean => {
  const formatted = formatPhoneNumber(phone)
  // Validar formato básico para Costa Rica
  return /^\+506\d{8}$/.test(formatted)
}

// Función para enviar notificaciones de citas (requerida por las APIs)
export const sendAppointmentNotification = async (appointmentId: string, type: string): Promise<boolean> => {
  try {
    // Simulando notificación (log eliminado)
    
    // En una implementación real, aquí se obtendría la información de la cita
    // y se enviaría la notificación correspondiente via WhatsApp
    
    // Por ahora, simplemente simulamos éxito
    return true
  } catch (error) {
    console.error('Error enviando notificación:', error)
    return false
  }
}

// Función para enviar recordatorios automáticos (requerida por las APIs)
export const sendAutomaticReminders = async (): Promise<number> => {
  try {
    // Simulando envío de recordatorios automáticos (logs eliminados)
    const mockSentCount = Math.floor(Math.random() * 10) + 1
    return mockSentCount
  } catch (error) {
    console.error('Error enviando recordatorios automáticos:', error)
    return 0
  }
}