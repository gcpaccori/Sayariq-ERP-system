-- ============================================================================
-- SAYARIQ SYSTEM V2 -- BASE DE DATOS LIMPIA
-- ============================================================================
-- 5 modulos, 0 views, 0 triggers, 0 stored procedures
-- Solo tablas, foreign keys, indices y datos semilla de categorias
--
-- MODULO 1: PERSONAS  (productores y clientes)
-- MODULO 2: ALMACEN   (lotes, categorias, clasificacion)
-- MODULO 3: PEDIDOS   (pedidos de clientes + asignacion lote<->pedido)
-- MODULO 4: KARDEX    (entradas, salidas, calidades, deudas bidireccionales)
-- MODULO 5: LIQUIDACIONES (productor + cliente, comprobantes, detalle x categoria)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS sayariq_v2
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sayariq_v2;

-- ============================================================================
-- MODULO 1: PERSONAS
-- ============================================================================

CREATE TABLE personas (
  id              INT           AUTO_INCREMENT PRIMARY KEY,
  nombre_completo VARCHAR(255)  NOT NULL,
  tipo_documento  ENUM('DNI','RUC','CE') NOT NULL DEFAULT 'DNI',
  documento       VARCHAR(20)   NOT NULL,
  telefono        VARCHAR(20)   NULL,
  email           VARCHAR(255)  NULL,
  direccion       TEXT          NULL,
  banco           VARCHAR(100)  NULL,
  cuenta_bancaria VARCHAR(50)   NULL,
  cci             VARCHAR(30)   NULL,
  estado          ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_documento (tipo_documento, documento),
  INDEX idx_estado (estado)
) ENGINE=InnoDB;

CREATE TABLE persona_roles (
  id          INT  AUTO_INCREMENT PRIMARY KEY,
  persona_id  INT  NOT NULL,
  rol         ENUM('productor','cliente') NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (persona_id) REFERENCES personas(id) ON UPDATE CASCADE ON DELETE CASCADE,
  UNIQUE KEY uk_persona_rol (persona_id, rol)
) ENGINE=InnoDB;

-- ============================================================================
-- MODULO 2: ALMACEN
-- ============================================================================

CREATE TABLE categorias (
  id          INT           AUTO_INCREMENT PRIMARY KEY,
  codigo      VARCHAR(20)   NOT NULL,
  nombre      VARCHAR(50)   NOT NULL,
  descripcion TEXT          NULL,
  precio_kg   DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Precio referencial por kg',
  orden       INT           NOT NULL DEFAULT 0,
  estado      ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_codigo (codigo),
  INDEX idx_orden (orden)
) ENGINE=InnoDB;

INSERT INTO categorias (codigo, nombre, descripcion, precio_kg, orden) VALUES
  ('exportable', 'Exportable',  'Apto para exportacion',                 8.50,  1),
  ('industrial', 'Industrial',  'Para procesamiento industrial',         3.50,  2),
  ('nacional',   'Nacional',    'Para mercado nacional',                 5.00,  3),
  ('jugo',       'Jugo',        'Para extraccion / molido',              2.50,  4),
  ('descarte',   'Descarte',    'No apto para comercializacion',         1.00,  5),
  ('primera',    'Primera',     'Primera calidad',                       7.00,  6),
  ('segunda',    'Segunda',     'Segunda calidad',                       5.50,  7),
  ('tercera',    'Tercera',     'Tercera calidad',                       4.00,  8),
  ('cuarta',     'Cuarta',      'Cuarta calidad',                        3.00,  9),
  ('quinta',     'Quinta',      'Quinta calidad',                        2.00, 10),
  ('dedos',      'Dedos',       'Raices pequenas o fragmentadas',        1.50, 11);

CREATE TABLE lotes (
  id              INT           AUTO_INCREMENT PRIMARY KEY,
  numero_lote     VARCHAR(50)   NOT NULL,
  productor_id    INT           NOT NULL,
  producto        VARCHAR(100)  NOT NULL,
  fecha_ingreso   DATE          NOT NULL,
  guia_ingreso    VARCHAR(50)   NULL COMMENT 'Guia de remision del productor',
  peso_bruto_ingreso DECIMAL(10,2) NOT NULL COMMENT 'Peso total al ingresar al almacen',
  numero_jabas    INT           NULL DEFAULT 0,
  chofer          VARCHAR(100)  NULL,
  placa_vehiculo  VARCHAR(20)   NULL,
  estado          ENUM('sin_clasificar','clasificado','asignado','liquidado','cancelado')
                  NOT NULL DEFAULT 'sin_clasificar',
  observaciones   TEXT          NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (productor_id) REFERENCES personas(id) ON UPDATE CASCADE,
  UNIQUE KEY uk_numero_lote (numero_lote),
  INDEX idx_estado (estado),
  INDEX idx_fecha (fecha_ingreso),
  INDEX idx_productor (productor_id)
) ENGINE=InnoDB;

