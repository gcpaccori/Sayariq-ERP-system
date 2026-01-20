<?php
require_once 'BaseController.php';

class CostosFijosController extends BaseController {
    public function index() {
        $stmt = $this->db->query("
            SELECT * FROM costos_fijos 
            ORDER BY created_at DESC
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function show($id) {
        $stmt = $this->db->prepare("SELECT * FROM costos_fijos WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function create($data) {
        $stmt = $this->db->prepare("
            INSERT INTO costos_fijos (
                concepto, categoria, monto, periodo
            ) VALUES (?, ?, ?, ?)
        ");
        
        $result = $stmt->execute([
            $data['concepto'],
            $data['categoria'],
            $data['monto'],
            $data['periodo'] ?? 'mensual'
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
        $sql = "UPDATE costos_fijos SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($values);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM costos_fijos WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function getTotalMensual() {
        $stmt = $this->db->query("
            SELECT SUM(monto) as total FROM costos_fijos WHERE periodo = 'mensual'
        ");
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getPorCategoria() {
        $stmt = $this->db->query("
            SELECT categoria, SUM(monto) as total_categoria, COUNT(*) as cantidad
            FROM costos_fijos 
            WHERE activo = 1
            GROUP BY categoria
            ORDER BY total_categoria DESC
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getTotalActivo() {
        $hoy = date('Y-m-d');
        $stmt = $this->db->prepare("
            SELECT SUM(monto) as total FROM costos_fijos 
            WHERE activo = 1 
            AND fecha_inicio <= ? 
            AND (fecha_fin IS NULL OR fecha_fin >= ?)
        ");
        $stmt->execute([$hoy, $hoy]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
