# =====================================================
# DOCUMENTACIÓN COMPLETA: KARDEX INTEGRAL
# =====================================================
# Sistema Sayariq ERP v2.0
# Fecha: 2026-01-20
# =====================================================

## 📋 CONCEPTO FUNDAMENTAL

### La Liquidación es una COMPRA, no una venta

Cuando liquidamos al productor:
- 💰 **Financiero**: Sale dinero (EGRESO - pagamos al productor)
- 📦 **Físico**: Entra producto (INGRESO - compramos su cosecha)

El producto pasa a ser de nuestra propiedad.

---

## 🗄️ ESTRUCTURA DEL KARDEX INTEGRAL

### Tabla Principal: `kardex_integral`

```sql
- id
- fecha_movimiento
- tipo_kardex: 'fisico' | 'financiero'
- tipo_movimiento: 'ingreso' | 'egreso' | 'salida'
- documento_tipo: 'liquidacion' | 'venta' | 'adelanto' | 'pesaje' | 'ajuste'
- documento_id
- documento_numero

-- CAMPOS FÍSICOS (productos)
- lote_id
- categoria_id
- categoria_nombre
- peso_kg
- saldo_fisico_kg

-- CAMPOS FINANCIEROS (dinero)
- cuenta_tipo: 'caja' | 'banco' | 'adelantos' | 'ventas'
- monto
- saldo_financiero

-- ENTIDADES
- persona_id
- persona_nombre
- persona_tipo

-- DETALLES
- concepto
- observaciones
- usuario_registro
```

---

## 🔄 FLUJO DE OPERACIONES

### 1️⃣ LIQUIDACIÓN (Compra al productor)

**Entrada física + Salida financiera**

```
Productor entrega: 500 kg de jengibre exportable
Empresa paga: S/. 4,250.00

KARDEX FÍSICO:
✅ INGRESO - 500 kg (producto entra a tu inventario)

KARDEX FINANCIERO:
❌ EGRESO - S/. 4,250 (dinero sale de tu caja)
```

**SQL Automático:**
```sql
CALL sp_registrar_liquidacion_kardex(
  liquidacion_id,
  lote_id,
  productor_id,
  'LIQ-001-2026',
  4250.00
);
```

**Resultado en kardex_integral:**

| id | tipo_kardex | tipo_movimiento | documento_tipo | peso_kg | monto | concepto |
|----|-------------|-----------------|----------------|---------|-------|----------|
| 1 | fisico | ingreso | liquidacion | 500.00 | NULL | Compra jengibre exportable |
| 2 | financiero | egreso | liquidacion | NULL | 4250.00 | Pago liquidación LIQ-001 |

---

### 2️⃣ VENTA A CLIENTE

**Salida física + Entrada financiera**

```
Cliente compra: 200 kg de jengibre exportable
Cliente paga: S/. 2,500.00

KARDEX FÍSICO:
❌ SALIDA - 200 kg (producto sale de tu inventario)

KARDEX FINANCIERO:
✅ INGRESO - S/. 2,500 (dinero entra a tu caja)
```

**SQL Automático:**
```sql
CALL sp_registrar_venta_kardex(
  pedido_id,
  lote_id,
  cliente_id,
  categoria_id,
  200.00,
  2500.00
);
```

---

### 3️⃣ ADELANTO A PRODUCTOR

**Solo salida financiera**

```
Adelanto: S/. 1,000.00 al productor

KARDEX FINANCIERO:
❌ EGRESO - S/. 1,000 (dinero sale como adelanto)
```

**SQL Automático:**
```sql
CALL sp_registrar_adelanto_kardex(
  adelanto_id,
  productor_id,
  1000.00
);
```

---

## 📊 VISTAS Y CONSULTAS

### Saldo Físico (Stock disponible)
```sql
SELECT * FROM v_kardex_fisico_saldos;
```

| lote_id | numero_lote | categoria_nombre | total_ingresos | total_salidas | saldo_actual |
|---------|-------------|------------------|----------------|---------------|--------------|
| 10 | LOT-2026-001 | Exportable | 500.00 | 200.00 | 300.00 |

### Saldo Financiero (Estado de cuentas)
```sql
SELECT * FROM v_kardex_financiero_saldos;
```

