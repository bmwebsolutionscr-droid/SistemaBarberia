-- Script para insertar datos de prueba para Barber Magic
-- Ejecutar este script después de crear las tablas

-- 1. Insertar barbería de prueba
INSERT INTO barbershops (nombre, email, telefono, direccion) VALUES 
('Barber Magic', 'barberia@barbermagic.com', '+506 2222-3333', 'San José, Costa Rica');

-- 2. Insertar barberos de prueba
-- Primero necesitamos obtener el ID de la barbería
DO $$
DECLARE
    barbershop_id_var UUID;
BEGIN
    -- Obtener el ID de la barbería
    SELECT id INTO barbershop_id_var FROM barbershops WHERE nombre = 'Barber Magic';
    
    -- Insertar barberos
    INSERT INTO barbers (barbershop_id, nombre, telefono, especialidad, activo) VALUES
    (barbershop_id_var, 'Carlos Mendez', '+506 8888-1234', 'Cortes clásicos y barba', true),
    (barbershop_id_var, 'Jorge Ramirez', '+506 8888-5678', 'Colorimetría y estilos modernos', true),
    (barbershop_id_var, 'Mario Rodriguez', '+506 8888-9012', 'Cortes infantiles y adulto mayor', true);
    
    -- Insertar algunos clientes de prueba
    INSERT INTO clients (barbershop_id, nombre, telefono) VALUES
    (barbershop_id_var, 'Juan Pérez', '+506 8899-1111'),
    (barbershop_id_var, 'María González', '+506 8899-2222'),
    (barbershop_id_var, 'Luis Morales', '+506 8899-3333'),
    (barbershop_id_var, 'Ana Castro', '+506 8899-4444'),
    (barbershop_id_var, 'Pedro Jiménez', '+506 8899-5555');
    
END $$;

-- 3. Insertar algunas citas de prueba
DO $$
DECLARE
    barbershop_id_var UUID;
    barber1_id UUID;
    barber2_id UUID;
    barber3_id UUID;
    client1_id UUID;
    client2_id UUID;
    client3_id UUID;
    client4_id UUID;
    client5_id UUID;
BEGIN
    -- Obtener IDs
    SELECT id INTO barbershop_id_var FROM barbershops WHERE nombre = 'Barber Magic';
    
    SELECT id INTO barber1_id FROM barbers WHERE nombre = 'Carlos Mendez' AND barbershop_id = barbershop_id_var;
    SELECT id INTO barber2_id FROM barbers WHERE nombre = 'Jorge Ramirez' AND barbershop_id = barbershop_id_var;
    SELECT id INTO barber3_id FROM barbers WHERE nombre = 'Mario Rodriguez' AND barbershop_id = barbershop_id_var;
    
    SELECT id INTO client1_id FROM clients WHERE nombre = 'Juan Pérez' AND barbershop_id = barbershop_id_var;
    SELECT id INTO client2_id FROM clients WHERE nombre = 'María González' AND barbershop_id = barbershop_id_var;
    SELECT id INTO client3_id FROM clients WHERE nombre = 'Luis Morales' AND barbershop_id = barbershop_id_var;
    SELECT id INTO client4_id FROM clients WHERE nombre = 'Ana Castro' AND barbershop_id = barbershop_id_var;
    SELECT id INTO client5_id FROM clients WHERE nombre = 'Pedro Jiménez' AND barbershop_id = barbershop_id_var;
    
    -- Insertar citas (algunas para hoy, mañana y próximos días)
    INSERT INTO appointments (barbershop_id, barber_id, client_id, fecha, hora, estado, precio, notas) VALUES
    -- Citas de hoy
    (barbershop_id_var, barber1_id, client1_id, CURRENT_DATE, '09:00', 'confirmada', 15000, 'Corte y barba'),
    (barbershop_id_var, barber1_id, client2_id, CURRENT_DATE, '10:30', 'programada', 12000, 'Solo corte'),
    (barbershop_id_var, barber2_id, client3_id, CURRENT_DATE, '14:00', 'confirmada', 18000, 'Corte y colorimetría'),
    
    -- Citas de mañana
    (barbershop_id_var, barber1_id, client4_id, CURRENT_DATE + 1, '09:30', 'programada', 15000, 'Corte completo'),
    (barbershop_id_var, barber2_id, client5_id, CURRENT_DATE + 1, '11:00', 'programada', 20000, 'Estilo moderno'),
    (barbershop_id_var, barber3_id, client1_id, CURRENT_DATE + 1, '15:30', 'programada', 10000, 'Corte simple'),
    
    -- Citas de la próxima semana
    (barbershop_id_var, barber1_id, client2_id, CURRENT_DATE + 3, '10:00', 'programada', 15000, 'Mantenimiento'),
    (barbershop_id_var, barber2_id, client3_id, CURRENT_DATE + 5, '16:00', 'programada', 22000, 'Cambio de look'),
    (barbershop_id_var, barber3_id, client4_id, CURRENT_DATE + 7, '09:00', 'programada', 12000, 'Corte familiar'),
    
    -- Algunas citas completadas del mes pasado para estadísticas
    (barbershop_id_var, barber1_id, client1_id, CURRENT_DATE - 5, '14:00', 'completada', 15000, 'Servicio completo'),
    (barbershop_id_var, barber2_id, client2_id, CURRENT_DATE - 8, '11:30', 'completada', 18000, 'Colorimetría'),
    (barbershop_id_var, barber3_id, client3_id, CURRENT_DATE - 12, '16:00', 'completada', 10000, 'Corte básico'),
    (barbershop_id_var, barber1_id, client4_id, CURRENT_DATE - 15, '10:00', 'completada', 20000, 'Servicio premium'),
    (barbershop_id_var, barber2_id, client5_id, CURRENT_DATE - 20, '15:00', 'completada', 16000, 'Corte y peinado');
    
END $$;

-- 4. Mensaje de confirmación
SELECT 'Datos de prueba insertados correctamente para Barber Magic' as mensaje;
