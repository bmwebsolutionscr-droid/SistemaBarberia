-- ===================================================================
-- SCRIPT PARA CREAR NUEVA BARBERÍA
-- ===================================================================
-- Uso: Personalizar datos abajo y ejecutar en Supabase SQL Editor
-- Prerequisito: Haber ejecutado primero complete-database-setup.sql
-- ===================================================================

-- 🔄 PERSONALIZAR ESTOS DATOS ANTES DE EJECUTAR:
-- ===================================================================

DO $$
DECLARE
    -- 📝 CONFIGURAR AQUÍ TUS DATOS:
    barbershop_name VARCHAR(200) := 'Mi Barbería';           -- Nombre de tu barbería
    barbershop_email VARCHAR(200) := 'admin@mibarberia.com'; -- Email para login (IMPORTANTE)
    barbershop_phone VARCHAR(20) := '+506 2222-2222';        -- Teléfono
    barbershop_address TEXT := 'San José, Costa Rica';       -- Dirección
    barbershop_description TEXT := 'La mejor barbería de la ciudad'; -- Descripción
    
    -- Variables para IDs generados
    barbershop_uuid UUID;
    barber1_uuid UUID;
    barber2_uuid UUID;
    client1_uuid UUID;
    client2_uuid UUID;
    client3_uuid UUID;
    service1_uuid UUID;
    
