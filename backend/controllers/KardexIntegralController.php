<?php
/**
 * =====================================================
 * KARDEX INTEGRAL CONTROLLER
 * =====================================================
 * Controlador para el sistema de Kardex unificado
 * Maneja movimientos físicos (productos) y financieros (dinero)
 * 
 * @version 2.0
 * @date 2026-01-20
 * =====================================================
 */

class KardexIntegralController extends BaseController
{
    private $table = "kardex_integral";
    
    /**
     * =====================================================
     * 1. CONSULTAS GENERALES
     * =====================================================
     */
    
    /**
     * GET /kardex-integral
     * Obtiene todos los movimientos con filtros opcionales
     * Método principal llamado por BaseController::handleRequest()
     */
    public function index()
    {
        return $this->getAll();
    }
    
    /**
     * Implementación real de la consulta
     */
    public function getAll()
    {
        try {
            $params = [
                'tipo_kardex' => $_GET['tipo_kardex'] ?? null,           // fisico|financiero
                'tipo_movimiento' => $_GET['tipo_movimiento'] ?? null,   // ingreso|egreso|salida
                'documento_tipo' => $_GET['documento_tipo'] ?? null,     // liquidacion|venta|adelanto
                'lote_id' => $_GET['lote_id'] ?? null,
                'categoria_id' => $_GET['categoria_id'] ?? null,
                'persona_id' => $_GET['persona_id'] ?? null,
                'fecha_desde' => $_GET['fecha_desde'] ?? null,
                'fecha_hasta' => $_GET['fecha_hasta'] ?? null,
                'limit' => $_GET['limit'] ?? 100,
                'offset' => $_GET['offset'] ?? 0
            ];
            
            // Construir query dinámicamente
            $where = [];
            $bindings = [];
            
            if ($params['tipo_kardex']) {
                $where[] = "tipo_kardex = :tipo_kardex";
                $bindings[':tipo_kardex'] = $params['tipo_kardex'];
            }
            
            if ($params['tipo_movimiento']) {
                $where[] = "tipo_movimiento = :tipo_movimiento";
                $bindings[':tipo_movimiento'] = $params['tipo_movimiento'];
            }
            
            if ($params['documento_tipo']) {
                $where[] = "documento_tipo = :documento_tipo";
                $bindings[':documento_tipo'] = $params['documento_tipo'];
            }
            
            if ($params['lote_id']) {
                $where[] = "lote_id = :lote_id";
                $bindings[':lote_id'] = $params['lote_id'];
            }
            
            if ($params['categoria_id']) {
                $where[] = "categoria_id = :categoria_id";
                $bindings[':categoria_id'] = $params['categoria_id'];
            }
            
            if ($params['persona_id']) {
                $where[] = "persona_id = :persona_id";
                $bindings[':persona_id'] = $params['persona_id'];
            }
            
            if ($params['fecha_desde']) {
                $where[] = "fecha_movimiento >= :fecha_desde";
                $bindings[':fecha_desde'] = $params['fecha_desde'];
            }
            
            if ($params['fecha_hasta']) {
                $where[] = "fecha_movimiento <= :fecha_hasta";
                $bindings[':fecha_hasta'] = $params['fecha_hasta'] . ' 23:59:59';
            }
            
            $whereClause = count($where) > 0 ? "WHERE " . implode(" AND ", $where) : "";
            
            // Consulta con paginación
            $query = "
                SELECT * FROM {$this->table}
                {$whereClause}
                ORDER BY fecha_movimiento DESC, id DESC
                LIMIT :limit OFFSET :offset
            ";
            
            $stmt = $this->db->prepare($query);
            
            // Bind parameters
            foreach ($bindings as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue(':limit', (int)$params['limit'], PDO::PARAM_INT);
            $stmt->bindValue(':offset', (int)$params['offset'], PDO::PARAM_INT);
            
            $stmt->execute();
            $movimientos = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Asegurar que siempre sea un array
            if (!is_array($movimientos)) {
                $movimientos = [];
            }
            
            // Contar total para paginación
            $countQuery = "SELECT COUNT(*) as total FROM {$this->table} {$whereClause}";
            $stmtCount = $this->db->prepare($countQuery);
            foreach ($bindings as $key => $value) {
                $stmtCount->bindValue($key, $value);
            }
            $stmtCount->execute();
            $total = $stmtCount->fetch(PDO::FETCH_ASSOC)['total'];
            
            return $this->success([
                'movimientos' => $movimientos,
                'pagination' => [
                    'total' => (int)$total,
                    'limit' => (int)$params['limit'],
                    'offset' => (int)$params['offset'],
                    'pages' => ceil($total / $params['limit'])
                ]
            ]);
            
        } catch (Exception $e) {
            error_log("Error en getAll: " . $e->getMessage());
            return $this->success([
                'movimientos' => [],
                'pagination' => [
                    'total' => 0,
                    'limit' => 100,
                    'offset' => 0,
                    'pages' => 0
                ]
            ]);
        }
    }
    
    /**
     * GET /kardex-integral/:id
     * Obtiene un movimiento específico
     * Método principal llamado por BaseController::handleRequest()
     */
    public function show($id)
    {
        return $this->getById($id);
    }
    
    /**
     * Implementación real de la consulta individual
     */
    public function getById($id)
    {
        try {
            $query = "SELECT * FROM {$this->table} WHERE id = :id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            
            $movimiento = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$movimiento) {
                return $this->error("Movimiento no encontrado", 404);
            }
            
            return $this->success($movimiento);
            
        } catch (Exception $e) {
            return $this->error("Error al obtener movimiento: " . $e->getMessage());
        }
    }
    
