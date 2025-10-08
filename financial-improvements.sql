-- ===================================================================
-- MEJORAS AL MÓDULO FINANCIERO - CONTROL DE PAGOS DE CITAS
-- ===================================================================
-- Este script mejora el módulo financiero para controlar pagos de citas
-- ===================================================================

-- 1. CREAR VISTA PARA CITAS PENDIENTES DE PAGO
-- ===================================================================

CREATE OR REPLACE VIEW citas_pendientes_pago AS
SELECT 
    a.id,
    a.barbershop_id,
    a.fecha,
    a.hora,
    a.tipo_servicio,
    a.precio,
    a.estado,
    c.nombre as cliente_nombre,
    c.telefono as cliente_telefono,
    b.nombre as barbero_nombre,
    -- Calcular días desde la cita
    EXTRACT(DAY FROM NOW() - (a.fecha + a.hora::interval)) as dias_desde_cita,
    -- Determinar prioridad de cobro más amplia
    CASE 
        WHEN a.fecha < CURRENT_DATE THEN 'VENCIDA'
        WHEN a.fecha = CURRENT_DATE THEN 'HOY'
        WHEN a.fecha = CURRENT_DATE + INTERVAL '1 day' THEN 'MAÑANA'
        WHEN a.fecha <= CURRENT_DATE + INTERVAL '7 days' THEN 'ESTA SEMANA'
        ELSE 'PRÓXIMA'
    END as prioridad_cobro
FROM appointments a
JOIN clients c ON a.client_id = c.id
JOIN barbers b ON a.barber_id = b.id
WHERE a.estado IN ('programada', 'confirmada')
AND (a.pagado IS NULL OR a.pagado = false)
AND a.fecha >= CURRENT_DATE - INTERVAL '7 days' -- Incluir las vencidas de la última semana
ORDER BY 
    CASE 
        WHEN a.fecha < CURRENT_DATE THEN 1 -- Vencidas primero
        WHEN a.fecha = CURRENT_DATE THEN 2 -- Hoy segundo
        WHEN a.fecha = CURRENT_DATE + INTERVAL '1 day' THEN 3 -- Mañana tercero
        WHEN a.fecha <= CURRENT_DATE + INTERVAL '7 days' THEN 4 -- Esta semana
        ELSE 5 -- Futuras
    END,
    a.fecha,
    a.hora;

-- 2. FUNCIÓN PARA PROCESAR PAGO DE CITA
-- ===================================================================

