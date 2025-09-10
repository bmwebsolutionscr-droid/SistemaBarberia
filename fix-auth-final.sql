-- ===================================================================
-- SCRIPT PARA CORREGIR PROBLEMA DE AUTENTICACIÓN
-- ===================================================================
-- Tienes 2 barberías registradas:
-- 1. BarberMagicCR - Andresg1701@icloud.com
-- 2. Barber Magic - barberia@barbermagic.com
-- 
-- NECESITAS elegir UNA opción según tu situación

-- ===================================================================
-- OPCIÓN 1: USAR LA BARBERÍA "BarberMagicCR" (Recomendado)
-- ===================================================================
-- Si quieres usar tu barbería "BarberMagicCR" con el email Andresg1701@icloud.com:

-- A. Ve a Supabase Dashboard > Authentication > Users
-- B. Crea un usuario nuevo con:
--    Email: Andresg1701@icloud.com
--    Password: [tu contraseña deseada]
-- C. O si ya tienes un usuario, actualiza su email a: Andresg1701@icloud.com

-- ===================================================================
-- OPCIÓN 2: ACTUALIZAR EMAIL DE TU BARBERÍA
-- ===================================================================
-- Si prefieres mantener tu usuario actual de Auth, actualiza el email de tu barbería:

-- IMPORTANTE: Primero ve a Supabase > Authentication > Users 
-- y copia el email EXACTO del usuario que estás usando

-- Luego ejecuta (reemplaza EMAIL_DE_TU_USUARIO_AUTH con el email real):
/*
UPDATE barbershops 
SET email = 'EMAIL_DE_TU_USUARIO_AUTH'  -- Email exacto de tu usuario en Auth
WHERE id = '1da4b905-64d0-4224-a4a0-6ccdad245a7b'  -- ID de BarberMagicCR
AND nombre = 'BarberMagicCR';
*/

-- ===================================================================
-- OPCIÓN 3: ELIMINAR BARBERÍA DUPLICADA
-- ===================================================================
-- Si quieres mantener solo una barbería, elimina la de datos de prueba:

/*
DELETE FROM barbershops 
WHERE id = '3b2d426c-c1e0-4957-8dd2-037b4e08bacd'  -- ID de Barber Magic (datos prueba)
AND nombre = 'Barber Magic';
*/

-- ===================================================================
-- OPCIÓN 4: USAR LA BARBERÍA DE PRUEBA
-- ===================================================================
-- Si prefieres usar la barbería de prueba "Barber Magic":

-- A. Crea usuario en Auth con email: barberia@barbermagic.com
-- B. O elimina tu barbería personalizada:
/*
DELETE FROM barbershops 
WHERE id = '1da4b905-64d0-4224-a4a0-6ccdad245a7b'  -- ID de BarberMagicCR
AND nombre = 'BarberMagicCR';
*/

-- ===================================================================
-- VERIFICACIÓN FINAL
-- ===================================================================
-- Después de elegir una opción, verifica que todo esté correcto:

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

-- ===================================================================
-- INSTRUCCIONES PASO A PASO
-- ===================================================================

-- 1. Ve a tu Supabase Dashboard
-- 2. Authentication > Users
-- 3. Revisa qué email tiene tu usuario actual
-- 4. Decide qué opción usar (recomiendo OPCIÓN 1 o OPCIÓN 2)
-- 5. Ejecuta el código correspondiente
-- 6. Cierra sesión en tu app y vuelve a iniciar sesión
-- 7. ¡Debería funcionar!

-- ===================================================================
-- EJEMPLO COMPLETO - OPCIÓN 1 (RECOMENDADA)
-- ===================================================================
-- Si eliges mantener BarberMagicCR con Andresg1701@icloud.com:

-- 1. En Supabase Auth, asegúrate de tener un usuario con email: Andresg1701@icloud.com
-- 2. Elimina la barbería de prueba:
/*
DELETE FROM barbershops 
WHERE email = 'barberia@barbermagic.com';
*/

-- 3. Verifica que solo quede tu barbería:
/*
SELECT * FROM barbershops WHERE nombre = 'BarberMagicCR';
*/

-- ¡Listo! Ahora debería funcionar la autenticación.