    /**
     * =====================================================
     * 2. SALDOS Y REPORTES
     * =====================================================
     */
    
    /**
     * GET /kardex-integral/saldos/fisico
     * Obtiene saldos físicos (stock por lote y categoría)
     */
    public function getSaldosFisicos()
    {
        try {
            $lote_id = $_GET['lote_id'] ?? null;
            
            $where = $lote_id ? "WHERE lote_id = :lote_id" : "";
            
            $query = "SELECT * FROM v_kardex_fisico_saldos {$where} ORDER BY lote_id, categoria_nombre";
            $stmt = $this->db->prepare($query);
            
            if ($lote_id) {
                $stmt->bindParam(':lote_id', $lote_id, PDO::PARAM_INT);
            }
            
            $stmt->execute();
            $saldos = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Asegurar que siempre sea un array
            if (!is_array($saldos)) {
                $saldos = [];
            }
            
            return $this->success($saldos);
            
        } catch (Exception $e) {
            // En caso de error (ej: vista no existe), devolver array vacío
            error_log("Error en getSaldosFisicos: " . $e->getMessage());
            return $this->success([]);
        }
    }
    
    /**
     * GET /kardex-integral/saldos/financiero
     * Obtiene saldos financieros por cuenta
     */
    public function getSaldosFinancieros()
    {
        try {
            $query = "SELECT * FROM v_kardex_financiero_saldos ORDER BY cuenta_tipo";
            $stmt = $this->db->prepare($query);
            $stmt->execute();
            
            $saldos = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Asegurar que siempre sea un array
            if (!is_array($saldos)) {
                $saldos = [];
            }
            
            return $this->success($saldos);
            
        } catch (Exception $e) {
            // En caso de error (ej: vista no existe), devolver array vacío
            error_log("Error en getSaldosFinancieros: " . $e->getMessage());
            return $this->success([]);
        }
    }
    
    /**
     * GET /kardex-integral/por-productor/:productor_id
     * Obtiene movimientos de un productor específico
     */
    public function getPorProductor($productor_id)
    {
        try {
            $query = "SELECT * FROM v_kardex_por_productor WHERE persona_id = :productor_id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':productor_id', $productor_id, PDO::PARAM_INT);
            $stmt->execute();
            
            $movimientos = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return $this->success($movimientos);
            
        } catch (Exception $e) {
            return $this->error("Error al obtener movimientos del productor: " . $e->getMessage());
        }
    }
    
