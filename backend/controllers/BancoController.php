<?php
require_once 'BaseController.php';

class BancoController extends BaseController {
    public function index() {
        $stmt = $this->db->query("
            SELECT * FROM libro_banco 
            ORDER BY fecha DESC, created_at DESC
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function show($id) {
        $stmt = $this->db->prepare("SELECT * FROM libro_banco WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function create($data) {
        $stmt = $this->db->prepare("
            INSERT INTO libro_banco (
                fecha, operacion, quien, de_quien, motivo, tipo,
                rubro_campo, rubro_economico, numero_operacion,
                comprobante, monto, deudor, acreedor, estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $result = $stmt->execute([
            $data['fecha'] ?? date('Y-m-d'),
            $data['operacion'],
            $data['quien'] ?? null,
            $data['de_quien'] ?? null,
            $data['motivo'] ?? null,
            $data['tipo'] ?? 'general',
            $data['rubro_campo'] ?? null,
            $data['rubro_economico'] ?? null,
            $data['numero_operacion'] ?? null,
            $data['comprobante'] ?? null,
            $data['monto'] ?? 0,
            $data['deudor'] ?? 0,
            $data['acreedor'] ?? 0,
            $data['estado'] ?? 'activo'
        ]);

        return $result ? $this->db->lastInsertId() : false;
    }

    public function update($id, $data) {
        $fields = [];
        $values = [];

        foreach ($data as $key => $value) {
            if ($key !== 'id') {
                $fields[] = "$key = ?";
                $values[] = $value;
            }
        }

        $values[] = $id;
        $sql = "UPDATE libro_banco SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($values);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM libro_banco WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function getSummary() {
        $stmt = $this->db->query("
            SELECT 
                SUM(CASE WHEN tipo = 'adelanto' AND estado = 'pendiente' THEN monto ELSE 0 END) as suma_adelantos_pendientes,
                COUNT(CASE WHEN tipo = 'liquidacion' AND estado = 'pendiente' THEN 1 END) as recuento_liquidaciones_pendiente,
                SUM(CASE WHEN tipo = 'pago' AND estado = 'pendiente' THEN monto ELSE 0 END) as suma_pago_pendiente
            FROM libro_banco
        ");
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
