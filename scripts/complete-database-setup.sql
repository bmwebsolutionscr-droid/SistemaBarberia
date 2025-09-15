-- ===================================================================
-- SETUP COMPLETO DE BASE DE DATOS PARA SISTEMA DE BARBERÍA
-- ===================================================================
-- Versión: 2.0
-- Fecha: 2025-09-15
-- Descripción: Script completo para configurar base de datos multi-tenant
-- Uso: Copiar y pegar en Supabase SQL Editor y ejecutar
-- ===================================================================

-- 1. LIMPIAR BASE DE DATOS (OPCIONAL - DESCOMENTA SI QUIERES RESET)
-- ===================================================================

-- DROP TABLE IF EXISTS reports CASCADE;
-- DROP TABLE IF EXISTS appointments CASCADE;
-- DROP TABLE IF EXISTS clients CASCADE;
-- DROP TABLE IF EXISTS barbers CASCADE;
-- DROP TABLE IF EXISTS barbershops CASCADE;
-- DROP FUNCTION IF EXISTS update_updated_at_column();

-- 2. HABILITAR EXTENSIONES NECESARIAS
-- ===================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 3. CREAR TABLAS PRINCIPALES
-- ===================================================================

-- Tabla de barberías (tenant principal)
CREATE TABLE IF NOT EXISTS barbershops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(200) NOT NULL,
    email VARCHAR(200) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    direccion TEXT,
    ciudad VARCHAR(100),
    codigo_postal VARCHAR(10),
    descripcion TEXT,
    logo_url TEXT,
    colores_tema JSONB DEFAULT '{"primary": "#3B82F6", "secondary": "#1F2937"}',
    configuracion JSONB DEFAULT '{"zona_horaria": "America/Costa_Rica", "moneda": "CRC", "idioma": "es"}',
    activo BOOLEAN DEFAULT true,
    plan VARCHAR(20) DEFAULT 'basico',
    fecha_suscripcion DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_plan CHECK (plan IN ('basico', 'premium', 'enterprise'))
);

-- Tabla de barberos
CREATE TABLE IF NOT EXISTS barbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    apellido VARCHAR(200),
    telefono VARCHAR(20),
    email VARCHAR(200),
    especialidad TEXT,
    descripcion TEXT,
    foto_url TEXT,
    horario JSONB DEFAULT '{"lunes": {"inicio": "08:00", "fin": "17:00", "activo": true}, "martes": {"inicio": "08:00", "fin": "17:00", "activo": true}, "miercoles": {"inicio": "08:00", "fin": "17:00", "activo": true}, "jueves": {"inicio": "08:00", "fin": "17:00", "activo": true}, "viernes": {"inicio": "08:00", "fin": "17:00", "activo": true}, "sabado": {"inicio": "08:00", "fin": "15:00", "activo": true}, "domingo": {"inicio": "10:00", "fin": "14:00", "activo": false}}',
    comision_porcentaje DECIMAL(5,2) DEFAULT 0.00,
    salario_base DECIMAL(10,2) DEFAULT 0.00,
    activo BOOLEAN DEFAULT true,
    fecha_contratacion DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de tipos de servicios
CREATE TABLE IF NOT EXISTS service_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    duracion_minutos INTEGER NOT NULL DEFAULT 30,
    precio_base DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    activo BOOLEAN DEFAULT true,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_duracion CHECK (duracion_minutos > 0 AND duracion_minutos <= 480),
    CONSTRAINT valid_precio CHECK (precio_base >= 0)
);

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    apellido VARCHAR(200),
    telefono VARCHAR(20),
    email VARCHAR(200),
    fecha_nacimiento DATE,
    genero VARCHAR(10),
    direccion TEXT,
    preferencias JSONB DEFAULT '{}',
    historial_servicios JSONB DEFAULT '[]',
    notas TEXT,
    cliente_frecuente BOOLEAN DEFAULT false,
    descuento_porcentaje DECIMAL(5,2) DEFAULT 0.00,
    puntos_fidelidad INTEGER DEFAULT 0,
    ultima_visita DATE,
    total_visitas INTEGER DEFAULT 0,
    total_gastado DECIMAL(10,2) DEFAULT 0.00,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_genero CHECK (genero IN ('M', 'F', 'Otro', NULL)),
    CONSTRAINT valid_descuento CHECK (descuento_porcentaje >= 0 AND descuento_porcentaje <= 100)
);

