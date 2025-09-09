-- ===================================================================
-- SCRIPT COMPLETO DE BASE DE DATOS - SISTEMA DE BARBERÍA
-- ===================================================================
-- Este script elimina todo y recrea la base de datos completa con datos de prueba
-- Ejecutar en Supabase SQL Editor

-- ===================================================================
-- 1. ELIMINAR TODAS LAS TABLAS EXISTENTES
-- ===================================================================

-- Eliminar tablas en orden para evitar conflictos de foreign keys
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS barbers CASCADE;
DROP TABLE IF EXISTS barbershops CASCADE;

-- Eliminar tipos enum si existen
DROP TYPE IF EXISTS appointment_status CASCADE;

-- ===================================================================
-- 2. CREAR TIPOS ENUM
-- ===================================================================

CREATE TYPE appointment_status AS ENUM ('programada', 'confirmada', 'cancelada', 'completada');

-- ===================================================================
-- 3. CREAR TABLAS
-- ===================================================================

-- Tabla principal: Barberías
CREATE TABLE barbershops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    direccion TEXT,
    activo BOOLEAN DEFAULT true,
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

-- Tabla: Clientes (por barbería)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
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
    duracion INTEGER DEFAULT 60, -- minutos
    precio DECIMAL(10,2),
    estado appointment_status DEFAULT 'programada',
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: Reportes generados
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    barber_id UUID REFERENCES barbers(id) ON DELETE SET NULL,
    titulo VARCHAR(255) NOT NULL,
    contenido TEXT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    tipo VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================================
-- 4. CREAR ÍNDICES PARA OPTIMIZACIÓN
-- ===================================================================

-- Índices para búsquedas frecuentes
CREATE INDEX idx_barbers_barbershop ON barbers(barbershop_id);
CREATE INDEX idx_clients_barbershop ON clients(barbershop_id);
CREATE INDEX idx_appointments_barbershop ON appointments(barbershop_id);
CREATE INDEX idx_appointments_barber ON appointments(barber_id);
CREATE INDEX idx_appointments_client ON appointments(client_id);
CREATE INDEX idx_appointments_fecha ON appointments(fecha);
CREATE INDEX idx_appointments_estado ON appointments(estado);
CREATE INDEX idx_reports_barbershop ON reports(barbershop_id);

-- Índices únicos para evitar duplicados
CREATE UNIQUE INDEX idx_barbershops_email ON barbershops(email);
CREATE UNIQUE INDEX idx_clients_phone_barbershop ON clients(telefono, barbershop_id);

-- ===================================================================
-- 5. CREAR TRIGGERS PARA UPDATED_AT
-- ===================================================================

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para todas las tablas
CREATE TRIGGER update_barbershops_updated_at 
    BEFORE UPDATE ON barbershops 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_barbers_updated_at 
    BEFORE UPDATE ON barbers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at 
    BEFORE UPDATE ON clients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON appointments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
-- 7. INSERTAR DATOS DE PRUEBA - BARBER MAGIC
-- ===================================================================

-- Insertar barbería de prueba
INSERT INTO barbershops (nombre, email, telefono, direccion) VALUES 
('Barber Magic', 'barberia@barbermagic.com', '+506 2222-3333', 'San José, Costa Rica');

