import { ApiService } from "./api-service"
import { API_ENDPOINTS } from "@/lib/config/api"
import type { CostoFijo, ApiResponse } from "@/lib/types"

export const costosFijosService = {
  async getAll(): Promise<CostoFijo[]> {
    const response = await ApiService.get<ApiResponse<CostoFijo[]>>(API_ENDPOINTS.COSTOS_FIJOS)
    return response.data
  },

  async getById(id: number): Promise<CostoFijo> {
    const response = await ApiService.get<ApiResponse<CostoFijo>>(API_ENDPOINTS.COSTOS_FIJOS_BY_ID(id))
    return response.data
  },

  async create(data: Omit<CostoFijo, "id" | "created_at" | "updated_at">): Promise<CostoFijo> {
    const response = await ApiService.post<ApiResponse<CostoFijo>>(API_ENDPOINTS.COSTOS_FIJOS, data)
    return response.data
  },

  async update(id: number, data: Partial<Omit<CostoFijo, "id" | "created_at" | "updated_at">>): Promise<CostoFijo> {
    const response = await ApiService.put<ApiResponse<CostoFijo>>(API_ENDPOINTS.COSTOS_FIJOS_BY_ID(id), data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await ApiService.delete(API_ENDPOINTS.COSTOS_FIJOS_BY_ID(id))
  },

  async getCostosActivos(): Promise<CostoFijo[]> {
    const costos = await this.getAll()
    return costos.filter((c) => c.activo)
  },
}
