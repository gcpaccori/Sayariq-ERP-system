import { ApiService } from "./api-service"
import { API_ENDPOINTS } from "@/lib/config/api"
import type { MovimientoKardex, SaldoKardex, ApiResponse } from "@/lib/types"

export const kardexService = {
  async getAll() {
    return this.obtenerTodosLosMovimientos()
  },

  async registrarMovimiento(datos: Omit<MovimientoKardex, "id" | "created_at" | "updated_at" | "saldo">) {
    try {
      const response = await ApiService.post<ApiResponse<MovimientoKardex>>(API_ENDPOINTS.KARDEX, datos)
      return response.data
    } catch (error) {
      console.error("Error al registrar movimiento kardex:", error)
      throw error
    }
  },

  async obtenerMovimientosLote(loteId: number) {
    try {
      const response = await ApiService.get<ApiResponse<MovimientoKardex[]>>(API_ENDPOINTS.KARDEX)
      const movimientos = response.data.filter((m) => m.lote_id === loteId)
      return movimientos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    } catch (error) {
      console.error("Error al obtener movimientos:", error)
      throw error
    }
  },

  async obtenerSaldoLote(loteId: number): Promise<SaldoKardex> {
    try {
      const movimientos = await this.obtenerMovimientosLote(loteId)

      if (movimientos.length === 0) {
        return {
          id: 0,
          lote_id: loteId,
          saldo_actual: 0,
          ultima_actualizacion: new Date().toISOString(),
        }
      }

      const ultimoMovimiento = movimientos[0]
      return {
        id: 0,
        lote_id: loteId,
        saldo_actual: ultimoMovimiento.saldo,
        ultima_actualizacion: ultimoMovimiento.fecha,
      }
    } catch (error) {
      console.error("Error al obtener saldo:", error)
      return {
        id: 0,
        lote_id: loteId,
        saldo_actual: 0,
        ultima_actualizacion: new Date().toISOString(),
      }
    }
  },

  async obtenerTodosLosMovimientos() {
    try {
      const response = await ApiService.get<ApiResponse<MovimientoKardex[]>>(API_ENDPOINTS.KARDEX)
      return response.data.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    } catch (error) {
      console.error("Error al obtener todos los movimientos:", error)
      return []
    }
  },
}
