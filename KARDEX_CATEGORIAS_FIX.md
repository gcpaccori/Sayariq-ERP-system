# 🔧 FIX: Kardex Integral - Categorías por Lote

## 📋 PROBLEMA RESUELTO

El kardex integral no mostraba las categorías por lote correctamente. Todos los movimientos de liquidaciones aparecían con la categoría "MIXTO" en lugar de mostrar cada categoría individual.

## 🎯 CAUSA RAÍZ

1. **Script de Migración**: El archivo `poblar_kardex_integral.sql` estaba insertando un solo registro agregado por liquidación con `categoria_id = NULL` y `categoria_nombre = 'MIXTO'`, en lugar de insertar un registro por cada categoría desde la tabla `liquidaciones_detalle`.

2. **Helper de PHP**: El `KardexIntegralHelper.php` también insertaba un solo movimiento físico agregado por liquidación, sin desglosar por categorías.

## ✅ SOLUCIÓN IMPLEMENTADA

### 1. Script de Migración (poblar_kardex_integral.sql)

**ANTES** (líneas 17-63):
```sql
SELECT 
  ...
  NULL AS categoria_id,
  'MIXTO' AS categoria_nombre,
  COALESCE(
    (SELECT SUM(ld.peso_ajustado) FROM liquidaciones_detalle ld WHERE ld.liquidacion_id = l.id),
    l.peso_final_ajustado,
    0
  ) AS peso_kg,
  ...
FROM liquidaciones l
LEFT JOIN lotes lt ON l.lote_id = lt.id
```

**DESPUÉS**:
```sql
SELECT 
  ...
  ld.categoria_id,
  cp.nombre AS categoria_nombre,
  ld.peso_ajustado AS peso_kg,
  ...
FROM liquidaciones l
INNER JOIN liquidaciones_detalle ld ON l.id = ld.liquidacion_id
LEFT JOIN categorias_peso cp ON ld.categoria_id = cp.id
LEFT JOIN lotes lt ON l.lote_id = lt.id
WHERE l.id IS NOT NULL AND ld.peso_ajustado > 0
```

### 2. Helper PHP (KardexIntegralHelper.php)

**CAMBIO**: Modificado el método `registrarLiquidacion()` para:

1. Consultar la tabla `liquidaciones_detalle` para obtener todas las categorías de una liquidación
2. Insertar un movimiento físico por cada categoría encontrada
3. Mantener compatibilidad con código antiguo (fallback si no hay detalle)

**Código nuevo**:
```php
// Obtener detalle de categorías desde liquidaciones_detalle
$query = "SELECT ld.categoria_id, cp.nombre AS categoria_nombre, ld.peso_ajustado
          FROM liquidaciones_detalle ld
          LEFT JOIN categorias_peso cp ON ld.categoria_id = cp.id
          WHERE ld.liquidacion_id = :liquidacion_id 
          AND ld.peso_ajustado > 0";
$stmt = $this->conn->prepare($query);
$stmt->execute([':liquidacion_id' => $data['liquidacion_id']]);
$categorias = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Insertar un movimiento físico por cada categoría
foreach ($categorias as $cat) {
    $this->insertarMovimiento([
        'categoria_id' => $cat['categoria_id'],
        'categoria_nombre' => $cat['categoria_nombre'],
        'peso_kg' => $cat['peso_ajustado'],
        // ... otros campos
    ]);
}
```

## 📊 CÓMO VERIFICAR EL FIX

### Opción A: Verificar con Datos Existentes

Si ya tienes liquidaciones en el sistema:

1. **Limpiar kardex actual** (opcional, copia de seguridad primero):
```sql
TRUNCATE TABLE kardex_integral;
```

2. **Ejecutar script de migración actualizado**:
```sql
-- En phpMyAdmin o terminal MySQL
SOURCE /backend/migrations/poblar_kardex_integral.sql;
```

3. **Verificar que ahora hay registros por categoría**:
```sql
SELECT 
    documento_tipo,
    documento_numero,
    categoria_id,
    categoria_nombre,
    peso_kg,
    concepto
FROM kardex_integral
WHERE documento_tipo = 'liquidacion'
ORDER BY documento_id, categoria_nombre;
```

**Resultado esperado**: Verás múltiples filas por cada liquidación, una por cada categoría.

### Opción B: Crear Nueva Liquidación

1. **Crear una nueva liquidación** desde el frontend con múltiples categorías

2. **Verificar en la base de datos**:
```sql
SELECT 
    k.id,
    k.documento_tipo,
    k.documento_numero,
    k.categoria_id,
    k.categoria_nombre,
    k.peso_kg,
    cp.nombre AS categoria_real
FROM kardex_integral k
LEFT JOIN categorias_peso cp ON k.categoria_id = cp.id
WHERE k.documento_tipo = 'liquidacion'
ORDER BY k.documento_id DESC, k.categoria_nombre
LIMIT 20;
```

**Resultado esperado**: La nueva liquidación aparecerá con múltiples registros, uno por categoría.

### Opción C: Verificar en el Frontend

1. **Abrir el Kardex Integral** en el navegador:
   ```
   http://localhost:3000/kardex-integral
   ```

