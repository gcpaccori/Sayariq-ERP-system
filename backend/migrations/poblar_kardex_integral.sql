-- =====================================================
-- SCRIPT PARA POBLAR KARDEX INTEGRAL CON DATOS EXISTENTES
-- =====================================================
-- Este script migra los datos históricos de tus tablas
-- actuales hacia el kardex_integral
-- =====================================================

-- IMPORTANTE: Ejecutar esto en phpMyAdmin o terminal MySQL
-- =====================================================

-- Paso 1: Limpiar kardex_integral (opcional si quieres empezar desde cero)
-- TRUNCATE TABLE kardex_integral;

-- =====================================================
-- 1. MIGRAR LIQUIDACIONES (movimientos físicos + financieros)
-- =====================================================
INSERT INTO kardex_integral (
  fecha_movimiento,
  tipo_kardex,
  tipo_movimiento,
  documento_tipo,
  documento_id,
  documento_numero,
  lote_id,
  categoria_id,
  categoria_nombre,
  peso_kg,
  cuenta_tipo,
  monto,
  persona_id,
  persona_nombre,
  persona_tipo,
  concepto,
  observaciones,
  usuario_registro
)
SELECT 
  l.fecha_liquidacion AS fecha_movimiento,
  'fisico' AS tipo_kardex,
  'egreso' AS tipo_movimiento,
  'liquidacion' AS documento_tipo,
  l.id AS documento_id,
  l.numero_liquidacion AS documento_numero,
  l.lote_id,
  NULL AS categoria_id,
  'MIXTO' AS categoria_nombre,
  COALESCE(
    (SELECT SUM(ld.peso_ajustado) FROM liquidaciones_detalle ld WHERE ld.liquidacion_id = l.id),
    l.peso_final_ajustado,
    0
  ) AS peso_kg,
  NULL AS cuenta_tipo,
  NULL AS monto,
  lt.productor_id AS persona_id,
  p.nombre_completo AS persona_nombre,
  'productor' AS persona_tipo,
  CONCAT('Liquidación ', COALESCE(l.numero_liquidacion, CONCAT('LIQ-', l.id)), ' - Lote ', lt.numero_lote) AS concepto,
  l.observaciones,
  'migracion' AS usuario_registro
FROM liquidaciones l
LEFT JOIN lotes lt ON l.lote_id = lt.id
LEFT JOIN personas p ON lt.productor_id = p.id
WHERE l.id IS NOT NULL;

-- Movimientos financieros de liquidaciones (EGRESO de banco/caja)
INSERT INTO kardex_integral (
  fecha_movimiento,
  tipo_kardex,
  tipo_movimiento,
  documento_tipo,
  documento_id,
  documento_numero,
  lote_id,
  cuenta_tipo,
  monto,
  persona_id,
  persona_nombre,
  persona_tipo,
  concepto,
  usuario_registro
)
SELECT 
  l.fecha_liquidacion AS fecha_movimiento,
  'financiero' AS tipo_kardex,
  'egreso' AS tipo_movimiento,
  'liquidacion' AS documento_tipo,
  l.id AS documento_id,
  l.numero_liquidacion AS documento_numero,
  l.lote_id,
  'banco' AS cuenta_tipo,
  l.total_a_pagar AS monto,
  lt.productor_id AS persona_id,
  p.nombre_completo AS persona_nombre,
  'productor' AS persona_tipo,
  CONCAT('Pago liquidación ', COALESCE(l.numero_liquidacion, CONCAT('LIQ-', l.id))) AS concepto,
  'migracion' AS usuario_registro
FROM liquidaciones l
LEFT JOIN lotes lt ON l.lote_id = lt.id
LEFT JOIN personas p ON lt.productor_id = p.id
WHERE l.id IS NOT NULL AND l.total_a_pagar > 0;

