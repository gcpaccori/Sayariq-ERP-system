<?php
class Adelanto {
    private $db;
    private $table = 'adelantos';

    public function __construct($db) {
        $this->db = $db;
    }

    public function getAll() {
        try {
            logMessage('DEBUG', 'Adelanto Model: getAll');
            
            $query = "SELECT * FROM {$this->table} ORDER BY fecha_adelanto DESC";
            $stmt = $this->db->prepare($query);
            $stmt->execute();
            
            $result = $stmt->fetchAll();
            logMessage('DEBUG', 'Adelanto Model: getAll resultado', ['count' => count($result)]);
            
            return $result;
        } catch (Exception $e) {
            logMessage('ERROR', 'Error en Adelanto getAll', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    public function getById($id) {
        try {
            logMessage('DEBUG', 'Adelanto Model: getById', ['id' => $id]);
            
            $query = "SELECT * FROM {$this->table} WHERE id = :id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            
            $result = $stmt->fetch();
            return $result;
        } catch (Exception $e) {
            logMessage('ERROR', 'Error en Adelanto getById', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    public function create($data) {
        try {
            logMessage('DEBUG', 'Adelanto Model: create', $data);
            
            $query = "INSERT INTO {$this->table} 
                    (productor_id, productor_nombre, monto_original, monto_descontado, 
                     saldo_pendiente, concepto, fecha_adelanto, estado, created_at, updated_at)
                    VALUES (:productor_id, :productor_nombre, :monto_original, :monto_descontado,
                            :saldo_pendiente, :concepto, :fecha_adelanto, :estado, NOW(), NOW())";
            
            $stmt = $this->db->prepare($query);
            
            $stmt->bindParam(':productor_id', $data['productor_id']);
            $stmt->bindParam(':productor_nombre', $data['productor_nombre']);
            $stmt->bindParam(':monto_original', $data['monto_original']);
            $stmt->bindParam(':monto_descontado', $data['monto_descontado']);
            $stmt->bindParam(':saldo_pendiente', $data['saldo_pendiente']);
            $stmt->bindParam(':concepto', $data['concepto']);
            $stmt->bindParam(':fecha_adelanto', $data['fecha_adelanto']);
            $stmt->bindParam(':estado', $data['estado']);
            
            if ($stmt->execute()) {
                $id = $this->db->lastInsertId();
                logMessage('INFO', 'Adelanto creado', ['id' => $id]);
                return $this->getById($id);
            }
            
            throw new Exception('No se pudo crear el adelanto');
        } catch (Exception $e) {
            logMessage('ERROR', 'Error en Adelanto create', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    public function update($id, $data) {
        try {
            logMessage('DEBUG', 'Adelanto Model: update', ['id' => $id, 'data' => $data]);
            
            $updates = [];
            $params = [':id' => $id];
            
            if (isset($data['monto_descontado'])) {
                $updates[] = "monto_descontado = :monto_descontado";
                $params[':monto_descontado'] = $data['monto_descontado'];
            }
            
            if (isset($data['saldo_pendiente'])) {
                $updates[] = "saldo_pendiente = :saldo_pendiente";
                $params[':saldo_pendiente'] = $data['saldo_pendiente'];
            }
            
            if (isset($data['estado'])) {
                $updates[] = "estado = :estado";
                $params[':estado'] = $data['estado'];
            }
            
            if (isset($data['concepto'])) {
                $updates[] = "concepto = :concepto";
                $params[':concepto'] = $data['concepto'];
            }
            
            if (empty($updates)) {
                return $this->getById($id);
            }
            
            $updates[] = "updated_at = NOW()";
            $query = "UPDATE {$this->table} SET " . implode(", ", $updates) . " WHERE id = :id";
            
            $stmt = $this->db->prepare($query);
            
            foreach ($params as $key => $value) {
                $stmt->bindParam($key, $value);
            }
            
            if ($stmt->execute()) {
                logMessage('INFO', 'Adelanto actualizado', ['id' => $id]);
                return $this->getById($id);
            }
            
            throw new Exception('No se pudo actualizar el adelanto');
        } catch (Exception $e) {
            logMessage('ERROR', 'Error en Adelanto update', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    public function delete($id) {
        try {
            logMessage('DEBUG', 'Adelanto Model: delete', ['id' => $id]);
            
            $query = "DELETE FROM {$this->table} WHERE id = :id";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':id', $id);
            
            if ($stmt->execute()) {
                logMessage('INFO', 'Adelanto eliminado', ['id' => $id]);
                return true;
            }
            
            return false;
        } catch (Exception $e) {
            logMessage('ERROR', 'Error en Adelanto delete', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    public function getByProductor($productorId) {
        try {
            $query = "SELECT * FROM {$this->table} WHERE productor_id = :productor_id ORDER BY fecha_adelanto DESC";
            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':productor_id', $productorId);
            $stmt->execute();
            
            return $stmt->fetchAll();
        } catch (Exception $e) {
            logMessage('ERROR', 'Error en getByProductor', ['error' => $e->getMessage()]);
            throw $e;
        }
    }
}
?>
