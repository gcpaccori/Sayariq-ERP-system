-- =====================================================
-- KARDEX INTEGRAL - SISTEMA SAYARIQ
-- =====================================================
-- Versión: 2.0
-- Fecha: 2026-01-20
-- Propósito: Kardex unificado con movimientos físicos y financieros
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
  `cuenta_tipo` ENUM('caja', 'banco', 'adelantos', 'ventas') NULL COMMENT 'Tipo de cuenta',
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
  INDEX `idx_fecha_tipo` (`fecha_movimiento`, `tipo_kardex`),
  
  -- FOREIGN KEYS
  FOREIGN KEY (`lote_id`) REFERENCES `lotes`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`categoria_id`) REFERENCES `categorias_peso`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON DELETE SET NULL
  
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
  l.numero_lote,
  l.producto,
  k.categoria_id,
  k.categoria_nombre,
  SUM(CASE WHEN k.tipo_movimiento = 'ingreso' THEN k.peso_kg ELSE 0 END) AS total_ingresos,
  SUM(CASE WHEN k.tipo_movimiento = 'salida' THEN k.peso_kg ELSE 0 END) AS total_salidas,
  SUM(CASE WHEN k.tipo_movimiento = 'ingreso' THEN k.peso_kg ELSE -k.peso_kg END) AS saldo_actual
FROM kardex_integral k
LEFT JOIN lotes l ON k.lote_id = l.id
WHERE k.tipo_kardex = 'fisico'
GROUP BY k.lote_id, k.categoria_id, k.categoria_nombre, l.numero_lote, l.producto
HAVING saldo_actual > 0;

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
  SUM(CASE WHEN k.tipo_kardex = 'fisico' THEN k.peso_kg ELSE 0 END) AS total_peso_kg,
  SUM(CASE WHEN k.tipo_kardex = 'financiero' THEN k.monto ELSE 0 END) AS total_monto
FROM kardex_integral k
WHERE k.persona_tipo = 'productor'
GROUP BY k.persona_id, k.persona_nombre, k.tipo_kardex, k.tipo_movimiento, k.documento_tipo;

-- Vista: Resumen integral por documento
DROP VIEW IF EXISTS `v_kardex_por_documento`;
CREATE VIEW `v_kardex_por_documento` AS
SELECT 
  k.documento_tipo,
  k.documento_numero,
  k.documento_id,
  k.fecha_movimiento,
  k.persona_nombre,
  SUM(CASE WHEN k.tipo_kardex = 'fisico' THEN k.peso_kg ELSE 0 END) AS peso_total,
  SUM(CASE WHEN k.tipo_kardex = 'financiero' THEN k.monto ELSE 0 END) AS monto_total
FROM kardex_integral k
GROUP BY k.documento_tipo, k.documento_numero, k.documento_id, k.fecha_movimiento, k.persona_nombre
ORDER BY k.fecha_movimiento DESC;

-- =====================================================
-- 3. STORED PROCEDURES
-- =====================================================

-- Procedimiento: Registrar liquidación completa
DROP PROCEDURE IF EXISTS `sp_registrar_liquidacion_kardex`;

DELIMITER $$
CREATE PROCEDURE `sp_registrar_liquidacion_kardex`(
  IN p_liquidacion_id INT,
  IN p_lote_id INT,
  IN p_productor_id INT,
  IN p_numero_liquidacion VARCHAR(100),
  IN p_total_pagar DECIMAL(12,2)
)
BEGIN
  DECLARE v_productor_nombre VARCHAR(255);
  DECLARE v_lote_numero VARCHAR(50);
  DECLARE v_producto VARCHAR(100);
  DECLARE v_categoria_id INT;
  DECLARE v_categoria_nombre VARCHAR(100);
  DECLARE v_peso_ajustado DECIMAL(12,3);
  DECLARE done INT DEFAULT 0;
  
  -- Cursor para recorrer detalle de liquidación
  DECLARE cur_detalle CURSOR FOR 
    SELECT 
      ld.categoria_id,
      cp.nombre AS categoria_nombre,
      ld.peso_ajustado
    FROM liquidaciones_detalle ld
    JOIN categorias_peso cp ON ld.categoria_id = cp.id
    WHERE ld.liquidacion_id = p_liquidacion_id;
  
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
  
  -- Obtener datos del productor y lote
  SELECT nombre_completo INTO v_productor_nombre
  FROM personas WHERE id = p_productor_id;
  
  SELECT numero_lote, producto INTO v_lote_numero, v_producto
  FROM lotes WHERE id = p_lote_id;
  
  -- PARTE 1: MOVIMIENTOS FÍSICOS (producto ENTRA al inventario)
  OPEN cur_detalle;
  read_loop: LOOP
    FETCH cur_detalle INTO v_categoria_id, v_categoria_nombre, v_peso_ajustado;
    IF done THEN
      LEAVE read_loop;
    END IF;
    
    -- Registrar INGRESO físico por cada categoría
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
      persona_id,
      persona_nombre,
      persona_tipo,
      concepto,
      observaciones
    ) VALUES (
      NOW(),
      'fisico',
      'ingreso',  -- INGRESO porque el producto entra a tu inventario
      'liquidacion',
      p_liquidacion_id,
      p_numero_liquidacion,
      p_lote_id,
      v_categoria_id,
      v_categoria_nombre,
      v_peso_ajustado,
      p_productor_id,
      v_productor_nombre,
      'productor',
      CONCAT('Compra de ', v_producto, ' - ', v_categoria_nombre, ' a productor'),
      CONCAT('Liquidación ', p_numero_liquidacion, ' - Lote ', v_lote_numero)
    );
  END LOOP;
  CLOSE cur_detalle;
  
  -- PARTE 2: MOVIMIENTO FINANCIERO (dinero SALE)
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
    observaciones
  ) VALUES (
    NOW(),
    'financiero',
    'egreso',  -- EGRESO porque el dinero sale de tu caja
    'liquidacion',
    p_liquidacion_id,
    p_numero_liquidacion,
    'banco',
    p_total_pagar,
    p_productor_id,
    v_productor_nombre,
    'productor',
    CONCAT('Pago liquidación ', p_numero_liquidacion, ' a productor'),
    CONCAT('Total: S/. ', FORMAT(p_total_pagar, 2))
  );
  
