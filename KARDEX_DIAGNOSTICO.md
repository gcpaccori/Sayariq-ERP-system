# 🔧 DIAGNÓSTICO Y SOLUCIÓN: Kardex Integral Desconectado

## 📊 RESUMEN DEL PROBLEMA

Tu sistema **SÍ está completamente conectado**, pero la tabla `kardex_integral` está **VACÍA**.

### ✅ Conexiones Verificadas (Todo funciona):
- ✅ Frontend (React/Next.js) → Backend (PHP)
- ✅ Rutas API configuradas correctamente
- ✅ Controladores y servicios funcionando
- ✅ Base de datos y tabla creada
- ✅ Views y estructura correcta

### ❌ El Problema Real:
**NO HAY DATOS** en la tabla `kardex_integral`

```sql
-- Estos endpoints devuelven arrays vacíos:
GET /kardex-integral                  → []
GET /kardex-integral/saldos/fisico    → []
GET /kardex-integral/saldos/financiero → []
```

---

## 🎯 CAUSA RAÍZ

El kardex se llena **automáticamente** cuando:
1. Se crea una **liquidación** → Trigger inserta en kardex
2. Se registra una **venta** → Trigger inserta en kardex
3. Se da un **adelanto** → Trigger inserta en kardex
4. Se hace un **pesaje/clasificación** → Trigger inserta en kardex

**PERO**: Los triggers NO están ejecutándose o no existen en tu BD actual.

---

## 💡 SOLUCIONES

### Opción 1: 🚀 DATOS DE PRUEBA (Rápido - 2 minutos)

Para ver el kardex funcionando **AHORA MISMO**:

1. Ve a phpMyAdmin → tu base de datos
2. Ejecuta el archivo:
   ```
   /backend/migrations/datos_prueba_kardex.sql
   ```

Este script crea:
- ✅ 12 movimientos de prueba
- ✅ Ingresos de productos (pesajes)
- ✅ Ventas a clientes
- ✅ Adelantos a productores
- ✅ Liquidaciones
- ✅ Saldos físicos y financieros

**Resultado**: Tu kardex mostrará datos inmediatamente.

---

### Opción 2: 📦 MIGRAR DATOS REALES (Completo - 10 minutos)

Para poblar el kardex con tus **datos históricos reales**:

1. Ve a phpMyAdmin → tu base de datos
2. Ejecuta el archivo:
   ```
   /backend/migrations/poblar_kardex_integral.sql
   ```

Este script:
- ✅ Migra todas las liquidaciones existentes
- ✅ Migra todas las ventas existentes
- ✅ Migra todos los adelantos existentes
- ✅ Migra todos los pesajes existentes
- ✅ Recalcula saldos automáticamente

**IMPORTANTE**: Revisa el script antes de ejecutarlo y ajusta los nombres de tablas si son diferentes.

---

### Opción 3: 🔧 ACTIVAR TRIGGERS (Permanente)

Para que el kardex se llene **automáticamente** en el futuro:

#### 3.1 Verificar si los triggers existen:

```sql
-- Ver triggers existentes
SHOW TRIGGERS LIKE 'liquidaciones';
SHOW TRIGGERS LIKE 'ventas';
SHOW TRIGGERS LIKE 'adelantos';
SHOW TRIGGERS LIKE 'pesos';
```

#### 3.2 Si NO existen, crearlos:

Ejecuta el archivo completo:
```
/backend/migrations/create_kardex_integral.sql
```

Incluye todos los triggers necesarios.

#### 3.3 Verificar en el código PHP:

Alternativamente, puedes hacer que el código PHP inserte en kardex manualmente:

**En LiquidacionesController.php**:
```php
public function create() {
    // ... código existente para crear liquidación ...
    
    // AGREGAR: Insertar en kardex_integral
    $this->insertarEnKardex([
        'tipo_kardex' => 'fisico',
        'tipo_movimiento' => 'egreso',
        'documento_tipo' => 'liquidacion',
        'documento_id' => $liquidacion_id,
        // ... más campos
    ]);
}
```

---

## 📝 FLUJO NORMAL DEL KARDEX

### Cómo DEBERÍA funcionar:

```
Usuario crea liquidación
    ↓
Trigger AFTER INSERT en tabla 'liquidaciones'
    ↓
Se insertan 2 registros en kardex_integral:
  1. Movimiento FÍSICO (egreso de kg)
  2. Movimiento FINANCIERO (egreso de dinero)
    ↓
Kardex se actualiza automáticamente
    ↓
Frontend muestra los datos actualizados
```

---

## 🔍 VERIFICACIÓN

### Después de ejecutar cualquier solución, verifica:

