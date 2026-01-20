<?php
class PedidosController {
    private $conn;
    private $table = "pedidos";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest($method, $id, $action) {
        switch ($method) {

            case 'GET':
                if ($action === 'lotes-disponibles') {
                    $this->getLotesDisponibles();
                }
                else if (($action === 'pedido-lotes' || $action === 'lotes') && $id) {
                    $this->getLotesPorPedido($id);
                }
                else if ($id) {
                    $this->getOne($id);
                }
                else if ($action === 'por-cliente') {
                    $this->getByCliente();
                }
                else {
                    $this->getAll();
                }
                break;

            case 'POST':
                if ($action === 'asignar-lote') {
                    $this->asignarLote();
                }
                else if ($action === 'quitar-lote') {
                    $this->quitarLote();
                }
                else {
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

    /* =============================================
       CRUD ORIGINAL
    ==============================================*/

    public function getAll() {
        $query = "SELECT p.*, c.nombre_completo as cliente_nombre
                  FROM " . $this->table . " p
                  LEFT JOIN personas c ON p.cliente_id = c.id
                  ORDER BY p.created_at DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function getOne($id) {
        $query = "SELECT p.*, c.nombre_completo as cliente_nombre,
                         c.documento_identidad, c.telefono, c.email
                  FROM " . $this->table . " p
                  LEFT JOIN personas c ON p.cliente_id = c.id
                  WHERE p.id = :id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
    }

    public function getByCliente() {
        $data = json_decode(file_get_contents("php://input"));
        $clienteId = $data->cliente_id ?? null;

        if (!$clienteId) {
            http_response_code(400);
            echo json_encode(["message" => "cliente_id requerido"]);
            return;
        }

        $query = "SELECT * FROM pedidos
                  WHERE cliente_id = :cliente
                  ORDER BY created_at DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':cliente', $clienteId, PDO::PARAM_INT);
        $stmt->execute();
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function create() {
        $data = json_decode(file_get_contents("php://input"));

        $query = "INSERT INTO pedidos 
                  (numero_pedido, cliente_id, producto, categoria, kg_bruto, porcentaje_humedad, 
                   kg_neto, precio, total, fecha_pedido, estado, observaciones)
                  VALUES (:numero, :cliente, :prod, :cat, :kg_bruto, :humedad, 
                          :kg_neto, :precio, :total, :fecha, :estado, :obs)";

        $stmt = $this->conn->prepare($query);

        $numero   = $data->numero_pedido ?? 'PED-' . date('Ymd-His');
        $cliente  = $data->cliente_id ?? null;
        $prod     = $data->producto ?? '';
        $cat      = $data->categoria ?? '';
        $kgBruto  = $data->kg_bruto ?? 0;
        $humedad  = $data->porcentaje_humedad ?? 0;
        $kgNeto   = $data->kg_neto ?? $kgBruto;
        $precio   = $data->precio ?? 0;
        $total    = $kgNeto * $precio;
        $fecha    = $data->fecha_pedido ?? date('Y-m-d');
        $estado   = $data->estado ?? 'pendiente';
        $obs      = $data->observaciones ?? '';

        $stmt->execute([
            ':numero'   => $numero,
            ':cliente'  => $cliente,
            ':prod'     => $prod,
            ':cat'      => $cat,
            ':kg_bruto' => $kgBruto,
            ':humedad'  => $humedad,
            ':kg_neto'  => $kgNeto,
            ':precio'   => $precio,
            ':total'    => $total,
            ':fecha'    => $fecha,
            ':estado'   => $estado,
            ':obs'      => $obs,
        ]);

        echo json_encode([
            "message" => "Pedido creado",
            "id"      => $this->conn->lastInsertId()
        ]);
    }

    public function update($id) {
        $data = json_decode(file_get_contents("php://input"));

        $query = "UPDATE pedidos SET 
                    numero_pedido        = :numero,
                    cliente_id           = :cliente,
                    producto             = :prod,
                    categoria            = :cat,
                    kg_bruto             = :kg_bruto,
                    porcentaje_humedad   = :humedad,
                    kg_neto              = :kg_neto,
                    precio               = :precio,
                    total                = :total,
                    fecha_pedido         = :fecha,
                    estado               = :estado,
                    observaciones        = :obs
                  WHERE id = :id";

        $stmt = $this->conn->prepare($query);

        $kgNeto = $data->kg_neto;
        $precio = $data->precio;
        $total  = $kgNeto * $precio;

        $stmt->execute([
            ':id'       => $id,
            ':numero'   => $data->numero_pedido,
            ':cliente'  => $data->cliente_id,
            ':prod'     => $data->producto,
            ':cat'      => $data->categoria,
            ':kg_bruto' => $data->kg_bruto,
            ':humedad'  => $data->porcentaje_humedad,
            ':kg_neto'  => $kgNeto,
            ':precio'   => $precio,
            ':total'    => $total,
            ':fecha'    => $data->fecha_pedido,
            ':estado'   => $data->estado,
            ':obs'      => $data->observaciones,
        ]);

        echo json_encode(["message" => "Pedido actualizado"]);
    }

    public function delete($id) {
        $stmt = $this->conn->prepare("DELETE FROM pedidos WHERE id = :id");
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        echo json_encode(["message" => "Pedido eliminado"]);
    }

    /* ========================================
       LOTES: DISPONIBLES (✅ con productor/fecha)
    ==========================================*/

    public function getLotesDisponibles() {
        try {
            $sql = "
                SELECT 
                    l.id AS lote_id,
                    l.numero_lote,
                    l.producto,
                    l.estado AS estado_lote,
                    l.estado_proceso,

                    -- ✅ datos extra
                    COALESCE(l.fecha_ingreso, l.fecha_recepcion) AS fecha_ingreso,
                    prod.nombre_completo AS productor_nombre,
                    prod.documento_identidad AS productor_dni,

                    cp.id AS categoria_id,
                    cp.nombre AS categoria_nombre,
                    cp.codigo AS categoria_codigo,
                    cp.precio_kg,

                    pld.peso AS peso_original,
                    COALESCE(asig.total_asignado, 0) AS total_asignado,
                    (pld.peso - COALESCE(asig.total_asignado, 0)) AS saldo_disponible

                FROM lotes l

                -- ✅ último pesos_lote por lote (evita duplicados)
                INNER JOIN (
                    SELECT lote_id, MAX(id) AS peso_lote_id
                    FROM pesos_lote
                    GROUP BY lote_id
                ) plx ON plx.lote_id = l.id

                INNER JOIN pesos_lote_detalle pld ON pld.peso_lote_id = plx.peso_lote_id
                INNER JOIN categorias_peso cp ON cp.id = pld.categoria_id

                LEFT JOIN personas prod ON prod.id = l.productor_id

                -- ✅ suma asignaciones incluso si hay registros viejos con categoria_id NULL (resuelve por nombre)
                LEFT JOIN (
                    SELECT 
                        pl2.lote_id,
                        COALESCE(pl2.categoria_id, cp2.id) AS categoria_id_res,
                        SUM(COALESCE(pl2.kg_asignado, pl2.peso_asignado, 0)) AS total_asignado
                    FROM pedido_lotes pl2
                    LEFT JOIN categorias_peso cp2 
                        ON cp2.id = pl2.categoria_id
                        OR (pl2.categoria_id IS NULL AND LOWER(cp2.nombre) = LOWER(pl2.categoria))
                    GROUP BY pl2.lote_id, COALESCE(pl2.categoria_id, cp2.id)
                ) asig ON asig.lote_id = l.id 
                      AND asig.categoria_id_res = cp.id

                WHERE pld.peso > 0
                  AND cp.estado = 'activo'
                  AND (pld.peso - COALESCE(asig.total_asignado, 0)) > 0

                ORDER BY COALESCE(l.fecha_ingreso, l.fecha_recepcion) DESC, l.numero_lote ASC, cp.orden ASC
            ";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data'    => $rows,
                'total'   => count($rows)
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error al obtener lotes disponibles',
                'error'   => $e->getMessage()
            ]);
        }
    }

    /* ========================================
       LOTES: ASIGNADOS (✅ con productor/fecha/peso/saldo)
    ==========================================*/

    public function getLotesPorPedido($pedidoId) {
        try {
            $sql = "
                SELECT 
                    pl.id,
                    pl.pedido_id,
                    pl.lote_id,
                    l.numero_lote,
                    l.producto,

                    -- categoría: si no hay categoria_id, resolver por nombre
                    COALESCE(cp_pl.nombre, pl.categoria) AS categoria,
                    COALESCE(pl.categoria_id, cp_pl.id) AS categoria_id,

                    COALESCE(pl.kg_asignado, pl.peso_asignado, 0) AS peso_asignado,
                    pl.fecha_asignacion,

                    -- ✅ extra datos
                    l.estado_proceso,
                    COALESCE(l.fecha_ingreso, l.fecha_recepcion) AS fecha_ingreso,
                    prod.nombre_completo AS productor_nombre,
                    prod.documento_identidad AS productor_dni,

                    -- ✅ peso original según clasificación
                    pld.peso AS peso_original,

                    -- ✅ saldo actual (calculado con todas las asignaciones, incluso legacy)
                    COALESCE(asig.total_asignado, 0) AS total_asignado,
                    GREATEST(COALESCE(pld.peso, 0) - COALESCE(asig.total_asignado, 0), 0) AS saldo_disponible

                FROM pedido_lotes pl
                INNER JOIN lotes l ON l.id = pl.lote_id
                LEFT JOIN personas prod ON prod.id = l.productor_id

                LEFT JOIN categorias_peso cp_pl 
                    ON cp_pl.id = pl.categoria_id
                    OR (pl.categoria_id IS NULL AND LOWER(cp_pl.nombre) = LOWER(pl.categoria))

                -- ✅ último pesos_lote por lote
                LEFT JOIN (
                    SELECT lote_id, MAX(id) AS peso_lote_id
                    FROM pesos_lote
                    GROUP BY lote_id
                ) plx ON plx.lote_id = l.id

                LEFT JOIN pesos_lote_detalle pld
                    ON pld.peso_lote_id = plx.peso_lote_id
                    AND pld.categoria_id = cp_pl.id

                -- ✅ suma asignaciones (incluye legacy categoria_id NULL)
                LEFT JOIN (
                    SELECT 
                        pl2.lote_id,
                        COALESCE(pl2.categoria_id, cp2.id) AS categoria_id_res,
                        SUM(COALESCE(pl2.kg_asignado, pl2.peso_asignado, 0)) AS total_asignado
                    FROM pedido_lotes pl2
                    LEFT JOIN categorias_peso cp2 
                        ON cp2.id = pl2.categoria_id
                        OR (pl2.categoria_id IS NULL AND LOWER(cp2.nombre) = LOWER(pl2.categoria))
                    GROUP BY pl2.lote_id, COALESCE(pl2.categoria_id, cp2.id)
                ) asig ON asig.lote_id = l.id 
                      AND asig.categoria_id_res = cp_pl.id

                WHERE pl.pedido_id = :pedido
                ORDER BY pl.fecha_asignacion ASC, l.numero_lote ASC
            ";

            $stmt = $this->conn->prepare($sql);
            $stmt->bindParam(':pedido', $pedidoId, PDO::PARAM_INT);
            $stmt->execute();

            echo json_encode([
                'success' => true,
                'data'    => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error al obtener lotes del pedido',
                'error'   => $e->getMessage()
            ]);
        }
    }

    /* ========================================
       ASIGNAR LOTE (✅ reservado robusto)
    ==========================================*/

    public function asignarLote() {
        $data = json_decode(file_get_contents("php://input"), true);

        $pedidoId   = isset($data['pedido_id'])   ? (int)$data['pedido_id']   : 0;
        $loteId     = isset($data['lote_id'])     ? (int)$data['lote_id']     : 0;
        $categoria  = isset($data['categoria'])   ? trim($data['categoria'])  : '';
        $kgAsignado = isset($data['kg_asignado']) ? (float)$data['kg_asignado'] : 0;

        if (!$pedidoId || !$loteId || !$categoria || $kgAsignado <= 0) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'pedido_id, lote_id, categoria y kg_asignado son requeridos y kg_asignado debe ser > 0'
            ]);
            return;
        }

