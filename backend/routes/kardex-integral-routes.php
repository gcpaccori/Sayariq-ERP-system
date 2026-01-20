<?php
/**
 * =====================================================
 * RUTAS PARA KARDEX INTEGRAL
 * =====================================================
 * Agregar estas rutas al archivo backend/routes/api.php
 * 
 * @version 2.0
 * @date 2026-01-20
 * =====================================================
 */

// Incluir el controlador (agregar al inicio del archivo api.php)
require_once '../controllers/KardexIntegralController.php';

// Crear instancia del controlador
$kardexIntegralController = new KardexIntegralController($db);

/**
 * =====================================================
 * RUTAS DEL KARDEX INTEGRAL
 * =====================================================
 */

// GET /kardex-integral - Obtener todos los movimientos con filtros
if ($method === 'GET' && preg_match('/^\/kardex-integral\/?$/', $endpoint)) {
    echo $kardexIntegralController->getAll();
    exit;
}

// GET /kardex-integral/:id - Obtener un movimiento específico
if ($method === 'GET' && preg_match('/^\/kardex-integral\/(\d+)$/', $endpoint, $matches)) {
    echo $kardexIntegralController->getById($matches[1]);
    exit;
}

// GET /kardex-integral/saldos/fisico - Saldos físicos (inventario)
if ($method === 'GET' && preg_match('/^\/kardex-integral\/saldos\/fisico\/?$/', $endpoint)) {
    echo $kardexIntegralController->getSaldosFisicos();
    exit;
}

// GET /kardex-integral/saldos/financiero - Saldos financieros (cuentas)
if ($method === 'GET' && preg_match('/^\/kardex-integral\/saldos\/financiero\/?$/', $endpoint)) {
    echo $kardexIntegralController->getSaldosFinancieros();
    exit;
}

// GET /kardex-integral/por-productor/:productor_id - Movimientos por productor
if ($method === 'GET' && preg_match('/^\/kardex-integral\/por-productor\/(\d+)$/', $endpoint, $matches)) {
    echo $kardexIntegralController->getPorProductor($matches[1]);
    exit;
}

// GET /kardex-integral/por-documento - Movimientos por documento
if ($method === 'GET' && preg_match('/^\/kardex-integral\/por-documento\/?$/', $endpoint)) {
    echo $kardexIntegralController->getPorDocumento();
    exit;
}

// POST /kardex-integral/liquidacion - Registrar liquidación
if ($method === 'POST' && preg_match('/^\/kardex-integral\/liquidacion\/?$/', $endpoint)) {
    echo $kardexIntegralController->registrarLiquidacion();
    exit;
}

// POST /kardex-integral/venta - Registrar venta
if ($method === 'POST' && preg_match('/^\/kardex-integral\/venta\/?$/', $endpoint)) {
    echo $kardexIntegralController->registrarVenta();
    exit;
}

// POST /kardex-integral/adelanto - Registrar adelanto
if ($method === 'POST' && preg_match('/^\/kardex-integral\/adelanto\/?$/', $endpoint)) {
    echo $kardexIntegralController->registrarAdelanto();
    exit;
}

// POST /kardex-integral/manual - Registrar movimiento manual
if ($method === 'POST' && preg_match('/^\/kardex-integral\/manual\/?$/', $endpoint)) {
    echo $kardexIntegralController->registrarManual();
    exit;
}

// GET /kardex-integral/reporte/estado-cuenta/:productor_id - Estado de cuenta del productor
if ($method === 'GET' && preg_match('/^\/kardex-integral\/reporte\/estado-cuenta\/(\d+)$/', $endpoint, $matches)) {
    echo $kardexIntegralController->getEstadoCuentaProductor($matches[1]);
    exit;
}

// GET /kardex-integral/reporte/flujo-caja - Flujo de caja
if ($method === 'GET' && preg_match('/^\/kardex-integral\/reporte\/flujo-caja\/?$/', $endpoint)) {
    echo $kardexIntegralController->getFlujoCaja();
    exit;
}

