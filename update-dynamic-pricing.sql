-- Actualizar vista y funciones para usar precios dinámicos desde configuración
-- Los precios ahora se obtienen de la tabla barbershops según el tipo de servicio

-- Eliminar vista existente
DROP VIEW IF EXISTS citas_pendientes_pago;

-- Crear vista actualizada con precios dinámicos
CREATE OR REPLACE VIEW citas_pendientes_pago AS
SELECT 
    a.id,
    a.barbershop_id,
    a.fecha,
    a.hora,
    a.tipo_servicio,
    -- Calcular precio dinámico según el tipo de servicio
    CASE 
        WHEN a.tipo_servicio = 'corte' THEN bs.precio_corte_adulto
        WHEN a.tipo_servicio = 'corte_barba' THEN bs.precio_combo
        ELSE bs.precio_corte_adulto  -- fallback a corte adulto
    END as precio,
    a.estado,
    c.nombre as cliente_nombre,
    c.telefono as cliente_telefono,
    b.nombre as barbero_nombre,
    -- Calcular días desde la cita
    EXTRACT(DAY FROM NOW() - (a.fecha + a.hora::interval)) as dias_desde_cita,
    -- Determinar prioridad de cobro
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
JOIN barbershops bs ON a.barbershop_id = bs.id  -- JOIN con barbershops para obtener precios
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

-- Comentario para documentar la vista
COMMENT ON VIEW citas_pendientes_pago IS 'Vista que muestra citas pendientes de pago con precios dinámicos obtenidos de la configuración de cada barbería según el tipo de servicio';

-- Actualizar función de resumen para usar precios dinámicos
DROP FUNCTION IF EXISTS get_resumen_cobros_pendientes(UUID);

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
        COALESCE(SUM(cp.precio), 0)::DECIMAL as monto_total_pendiente,
        COUNT(CASE WHEN cp.prioridad_cobro = 'VENCIDA' THEN 1 END)::INTEGER as citas_vencidas,
        COALESCE(SUM(CASE WHEN cp.prioridad_cobro = 'VENCIDA' THEN cp.precio ELSE 0 END), 0)::DECIMAL as monto_vencido,
        COUNT(CASE WHEN cp.prioridad_cobro = 'HOY' THEN 1 END)::INTEGER as citas_hoy,
        COALESCE(SUM(CASE WHEN cp.prioridad_cobro = 'HOY' THEN cp.precio ELSE 0 END), 0)::DECIMAL as monto_hoy,
        COUNT(CASE WHEN cp.prioridad_cobro = 'MAÑANA' THEN 1 END)::INTEGER as citas_manana,
        COALESCE(SUM(CASE WHEN cp.prioridad_cobro = 'MAÑANA' THEN cp.precio ELSE 0 END), 0)::DECIMAL as monto_manana,
        COUNT(CASE WHEN cp.prioridad_cobro = 'ESTA SEMANA' THEN 1 END)::INTEGER as citas_esta_semana,
        COALESCE(SUM(CASE WHEN cp.prioridad_cobro = 'ESTA SEMANA' THEN cp.precio ELSE 0 END), 0)::DECIMAL as monto_esta_semana
    FROM citas_pendientes_pago cp
    WHERE cp.barbershop_id = p_barbershop_id;
END;
$$ LANGUAGE plpgsql;

-- Comentario para documentar la función
COMMENT ON FUNCTION get_resumen_cobros_pendientes(UUID) IS 'Función que calcula resúmenes de cobros pendientes usando precios dinámicos de configuración';

-- Actualizar función de obtener citas pendientes
DROP FUNCTION IF EXISTS get_citas_pendientes_pago(UUID);

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
        cp.precio,  -- Ahora este precio viene dinámico de la vista
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

-- Comentario para documentar la función
COMMENT ON FUNCTION get_citas_pendientes_pago(UUID) IS 'Función que obtiene citas pendientes de pago con precios dinámicos calculados según configuración';

-- Función auxiliar para obtener el precio correcto según tipo de servicio
CREATE OR REPLACE FUNCTION get_precio_servicio(p_barbershop_id UUID, p_tipo_servicio VARCHAR)
RETURNS DECIMAL AS $$
DECLARE
    v_precio DECIMAL;
BEGIN
    SELECT 
        CASE 
            WHEN p_tipo_servicio = 'corte' THEN precio_corte_adulto
            WHEN p_tipo_servicio = 'corte_barba' THEN precio_combo
            ELSE precio_corte_adulto  -- fallback
        END
    INTO v_precio
    FROM barbershops 
    WHERE id = p_barbershop_id;
    
    RETURN COALESCE(v_precio, 0);
