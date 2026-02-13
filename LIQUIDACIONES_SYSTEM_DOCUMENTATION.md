# Sistema de Liquidaciones: Clientes y Proveedores

Este documento describe el sistema completo de liquidaciones implementado para el ERP Sayariq, que maneja tanto liquidaciones de clientes (ventas) como de proveedores (compras).

## Arquitectura del Sistema

### 1. Liquidaciones de CLIENTES (Ventas)
**Flujo de Negocio:**
- Cliente compra producto → **Sale producto** (egreso físico) → **Entra dinero** (ingreso financiero)
- Genera **Boleta de Venta** con desglose por categorías
- Estados: `pendiente_cobro`, `cobrado_parcial`, `cobrado_total`

**Características:**
- Integración automática con `kardex_integral`:
  - Movimiento físico: SALIDA (producto sale)
  - Movimiento financiero: INGRESO (dinero entra)
- Vinculación con pedidos de clientes
- Generación de boletas de venta
- Seguimiento de estado de cobro

### 2. Liquidaciones de PROVEEDORES (Compras/Acopio)
**Flujo de Negocio:**
- Proveedor entrega producto → **Entra producto** (ingreso físico) → **Sale dinero** (egreso financiero)
- Genera **Comprobante de Compra** con desglose por categorías
- Estados: `pendiente_pago`, `pagado_parcial`, `pagado_total`, `pagado_con_adelanto`

**3 Escenarios Críticos de Pago:**

#### a) Adelanto Previo
- El proveedor debe producto (ya recibió dinero anticipado)
- El sistema descuenta automáticamente de `adelantos.saldo_pendiente`
- **NO** se registra egreso financiero (el dinero ya salió antes)
- Estado final: `pagado_con_adelanto`

#### b) Crédito
- La empresa debe dinero al proveedor (pago posterior)
- **NO** se registra egreso financiero al crear la liquidación
- El egreso se registra cuando se ejecuta `registrarPago()`
- Estados: `pendiente_pago` → `pagado_parcial` → `pagado_total`

#### c) Contado
- Pago inmediato al proveedor
- Se registra egreso financiero al crear la liquidación
- Estado final: `pagado_total`

**Características:**
- Integración automática con `kardex_integral`:
  - Movimiento físico: INGRESO (producto entra)
  - Movimiento financiero: EGRESO (dinero sale, según forma de pago)
- Gestión automática de adelantos
- Soporte para pagos parciales
- Generación de comprobantes de compra

## Estructura de Base de Datos

### Tabla: `liquidaciones`
```sql
CREATE TABLE `liquidaciones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `numero_liquidacion` varchar(50) DEFAULT NULL,
  `tipo_liquidacion` ENUM('proveedor', 'cliente') DEFAULT 'proveedor',
  `persona_id` INT(11) DEFAULT NULL,
  `pedido_id` INT(11) DEFAULT NULL,
  `lote_id` int(11) NOT NULL,
  `fecha_liquidacion` timestamp NULL DEFAULT current_timestamp(),
  `total_bruto_fruta` decimal(10,2) NOT NULL,
  `total_adelantos` decimal(10,2) DEFAULT 0.00,
  `total_a_pagar` decimal(10,2) NOT NULL,
  `monto_pagado` DECIMAL(10,2) DEFAULT 0.00,
  `estado_pago` ENUM(...) DEFAULT 'PENDIENTE',
  `forma_pago` VARCHAR(20) DEFAULT NULL,
  `fecha_pago` TIMESTAMP NULL DEFAULT NULL,
  `fecha_cobro` TIMESTAMP NULL DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_tipo_liquidacion` (`tipo_liquidacion`),
  INDEX `idx_persona_id` (`persona_id`),
  INDEX `idx_pedido_id` (`pedido_id`)
);
```

### Tabla: `liquidaciones_detalle`
Almacena el desglose por categoría de cada liquidación.

### Integración con: `kardex_integral`
Todos los movimientos físicos y financieros se registran automáticamente en el kardex integral.

## API Endpoints

### Liquidaciones de Clientes

#### `GET /liquidaciones-clientes`
Obtener todas las liquidaciones de clientes.

#### `GET /liquidaciones-clientes/pendientes`
Obtener pedidos pendientes de liquidar.

#### `GET /liquidaciones-clientes/datos-cliente?cliente_id=X`
Obtener datos necesarios para crear una nueva liquidación.

**Response:**
```json
{
  "success": true,
  "data": {
    "cliente": { ... },
    "pedidos": [ ... ],
    "categorias": [ ... ]
  }
}
```

#### `POST /liquidaciones-clientes`
Crear nueva liquidación de cliente.

**Request:**
```json
{
  "cliente_id": 1,
  "pedido_id": 5,
  "detalles_categorias": [
    {
      "categoria_id": 1,
      "peso_ajustado": 100.5,
      "precio_unitario": 8.50
    }
  ],
  "monto_total": 854.25,
  "observaciones": "..."
}
```

