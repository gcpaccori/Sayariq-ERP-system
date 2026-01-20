<?php

class KardexController {
    private $conn;
    private $table = "kardex_lotes";

    public function __construct($db) {
        $this->conn = $db;
        header("Content-Type: application/json; charset=UTF-8");
    }

    private function response($data, $status = 200) {
        http_response_code($status);

        // Si es un arreglo, retornamos count
        if (is_array($data)) {
            echo json_encode([
                "success" => true,
                "count" => count($data),
                "data" => $data
            ]);
        } else {
            echo json_encode([
                "success" => true,
                "data" => $data
            ]);
        }
        exit;
    }

    public function handleRequest($method, $id, $action) {
        switch($method) {
            case 'GET':
                if ($id) return $this->getOne($id);
                if ($action === 'por-lote') return $this->getByLote();
                if ($action === 'saldos') return $this->getSaldos();
                return $this->getAll();

            case 'POST':
                return $this->create();

            case 'DELETE':
                return $this->delete($id);
        }
    }

    public function getAll() {
        $query = "SELECT k.*, l.numero_lote, p.nombre_completo AS productor_nombre
                  FROM {$this->table} k
                  LEFT JOIN lotes l ON k.lote_id = l.id
                  LEFT JOIN personas p ON l.productor_id = p.id
                  ORDER BY k.fecha_movimiento DESC, k.created_at DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();

        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return $this->response($result);
    }

    public function getOne($id) {
        $query = "SELECT k.*, l.numero_lote, p.nombre_completo AS productor_nombre
                  FROM {$this->table} k
                  LEFT JOIN lotes l ON k.lote_id = l.id
                  LEFT JOIN personas p ON l.productor_id = p.id
                  WHERE k.id = :id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $this->response($result ?: []);
    }

    public function getByLote() {
        $data = json_decode(file_get_contents("php://input"));
        $loteId = $data->lote_id ?? null;

        if (!$loteId) {
            return $this->response(["error" => "lote_id requerido"], 400);
        }

        $query = "SELECT k.*
                  FROM {$this->table} k
                  WHERE k.lote_id = :lote_id
                  ORDER BY k.fecha_movimiento DESC, k.created_at DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':lote_id', $loteId);
        $stmt->execute();

        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return $this->response($result);
    }

    public function getSaldos() {
        $data = json_decode(file_get_contents("php://input"));
        $loteId = $data->lote_id ?? null;

        $where = $loteId ? "WHERE lote_id = :lote_id" : "";

        $query = "SELECT 
                    categoria,
                    SUM(CASE WHEN tipo_movimiento = 'ingreso' THEN peso ELSE 0 END) AS total_ingreso,
                    SUM(CASE WHEN tipo_movimiento = 'salida' THEN peso ELSE 0 END) AS total_salida,
                    SUM(CASE WHEN tipo_movimiento = 'ingreso' THEN peso ELSE -peso END) AS saldo
                  FROM {$this->table}
                  $where
                  GROUP BY categoria";

        $stmt = $this->conn->prepare($query);

        if ($loteId) {
            $stmt->bindParam(':lote_id', $loteId);
        }

        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return $this->response($result);
    }

    public function create() {
        $data = json_decode(file_get_contents("php://input"));

        $query = "INSERT INTO {$this->table}
                  (lote_id, tipo_movimiento, categoria, peso, fecha_movimiento, referencia, saldo_categoria)
                  VALUES (:lote, :tipo, :cat, :peso, :fecha, :ref, :saldo)";

        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(':lote', $data->lote_id);
        $stmt->bindParam(':tipo', $data->tipo_movimiento);
        $stmt->bindParam(':cat', $data->categoria);
        $stmt->bindParam(':peso', $data->peso);
        $stmt->bindParam(':fecha', $data->fecha_movimiento);
        $stmt->bindParam(':ref', $data->referencia);
        $stmt->bindParam(':saldo', $data->saldo_categoria);

        if ($stmt->execute()) {
            return $this->response([
                "message" => "Kardex creado",
                "id" => $this->conn->lastInsertId()
            ], 201);
        }

        return $this->response(["error" => "Error al crear kardex"], 500);
    }

    public function delete($id) {
        $query = "DELETE FROM {$this->table} WHERE id = :id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);

        if ($stmt->execute()) {
            return $this->response(["message" => "Kardex eliminado"]);
        }

        return $this->response(["error" => "Error al eliminar kardex"], 500);
    }
}

?>
