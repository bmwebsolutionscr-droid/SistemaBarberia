-- ===================================================================
-- SCRIPT PARA SOLUCIONAR PROBLEMA DE AUTENTICACIÓN
-- ===================================================================
-- Este script verifica y corrige la vinculación entre el usuario 
-- autenticado y la barbería en la base de datos

-- ===================================================================
-- 1. VERIFICAR BARBERÍAS EXISTENTES
-- ===================================================================
-- Ejecuta esto primero para ver qué barberías tienes:

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
-- 2. VERIFICAR USUARIOS EN SUPABASE AUTH
-- ===================================================================
-- Ve a tu panel de Supabase > Authentication > Users
-- y verifica que el email del usuario coincida EXACTAMENTE
-- con el email de la barbería que aparece arriba

-- ===================================================================
-- 3. OPCIÓN A: ACTUALIZAR EMAIL DE LA BARBERÍA
-- ===================================================================
-- Si el email del usuario en Auth es diferente al de la barbería,
-- puedes actualizar el email de la barbería para que coincida:

-- EJEMPLO: Si tu usuario Auth tiene 'usuario@ejemplo.com'
-- y tu barbería tiene 'Andresg1701@icloud.com'

/*
UPDATE barbershops 
SET email = 'EL_EMAIL_DE_TU_USUARIO_AUTH_AQUI'  -- Reemplazar con el email exacto de Auth
WHERE email = 'Andresg1701@icloud.com';  -- Tu email actual de barbería
*/

-- ===================================================================
-- 4. OPCIÓN B: CREAR NUEVO USUARIO EN AUTH
-- ===================================================================
-- Alternativamente, puedes crear un nuevo usuario en Supabase Auth
-- con el email que ya tienes en la barbería:
-- 1. Ve a Supabase > Authentication > Users
-- 2. Clic en "Invite a user" o "Add user"
-- 3. Usar el email: Andresg1701@icloud.com
-- 4. Establecer una contraseña

-- ===================================================================
-- 5. VERIFICAR LA CORRECCIÓN
-- ===================================================================
-- Después de hacer la corrección, verifica que todo esté bien:

-- Ver barbería actualizada:
SELECT 
    id,
    nombre,
    email,
    telefono,
    direccion,
    activo
FROM barbershops 
WHERE email = 'EL_EMAIL_QUE_USASTE';  -- Reemplazar con el email correcto

-- ===================================================================
-- 6. PROBAR AUTENTICACIÓN
-- ===================================================================
-- Ahora intenta:
-- 1. Cerrar sesión en el sistema
-- 2. Iniciar sesión con el email y contraseña correctos
-- 3. Debería funcionar sin problemas

-- ===================================================================
-- NOTAS IMPORTANTES:
-- ===================================================================
-- El sistema verifica que auth.jwt() ->> 'email' = barbershops.email
-- Esto significa que deben ser EXACTAMENTE iguales:
-- - Mismo caso (mayúsculas/minúsculas)
-- - Sin espacios adicionales
-- - Sin caracteres especiales extra

-- Si sigues teniendo problemas, también puedes ejecutar:
/*
-- Ver las políticas RLS activas:
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('barbershops', 'barbers', 'clients', 'appointments');
*/
