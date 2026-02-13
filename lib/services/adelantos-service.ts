import { ApiService } from "./api-service"
import { API_ENDPOINTS } from "@/lib/config/api"

export interface Adelanto {
  id: number
  $id?: string
  productor_id: number | string
  productor_nombre: string
  monto_original: number
  monto_descontado: number
  saldo_pendiente: number
  fecha_adelanto: string
  concepto: string
  medio_pago?: "efectivo" | "transferencia" | "cheque" | "yape" | "plin"
  responsable_entrega?: string
  numero_operacion?: string
  numero_comprobante?: string
  estado: "pendiente" | "descontado-parcial" | "descontado-total"
  descuentos?: DescuentoAdelanto[]
  created_at?: string
  updated_at?: string
}

export interface DescuentoAdelanto {
  lote_id: number
  lote_codigo: string
  fecha_descuento: string
  monto_descontado: number
}

export interface NuevoAdelanto {
  productor_id: number | string
  productor_nombre: string
  monto_original: number
  concepto: string
  fecha_adelanto: string
  medio_pago?: string
  responsable_entrega?: string
  numero_operacion?: string
}

export interface ActualizarAdelanto {
  concepto?: string
  medio_pago?: string
  responsable_entrega?: string
  numero_operacion?: string
  monto_descontado?: number
  saldo_pendiente?: number
  estado?: string
}

class AdelantosService {
  async getAll(): Promise<Adelanto[]> {
    try {
      const response = await ApiService.get<Adelanto[]>(API_ENDPOINTS.ADELANTOS)
      return Array.isArray(response) ? response : []
    } catch (error) {
      console.error("[Sayariq] Error al obtener adelantos:", error)
      return []
    }
  }

  async obtenerAdelantos(): Promise<Adelanto[]> {
    return this.getAll()
  }

  async getById(id: number | string): Promise<Adelanto | null> {
    try {
      const response = await ApiService.get<Adelanto>(API_ENDPOINTS.ADELANTOS_BY_ID(id))
      return response || null
    } catch (error) {
      console.error("[Sayariq] Error al obtener adelanto por ID:", error)
      return null
    }
  }

  async obtenerAdelantosPorProductor(productorId: number | string): Promise<Adelanto[]> {
    try {
      const adelantos = await this.getAll()
      return adelantos.filter((a) => {
        const aId = String(a.productor_id)
        const pId = String(productorId)
        return aId === pId
      })
    } catch (error) {
      console.error("[Sayariq] Error al obtener adelantos por productor:", error)
      return []
    }
  }

  async obtenerAdelantosPendientes(productorId: number | string): Promise<Adelanto[]> {
    try {
      const adelantos = await this.obtenerAdelantosPorProductor(productorId)
      return adelantos
        .filter((a) => a.estado !== "descontado-total")
        .sort((a, b) => new Date(a.fecha_adelanto).getTime() - new Date(b.fecha_adelanto).getTime())
    } catch (error) {
      console.error("[Sayariq] Error al obtener adelantos pendientes:", error)
      return []
    }
  }

  async crearAdelanto(adelanto: NuevoAdelanto): Promise<Adelanto | null> {
    try {
      const response = await ApiService.post<Adelanto>(API_ENDPOINTS.ADELANTOS, adelanto)
      return response || null
    } catch (error) {
      console.error("[Sayariq] Error al crear adelanto:", error)
      throw error
    }
  }

  async actualizarAdelanto(id: number | string, data: ActualizarAdelanto): Promise<Adelanto | null> {
    try {
      const response = await ApiService.put<Adelanto>(API_ENDPOINTS.ADELANTOS_BY_ID(id), data)
      return response || null
    } catch (error) {
      console.error("[Sayariq] Error al actualizar adelanto:", error)
      throw error
    }
  }

