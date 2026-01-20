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

            switch ($periodo) {

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
            echo json_encode([
                "message" => "Error del servidor",
                "error"   => $e->getMessage()
            ]);
        }
    }

    /* ============================================================
                       RENTABILIDAD DIARIA
    ============================================================ */
    private function getDiaria($fecha = null) {
        if (!$fecha) $fecha = date('Y-m-d');

        // VENTAS
        $stmt = $this->db->prepare("
            SELECT SUM(total) AS suma_ventas
            FROM ventas
            WHERE DATE(fecha_venta) = ?
        ");
        $stmt->execute([$fecha]);
        $ventas = $stmt->fetch(PDO::FETCH_ASSOC);

        // SUELDOS DIARIOS
        $stmt = $this->db->query("
            SELECT SUM(sueldo / 30) AS suma_personal
            FROM empleados
            WHERE estado = 'activo'
        ");
        $personal = $stmt->fetch(PDO::FETCH_ASSOC);

        // MATERIA PRIMA
        $stmt = $this->db->prepare("
            SELECT SUM(ac.total_proceso) AS suma_mp
            FROM ventas v
            JOIN planificacion_operativa po ON v.pedido_id = po.pedido_id
            JOIN lotes l ON po.lote_id = l.id
            JOIN ajustes_contables ac ON ac.lote_id = l.id
            WHERE DATE(v.fecha_venta) = ?
        ");
        $stmt->execute([$fecha]);
        $mp = $stmt->fetch(PDO::FETCH_ASSOC);

        $ganancia = ($ventas['suma_ventas'] ?? 0)
                  - ($personal['suma_personal'] ?? 0)
                  - ($mp['suma_mp'] ?? 0);

        return [
            "suma_ventas"   => round($ventas['suma_ventas'] ?? 0, 2),
            "suma_personal" => round($personal['suma_personal'] ?? 0, 2),
            "suma_mp"       => round($mp['suma_mp'] ?? 0, 2),
            "ganancia_dia"  => round($ganancia, 2)
        ];
    }

    /* ============================================================
                       RENTABILIDAD SEMANAL
    ============================================================ */
    private function getSemanal($fechaInicio = null, $fechaFin = null) {

        if (!$fechaInicio) {
            $fechaInicio = date('Y-m-d', strtotime('monday this week'));
            $fechaFin    = date('Y-m-d', strtotime('sunday this week'));
        }

        // VENTAS
        $stmt = $this->db->prepare("
            SELECT SUM(total) AS suma_ventas
            FROM ventas
            WHERE fecha_venta BETWEEN ? AND ?
        ");
        $stmt->execute([$fechaInicio, $fechaFin]);
        $ventas = $stmt->fetch(PDO::FETCH_ASSOC);

        // SUELDOS SEMANALES
        $stmt = $this->db->query("
            SELECT SUM(sueldo / 30 * 7) AS suma_personal
            FROM empleados
            WHERE estado = 'activo'
        ");
        $personal = $stmt->fetch(PDO::FETCH_ASSOC);

        // MATERIA PRIMA
        $stmt = $this->db->prepare("
            SELECT SUM(ac.total_proceso) AS suma_mp
            FROM ventas v
            JOIN planificacion_operativa po ON v.pedido_id = po.pedido_id
            JOIN lotes l ON po.lote_id = l.id
            JOIN ajustes_contables ac ON ac.lote_id = l.id
            WHERE v.fecha_venta BETWEEN ? AND ?
        ");
        $stmt->execute([$fechaInicio, $fechaFin]);
        $mp = $stmt->fetch(PDO::FETCH_ASSOC);

        $ganancia = ($ventas['suma_ventas'] ?? 0)
                  - ($personal['suma_personal'] ?? 0)
                  - ($mp['suma_mp'] ?? 0);

        return [
            "suma_ventas"      => round($ventas['suma_ventas'] ?? 0, 2),
            "suma_personal"    => round($personal['suma_personal'] ?? 0, 2),
            "suma_mp"          => round($mp['suma_mp'] ?? 0, 2),
            "ganancia_semanal" => round($ganancia, 2)
        ];
    }

    /* ============================================================
                       RENTABILIDAD MENSUAL
    ============================================================ */
    private function getMensual($mes = null, $anio = null) {
        if (!$mes)  $mes  = date('m');
        if (!$anio) $anio = date('Y');

        // VENTAS
        $stmt = $this->db->prepare("
            SELECT SUM(total) AS suma_ventas
            FROM ventas
            WHERE MONTH(fecha_venta) = ? AND YEAR(fecha_venta) = ?
        ");
        $stmt->execute([$mes, $anio]);
        $ventas = $stmt->fetch(PDO::FETCH_ASSOC);

        // SUELDOS MENSUALES
        $stmt = $this->db->query("
            SELECT SUM(sueldo) AS suma_personal
            FROM empleados
            WHERE estado = 'activo'
        ");
        $personal = $stmt->fetch(PDO::FETCH_ASSOC);

        // MATERIA PRIMA
        $stmt = $this->db->prepare("
            SELECT SUM(ac.total_proceso) AS suma_mp
            FROM ventas v
            JOIN planificacion_operativa po ON v.pedido_id = po.pedido_id
            JOIN lotes l ON po.lote_id = l.id
            JOIN ajustes_contables ac ON ac.lote_id = l.id
            WHERE MONTH(v.fecha_venta) = ? AND YEAR(v.fecha_venta) = ?
        ");
        $stmt->execute([$mes, $anio]);
        $mp = $stmt->fetch(PDO::FETCH_ASSOC);

        // COSTOS FIJOS (solo activos y mensuales)
        $stmt = $this->db->query("
            SELECT SUM(monto) AS costos_fijos
            FROM costos_fijos
            WHERE estado = 'activo' AND periodicidad = 'mensual'
        ");
        $costos = $stmt->fetch(PDO::FETCH_ASSOC);

        $ganancia = ($ventas['suma_ventas'] ?? 0)
                  - ($personal['suma_personal'] ?? 0)
                  - ($mp['suma_mp'] ?? 0)
                  - ($costos['costos_fijos'] ?? 0);

        return [
            "suma_ventas"   => round($ventas['suma_ventas'] ?? 0, 2),
            "suma_personal" => round($personal['suma_personal'] ?? 0, 2),
            "suma_mp"       => round($mp['suma_mp'] ?? 0, 2),
            "costos_fijos"  => round($costos['costos_fijos'] ?? 0, 2),
            "ganancia_mes"  => round($ganancia, 2)
        ];
    }

}
