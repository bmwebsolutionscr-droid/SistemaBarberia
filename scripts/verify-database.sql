-- ===================================================================
-- SCRIPT DE VERIFICACIÓN DE BASE DE DATOS
-- ===================================================================
-- Uso: Ejecutar en Supabase SQL Editor para verificar que todo esté OK
-- ===================================================================

-- 1. VERIFICAR QUE TODAS LAS TABLAS EXISTAN
-- ===================================================================

DO $$
DECLARE
    table_count INTEGER;
    missing_tables TEXT[];
    table_name TEXT;
    required_tables TEXT[] := ARRAY[
        'barbershops', 'barbers', 'service_types', 'clients', 
        'appointments', 'reports', 'barbershop_settings'
    ];
BEGIN
    RAISE NOTICE '🔍 VERIFICANDO ESTRUCTURA DE BASE DE DATOS';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '';
    
    -- Verificar cada tabla requerida
    FOREACH table_name IN ARRAY required_tables LOOP
        SELECT COUNT(*) INTO table_count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = table_name;
        
        IF table_count = 0 THEN
            missing_tables := array_append(missing_tables, table_name);
            RAISE NOTICE '❌ Tabla faltante: %', table_name;
        ELSE
            RAISE NOTICE '✅ Tabla existe: %', table_name;
        END IF;
    END LOOP;
    
    -- Mostrar resultado
    IF array_length(missing_tables, 1) IS NULL THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ Todas las tablas requeridas están presentes';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '❌ Faltan % tablas. Ejecutar complete-database-setup.sql primero', array_length(missing_tables, 1);
        RETURN;
    END IF;
    
END $$;

-- 2. VERIFICAR RLS (ROW LEVEL SECURITY)
-- ===================================================================

DO $$
DECLARE
    rls_enabled INTEGER;
    table_name TEXT;
    rls_tables TEXT[] := ARRAY[
        'barbershops', 'barbers', 'service_types', 'clients', 
        'appointments', 'reports', 'barbershop_settings'
    ];
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔒 VERIFICANDO ROW LEVEL SECURITY (RLS)';
    RAISE NOTICE '=====================================';
    RAISE NOTICE '';
    
    FOREACH table_name IN ARRAY rls_tables LOOP
        SELECT COUNT(*) INTO rls_enabled 
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = table_name 
        AND n.nspname = 'public' 
        AND c.relrowsecurity = true;
        
        IF rls_enabled = 1 THEN
            RAISE NOTICE '✅ RLS habilitado: %', table_name;
        ELSE
            RAISE NOTICE '❌ RLS no habilitado: %', table_name;
        END IF;
    END LOOP;
    
END $$;

-- 3. VERIFICAR FUNCIONES Y TRIGGERS
-- ===================================================================

DO $$
DECLARE
    function_count INTEGER;
    trigger_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '⚙️  VERIFICANDO FUNCIONES Y TRIGGERS';
    RAISE NOTICE '=================================';
    RAISE NOTICE '';
    
    -- Verificar funciones
    SELECT COUNT(*) INTO function_count 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname IN ('update_updated_at_column', 'update_client_stats', 'calculate_appointment_end_time');
    
    RAISE NOTICE 'Funciones encontradas: %/3', function_count;
    
    -- Verificar triggers
    SELECT COUNT(*) INTO trigger_count 
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public';
    
    RAISE NOTICE 'Triggers encontrados: %', trigger_count;
    
    IF function_count >= 3 AND trigger_count >= 5 THEN
        RAISE NOTICE '✅ Funciones y triggers configurados correctamente';
    ELSE
        RAISE NOTICE '⚠️  Algunas funciones o triggers pueden estar faltando';
    END IF;
    
END $$;

-- 4. VERIFICAR VISTAS
-- ===================================================================

DO $$
DECLARE
    view_count INTEGER;
    view_name TEXT;
    required_views TEXT[] := ARRAY['barbershop_stats', 'today_appointments', 'frequent_clients'];
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '👁️  VERIFICANDO VISTAS';
    RAISE NOTICE '==================';
    RAISE NOTICE '';
    
    FOREACH view_name IN ARRAY required_views LOOP
        SELECT COUNT(*) INTO view_count 
        FROM information_schema.views 
        WHERE table_schema = 'public' AND table_name = view_name;
        
        IF view_count = 1 THEN
            RAISE NOTICE '✅ Vista existe: %', view_name;
        ELSE
            RAISE NOTICE '❌ Vista faltante: %', view_name;
        END IF;
    END LOOP;
    
