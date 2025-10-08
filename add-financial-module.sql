-- ===================================================================
-- MÓDULO DE INGRESOS Y FINANZAS - SISTEMA BARBERÍA
-- ===================================================================
-- Versión: 1.0
-- Fecha: 2025-10-06
-- Descripción: Módulo completo para gestión financiera con reportes PDF
-- ===================================================================

-- 1. CREAR TIPOS ENUMERADOS PARA FINANZAS
-- ===================================================================

-- Tipos de transacciones
CREATE TYPE transaction_type AS ENUM ('ingreso', 'gasto');

-- Métodos de pago disponibles en Costa Rica
CREATE TYPE payment_method AS ENUM ('efectivo', 'sinpe', 'tarjeta_credito', 'tarjeta_debito', 'transferencia');

-- Estados de transacciones
CREATE TYPE transaction_status AS ENUM ('pendiente', 'completada', 'cancelada');

-- ===================================================================
-- 2. CREAR TABLAS PARA CATEGORÍAS
-- ===================================================================

-- Categorías de ingresos y gastos
CREATE TABLE IF NOT EXISTS financial_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    tipo transaction_type NOT NULL,
    descripcion TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Color hexadecimal para UI
    activo BOOLEAN DEFAULT true,
    orden INTEGER DEFAULT 0, -- Para ordenar categorías en UI
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(barbershop_id, nombre, tipo)
);

-- ===================================================================
-- 3. TABLA PRINCIPAL DE TRANSACCIONES
-- ===================================================================

CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL, -- NULL si no está relacionado con cita
    category_id UUID NOT NULL REFERENCES financial_categories(id) ON DELETE RESTRICT,
    barber_id UUID REFERENCES barbers(id) ON DELETE SET NULL, -- Para comisiones/pagos a barberos
    
    -- Información básica de la transacción
    tipo transaction_type NOT NULL,
    metodo_pago payment_method NOT NULL,
    monto DECIMAL(12,2) NOT NULL, -- Permite hasta 999,999,999.99 (casi mil millones)
    moneda VARCHAR(3) DEFAULT 'CRC', -- Código ISO de moneda
    
    -- Detalles de la transacción
    concepto VARCHAR(255) NOT NULL, -- Descripción corta
    descripcion TEXT, -- Descripción detallada
    numero_factura VARCHAR(50), -- Para gastos con factura
    numero_referencia VARCHAR(100), -- Para SINPE, transferencias, etc.
    
    -- Estado y fechas
    estado transaction_status DEFAULT 'completada',
    fecha_transaccion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_vencimiento DATE, -- Para pagos pendientes
    
    -- Metadatos para reportes
    es_recurrente BOOLEAN DEFAULT false,
    frecuencia_recurrencia VARCHAR(20), -- 'diaria', 'semanal', 'mensual', 'anual'
    tags TEXT[], -- Array de etiquetas para filtros avanzados
    
    -- Auditoría
    created_by VARCHAR(255), -- Email del usuario que creó
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_monto CHECK (monto > 0),
    CONSTRAINT valid_frecuencia CHECK (
        (es_recurrente = false) OR 
        (es_recurrente = true AND frecuencia_recurrencia IS NOT NULL)
    )
);

-- ===================================================================
-- 4. TABLA PARA CONFIGURACIÓN FINANCIERA
-- ===================================================================

CREATE TABLE IF NOT EXISTS financial_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    -- Configuración de reportes
    moneda_principal VARCHAR(3) DEFAULT 'CRC',
    simbolo_moneda VARCHAR(5) DEFAULT '₡',
    decimales INTEGER DEFAULT 2,
    
    -- Configuración de comisiones
    comision_barbero_porcentaje DECIMAL(5,2) DEFAULT 0.00, -- 0-100%
    comision_barbero_activa BOOLEAN DEFAULT false,
    
    -- Configuración de impuestos
    impuesto_ventas_porcentaje DECIMAL(5,2) DEFAULT 13.00, -- IVA en Costa Rica
    incluir_impuestos BOOLEAN DEFAULT true,
    
    -- Configuración de PDFs
    incluir_logo_pdf BOOLEAN DEFAULT true,
    incluir_firma_digital BOOLEAN DEFAULT false,
    plantilla_pdf VARCHAR(50) DEFAULT 'estandar',
    
    -- Configuración de alertas
    alerta_objetivo_diario DECIMAL(10,2),
    alerta_gastos_excesivos DECIMAL(10,2),
    notificar_objetivos BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(barbershop_id)
);

-- ===================================================================
-- 5. TABLA PARA OBJETIVOS FINANCIEROS
-- ===================================================================

CREATE TABLE IF NOT EXISTS financial_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    
    titulo VARCHAR(100) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(20) NOT NULL, -- 'diario', 'semanal', 'mensual', 'anual'
    monto_objetivo DECIMAL(12,2) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    activo BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_fechas_objetivo CHECK (fecha_fin >= fecha_inicio),
    CONSTRAINT valid_monto_objetivo CHECK (monto_objetivo > 0)
);

-- ===================================================================
-- 6. MODIFICAR TABLA APPOINTMENTS PARA PAGOS
-- ===================================================================

