import { ApiService } from "./api-service"
import { API_ENDPOINTS } from "@/lib/config/api"
import type { AjusteContable, ApiResponse } from "@/lib/types"

export const ajusteContableService = {
  async getAll(): Promise<AjusteContable[]> {
    const response = await ApiService.get<ApiResponse<AjusteContable[]>>(API_ENDPOINTS.AJUSTE_CONTABLE)
    return response.data
  },

  async getById(id: number): Promise<AjusteContable> {
    const response = await ApiService.get<ApiResponse<AjusteContable>>(API_ENDPOINTS.AJUSTE_CONTABLE_BY_ID(id))
    return response.data
  },

  async create(data: Omit<AjusteContable, "id" | "created_at" | "updated_at">): Promise<AjusteContable> {
    const response = await ApiService.post<ApiResponse<AjusteContable>>(API_ENDPOINTS.AJUSTE_CONTABLE, data)
    return response.data
  },

  async update(
    id: number,
    data: Partial<Omit<AjusteContable, "id" | "created_at" | "updated_at">>,
  ): Promise<AjusteContable> {
    const response = await ApiService.put<ApiResponse<AjusteContable>>(API_ENDPOINTS.AJUSTE_CONTABLE_BY_ID(id), data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await ApiService.delete(API_ENDPOINTS.AJUSTE_CONTABLE_BY_ID(id))
  },

  async getByFecha(fechaInicio: string, fechaFin: string): Promise<AjusteContable[]> {
    const ajustes = await this.getAll()
    return ajustes.filter((a) => a.fecha >= fechaInicio && a.fecha <= fechaFin)
  },

  async getByTipo(tipo: string): Promise<AjusteContable[]> {
    const ajustes = await this.getAll()
    return ajustes.filter((a) => a.tipo === tipo)
  },
}
