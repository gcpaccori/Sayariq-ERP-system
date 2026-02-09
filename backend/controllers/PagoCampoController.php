<?php
class PagoCampoController {
    private $conn;
    private $table = "pagos_campo";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest($method, $id, $action) {
        switch($method) {
            case 'GET':
                if ($id) {
                    $this->getOne($id);
                } else if ($action === 'por-productor') {
                    $this->getByProductor();
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
        $query = "SELECT pc.*, p.nombre_completo as productor_nombre,
                  l.numero_lote, ac.total_proceso as total_liquidacion
                  FROM " . $this->table . " pc
                  LEFT JOIN personas p ON pc.productor_id = p.id
                  LEFT JOIN lotes l ON pc.lote_id = l.id
                  LEFT JOIN ajustes_contables ac ON ac.lote_id = l.id
                  ORDER BY pc.created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function getOne($id) {
        $query = "SELECT pc.*, p.nombre_completo as productor_nombre,
                  p.documento_identidad, p.cuenta_bancaria, p.banco,
                  l.numero_lote, ac.total_proceso as total_liquidacion
                  FROM " . $this->table . " pc
                  LEFT JOIN personas p ON pc.productor_id = p.id
                  LEFT JOIN lotes l ON pc.lote_id = l.id
                  LEFT JOIN ajustes_contables ac ON ac.lote_id = l.id
                  WHERE pc.id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function getByProductor() {
        $data = json_decode(file_get_contents("php://input"));
        $productorId = $data->productor_id ?? null;
        
        if (!$productorId) {
            http_response_code(400);
            echo json_encode(["message" => "productor_id requerido"]);
            return;
        }
        
        $query = "SELECT pc.*, l.numero_lote, ac.total_proceso as total_liquidacion
                  FROM " . $this->table . " pc
                  LEFT JOIN lotes l ON pc.lote_id = l.id
                  LEFT JOIN ajustes_contables ac ON ac.lote_id = l.id
                  WHERE pc.productor_id = :productor
                  ORDER BY pc.created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':productor', $productorId);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function create() {
        $data = json_decode(file_get_contents("php://input"));
        
        $query = "INSERT INTO " . $this->table . " 
                  (lote_id, productor_id, total_liquidacion, total_adelantos, adelanto_restante, 
                   monto_pago, saldo_pendiente, fecha_pago, datos_bancarios, observaciones, estado) 
                  VALUES (:lote, :prod, :total_liq, :total_adel, :adel_rest, :monto, :saldo, 
                          :fecha, :datos, :obs, :estado)";
        
        $stmt = $this->conn->prepare($query);
        
        $lote = $data->lote_id ?? null;
        $prod = $data->productor_id ?? null;
        $totalLiq = $data->total_liquidacion ?? 0;
        $totalAdel = $data->total_adelantos ?? 0;
        $adelRest = $data->adelanto_restante ?? 0;
        $monto = $data->monto_pago ?? 0;
        $saldo = $data->saldo_pendiente ?? 0;
        $fecha = $data->fecha_pago ?? null;
        $datos = $data->datos_bancarios ?? '';
        $obs = $data->observaciones ?? '';
        $estado = $data->estado ?? 'pendiente';
        
        $stmt->bindParam(':lote', $lote);
        $stmt->bindParam(':prod', $prod);
        $stmt->bindParam(':total_liq', $totalLiq);
        $stmt->bindParam(':total_adel', $totalAdel);
        $stmt->bindParam(':adel_rest', $adelRest);
        $stmt->bindParam(':monto', $monto);
        $stmt->bindParam(':saldo', $saldo);
        $stmt->bindParam(':fecha', $fecha);
        $stmt->bindParam(':datos', $datos);
        $stmt->bindParam(':obs', $obs);
        $stmt->bindParam(':estado', $estado);
        
        if($stmt->execute()) {
            $pagoId = (int)$this->conn->lastInsertId();

            if ($monto > 0) {
                try {
                    $productorNombre = null;
                    if ($prod) {
                        $stmtProd = $this->conn->prepare("SELECT nombre_completo FROM personas WHERE id = :id");
                        $stmtProd->execute([':id' => $prod]);
                        $prodRow = $stmtProd->fetch(PDO::FETCH_ASSOC);
                        $productorNombre = $prodRow['nombre_completo'] ?? null;
                    }

                    $kardexHelper = new KardexIntegralHelper($this->conn);
                    $kardexHelper->registrarMovimientoFinanciero([
                        'fecha_movimiento' => $fecha ?? date('Y-m-d'),
                        'tipo_movimiento' => 'egreso',
                        'documento_tipo' => 'pago',
                        'documento_id' => $pagoId,
                        'documento_numero' => $lote ? "LOTE-{$lote}" : null,
                        'cuenta_tipo' => 'banco',
                        'monto' => (float)$monto,
                        'persona_id' => $prod,
                        'persona_nombre' => $productorNombre,
                        'persona_tipo' => 'productor',
                        'concepto' => $lote ? "Pago de campo Lote {$lote}" : "Pago de campo"
                    ]);
                } catch (Exception $e) {
                    error_log("Error al registrar pago en kardex integral: " . $e->getMessage());
                }
            }

            http_response_code(201);
            echo json_encode(["message" => "Pago creado", "id" => $pagoId]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al crear pago"]);
        }
    }

    public function update($id) {
        $data = json_decode(file_get_contents("php://input"));

        $stmtPrev = $this->conn->prepare("SELECT * FROM {$this->table} WHERE id = :id");
        $stmtPrev->bindParam(':id', $id, PDO::PARAM_INT);
        $stmtPrev->execute();
        $prev = $stmtPrev->fetch(PDO::FETCH_ASSOC);
        
        $query = "UPDATE " . $this->table . " SET 
                  lote_id = :lote,
                  productor_id = :prod,
                  total_liquidacion = :total_liq,
                  total_adelantos = :total_adel,
                  adelanto_restante = :adel_rest,
                  monto_pago = :monto,
                  saldo_pendiente = :saldo,
                  fecha_pago = :fecha,
                  datos_bancarios = :datos,
                  observaciones = :obs,
                  estado = :estado
                  WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        
        $lote = $data->lote_id ?? null;
        $prod = $data->productor_id ?? null;
        $totalLiq = $data->total_liquidacion ?? 0;
        $totalAdel = $data->total_adelantos ?? 0;
        $adelRest = $data->adelanto_restante ?? 0;
        $monto = $data->monto_pago ?? 0;
        $saldo = $data->saldo_pendiente ?? 0;
        $fecha = $data->fecha_pago ?? null;
        $datos = $data->datos_bancarios ?? '';
        $obs = $data->observaciones ?? '';
        $estado = $data->estado ?? 'pendiente';
        
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':lote', $lote);
        $stmt->bindParam(':prod', $prod);
        $stmt->bindParam(':total_liq', $totalLiq);
        $stmt->bindParam(':total_adel', $totalAdel);
        $stmt->bindParam(':adel_rest', $adelRest);
        $stmt->bindParam(':monto', $monto);
        $stmt->bindParam(':saldo', $saldo);
        $stmt->bindParam(':fecha', $fecha);
        $stmt->bindParam(':datos', $datos);
        $stmt->bindParam(':obs', $obs);
        $stmt->bindParam(':estado', $estado);
        
        if($stmt->execute()) {
            if ($prev) {
                $prevMonto = (float)($prev['monto_pago'] ?? 0);
                $prevFecha = $prev['fecha_pago'] ?? date('Y-m-d');
                $prevProd = $prev['productor_id'] ?? null;
                $prevLote = $prev['lote_id'] ?? null;

                $cambio = $prevMonto !== (float)$monto || $prevFecha !== $fecha || $prevProd != $prod || $prevLote != $lote;

                if ($cambio) {
                    try {
                        $productorNombre = null;
                        if ($prod) {
                            $stmtProd = $this->conn->prepare("SELECT nombre_completo FROM personas WHERE id = :id");
                            $stmtProd->execute([':id' => $prod]);
                            $prodRow = $stmtProd->fetch(PDO::FETCH_ASSOC);
                            $productorNombre = $prodRow['nombre_completo'] ?? null;
                        }

                        $kardexHelper = new KardexIntegralHelper($this->conn);

                        if ($prevMonto > 0) {
                            $kardexHelper->registrarMovimientoFinanciero([
                                'fecha_movimiento' => $prevFecha,
                                'tipo_movimiento' => 'ingreso',
                                'documento_tipo' => 'pago',
                                'documento_id' => (int)$id,
                                'documento_numero' => $prevLote ? "LOTE-{$prevLote}" : null,
                                'cuenta_tipo' => 'banco',
                                'monto' => $prevMonto,
                                'persona_id' => $prevProd,
                                'persona_nombre' => $productorNombre,
                                'persona_tipo' => 'productor',
                                'concepto' => $prevLote ? "Reverso pago de campo Lote {$prevLote}" : "Reverso pago de campo"
                            ]);
                        }

                        if ($monto > 0) {
                            $kardexHelper->registrarMovimientoFinanciero([
                                'fecha_movimiento' => $fecha ?? date('Y-m-d'),
                                'tipo_movimiento' => 'egreso',
                                'documento_tipo' => 'pago',
                                'documento_id' => (int)$id,
                                'documento_numero' => $lote ? "LOTE-{$lote}" : null,
                                'cuenta_tipo' => 'banco',
                                'monto' => (float)$monto,
                                'persona_id' => $prod,
                                'persona_nombre' => $productorNombre,
                                'persona_tipo' => 'productor',
                                'concepto' => $lote ? "Ajuste pago de campo Lote {$lote}" : "Ajuste pago de campo"
                            ]);
                        }
                    } catch (Exception $e) {
                        error_log("Error al ajustar pago en kardex integral: " . $e->getMessage());
                    }
                }
            }
            echo json_encode(["message" => "Pago actualizado"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al actualizar pago"]);
        }
    }

    public function delete($id) {
        $stmtPrev = $this->conn->prepare("SELECT * FROM {$this->table} WHERE id = :id");
        $stmtPrev->bindParam(':id', $id, PDO::PARAM_INT);
        $stmtPrev->execute();
        $prev = $stmtPrev->fetch(PDO::FETCH_ASSOC);

        $query = "DELETE FROM " . $this->table . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        
        if($stmt->execute()) {
            if ($prev) {
                try {
                    $productorNombre = null;
                    if (!empty($prev['productor_id'])) {
                        $stmtProd = $this->conn->prepare("SELECT nombre_completo FROM personas WHERE id = :id");
                        $stmtProd->execute([':id' => $prev['productor_id']]);
                        $prodRow = $stmtProd->fetch(PDO::FETCH_ASSOC);
                        $productorNombre = $prodRow['nombre_completo'] ?? null;
                    }

                    $monto = (float)($prev['monto_pago'] ?? 0);
                    if ($monto > 0) {
                        $kardexHelper = new KardexIntegralHelper($this->conn);
                        $kardexHelper->registrarMovimientoFinanciero([
                            'fecha_movimiento' => $prev['fecha_pago'] ?? date('Y-m-d'),
                            'tipo_movimiento' => 'ingreso',
                            'documento_tipo' => 'pago',
                            'documento_id' => (int)$id,
                            'documento_numero' => !empty($prev['lote_id']) ? "LOTE-{$prev['lote_id']}" : null,
                            'cuenta_tipo' => 'banco',
                            'monto' => $monto,
                            'persona_id' => $prev['productor_id'] ?? null,
                            'persona_nombre' => $productorNombre,
                            'persona_tipo' => 'productor',
                            'concepto' => !empty($prev['lote_id']) ? "Reverso pago de campo Lote {$prev['lote_id']}" : "Reverso pago de campo"
                        ]);
                    }
                } catch (Exception $e) {
                    error_log("Error al eliminar pago en kardex integral: " . $e->getMessage());
                }
            }
            echo json_encode(["message" => "Pago eliminado"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al eliminar pago"]);
        }
    }
}
?>
