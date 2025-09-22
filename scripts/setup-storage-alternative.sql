-- ===================================================================
-- CONFIGURACIÓN ALTERNATIVA DE STORAGE PARA LOGOS
-- ===================================================================
-- Este script maneja el caso donde Storage no está inicializado

-- ===================================================================
-- 1. VERIFICAR SI STORAGE ESTÁ DISPONIBLE
-- ===================================================================

DO $$
BEGIN
    -- Intentar verificar si existe el schema de storage
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        RAISE NOTICE '✅ Schema storage existe';
        
        -- Verificar si existe la tabla policies
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'policies') THEN
            RAISE NOTICE '✅ Tabla storage.policies existe - Storage está configurado';
        ELSE
            RAISE NOTICE '❌ Tabla storage.policies NO existe - Storage necesita configuración manual';
        END IF;
        
        -- Verificar si existe la tabla buckets
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
            RAISE NOTICE '✅ Tabla storage.buckets existe';
        ELSE
            RAISE NOTICE '❌ Tabla storage.buckets NO existe';
        END IF;
    ELSE
        RAISE NOTICE '❌ Schema storage NO existe - Storage no está habilitado';
    END IF;
END $$;

-- ===================================================================
-- 2. CONFIGURAR SOLO LA TABLA BARBERSHOPS (SIEMPRE FUNCIONA)
-- ===================================================================

-- Verificar que la columna logo_url existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'barbershops' 
            AND column_name = 'logo_url'
        ) 
        THEN '✅ Campo logo_url existe en barbershops'
        ELSE '❌ Campo logo_url NO existe en barbershops'
    END as logo_field_status;

-- ===================================================================
-- 3. ACTUALIZAR RLS POLICIES PARA BARBERSHOPS
-- ===================================================================

-- Eliminar policies existentes que puedan estar causando conflicto
DROP POLICY IF EXISTS "Barbershops can read their own data" ON barbershops;
DROP POLICY IF EXISTS "Barbershops can update their own data" ON barbershops;
DROP POLICY IF EXISTS "Barbershops can insert their own data" ON barbershops;

-- Crear policy para lectura (SELECT)
CREATE POLICY "Barbershops can read their own data"
ON barbershops
FOR SELECT
TO authenticated
USING (email = auth.jwt() ->> 'email');

-- Crear policy para actualización (UPDATE) - INCLUYE logo_url
CREATE POLICY "Barbershops can update their own data"
ON barbershops
FOR UPDATE
TO authenticated
USING (email = auth.jwt() ->> 'email')
WITH CHECK (email = auth.jwt() ->> 'email');

-- Crear policy para inserción (INSERT) si es necesario
CREATE POLICY "Barbershops can insert their own data"
ON barbershops
FOR INSERT
TO authenticated
WITH CHECK (email = auth.jwt() ->> 'email');

-- ===================================================================
-- 4. VERIFICAR CONFIGURACIÓN ACTUAL
-- ===================================================================

-- Mostrar policies actuales de la tabla barbershops
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'barbershops'
ORDER BY policyname;

-- Verificar usuario actual
SELECT 
    'Usuario autenticado: ' || COALESCE(auth.jwt() ->> 'email', 'NO AUTENTICADO') as auth_status;

-- Verificar estructura de la tabla barbershops
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'barbershops'
AND column_name IN ('id', 'email', 'logo_url')
ORDER BY ordinal_position;

-- ===================================================================
-- 5. MENSAJE DE INSTRUCCIONES
-- ===================================================================

DO $$
BEGIN
    RAISE NOTICE '
    ===================================================================
    📋 CONFIGURACIÓN ALTERNATIVA COMPLETADA
    ===================================================================
    
    ✅ POLÍTICAS RLS ACTUALIZADAS:
    - Barbershops pueden leer sus propios datos
    - Barbershops pueden actualizar sus propios datos (incluye logo_url)
    - Barbershops pueden insertar sus propios datos
    
    🔧 PARA HABILITAR STORAGE COMPLETAMENTE:
    
    OPCIÓN 1 - MANUAL EN SUPABASE DASHBOARD:
    1. Ve a Storage en el panel lateral de Supabase
    2. Si Storage no está habilitado, click "Enable Storage"  
    3. Click "New Bucket"
    4. Crear bucket con estos datos:
       - Name: barbershop-assets
       - Public: ✅ SÍ (para acceso público a logos)
       - File size limit: 2MB
       - Allowed MIME types: image/png,image/jpeg,image/gif,image/webp
    
    OPCIÓN 2 - URL EXTERNA (MÁS SIMPLE):
    - Usar servicios como Cloudinary, ImgBB, o similar
    - Guardar solo la URL en el campo logo_url
    - No requiere configuración de Storage
    
    📝 PRUEBA LA FUNCIONALIDAD:
    1. Intenta subir un logo desde la aplicación
    2. Si falla, usa la opción de URL externa
    3. Verifica que logo_url se actualiza correctamente
    
    ';
END $$;

-- ===================================================================
-- 6. SCRIPT DE PRUEBA SIMPLE
-- ===================================================================

-- Función para probar actualización de logo_url
CREATE OR REPLACE FUNCTION test_logo_update(test_url text DEFAULT 'https://example.com/test-logo.png')
RETURNS text AS $$
DECLARE
    user_email text;
    barbershop_id uuid;
    result text;
BEGIN
    -- Obtener email del usuario autenticado
    user_email := auth.jwt() ->> 'email';
    
    IF user_email IS NULL THEN
        RETURN '❌ Usuario no autenticado';
    END IF;
    
    -- Buscar barbershop del usuario
    SELECT id INTO barbershop_id
    FROM barbershops
    WHERE email = user_email;
    
    IF barbershop_id IS NULL THEN
        RETURN '❌ No se encontró barbershop para el usuario: ' || user_email;
    END IF;
    
    -- Intentar actualizar logo_url
    UPDATE barbershops 
    SET logo_url = test_url 
    WHERE id = barbershop_id;
    
    IF FOUND THEN
        RETURN '✅ Logo actualizado correctamente para barbershop: ' || barbershop_id::text;
    ELSE
        RETURN '❌ No se pudo actualizar el logo - verificar RLS policies';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN '❌ Error: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Para probar, ejecuta: SELECT test_logo_update();