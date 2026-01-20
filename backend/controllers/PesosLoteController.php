<?php
class PesosLoteController {
    private $conn;
    private $table = "pesos_lote";
    private $detalleTable = "pesos_lote_detalle";

    // nombres "canónicos" de categorías (deben coincidir con el ENUM de kardex_lotes.categoria)
    private $canonicas = [
        'exportable','industrial','descarte','nacional','jugo',
        'primera','segunda','tercera','cuarta','quinta','dedos'
    ];

    // mapa de abreviaturas -> nombre canónico (por si algún día las usas en el frontend)
    private $mapAbreviaturas = [
        'EXP' => 'exportable',
        'IND' => 'industrial',
        'DES' => 'descarte',
        'NAC' => 'nacional',
        'JUG' => 'jugo',
        'PRI' => 'primera',
        'SEG' => 'segunda',
        'TER' => 'tercera',
        'CUA' => 'cuarta',
        'QUI' => 'quinta',
        'DED' => 'dedos',
    ];

    // cache para no consultar categorias_peso a cada rato
    private $cacheCategorias = [];

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest($method, $id, $action) {
        switch($method) {
            case 'GET':
                if ($action === 'categorias') {
                    // /pesos-lote/categorias
                    $this->getCategorias();
                } else if ($action === 'estadisticas' || $id === 'estadisticas') {
                    // /pesos-lote/estadisticas
                    $this->getEstadisticas();
                } else if ($action === 'resumen-lote' && $id && is_numeric($id)) {
                    // /pesos-lote/{lote_id}/resumen-lote
                    $this->getResumenPorLote($id);
                } else if ($id && is_numeric($id) && !$action) {
                    // /pesos-lote/{id}
                    $this->getById($id);
                } else if (!$id && !$action) {
                    // /pesos-lote
                    $this->getAll();
                } else {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "Ruta no válida"]);
                }
                break;

            case 'POST':
                $this->create();
                break;

