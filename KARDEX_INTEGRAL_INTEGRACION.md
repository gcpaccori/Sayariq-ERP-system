# INTEGRACIÓN AUTOMÁTICA: LIQUIDACIONES → KARDEX INTEGRAL

## 📌 Objetivo
Conectar el sistema existente de liquidaciones con el nuevo **Kardex Integral** para que todos los movimientos se registren automáticamente.

## 🔄 Flujo de Integración

### 1. Cuando se crea una LIQUIDACIÓN

**Lo que sucede actualmente:**
- Se inserta en `liquidaciones`
- Se registra en `kardex` (tabla antigua)
- Se actualiza `saldo_categoria` en lote

**Lo que debe suceder AHORA:**
- Se inserta en `liquidaciones`
- ✅ **Se registra automáticamente en `kardex_integral`:**
  - **FÍSICO**: INGRESO de productos (se recibe del productor)
  - **FINANCIERO**: EGRESO de dinero (se paga al productor)

### 2. Cuando se crea una VENTA

**Lo que sucede actualmente:**
- Se registra la venta en `ventas`
- Se reduce stock en kardex

**Lo que debe suceder AHORA:**
- Se registra la venta
- ✅ **Se registra automáticamente en `kardex_integral`:**
  - **FÍSICO**: EGRESO de productos (salen del almacén)
  - **FINANCIERO**: INGRESO de dinero (se cobra al cliente)

### 3. Cuando se crea un ADELANTO

**Lo que sucede actualmente:**
- Se registra en `adelantos`

**Lo que debe suceder AHORA:**
- Se registra el adelanto
- ✅ **Se registra automáticamente en `kardex_integral`:**
  - **FINANCIERO**: EGRESO de dinero (se adelanta al productor)

---

## 🛠️ Implementación

### Opción 1: TRIGGERS de Base de Datos (RECOMENDADO)

Ya están implementados en `create_kardex_integral.sql`:

```sql
-- TRIGGER: Cuando se inserta liquidación → registrar en kardex_integral
CREATE TRIGGER trg_after_liquidacion_insert
AFTER INSERT ON liquidaciones
FOR EACH ROW
BEGIN
    -- Llamar procedimiento almacenado
    CALL sp_registrar_liquidacion_kardex(NEW.id, NEW.lote_id, NEW.fecha_liquidacion);
END;
```

✅ **Ventajas:**
- Totalmente automático
- No requiere cambios en código PHP
- Garantiza integridad de datos
- Funciona incluso con inserciones directas en DB

### Opción 2: Modificar Controladores PHP

Si no se pueden usar triggers (por restricciones de hosting), modificar:

**`LiquidacionesController.php`:**

```php
public function create() {
    // ... código existente ...
    
    $liquidacionId = (int)$this->conn->lastInsertId();
    
    // NUEVO: Registrar en Kardex Integral
    require_once __DIR__ . '/KardexIntegralController.php';
    $kardexController = new KardexIntegralController($this->conn);
    
    $kardexData = [
        'liquidacion_id' => $liquidacionId,
        'lote_id' => $data->lote_id,
        'fecha_liquidacion' => $fecha,
        'detalle_categorias' => $data->detalle_categorias,
        'total_a_pagar' => $totalAPagar
    ];
    
    $kardexController->registrarLiquidacion($kardexData);
    
    // ... continuar ...
}
```

### Opción 3: Webhooks/Events (Más complejo)

Implementar un sistema de eventos en el backend.

---

## 📊 Estado Actual

### ✅ Ya implementado:
- [x] Tabla `kardex_integral` con estructura completa
- [x] Procedimientos almacenados: `sp_registrar_liquidacion_kardex`, `sp_registrar_venta_kardex`, `sp_registrar_adelanto_kardex`
- [x] Triggers: `trg_after_liquidacion_insert`, `trg_after_venta_insert`
- [x] Vistas: `v_kardex_fisico_saldos`, `v_kardex_financiero_saldos`
- [x] Controlador PHP: `KardexIntegralController.php` con 14 métodos
- [x] Rutas API: 13 endpoints documentados
- [x] Frontend: TypeScript types, service layer, dashboard completo

