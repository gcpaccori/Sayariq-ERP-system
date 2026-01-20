import { ApiService } from "./api-service"
import { API_ENDPOINTS } from "@/lib/config/api"

export interface KardexMovimiento {
  lote_id: number
  tipo_movimiento: "ingreso" | "salida"
  categoria: "exportable" | "industrial" | "descarte"
  peso: number
  fecha_movimiento: string
  referencia: string
  saldo_categoria: number
}

export class KardexAutomaticoService {
  // Registrar ingreso automático cuando se clasifican pesos
  async registrarIngresoAutomatico(
    lote_id: number,
    datos: {
      peso_exportable: number
      peso_industrial: number
      peso_descarte: number
      fecha: string
    }
  ): Promise<void> {
    try {
      await ApiService.post(`${API_ENDPOINTS.BASE}/kardex/ingreso-automatico`, {
        lote_id,
        ...datos,
      })
    } catch (error) {
      console.error("[v0] Error registrando ingreso automático al kardex:", error)
      throw error
    }
  }

  // Registrar salida automática cuando se vende
  async registrarSalidaAutomatica(
    lote_id: number,
    categoria: "exportable" | "industrial" | "descarte",
    peso: number,
    referencia: string,
    fecha: string
  ): Promise<void> {
    try {
      await ApiService.post(`${API_ENDPOINTS.BASE}/kardex/salida-automatica`, {
        lote_id,
        categoria,
        peso,
        referencia,
        fecha,
      })
    } catch (error) {
      console.error("[v0] Error registrando salida automática del kardex:", error)
      throw error
    }
  }

  // Obtener saldo disponible por categoría para un lote
  async obtenerSaldoDisponible(lote_id: number): Promise<{
    exportable: number
    industrial: number
    descarte: number
  }> {
    try {
      const response = await ApiService.get<{
        exportable: number
        industrial: number
        descarte: number
      }>(`${API_ENDPOINTS.BASE}/kardex/saldo/${lote_id}`)
      return response
    } catch (error) {
      console.error("[v0] Error obteniendo saldo disponible:", error)
      return { exportable: 0, industrial: 0, descarte: 0 }
    }
  }
}

export const kardexAutomaticoService = new KardexAutomaticoService()
