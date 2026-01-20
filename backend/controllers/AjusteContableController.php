<?php
require_once 'BaseController.php';

class AjusteContableController extends BaseController {
    public function index() {
        $stmt = $this->db->query("
            SELECT ac.*, l.numero_lote, p.nombres, p.apellidos, l.peso_inicial
            FROM ajustes_contables ac
            JOIN lotes l ON ac.lote_id = l.id
            JOIN personas p ON l.productor_id = p.id
            ORDER BY ac.created_at DESC
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function show($id) {
        $stmt = $this->db->prepare("
            SELECT ac.*, l.numero_lote, p.nombres, p.apellidos, l.peso_inicial
            FROM ajustes_contables ac
            JOIN lotes l ON ac.lote_id = l.id
            JOIN personas p ON l.productor_id = p.id
            WHERE ac.id = ?
        ");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function create($data) {
        $stmt = $this->db->prepare("
            INSERT INTO ajustes_contables (
                lote_id, tipo_calculo, peso_exportable, peso_industrial, 
                peso_industrial_ii, peso_descarte, precio_exportable, 
                precio_industrial, precio_industrial_ii, precio_descarte,
                total_proceso, total_carga, peso_ingreso, precio_kg,
                fecha_pago, fecha_liquidacion, serie, numero_lc,
                observaciones, estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $result = $stmt->execute([
            $data['lote_id'],
            $data['tipo_calculo'],
            $data['peso_exportable'] ?? 0,
            $data['peso_industrial'] ?? 0,
            $data['peso_industrial_ii'] ?? 0,
            $data['peso_descarte'] ?? 0,
            $data['precio_exportable'] ?? 0,
            $data['precio_industrial'] ?? 0,
            $data['precio_industrial_ii'] ?? 0,
            $data['precio_descarte'] ?? 0,
            $data['total_proceso'] ?? 0,
            $data['total_carga'] ?? 0,
            $data['peso_ingreso'] ?? 0,
            $data['precio_kg'] ?? 0,
            $data['fecha_pago'] ?? null,
            $data['fecha_liquidacion'] ?? null,
            $data['serie'] ?? null,
            $data['numero_lc'] ?? null,
            $data['observaciones'] ?? null,
            $data['estado'] ?? 'pendiente'
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
        $sql = "UPDATE ajustes_contables SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($values);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM ajustes_contables WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function getByLote($loteId) {
        $stmt = $this->db->prepare("
            SELECT * FROM ajustes_contables 
            WHERE lote_id = ? 
            ORDER BY created_at DESC
        ");
        $stmt->execute([$loteId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
