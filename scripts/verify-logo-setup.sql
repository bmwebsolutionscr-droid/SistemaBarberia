-- ===================================================================
-- LIMPIAR Y VERIFICAR CONFIGURACIÓN COMPLETA
-- ===================================================================

-- 1. LIMPIAR POLÍTICAS DUPLICADAS DE BARBERSHOPS
-- ===================================================================

-- Eliminar la política antigua que puede causar conflicto
DROP POLICY IF EXISTS "Barbershops can view own data" ON barbershops;

-- Verificar políticas actuales de barbershops (debe quedar solo 3)
SELECT 
    '📋 BARBERSHOPS POLICIES:' as status,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'barbershops'
ORDER BY policyname;

-- 2. VERIFICAR POLÍTICAS DE STORAGE
-- ===================================================================

-- Verificar políticas de storage.objects
SELECT 
    '📁 STORAGE POLICIES:' as status,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY cmd, policyname;

-- 3. VERIFICAR CONFIGURACIÓN DEL BUCKET
-- ===================================================================

-- Verificar que el bucket existe y está bien configurado
SELECT 
    '🪣 BUCKET STATUS:' as status,
    id as bucket_name,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'barbershop-assets';

-- 4. VERIFICAR CAMPO LOGO_URL
-- ===================================================================

-- Verificar que el campo logo_url existe en barbershops
SELECT 
    '🏷️ LOGO_URL FIELD:' as status,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'barbershops'
AND column_name = 'logo_url';

-- 5. FUNCIÓN DE PRUEBA
-- ===================================================================

-- Función para probar toda la configuración
CREATE OR REPLACE FUNCTION test_logo_configuration()
RETURNS TABLE (
    test_name text,
    status text,
    result text
) AS $$
DECLARE
    user_email text;
    barbershop_count integer;
    bucket_exists boolean;
    policies_count integer;
BEGIN
    -- Test 1: Usuario autenticado
    user_email := auth.jwt() ->> 'email';
    RETURN QUERY SELECT 
        'Usuario autenticado'::text,
        CASE WHEN user_email IS NOT NULL THEN '✅ PASS' ELSE '❌ FAIL' END,
        COALESCE('Email: ' || user_email, 'No hay usuario autenticado');
    
    -- Test 2: Barbershop existe
    SELECT COUNT(*) INTO barbershop_count
    FROM barbershops 
    WHERE email = user_email;
    
    RETURN QUERY SELECT 
        'Barbershop del usuario'::text,
        CASE WHEN barbershop_count > 0 THEN '✅ PASS' ELSE '❌ FAIL' END,
        'Barberías encontradas: ' || barbershop_count::text;
    
    -- Test 3: Bucket existe
    SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'barbershop-assets') INTO bucket_exists;
    
    RETURN QUERY SELECT 
        'Bucket barbershop-assets'::text,
        CASE WHEN bucket_exists THEN '✅ PASS' ELSE '❌ FAIL' END,
        'Bucket ' || CASE WHEN bucket_exists THEN 'existe' ELSE 'NO existe' END;
    
    -- Test 4: Políticas de Storage
    SELECT COUNT(*) INTO policies_count
    FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage';
    
    RETURN QUERY SELECT 
        'Políticas de Storage'::text,
        CASE WHEN policies_count >= 4 THEN '✅ PASS' ELSE '⚠️ PARTIAL' END,
        'Políticas encontradas: ' || policies_count::text || '/4';
        
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. EJECUTAR PRUEBAS
-- ===================================================================

-- Ejecutar todas las pruebas
SELECT * FROM test_logo_configuration();

-- 7. MENSAJE FINAL
-- ===================================================================

DO $$
DECLARE
    user_email text;
    barbershop_id uuid;
BEGIN
    user_email := auth.jwt() ->> 'email';
    
    IF user_email IS NOT NULL THEN
        SELECT id INTO barbershop_id FROM barbershops WHERE email = user_email;
        
        RAISE NOTICE '
        ===================================================================
        🎯 CONFIGURACIÓN DE LOGOS - ESTADO FINAL
        ===================================================================
        
        👤 Usuario: %
        🏪 Barbershop ID: %
        
        ✅ PRÓXIMO PASO: ¡PROBAR LA FUNCIONALIDAD!
        
        📱 Para probar:
        1. Ve a /dashboard/settings en tu aplicación
        2. Busca la sección "Branding y Logo"  
        3. Intenta subir una imagen
        4. Si funciona: ¡perfecto! 🎉
        5. Si falla: comparte el error exacto
        
        🔧 Si hay problemas, verifica:
        - ¿El bucket es público?
        - ¿Tienes los tipos MIME correctos?
        - ¿El límite de tamaño es suficiente?
        
        ', user_email, COALESCE(barbershop_id::text, 'NO ENCONTRADO');
    ELSE
        RAISE NOTICE '
        ❌ NO HAY USUARIO AUTENTICADO
        
        Para probar correctamente:
        1. Autentícate en tu aplicación primero
        2. Luego ejecuta este script
        ';
    END IF;
END $$;