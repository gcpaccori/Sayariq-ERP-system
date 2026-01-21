# 🔗 GUÍA DE INTEGRACIÓN: Kardex Integral con Módulos Existentes

## 📋 PROBLEMA IDENTIFICADO

Tu sistema tiene **2 kardex paralelos**:
- ✅ `kardex_lotes` (antiguo) - Actualmente en uso
- ❌ `kardex_integral` (nuevo) - NO integrado

Los módulos del sidebar (Liquidaciones, Ventas, Adelantos, etc.) **NO** están registrando en `kardex_integral`.

---

## 🎯 SOLUCIÓN: Helper Centralizado

He creado `/backend/helpers/KardexIntegralHelper.php` que facilita el registro en kardex desde cualquier controlador.

---

## 📦 PASO 1: Incluir el Helper

### En `/backend/routes/api.php`:

Agregar al inicio (después de los controllers):

```php
require_once '../helpers/KardexIntegralHelper.php';
```

---

## 🔧 PASO 2: Modificar Controladores

### A) LiquidacionesController.php

**Ubicación**: Después de crear la liquidación (línea ~420)

**ANTES**:
```php
$this->conn->commit();

http_response_code(201);
echo json_encode([
    "success" => true,
    "message" => "Liquidación creada exitosamente",
    "liquidacion_id" => $liquidacionId,
    "numero_liquidacion" => $numeroLiquidacion
]);
```

**DESPUÉS**:
```php
// ✨ NUEVO: Registrar en kardex integral
$kardexHelper = new KardexIntegralHelper($this->conn);
$kardexHelper->registrarLiquidacion([
    'liquidacion_id' => $liquidacionId,
    'numero_liquidacion' => $numeroLiquidacion,
    'fecha_liquidacion' => $fecha,
    'lote_id' => (int)$data->lote_id,
    'lote_nombre' => $loteNombre ?? 'N/A',  // Obtener del query del lote
    'productor_id' => $productorId,
    'productor_nombre' => $productorNombre,  // Obtener del query
    'peso_total' => $totalBrutoFruta,
    'total_pagar' => $totalAPagar,
    'forma_pago' => 'banco',  // o 'caja' según tu lógica
    'observaciones' => $data->observaciones ?? null
]);

$this->conn->commit();

http_response_code(201);
echo json_encode([
    "success" => true,
    "message" => "Liquidación creada exitosamente",
    "liquidacion_id" => $liquidacionId,
    "numero_liquidacion" => $numeroLiquidacion
]);
```

---

### B) VentasController.php

**Ubicación**: En el método `create()`, después de insertar la venta

**AGREGAR**:
```php
// Después de: $ventaId = (int)$this->conn->lastInsertId();

// ✨ Registrar en kardex integral
$kardexHelper = new KardexIntegralHelper($this->conn);
$kardexHelper->registrarVenta([
    'venta_id' => $ventaId,
    'numero_factura' => $data->numero_factura ?? 'VENTA-' . $ventaId,
    'fecha_venta' => $data->fecha_venta ?? date('Y-m-d H:i:s'),
    'lote_id' => $data->lote_id ?? null,
    'categoria_id' => $data->categoria_id ?? null,
    'categoria_nombre' => $data->categoria_nombre ?? 'N/A',
    'peso_kg' => $data->peso_kg,
    'cliente_id' => $data->cliente_id,
    'cliente_nombre' => $data->cliente_nombre ?? 'Cliente',
    'monto_total' => $data->monto_total,
    'forma_pago' => $data->forma_pago ?? 'banco'
]);
```

---

### C) AdelantosController.php

**Ubicación**: En el método `create()`, después de insertar el adelanto

**AGREGAR**:
```php
// Después de: $adelantoId = (int)$this->conn->lastInsertId();

// ✨ Registrar en kardex integral
$kardexHelper = new KardexIntegralHelper($this->conn);
$kardexHelper->registrarAdelanto([
    'adelanto_id' => $adelantoId,
    'fecha_adelanto' => $data->fecha_adelanto ?? date('Y-m-d'),
    'productor_id' => $data->productor_id,
    'productor_nombre' => $data->productor_nombre ?? 'Productor',
    'monto' => $data->monto,
    'motivo' => $data->motivo ?? null
]);
```