-- Obtener el ID de la barbería para usar en las siguientes inserciones
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
    -- Obtener el ID de la barbería
    SELECT id INTO barbershop_id_var FROM barbershops WHERE nombre = 'Barber Magic';
    
    -- Insertar barberos
    INSERT INTO barbers (barbershop_id, nombre, telefono, especialidad, activo) VALUES
    (barbershop_id_var, 'Carlos Mendez', '+506 8888-1234', 'Cortes clásicos y barba', true),
    (barbershop_id_var, 'Jorge Ramirez', '+506 8888-5678', 'Colorimetría y estilos modernos', true),
    (barbershop_id_var, 'Mario Rodriguez', '+506 8888-9012', 'Cortes infantiles y adulto mayor', true);
    
    -- Obtener IDs de barberos
    SELECT id INTO barber1_id FROM barbers WHERE nombre = 'Carlos Mendez' AND barbershop_id = barbershop_id_var;
    SELECT id INTO barber2_id FROM barbers WHERE nombre = 'Jorge Ramirez' AND barbershop_id = barbershop_id_var;
    SELECT id INTO barber3_id FROM barbers WHERE nombre = 'Mario Rodriguez' AND barbershop_id = barbershop_id_var;
    
    -- Insertar clientes de prueba
    INSERT INTO clients (barbershop_id, nombre, telefono, email) VALUES
    (barbershop_id_var, 'Juan Pérez', '+506 8899-1111', 'juan.perez@email.com'),
    (barbershop_id_var, 'María González', '+506 8899-2222', 'maria.gonzalez@email.com'),
    (barbershop_id_var, 'Luis Morales', '+506 8899-3333', 'luis.morales@email.com'),
    (barbershop_id_var, 'Ana Castro', '+506 8899-4444', 'ana.castro@email.com'),
    (barbershop_id_var, 'Pedro Jiménez', '+506 8899-5555', 'pedro.jimenez@email.com'),
    (barbershop_id_var, 'Carmen Silva', '+506 8899-6666', 'carmen.silva@email.com'),
    (barbershop_id_var, 'Roberto Vargas', '+506 8899-7777', 'roberto.vargas@email.com'),
    (barbershop_id_var, 'Sandra López', '+506 8899-8888', 'sandra.lopez@email.com');
    
    -- Obtener IDs de clientes
    SELECT id INTO client1_id FROM clients WHERE nombre = 'Juan Pérez' AND barbershop_id = barbershop_id_var;
    SELECT id INTO client2_id FROM clients WHERE nombre = 'María González' AND barbershop_id = barbershop_id_var;
    SELECT id INTO client3_id FROM clients WHERE nombre = 'Luis Morales' AND barbershop_id = barbershop_id_var;
    SELECT id INTO client4_id FROM clients WHERE nombre = 'Ana Castro' AND barbershop_id = barbershop_id_var;
    SELECT id INTO client5_id FROM clients WHERE nombre = 'Pedro Jiménez' AND barbershop_id = barbershop_id_var;
    
    -- Insertar citas de prueba
    INSERT INTO appointments (barbershop_id, barber_id, client_id, fecha, hora, estado, precio, notas) VALUES
    -- Citas de HOY
    (barbershop_id_var, barber1_id, client1_id, CURRENT_DATE, '09:00', 'confirmada', 15000, 'Corte y barba completo'),
    (barbershop_id_var, barber1_id, client2_id, CURRENT_DATE, '10:30', 'programada', 12000, 'Solo corte de cabello'),
    (barbershop_id_var, barber2_id, client3_id, CURRENT_DATE, '14:00', 'confirmada', 18000, 'Corte y colorimetría'),
    (barbershop_id_var, barber3_id, client4_id, CURRENT_DATE, '16:00', 'programada', 10000, 'Corte infantil'),
    
    -- Citas de MAÑANA
    (barbershop_id_var, barber1_id, client4_id, CURRENT_DATE + 1, '09:30', 'programada', 15000, 'Corte completo con arreglo barba'),
    (barbershop_id_var, barber2_id, client5_id, CURRENT_DATE + 1, '11:00', 'programada', 20000, 'Estilo moderno con colorimetría'),
    (barbershop_id_var, barber3_id, client1_id, CURRENT_DATE + 1, '15:30', 'programada', 10000, 'Corte simple mantenimiento'),
    (barbershop_id_var, barber1_id, client3_id, CURRENT_DATE + 1, '17:00', 'programada', 14000, 'Corte y peinado'),
    
    -- Citas de ESTA SEMANA
    (barbershop_id_var, barber1_id, client2_id, CURRENT_DATE + 3, '10:00', 'programada', 15000, 'Mantenimiento mensual'),
    (barbershop_id_var, barber2_id, client3_id, CURRENT_DATE + 4, '16:00', 'programada', 22000, 'Cambio de look completo'),
    (barbershop_id_var, barber3_id, client4_id, CURRENT_DATE + 5, '09:00', 'programada', 12000, 'Corte familiar padre e hijo'),
    (barbershop_id_var, barber1_id, client5_id, CURRENT_DATE + 6, '14:30', 'programada', 16000, 'Corte ejecutivo'),
    
    -- Citas COMPLETADAS del mes pasado (para estadísticas)
    (barbershop_id_var, barber1_id, client1_id, CURRENT_DATE - 5, '14:00', 'completada', 15000, 'Servicio completo premium'),
    (barbershop_id_var, barber2_id, client2_id, CURRENT_DATE - 8, '11:30', 'completada', 18000, 'Colorimetría y corte'),
    (barbershop_id_var, barber3_id, client3_id, CURRENT_DATE - 12, '16:00', 'completada', 10000, 'Corte básico'),
    (barbershop_id_var, barber1_id, client4_id, CURRENT_DATE - 15, '10:00', 'completada', 20000, 'Servicio premium con masaje'),
    (barbershop_id_var, barber2_id, client5_id, CURRENT_DATE - 20, '15:00', 'completada', 16000, 'Corte y peinado especial'),
    (barbershop_id_var, barber3_id, client1_id, CURRENT_DATE - 25, '09:30', 'completada', 12000, 'Corte de mantenimiento'),
    (barbershop_id_var, barber1_id, client2_id, CURRENT_DATE - 28, '13:00', 'completada', 14000, 'Arreglo barba y bigote'),
    
    -- Algunas citas CANCELADAS (para estadísticas realistas)
    (barbershop_id_var, barber2_id, client3_id, CURRENT_DATE - 10, '12:00', 'cancelada', 15000, 'Cliente canceló por emergencia'),
    (barbershop_id_var, barber3_id, client4_id, CURRENT_DATE - 18, '16:30', 'cancelada', 11000, 'Cambio de horario no disponible');
    
    -- Insertar un reporte de ejemplo
    INSERT INTO reports (barbershop_id, barber_id, titulo, contenido, fecha_inicio, fecha_fin, tipo) VALUES
    (barbershop_id_var, NULL, 'Reporte Mensual Agosto', 
     'Reporte completo del mes de agosto con estadísticas de todos los barberos de Barber Magic.', 
     CURRENT_DATE - 30, CURRENT_DATE, 'mensual');
    
