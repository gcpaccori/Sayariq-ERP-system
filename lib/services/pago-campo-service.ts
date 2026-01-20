import { ApiService } from "./api-service"
import { API_ENDPOINTS } from "@/lib/config/api"
import type { RegistroPagoCampo, ApiResponse } from "@/lib/types"

export const pagoCampoService = {
  async getAll(): Promise<RegistroPagoCampo[]> {
    const response = await ApiService.get<ApiResponse<RegistroPagoCampo[]>>(API_ENDPOINTS.PAGO_CAMPO)
    return response.data
  },

  async getById(id: number): Promise<RegistroPagoCampo> {
    const response = await ApiService.get<ApiResponse<RegistroPagoCampo>>(API_ENDPOINTS.PAGO_CAMPO_BY_ID(id))
    return response.data
  },

  async create(data: Omit<RegistroPagoCampo, "id" | "created_at" | "updated_at">): Promise<RegistroPagoCampo> {
    const response = await ApiService.post<ApiResponse<RegistroPagoCampo>>(API_ENDPOINTS.PAGO_CAMPO, data)
    return response.data
  },

  async update(
    id: number,
    data: Partial<Omit<RegistroPagoCampo, "id" | "created_at" | "updated_at">>,
  ): Promise<RegistroPagoCampo> {
    const response = await ApiService.put<ApiResponse<RegistroPagoCampo>>(API_ENDPOINTS.PAGO_CAMPO_BY_ID(id), data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await ApiService.delete(API_ENDPOINTS.PAGO_CAMPO_BY_ID(id))
  },

  async getPagosByProductor(productorId: number): Promise<RegistroPagoCampo[]> {
    const pagos = await this.getAll()
    return pagos.filter((p) => p.productor_id === productorId)
  },

  async getPagosByLote(loteId: number): Promise<RegistroPagoCampo[]> {
    const pagos = await this.getAll()
    return pagos.filter((p) => p.lote_id === loteId)
  },
}
