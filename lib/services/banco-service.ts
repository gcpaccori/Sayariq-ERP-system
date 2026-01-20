import { ApiService } from "./api-service"
import { API_ENDPOINTS } from "@/lib/config/api"
import type { TransaccionBanco } from "@/lib/types"

export const bancoService = {
  async getAll() {
    try {
      const response = await ApiService.get<TransaccionBanco[]>(API_ENDPOINTS.BANCO)
      console.log("[v0] Banco - Transacciones obtenidas:", response)

      // Transform backend data to frontend format
      return response.map((item: any) => ({
        id: item.id || 0,
        fecha: item.fecha || "",
        operacion: item.operacion || "",
        de_quien: item.de_quien || "",
        a_quien: item.a_quien || "",
        motivo: item.motivo || "",
        rubro: item.rubro || "",
        tipo_operacion: item.tipo_operacion || "",
        numero_operacion: item.numero_operacion || "",
        comprobante: item.comprobante || "",
        deudor: item.deudor || "0.00",
        acreedor: item.acreedor || "0.00",
        estado: item.estado || "pendiente",
        agricultor: item.agricultor || null,
        created_at: item.created_at,
      })) as TransaccionBanco[]
    } catch (error) {
      console.error("[v0] Error al obtener transacciones:", error)
      throw error
    }
  },

  async create(data: Omit<TransaccionBanco, "id" | "created_at" | "updated_at">) {
    try {
      console.log("[v0] Banco - Creando transacción:", data)
      const response = await ApiService.post<TransaccionBanco>(API_ENDPOINTS.BANCO, data)
      console.log("[v0] Banco - Transacción creada:", response)
      return response
    } catch (error) {
      console.error("[v0] Error al crear transacción:", error)
      throw error
    }
  },

  async update(id: number, data: Partial<TransaccionBanco>) {
    try {
      console.log("[v0] Banco - Actualizando transacción:", id, data)
      const response = await ApiService.put<TransaccionBanco>(API_ENDPOINTS.BANCO_BY_ID(id), data)
      console.log("[v0] Banco - Transacción actualizada:", response)
      return response
    } catch (error) {
      console.error("[v0] Error al actualizar transacción:", error)
      throw error
    }
  },

  async delete(id: number) {
    try {
      console.log("[v0] Banco - Eliminando transacción:", id)
      await ApiService.delete(API_ENDPOINTS.BANCO_BY_ID(id))
      console.log("[v0] Banco - Transacción eliminada")
    } catch (error) {
      console.error("[v0] Error al eliminar transacción:", error)
      throw error
    }
  },

  async updateEstado(id: number, estado: string) {
    try {
      return await this.update(id, { estado: estado as any })
    } catch (error) {
      console.error("[v0] Error al actualizar estado:", error)
      throw error
    }
  },
}
