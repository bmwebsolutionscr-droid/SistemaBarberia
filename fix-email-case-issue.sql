-- ===================================================================
-- SOLUCIÓN FINAL - CORRECCIÓN DE MAYÚSCULAS/MINÚSCULAS
-- ===================================================================

-- PROBLEMA IDENTIFICADO:
-- Usuario Auth: andresg1701@icloud.com (minúscula)
-- Barbería BD:  Andresg1701@icloud.com (mayúscula)

-- ===================================================================
-- PASO 1: CORREGIR EMAIL DE LA BARBERÍA
-- ===================================================================
-- Actualizar el email de tu barbería para que coincida exactamente
-- con el email del usuario en Authentication

UPDATE barbershops 
SET email = 'andresg1701@icloud.com'  -- minúscula (igual que en Auth)
WHERE email = 'Andresg1701@icloud.com'  -- mayúscula (actual en BD)
AND nombre = 'BarberMagicCR';

-- ===================================================================
-- PASO 2: ELIMINAR BARBERÍA DE DATOS DE PRUEBA (OPCIONAL)
-- ===================================================================
-- Eliminar la barbería de prueba para evitar confusiones

DELETE FROM barbershops 
WHERE email = 'barberia@barbermagic.com'
AND nombre = 'Barber Magic';

-- ===================================================================
-- PASO 3: VERIFICAR CORRECCIÓN
-- ===================================================================
-- Debe mostrar solo tu barbería con el email correcto

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

-- Resultado esperado:
-- | nombre        | email                  | activo |
-- | BarberMagicCR | andresg1701@icloud.com | true   |

-- ===================================================================
-- PASO 4: VERIFICAR COINCIDENCIA
-- ===================================================================
-- Este query debería devolver 1 fila si todo está correcto:

SELECT 
    'CORRECTO - Email coincide' as status,
    b.nombre,
    b.email as barberia_email
FROM barbershops b 
WHERE b.email = 'andresg1701@icloud.com';

-- Si no devuelve ninguna fila, hay un problema
-- Si devuelve 1 fila, ¡está solucionado!

-- ===================================================================
-- INSTRUCCIONES FINALES
-- ===================================================================
-- 1. Ejecuta este script completo en Supabase SQL Editor
-- 2. Ve a tu aplicación web
-- 3. Cierra sesión si estás logueado
-- 4. Inicia sesión con:
--    Email: andresg1701@icloud.com
--    Password: [tu contraseña]
-- 5. ¡Debería funcionar perfectamente!
