-- =====================================================
-- KARDEX INTEGRAL - PARA PHPMYADMIN
-- =====================================================
-- Versión: 2.0 - phpMyAdmin Compatible
-- Fecha: 2026-01-20
-- 
-- INSTRUCCIONES PARA EJECUTAR EN PHPMYADMIN:
-- 1. Copia y pega TODO este archivo en la pestaña SQL
-- 2. Asegúrate de seleccionar tu base de datos primero
-- 3. Click en "Continuar" o "Go"
-- =====================================================

-- =====================================================
-- 1. TABLA PRINCIPAL: kardex_integral
-- =====================================================
DROP TABLE IF EXISTS `kardex_integral`;

CREATE TABLE `kardex_integral` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  
  -- IDENTIFICACIÓN DEL MOVIMIENTO
  `fecha_movimiento` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `tipo_kardex` ENUM('fisico', 'financiero') NOT NULL COMMENT 'Tipo de kardex',
  `tipo_movimiento` ENUM('ingreso', 'egreso', 'salida') NOT NULL COMMENT 'Dirección del movimiento',
  `documento_tipo` VARCHAR(50) NOT NULL COMMENT 'liquidacion, venta, adelanto, pesaje, ajuste',
  `documento_id` INT(11) NULL COMMENT 'ID del documento origen',
  `documento_numero` VARCHAR(100) NULL COMMENT 'Número de documento',
  
  -- MOVIMIENTO FÍSICO (productos)
  `lote_id` INT(11) NULL COMMENT 'Lote relacionado',
  `categoria_id` INT(11) NULL COMMENT 'Categoría del producto',
  `categoria_nombre` VARCHAR(100) NULL COMMENT 'Nombre de categoría',
  `peso_kg` DECIMAL(12,3) NULL DEFAULT 0.000 COMMENT 'Peso en kilogramos',
  `saldo_fisico_kg` DECIMAL(12,3) NULL DEFAULT 0.000 COMMENT 'Saldo físico acumulado',
  
  -- MOVIMIENTO FINANCIERO (dinero)
  `cuenta_tipo` ENUM('caja', 'banco', 'adelantos', 'ventas', 'produccion') NULL COMMENT 'Tipo de cuenta',
  `monto` DECIMAL(12,2) NULL DEFAULT 0.00 COMMENT 'Monto en soles',
  `saldo_financiero` DECIMAL(12,2) NULL DEFAULT 0.00 COMMENT 'Saldo financiero acumulado',
  
  -- ENTIDADES RELACIONADAS
  `persona_id` INT(11) NULL COMMENT 'Productor/Cliente/Empleado',
  `persona_nombre` VARCHAR(255) NULL COMMENT 'Nombre de la persona',
  `persona_tipo` ENUM('productor', 'cliente', 'empleado', 'proveedor') NULL,
  
  -- DETALLES DEL MOVIMIENTO
  `concepto` VARCHAR(255) NOT NULL COMMENT 'Descripción del movimiento',
  `observaciones` TEXT NULL,
  `usuario_registro` VARCHAR(100) NULL DEFAULT 'sistema',
  
  -- AUDITORÍA
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  
  -- ÍNDICES PARA OPTIMIZACIÓN
  INDEX `idx_fecha` (`fecha_movimiento`),
  INDEX `idx_tipo_kardex` (`tipo_kardex`),
  INDEX `idx_tipo_mov` (`tipo_movimiento`),
  INDEX `idx_documento` (`documento_tipo`, `documento_id`),
  INDEX `idx_lote` (`lote_id`),
  INDEX `idx_categoria` (`categoria_id`),
  INDEX `idx_persona` (`persona_id`),
  INDEX `idx_fecha_tipo` (`fecha_movimiento`, `tipo_kardex`)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Kardex integral con movimientos físicos y financieros unificados';

-- =====================================================
-- 2. VISTAS PARA CONSULTAS RÁPIDAS
-- =====================================================

-- Vista: Saldo físico por lote y categoría
DROP VIEW IF EXISTS `v_kardex_fisico_saldos`;
CREATE VIEW `v_kardex_fisico_saldos` AS
SELECT 
  k.lote_id,
  l.numero_lote AS lote_codigo,
  l.numero_lote,
  l.producto AS producto_nombre,
  l.producto,
  k.categoria_id,
  k.categoria_nombre,
  SUM(CASE WHEN k.tipo_movimiento = 'ingreso' THEN k.peso_kg ELSE 0 END) AS total_ingresos,
  SUM(CASE WHEN k.tipo_movimiento IN ('salida', 'egreso') THEN k.peso_kg ELSE 0 END) AS total_salidas,
  SUM(CASE WHEN k.tipo_movimiento IN ('salida', 'egreso') THEN k.peso_kg ELSE 0 END) AS total_egresos,
  SUM(CASE WHEN k.tipo_movimiento = 'ingreso' THEN k.peso_kg 
           WHEN k.tipo_movimiento IN ('salida', 'egreso') THEN -k.peso_kg 
           ELSE 0 END) AS saldo_actual
