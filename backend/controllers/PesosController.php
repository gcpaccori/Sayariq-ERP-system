<?php
class PesosController {
    private $conn;
    private $table = "pesos_lote";

    private $categorias = [
        'exportable', 'industrial', 'descarte', 'nacional', 'jugo',
        'primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'dedos'
    ];

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

    public function getCategorias() {
        $query = "SELECT * FROM categorias_peso WHERE estado = 'activo' ORDER BY orden";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $result]);
    }

    public function getAll() {
        $query = "SELECT p.*, l.numero_lote, l.producto
                  FROM " . $this->table . " p
                  LEFT JOIN lotes l ON p.lote_id = l.id
                  ORDER BY p.fecha_pesado DESC, p.id DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function getOne($id) {
        $query = "SELECT * FROM " . $this->table . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function getPorLote($loteId) {
        $query = "SELECT * FROM " . $this->table . " 
                  WHERE lote_id = :lote_id 
                  ORDER BY fecha_pesado DESC, id DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':lote_id', $loteId, PDO::PARAM_INT);
        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($result);
    }

    public function create() {
        $data = json_decode(file_get_contents("php://input"));

        if (!$this->validatePesosInput($data)) {
            return;
        }

        // Construir query dinámico con todas las categorías
        $query = "INSERT INTO " . $this->table . " 
                  (lote_id, fecha_pesado, peso_bruto, peso_exportable, 
                   peso_industrial, peso_descarte, peso_nacional, peso_jugo,
                   peso_primera, peso_segunda, peso_tercera, peso_cuarta, 
                   peso_quinta, peso_dedos, observaciones) 
                  VALUES (:lote, :fecha, :bruto, :exportable, 
                          :industrial, :descarte, :nacional, :jugo,
                          :primera, :segunda, :tercera, :cuarta,
                          :quinta, :dedos, :obs)";
        
        $stmt = $this->conn->prepare($query);
        
        // Bind todos los parámetros
        $stmt->bindParam(':lote', $data->lote_id, PDO::PARAM_INT);
        $stmt->bindParam(':fecha', $data->fecha_pesado);
        $stmt->bindParam(':bruto', $data->peso_bruto);
        $stmt->bindParam(':exportable', $data->peso_exportable);
        $stmt->bindParam(':industrial', $data->peso_industrial);
        $stmt->bindParam(':descarte', $data->peso_descarte);
        
        // Nuevas categorías (pueden no existir en el request)
        $nacional = $data->peso_nacional ?? 0;
        $jugo = $data->peso_jugo ?? 0;
        $primera = $data->peso_primera ?? 0;
        $segunda = $data->peso_segunda ?? 0;
        $tercera = $data->peso_tercera ?? 0;
        $cuarta = $data->peso_cuarta ?? 0;
        $quinta = $data->peso_quinta ?? 0;
        $dedos = $data->peso_dedos ?? 0;
        $obs = $data->observaciones ?? '';
        
        $stmt->bindParam(':nacional', $nacional);
        $stmt->bindParam(':jugo', $jugo);
        $stmt->bindParam(':primera', $primera);
        $stmt->bindParam(':segunda', $segunda);
        $stmt->bindParam(':tercera', $tercera);
        $stmt->bindParam(':cuarta', $cuarta);
        $stmt->bindParam(':quinta', $quinta);
        $stmt->bindParam(':dedos', $dedos);
        $stmt->bindParam(':obs', $obs);

        if($stmt->execute()) {
            $insertId = $this->conn->lastInsertId();
            
            $this->syncKardexFromPesos($data->lote_id);

            http_response_code(201);
            echo json_encode([
                "success" => true,
                "message" => "Peso registrado correctamente",
                "id" => $insertId
            ]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error al registrar peso"]);
        }
    }

    public function update($id) {
        $data = json_decode(file_get_contents("php://input"));

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

        $query = "UPDATE " . $this->table . " SET 
                  lote_id = :lote,
                  fecha_pesado = :fecha,
                  peso_bruto = :bruto,
                  peso_exportable = :exportable,
                  peso_industrial = :industrial,
                  peso_descarte = :descarte,
                  peso_nacional = :nacional,
                  peso_jugo = :jugo,
                  peso_primera = :primera,
                  peso_segunda = :segunda,
                  peso_tercera = :tercera,
                  peso_cuarta = :cuarta,
                  peso_quinta = :quinta,
                  peso_dedos = :dedos,
                  observaciones = :obs
                  WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->bindParam(':lote', $data->lote_id, PDO::PARAM_INT);
        $stmt->bindParam(':fecha', $data->fecha_pesado);
        $stmt->bindParam(':bruto', $data->peso_bruto);
        $stmt->bindParam(':exportable', $data->peso_exportable);
        $stmt->bindParam(':industrial', $data->peso_industrial);
        $stmt->bindParam(':descarte', $data->peso_descarte);
        
        $nacional = $data->peso_nacional ?? 0;
        $jugo = $data->peso_jugo ?? 0;
        $primera = $data->peso_primera ?? 0;
        $segunda = $data->peso_segunda ?? 0;
        $tercera = $data->peso_tercera ?? 0;
        $cuarta = $data->peso_cuarta ?? 0;
        $quinta = $data->peso_quinta ?? 0;
        $dedos = $data->peso_dedos ?? 0;
        $obs = $data->observaciones ?? '';
        
        $stmt->bindParam(':nacional', $nacional);
        $stmt->bindParam(':jugo', $jugo);
        $stmt->bindParam(':primera', $primera);
        $stmt->bindParam(':segunda', $segunda);
        $stmt->bindParam(':tercera', $tercera);
        $stmt->bindParam(':cuarta', $cuarta);
        $stmt->bindParam(':quinta', $quinta);
        $stmt->bindParam(':dedos', $dedos);
        $stmt->bindParam(':obs', $obs);

        if($stmt->execute()) {
            if ($loteAnterior !== (int)$data->lote_id) {
                $this->syncKardexFromPesos($loteAnterior);
            }
            $this->syncKardexFromPesos($data->lote_id);

            echo json_encode(["success" => true, "message" => "Peso actualizado"]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error al actualizar peso"]);
        }
    }

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

        $query = "DELETE FROM " . $this->table . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        
        if($stmt->execute()) {
            $this->syncKardexFromPesos($loteId);
            echo json_encode(["success" => true, "message" => "Peso eliminado"]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error al eliminar peso"]);
        }
    }

    private function validatePesosInput($data) {
        if (!$data || !isset($data->lote_id) || !isset($data->fecha_pesado)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Datos incompletos (lote_id o fecha_pesado faltan)"]);
            return false;
        }

        // Calcular suma de TODAS las categorías
        $exp = (float)($data->peso_exportable ?? 0);
        $ind = (float)($data->peso_industrial ?? 0);
        $desc = (float)($data->peso_descarte ?? 0);
        $nac = (float)($data->peso_nacional ?? 0);
        $jugo = (float)($data->peso_jugo ?? 0);
        $primera = (float)($data->peso_primera ?? 0);
        $segunda = (float)($data->peso_segunda ?? 0);
        $tercera = (float)($data->peso_tercera ?? 0);
        $cuarta = (float)($data->peso_cuarta ?? 0);
        $quinta = (float)($data->peso_quinta ?? 0);
        $dedos = (float)($data->peso_dedos ?? 0);

        $sumaCategorias = $exp + $ind + $desc + $nac + $jugo + 
                          $primera + $segunda + $tercera + $cuarta + $quinta + $dedos;

        // Si no se provee peso_bruto, calcularlo automáticamente
        if (!isset($data->peso_bruto) || (float)$data->peso_bruto <= 0) {
            $data->peso_bruto = $sumaCategorias;
        }

        $bruto = (float)$data->peso_bruto;

        if ($bruto <= 0 && $sumaCategorias <= 0) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Debe ingresar al menos un peso en alguna categoría"]);
            return false;
        }

        // Usar el mayor valor entre bruto y suma de categorías
        if ($sumaCategorias > $bruto) {
            $data->peso_bruto = $sumaCategorias;
        }

        return true;
    }

    private function syncKardexFromPesos($loteId) {
        // 1) Obtener saldo base por categoría (movimientos que NO son de 'Registro de peso')
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
        
        // Inicializar saldos para TODAS las categorías
        $baseSaldos = [];
        foreach ($this->categorias as $cat) {
            $baseSaldos[$cat] = 0.0;
        }
        
        while ($row = $stmtBase->fetch(PDO::FETCH_ASSOC)) {
            $cat = $row['categoria'];
            $baseSaldos[$cat] = (float)$row['saldo'];
        }

        // 2) Borrar movimientos anteriores generados por pesajes
        $del = "DELETE FROM kardex_lotes 
                WHERE lote_id = :lote AND referencia = 'Registro de peso'";
        $stmtDel = $this->conn->prepare($del);
        $stmtDel->bindParam(':lote', $loteId, PDO::PARAM_INT);
        $stmtDel->execute();

        // 3) Obtener todos los pesajes del lote ordenados (con TODAS las categorías)
        $queryPesos = "SELECT id, fecha_pesado, 
                              peso_exportable, peso_industrial, peso_descarte,
                              COALESCE(peso_nacional, 0) as peso_nacional,
                              COALESCE(peso_jugo, 0) as peso_jugo,
                              COALESCE(peso_primera, 0) as peso_primera,
                              COALESCE(peso_segunda, 0) as peso_segunda,
                              COALESCE(peso_tercera, 0) as peso_tercera,
                              COALESCE(peso_cuarta, 0) as peso_cuarta,
                              COALESCE(peso_quinta, 0) as peso_quinta,
                              COALESCE(peso_dedos, 0) as peso_dedos
                       FROM pesos_lote
                       WHERE lote_id = :lote
                       ORDER BY fecha_pesado ASC, id ASC";
        $stmtPesos = $this->conn->prepare($queryPesos);
        $stmtPesos->bindParam(':lote', $loteId, PDO::PARAM_INT);
        $stmtPesos->execute();
        $pesajes = $stmtPesos->fetchAll(PDO::FETCH_ASSOC);

        if (!$pesajes) {
            return;
        }

        // 4) Recorrer pesajes y generar movimientos de kardex
        $prevPesos = [];
        foreach ($this->categorias as $cat) {
            $prevPesos[$cat] = 0.0;
        }

        foreach ($pesajes as $p) {
            $fecha = $p['fecha_pesado'];
            
            // Mapeo de campos a categorías
            $currentPesos = [
                'exportable' => (float)$p['peso_exportable'],
                'industrial' => (float)$p['peso_industrial'],
                'descarte' => (float)$p['peso_descarte'],
                'nacional' => (float)$p['peso_nacional'],
                'jugo' => (float)$p['peso_jugo'],
                'primera' => (float)$p['peso_primera'],
                'segunda' => (float)$p['peso_segunda'],
                'tercera' => (float)$p['peso_tercera'],
                'cuarta' => (float)$p['peso_cuarta'],
                'quinta' => (float)$p['peso_quinta'],
                'dedos' => (float)$p['peso_dedos']
            ];

            foreach ($this->categorias as $cat) {
                $diff = $currentPesos[$cat] - $prevPesos[$cat];
                if (abs($diff) > 0.0001) {
                    $this->insertKardexDelta($loteId, $cat, $diff, $fecha, $baseSaldos);
                }
                $prevPesos[$cat] = $currentPesos[$cat];
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
