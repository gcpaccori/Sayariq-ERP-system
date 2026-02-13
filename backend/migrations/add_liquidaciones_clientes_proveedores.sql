-- Migration: Add fields for new Liquidaciones system (Clientes & Proveedores)
-- Date: 2026-02-13
-- Description: Add tipo_liquidacion, persona_id, pedido_id, forma_pago and other fields

-- Add new fields to liquidaciones table
ALTER TABLE `liquidaciones` 
ADD COLUMN `tipo_liquidacion` ENUM('proveedor', 'cliente') DEFAULT 'proveedor' AFTER `numero_liquidacion`,
ADD COLUMN `persona_id` INT(11) DEFAULT NULL AFTER `tipo_liquidacion`,
ADD COLUMN `pedido_id` INT(11) DEFAULT NULL AFTER `persona_id`,
ADD COLUMN `forma_pago` VARCHAR(20) DEFAULT NULL AFTER `estado_pago`,
ADD COLUMN `monto_pagado` DECIMAL(10,2) DEFAULT 0.00 AFTER `total_a_pagar`,
ADD COLUMN `fecha_pago` TIMESTAMP NULL DEFAULT NULL AFTER `monto_pagado`,
ADD COLUMN `fecha_cobro` TIMESTAMP NULL DEFAULT NULL AFTER `fecha_pago`,
ADD INDEX `idx_tipo_liquidacion` (`tipo_liquidacion`),
ADD INDEX `idx_persona_id` (`persona_id`),
ADD INDEX `idx_pedido_id` (`pedido_id`);

-- Update estado_pago enum to include new states
ALTER TABLE `liquidaciones` 
MODIFY COLUMN `estado_pago` ENUM(
  'PENDIENTE', 
  'PAGADO', 
  'ANULADO',
  'pendiente_pago',
  'pagado_parcial',
  'pagado_total',
  'pagado_con_adelanto',
  'pendiente_cobro',
  'cobrado_parcial',
  'cobrado_total'
) DEFAULT 'PENDIENTE';

-- Add foreign key constraints (if tables exist)
-- Note: Uncomment these if you want strict foreign key constraints
-- ALTER TABLE `liquidaciones` 
-- ADD CONSTRAINT `fk_liquidaciones_persona` 
--   FOREIGN KEY (`persona_id`) REFERENCES `personas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ALTER TABLE `liquidaciones` 
-- ADD CONSTRAINT `fk_liquidaciones_pedido` 
--   FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index on numero_liquidacion for faster queries
ALTER TABLE `liquidaciones` 
ADD INDEX `idx_numero_liquidacion` (`numero_liquidacion`);

-- Update existing liquidaciones to have tipo_liquidacion = 'proveedor' (default behavior)
-- This ensures backward compatibility
UPDATE `liquidaciones` 
SET `tipo_liquidacion` = 'proveedor' 
WHERE `tipo_liquidacion` IS NULL;

-- Show the updated table structure
SHOW CREATE TABLE `liquidaciones`;