-- Tabla de citas
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    barber_id UUID REFERENCES barbers(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    service_type_id UUID REFERENCES service_types(id) ON DELETE SET NULL,
    
    -- Información de la cita
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME,
    duracion_minutos INTEGER DEFAULT 30,
    
    -- Información del servicio (guardado para historial)
    servicio_nombre VARCHAR(100),
    precio_acordado DECIMAL(10,2),
    precio_final DECIMAL(10,2),
    descuento_aplicado DECIMAL(10,2) DEFAULT 0.00,
    
    -- Estado y seguimiento
    estado VARCHAR(20) DEFAULT 'programada',
    estado_pago VARCHAR(20) DEFAULT 'pendiente',
    metodo_pago VARCHAR(20),
    
    -- Información adicional
    notas TEXT,
    notas_barbero TEXT,
    calificacion INTEGER,
    comentario_cliente TEXT,
    
    -- Notificaciones
    recordatorio_enviado BOOLEAN DEFAULT false,
    confirmacion_cliente BOOLEAN DEFAULT false,
    
    -- Timestamps
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_confirmacion TIMESTAMP WITH TIME ZONE,
    fecha_completacion TIMESTAMP WITH TIME ZONE,
    fecha_cancelacion TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_estado CHECK (estado IN ('programada', 'confirmada', 'en_curso', 'completada', 'cancelada', 'no_asistio')),
    CONSTRAINT valid_estado_pago CHECK (estado_pago IN ('pendiente', 'pagado', 'reembolsado')),
    CONSTRAINT valid_metodo_pago CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'sinpe', 'transferencia', NULL)),
    CONSTRAINT valid_calificacion CHECK (calificacion >= 1 AND calificacion <= 5),
    CONSTRAINT valid_duracion CHECK (duracion_minutos > 0 AND duracion_minutos <= 480),
    CONSTRAINT valid_precio CHECK (precio_acordado >= 0 AND precio_final >= 0)
);

-- Tabla de reportes y estadísticas
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    tipo_reporte VARCHAR(50) NOT NULL,
    periodo_inicio DATE,
    periodo_fin DATE,
    filtros JSONB DEFAULT '{}',
    datos JSONB,
    resumen JSONB,
    generado_por VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_tipo_reporte CHECK (tipo_reporte IN ('ventas', 'citas', 'clientes', 'barberos', 'servicios', 'personalizado'))
);

-- Tabla de configuraciones por barbería
CREATE TABLE IF NOT EXISTS barbershop_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE UNIQUE,
    configuracion JSONB DEFAULT '{}',
    whatsapp_config JSONB DEFAULT '{"activo": false, "numero": "", "token": ""}',
    notificaciones_config JSONB DEFAULT '{"email": true, "sms": false, "whatsapp": false}',
    horarios_atencion JSONB DEFAULT '{"lunes": {"inicio": "08:00", "fin": "18:00", "activo": true}, "martes": {"inicio": "08:00", "fin": "18:00", "activo": true}, "miercoles": {"inicio": "08:00", "fin": "18:00", "activo": true}, "jueves": {"inicio": "08:00", "fin": "18:00", "activo": true}, "viernes": {"inicio": "08:00", "fin": "18:00", "activo": true}, "sabado": {"inicio": "08:00", "fin": "16:00", "activo": true}, "domingo": {"inicio": "10:00", "fin": "14:00", "activo": false}}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CREAR ÍNDICES PARA OPTIMIZACIÓN
-- ===================================================================

-- Índices para barbershops
CREATE INDEX IF NOT EXISTS idx_barbershops_email ON barbershops(email);
CREATE INDEX IF NOT EXISTS idx_barbershops_activo ON barbershops(activo);