-- =====================================================
-- 2. MIGRAR VENTAS (movimientos físicos + financieros)
-- =====================================================
INSERT INTO kardex_integral (
  fecha_movimiento,
  tipo_kardex,
  tipo_movimiento,
  documento_tipo,
  documento_id,
  documento_numero,
  lote_id,
  categoria_id,
  categoria_nombre,
  peso_kg,
  cuenta_tipo,
  monto,
  persona_id,
  persona_nombre,
  persona_tipo,
  concepto,
  usuario_registro
)
SELECT 
  v.fecha_venta AS fecha_movimiento,
  'fisico' AS tipo_kardex,
  'salida' AS tipo_movimiento,
  'venta' AS documento_tipo,
  v.id AS documento_id,
  CONCAT('VENTA-', v.id) AS documento_numero,
  p.lote_id,
  NULL AS categoria_id,
  v.categoria AS categoria_nombre,
  v.kg AS peso_kg,
  NULL AS cuenta_tipo,
  NULL AS monto,
  p.cliente_id AS persona_id,
  per.nombre_completo AS persona_nombre,
  'cliente' AS persona_tipo,
  CONCAT('Venta ', v.producto, ' - ', v.categoria) AS concepto,
  'migracion' AS usuario_registro
FROM ventas v
LEFT JOIN pedidos p ON v.pedido_id = p.id
LEFT JOIN personas per ON p.cliente_id = per.id
WHERE v.id IS NOT NULL;

-- Movimientos financieros de ventas (INGRESO a banco/caja)
INSERT INTO kardex_integral (
  fecha_movimiento,
  tipo_kardex,
  tipo_movimiento,
  documento_tipo,
  documento_id,
  documento_numero,
  cuenta_tipo,
  monto,
  persona_id,
  persona_nombre,
  persona_tipo,
  concepto,
  usuario_registro
)
SELECT 
  v.fecha_venta AS fecha_movimiento,
  'financiero' AS tipo_kardex,
  'ingreso' AS tipo_movimiento,
  'venta' AS documento_tipo,
  v.id AS documento_id,
  CONCAT('VENTA-', v.id) AS documento_numero,
  'banco' AS cuenta_tipo,
  v.total AS monto,
  p.cliente_id AS persona_id,
  per.nombre_completo AS persona_nombre,
  'cliente' AS persona_tipo,
  CONCAT('Cobro venta ', v.producto) AS concepto,
  'migracion' AS usuario_registro
FROM ventas v
LEFT JOIN pedidos p ON v.pedido_id = p.id
LEFT JOIN personas per ON p.cliente_id = per.id
WHERE v.id IS NOT NULL AND v.total > 0;

-- =====================================================
-- 3. MIGRAR ADELANTOS (solo movimientos financieros)
-- =====================================================
INSERT INTO kardex_integral (
  fecha_movimiento,
  tipo_kardex,
  tipo_movimiento,
  documento_tipo,
  documento_id,
  cuenta_tipo,
  monto,
  persona_id,
  persona_nombre,
  persona_tipo,
  concepto,
  observaciones,
  usuario_registro
)
SELECT 
  a.fecha_adelanto AS fecha_movimiento,
  'financiero' AS tipo_kardex,
  'egreso' AS tipo_movimiento,
  'adelanto' AS documento_tipo,
  a.id AS documento_id,
  'caja' AS cuenta_tipo,
  a.monto AS monto,
  a.productor_id AS persona_id,
  p.nombre_completo AS persona_nombre,
  'productor' AS persona_tipo,
  CONCAT('Adelanto a ', p.nombre_completo) AS concepto,
  a.motivo AS observaciones,
  'migracion' AS usuario_registro
FROM adelantos a
LEFT JOIN personas p ON a.productor_id = p.id
WHERE a.id IS NOT NULL;

-- =====================================================
-- 4. MIGRAR PESOS/PESAJES (movimientos físicos - INGRESO)
-- =====================================================
-- Migramos desde pesos_lote_detalle que tiene el desglose por categoría
INSERT INTO kardex_integral (
  fecha_movimiento,
  tipo_kardex,
  tipo_movimiento,
  documento_tipo,
  documento_id,
  lote_id,
  categoria_id,
  categoria_nombre,
  peso_kg,
  persona_id,
  persona_nombre,
  persona_tipo,
  concepto,
  usuario_registro
)
SELECT 
  pl.fecha_pesado AS fecha_movimiento,
  'fisico' AS tipo_kardex,
  'ingreso' AS tipo_movimiento,
  'pesaje' AS documento_tipo,
  pld.id AS documento_id,
  pl.lote_id,
  pld.categoria_id,
  c.nombre AS categoria_nombre,
  pld.peso AS peso_kg,
  l.productor_id AS persona_id,
  per.nombre_completo AS persona_nombre,
  'productor' AS persona_tipo,
  CONCAT('Pesaje categoría ', c.nombre, ' - Lote ', l.numero_lote) AS concepto,
  'migracion' AS usuario_registro
