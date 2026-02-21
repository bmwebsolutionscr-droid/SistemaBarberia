-- ===================================================================
-- SCRIPT COMPLETO DE MIGRACIÓN - SISTEMA DE BARBERÍA
-- ===================================================================
-- Este script contiene TODA la configuración necesaria para migrar
-- o recrear la base de datos completa del sistema de barbería
-- Incluye todas las correcciones y mejoras implementadas

-- VERSIÓN: 2.0 (Actualizada con teléfono opcional)
-- FECHA: Septiembre 2025
-- COMPATIBLE CON: Supabase PostgreSQL

-- ===================================================================
-- 1. EXTENSIONES NECESARIAS
-- ===================================================================

-- Crear extensión para UUID si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===================================================================
-- 2. LIMPIAR BASE DE DATOS (SOLO SI ES NECESARIO)
-- ===================================================================

-- DESCOMENTA ESTAS LÍNEAS SOLO SI QUIERES BORRAR TODO Y EMPEZAR DE CERO
/*
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS barbers CASCADE;
DROP TABLE IF EXISTS barbershops CASCADE;
DROP TYPE IF EXISTS appointment_status CASCADE;
*/

-- ===================================================================
-- 3. CREAR TIPOS ENUMERADOS
-- ===================================================================

-- Tipo para el estado de las citas
CREATE TYPE appointment_status AS ENUM ('programada', 'confirmada', 'cancelada', 'completada');

-- Tipo para tipo de servicio
-- Nota: se omite la creación del tipo ENUM `service_type` para permitir tipos de servicio dinámicos.
-- Si ya existe en la base de datos, evitar recrearlo. Usamos VARCHAR en la tabla `appointments`.

-- ===================================================================
-- 4. CREAR TABLAS PRINCIPALES
-- ===================================================================

-- Tabla principal: Barberías
CREATE TABLE barbershops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    direccion TEXT,
    activo BOOLEAN DEFAULT true,
    -- Configuración de horarios
    hora_apertura TIME DEFAULT '08:00',
    hora_cierre TIME DEFAULT '18:00',
    dias_laborales TEXT[] DEFAULT ARRAY['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'],
    -- Configuración de servicios
    duracion_cita INTEGER DEFAULT 30,
    duracion_corte_barba INTEGER DEFAULT 60,
    -- Configuración de precios
    precio_corte_adulto DECIMAL(10,2) DEFAULT 5000.00,
    precio_corte_nino DECIMAL(10,2) DEFAULT 3500.00,
    precio_barba DECIMAL(10,2) DEFAULT 3000.00,
    precio_combo DECIMAL(10,2) DEFAULT 8000.00,
    -- Configuración de WhatsApp
    whatsapp_activo BOOLEAN DEFAULT false,
    whatsapp_numero VARCHAR(20),
    -- Configuración de cancelaciones
    tiempo_cancelacion INTEGER DEFAULT 120, -- minutos
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: Barberos (empleados de cada barbería)
CREATE TABLE barbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    especialidad VARCHAR(255),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: Clientes (por barbería) - TELÉFONO OPCIONAL
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(20), -- OPCIONAL - Sin restricción NOT NULL
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: Citas
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    duracion_minutos INTEGER DEFAULT 30,
    tipo_servicio VARCHAR(50) DEFAULT 'corte',
    precio DECIMAL(10,2),
    estado appointment_status DEFAULT 'programada',
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: Reportes (para almacenar reportes generados)
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    barber_id UUID REFERENCES barbers(id) ON DELETE SET NULL,
    periodo_inicio DATE NOT NULL,
    periodo_fin DATE NOT NULL,
    tipo_reporte VARCHAR(50) NOT NULL,
    datos JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================================
-- 5. CREAR ÍNDICES PARA OPTIMIZACIÓN
-- ===================================================================

-- Índices principales para mejores consultas
CREATE INDEX idx_barbershops_email ON barbershops(email);
CREATE INDEX idx_barbers_barbershop ON barbers(barbershop_id);
CREATE INDEX idx_clients_barbershop ON clients(barbershop_id);
CREATE INDEX idx_appointments_barbershop ON appointments(barbershop_id);
CREATE INDEX idx_appointments_barber ON appointments(barber_id);
CREATE INDEX idx_appointments_client ON appointments(client_id);
CREATE INDEX idx_appointments_fecha ON appointments(fecha);
CREATE INDEX idx_appointments_fecha_hora ON appointments(fecha, hora);
CREATE INDEX idx_appointments_estado ON appointments(estado);

