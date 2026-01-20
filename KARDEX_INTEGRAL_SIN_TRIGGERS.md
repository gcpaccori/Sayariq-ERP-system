# INTEGRACIÓN SIN TRIGGERS - PARA INFINITYFREE

## 🚨 Problema con Triggers en InfinityFree

InfinityFree y muchos hostings gratuitos **NO PERMITEN triggers** o tienen limitaciones severas con procedimientos almacenados por razones de seguridad y rendimiento.

**Error típico:**
```
#1327 - Variable sin declarar: NEW
#1304 - FUNCTION does not exist
```

## ✅ Solución: Integración desde PHP

En lugar de usar triggers de base de datos, la integración se hará directamente desde los controladores PHP.

---

## 📝 Modificaciones Necesarias en Controladores

### 1. LiquidacionesController.php

**Ubicación:** `backend/controllers/LiquidacionesController.php`

**Modificar el método `create()` para agregar DESPUÉS de crear la liquidación:**

```php
public function create() {
    try {
        $data = json_decode(file_get_contents("php://input"));
        
        // ... código existente de creación de liquidación ...
        
        $this->conn->beginTransaction();
        
        // ... insertar liquidación principal ...
        $liquidacionId = (int)$this->conn->lastInsertId();
        
        // ... insertar detalle_categorias ...
        
        // ✅ NUEVO: Registrar en Kardex Integral
        $this->registrarEnKardexIntegral($liquidacionId, $data);
        
        $this->conn->commit();
        
        http_response_code(201);
        echo json_encode([
            "success" => true, 
            "message" => "Liquidación creada exitosamente",
            "liquidacion_id" => $liquidacionId
        ]);
        
    } catch (Exception $e) {
        $this->conn->rollBack();
        http_response_code(500);
        echo json_encode(["success" => false, "message" => $e->getMessage()]);
    }
}

// ✅ NUEVO MÉTODO: Registrar liquidación en kardex integral
private function registrarEnKardexIntegral($liquidacionId, $data) {
    // 1. Registrar movimientos FÍSICOS (ingresos de productos)
    foreach ($data->detalle_categorias as $detalle) {
        if ($detalle->peso_ajustado <= 0) continue;
        
        // Obtener saldo físico anterior
        $sqlSaldo = "SELECT IFNULL(SUM(
                        CASE 
                            WHEN tipo_movimiento = 'ingreso' THEN peso_kg
                            WHEN tipo_movimiento IN ('salida', 'egreso') THEN -peso_kg
                            ELSE 0
                        END
                     ), 0) as saldo
                     FROM kardex_integral
                     WHERE tipo_kardex = 'fisico'
                       AND lote_id = :lote_id
                       AND categoria_id = :cat_id";
        $stmtSaldo = $this->conn->prepare($sqlSaldo);
        $stmtSaldo->execute([
            ':lote_id' => $data->lote_id,
            ':cat_id' => $detalle->categoria_id
        ]);
        $saldoAnterior = $stmtSaldo->fetch(PDO::FETCH_ASSOC)['saldo'];
        $saldoNuevo = $saldoAnterior + $detalle->peso_ajustado;
        
        // Insertar movimiento físico
        $sqlFisico = "INSERT INTO kardex_integral 
                     (fecha_movimiento, tipo_kardex, tipo_movimiento, 
                      documento_tipo, documento_id, documento_numero,
                      lote_id, categoria_id, categoria_nombre, 
                      peso_kg, saldo_fisico_kg,
                      persona_id, persona_nombre, persona_tipo,
                      concepto, usuario_registro)
                     VALUES
                     (:fecha, 'fisico', 'ingreso',
                      'liquidacion', :liq_id, :liq_num,
                      :lote_id, :cat_id, :cat_nombre,
                      :peso, :saldo,
                      :persona_id, :persona_nombre, 'productor',
                      :concepto, 'sistema')";
        
        $stmtFisico = $this->conn->prepare($sqlFisico);
        $stmtFisico->execute([
            ':fecha' => $data->fecha_liquidacion ?? date('Y-m-d H:i:s'),
            ':liq_id' => $liquidacionId,
            ':liq_num' => $this->obtenerNumeroLiquidacion($liquidacionId),
            ':lote_id' => $data->lote_id,
            ':cat_id' => $detalle->categoria_id,
            ':cat_nombre' => $detalle->nombre_categoria ?? $detalle->categoria ?? 'sin_categoria',
            ':peso' => $detalle->peso_ajustado,
            ':saldo' => $saldoNuevo,
            ':persona_id' => $this->obtenerProductorDeLote($data->lote_id),
            ':persona_nombre' => $this->obtenerNombreProductor($data->lote_id),
            ':concepto' => "Ingreso de productos por liquidación #{$liquidacionId}"
        ]);
    }
    
    // 2. Registrar movimiento FINANCIERO (egreso de dinero)
    if (isset($data->total_a_pagar) && $data->total_a_pagar > 0) {
        // Obtener saldo financiero anterior
        $sqlSaldoFin = "SELECT IFNULL(SUM(
                            CASE 
                                WHEN tipo_movimiento = 'ingreso' THEN monto
                                WHEN tipo_movimiento = 'egreso' THEN -monto
                                ELSE 0
                            END
                         ), 0) as saldo
                         FROM kardex_integral
                         WHERE tipo_kardex = 'financiero'
                           AND cuenta_tipo = 'banco'";
        $stmtSaldoFin = $this->conn->prepare($sqlSaldoFin);
        $stmtSaldoFin->execute();
        $saldoFinAnterior = $stmtSaldoFin->fetch(PDO::FETCH_ASSOC)['saldo'];
        $saldoFinNuevo = $saldoFinAnterior - $data->total_a_pagar;
        
        // Insertar movimiento financiero
        $sqlFinanciero = "INSERT INTO kardex_integral 
                         (fecha_movimiento, tipo_kardex, tipo_movimiento, 
                          documento_tipo, documento_id, documento_numero,
                          cuenta_tipo, monto, saldo_financiero,
                          persona_id, persona_nombre, persona_tipo,
                          concepto, usuario_registro)
                         VALUES
                         (:fecha, 'financiero', 'egreso',
                          'liquidacion', :liq_id, :liq_num,
                          'banco', :monto, :saldo,
                          :persona_id, :persona_nombre, 'productor',
                          :concepto, 'sistema')";
        
        $stmtFinanciero = $this->conn->prepare($sqlFinanciero);
        $stmtFinanciero->execute([
            ':fecha' => $data->fecha_liquidacion ?? date('Y-m-d H:i:s'),
            ':liq_id' => $liquidacionId,
            ':liq_num' => $this->obtenerNumeroLiquidacion($liquidacionId),
            ':monto' => $data->total_a_pagar,
            ':saldo' => $saldoFinNuevo,
            ':persona_id' => $this->obtenerProductorDeLote($data->lote_id),
            ':persona_nombre' => $this->obtenerNombreProductor($data->lote_id),
            ':concepto' => "Pago a productor por liquidación #{$liquidacionId}"
        ]);
    }
}

// Métodos auxiliares
private function obtenerNumeroLiquidacion($liquidacionId) {
    $sql = "SELECT numero_liquidacion FROM liquidaciones WHERE id = :id";
    $stmt = $this->conn->prepare($sql);
    $stmt->execute([':id' => $liquidacionId]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    return $result ? $result['numero_liquidacion'] : "LIQ-{$liquidacionId}";
}

private function obtenerProductorDeLote($loteId) {
    $sql = "SELECT persona_id FROM lotes WHERE id = :id";
    $stmt = $this->conn->prepare($sql);
    $stmt->execute([':id' => $loteId]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    return $result ? $result['persona_id'] : null;
}

private function obtenerNombreProductor($loteId) {
    $sql = "SELECT p.nombre_completo 
            FROM lotes l 
            JOIN personas p ON l.persona_id = p.id 
            WHERE l.id = :id";
    $stmt = $this->conn->prepare($sql);
    $stmt->execute([':id' => $loteId]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    return $result ? $result['nombre_completo'] : 'Sin productor';
}
```