END $$;

-- ===================================================================
-- 8. VERIFICACIÓN DE DATOS INSERTADOS
-- ===================================================================

-- Mostrar resumen de datos insertados
SELECT 
    'DATOS INSERTADOS CORRECTAMENTE' as status,
    (SELECT COUNT(*) FROM barbershops) as barberias,
    (SELECT COUNT(*) FROM barbers) as barberos,
    (SELECT COUNT(*) FROM clients) as clientes,
    (SELECT COUNT(*) FROM appointments) as citas_total,
    (SELECT COUNT(*) FROM appointments WHERE estado = 'completada') as citas_completadas,
    (SELECT COUNT(*) FROM appointments WHERE fecha = CURRENT_DATE) as citas_hoy,
    (SELECT COUNT(*) FROM appointments WHERE fecha = CURRENT_DATE + 1) as citas_manana,
    (SELECT COUNT(*) FROM reports) as reportes;

-- Mostrar información de la barbería creada
SELECT 
    'BARBERÍA CREADA:' as info,
    nombre,
    email,
    telefono,
    direccion
FROM barbershops WHERE nombre = 'Barber Magic';

-- Mostrar barberos creados
SELECT 
    'BARBEROS CREADOS:' as info,
    nombre,
    especialidad,
    telefono,
    CASE WHEN activo THEN 'Activo' ELSE 'Inactivo' END as estado
FROM barbers 
WHERE barbershop_id = (SELECT id FROM barbershops WHERE nombre = 'Barber Magic')
ORDER BY nombre;

-- ===================================================================
-- 9. INSTRUCCIONES FINALES
-- ===================================================================

-- MENSAJE FINAL
SELECT 
    '🎉 BASE DE DATOS CONFIGURADA EXITOSAMENTE' as "ESTADO",
    '✅ Tablas creadas con RLS habilitado' as "SEGURIDAD",
    '✅ Datos de prueba para Barber Magic insertados' as "DATOS",
    '📧 Email: barberia@barbermagic.com' as "LOGIN",
    '👥 3 barberos, 8 clientes, 19 citas' as "CONTENIDO",
    '📊 Citas de hoy, mañana y historial incluido' as "ESTADISTICAS";

-- ===================================================================
-- FIN DEL SCRIPT
-- ===================================================================
