<?php

class CategoriasPesoController {
    private $conn;
    private $table = "categorias_peso";

    public function __construct($db) {
        $this->conn = $db;
        header('Content-Type: application/json; charset=utf-8');
    }

    public function handleRequest($method, $id, $action) {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $this->getOne($id);
                } else {
                    $this->getAll();
                }
                break;

            default:
                http_response_code(405);
                echo json_encode([
                    'success' => false,
                    'message' => "Método no permitido para categorias_peso"
                ]);
                break;
        }
    }

    public function getAll() {
        $sql = "SELECT 
                    id,
                    codigo,
                    nombre,
                    descripcion,
                    precio_kg,
                    es_liquidable,
                    orden,
                    estado
                FROM {$this->table}
                WHERE estado = 'activo'
                ORDER BY orden ASC, nombre ASC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute();

        echo json_encode([
            'success' => true,
            'data'    => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ]);
    }

    public function getOne($id) {
        $sql = "SELECT 
                    id,
                    codigo,
                    nombre,
                    descripcion,
                    precio_kg,
                    es_liquidable,
                    orden,
                    estado
                FROM {$this->table}
                WHERE id = :id
                LIMIT 1";

        $stmt = $this->conn->prepare($sql);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            echo json_encode([
                'success' => true,
                'data'    => $row
            ]);
        } else {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Categoría no encontrada'
            ]);
        }
    }
}
