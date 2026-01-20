import { ApiService } from "./api-service"
import { API_ENDPOINTS } from "@/lib/config/api"
import type { ControlRentabilidad, ApiResponse } from "@/lib/types"

export const rentabilidadService = {
  async getAll(): Promise<ControlRentabilidad[]> {
    const response = await ApiService.get<ApiResponse<ControlRentabilidad[]>>(API_ENDPOINTS.RENTABILIDAD)
    return response.data
  },

  async getById(id: number): Promise<ControlRentabilidad> {
    const response = await ApiService.get<ApiResponse<ControlRentabilidad>>(API_ENDPOINTS.RENTABILIDAD_BY_ID(id))
    return response.data
  },

  async create(data: Omit<ControlRentabilidad, "id" | "created_at" | "updated_at">): Promise<ControlRentabilidad> {
    const response = await ApiService.post<ApiResponse<ControlRentabilidad>>(API_ENDPOINTS.RENTABILIDAD, data)
    return response.data
  },

  async update(
    id: number,
    data: Partial<Omit<ControlRentabilidad, "id" | "created_at" | "updated_at">>,
  ): Promise<ControlRentabilidad> {
    const response = await ApiService.put<ApiResponse<ControlRentabilidad>>(API_ENDPOINTS.RENTABILIDAD_BY_ID(id), data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await ApiService.delete(API_ENDPOINTS.RENTABILIDAD_BY_ID(id))
  },

  async getByPeriodo(periodo: string): Promise<ControlRentabilidad | null> {
    const rentabilidad = await this.getAll()
    return rentabilidad.find((r) => r.periodo === periodo) || null
  },
}
