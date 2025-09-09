-- Script para verificar la estructura actual de la base de datos
-- Ejecutar en Supabase SQL Editor para ver qué ya está implementado

-- Verificar columnas en la tabla appointments
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'appointments' 
    AND column_name IN ('tipo_servicio', 'duracion_minutos')
ORDER BY ordinal_position;

-- Verificar columnas en la tabla barbershops
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'barbershops' 
    AND column_name = 'duracion_corte_barba'
ORDER BY ordinal_position;

-- Verificar constraints existentes
SELECT 
    constraint_name,
    constraint_type,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%appointments%tipo%';

-- Verificar datos de ejemplo en appointments
SELECT 
    id,
    tipo_servicio,
    duracion_minutos,
    fecha,
    hora
FROM appointments 
LIMIT 5;

-- Verificar datos en barbershops
SELECT 
    id,
    nombre,
    duracion_corte_barba
FROM barbershops 
LIMIT 3;
