<?php
class AnalisisLotesPedidosController {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest($method, $id, $action) {
        switch($method) {
            case 'GET':
                if ($action === 'metricas-generales') {
                    $this->getMetricasGenerales();
                } else if ($action === 'analisis-completo') {
                    $this->getAnalisisCompleto();
                } else if ($action === 'eficiencia-lotes') {
                    $this->getEficienciaLotes();
                } else if ($action === 'aceptacion-sobras') {
                    $this->getAceptacionSobras();
                } else if ($action === 'comportamiento-temporal') {
                    $this->getComportamientoTemporal();
                } else {
                    $this->getAll();
                }
                break;
            default:
                http_response_code(405);
                echo json_encode(["message" => "Método no permitido"]);
                break;
        }
    }

    public function getAll() {
        $query = "SELECT 
                    po.id,
                    po.lote_id,
                    po.pedido_id,
                    po.peso_asignado,
                    po.fecha_asignacion,
                    po.estado,
                    l.numero_lote,
                    l.producto,
                    l.peso_inicial,
                    l.peso_neto,
                    l.fecha_ingreso,
                    l.estado_frescura,
                    p.numero_pedido,
                    p.kg_neto as pedido_kg_neto,
                    p.estado as pedido_estado,
                    per.nombre_completo as productor_nombre
                  FROM planificacion_operativa po
                  LEFT JOIN lotes l ON po.lote_id = l.id
                  LEFT JOIN pedidos p ON po.pedido_id = p.id
                  LEFT JOIN personas per ON l.productor_id = per.id
                  ORDER BY po.fecha_asignacion DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function getMetricasGenerales() {
        $query = "SELECT 
                    COUNT(DISTINCT po.lote_id) as total_lotes_usados,
                    COUNT(DISTINCT po.pedido_id) as total_pedidos_atendidos,
                    SUM(po.peso_asignado) as peso_total_asignado,
                    AVG(po.peso_asignado) as peso_promedio_asignacion,
                    COUNT(CASE WHEN po.estado = 'completado' THEN 1 END) as asignaciones_completadas,
                    COUNT(CASE WHEN po.estado = 'en_proceso' THEN 1 END) as asignaciones_en_proceso,
                    COUNT(CASE WHEN po.estado = 'planificado' THEN 1 END) as asignaciones_planificadas
                  FROM planificacion_operativa po";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $metricas = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Calcular tasa de eficiencia
        $queryEficiencia = "SELECT 
                              SUM(l.peso_inicial) as peso_inicial_total,
                              SUM(l.peso_neto) as peso_neto_total
                            FROM lotes l
                            INNER JOIN planificacion_operativa po ON l.id = po.lote_id";
        
        $stmtEficiencia = $this->conn->prepare($queryEficiencia);
        $stmtEficiencia->execute();
        $eficiencia = $stmtEficiencia->fetch(PDO::FETCH_ASSOC);
        
        if ($eficiencia['peso_inicial_total'] > 0) {
            $metricas['eficiencia_peso'] = ($eficiencia['peso_neto_total'] / $eficiencia['peso_inicial_total']) * 100;
        } else {
            $metricas['eficiencia_peso'] = 0;
        }
        
        echo json_encode($metricas);
    }

    public function getAnalisisCompleto() {
        $query = "SELECT 
                    po.id,
                    po.lote_id,
                    po.pedido_id,
                    po.peso_asignado,
                    po.fecha_asignacion,
                    po.estado as asignacion_estado,
                    l.numero_lote,
                    l.producto,
                    l.peso_inicial as lote_peso_inicial,
                    l.peso_neto as lote_peso_neto,
                    l.fecha_ingreso,
                    l.estado_frescura,
                    l.estado as lote_estado,
                    p.numero_pedido,
                    p.kg_neto as pedido_kg_neto,
                    p.precio as pedido_precio,
                    p.total as pedido_total,
                    p.estado as pedido_estado,
                    p.fecha_pedido,
                    per.nombre_completo as productor_nombre,
                    DATEDIFF(po.fecha_asignacion, l.fecha_ingreso) as dias_en_almacen,
                    (l.peso_neto / l.peso_inicial * 100) as eficiencia_lote,
                    (po.peso_asignado / l.peso_neto * 100) as porcentaje_usado,
                    (l.peso_neto - po.peso_asignado) as peso_sobrante
                  FROM planificacion_operativa po
                  LEFT JOIN lotes l ON po.lote_id = l.id
                  LEFT JOIN pedidos p ON po.pedido_id = p.id
                  LEFT JOIN personas per ON l.productor_id = per.id
                  ORDER BY po.fecha_asignacion DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function getEficienciaLotes() {
        $query = "SELECT 
                    l.id as lote_id,
                    l.numero_lote,
                    l.producto,
                    l.peso_inicial,
                    l.peso_neto,
                    l.fecha_ingreso,
                    l.estado_frescura,
                    per.nombre_completo as productor_nombre,
                    COUNT(po.id) as numero_asignaciones,
                    SUM(po.peso_asignado) as peso_total_asignado,
                    (l.peso_neto - COALESCE(SUM(po.peso_asignado), 0)) as peso_disponible,
                    (l.peso_neto / l.peso_inicial * 100) as eficiencia_procesamiento,
                    (COALESCE(SUM(po.peso_asignado), 0) / l.peso_neto * 100) as tasa_utilizacion,
                    DATEDIFF(CURDATE(), l.fecha_ingreso) as dias_almacenado
                  FROM lotes l
                  LEFT JOIN planificacion_operativa po ON l.id = po.lote_id
                  LEFT JOIN personas per ON l.productor_id = per.id
                  WHERE l.estado IN ('proceso', 'pendiente', 'liquidado')
                  GROUP BY l.id, l.numero_lote, l.producto, l.peso_inicial, l.peso_neto, 
                           l.fecha_ingreso, l.estado_frescura, per.nombre_completo
                  ORDER BY tasa_utilizacion DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function getAceptacionSobras() {
        $query = "SELECT 
                    l.id as lote_id,
                    l.numero_lote,
                    l.producto,
                    l.peso_neto,
                    SUM(po.peso_asignado) as peso_asignado,
                    (l.peso_neto - COALESCE(SUM(po.peso_asignado), 0)) as peso_sobrante,
                    CASE 
                        WHEN (l.peso_neto - COALESCE(SUM(po.peso_asignado), 0)) = 0 THEN 'Sin sobras'
                        WHEN (l.peso_neto - COALESCE(SUM(po.peso_asignado), 0)) < (l.peso_neto * 0.05) THEN 'Sobras mínimas (<5%)'
                        WHEN (l.peso_neto - COALESCE(SUM(po.peso_asignado), 0)) < (l.peso_neto * 0.15) THEN 'Sobras moderadas (5-15%)'
                        ELSE 'Sobras altas (>15%)'
                    END as categoria_sobras,
                    ((l.peso_neto - COALESCE(SUM(po.peso_asignado), 0)) / l.peso_neto * 100) as porcentaje_sobras,
                    l.estado_frescura,
                    l.fecha_ingreso,
                    DATEDIFF(CURDATE(), l.fecha_ingreso) as dias_almacenado,
                    per.nombre_completo as productor_nombre
                  FROM lotes l
                  LEFT JOIN planificacion_operativa po ON l.id = po.lote_id
                  LEFT JOIN personas per ON l.productor_id = per.id
                  WHERE l.estado IN ('proceso', 'liquidado')
                  GROUP BY l.id, l.numero_lote, l.producto, l.peso_neto, 
                           l.estado_frescura, l.fecha_ingreso, per.nombre_completo
                  HAVING peso_sobrante > 0
                  ORDER BY porcentaje_sobras DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Calcular resumen de categorías
        $resumen = [
            'sin_sobras' => 0,
            'sobras_minimas' => 0,
            'sobras_moderadas' => 0,
            'sobras_altas' => 0,
            'total_lotes' => count($result),
            'peso_total_sobras' => 0
        ];
        
        foreach ($result as $row) {
            $resumen['peso_total_sobras'] += (float)$row['peso_sobrante'];
            
            switch($row['categoria_sobras']) {
                case 'Sin sobras':
                    $resumen['sin_sobras']++;
                    break;
                case 'Sobras mínimas (<5%)':
                    $resumen['sobras_minimas']++;
                    break;
                case 'Sobras moderadas (5-15%)':
                    $resumen['sobras_moderadas']++;
                    break;
                case 'Sobras altas (>15%)':
                    $resumen['sobras_altas']++;
                    break;
            }
        }
        
        echo json_encode([
            'detalle' => $result,
            'resumen' => $resumen
        ]);
    }

    public function getComportamientoTemporal() {
        $query = "SELECT 
                    DATE_FORMAT(po.fecha_asignacion, '%Y-%m') as mes,
                    COUNT(DISTINCT po.lote_id) as lotes_utilizados,
                    COUNT(DISTINCT po.pedido_id) as pedidos_atendidos,
                    SUM(po.peso_asignado) as peso_total_asignado,
                    AVG(po.peso_asignado) as peso_promedio,
                    AVG(DATEDIFF(po.fecha_asignacion, l.fecha_ingreso)) as dias_promedio_almacen,
                    COUNT(CASE WHEN po.estado = 'completado' THEN 1 END) as completados,
                    COUNT(CASE WHEN po.estado = 'en_proceso' THEN 1 END) as en_proceso
                  FROM planificacion_operativa po
                  LEFT JOIN lotes l ON po.lote_id = l.id
                  GROUP BY DATE_FORMAT(po.fecha_asignacion, '%Y-%m')
                  ORDER BY mes DESC
                  LIMIT 12";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }
}
?>
