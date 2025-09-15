# Script PowerShell para setup automático de base de datos Supabase
# Uso: .\setup-database.ps1 -BarbershopName "Barber Magic" -Email "admin@barbermagic.com" -SupabaseUrl "https://abc.supabase.co" -SupabaseKey "eyJ..."

param(
    [Parameter(Mandatory=$true)]
    [string]$BarbershopName,
    
    [Parameter(Mandatory=$true)]
    [string]$Email,
    
    [Parameter(Mandatory=$true)]
    [string]$SupabaseUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$SupabaseKey
)

# Función para limpiar nombre
function Get-SafeName {
    param([string]$name)
    return $name.ToLower() -replace '[^a-z0-9]', '-' -replace '--+', '-' -replace '-$', ''
}

$SafeName = Get-SafeName -name $BarbershopName
$SetupDate = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"

Write-Host "🗄️  SETUP AUTOMÁTICO DE BASE DE DATOS" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "🏪 Barbería: $BarbershopName" -ForegroundColor Green
Write-Host "📧 Email: $Email" -ForegroundColor Green
Write-Host "🔗 URL: $SupabaseUrl" -ForegroundColor Green
Write-Host "🆔 Proyecto: $SafeName" -ForegroundColor Green
Write-Host ""

# Crear directorio
$OutputDir = "database-setups\$SafeName"
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

Write-Host "📝 Generando SQL personalizado..." -ForegroundColor Yellow

# Generar SQL completo
$SqlContent = @"
-- ===================================================================
-- SETUP COMPLETO DE BASE DE DATOS - $BarbershopName
-- ===================================================================
-- Generado automáticamente el: $SetupDate
-- Barbería: $BarbershopName
-- Email: $Email
-- ===================================================================

-- 1. HABILITAR EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREAR TABLAS
-- ===================================================================

-- Tabla de barberías
CREATE TABLE IF NOT EXISTS barbershops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(200) NOT NULL,
    email VARCHAR(200) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    direccion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de barberos
CREATE TABLE IF NOT EXISTS barbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    telefono VARCHAR(20),
    especialidad TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    telefono VARCHAR(20),
    email VARCHAR(200),
    fecha_nacimiento DATE,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de citas
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    barber_id UUID REFERENCES barbers(id),
    client_id UUID REFERENCES clients(id),
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    tipo_servicio VARCHAR(50) DEFAULT 'corte',
    duracion_minutos INTEGER DEFAULT 30,
    precio DECIMAL(10,2),
    estado VARCHAR(20) DEFAULT 'programada',
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_estado CHECK (estado IN ('programada', 'confirmada', 'completada', 'cancelada')),
    CONSTRAINT valid_tipo_servicio CHECK (tipo_servicio IN ('corte', 'corte_barba'))
);

