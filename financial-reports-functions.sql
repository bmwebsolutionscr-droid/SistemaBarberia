-- Funciones SQL para reportes financieros PDF
-- Obtener datos de pagos e ingresos por rango de fechas

-- Función para obtener resumen de pagos por rango de fechas
CREATE OR REPLACE FUNCTION get_financial_summary_by_period(
    p_barbershop_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    total_appointments INTEGER,
    total_paid INTEGER,
    total_pending INTEGER,
    total_amount_paid DECIMAL,
    total_amount_pending DECIMAL,
    efectivo_amount DECIMAL,
    sinpe_amount DECIMAL,
    tarjeta_amount DECIMAL,
    transferencia_amount DECIMAL,
    average_ticket DECIMAL,
    corte_count INTEGER,
    corte_barba_count INTEGER,
    corte_amount DECIMAL,
    corte_barba_amount DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Contadores generales
        COUNT(a.id)::INTEGER as total_appointments,
        COUNT(CASE WHEN a.pagado = true THEN 1 END)::INTEGER as total_paid,
        COUNT(CASE WHEN a.pagado = false OR a.pagado IS NULL THEN 1 END)::INTEGER as total_pending,
        
        -- Montos
        COALESCE(SUM(CASE WHEN a.pagado = true THEN a.precio ELSE 0 END), 0)::DECIMAL as total_amount_paid,
        COALESCE(SUM(CASE WHEN a.pagado = false OR a.pagado IS NULL THEN 
            CASE 
                WHEN a.tipo_servicio = 'corte' THEN bs.precio_corte_adulto
                WHEN a.tipo_servicio = 'corte_barba' THEN bs.precio_combo
                ELSE bs.precio_corte_adulto
            END
        ELSE 0 END), 0)::DECIMAL as total_amount_pending,
        
        -- Por método de pago
        COALESCE(SUM(CASE WHEN a.pagado = true AND a.metodo_pago = 'efectivo' THEN a.precio ELSE 0 END), 0)::DECIMAL as efectivo_amount,
        COALESCE(SUM(CASE WHEN a.pagado = true AND a.metodo_pago = 'sinpe' THEN a.precio ELSE 0 END), 0)::DECIMAL as sinpe_amount,
        COALESCE(SUM(CASE WHEN a.pagado = true AND a.metodo_pago IN ('tarjeta_credito', 'tarjeta_debito') THEN a.precio ELSE 0 END), 0)::DECIMAL as tarjeta_amount,
        COALESCE(SUM(CASE WHEN a.pagado = true AND a.metodo_pago = 'transferencia' THEN a.precio ELSE 0 END), 0)::DECIMAL as transferencia_amount,
        
        -- Ticket promedio
        CASE 
            WHEN COUNT(CASE WHEN a.pagado = true THEN 1 END) > 0 
            THEN COALESCE(AVG(CASE WHEN a.pagado = true THEN a.precio END), 0)::DECIMAL
            ELSE 0::DECIMAL
        END as average_ticket,
        
        -- Por tipo de servicio
        COUNT(CASE WHEN a.tipo_servicio = 'corte' THEN 1 END)::INTEGER as corte_count,
        COUNT(CASE WHEN a.tipo_servicio = 'corte_barba' THEN 1 END)::INTEGER as corte_barba_count,
        COALESCE(SUM(CASE WHEN a.pagado = true AND a.tipo_servicio = 'corte' THEN a.precio ELSE 0 END), 0)::DECIMAL as corte_amount,
        COALESCE(SUM(CASE WHEN a.pagado = true AND a.tipo_servicio = 'corte_barba' THEN a.precio ELSE 0 END), 0)::DECIMAL as corte_barba_amount
        
    FROM appointments a
    JOIN barbershops bs ON a.barbershop_id = bs.id
    WHERE a.barbershop_id = p_barbershop_id
    AND a.fecha BETWEEN p_start_date AND p_end_date
    AND a.estado IN ('completada', 'programada', 'confirmada');
END;
$$ LANGUAGE plpgsql;

-- Función para obtener detalle de transacciones pagadas
CREATE OR REPLACE FUNCTION get_paid_appointments_detail(
    p_barbershop_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    appointment_id UUID,
    client_name VARCHAR,
    client_phone VARCHAR,
    barber_name VARCHAR,
    service_date DATE,
    service_time TIME,
    service_type VARCHAR,
    amount DECIMAL,
    payment_method VARCHAR,
    payment_date TIMESTAMP WITH TIME ZONE,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        c.nombre,
        c.telefono,
        b.nombre,
        a.fecha,
        a.hora,
        a.tipo_servicio,
        a.precio,
        COALESCE(a.metodo_pago::VARCHAR, 'No especificado'),
        a.fecha_pago,
        a.notas
    FROM appointments a
    JOIN clients c ON a.client_id = c.id
    JOIN barbers b ON a.barber_id = b.id
    WHERE a.barbershop_id = p_barbershop_id
    AND a.fecha BETWEEN p_start_date AND p_end_date
    AND a.pagado = true
    ORDER BY a.fecha_pago DESC, a.fecha DESC, a.hora;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener transacciones financieras adicionales
CREATE OR REPLACE FUNCTION get_financial_transactions_detail(
    p_barbershop_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    transaction_id UUID,
    transaction_type VARCHAR,
    category_name VARCHAR,
    amount DECIMAL,
    payment_method VARCHAR,
    description TEXT,
    transaction_date TIMESTAMP WITH TIME ZONE,
    reference_appointment_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ft.id,
        ft.tipo_transaccion::VARCHAR,
        COALESCE(fc.nombre, 'Sin categoría'),
        ft.monto,
        ft.metodo_pago::VARCHAR,
        ft.descripcion,
        ft.fecha_transaccion,
        ft.referencia_cita_id
    FROM financial_transactions ft
    LEFT JOIN financial_categories fc ON ft.categoria_id = fc.id
    WHERE ft.barbershop_id = p_barbershop_id
    AND ft.fecha_transaccion::DATE BETWEEN p_start_date AND p_end_date
    ORDER BY ft.fecha_transaccion DESC;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas por barbero
CREATE OR REPLACE FUNCTION get_barber_performance_by_period(
    p_barbershop_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    barber_id UUID,
    barber_name VARCHAR,
    total_appointments INTEGER,
    paid_appointments INTEGER,
    total_earned DECIMAL,
    average_per_appointment DECIMAL,
    corte_count INTEGER,
    corte_barba_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.nombre,
        COUNT(a.id)::INTEGER as total_appointments,
        COUNT(CASE WHEN a.pagado = true THEN 1 END)::INTEGER as paid_appointments,
        COALESCE(SUM(CASE WHEN a.pagado = true THEN a.precio ELSE 0 END), 0)::DECIMAL as total_earned,
        CASE 
            WHEN COUNT(CASE WHEN a.pagado = true THEN 1 END) > 0 
            THEN COALESCE(AVG(CASE WHEN a.pagado = true THEN a.precio END), 0)::DECIMAL
            ELSE 0::DECIMAL
        END as average_per_appointment,
        COUNT(CASE WHEN a.tipo_servicio = 'corte' THEN 1 END)::INTEGER as corte_count,
        COUNT(CASE WHEN a.tipo_servicio = 'corte_barba' THEN 1 END)::INTEGER as corte_barba_count
    FROM barbers b
    LEFT JOIN appointments a ON b.id = a.barber_id 
        AND a.fecha BETWEEN p_start_date AND p_end_date
        AND a.barbershop_id = p_barbershop_id
        AND a.estado IN ('completada', 'programada', 'confirmada')
    WHERE b.barbershop_id = p_barbershop_id
    GROUP BY b.id, b.nombre
    ORDER BY total_earned DESC;
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentar las funciones
COMMENT ON FUNCTION get_financial_summary_by_period(UUID, DATE, DATE) IS 'Obtiene resumen financiero por período para reportes PDF';
COMMENT ON FUNCTION get_paid_appointments_detail(UUID, DATE, DATE) IS 'Obtiene detalle de citas pagadas para reportes PDF';
COMMENT ON FUNCTION get_financial_transactions_detail(UUID, DATE, DATE) IS 'Obtiene transacciones financieras adicionales para reportes PDF';
COMMENT ON FUNCTION get_barber_performance_by_period(UUID, DATE, DATE) IS 'Obtiene estadísticas de rendimiento por barbero para reportes PDF';

-- Verificar creación
SELECT 'Funciones para reportes financieros PDF creadas correctamente' as resultado;