-- Script para completar la migración de tipos de servicio
-- Ejecutar solo las partes que faltan

-- Solo agregar duracion_corte_barba a barbershops si no existe
ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS duracion_corte_barba INTEGER DEFAULT 60;

-- Actualizar barberías existentes que no tengan este valor
UPDATE barbershops 
SET duracion_corte_barba = 60
WHERE duracion_corte_barba IS NULL;

-- Verificar que todo esté correcto
SELECT 'appointments columns' as table_info;
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'appointments' 
  AND column_name IN ('tipo_servicio', 'duracion_minutos');

SELECT 'barbershops columns' as table_info;
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'barbershops' 
  AND column_name = 'duracion_corte_barba';
