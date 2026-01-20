-- Base de datos SAYARIQ SYSTEM
CREATE DATABASE IF NOT EXISTS sayariq_system;
USE sayariq_system;

-- Tabla de Personas
CREATE TABLE IF NOT EXISTS personas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(255) NOT NULL,
    documento_identidad VARCHAR(20) UNIQUE NOT NULL,
    tipo_documento ENUM('DNI', 'RUC', 'CE') DEFAULT 'DNI',
    telefono VARCHAR(20),
    email VARCHAR(255),
    direccion TEXT,
    tipo_persona ENUM('productor', 'cliente', 'empleado', 'proveedor') NOT NULL,
    cuenta_bancaria VARCHAR(50),
    banco VARCHAR(100),
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_documento (documento_identidad),
    INDEX idx_tipo (tipo_persona)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Lotes
CREATE TABLE IF NOT EXISTS lotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_lote VARCHAR(50) UNIQUE NOT NULL,
    guia_ingreso VARCHAR(50) UNIQUE NOT NULL,
    productor_id INT NOT NULL,
    producto VARCHAR(100) NOT NULL,
    fecha_ingreso DATE NOT NULL,
    fecha_proceso DATE,
    peso_inicial DECIMAL(10,2) NOT NULL,
    peso_neto DECIMAL(10,2),
    numero_jabas INT,
    estado ENUM('pendiente', 'proceso', 'liquidado', 'cancelado') DEFAULT 'pendiente',
    estado_frescura ENUM('optimo', 'proximo_vencer', 'en_riesgo') DEFAULT 'optimo',
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (productor_id) REFERENCES personas(id),
    INDEX idx_numero_lote (numero_lote),
    INDEX idx_estado (estado),
    INDEX idx_fecha_ingreso (fecha_ingreso)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Pesos por Lote (Registro de Pesos)
