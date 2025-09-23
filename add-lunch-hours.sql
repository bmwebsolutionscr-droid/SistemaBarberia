-- ===================================================================
-- AGREGAR CONFIGURACIÓN DE HORARIO DE ALMUERZO
-- ===================================================================
-- Este script agrega los campos necesarios para configurar el horario
-- de almuerzo de cada barbería

-- Agregar campos de horario de almuerzo a la tabla barbershops
ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS hora_almuerzo_inicio TIME DEFAULT '12:00';

ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS hora_almuerzo_fin TIME DEFAULT '13:00';

ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS almuerzo_activo BOOLEAN DEFAULT true;

-- Comentarios para documentar los campos
COMMENT ON COLUMN barbershops.hora_almuerzo_inicio IS 'Hora de inicio del almuerzo (formato TIME)';
COMMENT ON COLUMN barbershops.hora_almuerzo_fin IS 'Hora de fin del almuerzo (formato TIME)';
COMMENT ON COLUMN barbershops.almuerzo_activo IS 'Si está activo el bloqueo de horario de almuerzo';

-- Verificar que los campos se agregaron correctamente
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'barbershops' 
AND column_name IN ('hora_almuerzo_inicio', 'hora_almuerzo_fin', 'almuerzo_activo')
AND table_schema = 'public'
ORDER BY column_name;

-- Mostrar resultado
SELECT '✅ Campos de horario de almuerzo agregados exitosamente' as resultado;

-- Ejemplo de consulta para ver la configuración
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