**Response:**
```json
{
  "success": true,
  "liquidacion_id": 123,
  "numero_liquidacion": "BV-2026-0001",
  "message": "Liquidación creada exitosamente"
}
```

#### `GET /liquidaciones-clientes/:id`
Obtener detalles de una liquidación específica.

#### `GET /liquidaciones-clientes/:id/boleta`
Generar boleta de venta.

#### `PUT /liquidaciones-clientes/:id/marcar-cobrado`
Marcar liquidación como cobrada.

### Liquidaciones de Proveedores

#### `GET /liquidaciones-proveedores`
Obtener todas las liquidaciones de proveedores.

#### `GET /liquidaciones-proveedores/pendientes`
Obtener lotes pendientes de liquidar.

#### `GET /liquidaciones-proveedores/datos-proveedor?proveedor_id=X`
Obtener datos necesarios para crear una nueva liquidación, incluyendo adelantos pendientes.

**Response:**
```json
{
  "success": true,
  "data": {
    "proveedor": { ... },
    "lotes": [ ... ],
    "adelantos": [ 
      {
        "id": 1,
        "saldo_pendiente": 500.00,
        "concepto": "Adelanto 01/02"
      }
    ],
    "total_adelantos_pendientes": 500.00,
    "categorias": [ ... ]
  }
}
```

#### `POST /liquidaciones-proveedores`
Crear nueva liquidación de proveedor.

**Request:**
```json
{
  "proveedor_id": 1,
  "lote_id": 5,
  "detalles_categorias": [
    {
      "categoria_id": 1,
      "peso_ajustado": 100.5,
      "precio_unitario": 8.50
    }
  ],
  "forma_pago": "adelanto",  // "adelanto" | "credito" | "contado"
  "monto_total": 854.25,
  "observaciones": "..."
}
```

**Response (con adelanto):**
```json
{
  "success": true,
  "liquidacion_id": 456,
  "numero_liquidacion": "CC-2026-0001",
  "estado_pago": "pagado_con_adelanto",
  "total_adelantos": 500.00,
  "total_a_pagar": 354.25,
  "message": "Liquidación creada exitosamente"
}
```

#### `GET /liquidaciones-proveedores/:id`
Obtener detalles de una liquidación específica.

#### `PUT /liquidaciones-proveedores/:id/registrar-pago`
Registrar pago para liquidaciones a crédito.

**Request:**
```json
{
  "monto": 200.00,
  "cuenta_tipo": "banco",  // "banco" | "caja"
  "observaciones": "..."
}
```

#### `GET /liquidaciones-proveedores/:id/comprobante`
Generar comprobante de compra.

## Frontend Components

### `components/liquidacion-clientes.tsx`
Componente principal para gestión de liquidaciones de clientes:
- Lista de pedidos pendientes
- Formulario de nueva liquidación con desglose por categorías
- Vista de liquidaciones existentes
- Generación de boletas
- Marcado de cobros

### `components/liquidacion-proveedores-nueva.tsx`
Componente principal para gestión de liquidaciones de proveedores:
- Lista de lotes pendientes
- Muestra adelantos pendientes del proveedor
- Selector de forma de pago (Adelanto/Crédito/Contado)
- Formulario con desglose por categorías
- Descuento automático de adelantos
- Registro de pagos parciales
- Generación de comprobantes

### Services

**`lib/services/liquidaciones-clientes-service.ts`**
- `getAll()`, `getPendientes()`, `getDatosCliente()`
- `create()`, `getById()`, `generarBoleta()`, `marcarComoCobrado()`

**`lib/services/liquidaciones-proveedores-service.ts`**
- `getAll()`, `getPendientes()`, `getDatosProveedor()`
- `create()`, `getById()`, `registrarPago()`, `generarComprobante()`
- `calcularTotalAdelantosPendientes()`, `tieneAdelantosSuficientes()`

## Lógica de Negocio Crítica

### Liquidación de Clientes
```
1. Recibir: cliente_id, pedido_id, detalles_categorias[], monto_total
2. Crear registro en liquidaciones (tipo='cliente')
3. Crear detalles por categoría en liquidaciones_detalle
4. Registrar en kardex_integral:
   - Movimiento físico SALIDA por cada categoría
   - Movimiento financiero INGRESO (cobro)
5. Actualizar estado del pedido
6. Retornar liquidacion_id y numero_liquidacion
```