---

### D) PesosController.php o ClasificacionController.php

**Ubicación**: Después de registrar un pesaje/clasificación

**AGREGAR**:
```php
// Después de insertar el peso

// ✨ Registrar en kardex integral
$kardexHelper = new KardexIntegralHelper($this->conn);
$kardexHelper->registrarPesaje([
    'peso_id' => $pesoId,
    'fecha_registro' => $data->fecha_registro ?? date('Y-m-d H:i:s'),
    'lote_id' => $data->lote_id,
    'lote_nombre' => $data->lote_nombre ?? 'Lote',
    'categoria_id' => $data->categoria_id,
    'categoria_nombre' => $data->categoria_nombre,
    'peso_kg' => $data->peso_kg,
    'productor_id' => $data->productor_id ?? null,
    'productor_nombre' => $data->productor_nombre ?? null
]);
```

---

## 📊 PASO 3: Migrar Datos Históricos

Después de integrar el helper, ejecuta:

```sql
-- Archivo: /backend/migrations/poblar_kardex_integral.sql
```

Esto migrará todos los registros históricos al nuevo kardex.

---

## ✅ PASO 4: Verificar Integración

### Prueba 1: Crear una nueva liquidación

1. Ve al módulo de Liquidaciones
2. Crea una liquidación nueva
3. Verifica en phpMyAdmin:
   ```sql
   SELECT * FROM kardex_integral 
   WHERE documento_tipo = 'liquidacion' 
   ORDER BY id DESC LIMIT 5;
   ```
4. Deberías ver **2 registros nuevos**:
   - Movimiento físico (egreso de kg)
   - Movimiento financiero (egreso de dinero)

### Prueba 2: Crear una venta

1. Registra una venta desde el módulo
2. Verifica:
   ```sql
   SELECT * FROM kardex_integral 
   WHERE documento_tipo = 'venta' 
   ORDER BY id DESC LIMIT 5;
   ```
3. Deberías ver **2 registros**:
   - Movimiento físico (salida de kg)
   - Movimiento financiero (ingreso de dinero)

### Prueba 3: Dar un adelanto

1. Registra un adelanto
2. Verifica:
   ```sql
   SELECT * FROM kardex_integral 
   WHERE documento_tipo = 'adelanto' 
   ORDER BY id DESC LIMIT 5;
   ```
3. Deberías ver **1 registro**:
   - Movimiento financiero (egreso de dinero)

---

## 🔄 FLUJO COMPLETO INTEGRADO

```
Usuario crea liquidación
    ↓
LiquidacionesController::create()
    ↓
1. Inserta en tabla 'liquidaciones' ✅
2. Inserta en tabla 'liquidaciones_detalle' ✅
3. Inserta en 'kardex_lotes' (antiguo) ✅
4. ✨ NUEVO: Llama a KardexIntegralHelper::registrarLiquidacion()
    ↓
    a) Inserta movimiento FÍSICO en kardex_integral
    b) Inserta movimiento FINANCIERO en kardex_integral
    c) Calcula y actualiza saldos automáticamente
    ↓
kardex_integral actualizado ✅
    ↓
Frontend (Kardex Integral ERP) muestra datos en tiempo real ✅
```

---

## 📌 VENTAJAS DE ESTA INTEGRACIÓN

1. ✅ **Un solo punto de verdad**: kardex_integral tiene TODO
2. ✅ **Saldos calculados automáticamente**
3. ✅ **Movimientos físicos + financieros unificados**
4. ✅ **Trazabilidad completa**: cada movimiento enlazado a su documento origen
5. ✅ **Dashboard en tiempo real**: estadísticas actualizadas automáticamente
6. ✅ **Histórico completo**: se puede ver todo el flujo de operaciones

---

