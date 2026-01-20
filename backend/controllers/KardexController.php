<?php
class KardexController {
    private $conn;
    private $table = "kardex_lotes";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest($method, $id, $action) {
        switch($method) {
            case 'GET':
                if ($id) {
                    $this->getOne($id);
                } else if ($action === 'por-lote') {
                    $this->getByLote();
                } else if ($action === 'saldos') {
                    $this->getSaldos();
                } else {
                    $this->getAll();
                }
                break;
            case 'POST':
                $this->create();
                break;
            case 'DELETE':
                $this->delete($id);
                break;
        }
    }

    public function getAll() {
        $query = "SELECT k.*, l.numero_lote, p.nombre_completo as productor_nombre
                  FROM " . $this->table . " k
                  LEFT JOIN lotes l ON k.lote_id = l.id
                  LEFT JOIN personas p ON l.productor_id = p.id
                  ORDER BY k.fecha_movimiento DESC, k.created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function getOne($id) {
        $query = "SELECT k.*, l.numero_lote, p.nombre_completo as productor_nombre
                  FROM " . $this->table . " k
                  LEFT JOIN lotes l ON k.lote_id = l.id
                  LEFT JOIN personas p ON l.productor_id = p.id
                  WHERE k.id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function getByLote() {
        $data = json_decode(file_get_contents("php://input"));
        $loteId = $data->lote_id ?? null;
        
        $query = "SELECT k.* FROM " . $this->table . " k
                  WHERE k.lote_id = :lote_id
                  ORDER BY k.fecha_movimiento DESC, k.created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':lote_id', $loteId);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function getSaldos() {
        $data = json_decode(file_get_contents("php://input"));
        $loteId = $data->lote_id ?? null;
        
        if ($loteId) {
            $query = "SELECT 
                        categoria,
                        SUM(CASE WHEN tipo_movimiento = 'ingreso' THEN peso ELSE 0 END) as total_ingreso,
                        SUM(CASE WHEN tipo_movimiento = 'salida' THEN peso ELSE 0 END) as total_salida,
                        SUM(CASE WHEN tipo_movimiento = 'ingreso' THEN peso ELSE -peso END) as saldo
                      FROM " . $this->table . "
                      WHERE lote_id = :lote_id
                      GROUP BY categoria";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':lote_id', $loteId);
        } else {
            $query = "SELECT 
                        categoria,
                        SUM(CASE WHEN tipo_movimiento = 'ingreso' THEN peso ELSE 0 END) as total_ingreso,
                        SUM(CASE WHEN tipo_movimiento = 'salida' THEN peso ELSE 0 END) as total_salida,
                        SUM(CASE WHEN tipo_movimiento = 'ingreso' THEN peso ELSE -peso END) as saldo
                      FROM " . $this->table . "
                      GROUP BY categoria";
            $stmt = $this->conn->prepare($query);
        }
        
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function create() {
        $data = json_decode(file_get_contents("php://input"));
        
        $query = "INSERT INTO " . $this->table . " 
                  (lote_id, tipo_movimiento, categoria, peso, fecha_movimiento, referencia, saldo_categoria) 
                  VALUES (:lote, :tipo, :cat, :peso, :fecha, :ref, :saldo)";
        
        $stmt = $this->conn->prepare($query);
        
        $lote = $data->lote_id ?? null;
        $tipo = $data->tipo_movimiento ?? 'ingreso';
        $cat = $data->categoria ?? 'exportable';
        $peso = $data->peso ?? 0;
        $fecha = $data->fecha_movimiento ?? date('Y-m-d');
        $ref = $data->referencia ?? '';
        $saldo = $data->saldo_categoria ?? 0;
        
        $stmt->bindParam(':lote', $lote);
        $stmt->bindParam(':tipo', $tipo);
        $stmt->bindParam(':cat', $cat);
        $stmt->bindParam(':peso', $peso);
        $stmt->bindParam(':fecha', $fecha);
        $stmt->bindParam(':ref', $ref);
        $stmt->bindParam(':saldo', $saldo);
        
        if($stmt->execute()) {
            http_response_code(201);
            echo json_encode(["message" => "Kardex creado", "id" => $this->conn->lastInsertId()]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al crear kardex"]);
        }
    }

    public function delete($id) {
        $query = "DELETE FROM " . $this->table . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        
        if($stmt->execute()) {
            echo json_encode(["message" => "Kardex eliminado"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al eliminar kardex"]);
        }
    }
}
?>
