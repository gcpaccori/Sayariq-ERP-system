<?php
class RegistroPesosController {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest($method, $id, $action) {
        switch($method) {
            case 'GET':
                if ($action === 'estadisticas') {
                    $this->getEstadisticas();
                } else if ($action === 'resumen-lote' && $id) {
                    $this->getResumenPorLote($id);
                } else if ($id) {
                    $this->getById($id);
                } else {
                    $this->getAll();
                }
                break;
            case 'POST':
                $this->create();
                break;
            case 'PUT':
                if ($id) {
                    $this->update($id);
                }
                break;
            case 'DELETE':
                if ($id) {
                    $this->delete($id);
                }
                break;
            default:
                http_response_code(405);
                echo json_encode(["success" => false, "message" => "Método no permitido"]);
                break;
        }
    }

    // GET All - Lista completa con datos de lotes y personas
    public function getAll() {
        $query = "SELECT 
                    pl.id,
                    pl.lote_id,
                    pl.fecha_pesado,
                    pl.peso_bruto,
                    pl.peso_exportable,
                    pl.peso_industrial,
                    pl.peso_descarte,
                    pl.observaciones,
                    pl.created_at,
                    l.numero_lote,
                    l.producto,
                    l.guia_ingreso,
                    l.fecha_ingreso,
                    l.estado as lote_estado,
                    l.estado_frescura,
                    p.nombre_completo as productor_nombre,
                    p.dni as productor_dni,
                    (pl.peso_exportable + pl.peso_industrial + pl.peso_descarte) as peso_total_clasificado,
                    ROUND((pl.peso_exportable / pl.peso_bruto * 100), 2) as porcentaje_exportable,
                    ROUND((pl.peso_industrial / pl.peso_bruto * 100), 2) as porcentaje_industrial,
                    ROUND((pl.peso_descarte / pl.peso_bruto * 100), 2) as porcentaje_descarte,
                    ROUND(((pl.peso_exportable + pl.peso_industrial + pl.peso_descarte) / pl.peso_bruto * 100), 2) as eficiencia_clasificacion
                  FROM pesos_lote pl
                  INNER JOIN lotes l ON pl.lote_id = l.id
                  INNER JOIN personas p ON l.productor_id = p.id
                  ORDER BY pl.fecha_pesado DESC, pl.created_at DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $result,
            'total' => count($result)
        ]);
    }

    // GET By ID
    public function getById($id) {
        $query = "SELECT 
                    pl.*,
                    l.numero_lote,
                    l.producto,
                    l.guia_ingreso,
                    l.peso_inicial as lote_peso_inicial,
                    l.peso_neto as lote_peso_neto,
                    l.fecha_ingreso,
                    l.estado as lote_estado,
                    p.nombre_completo as productor_nombre,
                    p.dni as productor_dni
                  FROM pesos_lote pl
                  INNER JOIN lotes l ON pl.lote_id = l.id
                  INNER JOIN personas p ON l.productor_id = p.id
                  WHERE pl.id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result) {
            echo json_encode(['success' => true, 'data' => $result]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Registro no encontrado']);
        }
    }

    // GET Estadísticas generales
    public function getEstadisticas() {
        $query = "SELECT 
                    COUNT(DISTINCT pl.lote_id) as total_lotes_pesados,
                    COUNT(pl.id) as total_registros_peso,
                    COALESCE(SUM(pl.peso_bruto), 0) as peso_bruto_total,
                    COALESCE(SUM(pl.peso_exportable), 0) as peso_exportable_total,
                    COALESCE(SUM(pl.peso_industrial), 0) as peso_industrial_total,
                    COALESCE(SUM(pl.peso_descarte), 0) as peso_descarte_total,
                    COALESCE(AVG(pl.peso_bruto), 0) as peso_bruto_promedio,
                    ROUND(COALESCE(AVG((pl.peso_exportable / pl.peso_bruto * 100)), 0), 2) as porcentaje_exportable_promedio,
                    ROUND(COALESCE(AVG((pl.peso_industrial / pl.peso_bruto * 100)), 0), 2) as porcentaje_industrial_promedio,
                    ROUND(COALESCE(AVG((pl.peso_descarte / pl.peso_bruto * 100)), 0), 2) as porcentaje_descarte_promedio
                  FROM pesos_lote pl";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $estadisticas = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Distribución por producto
        $queryProductos = "SELECT 
                            l.producto,
                            COUNT(pl.id) as cantidad_pesadas,
                            COALESCE(SUM(pl.peso_bruto), 0) as peso_total,
                            COALESCE(AVG(pl.peso_exportable / pl.peso_bruto * 100), 0) as porcentaje_exportable_promedio
                          FROM pesos_lote pl
                          INNER JOIN lotes l ON pl.lote_id = l.id
                          GROUP BY l.producto
                          ORDER BY peso_total DESC";
        
        $stmtProductos = $this->conn->prepare($queryProductos);
        $stmtProductos->execute();
        $porProducto = $stmtProductos->fetchAll(PDO::FETCH_ASSOC);
        
        // Tendencia mensual
        $queryTendencia = "SELECT 
                            DATE_FORMAT(pl.fecha_pesado, '%Y-%m') as mes,
                            COUNT(pl.id) as cantidad_registros,
                            COALESCE(SUM(pl.peso_bruto), 0) as peso_total,
                            COALESCE(AVG((pl.peso_exportable / pl.peso_bruto * 100)), 0) as eficiencia_promedio
                          FROM pesos_lote pl
                          GROUP BY DATE_FORMAT(pl.fecha_pesado, '%Y-%m')
                          ORDER BY mes DESC
                          LIMIT 6";
        
        $stmtTendencia = $this->conn->prepare($queryTendencia);
        $stmtTendencia->execute();
        $tendencia = $stmtTendencia->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => [
                'general' => $estadisticas,
                'por_producto' => $porProducto,
                'tendencia_mensual' => $tendencia
            ]
        ]);
    }

    // GET Resumen por lote
    public function getResumenPorLote($loteId) {
        $query = "SELECT 
                    l.id as lote_id,
                    l.numero_lote,
                    l.producto,
                    l.peso_inicial,
                    l.peso_neto,
                    p.nombre_completo as productor_nombre,
                    COUNT(pl.id) as total_pesadas,
                    COALESCE(SUM(pl.peso_bruto), 0) as peso_bruto_acumulado,
                    COALESCE(SUM(pl.peso_exportable), 0) as peso_exportable_acumulado,
                    COALESCE(SUM(pl.peso_industrial), 0) as peso_industrial_acumulado,
                    COALESCE(SUM(pl.peso_descarte), 0) as peso_descarte_acumulado,
                    MIN(pl.fecha_pesado) as primera_pesada,
                    MAX(pl.fecha_pesado) as ultima_pesada
                  FROM lotes l
                  INNER JOIN personas p ON l.productor_id = p.id
                  LEFT JOIN pesos_lote pl ON l.id = pl.lote_id
                  WHERE l.id = :lote_id
                  GROUP BY l.id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':lote_id', $loteId);
        $stmt->execute();
        $resumen = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Obtener historial de pesadas
        $queryHistorial = "SELECT * FROM pesos_lote 
                          WHERE lote_id = :lote_id 
                          ORDER BY fecha_pesado DESC, created_at DESC";
        
        $stmtHistorial = $this->conn->prepare($queryHistorial);
        $stmtHistorial->bindParam(':lote_id', $loteId);
        $stmtHistorial->execute();
        $historial = $stmtHistorial->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => [
                'resumen' => $resumen,
                'historial' => $historial
            ]
        ]);
    }

    // POST Create
    public function create() {
        $data = json_decode(file_get_contents("php://input"), true);
        
        // Validaciones
        if (!isset($data['lote_id']) || !isset($data['fecha_pesado']) || !isset($data['peso_bruto'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
            return;
        }
        
        // Verificar que el lote existe
        $queryLote = "SELECT id FROM lotes WHERE id = :lote_id";
        $stmtLote = $this->conn->prepare($queryLote);
        $stmtLote->bindParam(':lote_id', $data['lote_id']);
        $stmtLote->execute();
        
        if ($stmtLote->rowCount() === 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El lote especificado no existe']);
            return;
        }
        
        $query = "INSERT INTO pesos_lote 
                  (lote_id, fecha_pesado, peso_bruto, peso_exportable, peso_industrial, peso_descarte, observaciones) 
                  VALUES 
                  (:lote_id, :fecha_pesado, :peso_bruto, :peso_exportable, :peso_industrial, :peso_descarte, :observaciones)";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':lote_id', $data['lote_id']);
        $stmt->bindParam(':fecha_pesado', $data['fecha_pesado']);
        $stmt->bindParam(':peso_bruto', $data['peso_bruto']);
        $stmt->bindParam(':peso_exportable', $data['peso_exportable'] ?? 0);
        $stmt->bindParam(':peso_industrial', $data['peso_industrial'] ?? 0);
        $stmt->bindParam(':peso_descarte', $data['peso_descarte'] ?? 0);
        $stmt->bindParam(':observaciones', $data['observaciones'] ?? null);
        
        if ($stmt->execute()) {
            $lastId = $this->conn->lastInsertId();
            
            // Actualizar peso_neto del lote si es necesario
            $pesoTotal = ($data['peso_exportable'] ?? 0) + ($data['peso_industrial'] ?? 0) + ($data['peso_descarte'] ?? 0);
            if ($pesoTotal > 0) {
                $updateLote = "UPDATE lotes SET peso_neto = :peso_neto WHERE id = :lote_id";
                $stmtUpdate = $this->conn->prepare($updateLote);
                $stmtUpdate->bindParam(':peso_neto', $pesoTotal);
                $stmtUpdate->bindParam(':lote_id', $data['lote_id']);
                $stmtUpdate->execute();
            }
            
            echo json_encode([
                'success' => true,
                'message' => 'Registro de peso creado exitosamente',
                'id' => $lastId
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al crear el registro']);
        }
    }

    // PUT Update
    public function update($id) {
        $data = json_decode(file_get_contents("php://input"), true);
        
        $query = "UPDATE pesos_lote SET 
                  fecha_pesado = :fecha_pesado,
                  peso_bruto = :peso_bruto,
                  peso_exportable = :peso_exportable,
                  peso_industrial = :peso_industrial,
                  peso_descarte = :peso_descarte,
                  observaciones = :observaciones
                  WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':fecha_pesado', $data['fecha_pesado']);
        $stmt->bindParam(':peso_bruto', $data['peso_bruto']);
        $stmt->bindParam(':peso_exportable', $data['peso_exportable'] ?? 0);
        $stmt->bindParam(':peso_industrial', $data['peso_industrial'] ?? 0);
        $stmt->bindParam(':peso_descarte', $data['peso_descarte'] ?? 0);
        $stmt->bindParam(':observaciones', $data['observaciones'] ?? null);
        
        if ($stmt->execute()) {
            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true, 'message' => 'Registro actualizado exitosamente']);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Registro no encontrado']);
            }
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al actualizar el registro']);
        }
    }

    // DELETE
    public function delete($id) {
        $query = "DELETE FROM pesos_lote WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        
        if ($stmt->execute()) {
            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true, 'message' => 'Registro eliminado exitosamente']);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Registro no encontrado']);
            }
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al eliminar el registro']);
        }
    }
}
?>
