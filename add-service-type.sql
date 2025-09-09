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
ALTER TABLE appointments 
ADD CONSTRAINT appointments_tipo_servicio_check 
CHECK (tipo_servicio IN ('corte', 'corte_barba'));

-- Verificar la estructura actualizada de appointments
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'appointments' 
ORDER BY ordinal_position;

-- Verificar la estructura actualizada de barbershops
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'barbershops' 
AND column_name LIKE '%duracion%'
ORDER BY ordinal_position;
