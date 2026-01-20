<?php

class PesosController {
    private $conn;
    private $table = "pesos_lote";
    private $detalleTable = "pesos_lote_detalle";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest($method, $id, $action) {
        switch($method) {
            case 'GET':
                if ($action === 'por-lote' && $id) {
                    $this->getPorLote($id);
                } else if ($action === 'categorias') {
                    $this->getCategorias();
                } else if ($id) {
                    $this->getOne($id);
                } else {
                    $this->getAll();
                }
                break;

            case 'POST':
                $this->create();
                break;

            case 'PUT':
                $this->update($id);
                break;

            case 'DELETE':
                $this->delete($id);
                break;
        }
    }

    /* -----------------------------
     *   CATEGORÍAS DINÁMICAS
     * ----------------------------- */

    // Devuelve todas las categorías activas para que el frontend construya el grid dinámico
    public function getCategorias() {
        $query = "SELECT id, codigo, nombre, precio_kg, estado, orden
                  FROM categorias_peso
                  WHERE estado = 'activo'
                  ORDER BY orden";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => $result
        ]);
    }

    // Carga mapa de categorías por id y por código (peso_exportable, peso_industrial, etc.)
    private function loadCategoriasMap() {
        $query = "SELECT id, codigo, nombre
                  FROM categorias_peso
                  WHERE estado = 'activo'";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $byId = [];
        $byCodigo = [];

        foreach ($rows as $row) {
            $byId[(int)$row['id']] = $row;
            $byCodigo[$row['codigo']] = $row;
        }

        return [
            'byId'     => $byId,
            'byCodigo' => $byCodigo,
        ];
    }

    /**
     * Reconstruye detalles dinámicos desde las columnas "legacy" del registro
     * (peso_exportable, peso_industrial, etc.) si existen valores > 0
     */
    private function buildDetallesFromLegacy(array $pesoRow, array $catsMap) {
        $mapCodigo = $catsMap['byCodigo'];

        // Mapeo: columna de la tabla pesos_lote -> código de categoría
        $legacyMap = [
            'peso_exportable' => 'peso_exportable',
            'peso_industrial' => 'peso_industrial',
            'peso_descarte'   => 'peso_descarte',
            'peso_nacional'   => 'peso_nacional',
            'peso_primera'    => 'peso_primera',
            'peso_segunda'    => 'peso_segunda',
            'peso_tercera'    => 'peso_tercera',
            'peso_cuarta'     => 'peso_cuarta',
            'peso_quinta'     => 'peso_quinta',
            'peso_dedos'      => 'peso_dedos',
        ];

        $detalles = [];

        foreach ($legacyMap as $col => $codigoCat) {
            if (!isset($pesoRow[$col])) {
                continue;
            }

            $valor = (float)$pesoRow[$col];
            if ($valor <= 0) {
                continue;
            }

            if (!isset($mapCodigo[$codigoCat])) {
                // No hay categoría activa para este código, lo ignoramos
                continue;
            }

            $cat = $mapCodigo[$codigoCat];

            $detalles[] = [
                'id'           => null,
                'categoria_id' => (int)$cat['id'],
                'codigo'       => $cat['codigo'],
                'nombre'       => $cat['nombre'],
                'peso'         => $valor,
            ];
        }

        return $detalles;
    }

    /* -----------------------------
     *   CONSULTAS
     * ----------------------------- */

    // GET /pesos-lote
    public function getAll() {
        // Cabecera de pesajes (incluyendo algunas columnas legacy por si acaso)
        $query = "SELECT p.*, l.numero_lote, l.producto
                  FROM " . $this->table . " p
                  LEFT JOIN lotes l ON p.lote_id = l.id
                  ORDER BY p.fecha_pesado DESC, p.id DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $pesos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!$pesos) {
            echo json_encode([]);
            return;
        }

        $ids = array_column($pesos, 'id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));

        // Detalles por pesaje
        $queryDet = "SELECT d.*, c.codigo, c.nombre
                     FROM " . $this->detalleTable . " d
                     JOIN categorias_peso c ON d.categoria_id = c.id
                     WHERE d.peso_lote_id IN ($placeholders)
                     ORDER BY d.peso_lote_id, c.orden";
        $stmtDet = $this->conn->prepare($queryDet);
        foreach ($ids as $i => $id) {
            $stmtDet->bindValue($i + 1, $id, PDO::PARAM_INT);
        }
        $stmtDet->execute();
        $detRows = $stmtDet->fetchAll(PDO::FETCH_ASSOC);

        $detallesByPeso = [];
        foreach ($detRows as $row) {
            $pid = (int)$row['peso_lote_id'];
            if (!isset($detallesByPeso[$pid])) {
                $detallesByPeso[$pid] = [];
            }
            $detallesByPeso[$pid][] = [
                'id'           => (int)$row['id'],
                'categoria_id' => (int)$row['categoria_id'],
                'codigo'       => $row['codigo'],
                'nombre'       => $row['nombre'],
                'peso'         => (float)$row['peso'],
            ];
        }

        // Mapa de categorías para reconstruir registros antiguos
        $catsMap = $this->loadCategoriasMap();

        foreach ($pesos as &$p) {
            $pid = (int)$p['id'];
            $detalles = $detallesByPeso[$pid] ?? [];

            // Si no hay detalles en la tabla nueva, intentamos reconstruir desde columnas legacy
            if (empty($detalles)) {
                $detalles = $this->buildDetallesFromLegacy($p, $catsMap);
            }

            $p['detalles'] = $detalles;
        }

        echo json_encode($pesos);
    }

    // GET /pesos-lote/{id}
    public function getOne($id) {
        $query = "SELECT * FROM " . $this->table . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $peso = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$peso) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Registro no encontrado"]);
            return;
        }

        $queryDet = "SELECT d.*, c.codigo, c.nombre
                     FROM " . $this->detalleTable . " d
                     JOIN categorias_peso c ON d.categoria_id = c.id
                     WHERE d.peso_lote_id = :pid
                     ORDER BY c.orden";
        $stmtDet = $this->conn->prepare($queryDet);
        $stmtDet->bindParam(':pid', $id, PDO::PARAM_INT);
        $stmtDet->execute();
        $detalles = $stmtDet->fetchAll(PDO::FETCH_ASSOC);

        if ($detalles) {
            $peso['detalles'] = array_map(function($row) {
                return [
                    'id'           => (int)$row['id'],
                    'categoria_id' => (int)$row['categoria_id'],
                    'codigo'       => $row['codigo'],
                    'nombre'       => $row['nombre'],
                    'peso'         => (float)$row['peso'],
                ];
            }, $detalles);
        } else {
            // Fallback: reconstruir desde columnas legacy si no hay detalles
            $catsMap = $this->loadCategoriasMap();
            $peso['detalles'] = $this->buildDetallesFromLegacy($peso, $catsMap);
        }

        echo json_encode($peso);
    }

    // GET /pesos-lote/por-lote/{loteId}
    public function getPorLote($loteId) {
        $query = "SELECT * FROM " . $this->table . " 
                  WHERE lote_id = :lote_id 
                  ORDER BY fecha_pesado DESC, id DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':lote_id', $loteId, PDO::PARAM_INT);
        $stmt->execute();
        $pesos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!$pesos) {
            echo json_encode([]);
            return;
        }

        $ids = array_column($pesos, 'id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));

        $queryDet = "SELECT d.*, c.codigo, c.nombre
                     FROM " . $this->detalleTable . " d
                     JOIN categorias_peso c ON d.categoria_id = c.id
                     WHERE d.peso_lote_id IN ($placeholders)
                     ORDER BY d.peso_lote_id, c.orden";
        $stmtDet = $this->conn->prepare($queryDet);
        foreach ($ids as $i => $id) {
            $stmtDet->bindValue($i + 1, $id, PDO::PARAM_INT);
        }
        $stmtDet->execute();
        $detRows = $stmtDet->fetchAll(PDO::FETCH_ASSOC);

        $detallesByPeso = [];
        foreach ($detRows as $row) {
            $pid = (int)$row['peso_lote_id'];
            if (!isset($detallesByPeso[$pid])) {
                $detallesByPeso[$pid] = [];
            }
            $detallesByPeso[$pid][] = [
                'id'           => (int)$row['id'],
                'categoria_id' => (int)$row['categoria_id'],
                'codigo'       => $row['codigo'],
                'nombre'       => $row['nombre'],
                'peso'         => (float)$row['peso'],
            ];
        }

        $catsMap = $this->loadCategoriasMap();

        foreach ($pesos as &$p) {
            $pid = (int)$p['id'];
            $detalles = $detallesByPeso[$pid] ?? [];

            if (empty($detalles)) {
                $detalles = $this->buildDetallesFromLegacy($p, $catsMap);
            }

            $p['detalles'] = $detalles;
        }

        echo json_encode($pesos);
    }

    /* -----------------------------
     *   CREATE / UPDATE / DELETE
     * ----------------------------- */

    // POST /pesos-lote
    public function create() {
        $data = json_decode(file_get_contents("php://input"));

        if (!$this->validatePesosInput($data)) {
            return;
        }

        $pesoBruto = (float)$data->peso_bruto;

        $query = "INSERT INTO " . $this->table . " 
                  (lote_id, fecha_pesado, peso_bruto, observaciones)
                  VALUES (:lote, :fecha, :bruto, :obs)";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':lote', $data->lote_id, PDO::PARAM_INT);
        $stmt->bindParam(':fecha', $data->fecha_pesado);
        $stmt->bindParam(':bruto', $pesoBruto);
        $obs = $data->observaciones ?? '';
        $stmt->bindParam(':obs', $obs);

        if (!$stmt->execute()) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error al registrar peso (cabecera)"]);
            return;
        }

        $pesoLoteId = (int)$this->conn->lastInsertId();

        if (!$this->saveDetalles($pesoLoteId, $data->detalles ?? [])) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error al registrar detalle de pesos"]);
            return;
        }

        $this->syncKardexFromPesos($data->lote_id);

        http_response_code(201);
        echo json_encode([
            "success" => true,
            "message" => "Peso registrado correctamente",
            "id"      => $pesoLoteId
        ]);
    }

    // PUT /pesos-lote/{id}
    public function update($id) {
        $data = json_decode(file_get_contents("php://input"));

        // Obtener lote anterior
        $queryPrev = "SELECT lote_id FROM " . $this->table . " WHERE id = :id";
        $stmtPrev = $this->conn->prepare($queryPrev);
        $stmtPrev->bindParam(':id', $id, PDO::PARAM_INT);
        $stmtPrev->execute();
        $prevRow = $stmtPrev->fetch(PDO::FETCH_ASSOC);

        if (!$prevRow) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Registro de peso no encontrado"]);
            return;
        }

        $loteAnterior = (int)$prevRow['lote_id'];

        if (!$this->validatePesosInput($data)) {
            return;
        }

        $pesoBruto = (float)$data->peso_bruto;

        $query = "UPDATE " . $this->table . " SET
                  lote_id = :lote,
                  fecha_pesado = :fecha,
                  peso_bruto = :bruto,
                  observaciones = :obs
                  WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->bindParam(':lote', $data->lote_id, PDO::PARAM_INT);
        $stmt->bindParam(':fecha', $data->fecha_pesado);
        $stmt->bindParam(':bruto', $pesoBruto);
        $obs = $data->observaciones ?? '';
        $stmt->bindParam(':obs', $obs);

        if (!$stmt->execute()) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error al actualizar peso (cabecera)"]);
            return;
        }

        // Borrar detalles anteriores (no dependemos de ON DELETE CASCADE aquí)
        $delDet = "DELETE FROM " . $this->detalleTable . " WHERE peso_lote_id = :pid";
        $stmtDel = $this->conn->prepare($delDet);
        $stmtDel->bindParam(':pid', $id, PDO::PARAM_INT);
        $stmtDel->execute();

        if (!$this->saveDetalles($id, $data->detalles ?? [])) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error al actualizar detalle de pesos"]);
            return;
        }

        if ($loteAnterior !== (int)$data->lote_id) {
            $this->syncKardexFromPesos($loteAnterior);
        }
        $this->syncKardexFromPesos($data->lote_id);

        echo json_encode(["success" => true, "message" => "Peso actualizado"]);
    }

    // DELETE /pesos-lote/{id}
    public function delete($id) {
        $queryPrev = "SELECT lote_id FROM " . $this->table . " WHERE id = :id";
        $stmtPrev = $this->conn->prepare($queryPrev);
        $stmtPrev->bindParam(':id', $id, PDO::PARAM_INT);
        $stmtPrev->execute();
        $prevRow = $stmtPrev->fetch(PDO::FETCH_ASSOC);

        if (!$prevRow) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Registro de peso no encontrado"]);
            return;
        }

        $loteId = (int)$prevRow['lote_id'];

        // Borramos detalles explícitamente (tu tabla no tiene FK con ON DELETE CASCADE)
        $delDet = "DELETE FROM " . $this->detalleTable . " WHERE peso_lote_id = :id";
        $stmtDet = $this->conn->prepare($delDet);
        $stmtDet->bindParam(':id', $id, PDO::PARAM_INT);
        $stmtDet->execute();

        $query = "DELETE FROM " . $this->table . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);

        if ($stmt->execute()) {
            $this->syncKardexFromPesos($loteId);
            echo json_encode(["success" => true, "message" => "Peso eliminado"]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error al eliminar peso"]);
        }
    }

    private function saveDetalles($pesoLoteId, $detalles) {
        if (!is_array($detalles)) return true; // nada que guardar

        $queryDet = "INSERT INTO " . $this->detalleTable . "
                     (peso_lote_id, categoria_id, peso)
                     VALUES (:pid, :cat, :peso)";
        $stmtDet = $this->conn->prepare($queryDet);

        foreach ($detalles as $det) {
            $categoriaId = (int)($det->categoria_id ?? $det['categoria_id'] ?? 0);
            $peso        = (float)($det->peso ?? $det['peso'] ?? 0);

            if ($categoriaId <= 0 || $peso < 0) {
                continue;
            }

            $stmtDet->bindParam(':pid', $pesoLoteId, PDO::PARAM_INT);
            $stmtDet->bindParam(':cat', $categoriaId, PDO::PARAM_INT);
            $stmtDet->bindParam(':peso', $peso);

            if (!$stmtDet->execute()) {
                return false;
            }
        }

        return true;
    }

    /* -----------------------------
     *   VALIDACIÓN
     * ----------------------------- */

    private function validatePesosInput($data) {
        if (!$data || !isset($data->lote_id) || !isset($data->fecha_pesado)) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "error" => "Datos incompletos (lote_id o fecha_pesado faltan)"
            ]);
            return false;
        }

        if (!isset($data->detalles) || !is_array($data->detalles)) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "error" => "Debe enviar el arreglo 'detalles' con las categorías y pesos"
            ]);
            return false;
        }

        $sumaCategorias = 0;
        foreach ($data->detalles as $det) {
            $peso = (float)($det->peso ?? 0);
            if ($peso < 0) $peso = 0;
            $sumaCategorias += $peso;
        }

        if ($sumaCategorias <= 0) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "error" => "Debe ingresar al menos un peso en alguna categoría"
            ]);
            return false;
        }

        // Si no mandan peso_bruto o es <= 0, lo igualamos a la suma de categorías
        if (!isset($data->peso_bruto) || (float)$data->peso_bruto <= 0) {
            $data->peso_bruto = $sumaCategorias;
        }

        $bruto = (float)$data->peso_bruto;

        // Si la suma de categorías es mayor al bruto, ajustamos el bruto a la suma
        if ($sumaCategorias > $bruto) {
            $data->peso_bruto = $sumaCategorias;
        }

        return true;
    }

    /* -----------------------------
     *   KARDEX DINÁMICO
     * ----------------------------- */

    private function syncKardexFromPesos($loteId) {
        // 1) Saldos base (movimientos que NO son 'Registro de peso')
        $queryBase = "SELECT categoria,
                             SUM(CASE WHEN tipo_movimiento = 'ingreso'
                                      THEN peso ELSE -peso END) AS saldo
                      FROM kardex_lotes
                      WHERE lote_id = :lote
                        AND (referencia IS NULL OR referencia <> 'Registro de peso')
                      GROUP BY categoria";
        $stmtBase = $this->conn->prepare($queryBase);
        $stmtBase->bindParam(':lote', $loteId, PDO::PARAM_INT);
        $stmtBase->execute();

        $saldos = [];
        while ($row = $stmtBase->fetch(PDO::FETCH_ASSOC)) {
            $cat = $row['categoria'];
            $saldos[$cat] = (float)$row['saldo'];
        }

        // 2) Borrar movimientos generados por pesajes
        $del = "DELETE FROM kardex_lotes
                WHERE lote_id = :lote AND referencia = 'Registro de peso'";
        $stmtDel = $this->conn->prepare($del);
        $stmtDel->bindParam(':lote', $loteId, PDO::PARAM_INT);
        $stmtDel->execute();

        // 3) Obtener pesajes del lote
        $queryPesos = "SELECT id, fecha_pesado
                       FROM " . $this->table . "
                       WHERE lote_id = :lote
                       ORDER BY fecha_pesado ASC, id ASC";
        $stmtPesos = $this->conn->prepare($queryPesos);
        $stmtPesos->bindParam(':lote', $loteId, PDO::PARAM_INT);
        $stmtPesos->execute();
        $pesajes = $stmtPesos->fetchAll(PDO::FETCH_ASSOC);

        if (!$pesajes) {
            return;
        }

        // 4) Obtener todos los detalles de esos pesajes
        $ids = array_column($pesajes, 'id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $queryDet = "SELECT d.peso_lote_id, d.peso, c.codigo
                     FROM " . $this->detalleTable . " d
                     JOIN categorias_peso c ON d.categoria_id = c.id
                     WHERE d.peso_lote_id IN ($placeholders)";
        $stmtDet = $this->conn->prepare($queryDet);
        foreach ($ids as $i => $id) {
            $stmtDet->bindValue($i + 1, $id, PDO::PARAM_INT);
        }
        $stmtDet->execute();
        $rowsDet = $stmtDet->fetchAll(PDO::FETCH_ASSOC);

        // Agrupar: pesos[ id_peso ][ codigo_categoria ] = sumaPeso
        $pesosPorPesaje = [];
        foreach ($rowsDet as $r) {
            $pid  = (int)$r['peso_lote_id'];
            $cod  = $r['codigo'];
            $peso = (float)$r['peso'];

            if (!isset($pesosPorPesaje[$pid])) {
                $pesosPorPesaje[$pid] = [];
            }
            if (!isset($pesosPorPesaje[$pid][$cod])) {
                $pesosPorPesaje[$pid][$cod] = 0.0;
            }
            $pesosPorPesaje[$pid][$cod] += $peso;
        }

        // valores previos para detectar delta
        $prevPorCategoria = [];

        // 5) Recorrer pesajes en orden y generar movimientos
        foreach ($pesajes as $p) {
            $pid   = (int)$p['id'];
            $fecha = $p['fecha_pesado'];

            $current = $pesosPorPesaje[$pid] ?? [];

            // Asegurar categorías previas
            foreach ($current as $cat => $pesoCat) {
                if (!isset($prevPorCategoria[$cat])) {
                    $prevPorCategoria[$cat] = 0.0;
                }
            }

            foreach ($current as $cat => $pesoCat) {
                $prev = $prevPorCategoria[$cat] ?? 0.0;
                $diff = $pesoCat - $prev;

                if (abs($diff) > 0.0001) {
                    $this->insertKardexDelta($loteId, $cat, $diff, $fecha, $saldos);
                }

                $prevPorCategoria[$cat] = $pesoCat;
            }
        }
    }

    private function insertKardexDelta($loteId, $categoria, $delta, $fecha, &$saldos) {
        $tipo = $delta > 0 ? 'ingreso' : 'salida';
        $peso = abs($delta);

        $saldoAnterior = $saldos[$categoria] ?? 0.0;
        $nuevoSaldo = $tipo === 'ingreso'
            ? $saldoAnterior + $peso
            : $saldoAnterior - $peso;

        $saldos[$categoria] = $nuevoSaldo;

        $query = "INSERT INTO kardex_lotes
                  (lote_id, tipo_movimiento, categoria, peso, fecha_movimiento, saldo_categoria, referencia)
                  VALUES (:lote, :tipo, :cat, :peso, :fecha, :saldo, :ref)";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':lote', $loteId, PDO::PARAM_INT);
        $stmt->bindParam(':tipo', $tipo);
        $stmt->bindParam(':cat', $categoria);
        $stmt->bindParam(':peso', $peso);
        $stmt->bindParam(':fecha', $fecha);
        $stmt->bindParam(':saldo', $nuevoSaldo);
        $ref = "Registro de peso";
        $stmt->bindParam(':ref', $ref);
        $stmt->execute();
    }
}
