-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Servidor: localhost:3306
-- Tiempo de generación: 20-01-2026 a las 22:57:03
-- Versión del servidor: 10.11.14-MariaDB-cll-lve
-- Versión de PHP: 8.4.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `fran2869_sayariq`
--

DELIMITER $$
--
-- Procedimientos
--
DROP PROCEDURE IF EXISTS `sp_liquidar_lote`$$
CREATE DEFINER=`fran2869`@`localhost` PROCEDURE `sp_liquidar_lote` (IN `p_lote_id` INT)   BEGIN
  DECLARE v_total DECIMAL(12,2) DEFAULT 0;

  -- Inserta cabecera vacía
  INSERT INTO liquidaciones (lote_id, fecha_liquidacion, total_bruto_fruta, total_a_pagar, estado_pago)
  VALUES (p_lote_id, NOW(), 0, 0, 'PENDIENTE');

  SET @liq = LAST_INSERT_ID();

  -- Inserta detalle directo desde kardex
  INSERT INTO liquidaciones_detalle (
    liquidacion_id,
    categoria_id,
    peso_categoria_original,
    peso_ajustado,
    precio_unitario,
    subtotal
  )
  SELECT 
    @liq,
    c.id,
    v.saldo,
    v.saldo,
    c.precio_unitario_kg,
    v.saldo * c.precio_unitario_kg
  FROM vw_saldos_kardex v
  JOIN categorias c 
    ON LOWER(c.nombre_categoria) LIKE CONCAT('%', LOWER(v.categoria), '%')
  WHERE v.lote_id = p_lote_id
    AND v.saldo > 0;

  -- Calcula totales reales
  SELECT SUM(subtotal) INTO v_total
  FROM liquidaciones_detalle
  WHERE liquidacion_id = @liq;

  -- Actualiza cabecera
  UPDATE liquidaciones
  SET total_bruto_fruta = v_total,
      total_a_pagar = v_total
  WHERE id = @liq;

  -- Cambia estado de lote
  UPDATE lotes 
  SET estado = 'liquidado',
      estado_proceso = 'LIQUIDADO'
  WHERE id = p_lote_id;

END$$

DROP PROCEDURE IF EXISTS `sp_registrar_adelanto_kardex`$$
CREATE DEFINER=`fran2869`@`localhost` PROCEDURE `sp_registrar_adelanto_kardex` (IN `p_adelanto_id` INT, IN `p_productor_id` INT, IN `p_monto` DECIMAL(12,2))   BEGIN
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

DROP PROCEDURE IF EXISTS `sp_registrar_liquidacion_kardex`$$
CREATE DEFINER=`fran2869`@`localhost` PROCEDURE `sp_registrar_liquidacion_kardex` (IN `p_liquidacion_id` INT, IN `p_lote_id` INT, IN `p_productor_id` INT, IN `p_numero_liquidacion` VARCHAR(100), IN `p_total_pagar` DECIMAL(12,2))   BEGIN
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

DROP PROCEDURE IF EXISTS `sp_registrar_venta_kardex`$$
CREATE DEFINER=`fran2869`@`localhost` PROCEDURE `sp_registrar_venta_kardex` (IN `p_pedido_id` INT, IN `p_lote_id` INT, IN `p_cliente_id` INT, IN `p_categoria_id` INT, IN `p_peso_vendido` DECIMAL(12,3), IN `p_monto_venta` DECIMAL(12,2))   BEGIN
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

--
-- Funciones
--
DROP FUNCTION IF EXISTS `fn_saldo_financiero`$$
CREATE DEFINER=`fran2869`@`localhost` FUNCTION `fn_saldo_financiero` (`p_cuenta_tipo` VARCHAR(50)) RETURNS DECIMAL(12,2) DETERMINISTIC READS SQL DATA BEGIN
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

DROP FUNCTION IF EXISTS `fn_saldo_fisico`$$
CREATE DEFINER=`fran2869`@`localhost` FUNCTION `fn_saldo_fisico` (`p_lote_id` INT, `p_categoria_id` INT) RETURNS DECIMAL(12,3) DETERMINISTIC READS SQL DATA BEGIN
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

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `adelantos`
--