-- Índice único condicional para teléfonos no vacíos (previene duplicados)
CREATE UNIQUE INDEX idx_clients_phone_unique
ON clients (barbershop_id, telefono) 
WHERE telefono IS NOT NULL AND telefono != '';

-- Índice para reportes
CREATE INDEX idx_reports_barbershop ON reports(barbershop_id);
CREATE INDEX idx_reports_periodo ON reports(periodo_inicio, periodo_fin);

-- ===================================================================
-- 6. CONFIGURAR ROW LEVEL SECURITY (RLS)
-- ===================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Políticas para barbershops (solo pueden ver su propia barbería)
CREATE POLICY "Barbershops can view own data" ON barbershops
    FOR ALL USING (auth.jwt() ->> 'email' = email);

-- Políticas para barbers (solo barberos de la misma barbería)
CREATE POLICY "Barbers can view own barbershop data" ON barbers
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Políticas para clients (solo clientes de la misma barbería)
CREATE POLICY "Clients can view own barbershop data" ON clients
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Políticas para appointments (solo citas de la misma barbería)
CREATE POLICY "Appointments can view own barbershop data" ON appointments
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Políticas para reports (solo reportes de la misma barbería)
CREATE POLICY "Reports can view own barbershop data" ON reports
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- ===================================================================
-- 7. FUNCIONES Y TRIGGERS PARA ACTUALIZACIONES AUTOMÁTICAS
-- ===================================================================

-- Función para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at en todas las tablas
CREATE TRIGGER update_barbershops_updated_at BEFORE UPDATE ON barbershops 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_barbers_updated_at BEFORE UPDATE ON barbers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- 8. INSERTAR DATOS DE PRUEBA - BARBERÍA DEMO
-- ===================================================================

-- Insertar barbería de demostración
INSERT INTO barbershops (
    nombre, 
    email, 
    telefono, 
    direccion,
    hora_apertura,
    hora_cierre,
    dias_laborales,
    duracion_cita,
    duracion_corte_barba,
    precio_corte_adulto,
    precio_corte_nino,
    precio_barba,
    precio_combo,
    whatsapp_activo,
    whatsapp_numero,
    tiempo_cancelacion
) VALUES (
    'Barber Magic Demo',
    'demo@barbermagic.com',
    '+506 2222-1111',
    'San José, Costa Rica - Centro',
    '08:00',
    '18:00',
    ARRAY['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'],
    30,
    60,
    5000.00,
    3500.00,
    3000.00,
    8000.00,
    true,
    '+506 8888-9999',
    120
);

-- Insertar datos de prueba usando DO block
DO $$
DECLARE
    barbershop_id_var UUID;
    barber1_id UUID;
    barber2_id UUID;
    barber3_id UUID;
    client1_id UUID;
    client2_id UUID;
    client3_id UUID;
    client4_id UUID;
    client5_id UUID;
