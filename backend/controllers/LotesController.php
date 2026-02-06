<?php
class LotesController {
    private $conn;
    private $table = "lotes";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest($method, $id, $action) {
        switch($method) {
            case 'GET':
                if ($id) {
                    $this->getOne($id);
                } else if ($action === 'almacen') {
                    $this->getAlmacen();
                } else if ($action === 'por-liquidar') {
                    $this->getPorLiquidar();
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
        $query = "SELECT l.*, p.nombre_completo as productor_nombre 
                  FROM " . $this->table . " l
                  LEFT JOIN personas p ON l.productor_id = p.id
                  ORDER BY l.fecha_ingreso DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function getOne($id) {
        $query = "SELECT l.*, p.nombre_completo as productor_nombre,
                  p.documento_identidad, p.telefono, p.cuenta_bancaria
                  FROM " . $this->table . " l
                  LEFT JOIN personas p ON l.productor_id = p.id
                  WHERE l.id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function getAlmacen() {
        $query = "SELECT l.*, p.nombre_completo as productor_nombre,
                  (SELECT SUM(peso_exportable) FROM pesos_lote WHERE lote_id = l.id) as total_exportable,
                  (SELECT SUM(peso_industrial) FROM pesos_lote WHERE lote_id = l.id) as total_industrial,
                  (SELECT SUM(peso_descarte) FROM pesos_lote WHERE lote_id = l.id) as total_descarte
                  FROM " . $this->table . " l
                  LEFT JOIN personas p ON l.productor_id = p.id
                  WHERE l.estado IN ('proceso', 'pendiente')
                  ORDER BY l.fecha_ingreso DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function getPorLiquidar() {
        $query = "SELECT l.*, p.nombre_completo as productor_nombre,
                  (SELECT total_proceso FROM ajustes_contables WHERE lote_id = l.id ORDER BY id DESC LIMIT 1) as total_liquidacion
                  FROM " . $this->table . " l
                  LEFT JOIN personas p ON l.productor_id = p.id
                  WHERE l.estado = 'proceso'
                  ORDER BY l.fecha_proceso DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function create() {
        $data = json_decode(file_get_contents("php://input"));
        
        $query = "INSERT INTO " . $this->table . " 
                  (numero_lote, guia_ingreso, productor_id, producto, fecha_ingreso, 
                   peso_inicial, numero_jabas, estado, estado_frescura, observaciones) 
                  VALUES (:numero, :guia, :productor, :producto, :fecha, 
                          :peso, :jabas, :estado, :frescura, :obs)";
        
        $stmt = $this->conn->prepare($query);
        
        $numero = $data->numero_lote ?? '';
        $guia = $data->guia_ingreso ?? '';
        $productor = $data->productor_id ?? null;
        $producto = $data->producto ?? '';
        $fecha = $data->fecha_ingreso ?? date('Y-m-d');
        $peso = $data->peso_inicial ?? 0;
        $jabas = $data->numero_jabas ?? 0;
        $estado = $data->estado ?? 'pendiente';
        $frescura = $data->estado_frescura ?? 'optimo';
        $obs = $data->observaciones ?? '';
        
        $stmt->bindParam(':numero', $numero);
        $stmt->bindParam(':guia', $guia);
        $stmt->bindParam(':productor', $productor);
        $stmt->bindParam(':producto', $producto);
        $stmt->bindParam(':fecha', $fecha);
        $stmt->bindParam(':peso', $peso);
        $stmt->bindParam(':jabas', $jabas);
        $stmt->bindParam(':estado', $estado);
        $stmt->bindParam(':frescura', $frescura);
        $stmt->bindParam(':obs', $obs);
        
        if($stmt->execute()) {
            $loteId = (int)$this->conn->lastInsertId();

            if ($peso > 0) {
                try {
                    $productorNombre = null;
                    if ($productor) {
                        $stmtProd = $this->conn->prepare("SELECT nombre_completo FROM personas WHERE id = :id");
                        $stmtProd->execute([':id' => $productor]);
                        $prodRow = $stmtProd->fetch(PDO::FETCH_ASSOC);
                        $productorNombre = $prodRow['nombre_completo'] ?? null;
                    }

                    $kardexHelper = new KardexIntegralHelper($this->conn);
                    $kardexHelper->registrarIngresoLote([
                        'lote_id' => $loteId,
                        'numero_lote' => $numero,
                        'producto' => $producto,
                        'fecha_ingreso' => $fecha,
                        'peso_inicial' => (float)$peso,
                        'productor_id' => $productor,
                        'productor_nombre' => $productorNombre,
                        'observaciones' => $obs
                    ]);
                } catch (Exception $e) {
                    error_log("Error al registrar lote en kardex integral: " . $e->getMessage());
                }
            }

            http_response_code(201);
            echo json_encode(["message" => "Lote creado", "id" => $loteId]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al crear lote", "error" => $stmt->errorInfo()]);
        }
    }

    public function update($id) {
        $data = json_decode(file_get_contents("php://input"));

        $stmtPrev = $this->conn->prepare("SELECT peso_inicial, numero_lote, producto, productor_id, fecha_ingreso, observaciones 
                                          FROM {$this->table} WHERE id = :id");
        $stmtPrev->bindParam(':id', $id, PDO::PARAM_INT);
        $stmtPrev->execute();
        $prev = $stmtPrev->fetch(PDO::FETCH_ASSOC);
        
        $query = "UPDATE " . $this->table . " SET 
                  numero_lote = :numero,
                  guia_ingreso = :guia,
                  productor_id = :productor,
                  producto = :producto,
                  fecha_ingreso = :fecha,
                  fecha_proceso = :fecha_proceso,
                  peso_inicial = :peso,
                  peso_neto = :peso_neto,
                  numero_jabas = :jabas,
                  estado = :estado,
                  estado_frescura = :frescura,
                  observaciones = :obs
                  WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        
        $numero = $data->numero_lote ?? '';
        $guia = $data->guia_ingreso ?? '';
        $productor = $data->productor_id ?? null;
        $producto = $data->producto ?? '';
        $fecha = $data->fecha_ingreso ?? date('Y-m-d');
        $fechaProceso = $data->fecha_proceso ?? null;
        $peso = $data->peso_inicial ?? 0;
        $pesoNeto = $data->peso_neto ?? null;
        $jabas = $data->numero_jabas ?? 0;
        $estado = $data->estado ?? 'pendiente';
        $frescura = $data->estado_frescura ?? 'optimo';
        $obs = $data->observaciones ?? '';
        
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':numero', $numero);
        $stmt->bindParam(':guia', $guia);
        $stmt->bindParam(':productor', $productor);
        $stmt->bindParam(':producto', $producto);
        $stmt->bindParam(':fecha', $fecha);
        $stmt->bindParam(':fecha_proceso', $fechaProceso);
        $stmt->bindParam(':peso', $peso);
        $stmt->bindParam(':peso_neto', $pesoNeto);
        $stmt->bindParam(':jabas', $jabas);
        $stmt->bindParam(':estado', $estado);
        $stmt->bindParam(':frescura', $frescura);
        $stmt->bindParam(':obs', $obs);
        
        if($stmt->execute()) {
            if ($prev) {
                $pesoPrevio = (float)$prev['peso_inicial'];
                $pesoNuevo = (float)$peso;
                $diferencia = $pesoNuevo - $pesoPrevio;

                if ($diferencia != 0.0) {
                    try {
                        $productorNombre = null;
                        if ($productor) {
                            $stmtProd = $this->conn->prepare("SELECT nombre_completo FROM personas WHERE id = :id");
                            $stmtProd->execute([':id' => $productor]);
                            $prodRow = $stmtProd->fetch(PDO::FETCH_ASSOC);
                            $productorNombre = $prodRow['nombre_completo'] ?? null;
                        }

                        $kardexHelper = new KardexIntegralHelper($this->conn);
                        $kardexHelper->registrarMovimientoFisico([
                            'fecha_movimiento' => $fecha,
                            'tipo_movimiento' => $diferencia > 0 ? 'ingreso' : 'salida',
                            'documento_tipo' => 'lote',
                            'documento_id' => (int)$id,
                            'documento_numero' => $numero,
                            'lote_id' => (int)$id,
                            'peso_kg' => abs($diferencia),
                            'persona_id' => $productor,
                            'persona_nombre' => $productorNombre,
                            'persona_tipo' => 'productor',
                            'concepto' => "Ajuste peso lote {$numero}"
                        ]);
                    } catch (Exception $e) {
                        error_log("Error al ajustar lote en kardex integral: " . $e->getMessage());
                    }
                }
            }
            echo json_encode(["message" => "Lote actualizado"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al actualizar lote"]);
        }
    }

    public function delete($id) {
        $query = "DELETE FROM " . $this->table . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        
        if($stmt->execute()) {
            echo json_encode(["message" => "Lote eliminado"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al eliminar lote"]);
        }
    }
}
?>
