import { ApiService } from "./api-service"

export interface LiquidacionCliente {
  id: number
  numero_liquidacion: string
  tipo_liquidacion: "cliente"
  persona_id: number
  cliente_nombre?: string
  pedido_id?: number
  numero_pedido?: string
  fecha_liquidacion: string
  total_bruto_fruta: number
  total_a_pagar: number
  estado_pago: "pendiente_cobro" | "cobrado_parcial" | "cobrado_total"
  forma_pago?: string
  fecha_cobro?: string
  observaciones?: string
  detalle_categorias?: DetalleCategoriaCliente[]
  created_at: string
}

export interface DetalleCategoriaCliente {
  id?: number
  liquidacion_id?: number
  categoria_id: number
  categoria_nombre?: string
  peso_ajustado: number
  precio_unitario: number
  subtotal: number
}

export interface PedidoPendiente {
  pedido_id: number
  numero_pedido: string
  cliente_id: number
  cliente_nombre: string
  fecha_pedido: string
  estado: string
  cantidad_lotes: number
}

export interface DatosCliente {
  cliente: {
    id: number
    nombre_completo: string
    documento_identidad?: string
    telefono?: string
    direccion?: string
    tipo: string
  }
  pedidos: any[]
  categorias: {
    id: number
    nombre: string
    precio_kg: number
  }[]
}

export interface NuevaLiquidacionCliente {
  cliente_id: number
  pedido_id?: number
  fecha_liquidacion?: string
  detalles_categorias: DetalleCategoriaCliente[]
  monto_total: number
  forma_pago?: string
  observaciones?: string
}

class LiquidacionClientesService {
  private baseEndpoint = "/liquidaciones-clientes"

  async getAll(): Promise<LiquidacionCliente[]> {
    try {
      const response = await ApiService.get<{ success: boolean; data: LiquidacionCliente[] }>(this.baseEndpoint)
      return response.data || []
    } catch (error) {
      console.error("[v0] Error al obtener liquidaciones de clientes:", error)
      return []
    }
  }

  async getPendientes(): Promise<PedidoPendiente[]> {
    try {
      const response = await ApiService.get<{ success: boolean; data: PedidoPendiente[] }>(
        `${this.baseEndpoint}/pendientes`,
      )
      return response.data || []
    } catch (error) {
      console.error("[v0] Error al obtener pedidos pendientes:", error)
      return []
    }
  }

  async getDatosCliente(clienteId: number): Promise<DatosCliente | null> {
    try {
      const response = await ApiService.get<{ success: boolean; data: DatosCliente }>(
        `${this.baseEndpoint}/datos-cliente?cliente_id=${clienteId}`,
      )
      return response.data || null
    } catch (error) {
      console.error("[v0] Error al obtener datos del cliente:", error)
      return null
    }
  }

  async getById(id: number): Promise<LiquidacionCliente | null> {
    try {
      const response = await ApiService.get<{ success: boolean; data: LiquidacionCliente }>(
        `${this.baseEndpoint}/${id}`,
      )
      return response.data || null
    } catch (error) {
      console.error("[v0] Error al obtener liquidación:", error)
      return null
    }
  }

  async create(liquidacion: NuevaLiquidacionCliente): Promise<{
    liquidacion_id: number
    numero_liquidacion: string
  } | null> {
    try {
      const response = await ApiService.post<{
        success: boolean
        liquidacion_id: number
        numero_liquidacion: string
        message: string
      }>(this.baseEndpoint, liquidacion)

      return {
        liquidacion_id: response.liquidacion_id,
        numero_liquidacion: response.numero_liquidacion,
      }
    } catch (error) {
      console.error("[v0] Error al crear liquidación de cliente:", error)
      throw error
    }
  }

  async generarBoleta(id: number): Promise<{
    liquidacion: LiquidacionCliente
    tipo_documento: string
  } | null> {
    try {
      const response = await ApiService.get<{
        success: boolean
        data: LiquidacionCliente
        tipo_documento: string
      }>(`${this.baseEndpoint}/${id}/boleta`)

      return {
        liquidacion: response.data,
        tipo_documento: response.tipo_documento,
      }
    } catch (error) {
      console.error("[v0] Error al generar boleta:", error)
      return null
    }
  }

  async marcarComoCobrado(id: number): Promise<boolean> {
    try {
      await ApiService.put<{ success: boolean; message: string }>(`${this.baseEndpoint}/${id}/marcar-cobrado`, {})
      return true
    } catch (error) {
      console.error("[v0] Error al marcar como cobrado:", error)
      return false
    }
  }
}

export const liquidacionClientesService = new LiquidacionClientesService()
