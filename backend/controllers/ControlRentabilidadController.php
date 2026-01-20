<?php
class ControlRentabilidadController {
    private $conn;
    private $table = "control_rentabilidad";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest($method, $id, $action) {
        switch($method) {
            case 'GET':
                if ($id) {
                    $this->getOne($id);
                } else if ($action === 'periodo') {
                    $this->getByPeriodo();
                } else if ($action === 'comparativa') {
                    $this->getComparativa();
                } else {
                    $this->getAll();
                }
                break;
            case 'POST':
                $this->calcularRentabilidad();
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
        $query = "SELECT * FROM " . $this->table . " ORDER BY periodo DESC LIMIT 12";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function getOne($id) {
        $query = "SELECT * FROM " . $this->table . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function getByPeriodo() {
        $data = json_decode(file_get_contents("php://input"));
        $periodo = $data->periodo ?? date('Y-m');
        
        $query = "SELECT * FROM " . $this->table . " WHERE periodo = :periodo";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':periodo', $periodo);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function getComparativa() {
        $query = "SELECT periodo, ingresos_totales, costos_totales, ganancia_neta, margen_porcentaje
                  FROM " . $this->table . " 
                  ORDER BY periodo DESC LIMIT 6";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function calcularRentabilidad() {
        $data = json_decode(file_get_contents("php://input"));
        $periodo = $data->periodo ?? date('Y-m');
        
        // Calculate ingresos from ventas
        $queryIngresos = "SELECT COALESCE(SUM(total), 0) as total FROM ventas_clientes 
                         WHERE DATE_FORMAT(fecha_venta, '%Y-%m') = :periodo";
        $stmtIngresos = $this->conn->prepare($queryIngresos);
        $stmtIngresos->bindParam(':periodo', $periodo);
        $stmtIngresos->execute();
        $ingresos = $stmtIngresos->fetch(PDO::FETCH_ASSOC)['total'] ?? 0;
        
        // Calculate costos from costos_fijos + liquidaciones
        $queryCostos = "SELECT COALESCE(SUM(monto), 0) as total FROM costos_fijos 
                       WHERE DATE_FORMAT(fecha_inicio, '%Y-%m') <= :periodo 
                       AND (fecha_fin IS NULL OR DATE_FORMAT(fecha_fin, '%Y-%m') >= :periodo)";
        $stmtCostos = $this->conn->prepare($queryCostos);
        $stmtCostos->bindParam(':periodo', $periodo);
        $stmtCostos->execute();
        $costosFijos = $stmtCostos->fetch(PDO::FETCH_ASSOC)['total'] ?? 0;
        
        // Add liquidation costs
        $queryCostosVar = "SELECT COALESCE(SUM(total_neto), 0) as total FROM liquidaciones 
                          WHERE DATE_FORMAT(fecha_liquidacion, '%Y-%m') = :periodo";
        $stmtCostosVar = $this->conn->prepare($queryCostosVar);
        $stmtCostosVar->bindParam(':periodo', $periodo);
        $stmtCostosVar->execute();
        $costosVariables = $stmtCostosVar->fetch(PDO::FETCH_ASSOC)['total'] ?? 0;
        
        $costosTotales = $costosFijos + $costosVariables;
        $gananciaNeta = $ingresos - $costosTotales;
        $margenPorcentaje = $ingresos > 0 ? ($gananciaNeta / $ingresos) * 100 : 0;
        
        $query = "INSERT INTO " . $this->table . " 
                  (periodo, ingresos_totales, costos_totales, ganancia_neta, margen_porcentaje)
                  VALUES (:periodo, :ingresos, :costos, :ganancia, :margen)
                  ON DUPLICATE KEY UPDATE
                  ingresos_totales = :ingresos,
                  costos_totales = :costos,
                  ganancia_neta = :ganancia,
                  margen_porcentaje = :margen";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':periodo', $periodo);
        $stmt->bindParam(':ingresos', $ingresos);
        $stmt->bindParam(':costos', $costosTotales);
        $stmt->bindParam(':ganancia', $gananciaNeta);
        $stmt->bindParam(':margen', $margenPorcentaje);
        
        if($stmt->execute()) {
            echo json_encode([
                "message" => "Rentabilidad calculada",
                "periodo" => $periodo,
                "ingresos_totales" => $ingresos,
                "costos_totales" => $costosTotales,
                "ganancia_neta" => $gananciaNeta,
                "margen_porcentaje" => $margenPorcentaje
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al calcular rentabilidad"]);
        }
    }

    public function update($id) {
        $data = json_decode(file_get_contents("php://input"));
        
        $periodo = $data->periodo ?? date('Y-m');
        $ingresos = $data->ingresos_totales ?? 0;
        $costos = $data->costos_totales ?? 0;
        $ganancia = $ingresos - $costos;
        $margen = $ingresos > 0 ? ($ganancia / $ingresos) * 100 : 0;
        
        $query = "UPDATE " . $this->table . " SET 
                  ingresos_totales = :ingresos,
                  costos_totales = :costos,
                  ganancia_neta = :ganancia,
                  margen_porcentaje = :margen
                  WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':ingresos', $ingresos);
        $stmt->bindParam(':costos', $costos);
        $stmt->bindParam(':ganancia', $ganancia);
        $stmt->bindParam(':margen', $margen);
        
        if($stmt->execute()) {
            echo json_encode(["message" => "Rentabilidad actualizada"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al actualizar"]);
        }
    }

    public function delete($id) {
        $query = "DELETE FROM " . $this->table . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id);
        
        if($stmt->execute()) {
            echo json_encode(["message" => "Registro eliminado"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Error al eliminar"]);
        }
    }
}