CREATE OR REPLACE FUNCTION procesar_pago_cita(
    p_appointment_id UUID,
    p_metodo_pago payment_method,
    p_monto_pagado DECIMAL(10,2) DEFAULT NULL,
    p_descuento DECIMAL(10,2) DEFAULT 0,
    p_propina DECIMAL(10,2) DEFAULT 0,
    p_notas TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_appointment RECORD;
    v_category_id UUID;
    v_transaction_id UUID;
    v_monto_final DECIMAL(10,2);
    v_result JSON;
BEGIN
    -- Obtener información de la cita
    SELECT 
        a.*,
        c.nombre as cliente_nombre,
        b.nombre as barbero_nombre
    INTO v_appointment
    FROM appointments a
    JOIN clients c ON a.client_id = c.id
    JOIN barbers b ON a.barber_id = b.id
    WHERE a.id = p_appointment_id;
    
    -- Verificar que la cita existe
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Cita no encontrada'
        );
    END IF;
    
    -- Verificar que la cita no esté ya pagada
    IF v_appointment.pagado = true THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Esta cita ya está pagada'
        );
    END IF;
    
    -- Calcular monto final (usar precio de la cita si no se especifica)
    v_monto_final := COALESCE(p_monto_pagado, v_appointment.precio) - p_descuento;
    
    -- Verificar que el monto sea válido
    IF v_monto_final <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'El monto final debe ser mayor a cero'
        );
    END IF;
    
    -- Buscar categoría apropiada para el servicio
    SELECT id INTO v_category_id
    FROM financial_categories 
    WHERE barbershop_id = v_appointment.barbershop_id 
    AND tipo = 'ingreso'
    AND activo = true
    AND (
        (v_appointment.tipo_servicio = 'corte' AND nombre ILIKE '%corte%') OR
        (v_appointment.tipo_servicio = 'corte_barba' AND nombre ILIKE '%barba%') OR
        nombre ILIKE '%servicio%'
    )
    ORDER BY 
        CASE 
            WHEN v_appointment.tipo_servicio = 'corte' AND nombre ILIKE '%corte%' THEN 1
            WHEN v_appointment.tipo_servicio = 'corte_barba' AND nombre ILIKE '%barba%' THEN 1
            ELSE 2
        END,
        orden
    LIMIT 1;
    
    -- Si no encuentra categoría específica, usar la primera de ingresos
    IF v_category_id IS NULL THEN
        SELECT id INTO v_category_id
        FROM financial_categories 
        WHERE barbershop_id = v_appointment.barbershop_id 
        AND tipo = 'ingreso'
        AND activo = true
        ORDER BY orden
        LIMIT 1;
    END IF;
    
    -- Si aún no hay categoría, crear una por defecto
    IF v_category_id IS NULL THEN
        INSERT INTO financial_categories (
            barbershop_id, 
            nombre, 
            tipo, 
            descripcion, 
            color, 
            orden
        ) VALUES (
            v_appointment.barbershop_id,
            'Servicios de Barbería',
            'ingreso',
            'Ingresos por servicios generales',
            '#10B981',
            1
        ) RETURNING id INTO v_category_id;
    END IF;
    
    -- Crear la transacción financiera
    INSERT INTO financial_transactions (
        barbershop_id,
        appointment_id,
        category_id,
        barber_id,
        tipo,
        metodo_pago,
        monto,
        concepto,
        descripcion,
        estado,
        fecha_transaccion
    ) VALUES (
        v_appointment.barbershop_id,
        p_appointment_id,
        v_category_id,
        v_appointment.barber_id,
        'ingreso',
        p_metodo_pago,
        v_monto_final,
        'Pago de cita - ' || v_appointment.cliente_nombre,
        'Servicio: ' || COALESCE(v_appointment.tipo_servicio, 'corte') || 
        CASE WHEN p_notas IS NOT NULL THEN '. Notas: ' || p_notas ELSE '' END,
        'completada',
        NOW()
    ) RETURNING id INTO v_transaction_id;
    
    -- Actualizar la cita como pagada y completada
    UPDATE appointments SET
        estado = 'completada',
        pagado = true,
        fecha_pago = NOW(),
        metodo_pago = p_metodo_pago,
        monto_pagado = v_monto_final,
        descuento_aplicado = p_descuento,
        propina = p_propina,
        notas_pago = p_notas,
        updated_at = NOW()
    WHERE id = p_appointment_id;
    
    -- Si hay propina, crear transacción adicional
    IF p_propina > 0 THEN
        -- Buscar categoría de propinas
        SELECT id INTO v_category_id
        FROM financial_categories 
        WHERE barbershop_id = v_appointment.barbershop_id 
        AND tipo = 'ingreso'
        AND nombre ILIKE '%propina%'
        LIMIT 1;
        
        -- Si no existe, usar la misma categoría del servicio
        IF v_category_id IS NULL THEN
            SELECT category_id INTO v_category_id
            FROM financial_transactions
            WHERE id = v_transaction_id;
        END IF;
        
        INSERT INTO financial_transactions (
            barbershop_id,
            appointment_id,
            category_id,
            barber_id,
            tipo,
            metodo_pago,
            monto,
            concepto,
            descripcion,
            estado,
            fecha_transaccion
        ) VALUES (
            v_appointment.barbershop_id,
            p_appointment_id,
            v_category_id,
            v_appointment.barber_id,
            'ingreso',
            p_metodo_pago,
            p_propina,
            'Propina - ' || v_appointment.cliente_nombre,
            'Propina por servicio de ' || COALESCE(v_appointment.tipo_servicio, 'corte'),
            'completada',
            NOW()
        );
    END IF;
    
    -- Retornar resultado exitoso
    RETURN json_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'appointment_id', p_appointment_id,
        'cliente', v_appointment.cliente_nombre,
        'servicio', v_appointment.tipo_servicio,
        'monto_pagado', v_monto_final,
        'propina', p_propina,
        'metodo_pago', p_metodo_pago,
        'fecha_pago', NOW()
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Error interno: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- 3. FUNCIÓN PARA OBTENER CITAS PENDIENTES POR BARBERÍA
-- ===================================================================

