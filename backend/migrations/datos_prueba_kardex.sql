-- =====================================================
-- DATOS DE PRUEBA PARA KARDEX INTEGRAL
-- =====================================================
-- Script rápido para ver el kardex funcionando
-- Crea datos de ejemplo simulando operaciones reales
-- =====================================================

-- Limpiar tabla (opcional)
-- TRUNCATE TABLE kardex_integral;

-- =====================================================
-- ESCENARIO DE PRUEBA: Negocio de Camu Camu
-- =====================================================
-- Productor: Juan Pérez (ID: 1)
-- Lote: LOTE-001-2026 (ID: 1)
-- Categorías: PRIMERA, SEGUNDA, TERCERA
-- =====================================================

-- 1. INGRESO DE MATERIA PRIMA (PESAJES)
-- Día 1: Se recibe el lote del productor
INSERT INTO kardex_integral (
  fecha_movimiento, tipo_kardex, tipo_movimiento, documento_tipo, 
  documento_id, documento_numero, lote_id, categoria_id, categoria_nombre,
  peso_kg, saldo_fisico_kg, persona_id, persona_nombre, persona_tipo,
  concepto, usuario_registro
) VALUES
('2026-01-15 08:00:00', 'fisico', 'ingreso', 'pesaje', 1, 'PES-001', 1, 1, 'PRIMERA', 
 150.500, 150.500, 1, 'Juan Pérez', 'productor', 
 'Ingreso categoría PRIMERA - Lote LOTE-001-2026', 'admin'),

('2026-01-15 08:15:00', 'fisico', 'ingreso', 'pesaje', 2, 'PES-002', 1, 2, 'SEGUNDA', 
 280.750, 431.250, 1, 'Juan Pérez', 'productor', 
 'Ingreso categoría SEGUNDA - Lote LOTE-001-2026', 'admin'),

('2026-01-15 08:30:00', 'fisico', 'ingreso', 'pesaje', 3, 'PES-003', 1, 3, 'TERCERA', 
 95.200, 526.450, 1, 'Juan Pérez', 'productor', 
 'Ingreso categoría TERCERA - Lote LOTE-001-2026', 'admin');

-- 2. ADELANTO AL PRODUCTOR
-- Día 2: Se le da un adelanto en efectivo
INSERT INTO kardex_integral (
  fecha_movimiento, tipo_kardex, tipo_movimiento, documento_tipo,
  documento_id, cuenta_tipo, monto, saldo_financiero,
  persona_id, persona_nombre, persona_tipo,
  concepto, observaciones, usuario_registro
) VALUES
('2026-01-16 10:00:00', 'financiero', 'egreso', 'adelanto', 
 1, 'caja', 2000.00, -2000.00,
 1, 'Juan Pérez', 'productor',
 'Adelanto a Juan Pérez', 'Adelanto para gastos personales', 'admin');

-- 3. VENTA DE PRODUCTO (PRIMERA)
-- Día 5: Venta de 100 kg de categoría PRIMERA
INSERT INTO kardex_integral (
  fecha_movimiento, tipo_kardex, tipo_movimiento, documento_tipo,
  documento_id, documento_numero, lote_id, categoria_id, categoria_nombre,
  peso_kg, saldo_fisico_kg, persona_id, persona_nombre, persona_tipo,
  concepto, usuario_registro
) VALUES
('2026-01-18 14:30:00', 'fisico', 'salida', 'venta', 
 1, 'FAC-001', 1, 1, 'PRIMERA',
 100.000, 426.450, 2, 'Comercial Los Andes SAC', 'cliente',
 'Venta FAC-001 - PRIMERA', 'admin');

-- Movimiento financiero de la venta (INGRESO)
INSERT INTO kardex_integral (
  fecha_movimiento, tipo_kardex, tipo_movimiento, documento_tipo,
  documento_id, documento_numero, cuenta_tipo, monto, saldo_financiero,
  persona_id, persona_nombre, persona_tipo,
  concepto, usuario_registro
) VALUES
('2026-01-18 14:30:00', 'financiero', 'ingreso', 'venta',
 1, 'FAC-001', 'banco', 5500.00, 3500.00,
 2, 'Comercial Los Andes SAC', 'cliente',
 'Cobro venta FAC-001', 'admin');

-- 4. OTRA VENTA (SEGUNDA)
-- Día 7: Venta de 150 kg de categoría SEGUNDA
INSERT INTO kardex_integral (
  fecha_movimiento, tipo_kardex, tipo_movimiento, documento_tipo,
  documento_id, documento_numero, lote_id, categoria_id, categoria_nombre,
  peso_kg, saldo_fisico_kg, persona_id, persona_nombre, persona_tipo,
  concepto, usuario_registro
) VALUES
('2026-01-19 11:00:00', 'fisico', 'salida', 'venta',
 2, 'FAC-002', 1, 2, 'SEGUNDA',
 150.000, 276.450, 3, 'Exportadora Perú SAC', 'cliente',
 'Venta FAC-002 - SEGUNDA', 'admin');

-- Movimiento financiero
INSERT INTO kardex_integral (
  fecha_movimiento, tipo_kardex, tipo_movimiento, documento_tipo,
  documento_id, documento_numero, cuenta_tipo, monto, saldo_financiero,
  persona_id, persona_nombre, persona_tipo,
  concepto, usuario_registro
) VALUES
('2026-01-19 11:00:00', 'financiero', 'ingreso', 'venta',
 2, 'FAC-002', 'banco', 6750.00, 10250.00,
 3, 'Exportadora Perú SAC', 'cliente',
 'Cobro venta FAC-002', 'admin');