-- Tabla de reportes (opcional)
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    tipo_reporte VARCHAR(50) NOT NULL,
    fecha_inicio DATE,
    fecha_fin DATE,
    datos JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CREAR ÍNDICES PARA PERFORMANCE
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_barbers_barbershop_id ON barbers(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_clients_barbershop_id ON clients(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_barbershop_id ON appointments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_fecha ON appointments(fecha);
CREATE INDEX IF NOT EXISTS idx_appointments_barber_id ON appointments(barber_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);

-- 4. CREAR TRIGGERS PARA UPDATED_AT
-- ===================================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS `$`$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
`$`$ language 'plpgsql';

-- Triggers para todas las tablas
DROP TRIGGER IF EXISTS update_barbershops_updated_at ON barbershops;
CREATE TRIGGER update_barbershops_updated_at 
    BEFORE UPDATE ON barbershops 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_barbers_updated_at ON barbers;
CREATE TRIGGER update_barbers_updated_at 
    BEFORE UPDATE ON barbers 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at 
    BEFORE UPDATE ON clients 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON appointments 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 5. CONFIGURAR ROW LEVEL SECURITY (RLS)
-- ===================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Políticas para barbershops (solo pueden ver su propia barbería)
DROP POLICY IF EXISTS "Barbershops can view own data" ON barbershops;
CREATE POLICY "Barbershops can view own data" ON barbershops
    FOR ALL USING (auth.jwt() ->> 'email' = email);

-- Políticas para barbers (solo barberos de la misma barbería)
DROP POLICY IF EXISTS "Barbers can view own barbershop data" ON barbers;
CREATE POLICY "Barbers can view own barbershop data" ON barbers
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Políticas para clients (solo clientes de la misma barbería)
DROP POLICY IF EXISTS "Clients can view own barbershop data" ON clients;
CREATE POLICY "Clients can view own barbershop data" ON clients
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Políticas para appointments (solo citas de la misma barbería)
DROP POLICY IF EXISTS "Appointments can view own barbershop data" ON appointments;
CREATE POLICY "Appointments can view own barbershop data" ON appointments
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Políticas para reports (solo reportes de la misma barbería)
DROP POLICY IF EXISTS "Reports can view own barbershop data" ON reports;
CREATE POLICY "Reports can view own barbershop data" ON reports
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- 6. INSERTAR DATOS DE LA BARBERÍA
-- ===================================================================

-- Insertar barbería principal
INSERT INTO barbershops (nombre, email, telefono, direccion) 
VALUES (
    '$BarbershopName',
    '$Email', 
    '+506 2222-2222',
    'San José, Costa Rica'
) ON CONFLICT (email) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    telefono = EXCLUDED.telefono,
    direccion = EXCLUDED.direccion;

-- Obtener el ID de la barbería (para referencia)
DO `$`$
DECLARE
    barbershop_uuid UUID;
    barber1_uuid UUID;
    barber2_uuid UUID;
    client1_uuid UUID;
    client2_uuid UUID;
    client3_uuid UUID;
BEGIN
    -- Obtener ID de la barbería
    SELECT id INTO barbershop_uuid FROM barbershops WHERE email = '$Email';
    
    -- Insertar barberos de ejemplo
    INSERT INTO barbers (barbershop_id, nombre, telefono, especialidad, activo) 
    VALUES 
        (barbershop_uuid, 'Carlos Méndez', '+506 8888-1111', 'Cortes clásicos y barba', true),
        (barbershop_uuid, 'Jorge Ramírez', '+506 8888-2222', 'Estilos modernos y colorimetría', true)
    ON CONFLICT DO NOTHING;
    
    -- Obtener IDs de barberos para las citas de ejemplo
    SELECT id INTO barber1_uuid FROM barbers WHERE barbershop_id = barbershop_uuid AND nombre = 'Carlos Méndez';
    SELECT id INTO barber2_uuid FROM barbers WHERE barbershop_id = barbershop_uuid AND nombre = 'Jorge Ramírez';
    
    -- Insertar clientes de ejemplo
    INSERT INTO clients (barbershop_id, nombre, telefono, email) 
    VALUES 
        (barbershop_uuid, 'Juan Pérez', '+506 7777-1111', 'juan@email.com'),
        (barbershop_uuid, 'María González', '+506 7777-2222', 'maria@email.com'),
        (barbershop_uuid, 'Pedro Rodríguez', '+506 7777-3333', 'pedro@email.com')
    ON CONFLICT DO NOTHING;
    
    -- Obtener IDs de clientes
    SELECT id INTO client1_uuid FROM clients WHERE barbershop_id = barbershop_uuid AND nombre = 'Juan Pérez';
    SELECT id INTO client2_uuid FROM clients WHERE barbershop_id = barbershop_uuid AND nombre = 'María González';
    SELECT id INTO client3_uuid FROM clients WHERE barbershop_id = barbershop_uuid AND nombre = 'Pedro Rodríguez';
    
    -- Insertar citas de ejemplo (solo si los UUIDs existen)
    IF barber1_uuid IS NOT NULL AND client1_uuid IS NOT NULL THEN
        INSERT INTO appointments (barbershop_id, barber_id, client_id, fecha, hora, tipo_servicio, duracion_minutos, precio, estado)
        VALUES 
            (barbershop_uuid, barber1_uuid, client1_uuid, CURRENT_DATE + 1, '10:00', 'corte', 30, 15000, 'programada'),
            (barbershop_uuid, barber1_uuid, client2_uuid, CURRENT_DATE + 1, '14:00', 'corte_barba', 60, 25000, 'confirmada'),
            (barbershop_uuid, barber2_uuid, client3_uuid, CURRENT_DATE + 2, '09:00', 'corte', 30, 15000, 'programada')
        ON CONFLICT DO NOTHING;
    END IF;
    
END `$`$;

-- 7. VERIFICACIÓN FINAL
-- ===================================================================

-- Mostrar resumen de lo creado
SELECT 
    'SETUP COMPLETADO EXITOSAMENTE' as status,
    (SELECT COUNT(*) FROM barbershops WHERE email = '$Email') as barberias_creadas,
    (SELECT COUNT(*) FROM barbers WHERE barbershop_id = (SELECT id FROM barbershops WHERE email = '$Email')) as barberos_creados,
    (SELECT COUNT(*) FROM clients WHERE barbershop_id = (SELECT id FROM barbershops WHERE email = '$Email')) as clientes_creados,
    (SELECT COUNT(*) FROM appointments WHERE barbershop_id = (SELECT id FROM barbershops WHERE email = '$Email')) as citas_creadas;

-- ===================================================================
-- SETUP COMPLETADO PARA: $BarbershopName
-- ===================================================================
-- ✅ Tablas creadas con RLS activado
-- ✅ Barbería insertada: $BarbershopName ($Email)
-- ✅ Barberos de ejemplo creados
-- ✅ Clientes de ejemplo creados  
-- ✅ Citas de ejemplo creadas
-- ✅ Sistema listo para usar
-- 
-- 🔑 PRÓXIMO PASO: Crear usuario en Supabase Auth con email: $Email
-- ===================================================================
"@

# Guardar SQL
$SqlContent | Out-File -FilePath "$OutputDir\complete-setup.sql" -Encoding UTF8
Write-Host "✅ SQL generado: $OutputDir\complete-setup.sql" -ForegroundColor Green

# Generar configuración JSON
$ConfigContent = @"
{
  "barbershop_name": "$BarbershopName",
  "barbershop_email": "$Email", 
  "safe_name": "$SafeName",
  "supabase_url": "$SupabaseUrl",
  "supabase_key": "***HIDDEN***",
  "setup_date": "$SetupDate",
  "database_files": {
    "setup": "complete-setup.sql",
    "verify": "verify-setup.sql"
  },
  "next_steps": [
    "1. Ejecutar complete-setup.sql en Supabase SQL Editor",
    "2. Crear usuario Auth con email: $Email", 
    "3. Ejecutar verify-setup.sql para verificar",
    "4. Configurar variables de entorno en el deploy",
    "5. Probar login y funcionalidades"
  ]
}
"@

$ConfigContent | Out-File -FilePath "$OutputDir\config.json" -Encoding UTF8
Write-Host "✅ Config guardada: $OutputDir\config.json" -ForegroundColor Green

# Generar README
$ReadmeContent = @"
# 🗄️ Setup de Base de Datos - $BarbershopName

## 📋 Información del Proyecto
- **Barbería**: $BarbershopName
- **Email**: $Email
- **Proyecto**: $SafeName
- **Fecha**: $SetupDate

## 🚀 Pasos de Instalación

### 1. Ejecutar Setup Principal
1. Abrir Supabase SQL Editor
2. Copiar y pegar el contenido de: ``complete-setup.sql``
3. Ejecutar (Ctrl+Enter)

### 2. Crear Usuario de Autenticación
1. Ir a Supabase Auth > Users
2. Crear nuevo usuario:
   - **Email**: $Email
   - **Password**: [Generar password seguro]
   - **Email Confirmed**: ✅ Sí

### 3. Configurar Variables de Entorno
``````env
NEXT_PUBLIC_SUPABASE_URL=$SupabaseUrl
NEXT_PUBLIC_SUPABASE_ANON_KEY=[TU_SUPABASE_KEY]
``````

## ✅ Verificación Final
- [ ] Tablas creadas correctamente
- [ ] RLS activado en todas las tablas
- [ ] Usuario Auth creado
- [ ] Datos de ejemplo insertados
- [ ] Login funcional
- [ ] Citas se pueden crear

## 📊 Datos Creados
- **Barbería**: $BarbershopName
- **Barberos**: 2 (Carlos Méndez, Jorge Ramírez)
- **Clientes**: 3 (Juan, María, Pedro)
- **Citas**: 3 citas de ejemplo

---
**Generado automáticamente por setup-database.ps1**
"@

$ReadmeContent | Out-File -FilePath "$OutputDir\README.md" -Encoding UTF8
Write-Host "✅ README creado: $OutputDir\README.md" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 SETUP DE BASE DE DATOS COMPLETADO" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "📁 Archivos generados en: $OutputDir" -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 PRÓXIMOS PASOS:" -ForegroundColor Cyan
Write-Host "1. 📄 Copiar contenido de 'complete-setup.sql' y ejecutar en Supabase SQL Editor" -ForegroundColor White
Write-Host "2. 👤 Crear usuario Auth en Supabase con email: $Email" -ForegroundColor White
Write-Host "3. 🚀 Configurar variables de entorno en tu deploy" -ForegroundColor White
Write-Host ""
Write-Host "📖 Ver README completo: $OutputDir\README.md" -ForegroundColor Yellow

# Abrir carpeta en el explorador
Start-Process explorer.exe -ArgumentList $OutputDir