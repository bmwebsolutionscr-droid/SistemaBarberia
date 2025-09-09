-- Script de verificación de estructura de base de datos para Sistema Barbería
-- Ejecuta este script completo y copia el resultado

-- 1. Verificar tablas existentes
SELECT 'TABLAS EXISTENTES:' as info;
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Verificar estructura de tabla barbershops
SELECT 'ESTRUCTURA barbershops:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'barbershops' 
ORDER BY ordinal_position;

-- 3. Verificar estructura de tabla barbers
SELECT 'ESTRUCTURA barbers:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'barbers' 
ORDER BY ordinal_position;

-- 4. Verificar estructura de tabla clients
SELECT 'ESTRUCTURA clients:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'clients' 
ORDER BY ordinal_position;

-- 5. Verificar estructura de tabla appointments
SELECT 'ESTRUCTURA appointments:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'appointments' 
ORDER BY ordinal_position;

-- 6. Verificar datos de ejemplo en barbershops
SELECT 'DATOS barbershops:' as info;
SELECT id, nombre, email, telefono, direccion, 
       hora_apertura, hora_cierre, dias_laborales, 
       duracion_cita, precio_corte_adulto, whatsapp_activo
FROM barbershops;

-- 7. Verificar datos de ejemplo en barbers
SELECT 'DATOS barbers:' as info;
SELECT id, nombre, telefono, especialidad, activo, barbershop_id
FROM barbers
ORDER BY nombre;

-- 8. Verificar datos de ejemplo en clients
SELECT 'DATOS clients:' as info;
SELECT id, nombre, telefono, barbershop_id
FROM clients
ORDER BY nombre
LIMIT 5;

-- 9. Verificar datos de ejemplo en appointments
SELECT 'DATOS appointments:' as info;
SELECT id, fecha, hora, estado, client_id, barber_id, barbershop_id
FROM appointments
ORDER BY fecha DESC, hora DESC
LIMIT 10;

-- 10. Verificar claves foráneas
SELECT 'CLAVES FORÁNEAS:' as info;
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public'
ORDER BY tc.table_name, kcu.column_name;
