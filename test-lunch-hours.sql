-- ===================================================================
-- SCRIPT DE PRUEBA PARA VALIDAR HORARIO DE ALMUERZO
-- ===================================================================
-- Este script te permite probar diferentes configuraciones de almuerzo

-- Configurar horario de almuerzo de prueba: 13:00 - 14:30
UPDATE barbershops 
SET 
    almuerzo_activo = true,
    hora_almuerzo_inicio = '13:00',
    hora_almuerzo_fin = '14:30',
    hora_apertura = '08:00',
    hora_cierre = '18:00',
    duracion_cita = 30
WHERE id = (SELECT id FROM barbershops LIMIT 1);

-- Verificar la configuración aplicada
SELECT 
    nombre,
    hora_apertura as apertura,
    hora_almuerzo_inicio as almuerzo_inicio,
    hora_almuerzo_fin as almuerzo_fin,
    hora_cierre as cierre,
    almuerzo_activo as almuerzo_on,
    duracion_cita as duracion_min
FROM barbershops;

-- Mostrar resultado esperado
SELECT '=== RESULTADO ESPERADO ===' as info;
SELECT 'Con almuerzo 13:00-14:30, los horarios DISPONIBLES deberían ser:' as descripcion;
SELECT '✅ 08:00, 08:30, 09:00, 09:30, 10:00, 10:30, 11:00, 11:30, 12:00, 12:30' as disponibles_manana;
SELECT '❌ 13:00, 13:30, 14:00 (EXCLUIDOS por almuerzo)' as excluidos_almuerzo;
SELECT '✅ 14:30, 15:00, 15:30, 16:00, 16:30, 17:00, 17:30 (disponibles tarde)' as disponibles_tarde;

SELECT '=== INSTRUCCIONES PARA PROBAR ===' as info;
SELECT '1. Ejecuta este script' as paso1;
SELECT '2. Refresca tu aplicación (Ctrl+F5)' as paso2;
SELECT '3. Ve a crear una nueva cita' as paso3;
SELECT '4. Mira la consola del navegador (F12) para ver los logs' as paso4;
SELECT '5. Verifica que NO aparezcan: 13:00, 13:30, 14:00' as paso5;
SELECT '6. Verifica que SÍ aparezcan: 12:30 y 14:30' as paso6;