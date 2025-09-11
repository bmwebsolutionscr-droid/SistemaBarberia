-- ===================================================================
-- PASO 2: CREAR ÍNDICE PARA PREVENIR TELÉFONOS DUPLICADOS
-- ===================================================================
-- Ejecutar este script DESPUÉS del paso 1

-- Crear índice único condicional para teléfonos no vacíos
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_phone_unique
ON clients (barbershop_id, telefono) 
WHERE telefono IS NOT NULL AND telefono != '';

-- Verificar que el índice se creó correctamente
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'clients' 
AND indexname = 'idx_clients_phone_unique';

SELECT '✅ PASO 2 COMPLETADO - Índice creado para prevenir duplicados' as resultado;