-- 5. LIQUIDACIÓN AL PRODUCTOR
-- Día 10: Liquidación final con el productor
INSERT INTO kardex_integral (
  fecha_movimiento, tipo_kardex, tipo_movimiento, documento_tipo,
  documento_id, documento_numero, lote_id,
  peso_kg, saldo_fisico_kg,
  persona_id, persona_nombre, persona_tipo,
  concepto, observaciones, usuario_registro
) VALUES
('2026-01-20 16:00:00', 'fisico', 'egreso', 'liquidacion',
 1, 'LIQ-001-2026', 1,
 276.450, 0.000,
 1, 'Juan Pérez', 'productor',
 'Liquidación LIQ-001-2026 - Lote LOTE-001-2026',
 'Liquidación total del lote', 'admin');

-- Movimiento financiero de liquidación (PAGO al productor)
INSERT INTO kardex_integral (
  fecha_movimiento, tipo_kardex, tipo_movimiento, documento_tipo,
  documento_id, documento_numero, cuenta_tipo, monto, saldo_financiero,
  persona_id, persona_nombre, persona_tipo,
  concepto, observaciones, usuario_registro
) VALUES
('2026-01-20 16:00:00', 'financiero', 'egreso', 'liquidacion',
 1, 'LIQ-001-2026', 'banco', 8250.00, 2000.00,
 1, 'Juan Pérez', 'productor',
 'Pago liquidación LIQ-001-2026',
 'Se descontó adelanto de S/. 2,000', 'admin');

-- 6. AJUSTE CONTABLE (ejemplo)
-- Corrección de inventario
INSERT INTO kardex_integral (
  fecha_movimiento, tipo_kardex, tipo_movimiento, documento_tipo,
  documento_id, lote_id, categoria_id, categoria_nombre,
  peso_kg, saldo_fisico_kg,
  concepto, observaciones, usuario_registro
) VALUES
('2026-01-21 09:00:00', 'fisico', 'egreso', 'ajuste',
 1, 1, 3, 'TERCERA',
 5.200, -5.200,
 'Ajuste de inventario - merma',
 'Producto deteriorado por almacenamiento', 'admin');

-- =====================================================
-- DATOS ADICIONALES: MÁS MOVIMIENTOS
-- =====================================================

-- Más ingresos de otro productor
INSERT INTO kardex_integral (
  fecha_movimiento, tipo_kardex, tipo_movimiento, documento_tipo,
  documento_id, documento_numero, lote_id, categoria_id, categoria_nombre,
  peso_kg, saldo_fisico_kg, persona_id, persona_nombre, persona_tipo,
  concepto, usuario_registro
) VALUES
('2026-01-21 10:00:00', 'fisico', 'ingreso', 'pesaje',
 4, 'PES-004', 2, 1, 'PRIMERA',
 200.000, 194.800, 4, 'María López', 'productor',
 'Ingreso categoría PRIMERA - Lote LOTE-002-2026', 'admin');

-- Adelanto a otro productor
INSERT INTO kardex_integral (
  fecha_movimiento, tipo_kardex, tipo_movimiento, documento_tipo,
  documento_id, cuenta_tipo, monto, saldo_financiero,
  persona_id, persona_nombre, persona_tipo,
  concepto, usuario_registro
) VALUES
('2026-01-21 11:00:00', 'financiero', 'egreso', 'adelanto',
 2, 'caja', 1500.00, 500.00,
 4, 'María López', 'productor',
 'Adelanto a María López', 'admin');

-- =====================================================
-- VERIFICACIÓN DE DATOS
-- =====================================================

SELECT '✅ DATOS DE PRUEBA INSERTADOS CORRECTAMENTE' AS STATUS;

-- Resumen general
SELECT 
  tipo_kardex,
  tipo_movimiento,
  COUNT(*) AS cantidad,
  COALESCE(SUM(peso_kg), 0) AS total_kg,
  COALESCE(SUM(monto), 0) AS total_soles
FROM kardex_integral
GROUP BY tipo_kardex, tipo_movimiento;

-- Últimos movimientos
SELECT 
  id,
  DATE_FORMAT(fecha_movimiento, '%d/%m/%Y %H:%i') AS fecha,
  tipo_kardex,
  tipo_movimiento,
  documento_tipo,
  COALESCE(peso_kg, 0) AS kg,
  COALESCE(monto, 0) AS soles,
  concepto
FROM kardex_integral
ORDER BY fecha_movimiento DESC
LIMIT 10;

-- Saldos actuales
SELECT 
  'SALDO FÍSICO' AS tipo,
  COALESCE(SUM(CASE WHEN tipo_movimiento = 'ingreso' THEN peso_kg ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN tipo_movimiento IN ('egreso', 'salida') THEN peso_kg ELSE 0 END), 0) AS saldo
FROM kardex_integral
WHERE tipo_kardex = 'fisico'
UNION ALL
SELECT 
  'SALDO BANCO' AS tipo,
  COALESCE(SUM(CASE WHEN tipo_movimiento = 'ingreso' AND cuenta_tipo = 'banco' THEN monto ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN tipo_movimiento = 'egreso' AND cuenta_tipo = 'banco' THEN monto ELSE 0 END), 0) AS saldo
FROM kardex_integral
WHERE tipo_kardex = 'financiero'
UNION ALL
SELECT 
  'SALDO CAJA' AS tipo,
  COALESCE(SUM(CASE WHEN tipo_movimiento = 'ingreso' AND cuenta_tipo = 'caja' THEN monto ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN tipo_movimiento = 'egreso' AND cuenta_tipo = 'caja' THEN monto ELSE 0 END), 0) AS saldo
FROM kardex_integral
WHERE tipo_kardex = 'financiero';

-- =====================================================
-- ¡LISTO! Ahora tu kardex tiene datos para visualizar
-- =====================================================
