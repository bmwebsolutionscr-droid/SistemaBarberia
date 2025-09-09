# Documentación de la API

Este documento describe los endpoints de la API que se pueden implementar opcionalmente con FastAPI para funcionalidades avanzadas.

## Base URL
```
https://tu-backend.railway.app/api
```

## Endpoints

### Reportes

#### GET /reports/advanced
Genera reportes avanzados con análisis estadístico.

**Parámetros:**
- `barber_id` (string): ID del barbero
- `start_date` (string): Fecha de inicio (YYYY-MM-DD)
- `end_date` (string): Fecha de fin (YYYY-MM-DD)
- `include_trends` (boolean): Incluir análisis de tendencias

**Respuesta:**
```json
{
  "period": {
    "start": "2025-01-01",
    "end": "2025-01-31"
  },
  "summary": {
    "total_appointments": 45,
    "revenue": 675000,
    "growth_rate": 15.5,
    "client_retention": 78.2
  },
  "trends": {
    "daily_average": 1.5,
    "peak_hours": ["10:00", "15:00", "17:00"],
    "busiest_days": ["Friday", "Saturday"]
  },
  "forecasting": {
    "next_month_prediction": 52,
    "revenue_projection": 780000
  }
}
```

#### POST /reports/export
Exporta reportes en diferentes formatos.

**Body:**
```json
{
  "barber_id": "uuid",
  "start_date": "2025-01-01",
  "end_date": "2025-01-31",
  "format": "pdf|excel|csv",
  "include_charts": true
}
```

### Notificaciones

#### POST /notifications/whatsapp
Envía notificaciones por WhatsApp.

**Body:**
```json
{
  "client_phone": "+506888812345",
  "message_type": "reminder|confirmation|cancellation",
  "appointment_data": {
    "date": "2025-01-15",
    "time": "10:00",
    "barber_name": "Juan Pérez"
  }
}
```

#### POST /notifications/email
Envía notificaciones por email.

### Analytics

#### GET /analytics/dashboard
Obtiene métricas del dashboard en tiempo real.

#### GET /analytics/clients/behavior
Analiza el comportamiento de los clientes.

### Configuración

#### GET /config/business-hours
Obtiene horarios de atención.

#### PUT /config/business-hours
Actualiza horarios de atención.
