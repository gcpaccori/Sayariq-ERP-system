<?php
/**
 * =====================================================
 * HELPER PARA KARDEX INTEGRAL
 * =====================================================
 * Funciones reutilizables para registrar movimientos
 * en el kardex integral desde cualquier controlador
 * =====================================================
 */

class KardexIntegralHelper {
    private $conn;
    
    public function __construct($db) {
        $this->conn = $db;
    }
    
    /**
     * Registrar liquidación completa en kardex integral
     * (movimiento físico + movimiento financiero)
     */
    public function registrarLiquidacion(array $data) {
        try {
            // 1. MOVIMIENTO FÍSICO - Egreso de productos
            if (isset($data['peso_total']) && $data['peso_total'] > 0) {
                $this->insertarMovimiento([
                    'fecha_movimiento' => $data['fecha_liquidacion'] ?? date('Y-m-d H:i:s'),
                    'tipo_kardex' => 'fisico',
                    'tipo_movimiento' => 'egreso',
                    'documento_tipo' => 'liquidacion',
                    'documento_id' => $data['liquidacion_id'],
                    'documento_numero' => $data['numero_liquidacion'] ?? null,
                    'lote_id' => $data['lote_id'] ?? null,
                    'categoria_id' => $data['categoria_id'] ?? null,
                    'categoria_nombre' => $data['categoria_nombre'] ?? 'MIXTO',
                    'peso_kg' => $data['peso_total'],
                    'persona_id' => $data['productor_id'] ?? null,
                    'persona_nombre' => $data['productor_nombre'] ?? null,
                    'persona_tipo' => 'productor',
                    'concepto' => "Liquidación {$data['numero_liquidacion']} - Lote {$data['lote_nombre']}",
                    'observaciones' => $data['observaciones'] ?? null
                ]);
            }
            
            // 2. MOVIMIENTO FINANCIERO - Egreso de dinero (pago al productor)
            if (isset($data['total_pagar']) && $data['total_pagar'] > 0) {
                $this->insertarMovimiento([
                    'fecha_movimiento' => $data['fecha_liquidacion'] ?? date('Y-m-d H:i:s'),
                    'tipo_kardex' => 'financiero',
                    'tipo_movimiento' => 'egreso',
                    'documento_tipo' => 'liquidacion',
                    'documento_id' => $data['liquidacion_id'],
                    'documento_numero' => $data['numero_liquidacion'] ?? null,
                    'lote_id' => $data['lote_id'] ?? null,
                    'cuenta_tipo' => $data['forma_pago'] ?? 'banco', // banco, caja
                    'monto' => $data['total_pagar'],
                    'persona_id' => $data['productor_id'] ?? null,
                    'persona_nombre' => $data['productor_nombre'] ?? null,
                    'persona_tipo' => 'productor',
                    'concepto' => "Pago liquidación {$data['numero_liquidacion']}"
                ]);
            }
            
            return true;
        } catch (Exception $e) {
            error_log("Error en registrarLiquidacion: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Registrar venta en kardex integral
     * (movimiento físico salida + movimiento financiero ingreso)
     */
    public function registrarVenta(array $data) {
        try {
            // 1. MOVIMIENTO FÍSICO - Salida de productos
            if (isset($data['peso_kg']) && $data['peso_kg'] > 0) {
                $this->insertarMovimiento([
                    'fecha_movimiento' => $data['fecha_venta'] ?? date('Y-m-d H:i:s'),
                    'tipo_kardex' => 'fisico',
                    'tipo_movimiento' => 'salida',
                    'documento_tipo' => 'venta',
                    'documento_id' => $data['venta_id'],
                    'documento_numero' => $data['numero_factura'] ?? null,
                    'lote_id' => $data['lote_id'] ?? null,
                    'categoria_id' => $data['categoria_id'] ?? null,
                    'categoria_nombre' => $data['categoria_nombre'] ?? null,
                    'peso_kg' => $data['peso_kg'],
                    'persona_id' => $data['cliente_id'] ?? null,
                    'persona_nombre' => $data['cliente_nombre'] ?? null,
                    'persona_tipo' => 'cliente',
                    'concepto' => "Venta {$data['numero_factura']} - {$data['categoria_nombre']}"
                ]);
            }
            
            // 2. MOVIMIENTO FINANCIERO - Ingreso de dinero
            if (isset($data['monto_total']) && $data['monto_total'] > 0) {
                $this->insertarMovimiento([
                    'fecha_movimiento' => $data['fecha_venta'] ?? date('Y-m-d H:i:s'),
                    'tipo_kardex' => 'financiero',
                    'tipo_movimiento' => 'ingreso',
                    'documento_tipo' => 'venta',
                    'documento_id' => $data['venta_id'],
                    'documento_numero' => $data['numero_factura'] ?? null,
                    'cuenta_tipo' => $data['forma_pago'] ?? 'banco',
                    'monto' => $data['monto_total'],
                    'persona_id' => $data['cliente_id'] ?? null,
                    'persona_nombre' => $data['cliente_nombre'] ?? null,
                    'persona_tipo' => 'cliente',
                    'concepto' => "Cobro venta {$data['numero_factura']}"
                ]);
            }
            
            return true;
        } catch (Exception $e) {
            error_log("Error en registrarVenta: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Registrar adelanto en kardex integral
     * (solo movimiento financiero - egreso)
     */
    public function registrarAdelanto(array $data) {
        try {
            if (!isset($data['monto']) || $data['monto'] <= 0) {
                return false;
            }
            
            $this->insertarMovimiento([
                'fecha_movimiento' => $data['fecha_adelanto'] ?? date('Y-m-d H:i:s'),
                'tipo_kardex' => 'financiero',
                'tipo_movimiento' => 'egreso',
                'documento_tipo' => 'adelanto',
                'documento_id' => $data['adelanto_id'],
                'cuenta_tipo' => 'caja', // Adelantos normalmente en efectivo
                'monto' => $data['monto'],
                'persona_id' => $data['productor_id'] ?? null,
                'persona_nombre' => $data['productor_nombre'] ?? null,
                'persona_tipo' => 'productor',
                'concepto' => "Adelanto a {$data['productor_nombre']}",
                'observaciones' => $data['motivo'] ?? null
            ]);
            
            return true;
        } catch (Exception $e) {
            error_log("Error en registrarAdelanto: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Registrar pesaje/clasificación en kardex integral
     * (solo movimiento físico - ingreso)
     */
    public function registrarPesaje(array $data) {
        try {
            if (!isset($data['peso_kg']) || $data['peso_kg'] <= 0) {
                return false;
            }
            
            $this->insertarMovimiento([
                'fecha_movimiento' => $data['fecha_registro'] ?? date('Y-m-d H:i:s'),
                'tipo_kardex' => 'fisico',
                'tipo_movimiento' => 'ingreso',
                'documento_tipo' => 'pesaje',
                'documento_id' => $data['peso_id'],
                'lote_id' => $data['lote_id'] ?? null,
                'categoria_id' => $data['categoria_id'] ?? null,
                'categoria_nombre' => $data['categoria_nombre'] ?? null,
                'peso_kg' => $data['peso_kg'],
                'persona_id' => $data['productor_id'] ?? null,
                'persona_nombre' => $data['productor_nombre'] ?? null,
                'persona_tipo' => 'productor',
                'concepto' => "Pesaje categoría {$data['categoria_nombre']} - Lote {$data['lote_nombre']}"
            ]);
            
            return true;
        } catch (Exception $e) {
            error_log("Error en registrarPesaje: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Insertar movimiento en kardex_integral
     * (función base privada)
     */
    private function insertarMovimiento(array $data) {
        // Calcular saldos antes de insertar
        $saldoFisico = null;
        $saldoFinanciero = null;
        
        if ($data['tipo_kardex'] === 'fisico') {
            $saldoFisico = $this->calcularSaldoFisico(
                $data['lote_id'] ?? null,
                $data['categoria_id'] ?? null
            );
            
            // Aplicar el movimiento
            if ($data['tipo_movimiento'] === 'ingreso') {
                $saldoFisico += $data['peso_kg'];
            } else {
                $saldoFisico -= $data['peso_kg'];
            }
        }
        
        if ($data['tipo_kardex'] === 'financiero') {
            $saldoFinanciero = $this->calcularSaldoFinanciero(
                $data['cuenta_tipo'] ?? 'banco'
            );
            
            // Aplicar el movimiento
            if ($data['tipo_movimiento'] === 'ingreso') {
                $saldoFinanciero += $data['monto'];
            } else {
                $saldoFinanciero -= $data['monto'];
            }
        }
        
        $query = "INSERT INTO kardex_integral (
            fecha_movimiento, tipo_kardex, tipo_movimiento, documento_tipo,
            documento_id, documento_numero, lote_id, categoria_id, categoria_nombre,
            peso_kg, saldo_fisico_kg, cuenta_tipo, monto, saldo_financiero,
            persona_id, persona_nombre, persona_tipo, concepto, observaciones,
            usuario_registro, created_at
        ) VALUES (
            :fecha_movimiento, :tipo_kardex, :tipo_movimiento, :documento_tipo,
            :documento_id, :documento_numero, :lote_id, :categoria_id, :categoria_nombre,
            :peso_kg, :saldo_fisico_kg, :cuenta_tipo, :monto, :saldo_financiero,
            :persona_id, :persona_nombre, :persona_tipo, :concepto, :observaciones,
            :usuario_registro, NOW()
        )";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute([
            ':fecha_movimiento' => $data['fecha_movimiento'] ?? date('Y-m-d H:i:s'),
            ':tipo_kardex' => $data['tipo_kardex'],
            ':tipo_movimiento' => $data['tipo_movimiento'],
            ':documento_tipo' => $data['documento_tipo'],
            ':documento_id' => $data['documento_id'] ?? null,
            ':documento_numero' => $data['documento_numero'] ?? null,
            ':lote_id' => $data['lote_id'] ?? null,
            ':categoria_id' => $data['categoria_id'] ?? null,
            ':categoria_nombre' => $data['categoria_nombre'] ?? null,
            ':peso_kg' => $data['peso_kg'] ?? null,
            ':saldo_fisico_kg' => $saldoFisico,
            ':cuenta_tipo' => $data['cuenta_tipo'] ?? null,
            ':monto' => $data['monto'] ?? null,
            ':saldo_financiero' => $saldoFinanciero,
            ':persona_id' => $data['persona_id'] ?? null,
            ':persona_nombre' => $data['persona_nombre'] ?? null,
            ':persona_tipo' => $data['persona_tipo'] ?? null,
            ':concepto' => $data['concepto'] ?? '',
            ':observaciones' => $data['observaciones'] ?? null,
            ':usuario_registro' => $data['usuario_registro'] ?? 'sistema'
        ]);
    }
    
    /**
     * Calcular saldo físico actual
     */
    private function calcularSaldoFisico($loteId, $categoriaId) {
        $where = ["tipo_kardex = 'fisico'"];
        $params = [];
        
        if ($loteId) {
            $where[] = "lote_id = :lote_id";
            $params[':lote_id'] = $loteId;
        }
        if ($categoriaId) {
            $where[] = "categoria_id = :categoria_id";
            $params[':categoria_id'] = $categoriaId;
        }
        
        $whereClause = implode(' AND ', $where);
        
        $query = "SELECT 
            COALESCE(SUM(CASE WHEN tipo_movimiento = 'ingreso' THEN peso_kg ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN tipo_movimiento IN ('egreso', 'salida') THEN peso_kg ELSE 0 END), 0) as saldo
            FROM kardex_integral
            WHERE {$whereClause}";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute($params);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $row ? (float)$row['saldo'] : 0.0;
    }
    
    /**
     * Calcular saldo financiero actual por cuenta
     */
    private function calcularSaldoFinanciero($cuentaTipo) {
        $query = "SELECT 
            COALESCE(SUM(CASE WHEN tipo_movimiento = 'ingreso' THEN monto ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN tipo_movimiento = 'egreso' THEN monto ELSE 0 END), 0) as saldo
            FROM kardex_integral
            WHERE tipo_kardex = 'financiero' AND cuenta_tipo = :cuenta_tipo";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute([':cuenta_tipo' => $cuentaTipo]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $row ? (float)$row['saldo'] : 0.0;
    }
}
