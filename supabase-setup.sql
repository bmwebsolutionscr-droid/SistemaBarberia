-- Configuración de la base de datos para el Sistema de Barbería
-- Ejecutar en Supabase SQL Editor

-- Crear extensión para UUID si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear enum para el estado de las citas
CREATE TYPE appointment_status AS ENUM ('programada', 'confirmada', 'cancelada', 'completada');

-- Tabla de barberías (empresas)
CREATE TABLE barbershops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    direccion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de barberos (empleados de la barbería)
CREATE TABLE barbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    especialidad VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de clientes
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de citas
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    duracion INTEGER DEFAULT 30, -- duración en minutos
    precio DECIMAL(10,2),
    estado appointment_status DEFAULT 'programada',
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de reportes (opcional, para cachear reportes generados)
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE, -- NULL para reportes generales
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    total_citas INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_appointments_barbershop_fecha ON appointments(barbershop_id, fecha);
CREATE INDEX idx_appointments_barber_fecha ON appointments(barber_id, fecha);
CREATE INDEX idx_appointments_estado ON appointments(estado);
CREATE INDEX idx_clients_telefono ON clients(telefono);
CREATE INDEX idx_clients_barbershop ON clients(barbershop_id);
CREATE INDEX idx_barbers_barbershop ON barbers(barbershop_id);
CREATE INDEX idx_barbershops_email ON barbershops(email);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_barbershops_updated_at BEFORE UPDATE ON barbershops 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_barbers_updated_at BEFORE UPDATE ON barbers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas de seguridad RLS (Row Level Security)
ALTER TABLE barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Políticas para barbershops: solo pueden ver/editar su propia información
CREATE POLICY "Barbershops can view own profile" ON barbershops
    FOR SELECT USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Barbershops can update own profile" ON barbershops
    FOR UPDATE USING (auth.jwt() ->> 'email' = email);

-- Políticas para barbers: solo pueden ver/editar barberos de su barbería
CREATE POLICY "Barbershops can manage own barbers" ON barbers
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Políticas para clients: las barberías pueden ver/editar sus propios clientes
CREATE POLICY "Barbershops can manage own clients" ON clients
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Políticas para appointments: las barberías solo pueden ver/editar sus propias citas
CREATE POLICY "Barbershops can manage own appointments" ON appointments
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Políticas para reports: las barberías solo pueden ver/editar sus propios reportes
CREATE POLICY "Barbershops can manage own reports" ON reports
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Datos de ejemplo (opcional - remover en producción)
-- Insertar una barbería de ejemplo
INSERT INTO barbershops (nombre, email, telefono, direccion) VALUES 
('Barber Magic', 'admin@barbermagic.com', '+506 2222-3333', 'San José, Costa Rica');

-- Obtener el ID de la barbería para los siguientes inserts
-- Insertar algunos barberos de ejemplo
INSERT INTO barbers (barbershop_id, nombre, telefono, especialidad) 
SELECT 
    bs.id,
    'Carlos Martínez',
    '+506 8888-1001',
    'Cortes clásicos y barba'
FROM barbershops bs 
WHERE bs.email = 'admin@barbermagic.com';

INSERT INTO barbers (barbershop_id, nombre, telefono, especialidad) 
SELECT 
    bs.id,
    'Ana López',
    '+506 8888-1002',
    'Cortes modernos y colorimetría'
FROM barbershops bs 
WHERE bs.email = 'admin@barbermagic.com';

INSERT INTO barbers (barbershop_id, nombre, telefono, especialidad) 
SELECT 
    bs.id,
    'Miguel Rodríguez',
    '+506 8888-1003',
    'Barbería tradicional'
FROM barbershops bs 
WHERE bs.email = 'admin@barbermagic.com';

-- Insertar algunos clientes de ejemplo
INSERT INTO clients (barbershop_id, nombre, telefono, email) 
SELECT 
    bs.id,
    'Roberto Silva',
    '+506 8888-2001',
    'roberto@email.com'
FROM barbershops bs 
WHERE bs.email = 'admin@barbermagic.com';

INSERT INTO clients (barbershop_id, nombre, telefono, email) 
SELECT 
    bs.id,
    'María Fernández',
    '+506 8888-2002',
    'maria@email.com'
FROM barbershops bs 
WHERE bs.email = 'admin@barbermagic.com';

INSERT INTO clients (barbershop_id, nombre, telefono, email) 
SELECT 
    bs.id,
    'David Vargas',
    '+506 8888-2003',
    'david@email.com'
FROM barbershops bs 
WHERE bs.email = 'admin@barbermagic.com';

-- Insertar algunas citas de ejemplo
INSERT INTO appointments (barbershop_id, barber_id, client_id, fecha, hora, precio, estado, notas)
SELECT 
    bs.id,
    b.id,
    c.id,
    CURRENT_DATE + INTERVAL '1 day',
    '10:00:00',
    15000.00,
    'programada',
    'Corte regular'
FROM barbershops bs, barbers b, clients c 
WHERE bs.email = 'admin@barbermagic.com' 
    AND b.nombre = 'Carlos Martínez'
    AND c.nombre = 'Roberto Silva'
    AND b.barbershop_id = bs.id
    AND c.barbershop_id = bs.id
LIMIT 1;

INSERT INTO appointments (barbershop_id, barber_id, client_id, fecha, hora, precio, estado, notas)
SELECT 
    bs.id,
    b.id,
    c.id,
    CURRENT_DATE + INTERVAL '1 day',
    '11:30:00',
    25000.00,
    'confirmada',
    'Corte y barba'
FROM barbershops bs, barbers b, clients c 
WHERE bs.email = 'admin@barbermagic.com' 
    AND b.nombre = 'Ana López'
    AND c.nombre = 'María Fernández'
    AND b.barbershop_id = bs.id
    AND c.barbershop_id = bs.id
LIMIT 1;

-- Comentarios sobre la configuración
/*
CONFIGURACIÓN ADICIONAL NECESARIA EN SUPABASE:

1. Autenticación:
   - Habilitar autenticación por email/password
   - Configurar las URLs de redirección
   - Opcional: Configurar proveedores OAuth (Google, etc.)

2. Storage (si se necesitan imágenes):
   - Crear bucket público para avatares
   - Configurar políticas de acceso

3. Variables de entorno:
   - NEXT_PUBLIC_SUPABASE_URL: URL de tu proyecto Supabase
   - NEXT_PUBLIC_SUPABASE_ANON_KEY: Clave anónima pública
   - SUPABASE_SERVICE_ROLE_KEY: Clave de servicio (solo backend)

4. Configuración adicional:
   - Configurar webhooks si es necesario
   - Configurar límites de rate limiting
   - Configurar backup automático

NOTAS DE SEGURIDAD:
- Las políticas RLS están configuradas para que cada barbero solo pueda
  acceder a sus propios datos
- Los clientes son compartidos entre barberos (puedes cambiar esto si prefieres
  que cada barbero tenga sus propios clientes)
- Todas las tablas tienen timestamps automáticos
- Los IDs son UUID para mayor seguridad

PRÓXIMOS PASOS:
1. Ejecutar este script en Supabase SQL Editor
2. Crear un usuario barbero en Supabase Auth
3. Configurar las variables de entorno en tu aplicación Next.js
4. Probar la conexión y funcionalidad
*/
