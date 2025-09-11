-- ===================================================================
-- SCRIPT PARA HACER EL TELÉFONO DE CLIENTE OPCIONAL
-- ===================================================================
-- Este script modifica la tabla clients para que el teléfono sea opcional
-- y previene conflictos cuando dos clientes tienen el mismo número

-- ===================================================================
-- PASO 1: HACER EL CAMPO TELEFONO OPCIONAL
-- ===================================================================
-- Cambiar la restricción NOT NULL del campo telefono
ALTER TABLE clients 
ALTER COLUMN telefono DROP NOT NULL;

-- ===================================================================
-- PASO 2: AGREGAR ÍNDICE ÚNICO CONDICIONAL PARA TELÉFONOS NO VACÍOS
-- ===================================================================
-- Esto permite que múltiples clientes tengan teléfono NULL o vacío,
-- pero evita duplicados para números reales
-- NOTA: Ejecutar este comando POR SEPARADO después del ALTER TABLE
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_phone_unique
ON clients (barbershop_id, telefono) 
WHERE telefono IS NOT NULL AND telefono != '';

-- ===================================================================
-- PASO 3: VERIFICAR LOS CAMBIOS
-- ===================================================================
-- Consultar la estructura actualizada de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'clients' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ===================================================================
-- PASO 4: PROBAR LA FUNCIONALIDAD
-- ===================================================================
-- Estas consultas deberían funcionar sin errores después del cambio:

-- Insertar cliente sin teléfono (debe funcionar)
/*
INSERT INTO clients (barbershop_id, nombre) 
SELECT id, 'Cliente Sin Teléfono Test' 
FROM barbershops 
LIMIT 1;
*/

-- Insertar dos clientes con el mismo teléfono vacío (debe funcionar)
/*
INSERT INTO clients (barbershop_id, nombre, telefono) 
SELECT id, 'Cliente Test 1', '' 
FROM barbershops 
LIMIT 1;

INSERT INTO clients (barbershop_id, nombre, telefono) 
SELECT id, 'Cliente Test 2', '' 
FROM barbershops 
LIMIT 1;
*/

-- Insertar dos clientes con el mismo teléfono real (debe fallar)
/*
INSERT INTO clients (barbershop_id, nombre, telefono) 
SELECT id, 'Cliente Test 3', '+506 1234-5678' 
FROM barbershops 
LIMIT 1;

INSERT INTO clients (barbershop_id, nombre, telefono) 
SELECT id, 'Cliente Test 4', '+506 1234-5678' 
FROM barbershops 
LIMIT 1;
*/

-- ===================================================================
-- LIMPIAR DATOS DE PRUEBA (OPCIONAL)
-- ===================================================================
-- Ejecutar solo si creaste los datos de prueba arriba
/*
DELETE FROM clients 
WHERE nombre IN ('Cliente Sin Teléfono Test', 'Cliente Test 1', 'Cliente Test 2', 'Cliente Test 3', 'Cliente Test 4');
*/

SELECT 'Cambios aplicados correctamente - El teléfono ahora es opcional' as resultado;
