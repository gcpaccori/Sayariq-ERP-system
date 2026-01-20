<?php
require_once 'BaseController.php';

class RentabilidadController extends BaseController {
    public function handleRequest($method, $id = null, $action = null) {
        if ($method !== 'GET') {
            http_response_code(405);
            echo json_encode(["message" => "Solo se permite GET"]);
            return;
        }

        try {
            $periodo = $action ?? 'diaria';
            
            switch($periodo) {
                case 'diaria':
                    $fecha = $_GET['fecha'] ?? null;
                    $result = $this->getDiaria($fecha);
                    break;
                case 'semanal':
                    $fechaInicio = $_GET['fechaInicio'] ?? null;
                    $fechaFin = $_GET['fechaFin'] ?? null;
                    $result = $this->getSemanal($fechaInicio, $fechaFin);
                    break;
                case 'mensual':
                    $mes = $_GET['mes'] ?? null;
                    $anio = $_GET['anio'] ?? null;
                    $result = $this->getMensual($mes, $anio);
                    break;
                default:
                    http_response_code(400);
                    echo json_encode(["message" => "Período inválido"]);
                    return;
            }

            echo json_encode($result);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["message" => "Error del servidor", "error" => $e->getMessage()]);
        }
    }

    private function getDiaria($fecha = null) {
        if (!$fecha) $fecha = date('Y-m-d');
        
        $stmt = $this->db->prepare("SELECT SUM(total) as suma_ventas FROM ventas WHERE DATE(fecha) = ?");
        $stmt->execute([$fecha]);
        $ventas = $stmt->fetch(PDO::FETCH_ASSOC);

        $stmt = $this->db->query("SELECT SUM(sueldo / 30) as suma_personal FROM empleados WHERE estado = 'activo'");
        $personal = $stmt->fetch(PDO::FETCH_ASSOC);

        $stmt = $this->db->prepare("
            SELECT SUM(ac.total_proceso) as suma_mp
            FROM ventas v
            JOIN detalles_venta dv ON v.id = dv.venta_id
            JOIN lotes l ON dv.lote_id = l.id
            JOIN ajustes_contables ac ON ac.lote_id = l.id
            WHERE DATE(v.fecha) = ?
        ");
        $stmt->execute([$fecha]);
        $mp = $stmt->fetch(PDO::FETCH_ASSOC);

        $ganancia = ($ventas['suma_ventas'] ?? 0) - ($personal['suma_personal'] ?? 0) - ($mp['suma_mp'] ?? 0);

        return [
            'suma_ventas' => $ventas['suma_ventas'] ?? 0,
            'suma_personal' => $personal['suma_personal'] ?? 0,
            'suma_mp' => $mp['suma_mp'] ?? 0,
            'ganancia_dia' => $ganancia
        ];
    }

    private function getSemanal($fechaInicio = null, $fechaFin = null) {
        if (!$fechaInicio) {
            $fechaInicio = date('Y-m-d', strtotime('monday this week'));
            $fechaFin = date('Y-m-d', strtotime('sunday this week'));
        }

        $stmt = $this->db->prepare("SELECT SUM(total) as suma_ventas FROM ventas WHERE fecha BETWEEN ? AND ?");
        $stmt->execute([$fechaInicio, $fechaFin]);
        $ventas = $stmt->fetch(PDO::FETCH_ASSOC);

        $stmt = $this->db->query("SELECT SUM(sueldo / 30 * 7) as suma_personal FROM empleados WHERE estado = 'activo'");
        $personal = $stmt->fetch(PDO::FETCH_ASSOC);

        $stmt = $this->db->prepare("
            SELECT SUM(ac.total_proceso) as suma_mp
            FROM ventas v
            JOIN detalles_venta dv ON v.id = dv.venta_id
            JOIN lotes l ON dv.lote_id = l.id
            JOIN ajustes_contables ac ON ac.lote_id = l.id
            WHERE v.fecha BETWEEN ? AND ?
        ");
        $stmt->execute([$fechaInicio, $fechaFin]);
        $mp = $stmt->fetch(PDO::FETCH_ASSOC);

        $ganancia = ($ventas['suma_ventas'] ?? 0) - ($personal['suma_personal'] ?? 0) - ($mp['suma_mp'] ?? 0);

        return [
            'suma_ventas' => $ventas['suma_ventas'] ?? 0,
            'suma_personal' => $personal['suma_personal'] ?? 0,
            'suma_mp' => $mp['suma_mp'] ?? 0,
            'ganancia_semanal' => $ganancia
        ];
    }

    private function getMensual($mes = null, $anio = null) {
        if (!$mes) $mes = date('m');
        if (!$anio) $anio = date('Y');

        $stmt = $this->db->prepare("SELECT SUM(total) as suma_ventas FROM ventas WHERE MONTH(fecha) = ? AND YEAR(fecha) = ?");
        $stmt->execute([$mes, $anio]);
        $ventas = $stmt->fetch(PDO::FETCH_ASSOC);

        $stmt = $this->db->query("SELECT SUM(sueldo) as suma_personal FROM empleados WHERE estado = 'activo'");
        $personal = $stmt->fetch(PDO::FETCH_ASSOC);

        $stmt = $this->db->prepare("
            SELECT SUM(ac.total_proceso) as suma_mp
            FROM ventas v
            JOIN detalles_venta dv ON v.id = dv.venta_id
            JOIN lotes l ON dv.lote_id = l.id
            JOIN ajustes_contables ac ON ac.lote_id = l.id
            WHERE MONTH(v.fecha) = ? AND YEAR(v.fecha) = ?
        ");
        $stmt->execute([$mes, $anio]);
        $mp = $stmt->fetch(PDO::FETCH_ASSOC);

        $stmt = $this->db->query("SELECT SUM(monto) as costos_fijos FROM costos_fijos WHERE periodo = 'mensual'");
        $costos = $stmt->fetch(PDO::FETCH_ASSOC);

        $ganancia = ($ventas['suma_ventas'] ?? 0) - ($personal['suma_personal'] ?? 0) - ($mp['suma_mp'] ?? 0) - ($costos['costos_fijos'] ?? 0);

        return [
            'suma_ventas' => $ventas['suma_ventas'] ?? 0,
            'suma_personal' => $personal['suma_personal'] ?? 0,
            'suma_mp' => $mp['suma_mp'] ?? 0,
            'costos_fijos' => $costos['costos_fijos'] ?? 0,
            'ganancia_mes' => $ganancia
        ];
    }
}