-- Agregar campos de pago a la tabla appointments existente
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS metodo_pago payment_method,
ADD COLUMN IF NOT EXISTS pagado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS monto_pagado DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS descuento_aplicado DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS propina DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS notas_pago TEXT;

-- ===================================================================
-- 7. CREAR ÍNDICES PARA PERFORMANCE
-- ===================================================================

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_financial_transactions_barbershop_fecha 
ON financial_transactions(barbershop_id, fecha_transaccion);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_tipo_metodo 
ON financial_transactions(tipo, metodo_pago);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_appointment 
ON financial_transactions(appointment_id) WHERE appointment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_financial_categories_barbershop 
ON financial_categories(barbershop_id, tipo, activo);

CREATE INDEX IF NOT EXISTS idx_appointments_pagado 
ON appointments(barbershop_id, pagado, fecha_pago);

-- ===================================================================
-- 8. CREAR VISTAS ÚTILES PARA REPORTES
-- ===================================================================

-- Vista de resumen diario de ingresos
CREATE OR REPLACE VIEW daily_income_summary AS
SELECT 
    barbershop_id,
    DATE(fecha_transaccion) as fecha,
    COUNT(*) as total_transacciones,
    SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) as total_ingresos,
    SUM(CASE WHEN tipo = 'gasto' THEN monto ELSE 0 END) as total_gastos,
    SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END) as ganancia_neta,
    COUNT(CASE WHEN metodo_pago = 'efectivo' AND tipo = 'ingreso' THEN 1 END) as pagos_efectivo,
    COUNT(CASE WHEN metodo_pago = 'sinpe' AND tipo = 'ingreso' THEN 1 END) as pagos_sinpe,
    SUM(CASE WHEN metodo_pago = 'efectivo' AND tipo = 'ingreso' THEN monto ELSE 0 END) as monto_efectivo,
    SUM(CASE WHEN metodo_pago = 'sinpe' AND tipo = 'ingreso' THEN monto ELSE 0 END) as monto_sinpe
FROM financial_transactions
WHERE estado = 'completada'
GROUP BY barbershop_id, DATE(fecha_transaccion);

-- Vista de estadísticas por categoría
CREATE OR REPLACE VIEW category_stats AS
SELECT 
    ft.barbershop_id,
    fc.nombre as categoria,
    fc.tipo,
    fc.color,
    COUNT(*) as total_transacciones,
    SUM(ft.monto) as total_monto,
    AVG(ft.monto) as promedio_monto,
    MIN(ft.monto) as monto_minimo,
    MAX(ft.monto) as monto_maximo
FROM financial_transactions ft
JOIN financial_categories fc ON ft.category_id = fc.id
WHERE ft.estado = 'completada'
GROUP BY ft.barbershop_id, fc.id, fc.nombre, fc.tipo, fc.color;

-- ===================================================================
-- 9. INSERTAR CATEGORÍAS POR DEFECTO
-- ===================================================================

-- Función para insertar categorías por defecto para una barbería
CREATE OR REPLACE FUNCTION insert_default_financial_categories(p_barbershop_id UUID)
RETURNS void AS $$
BEGIN
    -- Categorías de ingresos por defecto
    INSERT INTO financial_categories (barbershop_id, nombre, tipo, descripcion, color, orden) VALUES
    (p_barbershop_id, 'Servicios de Corte', 'ingreso', 'Ingresos por cortes de cabello', '#10B981', 1),
    (p_barbershop_id, 'Servicios de Barba', 'ingreso', 'Ingresos por arreglo de barba', '#059669', 2),
    (p_barbershop_id, 'Productos', 'ingreso', 'Venta de productos de barbería', '#3B82F6', 3),
    (p_barbershop_id, 'Propinas', 'ingreso', 'Propinas recibidas', '#8B5CF6', 4),
    (p_barbershop_id, 'Otros Ingresos', 'ingreso', 'Otros tipos de ingresos', '#06B6D4', 5),
    
    -- Categorías de gastos por defecto
    (p_barbershop_id, 'Productos y Suministros', 'gasto', 'Compra de productos para la barbería', '#EF4444', 1),
    (p_barbershop_id, 'Servicios Públicos', 'gasto', 'Electricidad, agua, internet', '#F59E0B', 2),
    (p_barbershop_id, 'Alquiler', 'gasto', 'Alquiler del local', '#DC2626', 3),
    (p_barbershop_id, 'Salarios', 'gasto', 'Pagos a empleados', '#7C2D12', 4),
    (p_barbershop_id, 'Mantenimiento', 'gasto', 'Mantenimiento de equipos y local', '#EA580C', 5),
    (p_barbershop_id, 'Publicidad', 'gasto', 'Gastos en marketing y publicidad', '#C2410C', 6),
    (p_barbershop_id, 'Otros Gastos', 'gasto', 'Otros gastos operativos', '#9A3412', 7);
    
    -- Insertar configuración financiera por defecto
    INSERT INTO financial_settings (barbershop_id) VALUES (p_barbershop_id)
    ON CONFLICT (barbershop_id) DO NOTHING;
    
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- 10. TRIGGER PARA CREAR TRANSACCIÓN AL COMPLETAR CITA
-- ===================================================================