### ⏳ Pendiente:
- [ ] Ejecutar migración SQL en la base de datos
- [ ] Verificar que triggers estén activos
- [ ] Probar integración con liquidación real
- [ ] Validar que stock y dinero se actualicen correctamente

---

## 🧪 Cómo Probar

### 1. Ejecutar la migración

```bash
mysql -h sql308.infinityfree.com -u if0_40375920 -p if0_40375920_sayariq < backend/migrations/create_kardex_integral.sql
```

### 2. Crear una liquidación de prueba

Desde el frontend o Postman:

```json
POST /liquidaciones
{
  "lote_id": 1,
  "fecha_liquidacion": "2025-06-10",
  "detalle_categorias": [
    {
      "categoria_id": 1,
      "categoria": "exportable",
      "peso_categoria_original": 100.50,
      "peso_ajustado": 98.00,
      "precio_unitario": 5.50,
      "subtotal": 539.00
    }
  ],
  "costo_flete": 50.00,
  "costo_cosecha": 80.00,
  "costo_maquila": 30.00,
  "descuento_jabas": 10.00,
  "total_adelantos": 200.00,
  "total_bruto_fruta": 539.00,
  "total_a_pagar": 169.00,
  "estado_pago": "PAGADO"
}
```

### 3. Verificar en Kardex Integral

```sql
-- Ver movimientos físicos
SELECT * FROM v_kardex_fisico_saldos WHERE lote_id = 1;

-- Ver movimientos financieros
SELECT * FROM v_kardex_financiero_saldos WHERE cuenta_tipo = 'produccion';

-- Ver todos los movimientos
SELECT * FROM kardex_integral WHERE documento_tipo = 'liquidacion' ORDER BY fecha_movimiento DESC;
```

### 4. En el Dashboard

Ir a: `/kardex-integral` y verificar:
- ✅ Stock debe aumentar (ingreso físico)
- ✅ Saldo en banco debe disminuir (egreso financiero)
- ✅ Movimientos deben aparecer en la tabla

---

## 🚀 Beneficios del Sistema

1. **Doble entrada automática**: Cada liquidación registra físico + financiero
2. **Trazabilidad total**: Se sabe de dónde viene cada kg y cada sol
3. **Reportes en tiempo real**: Dashboard actualizado automáticamente
4. **Estado de cuenta de productores**: Saldo pendiente por pagar
5. **Flujo de caja**: Cuánto ingresa y sale cada mes
6. **Valorización de inventario**: Cuánto vale el stock actual
7. **Auditoría completa**: Cada movimiento tiene fecha, usuario, documento origen

---

## 📝 Notas Técnicas

### Estructura de Movimientos

Cada documento genera 2 movimientos en `kardex_integral`:

**LIQUIDACIÓN #123:**
```
| tipo_kardex  | tipo_movimiento | cantidad | monto    |
|--------------|-----------------|----------|----------|
| fisico       | ingreso         | 100.50   | NULL     |
| financiero   | egreso          | NULL     | 1,250.00 |
```

**VENTA #456:**
```
| tipo_kardex  | tipo_movimiento | cantidad | monto    |
|--------------|-----------------|----------|----------|
| fisico       | egreso          | 50.00    | NULL     |
| financiero   | ingreso         | NULL     | 850.00   |
```

### Cuentas Financieras

- `banco`: Saldo en banco BCP, Interbank, etc.
- `caja`: Efectivo disponible
- `ventas`: Acumulado de ventas (ingreso)
- `produccion`: Acumulado pagado a productores (egreso)

---

## 🔐 Seguridad

- Los triggers garantizan que **SIEMPRE** se registre en kardex integral
- No se puede modificar saldos directamente (se calculan automáticamente)
- Cada movimiento está atado a un documento verificable
- Solo los movimientos tipo "ajuste" se pueden eliminar (con auditoría)

---

## 📞 Soporte

Si algo no funciona:
1. Verificar que las migraciones se ejecutaron correctamente
2. Revisar que los triggers estén activos: `SHOW TRIGGERS;`
3. Verificar logs en `kardex_integral.created_at`
4. Contactar al desarrollador con error específico
