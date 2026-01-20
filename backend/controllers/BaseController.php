<?php

class BaseController {
    protected $db;

    public function __construct($db) {
        $this->db = $db;
    }

    public function handleRequest($method, $id = null, $action = null) {
        // Get JSON input for POST/PUT
        $data = null;
        if ($method === 'POST' || $method === 'PUT') {
            $json = file_get_contents('php://input');
            $data = json_decode($json, true);
        }

        try {
            switch($method) {
                case 'GET':
                    if ($id) {
                        if ($action) {
                            // Custom action
                            $methodName = 'get' . ucfirst($action);
                            if (method_exists($this, $methodName)) {
                                $result = $this->$methodName($id);
                            } else {
                                http_response_code(404);
                                echo json_encode(["message" => "Acción no encontrada"]);
                                return;
                            }
                        } else {
                            // Get single resource
                            $result = $this->show($id);
                        }
                    } else {
                        // Get all resources
                        $result = $this->index();
                    }
                    echo json_encode($result);
                    break;

                case 'POST':
                    $result = $this->create($data);
                    if ($result) {
                        http_response_code(201);
                        echo json_encode(["id" => $result, "message" => "Creado exitosamente"]);
                    } else {
                        http_response_code(400);
                        echo json_encode(["message" => "Error al crear"]);
                    }
                    break;

                case 'PUT':
                    if (!$id) {
                        http_response_code(400);
                        echo json_encode(["message" => "ID requerido"]);
                        return;
                    }
                    $result = $this->update($id, $data);
                    if ($result) {
                        echo json_encode(["message" => "Actualizado exitosamente"]);
                    } else {
                        http_response_code(400);
                        echo json_encode(["message" => "Error al actualizar"]);
                    }
                    break;

                case 'DELETE':
                    if (!$id) {
                        http_response_code(400);
                        echo json_encode(["message" => "ID requerido"]);
                        return;
                    }
                    $result = $this->delete($id);
                    if ($result) {
                        echo json_encode(["message" => "Eliminado exitosamente"]);
                    } else {
                        http_response_code(400);
                        echo json_encode(["message" => "Error al eliminar"]);
                    }
                    break;

                default:
                    http_response_code(405);
                    echo json_encode(["message" => "Método no permitido"]);
                    break;
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["message" => "Error del servidor", "error" => $e->getMessage()]);
        }
    }

    // Override these methods in child controllers
    public function index() {
        return [];
    }

    public function show($id) {
        return null;
    }

    public function create($data) {
        return false;
    }

    public function update($id, $data) {
        return false;
    }

    public function delete($id) {
        return false;
    }
}