-- Índices para barbers
CREATE INDEX IF NOT EXISTS idx_barbers_barbershop_id ON barbers(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_barbers_activo ON barbers(barbershop_id, activo);

-- Índices para service_types
CREATE INDEX IF NOT EXISTS idx_service_types_barbershop_id ON service_types(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_service_types_activo ON service_types(barbershop_id, activo);

-- Índices para clients
CREATE INDEX IF NOT EXISTS idx_clients_barbershop_id ON clients(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_clients_telefono ON clients(barbershop_id, telefono);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(barbershop_id, email);
CREATE INDEX IF NOT EXISTS idx_clients_activo ON clients(barbershop_id, activo);

-- Índices para appointments (los más importantes para performance)
CREATE INDEX IF NOT EXISTS idx_appointments_barbershop_id ON appointments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_fecha ON appointments(barbershop_id, fecha);
CREATE INDEX IF NOT EXISTS idx_appointments_barber_fecha ON appointments(barber_id, fecha);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_estado ON appointments(barbershop_id, estado);
CREATE INDEX IF NOT EXISTS idx_appointments_fecha_hora ON appointments(fecha, hora_inicio);

-- Índices para reports
CREATE INDEX IF NOT EXISTS idx_reports_barbershop_id ON reports(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_reports_tipo ON reports(barbershop_id, tipo_reporte);
CREATE INDEX IF NOT EXISTS idx_reports_periodo ON reports(periodo_inicio, periodo_fin);

-- 5. CREAR FUNCIONES Y TRIGGERS
-- ===================================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Función para calcular estadísticas de cliente
CREATE OR REPLACE FUNCTION update_client_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo actualizar si la cita está completada
    IF NEW.estado = 'completada' AND (OLD.estado IS NULL OR OLD.estado != 'completada') THEN
        UPDATE clients SET
            ultima_visita = NEW.fecha,
            total_visitas = total_visitas + 1,
            total_gastado = total_gastado + COALESCE(NEW.precio_final, 0),
            updated_at = NOW()
        WHERE id = NEW.client_id;
        
        -- Marcar como cliente frecuente si tiene más de 5 visitas
        UPDATE clients SET
            cliente_frecuente = (total_visitas >= 5)
        WHERE id = NEW.client_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Función para calcular hora_fin automáticamente
CREATE OR REPLACE FUNCTION calculate_appointment_end_time()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.hora_inicio IS NOT NULL AND NEW.duracion_minutos IS NOT NULL THEN
        NEW.hora_fin = NEW.hora_inicio + (NEW.duracion_minutos || ' minutes')::interval;
    END IF;
    
    -- Copiar nombre del servicio si no está especificado
    IF NEW.service_type_id IS NOT NULL AND NEW.servicio_nombre IS NULL THEN
        SELECT nombre INTO NEW.servicio_nombre 
        FROM service_types 
        WHERE id = NEW.service_type_id;
    END IF;
    
    -- Copiar precio del servicio si no está especificado
    IF NEW.service_type_id IS NOT NULL AND NEW.precio_acordado IS NULL THEN
        SELECT precio_base INTO NEW.precio_acordado 
        FROM service_types 
        WHERE id = NEW.service_type_id;
    END IF;
    
    -- Si no hay precio final, usar el precio acordado
    IF NEW.precio_final IS NULL THEN
        NEW.precio_final = NEW.precio_acordado;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar triggers para updated_at
DROP TRIGGER IF EXISTS update_barbershops_updated_at ON barbershops;
CREATE TRIGGER update_barbershops_updated_at 
    BEFORE UPDATE ON barbershops 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_barbers_updated_at ON barbers;
CREATE TRIGGER update_barbers_updated_at 
    BEFORE UPDATE ON barbers 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_types_updated_at ON service_types;
CREATE TRIGGER update_service_types_updated_at 
    BEFORE UPDATE ON service_types 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at 
    BEFORE UPDATE ON clients 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON appointments 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_barbershop_settings_updated_at ON barbershop_settings;
CREATE TRIGGER update_barbershop_settings_updated_at 
    BEFORE UPDATE ON barbershop_settings 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Triggers para lógica de negocio
DROP TRIGGER IF EXISTS calculate_appointment_times ON appointments;
CREATE TRIGGER calculate_appointment_times
    BEFORE INSERT OR UPDATE ON appointments
    FOR EACH ROW EXECUTE PROCEDURE calculate_appointment_end_time();

DROP TRIGGER IF EXISTS update_client_statistics ON appointments;
CREATE TRIGGER update_client_statistics
    AFTER UPDATE ON appointments
    FOR EACH ROW EXECUTE PROCEDURE update_client_stats();

-- 6. CONFIGURAR ROW LEVEL SECURITY (RLS)
-- ===================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbershop_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para barbershops (solo pueden ver su propia barbería)
DROP POLICY IF EXISTS "Barbershops can view own data" ON barbershops;
CREATE POLICY "Barbershops can view own data" ON barbershops
    FOR ALL USING (
        auth.jwt() ->> 'email' = email OR 
        auth.uid()::text IN (
            SELECT auth_user_id::text FROM barbershop_users 
            WHERE barbershop_id = id
        )
    );

-- Políticas para barbers
DROP POLICY IF EXISTS "Barbers can view own barbershop data" ON barbers;
CREATE POLICY "Barbers can view own barbershop data" ON barbers
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Políticas para service_types
DROP POLICY IF EXISTS "Service types can view own barbershop data" ON service_types;
CREATE POLICY "Service types can view own barbershop data" ON service_types
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Políticas para clients
DROP POLICY IF EXISTS "Clients can view own barbershop data" ON clients;
CREATE POLICY "Clients can view own barbershop data" ON clients
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Políticas para appointments
DROP POLICY IF EXISTS "Appointments can view own barbershop data" ON appointments;
CREATE POLICY "Appointments can view own barbershop data" ON appointments
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Políticas para reports
DROP POLICY IF EXISTS "Reports can view own barbershop data" ON reports;
CREATE POLICY "Reports can view own barbershop data" ON reports
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Políticas para barbershop_settings
DROP POLICY IF EXISTS "Settings can view own barbershop data" ON barbershop_settings;
CREATE POLICY "Settings can view own barbershop data" ON barbershop_settings
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- 7. INSERTAR SERVICIOS PREDETERMINADOS
-- ===================================================================

-- Esta función insertará servicios básicos para cualquier barbería nueva
CREATE OR REPLACE FUNCTION insert_default_services_for_barbershop(barbershop_uuid UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO service_types (barbershop_id, nombre, descripcion, duracion_minutos, precio_base, orden) VALUES
    (barbershop_uuid, 'Corte Clásico', 'Corte de cabello tradicional con tijeras y máquina', 30, 8000, 1),
    (barbershop_uuid, 'Corte + Barba', 'Corte de cabello completo más arreglo de barba', 45, 12000, 2),
    (barbershop_uuid, 'Solo Barba', 'Arreglo y perfilado de barba únicamente', 20, 5000, 3),
    (barbershop_uuid, 'Corte Premium', 'Corte moderno con styling y productos premium', 45, 15000, 4),
    (barbershop_uuid, 'Rapado', 'Corte muy corto con máquina', 15, 6000, 5),
    (barbershop_uuid, 'Corte + Lavado', 'Corte completo con lavado de cabello', 40, 10000, 6);
END;
$$ LANGUAGE plpgsql;

-- 8. CREAR VISTAS ÚTILES PARA REPORTES
-- ===================================================================

-- Vista para estadísticas rápidas por barbería
CREATE OR REPLACE VIEW barbershop_stats AS
SELECT 
    b.id as barbershop_id,
    b.nombre as barbershop_name,
    COUNT(DISTINCT ba.id) as total_barbers,
    COUNT(DISTINCT c.id) as total_clients,
    COUNT(DISTINCT a.id) as total_appointments,
    COUNT(DISTINCT CASE WHEN a.estado = 'completada' THEN a.id END) as completed_appointments,
    COUNT(DISTINCT CASE WHEN a.fecha >= CURRENT_DATE - INTERVAL '30 days' THEN a.id END) as appointments_last_30_days,
    COALESCE(SUM(CASE WHEN a.estado = 'completada' THEN a.precio_final ELSE 0 END), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN a.estado = 'completada' AND a.fecha >= CURRENT_DATE - INTERVAL '30 days' THEN a.precio_final ELSE 0 END), 0) as revenue_last_30_days,
    COALESCE(AVG(CASE WHEN a.calificacion IS NOT NULL THEN a.calificacion END), 0) as avg_rating
FROM barbershops b
LEFT JOIN barbers ba ON b.id = ba.barbershop_id AND ba.activo = true
LEFT JOIN clients c ON b.id = c.barbershop_id AND c.activo = true  
LEFT JOIN appointments a ON b.id = a.barbershop_id
WHERE b.activo = true
GROUP BY b.id, b.nombre;

-- Vista para citas del día actual
CREATE OR REPLACE VIEW today_appointments AS
SELECT 
    a.id,
    a.barbershop_id,
    b.nombre as barbershop_name,
    a.fecha,
    a.hora_inicio,
    a.hora_fin,
    a.estado,
    a.servicio_nombre,
    a.precio_final,
    ba.nombre as barber_name,
    c.nombre as client_name,
    c.telefono as client_phone
FROM appointments a
JOIN barbershops b ON a.barbershop_id = b.id
LEFT JOIN barbers ba ON a.barber_id = ba.id  
LEFT JOIN clients c ON a.client_id = c.id
WHERE a.fecha = CURRENT_DATE
ORDER BY a.hora_inicio;

-- Vista para clientes frecuentes
CREATE OR REPLACE VIEW frequent_clients AS
SELECT 
    c.*,
    b.nombre as barbershop_name,
    COUNT(a.id) as total_appointments,
    SUM(CASE WHEN a.estado = 'completada' THEN a.precio_final ELSE 0 END) as total_spent,
    MAX(a.fecha) as last_visit,
    AVG(CASE WHEN a.calificacion IS NOT NULL THEN a.calificacion END) as avg_rating
FROM clients c
JOIN barbershops b ON c.barbershop_id = b.id
LEFT JOIN appointments a ON c.id = a.client_id
WHERE c.activo = true
GROUP BY c.id, b.nombre
HAVING COUNT(a.id) >= 3
ORDER BY total_appointments DESC, total_spent DESC;

-- 9. FUNCIONES AUXILIARES PARA LA API
-- ===================================================================

-- Función para obtener disponibilidad de un barbero
CREATE OR REPLACE FUNCTION get_barber_availability(
    barbershop_uuid UUID,
    barber_uuid UUID,
    check_date DATE,
    duration_minutes INTEGER DEFAULT 30
)
RETURNS TABLE(
    hora_disponible TIME,
    disponible BOOLEAN
) AS $$
DECLARE
    start_time TIME := '08:00';
    end_time TIME := '18:00';
    slot_duration INTERVAL := (duration_minutes || ' minutes')::INTERVAL;
    current_slot TIME;
BEGIN
    -- Generar slots de tiempo cada 30 minutos
    current_slot := start_time;
    
    WHILE current_slot < end_time LOOP
        -- Verificar si el slot está ocupado
        SELECT NOT EXISTS (
            SELECT 1 FROM appointments 
            WHERE barber_id = barber_uuid 
            AND fecha = check_date
            AND estado NOT IN ('cancelada')
            AND (
                (hora_inicio <= current_slot AND hora_fin > current_slot) OR
                (hora_inicio < current_slot + slot_duration AND hora_fin >= current_slot + slot_duration)
            )
        ) INTO disponible;
        
        hora_disponible := current_slot;
        RETURN NEXT;
        
        current_slot := current_slot + '00:30'::INTERVAL;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener ingresos por período
CREATE OR REPLACE FUNCTION get_revenue_by_period(
    barbershop_uuid UUID,
    start_date DATE,
    end_date DATE
)
RETURNS TABLE(
    fecha DATE,
    total_ingresos DECIMAL,
    total_citas INTEGER,
    promedio_por_cita DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.fecha,
        COALESCE(SUM(a.precio_final), 0) as total_ingresos,
        COUNT(a.id)::INTEGER as total_citas,
        CASE 
            WHEN COUNT(a.id) > 0 THEN COALESCE(AVG(a.precio_final), 0)
            ELSE 0
        END as promedio_por_cita
    FROM appointments a
    WHERE a.barbershop_id = barbershop_uuid
    AND a.fecha >= start_date 
    AND a.fecha <= end_date
    AND a.estado = 'completada'
    GROUP BY a.fecha
    ORDER BY a.fecha;
END;
$$ LANGUAGE plpgsql;

-- 10. MENSAJE DE FINALIZACIÓN
-- ===================================================================

DO $$
BEGIN
    RAISE NOTICE '
    ✅ ===================================================================
    ✅ SETUP DE BASE DE DATOS COMPLETADO EXITOSAMENTE
    ✅ ===================================================================
    
    📋 ESTRUCTURAS CREADAS:
    ✅ 7 Tablas principales con relaciones
    ✅ Índices optimizados para performance  
    ✅ Triggers automáticos para auditoría
    ✅ Row Level Security (RLS) configurado
    ✅ 3 Vistas para reportes rápidos
    ✅ 2 Funciones auxiliares para la API
    
    🚀 PRÓXIMOS PASOS:
    1. Crear usuario Auth en Supabase con el email de la barbería
    2. Insertar datos de tu barbería usando el script de ejemplo
    3. Configurar variables de entorno en tu aplicación
    4. Probar la funcionalidad completa
    
    💡 PARA INSERTAR UNA NUEVA BARBERÍA:
    -- Ejecuta este bloque después de este script --
    
    ';
END $$;

-- ===================================================================
-- EJEMPLO: INSERTAR NUEVA BARBERÍA (PERSONALIZA ESTOS DATOS)
-- ===================================================================
-- Descomenta y personaliza el siguiente bloque para crear tu barbería:

/*
DO $$
DECLARE
    barbershop_uuid UUID;
    barber1_uuid UUID;
    barber2_uuid UUID;
    client1_uuid UUID;
    client2_uuid UUID;
    client3_uuid UUID;
BEGIN
    -- 1. Insertar barbería
    INSERT INTO barbershops (nombre, email, telefono, direccion, descripcion) 
    VALUES (
        'Barbería Ejemplo',  -- 🔄 CAMBIAR: Nombre de tu barbería
        'admin@ejemplo.com', -- 🔄 CAMBIAR: Email que usarás para login
        '+506 2222-2222',   -- 🔄 CAMBIAR: Teléfono
        'San José, Costa Rica', -- 🔄 CAMBIAR: Dirección
        'La mejor barbería de la ciudad' -- 🔄 CAMBIAR: Descripción
    ) RETURNING id INTO barbershop_uuid;
    
    -- 2. Insertar servicios predeterminados
    PERFORM insert_default_services_for_barbershop(barbershop_uuid);
    
    -- 3. Insertar configuración inicial
    INSERT INTO barbershop_settings (barbershop_id) VALUES (barbershop_uuid);
    
    -- 4. Insertar barberos de ejemplo
    INSERT INTO barbers (barbershop_id, nombre, apellido, telefono, especialidad) 
    VALUES 
        (barbershop_uuid, 'Carlos', 'Méndez', '+506 8888-1111', 'Cortes clásicos y barba'),
        (barbershop_uuid, 'Jorge', 'Ramírez', '+506 8888-2222', 'Estilos modernos')
    RETURNING id INTO barber1_uuid;
    
    SELECT id INTO barber2_uuid FROM barbers 
    WHERE barbershop_id = barbershop_uuid AND nombre = 'Jorge';
    
    -- 5. Insertar clientes de ejemplo
    INSERT INTO clients (barbershop_id, nombre, apellido, telefono, email) 
    VALUES 
        (barbershop_uuid, 'Juan', 'Pérez', '+506 7777-1111', 'juan@email.com'),
        (barbershop_uuid, 'María', 'González', '+506 7777-2222', 'maria@email.com'),
        (barbershop_uuid, 'Pedro', 'Rodríguez', '+506 7777-3333', 'pedro@email.com');
    
    -- 6. Obtener IDs de clientes
    SELECT id INTO client1_uuid FROM clients WHERE barbershop_id = barbershop_uuid AND nombre = 'Juan';
    SELECT id INTO client2_uuid FROM clients WHERE barbershop_id = barbershop_uuid AND nombre = 'María';
    SELECT id INTO client3_uuid FROM clients WHERE barbershop_id = barbershop_uuid AND nombre = 'Pedro';
    
    -- 7. Insertar citas de ejemplo
    INSERT INTO appointments (barbershop_id, barber_id, client_id, fecha, hora_inicio, servicio_nombre, duracion_minutos, precio_acordado, precio_final, estado)
    VALUES 
        (barbershop_uuid, barber1_uuid, client1_uuid, CURRENT_DATE + 1, '10:00', 'Corte Clásico', 30, 8000, 8000, 'programada'),
        (barbershop_uuid, barber1_uuid, client2_uuid, CURRENT_DATE + 1, '14:00', 'Corte + Barba', 45, 12000, 12000, 'confirmada'),
        (barbershop_uuid, barber2_uuid, client3_uuid, CURRENT_DATE + 2, '09:00', 'Corte Premium', 45, 15000, 15000, 'programada');
    
    -- 8. Mostrar resumen
    RAISE NOTICE 'Barbería creada: % (ID: %)', 'Barbería Ejemplo', barbershop_uuid;
    RAISE NOTICE 'Email para login: %', 'admin@ejemplo.com';
    RAISE NOTICE 'Barberos creados: %', (SELECT COUNT(*) FROM barbers WHERE barbershop_id = barbershop_uuid);
    RAISE NOTICE 'Clientes creados: %', (SELECT COUNT(*) FROM clients WHERE barbershop_id = barbershop_uuid);
    RAISE NOTICE 'Citas creadas: %', (SELECT COUNT(*) FROM appointments WHERE barbershop_id = barbershop_uuid);
    
END $$;
*/

-- ===================================================================
-- FIN DEL SETUP - BASE DE DATOS LISTA PARA USAR
-- ===================================================================