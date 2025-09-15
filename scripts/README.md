# 🗄️ Scripts de Base de Datos - Sistema Barbería

Esta carpeta contiene todos los scripts SQL necesarios para configurar y gestionar la base de datos del sistema de barbería en Supabase.

## 📋 Archivos Disponibles

### 🔧 Scripts Principales (SQL)

| Archivo | Propósito | Cuándo Usar |
|---------|-----------|-------------|
| `complete-database-setup.sql` | Setup completo inicial | Primera vez - crea toda la estructura |
| `create-new-barbershop.sql` | Crear nueva barbería | Para cada nueva barbería cliente |
| `verify-database.sql` | Verificar configuración | Después de cualquier setup |

### 🛠️ Scripts PowerShell (Opcionales)

| Archivo | Propósito | Cuándo Usar |
|---------|-----------|-------------|
| `setup-database.ps1` | Generador automático | Para generar archivos personalizados |
| `quick-setup.ps1` | Setup interactivo | Si prefieres interfaz guiada |
| `verify-database.ps1` | Verificador con API | Para verificar conexión completa |

## 🚀 Guía de Uso Rápido

### 1️⃣ Setup Inicial (Solo Una Vez)

```sql
-- 1. Abrir Supabase SQL Editor
-- 2. Copiar y pegar complete-database-setup.sql
-- 3. Ejecutar (Ctrl+Enter)
-- 4. Esperar mensaje de éxito
```

**Esto crea:**
- ✅ 7 tablas con relaciones
- ✅ Índices optimizados  
- ✅ Row Level Security (RLS)
- ✅ Funciones automáticas
- ✅ Triggers de auditoría
- ✅ Vistas para reportes

### 2️⃣ Crear Nueva Barbería

```sql
-- 1. Abrir create-new-barbershop.sql
-- 2. PERSONALIZAR datos en la sección "CONFIGURAR AQUÍ"
-- 3. Cambiar: nombre, email, teléfono, dirección
-- 4. Ejecutar en Supabase SQL Editor
-- 5. Anotar el email usado (necesario para Auth)
```

**Datos creados automáticamente:**
- 🏪 1 Barbería con tu información
- 💄 6 Tipos de servicios predeterminados  
- 👨‍💼 2 Barberos de ejemplo
- 👥 3 Clientes de ejemplo
- 📅 3 Citas de ejemplo
- ⚙️ Configuración inicial

### 3️⃣ Crear Usuario Auth

```bash
# En Supabase Dashboard:
# 1. Ir a Authentication > Users
# 2. Click "Add user"
# 3. Email: usar el MISMO email de la barbería
# 4. Password: generar uno seguro
# 5. Email Confirmed: ✅ Marcar como confirmado
```

### 4️⃣ Verificar Todo

```sql
-- 1. Ejecutar verify-database.sql
-- 2. Revisar que todos los ✅ estén en verde
-- 3. Si hay ❌, revisar pasos anteriores
```

## 📝 Ejemplo Paso a Paso

### Para Barbería "Corte & Estilo"

**1. Setup inicial:**
```sql
-- Ejecutar complete-database-setup.sql (solo la primera vez)
```

**2. Personalizar create-new-barbershop.sql:**
```sql
-- Cambiar estas líneas en el archivo:
barbershop_name VARCHAR(200) := 'Corte & Estilo';
barbershop_email VARCHAR(200) := 'admin@corteestilo.com';
barbershop_phone VARCHAR(20) := '+506 2555-1234';
barbershop_address TEXT := 'Cartago Centro, Costa Rica';
```

**3. Ejecutar el script personalizado**

**4. Crear usuario Auth:**
- Email: `admin@corteestilo.com`
- Password: `CorteSeguro123!`
- ✅ Confirmed

**5. Configurar .env:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_aqui
```

## ⚡ Scripts Automáticos (Windows)

Si prefieres una interfaz más fácil:

```powershell
# Setup interactivo
.\quick-setup.ps1

# Te preguntará:
# - Nombre de barbería
# - Email admin  
# - URL Supabase
# - Clave Supabase
```

## 🔍 Solución de Problemas

### ❌ "Tabla no existe"
```sql
-- Ejecutar primero complete-database-setup.sql
```

### ❌ "Email ya existe"
```sql
-- Cambiar el email en create-new-barbershop.sql
-- O eliminar barbería existente
```

### ❌ "RLS activado pero sin acceso"
```sql
-- Verificar que el usuario Auth tenga el mismo email
-- que la barbería en la tabla barbershops
```

### ❌ "No se pueden insertar datos"
```sql
-- Verificar que las políticas RLS estén correctas
-- Ejecutar verify-database.sql para diagnóstico
```

## 📊 Estructura de Datos Creada

### Tablas Principales:
- **barbershops**: Información de cada barbería (tenant)
- **barbers**: Barberos por barbería
- **service_types**: Servicios disponibles
- **clients**: Clientes por barbería
- **appointments**: Citas programadas
- **reports**: Reportes generados
- **barbershop_settings**: Configuraciones

### Vistas Útiles:
- **barbershop_stats**: Estadísticas por barbería
- **today_appointments**: Citas del día actual
- **frequent_clients**: Clientes frecuentes

## 🎯 Datos de Ejemplo Incluidos

Cada barbería nueva incluye:

### Servicios:
- Corte Clásico (₡8,000 - 30min)
- Corte + Barba (₡12,000 - 45min)
- Solo Barba (₡5,000 - 20min)
- Corte Premium (₡15,000 - 45min)
- Rapado (₡6,000 - 15min)
- Corte + Lavado (₡10,000 - 40min)

### Barberos:
- Carlos Méndez (Especialista en clásicos)
- Jorge Ramírez (Estilos modernos)

### Clientes:
- Juan Pérez, María González, Pedro Rodríguez

### Citas:
- 3 citas de ejemplo para los próximos días

## 🔐 Seguridad (RLS)

Cada barbería solo puede ver sus propios datos:
- ✅ Aislamiento total entre barberías
- ✅ Autenticación basada en email
- ✅ Políticas automáticas de acceso
- ✅ No hay cruce de información

## 🆘 Soporte

Si tienes problemas:

1. **Ejecutar verificación:**
   ```sql
   -- Usar verify-database.sql
   ```

2. **Revisar logs de Supabase:**
   - Dashboard > Logs > Database

3. **Validar usuario Auth:**
   - Dashboard > Authentication > Users

4. **Contactar soporte:**
   - Incluir mensaje de error completo
   - Especificar qué script estás ejecutando

---

## 📈 Escalabilidad

Este diseño soporta:
- ✅ Múltiples barberías independientes
- ✅ Miles de citas por barbería
- ✅ Reportes en tiempo real
- ✅ Backup automático (Supabase)
- ✅ Escalamiento horizontal

**¡Perfecto para tu estrategia multi-deploy!** 🚀