BEGIN
    -- 1. VERIFICAR QUE NO EXISTA YA UNA BARBERÍA CON ESE EMAIL
    -- ===================================================================
    IF EXISTS (SELECT 1 FROM barbershops WHERE email = barbershop_email) THEN
        RAISE EXCEPTION 'Ya existe una barbería con el email: %', barbershop_email;
    END IF;
    
    -- 2. CREAR BARBERÍA PRINCIPAL
    -- ===================================================================
    INSERT INTO barbershops (
        nombre, 
        email, 
        telefono, 
        direccion, 
        descripcion,
        ciudad,
        activo,
        plan
    ) VALUES (
        barbershop_name,
        barbershop_email,
        barbershop_phone,
        barbershop_address,
        barbershop_description,
        'San José',
        true,
        'basico'
    ) RETURNING id INTO barbershop_uuid;
    
    RAISE NOTICE '✅ Barbería creada: % (ID: %)', barbershop_name, barbershop_uuid;
    
    -- 3. CREAR SERVICIOS PREDETERMINADOS
    -- ===================================================================
    INSERT INTO service_types (barbershop_id, nombre, descripcion, duracion_minutos, precio_base, activo, orden) VALUES
    (barbershop_uuid, 'Corte Clásico', 'Corte de cabello tradicional con tijeras y máquina', 30, 8000, true, 1),
    (barbershop_uuid, 'Corte + Barba', 'Corte de cabello completo más arreglo de barba', 45, 12000, true, 2),
    (barbershop_uuid, 'Solo Barba', 'Arreglo y perfilado de barba únicamente', 20, 5000, true, 3),
    (barbershop_uuid, 'Corte Premium', 'Corte moderno con styling y productos premium', 45, 15000, true, 4),
    (barbershop_uuid, 'Rapado', 'Corte muy corto con máquina', 15, 6000, true, 5),
    (barbershop_uuid, 'Corte + Lavado', 'Corte completo con lavado de cabello', 40, 10000, true, 6);
    
    SELECT id INTO service1_uuid FROM service_types WHERE barbershop_id = barbershop_uuid AND nombre = 'Corte Clásico';
    
    RAISE NOTICE '✅ Servicios creados: 6 servicios predeterminados';
    
    -- 4. CREAR CONFIGURACIÓN DE LA BARBERÍA
    -- ===================================================================
    INSERT INTO barbershop_settings (
        barbershop_id,
        configuracion,
        whatsapp_config,
        notificaciones_config,
        horarios_atencion
    ) VALUES (
        barbershop_uuid,
        '{"zona_horaria": "America/Costa_Rica", "moneda": "CRC", "idioma": "es"}',
        '{"activo": false, "numero": "", "token": ""}',
        '{"email": true, "sms": false, "whatsapp": false}',
        '{
            "lunes": {"inicio": "08:00", "fin": "18:00", "activo": true},
            "martes": {"inicio": "08:00", "fin": "18:00", "activo": true},
            "miercoles": {"inicio": "08:00", "fin": "18:00", "activo": true},
            "jueves": {"inicio": "08:00", "fin": "18:00", "activo": true},
            "viernes": {"inicio": "08:00", "fin": "18:00", "activo": true},
            "sabado": {"inicio": "08:00", "fin": "16:00", "activo": true},
            "domingo": {"inicio": "10:00", "fin": "14:00", "activo": false}
        }'
    );
    
    RAISE NOTICE '✅ Configuración creada: horarios y preferencias establecidas';
    
    -- 5. CREAR BARBEROS DE EJEMPLO (OPCIONAL)
    -- ===================================================================
    INSERT INTO barbers (
        barbershop_id, 
        nombre, 
        apellido, 
        telefono, 
        especialidad, 
        activo,
        comision_porcentaje,
        horario
    ) VALUES 
    (
        barbershop_uuid, 
        'Carlos', 
        'Méndez', 
        '+506 8888-1111', 
        'Cortes clásicos y barba',
        true,
        15.00,
        '{
            "lunes": {"inicio": "08:00", "fin": "17:00", "activo": true},
            "martes": {"inicio": "08:00", "fin": "17:00", "activo": true},
            "miercoles": {"inicio": "08:00", "fin": "17:00", "activo": true},
            "jueves": {"inicio": "08:00", "fin": "17:00", "activo": true},
            "viernes": {"inicio": "08:00", "fin": "17:00", "activo": true},
            "sabado": {"inicio": "08:00", "fin": "15:00", "activo": true},
            "domingo": {"inicio": "10:00", "fin": "14:00", "activo": false}
        }'
    ),
    (
        barbershop_uuid, 
        'Jorge', 
        'Ramírez', 
        '+506 8888-2222', 
        'Estilos modernos y colorimetría',
        true,
        20.00,
        '{
            "lunes": {"inicio": "09:00", "fin": "18:00", "activo": true},
            "martes": {"inicio": "09:00", "fin": "18:00", "activo": true},
            "miercoles": {"inicio": "09:00", "fin": "18:00", "activo": true},
            "jueves": {"inicio": "09:00", "fin": "18:00", "activo": true},
            "viernes": {"inicio": "09:00", "fin": "18:00", "activo": true},
            "sabado": {"inicio": "08:00", "fin": "16:00", "activo": true},
            "domingo": {"inicio": "10:00", "fin": "14:00", "activo": false}
        }'
    );
    
    -- Obtener IDs de los barberos
    SELECT id INTO barber1_uuid FROM barbers WHERE barbershop_id = barbershop_uuid AND nombre = 'Carlos';
    SELECT id INTO barber2_uuid FROM barbers WHERE barbershop_id = barbershop_uuid AND nombre = 'Jorge';
    
    RAISE NOTICE '✅ Barberos creados: Carlos Méndez y Jorge Ramírez';
    
    -- 6. CREAR CLIENTES DE EJEMPLO (OPCIONAL)
    -- ===================================================================
    INSERT INTO clients (
        barbershop_id, 
        nombre, 
        apellido, 
        telefono, 
        email,
        activo,
        preferencias
    ) VALUES 
    (
        barbershop_uuid, 
        'Juan', 
        'Pérez', 
        '+506 7777-1111', 
        'juan.perez@email.com',
        true,
        '{"servicio_preferido": "Corte Clásico", "barbero_preferido": "Carlos"}'
    ),
    (
        barbershop_uuid, 
        'María', 
        'González', 
        '+506 7777-2222', 
        'maria.gonzalez@email.com',
        true,
        '{"servicio_preferido": "Corte + Barba", "comunicacion": "whatsapp"}'
    ),
    (
        barbershop_uuid, 
        'Pedro', 
        'Rodríguez', 
        '+506 7777-3333', 
        'pedro.rodriguez@email.com',
        true,
        '{"servicio_preferido": "Corte Premium", "barbero_preferido": "Jorge"}'
    );
    
    -- Obtener IDs de clientes
    SELECT id INTO client1_uuid FROM clients WHERE barbershop_id = barbershop_uuid AND nombre = 'Juan';
    SELECT id INTO client2_uuid FROM clients WHERE barbershop_id = barbershop_uuid AND nombre = 'María';
    SELECT id INTO client3_uuid FROM clients WHERE barbershop_id = barbershop_uuid AND nombre = 'Pedro';
    
    RAISE NOTICE '✅ Clientes creados: 3 clientes de ejemplo';
    
    -- 7. CREAR CITAS DE EJEMPLO (OPCIONAL)
    -- ===================================================================
    -- Citas para mañana
    INSERT INTO appointments (
        barbershop_id, 
        barber_id, 
        client_id, 
        service_type_id,
        fecha, 
        hora_inicio, 
        servicio_nombre, 
        duracion_minutos, 
        precio_acordado, 
        precio_final, 
        estado,
        notas
    ) VALUES 
    (
        barbershop_uuid, 
        barber1_uuid, 
        client1_uuid, 
        service1_uuid,
        CURRENT_DATE + INTERVAL '1 day', 
        '10:00', 
        'Corte Clásico', 
        30, 
        8000, 
        8000, 
        'programada',
        'Cliente frecuente, prefiere corte corto'
    ),
    (
        barbershop_uuid, 
        barber1_uuid, 
        client2_uuid, 
        (SELECT id FROM service_types WHERE barbershop_id = barbershop_uuid AND nombre = 'Corte + Barba'),
        CURRENT_DATE + INTERVAL '1 day', 
        '14:00', 
        'Corte + Barba', 
        45, 
        12000, 
        12000, 
        'confirmada',
        'Primera vez, explicar proceso'
    ),
    (
        barbershop_uuid, 
        barber2_uuid, 
        client3_uuid, 
        (SELECT id FROM service_types WHERE barbershop_id = barbershop_uuid AND nombre = 'Corte Premium'),
        CURRENT_DATE + INTERVAL '2 days', 
        '09:00', 
        'Corte Premium', 
        45, 
        15000, 
        15000, 
        'programada',
        'Estilo moderno, usar productos premium'
    );
    
    RAISE NOTICE '✅ Citas creadas: 3 citas de ejemplo para los próximos días';
    
    -- 8. MOSTRAR RESUMEN FINAL
    -- ===================================================================
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ===================================================================';
    RAISE NOTICE '🎉 BARBERÍA CREADA EXITOSAMENTE';
    RAISE NOTICE '🎉 ===================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 INFORMACIÓN DE LA BARBERÍA:';
    RAISE NOTICE '   Nombre: %', barbershop_name;
    RAISE NOTICE '   Email: % (USAR ESTE EMAIL PARA LOGIN)', barbershop_email;
    RAISE NOTICE '   ID: %', barbershop_uuid;
    RAISE NOTICE '';
    RAISE NOTICE '📊 DATOS CREADOS:';
    RAISE NOTICE '   ✅ Servicios: % creados', (SELECT COUNT(*) FROM service_types WHERE barbershop_id = barbershop_uuid);
    RAISE NOTICE '   ✅ Barberos: % creados', (SELECT COUNT(*) FROM barbers WHERE barbershop_id = barbershop_uuid);
    RAISE NOTICE '   ✅ Clientes: % creados', (SELECT COUNT(*) FROM clients WHERE barbershop_id = barbershop_uuid);
    RAISE NOTICE '   ✅ Citas: % creadas', (SELECT COUNT(*) FROM appointments WHERE barbershop_id = barbershop_uuid);
    RAISE NOTICE '';
    RAISE NOTICE '🚀 PRÓXIMOS PASOS:';
    RAISE NOTICE '   1. Crear usuario Auth en Supabase con email: %', barbershop_email;
    RAISE NOTICE '   2. Configurar variables de entorno:';
    RAISE NOTICE '      NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url';
    RAISE NOTICE '      NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_key';
    RAISE NOTICE '   3. Probar login con el email: %', barbershop_email;
    RAISE NOTICE '   4. Personalizar datos desde el dashboard';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANTE: Crear usuario Auth es OBLIGATORIO para poder hacer login';
    RAISE NOTICE '';
    
END $$;