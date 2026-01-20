import { ApiService } from "./api-service"
import { API_ENDPOINTS } from "@/lib/config/api"

export interface Adelanto {
  id: number
  productor_id: number
  productor_nombre: string
  monto_original: number
  monto_descontado: number
  saldo_pendiente: number
  fecha_adelanto: string
  concepto: string
  estado: "pendiente" | "descontado-parcial" | "descontado-total"
  descuentos: DescuentoAdelanto[]
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
  productor_id: number
  productor_nombre: string
  monto_original: number
  concepto: string
  fecha_adelanto: string
}

class AdelantosService {
  async getAll(): Promise<Adelanto[]> {
    try {
      console.log("[v0] AdelantosService: getAll() called")
      const response = await ApiService.get<Adelanto[]>(API_ENDPOINTS.ADELANTOS)
      console.log("[v0] AdelantosService: Adelantos obtenidos", {
        count: Array.isArray(response) ? response.length : 0,
      })
      return Array.isArray(response) ? response : []
    } catch (error) {
      console.error("[v0] Error al obtener adelantos:", error)
      return []
    }
  }

  async obtenerAdelantos(): Promise<Adelanto[]> {
    try {
      console.log("[v0] AdelantosService: Obteniendo adelantos del backend")
      const response = await ApiService.get<Adelanto[]>(`${API_ENDPOINTS.ADELANTOS}`)
      console.log("[v0] AdelantosService: Adelantos obtenidos", {
        count: Array.isArray(response) ? response.length : 0,
      })
      return Array.isArray(response) ? response : []
    } catch (error) {
      console.error("[v0] Error al obtener adelantos:", error)
      return []
    }
  }

  async obtenerAdelantosPorProductor(productorId: number): Promise<Adelanto[]> {
    try {
      console.log("[v0] AdelantosService: Obteniendo adelantos del productor", { productorId })
      const adelantos = await this.obtenerAdelantos()
      return adelantos.filter((a) => a.productor_id === productorId)
    } catch (error) {
      console.error("[v0] Error al obtener adelantos por productor:", error)
      return []
    }
  }

  async obtenerAdelantosPendientes(productorId: number): Promise<Adelanto[]> {
    try {
      console.log("[v0] AdelantosService: Obteniendo adelantos pendientes", { productorId })
      const adelantos = await this.obtenerAdelantosPorProductor(productorId)
      return adelantos
        .filter((a) => a.estado !== "descontado-total")
        .sort((a, b) => new Date(a.fecha_adelanto).getTime() - new Date(b.fecha_adelanto).getTime())
    } catch (error) {
      console.error("[v0] Error al obtener adelantos pendientes:", error)
      return []
    }
  }

  async crearAdelanto(adelanto: NuevoAdelanto): Promise<Adelanto | null> {
    try {
      console.log("[v0] AdelantosService: Creando nuevo adelanto", adelanto)
      const response = await ApiService.post<Adelanto>(`${API_ENDPOINTS.ADELANTOS}`, adelanto)
      console.log("[v0] AdelantosService: Adelanto creado exitosamente", response)
      return response || null
    } catch (error) {
      console.error("[v0] Error al crear adelanto:", error)
      return null
    }
  }

  async descontarAdelanto(
    adelantoId: number,
    loteId: number,
    loteCodigo: string,
    montoDescuento: number,
  ): Promise<boolean> {
    try {
      console.log("[v0] AdelantosService: Descontando adelanto", {
        adelantoId,
        loteId,
        montoDescuento,
      })
      const response = await ApiService.put<Adelanto>(
        `${API_ENDPOINTS.ADELANTOS}/${adelantoId}`,
        {
          estado: "descontado-parcial",
          saldo_pendiente: 0,
          descuentos: [
            {
              lote_id: loteId,
              lote_codigo: loteCodigo,
              fecha_descuento: new Date().toISOString(),
              monto_descontado: montoDescuento,
            },
          ],
        }
      )
      console.log("[v0] AdelantosService: Descuento aplicado", response)
      return !!response
    } catch (error) {
      console.error("[v0] Error al descontar adelanto:", error)
      return false
    }
  }

  async calcularSaldoProductor(productorId: number): Promise<{
    total_adelantos: number
    total_descontado: number
    saldo_pendiente: number
    adelantos_activos: number
  }> {
    try {
      const adelantos = await this.obtenerAdelantosPorProductor(productorId)

      const total_adelantos = adelantos.reduce((sum, a) => sum + a.monto_original, 0)
      const total_descontado = adelantos.reduce((sum, a) => sum + a.monto_descontado, 0)
      const saldo_pendiente = adelantos.reduce((sum, a) => sum + a.saldo_pendiente, 0)
      const adelantos_activos = adelantos.filter((a) => a.estado !== "descontado-total").length

      console.log("[v0] AdelantosService: Saldo calculado", {
        productorId,
        total_adelantos,
        total_descontado,
        saldo_pendiente,
        adelantos_activos,
      })

      return {
        total_adelantos,
        total_descontado,
        saldo_pendiente,
        adelantos_activos,
      }
    } catch (error) {
      console.error("[v0] Error al calcular saldo del productor:", error)
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
      console.log("[v0] AdelantosService: Procesando descuentos automáticos", {
        productorId,
        loteId,
        valorLote,
      })

      const adelantosPendientes = await this.obtenerAdelantosPendientes(productorId)

      let montoRestante = valorLote
      const descuentosAplicados: DescuentoAdelanto[] = []
      let montoTotalDescontado = 0

      // Descontar adelantos en orden FIFO
      for (const adelanto of adelantosPendientes) {
        if (montoRestante <= 0) break

        const montoADescontar = Math.min(montoRestante, adelanto.saldo_pendiente)

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

      const saldoFinal = montoRestante

      console.log("[v0] AdelantosService: Descuentos procesados", {
        descuentos_aplicados: descuentosAplicados.length,
        monto_total_descontado: montoTotalDescontado,
        saldo_final: saldoFinal,
      })

      return {
        descuentos_aplicados: descuentosAplicados,
        monto_total_descontado: montoTotalDescontado,
        saldo_final: saldoFinal,
      }
    } catch (error) {
      console.error("[v0] Error al procesar descuentos automáticos:", error)
      return {
        descuentos_aplicados: [],
        monto_total_descontado: 0,
        saldo_final: valorLote,
      }
    }
  }
}

export const adelantosService = new AdelantosService()