BEGIN
    -- Obtener el ID de la barbería demo
    SELECT id INTO barbershop_id_var FROM barbershops WHERE email = 'demo@barbermagic.com';
    
    -- Insertar barberos de prueba
    INSERT INTO barbers (barbershop_id, nombre, telefono, especialidad, activo) VALUES
    (barbershop_id_var, 'Carlos Mendez', '+506 8888-1234', 'Cortes clásicos y barba', true),
    (barbershop_id_var, 'Jorge Ramirez', '+506 8888-5678', 'Colorimetría y estilos modernos', true),
    (barbershop_id_var, 'Mario Rodriguez', '+506 8888-9012', 'Cortes infantiles y adulto mayor', true);
    
    -- Obtener IDs de barberos
    SELECT id INTO barber1_id FROM barbers WHERE nombre = 'Carlos Mendez' AND barbershop_id = barbershop_id_var;
    SELECT id INTO barber2_id FROM barbers WHERE nombre = 'Jorge Ramirez' AND barbershop_id = barbershop_id_var;
    SELECT id INTO barber3_id FROM barbers WHERE nombre = 'Mario Rodriguez' AND barbershop_id = barbershop_id_var;
    
    -- Insertar clientes de prueba (algunos CON teléfono, otros SIN teléfono)
    INSERT INTO clients (barbershop_id, nombre, telefono, email) VALUES
    (barbershop_id_var, 'Juan Pérez', '+506 8899-1111', 'juan.perez@email.com'),
    (barbershop_id_var, 'María González', '+506 8899-2222', 'maria.gonzalez@email.com'),
    (barbershop_id_var, 'Luis Morales', NULL, 'luis.morales@email.com'), -- Sin teléfono
    (barbershop_id_var, 'Ana Castro', '+506 8899-4444', 'ana.castro@email.com'),
    (barbershop_id_var, 'Pedro Sin Número', NULL, NULL), -- Sin teléfono ni email
    (barbershop_id_var, 'Carmen Silva', '+506 8899-6666', 'carmen.silva@email.com'),
    (barbershop_id_var, 'Roberto Vargas', NULL, 'roberto.vargas@email.com'), -- Sin teléfono
    (barbershop_id_var, 'Sandra López', '+506 8899-8888', 'sandra.lopez@email.com');
    
    -- Obtener IDs de algunos clientes para las citas
    SELECT id INTO client1_id FROM clients WHERE nombre = 'Juan Pérez' AND barbershop_id = barbershop_id_var;
    SELECT id INTO client2_id FROM clients WHERE nombre = 'María González' AND barbershop_id = barbershop_id_var;
    SELECT id INTO client3_id FROM clients WHERE nombre = 'Luis Morales' AND barbershop_id = barbershop_id_var;
    SELECT id INTO client4_id FROM clients WHERE nombre = 'Ana Castro' AND barbershop_id = barbershop_id_var;
    SELECT id INTO client5_id FROM clients WHERE nombre = 'Pedro Sin Número' AND barbershop_id = barbershop_id_var;
    
    -- Insertar citas de prueba
    INSERT INTO appointments (barbershop_id, barber_id, client_id, fecha, hora, duracion_minutos, tipo_servicio, estado, precio, notas) VALUES
    -- Citas de HOY
    (barbershop_id_var, barber1_id, client1_id, CURRENT_DATE, '09:00', 30, 'corte', 'confirmada', 5000, 'Cliente con teléfono - Corte regular'),
    (barbershop_id_var, barber1_id, client3_id, CURRENT_DATE, '10:30', 30, 'corte', 'programada', 5000, 'Cliente SIN teléfono - Corte normal'),
    (barbershop_id_var, barber2_id, client2_id, CURRENT_DATE, '14:00', 60, 'corte_barba', 'confirmada', 8000, 'Corte + barba completo'),
    (barbershop_id_var, barber3_id, client5_id, CURRENT_DATE, '16:00', 30, 'corte', 'programada', 5000, 'Cliente sin teléfono ni email'),
    
    -- Citas de MAÑANA
    (barbershop_id_var, barber1_id, client4_id, CURRENT_DATE + INTERVAL '1 day', '09:30', 60, 'corte_barba', 'programada', 8000, 'Cita de mañana - combo'),
    (barbershop_id_var, barber2_id, client1_id, CURRENT_DATE + INTERVAL '1 day', '11:00', 30, 'corte', 'programada', 5000, 'Seguimiento cliente regular'),
    
    -- Citas de PASADO MAÑANA
    (barbershop_id_var, barber3_id, client2_id, CURRENT_DATE + INTERVAL '2 days', '15:30', 30, 'corte', 'programada', 5000, 'Cita futura'),
    
    -- Algunas citas completadas (historial)
    (barbershop_id_var, barber1_id, client1_id, CURRENT_DATE - INTERVAL '1 day', '10:00', 30, 'corte', 'completada', 5000, 'Cita completada ayer'),
    (barbershop_id_var, barber2_id, client2_id, CURRENT_DATE - INTERVAL '2 days', '14:30', 60, 'corte_barba', 'completada', 8000, 'Corte + barba hace 2 días');
    
    RAISE NOTICE 'Datos de prueba insertados exitosamente para barbería: %', barbershop_id_var;