CREATE TABLE lote_clasificacion (
  id            INT           AUTO_INCREMENT PRIMARY KEY,
  lote_id       INT           NOT NULL,
  categoria_id  INT           NOT NULL,
  peso_bruto    DECIMAL(10,2) NOT NULL COMMENT 'Peso bruto de esta categoria',
  numero_jabas  INT           NOT NULL DEFAULT 0,
  peso_jabas    DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Peso descontado por jabas',
  porcentaje_humedad DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  peso_descuento_humedad DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  peso_neto     DECIMAL(10,2) NOT NULL COMMENT 'Peso final = bruto - jabas - humedad',
  fecha_clasificacion DATE    NOT NULL,
  observaciones TEXT          NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lote_id)      REFERENCES lotes(id)      ON UPDATE CASCADE,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON UPDATE CASCADE,
  UNIQUE KEY uk_lote_cat (lote_id, categoria_id),
  INDEX idx_lote (lote_id),
  INDEX idx_categoria (categoria_id)
) ENGINE=InnoDB;

-- ============================================================================
-- MODULO 3: PEDIDOS Y ASIGNACION
-- ============================================================================

CREATE TABLE pedidos (
  id              INT           AUTO_INCREMENT PRIMARY KEY,
  numero_pedido   VARCHAR(50)   NOT NULL,
  cliente_id      INT           NOT NULL,
  producto        VARCHAR(100)  NOT NULL,
  categoria_id    INT           NULL COMMENT 'Categoria/calidad solicitada (puede ser NULL si acepta varias)',
  kg_solicitados  DECIMAL(10,2) NOT NULL,
  precio_kg       DECIMAL(10,2) NOT NULL COMMENT 'Precio pactado por kg',
  total_estimado  DECIMAL(10,2) NOT NULL COMMENT 'kg_solicitados x precio_kg',
  fecha_pedido    DATE          NOT NULL,
  fecha_entrega   DATE          NULL COMMENT 'Fecha comprometida de entrega',
  estado          ENUM('pendiente','en_proceso','completado','cancelado')
                  NOT NULL DEFAULT 'pendiente',
  observaciones   TEXT          NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id)   REFERENCES personas(id)    ON UPDATE CASCADE,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id)  ON UPDATE CASCADE,
  UNIQUE KEY uk_numero_pedido (numero_pedido),
  INDEX idx_estado (estado),
  INDEX idx_cliente (cliente_id),
  INDEX idx_fecha (fecha_pedido)
) ENGINE=InnoDB;

CREATE TABLE pedido_asignaciones (
  id              INT           AUTO_INCREMENT PRIMARY KEY,
  pedido_id       INT           NOT NULL,
  lote_id         INT           NOT NULL,
  categoria_id    INT           NOT NULL,
  kg_asignados    DECIMAL(10,2) NOT NULL,
  precio_kg       DECIMAL(10,2) NOT NULL COMMENT 'Precio real de esta asignacion',
  subtotal        DECIMAL(10,2) NOT NULL COMMENT 'kg_asignados x precio_kg',
  fecha_asignacion DATE         NOT NULL,
  observaciones   TEXT          NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pedido_id)    REFERENCES pedidos(id)     ON UPDATE CASCADE,
  FOREIGN KEY (lote_id)      REFERENCES lotes(id)       ON UPDATE CASCADE,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id)  ON UPDATE CASCADE,
  INDEX idx_pedido (pedido_id),
  INDEX idx_lote (lote_id),
  INDEX idx_categoria (categoria_id)
) ENGINE=InnoDB;

-- ============================================================================
-- MODULO 4: KARDEX GENERAL
-- ============================================================================

CREATE TABLE kardex (
  id                INT           AUTO_INCREMENT PRIMARY KEY,
  fecha             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tipo_kardex       ENUM('producto','dinero') NOT NULL,
  tipo_movimiento   ENUM('entrada','clasificacion','salida','ingreso','egreso') NOT NULL,
  origen            ENUM('lote_ingreso','clasificacion','asignacion_pedido',
                         'liquidacion_productor','liquidacion_cliente',
                         'adelanto','pago_directo','ajuste') NOT NULL,
  origen_id         INT           NULL COMMENT 'ID del registro origen (lote, liquidacion, etc.)',
  origen_numero     VARCHAR(100)  NULL COMMENT 'Numero legible del documento origen',
  lote_id           INT           NULL,
  categoria_id      INT           NULL,
  peso_kg           DECIMAL(12,3) NULL DEFAULT 0.000,
  monto             DECIMAL(12,2) NULL DEFAULT 0.00,
  persona_id        INT           NULL,
  concepto          VARCHAR(255)  NOT NULL,
  observaciones     TEXT          NULL,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lote_id)      REFERENCES lotes(id)      ON UPDATE CASCADE ON DELETE SET NULL,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON UPDATE CASCADE ON DELETE SET NULL,
  FOREIGN KEY (persona_id)   REFERENCES personas(id)   ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX idx_fecha (fecha),
  INDEX idx_tipo_kardex (tipo_kardex),
  INDEX idx_tipo_mov (tipo_movimiento),
  INDEX idx_origen (origen, origen_id),
  INDEX idx_lote (lote_id),
  INDEX idx_categoria (categoria_id),
  INDEX idx_persona (persona_id),
  INDEX idx_fecha_tipo (fecha, tipo_kardex)
) ENGINE=InnoDB;