### Liquidación de Proveedores
```
1. Recibir: proveedor_id, lote_id, detalles_categorias[], forma_pago, monto_total
2. Crear registro en liquidaciones (tipo='proveedor')
3. Crear detalles por categoría en liquidaciones_detalle
4. Registrar en kardex_integral:
   - Movimiento físico INGRESO por cada categoría
   
5. SWITCH forma_pago:
   CASE 'adelanto':
     - Descontar de adelantos.saldo_pendiente (FIFO)
     - NO crear egreso financiero (ya salió el dinero antes)
     - estado_pago = 'pagado_con_adelanto'
   
   CASE 'credito':
     - NO crear egreso financiero aún
     - estado_pago = 'pendiente_pago'
   
   CASE 'contado':
     - Crear movimiento financiero EGRESO en kardex
     - estado_pago = 'pagado_total'

6. Actualizar estado del lote
7. Retornar liquidacion con detalles
```

## Validaciones Importantes

1. **Verificar que `categoria_id` NO sea NULL** al registrar en kardex
2. **Verificar saldos de adelantos** antes de descontar
3. **No permitir liquidar lotes/pedidos ya liquidados**
4. **Calcular correctamente**: `total_bruto - adelantos = total_a_pagar`
5. **Validar forma de pago** antes de crear liquidación de proveedor
6. **Validar montos de pago** no excedan el saldo pendiente

## Integración con Kardex Integral

Todas las operaciones se registran automáticamente en `kardex_integral`:

### Cliente (Venta)
- **Físico**: Tipo `salida` (producto sale del inventario)
- **Financiero**: Tipo `ingreso` (dinero entra a caja/banco)

### Proveedor (Compra)
- **Físico**: Tipo `ingreso` (producto entra al inventario)
- **Financiero**: Tipo `egreso` (dinero sale de caja/banco, según forma de pago)

## Migraciones Requeridas

Ejecutar antes de usar el sistema:
```bash
mysql -u usuario -p database < backend/migrations/add_liquidaciones_clientes_proveedores.sql
```

## Testing

### Tests Manuales Requeridos

1. **Cliente - Liquidación Simple**
   - Crear pedido de cliente
   - Liquidar el pedido con desglose por categorías
   - Verificar registro en kardex (salida física + ingreso financiero)
   - Generar boleta
   - Marcar como cobrado

2. **Proveedor - Forma de Pago: Adelanto**
   - Crear adelanto para proveedor
   - Crear lote del proveedor
   - Liquidar con forma_pago='adelanto'
   - Verificar descuento automático de adelanto
   - Verificar NO hay egreso financiero en kardex
   - Verificar estado 'pagado_con_adelanto'

3. **Proveedor - Forma de Pago: Crédito**
   - Crear lote del proveedor
   - Liquidar con forma_pago='credito'
   - Verificar estado 'pendiente_pago'
   - Verificar NO hay egreso financiero inicial
   - Registrar pago parcial
   - Verificar egreso financiero en kardex
   - Verificar estado 'pagado_parcial'
   - Completar pago
   - Verificar estado 'pagado_total'

4. **Proveedor - Forma de Pago: Contado**
   - Crear lote del proveedor
   - Liquidar con forma_pago='contado'
   - Verificar egreso financiero inmediato en kardex
   - Verificar estado 'pagado_total'

5. **Validaciones**
   - Intentar liquidar sin categorías
   - Intentar liquidar con adelantos insuficientes
   - Verificar cálculos correctos de totales
   - Verificar numeración secuencial de liquidaciones

## Deployment

### Base de Datos
1. Ejecutar migración SQL
2. Verificar índices creados
3. Verificar foreign keys (opcional)

### Backend
- Los controladores están en: `backend/controllers/`
- Las rutas están registradas en: `backend/routes/api.php`
- Helper de Kardex: `backend/helpers/KardexIntegralHelper.php`

### Frontend
- Componentes: `components/liquidacion-*.tsx`
- Servicios: `lib/services/liquidaciones-*-service.ts`
- Páginas: `app/liquidaciones-*/page.tsx`

### URLs de Acceso
- Liquidaciones Clientes: `/liquidaciones-clientes`
- Liquidaciones Proveedores (nueva): `/liquidaciones-proveedores-nueva`

## Troubleshooting

### Error: "categoria_id cannot be NULL"
**Causa**: Categoría no encontrada al registrar en kardex
**Solución**: Verificar que todas las categorías existan en `categorias_peso`

### Error: "Adelantos insuficientes"
**Causa**: Saldo de adelantos menor que monto de liquidación
**Solución**: El sistema permite diferencia, preguntar al usuario si desea continuar

### Error: "Lote ya liquidado"
**Causa**: Intentar liquidar un lote que ya tiene liquidación
**Solución**: Verificar estado del lote antes de liquidar

### Estados no actualizados en UI
**Causa**: Cache del navegador o datos no refrescados
**Solución**: Llamar a `loadData()` después de cada operación

## Contacto y Soporte

Para reportar bugs o solicitar mejoras, contactar al equipo de desarrollo.

---

**Versión**: 1.0.0  
**Fecha**: 13 de Febrero de 2026  
**Autor**: Sistema ERP Sayariq
