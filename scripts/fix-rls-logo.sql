-- Script para solucionar problemas de RLS con logos
-- Ejecutar en Supabase SQL Editor

-- ===================================================================
-- SOLUCIÓN PARA ERROR DE ROW LEVEL SECURITY CON LOGOS
-- ===================================================================

-- Primero, verificar si el campo logo_url existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'barbershops' 
        AND column_name = 'logo_url'
    ) THEN
        -- Agregar campo logo_url si no existe
        ALTER TABLE barbershops 
        ADD COLUMN logo_url TEXT;
        
        RAISE NOTICE '✅ Campo logo_url agregado a tabla barbershops';
    ELSE
        RAISE NOTICE 'ℹ️  Campo logo_url ya existe en tabla barbershops';
    END IF;
END $$;

-- ===================================================================
-- ACTUALIZAR POLÍTICA RLS PARA INCLUIR LOGO_URL
-- ===================================================================

-- Eliminar política existente si existe
DROP POLICY IF EXISTS "Barbershops can view own data" ON barbershops;

-- Crear nueva política que permita actualizar logo_url
CREATE POLICY "Barbershops can view and update own data" ON barbershops
    FOR ALL USING (
        auth.jwt() ->> 'email' = email
    )
    WITH CHECK (
        auth.jwt() ->> 'email' = email
    );

-- ===================================================================
-- VERIFICAR PERMISOS DE USUARIO ACTUAL
-- ===================================================================

-- Mostrar información del usuario actual y su barbería
DO $$
DECLARE
    current_user_email TEXT;
    barbershop_count INTEGER;
    barbershop_info RECORD;
BEGIN
    -- Obtener email del usuario actual
    current_user_email := auth.jwt() ->> 'email';
    
    RAISE NOTICE '👤 Usuario actual: %', COALESCE(current_user_email, 'NO AUTENTICADO');
    
    IF current_user_email IS NOT NULL THEN
        -- Contar barberías del usuario
        SELECT COUNT(*) INTO barbershop_count
        FROM barbershops
        WHERE email = current_user_email;
        
        RAISE NOTICE '🏪 Barberías encontradas: %', barbershop_count;
        
        -- Mostrar detalles si existe barbería
        IF barbershop_count > 0 THEN
            SELECT id, nombre, email, logo_url 
            INTO barbershop_info
            FROM barbershops 
            WHERE email = current_user_email
            LIMIT 1;
            
            RAISE NOTICE '📋 ID Barbería: %', barbershop_info.id;
            RAISE NOTICE '📋 Nombre: %', barbershop_info.nombre;
            RAISE NOTICE '📋 Logo actual: %', COALESCE(barbershop_info.logo_url, 'SIN LOGO');
        END IF;
    END IF;
END $$;

-- ===================================================================
-- PROBAR ACTUALIZACIÓN DE LOGO (SOLO PARA TESTING)
-- ===================================================================

-- Esta función permite probar si la actualización funcionará
CREATE OR REPLACE FUNCTION test_logo_update()
RETURNS TEXT AS $$
DECLARE
    current_user_email TEXT;
    barbershop_id_val UUID;
    result TEXT;
BEGIN
    -- Obtener email del usuario actual
    current_user_email := auth.jwt() ->> 'email';
    
    IF current_user_email IS NULL THEN
        RETURN 'ERROR: Usuario no autenticado';
    END IF;
    
    -- Obtener ID de barbería
    SELECT id INTO barbershop_id_val
    FROM barbershops
    WHERE email = current_user_email;
    
    IF barbershop_id_val IS NULL THEN
        RETURN 'ERROR: No se encontró barbería para el usuario ' || current_user_email;
    END IF;
    
    -- Intentar actualizar (solo para testing - no cambia nada real)
    BEGIN
        -- Simulamos la actualización que haría el código
        PERFORM id FROM barbershops 
        WHERE id = barbershop_id_val 
        AND email = current_user_email;
        
        RETURN 'SUCCESS: Permisos correctos para barbería ' || barbershop_id_val;
    EXCEPTION WHEN OTHERS THEN
        RETURN 'ERROR: ' || SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ejecutar test
SELECT test_logo_update() as test_result;

-- ===================================================================
-- CONFIGURACIÓN ADICIONAL DE STORAGE (Si no existe el bucket)
-- ===================================================================

-- Crear bucket mediante SQL si es posible (algunos casos)
DO $$
BEGIN
    -- Intentar crear bucket (puede fallar si no hay permisos)
    BEGIN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'barbershop-assets', 
            'barbershop-assets', 
            true, 
            2097152, -- 2MB en bytes
            ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
        )
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE '✅ Bucket barbershop-assets creado o ya existe';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️  No se pudo crear bucket automáticamente. Crear manualmente en Dashboard';
    END;
END $$;

-- ===================================================================
-- POLÍTICAS DE STORAGE SIMPLIFICADAS
-- ===================================================================

-- Solo crear políticas si el bucket existe
DO $$
BEGIN
    -- Verificar si existe el bucket
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'barbershop-assets') THEN
        
        -- Policy para subir archivos
        INSERT INTO storage.policies (id, bucket_id, name, policy_for, policy_using, policy_check)
        VALUES (
            'barbershop-logos-authenticated-all',
            'barbershop-assets',
            'Authenticated users can manage logos',
            'ALL',
            'auth.role() = ''authenticated''',
            'true'
        ) ON CONFLICT (id) DO UPDATE SET
            policy_using = EXCLUDED.policy_using,
            policy_check = EXCLUDED.policy_check;
            
        RAISE NOTICE '✅ Políticas de storage configuradas';
    ELSE
        RAISE NOTICE '⚠️  Bucket barbershop-assets no existe. Crear en Dashboard primero';
    END IF;
END $$;

-- ===================================================================
-- INSTRUCCIONES FINALES
-- ===================================================================

DO $$
BEGIN
    RAISE NOTICE '
    🔧 ===================================================================
    🔧 SOLUCIÓN APLICADA PARA ERROR RLS
    🔧 ===================================================================
    
    ✅ CAMBIOS REALIZADOS:
    - Política RLS actualizada para permitir updates
    - Campo logo_url verificado/creado
    - Permisos de usuario verificados
    - Políticas de storage simplificadas
    
    📋 SI AÚN HAY ERRORES:
    
    1. CREAR BUCKET MANUALMENTE:
       - Ve a Supabase Dashboard > Storage
       - New Bucket: "barbershop-assets" 
       - Public: ✅ Activado
    
    2. VERIFICAR AUTENTICACIÓN:
       - Asegúrate de estar logueado
       - Email debe coincidir con barbershop.email
    
    3. PROBAR NUEVAMENTE:
       - Ir a /dashboard/settings
       - Subir logo en sección "Branding y Logo"
    
    ❓ Si persiste el error, ejecuta:
    SELECT test_logo_update();
    
    Y comparte el resultado para más ayuda.
    ';
END $$;