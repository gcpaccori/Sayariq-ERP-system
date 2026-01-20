import { ApiService } from "./api-service"
import { API_ENDPOINTS } from "@/lib/config/api"
import type { PesoLote, PesoLoteCreate, EstadisticasPeso, ResumenLotePeso } from "@/lib/types/pesos-lote"

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  total?: number
}

const parseNumeric = (value: any): number => {
  if (value === null || value === undefined) return 0
  const num = typeof value === "string" ? Number.parseFloat(value) : Number(value)
  return isNaN(num) ? 0 : num
}

const transformPesoLote = (raw: any): PesoLote => {
  return {
    ...raw,
    id: parseNumeric(raw.id),
    lote_id: parseNumeric(raw.lote_id),
    // Support both old field name (fecha_pesado) and new (fecha_procesamiento)
    fecha_procesamiento: raw.fecha_procesamiento || raw.fecha_pesado || new Date().toISOString().split("T")[0],
    peso_inicial_almacen: parseNumeric(raw.peso_inicial_almacen || raw.peso_bruto),
    // All 11 categories
    peso_exportable: parseNumeric(raw.peso_exportable),
    peso_industrial: parseNumeric(raw.peso_industrial),
    peso_nacional: parseNumeric(raw.peso_nacional),
    peso_jugo: parseNumeric(raw.peso_jugo),
    peso_descarte: parseNumeric(raw.peso_descarte),
    peso_primera: parseNumeric(raw.peso_primera),
    peso_segunda: parseNumeric(raw.peso_segunda),
    peso_tercera: parseNumeric(raw.peso_tercera),
    peso_cuarta: parseNumeric(raw.peso_cuarta),
    peso_quinta: parseNumeric(raw.peso_quinta),
    peso_dedos: parseNumeric(raw.peso_dedos),
    // Calculated fields
    peso_total_clasificado: parseNumeric(raw.peso_total_clasificado),
    porcentaje_exportable: parseNumeric(raw.porcentaje_exportable),
    eficiencia_clasificacion: parseNumeric(raw.eficiencia_clasificacion),
  }
}

const transformEstadisticas = (raw: any): EstadisticasPeso => {
  return {
    total_lotes_pesados: parseNumeric(raw.total_lotes_pesados),
    total_registros_peso: parseNumeric(raw.total_registros_peso),
    peso_bruto_total: parseNumeric(raw.peso_bruto_total),
    peso_exportable_total: parseNumeric(raw.peso_exportable_total),
    peso_industrial_total: parseNumeric(raw.peso_industrial_total),
    peso_descarte_total: parseNumeric(raw.peso_descarte_total),
    peso_bruto_promedio: parseNumeric(raw.peso_bruto_promedio),
    porcentaje_exportable_promedio: parseNumeric(raw.porcentaje_exportable_promedio),
    porcentaje_industrial_promedio: parseNumeric(raw.porcentaje_industrial_promedio),
    porcentaje_descarte_promedio: parseNumeric(raw.porcentaje_descarte_promedio),
  }
}

export const PesosLoteService = {
  async getAll(): Promise<PesoLote[]> {
    try {
      const response = await ApiService.get<ApiResponse<any[]>>(API_ENDPOINTS.PESOS_LOTE)
      const data = response?.data || []
      return data.map(transformPesoLote)
    } catch (error) {
      console.error("[v0] Error fetching pesos lote:", error)
      return []
    }
  },

  async getById(id: number): Promise<PesoLote | null> {
    try {
      const response = await ApiService.get<ApiResponse<any>>(API_ENDPOINTS.PESOS_LOTE_BY_ID(id))
      return response?.data ? transformPesoLote(response.data) : null
    } catch (error) {
      console.error("[v0] Error fetching peso lote by id:", error)
      return null
    }
  },

  async getEstadisticas(): Promise<{
    general: EstadisticasPeso
    por_producto: any[]
    tendencia_mensual: any[]
  }> {
    try {
      const response = await ApiService.get<ApiResponse<any>>(API_ENDPOINTS.PESOS_LOTE_ESTADISTICAS)
      return {
        general: transformEstadisticas(response?.data?.general || {}),
        por_producto: response?.data?.por_producto || [],
        tendencia_mensual: response?.data?.tendencia_mensual || [],
      }
    } catch (error) {
      console.error("[v0] Error fetching estadisticas, returning defaults:", error)
      return {
        general: {
          total_lotes_pesados: 0,
          total_registros_peso: 0,
          peso_bruto_total: 0,
          peso_exportable_total: 0,
          peso_industrial_total: 0,
          peso_descarte_total: 0,
          peso_bruto_promedio: 0,
          porcentaje_exportable_promedio: 0,
          porcentaje_industrial_promedio: 0,
          porcentaje_descarte_promedio: 0,
        },
        por_producto: [],
        tendencia_mensual: [],
      }
    }
  },

  async getResumenPorLote(loteId: number): Promise<{
    resumen: ResumenLotePeso | null
    historial: PesoLote[]
  }> {
    try {
      const response = await ApiService.get<ApiResponse<any>>(API_ENDPOINTS.PESOS_LOTE_RESUMEN_LOTE(loteId))
      return {
        resumen: response?.data?.resumen || null,
        historial: response?.data?.historial?.map(transformPesoLote) || [],
      }
    } catch (error) {
      console.error("[v0] Error fetching resumen por lote:", error)
      return { resumen: null, historial: [] }
    }
  },

  async create(data: PesoLoteCreate): Promise<PesoLote> {
    const response = await ApiService.post<ApiResponse<any>>(API_ENDPOINTS.PESOS_LOTE, data)
    if (!response?.success && response?.message) {
      throw new Error(response.message)
    }
    return transformPesoLote(response?.data || {})
  },

  async update(id: number, data: Partial<PesoLoteCreate>): Promise<void> {
    const response = await ApiService.put<ApiResponse<any>>(API_ENDPOINTS.PESOS_LOTE_BY_ID(id), data)
    if (!response?.success && response?.message) {
      throw new Error(response.message)
    }
  },

  async delete(id: number): Promise<void> {
    const response = await ApiService.delete<ApiResponse<any>>(API_ENDPOINTS.PESOS_LOTE_BY_ID(id))
    if (!response?.success && response?.message) {
      throw new Error(response.message)
    }
  },
}
