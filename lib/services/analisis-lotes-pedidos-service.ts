import { ApiService } from "./api-service"
import { API_ENDPOINTS } from "@/lib/config/api"

export interface PlanificacionOperativa {
  id: number
  lote_id: number
  pedido_id: number
  peso_asignado: number
  fecha_asignacion: string
  estado: "planificado" | "en_proceso" | "completado"
  numero_lote?: string
  producto?: string
  peso_inicial?: number
  peso_neto?: number
  fecha_ingreso?: string
  estado_frescura?: string
  numero_pedido?: string
  pedido_kg_neto?: number
  pedido_estado?: string
  productor_nombre?: string
}

export interface MetricasGenerales {
  total_lotes_usados: number
  total_pedidos_atendidos: number
  peso_total_asignado: number
  peso_promedio_asignacion: number
  asignaciones_completadas: number
  asignaciones_en_proceso: number
  asignaciones_planificadas: number
  eficiencia_peso: number
}

export interface AnalisisCompleto {
  id: number
  lote_id: number
  pedido_id: number
  peso_asignado: number
  fecha_asignacion: string
  asignacion_estado: string
  numero_lote: string
  producto: string
  lote_peso_inicial: number
  lote_peso_neto: number
  fecha_ingreso: string
  estado_frescura: string
  lote_estado: string
  numero_pedido: string
  pedido_kg_neto: number
  pedido_precio: number
  pedido_total: number
  pedido_estado: string
  fecha_pedido: string
  productor_nombre: string
  dias_en_almacen: number
  eficiencia_lote: number
  porcentaje_usado: number
  peso_sobrante: number
}

export interface EficienciaLote {
  lote_id: number
  numero_lote: string
  producto: string
  peso_inicial: number
  peso_neto: number
  fecha_ingreso: string
  estado_frescura: string
  productor_nombre: string
  numero_asignaciones: number
  peso_total_asignado: number
  peso_disponible: number
  eficiencia_procesamiento: number
  tasa_utilizacion: number
  dias_almacenado: number
}

export interface AceptacionSobras {
  lote_id: number
  numero_lote: string
  producto: string
  peso_neto: number
  peso_asignado: number
  peso_sobrante: number
  categoria_sobras: string
  porcentaje_sobras: number
  estado_frescura: string
  fecha_ingreso: string
  dias_almacenado: number
  productor_nombre: string
}

export interface ResumenSobras {
  sin_sobras: number
  sobras_minimas: number
  sobras_moderadas: number
  sobras_altas: number
  total_lotes: number
  peso_total_sobras: number
}

export interface ComportamientoTemporal {
  mes: string
  lotes_utilizados: number
  pedidos_atendidos: number
  peso_total_asignado: number
  peso_promedio: number
  dias_promedio_almacen: number
  completados: number
  en_proceso: number
}

export class AnalisisLotesPedidosService {
  async getAll(): Promise<PlanificacionOperativa[]> {
    console.log("[v0] AnalisisLotesPedidosService: getAll() called")
    const response = await ApiService.get<PlanificacionOperativa[]>(API_ENDPOINTS.ANALISIS_LOTES_PEDIDOS)
    return response
  }

  async getMetricasGenerales(): Promise<MetricasGenerales> {
    console.log("[v0] AnalisisLotesPedidosService: getMetricasGenerales() called")
    const response = await ApiService.get<MetricasGenerales>(
      `${API_ENDPOINTS.ANALISIS_LOTES_PEDIDOS}/metricas-generales`,
    )
    return response
  }

  async getAnalisisCompleto(): Promise<AnalisisCompleto[]> {
    console.log("[v0] AnalisisLotesPedidosService: getAnalisisCompleto() called")
    const response = await ApiService.get<AnalisisCompleto[]>(
      `${API_ENDPOINTS.ANALISIS_LOTES_PEDIDOS}/analisis-completo`,
    )
    return response
  }

  async getEficienciaLotes(): Promise<EficienciaLote[]> {
    console.log("[v0] AnalisisLotesPedidosService: getEficienciaLotes() called")
    const response = await ApiService.get<EficienciaLote[]>(`${API_ENDPOINTS.ANALISIS_LOTES_PEDIDOS}/eficiencia-lotes`)
    return response
  }

  async getAceptacionSobras(): Promise<{ detalle: AceptacionSobras[]; resumen: ResumenSobras }> {
    console.log("[v0] AnalisisLotesPedidosService: getAceptacionSobras() called")
    const response = await ApiService.get<{ detalle: AceptacionSobras[]; resumen: ResumenSobras }>(
      `${API_ENDPOINTS.ANALISIS_LOTES_PEDIDOS}/aceptacion-sobras`,
    )
    return response
  }

  async getComportamientoTemporal(): Promise<ComportamientoTemporal[]> {
    console.log("[v0] AnalisisLotesPedidosService: getComportamientoTemporal() called")
    const response = await ApiService.get<ComportamientoTemporal[]>(
      `${API_ENDPOINTS.ANALISIS_LOTES_PEDIDOS}/comportamiento-temporal`,
    )
    return response
  }
}

export const analisisLotesPedidosService = new AnalisisLotesPedidosService()
