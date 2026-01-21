<?php
require_once '../models/Adelanto.php';

class AdelantosController extends BaseController {
    private $adelantoModel;

    public function __construct($db) {
        parent::__construct($db);
        $this->adelantoModel = new Adelanto($db);
    }

    public function get($id = null) {
        try {
            if ($id) {
                logMessage('DEBUG', 'AdelantosController: GET by ID', ['id' => $id]);
                $result = $this->adelantoModel->getById($id);
                if (!$result) {
                    http_response_code(404);
                    return jsonResponse([
                        'success' => false,
                        'error' => 'Not Found',
                        'message' => "Adelanto no encontrado con ID: {$id}"
                    ], 404);
                }
                return jsonResponse($result);
            } else {
                logMessage('DEBUG', 'AdelantosController: GET all adelantos');
                $result = $this->adelantoModel->getAll();
                return jsonResponse($result);
            }
        } catch (Exception $e) {
            logMessage('ERROR', 'Error en GET adelantos', ['error' => $e->getMessage()]);
            http_response_code(500);
            return jsonResponse([
                'success' => false,
                'error' => 'Server Error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function post() {
        try {
            logMessage('DEBUG', 'AdelantosController: POST - Crear nuevo adelanto');
            
            $data = $this->getRequestData();
            
            // Validar campos requeridos
            if (empty($data['productor_id']) || empty($data['monto_original']) || empty($data['concepto'])) {
                http_response_code(400);
                return jsonResponse([
                    'success' => false,
                    'error' => 'Validation Error',
                    'message' => 'productor_id, monto_original, y concepto son requeridos'
                ], 400);
            }

            $adelanto = $this->adelantoModel->create([
                'productor_id' => $data['productor_id'],
                'productor_nombre' => $data['productor_nombre'] ?? '',
                'monto_original' => $data['monto_original'],
                'monto_descontado' => 0,
                'saldo_pendiente' => $data['monto_original'],
                'concepto' => $data['concepto'],
                'fecha_adelanto' => $data['fecha_adelanto'] ?? date('Y-m-d'),
                'estado' => 'pendiente'
            ]);

            // ✨ Registrar en kardex integral
            try {
                $kardexHelper = new KardexIntegralHelper($this->db);
                
                $kardexHelper->registrarAdelanto([
                    'adelanto_id' => $adelanto['id'],
                    'fecha_adelanto' => $data['fecha_adelanto'] ?? date('Y-m-d'),
                    'productor_id' => $data['productor_id'],
                    'productor_nombre' => $data['productor_nombre'] ?? 'Productor',
                    'monto' => $data['monto_original'],
                    'motivo' => $data['concepto'] ?? null
                ]);
            } catch (Exception $kex) {
                error_log("Error al registrar adelanto en kardex integral: " . $kex->getMessage());
            }

            logMessage('INFO', 'Adelanto creado exitosamente', ['id' => $adelanto['id']]);
            http_response_code(201);
            return jsonResponse($adelanto);
        } catch (Exception $e) {
            logMessage('ERROR', 'Error al crear adelanto', ['error' => $e->getMessage()]);
            http_response_code(500);
            return jsonResponse([
                'success' => false,
                'error' => 'Server Error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function put($id = null) {
        try {
            if (!$id) {
                http_response_code(400);
                return jsonResponse([
                    'success' => false,
                    'error' => 'Bad Request',
                    'message' => 'ID es requerido para actualizar'
                ], 400);
            }

            logMessage('DEBUG', 'AdelantosController: PUT - Actualizar adelanto', ['id' => $id]);
            
            $data = $this->getRequestData();
            
            $adelanto = $this->adelantoModel->update($id, $data);
            
            if (!$adelanto) {
                http_response_code(404);
                return jsonResponse([
                    'success' => false,
                    'error' => 'Not Found',
                    'message' => "Adelanto no encontrado con ID: {$id}"
                ], 404);
            }

            logMessage('INFO', 'Adelanto actualizado exitosamente', ['id' => $id]);
            return jsonResponse($adelanto);
        } catch (Exception $e) {
            logMessage('ERROR', 'Error al actualizar adelanto', ['error' => $e->getMessage()]);
            http_response_code(500);
            return jsonResponse([
                'success' => false,
                'error' => 'Server Error',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function delete($id = null) {
        try {
            if (!$id) {
                http_response_code(400);
                return jsonResponse([
                    'success' => false,
                    'error' => 'Bad Request',
                    'message' => 'ID es requerido para eliminar'
                ], 400);
            }

            logMessage('DEBUG', 'AdelantosController: DELETE', ['id' => $id]);
            
            $result = $this->adelantoModel->delete($id);
            
            if (!$result) {
                http_response_code(404);
                return jsonResponse([
                    'success' => false,
                    'error' => 'Not Found',
                    'message' => "Adelanto no encontrado con ID: {$id}"
                ], 404);
            }

            logMessage('INFO', 'Adelanto eliminado exitosamente', ['id' => $id]);
            return jsonResponse([
                'success' => true,
                'message' => 'Adelanto eliminado exitosamente'
            ]);
        } catch (Exception $e) {
            logMessage('ERROR', 'Error al eliminar adelanto', ['error' => $e->getMessage()]);
            http_response_code(500);
            return jsonResponse([
                'success' => false,
                'error' => 'Server Error',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
?>
