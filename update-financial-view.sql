-- Actualizar la vista de citas pendientes para mostrar más citas
DROP VIEW IF EXISTS citas_pendientes_pago;

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

-- Actualizar función de resumen para incluir nuevas categorías
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

SELECT 'Vista y funciones actualizadas correctamente' as resultado;