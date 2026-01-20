<?php
class CategoriasController {
    private $conn;
    private $table = "categorias";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest($method, $id, $action) {
        switch($method) {
            case 'GET':
                if ($id) {
                    $this->getOne($id);
                } else if ($action === 'activas') {
                    $this->getActivas();
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
        try {
            $query = "SELECT * FROM " . $this->table . " ORDER BY nombre_categoria ASC";
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode($result);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Error al obtener categorías: " . $e->getMessage()
            ]);
        }
    }

    public function getActivas() {
        try {
            $query = "SELECT * FROM " . $this->table . " 
                      WHERE estado = 'activo' 
                      ORDER BY nombre_categoria ASC";
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($result);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Error: " . $e->getMessage()
            ]);
        }
    }

    public function getOne($id) {
        try {
            $query = "SELECT * FROM " . $this->table . " WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$result) {
                http_response_code(404);
                echo json_encode([
                    "success" => false,
                    "message" => "Categoría no encontrada"
                ]);
                return;
            }
            
            echo json_encode($result);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Error: " . $e->getMessage()
            ]);
        }
    }

    public function create() {
        try {
            $data = json_decode(file_get_contents("php://input"));
            
            if (!isset($data->nombre_categoria) || !isset($data->precio_unitario_kg)) {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "message" => "Datos incompletos: se requiere nombre_categoria y precio_unitario_kg"
                ]);
                return;
            }
            
            $query = "INSERT INTO " . $this->table . " 
                      (nombre_categoria, precio_unitario_kg, descripcion, estado) 
                      VALUES (:nombre, :precio, :descripcion, :estado)";
            
            $stmt = $this->conn->prepare($query);
            
            $nombre = $data->nombre_categoria;
            $precio = $data->precio_unitario_kg;
            $descripcion = $data->descripcion ?? '';
            $estado = $data->estado ?? 'activo';
            
            $stmt->bindParam(':nombre', $nombre);
            $stmt->bindParam(':precio', $precio);
            $stmt->bindParam(':descripcion', $descripcion);
            $stmt->bindParam(':estado', $estado);
            
            if($stmt->execute()) {
                http_response_code(201);
                echo json_encode([
                    "success" => true,
                    "message" => "Categoría creada exitosamente",
                    "id" => $this->conn->lastInsertId()
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    "success" => false,
                    "message" => "Error al crear categoría"
                ]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Error: " . $e->getMessage()
            ]);
        }
    }

    public function update($id) {
        try {
            $data = json_decode(file_get_contents("php://input"));
            
            $query = "UPDATE " . $this->table . " SET 
                      nombre_categoria = :nombre,
                      precio_unitario_kg = :precio,
                      descripcion = :descripcion,
                      estado = :estado
                      WHERE id = :id";
            
            $stmt = $this->conn->prepare($query);
            
            $nombre = $data->nombre_categoria ?? '';
            $precio = $data->precio_unitario_kg ?? 0;
            $descripcion = $data->descripcion ?? '';
            $estado = $data->estado ?? 'activo';
            
            $stmt->bindParam(':id', $id);
            $stmt->bindParam(':nombre', $nombre);
            $stmt->bindParam(':precio', $precio);
            $stmt->bindParam(':descripcion', $descripcion);
            $stmt->bindParam(':estado', $estado);
            
            if($stmt->execute()) {
                echo json_encode([
                    "success" => true,
                    "message" => "Categoría actualizada exitosamente"
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    "success" => false,
                    "message" => "Error al actualizar categoría"
                ]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Error: " . $e->getMessage()
            ]);
        }
    }

    public function delete($id) {
        try {
            // Verificar si hay liquidaciones usando esta categoría
            $queryCheck = "SELECT COUNT(*) as count FROM liquidaciones_detalle 
                          WHERE categoria_id = :id";
            $stmtCheck = $this->conn->prepare($queryCheck);
            $stmtCheck->bindParam(':id', $id);
            $stmtCheck->execute();
            $count = $stmtCheck->fetch(PDO::FETCH_ASSOC)['count'];
            
            if ($count > 0) {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "message" => "No se puede eliminar: existen liquidaciones usando esta categoría"
                ]);
                return;
            }
            
            $query = "DELETE FROM " . $this->table . " WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $id);
            
            if($stmt->execute()) {
                echo json_encode([
                    "success" => true,
                    "message" => "Categoría eliminada exitosamente"
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    "success" => false,
                    "message" => "Error al eliminar categoría"
                ]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Error: " . $e->getMessage()
            ]);
        }
    }
}
?>