-- ============================================================================
-- MODULO 5: LIQUIDACIONES
-- ============================================================================

CREATE TABLE liquidaciones (
  id                  INT           AUTO_INCREMENT PRIMARY KEY,
  numero_liquidacion  VARCHAR(50)   NOT NULL,
  tipo                ENUM('productor','cliente') NOT NULL,
  persona_id          INT           NOT NULL,
  lote_id             INT           NULL COMMENT 'Para liquidaciones de productor',
  pedido_id           INT           NULL COMMENT 'Para liquidaciones de cliente',
  fecha_liquidacion   DATE          NOT NULL,
  serie_comprobante   VARCHAR(10)   NULL,
  numero_comprobante  VARCHAR(30)   NULL,
  tipo_comprobante    ENUM('factura','boleta','recibo','nota_credito','ninguno')
                      NULL DEFAULT 'ninguno',
  total_bruto         DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Suma de subtotales de detalle',
  costo_flete         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  costo_cosecha       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  costo_maquila       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  descuento_jabas     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  otros_descuentos    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_descuentos    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_adelantos     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_a_pagar       DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'total_bruto - descuentos - adelantos',
  estado              ENUM('borrador','confirmada','anulada') NOT NULL DEFAULT 'borrador',
  estado_pago         ENUM('pendiente','parcial','pagado','cobrado') NOT NULL DEFAULT 'pendiente',
  forma_pago          ENUM('efectivo','transferencia','cheque','mixto') NULL,
  monto_pagado        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  fecha_pago          DATE          NULL,
  observaciones       TEXT          NULL,
  created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (persona_id) REFERENCES personas(id)  ON UPDATE CASCADE,
  FOREIGN KEY (lote_id)    REFERENCES lotes(id)      ON UPDATE CASCADE,
  FOREIGN KEY (pedido_id)  REFERENCES pedidos(id)    ON UPDATE CASCADE,
  UNIQUE KEY uk_numero_liq (numero_liquidacion),
  INDEX idx_tipo (tipo),
  INDEX idx_persona (persona_id),
  INDEX idx_estado (estado),
  INDEX idx_estado_pago (estado_pago),
  INDEX idx_fecha (fecha_liquidacion)
) ENGINE=InnoDB;

CREATE TABLE liquidacion_detalle (
  id                  INT           AUTO_INCREMENT PRIMARY KEY,
  liquidacion_id      INT           NOT NULL,
  categoria_id        INT           NOT NULL,
  peso_bruto          DECIMAL(10,2) NOT NULL,
  numero_jabas        INT           NOT NULL DEFAULT 0,
  peso_jabas          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  porcentaje_humedad  DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
  peso_descuento_humedad DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  peso_neto           DECIMAL(10,2) NOT NULL COMMENT 'Peso final despues de descuentos',
  precio_kg           DECIMAL(10,2) NOT NULL,
  subtotal            DECIMAL(10,2) NOT NULL COMMENT 'peso_neto x precio_kg',
  created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (liquidacion_id) REFERENCES liquidaciones(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (categoria_id)   REFERENCES categorias(id)    ON UPDATE CASCADE,
  INDEX idx_liquidacion (liquidacion_id),
  INDEX idx_categoria (categoria_id)
) ENGINE=InnoDB;

CREATE TABLE adelantos (
  id              INT           AUTO_INCREMENT PRIMARY KEY,
  productor_id    INT           NOT NULL,
  lote_id         INT           NULL COMMENT 'Si el adelanto va contra un lote especifico',
  monto           DECIMAL(10,2) NOT NULL,
  fecha           DATE          NOT NULL,
  motivo          TEXT          NULL,
  estado          ENUM('pendiente','aplicado','cancelado') NOT NULL DEFAULT 'pendiente',
  liquidacion_id  INT           NULL COMMENT 'Liquidacion en la que se aplico',
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (productor_id)   REFERENCES personas(id)       ON UPDATE CASCADE,
  FOREIGN KEY (lote_id)        REFERENCES lotes(id)          ON UPDATE CASCADE ON DELETE SET NULL,
  FOREIGN KEY (liquidacion_id) REFERENCES liquidaciones(id)  ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX idx_productor (productor_id),
  INDEX idx_estado (estado),
  INDEX idx_lote (lote_id)
) ENGINE=InnoDB;

-- ============================================================================
-- FIN DEL SCHEMA — 11 tablas, 0 views, 0 triggers, 0 stored procedures
-- ============================================================================
