/**
 * =====================================================
 * SERVICIO PARA KARDEX INTEGRAL
 * =====================================================
 */

import { ApiService } from "./api-service"
import type {
  MovimientoKardexIntegral,
  SaldoFisico,
  SaldoFinanciero,
  MovimientoPorProductor,
  ResumenPorDocumento,
  EstadoCuentaProductor,
  FlujoCaja,
  ReporteInventario,
  RegistrarLiquidacion,
  RegistrarVenta,
  RegistrarAdelanto,
  RegistrarMovimientoManual,
  FiltrosKardex,
  ResponseKardex,
  DashboardKardex,
} from "@/lib/types/kardex-integral"

const BASE_PATH = "/kardex-integral"

class KardexIntegralService {
  /**
   * =====================================================
   * 1. CONSULTAS GENERALES
   * =====================================================
   */

  /**
   * Obtener todos los movimientos con filtros opcionales
   */
  async obtenerMovimientos(filtros?: FiltrosKardex): Promise<{
    movimientos: MovimientoKardexIntegral[]
    pagination: any
  }> {
    const params = new URLSearchParams()

    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      })
    }

    const url = `${BASE_PATH}${params.toString() ? `?${params.toString()}` : ""}`
    const response = await ApiService.get<ResponseKardex<{
      movimientos: MovimientoKardexIntegral[]
      pagination: any
    }>>(url)

    return response.data || { movimientos: [], pagination: {} }
  }

  /**
   * Obtener un movimiento específico
   */
  async obtenerMovimientoPorId(id: number): Promise<MovimientoKardexIntegral | null> {
    try {
      const response = await ApiService.get<ResponseKardex<MovimientoKardexIntegral>>(
        `${BASE_PATH}/${id}`
      )
      return response.data || null
    } catch (error) {
      console.error("Error al obtener movimiento:", error)
      return null
    }
  }

  /**
   * =====================================================
   * 2. SALDOS Y REPORTES
   * =====================================================
   */

  /**
   * Obtener saldos físicos (stock por lote y categoría)
   */
  async obtenerSaldosFisicos(loteId?: number): Promise<SaldoFisico[]> {
    const url = loteId ? `${BASE_PATH}/saldos/fisico?lote_id=${loteId}` : `${BASE_PATH}/saldos/fisico`
    const response = await ApiService.get<ResponseKardex<SaldoFisico[]>>(url)
    return response.data || []
  }

  /**
   * Obtener saldos financieros (cuentas)
   */
  async obtenerSaldosFinancieros(): Promise<SaldoFinanciero[]> {
    const response = await ApiService.get<ResponseKardex<SaldoFinanciero[]>>(
      `${BASE_PATH}/saldos/financiero`
    )
    return response.data || []
  }

  /**
   * Obtener movimientos de un productor
   */
  async obtenerMovimientosPorProductor(productorId: number): Promise<MovimientoPorProductor[]> {
    const response = await ApiService.get<ResponseKardex<MovimientoPorProductor[]>>(
      `${BASE_PATH}/por-productor/${productorId}`
    )
    return response.data || []
  }

  /**
   * Obtener movimientos por documento
   */
  async obtenerMovimientosPorDocumento(
    documentoTipo?: string,
    documentoId?: number
  ): Promise<ResumenPorDocumento[]> {
    const params = new URLSearchParams()
    if (documentoTipo) params.append("documento_tipo", documentoTipo)
    if (documentoId) params.append("documento_id", String(documentoId))

    const url = `${BASE_PATH}/por-documento${params.toString() ? `?${params.toString()}` : ""}`
    const response = await ApiService.get<ResponseKardex<ResumenPorDocumento[]>>(url)
    return response.data || []
  }

  /**
   * =====================================================
   * 3. REGISTRO DE MOVIMIENTOS
   * =====================================================
   */

  /**
   * Registrar liquidación completa (físico + financiero)
   */
  async registrarLiquidacion(data: RegistrarLiquidacion): Promise<boolean> {
    try {
      await ApiService.post(`${BASE_PATH}/liquidacion`, data)
      return true
    } catch (error) {
      console.error("Error al registrar liquidación en kardex:", error)
      return false
    }
  }

  /**
   * Registrar venta (físico + financiero)
   */
  async registrarVenta(data: RegistrarVenta): Promise<boolean> {
    try {
      await ApiService.post(`${BASE_PATH}/venta`, data)
      return true
    } catch (error) {
      console.error("Error al registrar venta en kardex:", error)
      return false
    }
  }

  /**
   * Registrar adelanto (solo financiero)
   */
  async registrarAdelanto(data: RegistrarAdelanto): Promise<boolean> {
    try {
      await ApiService.post(`${BASE_PATH}/adelanto`, data)
      return true
    } catch (error) {
      console.error("Error al registrar adelanto en kardex:", error)
      return false
    }
  }

  /**
   * Registrar movimiento manual (ajustes)
   */
  async registrarMovimientoManual(data: RegistrarMovimientoManual): Promise<MovimientoKardexIntegral | null> {
    try {
      const response = await ApiService.post<ResponseKardex<{ movimiento: MovimientoKardexIntegral }>>(
        `${BASE_PATH}/manual`,
        data
      )
      return response.data?.movimiento || null
    } catch (error) {
      console.error("Error al registrar movimiento manual:", error)
      return null
    }
  }

  /**
   * =====================================================
   * 4. REPORTES ESPECIALES
   * =====================================================
   */

  /**
   * Estado de cuenta completo de un productor
   */
  async obtenerEstadoCuentaProductor(productorId: number): Promise<EstadoCuentaProductor | null> {
    try {
      const response = await ApiService.get<ResponseKardex<EstadoCuentaProductor>>(
        `${BASE_PATH}/reporte/estado-cuenta/${productorId}`
      )
      return response.data || null
    } catch (error) {
      console.error("Error al obtener estado de cuenta:", error)
      return null
    }
  }

  /**
   * Reporte de flujo de caja
   */
  async obtenerFlujoCaja(fechaDesde?: string, fechaHasta?: string): Promise<FlujoCaja | null> {
    try {
      const params = new URLSearchParams()
      if (fechaDesde) params.append("fecha_desde", fechaDesde)
      if (fechaHasta) params.append("fecha_hasta", fechaHasta)

      const url = `${BASE_PATH}/reporte/flujo-caja${params.toString() ? `?${params.toString()}` : ""}`
      const response = await ApiService.get<ResponseKardex<FlujoCaja>>(url)
      return response.data || null
    } catch (error) {
      console.error("Error al obtener flujo de caja:", error)
      return null
    }
  }

  /**
   * Reporte de inventario
   */
  async obtenerReporteInventario(): Promise<ReporteInventario | null> {
    try {
      const response = await ApiService.get<ResponseKardex<ReporteInventario>>(
        `${BASE_PATH}/reporte/inventario`
      )
      return response.data || null
    } catch (error) {
      console.error("Error al obtener reporte de inventario:", error)
      return null
    }
  }

  /**
   * =====================================================
   * 5. DASHBOARD
   * =====================================================
   */

  /**
   * Obtener datos para el dashboard
   */
  async obtenerDashboard(): Promise<DashboardKardex | null> {
    try {
      // Obtener datos en paralelo
      const [saldosFisicos, saldosFinancieros, inventario, movimientos] = await Promise.all([
        this.obtenerSaldosFisicos(),
        this.obtenerSaldosFinancieros(),
        this.obtenerReporteInventario(),
        this.obtenerMovimientos({ limit: 10 }),
      ])

      // Calcular resumen físico
      const resumen_fisico = {
        total_stock_kg: saldosFisicos.reduce((sum, s) => sum + s.saldo_actual, 0),
        total_lotes_activos: new Set(saldosFisicos.map((s) => s.lote_id)).size,
        total_categorias: new Set(saldosFisicos.map((s) => s.categoria_id)).size,
        valor_inventario: inventario?.resumen.valor_total || 0,
      }

      // Calcular resumen financiero
      const saldoBanco = saldosFinancieros.find((s) => s.cuenta_tipo === "banco")?.saldo_actual || 0
      const saldoCaja = saldosFinancieros.find((s) => s.cuenta_tipo === "caja")?.saldo_actual || 0
      const saldoVentas = saldosFinancieros.find((s) => s.cuenta_tipo === "ventas")?.saldo_actual || 0

      // Filtrar movimientos financieros del mes actual
      const mesActual = new Date().toISOString().slice(0, 7)
      const movimientosFinancieros = movimientos.movimientos.filter(
        (m) => m.tipo_kardex === "financiero" && m.fecha_movimiento.startsWith(mesActual)
      )

      const totalVentasMes = movimientosFinancieros
        .filter((m) => m.documento_tipo === "venta" && m.tipo_movimiento === "ingreso")
        .reduce((sum, m) => sum + (m.monto || 0), 0)

      const totalPagosMes = movimientosFinancieros
        .filter((m) => m.documento_tipo === "liquidacion" && m.tipo_movimiento === "egreso")
        .reduce((sum, m) => sum + (m.monto || 0), 0)

      const resumen_financiero = {
        saldo_banco: saldoBanco,
        saldo_caja: saldoCaja,
        total_ventas_mes: totalVentasMes,
        total_pagos_mes: totalPagosMes,
        flujo_neto_mes: totalVentasMes - totalPagosMes,
      }

      // Generar alertas
      const alertas = []
      if (saldoBanco < 5000) {
        alertas.push({
          tipo: "warning" as const,
          mensaje: "Saldo en banco bajo (menos de S/. 5,000)",
          fecha: new Date().toISOString(),
        })
      }
      if (resumen_fisico.total_stock_kg < 100) {
        alertas.push({
          tipo: "warning" as const,
          mensaje: "Stock total bajo (menos de 100 kg)",
          fecha: new Date().toISOString(),
        })
      }

      // Generar datos para gráficos
      const stock_por_categoria = saldosFisicos.map((s) => ({
        categoria: s.categoria_nombre,
        peso: s.saldo_actual,
        valor: s.saldo_actual * 5, // Estimado
      }))

      return {
        resumen_fisico,
        resumen_financiero,
        movimientos_recientes: movimientos.movimientos,
        alertas,
        graficos: {
          movimientos_diarios: [],
          stock_por_categoria,
          flujo_mensual: [],
        },
      }
    } catch (error) {
      console.error("Error al obtener dashboard:", error)
      return null
    }
  }

  /**
   * =====================================================
   * 6. UTILIDADES
   * =====================================================
   */

  /**
   * Eliminar movimiento manual
   */
  async eliminarMovimiento(id: number): Promise<boolean> {
    try {
      await ApiService.delete(`${BASE_PATH}/${id}`)
      return true
    } catch (error) {
      console.error("Error al eliminar movimiento:", error)
      return false
    }
  }

  /**
   * Verificar si hay stock disponible
   */
  async verificarStock(loteId: number, categoriaId: number, pesoRequerido: number): Promise<boolean> {
    try {
      const saldos = await this.obtenerSaldosFisicos(loteId)
      const saldo = saldos.find((s) => s.categoria_id === categoriaId)
      return saldo ? saldo.saldo_actual >= pesoRequerido : false
    } catch (error) {
      console.error("Error al verificar stock:", error)
      return false
    }
  }

  /**
   * Verificar fondos disponibles
   */
  async verificarFondos(cuentaTipo: string, montoRequerido: number): Promise<boolean> {
    try {
      const saldos = await this.obtenerSaldosFinancieros()
      const saldo = saldos.find((s) => s.cuenta_tipo === cuentaTipo)
      return saldo ? saldo.saldo_actual >= montoRequerido : false
    } catch (error) {
      console.error("Error al verificar fondos:", error)
      return false
    }
  }
}

export const kardexIntegralService = new KardexIntegralService()
export default kardexIntegralService