        try {
            $sqlPesoOriginal = "
                SELECT 
                    pld.peso AS peso_original,
                    cp.id AS categoria_id,
                    cp.nombre AS categoria_nombre
                FROM pesos_lote pl
                INNER JOIN pesos_lote_detalle pld ON pld.peso_lote_id = pl.id
                INNER JOIN categorias_peso cp ON cp.id = pld.categoria_id
                WHERE pl.lote_id = :lote
                  AND LOWER(cp.nombre) = LOWER(:categoria)
                ORDER BY pl.id DESC
                LIMIT 1
            ";

            $stmtPeso = $this->conn->prepare($sqlPesoOriginal);
            $stmtPeso->execute([
                ':lote'      => $loteId,
                ':categoria' => $categoria,
            ]);
            $rowPeso = $stmtPeso->fetch(PDO::FETCH_ASSOC);

            if (!$rowPeso) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'El lote no tiene clasificación registrada para la categoría "' . $categoria . '".'
                ]);
                return;
            }

            $pesoOriginal = (float)$rowPeso['peso_original'];
            $categoriaId = (int)$rowPeso['categoria_id'];
            $categoriaNombre = $rowPeso['categoria_nombre'];

            // ✅ reservado robusto
            $sqlReservado = "
                SELECT COALESCE(SUM(COALESCE(kg_asignado, peso_asignado, 0)), 0) AS reservado
                FROM pedido_lotes
                WHERE lote_id = :lote
                  AND categoria_id = :categoria_id
            ";
            $stmtRes = $this->conn->prepare($sqlReservado);
            $stmtRes->execute([
                ':lote'         => $loteId,
                ':categoria_id' => $categoriaId,
            ]);
            $rowRes = $stmtRes->fetch(PDO::FETCH_ASSOC);
            $reservado = (float)$rowRes['reservado'];

            $disponible = $pesoOriginal - $reservado;

            if ($kgAsignado > $disponible + 0.001) {
                http_response_code(400);
                echo json_encode([
                    'success'        => false,
                    'message'        => 'No hay saldo suficiente en este lote para esta categoría',
                    'peso_original'  => $pesoOriginal,
                    'reservado'      => $reservado,
                    'disponible'     => $disponible,
                    'kg_solicitado'  => $kgAsignado,
                ]);
                return;
            }

            $sqlInsert = "
                INSERT INTO pedido_lotes (pedido_id, lote_id, categoria, categoria_id, kg_asignado, peso_asignado)
                VALUES (:p, :l, :c, :cid, :kg, :kg2)
            ";
            $stmt = $this->conn->prepare($sqlInsert);
            $stmt->execute([
                ':p'   => $pedidoId,
                ':l'   => $loteId,
                ':c'   => $categoriaNombre,
                ':cid' => $categoriaId,
                ':kg'  => $kgAsignado,
                ':kg2' => $kgAsignado,
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Lote asignado al pedido correctamente',
                'id'      => $this->conn->lastInsertId()
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error al asignar lote al pedido',
                'error'   => $e->getMessage()
            ]);
        }
    }

    /* ========================================
       QUITAR LOTE (igual)
    ==========================================*/

    public function quitarLote() {
        $data = json_decode(file_get_contents("php://input"), true);

        if (isset($data['id']) && $data['id']) {
            $asignacionId = (int)$data['id'];
            try {
                $sql = "DELETE FROM pedido_lotes WHERE id = :id";
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([':id' => $asignacionId]);

                echo json_encode([
                    'success' => true,
                    'message' => 'Asignación eliminada correctamente'
                ]);
                return;
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Error al quitar asignación',
                    'error'   => $e->getMessage()
                ]);
                return;
            }
        }

        $pedidoId  = isset($data['pedido_id']) ? (int)$data['pedido_id'] : 0;
        $loteId    = isset($data['lote_id'])   ? (int)$data['lote_id']   : 0;
        $categoria = isset($data['categoria']) ? trim($data['categoria']) : null;

        if (!$pedidoId || !$loteId) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'pedido_id y lote_id son requeridos (o id de asignación)'
            ]);
            return;
        }

        try {
            if ($categoria) {
                $sql = "DELETE FROM pedido_lotes 
                        WHERE pedido_id = :p 
                          AND lote_id = :l
                          AND LOWER(categoria) = LOWER(:c)";
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([
                    ':p' => $pedidoId,
                    ':l' => $loteId,
                    ':c' => $categoria
                ]);
            } else {
                $sql = "DELETE FROM pedido_lotes 
                        WHERE pedido_id = :p 
                          AND lote_id = :l";
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([
                    ':p' => $pedidoId,
                    ':l' => $loteId
                ]);
            }

            echo json_encode([
                'success' => true,
                'message' => 'Lote quitado del pedido correctamente'
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error al quitar lote del pedido',
                'error'   => $e->getMessage()
            ]);
        }
    }
}