// GET /kardex-integral/reporte/inventario - Reporte de inventario
if ($method === 'GET' && preg_match('/^\/kardex-integral\/reporte\/inventario\/?$/', $endpoint)) {
    echo $kardexIntegralController->getReporteInventario();
    exit;
}

// DELETE /kardex-integral/:id - Eliminar movimiento manual
if ($method === 'DELETE' && preg_match('/^\/kardex-integral\/(\d+)$/', $endpoint, $matches)) {
    echo $kardexIntegralController->delete($matches[1]);
    exit;
}

/**
 * =====================================================
 * EJEMPLOS DE USO DE LAS RUTAS
 * =====================================================
 */

/*

// 1. CONSULTAR TODOS LOS MOVIMIENTOS
GET /kardex-integral
GET /kardex-integral?tipo_kardex=fisico
GET /kardex-integral?tipo_kardex=financiero
GET /kardex-integral?lote_id=5
GET /kardex-integral?persona_id=3
GET /kardex-integral?fecha_desde=2026-01-01&fecha_hasta=2026-01-31
GET /kardex-integral?limit=50&offset=0

// 2. CONSULTAR UN MOVIMIENTO ESPECÍFICO
GET /kardex-integral/123

// 3. CONSULTAR SALDOS
GET /kardex-integral/saldos/fisico
GET /kardex-integral/saldos/fisico?lote_id=5
GET /kardex-integral/saldos/financiero

// 4. CONSULTAR POR PRODUCTOR
GET /kardex-integral/por-productor/3

// 5. CONSULTAR POR DOCUMENTO
GET /kardex-integral/por-documento?documento_tipo=liquidacion
GET /kardex-integral/por-documento?documento_tipo=venta&documento_id=10

// 6. REGISTRAR LIQUIDACIÓN (cuando se crea una liquidación)
POST /kardex-integral/liquidacion
Body: {
  "liquidacion_id": 15,
  "lote_id": 10,
  "productor_id": 3,
  "numero_liquidacion": "LIQ-001-2026",
  "total_pagar": 12500.50
}

// 7. REGISTRAR VENTA (cuando se asigna un lote a un pedido)
POST /kardex-integral/venta
Body: {
  "pedido_id": 8,
  "lote_id": 10,
  "cliente_id": 2,
  "categoria_id": 1,
  "peso_vendido": 500.50,
  "monto_venta": 6250.00
}

// 8. REGISTRAR ADELANTO (cuando se da un adelanto)
POST /kardex-integral/adelanto
Body: {
  "adelanto_id": 5,
  "productor_id": 3,
  "monto": 2000.00
}

// 9. REGISTRAR MOVIMIENTO MANUAL (ajustes)
POST /kardex-integral/manual
Body (físico): {
  "tipo_kardex": "fisico",
  "tipo_movimiento": "ingreso",
  "documento_tipo": "ajuste",
  "concepto": "Ajuste de inventario por recuento",
  "lote_id": 10,
  "categoria_id": 1,
  "peso_kg": 50.5,
  "observaciones": "Diferencia encontrada en conteo físico"
}

Body (financiero): {
  "tipo_kardex": "financiero",
  "tipo_movimiento": "egreso",
  "documento_tipo": "ajuste",
  "concepto": "Gasto imprevisto",
  "cuenta_tipo": "caja",
  "monto": 500.00,
  "observaciones": "Reparación urgente de equipo"
}

// 10. REPORTES
GET /kardex-integral/reporte/estado-cuenta/3
GET /kardex-integral/reporte/flujo-caja?fecha_desde=2026-01-01&fecha_hasta=2026-01-31
GET /kardex-integral/reporte/inventario

// 11. ELIMINAR MOVIMIENTO MANUAL
DELETE /kardex-integral/123

*/