            case 'PUT':
                if ($id && is_numeric($id)) {
                    $this->update($id);
                } else {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "ID requerido para actualizar"]);
                }
                break;

            case 'DELETE':
                if ($id && is_numeric($id)) {
                    $this->delete($id);
                } else {
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "ID requerido para eliminar"]);
                }
                break;

            default:
                http_response_code(405);
                echo json_encode(["success" => false, "message" => "Método no permitido"]);
                break;
        }
    }

    /* =========================================================
     *   CATEGORÍAS (para el grid dinámico del frontend)
     * ========================================================= */
    public function getCategorias() {
        try {
            $sql = "SELECT id, codigo, nombre, precio_kg, es_liquidable, orden
                    FROM categorias_peso
                    WHERE estado = 'activo'
                    ORDER BY orden, id";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $rows
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error al obtener categorías: ' . $e->getMessage()
            ]);
        }
    }

    /* =========================================================
     *   LISTADOS / CONSULTAS
     * ========================================================= */

    // GET /pesos-lote
    public function getAll() {
        try {
            $query = "SELECT 
                        pl.id,
                        pl.lote_id,
                        pl.fecha_pesado,
                        pl.peso_bruto,
                        pl.peso_exportable,
                        pl.peso_industrial,
                        pl.peso_descarte,
                        pl.peso_nacional,
                        pl.peso_jugo,
                        pl.peso_primera,
                        pl.peso_segunda,
                        pl.peso_tercera,
                        pl.peso_cuarta,
                        pl.peso_quinta,
                        pl.peso_dedos,
                        pl.observaciones,
                        pl.created_at,
                        l.numero_lote,
                        l.producto,
                        l.guia_ingreso,
                        l.fecha_ingreso,
                        l.estado as lote_estado,
                        l.estado_frescura,
                        p.nombre_completo as productor_nombre,
                        p.documento_identidad as productor_dni,
                        (
                            pl.peso_exportable + pl.peso_industrial + pl.peso_descarte +
                            pl.peso_nacional + pl.peso_jugo +
                            pl.peso_primera + pl.peso_segunda + pl.peso_tercera +
                            pl.peso_cuarta + pl.peso_quinta + pl.peso_dedos
                        ) as peso_total_clasificado,
                        ROUND((pl.peso_exportable / NULLIF(pl.peso_bruto, 0) * 100), 2) as porcentaje_exportable,
                        ROUND((pl.peso_industrial / NULLIF(pl.peso_bruto, 0) * 100), 2) as porcentaje_industrial,
                        ROUND((pl.peso_descarte / NULLIF(pl.peso_bruto, 0) * 100), 2) as porcentaje_descarte,
                        ROUND((
                            (pl.peso_exportable + pl.peso_industrial + pl.peso_descarte) /
                            NULLIF(pl.peso_bruto, 0) * 100
                        ), 2) as eficiencia_clasificacion
                      FROM {$this->table} pl
                      INNER JOIN lotes l ON pl.lote_id = l.id
                      INNER JOIN personas p ON l.productor_id = p.id
                      ORDER BY pl.fecha_pesado DESC, pl.created_at DESC";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            $pesos = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (!$pesos) {
                echo json_encode([
                    'success' => true,
                    'data' => [],
                    'total' => 0
                ]);
                return;
            }

            // Agregar detalles por pesaje
            $ids = array_column($pesos, 'id');
            $placeholders = implode(',', array_fill(0, count($ids), '?'));

            $qDet = "SELECT d.*, c.codigo, c.nombre
                     FROM {$this->detalleTable} d
                     JOIN categorias_peso c ON d.categoria_id = c.id
                     WHERE d.peso_lote_id IN ($placeholders)
                     ORDER BY d.peso_lote_id, c.orden, c.id";
            $stmtDet = $this->conn->prepare($qDet);
            foreach ($ids as $i => $pid) {
                $stmtDet->bindValue($i+1, $pid, PDO::PARAM_INT);
            }
            $stmtDet->execute();
            $detRows = $stmtDet->fetchAll(PDO::FETCH_ASSOC);

            $byPeso = [];
            foreach ($detRows as $r) {
                $pid = (int)$r['peso_lote_id'];
                if (!isset($byPeso[$pid])) $byPeso[$pid] = [];
                $byPeso[$pid][] = [
                    'id'           => (int)$r['id'],
                    'categoria_id' => (int)$r['categoria_id'],
                    'codigo'       => $r['codigo'],
                    'nombre'       => $r['nombre'],
                    'peso'         => (float)$r['peso'],
                ];
            }

            foreach ($pesos as &$p) {
                $pid = (int)$p['id'];
                $p['detalles'] = $byPeso[$pid] ?? [];
            }

            echo json_encode([
                'success' => true,
                'data' => $pesos,
                'total' => count($pesos)
            ]);
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error al obtener registros: ' . $e->getMessage()
            ]);
        }
    }

    // GET /pesos-lote/{id}
    public function getById($id) {
        try {
            $query = "SELECT 
                        pl.*,
                        l.numero_lote,
                        l.producto,
                        l.guia_ingreso,
                        l.peso_inicial as lote_peso_inicial,
                        l.peso_neto as lote_peso_neto,
                        l.fecha_ingreso,
                        l.estado as lote_estado,
                        p.nombre_completo as productor_nombre,
                        p.documento_identidad as productor_dni
                      FROM {$this->table} pl
                      INNER JOIN lotes l ON pl.lote_id = l.id
                      INNER JOIN personas p ON l.productor_id = p.id
                      WHERE pl.id = :id";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            $peso = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$peso) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Registro no encontrado']);
                return;
            }

            // Detalles
            $qDet = "SELECT d.*, c.codigo, c.nombre
                     FROM {$this->detalleTable} d
                     JOIN categorias_peso c ON d.categoria_id = c.id
                     WHERE d.peso_lote_id = :pid
                     ORDER BY c.orden, c.id";
            $stmtDet = $this->conn->prepare($qDet);
            $stmtDet->bindParam(':pid', $id, PDO::PARAM_INT);
            $stmtDet->execute();
            $detRows = $stmtDet->fetchAll(PDO::FETCH_ASSOC);

            $peso['detalles'] = array_map(function($r) {
                return [
                    'id'           => (int)$r['id'],
                    'categoria_id' => (int)$r['categoria_id'],
                    'codigo'       => $r['codigo'],
                    'nombre'       => $r['nombre'],
                    'peso'         => (float)$r['peso'],
                ];
            }, $detRows);

            echo json_encode(['success' => true, 'data' => $peso]);
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error al obtener registro: ' . $e->getMessage()
            ]);
        }
    }

    // GET /pesos-lote/estadisticas
    public function getEstadisticas() {
        try {
            $query = "SELECT 
                        COUNT(DISTINCT pl.lote_id) as total_lotes_pesados,
                        COUNT(pl.id) as total_registros_peso,
                        COALESCE(SUM(pl.peso_bruto), 0) as peso_bruto_total,
                        COALESCE(SUM(pl.peso_exportable), 0) as peso_exportable_total,
                        COALESCE(SUM(pl.peso_industrial), 0) as peso_industrial_total,
                        COALESCE(SUM(pl.peso_descarte), 0) as peso_descarte_total,
                        COALESCE(AVG(pl.peso_bruto), 0) as peso_bruto_promedio,
                        ROUND(COALESCE(AVG(pl.peso_exportable / NULLIF(pl.peso_bruto, 0) * 100), 0), 2) as porcentaje_exportable_promedio,
                        ROUND(COALESCE(AVG(pl.peso_industrial / NULLIF(pl.peso_bruto, 0) * 100), 0), 2) as porcentaje_industrial_promedio,
                        ROUND(COALESCE(AVG(pl.peso_descarte / NULLIF(pl.peso_bruto, 0) * 100), 0), 2) as porcentaje_descarte_promedio
                      FROM {$this->table} pl";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            $estadisticas = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Distribución por producto
            $queryProductos = "SELECT 
                                l.producto,
                                COUNT(pl.id) as cantidad_pesadas,
                                COALESCE(SUM(pl.peso_bruto), 0) as peso_total,
                                ROUND(COALESCE(AVG(pl.peso_exportable / NULLIF(pl.peso_bruto, 0) * 100), 0), 2) as porcentaje_exportable_promedio
                              FROM {$this->table} pl
                              INNER JOIN lotes l ON pl.lote_id = l.id
                              GROUP BY l.producto
                              ORDER BY peso_total DESC";
            
            $stmtProductos = $this->conn->prepare($queryProductos);
            $stmtProductos->execute();
            $porProducto = $stmtProductos->fetchAll(PDO::FETCH_ASSOC);
            
            // Tendencia mensual
            $queryTendencia = "SELECT 
                                DATE_FORMAT(pl.fecha_pesado, '%Y-%m') as mes,
                                COUNT(pl.id) as cantidad_registros,
                                COALESCE(SUM(pl.peso_bruto), 0) as peso_total,
                                ROUND(COALESCE(AVG(pl.peso_exportable / NULLIF(pl.peso_bruto, 0) * 100), 0), 2) as eficiencia_promedio
                              FROM {$this->table} pl
                              GROUP BY DATE_FORMAT(pl.fecha_pesado, '%Y-%m')
                              ORDER BY mes DESC
                              LIMIT 6";
            
            $stmtTendencia = $this->conn->prepare($queryTendencia);
            $stmtTendencia->execute();
            $tendencia = $stmtTendencia->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'data' => [
                    'general' => $estadisticas,
                    'por_producto' => $porProducto,
                    'tendencia_mensual' => $tendencia
                ]
            ]);
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error al obtener estadísticas: ' . $e->getMessage()
            ]);
        }
    }

    // GET /pesos-lote/{lote_id}/resumen-lote
    public function getResumenPorLote($loteId) {
        try {
            $query = "SELECT 
                        l.id as lote_id,
                        l.numero_lote,
                        l.producto,
                        l.peso_inicial,
                        l.peso_neto,
                        p.nombre_completo as productor_nombre,
                        COUNT(pl.id) as total_pesadas,
                        COALESCE(SUM(pl.peso_bruto), 0) as peso_bruto_acumulado,
                        COALESCE(SUM(pl.peso_exportable), 0) as peso_exportable_acumulado,
                        COALESCE(SUM(pl.peso_industrial), 0) as peso_industrial_acumulado,
                        COALESCE(SUM(pl.peso_descarte), 0) as peso_descarte_acumulado,
                        MIN(pl.fecha_pesado) as primera_pesada,
                        MAX(pl.fecha_pesado) as ultima_pesada
                      FROM lotes l
                      INNER JOIN personas p ON l.productor_id = p.id
                      LEFT JOIN {$this->table} pl ON l.id = pl.lote_id
                      WHERE l.id = :lote_id
                      GROUP BY l.id";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':lote_id', $loteId, PDO::PARAM_INT);
            $stmt->execute();
            $resumen = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Historial
            $queryHistorial = "SELECT * FROM {$this->table}
                               WHERE lote_id = :lote_id
                               ORDER BY fecha_pesado DESC, created_at DESC";
            
            $stmtHistorial = $this->conn->prepare($queryHistorial);
            $stmtHistorial->bindParam(':lote_id', $loteId, PDO::PARAM_INT);
            $stmtHistorial->execute();
            $historial = $stmtHistorial->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'data' => [
                    'resumen' => $resumen,
                    'historial' => $historial
                ]
            ]);
        } catch(PDOException $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error al obtener resumen: ' . $e->getMessage()
            ]);
        }
    }

    /* =========================================================
     *   CREATE
     * ========================================================= */

    // POST /pesos-lote
    public function create() {
        try {
            $data = json_decode(file_get_contents("php://input"), true);

            if (!isset($data['lote_id'], $data['fecha_pesado'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Datos incompletos: lote_id y fecha_pesado son requeridos']);
                return;
            }

            // Validar lote
            $qLote = "SELECT id FROM lotes WHERE id = :lote_id";
            $stmtLote = $this->conn->prepare($qLote);
            $stmtLote->bindParam(':lote_id', $data['lote_id'], PDO::PARAM_INT);
            $stmtLote->execute();
            if ($stmtLote->rowCount() === 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'El lote especificado no existe']);
                return;
            }

            $detalles = isset($data['detalles']) && is_array($data['detalles']) ? $data['detalles'] : [];
            $detallesNorm = $this->normalizarDetalles($detalles);

            // Si no mandan detalles pero sí columnas legacy, construimos detalles desde cabecera
            if (empty($detallesNorm)) {
                $detallesNorm = $this->buildDetallesDesdeCabecera($data);
            }

            if (empty($detallesNorm)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Debe registrar al menos un peso por categoría']);
                return;
            }

            // Acumular por categoría canónica
            $sumaPorCat = [];
            $totalCategorias = 0.0;
            foreach ($detallesNorm as $d) {
                $cat = $d['canonico'];
                $peso = $d['peso'];
                if (!isset($sumaPorCat[$cat])) $sumaPorCat[$cat] = 0.0;
                $sumaPorCat[$cat] += $peso;
                $totalCategorias += $peso;
            }

            // Peso bruto
            $pesoBruto = isset($data['peso_bruto']) ? floatval($data['peso_bruto']) : 0.0;
            if ($pesoBruto <= 0) {
                $pesoBruto = $totalCategorias;
            }

            // Campos legacy por categoría
            $pe = $sumaPorCat['exportable'] ?? 0;
            $pi = $sumaPorCat['industrial'] ?? 0;
            $pd = $sumaPorCat['descarte'] ?? 0;
            $pn = $sumaPorCat['nacional'] ?? 0;
            $pj = $sumaPorCat['jugo'] ?? 0;
            $p1 = $sumaPorCat['primera'] ?? 0;
            $p2 = $sumaPorCat['segunda'] ?? 0;
            $p3 = $sumaPorCat['tercera'] ?? 0;
            $p4 = $sumaPorCat['cuarta'] ?? 0;
            $p5 = $sumaPorCat['quinta'] ?? 0;
            $pded = $sumaPorCat['dedos'] ?? 0;

            $this->conn->beginTransaction();

            // Insert cabecera
            $query = "INSERT INTO {$this->table}
                      (lote_id, fecha_pesado, peso_bruto,
                       peso_exportable, peso_industrial, peso_descarte,
                       peso_nacional, peso_jugo,
                       peso_primera, peso_segunda, peso_tercera,
                       peso_cuarta, peso_quinta, peso_dedos,
                       observaciones)
                      VALUES
                      (:lote_id, :fecha_pesado, :peso_bruto,
                       :pe, :pi, :pd,
                       :pn, :pj,
                       :p1, :p2, :p3,
                       :p4, :p5, :pded,
                       :obs)";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':lote_id', $data['lote_id'], PDO::PARAM_INT);
            $stmt->bindParam(':fecha_pesado', $data['fecha_pesado']);
            $stmt->bindParam(':peso_bruto', $pesoBruto);
            $stmt->bindParam(':pe', $pe);
            $stmt->bindParam(':pi', $pi);
            $stmt->bindParam(':pd', $pd);
            $stmt->bindParam(':pn', $pn);
            $stmt->bindParam(':pj', $pj);
            $stmt->bindParam(':p1', $p1);
            $stmt->bindParam(':p2', $p2);
            $stmt->bindParam(':p3', $p3);
            $stmt->bindParam(':p4', $p4);
            $stmt->bindParam(':p5', $p5);
            $stmt->bindParam(':pded', $pded);
            $obs = $data['observaciones'] ?? null;
            $stmt->bindParam(':obs', $obs);
            $stmt->execute();

            $pesoLoteId = (int)$this->conn->lastInsertId();

            // Guardar detalles
            $this->saveDetalles($pesoLoteId, $detallesNorm);

            // Actualizar peso_neto del lote (suma de clasificados)
            $this->recalcularPesoNetoLote($data['lote_id']);

            // Registrar en kardex: un "ingreso" por cada detalle
            foreach ($detallesNorm as $d) {
                $this->registrarKardex(
                    $data['lote_id'],
                    'ingreso',
                    $d['canonico'],
                    $d['peso'],
                    $data['fecha_pesado'],
                    "Registro peso #{$pesoLoteId}"
                );
            }

            $this->conn->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Registro de peso creado exitosamente',
                'id' => $pesoLoteId
            ]);
        } catch(PDOException $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al crear el registro: ' . $e->getMessage()]);
        }
    }

    /* =========================================================
     *   UPDATE
     * ========================================================= */

    // PUT /pesos-lote/{id}
    public function update($id) {
        try {
            $data = json_decode(file_get_contents("php://input"), true);

            if (!isset($data['fecha_pesado'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
                return;
            }

            // Obtener cabecera y lote
            $qPrev = "SELECT lote_id FROM {$this->table} WHERE id = :id";
            $stmtPrev = $this->conn->prepare($qPrev);
            $stmtPrev->bindParam(':id', $id, PDO::PARAM_INT);
            $stmtPrev->execute();
            $prev = $stmtPrev->fetch(PDO::FETCH_ASSOC);

            if (!$prev) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Registro no encontrado']);
                return;
            }
            $loteId = (int)$prev['lote_id'];

            // Detalles actuales (para reversar en kardex)
            $qDetOld = "SELECT d.*, c.codigo, c.nombre
                        FROM {$this->detalleTable} d
                        JOIN categorias_peso c ON d.categoria_id = c.id
                        WHERE d.peso_lote_id = :pid";
            $stmtOld = $this->conn->prepare($qDetOld);
            $stmtOld->bindParam(':pid', $id, PDO::PARAM_INT);
            $stmtOld->execute();
            $oldRows = $stmtOld->fetchAll(PDO::FETCH_ASSOC);
            $oldDetNorm = [];
            foreach ($oldRows as $r) {
                $canonico = $this->obtenerNombreCanonico($r['codigo'], $r['nombre']);
                $oldDetNorm[] = [
                    'categoria_id' => (int)$r['categoria_id'],
                    'codigo'       => $r['codigo'],
                    'nombre'       => $r['nombre'],
                    'peso'         => (float)$r['peso'],
                    'canonico'     => $canonico
                ];
            }

            $detalles = isset($data['detalles']) && is_array($data['detalles']) ? $data['detalles'] : [];
            $detallesNorm = $this->normalizarDetalles($detalles);

            if (empty($detallesNorm)) {
                $detallesNorm = $this->buildDetallesDesdeCabecera($data);
            }

            if (empty($detallesNorm)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Debe registrar al menos un peso por categoría']);
                return;
            }

            // Acumular nuevas categorías
            $sumaPorCat = [];
            $totalCategorias = 0.0;
            foreach ($detallesNorm as $d) {
                $cat = $d['canonico'];
                $peso = $d['peso'];
                if (!isset($sumaPorCat[$cat])) $sumaPorCat[$cat] = 0.0;
                $sumaPorCat[$cat] += $peso;
                $totalCategorias += $peso;
            }

            $pesoBruto = isset($data['peso_bruto']) ? floatval($data['peso_bruto']) : 0.0;
            if ($pesoBruto <= 0) {
                $pesoBruto = $totalCategorias;
            }

            $pe = $sumaPorCat['exportable'] ?? 0;
            $pi = $sumaPorCat['industrial'] ?? 0;
            $pd = $sumaPorCat['descarte'] ?? 0;
            $pn = $sumaPorCat['nacional'] ?? 0;
            $pj = $sumaPorCat['jugo'] ?? 0;
            $p1 = $sumaPorCat['primera'] ?? 0;
            $p2 = $sumaPorCat['segunda'] ?? 0;
            $p3 = $sumaPorCat['tercera'] ?? 0;
            $p4 = $sumaPorCat['cuarta'] ?? 0;
            $p5 = $sumaPorCat['quinta'] ?? 0;
            $pded = $sumaPorCat['dedos'] ?? 0;

            $this->conn->beginTransaction();

            // 1) Reversar kardex anterior (SALIDA por cada detalle viejo)
            foreach ($oldDetNorm as $od) {
                if ($od['peso'] <= 0) continue;
                if (!in_array($od['canonico'], $this->canonicas, true)) continue;
                $this->registrarKardex(
                    $loteId,
                    'salida',
                    $od['canonico'],
                    $od['peso'],
                    $data['fecha_pesado'],
                    "Ajuste pesaje #{$id} (reverso)"
                );
            }

            // 2) Borrar detalles viejos
            $delDet = "DELETE FROM {$this->detalleTable} WHERE peso_lote_id = :pid";
            $stmtDel = $this->conn->prepare($delDet);
            $stmtDel->bindParam(':pid', $id, PDO::PARAM_INT);
            $stmtDel->execute();

            // 3) Actualizar cabecera
            $query = "UPDATE {$this->table} SET
                      fecha_pesado = :fecha_pesado,
                      peso_bruto = :peso_bruto,
                      peso_exportable = :pe,
                      peso_industrial = :pi,
                      peso_descarte = :pd,
                      peso_nacional = :pn,
                      peso_jugo = :pj,
                      peso_primera = :p1,
                      peso_segunda = :p2,
                      peso_tercera = :p3,
                      peso_cuarta = :p4,
                      peso_quinta = :p5,
                      peso_dedos = :pded,
                      observaciones = :obs
                      WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->bindParam(':fecha_pesado', $data['fecha_pesado']);
            $stmt->bindParam(':peso_bruto', $pesoBruto);
            $stmt->bindParam(':pe', $pe);
            $stmt->bindParam(':pi', $pi);
            $stmt->bindParam(':pd', $pd);
            $stmt->bindParam(':pn', $pn);
            $stmt->bindParam(':pj', $pj);
            $stmt->bindParam(':p1', $p1);
            $stmt->bindParam(':p2', $p2);
            $stmt->bindParam(':p3', $p3);
            $stmt->bindParam(':p4', $p4);
            $stmt->bindParam(':p5', $p5);
            $stmt->bindParam(':pded', $pded);
            $obs = $data['observaciones'] ?? null;
            $stmt->bindParam(':obs', $obs);
            $stmt->execute();

            // 4) Insertar nuevos detalles
            $this->saveDetalles($id, $detallesNorm);

            // 5) Registrar nuevos ingresos en kardex
            foreach ($detallesNorm as $d) {
                if ($d['peso'] <= 0) continue;
                $this->registrarKardex(
                    $loteId,
                    'ingreso',
                    $d['canonico'],
                    $d['peso'],
                    $data['fecha_pesado'],
                    "Ajuste pesaje #{$id} (nuevo)"
                );
            }

            // 6) Recalcular peso_neto del lote
            $this->recalcularPesoNetoLote($loteId);

            $this->conn->commit();

            echo json_encode(['success' => true, 'message' => 'Registro actualizado exitosamente']);
        } catch(PDOException $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al actualizar el registro: ' . $e->getMessage()]);
        }
    }

    /* =========================================================
     *   DELETE
     * ========================================================= */

    // DELETE /pesos-lote/{id}
    public function delete($id) {
        try {
            // Verificar que existe
            $qPrev = "SELECT lote_id, fecha_pesado FROM {$this->table} WHERE id = :id";
            $stmtPrev = $this->conn->prepare($qPrev);
            $stmtPrev->bindParam(':id', $id, PDO::PARAM_INT);
            $stmtPrev->execute();
            $prev = $stmtPrev->fetch(PDO::FETCH_ASSOC);

            if (!$prev) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Registro no encontrado']);
                return;
            }
            $loteId = (int)$prev['lote_id'];
            $fecha = $prev['fecha_pesado'];

            // Detalles actuales (para SALIDA en kardex)
            $qDetOld = "SELECT d.*, c.codigo, c.nombre
                        FROM {$this->detalleTable} d
                        JOIN categorias_peso c ON d.categoria_id = c.id
                        WHERE d.peso_lote_id = :pid";
            $stmtOld = $this->conn->prepare($qDetOld);
            $stmtOld->bindParam(':pid', $id, PDO::PARAM_INT);
            $stmtOld->execute();
            $oldRows = $stmtOld->fetchAll(PDO::FETCH_ASSOC);

            $this->conn->beginTransaction();

            foreach ($oldRows as $r) {
                $peso = (float)$r['peso'];
                if ($peso <= 0) continue;
                $canon = $this->obtenerNombreCanonico($r['codigo'], $r['nombre']);
                if (!in_array($canon, $this->canonicas, true)) continue;
                $this->registrarKardex(
                    $loteId,
                    'salida',
                    $canon,
                    $peso,
                    $fecha,
                    "Eliminación pesaje #{$id}"
                );
            }

            // Borrar detalles
            $delDet = "DELETE FROM {$this->detalleTable} WHERE peso_lote_id = :pid";
            $stmtDel = $this->conn->prepare($delDet);
            $stmtDel->bindParam(':pid', $id, PDO::PARAM_INT);
            $stmtDel->execute();

            // Borrar cabecera
            $query = "DELETE FROM {$this->table} WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();

            // Recalcular peso_neto
            $this->recalcularPesoNetoLote($loteId);

            $this->conn->commit();

            echo json_encode(['success' => true, 'message' => 'Registro eliminado exitosamente']);
        } catch(PDOException $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al eliminar el registro: ' . $e->getMessage()]);
        }
    }

    /* =========================================================
     *   HELPERS: DETALLES, CATEGORÍAS, KARDEX
     * ========================================================= */

    private function normalizarDetalles(array $detalles) {
        $out = [];
        foreach ($detalles as $d) {
            if (is_array($d)) {
                $catId  = isset($d['categoria_id']) ? (int)$d['categoria_id'] : 0;
                $peso   = isset($d['peso']) ? (float)$d['peso'] : 0;
            } else if (is_object($d)) {
                $catId  = isset($d->categoria_id) ? (int)$d->categoria_id : 0;
                $peso   = isset($d->peso) ? (float)$d->peso : 0;
            } else {
                continue;
            }

            if ($catId <= 0 || $peso <= 0) continue;

            // SIEMPRE resolver la categoría usando categorias_peso
            $infoCat = $this->obtenerDatosCategoriaPorId($catId);
            if ($infoCat === null) {
                // categoría no encontrada o no mapeable -> la saltamos
                continue;
            }

            $out[] = [
                'categoria_id' => $catId,
                'codigo'       => $infoCat['codigo'],
                'nombre'       => $infoCat['nombre'],
                'peso'         => $peso,
                'canonico'     => $infoCat['canonico'],
            ];
        }
        return $out;
    }

    private function obtenerDatosCategoriaPorId($catId) {
        if (isset($this->cacheCategorias[$catId])) {
            return $this->cacheCategorias[$catId];
        }

        $sql = "SELECT codigo, nombre 
                FROM categorias_peso
                WHERE id = :id
                LIMIT 1";
        $stmt = $this->conn->prepare($sql);
        $stmt->bindParam(':id', $catId, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }

        $canonico = $this->obtenerNombreCanonico($row['codigo'], $row['nombre']);
        if (!in_array($canonico, $this->canonicas, true)) {
            // si por alguna razón no coincide, mejor no usarlo
            return null;
        }

        $info = [
            'codigo'   => $row['codigo'],
            'nombre'   => $row['nombre'],
            'canonico' => $canonico
        ];
        $this->cacheCategorias[$catId] = $info;
        return $info;
    }

    private function obtenerNombreCanonico($codigo = null, $nombre = null) {
        $nombre = $nombre !== null ? trim($nombre) : '';
        $codigo = $codigo !== null ? trim($codigo) : '';

        if ($nombre !== '') {
            $n = mb_strtolower($nombre);
            if (in_array($n, $this->canonicas, true)) {
                return $n;
            }
        }

        if ($codigo !== '') {
            $u = strtoupper($codigo);
            if (isset($this->mapAbreviaturas[$u])) {
                return $this->mapAbreviaturas[$u];
            }
            $n = mb_strtolower($codigo);
            if (in_array($n, $this->canonicas, true)) {
                return $n;
            }
        }

        // Si no la podemos mapear a una categoría válida, devolvemos algo no permitido
        // El que decide si usarla o no será normalizarDetalles / registrarKardex
        return mb_strtolower($nombre ?: $codigo ?: '');
    }

    // Construye detalles si sólo mandan columnas peso_exportable, peso_industrial, etc.
    private function buildDetallesDesdeCabecera(array $data) {
        $detalles = [];
        foreach ($this->canonicas as $cat) {
            $col = "peso_" . $cat;
            if (!isset($data[$col])) continue;
            $peso = (float)$data[$col];
            if ($peso <= 0) continue;

            $catId = $this->buscarCategoriaIdPorNombre($cat);
            if ($catId <= 0) continue;

            $detalles[] = [
                'categoria_id' => $catId,
                'codigo'       => $cat,
                'nombre'       => $cat,
                'peso'         => $peso,
                'canonico'     => $cat
            ];
        }
        return $detalles;
    }

    private function buscarCategoriaIdPorNombre($nombreCanonico) {
        $sql = "SELECT id FROM categorias_peso
                WHERE (LOWER(nombre) = :n OR LOWER(codigo) = :n)
                ORDER BY id
                LIMIT 1";
        $stmt = $this->conn->prepare($sql);
        $n = mb_strtolower($nombreCanonico);
        $stmt->bindParam(':n', $n);
        $stmt->execute();
        $id = $stmt->fetchColumn();
        return $id ? (int)$id : 0;
    }

    private function saveDetalles($pesoLoteId, array $detallesNorm) {
        if (empty($detallesNorm)) return;

        $sql = "INSERT INTO {$this->detalleTable}
                (peso_lote_id, categoria_id, peso)
                VALUES (:pid, :cat, :peso)";
        $stmt = $this->conn->prepare($sql);

        foreach ($detallesNorm as $d) {
            $catId = (int)$d['categoria_id'];
            $peso  = (float)$d['peso'];
            if ($catId <= 0 || $peso <= 0) continue;

            $stmt->bindParam(':pid', $pesoLoteId, PDO::PARAM_INT);
            $stmt->bindParam(':cat', $catId, PDO::PARAM_INT);
            $stmt->bindParam(':peso', $peso);
            $stmt->execute();
        }
    }

    private function recalcularPesoNetoLote($loteId) {
        // suma de todos los pesos clasificados (detalles) del lote
        $sql = "SELECT COALESCE(SUM(d.peso), 0) AS total
                FROM {$this->detalleTable} d
                JOIN {$this->table} pl ON d.peso_lote_id = pl.id
                WHERE pl.lote_id = :lote";
        $stmt = $this->conn->prepare($sql);
        $stmt->bindParam(':lote', $loteId, PDO::PARAM_INT);
        $stmt->execute();
        $total = (float)$stmt->fetchColumn();

        $u = "UPDATE lotes SET peso_neto = :total WHERE id = :lote";
        $stmtU = $this->conn->prepare($u);
        $stmtU->bindParam(':total', $total);
        $stmtU->bindParam(':lote', $loteId, PDO::PARAM_INT);
        $stmtU->execute();
    }

    // Helper para registrar en kardex
    private function registrarKardex($loteId, $tipoMovimiento, $categoria, $peso, $fechaMovimiento, $referencia) {
        if ($peso <= 0) return;

        // Aseguramos que la categoría sea válida para el ENUM de kardex_lotes
        if (!in_array($categoria, $this->canonicas, true)) {
            // Si llega algo raro, mejor no registrar nada para no llenar kardex con ''
            return;
        }

        // Obtener saldo actual
        $querySaldo = "SELECT COALESCE(saldo_categoria, 0) as saldo 
                       FROM kardex_lotes 
                       WHERE lote_id = :lote_id AND categoria = :categoria 
                       ORDER BY id DESC 
                       LIMIT 1";
        
        $stmtSaldo = $this->conn->prepare($querySaldo);
        $stmtSaldo->bindParam(':lote_id', $loteId, PDO::PARAM_INT);
        $stmtSaldo->bindParam(':categoria', $categoria);
        $stmtSaldo->execute();
        $resultSaldo = $stmtSaldo->fetch(PDO::FETCH_ASSOC);
        $saldoActual = $resultSaldo ? (float)$resultSaldo['saldo'] : 0.0;
        
        // Calcular nuevo saldo
        $nuevoSaldo = $tipoMovimiento === 'ingreso'
            ? $saldoActual + $peso
            : $saldoActual - $peso;
        
        // Insertar en kardex
        $queryKardex = "INSERT INTO kardex_lotes 
                        (lote_id, tipo_movimiento, categoria, peso, fecha_movimiento, referencia, saldo_categoria) 
                        VALUES 
                        (:lote_id, :tipo_movimiento, :categoria, :peso, :fecha_movimiento, :referencia, :saldo_categoria)";
        
        $stmtKardex = $this->conn->prepare($queryKardex);
        $stmtKardex->bindParam(':lote_id', $loteId, PDO::PARAM_INT);
        $stmtKardex->bindParam(':tipo_movimiento', $tipoMovimiento);
        $stmtKardex->bindParam(':categoria', $categoria);
        $stmtKardex->bindParam(':peso', $peso);
        $stmtKardex->bindParam(':fecha_movimiento', $fechaMovimiento);
        $stmtKardex->bindParam(':referencia', $referencia);
        $stmtKardex->bindParam(':saldo_categoria', $nuevoSaldo);
        $stmtKardex->execute();
    }
}
?>
