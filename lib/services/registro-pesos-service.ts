import { apiRequest } from "@/lib/config/api"

export interface RegistroPeso {
  id: number
  lote_id: number
  fecha_pesado: string
  peso_bruto: number
  peso_exportable: number
  peso_industrial: number
  peso_descarte: number
  observaciones?: string
  created_at: string
  numero_lote?: string
  producto?: string
  guia_ingreso?: string
  fecha_ingreso?: string
  lote_estado?: string
  estado_frescura?: string
  productor_nombre?: string
  productor_dni?: string
  peso_total_clasificado?: number
  porcentaje_exportable?: number
  porcentaje_industrial?: number
  porcentaje_descarte?: number
  eficiencia_clasificacion?: number
}

export interface Estadisticas {
  general: {
    total_lotes_pesados: number
    total_registros_peso: number
    peso_bruto_total: number
    peso_exportable_total: number
    peso_industrial_total: number
    peso_descarte_total: number
    peso_bruto_promedio: number
    porcentaje_exportable_promedio: number
    porcentaje_industrial_promedio: number
    porcentaje_descarte_promedio: number
  }
  por_producto: Array<{
    producto: string
    cantidad_pesadas: number
    peso_total: number
    porcentaje_exportable_promedio: number
  }>
  tendencia_mensual: Array<{
    mes: string
    cantidad_registros: number
    peso_total: number
    eficiencia_promedio: number
  }>
}

export interface ResumenLote {
  resumen: {
    lote_id: number
    numero_lote: string
    producto: string
    peso_inicial: number
    peso_neto: number
    productor_nombre: string
    total_pesadas: number
    peso_bruto_acumulado: number
    peso_exportable_acumulado: number
    peso_industrial_acumulado: number
    peso_descarte_acumulado: number
    primera_pesada: string
    ultima_pesada: string
  }
  historial: RegistroPeso[]
}

export interface CreateRegistroPesoData {
  lote_id: number
  fecha_pesado: string
  peso_bruto: number
  peso_exportable: number
  peso_industrial: number
  peso_descarte: number
  observaciones?: string
}

export const RegistroPesosService = {
  async getAll(): Promise<{ data: RegistroPeso[]; total: number }> {
    const response = await apiRequest<{ data: RegistroPeso[]; total: number }>({
      endpoint: "/registro-pesos",
      method: "GET",
    })
    return response
  },

  async getById(id: number): Promise<RegistroPeso> {
    const response = await apiRequest<{ data: RegistroPeso }>({
      endpoint: `/registro-pesos/${id}`,
      method: "GET",
    })
    return response.data
  },

  async getEstadisticas(): Promise<Estadisticas> {
    const response = await apiRequest<{ data: Estadisticas }>({
      endpoint: "/registro-pesos/estadisticas",
      method: "GET",
    })
    return response.data
  },

  async getResumenPorLote(loteId: number): Promise<ResumenLote> {
    const response = await apiRequest<{ data: ResumenLote }>({
      endpoint: `/registro-pesos/${loteId}/resumen-lote`,
      method: "GET",
    })
    return response.data
  },

  async create(data: CreateRegistroPesoData): Promise<{ id: number; message: string }> {
    const response = await apiRequest<{ id: number; message: string }>({
      endpoint: "/registro-pesos",
      method: "POST",
      data,
    })
    return response
  },

  async update(id: number, data: Partial<CreateRegistroPesoData>): Promise<{ message: string }> {
    const response = await apiRequest<{ message: string }>({
      endpoint: `/registro-pesos/${id}`,
      method: "PUT",
      data,
    })
    return response
  },

  async delete(id: number): Promise<{ message: string }> {
    const response = await apiRequest<{ message: string }>({
      endpoint: `/registro-pesos/${id}`,
      method: "DELETE",
    })
    return response
  },
}
