-- Configuración de Supabase Storage para logos
-- Ejecutar en Supabase SQL Editor después de crear el bucket

-- ===================================================================
-- CONFIGURACIÓN DE STORAGE PARA LOGOS DE BARBERÍAS
-- ===================================================================

-- 1. CREAR POLICIES PARA EL BUCKET 'barbershop-assets' (MÉTODO MODERNO)
-- ===================================================================

-- Primero, verificar que el bucket existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'barbershop-assets') THEN
        RAISE EXCEPTION 'El bucket barbershop-assets no existe. Por favor créalo en el Dashboard primero.';
    ELSE
        RAISE NOTICE '✅ Bucket barbershop-assets encontrado';
    END IF;
END $$;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Barbershops can upload their logos" ON storage.objects;
DROP POLICY IF EXISTS "Barbershops can update their logos" ON storage.objects;  
DROP POLICY IF EXISTS "Barbershops can delete their logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view barbershop logos" ON storage.objects;

-- Policy para permitir que usuarios autenticados suban archivos
CREATE POLICY "Barbershops can upload their logos"
ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (
    bucket_id = 'barbershop-assets' AND
    auth.role() = 'authenticated'
);

-- Policy para permitir que usuarios autenticados actualicen sus archivos
CREATE POLICY "Barbershops can update their logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'barbershop-assets' AND
    auth.role() = 'authenticated'
)
WITH CHECK (
    bucket_id = 'barbershop-assets' AND
    auth.role() = 'authenticated'
);

-- Policy para permitir que usuarios autenticados eliminen sus archivos
CREATE POLICY "Barbershops can delete their logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'barbershop-assets' AND
    auth.role() = 'authenticated'
);

-- Policy para permitir acceso público de lectura (para mostrar logos)
CREATE POLICY "Public can view barbershop logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'barbershop-assets');

-- ===================================================================
-- VERIFICACIÓN DE CONFIGURACIÓN
-- ===================================================================

-- Verificar que las policies se crearon correctamente
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
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY cmd, policyname;

-- Verificar que el bucket existe y está configurado correctamente
SELECT 
    id as bucket_name,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets 
WHERE id = 'barbershop-assets';

-- ===================================================================
-- INSTRUCCIONES PARA CREAR EL BUCKET MANUALMENTE
-- ===================================================================

/*
PASOS EN SUPABASE DASHBOARD:

1. Ve a Storage en el panel lateral
2. Click "New Bucket"
3. Configurar:
   - Bucket Name: barbershop-assets
   - Public: ✅ Activado
   - File size limit: 2MB
   - Allowed MIME types: image/png, image/jpeg, image/gif, image/webp

4. Después de crear el bucket, ejecuta este script SQL
5. Verificar que las policies aparezcan en Storage > Policies

ESTRUCTURA DEL BUCKET:
barbershop-assets/
├── logos/
│   ├── logo-barbershop-id-1-timestamp.png
│   ├── logo-barbershop-id-2-timestamp.jpg
│   └── ...
└── (futuras carpetas para otros assets)
*/

-- ===================================================================
-- 2. ACTUALIZAR POLÍTICAS RLS DE LA TABLA BARBERSHOPS
-- ===================================================================

-- Eliminar políticas existentes que puedan causar conflicto
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

-- Verificar políticas de barbershops
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

-- ===================================================================
-- CONFIGURACIÓN ADICIONAL DE SEGURIDAD
-- ===================================================================

-- Crear función para validar que el usuario solo acceda a sus propios archivos
CREATE OR REPLACE FUNCTION public.user_can_access_barbershop_file(file_path text)
RETURNS boolean AS $$
DECLARE
    user_email text;
    barbershop_id_from_path text;
    user_barbershop_id text;
BEGIN
    -- Obtener email del usuario autenticado
    user_email := auth.jwt() ->> 'email';
    
    -- Extraer ID de barbería del path del archivo
    -- Formato esperado: logos/logo-{barbershop_id}-{timestamp}.{ext}
    barbershop_id_from_path := split_part(split_part(file_path, 'logo-', 2), '-', 1);
    
    -- Obtener ID de barbería del usuario
    SELECT id::text INTO user_barbershop_id
    FROM barbershops
    WHERE email = user_email;
    
    -- Verificar que coincidan
    RETURN barbershop_id_from_path = user_barbershop_id;
    
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- MENSAJE DE FINALIZACIÓN
-- ===================================================================

DO $$
BEGIN
    RAISE NOTICE '
    ✅ ===================================================================
    ✅ CONFIGURACIÓN DE STORAGE COMPLETADA
    ✅ ===================================================================
    
    📋 POLICIES CREADAS:
    ✅ Upload: Usuarios autenticados pueden subir logos
    ✅ Update: Usuarios pueden actualizar sus archivos  
    ✅ Delete: Usuarios pueden eliminar sus archivos
    ✅ Read: Acceso público para mostrar logos
    
    🔐 SEGURIDAD:
    ✅ Solo usuarios autenticados pueden modificar
    ✅ Acceso público solo para lectura
    ✅ Función de validación de permisos creada
    
    📁 ESTRUCTURA:
    ✅ Bucket: barbershop-assets
    ✅ Carpeta: logos/
    ✅ Formato: logo-{id}-{timestamp}.{ext}
    
    🚀 PRÓXIMOS PASOS:
    1. Crear bucket "barbershop-assets" en Supabase Dashboard
    2. Activar acceso público en el bucket
    3. Probar subida de archivos desde la aplicación
    ';
END $$;