2. **Ir a la pestaña "Stock Físico por Lote y Categoría"**

3. **Verificar que aparecen múltiples filas** para cada lote con diferentes categorías en lugar de una sola fila "MIXTO"

**Resultado esperado**:
```
Lote    | Producto | Categoría   | Stock Actual
--------|----------|-------------|-------------
L-001   | Cacao    | Premium     | 250.5 kg
L-001   | Cacao    | Primera     | 180.0 kg
L-001   | Cacao    | Segunda     | 95.3 kg
L-002   | Cacao    | Premium     | 310.2 kg
...
```

En lugar de:
```
Lote    | Producto | Categoría   | Stock Actual
--------|----------|-------------|-------------
L-001   | Cacao    | MIXTO       | 525.8 kg
L-002   | Cacao    | MIXTO       | 310.2 kg
...
```

## 🔍 QUERIES ÚTILES PARA DEBUG

### Ver detalle de liquidaciones y sus categorías
```sql
SELECT 
    l.id AS liq_id,
    l.numero_liquidacion,
    ld.categoria_id,
    cp.nombre AS categoria,
    ld.peso_ajustado
FROM liquidaciones l
INNER JOIN liquidaciones_detalle ld ON l.id = ld.liquidacion_id
LEFT JOIN categorias_peso cp ON ld.categoria_id = cp.id
ORDER BY l.id DESC, cp.nombre
LIMIT 50;
```

### Comparar kardex vs liquidaciones
```sql
-- Contar registros por liquidación en kardex
SELECT 
    documento_id AS liquidacion_id,
    COUNT(*) AS registros_kardex,
    GROUP_CONCAT(categoria_nombre ORDER BY categoria_nombre) AS categorias
FROM kardex_integral
WHERE documento_tipo = 'liquidacion'
  AND tipo_kardex = 'fisico'
GROUP BY documento_id
ORDER BY documento_id DESC
LIMIT 20;
```

### Ver saldos físicos agrupados por categoría
```sql
SELECT 
    l.numero_lote,
    l.producto,
    k.categoria_id,
    cp.nombre AS categoria_nombre,
    SUM(CASE WHEN k.tipo_movimiento = 'ingreso' THEN k.peso_kg ELSE 0 END) AS ingresos,
    SUM(CASE WHEN k.tipo_movimiento IN ('egreso', 'salida') THEN k.peso_kg ELSE 0 END) AS salidas,
    SUM(CASE WHEN k.tipo_movimiento = 'ingreso' THEN k.peso_kg ELSE -k.peso_kg END) AS saldo
FROM kardex_integral k
LEFT JOIN lotes l ON k.lote_id = l.id
LEFT JOIN categorias_peso cp ON k.categoria_id = cp.id
WHERE k.tipo_kardex = 'fisico'
GROUP BY k.lote_id, k.categoria_id, l.numero_lote, l.producto, cp.nombre
HAVING saldo > 0
ORDER BY l.numero_lote, cp.nombre;
```

## 📝 NOTAS IMPORTANTES

### Compatibilidad hacia atrás
- El código mantiene compatibilidad con liquidaciones antiguas que no tienen detalle
- Si no se encuentra `liquidaciones_detalle`, usa el peso total agregado como antes

### Stored Procedures
- El stored procedure `sp_registrar_liquidacion_kardex` en el archivo `create_kardex_integral.sql` ya estaba correcto (usa cursor para iterar categorías)
- Si usas triggers en lugar del helper PHP, esos triggers deberán actualizarse de manera similar

### Movimientos financieros
- Los movimientos financieros (pago al productor) siguen siendo un solo registro por liquidación
- Solo los movimientos físicos (productos) se desglosan por categoría

### Tipo de movimiento
- Liquidaciones usan `tipo_movimiento = 'egreso'` (el producto sale de la bodega del productor)
- Pesajes usan `tipo_movimiento = 'ingreso'` (el producto entra a tu inventario)
- Este es el comportamiento correcto según la documentación del sistema

## 🚀 PRÓXIMOS PASOS

1. ✅ **Aplicar el fix**: Ya está implementado en los archivos
2. 📊 **Migrar datos**: Ejecutar el script actualizado en la base de datos
3. 🧪 **Probar**: Crear una nueva liquidación y verificar que aparezcan las categorías
4. 📸 **Verificar UI**: Comprobar que el frontend muestra correctamente las categorías

## 🔗 ARCHIVOS MODIFICADOS

1. `/backend/migrations/poblar_kardex_integral.sql` - Query de migración de liquidaciones
2. `/backend/helpers/KardexIntegralHelper.php` - Método `registrarLiquidacion()`

## ✅ RESULTADO FINAL

Después de aplicar este fix:
- ✅ Cada categoría de cada liquidación aparece como un registro separado en kardex_integral
- ✅ El frontend muestra correctamente las categorías individuales por lote
- ✅ Los saldos físicos se calculan correctamente por categoría
- ✅ Los reportes y consultas muestran el desglose por categoría
- ✅ Se mantiene compatibilidad con código y datos antiguos
