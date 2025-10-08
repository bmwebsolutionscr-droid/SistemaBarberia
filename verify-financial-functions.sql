-- Script de verificación y corrección de funciones financieras

-- Verificar que la vista existe y funciona
SELECT 'Verificando vista citas_pendientes_pago...' as paso;
SELECT COUNT(*) as total_citas_en_vista FROM citas_pendientes_pago;

-- Verificar que las funciones existen
SELECT 'Verificando funciones...' as paso;
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_citas_pendientes_pago', 'get_resumen_cobros_pendientes');

-- Probar la función de resumen (debería funcionar sin parámetros para verificar)
SELECT 'Probando función get_resumen_cobros_pendientes...' as paso;

-- Buscar el ID de la barbería para probar
SELECT 'IDs de barberías disponibles:' as info;
SELECT id, nombre FROM barbershops LIMIT 3;

-- Verificar si hay citas en el sistema
SELECT 'Verificando citas en el sistema...' as paso;
SELECT 
    COUNT(*) as total_citas,
    COUNT(CASE WHEN estado IN ('programada', 'confirmada') THEN 1 END) as citas_activas,
    COUNT(CASE WHEN pagado IS NULL OR pagado = false THEN 1 END) as citas_no_pagadas
FROM appointments;

-- Verificar citas específicas de hoy
SELECT 'Citas de hoy sin pagar:' as info;
SELECT 
    a.id,
    a.fecha,
    a.hora,
    a.estado,
    a.pagado,
    c.nombre as cliente,
    b.nombre as barbero
FROM appointments a
JOIN clients c ON a.client_id = c.id
JOIN barbers b ON a.barber_id = b.id
WHERE a.fecha = CURRENT_DATE
AND (a.pagado IS NULL OR a.pagado = false)
AND a.estado IN ('programada', 'confirmada');