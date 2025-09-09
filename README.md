# Sistema de Gestión de Barbería 💈

Sistema completo de gestión para barberías desarrollado con Next.js, TailwindCSS y Supabase.

## 🚀 Características

- **Gestión de Barbería**: Sistema multi-barbero para administrar barberías completas
- **Gestión de Barberos**: Agregar, editar y administrar el equipo de barberos
- **Gestión de Citas**: Agendar, editar y seguimiento de citas por barbero
- **Gestión de Clientes**: Base de datos de clientes automática
- **Reportes Avanzados**: Estadísticas detalladas con filtros por barbero
- **Integración WhatsApp**: Generación automática de reportes para WhatsApp
- **Dashboard Intuitivo**: Vista general del estado de la barbería
- **Autenticación Segura**: Sistema de login para cada barbería
- **Responsive Design**: Funciona perfectamente en móviles y desktop

## 🏗️ Tecnologías

- **Frontend**: Next.js 14 + TypeScript
- **Estilos**: TailwindCSS
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Iconos**: Lucide React
- **Fechas**: date-fns
- **Notificaciones**: React Hot Toast

## 📋 Requisitos Previos

- Node.js 18 o superior
- Cuenta de Supabase
- Git

## 🛠️ Instalación

1. **Clonar el repositorio**
```bash
git clone [url-del-repositorio]
cd SistemaBarberia
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
Crear archivo `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

4. **Configurar base de datos**
- Ejecutar el script `supabase-setup.sql` en tu proyecto de Supabase
- Opcionalmente, ejecutar `test-data.sql` para datos de prueba

5. **Ejecutar en desarrollo**
```bash
npm run dev
```

## 🗄️ Estructura de la Base de Datos

### Barbershops (Barberías)
- Información principal de cada barbería
- Autenticación por email
- Datos de contacto y ubicación

### Barbers (Barberos)
- Equipo de barberos por barbería
- Especialidades y datos de contacto
- Estado activo/inactivo

### Clients (Clientes)
- Base de datos de clientes por barbería
- Información de contacto
- Historial automático

### Appointments (Citas)
- Gestión de citas por barbero
- Estados: programada, confirmada, completada, cancelada
- Precios y notas adicionales

## 📱 Funcionalidades Principales

### Dashboard
- Resumen de citas del día y mañana
- Estadísticas del mes actual
- Vista del equipo de barberos
- Accesos rápidos a funcionalidades

### Gestión de Barberos
- ✅ Agregar nuevos barberos al equipo
- ✅ Editar información de barberos existentes
- ✅ Activar/desactivar barberos
- ✅ Gestión de especialidades

### Gestión de Citas
- ✅ Agendar nuevas citas con selección de barbero
- ✅ Editar citas existentes
- ✅ Cambiar estados de citas
- ✅ Filtrado por barbero
- ✅ Búsqueda por cliente

### Reportes y Estadísticas
- ✅ Estadísticas generales por período
- ✅ Filtros por barbero específico
- ✅ Gráficos de citas por día
- ✅ Horarios disponibles
- ✅ Generación de reportes para WhatsApp

### Integración WhatsApp
- ✅ Reportes automáticos con estadísticas
- ✅ Selección de período (7, 15, 30 días)
- ✅ Filtro por barbero específico
- ✅ Próximas citas y sugerencias
- ✅ Enlace directo para compartir

## 🎯 Datos de Prueba

El sistema incluye datos de prueba para "Barber Magic":

**Credenciales de acceso:**
- Email: `barberia@barbermagic.com`
- Contraseña: (configurar en Supabase Auth)

**Barberos incluidos:**
- Carlos Mendez - Cortes clásicos y barba
- Jorge Ramirez - Colorimetría y estilos modernos  
- Mario Rodriguez - Cortes infantiles y adulto mayor

## 🚀 Despliegue

### Vercel (Recomendado)
```bash
npm run build
# Conectar con Vercel y desplegar
```

### Configuración de Producción
- Configurar variables de entorno en Vercel
- Verificar configuración de Supabase
- Configurar dominio personalizado (opcional)

## 📖 Guías de Uso

### Para Administradores de Barbería

1. **Configuración inicial**:
   - Registrar barbería en Supabase Auth
   - Agregar barberos al equipo
   - Configurar especialidades

2. **Gestión diaria**:
   - Revisar dashboard al inicio del día
   - Confirmar citas del día
   - Agendar nuevas citas

3. **Reportes**:
   - Generar reportes semanales/mensuales
   - Compartir estadísticas por WhatsApp
   - Analizar rendimiento por barbero

### Para Barberos

- Cada barbero puede tener sus propias citas asignadas
- Los reportes pueden filtrarse por barbero individual
- Gestión de clientes propia por barbería

## 🔧 Configuración Avanzada

### Personalización de Horarios
Editar en `src/app/dashboard/reports/page.tsx`:
```typescript
const timeSlots = [
  '09:00', '09:30', '10:00', // horarios matutinos
  '14:00', '14:30', '15:00'  // horarios vespertinos
]
```

### Personalización de Precios
Los precios se configuran por cita individual en la base de datos.

### Personalización de Estados
Modificar en `src/types/supabase.ts` los estados de citas disponibles.

## 🐛 Solución de Problemas

### Error de Conexión a Supabase
- Verificar variables de entorno
- Comprobar configuración RLS en Supabase
- Verificar que las tablas estén creadas

### Problemas de Autenticación
- Verificar configuración de Auth en Supabase
- Comprobar que el email esté registrado
- Verificar políticas RLS

### Errores de Build
```bash
npm run build
# Revisar errores de TypeScript
# Verificar importaciones de componentes
```

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo `LICENSE` para más detalles.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crear rama para feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📞 Soporte

Para soporte técnico o consultas:
- Crear issue en GitHub
- Revisar documentación en `/docs`
- Consultar guías de Supabase y Next.js

---

**Sistema de Barbería** - Gestión profesional para barberías modernas 💈