| cuenta_tipo | total_ingresos | total_egresos | saldo_actual |
|-------------|---------------|---------------|--------------|
| banco | 25000.00 | 18500.00 | 6500.00 |
| ventas | 12500.00 | 0.00 | 12500.00 |
| adelantos | 0.00 | 3500.00 | -3500.00 |

---

## 🔌 ENDPOINTS DE LA API

### Consultas

```bash
# Todos los movimientos
GET /kardex-integral
GET /kardex-integral?tipo_kardex=fisico
GET /kardex-integral?tipo_kardex=financiero
GET /kardex-integral?lote_id=10
GET /kardex-integral?fecha_desde=2026-01-01&fecha_hasta=2026-01-31

# Saldos
GET /kardex-integral/saldos/fisico
GET /kardex-integral/saldos/financiero

# Por productor
GET /kardex-integral/por-productor/3

# Reportes
GET /kardex-integral/reporte/estado-cuenta/3
GET /kardex-integral/reporte/flujo-caja
GET /kardex-integral/reporte/inventario
```

### Registro de Operaciones

```bash
# Liquidación
POST /kardex-integral/liquidacion
{
  "liquidacion_id": 15,
  "lote_id": 10,
  "productor_id": 3,
  "numero_liquidacion": "LIQ-001-2026",
  "total_pagar": 12500.50
}

# Venta
POST /kardex-integral/venta
{
  "pedido_id": 8,
  "lote_id": 10,
  "cliente_id": 2,
  "categoria_id": 1,
  "peso_vendido": 500.50,
  "monto_venta": 6250.00
}

# Adelanto
POST /kardex-integral/adelanto
{
  "adelanto_id": 5,
  "productor_id": 3,
  "monto": 2000.00
}

# Movimiento manual (ajustes)
POST /kardex-integral/manual
{
  "tipo_kardex": "fisico",
  "tipo_movimiento": "ingreso",
  "documento_tipo": "ajuste",
  "concepto": "Ajuste de inventario",
  "lote_id": 10,
  "categoria_id": 1,
  "peso_kg": 50.5
}
```

---

## 🔗 INTEGRACIÓN CON MÓDULOS EXISTENTES

### LiquidacionesController

Después de crear la liquidación, registrar en kardex:

```php
// En LiquidacionesController::create()
try {
    $this->db->beginTransaction();
    
    // 1. Crear liquidación
    $liquidacion = $this->crearLiquidacion($data);
    
    // 2. Registrar en kardex integral
    $queryKardex = "CALL sp_registrar_liquidacion_kardex(:lid, :lote, :prod, :num, :total)";
    $stmtKardex = $this->db->prepare($queryKardex);
    $stmtKardex->execute([
        ':lid' => $liquidacion['id'],
        ':lote' => $data['lote_id'],
        ':prod' => $data['productor_id'],
        ':num' => $liquidacion['numero_liquidacion'],
        ':total' => $liquidacion['total_a_pagar']
    ]);
    
    $this->db->commit();
    return $this->success($liquidacion);
    
} catch (Exception $e) {
    $this->db->rollBack();
    return $this->error($e->getMessage());
}
```

### PedidosController (Asignación de lotes)

```php
// Al asignar lote a pedido
$queryKardex = "CALL sp_registrar_venta_kardex(:ped, :lot, :cli, :cat, :peso, :monto)";
$stmtKardex = $this->db->prepare($queryKardex);
$stmtKardex->execute([
    ':ped' => $pedido_id,
    ':lot' => $lote_id,
    ':cli' => $cliente_id,
    ':cat' => $categoria_id,
    ':peso' => $peso_asignado,
    ':monto' => $subtotal
]);
```

### AdelantosController

```php
// Al crear adelanto
$queryKardex = "CALL sp_registrar_adelanto_kardex(:adel, :prod, :monto)";
$stmtKardex = $this->db->prepare($queryKardex);
$stmtKardex->execute([
    ':adel' => $adelanto_id,
    ':prod' => $productor_id,
    ':monto' => $monto
]);
```

---

## ✅ VALIDACIONES AUTOMÁTICAS

### Triggers

1. **trg_kardex_saldo_fisico**: Calcula saldo físico antes de insertar
2. **trg_kardex_saldo_financiero**: Calcula saldo financiero antes de insertar

### Stored Procedures