    /**
     * GET /kardex-integral/por-documento
     * Obtiene resumen de movimientos por documento
     */
    public function getPorDocumento()
    {
        try {
            $documento_tipo = $_GET['documento_tipo'] ?? null;
            $documento_id = $_GET['documento_id'] ?? null;
            
            $where = [];
            $bindings = [];
            
            if ($documento_tipo) {
                $where[] = "documento_tipo = :documento_tipo";
                $bindings[':documento_tipo'] = $documento_tipo;
            }
            
            if ($documento_id) {
                $where[] = "documento_id = :documento_id";
                $bindings[':documento_id'] = $documento_id;
            }
            
            $whereClause = count($where) > 0 ? "WHERE " . implode(" AND ", $where) : "";
            
            $query = "SELECT * FROM v_kardex_por_documento {$whereClause}";
            $stmt = $this->db->prepare($query);
            
            foreach ($bindings as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            $stmt->execute();
            $documentos = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return $this->success($documentos);
            
        } catch (Exception $e) {
            return $this->error("Error al obtener movimientos por documento: " . $e->getMessage());
        }
    }
    
    /**
     * =====================================================
     * 3. REGISTRO DE MOVIMIENTOS
     * =====================================================
     */
    
    /**
     * POST /kardex-integral/liquidacion
     * Registra una liquidación completa (físico + financiero)
     */
    public function registrarLiquidacion()
    {
        try {
            $data = $this->getRequestData();
            
            // Validar datos requeridos
            $required = ['liquidacion_id', 'lote_id', 'productor_id', 'numero_liquidacion', 'total_pagar'];
            foreach ($required as $field) {
                if (!isset($data[$field])) {
                    return $this->error("Campo requerido: {$field}", 400);
                }
            }
            
            // Llamar al stored procedure
            $query = "CALL sp_registrar_liquidacion_kardex(:liquidacion_id, :lote_id, :productor_id, :numero_liquidacion, :total_pagar)";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':liquidacion_id', $data['liquidacion_id'], PDO::PARAM_INT);
            $stmt->bindParam(':lote_id', $data['lote_id'], PDO::PARAM_INT);
            $stmt->bindParam(':productor_id', $data['productor_id'], PDO::PARAM_INT);
            $stmt->bindParam(':numero_liquidacion', $data['numero_liquidacion']);
            $stmt->bindParam(':total_pagar', $data['total_pagar']);
            
            $stmt->execute();
            
            return $this->success([
                'message' => 'Liquidación registrada correctamente en kardex integral',
                'liquidacion_id' => $data['liquidacion_id']
            ]);
            
        } catch (Exception $e) {
            return $this->error("Error al registrar liquidación: " . $e->getMessage());
        }
    }
    
