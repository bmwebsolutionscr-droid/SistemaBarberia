-- Agregar tipo de servicio y duración a las citas
-- Ejecutar este script en la base de datos de Supabase

-- Primero agregar duracion_corte_barba a la tabla barbershops
ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS duracion_corte_barba INTEGER DEFAULT 60;

-- Comentario para la nueva columna de barbershops
COMMENT ON COLUMN barbershops.duracion_corte_barba IS 'Duración del servicio de corte + barba en minutos';

-- Actualizar barberías existentes con valor por defecto
UPDATE barbershops 
SET duracion_corte_barba = COALESCE(duracion_corte_barba, 60)
WHERE duracion_corte_barba IS NULL;

-- Agregar nuevas columnas a la tabla appointments
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS tipo_servicio VARCHAR(20) DEFAULT 'corte',
ADD COLUMN IF NOT EXISTS duracion_minutos INTEGER DEFAULT 30;

-- Agregar comentarios a las nuevas columnas
COMMENT ON COLUMN appointments.tipo_servicio IS 'Tipo de servicio: corte o corte_barba';
COMMENT ON COLUMN appointments.duracion_minutos IS 'Duración del servicio en minutos';

-- Actualizar citas existentes con valores por defecto
UPDATE appointments 
SET 
  tipo_servicio = COALESCE(tipo_servicio, 'corte'),
  duracion_minutos = COALESCE(duracion_minutos, 30)
WHERE tipo_servicio IS NULL OR duracion_minutos IS NULL;

-- Agregar restricción para tipo_servicio
-- Nota: se elimina la restricción rígida para permitir tipos de servicio dinámicos

-- Agregar columna para tipos de servicio personalizados en barberías (JSON)
ALTER TABLE barbershops
ADD COLUMN IF NOT EXISTS tipos_servicio JSONB DEFAULT '[{"key":"corte","label":"Corte Normal","precio":15000,"duracion":30},{"key":"corte_barba","label":"Corte + Barba","precio":20000,"duracion":60}]';

COMMENT ON COLUMN barbershops.tipos_servicio IS 'Lista JSON de tipos de servicio con key, label, precio y duracion (minutos)';

-- Verificar la estructura actualizada de appointments
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'appointments' 
ORDER BY ordinal_position;

-- Crear una vista para exponer los tipos de servicio por barbería como filas
CREATE OR REPLACE VIEW barbershop_service_types AS
SELECT
  b.id AS barbershop_id,
  elem ->> 'key' AS service_key,
  elem ->> 'label' AS service_label,
  (elem ->> 'precio')::INTEGER AS precio,
  (elem ->> 'duracion')::INTEGER AS duracion_minutos
FROM barbershops b,
LATERAL jsonb_array_elements(COALESCE(b.tipos_servicio, '[]'::jsonb)) AS elem;

COMMENT ON VIEW barbershop_service_types IS 'Vista: lista de tipos de servicio (key,label,precio,duracion) por barbería extraída de barbershops.tipos_servicio';

-- Verificar la estructura actualizada de barbershops
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'barbershops' 
AND column_name LIKE '%duracion%'
ORDER BY ordinal_position;