1. **sp_registrar_liquidacion_kardex**: Registra liquidación completa
2. **sp_registrar_venta_kardex**: Registra venta completa
3. **sp_registrar_adelanto_kardex**: Registra adelanto

### Funciones

1. **fn_saldo_fisico(lote_id, categoria_id)**: Retorna stock disponible
2. **fn_saldo_financiero(cuenta_tipo)**: Retorna saldo de cuenta

---

## 📈 REPORTES DISPONIBLES

### 1. Estado de Cuenta por Productor
```bash
GET /kardex-integral/reporte/estado-cuenta/3
```

Respuesta:
```json
{
  "productor": {...},
  "resumen": {
    "total_peso_comprado_kg": 5000.50,
    "total_adelantos": 8000.00,
    "total_pagos": 42500.00,
    "saldo": 34500.00
  },
  "movimientos_fisicos": [...],
  "movimientos_financieros": [...]
}
```

### 2. Flujo de Caja
```bash
GET /kardex-integral/reporte/flujo-caja?fecha_desde=2026-01-01&fecha_hasta=2026-01-31
```

### 3. Inventario Valorizado
```bash
GET /kardex-integral/reporte/inventario
```

---

## 🎯 CASOS DE USO PRINCIPALES

### Caso 1: Liquidar un lote completo

1. Usuario crea liquidación en frontend
2. Backend crea registro en `liquidaciones` y `liquidaciones_detalle`
3. Backend llama a `sp_registrar_liquidacion_kardex`
4. Se crean automáticamente:
   - N movimientos físicos (uno por cada categoría)
   - 1 movimiento financiero (pago total)

### Caso 2: Consultar stock disponible

```bash
GET /kardex-integral/saldos/fisico?lote_id=10
```

### Caso 3: Verificar saldo en cuenta antes de adelanto

```bash
GET /kardex-integral/saldos/financiero
```

Verificar que `cuenta_tipo = 'banco'` tenga saldo suficiente.

---

## 🚨 CONSIDERACIONES IMPORTANTES

1. **Transacciones**: Todos los registros deben estar en transacciones
2. **Validación de stock**: Antes de vender, verificar saldo físico
3. **Validación financiera**: Antes de egresos, verificar fondos disponibles
4. **Trazabilidad**: Cada movimiento debe tener documento_tipo y documento_id
5. **Auditoría**: No eliminar movimientos, solo marcar como anulados

---

## 📦 ARCHIVOS GENERADOS

1. **backend/migrations/create_kardex_integral.sql**
   - Tabla principal
   - Vistas
   - Stored procedures
   - Triggers
   - Funciones

2. **backend/controllers/KardexIntegralController.php**
   - Controlador completo
   - Todos los endpoints

3. **backend/routes/kardex-integral-routes.php**
   - Definición de rutas
   - Ejemplos de uso

4. **KARDEX_INTEGRAL_DOCUMENTACION.md** (este archivo)
   - Documentación completa
   - Guía de implementación

---

## 🔧 INSTALACIÓN

### 1. Ejecutar el script SQL
```bash
mysql -u usuario -p base_datos < backend/migrations/create_kardex_integral.sql
```

### 2. Agregar rutas al archivo principal
En `backend/routes/api.php`, después de los require_once existentes:

```php
require_once '../controllers/KardexIntegralController.php';

// Copiar las rutas del archivo kardex-integral-routes.php
```

### 3. Integrar con controladores existentes
Ver sección "INTEGRACIÓN CON MÓDULOS EXISTENTES"

---

## ✨ BENEFICIOS DEL KARDEX INTEGRAL

✅ **Trazabilidad completa**: Cada producto y cada sol tienen historial
✅ **Visión unificada**: Un solo lugar para inventario y finanzas
✅ **Reportes automáticos**: Estado de cuenta, flujo de caja, inventario
✅ **Validaciones en tiempo real**: Stock y fondos siempre verificados
✅ **Conciliación fácil**: Documentos relacionados físico-financiero
✅ **Auditoría completa**: Todos los movimientos registrados

---

## 📞 SOPORTE

Para cualquier consulta o problema:
- Revisar este documento primero
- Verificar que el SQL se ejecutó correctamente
- Comprobar que las rutas están agregadas en api.php
- Revisar logs de PHP y MySQL

---

**Sistema implementado correctamente. ¡Listo para usar! 🚀**