---

### 2. VentasController.php (Si existe)

Similar al anterior, agregar después de crear una venta:

```php
private function registrarVentaEnKardexIntegral($ventaId, $data) {
    // 1. FÍSICO: EGRESO de productos (salen del almacén)
    foreach ($data->detalle_productos as $producto) {
        // Calcular saldo
        // Insertar con tipo_movimiento = 'egreso'
    }
    
    // 2. FINANCIERO: INGRESO de dinero (cobro al cliente)
    // Insertar con cuenta_tipo = 'ventas', tipo_movimiento = 'ingreso'
}
```

---

### 3. AdelantosController.php (Si existe)

```php
private function registrarAdelantoEnKardexIntegral($adelantoId, $data) {
    // FINANCIERO: EGRESO de dinero (adelanto al productor)
    // Insertar con cuenta_tipo = 'banco', tipo_movimiento = 'egreso'
}
```

---

## 🧪 Cómo Probar

1. **Ejecutar el SQL sin triggers:**
   ```sql
   -- Usar: backend/migrations/create_kardex_integral_phpmyadmin.sql
   ```

2. **Modificar LiquidacionesController.php** con el código de arriba

3. **Crear una liquidación de prueba** desde el frontend

4. **Verificar en la base de datos:**
   ```sql
   SELECT * FROM kardex_integral ORDER BY id DESC LIMIT 10;
   ```

