-- ===================================================================
-- DIAGNÓSTICO COMPLETO DE VALORES DE HORARIO DE ALMUERZO
-- ===================================================================
-- Este script muestra exactamente qué valores están guardados en la BD

-- Mostrar todos los valores relacionados con horarios
SELECT 
    nombre,
    '--- HORARIOS PRINCIPALES ---' as separador1,
    hora_apertura,
    hora_cierre,
    '--- HORARIOS DE ALMUERZO ---' as separador2,
    hora_almuerzo_inicio,
    hora_almuerzo_fin,
    almuerzo_activo,
    '--- TIPOS DE DATOS ---' as separador3,
    pg_typeof(hora_apertura) as tipo_apertura,
    pg_typeof(hora_cierre) as tipo_cierre,
    pg_typeof(hora_almuerzo_inicio) as tipo_almuerzo_inicio,
    pg_typeof(hora_almuerzo_fin) as tipo_almuerzo_fin,
    pg_typeof(almuerzo_activo) as tipo_almuerzo_activo
FROM barbershops;

-- Verificar si hay valores NULL o problemáticos
SELECT 
    'DIAGNÓSTICO DE PROBLEMAS POTENCIALES' as info;

SELECT 
    COUNT(*) as total_registros,
    COUNT(hora_almuerzo_inicio) as registros_con_hora_inicio,
    COUNT(hora_almuerzo_fin) as registros_con_hora_fin,
    COUNT(CASE WHEN almuerzo_activo = true THEN 1 END) as registros_con_almuerzo_activo
FROM barbershops;

-- Mostrar registros problemáticos
SELECT 
    'REGISTROS PROBLEMÁTICOS (si los hay):' as info;
    
SELECT 
    nombre,
    hora_almuerzo_inicio,
    hora_almuerzo_fin,
    almuerzo_activo,
    CASE 
        WHEN hora_almuerzo_inicio IS NULL THEN '⚠️ Hora inicio es NULL'
        WHEN hora_almuerzo_fin IS NULL THEN '⚠️ Hora fin es NULL'
        WHEN almuerzo_activo IS NULL THEN '⚠️ Almuerzo activo es NULL'
        ELSE '✅ Valores OK'
    END as diagnostico
FROM barbershops
WHERE hora_almuerzo_inicio IS NULL 
   OR hora_almuerzo_fin IS NULL 
   OR almuerzo_activo IS NULL;

-- Si no hay registros problemáticos, mostrar configuración actual
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO HAY REGISTROS PROBLEMÁTICOS - Configuración parece correcta'
        ELSE '❌ HAY ' || COUNT(*) || ' REGISTROS CON PROBLEMAS'
    END as resultado_final
FROM barbershops
WHERE hora_almuerzo_inicio IS NULL 
   OR hora_almuerzo_fin IS NULL 
   OR almuerzo_activo IS NULL;