  async eliminarAdelanto(id: number | string): Promise<boolean> {
    try {
      await ApiService.delete(API_ENDPOINTS.ADELANTOS_BY_ID(id))
      return true
    } catch (error) {
      console.error("[Sayariq] Error al eliminar adelanto:", error)
      throw error
    }
  }

  async descontarAdelanto(
    adelantoId: number,
    loteId: number,
    loteCodigo: string,
    montoDescuento: number,
  ): Promise<boolean> {
    try {
      const adelanto = await this.getById(adelantoId)
      if (!adelanto) return false

      const nuevoDescontado = (adelanto.monto_descontado || 0) + montoDescuento
      const nuevoSaldo = adelanto.monto_original - nuevoDescontado
      const nuevoEstado = nuevoSaldo <= 0 ? "descontado-total" : "descontado-parcial"

      const response = await ApiService.put<Adelanto>(
        API_ENDPOINTS.ADELANTOS_BY_ID(adelantoId),
        {
          monto_descontado: nuevoDescontado,
          saldo_pendiente: Math.max(0, nuevoSaldo),
          estado: nuevoEstado,
        }
      )
      return !!response
    } catch (error) {
      console.error("[Sayariq] Error al descontar adelanto:", error)
      return false
    }
  }

  async calcularSaldoProductor(productorId: number | string): Promise<{
    total_adelantos: number
    total_descontado: number
    saldo_pendiente: number
    adelantos_activos: number
  }> {
    try {
      const adelantos = await this.obtenerAdelantosPorProductor(productorId)

      const total_adelantos = adelantos.reduce((sum, a) => sum + (Number(a.monto_original) || 0), 0)
      const total_descontado = adelantos.reduce((sum, a) => sum + (Number(a.monto_descontado) || 0), 0)
      const saldo_pendiente = adelantos.reduce((sum, a) => sum + (Number(a.saldo_pendiente) || 0), 0)
      const adelantos_activos = adelantos.filter((a) => a.estado !== "descontado-total").length

      return {
        total_adelantos,
        total_descontado,
        saldo_pendiente,
        adelantos_activos,
      }
    } catch (error) {
      console.error("[Sayariq] Error al calcular saldo del productor:", error)
      return {
        total_adelantos: 0,
        total_descontado: 0,
        saldo_pendiente: 0,
        adelantos_activos: 0,
      }
    }
  }

  async procesarDescuentosAutomaticos(
    productorId: number,
    loteId: number,
    loteCodigo: string,
    valorLote: number,
  ): Promise<{
    descuentos_aplicados: DescuentoAdelanto[]
    monto_total_descontado: number
    saldo_final: number
  }> {
    try {
      const adelantosPendientes = await this.obtenerAdelantosPendientes(productorId)

      let montoRestante = valorLote
      const descuentosAplicados: DescuentoAdelanto[] = []
      let montoTotalDescontado = 0

      for (const adelanto of adelantosPendientes) {
        if (montoRestante <= 0) break

        const saldoPendiente = Number(adelanto.saldo_pendiente) || 0
        const montoADescontar = Math.min(montoRestante, saldoPendiente)

        if (montoADescontar > 0) {
          await this.descontarAdelanto(adelanto.id, loteId, loteCodigo, montoADescontar)

          descuentosAplicados.push({
            lote_id: loteId,
            lote_codigo: loteCodigo,
            fecha_descuento: new Date().toISOString(),
            monto_descontado: montoADescontar,
          })

          montoTotalDescontado += montoADescontar
          montoRestante -= montoADescontar
        }
      }

      return {
        descuentos_aplicados: descuentosAplicados,
        monto_total_descontado: montoTotalDescontado,
        saldo_final: montoRestante,
      }
    } catch (error) {
      console.error("[Sayariq] Error al procesar descuentos automáticos:", error)
      return {
        descuentos_aplicados: [],
        monto_total_descontado: 0,
        saldo_final: valorLote,
      }
    }
  }
}

export const adelantosService = new AdelantosService()