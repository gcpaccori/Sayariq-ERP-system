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
        $data = json_decode(file_get_contents("php://input"));
        $pedidoId = $data->pedido_id ?? null;
        
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

    public function create() {
        $data = json_decode(file_get_contents("php://input"));
        
        $query = "INSERT INTO " . $this->table . " 
                  (pedido_id, producto, categoria, kg, precio, total, fecha_venta, observaciones) 
                  VALUES (:pedido, :prod, :cat, :kg, :precio, :total, :fecha, :obs)";
        
        $stmt = $this->conn->prepare($query);
        
        $pedido = $data->pedido_id ?? null;
        $prod = $data->producto ?? '';
        $cat = $data->categoria ?? '';
        $kg = $data->kg ?? 0;
        $precio = $data->precio ?? 0;
        $total = $kg * $precio;
        $fecha = $data->fecha_venta ?? date('Y-m-d');
        $obs = $data->observaciones ?? '';
        
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
?>