5. **Verificar en el dashboard:**
   - Ir a `/kardex-integral`
   - Debe aparecer el movimiento físico (ingreso)
   - Debe aparecer el movimiento financiero (egreso)

---

## 📊 Ventajas de esta Solución

✅ **Funciona en cualquier hosting** (incluso los gratuitos)
✅ **Mayor control** sobre la lógica desde PHP
✅ **Más fácil de debuggear** (no hay triggers "ocultos")
✅ **Transacciones seguras** con rollback completo
✅ **Auditoría clara** en el código PHP

---

## ⚠️ Desventajas vs Triggers

❌ Requiere modificar código PHP existente
❌ Si insertan datos directamente en DB (sin pasar por API), no se registra en kardex
❌ Más código que mantener

**Solución:** Asegurar que TODAS las inserciones pasen por la API REST, nunca directamente en DB.

---

## 🔄 Migración de Datos Antiguos (Opcional)

Si ya tienes liquidaciones creadas y quieres registrarlas en el kardex integral:

```sql
-- Script para migrar liquidaciones existentes (ejecutar UNA sola vez)
INSERT INTO kardex_integral 
(fecha_movimiento, tipo_kardex, tipo_movimiento, documento_tipo, documento_id,
 lote_id, categoria_id, peso_kg, concepto)
SELECT 
  l.fecha_liquidacion,
  'fisico',
  'ingreso',
  'liquidacion',
  l.id,
  l.lote_id,
  dl.categoria_id,
  dl.peso_ajustado,
  CONCAT('Migración liquidación #', l.numero_liquidacion)
FROM liquidaciones l
JOIN detalle_liquidaciones dl ON l.id = dl.liquidacion_id
WHERE l.fecha_liquidacion >= '2025-01-01';  -- Solo del año actual

-- Actualizar saldos físicos
-- (Se recalculan automáticamente en las vistas)
```

---

## 📞 Soporte

Si algo no funciona:
1. Verificar que la tabla `kardex_integral` existe
2. Verificar que las vistas se crearon correctamente
3. Verificar que el método `registrarEnKardexIntegral()` está en el controlador
4. Ver logs de errores en el navegador (F12 → Console)
5. Ver logs de PHP en el servidor