END $$;

-- ===================================================================
-- 9. VERIFICACIÓN DE LA INSTALACIÓN
-- ===================================================================

-- Verificar que todas las tablas se crearon correctamente
SELECT 'TABLAS CREADAS:' as info;
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('barbershops', 'barbers', 'clients', 'appointments', 'reports')
ORDER BY tablename;

-- Verificar que los tipos se crearon correctamente
SELECT 'TIPOS CREADOS:' as info;
SELECT 
    typname as tipo,
    typtype as categoria
FROM pg_type 
WHERE typname IN ('appointment_status', 'service_type');

-- Verificar que los índices se crearon correctamente
SELECT 'ÍNDICES CREADOS:' as info;
SELECT 
    indexname,
    tablename
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('barbershops', 'barbers', 'clients', 'appointments', 'reports')
ORDER BY tablename, indexname;

-- Verificar estructura de la tabla clients (teléfono opcional)
SELECT 'ESTRUCTURA TABLA CLIENTS:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'clients' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar datos de prueba insertados
SELECT 'BARBERÍA DEMO CREADA:' as info;
SELECT 
    id,
    nombre,
    email,
    telefono,
    activo
FROM barbershops 
WHERE email = 'demo@barbermagic.com';

SELECT 'BARBEROS INSERTADOS:' as info;
SELECT 
    b.nombre as barbero,
    b.especialidad,
    bs.nombre as barberia
FROM barbers b
JOIN barbershops bs ON b.barbershop_id = bs.id
WHERE bs.email = 'demo@barbermagic.com';

SELECT 'CLIENTES INSERTADOS (incluye sin teléfono):' as info;
SELECT 
    nombre,
    COALESCE(telefono, '-- SIN TELÉFONO --') as telefono,
    COALESCE(email, '-- SIN EMAIL --') as email
FROM clients c
JOIN barbershops bs ON c.barbershop_id = bs.id
WHERE bs.email = 'demo@barbermagic.com'
ORDER BY nombre;

SELECT 'CITAS DE PRUEBA:' as info;
SELECT 
    a.fecha,
    a.hora,
    c.nombre as cliente,
    b.nombre as barbero,
    a.tipo_servicio,
    a.estado,
    a.precio
FROM appointments a
JOIN clients c ON a.client_id = c.id
JOIN barbers b ON a.barber_id = b.id
JOIN barbershops bs ON a.barbershop_id = bs.id
WHERE bs.email = 'demo@barbermagic.com'
ORDER BY a.fecha DESC, a.hora;

-- ===================================================================
-- 10. INSTRUCCIONES FINALES
-- ===================================================================

SELECT '🎉 INSTALACIÓN COMPLETADA EXITOSAMENTE' as resultado;
SELECT '📋 PRÓXIMOS PASOS:' as instrucciones;
SELECT '1. Ve a Supabase Dashboard > Authentication > Users' as paso_1;
SELECT '2. Crea un usuario con email: demo@barbermagic.com' as paso_2;
SELECT '3. Contraseña sugerida: Demo123!' as paso_3;
SELECT '4. Inicia sesión en la aplicación con esas credenciales' as paso_4;
SELECT '5. ¡El sistema está listo para usar!' as paso_5;

-- ===================================================================
-- NOTAS IMPORTANTES
-- ===================================================================

SELECT '📝 CARACTERÍSTICAS INCLUIDAS:' as notas;
SELECT '✅ Teléfono opcional para clientes' as feature_1;
SELECT '✅ Múltiples barberos por barbería' as feature_2;  
SELECT '✅ Tipos de servicio (corte, corte+barba)' as feature_3;
SELECT '✅ Sistema de horarios inteligente' as feature_4;
SELECT '✅ Row Level Security configurado' as feature_5;
SELECT '✅ Índices optimizados para rendimiento' as feature_6;
SELECT '✅ Datos de prueba completos' as feature_7;
SELECT '✅ Configuración WhatsApp incluida' as feature_8;

-- ===================================================================
-- FIN DEL SCRIPT
-- ===================================================================
