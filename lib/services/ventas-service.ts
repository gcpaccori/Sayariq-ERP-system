import { ApiService } from "./api-service"
import { API_ENDPOINTS } from "@/lib/config/api"
import type { VentaCliente, ApiResponse } from "@/lib/types"

export type VentaLoteDetallePayload = {
  lote_id: number
  categoria_id?: number | null
  categoria?: string
  kg_vendido: number
  precio_unitario?: number
}

export type VentaPedidoPayload = {
  pedido_id: number
  fecha_venta?: string
  observaciones?: string
  precio?: number
  lotes: VentaLoteDetallePayload[]
}

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

  async createPedidoVenta(payload: VentaPedidoPayload): Promise<{ id: number; message?: string }> {
    const response = await ApiService.post<{ id: number; message?: string }>(API_ENDPOINTS.VENTAS, payload)
    return response
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

  async getVentasByPedido(pedidoId: number): Promise<VentaCliente[]> {
    const response = await ApiService.get<ApiResponse<VentaCliente[]>>(`${API_ENDPOINTS.VENTAS}/por-pedido?pedido_id=${pedidoId}`)
    return Array.isArray(response) ? response : response.data
  },

  async getLotesVendidosByPedido(
    pedidoId: number,
  ): Promise<Array<{ lote_id: number; categoria_id?: number | null; categoria?: string; kg_vendido: number }>> {
    const response = await ApiService.get<any>(`${API_ENDPOINTS.VENTAS}/pedido-lotes?pedido_id=${pedidoId}`)
    const rows = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : []
    return rows.map((row) => ({
      lote_id: Number(row.lote_id),
      categoria_id: row.categoria_id ? Number(row.categoria_id) : null,
      categoria: row.categoria || "",
      kg_vendido: Number(row.kg_vendido) || 0,
    }))
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
