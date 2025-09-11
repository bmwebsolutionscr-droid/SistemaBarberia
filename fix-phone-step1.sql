-- ===================================================================
-- PASO 1: HACER EL TELÉFONO OPCIONAL
-- ===================================================================
-- Ejecutar este script primero

-- Cambiar la restricción NOT NULL del campo telefono
ALTER TABLE clients 
ALTER COLUMN telefono DROP NOT NULL;

-- Verificar los cambios
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'clients' 
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '✅ PASO 1 COMPLETADO - Teléfono ahora es opcional' as resultado;