DROP TABLE IF EXISTS `adelantos`;
CREATE TABLE `adelantos` (
  `id` int(11) NOT NULL,
  `productor_id` int(11) NOT NULL,
  `lote_id` int(11) DEFAULT NULL,
  `monto` decimal(10,2) NOT NULL,
  `fecha_adelanto` date NOT NULL,
  `motivo` text DEFAULT NULL,
  `estado` enum('pendiente','aplicado','cancelado') DEFAULT 'pendiente',
  `liquidacion_id` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `adelantos`
--

INSERT INTO `adelantos` (`id`, `productor_id`, `lote_id`, `monto`, `fecha_adelanto`, `motivo`, `estado`, `liquidacion_id`, `created_at`) VALUES
(1, 1, 1, 3000.00, '2024-01-10', 'Adelanto para gastos de cosecha', 'aplicado', NULL, '2025-11-13 15:19:28'),
(2, 3, 2, 4000.00, '2024-01-12', 'Adelanto programado', 'aplicado', NULL, '2025-11-13 15:19:28'),
(3, 6, NULL, 2000.00, '2024-01-14', 'Adelanto por futura cosecha', 'aplicado', 13, '2025-11-13 15:19:28'),
(4, 1, 4, 3500.00, '2024-01-20', 'Adelanto para insumos', 'aplicado', NULL, '2025-11-13 15:19:28'),
(5, 3, NULL, 2500.00, '2024-01-22', 'Adelanto personal', 'aplicado', 9, '2025-11-13 15:19:28');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ajustes_contables`
--

DROP TABLE IF EXISTS `ajustes_contables`;
CREATE TABLE `ajustes_contables` (
  `id` int(11) NOT NULL,
  `lote_id` int(11) NOT NULL,
  `tipo_ajuste` enum('por_proceso','carga_cerrada') NOT NULL,
  `peso_exportable` decimal(10,2) DEFAULT 0.00,
  `precio_exportable` decimal(10,2) DEFAULT 0.00,
  `monto_exportable` decimal(10,2) DEFAULT 0.00,
  `peso_industrial` decimal(10,2) DEFAULT 0.00,
  `precio_industrial` decimal(10,2) DEFAULT 0.00,
  `monto_industrial` decimal(10,2) DEFAULT 0.00,
  `peso_descarte` decimal(10,2) DEFAULT 0.00,
  `precio_descarte` decimal(10,2) DEFAULT 0.00,
  `monto_descarte` decimal(10,2) DEFAULT 0.00,
  `total_proceso` decimal(10,2) NOT NULL,
  `peso_ingreso` decimal(10,2) DEFAULT NULL,
  `precio_kg` decimal(10,2) DEFAULT NULL,
  `total_carga` decimal(10,2) DEFAULT NULL,
  `fecha_liquidacion` date DEFAULT NULL,
  `serie` varchar(50) DEFAULT NULL,
  `numero_liquidacion` varchar(50) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `estado` enum('pendiente','aprobado') DEFAULT 'pendiente',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `ajustes_contables`
--

INSERT INTO `ajustes_contables` (`id`, `lote_id`, `tipo_ajuste`, `peso_exportable`, `precio_exportable`, `monto_exportable`, `peso_industrial`, `precio_industrial`, `monto_industrial`, `peso_descarte`, `precio_descarte`, `monto_descarte`, `total_proceso`, `peso_ingreso`, `precio_kg`, `total_carga`, `fecha_liquidacion`, `serie`, `numero_liquidacion`, `observaciones`, `estado`, `created_at`, `updated_at`) VALUES
(1, 1, 'carga_cerrada', 1050.50, 8.50, 8929.25, 280.15, 4.20, 1176.63, 60.10, 1.50, 90.15, 10195.03, 1420.75, 7.18, 10195.03, '2024-01-25', 'B001', 'LIQ-001-2024', 'Liquidación completa del lote', 'aprobado', '2025-11-13 15:19:28', '2025-11-13 15:19:28'),
(2, 4, 'por_proceso', 1550.80, 8.80, 13647.04, 280.70, 4.50, 1263.15, 59.00, 1.80, 106.20, 15016.39, 1890.50, 7.94, 15016.39, '2024-01-28', 'B001', 'LIQ-002-2024', 'Liquidación con precios premium', 'aprobado', '2025-11-13 15:19:28', '2025-11-13 15:19:28'),
(3, 2, 'por_proceso', 1280.25, 8.20, 10498.05, 300.15, 4.00, 1200.60, 95.40, 1.20, 114.48, 11813.13, 1705.80, 6.93, 11813.13, NULL, NULL, NULL, 'Liquidación pendiente de aprobación', 'pendiente', '2025-11-13 15:19:28', '2025-11-13 15:19:28');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias_peso`
--

DROP TABLE IF EXISTS `categorias_peso`;
CREATE TABLE `categorias_peso` (
  `id` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `precio_kg` decimal(10,2) DEFAULT 0.00,
  `es_liquidable` tinyint(1) DEFAULT 1,
  `orden` int(11) DEFAULT 0,
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Volcado de datos para la tabla `categorias_peso`
--

INSERT INTO `categorias_peso` (`id`, `codigo`, `nombre`, `descripcion`, `precio_kg`, `es_liquidable`, `orden`, `estado`, `created_at`) VALUES
(1, 'exportable', 'Exportable', 'Cúrcuma / jengibre apto para exportación', 8.50, 1, 1, 'activo', '2025-11-27 14:43:05'),
(2, 'industrial', 'Industrial', 'Producto para procesamiento industrial', 3.50, 1, 2, 'activo', '2025-11-27 14:43:05'),
(3, 'nacional', 'Nacional', 'Producto para mercado nacional', 5.00, 1, 3, 'activo', '2025-11-27 14:43:05'),
(4, 'jugo', 'Jugo', 'Producto molido o destinado a extracción', 2.50, 1, 4, 'activo', '2025-11-27 14:43:05'),
(5, 'descarte', 'Descarte', 'Producto no apto para comercialización', 1.00, 1, 5, 'activo', '2025-11-27 14:43:05'),
(6, 'primera', 'Primera', 'Producto de primera calidad', 7.00, 1, 6, 'activo', '2025-11-27 14:43:05'),
(7, 'segunda', 'Segunda', 'Producto de segunda calidad', 5.50, 1, 7, 'activo', '2025-11-27 14:43:05'),
(8, 'tercera', 'Tercera', 'Producto de tercera calidad', 4.00, 1, 8, 'activo', '2025-11-27 14:43:05'),
(9, 'cuarta', 'Cuarta', 'Producto de cuarta calidad', 3.00, 1, 9, 'activo', '2025-11-27 14:43:05'),
(10, 'quinta', 'Quinta', 'Producto de quinta calidad', 2.00, 1, 10, 'activo', '2025-11-27 14:43:05'),
(11, 'dedos', 'Dedos', 'Raíces pequeñas o fragmentadas', 1.50, 1, 11, 'activo', '2025-11-27 14:43:05');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `costos_fijos`
--

DROP TABLE IF EXISTS `costos_fijos`;
CREATE TABLE `costos_fijos` (
  `id` int(11) NOT NULL,
  `concepto` varchar(255) NOT NULL,
  `categoria` enum('administrativo','alquiler','servicios','planilla','impuestos','otros') NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `periodicidad` enum('mensual','anual') DEFAULT 'mensual',
  `descripcion` text DEFAULT NULL,
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `costos_fijos`
--

INSERT INTO `costos_fijos` (`id`, `concepto`, `categoria`, `monto`, `periodicidad`, `descripcion`, `estado`, `created_at`, `updated_at`) VALUES
(1, 'Alquiler planta procesadora', 'alquiler', 5000.00, 'mensual', 'Alquiler mensual de instalaciones', 'activo', '2025-11-13 15:19:28', '2025-11-13 15:19:28'),
(2, 'Sueldo administrativo', 'planilla', 8500.00, 'mensual', 'Sueldo de personal administrativo', 'activo', '2025-11-13 15:19:28', '2025-11-13 15:19:28'),
(3, 'Servicios de agua y luz', 'servicios', 1200.00, 'mensual', 'Agua, luz, teléfono, internet', 'activo', '2025-11-13 15:19:28', '2025-11-13 15:19:28'),
(4, 'Impuesto a la renta', 'impuestos', 2500.00, 'mensual', 'Pago mensual de impuestos', 'activo', '2025-11-13 15:19:28', '2025-11-13 15:19:28'),
(5, 'Mantenimiento de equipos', 'otros', 1500.00, 'mensual', 'Mantenimiento preventivo', 'activo', '2025-11-13 15:19:28', '2025-11-13 15:19:28'),
(6, 'Seguros', 'otros', 800.00, 'mensual', 'Seguro de planta y equipos', 'activo', '2025-11-13 15:19:28', '2025-11-13 15:19:28');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `empleados`
--

DROP TABLE IF EXISTS `empleados`;
CREATE TABLE `empleados` (
  `id` int(11) NOT NULL,
  `persona_id` int(11) NOT NULL,
  `cargo` varchar(100) NOT NULL,
  `area` enum('administrativo','campo','planta','ventas') NOT NULL,
  `sueldo` decimal(10,2) DEFAULT NULL,
  `fecha_ingreso` date DEFAULT NULL,
  `fecha_salida` date DEFAULT NULL,
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `empleados`
--

INSERT INTO `empleados` (`id`, `persona_id`, `cargo`, `area`, `sueldo`, `fecha_ingreso`, `fecha_salida`, `estado`, `created_at`, `updated_at`) VALUES
(1, 4, 'Supervisora de Calidad', 'planta', 2800.00, '2023-03-15', NULL, 'activo', '2025-11-13 15:19:28', '2025-11-13 15:19:28'),
(2, 7, 'Asistente Administrativo', 'administrativo', 1800.00, '2023-05-20', NULL, 'activo', '2025-11-13 15:19:28', '2025-11-13 15:19:28'),
(3, 4, 'Jefa de Producción', 'planta', 3200.00, '2023-03-15', NULL, 'activo', '2025-11-13 15:19:28', '2025-11-13 15:19:28');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `kardex_integral`
--

DROP TABLE IF EXISTS `kardex_integral`;
CREATE TABLE `kardex_integral` (
  `id` int(11) NOT NULL,
  `fecha_movimiento` datetime NOT NULL DEFAULT current_timestamp(),
  `tipo_kardex` enum('fisico','financiero') NOT NULL COMMENT 'Tipo de kardex',
  `tipo_movimiento` enum('ingreso','egreso','salida') NOT NULL COMMENT 'Dirección del movimiento',
  `documento_tipo` varchar(50) NOT NULL COMMENT 'liquidacion, venta, adelanto, pesaje, ajuste',
  `documento_id` int(11) DEFAULT NULL COMMENT 'ID del documento origen',
  `documento_numero` varchar(100) DEFAULT NULL COMMENT 'Número de documento',
  `lote_id` int(11) DEFAULT NULL COMMENT 'Lote relacionado',
  `categoria_id` int(11) DEFAULT NULL COMMENT 'Categoría del producto',
  `categoria_nombre` varchar(100) DEFAULT NULL COMMENT 'Nombre de categoría',
  `peso_kg` decimal(12,3) DEFAULT 0.000 COMMENT 'Peso en kilogramos',
  `saldo_fisico_kg` decimal(12,3) DEFAULT 0.000 COMMENT 'Saldo físico acumulado',
  `cuenta_tipo` enum('caja','banco','adelantos','ventas','produccion') DEFAULT NULL COMMENT 'Tipo de cuenta',
  `monto` decimal(12,2) DEFAULT 0.00 COMMENT 'Monto en soles',
  `saldo_financiero` decimal(12,2) DEFAULT 0.00 COMMENT 'Saldo financiero acumulado',
  `persona_id` int(11) DEFAULT NULL COMMENT 'Productor/Cliente/Empleado',
  `persona_nombre` varchar(255) DEFAULT NULL COMMENT 'Nombre de la persona',
  `persona_tipo` enum('productor','cliente','empleado','proveedor') DEFAULT NULL,
  `concepto` varchar(255) NOT NULL COMMENT 'Descripción del movimiento',
  `observaciones` text DEFAULT NULL,
  `usuario_registro` varchar(100) DEFAULT 'sistema',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Kardex integral con movimientos físicos y financieros unificados';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `kardex_lotes`
--

DROP TABLE IF EXISTS `kardex_lotes`;
CREATE TABLE `kardex_lotes` (
  `id` int(11) NOT NULL,
  `lote_id` int(11) NOT NULL,
  `tipo_movimiento` enum('ingreso','salida') NOT NULL,
  `categoria` enum('exportable','industrial','descarte','nacional','jugo','primera','segunda','tercera','cuarta','quinta','dedos') NOT NULL,
  `peso` decimal(10,2) NOT NULL,
  `fecha_movimiento` date NOT NULL,
  `referencia` varchar(255) DEFAULT NULL,
  `saldo_categoria` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `kardex_lotes`
--

INSERT INTO `kardex_lotes` (`id`, `lote_id`, `tipo_movimiento`, `categoria`, `peso`, `fecha_movimiento`, `referencia`, `saldo_categoria`, `created_at`) VALUES
(1, 1, 'ingreso', 'exportable', 1100.25, '2024-01-16', 'Proceso inicial', 1100.25, '2025-11-13 15:19:28'),
(2, 1, 'ingreso', 'industrial', 250.30, '2024-01-16', 'Proceso inicial', 250.30, '2025-11-13 15:19:28'),
(3, 1, 'ingreso', 'descarte', 70.20, '2024-01-16', 'Proceso inicial', 70.20, '2025-11-13 15:19:28'),
(4, 1, 'salida', 'exportable', 500.00, '2024-01-21', 'PED-2024-001', 600.25, '2025-11-13 15:19:28'),
(5, 2, 'ingreso', 'exportable', 1350.75, '2024-01-19', 'Proceso inicial', 1350.75, '2025-11-13 15:19:28'),
(6, 2, 'ingreso', 'industrial', 320.40, '2024-01-19', 'Proceso inicial', 320.40, '2025-11-13 15:19:28'),
(7, 2, 'ingreso', 'descarte', 98.65, '2024-01-19', 'Proceso inicial', 98.65, '2025-11-13 15:19:28'),
(8, 1, 'salida', 'exportable', 570.24, '2025-11-27', 'Liquidación #6', 0.00, '2025-11-27 15:20:43'),
(9, 1, 'salida', 'industrial', 237.79, '2025-11-27', 'Liquidación #6', 0.00, '2025-11-27 15:20:43'),
(10, 1, 'salida', 'descarte', 66.69, '2025-11-27', 'Liquidación #6', 0.00, '2025-11-27 15:20:43'),
(11, 9, 'ingreso', 'exportable', 12.00, '2025-11-27', 'Registro peso #7', 12.00, '2025-11-27 15:56:19'),
(12, 9, 'salida', 'exportable', 12.00, '2025-11-27', 'Liquidación #7', 0.00, '2025-11-27 16:10:49'),
(13, 8, 'ingreso', 'exportable', 12.00, '2025-11-27', 'Registro de peso', 0.00, '2025-11-27 23:47:44'),
(14, 3, 'ingreso', 'exportable', 1200.75, '2025-11-27', 'Registro de peso', 0.00, '2025-11-27 23:47:44'),
(15, 5, 'ingreso', 'exportable', 100.00, '2025-11-27', 'Registro de peso', 0.00, '2025-11-27 23:47:44'),
(16, 5, 'ingreso', 'industrial', 100.00, '2025-11-27', 'Registro de peso', 0.00, '2025-11-27 23:47:44'),
(17, 5, 'ingreso', 'nacional', 100.00, '2025-11-27', 'Registro de peso', 0.00, '2025-11-27 23:47:44'),
(18, 5, 'ingreso', 'jugo', 100.00, '2025-11-27', 'Registro de peso', 0.00, '2025-11-27 23:47:44'),
(19, 5, 'ingreso', 'descarte', 100.00, '2025-11-27', 'Registro de peso', 0.00, '2025-11-27 23:47:44'),
(20, 5, 'ingreso', 'primera', 100.00, '2025-11-27', 'Registro de peso', 0.00, '2025-11-27 23:47:44'),
(21, 5, 'ingreso', 'segunda', 100.00, '2025-11-27', 'Registro de peso', 0.00, '2025-11-27 23:47:44'),
(22, 5, 'ingreso', 'tercera', 100.00, '2025-11-27', 'Registro de peso', 0.00, '2025-11-27 23:47:44'),
(23, 5, 'ingreso', 'cuarta', 100.00, '2025-11-27', 'Registro de peso', 0.00, '2025-11-27 23:47:44'),
(24, 5, 'ingreso', 'quinta', 100.00, '2025-11-27', 'Registro de peso', 0.00, '2025-11-27 23:47:44'),
(25, 5, 'ingreso', 'dedos', 100.00, '2025-11-27', 'Registro de peso', 0.00, '2025-11-27 23:47:44'),
(26, 4, 'ingreso', 'exportable', 99.99, '2025-11-27', 'Registro de peso', 0.00, '2025-11-27 23:47:44'),
(28, 11, 'ingreso', '', 10000.00, '2025-11-28', 'Registro peso #13', 10000.00, '2025-11-28 00:14:32'),
(29, 11, 'ingreso', '', 10000.00, '2025-11-28', 'Registro peso #13', 10000.00, '2025-11-28 00:14:32'),
(30, 11, 'ingreso', '', 10000.00, '2025-11-28', 'Registro peso #13', 10000.00, '2025-11-28 00:14:32'),
(31, 11, 'ingreso', '', 10000.00, '2025-11-28', 'Registro peso #13', 10000.00, '2025-11-28 00:14:32'),
(32, 11, 'salida', 'nacional', 10000.00, '2025-11-28', 'Ajuste pesaje #13 (reverso)', -10000.00, '2025-11-28 00:28:49'),
(33, 11, 'salida', 'primera', 10000.00, '2025-11-28', 'Ajuste pesaje #13 (reverso)', -10000.00, '2025-11-28 00:28:49'),
(34, 11, 'salida', 'tercera', 10000.00, '2025-11-28', 'Ajuste pesaje #13 (reverso)', -10000.00, '2025-11-28 00:28:49'),
(35, 11, 'salida', 'cuarta', 10000.00, '2025-11-28', 'Ajuste pesaje #13 (reverso)', -10000.00, '2025-11-28 00:28:49'),
(36, 11, 'ingreso', '', 1000.00, '2025-11-28', 'Ajuste pesaje #13 (nuevo)', 1000.00, '2025-11-28 00:28:49'),
(37, 11, 'ingreso', '', 9000.00, '2025-11-28', 'Ajuste pesaje #13 (nuevo)', 9000.00, '2025-11-28 00:28:49'),
(38, 11, 'ingreso', '', 10000.00, '2025-11-28', 'Ajuste pesaje #13 (nuevo)', 10000.00, '2025-11-28 00:28:49'),
(39, 11, 'ingreso', '', 10000.00, '2025-11-28', 'Ajuste pesaje #13 (nuevo)', 10000.00, '2025-11-28 00:28:49'),
(40, 11, 'ingreso', '', 10000.00, '2025-11-28', 'Ajuste pesaje #13 (nuevo)', 10000.00, '2025-11-28 00:28:49'),
(41, 11, 'salida', 'nacional', 1000.00, '2025-11-28', 'Ajuste pesaje #13 (reverso)', -11000.00, '2025-11-28 00:34:26'),
(42, 11, 'salida', 'jugo', 9000.00, '2025-11-28', 'Ajuste pesaje #13 (reverso)', -9000.00, '2025-11-28 00:34:26'),
(43, 11, 'salida', 'primera', 10000.00, '2025-11-28', 'Ajuste pesaje #13 (reverso)', -20000.00, '2025-11-28 00:34:26'),
(44, 11, 'salida', 'tercera', 10000.00, '2025-11-28', 'Ajuste pesaje #13 (reverso)', -20000.00, '2025-11-28 00:34:26'),
(45, 11, 'salida', 'cuarta', 10000.00, '2025-11-28', 'Ajuste pesaje #13 (reverso)', -20000.00, '2025-11-28 00:34:26'),
(46, 11, 'ingreso', 'industrial', 8100.00, '2025-11-28', 'Ajuste pesaje #13 (nuevo)', 8100.00, '2025-11-28 00:34:26'),
(47, 11, 'ingreso', 'nacional', 1000.00, '2025-11-28', 'Ajuste pesaje #13 (nuevo)', -10000.00, '2025-11-28 00:34:26'),
(48, 11, 'ingreso', 'jugo', 900.00, '2025-11-28', 'Ajuste pesaje #13 (nuevo)', -8100.00, '2025-11-28 00:34:26'),
(49, 11, 'ingreso', 'primera', 10000.00, '2025-11-28', 'Ajuste pesaje #13 (nuevo)', -10000.00, '2025-11-28 00:34:26'),
(50, 11, 'ingreso', 'tercera', 10000.00, '2025-11-28', 'Ajuste pesaje #13 (nuevo)', -10000.00, '2025-11-28 00:34:26'),
(51, 11, 'ingreso', 'cuarta', 10000.00, '2025-11-28', 'Ajuste pesaje #13 (nuevo)', -10000.00, '2025-11-28 00:34:26'),
(53, 11, 'salida', 'industrial', 7695.00, '2025-11-28', 'Liquidación #9', 405.00, '2025-11-28 21:09:03'),
(54, 8, 'salida', 'exportable', 11.40, '2025-11-28', 'Liquidación #10', -11.40, '2025-11-28 21:48:57'),
(55, 5, 'salida', 'exportable', 95.00, '2025-11-28', 'Liquidación #11', -95.00, '2025-11-28 21:50:35'),
(56, 5, 'salida', 'industrial', 95.00, '2025-11-28', 'Liquidación #11', -95.00, '2025-11-28 21:50:35'),
(57, 5, 'salida', 'nacional', 95.00, '2025-11-28', 'Liquidación #11', -95.00, '2025-11-28 21:50:35'),
(58, 5, 'salida', 'jugo', 95.00, '2025-11-28', 'Liquidación #11', -95.00, '2025-11-28 21:50:35'),
(59, 5, 'salida', 'descarte', 95.00, '2025-11-28', 'Liquidación #11', -95.00, '2025-11-28 21:50:35'),
(60, 5, 'salida', 'primera', 95.00, '2025-11-28', 'Liquidación #11', -95.00, '2025-11-28 21:50:35'),
(61, 5, 'salida', 'segunda', 95.00, '2025-11-28', 'Liquidación #11', -95.00, '2025-11-28 21:50:35'),
(62, 5, 'salida', 'tercera', 95.00, '2025-11-28', 'Liquidación #11', -95.00, '2025-11-28 21:50:35'),
(63, 5, 'salida', 'cuarta', 95.00, '2025-11-28', 'Liquidación #11', -95.00, '2025-11-28 21:50:35'),
(64, 5, 'salida', 'quinta', 95.00, '2025-11-28', 'Liquidación #11', -95.00, '2025-11-28 21:50:35'),
(65, 5, 'salida', 'dedos', 95.00, '2025-11-28', 'Liquidación #11', -95.00, '2025-11-28 21:50:35'),
(66, 2, 'salida', 'exportable', 1283.21, '2025-11-28', 'Liquidación #12', 67.54, '2025-11-28 21:50:52'),
(67, 2, 'salida', 'industrial', 304.38, '2025-11-28', 'Liquidación #12', 16.02, '2025-11-28 21:50:52'),
(68, 2, 'salida', 'descarte', 93.72, '2025-11-28', 'Liquidación #12', 4.93, '2025-11-28 21:50:52'),
(69, 3, 'salida', 'exportable', 1140.71, '2025-11-28', 'Liquidación #13', -1140.71, '2025-11-28 21:51:01'),
(70, 4, 'salida', 'exportable', 94.99, '2025-11-28', 'Liquidación #14', -94.99, '2025-11-28 21:54:01'),
(71, 10, 'salida', 'exportable', 10000.00, '2025-11-27', 'Ajuste pesaje #12 (reverso)', -10000.00, '2025-11-28 21:54:59'),
(72, 10, 'salida', 'segunda', 10000.00, '2025-11-27', 'Ajuste pesaje #12 (reverso)', -10000.00, '2025-11-28 21:54:59'),
(73, 10, 'ingreso', 'exportable', 10000.00, '2025-11-27', 'Ajuste pesaje #12 (nuevo)', 0.00, '2025-11-28 21:54:59'),
(74, 10, 'ingreso', 'segunda', 10000.00, '2025-11-27', 'Ajuste pesaje #12 (nuevo)', 0.00, '2025-11-28 21:54:59'),
(75, 10, 'salida', 'exportable', 10000.00, '2025-11-27', 'Ajuste pesaje #12 (reverso)', -10000.00, '2025-11-28 21:55:39'),
(76, 10, 'salida', 'segunda', 10000.00, '2025-11-27', 'Ajuste pesaje #12 (reverso)', -10000.00, '2025-11-28 21:55:39'),
(77, 10, 'ingreso', 'industrial', 10000.00, '2025-11-27', 'Ajuste pesaje #12 (nuevo)', 10000.00, '2025-11-28 21:55:39'),
(78, 10, 'ingreso', 'nacional', 10000.00, '2025-11-27', 'Ajuste pesaje #12 (nuevo)', 10000.00, '2025-11-28 21:55:39'),
(79, 10, 'salida', 'industrial', 9500.00, '2025-11-28', 'Liquidación #15', 500.00, '2025-11-28 21:55:52'),
(80, 10, 'salida', 'nacional', 9500.00, '2025-11-28', 'Liquidación #15', 500.00, '2025-11-28 21:55:52'),
(81, 6, 'ingreso', 'exportable', 1.00, '2025-11-27', 'Ajuste pesaje #6 (nuevo)', 1.00, '2025-11-28 22:36:56'),
(82, 12, 'ingreso', 'exportable', 1650.00, '2025-11-30', 'Registro peso #14', 1650.00, '2025-11-30 04:00:17'),
(83, 12, 'salida', 'exportable', 1650.00, '2025-11-30', 'Ajuste pesaje #14 (reverso)', 0.00, '2025-11-30 04:06:36'),
(84, 12, 'ingreso', 'exportable', 400.00, '2025-11-30', 'Ajuste pesaje #14 (nuevo)', 400.00, '2025-11-30 04:06:36'),
(85, 12, 'ingreso', 'industrial', 400.00, '2025-11-30', 'Ajuste pesaje #14 (nuevo)', 400.00, '2025-11-30 04:06:36'),
(86, 12, 'ingreso', 'nacional', 600.00, '2025-11-30', 'Ajuste pesaje #14 (nuevo)', 600.00, '2025-11-30 04:06:36'),
(87, 12, 'ingreso', 'segunda', 250.00, '2025-11-30', 'Ajuste pesaje #14 (nuevo)', 250.00, '2025-11-30 04:06:36'),
(88, 12, 'salida', 'exportable', 380.00, '2025-11-29', 'Liquidación #16', 20.00, '2025-11-30 04:07:41'),
(89, 12, 'salida', 'industrial', 380.00, '2025-11-29', 'Liquidación #16', 20.00, '2025-11-30 04:07:41'),
(90, 12, 'salida', 'nacional', 570.00, '2025-11-29', 'Liquidación #16', 30.00, '2025-11-30 04:07:41'),
(91, 12, 'salida', 'segunda', 237.50, '2025-11-29', 'Liquidación #16', 12.50, '2025-11-30 04:07:41'),
(92, 13, 'ingreso', 'exportable', 500.00, '2025-11-30', 'Registro peso #15', 500.00, '2025-11-30 04:11:05'),
(93, 13, 'ingreso', 'industrial', 500.00, '2025-11-30', 'Registro peso #15', 500.00, '2025-11-30 04:11:05'),
(94, 13, 'ingreso', 'descarte', 100.00, '2025-11-30', 'Registro peso #15', 100.00, '2025-11-30 04:11:05'),
(95, 13, 'ingreso', 'primera', 300.00, '2025-11-30', 'Registro peso #15', 300.00, '2025-11-30 04:11:05'),
(96, 13, 'ingreso', 'segunda', 1000.00, '2025-11-30', 'Registro peso #15', 1000.00, '2025-11-30 04:11:05'),
(97, 13, 'salida', 'exportable', 475.00, '2025-11-29', 'Liquidación #17', 25.00, '2025-11-30 04:17:03'),
(98, 13, 'salida', 'industrial', 475.00, '2025-11-29', 'Liquidación #17', 25.00, '2025-11-30 04:17:03'),
(99, 13, 'salida', 'descarte', 95.00, '2025-11-29', 'Liquidación #17', 5.00, '2025-11-30 04:17:03'),
(100, 13, 'salida', 'primera', 285.00, '2025-11-29', 'Liquidación #17', 15.00, '2025-11-30 04:17:03'),
(101, 13, 'salida', 'segunda', 950.00, '2025-11-29', 'Liquidación #17', 50.00, '2025-11-30 04:17:03'),
(102, 14, 'ingreso', 'exportable', 20.00, '2025-12-01', 'Registro peso #16', 20.00, '2025-12-01 19:16:46'),
(103, 14, 'salida', 'exportable', 19.00, '2025-12-01', 'Liquidación #18', 1.00, '2025-12-01 20:04:13'),
(104, 15, 'ingreso', 'exportable', 1.00, '2025-12-01', 'Registro peso #17', 1.00, '2025-12-01 20:23:51'),
(105, 15, 'ingreso', 'industrial', 1.00, '2025-12-01', 'Registro peso #17', 1.00, '2025-12-01 20:23:51');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `libro_banco`
--

DROP TABLE IF EXISTS `libro_banco`;
CREATE TABLE `libro_banco` (
  `id` int(11) NOT NULL,
  `fecha` date NOT NULL,
  `operacion` varchar(255) NOT NULL,
  `de_quien` varchar(255) DEFAULT NULL,
  `a_quien` varchar(255) DEFAULT NULL,
  `motivo` text DEFAULT NULL,
  `rubro` enum('campo','economico','ventas') NOT NULL,
  `tipo_operacion` enum('adelanto','venta','pago','impuesto','otros') NOT NULL,
  `numero_operacion` varchar(50) DEFAULT NULL,
  `comprobante` varchar(100) DEFAULT NULL,
  `deudor` decimal(10,2) DEFAULT 0.00,
  `acreedor` decimal(10,2) DEFAULT 0.00,
  `estado` enum('cancelado','pendiente') DEFAULT 'pendiente',
  `agricultor` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `libro_banco`
--

INSERT INTO `libro_banco` (`id`, `fecha`, `operacion`, `de_quien`, `a_quien`, `motivo`, `rubro`, `tipo_operacion`, `numero_operacion`, `comprobante`, `deudor`, `acreedor`, `estado`, `agricultor`, `created_at`) VALUES
(1, '2024-01-10', 'Adelanto a productor', 'SAYARIQ SYSTEM', 'María Elena Quispe', 'Adelanto para cosecha', 'campo', 'adelanto', 'OP-001', 'COMP-001', 3000.00, 0.00, 'cancelado', 'María Elena Quispe', '2025-11-13 15:19:28'),
(2, '2024-01-12', 'Adelanto a productor', 'SAYARIQ SYSTEM', 'Juan Pérez Mendoza', 'Adelanto programado', 'campo', 'adelanto', 'OP-002', 'COMP-002', 4000.00, 0.00, 'cancelado', 'Juan Pérez Mendoza', '2025-11-13 15:19:28'),
(3, '2024-01-21', 'Venta de espárragos', 'Carlos Rodríguez S.A.C.', 'SAYARIQ SYSTEM', 'PED-2024-001', 'ventas', 'venta', 'OP-003', 'FACT-001', 0.00, 6093.75, 'cancelado', NULL, '2025-11-13 15:19:28'),
(4, '2024-01-26', 'Pago a productor', 'SAYARIQ SYSTEMm', 'María Elena Quispe', 'Liquidación LOTE-2024-001', 'campo', 'pago', 'OP-004', 'COMP-003', 7195.03, 0.00, 'cancelado', 'María Elena Quispe', '2025-11-13 15:19:28');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `liquidaciones`
--

DROP TABLE IF EXISTS `liquidaciones`;
CREATE TABLE `liquidaciones` (
  `id` int(11) NOT NULL,
  `numero_liquidacion` varchar(50) DEFAULT NULL,
  `lote_id` int(11) NOT NULL,
  `fecha_liquidacion` timestamp NULL DEFAULT current_timestamp(),
  `peso_bruto` decimal(10,2) DEFAULT NULL,
  `peso_jabas` decimal(10,2) DEFAULT NULL,
  `peso_neto_sin_jabas` decimal(10,2) DEFAULT NULL,
  `multiplicador_humedad` decimal(5,3) DEFAULT NULL,
  `peso_final_ajustado` decimal(10,2) DEFAULT NULL,
  `total_bruto_ventas` decimal(10,2) DEFAULT NULL,
  `total_neto_pagar` decimal(10,2) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `estado` varchar(20) DEFAULT 'pendiente',
  `total_bruto_fruta` decimal(10,2) NOT NULL,
  `costo_flete` decimal(10,2) DEFAULT 0.00,
  `costo_cosecha` decimal(10,2) DEFAULT 0.00,
  `costo_maquila` decimal(10,2) DEFAULT 0.00,
  `descuento_jabas` decimal(10,2) DEFAULT 0.00,
  `total_adelantos` decimal(10,2) DEFAULT 0.00,
  `total_a_pagar` decimal(10,2) NOT NULL,
  `estado_pago` enum('PENDIENTE','PAGADO','ANULADO') DEFAULT 'PENDIENTE'
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Volcado de datos para la tabla `liquidaciones`
--

INSERT INTO `liquidaciones` (`id`, `numero_liquidacion`, `lote_id`, `fecha_liquidacion`, `peso_bruto`, `peso_jabas`, `peso_neto_sin_jabas`, `multiplicador_humedad`, `peso_final_ajustado`, `total_bruto_ventas`, `total_neto_pagar`, `observaciones`, `estado`, `total_bruto_fruta`, `costo_flete`, `costo_cosecha`, `costo_maquila`, `descuento_jabas`, `total_adelantos`, `total_a_pagar`, `estado_pago`) VALUES
(6, NULL, 1, '2025-11-27 15:09:25', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'pendiente', 5745.96, 0.00, 0.00, 0.00, 240.00, 0.00, 5745.96, 'PENDIENTE'),
(7, NULL, 9, '2025-11-27 15:59:32', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'pendiente', 102.00, 0.00, 0.00, 0.00, 24.00, 0.00, 102.00, 'PENDIENTE'),
(9, 'LIQ-0003-2025', 11, '2025-11-28 16:09:01', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'pendiente', 26932.50, 0.00, 0.00, 0.00, 8000.00, 2500.00, 24432.50, 'PENDIENTE'),
(10, 'LIQ-0004-2025', 8, '2025-11-28 16:48:56', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'pendiente', 96.90, 0.00, 0.00, 0.00, 24.00, 0.00, 96.90, 'PENDIENTE'),
(11, 'LIQ-0005-2025', 5, '2025-11-28 16:50:34', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'pendiente', 4132.50, 0.00, 0.00, 0.00, 260.00, 0.00, 4132.50, 'PENDIENTE'),
(12, 'LIQ-0006-2025', 2, '2025-11-28 16:50:51', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'pendiente', 12066.35, 0.00, 0.00, 0.00, 300.00, 0.00, 12066.35, 'PENDIENTE'),
(13, 'LIQ-0007-2025', 3, '2025-11-28 16:51:01', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'pendiente', 9696.06, 0.00, 0.00, 0.00, 190.00, 2000.00, 7696.06, 'PENDIENTE'),
(14, 'LIQ-0008-2025', 4, '2025-11-28 16:54:01', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'pendiente', 807.42, 0.00, 0.00, 0.00, 330.00, 0.00, 807.42, 'PENDIENTE'),
(15, 'LIQ-0009-2025', 10, '2025-11-28 16:55:52', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'pendiente', 80750.00, 0.00, 0.00, 0.00, 400.00, 0.00, 80750.00, 'PENDIENTE'),
(16, 'LIQ-0010-2025', 12, '2025-11-29 23:07:41', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'pendiente', 8716.25, 0.00, 0.00, 0.00, 80.00, 0.00, 8716.25, 'PENDIENTE'),
(17, 'LIQ-0011-2025', 13, '2025-11-29 23:17:03', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'pendiente', 20710.00, 0.00, 0.00, 0.00, 74.00, 0.00, 20710.00, 'PENDIENTE'),
(18, 'LIQ-0012-2025', 14, '2025-12-01 15:04:12', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'pendiente', 145.35, 0.00, 0.00, 0.00, 40.00, 0.00, 145.35, 'PENDIENTE');

--
-- Disparadores `liquidaciones`
--
DELIMITER $$
CREATE TRIGGER `trg_validar_liquidacion` BEFORE INSERT ON `liquidaciones` FOR EACH ROW BEGIN
  DECLARE v_count INT;

  SELECT COUNT(*) INTO v_count
  FROM vw_saldos_kardex
  WHERE lote_id = NEW.lote_id
    AND saldo > 0;

  IF v_count = 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'NO HAY STOCK EN KARDEX PARA ESTE LOTE';
  END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `liquidaciones_detalle`
--

DROP TABLE IF EXISTS `liquidaciones_detalle`;
CREATE TABLE `liquidaciones_detalle` (
  `id` int(11) NOT NULL,
  `liquidacion_id` int(11) NOT NULL,
  `categoria_id` int(11) NOT NULL,
  `peso_categoria_original` decimal(10,2) NOT NULL,
  `peso_ajustado` decimal(10,2) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `numero_jabas` int(11) NOT NULL DEFAULT 0,
  `peso_jabas` decimal(10,2) NOT NULL DEFAULT 0.00,
  `porcentaje_humedad` decimal(5,2) NOT NULL DEFAULT 0.00,
  `peso_descuento_humedad` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `liquidaciones_detalle`
--

INSERT INTO `liquidaciones_detalle` (`id`, `liquidacion_id`, `categoria_id`, `peso_categoria_original`, `peso_ajustado`, `precio_unitario`, `subtotal`, `numero_jabas`, `peso_jabas`, `porcentaje_humedad`, `peso_descuento_humedad`, `created_at`) VALUES
(1, 7, 1, 12.00, 12.00, 8.50, 102.00, 0, 0.00, 0.00, 0.00, '2025-11-27 16:10:49'),
(3, 9, 2, 8100.00, 7695.00, 3.50, 26932.50, 0, 0.00, 0.00, 0.00, '2025-11-28 21:09:03'),
(4, 10, 1, 12.00, 11.40, 8.50, 96.90, 0, 0.00, 0.00, 0.00, '2025-11-28 21:48:57'),
(5, 11, 1, 100.00, 95.00, 8.50, 807.50, 0, 0.00, 0.00, 0.00, '2025-11-28 21:50:35'),
(6, 11, 2, 100.00, 95.00, 3.50, 332.50, 0, 0.00, 0.00, 0.00, '2025-11-28 21:50:35'),
(7, 11, 3, 100.00, 95.00, 5.00, 475.00, 0, 0.00, 0.00, 0.00, '2025-11-28 21:50:35'),
(8, 11, 4, 100.00, 95.00, 2.50, 237.50, 0, 0.00, 0.00, 0.00, '2025-11-28 21:50:35'),
(9, 11, 5, 100.00, 95.00, 1.00, 95.00, 0, 0.00, 0.00, 0.00, '2025-11-28 21:50:35'),
(10, 11, 6, 100.00, 95.00, 7.00, 665.00, 0, 0.00, 0.00, 0.00, '2025-11-28 21:50:35'),
(11, 11, 7, 100.00, 95.00, 5.50, 522.50, 0, 0.00, 0.00, 0.00, '2025-11-28 21:50:35'),
(12, 11, 8, 100.00, 95.00, 4.00, 380.00, 0, 0.00, 0.00, 0.00, '2025-11-28 21:50:35'),
(13, 11, 9, 100.00, 95.00, 3.00, 285.00, 0, 0.00, 0.00, 0.00, '2025-11-28 21:50:35'),
(14, 11, 10, 100.00, 95.00, 2.00, 190.00, 0, 0.00, 0.00, 0.00, '2025-11-28 21:50:35'),
(15, 11, 11, 100.00, 95.00, 1.50, 142.50, 0, 0.00, 0.00, 0.00, '2025-11-28 21:50:35'),
(16, 12, 1, 1350.75, 1283.21, 8.50, 10907.31, 0, 0.00, 0.00, 0.00, '2025-11-28 21:50:52'),
(17, 12, 2, 320.40, 304.38, 3.50, 1065.33, 0, 0.00, 0.00, 0.00, '2025-11-28 21:50:52'),
(18, 12, 5, 98.65, 93.72, 1.00, 93.72, 0, 0.00, 0.00, 0.00, '2025-11-28 21:50:52'),
(19, 13, 1, 1200.75, 1140.71, 8.50, 9696.06, 0, 0.00, 0.00, 0.00, '2025-11-28 21:51:01'),
(20, 14, 1, 99.99, 94.99, 8.50, 807.42, 0, 0.00, 0.00, 0.00, '2025-11-28 21:54:01'),
(21, 15, 2, 10000.00, 9500.00, 3.50, 33250.00, 0, 0.00, 0.00, 0.00, '2025-11-28 21:55:52'),
(22, 15, 3, 10000.00, 9500.00, 5.00, 47500.00, 0, 0.00, 0.00, 0.00, '2025-11-28 21:55:52'),
(23, 16, 1, 400.00, 380.00, 8.50, 3230.00, 0, 0.00, 0.00, 0.00, '2025-11-30 04:07:41'),
(24, 16, 2, 400.00, 380.00, 3.50, 1330.00, 0, 0.00, 0.00, 0.00, '2025-11-30 04:07:41'),
(25, 16, 3, 600.00, 570.00, 5.00, 2850.00, 0, 0.00, 0.00, 0.00, '2025-11-30 04:07:41'),
(26, 16, 7, 250.00, 237.50, 5.50, 1306.25, 0, 0.00, 0.00, 0.00, '2025-11-30 04:07:41'),
(27, 17, 1, 500.00, 475.00, 18.00, 8550.00, 0, 0.00, 0.00, 0.00, '2025-11-30 04:17:03'),
(28, 17, 2, 500.00, 475.00, 4.00, 1900.00, 0, 0.00, 0.00, 0.00, '2025-11-30 04:17:03'),
(29, 17, 5, 100.00, 95.00, 1.00, 95.00, 0, 0.00, 0.00, 0.00, '2025-11-30 04:17:03'),
(30, 17, 6, 300.00, 285.00, 9.00, 2565.00, 0, 0.00, 0.00, 0.00, '2025-11-30 04:17:03'),
(31, 17, 7, 1000.00, 950.00, 8.00, 7600.00, 0, 0.00, 0.00, 0.00, '2025-11-30 04:17:03'),
(32, 18, 1, 20.00, 19.00, 8.50, 145.35, 10, 2.00, 10.00, 1.90, '2025-12-01 20:04:13');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `lotes`
--

DROP TABLE IF EXISTS `lotes`;
CREATE TABLE `lotes` (
  `id` int(11) NOT NULL,
  `numero_lote` varchar(50) NOT NULL,
  `guia_ingreso` varchar(50) NOT NULL,
  `productor_id` int(11) NOT NULL,
  `producto` varchar(100) NOT NULL,
  `fecha_ingreso` date NOT NULL,
  `fecha_proceso` date DEFAULT NULL,
  `peso_inicial` decimal(10,2) NOT NULL,
  `peso_neto` decimal(10,2) DEFAULT NULL,
  `numero_jabas` int(11) DEFAULT NULL,
  `estado` enum('pendiente','proceso','liquidado','cancelado') DEFAULT 'pendiente',
  `estado_frescura` enum('optimo','proximo_vencer','en_riesgo') DEFAULT 'optimo',
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `tipo_origen` varchar(20) DEFAULT 'TERCERO' CHECK (`tipo_origen` in ('TERCERO','PROPIO')),
  `fecha_recepcion` timestamp NULL DEFAULT current_timestamp(),
  `estado_proceso` varchar(20) DEFAULT 'EN_RECEPCION' CHECK (`estado_proceso` in ('EN_RECEPCION','CALIDAD_OK','PROCESADO','LIQUIDADO','RECHAZADO')),
  `chofer` varchar(100) DEFAULT NULL,
  `placa_vehiculo` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `lotes`
--

INSERT INTO `lotes` (`id`, `numero_lote`, `guia_ingreso`, `productor_id`, `producto`, `fecha_ingreso`, `fecha_proceso`, `peso_inicial`, `peso_neto`, `numero_jabas`, `estado`, `estado_frescura`, `observaciones`, `created_at`, `updated_at`, `tipo_origen`, `fecha_recepcion`, `estado_proceso`, `chofer`, `placa_vehiculo`) VALUES
(1, 'LOTE-2024-001', 'GI-001-2024', 1, 'Espárragos Verdes', '2024-01-15', '2024-01-16', 1500.50, 1420.75, 120, 'liquidado', 'optimo', 'Producto de buena calidad, tamaño uniforme', '2025-11-13 15:19:28', '2025-11-27 15:20:43', 'TERCERO', '2025-11-23 23:44:59', 'EN_RECEPCION', NULL, NULL),
(2, 'LOTE-2024-002', 'GI-002-2024', 3, 'Espárragos Blancos', '2024-01-18', '2024-01-19', 1800.25, 1705.80, 150, 'liquidado', 'optimo', 'Espárragos frescos, buen calibre', '2025-11-13 15:19:28', '2025-11-28 21:50:52', 'TERCERO', '2025-11-23 23:44:59', 'EN_RECEPCION', NULL, NULL),
(3, 'LOTE-2024-003', 'GI-003-2024', 6, 'Espárragos Verdes', '2024-01-20', NULL, 1200.75, NULL, 95, 'liquidado', 'proximo_vencer', 'Producto necesita procesamiento urgente', '2025-11-13 15:19:28', '2025-11-28 21:51:01', 'TERCERO', '2025-11-23 23:44:59', 'EN_RECEPCION', NULL, NULL),
(4, 'LOTE-2024-004', 'GI-004-2024', 1, 'Espárragos Blancos', '2024-01-22', '2024-01-23', 2000.00, 1890.50, 165, 'liquidado', 'optimo', 'Alta calidad, tamaño premium', '2025-11-13 15:19:28', '2025-11-28 21:54:01', 'TERCERO', '2025-11-23 23:44:59', 'EN_RECEPCION', NULL, NULL),
(5, 'LOTE-2024-005', 'GI-005-2024', 3, 'Espárragos Verdes', '2024-01-25', NULL, 1600.30, NULL, 130, 'liquidado', 'optimo', 'Producto recién cosechado', '2025-11-13 15:19:28', '2025-11-28 21:50:35', 'TERCERO', '2025-11-23 23:44:59', 'EN_RECEPCION', NULL, NULL),
(6, '', '', 2, '', '2025-11-18', NULL, 0.00, 1.00, 0, 'pendiente', 'optimo', '2', '2025-11-18 23:34:51', '2025-11-28 22:36:56', 'TERCERO', '2025-11-23 23:44:59', 'EN_RECEPCION', NULL, NULL),
(8, 'LOT-2025-001', 'GI-1763592511886', 3, 'jengibre', '2025-11-19', NULL, 12.00, NULL, 12, 'liquidado', 'optimo', '12', '2025-11-19 22:48:31', '2025-11-28 21:48:57', 'TERCERO', '2025-11-23 23:44:59', 'EN_RECEPCION', NULL, NULL),
(9, 'LOT-2025-002', 'GI-1764258207998', 3, 'jengibre', '2025-11-27', NULL, 100000.00, 12.00, 12, 'liquidado', 'optimo', '', '2025-11-27 15:54:45', '2025-11-27 16:10:49', 'TERCERO', '2025-11-27 15:54:45', 'EN_RECEPCION', NULL, NULL),
(10, 'LOT-2025-003', 'GI-1764287865309', 3, 'jengibre', '2025-11-27', NULL, 20000.00, 20000.00, 200, 'liquidado', 'optimo', '', '2025-11-27 23:57:45', '2025-11-28 21:55:52', 'TERCERO', '2025-11-27 23:57:45', 'EN_RECEPCION', NULL, NULL),
(11, 'LOT-2025-004', 'GI-1764288837279', 3, 'jengibre', '2025-11-28', NULL, 40000.00, 40000.00, 4000, 'liquidado', 'optimo', '', '2025-11-28 00:13:57', '2025-11-28 21:09:03', 'TERCERO', '2025-11-28 00:13:57', 'EN_RECEPCION', NULL, NULL),
(12, 'LOT-2025-005', 'GI-1764475130231', 10, 'jengibre', '2025-11-30', NULL, 1650.00, 1650.00, 40, 'liquidado', 'optimo', '', '2025-11-30 03:58:49', '2025-11-30 04:07:41', 'TERCERO', '2025-11-30 03:58:49', 'EN_RECEPCION', NULL, NULL),
(13, 'LOT-2025-006', 'GI-1764475766556', 10, 'jengibre', '2025-11-30', NULL, 2400.00, 2400.00, 80, 'liquidado', 'optimo', '', '2025-11-30 04:09:25', '2025-11-30 04:17:03', 'TERCERO', '2025-11-30 04:09:25', 'EN_RECEPCION', NULL, NULL),
(14, 'LOT-2025-007', 'GI-1764616570567', 10, 'jengibre', '2025-12-01', NULL, 20.00, 20.00, 20, 'liquidado', 'optimo', '', '2025-12-01 19:16:11', '2025-12-01 20:04:13', 'TERCERO', '2025-12-01 19:16:11', 'EN_RECEPCION', NULL, NULL),
(15, 'LOT-2025-008', 'GI-1764620590392', 10, 'jengibre', '2025-12-01', NULL, 10.00, 2.00, 10, 'pendiente', 'optimo', '', '2025-12-01 20:23:11', '2025-12-01 20:23:51', 'TERCERO', '2025-12-01 20:23:11', 'EN_RECEPCION', NULL, NULL),
(16, 'LOT-2025-009', 'GI-1764805942893', 12, 'jengibre', '2025-12-03', NULL, 1900.00, NULL, 80, 'pendiente', 'optimo', 'Producto guardado con moho', '2025-12-03 23:52:23', '2025-12-03 23:52:23', 'TERCERO', '2025-12-03 23:52:23', 'EN_RECEPCION', NULL, NULL),
(17, 'LOT-2025-010', 'GI-1764848571199', 3, 'jengibre', '2025-12-04', NULL, 1900.00, NULL, 90, 'pendiente', 'optimo', '', '2025-12-04 11:42:51', '2025-12-04 11:42:51', 'TERCERO', '2025-12-04 11:42:51', 'EN_RECEPCION', NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pagos_campo`
--

DROP TABLE IF EXISTS `pagos_campo`;
CREATE TABLE `pagos_campo` (
  `id` int(11) NOT NULL,
  `lote_id` int(11) NOT NULL,
  `productor_id` int(11) NOT NULL,
  `total_liquidacion` decimal(10,2) NOT NULL,
  `total_adelantos` decimal(10,2) DEFAULT 0.00,
  `adelanto_restante` decimal(10,2) DEFAULT 0.00,
  `monto_pago` decimal(10,2) NOT NULL,
  `saldo_pendiente` decimal(10,2) DEFAULT 0.00,
  `fecha_pago` date DEFAULT NULL,
  `datos_bancarios` text DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `estado` enum('pendiente','cancelado','deficit') DEFAULT 'pendiente',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `pagos_campo`
--

INSERT INTO `pagos_campo` (`id`, `lote_id`, `productor_id`, `total_liquidacion`, `total_adelantos`, `adelanto_restante`, `monto_pago`, `saldo_pendiente`, `fecha_pago`, `datos_bancarios`, `observaciones`, `estado`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 10195.03, 3000.00, 0.00, 7195.03, 0.00, '2024-01-26', 'Banco de la Nación - 001-123456-789', 'Pago completo sin saldo pendiente', 'cancelado', '2025-11-13 15:19:28', '2025-11-13 15:19:28'),
(2, 4, 1, 15016.39, 3500.00, 0.00, 11516.39, 0.00, '2024-01-29', 'Banco de la Nación - 001-123456-789', 'Segundo pago al mismo productor', 'cancelado', '2025-11-13 15:19:28', '2025-11-13 15:19:28'),
(3, 2, 3, 11813.13, 4000.00, 0.00, 7813.13, 0.00, NULL, 'Interbank - 001-456789-123', 'Pago programado para próxima semana', 'pendiente', '2025-11-13 15:19:28', '2025-11-13 15:19:28');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedidos`
--

DROP TABLE IF EXISTS `pedidos`;
CREATE TABLE `pedidos` (
  `id` int(11) NOT NULL,
  `numero_pedido` varchar(50) NOT NULL,
  `cliente_id` int(11) NOT NULL,
  `producto` varchar(100) NOT NULL,
  `categoria` varchar(50) DEFAULT NULL,
  `kg_bruto` decimal(10,2) NOT NULL,
  `porcentaje_humedad` decimal(5,2) DEFAULT 0.00,
  `kg_neto` decimal(10,2) NOT NULL,
  `precio` decimal(10,2) NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `fecha_pedido` date NOT NULL,
  `estado` enum('pendiente','proceso','completado','cancelado') DEFAULT 'pendiente',
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `pedidos`
--

INSERT INTO `pedidos` (`id`, `numero_pedido`, `cliente_id`, `producto`, `categoria`, `kg_bruto`, `porcentaje_humedad`, `kg_neto`, `precio`, `total`, `fecha_pedido`, `estado`, `observaciones`, `created_at`, `updated_at`) VALUES
(1, 'PED-2024-001', 2, 'Espárragos Verdes', 'Premium', 500.00, 2.50, 487.50, 12.50, 6093.75, '2024-01-20', 'completado', 'Pedido urgente para exportación', '2025-11-13 15:19:28', '2025-11-13 15:19:28'),
(2, 'PED-2024-002', 5, 'Espárragos Blancos', 'Extra', 750.00, 2.00, 735.00, 11.80, 8673.00, '2024-01-22', 'proceso', 'Pedido para mercado europeo', '2025-11-13 15:19:28', '2025-11-13 15:19:28'),
(3, 'PED-2024-003', 2, 'Espárragos Verdes', 'Standard', 300.00, 2.80, 291.60, 10.50, 3061.80, '2024-01-25', 'pendiente', 'Pedido regular para supermercados', '2025-11-13 15:19:28', '2025-11-13 15:19:28'),
(4, 'PED-2024-004', 5, 'Espárragos Blancos', 'Premium', 600.00, 2.20, 586.80, 13.20, 7745.76, '2024-01-28', 'pendiente', 'Pedido especial para restaurante', '2025-11-13 15:19:28', '2025-11-13 15:19:28'),
(5, 'PED-2025-005', 5, 'Jengibre', 'Nacional', 120.00, 2.50, 117.00, 12.00, 1404.00, '2025-11-19', 'pendiente', '12', '2025-11-19 23:25:24', '2025-12-04 11:43:55'),
(6, 'PED-2025-006', 1, 'Cúrcuma', 'Exportable', 10.00, 2.50, 9.75, 10.00, 97.50, '2025-11-29', 'pendiente', '', '2025-11-29 23:06:06', '2025-12-04 11:44:06'),
(7, 'PED-2025-007', 2, 'Curcuma', 'Exportable', 4000.00, 0.00, 4000.00, 15.00, 60000.00, '2025-11-30', 'pendiente', '', '2025-11-30 04:20:51', '2025-11-30 04:20:51'),
(8, 'PED-2025-008', 2, 'jenjibre', 'Exportable', 1000.00, 0.00, 1000.00, 700.00, 700000.00, '2025-11-30', 'pendiente', '', '2025-11-30 04:28:44', '2025-11-30 04:28:44'),
(9, 'PED-2025-009', 12, 'Jengibre', 'Exportable', 2000.00, 0.00, 2000.00, 2.60, 5200.00, '2025-12-04', 'pendiente', 'Presentación caja de 14.20 pero se paga por 14 kg', '2025-12-04 00:01:32', '2025-12-04 00:01:32'),
(10, 'PED-2025-010', 25, 'Jengibre', 'Exportable', 2000.00, 0.00, 2000.00, 2.90, 5800.00, '2025-12-04', 'pendiente', '', '2025-12-04 21:14:01', '2025-12-04 21:14:01');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedido_lotes`
--

DROP TABLE IF EXISTS `pedido_lotes`;
CREATE TABLE `pedido_lotes` (
  `id` int(11) NOT NULL,
  `pedido_id` int(11) NOT NULL,
  `lote_id` int(11) NOT NULL,
  `categoria` varchar(50) DEFAULT NULL,
  `kg_asignado` decimal(12,2) NOT NULL DEFAULT 0.00,
  `categoria_id` int(11) DEFAULT NULL,
  `peso_asignado` decimal(12,2) NOT NULL DEFAULT 0.00,
  `fecha_asignacion` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Volcado de datos para la tabla `pedido_lotes`
--

INSERT INTO `pedido_lotes` (`id`, `pedido_id`, `lote_id`, `categoria`, `kg_asignado`, `categoria_id`, `peso_asignado`, `fecha_asignacion`) VALUES
(1, 6, 6, 'Exportable', 1.00, 1, 1.00, '2025-11-29 23:43:18'),
(2, 6, 8, 'Exportable', 8.75, 1, 8.75, '2025-11-29 23:44:05'),
(5, 7, 13, 'Exportable', 500.00, 1, 500.00, '2025-11-30 04:24:24'),
(6, 7, 12, 'Exportable', 400.00, 1, 400.00, '2025-11-30 04:24:42'),
(14, 9, 10, 'Nacional', 2000.00, 3, 2000.00, '2025-12-04 00:03:35'),
(17, 10, 14, 'Exportable', 20.00, 1, 20.00, '2025-12-19 04:20:59'),
(18, 10, 8, 'Exportable', 1.00, 1, 1.00, '2025-12-19 05:27:39');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `personas`
--

DROP TABLE IF EXISTS `personas`;
CREATE TABLE `personas` (
  `id` int(11) NOT NULL,
  `nombre_completo` varchar(255) NOT NULL,
  `documento_identidad` varchar(20) NOT NULL,
  `tipo_documento` enum('DNI','RUC','CE') DEFAULT 'DNI',
  `telefono` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `direccion` text DEFAULT NULL,
  `tipo_persona` enum('productor','cliente','empleado','proveedor') NOT NULL,
  `cuenta_bancaria` varchar(50) DEFAULT NULL,
  `banco` varchar(100) DEFAULT NULL,
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `nombres` varchar(150) DEFAULT NULL,
  `apellidos` varchar(150) DEFAULT NULL,
  `ruc` varchar(20) DEFAULT NULL,
  `razon_social` varchar(255) DEFAULT NULL,
  `distrito` varchar(100) DEFAULT NULL,
  `provincia` varchar(100) DEFAULT NULL,
  `departamento` varchar(100) DEFAULT NULL,
  `cci` varchar(30) DEFAULT NULL,
  `observaciones` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `personas`
--

INSERT INTO `personas` (`id`, `nombre_completo`, `documento_identidad`, `tipo_documento`, `telefono`, `email`, `direccion`, `tipo_persona`, `cuenta_bancaria`, `banco`, `estado`, `created_at`, `updated_at`, `nombres`, `apellidos`, `ruc`, `razon_social`, `distrito`, `provincia`, `departamento`, `cci`, `observaciones`) VALUES
(1, 'María Juana Quispe', '401233', 'DNI', '987654321', 'maria.quispe@email.com', 'Av. Los Olivos 123, Lima', 'cliente', '001-123456-789', 'Banco de la Nación', 'activo', '2025-11-13 15:19:27', '2025-12-04 14:00:20', 'María', 'Quispe', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(2, 'Carlos Rodríguez S.A.C.', '20123456789', 'RUC', '012345678', 'ventas@carlosrodriguez.com', 'Calle Las Flores 456, Ica', 'cliente', '001-987654-321', 'BCP', 'activo', '2025-11-13 15:19:27', '2025-12-04 14:00:20', 'Carlos', 'S.A.C.', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(3, 'Juan Carlos Castro', '40876543', 'DNI', '987654322', 'juan.perez@email.com', 'Jr. Union 789, Chincha', 'productor', '001-456789-123', 'Interbank', 'activo', '2025-11-13 15:19:27', '2025-12-04 14:00:20', 'Juan', 'Castro', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(4, 'Ana María Gómez', '40765432', 'DNI', '987654323', 'ana.gomez@email.com', 'Av. Progreso 321, Pisco', 'empleado', '001-321654-987', 'BBVA', 'activo', '2025-11-13 15:19:27', '2025-12-04 14:00:20', 'Ana', 'Gómez', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(5, 'Distribuidora San Martín', '20198765432', 'RUC', '012345679', 'compras@sanmar.com', 'Carretera Panamericana Km 245, Ica', 'cliente', '001-741852-963', 'Scotiabank', 'activo', '2025-11-13 15:19:27', '2025-12-04 14:00:20', 'Distribuidora', 'Martín', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(6, 'Roberto Silva Castro', '40654321', 'DNI', '987654324', 'roberto.silva@email.com', 'Mz. L Lt. 15, Villa El Salvador', 'productor', '001-159753-486', 'Banco de la Nación', 'activo', '2025-11-13 15:19:27', '2025-12-04 14:00:20', 'Roberto', 'Castro', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(7, 'Luz Marina Díaz', '40543219', 'DNI', '987654325', 'luz.diaz@email.com', 'Calle Los Pinos 654, Cañete', 'empleado', '001-357159-482', 'BCP', 'activo', '2025-11-13 15:19:27', '2025-12-04 14:00:20', 'Luz', 'Díaz', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(8, 'Agroexportadora Del Sur', '20234567891', 'RUC', '012345680', 'administracion@agroexportadora.com', 'Av. Industrial 789, Arequipa', 'proveedor', '001-852741-963', 'Interbank', 'activo', '2025-11-13 15:19:27', '2025-12-04 14:00:20', 'Agroexportadora', 'Sur', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(10, 'Gabriel Isaias Ccansaya', '70206904', 'DNI', '971698621', 'gccansayapaccori@gmail.com', '', 'productor', '', '', 'activo', '2025-11-30 03:50:50', '2025-12-04 14:00:20', 'Gabriel', 'Ccansaya', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(12, 'Lizeth Huayta', '73353257', 'DNI', '912988853', 'lizethhuaytav@gmail.com', 'Lima 1', 'productor', '1910142014234', 'BCP', 'activo', '2025-12-03 23:49:06', '2025-12-04 20:49:01', 'Lizeth', 'Huayta', '', '', '', '', '', '', ''),
(13, 'Lizeth Cruz Lopez', '12345678', 'DNI', '987654321', 'lopez@gmail.com', 'Lima 1', 'cliente', '', '', 'activo', '2025-12-04 11:33:55', '2025-12-04 14:00:20', 'Lizeth', 'Lopez', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(14, 'Juan Luis Rivera', '87654321', 'DNI', '963852147', 'River@hotmail.com', 'av. Playa Escondida', 'productor', '', '', 'activo', '2025-12-04 11:37:48', '2025-12-04 14:00:20', 'Juan', 'Rivera', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(25, 'Franco Mamani Quispe', 'ss', 'DNI', '1', '2@2.com', '3', 'cliente', '22', '12', 'activo', '2025-12-04 13:54:00', '2025-12-04 20:48:37', 'Franco', 'Mamani Quispe', '', '', '', '', '', '', ''),
(26, 'Dionisio Cardenas Quelar', '122', 'DNI', '123', '32@com.com', '1233', 'productor', '1', '1', 'activo', '2025-12-04 14:08:35', '2025-12-04 15:49:27', 'Dionisio Cardenas', 'Quelar', '332323', 'ff', '3', '3', '3', '1', '1');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `persona_roles`
--

DROP TABLE IF EXISTS `persona_roles`;
CREATE TABLE `persona_roles` (
  `id` int(11) NOT NULL,
  `persona_id` int(11) NOT NULL,
  `rol_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Volcado de datos para la tabla `persona_roles`
--

INSERT INTO `persona_roles` (`id`, `persona_id`, `rol_id`) VALUES
(35, 12, 1),
(33, 12, 2),
(36, 12, 5),
(34, 12, 6),
(31, 25, 2),
(32, 25, 6),
(29, 26, 1),
(30, 26, 4);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pesos_lote`
--

DROP TABLE IF EXISTS `pesos_lote`;
CREATE TABLE `pesos_lote` (
  `id` int(11) NOT NULL,
  `lote_id` int(11) NOT NULL,
  `fecha_pesado` date NOT NULL,
  `peso_bruto` decimal(10,2) NOT NULL,
  `peso_exportable` decimal(10,2) DEFAULT 0.00,
  `peso_industrial` decimal(10,2) DEFAULT 0.00,
  `peso_descarte` decimal(10,2) DEFAULT 0.00,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `peso_nacional` decimal(10,2) DEFAULT 0.00,
  `peso_jugo` decimal(10,2) DEFAULT 0.00,
  `peso_primera` decimal(10,2) DEFAULT 0.00,
  `peso_segunda` decimal(10,2) DEFAULT 0.00,
  `peso_tercera` decimal(10,2) DEFAULT 0.00,
  `peso_cuarta` decimal(10,2) DEFAULT 0.00,
  `peso_quinta` decimal(10,2) DEFAULT 0.00,
  `peso_dedos` decimal(10,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `pesos_lote`
--

INSERT INTO `pesos_lote` (`id`, `lote_id`, `fecha_pesado`, `peso_bruto`, `peso_exportable`, `peso_industrial`, `peso_descarte`, `observaciones`, `created_at`, `peso_nacional`, `peso_jugo`, `peso_primera`, `peso_segunda`, `peso_tercera`, `peso_cuarta`, `peso_quinta`, `peso_dedos`) VALUES
(1, 1, '2024-01-16', 1500.50, 1100.25, 250.30, 70.20, 'Buen rendimiento en exportable', '2025-11-13 15:19:28', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(2, 1, '2024-01-17', 1420.75, 1050.50, 280.15, 60.10, 'Segundo pesaje confirmatorio', '2025-11-13 15:19:28', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(3, 2, '2024-01-19', 1800.25, 1350.75, 320.40, 98.65, 'Proceso en curso', '2025-11-13 15:19:28', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(5, 2, '2024-01-20', 12.00, 12.00, 0.00, 0.00, 'Pesaje final del lote', '2025-11-13 15:19:28', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(6, 6, '2025-11-27', 1.00, 1.00, 0.00, 0.00, '', '2025-11-27 15:55:33', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(7, 9, '2025-11-27', 12.00, 0.00, 0.00, 0.00, '', '2025-11-27 15:56:19', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(8, 8, '2025-11-27', 12.00, 0.00, 0.00, 0.00, '', '2025-11-27 20:34:29', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(9, 3, '2025-11-27', 1200.75, 0.00, 0.00, 0.00, '', '2025-11-27 21:36:03', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(10, 5, '2025-11-27', 1600.30, 0.00, 0.00, 0.00, '', '2025-11-27 22:20:28', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(11, 4, '2025-11-27', 1890.50, 0.00, 0.00, 0.00, '', '2025-11-27 23:04:20', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(12, 10, '2025-11-27', 20000.00, 0.00, 10000.00, 0.00, '', '2025-11-27 23:58:25', 10000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(13, 11, '2025-11-28', 40000.00, 0.00, 8100.00, 0.00, '', '2025-11-28 00:14:32', 1000.00, 900.00, 10000.00, 0.00, 10000.00, 10000.00, 0.00, 0.00),
(14, 12, '2025-11-30', 1650.00, 400.00, 400.00, 0.00, '', '2025-11-30 04:00:17', 600.00, 0.00, 0.00, 250.00, 0.00, 0.00, 0.00, 0.00),
(15, 13, '2025-11-30', 2400.00, 500.00, 500.00, 100.00, '', '2025-11-30 04:11:05', 0.00, 0.00, 300.00, 1000.00, 0.00, 0.00, 0.00, 0.00),
(16, 14, '2025-12-01', 20.00, 20.00, 0.00, 0.00, '', '2025-12-01 19:16:46', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00),
(17, 15, '2025-12-01', 10.00, 1.00, 1.00, 0.00, '', '2025-12-01 20:23:51', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pesos_lote_detalle`
--

DROP TABLE IF EXISTS `pesos_lote_detalle`;
CREATE TABLE `pesos_lote_detalle` (
  `id` int(11) NOT NULL,
  `peso_lote_id` int(11) NOT NULL,
  `categoria_id` int(11) NOT NULL,
  `peso` decimal(10,2) NOT NULL DEFAULT 0.00,
  `numero_jabas` int(11) NOT NULL DEFAULT 0,
  `peso_jabas` decimal(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Volcado de datos para la tabla `pesos_lote_detalle`
--

INSERT INTO `pesos_lote_detalle` (`id`, `peso_lote_id`, `categoria_id`, `peso`, `numero_jabas`, `peso_jabas`) VALUES
(4, 8, 1, 12.00, 0, 0.00),
(5, 9, 1, 1200.75, 0, 0.00),
(7, 10, 1, 100.00, 0, 0.00),
(8, 10, 2, 100.00, 0, 0.00),
(9, 10, 3, 100.00, 0, 0.00),
(10, 10, 4, 100.00, 0, 0.00),
(11, 10, 5, 100.00, 0, 0.00),
(12, 10, 6, 100.00, 0, 0.00),
(13, 10, 7, 100.00, 0, 0.00),
(14, 10, 8, 100.00, 0, 0.00),
(15, 10, 9, 100.00, 0, 0.00),
(16, 10, 10, 100.00, 0, 0.00),
(17, 10, 11, 100.00, 0, 0.00),
(18, 11, 1, 99.99, 0, 0.00),
(30, 13, 2, 8100.00, 0, 0.00),
(31, 13, 3, 1000.00, 0, 0.00),
(32, 13, 4, 900.00, 0, 0.00),
(33, 13, 6, 10000.00, 0, 0.00),
(34, 13, 8, 10000.00, 0, 0.00),
(35, 13, 9, 10000.00, 0, 0.00),
(38, 12, 2, 10000.00, 0, 0.00),
(39, 12, 3, 10000.00, 0, 0.00),
(40, 6, 1, 1.00, 0, 0.00),
(42, 14, 1, 400.00, 0, 0.00),
(43, 14, 2, 400.00, 0, 0.00),
(44, 14, 3, 600.00, 0, 0.00),
(45, 14, 7, 250.00, 0, 0.00),
(46, 15, 1, 500.00, 0, 0.00),
(47, 15, 2, 500.00, 0, 0.00),
(48, 15, 5, 100.00, 0, 0.00),
(49, 15, 6, 300.00, 0, 0.00),
(50, 15, 7, 1000.00, 0, 0.00),
(51, 16, 1, 20.00, 0, 0.00),
(52, 17, 1, 1.00, 0, 0.00),
(53, 17, 2, 1.00, 0, 0.00);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `planificacion_operativa`
--

DROP TABLE IF EXISTS `planificacion_operativa`;
CREATE TABLE `planificacion_operativa` (
  `id` int(11) NOT NULL,
  `lote_id` int(11) NOT NULL,
  `pedido_id` int(11) NOT NULL,
  `peso_asignado` decimal(10,2) NOT NULL,
  `fecha_asignacion` date NOT NULL,
  `estado` enum('planificado','en_proceso','completado') DEFAULT 'planificado',
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `planificacion_operativa`
--

INSERT INTO `planificacion_operativa` (`id`, `lote_id`, `pedido_id`, `peso_asignado`, `fecha_asignacion`, `estado`, `created_at`) VALUES
(1, 1, 1, 500.00, '2024-01-20', 'completado', '2025-11-13 15:19:28'),
(2, 2, 2, 750.00, '2024-01-22', 'en_proceso', '2025-11-13 15:19:28'),
(3, 4, 4, 600.00, '2024-01-28', 'planificado', '2025-11-13 15:19:28');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `codigo` varchar(50) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`id`, `codigo`, `nombre`, `estado`, `created_at`) VALUES
(1, 'productor', 'Productor', 'activo', '2025-12-04 13:22:23'),
(2, 'comprador', 'Comprador', 'activo', '2025-12-04 13:22:23'),
(3, 'jornalero', 'Jornalero', 'activo', '2025-12-04 13:22:23'),
(4, 'transportista', 'Transportista', 'activo', '2025-12-04 13:22:23'),
(5, 'supervisor', 'Supervisor', 'activo', '2025-12-04 13:22:23'),
(6, 'control_calidad', 'Control de Calidad', 'activo', '2025-12-04 13:22:23');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ventas`
--

DROP TABLE IF EXISTS `ventas`;
CREATE TABLE `ventas` (
  `id` int(11) NOT NULL,
  `pedido_id` int(11) NOT NULL,
  `producto` varchar(100) NOT NULL,
  `categoria` varchar(50) DEFAULT NULL,
  `kg` decimal(10,2) NOT NULL,
  `precio` decimal(10,2) NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `fecha_venta` date NOT NULL,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `ventas`
--

INSERT INTO `ventas` (`id`, `pedido_id`, `producto`, `categoria`, `kg`, `precio`, `total`, `fecha_venta`, `observaciones`, `created_at`) VALUES
(1, 1, 'Espárragos Verdes', 'Premium', 487.50, 12.50, 6093.75, '2024-01-21', 'Venta realizada con éxito', '2025-11-13 15:19:28'),
(2, 2, 'Espárragos Blancos', 'Extra', 400.00, 11.80, 4720.00, '2024-01-24', 'Entrega parcial del pedido', '2025-11-13 15:19:28'),
(3, 2, 'Espárragos Blancos', 'Extra', 335.00, 11.80, 3953.00, '2024-01-26', 'Completación del pedido', '2025-11-13 15:19:28');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `venta_lotes`
--

CREATE TABLE `venta_lotes` (
  `id` int(11) NOT NULL,
  `venta_id` int(11) NOT NULL,
  `lote_id` int(11) NOT NULL,
  `peso_asignado` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vw_datos_liquidacion`
-- (Véase abajo para la vista actual)
--
DROP TABLE IF EXISTS `vw_datos_liquidacion`;
CREATE TABLE `vw_datos_liquidacion` (
`lote_id` int(11)
,`numero_lote` varchar(50)
,`producto` varchar(100)
,`productor_id` int(11)
,`productor_nombre` varchar(255)
,`peso_inicial` decimal(10,2)
,`estado` enum('pendiente','proceso','liquidado','cancelado')
,`peso_exportable` decimal(32,2)
,`peso_industrial` decimal(32,2)
,`peso_descarte` decimal(32,2)
,`peso_nacional` decimal(32,2)
,`peso_jugo` decimal(32,2)
,`peso_primera` decimal(32,2)
,`peso_segunda` decimal(32,2)
,`peso_tercera` decimal(32,2)
,`peso_cuarta` decimal(32,2)
,`peso_quinta` decimal(32,2)
,`peso_dedos` decimal(32,2)
,`peso_total_kardex` decimal(54,2)
,`total_adelantos` decimal(32,2)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vw_saldos_kardex`
-- (Véase abajo para la vista actual)
--
DROP TABLE IF EXISTS `vw_saldos_kardex`;
CREATE TABLE `vw_saldos_kardex` (
`lote_id` int(11)
,`categoria` enum('exportable','industrial','descarte','nacional','jugo','primera','segunda','tercera','cuarta','quinta','dedos')
,`saldo` decimal(32,2)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_kardex_financiero_saldos`
-- (Véase abajo para la vista actual)
--
DROP TABLE IF EXISTS `v_kardex_financiero_saldos`;
CREATE TABLE `v_kardex_financiero_saldos` (
`cuenta_tipo` enum('caja','banco','adelantos','ventas','produccion')
,`total_ingresos` decimal(34,2)
,`total_egresos` decimal(34,2)
,`saldo_actual` decimal(34,2)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_kardex_fisico_saldos`
-- (Véase abajo para la vista actual)
--
DROP TABLE IF EXISTS `v_kardex_fisico_saldos`;
CREATE TABLE `v_kardex_fisico_saldos` (
`lote_id` int(11)
,`lote_codigo` varchar(50)
,`numero_lote` varchar(50)
,`producto_nombre` varchar(100)
,`producto` varchar(100)
,`categoria_id` int(11)
,`categoria_nombre` varchar(100)
,`total_ingresos` decimal(34,3)
,`total_salidas` decimal(34,3)
,`total_egresos` decimal(34,3)
,`saldo_actual` decimal(34,3)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_kardex_por_documento`
-- (Véase abajo para la vista actual)
--
DROP TABLE IF EXISTS `v_kardex_por_documento`;
CREATE TABLE `v_kardex_por_documento` (
`documento_tipo` varchar(50)
,`documento_numero` varchar(100)
,`documento_id` int(11)
,`fecha_movimiento` datetime
,`persona_nombre` varchar(255)
,`peso_total` decimal(34,3)
,`monto_total` decimal(34,2)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_kardex_por_productor`
-- (Véase abajo para la vista actual)
--
DROP TABLE IF EXISTS `v_kardex_por_productor`;
CREATE TABLE `v_kardex_por_productor` (
`persona_id` int(11)
,`persona_nombre` varchar(255)
,`tipo_kardex` enum('fisico','financiero')
,`tipo_movimiento` enum('ingreso','egreso','salida')
,`documento_tipo` varchar(50)
,`cantidad_movimientos` bigint(21)
,`total_peso_kg` decimal(34,3)
,`total_monto` decimal(34,2)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_kardex_resumen_documentos`
-- (Véase abajo para la vista actual)
--
DROP TABLE IF EXISTS `v_kardex_resumen_documentos`;
CREATE TABLE `v_kardex_resumen_documentos` (
`documento_tipo` varchar(50)
,`documento_numero` varchar(100)
,`documento_id` int(11)
,`fecha_movimiento` datetime
,`persona_nombre` varchar(255)
,`peso_total` decimal(34,3)
,`monto_total` decimal(34,2)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_liquidacion_desde_kardex`
-- (Véase abajo para la vista actual)
--
DROP TABLE IF EXISTS `v_liquidacion_desde_kardex`;
CREATE TABLE `v_liquidacion_desde_kardex` (
`lote_id` int(11)
,`numero_lote` varchar(50)
,`producto` varchar(100)
,`productor_id` int(11)
,`productor_nombre` varchar(255)
,`peso_inicial` decimal(10,2)
,`numero_jabas` int(11)
,`estado_lote` enum('pendiente','proceso','liquidado','cancelado')
,`saldo_exportable` decimal(32,2)
,`saldo_industrial` decimal(32,2)
,`saldo_descarte` decimal(32,2)
,`saldo_nacional` decimal(32,2)
,`saldo_jugo` decimal(32,2)
,`saldo_primera` decimal(32,2)
,`saldo_segunda` decimal(32,2)
,`saldo_tercera` decimal(32,2)
,`saldo_cuarta` decimal(32,2)
,`saldo_quinta` decimal(32,2)
,`saldo_dedos` decimal(32,2)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_pesos_consolidados_lote`
-- (Véase abajo para la vista actual)
--
DROP TABLE IF EXISTS `v_pesos_consolidados_lote`;
CREATE TABLE `v_pesos_consolidados_lote` (
`lote_id` int(11)
,`peso_bruto_total` decimal(32,2)
,`peso_exportable` decimal(32,2)
,`peso_industrial` decimal(32,2)
,`peso_descarte` decimal(32,2)
,`peso_nacional` decimal(32,2)
,`peso_jugo` decimal(32,2)
,`peso_primera` decimal(32,2)
,`peso_segunda` decimal(32,2)
,`peso_tercera` decimal(32,2)
,`peso_cuarta` decimal(32,2)
,`peso_quinta` decimal(32,2)
,`peso_dedos` decimal(32,2)
,`total_registros` bigint(21)
,`ultimo_pesado` date
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_stock_kardex_lote`
-- (Véase abajo para la vista actual)
--
DROP TABLE IF EXISTS `v_stock_kardex_lote`;
CREATE TABLE `v_stock_kardex_lote` (
`lote_id` int(11)
,`numero_lote` varchar(50)
,`producto` varchar(100)
,`productor_id` int(11)
,`productor_nombre` varchar(255)
,`categoria` enum('exportable','industrial','descarte','nacional','jugo','primera','segunda','tercera','cuarta','quinta','dedos')
,`total_ingresos` decimal(32,2)
,`total_salidas` decimal(32,2)
,`saldo_disponible` decimal(32,2)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_stock_real_kardex`
-- (Véase abajo para la vista actual)
--
DROP TABLE IF EXISTS `v_stock_real_kardex`;
CREATE TABLE `v_stock_real_kardex` (
`lote_id` int(11)
,`numero_lote` varchar(50)
,`producto` varchar(100)
,`productor_id` int(11)
,`productor_nombre` varchar(255)
,`categoria` enum('exportable','industrial','descarte','nacional','jugo','primera','segunda','tercera','cuarta','quinta','dedos')
,`total_ingresos` decimal(32,2)
,`total_salidas` decimal(32,2)
,`stock_actual` decimal(32,2)
);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `adelantos`
--
ALTER TABLE `adelantos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `lote_id` (`lote_id`),
  ADD KEY `idx_productor` (`productor_id`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `fk_adelantos_liquidacion` (`liquidacion_id`);

--
-- Indices de la tabla `ajustes_contables`
--
ALTER TABLE `ajustes_contables`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_lote` (`lote_id`),
  ADD KEY `idx_estado` (`estado`);

--
-- Indices de la tabla `categorias_peso`
--
ALTER TABLE `categorias_peso`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo` (`codigo`),
  ADD UNIQUE KEY `uniq_codigo` (`codigo`);

--
-- Indices de la tabla `costos_fijos`
--
ALTER TABLE `costos_fijos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_categoria` (`categoria`);

--
-- Indices de la tabla `empleados`
--
ALTER TABLE `empleados`
  ADD PRIMARY KEY (`id`),
  ADD KEY `persona_id` (`persona_id`),
  ADD KEY `idx_area` (`area`),
  ADD KEY `idx_estado` (`estado`);

--
-- Indices de la tabla `kardex_integral`
--
ALTER TABLE `kardex_integral`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_fecha` (`fecha_movimiento`),
  ADD KEY `idx_tipo_kardex` (`tipo_kardex`),
  ADD KEY `idx_tipo_mov` (`tipo_movimiento`),
  ADD KEY `idx_documento` (`documento_tipo`,`documento_id`),
  ADD KEY `idx_lote` (`lote_id`),
  ADD KEY `idx_categoria` (`categoria_id`),
  ADD KEY `idx_persona` (`persona_id`),
  ADD KEY `idx_fecha_tipo` (`fecha_movimiento`,`tipo_kardex`);

--
-- Indices de la tabla `kardex_lotes`
--
ALTER TABLE `kardex_lotes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_lote` (`lote_id`),
  ADD KEY `idx_categoria` (`categoria`),
  ADD KEY `idx_fecha` (`fecha_movimiento`);

--
-- Indices de la tabla `libro_banco`
--
ALTER TABLE `libro_banco`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_fecha` (`fecha`),
  ADD KEY `idx_rubro` (`rubro`),
  ADD KEY `idx_estado` (`estado`);

--
-- Indices de la tabla `liquidaciones`
--
ALTER TABLE `liquidaciones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_lote_liquidacion` (`lote_id`),
  ADD UNIQUE KEY `ux_liquidaciones_numero_liquidacion` (`numero_liquidacion`);

--
-- Indices de la tabla `liquidaciones_detalle`
--
ALTER TABLE `liquidaciones_detalle`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_liquidacion` (`liquidacion_id`),
  ADD KEY `idx_categoria` (`categoria_id`);

--
-- Indices de la tabla `lotes`
--
ALTER TABLE `lotes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numero_lote` (`numero_lote`),
  ADD UNIQUE KEY `guia_ingreso` (`guia_ingreso`),
  ADD KEY `productor_id` (`productor_id`),
  ADD KEY `idx_numero_lote` (`numero_lote`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `idx_fecha_ingreso` (`fecha_ingreso`);

--
-- Indices de la tabla `pagos_campo`
--
ALTER TABLE `pagos_campo`
  ADD PRIMARY KEY (`id`),
  ADD KEY `productor_id` (`productor_id`),
  ADD KEY `idx_lote` (`lote_id`),
  ADD KEY `idx_estado` (`estado`);

--
-- Indices de la tabla `pedidos`
--
ALTER TABLE `pedidos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `numero_pedido` (`numero_pedido`),
  ADD KEY `cliente_id` (`cliente_id`),
  ADD KEY `idx_numero` (`numero_pedido`),
  ADD KEY `idx_estado` (`estado`);

--
-- Indices de la tabla `pedido_lotes`
--
ALTER TABLE `pedido_lotes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `pedido_id` (`pedido_id`,`lote_id`),
  ADD UNIQUE KEY `uniq_pedido_lote` (`pedido_id`,`lote_id`),
  ADD KEY `lote_id` (`lote_id`),
  ADD KEY `fk_pedido_lotes_categoria` (`categoria_id`);

--
-- Indices de la tabla `personas`
--
ALTER TABLE `personas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `documento_identidad` (`documento_identidad`),
  ADD KEY `idx_documento` (`documento_identidad`),
  ADD KEY `idx_tipo` (`tipo_persona`);

--
-- Indices de la tabla `persona_roles`
--
ALTER TABLE `persona_roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `persona_id` (`persona_id`,`rol_id`),
  ADD KEY `rol_id` (`rol_id`);

--
-- Indices de la tabla `pesos_lote`
--
ALTER TABLE `pesos_lote`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_lote` (`lote_id`),
  ADD KEY `idx_fecha` (`fecha_pesado`);

--
-- Indices de la tabla `pesos_lote_detalle`
--
ALTER TABLE `pesos_lote_detalle`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `peso_lote_id` (`peso_lote_id`,`categoria_id`),
  ADD KEY `idx_pesos_lote_detalle_lote` (`peso_lote_id`),
  ADD KEY `idx_pesos_lote_detalle_categoria` (`categoria_id`);

--
-- Indices de la tabla `planificacion_operativa`
--
ALTER TABLE `planificacion_operativa`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_lote` (`lote_id`),
  ADD KEY `idx_pedido` (`pedido_id`);

--
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo` (`codigo`);

--
-- Indices de la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pedido` (`pedido_id`),
  ADD KEY `idx_fecha` (`fecha_venta`);

--
-- Indices de la tabla `venta_lotes`
--
ALTER TABLE `venta_lotes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `venta_lotes_venta_id_foreign` (`venta_id`),
  ADD KEY `venta_lotes_lote_id_foreign` (`lote_id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `adelantos`
--
ALTER TABLE `adelantos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `ajustes_contables`
--
ALTER TABLE `ajustes_contables`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `categorias_peso`
--
ALTER TABLE `categorias_peso`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT de la tabla `costos_fijos`
--
ALTER TABLE `costos_fijos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `empleados`
--
ALTER TABLE `empleados`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `kardex_integral`
--
ALTER TABLE `kardex_integral`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `kardex_lotes`
--
ALTER TABLE `kardex_lotes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=106;

--
-- AUTO_INCREMENT de la tabla `libro_banco`
--
ALTER TABLE `libro_banco`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `liquidaciones`
--
ALTER TABLE `liquidaciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT de la tabla `liquidaciones_detalle`
--
ALTER TABLE `liquidaciones_detalle`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT de la tabla `lotes`
--
ALTER TABLE `lotes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT de la tabla `pagos_campo`
--
ALTER TABLE `pagos_campo`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `pedidos`
--
ALTER TABLE `pedidos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `pedido_lotes`
--
ALTER TABLE `pedido_lotes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT de la tabla `personas`
--
ALTER TABLE `personas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT de la tabla `persona_roles`
--
ALTER TABLE `persona_roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT de la tabla `pesos_lote`
--
ALTER TABLE `pesos_lote`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT de la tabla `pesos_lote_detalle`
--
ALTER TABLE `pesos_lote_detalle`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=54;

--
-- AUTO_INCREMENT de la tabla `planificacion_operativa`
--
ALTER TABLE `planificacion_operativa`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `ventas`
--
ALTER TABLE `ventas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `venta_lotes`
--
ALTER TABLE `venta_lotes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

-- --------------------------------------------------------

--
-- Estructura para la vista `vw_datos_liquidacion`
--
DROP TABLE IF EXISTS `vw_datos_liquidacion`;

CREATE ALGORITHM=UNDEFINED DEFINER=`fran2869`@`localhost` SQL SECURITY DEFINER VIEW `vw_datos_liquidacion`  AS SELECT `l`.`id` AS `lote_id`, `l`.`numero_lote` AS `numero_lote`, `l`.`producto` AS `producto`, `l`.`productor_id` AS `productor_id`, `p`.`nombre_completo` AS `productor_nombre`, `l`.`peso_inicial` AS `peso_inicial`, `l`.`estado` AS `estado`, coalesce(max(case when `k`.`categoria` = 'exportable' then `k`.`saldo` end),0) AS `peso_exportable`, coalesce(max(case when `k`.`categoria` = 'industrial' then `k`.`saldo` end),0) AS `peso_industrial`, coalesce(max(case when `k`.`categoria` = 'descarte' then `k`.`saldo` end),0) AS `peso_descarte`, coalesce(max(case when `k`.`categoria` = 'nacional' then `k`.`saldo` end),0) AS `peso_nacional`, coalesce(max(case when `k`.`categoria` = 'jugo' then `k`.`saldo` end),0) AS `peso_jugo`, coalesce(max(case when `k`.`categoria` = 'primera' then `k`.`saldo` end),0) AS `peso_primera`, coalesce(max(case when `k`.`categoria` = 'segunda' then `k`.`saldo` end),0) AS `peso_segunda`, coalesce(max(case when `k`.`categoria` = 'tercera' then `k`.`saldo` end),0) AS `peso_tercera`, coalesce(max(case when `k`.`categoria` = 'cuarta' then `k`.`saldo` end),0) AS `peso_cuarta`, coalesce(max(case when `k`.`categoria` = 'quinta' then `k`.`saldo` end),0) AS `peso_quinta`, coalesce(max(case when `k`.`categoria` = 'dedos' then `k`.`saldo` end),0) AS `peso_dedos`, coalesce(sum(`k`.`saldo`),0) AS `peso_total_kardex`, (select coalesce(sum(`a`.`monto`),0) from `adelantos` `a` where `a`.`productor_id` = `l`.`productor_id` and `a`.`estado` = 'pendiente') AS `total_adelantos` FROM ((`lotes` `l` left join `personas` `p` on(`l`.`productor_id` = `p`.`id`)) left join `vw_saldos_kardex` `k` on(`l`.`id` = `k`.`lote_id`)) GROUP BY `l`.`id`, `l`.`numero_lote`, `l`.`producto`, `l`.`productor_id`, `p`.`nombre_completo`, `l`.`peso_inicial`, `l`.`estado` ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vw_saldos_kardex`
--
DROP TABLE IF EXISTS `vw_saldos_kardex`;

CREATE ALGORITHM=UNDEFINED DEFINER=`fran2869`@`localhost` SQL SECURITY DEFINER VIEW `vw_saldos_kardex`  AS SELECT `kardex_lotes`.`lote_id` AS `lote_id`, `kardex_lotes`.`categoria` AS `categoria`, sum(case when `kardex_lotes`.`tipo_movimiento` = 'ingreso' then `kardex_lotes`.`peso` else -`kardex_lotes`.`peso` end) AS `saldo` FROM `kardex_lotes` GROUP BY `kardex_lotes`.`lote_id`, `kardex_lotes`.`categoria` HAVING `saldo` > 0 ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_kardex_financiero_saldos`
--
DROP TABLE IF EXISTS `v_kardex_financiero_saldos`;

CREATE ALGORITHM=UNDEFINED DEFINER=`fran2869`@`localhost` SQL SECURITY DEFINER VIEW `v_kardex_financiero_saldos`  AS SELECT `k`.`cuenta_tipo` AS `cuenta_tipo`, sum(case when `k`.`tipo_movimiento` = 'ingreso' then `k`.`monto` else 0 end) AS `total_ingresos`, sum(case when `k`.`tipo_movimiento` = 'egreso' then `k`.`monto` else 0 end) AS `total_egresos`, sum(case when `k`.`tipo_movimiento` = 'ingreso' then `k`.`monto` else -`k`.`monto` end) AS `saldo_actual` FROM `kardex_integral` AS `k` WHERE `k`.`tipo_kardex` = 'financiero' GROUP BY `k`.`cuenta_tipo` ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_kardex_fisico_saldos`
--
DROP TABLE IF EXISTS `v_kardex_fisico_saldos`;

CREATE ALGORITHM=UNDEFINED DEFINER=`fran2869`@`localhost` SQL SECURITY DEFINER VIEW `v_kardex_fisico_saldos`  AS SELECT `k`.`lote_id` AS `lote_id`, `l`.`numero_lote` AS `lote_codigo`, `l`.`numero_lote` AS `numero_lote`, `l`.`producto` AS `producto_nombre`, `l`.`producto` AS `producto`, `k`.`categoria_id` AS `categoria_id`, `k`.`categoria_nombre` AS `categoria_nombre`, sum(case when `k`.`tipo_movimiento` = 'ingreso' then `k`.`peso_kg` else 0 end) AS `total_ingresos`, sum(case when `k`.`tipo_movimiento` in ('salida','egreso') then `k`.`peso_kg` else 0 end) AS `total_salidas`, sum(case when `k`.`tipo_movimiento` in ('salida','egreso') then `k`.`peso_kg` else 0 end) AS `total_egresos`, sum(case when `k`.`tipo_movimiento` = 'ingreso' then `k`.`peso_kg` when `k`.`tipo_movimiento` in ('salida','egreso') then -`k`.`peso_kg` else 0 end) AS `saldo_actual` FROM (`kardex_integral` `k` left join `lotes` `l` on(`k`.`lote_id` = `l`.`id`)) WHERE `k`.`tipo_kardex` = 'fisico' GROUP BY `k`.`lote_id`, `k`.`categoria_id`, `k`.`categoria_nombre`, `l`.`numero_lote`, `l`.`producto` ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_kardex_por_documento`
--
DROP TABLE IF EXISTS `v_kardex_por_documento`;

CREATE ALGORITHM=UNDEFINED DEFINER=`fran2869`@`localhost` SQL SECURITY DEFINER VIEW `v_kardex_por_documento`  AS SELECT `k`.`documento_tipo` AS `documento_tipo`, `k`.`documento_numero` AS `documento_numero`, `k`.`documento_id` AS `documento_id`, `k`.`fecha_movimiento` AS `fecha_movimiento`, `k`.`persona_nombre` AS `persona_nombre`, sum(case when `k`.`tipo_kardex` = 'fisico' then `k`.`peso_kg` else 0 end) AS `peso_total`, sum(case when `k`.`tipo_kardex` = 'financiero' then `k`.`monto` else 0 end) AS `monto_total` FROM `kardex_integral` AS `k` GROUP BY `k`.`documento_tipo`, `k`.`documento_numero`, `k`.`documento_id`, `k`.`fecha_movimiento`, `k`.`persona_nombre` ORDER BY `k`.`fecha_movimiento` DESC ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_kardex_por_productor`
--
DROP TABLE IF EXISTS `v_kardex_por_productor`;

CREATE ALGORITHM=UNDEFINED DEFINER=`fran2869`@`localhost` SQL SECURITY DEFINER VIEW `v_kardex_por_productor`  AS SELECT `k`.`persona_id` AS `persona_id`, `k`.`persona_nombre` AS `persona_nombre`, `k`.`tipo_kardex` AS `tipo_kardex`, `k`.`tipo_movimiento` AS `tipo_movimiento`, `k`.`documento_tipo` AS `documento_tipo`, count(0) AS `cantidad_movimientos`, sum(ifnull(`k`.`peso_kg`,0)) AS `total_peso_kg`, sum(ifnull(`k`.`monto`,0)) AS `total_monto` FROM `kardex_integral` AS `k` WHERE `k`.`persona_tipo` = 'productor' GROUP BY `k`.`persona_id`, `k`.`persona_nombre`, `k`.`tipo_kardex`, `k`.`tipo_movimiento`, `k`.`documento_tipo` ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_kardex_resumen_documentos`
--
DROP TABLE IF EXISTS `v_kardex_resumen_documentos`;

CREATE ALGORITHM=UNDEFINED DEFINER=`fran2869`@`localhost` SQL SECURITY DEFINER VIEW `v_kardex_resumen_documentos`  AS SELECT `k`.`documento_tipo` AS `documento_tipo`, `k`.`documento_numero` AS `documento_numero`, `k`.`documento_id` AS `documento_id`, `k`.`fecha_movimiento` AS `fecha_movimiento`, `k`.`persona_nombre` AS `persona_nombre`, sum(ifnull(`k`.`peso_kg`,0)) AS `peso_total`, sum(ifnull(`k`.`monto`,0)) AS `monto_total` FROM `kardex_integral` AS `k` GROUP BY `k`.`documento_tipo`, `k`.`documento_numero`, `k`.`documento_id`, `k`.`fecha_movimiento`, `k`.`persona_nombre` ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_liquidacion_desde_kardex`
--
DROP TABLE IF EXISTS `v_liquidacion_desde_kardex`;

CREATE ALGORITHM=UNDEFINED DEFINER=`fran2869`@`localhost` SQL SECURITY DEFINER VIEW `v_liquidacion_desde_kardex`  AS SELECT `k`.`lote_id` AS `lote_id`, `l`.`numero_lote` AS `numero_lote`, `l`.`producto` AS `producto`, `l`.`productor_id` AS `productor_id`, `p`.`nombre_completo` AS `productor_nombre`, `l`.`peso_inicial` AS `peso_inicial`, `l`.`numero_jabas` AS `numero_jabas`, `l`.`estado` AS `estado_lote`, coalesce(sum(case when `k`.`categoria` = 'exportable' then case when `k`.`tipo_movimiento` = 'ingreso' then `k`.`peso` else -`k`.`peso` end else 0 end),0) AS `saldo_exportable`, coalesce(sum(case when `k`.`categoria` = 'industrial' then case when `k`.`tipo_movimiento` = 'ingreso' then `k`.`peso` else -`k`.`peso` end else 0 end),0) AS `saldo_industrial`, coalesce(sum(case when `k`.`categoria` = 'descarte' then case when `k`.`tipo_movimiento` = 'ingreso' then `k`.`peso` else -`k`.`peso` end else 0 end),0) AS `saldo_descarte`, coalesce(sum(case when `k`.`categoria` = 'nacional' then case when `k`.`tipo_movimiento` = 'ingreso' then `k`.`peso` else -`k`.`peso` end else 0 end),0) AS `saldo_nacional`, coalesce(sum(case when `k`.`categoria` = 'jugo' then case when `k`.`tipo_movimiento` = 'ingreso' then `k`.`peso` else -`k`.`peso` end else 0 end),0) AS `saldo_jugo`, coalesce(sum(case when `k`.`categoria` = 'primera' then case when `k`.`tipo_movimiento` = 'ingreso' then `k`.`peso` else -`k`.`peso` end else 0 end),0) AS `saldo_primera`, coalesce(sum(case when `k`.`categoria` = 'segunda' then case when `k`.`tipo_movimiento` = 'ingreso' then `k`.`peso` else -`k`.`peso` end else 0 end),0) AS `saldo_segunda`, coalesce(sum(case when `k`.`categoria` = 'tercera' then case when `k`.`tipo_movimiento` = 'ingreso' then `k`.`peso` else -`k`.`peso` end else 0 end),0) AS `saldo_tercera`, coalesce(sum(case when `k`.`categoria` = 'cuarta' then case when `k`.`tipo_movimiento` = 'ingreso' then `k`.`peso` else -`k`.`peso` end else 0 end),0) AS `saldo_cuarta`, coalesce(sum(case when `k`.`categoria` = 'quinta' then case when `k`.`tipo_movimiento` = 'ingreso' then `k`.`peso` else -`k`.`peso` end else 0 end),0) AS `saldo_quinta`, coalesce(sum(case when `k`.`categoria` = 'dedos' then case when `k`.`tipo_movimiento` = 'ingreso' then `k`.`peso` else -`k`.`peso` end else 0 end),0) AS `saldo_dedos` FROM ((`lotes` `l` left join `kardex_lotes` `k` on(`l`.`id` = `k`.`lote_id`)) left join `personas` `p` on(`l`.`productor_id` = `p`.`id`)) WHERE `l`.`estado` not in ('liquidado','cancelado') GROUP BY `k`.`lote_id`, `l`.`id`, `l`.`numero_lote`, `l`.`producto`, `l`.`productor_id`, `p`.`nombre_completo`, `l`.`peso_inicial`, `l`.`numero_jabas`, `l`.`estado` ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_pesos_consolidados_lote`
--
DROP TABLE IF EXISTS `v_pesos_consolidados_lote`;

CREATE ALGORITHM=UNDEFINED DEFINER=`fran2869`@`localhost` SQL SECURITY DEFINER VIEW `v_pesos_consolidados_lote`  AS SELECT `pesos_lote`.`lote_id` AS `lote_id`, sum(`pesos_lote`.`peso_bruto`) AS `peso_bruto_total`, sum(`pesos_lote`.`peso_exportable`) AS `peso_exportable`, sum(`pesos_lote`.`peso_industrial`) AS `peso_industrial`, sum(`pesos_lote`.`peso_descarte`) AS `peso_descarte`, sum(coalesce(`pesos_lote`.`peso_nacional`,0)) AS `peso_nacional`, sum(coalesce(`pesos_lote`.`peso_jugo`,0)) AS `peso_jugo`, sum(coalesce(`pesos_lote`.`peso_primera`,0)) AS `peso_primera`, sum(coalesce(`pesos_lote`.`peso_segunda`,0)) AS `peso_segunda`, sum(coalesce(`pesos_lote`.`peso_tercera`,0)) AS `peso_tercera`, sum(coalesce(`pesos_lote`.`peso_cuarta`,0)) AS `peso_cuarta`, sum(coalesce(`pesos_lote`.`peso_quinta`,0)) AS `peso_quinta`, sum(coalesce(`pesos_lote`.`peso_dedos`,0)) AS `peso_dedos`, count(0) AS `total_registros`, max(`pesos_lote`.`fecha_pesado`) AS `ultimo_pesado` FROM `pesos_lote` GROUP BY `pesos_lote`.`lote_id` ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_stock_kardex_lote`
--
DROP TABLE IF EXISTS `v_stock_kardex_lote`;

CREATE ALGORITHM=UNDEFINED DEFINER=`fran2869`@`localhost` SQL SECURITY DEFINER VIEW `v_stock_kardex_lote`  AS SELECT `k`.`lote_id` AS `lote_id`, `l`.`numero_lote` AS `numero_lote`, `l`.`producto` AS `producto`, `l`.`productor_id` AS `productor_id`, `p`.`nombre_completo` AS `productor_nombre`, `k`.`categoria` AS `categoria`, sum(case when `k`.`tipo_movimiento` = 'ingreso' then `k`.`peso` else 0 end) AS `total_ingresos`, sum(case when `k`.`tipo_movimiento` = 'salida' then `k`.`peso` else 0 end) AS `total_salidas`, sum(case when `k`.`tipo_movimiento` = 'ingreso' then `k`.`peso` else -`k`.`peso` end) AS `saldo_disponible` FROM ((`kardex_lotes` `k` join `lotes` `l` on(`k`.`lote_id` = `l`.`id`)) left join `personas` `p` on(`l`.`productor_id` = `p`.`id`)) GROUP BY `k`.`lote_id`, `k`.`categoria`, `l`.`numero_lote`, `l`.`producto`, `l`.`productor_id`, `p`.`nombre_completo` ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_stock_real_kardex`
--
DROP TABLE IF EXISTS `v_stock_real_kardex`;

CREATE ALGORITHM=UNDEFINED DEFINER=`fran2869`@`localhost` SQL SECURITY DEFINER VIEW `v_stock_real_kardex`  AS SELECT `k`.`lote_id` AS `lote_id`, `l`.`numero_lote` AS `numero_lote`, `l`.`producto` AS `producto`, `l`.`productor_id` AS `productor_id`, `p`.`nombre_completo` AS `productor_nombre`, `k`.`categoria` AS `categoria`, sum(case when `k`.`tipo_movimiento` = 'ingreso' then `k`.`peso` else 0 end) AS `total_ingresos`, sum(case when `k`.`tipo_movimiento` = 'salida' then `k`.`peso` else 0 end) AS `total_salidas`, sum(case when `k`.`tipo_movimiento` = 'ingreso' then `k`.`peso` else -`k`.`peso` end) AS `stock_actual` FROM ((`kardex_lotes` `k` join `lotes` `l` on(`k`.`lote_id` = `l`.`id`)) join `personas` `p` on(`l`.`productor_id` = `p`.`id`)) GROUP BY `k`.`lote_id`, `k`.`categoria`, `l`.`numero_lote`, `l`.`producto`, `l`.`productor_id`, `p`.`nombre_completo` HAVING `stock_actual` > 0 ;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `adelantos`
--
ALTER TABLE `adelantos`
  ADD CONSTRAINT `adelantos_ibfk_1` FOREIGN KEY (`productor_id`) REFERENCES `personas` (`id`),
  ADD CONSTRAINT `adelantos_ibfk_2` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`),
  ADD CONSTRAINT `fk_adelantos_liquidacion` FOREIGN KEY (`liquidacion_id`) REFERENCES `liquidaciones` (`id`);

--
-- Filtros para la tabla `ajustes_contables`
--
ALTER TABLE `ajustes_contables`
  ADD CONSTRAINT `ajustes_contables_ibfk_1` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`);

--
-- Filtros para la tabla `empleados`
--
ALTER TABLE `empleados`
  ADD CONSTRAINT `empleados_ibfk_1` FOREIGN KEY (`persona_id`) REFERENCES `personas` (`id`);

--
-- Filtros para la tabla `kardex_lotes`
--
ALTER TABLE `kardex_lotes`
  ADD CONSTRAINT `kardex_lotes_ibfk_1` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`);

--
-- Filtros para la tabla `liquidaciones`
--
ALTER TABLE `liquidaciones`
  ADD CONSTRAINT `fk_liquidaciones_lote` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `liquidaciones_ibfk_1` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `liquidaciones_detalle`
--
ALTER TABLE `liquidaciones_detalle`
  ADD CONSTRAINT `liquidaciones_detalle_ibfk_1` FOREIGN KEY (`liquidacion_id`) REFERENCES `liquidaciones` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `lotes`
--
ALTER TABLE `lotes`
  ADD CONSTRAINT `lotes_ibfk_1` FOREIGN KEY (`productor_id`) REFERENCES `personas` (`id`);

--
-- Filtros para la tabla `pagos_campo`
--
ALTER TABLE `pagos_campo`
  ADD CONSTRAINT `pagos_campo_ibfk_1` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`),
  ADD CONSTRAINT `pagos_campo_ibfk_2` FOREIGN KEY (`productor_id`) REFERENCES `personas` (`id`);

--
-- Filtros para la tabla `pedidos`
--
ALTER TABLE `pedidos`
  ADD CONSTRAINT `pedidos_ibfk_1` FOREIGN KEY (`cliente_id`) REFERENCES `personas` (`id`);

--
-- Filtros para la tabla `pedido_lotes`
--
ALTER TABLE `pedido_lotes`
  ADD CONSTRAINT `fk_pedido_lotes_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categorias_peso` (`id`),
  ADD CONSTRAINT `pedido_lotes_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `pedido_lotes_ibfk_2` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `persona_roles`
--
ALTER TABLE `persona_roles`
  ADD CONSTRAINT `persona_roles_ibfk_1` FOREIGN KEY (`persona_id`) REFERENCES `personas` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `persona_roles_ibfk_2` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `pesos_lote`
--
ALTER TABLE `pesos_lote`
  ADD CONSTRAINT `pesos_lote_ibfk_1` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `pesos_lote_detalle`
--
ALTER TABLE `pesos_lote_detalle`
  ADD CONSTRAINT `pesos_lote_detalle_ibfk_1` FOREIGN KEY (`peso_lote_id`) REFERENCES `pesos_lote` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `pesos_lote_detalle_ibfk_2` FOREIGN KEY (`categoria_id`) REFERENCES `categorias_peso` (`id`);

--
-- Filtros para la tabla `planificacion_operativa`
--
ALTER TABLE `planificacion_operativa`
  ADD CONSTRAINT `planificacion_operativa_ibfk_1` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`),
  ADD CONSTRAINT `planificacion_operativa_ibfk_2` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`);

--
-- Filtros para la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD CONSTRAINT `ventas_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`);

--
-- Filtros para la tabla `venta_lotes`
--
ALTER TABLE `venta_lotes`
  ADD CONSTRAINT `venta_lotes_lote_id_foreign` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`),
  ADD CONSTRAINT `venta_lotes_venta_id_foreign` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`) ON DELETE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;