END$$

DELIMITER ;

-- Procedimiento: Registrar venta
DROP PROCEDURE IF EXISTS `sp_registrar_venta_kardex`;

DELIMITER $$
CREATE PROCEDURE `sp_registrar_venta_kardex`(
  IN p_pedido_id INT,
  IN p_lote_id INT,
  IN p_cliente_id INT,
  IN p_categoria_id INT,
  IN p_peso_vendido DECIMAL(12,3),
  IN p_monto_venta DECIMAL(12,2)
)
BEGIN
  DECLARE v_cliente_nombre VARCHAR(255);
  DECLARE v_categoria_nombre VARCHAR(100);
  DECLARE v_numero_pedido VARCHAR(50);
  
  -- Obtener datos
  SELECT nombre_completo INTO v_cliente_nombre
  FROM personas WHERE id = p_cliente_id;
  
  SELECT nombre INTO v_categoria_nombre
  FROM categorias_peso WHERE id = p_categoria_id;
  
  SELECT numero_pedido INTO v_numero_pedido
  FROM pedidos WHERE id = p_pedido_id;
  
  -- MOVIMIENTO FÍSICO: producto SALE del inventario
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
    persona_id,
    persona_nombre,
    persona_tipo,
    concepto
  ) VALUES (
    NOW(),
    'fisico',
    'salida',
    'venta',
    p_pedido_id,
    v_numero_pedido,
    p_lote_id,
    p_categoria_id,
    v_categoria_nombre,
    p_peso_vendido,
    p_cliente_id,
    v_cliente_nombre,
    'cliente',
    CONCAT('Venta pedido ', v_numero_pedido, ' - ', v_categoria_nombre)
  );
  
  -- MOVIMIENTO FINANCIERO: dinero ENTRA
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
    concepto
  ) VALUES (
    NOW(),
    'financiero',
    'ingreso',
    'venta',
    p_pedido_id,
    v_numero_pedido,
    'ventas',
    p_monto_venta,
    p_cliente_id,
    v_cliente_nombre,
    'cliente',
    CONCAT('Cobro venta pedido ', v_numero_pedido)
  );
  
END$$

DELIMITER ;

-- Procedimiento: Registrar adelanto
DROP PROCEDURE IF EXISTS `sp_registrar_adelanto_kardex`;

DELIMITER $$
CREATE PROCEDURE `sp_registrar_adelanto_kardex`(
  IN p_adelanto_id INT,
  IN p_productor_id INT,
  IN p_monto DECIMAL(12,2)
)
BEGIN
  DECLARE v_productor_nombre VARCHAR(255);
  
  SELECT nombre_completo INTO v_productor_nombre
  FROM personas WHERE id = p_productor_id;
  
  -- Solo movimiento financiero: dinero SALE (adelanto)
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
    concepto
  ) VALUES (
    NOW(),
    'financiero',
    'egreso',
    'adelanto',
    p_adelanto_id,
    'adelantos',
    p_monto,
    p_productor_id,
    v_productor_nombre,
    'productor',
    CONCAT('Adelanto a productor - ID: ', p_adelanto_id)
  );
  
END$$

DELIMITER ;

-- =====================================================
-- 4. FUNCIONES DE CONSULTA
-- =====================================================

-- Función: Obtener saldo físico de una categoría en un lote
DROP FUNCTION IF EXISTS `fn_saldo_fisico`;

