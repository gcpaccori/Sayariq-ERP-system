import { ApiService } from "./api-service"
import { API_ENDPOINTS } from "@/lib/config/api"
import type { Categoria } from "@/lib/types"

class CategoriasService {
  async obtenerCategorias(): Promise<Categoria[]> {
    try {
      console.log("[v0] CategoriasService: Obteniendo categorías")
      const response = await ApiService.get<Categoria[]>(API_ENDPOINTS.CATEGORIAS)
      console.log("[v0] CategoriasService: Categorías obtenidas", {
        count: Array.isArray(response) ? response.length : 0,
      })
      return Array.isArray(response) ? response : []
    } catch (error) {
      console.error("[v0] Error al obtener categorías:", error)
      return []
    }
  }

  async obtenerCategoriasActivas(): Promise<Categoria[]> {
    try {
      const categorias = await this.obtenerCategorias()
      return categorias.filter((c) => c.estado === "activo")
    } catch (error) {
      console.error("[v0] Error al obtener categorías activas:", error)
      return []
    }
  }

  async obtenerCategoriaPorId(id: number): Promise<Categoria | null> {
    try {
      const response = await ApiService.get<Categoria>(API_ENDPOINTS.CATEGORIAS_BY_ID(id))
      return response || null
    } catch (error) {
      console.error("[v0] Error al obtener categoría:", error)
      return null
    }
  }

  async crearCategoria(categoria: Omit<Categoria, "id" | "created_at" | "updated_at">): Promise<Categoria | null> {
    try {
      const response = await ApiService.post<Categoria>(API_ENDPOINTS.CATEGORIAS, categoria)
      return response || null
    } catch (error) {
      console.error("[v0] Error al crear categoría:", error)
      return null
    }
  }

  async actualizarCategoria(id: number, updates: Partial<Categoria>): Promise<Categoria | null> {
    try {
      const response = await ApiService.put<Categoria>(API_ENDPOINTS.CATEGORIAS_BY_ID(id), updates)
      return response || null
    } catch (error) {
      console.error("[v0] Error al actualizar categoría:", error)
      return null
    }
  }

  async eliminarCategoria(id: number): Promise<boolean> {
    try {
      await ApiService.delete(API_ENDPOINTS.CATEGORIAS_BY_ID(id))
      return true
    } catch (error) {
      console.error("[v0] Error al eliminar categoría:", error)
      return false
    }
  }
}

export const categoriasService = new CategoriasService()
