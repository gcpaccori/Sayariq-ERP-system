<?php
require_once '../helpers/KardexIntegralHelper.php';

class LiquidacionClientesController {
    private $conn;
    private $tableLiquidaciones = "liquidaciones";
    private $tableDetalle = "liquidaciones_detalle";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest($method, $id, $action) {
        try {
            switch ($method) {
                case 'GET':
                    if ($action === 'pendientes') {
                        $this->getPendientes();
                    } else if ($action === 'datos-cliente' && isset($_GET['cliente_id'])) {
                        $this->getDatosLiquidacion($_GET['cliente_id']);
                    } else if ($action === 'boleta' && $id) {
                        $this->generarBoleta($id);
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
                    if ($action === 'marcar-cobrado' && $id) {
                        $this->marcarComoCobrado($id);
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
            logMessage('ERROR', 'Error en LiquidacionClientesController', [
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
     * GET /liquidaciones-clientes
     * Obtener todas las liquidaciones de clientes
     */
    public function getAll() {
        try {
            $query = "SELECT l.*, 
                             p.nombre_completo as cliente_nombre,
                             ped.numero_pedido
                      FROM {$this->tableLiquidaciones} l
                      LEFT JOIN personas p ON l.persona_id = p.id
                      LEFT JOIN pedidos ped ON l.pedido_id = ped.id
                      WHERE l.tipo_liquidacion = 'cliente'
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
     * GET /liquidaciones-clientes/pendientes
     * Obtener clientes con pedidos pendientes de liquidación
     */
    public function getPendientes() {
        try {
            $query = "SELECT ped.id as pedido_id,
                             ped.numero_pedido,
                             ped.cliente_id,
                             p.nombre_completo as cliente_nombre,
                             ped.fecha_pedido,
                             ped.estado,
                             COUNT(DISTINCT pl.lote_id) as cantidad_lotes
                      FROM pedidos ped
                      INNER JOIN personas p ON ped.cliente_id = p.id
                      LEFT JOIN pedidos_lotes pl ON ped.id = pl.pedido_id
                      WHERE ped.estado IN ('procesando', 'listo')
                        AND NOT EXISTS (
                            SELECT 1 FROM {$this->tableLiquidaciones} l
                            WHERE l.pedido_id = ped.id AND l.tipo_liquidacion = 'cliente'
                        )
                      GROUP BY ped.id, ped.numero_pedido, ped.cliente_id, 
                               p.nombre_completo, ped.fecha_pedido, ped.estado
                      ORDER BY ped.fecha_pedido DESC";

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
     * GET /liquidaciones-clientes/datos-cliente?cliente_id=X
     * Obtener datos para crear nueva liquidación de cliente
     */
    public function getDatosLiquidacion($clienteId) {
        try {
            // Obtener datos del cliente
            $queryCliente = "SELECT * FROM personas WHERE id = :cliente_id AND tipo = 'cliente'";
            $stmtCliente = $this->conn->prepare($queryCliente);
            $stmtCliente->bindParam(':cliente_id', $clienteId, PDO::PARAM_INT);
            $stmtCliente->execute();
            $cliente = $stmtCliente->fetch(PDO::FETCH_ASSOC);

            if (!$cliente) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Cliente no encontrado'
                ]);
                return;
            }

            // Obtener pedidos pendientes del cliente
            $queryPedidos = "SELECT ped.*, 
                                    COUNT(DISTINCT pl.lote_id) as cantidad_lotes
                             FROM pedidos ped
                             LEFT JOIN pedidos_lotes pl ON ped.id = pl.pedido_id
                             WHERE ped.cliente_id = :cliente_id
                               AND ped.estado IN ('procesando', 'listo')
                               AND NOT EXISTS (
                                   SELECT 1 FROM {$this->tableLiquidaciones} l
                                   WHERE l.pedido_id = ped.id AND l.tipo_liquidacion = 'cliente'
                               )
                             GROUP BY ped.id
                             ORDER BY ped.fecha_pedido DESC";

            $stmtPedidos = $this->conn->prepare($queryPedidos);
            $stmtPedidos->bindParam(':cliente_id', $clienteId, PDO::PARAM_INT);
            $stmtPedidos->execute();
            $pedidos = $stmtPedidos->fetchAll(PDO::FETCH_ASSOC);

            // Obtener categorías con precios
            $queryCategorias = "SELECT * FROM categorias_peso ORDER BY nombre";
            $stmtCategorias = $this->conn->prepare($queryCategorias);
            $stmtCategorias->execute();
            $categorias = $stmtCategorias->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => [
                    'cliente' => $cliente,
                    'pedidos' => $pedidos,
                    'categorias' => $categorias
                ]
            ]);
        } catch (Exception $e) {
            throw $e;
        }
    }

    /**
     * GET /liquidaciones-clientes/:id
     * Obtener liquidación específica con detalles
     */
    public function getById($id) {
        try {
            // Obtener liquidación principal
            $query = "SELECT l.*, 
                             p.nombre_completo as cliente_nombre,
                             p.documento_identidad,
                             p.telefono,
                             p.direccion,
                             ped.numero_pedido
                      FROM {$this->tableLiquidaciones} l
                      LEFT JOIN personas p ON l.persona_id = p.id
                      LEFT JOIN pedidos ped ON l.pedido_id = ped.id
                      WHERE l.id = :id AND l.tipo_liquidacion = 'cliente'";

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
     * POST /liquidaciones-clientes
     * Crear nueva liquidación de cliente
     * 
     * Body: {
     *   cliente_id: number,
     *   pedido_id: number,
     *   fecha_liquidacion: string,
     *   detalles_categorias: [{categoria_id, peso_ajustado, precio_unitario}],
     *   monto_total: number,
     *   observaciones: string
     * }
     */
    public function create() {
        try {
            $data = json_decode(file_get_contents("php://input"), true);

            // Validar datos requeridos
            if (empty($data['cliente_id']) || empty($data['detalles_categorias']) || empty($data['monto_total'])) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'cliente_id, detalles_categorias y monto_total son requeridos'
                ]);
                return;
            }

            // Iniciar transacción
            $this->conn->beginTransaction();

            // Generar número único de liquidación
            $queryMaxNum = "SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(numero_liquidacion, '-', -1) AS UNSIGNED)), 0) as max_num
                            FROM {$this->tableLiquidaciones}
                            WHERE tipo_liquidacion = 'cliente'
                              AND YEAR(fecha_liquidacion) = YEAR(CURDATE())";
            $stmtMaxNum = $this->conn->prepare($queryMaxNum);
            $stmtMaxNum->execute();
            $maxNum = $stmtMaxNum->fetch(PDO::FETCH_ASSOC)['max_num'];
            $numeroLiquidacion = 'BV-' . date('Y') . '-' . str_pad($maxNum + 1, 4, '0', STR_PAD_LEFT);

            // Insertar liquidación principal
            $queryInsert = "INSERT INTO {$this->tableLiquidaciones} 
                            (numero_liquidacion, tipo_liquidacion, persona_id, pedido_id, 
                             fecha_liquidacion, total_bruto_fruta, total_a_pagar, 
                             estado_pago, observaciones, created_at)
                            VALUES 
                            (:numero_liquidacion, 'cliente', :cliente_id, :pedido_id,
                             :fecha_liquidacion, :total_bruto, :total_pagar,
                             'pendiente_cobro', :observaciones, NOW())";

            $stmt = $this->conn->prepare($queryInsert);
            $stmt->execute([
                ':numero_liquidacion' => $numeroLiquidacion,
                ':cliente_id' => $data['cliente_id'],
                ':pedido_id' => $data['pedido_id'] ?? null,
                ':fecha_liquidacion' => $data['fecha_liquidacion'] ?? date('Y-m-d H:i:s'),
                ':total_bruto' => $data['monto_total'],
                ':total_pagar' => $data['monto_total'],
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

                // Registrar movimiento físico SALIDA en kardex (producto sale)
                try {
                    $kardexHelper->registrarMovimientoFisico([
                        'fecha_movimiento' => $data['fecha_liquidacion'] ?? date('Y-m-d H:i:s'),
                        'tipo_movimiento' => 'salida',
                        'documento_tipo' => 'liquidacion_cliente',
                        'documento_id' => $liquidacionId,
                        'documento_numero' => $numeroLiquidacion,
                        'categoria_id' => $detalle['categoria_id'],
                        'peso_kg' => $detalle['peso_ajustado'],
                        'persona_id' => $data['cliente_id'],
                        'concepto' => "Venta cliente - {$numeroLiquidacion}",
                        'observaciones' => $data['observaciones'] ?? null
                    ]);
                } catch (Exception $kex) {
                    error_log("Error registrando movimiento físico en kardex: " . $kex->getMessage());
                }
            }

            // Registrar movimiento financiero INGRESO en kardex (dinero entra)
            try {
                $kardexHelper->registrarMovimientoFinanciero([
                    'fecha_movimiento' => $data['fecha_liquidacion'] ?? date('Y-m-d H:i:s'),
                    'tipo_movimiento' => 'ingreso',
                    'documento_tipo' => 'liquidacion_cliente',
                    'documento_id' => $liquidacionId,
                    'documento_numero' => $numeroLiquidacion,
                    'cuenta_tipo' => $data['forma_pago'] ?? 'banco',
                    'monto' => $data['monto_total'],
                    'persona_id' => $data['cliente_id'],
                    'concepto' => "Cobro venta - {$numeroLiquidacion}",
                    'observaciones' => $data['observaciones'] ?? null
                ]);
            } catch (Exception $kex) {
                error_log("Error registrando movimiento financiero en kardex: " . $kex->getMessage());
            }

            // Actualizar estado del pedido si existe
            if (!empty($data['pedido_id'])) {
                $queryUpdatePedido = "UPDATE pedidos SET estado = 'liquidado' WHERE id = :pedido_id";
                $stmtUpdatePedido = $this->conn->prepare($queryUpdatePedido);
                $stmtUpdatePedido->bindParam(':pedido_id', $data['pedido_id'], PDO::PARAM_INT);
                $stmtUpdatePedido->execute();
            }

            $this->conn->commit();

            logMessage('INFO', 'Liquidación de cliente creada', [
                'liquidacion_id' => $liquidacionId,
                'numero' => $numeroLiquidacion
            ]);

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'liquidacion_id' => $liquidacionId,
                'numero_liquidacion' => $numeroLiquidacion,
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
     * GET /liquidaciones-clientes/:id/boleta
     * Generar boleta de venta
     */
    public function generarBoleta($id) {
        try {
            // Obtener datos completos de la liquidación
            $query = "SELECT l.*, 
                             p.nombre_completo as cliente_nombre,
                             p.documento_identidad,
                             p.telefono,
                             p.direccion,
                             ped.numero_pedido
                      FROM {$this->tableLiquidaciones} l
                      LEFT JOIN personas p ON l.persona_id = p.id
                      LEFT JOIN pedidos ped ON l.pedido_id = ped.id
                      WHERE l.id = :id AND l.tipo_liquidacion = 'cliente'";

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
                'tipo_documento' => 'boleta_venta'
            ]);
        } catch (Exception $e) {
            throw $e;
        }
    }

    /**
     * PUT /liquidaciones-clientes/:id/marcar-cobrado
     * Marcar liquidación como cobrada
     */
    public function marcarComoCobrado($id) {
        try {
            $data = json_decode(file_get_contents("php://input"), true);

            $query = "UPDATE {$this->tableLiquidaciones}
                      SET estado_pago = 'cobrado_total',
                          fecha_cobro = NOW()
                      WHERE id = :id AND tipo_liquidacion = 'cliente'";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();

            if ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Liquidación no encontrada'
                ]);
                return;
            }

            echo json_encode([
                'success' => true,
                'message' => 'Liquidación marcada como cobrada'
            ]);
        } catch (Exception $e) {
            throw $e;
        }
    }
}
