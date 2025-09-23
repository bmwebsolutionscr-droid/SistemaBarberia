-- ===================================================================
-- VERIFICAR ESTADO DE LOS CAMPOS DE HORARIO DE ALMUERZO
-- ===================================================================
-- Este script verifica si los campos de horario de almuerzo ya están
-- agregados a la tabla barbershops

-- Verificar que los campos existen
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN ('hora_almuerzo_inicio', 'hora_almuerzo_fin', 'almuerzo_activo') 
        THEN '✅ EXISTE' 
        ELSE '❌ NO EXISTE' 
    END as estado
FROM information_schema.columns 
WHERE table_name = 'barbershops' 
AND table_schema = 'public'
AND column_name IN ('hora_almuerzo_inicio', 'hora_almuerzo_fin', 'almuerzo_activo')
ORDER BY column_name;

-- Contar cuántos campos de almuerzo existen
SELECT 
    COUNT(*) as campos_almuerzo_existentes,
    CASE 
        WHEN COUNT(*) = 3 THEN '✅ TODOS LOS CAMPOS EXISTEN - Base de datos actualizada'
        WHEN COUNT(*) = 0 THEN '❌ NO EXISTEN CAMPOS - Necesita ejecutar add-lunch-hours.sql'
        ELSE '⚠️ CAMPOS PARCIALES - Verificar y ejecutar add-lunch-hours.sql'
    END as estado_general
FROM information_schema.columns 
WHERE table_name = 'barbershops' 
AND table_schema = 'public'
AND column_name IN ('hora_almuerzo_inicio', 'hora_almuerzo_fin', 'almuerzo_activo');

-- Si los campos existen, mostrar la configuración actual
DO $$
DECLARE
    campo_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO campo_count
    FROM information_schema.columns 
    WHERE table_name = 'barbershops' 
    AND table_schema = 'public'
    AND column_name IN ('hora_almuerzo_inicio', 'hora_almuerzo_fin', 'almuerzo_activo');
    
    IF campo_count = 3 THEN
        RAISE NOTICE '--- CONFIGURACIÓN ACTUAL DE HORARIOS DE ALMUERZO ---';
        -- La consulta se mostrará después si los campos existen
    END IF;
END $$;

-- Mostrar configuración actual (solo si los campos existen)
-- Descomenta la siguiente línea SOLO si los campos ya existen:
/*
SELECT 
    nombre,
    hora_apertura,
    hora_almuerzo_inicio,
    hora_almuerzo_fin,
    hora_cierre,
    almuerzo_activo
FROM barbershops;
*/