import { ApiService } from "./api-service"

export interface LiquidacionProveedor {
  id: number
  numero_liquidacion: string
  tipo_liquidacion: "proveedor"
  persona_id: number
  proveedor_nombre?: string
  lote_id?: number
  numero_lote?: string
  fecha_liquidacion: string
  total_bruto_fruta: number
  total_adelantos: number
  total_a_pagar: number
  monto_pagado?: number
  estado_pago: "pendiente_pago" | "pagado_parcial" | "pagado_total" | "pagado_con_adelanto"
  forma_pago: "adelanto" | "credito" | "contado"
  fecha_pago?: string
  observaciones?: string
  detalle_categorias?: DetalleCategoriaProveedor[]
  created_at: string
}

export interface DetalleCategoriaProveedor {
  id?: number
  liquidacion_id?: number
  categoria_id: number
  categoria_nombre?: string
  peso_ajustado: number
  precio_unitario: number
  subtotal: number
}

export interface LotePendiente {
  lote_id: number
  numero_lote: string
  proveedor_id: number
  proveedor_nombre: string
  fecha_ingreso: string
  producto: string
  peso_neto: number
  estado: string
}

export interface DatosProveedor {
  proveedor: {
    id: number
    nombre_completo: string
    documento_identidad?: string
    telefono?: string
    direccion?: string
    banco?: string
    cuenta_bancaria?: string
    tipo: string
  }
  lotes: any[]
  adelantos: {
    id: number
    productor_id: number
    monto_original: number
    saldo_pendiente: number
    fecha_adelanto: string
    concepto: string
    estado: string
  }[]
  total_adelantos_pendientes: number
  categorias: {
    id: number
    nombre: string
    precio_kg: number
  }[]
}

export interface NuevaLiquidacionProveedor {
  proveedor_id: number
  lote_id?: number
  fecha_liquidacion?: string
  detalles_categorias: DetalleCategoriaProveedor[]
  forma_pago: "adelanto" | "credito" | "contado"
  monto_total: number
  cuenta_pago?: string
  observaciones?: string
}

export interface RegistrarPago {
  monto: number
  fecha_pago?: string
  cuenta_tipo?: "banco" | "caja"
  observaciones?: string
}

class LiquidacionProveedoresService {
  private baseEndpoint = "/liquidaciones-proveedores"

  async getAll(): Promise<LiquidacionProveedor[]> {
    try {
      const response = await ApiService.get<{ success: boolean; data: LiquidacionProveedor[] }>(this.baseEndpoint)
      return response.data || []
    } catch (error) {
      console.error("[v0] Error al obtener liquidaciones de proveedores:", error)
      return []
    }
  }

  async getPendientes(): Promise<LotePendiente[]> {
    try {
      const response = await ApiService.get<{ success: boolean; data: LotePendiente[] }>(
        `${this.baseEndpoint}/pendientes`,
      )
      return response.data || []
    } catch (error) {
      console.error("[v0] Error al obtener lotes pendientes:", error)
      return []
    }
  }

  async getDatosProveedor(proveedorId: number): Promise<DatosProveedor | null> {
    try {
      const response = await ApiService.get<{ success: boolean; data: DatosProveedor }>(
        `${this.baseEndpoint}/datos-proveedor?proveedor_id=${proveedorId}`,
      )
      return response.data || null
    } catch (error) {
      console.error("[v0] Error al obtener datos del proveedor:", error)
      return null
    }
  }

  async getById(id: number): Promise<LiquidacionProveedor | null> {
    try {
      const response = await ApiService.get<{ success: boolean; data: LiquidacionProveedor }>(
        `${this.baseEndpoint}/${id}`,
      )
      return response.data || null
    } catch (error) {
      console.error("[v0] Error al obtener liquidación:", error)
      return null
    }
  }

  async create(liquidacion: NuevaLiquidacionProveedor): Promise<{
    liquidacion_id: number
    numero_liquidacion: string
    estado_pago: string
    total_adelantos: number
    total_a_pagar: number
  } | null> {
    try {
      const response = await ApiService.post<{
        success: boolean
        liquidacion_id: number
        numero_liquidacion: string
        estado_pago: string
        total_adelantos: number
        total_a_pagar: number
        message: string
      }>(this.baseEndpoint, liquidacion)

      return {
        liquidacion_id: response.liquidacion_id,
        numero_liquidacion: response.numero_liquidacion,
        estado_pago: response.estado_pago,
        total_adelantos: response.total_adelantos,
        total_a_pagar: response.total_a_pagar,
      }
    } catch (error) {
      console.error("[v0] Error al crear liquidación de proveedor:", error)
      throw error
    }
  }

  async registrarPago(id: number, pago: RegistrarPago): Promise<{
    monto_pagado: number
    estado_pago: string
  } | null> {
    try {
      const response = await ApiService.put<{
        success: boolean
        monto_pagado: number
        estado_pago: string
        message: string
      }>(`${this.baseEndpoint}/${id}/registrar-pago`, pago)

      return {
        monto_pagado: response.monto_pagado,
        estado_pago: response.estado_pago,
      }
    } catch (error) {
      console.error("[v0] Error al registrar pago:", error)
      throw error
    }
  }

  async generarComprobante(id: number): Promise<{
    liquidacion: LiquidacionProveedor
    tipo_documento: string
  } | null> {
    try {
      const response = await ApiService.get<{
        success: boolean
        data: LiquidacionProveedor
        tipo_documento: string
      }>(`${this.baseEndpoint}/${id}/comprobante`)

      return {
        liquidacion: response.data,
        tipo_documento: response.tipo_documento,
      }
    } catch (error) {
      console.error("[v0] Error al generar comprobante:", error)
      return null
    }
  }

  /**
   * Calcular el total de adelantos pendientes de un proveedor
   */
  calcularTotalAdelantosPendientes(adelantos: DatosProveedor["adelantos"]): number {
    return adelantos.reduce((sum, adelanto) => {
      if (adelanto.estado !== "descontado-total") {
        return sum + adelanto.saldo_pendiente
      }
      return sum
    }, 0)
  }

  /**
   * Verificar si un proveedor tiene adelantos suficientes
   */
  tieneAdelantosSuficientes(adelantos: DatosProveedor["adelantos"], montoRequerido: number): boolean {
    const totalPendiente = this.calcularTotalAdelantosPendientes(adelantos)
    return totalPendiente >= montoRequerido
  }
}

export const liquidacionProveedoresService = new LiquidacionProveedoresService()
