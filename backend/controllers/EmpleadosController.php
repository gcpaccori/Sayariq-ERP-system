<?php
require_once 'BaseController.php';

class EmpleadosController extends BaseController {
    public function index() {
        $stmt = $this->db->query("
            SELECT * FROM empleados 
            ORDER BY created_at DESC
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function show($id) {
        $stmt = $this->db->prepare("SELECT * FROM empleados WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function create($data) {
        $stmt = $this->db->prepare("
            INSERT INTO empleados (
                nombres, apellidos, documento_identidad, cargo,
                area, sueldo, fecha_ingreso, estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $result = $stmt->execute([
            $data['nombres'],
            $data['apellidos'],
            $data['documento_identidad'],
            $data['cargo'],
            $data['area'],
            $data['sueldo'],
            $data['fecha_ingreso'] ?? date('Y-m-d'),
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
        $sql = "UPDATE empleados SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($values);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM empleados WHERE id = ?");
        return $stmt->execute([$id]);
    }
}
