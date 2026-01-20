import { ApiService } from "./api-service"
import { API_ENDPOINTS } from "@/lib/config/api"
import type { VentaCliente, ApiResponse } from "@/lib/types"

export const ventasService = {
  async getAll(): Promise<VentaCliente[]> {
    const response = await ApiService.get<ApiResponse<VentaCliente[]>>(API_ENDPOINTS.VENTAS)
    return response.data
  },

  async getById(id: number): Promise<VentaCliente> {
    const response = await ApiService.get<ApiResponse<VentaCliente>>(API_ENDPOINTS.VENTAS_BY_ID(id))
    return response.data
  },

  async create(data: Omit<VentaCliente, "id" | "created_at" | "updated_at">): Promise<VentaCliente> {
    const response = await ApiService.post<ApiResponse<VentaCliente>>(API_ENDPOINTS.VENTAS, data)
    return response.data
  },

  async update(
    id: number,
    data: Partial<Omit<VentaCliente, "id" | "created_at" | "updated_at">>,
  ): Promise<VentaCliente> {
    const response = await ApiService.put<ApiResponse<VentaCliente>>(API_ENDPOINTS.VENTAS_BY_ID(id), data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await ApiService.delete(API_ENDPOINTS.VENTAS_BY_ID(id))
  },

  async getVentasByEstado(estado: string): Promise<VentaCliente[]> {
    const ventas = await this.getAll()
    return ventas.filter((v) => v.estado === estado)
  },

  async generarCodigoVenta(): Promise<string> {
    const ventas = await this.getAll()
    const año = new Date().getFullYear()
    const ventasDelAño = ventas.filter((v) => v.codigo.startsWith(`VTA-${año}`))
    const numero = ventasDelAño.length + 1
    return `VTA-${año}-${numero.toString().padStart(3, "0")}`
  },
}