CREATE TABLE IF NOT EXISTS pesos_lote (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lote_id INT NOT NULL,
    fecha_pesado DATE NOT NULL,
    peso_bruto DECIMAL(10,2) NOT NULL,
    peso_exportable DECIMAL(10,2) DEFAULT 0,
    peso_industrial DECIMAL(10,2) DEFAULT 0,
    peso_descarte DECIMAL(10,2) DEFAULT 0,
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lote_id) REFERENCES lotes(id) ON DELETE CASCADE,
    INDEX idx_lote (lote_id),
    INDEX idx_fecha (fecha_pesado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Ajustes Contables
CREATE TABLE IF NOT EXISTS ajustes_contables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lote_id INT NOT NULL,
    tipo_ajuste ENUM('por_proceso', 'carga_cerrada') NOT NULL,
    peso_exportable DECIMAL(10,2) DEFAULT 0,
    precio_exportable DECIMAL(10,2) DEFAULT 0,
    monto_exportable DECIMAL(10,2) DEFAULT 0,
    peso_industrial DECIMAL(10,2) DEFAULT 0,
    precio_industrial DECIMAL(10,2) DEFAULT 0,
    monto_industrial DECIMAL(10,2) DEFAULT 0,
    peso_descarte DECIMAL(10,2) DEFAULT 0,
    precio_descarte DECIMAL(10,2) DEFAULT 0,
    monto_descarte DECIMAL(10,2) DEFAULT 0,
    total_proceso DECIMAL(10,2) NOT NULL,
    peso_ingreso DECIMAL(10,2),
    precio_kg DECIMAL(10,2),
    total_carga DECIMAL(10,2),
    fecha_liquidacion DATE,
    serie VARCHAR(50),
    numero_liquidacion VARCHAR(50),
    observaciones TEXT,
    estado ENUM('pendiente', 'aprobado') DEFAULT 'pendiente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lote_id) REFERENCES lotes(id),
    INDEX idx_lote (lote_id),
    INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Adelantos
CREATE TABLE IF NOT EXISTS adelantos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    productor_id INT NOT NULL,
    lote_id INT,
    monto DECIMAL(10,2) NOT NULL,
    fecha_adelanto DATE NOT NULL,
    motivo TEXT,
    estado ENUM('pendiente', 'aplicado', 'cancelado') DEFAULT 'pendiente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (productor_id) REFERENCES personas(id),
    FOREIGN KEY (lote_id) REFERENCES lotes(id),
    INDEX idx_productor (productor_id),
    INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Pagos Campo
CREATE TABLE IF NOT EXISTS pagos_campo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lote_id INT NOT NULL,
    productor_id INT NOT NULL,
    total_liquidacion DECIMAL(10,2) NOT NULL,
    total_adelantos DECIMAL(10,2) DEFAULT 0,
    adelanto_restante DECIMAL(10,2) DEFAULT 0,
    monto_pago DECIMAL(10,2) NOT NULL,
    saldo_pendiente DECIMAL(10,2) DEFAULT 0,
    fecha_pago DATE,
    datos_bancarios TEXT,
    observaciones TEXT,
    estado ENUM('pendiente', 'cancelado', 'deficit') DEFAULT 'pendiente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lote_id) REFERENCES lotes(id),
    FOREIGN KEY (productor_id) REFERENCES personas(id),
    INDEX idx_lote (lote_id),
    INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_pedido VARCHAR(50) UNIQUE NOT NULL,
    cliente_id INT NOT NULL,
    producto VARCHAR(100) NOT NULL,
    categoria VARCHAR(50),
    kg_bruto DECIMAL(10,2) NOT NULL,
    porcentaje_humedad DECIMAL(5,2) DEFAULT 0,
    kg_neto DECIMAL(10,2) NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    fecha_pedido DATE NOT NULL,
    estado ENUM('pendiente', 'proceso', 'completado', 'cancelado') DEFAULT 'pendiente',
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES personas(id),
    INDEX idx_numero (numero_pedido),
    INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Kardex de Lotes
CREATE TABLE IF NOT EXISTS kardex_lotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lote_id INT NOT NULL,
    tipo_movimiento ENUM('ingreso', 'salida') NOT NULL,
    categoria ENUM('exportable', 'industrial', 'descarte') NOT NULL,
    peso DECIMAL(10,2) NOT NULL,
    fecha_movimiento DATE NOT NULL,
    referencia VARCHAR(255),
    saldo_categoria DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lote_id) REFERENCES lotes(id),
    INDEX idx_lote (lote_id),
    INDEX idx_categoria (categoria),
    INDEX idx_fecha (fecha_movimiento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Ventas
CREATE TABLE IF NOT EXISTS ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    producto VARCHAR(100) NOT NULL,
    categoria VARCHAR(50),
    kg DECIMAL(10,2) NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    fecha_venta DATE NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
    INDEX idx_pedido (pedido_id),
    INDEX idx_fecha (fecha_venta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Libro Banco
CREATE TABLE IF NOT EXISTS libro_banco (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL,
    operacion VARCHAR(255) NOT NULL,
    de_quien VARCHAR(255),
    a_quien VARCHAR(255),
    motivo TEXT,
    rubro ENUM('campo', 'economico', 'ventas') NOT NULL,
    tipo_operacion ENUM('adelanto', 'venta', 'pago', 'impuesto', 'otros') NOT NULL,
    numero_operacion VARCHAR(50),
    comprobante VARCHAR(100),
    deudor DECIMAL(10,2) DEFAULT 0,
    acreedor DECIMAL(10,2) DEFAULT 0,
    estado ENUM('cancelado', 'pendiente') DEFAULT 'pendiente',
    agricultor VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fecha (fecha),
    INDEX idx_rubro (rubro),
    INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Costos Fijos
CREATE TABLE IF NOT EXISTS costos_fijos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    concepto VARCHAR(255) NOT NULL,
    categoria ENUM('administrativo', 'alquiler', 'servicios', 'planilla', 'impuestos', 'otros') NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    periodicidad ENUM('mensual', 'anual') DEFAULT 'mensual',
    descripcion TEXT,
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_categoria (categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Personal/Empleados
CREATE TABLE IF NOT EXISTS empleados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    persona_id INT NOT NULL,
    cargo VARCHAR(100) NOT NULL,
    area ENUM('administrativo', 'campo', 'planta', 'ventas') NOT NULL,
    sueldo DECIMAL(10,2),
    fecha_ingreso DATE,
    fecha_salida DATE,
    estado ENUM('activo', 'inactivo') DEFAULT 'activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (persona_id) REFERENCES personas(id),
    INDEX idx_area (area),
    INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Planificación Operativa (Lotes-Pedidos)
CREATE TABLE IF NOT EXISTS planificacion_operativa (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lote_id INT NOT NULL,
    pedido_id INT NOT NULL,
    peso_asignado DECIMAL(10,2) NOT NULL,
    fecha_asignacion DATE NOT NULL,
    estado ENUM('planificado', 'en_proceso', 'completado') DEFAULT 'planificado',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lote_id) REFERENCES lotes(id),
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
    INDEX idx_lote (lote_id),
    INDEX idx_pedido (pedido_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
