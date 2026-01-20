<?php

class PersonasController {
    private $conn;
    private $table = "personas";
    private $rolesTable = "roles";
    private $pivotTable = "persona_roles";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest($method, $id, $action) {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $this->getOne($id);
                } else if ($action === 'productores') {
                    $this->getProductores();
                } else if ($action === 'clientes') {
                    $this->getClientes();
                } else {
                    $this->getAll();
                }
                break;

            case 'POST':
                if ($action === 'search') {
                    $this->search();
                } else {
                    $this->create();
                }
                break;

            case 'PUT':
                $this->update($id);
                break;

            case 'DELETE':
                $this->delete($id);
                break;
        }
    }

    /* ----------------- Helpers internos ----------------- */

    private function jsonResponse($data, $status = 200) {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data);
    }

    /**
     * Convierte roles_concat en array y agrega:
     * - roles: string[]
     * - tipo: alias de tipo_persona
     * - nombres / apellidos (si faltan, los intenta deducir de nombre_completo)
     * - ruc / razon_social (si faltan, los intenta deducir para RUC)
     */
    private function mapPersonaRow(array $row) {
        // Roles
        $roles = [];
        if (!empty($row['roles_concat'])) {
            $roles = array_filter(array_map('trim', explode(',', $row['roles_concat'])));
        }
        $row['roles'] = $roles;
        $row['tipo']  = $row['tipo_persona'] ?? null;

        // Nombres y apellidos
        if (
    (empty($row['nombres'])) &&
    (empty($row['apellidos'])) &&
    !empty($row['nombre_completo'])
) {
            $parts = preg_split('/\s+/', trim($row['nombre_completo']));
            if (count($parts) > 1) {
                $row['nombres']   = array_shift($parts);
                $row['apellidos'] = implode(' ', $parts);
            } else {
                $row['nombres']   = $row['nombre_completo'];
                $row['apellidos'] = '';
            }
        }

        // RUC / Razón social (por si no estaban en columnas nuevas)
        if (
            (!isset($row['ruc']) || $row['ruc'] === null || $row['ruc'] === '') &&
            isset($row['tipo_documento']) &&
            $row['tipo_documento'] === 'RUC'
        ) {
            $row['ruc'] = $row['documento_identidad'] ?? null;
        }

        if (
            (!isset($row['razon_social']) || $row['razon_social'] === null || $row['razon_social'] === '') &&
            isset($row['tipo_documento']) &&
            $row['tipo_documento'] === 'RUC'
        ) {
            $row['razon_social'] = $row['nombre_completo'] ?? null;
        }

        unset($row['roles_concat']);

        return $row;
    }

    /**
     * A partir de la lista de roles, calcula un tipo_persona principal
     * para seguir usando la columna existente sin romper nada.
     */
    private function inferTipoPersonaFromRoles(array $roles, $tipoActual = null) {
        if (!empty($tipoActual)) {
            return $tipoActual;
        }

        if (in_array('productor', $roles)) {
            return 'productor';
        }

        if (in_array('comprador', $roles)) {
            return 'cliente';
        }

        if (
            in_array('jornalero', $roles) ||
            in_array('supervisor', $roles) ||
            in_array('control_calidad', $roles)
        ) {
            return 'empleado';
        }

        // Default
        return 'cliente';
    }

    /**
     * Sincroniza roles de una persona en persona_roles.
     * Crea el rol en la tabla roles si no existe.
     */
    private function syncRoles($personaId, array $roles) {
        // Borra roles anteriores
        $stmt = $this->conn->prepare(
            "DELETE FROM {$this->pivotTable} WHERE persona_id = ?"
        );
        $stmt->execute([$personaId]);

        if (empty($roles)) {
            return;
        }

        // Insertar roles uno por uno
        $selectRol = $this->conn->prepare(
            "SELECT id FROM {$this->rolesTable} WHERE codigo = ? LIMIT 1"
        );

        $insertRol = $this->conn->prepare(
            "INSERT INTO {$this->rolesTable} (codigo, nombre, estado) VALUES (?, ?, 'activo')"
        );

        $insertPivot = $this->conn->prepare(
            "INSERT IGNORE INTO {$this->pivotTable} (persona_id, rol_id) VALUES (?, ?)"
        );

        foreach ($roles as $codigo) {
            $codigo = trim((string)$codigo);
            if ($codigo === '') continue;

            // Buscar rol
            $selectRol->execute([$codigo]);
            $rol = $selectRol->fetch(PDO::FETCH_ASSOC);

            if ($rol) {
                $rolId = $rol['id'];
            } else {
                // Crea rol automáticamente si no existe
                $nombre = ucwords(str_replace('_', ' ', $codigo));
                $insertRol->execute([$codigo, $nombre]);
                $rolId = $this->conn->lastInsertId();
            }

            $insertPivot->execute([$personaId, $rolId]);
        }
    }

    /* ----------------- Métodos públicos (endpoints) ----------------- */

    public function getAll() {
        $query = "
            SELECT 
                p.*,
                GROUP_CONCAT(DISTINCT r.codigo) AS roles_concat
            FROM {$this->table} p
            LEFT JOIN {$this->pivotTable} pr ON p.id = pr.persona_id
            LEFT JOIN {$this->rolesTable} r ON r.id = pr.rol_id
            GROUP BY p.id
            ORDER BY p.created_at DESC
        ";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $result = array_map([$this, 'mapPersonaRow'], $rows);
        $this->jsonResponse($result);
    }

    public function getOne($id) {
        $query = "
            SELECT 
                p.*,
                GROUP_CONCAT(DISTINCT r.codigo) AS roles_concat
            FROM {$this->table} p
            LEFT JOIN {$this->pivotTable} pr ON p.id = pr.persona_id
            LEFT JOIN {$this->rolesTable} r ON r.id = pr.rol_id
            WHERE p.id = :id
            GROUP BY p.id
            LIMIT 1
        ";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $this->jsonResponse($this->mapPersonaRow($row));
        } else {
            $this->jsonResponse(['message' => 'Persona no encontrada'], 404);
        }
    }

    public function getProductores() {
        $query = "
            SELECT 
                p.*,
                GROUP_CONCAT(DISTINCT r.codigo) AS roles_concat
            FROM {$this->table} p
            LEFT JOIN {$this->pivotTable} pr ON p.id = pr.persona_id
            LEFT JOIN {$this->rolesTable} r ON r.id = pr.rol_id
            WHERE p.estado = 'activo'
              AND (r.codigo = 'productor' OR p.tipo_persona = 'productor')
            GROUP BY p.id
            ORDER BY p.nombre_completo
        ";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $result = array_map([$this, 'mapPersonaRow'], $rows);
        $this->jsonResponse($result);
    }

    public function getClientes() {
        $query = "
            SELECT 
                p.*,
                GROUP_CONCAT(DISTINCT r.codigo) AS roles_concat
            FROM {$this->table} p
            LEFT JOIN {$this->pivotTable} pr ON p.id = pr.persona_id
            LEFT JOIN {$this->rolesTable} r ON r.id = pr.rol_id
            WHERE p.estado = 'activo'
              AND (p.tipo_persona = 'cliente')
            GROUP BY p.id
            ORDER BY p.nombre_completo
        ";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $result = array_map([$this, 'mapPersonaRow'], $rows);
        $this->jsonResponse($result);
    }

    public function search() {
        $data = json_decode(file_get_contents("php://input"));
        $search = $data->search ?? '';

        $query = "
            SELECT 
                p.*,
                GROUP_CONCAT(DISTINCT r.codigo) AS roles_concat
            FROM {$this->table} p
            LEFT JOIN {$this->pivotTable} pr ON p.id = pr.persona_id
            LEFT JOIN {$this->rolesTable} r ON r.id = pr.rol_id
            WHERE p.nombre_completo LIKE :search
               OR p.documento_identidad LIKE :search
               OR p.ruc LIKE :search
            GROUP BY p.id
            ORDER BY p.nombre_completo
            LIMIT 20
        ";

        $stmt = $this->conn->prepare($query);
        $searchParam = "%{$search}%";
        $stmt->bindParam(':search', $searchParam);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $result = array_map([$this, 'mapPersonaRow'], $rows);
        $this->jsonResponse($result);
    }

    public function create() {
        $data = json_decode(file_get_contents("php://input"));

        // Campos básicos
        $tipoDoc   = $data->tipo_documento ?? 'DNI';
        $nombres   = $data->nombres ?? '';
        $apellidos = $data->apellidos ?? '';
        $ruc       = $data->ruc ?? '';
        $razon     = $data->razon_social ?? '';

        // Nombre completo según tipo de documento
        if ($tipoDoc === 'RUC') {
            $nombreCompleto = $razon !== '' ? $razon : ($data->nombre_completo ?? '');
        } else {
            $nombreCompleto = trim($nombres . ' ' . $apellidos);
        }

        // Roles
        $roles = [];
        if (!empty($data->roles) && is_array($data->roles)) {
            $roles = $data->roles;
        }

        // Tipo persona principal
        $tipoPersona = $this->inferTipoPersonaFromRoles($roles, $data->tipo_persona ?? null);

        $query = "
            INSERT INTO {$this->table} (
                nombres,
                apellidos,
                nombre_completo,
                documento_identidad,
                tipo_documento,
                ruc,
                razon_social,
                telefono,
                email,
                direccion,
                distrito,
                provincia,
                departamento,
                tipo_persona,
                cuenta_bancaria,
                banco,
                cci,
                observaciones,
                estado
            ) VALUES (
                :nombres,
                :apellidos,
                :nombre,
                :documento,
                :tipo_doc,
                :ruc,
                :razon_social,
                :telefono,
                :email,
                :direccion,
                :distrito,
                :provincia,
                :departamento,
                :tipo_persona,
                :cuenta,
                :banco,
                :cci,
                :observaciones,
                :estado
            )
        ";

        $stmt = $this->conn->prepare($query);

        $documento   = $data->numero_documento ?? '';
        $telefono    = $data->telefono ?? '';
        $email       = $data->email ?? '';
        $direccion   = $data->direccion ?? '';
        $distrito    = $data->distrito ?? '';
        $provincia   = $data->provincia ?? '';
        $departamento = $data->departamento ?? '';
        $cuenta      = $data->numero_cuenta ?? '';
        $banco       = $data->banco ?? '';
        $cci         = $data->cci ?? '';
        $observ      = $data->observaciones ?? '';
        $estado      = 'activo';

        $stmt->bindParam(':nombres', $nombres);
        $stmt->bindParam(':apellidos', $apellidos);
        $stmt->bindParam(':nombre', $nombreCompleto);
        $stmt->bindParam(':documento', $documento);
        $stmt->bindParam(':tipo_doc', $tipoDoc);
        $stmt->bindParam(':ruc', $ruc);
        $stmt->bindParam(':razon_social', $razon);
        $stmt->bindParam(':telefono', $telefono);
        $stmt->bindParam(':email', $email);
        $stmt->bindParam(':direccion', $direccion);
        $stmt->bindParam(':distrito', $distrito);
        $stmt->bindParam(':provincia', $provincia);
        $stmt->bindParam(':departamento', $departamento);
        $stmt->bindParam(':tipo_persona', $tipoPersona);
        $stmt->bindParam(':cuenta', $cuenta);
        $stmt->bindParam(':banco', $banco);
        $stmt->bindParam(':cci', $cci);
        $stmt->bindParam(':observaciones', $observ);
        $stmt->bindParam(':estado', $estado);

        if ($stmt->execute()) {
            $personaId = $this->conn->lastInsertId();

            // Guardar roles en tabla pivote
            $this->syncRoles($personaId, $roles);

            $this->jsonResponse([
                "message" => "Persona creada",
                "id"      => $personaId
            ], 201);
        } else {
            $this->jsonResponse(["message" => "Error al crear persona"], 500);
        }
    }

    public function update($id) {
        $data = json_decode(file_get_contents("php://input"));

        $tipoDoc   = $data->tipo_documento ?? 'DNI';
        $nombres   = $data->nombres ?? '';
        $apellidos = $data->apellidos ?? '';
        $ruc       = $data->ruc ?? '';
        $razon     = $data->razon_social ?? '';

        if ($tipoDoc === 'RUC') {
            $nombreCompleto = $razon !== '' ? $razon : ($data->nombre_completo ?? '');
        } else {
            $nombreCompleto = trim($nombres . ' ' . $apellidos);
        }

        $roles = [];
        if (!empty($data->roles) && is_array($data->roles)) {
            $roles = $data->roles;
        }

        $tipoPersona = $this->inferTipoPersonaFromRoles($roles, $data->tipo_persona ?? null);

        $query = "
            UPDATE {$this->table} SET
                nombres            = :nombres,
                apellidos          = :apellidos,
                nombre_completo    = :nombre,
                documento_identidad = :documento,
                tipo_documento     = :tipo_doc,
                ruc                = :ruc,
                razon_social       = :razon_social,
                telefono           = :telefono,
                email              = :email,
                direccion          = :direccion,
                distrito           = :distrito,
                provincia          = :provincia,
                departamento       = :departamento,
                tipo_persona       = :tipo_persona,
                cuenta_bancaria    = :cuenta,
                banco              = :banco,
                cci                = :cci,
                observaciones      = :observaciones
            WHERE id = :id
        ";

        $stmt = $this->conn->prepare($query);

        $documento    = $data->numero_documento ?? '';
        $telefono     = $data->telefono ?? '';
        $email        = $data->email ?? '';
        $direccion    = $data->direccion ?? '';
        $distrito     = $data->distrito ?? '';
        $provincia    = $data->provincia ?? '';
        $departamento = $data->departamento ?? '';
        $cuenta       = $data->numero_cuenta ?? '';
        $banco        = $data->banco ?? '';
        $cci          = $data->cci ?? '';
        $observ       = $data->observaciones ?? '';

        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->bindParam(':nombres', $nombres);
        $stmt->bindParam(':apellidos', $apellidos);
        $stmt->bindParam(':nombre', $nombreCompleto);
        $stmt->bindParam(':documento', $documento);
        $stmt->bindParam(':tipo_doc', $tipoDoc);
        $stmt->bindParam(':ruc', $ruc);
        $stmt->bindParam(':razon_social', $razon);
        $stmt->bindParam(':telefono', $telefono);
        $stmt->bindParam(':email', $email);
        $stmt->bindParam(':direccion', $direccion);
        $stmt->bindParam(':distrito', $distrito);
        $stmt->bindParam(':provincia', $provincia);
        $stmt->bindParam(':departamento', $departamento);
        $stmt->bindParam(':tipo_persona', $tipoPersona);
        $stmt->bindParam(':cuenta', $cuenta);
        $stmt->bindParam(':banco', $banco);
        $stmt->bindParam(':cci', $cci);
        $stmt->bindParam(':observaciones', $observ);

        if ($stmt->execute()) {
            // Actualizar roles
            $this->syncRoles($id, $roles);

            $this->jsonResponse(["message" => "Persona actualizada"]);
        } else {
            $this->jsonResponse(["message" => "Error al actualizar persona"], 500);
        }
    }

    public function delete($id) {
        // Si prefieres baja lógica:
        // $query = "UPDATE {$this->table} SET estado='inactivo' WHERE id=:id";
        $query = "DELETE FROM {$this->table} WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);

        if ($stmt->execute()) {
            $this->jsonResponse(["message" => "Persona eliminada"]);
        } else {
            $this->jsonResponse(["message" => "Error al eliminar persona"], 500);
        }
    }
}
