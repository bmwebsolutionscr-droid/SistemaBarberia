# 📱 Guía: Generar Reportes para WhatsApp

## 🎯 ¿Qué hace esta funcionalidad?

La nueva función "Generar para WhatsApp" te permite crear automáticamente mensajes profesionales con los horarios disponibles de tu barbería para enviar a tus clientes por WhatsApp.

## ✨ Características

### 🗓️ **Períodos Configurables**
- **7 días**: Perfecta para promoción semanal
- **15 días**: Ideal para clientes que planifican con anticipación
- **30 días**: Para campañas mensuales

### ⏰ **Horarios Inteligentes**
- Muestra solo horarios disponibles (no reservados)
- Excluye domingos automáticamente
- Horarios de 8:00 AM a 6:00 PM en intervalos de 30 minutos

### 📱 **Mensaje Profesional**
- Formato atractivo con emojis
- Agrupado por días
- Incluye instrucciones para reservar

## 🚀 Cómo usar

### Paso 1: Acceder a la función
1. Ve a **Dashboard** > **Reportes**
2. Haz clic en **"Generar para WhatsApp"**

### Paso 2: Seleccionar período
1. Elige entre 7, 15 o 30 días
2. Ve la vista previa del mensaje
3. Haz clic en **"Copiar Mensaje"**

### Paso 3: Enviar por WhatsApp
1. El mensaje se copia automáticamente
2. Ve a WhatsApp Web o móvil
3. Pega el mensaje en tu estado o chats

## 📝 Ejemplo de mensaje generado

```
🔮 *Barbería - Horarios Disponibles*

Hola! 👋 Estos son nuestros horarios disponibles para los próximos 7 días:

📅 *Lunes 09/09*
⏰ 08:00 • 09:30 • 11:00 • 14:00 • 16:30 • 18:00

📅 *Martes 10/09*
⏰ 08:30 • 10:00 • 12:00 • 15:30 • 17:00

💬 *¿Cómo reservar?*
Responde con el día y hora que prefieres. Ejemplo: "Lunes 10:00"

📞 También puedes llamarnos directamente
⚡ ¡Confirmación inmediata!
```

## 🛠️ Personalización

### Cambiar horarios de trabajo
Edita en `src/app/dashboard/reports/page.tsx`:
```typescript
const workingHours = [
  '08:00', '08:30', '09:00', // ... tus horarios
]
```

### Cambiar días de trabajo
```typescript
// Skip Sundays (día 0 = domingo)
if (day.getDay() === 0) return
```

### Personalizar mensaje
Modifica la función `generateWhatsAppMessage()` con tu texto preferido.

## 💡 Tips de uso

1. **Actualiza regularmente**: Genera nuevos mensajes cada semana
2. **Estados de WhatsApp**: Perfecto para estados que duran 24h
3. **Grupos de clientes**: Envía a grupos específicos
4. **Combina con promociones**: Añade ofertas especiales

## 🎨 Ideas creativas

- **Lunes**: Mensaje motivacional + horarios
- **Miércoles**: Recordatorio de mitad de semana
- **Viernes**: Preparación para fin de semana
- **Promociones especiales**: Combina con descuentos

¡Ahora puedes promocionar tu barbería de manera profesional y automatizada! 🚀