DELIMITER $$
CREATE FUNCTION `fn_saldo_fisico`(
  p_lote_id INT,
  p_categoria_id INT
) RETURNS DECIMAL(12,3)
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_saldo DECIMAL(12,3);
  
  SELECT 
    SUM(CASE WHEN tipo_movimiento = 'ingreso' THEN peso_kg ELSE -peso_kg END)
  INTO v_saldo
  FROM kardex_integral
  WHERE tipo_kardex = 'fisico'
    AND lote_id = p_lote_id
    AND categoria_id = p_categoria_id;
  
  RETURN IFNULL(v_saldo, 0);
END$$

DELIMITER ;

-- Función: Obtener saldo financiero de una cuenta
DROP FUNCTION IF EXISTS `fn_saldo_financiero`;

DELIMITER $$
CREATE FUNCTION `fn_saldo_financiero`(
  p_cuenta_tipo VARCHAR(50)
) RETURNS DECIMAL(12,2)
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_saldo DECIMAL(12,2);
  
  SELECT 
    SUM(CASE WHEN tipo_movimiento = 'ingreso' THEN monto ELSE -monto END)
  INTO v_saldo
  FROM kardex_integral
  WHERE tipo_kardex = 'financiero'
    AND cuenta_tipo = p_cuenta_tipo;
  
  RETURN IFNULL(v_saldo, 0);
END$$

DELIMITER ;

-- =====================================================
-- 5. TRIGGERS PARA AUTOMATIZACIÓN
-- =====================================================

-- Trigger: Calcular saldo físico automáticamente
DROP TRIGGER IF EXISTS `trg_kardex_saldo_fisico`;

DELIMITER $$
CREATE TRIGGER `trg_kardex_saldo_fisico`
BEFORE INSERT ON kardex_integral
FOR EACH ROW
BEGIN
  IF NEW.tipo_kardex = 'fisico' AND NEW.lote_id IS NOT NULL AND NEW.categoria_id IS NOT NULL THEN
    -- Calcular saldo acumulado
    SELECT 
      IFNULL(SUM(CASE WHEN tipo_movimiento = 'ingreso' THEN peso_kg ELSE -peso_kg END), 0)
    INTO NEW.saldo_fisico_kg
    FROM kardex_integral
    WHERE tipo_kardex = 'fisico'
      AND lote_id = NEW.lote_id
      AND categoria_id = NEW.categoria_id;
    
    -- Sumar el movimiento actual
    IF NEW.tipo_movimiento = 'ingreso' THEN
      SET NEW.saldo_fisico_kg = NEW.saldo_fisico_kg + NEW.peso_kg;
    ELSE
      SET NEW.saldo_fisico_kg = NEW.saldo_fisico_kg - NEW.peso_kg;
    END IF;
  END IF;
END$$

DELIMITER ;

-- Trigger: Calcular saldo financiero automáticamente
DROP TRIGGER IF EXISTS `trg_kardex_saldo_financiero`;

DELIMITER $$
CREATE TRIGGER `trg_kardex_saldo_financiero`
BEFORE INSERT ON kardex_integral
FOR EACH ROW
BEGIN
  IF NEW.tipo_kardex = 'financiero' AND NEW.cuenta_tipo IS NOT NULL THEN
    -- Calcular saldo acumulado
    SELECT 
      IFNULL(SUM(CASE WHEN tipo_movimiento = 'ingreso' THEN monto ELSE -monto END), 0)
    INTO NEW.saldo_financiero
    FROM kardex_integral
    WHERE tipo_kardex = 'financiero'
      AND cuenta_tipo = NEW.cuenta_tipo;
    
    -- Sumar el movimiento actual
    IF NEW.tipo_movimiento = 'ingreso' THEN
      SET NEW.saldo_financiero = NEW.saldo_financiero + NEW.monto;
    ELSE
      SET NEW.saldo_financiero = NEW.saldo_financiero - NEW.monto;
    END IF;
  END IF;
END$$

DELIMITER ;

-- =====================================================
-- 6. DATOS DE EJEMPLO (OPCIONAL - COMENTADO)
-- =====================================================
/*
-- Ejemplo 1: Liquidación
CALL sp_registrar_liquidacion_kardex(1, 1, 3, 'LIQ-001-2026', 10500.00);

-- Ejemplo 2: Venta
CALL sp_registrar_venta_kardex(1, 1, 2, 1, 500.50, 6250.00);

-- Ejemplo 3: Adelanto
CALL sp_registrar_adelanto_kardex(1, 3, 2000.00);

-- Consultar saldos
SELECT * FROM v_kardex_fisico_saldos;
SELECT * FROM v_kardex_financiero_saldos;
SELECT * FROM v_kardex_por_productor WHERE persona_id = 3;
*/

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
