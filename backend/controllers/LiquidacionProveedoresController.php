<?php
require_once '../helpers/KardexIntegralHelper.php';

class LiquidacionProveedoresController {
    private $conn;
    private $tableLiquidaciones = "liquidaciones";
    private $tableDetalle = "liquidaciones_detalle";
    private $tableAdelantos = "adelantos";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest($method, $id, $action) {
        try {
            switch ($method) {
                case 'GET':
                    if ($action === 'pendientes') {
                        $this->getPendientes();
                    } else if ($action === 'datos-proveedor' && isset($_GET['proveedor_id'])) {
                        $this->getDatosLiquidacion($_GET['proveedor_id']);
                    } else if ($action === 'comprobante' && $id) {
                        $this->generarComprobante($id);
                    } else if ($id) {
                        $this->getById($id);
                    } else {
                        $this->getAll();
                    }
                    break;

                case 'POST':
                    $this->create();
                    break;

                case 'PUT':
                    if ($action === 'registrar-pago' && $id) {
                        $this->registrarPago($id);
                    } else {
                        http_response_code(400);
                        echo json_encode([
                            'success' => false,
                            'message' => 'Acción no válida'
                        ]);
                    }
                    break;

                default:
                    http_response_code(405);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Método no permitido'
                    ]);
                    break;
            }
        } catch (Exception $e) {
            logMessage('ERROR', 'Error en LiquidacionProveedoresController', [
                'error' => $e->getMessage(),
                'method' => $method,
                'action' => $action
            ]);
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Server Error',
                'message' => $e->getMessage()
            ]);
        }
    }

    /**
     * GET /liquidaciones-proveedores
     * Obtener todas las liquidaciones de proveedores
     */
    public function getAll() {
        try {
            $query = "SELECT l.*, 
                             p.nombre_completo as proveedor_nombre,
                             lot.numero_lote
                      FROM {$this->tableLiquidaciones} l
                      LEFT JOIN personas p ON l.persona_id = p.id
                      LEFT JOIN lotes lot ON l.lote_id = lot.id
                      WHERE l.tipo_liquidacion = 'proveedor'
                      ORDER BY l.fecha_liquidacion DESC";

            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            $liquidaciones = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $liquidaciones
            ]);
        } catch (Exception $e) {
            throw $e;
        }
    }

    /**
     * GET /liquidaciones-proveedores/pendientes
     * Obtener proveedores con lotes pendientes de liquidación
     */
    public function getPendientes() {
        try {
            $query = "SELECT l.id as lote_id,
                             l.numero_lote,
                             l.productor_id as proveedor_id,
                             p.nombre_completo as proveedor_nombre,
                             l.fecha_ingreso,
                             l.producto,
                             l.peso_neto,
                             l.estado
                      FROM lotes l
                      INNER JOIN personas p ON l.productor_id = p.id
                      WHERE l.estado IN ('recibido', 'clasificado', 'en_proceso')
                        AND NOT EXISTS (
                            SELECT 1 FROM {$this->tableLiquidaciones} liq
                            WHERE liq.lote_id = l.id AND liq.tipo_liquidacion = 'proveedor'
                        )
                      ORDER BY l.fecha_ingreso DESC";

            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            $pendientes = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $pendientes
            ]);
        } catch (Exception $e) {
            throw $e;
        }
    }

    /**
     * GET /liquidaciones-proveedores/datos-proveedor?proveedor_id=X
     * Obtener datos para crear nueva liquidación de proveedor
     */
    public function getDatosLiquidacion($proveedorId) {
        try {
            // Obtener datos del proveedor
            $queryProveedor = "SELECT * FROM personas 
                               WHERE id = :proveedor_id 
                                 AND tipo IN ('productor', 'proveedor')";
            $stmtProveedor = $this->conn->prepare($queryProveedor);
            $stmtProveedor->bindParam(':proveedor_id', $proveedorId, PDO::PARAM_INT);
            $stmtProveedor->execute();
            $proveedor = $stmtProveedor->fetch(PDO::FETCH_ASSOC);

            if (!$proveedor) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Proveedor no encontrado'
                ]);
                return;
            }

            // Obtener lotes pendientes del proveedor
            $queryLotes = "SELECT l.*,
                                  COALESCE(SUM(pl.peso_categoria), l.peso_neto) as peso_clasificado
                           FROM lotes l
                           LEFT JOIN pesos_lote pl ON l.id = pl.lote_id
                           WHERE l.productor_id = :proveedor_id
                             AND l.estado IN ('recibido', 'clasificado', 'en_proceso')
                             AND NOT EXISTS (
                                 SELECT 1 FROM {$this->tableLiquidaciones} liq
                                 WHERE liq.lote_id = l.id AND liq.tipo_liquidacion = 'proveedor'
                             )
                           GROUP BY l.id
                           ORDER BY l.fecha_ingreso DESC";

            $stmtLotes = $this->conn->prepare($queryLotes);
            $stmtLotes->bindParam(':proveedor_id', $proveedorId, PDO::PARAM_INT);
            $stmtLotes->execute();
            $lotes = $stmtLotes->fetchAll(PDO::FETCH_ASSOC);

            // Obtener adelantos pendientes del proveedor
            $queryAdelantos = "SELECT * FROM {$this->tableAdelantos}
                               WHERE productor_id = :proveedor_id
                                 AND estado IN ('pendiente', 'descontado-parcial')
                                 AND saldo_pendiente > 0
                               ORDER BY fecha_adelanto ASC";

            $stmtAdelantos = $this->conn->prepare($queryAdelantos);
            $stmtAdelantos->bindParam(':proveedor_id', $proveedorId, PDO::PARAM_INT);
            $stmtAdelantos->execute();
            $adelantos = $stmtAdelantos->fetchAll(PDO::FETCH_ASSOC);

            // Calcular total de adelantos pendientes
            $totalAdelantosPendientes = array_sum(array_column($adelantos, 'saldo_pendiente'));

            // Obtener categorías con precios
            $queryCategorias = "SELECT * FROM categorias_peso ORDER BY nombre";
            $stmtCategorias = $this->conn->prepare($queryCategorias);
            $stmtCategorias->execute();
            $categorias = $stmtCategorias->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => [
                    'proveedor' => $proveedor,
                    'lotes' => $lotes,
                    'adelantos' => $adelantos,
                    'total_adelantos_pendientes' => $totalAdelantosPendientes,
                    'categorias' => $categorias
                ]
            ]);
        } catch (Exception $e) {
            throw $e;
        }
    }

    /**
     * GET /liquidaciones-proveedores/:id
     * Obtener liquidación específica con detalles
     */
    public function getById($id) {
        try {
            // Obtener liquidación principal
            $query = "SELECT l.*, 
                             p.nombre_completo as proveedor_nombre,
                             p.documento_identidad,
                             p.telefono,
                             p.direccion,
                             p.banco,
                             p.cuenta_bancaria,
                             lot.numero_lote
                      FROM {$this->tableLiquidaciones} l
                      LEFT JOIN personas p ON l.persona_id = p.id
                      LEFT JOIN lotes lot ON l.lote_id = lot.id
                      WHERE l.id = :id AND l.tipo_liquidacion = 'proveedor'";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            $liquidacion = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$liquidacion) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Liquidación no encontrada'
                ]);
                return;
            }

            // Obtener detalles por categoría
            $queryDetalle = "SELECT ld.*, c.nombre as categoria_nombre
                             FROM {$this->tableDetalle} ld
                             LEFT JOIN categorias_peso c ON ld.categoria_id = c.id
                             WHERE ld.liquidacion_id = :liquidacion_id
                             ORDER BY c.nombre";

            $stmtDetalle = $this->conn->prepare($queryDetalle);
            $stmtDetalle->bindParam(':liquidacion_id', $id, PDO::PARAM_INT);
            $stmtDetalle->execute();
            $detalles = $stmtDetalle->fetchAll(PDO::FETCH_ASSOC);

            $liquidacion['detalle_categorias'] = $detalles;

            echo json_encode([
                'success' => true,
                'data' => $liquidacion
            ]);
        } catch (Exception $e) {
            throw $e;
        }
    }

    /**
     * POST /liquidaciones-proveedores
     * Crear nueva liquidación de proveedor
     * 
     * Body: {
     *   proveedor_id: number,
     *   lote_id: number,
     *   fecha_liquidacion: string,
     *   detalles_categorias: [{categoria_id, peso_ajustado, precio_unitario}],
     *   forma_pago: 'adelanto'|'credito'|'contado',
     *   monto_total: number,
     *   observaciones: string
     * }
     */
    public function create() {
        try {
            $data = json_decode(file_get_contents("php://input"), true);

            // Validar datos requeridos
            if (empty($data['proveedor_id']) || empty($data['detalles_categorias']) || 
                empty($data['monto_total']) || empty($data['forma_pago'])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'proveedor_id, detalles_categorias, monto_total y forma_pago son requeridos'
                ]);
                return;
            }

            // Validar forma de pago
            $formasPagoValidas = ['adelanto', 'credito', 'contado'];
            if (!in_array($data['forma_pago'], $formasPagoValidas)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'forma_pago debe ser: adelanto, credito o contado'
                ]);
                return;
            }

            // Iniciar transacción
            $this->conn->beginTransaction();

            // Generar número único de liquidación
            $queryMaxNum = "SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(numero_liquidacion, '-', -1) AS UNSIGNED)), 0) as max_num
                            FROM {$this->tableLiquidaciones}
                            WHERE tipo_liquidacion = 'proveedor'
                              AND YEAR(fecha_liquidacion) = YEAR(CURDATE())";
            $stmtMaxNum = $this->conn->prepare($queryMaxNum);
            $stmtMaxNum->execute();
            $maxNum = $stmtMaxNum->fetch(PDO::FETCH_ASSOC)['max_num'];
            $numeroLiquidacion = 'CC-' . date('Y') . '-' . str_pad($maxNum + 1, 4, '0', STR_PAD_LEFT);

            // Determinar estado de pago según forma de pago
            $estadoPago = 'pendiente_pago';
            $totalAdelantos = 0;
            $totalAPagar = $data['monto_total'];

            if ($data['forma_pago'] === 'adelanto') {
                // Calcular adelantos disponibles
                $queryAdelantos = "SELECT * FROM {$this->tableAdelantos}
                                   WHERE productor_id = :proveedor_id
                                     AND estado IN ('pendiente', 'descontado-parcial')
                                     AND saldo_pendiente > 0
                                   ORDER BY fecha_adelanto ASC";
                $stmtAdelantos = $this->conn->prepare($queryAdelantos);
                $stmtAdelantos->bindParam(':proveedor_id', $data['proveedor_id'], PDO::PARAM_INT);
                $stmtAdelantos->execute();
                $adelantos = $stmtAdelantos->fetchAll(PDO::FETCH_ASSOC);

                $montoRestante = $data['monto_total'];
                
                // Descontar de adelantos en orden FIFO
                foreach ($adelantos as $adelanto) {
                    if ($montoRestante <= 0) break;

                    $montoADescontar = min($montoRestante, $adelanto['saldo_pendiente']);
                    $nuevoSaldo = $adelanto['saldo_pendiente'] - $montoADescontar;
                    
                    // Actualizar adelanto
                    $queryUpdateAdelanto = "UPDATE {$this->tableAdelantos}
                                            SET saldo_pendiente = :nuevo_saldo,
                                                monto_descontado = monto_descontado + :monto_descontado,
                                                estado = CASE 
                                                    WHEN :nuevo_saldo2 <= 0 THEN 'descontado-total'
                                                    ELSE 'descontado-parcial'
                                                END
                                            WHERE id = :adelanto_id";
                    $stmtUpdateAdelanto = $this->conn->prepare($queryUpdateAdelanto);
                    $stmtUpdateAdelanto->execute([
                        ':nuevo_saldo' => $nuevoSaldo,
                        ':nuevo_saldo2' => $nuevoSaldo,
                        ':monto_descontado' => $montoADescontar,
                        ':adelanto_id' => $adelanto['id']
                    ]);

                    $totalAdelantos += $montoADescontar;
                    $montoRestante -= $montoADescontar;
                }

                $totalAPagar = $montoRestante;
                $estadoPago = $totalAPagar <= 0 ? 'pagado_con_adelanto' : 'pagado_parcial';
                
            } else if ($data['forma_pago'] === 'credito') {
                $estadoPago = 'pendiente_pago';
            } else if ($data['forma_pago'] === 'contado') {
                $estadoPago = 'pagado_total';
            }

            // Insertar liquidación principal
            $queryInsert = "INSERT INTO {$this->tableLiquidaciones} 
                            (numero_liquidacion, tipo_liquidacion, persona_id, lote_id, 
                             fecha_liquidacion, total_bruto_fruta, total_adelantos, total_a_pagar, 
                             estado_pago, forma_pago, observaciones, created_at)
                            VALUES 
                            (:numero_liquidacion, 'proveedor', :proveedor_id, :lote_id,
                             :fecha_liquidacion, :total_bruto, :total_adelantos, :total_pagar,
                             :estado_pago, :forma_pago, :observaciones, NOW())";

            $stmt = $this->conn->prepare($queryInsert);
            $stmt->execute([
                ':numero_liquidacion' => $numeroLiquidacion,
                ':proveedor_id' => $data['proveedor_id'],
                ':lote_id' => $data['lote_id'] ?? null,
                ':fecha_liquidacion' => $data['fecha_liquidacion'] ?? date('Y-m-d H:i:s'),
                ':total_bruto' => $data['monto_total'],
                ':total_adelantos' => $totalAdelantos,
                ':total_pagar' => $totalAPagar,
                ':estado_pago' => $estadoPago,
                ':forma_pago' => $data['forma_pago'],
                ':observaciones' => $data['observaciones'] ?? null
            ]);

            $liquidacionId = $this->conn->lastInsertId();

            // Insertar detalles por categoría
            $queryDetalle = "INSERT INTO {$this->tableDetalle}
                             (liquidacion_id, categoria_id, peso_ajustado, precio_unitario, subtotal)
                             VALUES (:liquidacion_id, :categoria_id, :peso_ajustado, :precio_unitario, :subtotal)";
            $stmtDetalle = $this->conn->prepare($queryDetalle);

            $kardexHelper = new KardexIntegralHelper($this->conn);

            foreach ($data['detalles_categorias'] as $detalle) {
                if (empty($detalle['categoria_id']) || empty($detalle['peso_ajustado']) || empty($detalle['precio_unitario'])) {
                    continue;
                }

                $subtotal = $detalle['peso_ajustado'] * $detalle['precio_unitario'];

                $stmtDetalle->execute([
                    ':liquidacion_id' => $liquidacionId,
                    ':categoria_id' => $detalle['categoria_id'],
                    ':peso_ajustado' => $detalle['peso_ajustado'],
                    ':precio_unitario' => $detalle['precio_unitario'],
                    ':subtotal' => $subtotal
                ]);

                // Registrar movimiento físico INGRESO en kardex (producto entra)
                try {
                    $kardexHelper->registrarMovimientoFisico([
                        'fecha_movimiento' => $data['fecha_liquidacion'] ?? date('Y-m-d H:i:s'),
                        'tipo_movimiento' => 'ingreso',
                        'documento_tipo' => 'liquidacion_proveedor',
                        'documento_id' => $liquidacionId,
                        'documento_numero' => $numeroLiquidacion,
                        'lote_id' => $data['lote_id'] ?? null,
                        'categoria_id' => $detalle['categoria_id'],
                        'peso_kg' => $detalle['peso_ajustado'],
                        'persona_id' => $data['proveedor_id'],
                        'concepto' => "Compra proveedor - {$numeroLiquidacion}",
                        'observaciones' => $data['observaciones'] ?? null
                    ]);
                } catch (Exception $kex) {
                    error_log("Error registrando movimiento físico en kardex: " . $kex->getMessage());
                }
            }

            // Registrar movimiento financiero según forma de pago
            if ($data['forma_pago'] === 'contado' && $totalAPagar > 0) {
                // CONTADO: Registrar egreso financiero inmediato (dinero sale)
                try {
                    $kardexHelper->registrarMovimientoFinanciero([
                        'fecha_movimiento' => $data['fecha_liquidacion'] ?? date('Y-m-d H:i:s'),
                        'tipo_movimiento' => 'egreso',
                        'documento_tipo' => 'liquidacion_proveedor',
                        'documento_id' => $liquidacionId,
                        'documento_numero' => $numeroLiquidacion,
                        'cuenta_tipo' => $data['cuenta_pago'] ?? 'banco',
                        'monto' => $totalAPagar,
                        'persona_id' => $data['proveedor_id'],
                        'concepto' => "Pago compra contado - {$numeroLiquidacion}",
                        'observaciones' => $data['observaciones'] ?? null
                    ]);
                } catch (Exception $kex) {
                    error_log("Error registrando movimiento financiero en kardex: " . $kex->getMessage());
                }
            }
            // ADELANTO: NO registrar egreso (ya salió antes)
            // CRÉDITO: NO registrar egreso (se registrará cuando se pague)

            // Actualizar estado del lote si existe
            if (!empty($data['lote_id'])) {
                $queryUpdateLote = "UPDATE lotes SET estado = 'liquidado' WHERE id = :lote_id";
                $stmtUpdateLote = $this->conn->prepare($queryUpdateLote);
                $stmtUpdateLote->bindParam(':lote_id', $data['lote_id'], PDO::PARAM_INT);
                $stmtUpdateLote->execute();
            }

            $this->conn->commit();

            logMessage('INFO', 'Liquidación de proveedor creada', [
                'liquidacion_id' => $liquidacionId,
                'numero' => $numeroLiquidacion,
                'forma_pago' => $data['forma_pago']
            ]);

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'liquidacion_id' => $liquidacionId,
                'numero_liquidacion' => $numeroLiquidacion,
                'estado_pago' => $estadoPago,
                'total_adelantos' => $totalAdelantos,
                'total_a_pagar' => $totalAPagar,
                'message' => 'Liquidación creada exitosamente'
            ]);
        } catch (Exception $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            throw $e;
        }
    }

    /**
     * PUT /liquidaciones-proveedores/:id/registrar-pago
     * Registrar pago para liquidación a crédito
     * 
     * Body: {
     *   monto: number,
     *   fecha_pago: string,
     *   cuenta_tipo: 'banco'|'caja'
     * }
     */
    public function registrarPago($id) {
        try {
            $data = json_decode(file_get_contents("php://input"), true);

            if (empty($data['monto'])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'El monto es requerido'
                ]);
                return;
            }

            // Obtener liquidación
            $query = "SELECT * FROM {$this->tableLiquidaciones} 
                      WHERE id = :id AND tipo_liquidacion = 'proveedor'";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            $liquidacion = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$liquidacion) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Liquidación no encontrada'
                ]);
                return;
            }

            $this->conn->beginTransaction();

            // Calcular nuevo saldo
            $montoPagado = $liquidacion['monto_pagado'] ?? 0;
            $nuevoMontoPagado = $montoPagado + $data['monto'];
            $totalAPagar = $liquidacion['total_a_pagar'];
            
            $nuevoEstado = 'pagado_parcial';
            if ($nuevoMontoPagado >= $totalAPagar) {
                $nuevoEstado = 'pagado_total';
                $nuevoMontoPagado = $totalAPagar;
            }

            // Actualizar liquidación
            $queryUpdate = "UPDATE {$this->tableLiquidaciones}
                            SET monto_pagado = :monto_pagado,
                                estado_pago = :estado_pago,
                                fecha_pago = :fecha_pago
                            WHERE id = :id";

            $stmtUpdate = $this->conn->prepare($queryUpdate);
            $stmtUpdate->execute([
                ':monto_pagado' => $nuevoMontoPagado,
                ':estado_pago' => $nuevoEstado,
                ':fecha_pago' => $data['fecha_pago'] ?? date('Y-m-d H:i:s'),
                ':id' => $id
            ]);

            // Registrar egreso financiero en kardex
            try {
                $kardexHelper = new KardexIntegralHelper($this->conn);
                $kardexHelper->registrarMovimientoFinanciero([
                    'fecha_movimiento' => $data['fecha_pago'] ?? date('Y-m-d H:i:s'),
                    'tipo_movimiento' => 'egreso',
                    'documento_tipo' => 'pago_liquidacion_proveedor',
                    'documento_id' => $id,
                    'documento_numero' => $liquidacion['numero_liquidacion'],
                    'cuenta_tipo' => $data['cuenta_tipo'] ?? 'banco',
                    'monto' => $data['monto'],
                    'persona_id' => $liquidacion['persona_id'],
                    'concepto' => "Pago liquidación - {$liquidacion['numero_liquidacion']}",
                    'observaciones' => $data['observaciones'] ?? null
                ]);
            } catch (Exception $kex) {
                error_log("Error registrando pago en kardex: " . $kex->getMessage());
            }

            $this->conn->commit();

            echo json_encode([
                'success' => true,
                'monto_pagado' => $nuevoMontoPagado,
                'estado_pago' => $nuevoEstado,
                'message' => 'Pago registrado exitosamente'
            ]);
        } catch (Exception $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            throw $e;
        }
    }

    /**
     * GET /liquidaciones-proveedores/:id/comprobante
     * Generar comprobante de compra
     */
    public function generarComprobante($id) {
        try {
            // Obtener datos completos de la liquidación
            $query = "SELECT l.*, 
                             p.nombre_completo as proveedor_nombre,
                             p.documento_identidad,
                             p.telefono,
                             p.direccion,
                             p.banco,
                             p.cuenta_bancaria,
                             lot.numero_lote
                      FROM {$this->tableLiquidaciones} l
                      LEFT JOIN personas p ON l.persona_id = p.id
                      LEFT JOIN lotes lot ON l.lote_id = lot.id
                      WHERE l.id = :id AND l.tipo_liquidacion = 'proveedor'";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            $liquidacion = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$liquidacion) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Liquidación no encontrada'
                ]);
                return;
            }

            // Obtener detalles
            $queryDetalle = "SELECT ld.*, c.nombre as categoria_nombre
                             FROM {$this->tableDetalle} ld
                             LEFT JOIN categorias_peso c ON ld.categoria_id = c.id
                             WHERE ld.liquidacion_id = :liquidacion_id
                             ORDER BY c.nombre";

            $stmtDetalle = $this->conn->prepare($queryDetalle);
            $stmtDetalle->bindParam(':liquidacion_id', $id, PDO::PARAM_INT);
            $stmtDetalle->execute();
            $detalles = $stmtDetalle->fetchAll(PDO::FETCH_ASSOC);

            $liquidacion['detalle_categorias'] = $detalles;

            echo json_encode([
                'success' => true,
                'data' => $liquidacion,
                'tipo_documento' => 'comprobante_compra'
            ]);
        } catch (Exception $e) {
            throw $e;
        }
    }
}
