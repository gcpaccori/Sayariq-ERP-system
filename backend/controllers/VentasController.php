<?php
class VentasController {
    private $conn;
    private $table = "ventas";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest($method, $id, $action) {
        switch($method) {
            case 'GET':
                if ($id) {
                    $this->getOne($id);
                } else if ($action === 'pedido-lotes') {
                    $this->getLotesVendidosPorPedido();
                } else if ($action === 'por-pedido') {
                    $this->getByPedido();
                } else {
                    $this->getAll();
                }
                break;
            case 'POST':
                $this->create();
                break;
            case 'PUT':
                $this->update($id);
                break;
            case 'DELETE':
                $this->delete($id);
                break;
        }
    }

    public function getAll() {
        $query = "SELECT v.*, p.numero_pedido, pc.nombre_completo as cliente_nombre
                  FROM " . $this->table . " v
                  LEFT JOIN pedidos p ON v.pedido_id = p.id
                  LEFT JOIN personas pc ON p.cliente_id = pc.id
                  ORDER BY v.created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function getOne($id) {
        $query = "SELECT v.*, p.numero_pedido, p.kg_neto, pc.nombre_completo as cliente_nombre,
                  pc.cuenta_bancaria, pc.banco
                  FROM " . $this->table . " v
                  LEFT JOIN pedidos p ON v.pedido_id = p.id
                  LEFT JOIN personas pc ON p.cliente_id = pc.id
                  WHERE v.id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function getByPedido() {
        $pedidoId = $_GET['pedido_id'] ?? null;
        if (!$pedidoId) {
            $data = json_decode(file_get_contents("php://input"));
            $pedidoId = $data->pedido_id ?? null;
        }
        
        if (!$pedidoId) {
            http_response_code(400);
            echo json_encode(["message" => "pedido_id requerido"]);
            return;
        }
        
        $query = "SELECT v.* FROM " . $this->table . " v
                  WHERE v.pedido_id = :pedido_id
                  ORDER BY v.created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':pedido_id', $pedidoId);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function getLotesVendidosPorPedido() {
        $pedidoId = $_GET['pedido_id'] ?? null;
        if (!$pedidoId) {
            $data = json_decode(file_get_contents("php://input"));
            $pedidoId = $data->pedido_id ?? null;
        }

        if (!$pedidoId) {
            http_response_code(400);
            echo json_encode(["message" => "pedido_id requerido"]);
            return;
        }

        $query = "SELECT 
                    vl.lote_id,
                    l.numero_lote,
                    l.producto,
                    vl.categoria_id,
                    vl.categoria,
                    SUM(vl.kg_vendido) AS kg_vendido
                  FROM venta_lotes vl
                  INNER JOIN ventas v ON v.id = vl.venta_id
                  INNER JOIN lotes l ON l.id = vl.lote_id
                  WHERE v.pedido_id = :pedido_id
                  GROUP BY vl.lote_id, vl.categoria_id, vl.categoria, l.numero_lote, l.producto
                  ORDER BY l.numero_lote ASC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':pedido_id', $pedidoId);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function create() {
        $data = json_decode(file_get_contents("php://input"), true);

        if (!is_array($data)) {
            http_response_code(400);
            echo json_encode(["message" => "Datos inválidos"]);
            return;
        }

        $lotes = $data['lotes'] ?? [];

        if (!empty($lotes) && is_array($lotes)) {
            $pedidoId = isset($data['pedido_id']) ? (int)$data['pedido_id'] : 0;
            if (!$pedidoId) {
                http_response_code(400);
                echo json_encode(["message" => "pedido_id requerido"]);
                return;
            }

            $stmtPedido = $this->conn->prepare("SELECT p.producto, p.categoria, p.cliente_id, per.nombre_completo AS cliente_nombre
                                                 FROM pedidos p
                                                 LEFT JOIN personas per ON p.cliente_id = per.id
                                                 WHERE p.id = :pedido_id");
            $stmtPedido->execute([':pedido_id' => $pedidoId]);
            $pedidoInfo = $stmtPedido->fetch(PDO::FETCH_ASSOC);

            if (!$pedidoInfo) {
                http_response_code(404);
                echo json_encode(["message" => "Pedido no encontrado"]);
                return;
            }

            $fecha = $data['fecha_venta'] ?? date('Y-m-d');
            $obs = $data['observaciones'] ?? '';
            $prod = $pedidoInfo['producto'] ?? ($data['producto'] ?? '');

            $detalles = [];
            $totalKg = 0;
            $total = 0;
            $categorias = [];

            foreach ($lotes as $lote) {
                $loteId = isset($lote['lote_id']) ? (int)$lote['lote_id'] : 0;
                $categoriaId = isset($lote['categoria_id']) ? (int)$lote['categoria_id'] : null;
                $categoriaNombre = trim($lote['categoria'] ?? $lote['categoria_nombre'] ?? '');
                $kg = isset($lote['kg_vendido']) ? (float)$lote['kg_vendido'] : (isset($lote['kg']) ? (float)$lote['kg'] : 0);
                $precioUnitario = isset($lote['precio_unitario']) ? (float)$lote['precio_unitario'] : (isset($data['precio']) ? (float)$data['precio'] : 0);

                if (!$loteId || $kg <= 0 || $precioUnitario <= 0) {
                    continue;
                }

                $sqlAsignado = "SELECT COALESCE(SUM(COALESCE(kg_asignado, peso_asignado, 0)), 0) AS asignado
                                FROM pedido_lotes
                                WHERE pedido_id = :pedido_id
                                  AND lote_id = :lote_id
                                  AND (
                                        (categoria_id IS NOT NULL AND categoria_id = :categoria_id)
                                        OR (categoria_id IS NULL AND LOWER(categoria) = LOWER(:categoria_nombre))
                                      )";
                $stmtAsignado = $this->conn->prepare($sqlAsignado);
                $stmtAsignado->execute([
                    ':pedido_id' => $pedidoId,
                    ':lote_id' => $loteId,
                    ':categoria_id' => $categoriaId,
                    ':categoria_nombre' => $categoriaNombre,
                ]);
                $asignado = (float)($stmtAsignado->fetchColumn() ?: 0);

                $sqlVendido = "SELECT COALESCE(SUM(vl.kg_vendido), 0) AS vendido
                               FROM venta_lotes vl
                               INNER JOIN ventas v ON v.id = vl.venta_id
                               WHERE v.pedido_id = :pedido_id
                                 AND vl.lote_id = :lote_id
                                 AND (
                                       (vl.categoria_id IS NOT NULL AND vl.categoria_id = :categoria_id)
                                       OR (vl.categoria_id IS NULL AND LOWER(vl.categoria) = LOWER(:categoria_nombre))
                                     )";
                $stmtVendido = $this->conn->prepare($sqlVendido);
                $stmtVendido->execute([
                    ':pedido_id' => $pedidoId,
                    ':lote_id' => $loteId,
                    ':categoria_id' => $categoriaId,
                    ':categoria_nombre' => $categoriaNombre,
                ]);
                $vendido = (float)($stmtVendido->fetchColumn() ?: 0);

                $disponible = $asignado - $vendido;

                if ($kg > $disponible + 0.001) {
                    http_response_code(400);
                    echo json_encode([
                        "message" => "No hay saldo suficiente para el lote asignado",
                        "lote_id" => $loteId,
                        "categoria" => $categoriaNombre,
                        "asignado" => $asignado,
                        "vendido" => $vendido,
                        "disponible" => $disponible,
                        "kg_solicitado" => $kg
                    ]);
                    return;
                }

                $lineTotal = $kg * $precioUnitario;
                $totalKg += $kg;
                $total += $lineTotal;
                if ($categoriaNombre) {
                    $categorias[] = $categoriaNombre;
                }

                $detalles[] = [
                    'lote_id' => $loteId,
                    'categoria_id' => $categoriaId,
                    'categoria' => $categoriaNombre,
                    'kg_vendido' => $kg,
                    'precio_unitario' => $precioUnitario,
                    'total' => $lineTotal,
                ];
            }

            if (empty($detalles)) {
                http_response_code(400);
                echo json_encode(["message" => "No hay lotes válidos para registrar la venta"]);
                return;
            }

            $categoriaResumen = count(array_unique($categorias)) > 1 ? 'MIXTO' : ($categorias[0] ?? $pedidoInfo['categoria'] ?? '');
            $precioResumen = $totalKg > 0 ? $total / $totalKg : 0;

            try {
                $this->conn->beginTransaction();

                $query = "INSERT INTO " . $this->table . " 
                          (pedido_id, producto, categoria, kg, precio, total, fecha_venta, observaciones) 
                          VALUES (:pedido, :prod, :cat, :kg, :precio, :total, :fecha, :obs)";
                $stmt = $this->conn->prepare($query);
                $stmt->execute([
                    ':pedido' => $pedidoId,
                    ':prod' => $prod,
                    ':cat' => $categoriaResumen,
                    ':kg' => $totalKg,
                    ':precio' => $precioResumen,
                    ':total' => $total,
                    ':fecha' => $fecha,
                    ':obs' => $obs,
                ]);

                $ventaId = (int)$this->conn->lastInsertId();

                $stmtDetalle = $this->conn->prepare(
                    "INSERT INTO venta_lotes 
                        (venta_id, lote_id, categoria_id, categoria, kg_vendido, precio_unitario, total)
                     VALUES
                        (:venta_id, :lote_id, :categoria_id, :categoria, :kg_vendido, :precio_unitario, :total)"
                );

                foreach ($detalles as $detalle) {
                    $stmtDetalle->execute([
                        ':venta_id' => $ventaId,
                        ':lote_id' => $detalle['lote_id'],
                        ':categoria_id' => $detalle['categoria_id'],
                        ':categoria' => $detalle['categoria'],
                        ':kg_vendido' => $detalle['kg_vendido'],
                        ':precio_unitario' => $detalle['precio_unitario'],
                        ':total' => $detalle['total'],
                    ]);
                }

                // ✨ Registrar en kardex integral
                try {
                    $kardexHelper = new KardexIntegralHelper($this->conn);
                    $numeroFactura = 'VENTA-' . $ventaId;

                    foreach ($detalles as $detalle) {
                        $kardexHelper->registrarMovimientoFisico([
                            'fecha_movimiento' => $fecha,
                            'tipo_movimiento' => 'salida',
                            'documento_tipo' => 'venta',
                            'documento_id' => $ventaId,
                            'documento_numero' => $numeroFactura,
                            'lote_id' => $detalle['lote_id'],
                            'categoria_id' => $detalle['categoria_id'],
                            'categoria_nombre' => $detalle['categoria'],
                            'peso_kg' => $detalle['kg_vendido'],
                            'persona_id' => $pedidoInfo['cliente_id'] ?? null,
                            'persona_nombre' => $pedidoInfo['cliente_nombre'] ?? 'Cliente',
                            'persona_tipo' => 'cliente',
                            'concepto' => "Venta {$numeroFactura} - {$detalle['categoria']}"
                        ]);
                    }

                    if ($total > 0) {
                        $kardexHelper->registrarMovimientoFinanciero([
                            'fecha_movimiento' => $fecha,
                            'tipo_movimiento' => 'ingreso',
                            'documento_tipo' => 'venta',
                            'documento_id' => $ventaId,
                            'documento_numero' => $numeroFactura,
                            'cuenta_tipo' => 'banco',
                            'monto' => $total,
                            'persona_id' => $pedidoInfo['cliente_id'] ?? null,
                            'persona_nombre' => $pedidoInfo['cliente_nombre'] ?? 'Cliente',
                            'persona_tipo' => 'cliente',
                            'concepto' => "Cobro venta {$numeroFactura}"
                        ]);
                    }
                } catch (Exception $kex) {
                    error_log("Error al registrar venta en kardex integral: " . $kex->getMessage());
                }

                $this->conn->commit();

                http_response_code(201);
                echo json_encode(["message" => "Venta creada", "id" => $ventaId]);
            } catch (Exception $e) {
                $this->conn->rollBack();
                http_response_code(500);
                echo json_encode(["message" => "Error al crear venta", "error" => $e->getMessage()]);
            }

            return;
        }

        $dataObj = (object)$data;

        $query = "INSERT INTO " . $this->table . " 
                  (pedido_id, producto, categoria, kg, precio, total, fecha_venta, observaciones) 
                  VALUES (:pedido, :prod, :cat, :kg, :precio, :total, :fecha, :obs)";

        $stmt = $this->conn->prepare($query);

        $pedido = $dataObj->pedido_id ?? null;
        $prod = $dataObj->producto ?? '';
        $cat = $dataObj->categoria ?? '';
        $kg = $dataObj->kg ?? 0;
        $precio = $dataObj->precio ?? 0;
        $total = $kg * $precio;
        $fecha = $dataObj->fecha_venta ?? date('Y-m-d');
        $obs = $dataObj->observaciones ?? '';

        $stmt->bindParam(':pedido', $pedido);
        $stmt->bindParam(':prod', $prod);
        $stmt->bindParam(':cat', $cat);
        $stmt->bindParam(':kg', $kg);
        $stmt->bindParam(':precio', $precio);
        $stmt->bindParam(':total', $total);
        $stmt->bindParam(':fecha', $fecha);
        $stmt->bindParam(':obs', $obs);

        if($stmt->execute()) {
            $ventaId = (int)$this->conn->lastInsertId();

            // ✨ Registrar en kardex integral
            try {
                $kardexHelper = new KardexIntegralHelper($this->conn);

                // Obtener info del cliente y lote (si aplica)
                $queryInfo = "SELECT p.cliente_id, per.nombre_completo as cliente_nombre,
                                     p.lote_id, l.nombre as lote_nombre
                              FROM pedidos p
                              LEFT JOIN personas per ON p.cliente_id = per.id
                              LEFT JOIN lotes l ON p.lote_id = l.id
                              WHERE p.id = :pedido_id";
                $stmtInfo = $this->conn->prepare($queryInfo);
                $stmtInfo->execute([':pedido_id' => $pedido]);
                $info = $stmtInfo->fetch(PDO::FETCH_ASSOC);

                $kardexHelper->registrarVenta([
                    'venta_id' => $ventaId,
                    'numero_factura' => 'VENTA-' . $ventaId,
                    'fecha_venta' => $fecha,
                    'lote_id' => $info['lote_id'] ?? null,
                    'categoria_id' => null,
                    'categoria_nombre' => $cat,
                    'peso_kg' => $kg,
                    'cliente_id' => $info['cliente_id'] ?? null,
                    'cliente_nombre' => $info['cliente_nombre'] ?? 'Cliente',
                    'monto_total' => $total,
                    'forma_pago' => 'banco'
                ]);
            } catch (Exception $kex) {
                error_log("Error al registrar venta en kardex integral: " . $kex->getMessage());
            }

            http_response_code(201);
            echo json_encode(["message" => "Venta creada", "id" => $ventaId]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al crear venta"]);
        }
    }

    public function update($id) {
        $data = json_decode(file_get_contents("php://input"));

        $stmtPrev = $this->conn->prepare("SELECT * FROM " . $this->table . " WHERE id = :id");
        $stmtPrev->bindParam(':id', $id);
        $stmtPrev->execute();
        $prev = $stmtPrev->fetch(PDO::FETCH_ASSOC);
        
        $query = "UPDATE " . $this->table . " SET 
                  pedido_id = :pedido,
                  producto = :prod,
                  categoria = :cat,
                  kg = :kg,
                  precio = :precio,
                  total = :total,
                  fecha_venta = :fecha,
                  observaciones = :obs
                  WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        
        $pedido = $data->pedido_id ?? null;
        $prod = $data->producto ?? '';
        $cat = $data->categoria ?? '';
        $kg = $data->kg ?? 0;
        $precio = $data->precio ?? 0;
        $total = $kg * $precio;
        $fecha = $data->fecha_venta ?? date('Y-m-d');
        $obs = $data->observaciones ?? '';
        
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':pedido', $pedido);
        $stmt->bindParam(':prod', $prod);
        $stmt->bindParam(':cat', $cat);
        $stmt->bindParam(':kg', $kg);
        $stmt->bindParam(':precio', $precio);
        $stmt->bindParam(':total', $total);
        $stmt->bindParam(':fecha', $fecha);
        $stmt->bindParam(':obs', $obs);
        
        if($stmt->execute()) {
            if ($prev) {
                $prevKg = (float)($prev['kg'] ?? 0);
                $prevTotal = (float)($prev['total'] ?? ($prevKg * (float)($prev['precio'] ?? 0)));
                $prevCat = $prev['categoria'] ?? '';
                $prevPedido = $prev['pedido_id'] ?? null;
                $prevFecha = $prev['fecha_venta'] ?? date('Y-m-d');

                $cambio = ($prevKg != (float)$kg)
                    || ($prevTotal != (float)$total)
                    || ($prevCat !== $cat)
                    || ($prevPedido != $pedido)
                    || ($prevFecha !== $fecha);

                if ($cambio) {
                    try {
                        $kardexHelper = new KardexIntegralHelper($this->conn);

                        $infoPrev = null;
                        if ($prevPedido) {
                            $stmtInfoPrev = $this->conn->prepare("SELECT p.cliente_id, per.nombre_completo as cliente_nombre,
                                                                          p.lote_id, l.nombre as lote_nombre
                                                                   FROM pedidos p
                                                                   LEFT JOIN personas per ON p.cliente_id = per.id
                                                                   LEFT JOIN lotes l ON p.lote_id = l.id
                                                                   WHERE p.id = :pedido_id");
                            $stmtInfoPrev->execute([':pedido_id' => $prevPedido]);
                            $infoPrev = $stmtInfoPrev->fetch(PDO::FETCH_ASSOC);
                        }

                        if ($prevKg > 0) {
                            $kardexHelper->registrarMovimientoFisico([
                                'fecha_movimiento' => $prevFecha,
                                'tipo_movimiento' => 'ingreso',
                                'documento_tipo' => 'venta',
                                'documento_id' => (int)$id,
                                'documento_numero' => 'VENTA-' . $id,
                                'lote_id' => $infoPrev['lote_id'] ?? null,
                                'categoria_nombre' => $prevCat,
                                'peso_kg' => $prevKg,
                                'persona_id' => $infoPrev['cliente_id'] ?? null,
                                'persona_nombre' => $infoPrev['cliente_nombre'] ?? null,
                                'persona_tipo' => 'cliente',
                                'concepto' => "Reverso venta VENTA-{$id}"
                            ]);
                        }

                        if ($prevTotal > 0) {
                            $kardexHelper->registrarMovimientoFinanciero([
                                'fecha_movimiento' => $prevFecha,
                                'tipo_movimiento' => 'egreso',
                                'documento_tipo' => 'venta',
                                'documento_id' => (int)$id,
                                'documento_numero' => 'VENTA-' . $id,
                                'cuenta_tipo' => 'banco',
                                'monto' => $prevTotal,
                                'persona_id' => $infoPrev['cliente_id'] ?? null,
                                'persona_nombre' => $infoPrev['cliente_nombre'] ?? null,
                                'persona_tipo' => 'cliente',
                                'concepto' => "Reverso cobro venta VENTA-{$id}"
                            ]);
                        }

                        $infoNew = null;
                        if ($pedido) {
                            $stmtInfoNew = $this->conn->prepare("SELECT p.cliente_id, per.nombre_completo as cliente_nombre,
                                                                          p.lote_id, l.nombre as lote_nombre
                                                                   FROM pedidos p
                                                                   LEFT JOIN personas per ON p.cliente_id = per.id
                                                                   LEFT JOIN lotes l ON p.lote_id = l.id
                                                                   WHERE p.id = :pedido_id");
                            $stmtInfoNew->execute([':pedido_id' => $pedido]);
                            $infoNew = $stmtInfoNew->fetch(PDO::FETCH_ASSOC);
                        }

                        if ($kg > 0) {
                            $kardexHelper->registrarMovimientoFisico([
                                'fecha_movimiento' => $fecha,
                                'tipo_movimiento' => 'salida',
                                'documento_tipo' => 'venta',
                                'documento_id' => (int)$id,
                                'documento_numero' => 'VENTA-' . $id,
                                'lote_id' => $infoNew['lote_id'] ?? null,
                                'categoria_nombre' => $cat,
                                'peso_kg' => (float)$kg,
                                'persona_id' => $infoNew['cliente_id'] ?? null,
                                'persona_nombre' => $infoNew['cliente_nombre'] ?? null,
                                'persona_tipo' => 'cliente',
                                'concepto' => "Ajuste venta VENTA-{$id}"
                            ]);
                        }

                        if ($total > 0) {
                            $kardexHelper->registrarMovimientoFinanciero([
                                'fecha_movimiento' => $fecha,
                                'tipo_movimiento' => 'ingreso',
                                'documento_tipo' => 'venta',
                                'documento_id' => (int)$id,
                                'documento_numero' => 'VENTA-' . $id,
                                'cuenta_tipo' => 'banco',
                                'monto' => (float)$total,
                                'persona_id' => $infoNew['cliente_id'] ?? null,
                                'persona_nombre' => $infoNew['cliente_nombre'] ?? null,
                                'persona_tipo' => 'cliente',
                                'concepto' => "Ajuste cobro venta VENTA-{$id}"
                            ]);
                        }
                    } catch (Exception $kex) {
                        error_log("Error al ajustar venta en kardex integral: " . $kex->getMessage());
                    }
                }
            }
            echo json_encode(["message" => "Venta actualizada"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al actualizar venta"]);
        }
    }

    public function delete($id) {
        $stmtPrev = $this->conn->prepare("SELECT * FROM " . $this->table . " WHERE id = :id");
        $stmtPrev->bindParam(':id', $id);
        $stmtPrev->execute();
        $prev = $stmtPrev->fetch(PDO::FETCH_ASSOC);

        $stmtLotes = $this->conn->prepare("DELETE FROM venta_lotes WHERE venta_id = :id");
        $stmtLotes->bindParam(':id', $id);
        $stmtLotes->execute();

        $query = "DELETE FROM " . $this->table . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        
        if($stmt->execute()) {
            if ($prev) {
                try {
                    $kardexHelper = new KardexIntegralHelper($this->conn);
                    $infoPrev = null;
                    if (!empty($prev['pedido_id'])) {
                        $stmtInfoPrev = $this->conn->prepare("SELECT p.cliente_id, per.nombre_completo as cliente_nombre,
                                                                      p.lote_id, l.nombre as lote_nombre
                                                               FROM pedidos p
                                                               LEFT JOIN personas per ON p.cliente_id = per.id
                                                               LEFT JOIN lotes l ON p.lote_id = l.id
                                                               WHERE p.id = :pedido_id");
                        $stmtInfoPrev->execute([':pedido_id' => $prev['pedido_id']]);
                        $infoPrev = $stmtInfoPrev->fetch(PDO::FETCH_ASSOC);
                    }

                    $prevKg = (float)($prev['kg'] ?? 0);
                    $prevTotal = (float)($prev['total'] ?? ($prevKg * (float)($prev['precio'] ?? 0)));
                    $prevFecha = $prev['fecha_venta'] ?? date('Y-m-d');

                    if ($prevKg > 0) {
                        $kardexHelper->registrarMovimientoFisico([
                            'fecha_movimiento' => $prevFecha,
                            'tipo_movimiento' => 'ingreso',
                            'documento_tipo' => 'venta',
                            'documento_id' => (int)$id,
                            'documento_numero' => 'VENTA-' . $id,
                            'lote_id' => $infoPrev['lote_id'] ?? null,
                            'categoria_nombre' => $prev['categoria'] ?? '',
                            'peso_kg' => $prevKg,
                            'persona_id' => $infoPrev['cliente_id'] ?? null,
                            'persona_nombre' => $infoPrev['cliente_nombre'] ?? null,
                            'persona_tipo' => 'cliente',
                            'concepto' => "Reverso venta VENTA-{$id}"
                        ]);
                    }

                    if ($prevTotal > 0) {
                        $kardexHelper->registrarMovimientoFinanciero([
                            'fecha_movimiento' => $prevFecha,
                            'tipo_movimiento' => 'egreso',
                            'documento_tipo' => 'venta',
                            'documento_id' => (int)$id,
                            'documento_numero' => 'VENTA-' . $id,
                            'cuenta_tipo' => 'banco',
                            'monto' => $prevTotal,
                            'persona_id' => $infoPrev['cliente_id'] ?? null,
                            'persona_nombre' => $infoPrev['cliente_nombre'] ?? null,
                            'persona_tipo' => 'cliente',
                            'concepto' => "Reverso cobro venta VENTA-{$id}"
                        ]);
                    }
                } catch (Exception $kex) {
                    error_log("Error al eliminar venta en kardex integral: " . $kex->getMessage());
                }
            }
            echo json_encode(["message" => "Venta eliminada"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al eliminar venta"]);
        }
    }
}
?>
