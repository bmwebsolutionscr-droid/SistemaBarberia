-- ===================================================================
-- SCRIPT SIMPLE - CREAR USUARIO DE PRUEBA BÁSICO
-- ===================================================================
-- Versión simplificada para crear rápidamente un usuario de prueba

-- ===================================================================
-- CREAR BARBERÍA SIMPLE
-- ===================================================================

INSERT INTO barbershops (nombre, email, telefono, direccion, activo) VALUES 
('Test Barbería', 'test@test.com', '+506 1234-5678', 'Dirección de prueba', true);

-- ===================================================================
-- VERIFICAR CREACIÓN
-- ===================================================================

SELECT 
    '✅ Barbería creada exitosamente' as resultado,
    id,
    nombre,
    email
FROM barbershops 
WHERE email = 'test@test.com';

-- ===================================================================
-- INSTRUCCIONES
-- ===================================================================

SELECT 'PRÓXIMOS PASOS:' as instrucciones;
SELECT '1. Ve a Supabase > Authentication > Users' as paso_1;
SELECT '2. Crea usuario con email: test@test.com' as paso_2;
SELECT '3. Contraseña: Test123!' as paso_3;
SELECT '4. Inicia sesión en la aplicación con esas credenciales' as paso_4;