```sql
-- 1. Verificar que hay datos
SELECT COUNT(*) FROM kardex_integral;

-- 2. Ver últimos movimientos
SELECT 
    fecha_movimiento,
    tipo_kardex,
    tipo_movimiento,
    documento_tipo,
    concepto,
    COALESCE(peso_kg, 0) AS kg,
    COALESCE(monto, 0) AS soles
FROM kardex_integral
ORDER BY fecha_movimiento DESC
LIMIT 20;

-- 3. Ver saldos
SELECT 
    'FÍSICO' AS tipo,
    SUM(CASE WHEN tipo_movimiento = 'ingreso' THEN peso_kg ELSE -peso_kg END) AS saldo
FROM kardex_integral
WHERE tipo_kardex = 'fisico'
UNION ALL
SELECT 
    'BANCO' AS tipo,
    SUM(CASE WHEN tipo_movimiento = 'ingreso' THEN monto ELSE -monto END) AS saldo
FROM kardex_integral
WHERE tipo_kardex = 'financiero' AND cuenta_tipo = 'banco';
```

---

## 🌐 VERIFICACIÓN EN EL FRONTEND

### En tu navegador:

1. Abre: `http://localhost:3000` (o tu URL)
2. Ve al módulo "Kardex Integral"
3. Deberías ver:
   - ✅ Tarjetas de resumen con valores
   - ✅ Tabla de movimientos
   - ✅ Gráficos con datos
   - ✅ Saldos físicos y financieros

### En la consola del navegador (F12):

```javascript
// Ver logs de las peticiones API
// Deberías ver:
[v0] API Request: GET /api/proxy/kardex-integral
[v0] API Response: status: 200, dataLength: 12
```

---

## 🎓 ENTENDIENDO EL KARDEX INTEGRAL

### Conceptos clave:

**Kardex Físico**:
- Registra el movimiento de **productos** (kg)
- Tipos: `ingreso` (compra/pesaje), `egreso` (liquidación), `salida` (venta)
- Mantiene saldo acumulado de kilogramos

**Kardex Financiero**:
- Registra el movimiento de **dinero** (S/.)
- Cuentas: `banco`, `caja`, `adelantos`, `ventas`
- Mantiene saldo acumulado por cuenta

**Documentos**:
- `liquidacion`: Pago a productor (egreso físico + egreso financiero)
- `venta`: Venta a cliente (salida física + ingreso financiero)
- `adelanto`: Anticipo a productor (solo egreso financiero)
- `pesaje`: Ingreso de materia prima (solo ingreso físico)
- `ajuste`: Correcciones manuales

---

## 🚨 PROBLEMAS COMUNES

### 1. "No veo datos después de ejecutar el script"

**Solución**:
- Verifica que estás en la base de datos correcta
- Revisa si hay errores en la consola de phpMyAdmin
- Verifica nombres de tablas (pueden ser diferentes)

### 2. "Los datos aparecen pero los saldos están mal"

**Solución**:
Ejecuta el recálculo de saldos:
```sql
-- Ver archivo: poblar_kardex_integral.sql
-- Sección 5: RECALCULAR SALDOS
```

### 3. "Nuevas operaciones no se registran en kardex"

**Solución**:
- Opción A: Activa los triggers (ver Opción 3)
- Opción B: Modifica los controladores PHP para insertar manualmente

---

## 📞 PRÓXIMOS PASOS

1. ✅ **AHORA**: Ejecuta `datos_prueba_kardex.sql` para ver el kardex funcionando
2. ✅ **DESPUÉS**: Ejecuta `poblar_kardex_integral.sql` para migrar datos reales
3. ✅ **FINALMENTE**: Verifica/crea los triggers para automatización futura

---

## 📁 ARCHIVOS CREADOS

1. **`/backend/migrations/datos_prueba_kardex.sql`**
   - Datos de prueba rápidos
   - 12 movimientos de ejemplo
   - Listo para ejecutar

2. **`/backend/migrations/poblar_kardex_integral.sql`**
   - Migración de datos históricos
   - Incluye recálculo de saldos
   - Requiere revisar nombres de tablas

3. **Este documento**
   - Guía completa del problema y soluciones

---

## ✅ CONCLUSIÓN

Tu kardex **NO está desconectado**, simplemente está **vacío**. 

- La arquitectura es correcta
- Las conexiones funcionan
- El código es sólido

Solo necesitas **poblar la tabla** con datos usando cualquiera de las 3 opciones arriba.

**Recomendación**: Empieza con la Opción 1 (datos de prueba) para verificar que todo funciona, luego migra tus datos reales con la Opción 2.

---

**¿Dudas?** Cualquier error que veas, compártelo para ayudarte a resolverlo.
