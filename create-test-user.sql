-- ===================================================================
-- SCRIPT PARA CREAR USUARIO DE PRUEBA
-- ===================================================================
-- Este script crea una nueva barbería completa para realizar pruebas
-- del sistema con teléfono opcional y otras funcionalidades

-- IMPORTANTE: Después de ejecutar este script, debes crear el usuario
-- en Supabase Authentication con el mismo email

-- ===================================================================
-- PASO 1: CREAR BARBERÍA DE PRUEBA
-- ===================================================================

INSERT INTO barbershops (
    nombre,
    email,
    telefono,
    direccion,
    activo
) VALUES (
    'Barbería Pruebas',
    'pruebas@barberia.com',
    '+506 2222-3333',
    'San José, Costa Rica - Solo para pruebas',
    true
);

-- ===================================================================
-- PASO 2: OBTENER ID DE LA BARBERÍA Y AGREGAR BARBEROS
-- ===================================================================

DO $$
DECLARE
    barbershop_id_var UUID;
    barber1_id UUID;
    barber2_id UUID;
    client1_id UUID;
    client2_id UUID;
BEGIN
    -- Obtener el ID de la barbería recién creada
    SELECT id INTO barbershop_id_var 
    FROM barbershops 
    WHERE email = 'pruebas@barberia.com';
    
    -- Insertar barberos de prueba
    INSERT INTO barbers (barbershop_id, nombre, telefono, especialidad, activo) VALUES
    (barbershop_id_var, 'Carlos Prueba', '+506 8888-1111', 'Cortes clásicos y barba', true),
    (barbershop_id_var, 'Ana Prueba', '+506 8888-2222', 'Cortes modernos y colorimetría', true);
    
    -- Obtener IDs de barberos
    SELECT id INTO barber1_id FROM barbers WHERE nombre = 'Carlos Prueba' AND barbershop_id = barbershop_id_var;
    SELECT id INTO barber2_id FROM barbers WHERE nombre = 'Ana Prueba' AND barbershop_id = barbershop_id_var;
    
    -- Insertar clientes de prueba (algunos con teléfono, otros sin teléfono)
    INSERT INTO clients (barbershop_id, nombre, telefono, email) VALUES
    (barbershop_id_var, 'Juan Cliente', '+506 7777-1111', 'juan@ejemplo.com'),
    (barbershop_id_var, 'María Ejemplo', '+506 7777-2222', 'maria@ejemplo.com'),
    (barbershop_id_var, 'Carlos Sin Tel', NULL, 'carlos@ejemplo.com'),  -- Sin teléfono
    (barbershop_id_var, 'Ana Sin Número', NULL, NULL),  -- Sin teléfono ni email
    (barbershop_id_var, 'Pedro Test', '+506 7777-3333', NULL);
    
    -- Obtener IDs de clientes
    SELECT id INTO client1_id FROM clients WHERE nombre = 'Juan Cliente' AND barbershop_id = barbershop_id_var;
    SELECT id INTO client2_id FROM clients WHERE nombre = 'María Ejemplo' AND barbershop_id = barbershop_id_var;
    
    -- Insertar algunas citas de prueba
    INSERT INTO appointments (barbershop_id, barber_id, client_id, fecha, hora, duracion_minutos, tipo_servicio, estado, precio, notas) VALUES
    -- Citas para HOY
    (barbershop_id_var, barber1_id, client1_id, CURRENT_DATE, '09:00', 30, 'corte', 'confirmada', 5000, 'Cliente con teléfono'),
    (barbershop_id_var, barber2_id, client2_id, CURRENT_DATE, '10:30', 60, 'corte_barba', 'programada', 8000, 'Corte + barba'),
    
    -- Citas para MAÑANA
    (barbershop_id_var, barber1_id, client1_id, CURRENT_DATE + INTERVAL '1 day', '14:00', 30, 'corte', 'programada', 5000, 'Cita de mañana'),
    (barbershop_id_var, barber2_id, client2_id, CURRENT_DATE + INTERVAL '1 day', '16:00', 60, 'corte_barba', 'programada', 8000, 'Corte completo');
    
    RAISE NOTICE 'Barbería de prueba creada exitosamente con ID: %', barbershop_id_var;
END $$;

-- ===================================================================
-- PASO 3: VERIFICAR LA CREACIÓN
-- ===================================================================

SELECT 'BARBERÍA CREADA:' as info;
SELECT 
    id,
    nombre,
    email,
    telefono,
    direccion,
    activo,
    created_at
FROM barbershops 
WHERE email = 'pruebas@barberia.com';

SELECT 'BARBEROS AGREGADOS:' as info;
SELECT 
    b.nombre as barbero,
    b.telefono,
    b.especialidad,
    bs.nombre as barberia
FROM barbers b
JOIN barbershops bs ON b.barbershop_id = bs.id
WHERE bs.email = 'pruebas@barberia.com';

SELECT 'CLIENTES AGREGADOS (incluye sin teléfono):' as info;
SELECT 
    nombre,
    COALESCE(telefono, 'SIN TELÉFONO') as telefono,
    COALESCE(email, 'SIN EMAIL') as email
FROM clients c
JOIN barbershops bs ON c.barbershop_id = bs.id
WHERE bs.email = 'pruebas@barberia.com'
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
WHERE bs.email = 'pruebas@barberia.com'
ORDER BY a.fecha, a.hora;

-- ===================================================================
-- PASO 4: INSTRUCCIONES PARA CREAR USUARIO EN AUTH
-- ===================================================================

SELECT '🚨 IMPORTANTE - PRÓXIMO PASO:' as instruccion;
SELECT 'Ve a Supabase Dashboard > Authentication > Users' as paso_1;
SELECT 'Crea un nuevo usuario con email: pruebas@barberia.com' as paso_2;
SELECT 'Contraseña sugerida: Pruebas123!' as paso_3;
SELECT 'Luego podrás iniciar sesión con esas credenciales' as paso_4;

-- ===================================================================
-- DATOS DE PRUEBA RESUMIDOS
-- ===================================================================

SELECT '📋 RESUMEN DE DATOS CREADOS:' as resumen;
SELECT '✅ Barbería: Barbería Pruebas' as item_1;
SELECT '✅ Email: pruebas@barberia.com' as item_2;  
SELECT '✅ 2 Barberos: Carlos Prueba, Ana Prueba' as item_3;
SELECT '✅ 5 Clientes: 3 con teléfono, 2 sin teléfono' as item_4;
SELECT '✅ 4 Citas: 2 para hoy, 2 para mañana' as item_5;
SELECT '🔑 Contraseña sugerida: Pruebas123!' as item_6;
