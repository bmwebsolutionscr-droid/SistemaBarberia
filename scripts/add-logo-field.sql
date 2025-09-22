-- Agregar campo logo_url a la tabla barbershops
-- Script SQL seguro que no afecta datos existentes

-- Verificar si el campo ya existe antes de agregarlo
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'barbershops' 
        AND column_name = 'logo_url'
    ) THEN
        -- Agregar campo logo_url si no existe
        ALTER TABLE barbershops 
        ADD COLUMN logo_url TEXT;
        
        RAISE NOTICE '✅ Campo logo_url agregado a tabla barbershops';
    ELSE
        RAISE NOTICE 'ℹ️  Campo logo_url ya existe en tabla barbershops';
    END IF;
END $$;

-- Agregar comentario descriptivo al campo
COMMENT ON COLUMN barbershops.logo_url IS 'URL pública del logo de la barbería almacenado en Supabase Storage';

-- Verificar que el campo se agregó correctamente
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'barbershops' 
AND column_name = 'logo_url';