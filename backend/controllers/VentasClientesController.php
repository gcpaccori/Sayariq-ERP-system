<?php
class VentasClientesController {
    private $conn;
    private $table = "ventas_clientes";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest($method, $id, $action) {
        switch($method) {
            case 'GET':
                if ($id) {
                    $this->getOne($id);
                } else if ($action === 'pendientes') {
                    $this->getPendientes();
                } else if ($action === 'resumen') {
                    $this->getResumen();
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
        $query = "SELECT vc.*, p.nombre_completo as cliente_nombre, p.telefono, p.email,
                  (SELECT SUM(monto) FROM pagos_venta WHERE venta_id = vc.id) as pagado
                  FROM " . $this->table . " vc
                  LEFT JOIN personas p ON vc.cliente_id = p.id
                  ORDER BY vc.created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function getOne($id) {
        $query = "SELECT vc.*, p.nombre_completo as cliente_nombre, p.documento_identidad,
                  p.telefono, p.email, p.direccion
                  FROM " . $this->table . " vc
                  LEFT JOIN personas p ON vc.cliente_id = p.id
                  WHERE vc.id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function getPendientes() {
        $query = "SELECT vc.*, p.nombre_completo as cliente_nombre,
                  (SELECT SUM(monto) FROM pagos_venta WHERE venta_id = vc.id) as pagado,
                  (vc.total - COALESCE((SELECT SUM(monto) FROM pagos_venta WHERE venta_id = vc.id), 0)) as saldo
                  FROM " . $this->table . " vc
                  LEFT JOIN personas p ON vc.cliente_id = p.id
                  WHERE vc.estado IN ('pendiente', 'parcial')
                  ORDER BY vc.fecha_venta DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function getResumen() {
        $query = "SELECT 
                  COUNT(*) as total_ventas,
                  SUM(CASE WHEN estado = 'pagado' THEN 1 ELSE 0 END) as ventas_pagadas,
                  SUM(CASE WHEN estado IN ('pendiente', 'parcial') THEN 1 ELSE 0 END) as ventas_pendientes,
                  SUM(total) as total_ventas_monto,
                  SUM(COALESCE((SELECT SUM(monto) FROM pagos_venta WHERE venta_id = vc.id), 0)) as total_pagado,
                  SUM(total - COALESCE((SELECT SUM(monto) FROM pagos_venta WHERE venta_id = vc.id), 0)) as total_por_cobrar
                  FROM " . $this->table . " vc";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function create() {
        $data = json_decode(file_get_contents("php://input"));
        
        $clienteId = $data->cliente_id ?? null;
        $fechaVenta = $data->fecha_venta ?? date('Y-m-d');
        $cantidad = $data->cantidad ?? 0;
        $precioUnitario = $data->precio_unitario ?? 0;
        $total = $cantidad * $precioUnitario;
        $estado = 'pendiente';
        $descripcion = $data->descripcion ?? '';
        
        $query = "INSERT INTO " . $this->table . " 
                  (cliente_id, fecha_venta, cantidad, precio_unitario, total, estado, descripcion)
                  VALUES (:cliente_id, :fecha_venta, :cantidad, :precio_unitario, :total, :estado, :descripcion)";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':cliente_id', $clienteId);
        $stmt->bindParam(':fecha_venta', $fechaVenta);
        $stmt->bindParam(':cantidad', $cantidad);
        $stmt->bindParam(':precio_unitario', $precioUnitario);
        $stmt->bindParam(':total', $total);
        $stmt->bindParam(':estado', $estado);
        $stmt->bindParam(':descripcion', $descripcion);
        
        if($stmt->execute()) {
            http_response_code(201);
            echo json_encode(["message" => "Venta creada", "id" => $this->conn->lastInsertId()]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al crear venta"]);
        }
    }

    public function update($id) {
        $data = json_decode(file_get_contents("php://input"));
        
        $clienteId = $data->cliente_id ?? null;
        $cantidad = $data->cantidad ?? 0;
        $precioUnitario = $data->precio_unitario ?? 0;
        $total = $cantidad * $precioUnitario;
        $estado = $data->estado ?? 'pendiente';
        $descripcion = $data->descripcion ?? '';
        
        $query = "UPDATE " . $this->table . " SET 
                  cliente_id = :cliente_id,
                  cantidad = :cantidad,
                  precio_unitario = :precio_unitario,
                  total = :total,
                  estado = :estado,
                  descripcion = :descripcion
                  WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':cliente_id', $clienteId);
        $stmt->bindParam(':cantidad', $cantidad);
        $stmt->bindParam(':precio_unitario', $precioUnitario);
        $stmt->bindParam(':total', $total);
        $stmt->bindParam(':estado', $estado);
        $stmt->bindParam(':descripcion', $descripcion);
        
        if($stmt->execute()) {
            echo json_encode(["message" => "Venta actualizada"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al actualizar venta"]);
        }
    }

    public function delete($id) {
        $query = "DELETE FROM " . $this->table . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        
        if($stmt->execute()) {
            echo json_encode(["message" => "Venta eliminada"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al eliminar venta"]);
        }
    }
}