FROM pesos_lote_detalle pld
INNER JOIN pesos_lote pl ON pld.peso_lote_id = pl.id
LEFT JOIN categorias c ON pld.categoria_id = c.id
LEFT JOIN lotes l ON pl.lote_id = l.id
LEFT JOIN personas per ON l.productor_id = per.id
WHERE pld.id IS NOT NULL AND pld.peso > 0;

-- =====================================================
-- 5. RECALCULAR SALDOS
-- =====================================================
-- Después de migrar los datos, necesitamos recalcular los saldos acumulados

-- 5.1 Actualizar saldos físicos
SET @saldo_fisico = 0;
UPDATE kardex_integral ki
JOIN (
  SELECT 
    id,
    @saldo_fisico := @saldo_fisico + CASE 
      WHEN tipo_movimiento = 'ingreso' THEN peso_kg
      WHEN tipo_movimiento = 'egreso' OR tipo_movimiento = 'salida' THEN -peso_kg
      ELSE 0
    END AS saldo_calculado
  FROM kardex_integral
  WHERE tipo_kardex = 'fisico'
  ORDER BY fecha_movimiento ASC, id ASC
) AS calc ON ki.id = calc.id
SET ki.saldo_fisico_kg = calc.saldo_calculado
WHERE ki.tipo_kardex = 'fisico';

-- 5.2 Actualizar saldos financieros por cuenta
SET @saldo_banco = 0;
UPDATE kardex_integral ki
JOIN (
  SELECT 
    id,
    @saldo_banco := @saldo_banco + CASE 
      WHEN tipo_movimiento = 'ingreso' THEN monto
      WHEN tipo_movimiento = 'egreso' THEN -monto
      ELSE 0
    END AS saldo_calculado
  FROM kardex_integral
  WHERE tipo_kardex = 'financiero' AND cuenta_tipo = 'banco'
  ORDER BY fecha_movimiento ASC, id ASC
) AS calc ON ki.id = calc.id
SET ki.saldo_financiero = calc.saldo_calculado
WHERE ki.tipo_kardex = 'financiero' AND ki.cuenta_tipo = 'banco';

SET @saldo_caja = 0;
UPDATE kardex_integral ki
JOIN (
  SELECT 
    id,
    @saldo_caja := @saldo_caja + CASE 
      WHEN tipo_movimiento = 'ingreso' THEN monto
      WHEN tipo_movimiento = 'egreso' THEN -monto
      ELSE 0
    END AS saldo_calculado
  FROM kardex_integral
  WHERE tipo_kardex = 'financiero' AND cuenta_tipo = 'caja'
  ORDER BY fecha_movimiento ASC, id ASC
) AS calc ON ki.id = calc.id
SET ki.saldo_financiero = calc.saldo_calculado
WHERE ki.tipo_kardex = 'financiero' AND ki.cuenta_tipo = 'caja';

-- =====================================================
-- 6. VERIFICAR RESULTADOS
-- =====================================================
SELECT 
  'RESUMEN DE MIGRACIÓN' AS titulo,
  COUNT(*) AS total_registros,
  SUM(CASE WHEN tipo_kardex = 'fisico' THEN 1 ELSE 0 END) AS movimientos_fisicos,
  SUM(CASE WHEN tipo_kardex = 'financiero' THEN 1 ELSE 0 END) AS movimientos_financieros,
  SUM(CASE WHEN documento_tipo = 'liquidacion' THEN 1 ELSE 0 END) AS liquidaciones,
  SUM(CASE WHEN documento_tipo = 'venta' THEN 1 ELSE 0 END) AS ventas,
  SUM(CASE WHEN documento_tipo = 'adelanto' THEN 1 ELSE 0 END) AS adelantos,
  SUM(CASE WHEN documento_tipo = 'pesaje' THEN 1 ELSE 0 END) AS pesajes
FROM kardex_integral;

-- Ver últimos movimientos
SELECT 
  id,
  fecha_movimiento,
  tipo_kardex,
  tipo_movimiento,
  documento_tipo,
  COALESCE(peso_kg, 0) AS peso_kg,
  COALESCE(monto, 0) AS monto,
  COALESCE(saldo_fisico_kg, 0) AS saldo_fisico,
  COALESCE(saldo_financiero, 0) AS saldo_financiero,
  concepto
FROM kardex_integral
ORDER BY fecha_movimiento DESC, id DESC
LIMIT 20;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
