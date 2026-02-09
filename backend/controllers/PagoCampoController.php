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
            http_response_code(201);
            echo json_encode(["message" => "Pago creado", "id" => $this->conn->lastInsertId()]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al crear pago"]);
        }
    }

    public function update($id) {
        $data = json_decode(file_get_contents("php://input"));
        
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
            echo json_encode(["message" => "Pago actualizado"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al actualizar pago"]);
        }
    }

    public function delete($id) {
        $query = "DELETE FROM " . $this->table . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        
        if($stmt->execute()) {
            echo json_encode(["message" => "Pago eliminado"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al eliminar pago"]);
        }
    }
}
?>