## 🚨 IMPORTANTE

### Mantener kardex_lotes (por ahora)

NO elimines `kardex_lotes` todavía porque:
- Tus módulos actuales lo usan
- Puede tener lógica específica de lotes
- La migración debe ser gradual

### Estrategia recomendada:

1. ✅ **AHORA**: Agregar helper para que ambos kardex se actualicen
2. ✅ **Después**: Migrar datos históricos
3. ✅ **Futuro**: Verificar que todo funciona correctamente
4. ✅ **Opcional**: Eventualmente, eliminar kardex_lotes si ya no lo necesitas

---

## 📝 CÓDIGO DE EJEMPLO COMPLETO

### Modificación en LiquidacionesController.php

```php
public function create() {
    try {
        $this->conn->beginTransaction();
        
        // ... todo tu código existente ...
        
        // AL FINAL, ANTES DE commit():
        
        // ✨ Registrar en kardex integral
        require_once '../helpers/KardexIntegralHelper.php';
        $kardexHelper = new KardexIntegralHelper($this->conn);
        
        // Obtener info del lote y productor
        $queryInfo = "SELECT l.nombre as lote_nombre, l.productor_id,
                             p.nombre_completo as productor_nombre
                      FROM lotes l
                      LEFT JOIN personas p ON l.productor_id = p.id
                      WHERE l.id = :lote_id";
        $stmtInfo = $this->conn->prepare($queryInfo);
        $stmtInfo->execute([':lote_id' => $data->lote_id]);
        $info = $stmtInfo->fetch(PDO::FETCH_ASSOC);
        
        $kardexHelper->registrarLiquidacion([
            'liquidacion_id' => $liquidacionId,
            'numero_liquidacion' => $numeroLiquidacion,
            'fecha_liquidacion' => $fecha,
            'lote_id' => (int)$data->lote_id,
            'lote_nombre' => $info['lote_nombre'] ?? 'N/A',
            'productor_id' => $info['productor_id'],
            'productor_nombre' => $info['productor_nombre'],
            'peso_total' => $totalBrutoFruta,
            'total_pagar' => $totalAPagar,
            'forma_pago' => 'banco',
            'observaciones' => $data->observaciones ?? null
        ]);
        
        $this->conn->commit();
        
        // ... respuesta exitosa ...
        
    } catch (Exception $e) {
        // ... manejo de error ...
    }
}
```

---

## 🎓 PREGUNTAS FRECUENTES

### ¿Por qué no usar triggers?

Los triggers pueden:
- Ser más difíciles de depurar
- Tener problemas con transacciones
- No funcionar en ciertos entornos

El helper PHP te da:
- ✅ Control total
- ✅ Fácil debug
- ✅ Mejor manejo de errores

### ¿Qué pasa si falla el registro en kardex?

El helper captura errores y los registra en log, pero **NO** interrumpe la operación principal. Esto evita que una liquidación falle solo porque falló el kardex.

### ¿Debo modificar TODOS los controladores?

Prioriza:
1. **Alta prioridad**: Liquidaciones, Ventas, Adelantos
2. **Media prioridad**: Pesajes, Clasificación
3. **Baja prioridad**: Ajustes manuales, correcciones

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] Crear archivo `/backend/helpers/KardexIntegralHelper.php`
- [ ] Incluir helper en `/backend/routes/api.php`
- [ ] Modificar `LiquidacionesController.php`
- [ ] Modificar `VentasController.php`
- [ ] Modificar `AdelantosController.php`
- [ ] Modificar controladores de pesajes
- [ ] Ejecutar script de migración de datos históricos
- [ ] Probar creando una liquidación nueva
- [ ] Probar creando una venta nueva
- [ ] Verificar datos en kardex_integral
- [ ] Verificar frontend muestra datos correctos
- [ ] Documentar cambios para el equipo

---

**¿Necesitas ayuda con algún paso específico?** Puedo:
1. Modificar los controladores específicos que necesites
2. Crear tests de verificación
3. Agregar más métodos al helper según tus necesidades