FROM kardex_integral k
LEFT JOIN lotes l ON k.lote_id = l.id
WHERE k.tipo_kardex = 'fisico'
GROUP BY k.lote_id, k.categoria_id, k.categoria_nombre, l.numero_lote, l.producto;

-- Vista: Movimientos financieros por cuenta
DROP VIEW IF EXISTS `v_kardex_financiero_saldos`;
CREATE VIEW `v_kardex_financiero_saldos` AS
SELECT 
  k.cuenta_tipo,
  SUM(CASE WHEN k.tipo_movimiento = 'ingreso' THEN k.monto ELSE 0 END) AS total_ingresos,
  SUM(CASE WHEN k.tipo_movimiento = 'egreso' THEN k.monto ELSE 0 END) AS total_egresos,
  SUM(CASE WHEN k.tipo_movimiento = 'ingreso' THEN k.monto ELSE -k.monto END) AS saldo_actual
FROM kardex_integral k
WHERE k.tipo_kardex = 'financiero'
GROUP BY k.cuenta_tipo;

-- Vista: Movimientos por productor
DROP VIEW IF EXISTS `v_kardex_por_productor`;
CREATE VIEW `v_kardex_por_productor` AS
SELECT 
  k.persona_id,
  k.persona_nombre,
  k.tipo_kardex,
  k.tipo_movimiento,
  k.documento_tipo,
  COUNT(*) AS cantidad_movimientos,
  SUM(IFNULL(k.peso_kg, 0)) AS total_peso_kg,
  SUM(IFNULL(k.monto, 0)) AS total_monto
FROM kardex_integral k
WHERE k.persona_tipo = 'productor'
GROUP BY k.persona_id, k.persona_nombre, k.tipo_kardex, k.tipo_movimiento, k.documento_tipo;

-- Vista: Resumen de documentos
DROP VIEW IF EXISTS `v_kardex_resumen_documentos`;
CREATE VIEW `v_kardex_resumen_documentos` AS
SELECT 
  k.documento_tipo,
  k.documento_numero,
  k.documento_id,
  k.fecha_movimiento,
  k.persona_nombre,
  SUM(IFNULL(k.peso_kg, 0)) AS peso_total,
  SUM(IFNULL(k.monto, 0)) AS monto_total
FROM kardex_integral k
GROUP BY k.documento_tipo, k.documento_numero, k.documento_id, k.fecha_movimiento, k.persona_nombre;

-- =====================================================
-- 3. PROCEDIMIENTOS ALMACENADOS
-- =====================================================

-- Nota: Los procedimientos almacenados pueden no estar disponibles en InfinityFree
-- Se recomienda usar la lógica en el controlador PHP

-- =====================================================
-- 4. FUNCIONES AUXILIARES
-- =====================================================

-- Función: Obtener saldo físico de un lote y categoría
DELIMITER $$
DROP FUNCTION IF EXISTS fn_saldo_fisico$$
CREATE FUNCTION fn_saldo_fisico(p_lote_id INT, p_categoria_id INT) 
RETURNS DECIMAL(12,3)
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_saldo DECIMAL(12,3);
  
  SELECT IFNULL(SUM(
    CASE 
      WHEN tipo_movimiento = 'ingreso' THEN peso_kg
      WHEN tipo_movimiento IN ('salida', 'egreso') THEN -peso_kg
      ELSE 0
    END
  ), 0) INTO v_saldo
  FROM kardex_integral
  WHERE tipo_kardex = 'fisico'
    AND lote_id = p_lote_id
    AND categoria_id = p_categoria_id;
  
  RETURN v_saldo;
END$$
DELIMITER ;

-- Función: Obtener saldo financiero de una cuenta
DELIMITER $$
DROP FUNCTION IF EXISTS fn_saldo_financiero$$
CREATE FUNCTION fn_saldo_financiero(p_cuenta_tipo VARCHAR(50)) 
RETURNS DECIMAL(12,2)
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_saldo DECIMAL(12,2);
  
  SELECT IFNULL(SUM(
    CASE 
      WHEN tipo_movimiento = 'ingreso' THEN monto
      WHEN tipo_movimiento = 'egreso' THEN -monto
      ELSE 0
    END
  ), 0) INTO v_saldo
  FROM kardex_integral
  WHERE tipo_kardex = 'financiero'
    AND cuenta_tipo = p_cuenta_tipo;
  
  RETURN v_saldo;
END$$
DELIMITER ;

-- =====================================================
-- 5. DATOS INICIALES (OPCIONAL)
-- =====================================================

-- Insertar saldos iniciales si existen en el sistema antiguo
-- Este paso es opcional y solo si quieres migrar datos del kardex viejo

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

-- Verificar que todo se creó correctamente:
SELECT 'Tabla kardex_integral creada' AS status;
SHOW TABLES LIKE 'kardex_integral';

SELECT 'Vistas creadas' AS status;
SHOW FULL TABLES WHERE Table_type = 'VIEW';

SELECT 'Funciones creadas' AS status;
SHOW FUNCTION STATUS WHERE Db = DATABASE();

-- Estructura de la tabla
DESCRIBE kardex_integral;