    /**
     * POST /kardex-integral/venta
     * Registra una venta (físico + financiero)
     */
    public function registrarVenta()
    {
        try {
            $data = $this->getRequestData();
            
            $required = ['pedido_id', 'lote_id', 'cliente_id', 'categoria_id', 'peso_vendido', 'monto_venta'];
            foreach ($required as $field) {
                if (!isset($data[$field])) {
                    return $this->error("Campo requerido: {$field}", 400);
                }
            }
            
            $query = "CALL sp_registrar_venta_kardex(:pedido_id, :lote_id, :cliente_id, :categoria_id, :peso_vendido, :monto_venta)";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':pedido_id', $data['pedido_id'], PDO::PARAM_INT);
            $stmt->bindParam(':lote_id', $data['lote_id'], PDO::PARAM_INT);
            $stmt->bindParam(':cliente_id', $data['cliente_id'], PDO::PARAM_INT);
            $stmt->bindParam(':categoria_id', $data['categoria_id'], PDO::PARAM_INT);
            $stmt->bindParam(':peso_vendido', $data['peso_vendido']);
            $stmt->bindParam(':monto_venta', $data['monto_venta']);
            
            $stmt->execute();
            
            return $this->success([
                'message' => 'Venta registrada correctamente en kardex integral',
                'pedido_id' => $data['pedido_id']
            ]);
            
        } catch (Exception $e) {
            return $this->error("Error al registrar venta: " . $e->getMessage());
        }
    }
    
    /**
     * POST /kardex-integral/adelanto
     * Registra un adelanto (solo financiero)
     */
    public function registrarAdelanto()
    {
        try {
            $data = $this->getRequestData();
            
            $required = ['adelanto_id', 'productor_id', 'monto'];
            foreach ($required as $field) {
                if (!isset($data[$field])) {
                    return $this->error("Campo requerido: {$field}", 400);
                }
            }
            
            $query = "CALL sp_registrar_adelanto_kardex(:adelanto_id, :productor_id, :monto)";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':adelanto_id', $data['adelanto_id'], PDO::PARAM_INT);
            $stmt->bindParam(':productor_id', $data['productor_id'], PDO::PARAM_INT);
            $stmt->bindParam(':monto', $data['monto']);
            
            $stmt->execute();
            
            return $this->success([
                'message' => 'Adelanto registrado correctamente en kardex integral',
                'adelanto_id' => $data['adelanto_id']
            ]);
            
        } catch (Exception $e) {
            return $this->error("Error al registrar adelanto: " . $e->getMessage());
        }
    }
    
    /**
     * POST /kardex-integral/manual
     * Registra un movimiento manual (ajustes, correcciones)
     */
    public function registrarManual()
    {
        try {
            $data = $this->getRequestData();
            
            // Validar datos requeridos
            $required = ['tipo_kardex', 'tipo_movimiento', 'documento_tipo', 'concepto'];
            foreach ($required as $field) {
                if (!isset($data[$field]) || empty($data[$field])) {
                    return $this->error("Campo requerido: {$field}", 400);
                }
            }
            
            // Validar tipo_kardex
            if (!in_array($data['tipo_kardex'], ['fisico', 'financiero'])) {
                return $this->error("tipo_kardex debe ser 'fisico' o 'financiero'", 400);
            }
            
            // Validar tipo_movimiento
            if (!in_array($data['tipo_movimiento'], ['ingreso', 'egreso', 'salida'])) {
                return $this->error("tipo_movimiento debe ser 'ingreso', 'egreso' o 'salida'", 400);
            }
            
            // Construir query de inserción
            $fields = [
                'fecha_movimiento' => $data['fecha_movimiento'] ?? date('Y-m-d H:i:s'),
                'tipo_kardex' => $data['tipo_kardex'],
                'tipo_movimiento' => $data['tipo_movimiento'],
                'documento_tipo' => $data['documento_tipo'],
                'documento_id' => $data['documento_id'] ?? null,
                'documento_numero' => $data['documento_numero'] ?? null,
                'concepto' => $data['concepto'],
                'observaciones' => $data['observaciones'] ?? null,
                'usuario_registro' => $data['usuario_registro'] ?? 'manual'
            ];
            
            // Campos específicos para movimiento físico
            if ($data['tipo_kardex'] === 'fisico') {
                $fields['lote_id'] = $data['lote_id'] ?? null;
                $fields['categoria_id'] = $data['categoria_id'] ?? null;
                $fields['categoria_nombre'] = $data['categoria_nombre'] ?? null;
                $fields['peso_kg'] = $data['peso_kg'] ?? 0;
            }
            
            // Campos específicos para movimiento financiero
            if ($data['tipo_kardex'] === 'financiero') {
                $fields['cuenta_tipo'] = $data['cuenta_tipo'] ?? 'caja';
                $fields['monto'] = $data['monto'] ?? 0;
            }
            
            // Campos opcionales para persona
            if (isset($data['persona_id'])) {
                $fields['persona_id'] = $data['persona_id'];
                $fields['persona_nombre'] = $data['persona_nombre'] ?? null;
                $fields['persona_tipo'] = $data['persona_tipo'] ?? null;
            }
            
            // Construir query dinámica
            $columns = array_keys($fields);
            $placeholders = array_map(function($col) { return ":{$col}"; }, $columns);
            
            $query = "
                INSERT INTO {$this->table} 
                (" . implode(", ", $columns) . ") 
                VALUES 
                (" . implode(", ", $placeholders) . ")
            ";
            
            $stmt = $this->db->prepare($query);
            
            foreach ($fields as $key => $value) {
                $stmt->bindValue(":{$key}", $value);
            }
            
            $stmt->execute();
            $id = $this->db->lastInsertId();
            
            // Obtener el registro insertado
            $querySelect = "SELECT * FROM {$this->table} WHERE id = :id";
            $stmtSelect = $this->db->prepare($querySelect);
            $stmtSelect->bindParam(':id', $id, PDO::PARAM_INT);
            $stmtSelect->execute();
            $movimiento = $stmtSelect->fetch(PDO::FETCH_ASSOC);
            
            return $this->success([
                'message' => 'Movimiento registrado correctamente',
                'movimiento' => $movimiento
            ]);
            
        } catch (Exception $e) {
            return $this->error("Error al registrar movimiento manual: " . $e->getMessage());
        }
    }
    
    /**
     * =====================================================
     * 4. REPORTES ESPECIALES
     * =====================================================
     */
    
    /**
     * GET /kardex-integral/reporte/estado-cuenta/:productor_id
     * Estado de cuenta completo de un productor
     */
    public function getEstadoCuentaProductor($productor_id)
    {
        try {
            // Obtener información del productor
            $queryProductor = "SELECT * FROM personas WHERE id = :productor_id";
            $stmtProductor = $this->db->prepare($queryProductor);
            $stmtProductor->bindParam(':productor_id', $productor_id, PDO::PARAM_INT);
            $stmtProductor->execute();
            $productor = $stmtProductor->fetch(PDO::FETCH_ASSOC);
            
            if (!$productor) {
                return $this->error("Productor no encontrado", 404);
            }
            
            // Movimientos físicos (productos comprados al productor)
            $queryFisico = "
                SELECT * FROM {$this->table}
                WHERE tipo_kardex = 'fisico'
                  AND persona_id = :productor_id
                ORDER BY fecha_movimiento DESC
            ";
            $stmtFisico = $this->db->prepare($queryFisico);
            $stmtFisico->bindParam(':productor_id', $productor_id, PDO::PARAM_INT);
            $stmtFisico->execute();
            $movimientos_fisicos = $stmtFisico->fetchAll(PDO::FETCH_ASSOC);
            
            // Movimientos financieros (adelantos y pagos)
            $queryFinanciero = "
                SELECT * FROM {$this->table}
                WHERE tipo_kardex = 'financiero'
                  AND persona_id = :productor_id
                ORDER BY fecha_movimiento DESC
            ";
            $stmtFinanciero = $this->db->prepare($queryFinanciero);
            $stmtFinanciero->bindParam(':productor_id', $productor_id, PDO::PARAM_INT);
            $stmtFinanciero->execute();
            $movimientos_financieros = $stmtFinanciero->fetchAll(PDO::FETCH_ASSOC);
            
            // Calcular totales
            $total_peso_comprado = array_sum(array_map(function($m) {
                return $m['tipo_movimiento'] === 'ingreso' ? floatval($m['peso_kg']) : 0;
            }, $movimientos_fisicos));
            
            $total_adelantos = array_sum(array_map(function($m) {
                return $m['documento_tipo'] === 'adelanto' ? floatval($m['monto']) : 0;
            }, $movimientos_financieros));
            
            $total_pagos = array_sum(array_map(function($m) {
                return $m['documento_tipo'] === 'liquidacion' ? floatval($m['monto']) : 0;
            }, $movimientos_financieros));
            
            $saldo_financiero = $total_pagos - $total_adelantos;
            
            return $this->success([
                'productor' => $productor,
                'resumen' => [
                    'total_peso_comprado_kg' => $total_peso_comprado,
                    'total_adelantos' => $total_adelantos,
                    'total_pagos' => $total_pagos,
                    'saldo' => $saldo_financiero
                ],
                'movimientos_fisicos' => $movimientos_fisicos,
                'movimientos_financieros' => $movimientos_financieros
            ]);
            
        } catch (Exception $e) {
            return $this->error("Error al obtener estado de cuenta: " . $e->getMessage());
        }
    }
    
    /**
     * GET /kardex-integral/reporte/flujo-caja
     * Reporte de flujo de caja
     */
    public function getFlujoCaja()
    {
        try {
            $fecha_desde = $_GET['fecha_desde'] ?? date('Y-m-01');
            $fecha_hasta = $_GET['fecha_hasta'] ?? date('Y-m-d');
            
            $query = "
                SELECT 
                    DATE(fecha_movimiento) as fecha,
                    cuenta_tipo,
                    tipo_movimiento,
                    documento_tipo,
                    SUM(monto) as total
                FROM {$this->table}
                WHERE tipo_kardex = 'financiero'
                  AND fecha_movimiento BETWEEN :fecha_desde AND :fecha_hasta
                GROUP BY DATE(fecha_movimiento), cuenta_tipo, tipo_movimiento, documento_tipo
                ORDER BY fecha_movimiento
            ";
            
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':fecha_desde', $fecha_desde);
            $stmt->bindParam(':fecha_hasta', $fecha_hasta . ' 23:59:59');
            $stmt->execute();
            
            $movimientos = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Calcular totales
            $total_ingresos = array_sum(array_map(function($m) {
                return $m['tipo_movimiento'] === 'ingreso' ? floatval($m['total']) : 0;
            }, $movimientos));
            
            $total_egresos = array_sum(array_map(function($m) {
                return $m['tipo_movimiento'] === 'egreso' ? floatval($m['total']) : 0;
            }, $movimientos));
            
            return $this->success([
                'periodo' => [
                    'desde' => $fecha_desde,
                    'hasta' => $fecha_hasta
                ],
                'resumen' => [
                    'total_ingresos' => $total_ingresos,
                    'total_egresos' => $total_egresos,
                    'flujo_neto' => $total_ingresos - $total_egresos
                ],
                'movimientos' => $movimientos
            ]);
            
        } catch (Exception $e) {
            return $this->error("Error al obtener flujo de caja: " . $e->getMessage());
        }
    }
    
    /**
     * GET /kardex-integral/reporte/inventario
     * Reporte de inventario actual
     */
    public function getReporteInventario()
    {
        try {
            $query = "
                SELECT 
                    l.numero_lote,
                    l.producto,
                    l.productor_id,
                    p.nombre_completo as productor_nombre,
                    kfs.categoria_nombre,
                    kfs.saldo_actual as stock_kg,
                    cp.precio_kg,
                    (kfs.saldo_actual * cp.precio_kg) as valor_inventario
                FROM v_kardex_fisico_saldos kfs
                JOIN lotes l ON kfs.lote_id = l.id
                JOIN personas p ON l.productor_id = p.id
                JOIN categorias_peso cp ON kfs.categoria_id = cp.id
                WHERE kfs.saldo_actual > 0
                ORDER BY l.numero_lote, kfs.categoria_nombre
            ";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute();
            $inventario = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Asegurar que siempre sea un array
            if (!is_array($inventario)) {
                $inventario = [];
            }
            
            $valor_total = count($inventario) > 0 ? array_sum(array_column($inventario, 'valor_inventario')) : 0;
            $peso_total = count($inventario) > 0 ? array_sum(array_column($inventario, 'stock_kg')) : 0;
            
            return $this->success([
                'resumen' => [
                    'total_items' => count($inventario),
                    'peso_total_kg' => $peso_total,
                    'valor_total' => $valor_total
                ],
                'inventario' => $inventario
            ]);
            
        } catch (Exception $e) {
            error_log("Error en getReporteInventario: " . $e->getMessage());
            // Devolver estructura vacía pero válida
            return $this->success([
                'resumen' => [
                    'total_items' => 0,
                    'peso_total_kg' => 0,
                    'valor_total' => 0
                ],
                'inventario' => []
            ]);
        }
    }
    
    /**
     * =====================================================
     * 5. UTILIDADES
     * =====================================================
     */
    
    /**
     * DELETE /kardex-integral/:id
     * Elimina un movimiento (solo si es manual/ajuste)
     */
    public function delete($id)
    {
        try {
            // Verificar que existe y es manual
            $queryCheck = "SELECT * FROM {$this->table} WHERE id = :id";
            $stmtCheck = $this->db->prepare($queryCheck);
            $stmtCheck->bindParam(':id', $id, PDO::PARAM_INT);
            $stmtCheck->execute();
            $movimiento = $stmtCheck->fetch(PDO::FETCH_ASSOC);
            
            if (!$movimiento) {
                return $this->error("Movimiento no encontrado", 404);
            }
            
            // Solo permitir eliminar ajustes manuales
            if ($movimiento['documento_tipo'] !== 'ajuste' && $movimiento['usuario_registro'] !== 'manual') {
                return $this->error("Solo se pueden eliminar movimientos manuales o ajustes", 403);
            }
            
            $query = "DELETE FROM {$this->table} WHERE id = :id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            
            return $this->success(['message' => 'Movimiento eliminado correctamente']);
            
        } catch (Exception $e) {
            return $this->error("Error al eliminar movimiento: " . $e->getMessage());
        }
    }
}
