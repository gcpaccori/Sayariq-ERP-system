import { ApiService } from "./api-service"

export type CategoriaPeso = {
  id: number
  codigo: string
  nombre: string
}

class CategoriasPesoService {
  async getAll(): Promise<CategoriaPeso[]> {
    console.log("[v0] CategoriasPesoService.getAll()")
    const response = await ApiService.get<any>("/categorias-peso")

    if (Array.isArray(response)) {
      return response.map((row) => ({
        id: Number(row.id),
        codigo: String(row.codigo ?? ""),
        nombre: String(row.nombre ?? ""),
      }))
    }

    if (response?.data && Array.isArray(response.data)) {
      return response.data.map((row: any) => ({
        id: Number(row.id),
        codigo: String(row.codigo ?? ""),
        nombre: String(row.nombre ?? ""),
      }))
    }

    console.warn("[CategoriasPesoService] Respuesta inesperada:", response)
    return []
  }
}

export const categoriasPesoService = new CategoriasPesoService()
