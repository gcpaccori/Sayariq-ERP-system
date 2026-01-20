<?php
class LiquidacionesController {
    private $conn;
    private $tableLiquidaciones = "liquidaciones";
    private $tableDetalle = "liquidaciones_detalle";

    // nombres canónicos de categorías
    private $categorias = [
        'exportable','industrial','descarte','nacional','jugo',
        'primera','segunda','tercera','cuarta','quinta','dedos'
    ];

    public function __construct($db) {
        $this->conn = $db;
    }

    public function handleRequest($method, $id, $action) {
        if ($id && !is_numeric($id)) {
            $action = $id;
            $id = null;
        }

        switch ($method) {
            case 'GET':
                if ($action === 'datos-lote' && isset($_GET['lote_id'])) {
                    $this->getDatosParaLiquidacion($_GET['lote_id']);
                } else if ($action === 'comprobante' && $id) {
                    $this->generarComprobante($id);
                } else if ($action === 'por-productor' && isset($_GET['productor_id'])) {
                    $this->getLiquidacionesPorProductor($_GET['productor_id']);
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

    /**
     * =======================================
     * DATOS PARA LIQUIDACIÓN DESDE KARDEX
     * =======================================
     */
    public function getDatosParaLiquidacion($loteId) {
        try {
            // 1. Datos del lote + productor
            $queryLote = "SELECT l.*, 
                                 p.nombre_completo, p.documento_identidad, 
                                 p.telefono, p.direccion, p.banco, p.cuenta_bancaria
                          FROM lotes l
                          INNER JOIN personas p ON l.productor_id = p.id
                          WHERE l.id = :lote_id";

            $stmtLote = $this->conn->prepare($queryLote);
            $stmtLote->bindParam(':lote_id', $loteId, PDO::PARAM_INT);
            $stmtLote->execute();
            $lote = $stmtLote->fetch(PDO::FETCH_ASSOC);

            if (!$lote) {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Lote no encontrado"]);
                return;
            }

            // 2. Saldos reales desde KARDEX (ingresos - salidas)
            $queryKardex = "SELECT categoria,
                                   SUM(CASE WHEN tipo_movimiento = 'ingreso' THEN peso ELSE 0 END) as ingresos,
                                   SUM(CASE WHEN tipo_movimiento = 'salida' THEN peso ELSE 0 END) as salidas,
                                   SUM(CASE WHEN tipo_movimiento = 'ingreso' THEN peso ELSE -peso END) as saldo
                            FROM kardex_lotes
                            WHERE lote_id = :lote
                            GROUP BY categoria";

            $stmtK = $this->conn->prepare($queryKardex);
            $stmtK->bindParam(':lote', $loteId, PDO::PARAM_INT);
            $stmtK->execute();
            $rows = $stmtK->fetchAll(PDO::FETCH_ASSOC);

            // Inicializar en 0 todas las categorías
            $saldos = [];
            foreach ($this->categorias as $cat) {
                $saldos[$cat] = 0.0;
            }

            $pesoBrutoTotal = 0.0;
            foreach ($rows as $r) {
                $cat = $r['categoria'];
                $saldo = (float)$r['saldo'];
                if (isset($saldos[$cat])) {
                    $saldos[$cat] = $saldo;
                }
                $pesoBrutoTotal += $saldo;
            }

            // 3. Pesos físicos registrados (referencial)
            $queryPesos = "SELECT 
                              COALESCE(SUM(peso_bruto), 0) as peso_bruto_registrado,
                              COALESCE(SUM(peso_exportable), 0) as peso_exportable,
                              COALESCE(SUM(peso_industrial), 0) as peso_industrial,
                              COALESCE(SUM(peso_descarte), 0) as peso_descarte,
                              COALESCE(SUM(COALESCE(peso_nacional, 0)), 0) as peso_nacional,
                              COALESCE(SUM(COALESCE(peso_jugo, 0)), 0) as peso_jugo,
                              COALESCE(SUM(COALESCE(peso_primera, 0)), 0) as peso_primera,
                              COALESCE(SUM(COALESCE(peso_segunda, 0)), 0) as peso_segunda,
                              COALESCE(SUM(COALESCE(peso_tercera, 0)), 0) as peso_tercera,
                              COALESCE(SUM(COALESCE(peso_cuarta, 0)), 0) as peso_cuarta,
                              COALESCE(SUM(COALESCE(peso_quinta, 0)), 0) as peso_quinta,
                              COALESCE(SUM(COALESCE(peso_dedos, 0)), 0) as peso_dedos
                           FROM pesos_lote
                           WHERE lote_id = :lote_id";
            $stmtP = $this->conn->prepare($queryPesos);
            $stmtP->bindParam(':lote_id', $loteId, PDO::PARAM_INT);
            $stmtP->execute();
            $pesosRegistrados = $stmtP->fetch(PDO::FETCH_ASSOC);

            // 4. Catálogo de categorías con precios
            $queryCat = "SELECT id, codigo as nombre_categoria, nombre as descripcion,
                                precio_kg as precio_unitario_kg, es_liquidable
                         FROM categorias_peso
                         WHERE estado = 'activo'
                         ORDER BY orden, id";
            $stmtCat = $this->conn->prepare($queryCat);
            $stmtCat->execute();
            $categorias = $stmtCat->fetchAll(PDO::FETCH_ASSOC);

            // Si no hubiera categorias_peso, intentar tabla categorias
            if (empty($categorias)) {
                $queryCatAlt = "SELECT id, nombre_categoria, descripcion, 
                                       precio_unitario_kg, 1 as es_liquidable
                                FROM categorias
                                WHERE estado = 'activo'
                                ORDER BY nombre_categoria";
                $stmtCatAlt = $this->conn->prepare($queryCatAlt);
                $stmtCatAlt->execute();
                $categorias = $stmtCatAlt->fetchAll(PDO::FETCH_ASSOC);
            }

            // 5. Adelantos pendientes del productor
            $queryAdel = "SELECT * 
                          FROM adelantos
                          WHERE productor_id = :pid
                            AND estado = 'pendiente'
                          ORDER BY fecha_adelanto";
            $stmtAd = $this->conn->prepare($queryAdel);
            $stmtAd->bindParam(':pid', $lote['productor_id'], PDO::PARAM_INT);
            $stmtAd->execute();
            $adelantos = $stmtAd->fetchAll(PDO::FETCH_ASSOC);

            // 6. Número de liquidación sugerido
            $numeroLiquidacion = $this->generarNumeroLiquidacion();

            // Armar pesos desde kardex
            $pesosKardex = [
                "peso_bruto_total" => $pesoBrutoTotal,
                "peso_exportable"  => $saldos['exportable'],
                "peso_industrial"  => $saldos['industrial'],
                "peso_descarte"    => $saldos['descarte'],
                "peso_nacional"    => $saldos['nacional'],
                "peso_jugo"        => $saldos['jugo'],
                "peso_primera"     => $saldos['primera'],
                "peso_segunda"     => $saldos['segunda'],
                "peso_tercera"     => $saldos['tercera'],
                "peso_cuarta"      => $saldos['cuarta'],
                "peso_quinta"      => $saldos['quinta'],
                "peso_dedos"       => $saldos['dedos'],
            ];

            echo json_encode([
                "success" => true,
                "data" => [
                    "lote"             => $lote,
                    "pesos"            => $pesosKardex,       // lo que realmente está disponible en kardex
                    "pesos_registrados"=> $pesosRegistrados,  // referencia física
                    "categorias"       => $categorias,
                    "adelantos"        => $adelantos,
                    "numero_liquidacion" => $numeroLiquidacion,
                    "fuente_datos"     => "kardex"
                ]
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error al obtener datos: " . $e->getMessage()]);
        }
    }

    /**
     * =======================================
     * CREAR LIQUIDACIÓN (OPCIÓN B PROFESIONAL)
     * - Guarda liquidacion_id en adelantos SI EXISTE la columna
     * - Registra salidas en KARDEX con saldo_categoria
     * =======================================
     */
    public function create() {
        try {
            $data = json_decode(file_get_contents("php://input"));

            if (!$data || !isset($data->lote_id)) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Datos incompletos"]);
                return;
            }

            if (!isset($data->detalle_categorias) || !is_array($data->detalle_categorias) || count($data->detalle_categorias) === 0) {
                http_response_code(400);
                echo json_encode(["success" => false, "message" => "Debe enviar detalle_categorias"]);
                return;
            }

            $this->conn->beginTransaction();

            // Normalizar fecha ISO → 'Y-m-d H:i:s'
            $fecha = isset($data->fecha_liquidacion) && $data->fecha_liquidacion
                ? date('Y-m-d H:i:s', strtotime($data->fecha_liquidacion))
                : date('Y-m-d H:i:s');

            // Número de liquidación
            $numeroLiquidacion = $this->generarNumeroLiquidacion();

            // 1. Insertar liquidación principal
            $query = "INSERT INTO {$this->tableLiquidaciones}
                      (numero_liquidacion,
                       lote_id, fecha_liquidacion, total_bruto_fruta,
                       costo_flete, costo_cosecha, costo_maquila,
                       descuento_jabas, total_adelantos, total_a_pagar, estado_pago)
                      VALUES
                      (:numero_liq,
                       :lote,:fecha,:total_bruto,
                       :flete,:cosecha,:maquila,
                       :jabas,:adelantos,:total_pagar,:estado_pago)";

            $stmt = $this->conn->prepare($query);

            $totalBrutoFruta = isset($data->total_bruto_fruta) ? (float)$data->total_bruto_fruta : 0.0;
            $totalAPagar     = isset($data->total_a_pagar) ? (float)$data->total_a_pagar : 0.0;

            $stmt->execute([
                ':numero_liq'  => $numeroLiquidacion,
                ':lote'        => (int)$data->lote_id,
                ':fecha'       => $fecha,
                ':total_bruto' => $totalBrutoFruta,
                ':flete'       => isset($data->costo_flete) ? (float)$data->costo_flete : 0.0,
                ':cosecha'     => isset($data->costo_cosecha) ? (float)$data->costo_cosecha : 0.0,
                ':maquila'     => isset($data->costo_maquila) ? (float)$data->costo_maquila : 0.0,
                ':jabas'       => isset($data->descuento_jabas) ? (float)$data->descuento_jabas : 0.0,
                ':adelantos'   => isset($data->total_adelantos) ? (float)$data->total_adelantos : 0.0,
                ':total_pagar' => $totalAPagar,
                ':estado_pago' => $data->estado_pago ?? 'PENDIENTE'
            ]);

            $liquidacionId = (int)$this->conn->lastInsertId();

            // 2. Detalle de categorías + salida en kardex con saldo actualizado
            $sqlDet = "INSERT INTO {$this->tableDetalle}
                       (liquidacion_id, categoria_id, peso_categoria_original,
                        peso_ajustado, precio_unitario, subtotal)
                       VALUES (:liq,:cat,:orig,:ajust,:precio,:subtotal)";
            $stmtDet = $this->conn->prepare($sqlDet);

            foreach ($data->detalle_categorias as $d) {
                // Convertir stdClass → valores seguros
                $catId       = isset($d->categoria_id) ? (int)$d->categoria_id : 0;
                $catNombre   = isset($d->nombre_categoria) ? $d->nombre_categoria : (isset($d->categoria) ? $d->categoria : 'exportable');
                $catNombre   = strtolower(trim($catNombre)); // para kardex: "industrial", "exportable", etc.
                $pesoOrig    = isset($d->peso_categoria_original) ? (float)$d->peso_categoria_original : 0.0;
                $pesoAjust   = isset($d->peso_ajustado) ? (float)$d->peso_ajustado : $pesoOrig;
                $precio      = isset($d->precio_unitario) ? (float)$d->precio_unitario : 0.0;
                $subtotal    = isset($d->subtotal) ? (float)$d->subtotal : ($pesoAjust * $precio);

                if ($pesoAjust <= 0) {
                    continue;
                }

                // Insertar detalle
                $stmtDet->execute([
                    ':liq'     => $liquidacionId,
                    ':cat'     => $catId,
                    ':orig'    => $pesoOrig,
                    ':ajust'   => $pesoAjust,
                    ':precio'  => $precio,
                    ':subtotal'=> $subtotal
                ]);

                // Registrar salida en kardex con saldo_categoria actualizado
                $this->registrarSalidaKardex(
                    (int)$data->lote_id,
                    $catNombre,
                    $pesoAjust,
                    $fecha,
                    "Liquidación #{$liquidacionId}"
                );
            }

            // 3. Actualizar adelantos como aplicados (OPCIÓN B)
            if (isset($data->adelantos_aplicados) && is_array($data->adelantos_aplicados) && count($data->adelantos_aplicados) > 0) {
                $this->aplicarAdelantosConLiquidacion($data->adelantos_aplicados, $liquidacionId);
            }

            // 4. Actualizar estado de lote
            $stmtLote = $this->conn->prepare("UPDATE lotes SET estado = 'liquidado' WHERE id = :id");
            $stmtLote->bindParam(':id', $data->lote_id, PDO::PARAM_INT);
            $stmtLote->execute();

            $this->conn->commit();

            http_response_code(201);
            echo json_encode([
                "success" => true,
                "message" => "Liquidación creada exitosamente",
                "liquidacion_id" => $liquidacionId,
                "numero_liquidacion" => $numeroLiquidacion
            ]);

        } catch (Exception $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error al crear liquidación: " . $e->getMessage()]);
        }
    }

    /**
     * Registrar salida en kardex con saldo_categoria actualizado
     */
    private function registrarSalidaKardex(int $loteId, string $categoria, float $peso, string $fecha, string $referencia) {
        if ($peso <= 0) return;

        // 1. Obtener saldo anterior
        $qSaldo = "SELECT COALESCE(saldo_categoria, 0) as saldo
                   FROM kardex_lotes
                   WHERE lote_id = :lote AND categoria = :cat
                   ORDER BY id DESC
                   LIMIT 1";
        $stmtSaldo = $this->conn->prepare($qSaldo);
        $stmtSaldo->bindParam(':lote', $loteId, PDO::PARAM_INT);
        $stmtSaldo->bindParam(':cat', $categoria);
        $stmtSaldo->execute();
        $row = $stmtSaldo->fetch(PDO::FETCH_ASSOC);
        $saldoActual = $row ? (float)$row['saldo'] : 0.0;

        $nuevoSaldo = $saldoActual - $peso;

        // 2. Insertar movimiento de salida
        $qIns = "INSERT INTO kardex_lotes
                 (lote_id, tipo_movimiento, categoria, peso, fecha_movimiento, referencia, saldo_categoria)
                 VALUES (:lote, 'salida', :cat, :peso, :fecha, :ref, :saldo)";
        $stmtIns = $this->conn->prepare($qIns);
        $stmtIns->bindParam(':lote', $loteId, PDO::PARAM_INT);
        $stmtIns->bindParam(':cat', $categoria);
        $stmtIns->bindParam(':peso', $peso);
        $stmtIns->bindParam(':fecha', $fecha);
        $stmtIns->bindParam(':ref', $referencia);
        $stmtIns->bindParam(':saldo', $nuevoSaldo);
        $stmtIns->execute();
    }

    /**
     * Opción B: marcar adelantos como aplicados y, si existe la columna,
     * guardar liquidacion_id en cada adelanto.
     */
    private function aplicarAdelantosConLiquidacion(array $adelantosIds, int $liquidacionId) {
        // Sanitizar IDs
        $ids = array_filter(array_map('intval', $adelantosIds), fn($v) => $v > 0);
        if (empty($ids)) return;

        $idsList = implode(',', $ids);

        // ¿Existe columna liquidacion_id en adelantos?
        $tieneColumna = false;
        $qCol = "SHOW COLUMNS FROM adelantos LIKE 'liquidacion_id'";
        $stmtCol = $this->conn->query($qCol);
        if ($stmtCol && $stmtCol->fetch(PDO::FETCH_ASSOC)) {
            $tieneColumna = true;
        }

        if ($tieneColumna) {
            $sql = "UPDATE adelantos 
                    SET estado = 'aplicado',
                        liquidacion_id = :liq
                    WHERE id IN ($idsList)";
            $stmt = $this->conn->prepare($sql);
            $stmt->bindParam(':liq', $liquidacionId, PDO::PARAM_INT);
            $stmt->execute();
        } else {
            // Fallback: solo marcar como aplicado (Opción A)
            $sql = "UPDATE adelantos 
                    SET estado = 'aplicado'
                    WHERE id IN ($idsList)";
            $this->conn->exec($sql);
        }
    }

    /**
     * =======================================
     * NUMERO DE LIQUIDACIÓN
     * =======================================
     */
    private function generarNumeroLiquidacion() {
        $anio = date('Y');
        $query = "SELECT COUNT(*) as total FROM {$this->tableLiquidaciones}
                  WHERE YEAR(fecha_liquidacion) = :anio";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':anio', $anio, PDO::PARAM_INT);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $consecutivo = ($result && isset($result['total'])) ? ((int)$result['total'] + 1) : 1;

        return sprintf("LIQ-%04d-%s", $consecutivo, $anio);
    }

    /**
     * =======================================
     * CRUD BÁSICO
     * =======================================
     */

    public function getOne($id) {
        try {
            $query = "SELECT l.*, lotes.numero_lote, lotes.producto, lotes.peso_inicial,
                             lotes.numero_jabas, p.nombre_completo, p.documento_identidad, 
                             p.banco, p.cuenta_bancaria,
                             l.estado_pago
                      FROM {$this->tableLiquidaciones} l
                      INNER JOIN lotes ON l.lote_id = lotes.id
                      INNER JOIN personas p ON lotes.productor_id = p.id
                      WHERE l.id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            $liquidacion = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$liquidacion) {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Liquidación no encontrada"]);
                return;
            }

            $queryDetalle = "SELECT ld.*, 
                             COALESCE(cp.nombre, 'Sin categoría') as nombre_categoria,
                             COALESCE(cp.precio_kg, 0) as precio_kg
                             FROM {$this->tableDetalle} ld
                             LEFT JOIN categorias_peso cp ON ld.categoria_id = cp.id
                             WHERE ld.liquidacion_id = :id";
            $stmtDetalle = $this->conn->prepare($queryDetalle);
            $stmtDetalle->bindParam(':id', $id, PDO::PARAM_INT);
            $stmtDetalle->execute();
            $detalle = $stmtDetalle->fetchAll(PDO::FETCH_ASSOC);

            $liquidacion['detalle_categorias'] = $detalle;

            echo json_encode(["success" => true, "data" => $liquidacion]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
        }
    }

    public function getAll() {
        try {
            $query = "SELECT l.*, lotes.numero_lote, lotes.producto, 
                             lotes.peso_inicial, lotes.numero_jabas,
                             p.nombre_completo, p.documento_identidad
                      FROM {$this->tableLiquidaciones} l
                      INNER JOIN lotes ON l.lote_id = lotes.id
                      INNER JOIN personas p ON lotes.productor_id = p.id
                      ORDER BY l.fecha_liquidacion DESC";
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(["success" => true, "data" => $result]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
        }
    }

    public function getLiquidacionesPorProductor($productorId) {
        try {
            $query = "SELECT l.*, lotes.numero_lote, lotes.producto
                      FROM {$this->tableLiquidaciones} l
                      INNER JOIN lotes ON l.lote_id = lotes.id
                      WHERE lotes.productor_id = :productor_id
                      ORDER BY l.fecha_liquidacion DESC";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':productor_id', $productorId, PDO::PARAM_INT);
            $stmt->execute();
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(["success" => true, "data" => $result]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
        }
    }

    public function update($id) {
        try {
            $data = json_decode(file_get_contents("php://input"));

            $query = "UPDATE {$this->tableLiquidaciones} 
                      SET estado_pago = :estado_pago
                      WHERE id = :id";
            
            $stmt = $this->conn->prepare($query);
            $estadoPago = $data->estado_pago ?? 'PENDIENTE';
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->bindParam(':estado_pago', $estadoPago);
            
            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Liquidación actualizada"]);
            } else {
                http_response_code(500);
                echo json_encode(["success" => false, "message" => "Error al actualizar"]);
            }

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
        }
    }

    public function delete($id) {
        try {
            $this->conn->beginTransaction();

            $query = "SELECT lote_id FROM {$this->tableLiquidaciones} WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            $liquidacion = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$liquidacion) {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Liquidación no encontrada"]);
                return;
            }

            // Eliminar movimientos de kardex asociados
            $refLiq = "Liquidación #".$id;
            $queryDelKardex = "DELETE FROM kardex_lotes WHERE referencia = :ref";
            $stmtDelKardex = $this->conn->prepare($queryDelKardex);
            $stmtDelKardex->bindParam(':ref', $refLiq);
            $stmtDelKardex->execute();

            // Revertir adelantos (si existe la columna liquidacion_id, también la limpiamos)
            $tieneColumna = false;
            $qCol = "SHOW COLUMNS FROM adelantos LIKE 'liquidacion_id'";
            $stmtCol = $this->conn->query($qCol);
            if ($stmtCol && $stmtCol->fetch(PDO::FETCH_ASSOC)) {
                $tieneColumna = true;
            }

            if ($tieneColumna) {
                $queryRevAdel = "UPDATE adelantos 
                                 SET estado = 'pendiente', liquidacion_id = NULL
                                 WHERE liquidacion_id = :id";
            } else {
                $queryRevAdel = "UPDATE adelantos 
                                 SET estado = 'pendiente'
                                 WHERE estado = 'aplicado'";
            }
            $stmtRevAdel = $this->conn->prepare($queryRevAdel);
            if ($tieneColumna) {
                $stmtRevAdel->bindParam(':id', $id, PDO::PARAM_INT);
            }
            $stmtRevAdel->execute();

            // Eliminar detalle
            $queryDelDet = "DELETE FROM {$this->tableDetalle} WHERE liquidacion_id = :id";
            $stmtDelDet = $this->conn->prepare($queryDelDet);
            $stmtDelDet->bindParam(':id', $id, PDO::PARAM_INT);
            $stmtDelDet->execute();

            // Eliminar liquidación
            $queryDelete = "DELETE FROM {$this->tableLiquidaciones} WHERE id = :id";
            $stmtDelete = $this->conn->prepare($queryDelete);
            $stmtDelete->bindParam(':id', $id, PDO::PARAM_INT);
            $stmtDelete->execute();

            // Revertir estado del lote
            $queryLote = "UPDATE lotes SET estado = 'proceso' WHERE id = :lote_id";
            $stmtLote = $this->conn->prepare($queryLote);
            $stmtLote->bindParam(':lote_id', $liquidacion['lote_id'], PDO::PARAM_INT);
            $stmtLote->execute();

            $this->conn->commit();

            echo json_encode(["success" => true, "message" => "Liquidación eliminada"]);

        } catch (Exception $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error: " . $e->getMessage()]);
        }
    }

    public function generarComprobante($id) {
        echo json_encode([
            "success" => true,
            "message" => "Función de generación de comprobante en desarrollo",
            "liquidacion_id" => $id
        ]);
    }
}
?>