END $$;

-- 5. MOSTRAR ESTADÍSTICAS DE DATOS
-- ===================================================================

DO $$
DECLARE
    barbershop_count INTEGER;
    barber_count INTEGER;
    client_count INTEGER;
    appointment_count INTEGER;
    service_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 ESTADÍSTICAS DE DATOS';
    RAISE NOTICE '=======================';
    RAISE NOTICE '';
    
    -- Contar registros en cada tabla
    SELECT COUNT(*) INTO barbershop_count FROM barbershops;
    SELECT COUNT(*) INTO barber_count FROM barbers;
    SELECT COUNT(*) INTO client_count FROM clients;
    SELECT COUNT(*) INTO appointment_count FROM appointments;
    SELECT COUNT(*) INTO service_count FROM service_types;
    
    RAISE NOTICE 'Barberías registradas: %', barbershop_count;
    RAISE NOTICE 'Barberos registrados: %', barber_count;
    RAISE NOTICE 'Tipos de servicio: %', service_count;
    RAISE NOTICE 'Clientes registrados: %', client_count;
    RAISE NOTICE 'Citas totales: %', appointment_count;
    
    IF barbershop_count = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '💡 No hay barberías registradas. Usar create-new-barbershop.sql para crear una';
    END IF;
    
END $$;

-- 6. VERIFICAR CONFIGURACIÓN ACTUAL
-- ===================================================================

-- Mostrar barberías existentes
SELECT 
    '🏪 BARBERÍAS REGISTRADAS' as titulo,
    nombre,
    email,
    activo,
    plan,
    created_at::date as fecha_creacion
FROM barbershops
ORDER BY created_at DESC;

-- Mostrar citas de hoy si existen
SELECT 
    '📅 CITAS DE HOY' as titulo,
    bs.nombre as barberia,
    a.hora_inicio,
    a.servicio_nombre,
    a.estado,
    b.nombre as barbero,
    c.nombre as cliente
FROM appointments a
JOIN barbershops bs ON a.barbershop_id = bs.id
LEFT JOIN barbers b ON a.barber_id = b.id
LEFT JOIN clients c ON a.client_id = c.id
WHERE a.fecha = CURRENT_DATE
ORDER BY a.hora_inicio;

-- 7. RESUMEN FINAL
-- ===================================================================

DO $$
DECLARE
    barbershop_count INTEGER;
    total_appointments INTEGER;
    total_revenue DECIMAL;
BEGIN
    SELECT COUNT(*) INTO barbershop_count FROM barbershops WHERE activo = true;
    SELECT COUNT(*) INTO total_appointments FROM appointments WHERE estado = 'completada';
    SELECT COALESCE(SUM(precio_final), 0) INTO total_revenue FROM appointments WHERE estado = 'completada';
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 RESUMEN FINAL';
    RAISE NOTICE '===============';
    RAISE NOTICE '';
    
    IF barbershop_count > 0 THEN
        RAISE NOTICE '✅ Base de datos configurada y funcional';
        RAISE NOTICE '✅ % barbería(s) activa(s)', barbershop_count;
        RAISE NOTICE '✅ % cita(s) completada(s)', total_appointments;
        RAISE NOTICE '✅ ₡% en ingresos totales', total_revenue;
        RAISE NOTICE '';
        RAISE NOTICE '🚀 Sistema listo para usar!';
        RAISE NOTICE '';
        RAISE NOTICE '📋 SIGUIENTES PASOS:';
        RAISE NOTICE '   1. Crear usuarios Auth en Supabase para cada barbería';
        RAISE NOTICE '   2. Configurar variables de entorno en tu aplicación';
        RAISE NOTICE '   3. Probar login y funcionalidades';
        RAISE NOTICE '   4. Personalizar datos desde el dashboard';
    ELSE
        RAISE NOTICE '⚠️  Base de datos lista pero sin barberías';
        RAISE NOTICE '';
        RAISE NOTICE '💡 PRÓXIMOS PASOS:';
        RAISE NOTICE '   1. Ejecutar create-new-barbershop.sql para crear una barbería';
        RAISE NOTICE '   2. Crear usuario Auth correspondiente';
        RAISE NOTICE '   3. Probar funcionalidades';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '🔍 VERIFICACIÓN COMPLETADA';
    RAISE NOTICE '==========================================';
    
END $$;