CREATE OR REPLACE FUNCTION get_citas_pendientes_pago(p_barbershop_id UUID)
RETURNS TABLE(
    cita_id UUID,
    cliente_nombre VARCHAR,
    cliente_telefono VARCHAR,
    barbero_nombre VARCHAR,
    fecha DATE,
    hora TIME,
    tipo_servicio VARCHAR,
    precio DECIMAL,
    estado VARCHAR,
    prioridad_cobro VARCHAR,
    dias_desde_cita NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.id,
        cp.cliente_nombre,
        cp.cliente_telefono,
        cp.barbero_nombre,
        cp.fecha,
        cp.hora,
        cp.tipo_servicio,
        cp.precio,
        cp.estado,
        cp.prioridad_cobro,
        cp.dias_desde_cita
    FROM citas_pendientes_pago cp
    WHERE cp.barbershop_id = p_barbershop_id
    ORDER BY 
        CASE cp.prioridad_cobro
            WHEN 'VENCIDA' THEN 1
            WHEN 'HOY' THEN 2
            WHEN 'MAÑANA' THEN 3
            WHEN 'ESTA SEMANA' THEN 4
            ELSE 5
        END,
        cp.fecha,
        cp.hora;
END;
$$ LANGUAGE plpgsql;

-- 4. FUNCIÓN PARA OBTENER RESUMEN DE COBROS PENDIENTES
-- ===================================================================

CREATE OR REPLACE FUNCTION get_resumen_cobros_pendientes(p_barbershop_id UUID)
RETURNS TABLE(
    total_citas_pendientes INTEGER,
    monto_total_pendiente DECIMAL,
    citas_vencidas INTEGER,
    monto_vencido DECIMAL,
    citas_hoy INTEGER,
    monto_hoy DECIMAL,
    citas_manana INTEGER,
    monto_manana DECIMAL,
    citas_esta_semana INTEGER,
    monto_esta_semana DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_citas_pendientes,
        COALESCE(SUM(precio), 0)::DECIMAL as monto_total_pendiente,
        COUNT(CASE WHEN prioridad_cobro = 'VENCIDA' THEN 1 END)::INTEGER as citas_vencidas,
        COALESCE(SUM(CASE WHEN prioridad_cobro = 'VENCIDA' THEN precio ELSE 0 END), 0)::DECIMAL as monto_vencido,
        COUNT(CASE WHEN prioridad_cobro = 'HOY' THEN 1 END)::INTEGER as citas_hoy,
        COALESCE(SUM(CASE WHEN prioridad_cobro = 'HOY' THEN precio ELSE 0 END), 0)::DECIMAL as monto_hoy,
        COUNT(CASE WHEN prioridad_cobro = 'MAÑANA' THEN 1 END)::INTEGER as citas_manana,
        COALESCE(SUM(CASE WHEN prioridad_cobro = 'MAÑANA' THEN precio ELSE 0 END), 0)::DECIMAL as monto_manana,
        COUNT(CASE WHEN prioridad_cobro = 'ESTA SEMANA' THEN 1 END)::INTEGER as citas_esta_semana,
        COALESCE(SUM(CASE WHEN prioridad_cobro = 'ESTA SEMANA' THEN precio ELSE 0 END), 0)::DECIMAL as monto_esta_semana
    FROM citas_pendientes_pago
    WHERE barbershop_id = p_barbershop_id;
END;
$$ LANGUAGE plpgsql;

-- 5. CREAR ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_appointments_estado_pagado 
ON appointments(barbershop_id, estado, pagado);

CREATE INDEX IF NOT EXISTS idx_appointments_fecha_estado 
ON appointments(barbershop_id, fecha, estado);

-- 6. ACTUALIZAR TRIGGER EXISTENTE
-- ===================================================================

-- Modificar el trigger para que no se active automáticamente
-- ya que ahora usaremos la función procesar_pago_cita
DROP TRIGGER IF EXISTS trigger_appointment_payment ON appointments;

-- 7. COMENTARIOS EN NUEVAS FUNCIONES
-- ===================================================================

COMMENT ON VIEW citas_pendientes_pago IS 'Vista de todas las citas que están pendientes de pago';
COMMENT ON FUNCTION procesar_pago_cita IS 'Procesa el pago de una cita y la marca como completada';
COMMENT ON FUNCTION get_citas_pendientes_pago IS 'Obtiene lista de citas pendientes de pago por barbería';
COMMENT ON FUNCTION get_resumen_cobros_pendientes IS 'Obtiene resumen de cobros pendientes';

-- ===================================================================
-- VERIFICACIÓN DE MEJORAS
-- ===================================================================

SELECT 'MEJORAS AL MÓDULO FINANCIERO APLICADAS CORRECTAMENTE' as resultado;

-- Verificar que la vista se creó
SELECT 'VISTA CREADA:' as info;
SELECT viewname 
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname = 'citas_pendientes_pago';

-- Verificar funciones creadas
SELECT 'FUNCIONES CREADAS:' as info;
SELECT routine_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('procesar_pago_cita', 'get_citas_pendientes_pago', 'get_resumen_cobros_pendientes');