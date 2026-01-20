-- Create adelantos table if not exists
CREATE TABLE IF NOT EXISTS adelantos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    productor_id INT NOT NULL,
    productor_nombre VARCHAR(255),
    monto_original DECIMAL(10, 2) NOT NULL DEFAULT 0,
    monto_descontado DECIMAL(10, 2) NOT NULL DEFAULT 0,
    saldo_pendiente DECIMAL(10, 2) NOT NULL DEFAULT 0,
    concepto TEXT,
    fecha_adelanto DATE,
    estado ENUM('pendiente', 'descontado-parcial', 'descontado-total') DEFAULT 'pendiente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (productor_id) REFERENCES personas(id),
    INDEX idx_productor (productor_id),
    INDEX idx_estado (estado),
    INDEX idx_fecha (fecha_adelanto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
