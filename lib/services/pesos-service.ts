import { ApiService } from "./api-service"
import { API_ENDPOINTS } from "@/lib/config/api"
import type { Peso, ApiResponse } from "@/lib/types"

export class PesosService {
  async getAll(): Promise<Peso[]> {
    const response = await ApiService.get<ApiResponse<Peso[]>>(API_ENDPOINTS.PESOS)
    return response.data
  }

  async getById(id: number): Promise<Peso> {
    const response = await ApiService.get<ApiResponse<Peso>>(API_ENDPOINTS.PESOS_BY_ID(id))
    return response.data
  }

  async create(data: Omit<Peso, "id" | "created_at" | "updated_at">): Promise<Peso> {
    const response = await ApiService.post<ApiResponse<Peso>>(API_ENDPOINTS.PESOS, data)
    return response.data
  }

  async update(id: number, data: Partial<Omit<Peso, "id" | "created_at" | "updated_at">>): Promise<Peso> {
    const response = await ApiService.put<ApiResponse<Peso>>(API_ENDPOINTS.PESOS_BY_ID(id), data)
    return response.data
  }

  async delete(id: number): Promise<void> {
    await ApiService.delete(API_ENDPOINTS.PESOS_BY_ID(id))
  }

  async getPesosByLote(loteId: number): Promise<Peso[]> {
    const pesos = await this.getAll()
    return pesos.filter((p) => p.lote_id === loteId)
  }
}

export const pesosService = new PesosService()