-- Función para crear transacción automática cuando se completa una cita
CREATE OR REPLACE FUNCTION create_transaction_from_appointment()
RETURNS TRIGGER AS $$
DECLARE
    service_category_id UUID;
BEGIN
    -- Solo procesar si el estado cambió a 'completada' y hay un pago
    IF NEW.estado = 'completada' AND OLD.estado != 'completada' AND NEW.pagado = true THEN
        
        -- Buscar la categoría de servicios correspondiente
        SELECT id INTO service_category_id
        FROM financial_categories 
        WHERE barbershop_id = NEW.barbershop_id 
        AND tipo = 'ingreso'
        AND (
            (NEW.tipo_servicio = 'corte' AND nombre ILIKE '%corte%') OR
            (NEW.tipo_servicio = 'corte_barba' AND nombre ILIKE '%barba%')
        )
        LIMIT 1;
        
        -- Si no encuentra categoría específica, usar la primera de ingresos
        IF service_category_id IS NULL THEN
            SELECT id INTO service_category_id
            FROM financial_categories 
            WHERE barbershop_id = NEW.barbershop_id 
            AND tipo = 'ingreso'
            AND activo = true
            ORDER BY orden
            LIMIT 1;
        END IF;
        
        -- Crear la transacción si tenemos categoría y monto
        IF service_category_id IS NOT NULL AND NEW.monto_pagado > 0 THEN
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
                NEW.barbershop_id,
                NEW.id,
                service_category_id,
                NEW.barber_id,
                'ingreso',
                NEW.metodo_pago,
                NEW.monto_pagado,
                'Pago de cita - ' || NEW.tipo_servicio,
                'Pago automático generado al completar cita',
                'completada',
                COALESCE(NEW.fecha_pago, NOW())
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
DROP TRIGGER IF EXISTS trigger_appointment_payment ON appointments;
CREATE TRIGGER trigger_appointment_payment
    AFTER UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION create_transaction_from_appointment();

-- ===================================================================
-- 11. FUNCIONES ÚTILES PARA REPORTES
-- ===================================================================

-- Función para obtener resumen financiero de un período
CREATE OR REPLACE FUNCTION get_financial_summary(
    p_barbershop_id UUID,
    p_fecha_inicio DATE,
    p_fecha_fin DATE
)
RETURNS TABLE(
    total_ingresos DECIMAL(12,2),
    total_gastos DECIMAL(12,2),
    ganancia_neta DECIMAL(12,2),
    total_transacciones INTEGER,
    efectivo_recibido DECIMAL(12,2),
    sinpe_recibido DECIMAL(12,2),
    promedio_diario DECIMAL(12,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0) as total_ingresos,
        COALESCE(SUM(CASE WHEN tipo = 'gasto' THEN monto ELSE 0 END), 0) as total_gastos,
        COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END), 0) as ganancia_neta,
        COUNT(*)::INTEGER as total_transacciones,
        COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' AND tipo = 'ingreso' THEN monto ELSE 0 END), 0) as efectivo_recibido,
        COALESCE(SUM(CASE WHEN metodo_pago = 'sinpe' AND tipo = 'ingreso' THEN monto ELSE 0 END), 0) as sinpe_recibido,
        CASE 
            WHEN p_fecha_fin - p_fecha_inicio + 1 > 0 
            THEN COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END), 0) / (p_fecha_fin - p_fecha_inicio + 1)
            ELSE 0
        END as promedio_diario
    FROM financial_transactions
    WHERE barbershop_id = p_barbershop_id
    AND DATE(fecha_transaccion) BETWEEN p_fecha_inicio AND p_fecha_fin
    AND estado = 'completada';
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- 12. COMENTARIOS EN TABLAS
-- ===================================================================

COMMENT ON TABLE financial_categories IS 'Categorías para clasificar ingresos y gastos';
COMMENT ON TABLE financial_transactions IS 'Registro principal de todas las transacciones financieras';
COMMENT ON TABLE financial_settings IS 'Configuración financiera por barbería';
COMMENT ON TABLE financial_goals IS 'Objetivos financieros establecidos';

COMMENT ON COLUMN financial_transactions.appointment_id IS 'Relación con cita (NULL si es transacción manual)';
COMMENT ON COLUMN financial_transactions.numero_referencia IS 'Número de referencia SINPE o transferencia';
COMMENT ON COLUMN financial_transactions.tags IS 'Etiquetas para filtros avanzados en reportes';

-- ===================================================================
-- VERIFICACIÓN DE INSTALACIÓN
-- ===================================================================

SELECT 'MÓDULO FINANCIERO INSTALADO CORRECTAMENTE' as resultado;

-- Verificar tablas creadas
SELECT 'TABLAS FINANCIERAS CREADAS:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'financial_%'
ORDER BY table_name;

-- Verificar tipos enum creados
SELECT 'TIPOS ENUM CREADOS:' as info;
SELECT typname as tipo_enum
FROM pg_type 
WHERE typname IN ('transaction_type', 'payment_method', 'transaction_status');