-- ===================================================================
-- SCRIPT PARA AGREGAR UNA NUEVA BARBERÍA
-- ===================================================================
-- Este script permite agregar una nueva barbería a la base de datos
-- con datos básicos iniciales

-- ===================================================================
-- AGREGAR NUEVA BARBERÍA
-- ===================================================================

-- Insertar nueva barbería
-- MODIFICA LOS SIGUIENTES VALORES SEGÚN LA NUEVA BARBERÍA:
INSERT INTO barbershops (
    nombre,
    email,
    telefono,
    direccion,
    activo
) VALUES (
    'BarberMagicCR',                    -- Cambiar por el nombre real
    'Andresg1701@icloud.com',               -- Cambiar por el email real
    '+506 61678004',                           -- Cambiar por el teléfono real
    'San Rafael Alajuela',                     -- Cambiar por la dirección real
    true                                        -- true = activa, false = inactiva
);

-- Obtener el ID de la barbería recién creada para usarlo en los siguientes inserts
-- (Opcional) También puedes ejecutar este query para ver la barbería creada:
/*
SELECT 
    id,
    nombre,
    email,
    telefono,
    direccion,
    activo,
    created_at,
    updated_at
FROM barbershops 
WHERE email = 'contacto@nuevabarberia.com';  -- Cambiar por el email que usaste arriba
*/

-- ===================================================================
-- AGREGAR BARBEROS INICIALES (OPCIONAL)
-- ===================================================================
-- Si quieres agregar barberos desde el inicio, descomenta y modifica lo siguiente:

/*
-- Primero necesitas obtener el barbershop_id de la barbería recién creada
-- Reemplaza 'TU_BARBERSHOP_ID_AQUI' con el ID real

INSERT INTO barbers (
    barbershop_id,
    nombre,
    telefono,
    especialidad,
    activo
) VALUES 
(
    'TU_BARBERSHOP_ID_AQUI',                   -- Reemplazar con el ID de la barbería
    'Juan Pérez',                              -- Nombre del barbero
    '+506 7777-7777',                          -- Teléfono del barbero
    'Cortes clásicos y barba',                 -- Especialidad
    true                                       -- true = activo, false = inactivo
),
(
    'TU_BARBERSHOP_ID_AQUI',                   -- Reemplazar con el ID de la barbería
    'Carlos González',                         -- Nombre del segundo barbero
    '+506 6666-6666',                          -- Teléfono del segundo barbero
    'Cortes modernos y diseños',               -- Especialidad
    true                                       -- true = activo, false = inactivo
);
*/

-- ===================================================================
-- VERIFICAR LA CREACIÓN
-- ===================================================================
-- Ejecuta estas consultas para verificar que todo se creó correctamente:

-- Ver todas las barberías
SELECT 
    id,
    nombre,
    email,
    telefono,
    direccion,
    activo,
    created_at
FROM barbershops 
ORDER BY created_at DESC;

-- Ver barberos de la nueva barbería (si agregaste algunos)
/*
SELECT 
    b.nombre as barberia,
    br.nombre as barbero,
    br.telefono,
    br.especialidad,
    br.activo,
    br.created_at
FROM barbershops b
JOIN barbers br ON b.id = br.barbershop_id
WHERE b.email = 'contacto@nuevabarberia.com'  -- Cambiar por el email que usaste
ORDER BY br.created_at DESC;
*/
