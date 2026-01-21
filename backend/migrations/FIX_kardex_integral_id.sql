-- =====================================================
-- FIX: Reparar tabla kardex_integral
-- =====================================================
-- Este script corrige el problema de ID y limpia registros duplicados
-- =====================================================

-- 1. Limpiar todos los registros con id = 0
DELETE FROM kardex_integral WHERE id = 0;

-- 2. Agregar PRIMARY KEY con AUTO_INCREMENT directamente
-- (Si ya existe PRIMARY KEY, primero elimínala manualmente en phpMyAdmin)
ALTER TABLE kardex_integral 
  MODIFY id INT(11) NOT NULL AUTO_INCREMENT,
  ADD PRIMARY KEY (id);

-- 3. Resetear el contador AUTO_INCREMENT
ALTER TABLE kardex_integral AUTO_INCREMENT = 1;

-- 4. Verificar la estructura
SHOW CREATE TABLE kardex_integral;

-- =====================================================
-- Ahora ejecuta el script poblar_kardex_integral.sql nuevamente
-- =====================================================
