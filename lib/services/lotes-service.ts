import { ApiService } from "./api-service"
import { API_ENDPOINTS } from "@/lib/config/api"
import type { Lote } from "@/lib/types"

export class LotesService {
  async getAll(): Promise<Lote[]> {
    console.log("[v0] LotesService: getAll() called")
    const response = await ApiService.get<Lote[]>(API_ENDPOINTS.LOTES)
    console.log("[v0] LotesService: Response received", {
      isArray: Array.isArray(response),
      count: Array.isArray(response) ? response.length : 0,
    })
    return response
  }

  async getById(id: number): Promise<Lote> {
    const response = await ApiService.get<Lote>(API_ENDPOINTS.LOTES_BY_ID(id))
    return response
  }

  async create(data: Omit<Lote, "id" | "created_at" | "updated_at">): Promise<Lote> {
    const response = await ApiService.post<Lote>(API_ENDPOINTS.LOTES, data)
    return response
  }

  async update(id: number, data: Partial<Omit<Lote, "id" | "created_at" | "updated_at">>): Promise<Lote> {
    const response = await ApiService.put<Lote>(API_ENDPOINTS.LOTES_BY_ID(id), data)
    return response
  }

  async delete(id: number): Promise<void> {
    await ApiService.delete(API_ENDPOINTS.LOTES_BY_ID(id))
  }

  async getLotesDisponibles(): Promise<Lote[]> {
    const lotes = await this.getAll()
    return lotes.filter((l) => l.estado !== "completado" && l.peso_neto > 0)
  }

  async getLotesByProductor(productorId: number): Promise<Lote[]> {
    const lotes = await this.getAll()
    return lotes.filter((l) => l.productor_id === productorId)
  }

  async getLotesByEstado(estado: string): Promise<Lote[]> {
    const lotes = await this.getAll()
    return lotes.filter((l) => l.estado === estado)
  }

  async generarCodigoLote(): Promise<string> {
    const lotes = await this.getAll()
    const año = new Date().getFullYear()
    const lotesDelAño = lotes.filter((l) => {
      const codigo = l.codigo || l.numero_lote || ""
      return typeof codigo === 'string' && codigo.startsWith(`LOT-${año}`)
    })
    const numero = lotesDelAño.length + 1
    return `LOT-${año}-${numero.toString().padStart(3, "0")}`
  }
}

export const lotesService = new LotesService()