END;
$$ LANGUAGE plpgsql;

-- Comentario para documentar la función auxiliar
COMMENT ON FUNCTION get_precio_servicio(UUID, VARCHAR) IS 'Función auxiliar que obtiene el precio correcto según el tipo de servicio y la configuración de la barbería';

-- Crear o actualizar función para procesar pagos con precio dinámico
CREATE OR REPLACE FUNCTION procesar_pago_cita_dinamico(
    p_cita_id UUID,
    p_metodo_pago payment_method,
    p_monto_recibido DECIMAL DEFAULT NULL,
    p_propina DECIMAL DEFAULT 0,
    p_notas TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    transaction_id UUID,
    precio_cobrado DECIMAL
) AS $$
DECLARE
    v_appointment RECORD;
    v_transaction_id UUID;
    v_precio_dinamico DECIMAL;
    v_monto_final DECIMAL;
BEGIN
    -- Obtener información de la cita
    SELECT a.*, bs.precio_corte_adulto, bs.precio_combo 
    INTO v_appointment
    FROM appointments a
    JOIN barbershops bs ON a.barbershop_id = bs.id
    WHERE a.id = p_cita_id;
    
    IF v_appointment IS NULL THEN
        RETURN QUERY SELECT false, 'Cita no encontrada'::TEXT, NULL::UUID, 0::DECIMAL;
        RETURN;
    END IF;
    
    -- Calcular precio dinámico
    v_precio_dinamico := get_precio_servicio(v_appointment.barbershop_id, v_appointment.tipo_servicio);
    
    -- Usar el monto recibido o el precio dinámico
    v_monto_final := COALESCE(p_monto_recibido, v_precio_dinamico);
    
    -- Marcar cita como pagada
    UPDATE appointments 
    SET 
        pagado = true,
        precio = v_precio_dinamico,  -- Actualizar el precio almacenado con el dinámico
        notas = COALESCE(notas || ' | ', '') || COALESCE(p_notas, '')
    WHERE id = p_cita_id;
    
    -- Crear transacción financiera
    INSERT INTO financial_transactions (
        barbershop_id,
        tipo_transaccion,
        categoria_id,
        monto,
        metodo_pago,
        descripcion,
        referencia_cita_id,
        fecha_transaccion
    ) VALUES (
        v_appointment.barbershop_id,
        'ingreso',
        (SELECT id FROM financial_categories 
         WHERE barbershop_id = v_appointment.barbershop_id 
         AND nombre ILIKE '%servicio%' 
         LIMIT 1),
        v_monto_final,
        p_metodo_pago,
        'Pago de cita - ' || v_appointment.tipo_servicio || ' (precio: ₡' || v_precio_dinamico || ')',
        p_cita_id,
        NOW()
    ) RETURNING id INTO v_transaction_id;
    
    -- Registrar propina si existe
    IF p_propina > 0 THEN
        INSERT INTO financial_transactions (
            barbershop_id,
            tipo_transaccion,
            categoria_id,
            monto,
            metodo_pago,
            descripcion,
            referencia_cita_id,
            fecha_transaccion
        ) VALUES (
            v_appointment.barbershop_id,
            'ingreso',
            (SELECT id FROM financial_categories 
             WHERE barbershop_id = v_appointment.barbershop_id 
             AND nombre ILIKE '%propina%' 
             LIMIT 1),
            p_propina,
            p_metodo_pago,
            'Propina por servicio de ' || v_appointment.tipo_servicio,
            p_cita_id,
            NOW()
        );
    END IF;
    
    RETURN QUERY SELECT 
        true, 
        'Pago procesado correctamente'::TEXT, 
        v_transaction_id,
        v_precio_dinamico;
END;
$$ LANGUAGE plpgsql;

-- Comentario para la nueva función
COMMENT ON FUNCTION procesar_pago_cita_dinamico(UUID, payment_method, DECIMAL, DECIMAL, TEXT) IS 'Procesa el pago de una cita usando precios dinámicos desde la configuración de la barbería';

-- Verificar que todo se creó correctamente
SELECT 
    'Vista y funciones actualizadas con precios dinámicos' as resultado,
    COUNT(*) as total_objetos_creados
FROM (
    SELECT 1 FROM information_schema.views WHERE table_name = 'citas_pendientes_pago'
    UNION ALL
    SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_resumen_cobros_pendientes'
    UNION ALL
    SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_citas_pendientes_pago'
    UNION ALL
    SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_precio_servicio'
    UNION ALL
    SELECT 1 FROM information_schema.routines WHERE routine_name = 'procesar_pago_cita_dinamico'
) as objetos;