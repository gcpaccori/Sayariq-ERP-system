-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Servidor: localhost:3306
-- Tiempo de generación: 27-11-2025 a las 02:30:20
-- Versión del servidor: 10.11.14-MariaDB-cll-lve
-- Versión de PHP: 8.4.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


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

DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `acuerdos_precios`
--

CREATE TABLE `acuerdos_precios` (
  `id` int(11) NOT NULL,
  `lote_id` int(11) NOT NULL,
  `moneda` varchar(3) DEFAULT 'PEN',
  `precio_exportable` decimal(10,2) DEFAULT 0.00,
  `precio_industrial_1` decimal(10,2) DEFAULT 0.00,
  `precio_industrial_2` decimal(10,2) DEFAULT 0.00,
  `precio_nacional` decimal(10,2) DEFAULT 0.00,
  `precio_descarte` decimal(10,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `adelantos`
--

CREATE TABLE `adelantos` (
  `id` int(11) NOT NULL,
  `productor_id` int(11) NOT NULL,
  `lote_id` int(11) DEFAULT NULL,
  `monto` decimal(10,2) NOT NULL,
  `fecha_adelanto` date NOT NULL,
  `motivo` text DEFAULT NULL,
  `estado` enum('pendiente','aplicado','cancelado') DEFAULT 'pendiente',
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `adelantos`
--

INSERT INTO `adelantos` (`id`, `productor_id`, `lote_id`, `monto`, `fecha_adelanto`, `motivo`, `estado`, `created_at`) VALUES
(1, 1, 1, 3000.00, '2024-01-10', 'Adelanto para gastos de cosecha', 'aplicado', '2025-11-13 15:19:28'),
(2, 3, 2, 4000.00, '2024-01-12', 'Adelanto programado', 'aplicado', '2025-11-13 15:19:28'),
(3, 6, NULL, 2000.00, '2024-01-14', 'Adelanto por futura cosecha', 'pendiente', '2025-11-13 15:19:28'),
(4, 1, 4, 3500.00, '2024-01-20', 'Adelanto para insumos', 'aplicado', '2025-11-13 15:19:28'),
(5, 3, NULL, 2500.00, '2024-01-22', 'Adelanto personal', 'pendiente', '2025-11-13 15:19:28');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ajustes_contables`
--

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
-- Estructura de tabla para la tabla `categorias`
--

CREATE TABLE `categorias` (
  `id` int(11) NOT NULL,
  `nombre_categoria` varchar(100) NOT NULL,
  `precio_unitario_kg` decimal(10,2) NOT NULL DEFAULT 0.00,
  `descripcion` text DEFAULT NULL,
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `categorias`
--

INSERT INTO `categorias` (`id`, `nombre_categoria`, `precio_unitario_kg`, `descripcion`, `estado`, `created_at`, `updated_at`) VALUES
(1, 'Exportable Premium', 12.50, 'Espárragos verdes de calibre jumbo - exportación premium', 'activo', '2025-11-24 23:54:06', '2025-11-26 17:04:58'),
(2, 'Exportable Estándar', 10.80, 'Espárragos verdes de calibre grande - exportación', 'activo', '2025-11-24 23:54:06', '2025-11-26 17:04:58'),
(3, 'Industrial', 8.50, 'Espárragos verdes de calibre mediano - exportación', 'activo', '2025-11-24 23:54:06', '2025-11-26 17:04:58'),
(4, 'Descarte', 15.20, 'Espárragos blancos premium - exportación', 'activo', '2025-11-24 23:54:06', '2025-11-26 17:04:58'),
(5, 'Exportable Premium', 5.50, 'Producto para procesamiento industrial', 'activo', '2025-11-24 23:59:07', '2025-11-26 17:04:58'),
(6, 'Exportable Estándar', 2.00, 'Producto de descarte - mínimo valor', 'activo', '2025-11-24 23:59:07', '2025-11-26 17:04:58'),
(7, 'Industrial', 4.50, 'Producto para procesamiento industrial', 'activo', '2025-11-24 23:59:07', '2025-11-24 23:59:07'),
(8, 'Descarte', 1.80, 'Producto no apto para venta directa', 'activo', '2025-11-24 23:59:07', '2025-11-24 23:59:07');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `costos_fijos`
--

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
-- Estructura de tabla para la tabla `inspecciones_calidad`
--

CREATE TABLE `inspecciones_calidad` (
  `id` int(11) NOT NULL,
  `lote_id` int(11) NOT NULL,
  `inspector` varchar(100) DEFAULT NULL,
  `fecha_inspeccion` timestamp NULL DEFAULT current_timestamp(),
  `pudricion_blanda` tinyint(1) DEFAULT 0,
  `dano_mecanico` tinyint(1) DEFAULT 0,
  `deshidratado` tinyint(1) DEFAULT 0,
  `observaciones_tecnicas` text DEFAULT NULL,
  `decision_final` enum('APROBADO','OBSERVADO','RECHAZADO') DEFAULT 'APROBADO'
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `kardex_lotes`
--

CREATE TABLE `kardex_lotes` (
  `id` int(11) NOT NULL,
  `lote_id` int(11) NOT NULL,
  `tipo_movimiento` enum('ingreso','salida') NOT NULL,
  `categoria` enum('exportable','industrial','descarte') NOT NULL,
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
(7, 2, 'ingreso', 'descarte', 98.65, '2024-01-19', 'Proceso inicial', 98.65, '2025-11-13 15:19:28');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `libro_banco`
--

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

CREATE TABLE `liquidaciones_detalle` (
  `id` int(11) NOT NULL,
  `liquidacion_id` int(11) NOT NULL,
  `categoria_id` int(11) NOT NULL,
  `peso_categoria_original` decimal(10,2) NOT NULL,
  `peso_ajustado` decimal(10,2) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `lotes`
--

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
(1, 'LOTE-2024-001', 'GI-001-2024', 1, 'Espárragos Verdes', '2024-01-15', '2024-01-16', 1500.50, 1420.75, 120, 'liquidado', 'optimo', 'Producto de buena calidad, tamaño uniforme', '2025-11-13 15:19:28', '2025-11-26 15:51:17', 'TERCERO', '2025-11-23 23:44:59', 'EN_RECEPCION', NULL, NULL),
(2, 'LOTE-2024-002', 'GI-002-2024', 3, 'Espárragos Blancos', '2024-01-18', '2024-01-19', 1800.25, 1705.80, 150, 'liquidado', 'optimo', 'Espárragos frescos, buen calibre', '2025-11-13 15:19:28', '2025-11-26 15:59:44', 'TERCERO', '2025-11-23 23:44:59', 'EN_RECEPCION', NULL, NULL),
(3, 'LOTE-2024-003', 'GI-003-2024', 6, 'Espárragos Verdes', '2024-01-20', NULL, 1200.75, NULL, 95, 'pendiente', 'proximo_vencer', 'Producto necesita procesamiento urgente', '2025-11-13 15:19:28', '2025-11-13 15:19:28', 'TERCERO', '2025-11-23 23:44:59', 'EN_RECEPCION', NULL, NULL),
(4, 'LOTE-2024-004', 'GI-004-2024', 1, 'Espárragos Blancos', '2024-01-22', '2024-01-23', 2000.00, 1890.50, 165, 'pendiente', 'optimo', 'Alta calidad, tamaño premium', '2025-11-13 15:19:28', '2025-11-26 15:48:17', 'TERCERO', '2025-11-23 23:44:59', 'EN_RECEPCION', NULL, NULL),
(5, 'LOTE-2024-005', 'GI-005-2024', 3, 'Espárragos Verdes', '2024-01-25', NULL, 1600.30, NULL, 130, 'pendiente', 'optimo', 'Producto recién cosechado', '2025-11-13 15:19:28', '2025-11-13 15:19:28', 'TERCERO', '2025-11-23 23:44:59', 'EN_RECEPCION', NULL, NULL),
(6, '', '', 2, '', '2025-11-18', NULL, 0.00, NULL, 0, 'pendiente', 'optimo', '2', '2025-11-18 23:34:51', '2025-11-18 23:34:51', 'TERCERO', '2025-11-23 23:44:59', 'EN_RECEPCION', NULL, NULL),
(8, 'LOT-2025-001', 'GI-1763592511886', 3, 'jengibre', '2025-11-19', NULL, 12.00, NULL, 12, 'pendiente', 'optimo', '12', '2025-11-19 22:48:31', '2025-11-19 22:48:31', 'TERCERO', '2025-11-23 23:44:59', 'EN_RECEPCION', NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `movimientos_envases`
--

CREATE TABLE `movimientos_envases` (
  `id` int(11) NOT NULL,
  `lote_id` int(11) NOT NULL,
  `fecha` timestamp NULL DEFAULT current_timestamp(),
  `tipo_movimiento` enum('PRESTAMO_SALIDA','DEVOLUCION_INGRESO','COBRO_PERDIDA') NOT NULL,
  `cantidad` int(11) NOT NULL,
  `observacion` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pagos_campo`
--

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
(5, 'PED-2025-005', 5, 'f', 'Extra', 120.00, 2.50, 117.00, 12.00, 1404.00, '2025-11-19', 'pendiente', '12', '2025-11-19 23:25:24', '2025-11-19 23:25:39');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `personas`
--

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
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `personas`
--

INSERT INTO `personas` (`id`, `nombre_completo`, `documento_identidad`, `tipo_documento`, `telefono`, `email`, `direccion`, `tipo_persona`, `cuenta_bancaria`, `banco`, `estado`, `created_at`, `updated_at`) VALUES
(1, 'María Elena Quispe', '401233', 'DNI', '987654321', 'maria.quispe@email.com', 'Av. Los Olivos 123, Lima', 'cliente', '001-123456-789', 'Banco de la Nación', 'activo', '2025-11-13 15:19:27', '2025-11-13 16:48:57'),
(2, 'Carlos Rodríguez S.A.C.', '20123456789', 'RUC', '012345678', 'ventas@carlosrodriguez.com', 'Calle Las Flores 456, Ica', 'cliente', '001-987654-321', 'BCP', 'activo', '2025-11-13 15:19:27', '2025-11-13 15:19:27'),
(3, 'Juan m', '40876543', 'DNI', '987654322', 'juan.perez@email.com', 'Jr. Union 789, Chincha', 'productor', '001-456789-123', 'Interbank', 'activo', '2025-11-13 15:19:27', '2025-11-19 22:27:19'),
(4, 'Ana María Gómez', '40765432', 'DNI', '987654323', 'ana.gomez@email.com', 'Av. Progreso 321, Pisco', 'empleado', '001-321654-987', 'BBVA', 'activo', '2025-11-13 15:19:27', '2025-11-13 15:19:27'),
(5, 'Distribuidora San Martín', '20198765432', 'RUC', '012345679', 'compras@sanmar.com', 'Carretera Panamericana Km 245, Ica', 'cliente', '001-741852-963', 'Scotiabank', 'activo', '2025-11-13 15:19:27', '2025-11-13 15:19:27'),
(6, 'Roberto Silva Castro', '40654321', 'DNI', '987654324', 'roberto.silva@email.com', 'Mz. L Lt. 15, Villa El Salvador', 'productor', '001-159753-486', 'Banco de la Nación', 'activo', '2025-11-13 15:19:27', '2025-11-13 15:19:27'),
(7, 'Luz Marina Díaz', '40543219', 'DNI', '987654325', 'luz.diaz@email.com', 'Calle Los Pinos 654, Cañete', 'empleado', '001-357159-482', 'BCP', 'activo', '2025-11-13 15:19:27', '2025-11-13 15:19:27'),
(8, 'Agroexportadora Del Sur', '20234567891', 'RUC', '012345680', 'administracion@agroexportadora.com', 'Av. Industrial 789, Arequipa', 'proveedor', '001-852741-963', 'Interbank', 'activo', '2025-11-13 15:19:27', '2025-11-13 15:19:27');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pesos_lote`
--

CREATE TABLE `pesos_lote` (
  `id` int(11) NOT NULL,
  `lote_id` int(11) NOT NULL,
  `fecha_pesado` date NOT NULL,
  `peso_bruto` decimal(10,2) NOT NULL,
  `peso_exportable` decimal(10,2) DEFAULT 0.00,
  `peso_industrial` decimal(10,2) DEFAULT 0.00,
  `peso_descarte` decimal(10,2) DEFAULT 0.00,
  `observaciones` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `pesos_lote`
--

INSERT INTO `pesos_lote` (`id`, `lote_id`, `fecha_pesado`, `peso_bruto`, `peso_exportable`, `peso_industrial`, `peso_descarte`, `observaciones`, `created_at`) VALUES
(1, 1, '2024-01-16', 1500.50, 1100.25, 250.30, 70.20, 'Buen rendimiento en exportable', '2025-11-13 15:19:28'),
(2, 1, '2024-01-17', 1420.75, 1050.50, 280.15, 60.10, 'Segundo pesaje confirmatorio', '2025-11-13 15:19:28'),
(3, 2, '2024-01-19', 1800.25, 1350.75, 320.40, 98.65, 'Proceso en curso', '2025-11-13 15:19:28'),
(5, 2, '2024-01-20', 1705.80, 1280.25, 30200.00, 95.56, 'Pesaje final del lote', '2025-11-13 15:19:28');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `planificacion_operativa`
--

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
-- Estructura de tabla para la tabla `resultados_proceso`
--

CREATE TABLE `resultados_proceso` (
  `id` int(11) NOT NULL,
  `lote_id` int(11) NOT NULL,
  `fecha_proceso` timestamp NULL DEFAULT current_timestamp(),
  `peso_neto_ingreso` decimal(10,2) NOT NULL,
  `peso_exportable` decimal(10,2) DEFAULT 0.00,
  `peso_industrial_1` decimal(10,2) DEFAULT 0.00,
  `peso_industrial_2` decimal(10,2) DEFAULT 0.00,
  `peso_nacional` decimal(10,2) DEFAULT 0.00,
  `peso_descarte` decimal(10,2) DEFAULT 0.00,
  `merma_proceso` decimal(10,2) GENERATED ALWAYS AS (`peso_neto_ingreso` - (`peso_exportable` + `peso_industrial_1` + `peso_industrial_2` + `peso_nacional` + `peso_descarte`)) STORED
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ventas`
--

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
-- Estructura Stand-in para la vista `vw_saldos_kardex`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vw_saldos_kardex` (
`lote_id` int(11)
,`categoria` enum('exportable','industrial','descarte')
,`saldo` decimal(32,2)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_stock_real_kardex`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_stock_real_kardex` (
`lote_id` int(11)
,`numero_lote` varchar(50)
,`producto` varchar(100)
,`productor_id` int(11)
,`productor_nombre` varchar(255)
,`categoria` enum('exportable','industrial','descarte')
,`total_ingresos` decimal(32,2)
,`total_salidas` decimal(32,2)
,`stock_actual` decimal(32,2)
);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `acuerdos_precios`
--
ALTER TABLE `acuerdos_precios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `lote_id` (`lote_id`);

--
-- Indices de la tabla `adelantos`
--
ALTER TABLE `adelantos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `lote_id` (`lote_id`),
  ADD KEY `idx_productor` (`productor_id`),
  ADD KEY `idx_estado` (`estado`);

--
-- Indices de la tabla `ajustes_contables`
--
ALTER TABLE `ajustes_contables`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_lote` (`lote_id`),
  ADD KEY `idx_estado` (`estado`);

--
-- Indices de la tabla `categorias`
--
ALTER TABLE `categorias`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_nombre` (`nombre_categoria`),
  ADD KEY `idx_estado` (`estado`);

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
-- Indices de la tabla `inspecciones_calidad`
--
ALTER TABLE `inspecciones_calidad`
  ADD PRIMARY KEY (`id`),
  ADD KEY `lote_id` (`lote_id`);

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
-- Indices de la tabla `movimientos_envases`
--
ALTER TABLE `movimientos_envases`
  ADD PRIMARY KEY (`id`),
  ADD KEY `lote_id` (`lote_id`);

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
-- Indices de la tabla `personas`
--
ALTER TABLE `personas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `documento_identidad` (`documento_identidad`),
  ADD KEY `idx_documento` (`documento_identidad`),
  ADD KEY `idx_tipo` (`tipo_persona`);

--
-- Indices de la tabla `pesos_lote`
--
ALTER TABLE `pesos_lote`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_lote` (`lote_id`),
  ADD KEY `idx_fecha` (`fecha_pesado`);

--
-- Indices de la tabla `planificacion_operativa`
--
ALTER TABLE `planificacion_operativa`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_lote` (`lote_id`),
  ADD KEY `idx_pedido` (`pedido_id`);

--
-- Indices de la tabla `resultados_proceso`
--
ALTER TABLE `resultados_proceso`
  ADD PRIMARY KEY (`id`),
  ADD KEY `lote_id` (`lote_id`);

--
-- Indices de la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pedido` (`pedido_id`),
  ADD KEY `idx_fecha` (`fecha_venta`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `acuerdos_precios`
--
ALTER TABLE `acuerdos_precios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

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
-- AUTO_INCREMENT de la tabla `categorias`
--
ALTER TABLE `categorias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

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
-- AUTO_INCREMENT de la tabla `inspecciones_calidad`
--
ALTER TABLE `inspecciones_calidad`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `kardex_lotes`
--
ALTER TABLE `kardex_lotes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `libro_banco`
--
ALTER TABLE `libro_banco`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `liquidaciones`
--
ALTER TABLE `liquidaciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `liquidaciones_detalle`
--
ALTER TABLE `liquidaciones_detalle`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT de la tabla `lotes`
--
ALTER TABLE `lotes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `movimientos_envases`
--
ALTER TABLE `movimientos_envases`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `pagos_campo`
--
ALTER TABLE `pagos_campo`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `pedidos`
--
ALTER TABLE `pedidos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `personas`
--
ALTER TABLE `personas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `pesos_lote`
--
ALTER TABLE `pesos_lote`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `planificacion_operativa`
--
ALTER TABLE `planificacion_operativa`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `resultados_proceso`
--
ALTER TABLE `resultados_proceso`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `ventas`
--
ALTER TABLE `ventas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

-- --------------------------------------------------------

--
-- Estructura para la vista `vw_saldos_kardex`
--
DROP TABLE IF EXISTS `vw_saldos_kardex`;

CREATE ALGORITHM=UNDEFINED DEFINER=`fran2869`@`localhost` SQL SECURITY DEFINER VIEW `vw_saldos_kardex`  AS SELECT `kardex_lotes`.`lote_id` AS `lote_id`, `kardex_lotes`.`categoria` AS `categoria`, sum(case when `kardex_lotes`.`tipo_movimiento` = 'ingreso' then `kardex_lotes`.`peso` else -`kardex_lotes`.`peso` end) AS `saldo` FROM `kardex_lotes` GROUP BY `kardex_lotes`.`lote_id`, `kardex_lotes`.`categoria` ;

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
-- Filtros para la tabla `acuerdos_precios`
--
ALTER TABLE `acuerdos_precios`
  ADD CONSTRAINT `acuerdos_precios_ibfk_1` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `adelantos`
--
ALTER TABLE `adelantos`
  ADD CONSTRAINT `adelantos_ibfk_1` FOREIGN KEY (`productor_id`) REFERENCES `personas` (`id`),
  ADD CONSTRAINT `adelantos_ibfk_2` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`);

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
-- Filtros para la tabla `inspecciones_calidad`
--
ALTER TABLE `inspecciones_calidad`
  ADD CONSTRAINT `inspecciones_calidad_ibfk_1` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`) ON DELETE CASCADE;

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
  ADD CONSTRAINT `fk_liquidaciones_detalle_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `liquidaciones_detalle_ibfk_1` FOREIGN KEY (`liquidacion_id`) REFERENCES `liquidaciones` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `liquidaciones_detalle_ibfk_2` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`);

--
-- Filtros para la tabla `lotes`
--
ALTER TABLE `lotes`
  ADD CONSTRAINT `lotes_ibfk_1` FOREIGN KEY (`productor_id`) REFERENCES `personas` (`id`);

--
-- Filtros para la tabla `movimientos_envases`
--
ALTER TABLE `movimientos_envases`
  ADD CONSTRAINT `movimientos_envases_ibfk_1` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`) ON DELETE CASCADE;

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
-- Filtros para la tabla `pesos_lote`
--
ALTER TABLE `pesos_lote`
  ADD CONSTRAINT `pesos_lote_ibfk_1` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `planificacion_operativa`
--
ALTER TABLE `planificacion_operativa`
  ADD CONSTRAINT `planificacion_operativa_ibfk_1` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`),
  ADD CONSTRAINT `planificacion_operativa_ibfk_2` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`);

--
-- Filtros para la tabla `resultados_proceso`
--
ALTER TABLE `resultados_proceso`
  ADD CONSTRAINT `resultados_proceso_ibfk_1` FOREIGN KEY (`lote_id`) REFERENCES `lotes` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD CONSTRAINT `ventas_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
