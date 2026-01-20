import type { Liquidacion, DatosLiquidacion, NuevaLiquidacion, PesosLiquidacion } from "@/lib/types/liquidaciones"

class LiquidacionesService {
  private baseURL = "/api/proxy"

  async getAll(): Promise<Liquidacion[]> {
    return this.obtenerLiquidaciones()
  }

  private async request(endpoint: string, options?: RequestInit) {
    const url = `${this.baseURL}${endpoint}`
    console.log("[v0] LiquidacionesService request:", url)

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...options?.headers,
        },
      })

      const text = await response.text()
      console.log("[v0] LiquidacionesService raw response:", text.substring(0, 500))

      if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
        console.error("[v0] LiquidacionesService received HTML instead of JSON")
        throw new Error("El servidor devolvió HTML en lugar de JSON. Posible error de configuración del backend.")
      }

      if (!text || text.trim() === "") {
        console.log("[v0] LiquidacionesService received empty response")
        return { success: true, data: [] }
      }

      const data = JSON.parse(text)

      if (!response.ok) {
        throw new Error(data.message || `Error en la petición: ${response.status}`)
      }

      return data
    } catch (error: any) {
      console.error("[v0] LiquidacionesService error:", error.message)
      throw error
    }
  }

  private transformLiquidacion(liq: any): Liquidacion {
    return {
      ...liq,
      id: Number(liq.id),
      lote_id: Number(liq.lote_id),
      total_bruto_fruta: Number(liq.total_bruto_fruta) || 0,
      costo_flete: Number(liq.costo_flete) || 0,
      costo_cosecha: Number(liq.costo_cosecha) || 0,
      costo_maquila: Number(liq.costo_maquila) || 0,
      descuento_jabas: Number(liq.descuento_jabas) || 0,
      total_adelantos: Number(liq.total_adelantos) || 0,
      total_a_pagar: Number(liq.total_a_pagar) || 0,
      peso_inicial: Number(liq.peso_inicial) || 0,
      numero_jabas: Number(liq.numero_jabas) || 0,
      detalle_categorias: liq.detalle_categorias?.map((det: any) => ({
        ...det,
        categoria_id: Number(det.categoria_id),
        peso_categoria_original: Number(det.peso_categoria_original) || 0,
        peso_ajustado: Number(det.peso_ajustado) || 0,
        precio_unitario: Number(det.precio_unitario) || 0,
        subtotal: Number(det.subtotal) || 0,
      })),
    }
  }

  private transformPesos(pesos: any): PesosLiquidacion {
    return {
      peso_bruto_total: Number(pesos?.peso_bruto_total) || 0,
      peso_exportable: Number(pesos?.peso_exportable) || 0,
      peso_industrial: Number(pesos?.peso_industrial) || 0,
      peso_descarte: Number(pesos?.peso_descarte) || 0,
      peso_nacional: Number(pesos?.peso_nacional) || 0,
      peso_jugo: Number(pesos?.peso_jugo) || 0,
      peso_primera: Number(pesos?.peso_primera) || 0,
      peso_segunda: Number(pesos?.peso_segunda) || 0,
      peso_tercera: Number(pesos?.peso_tercera) || 0,
      peso_cuarta: Number(pesos?.peso_cuarta) || 0,
      peso_quinta: Number(pesos?.peso_quinta) || 0,
      peso_dedos: Number(pesos?.peso_dedos) || 0,
    }
  }

  async obtenerDatosParaLiquidacion(loteId: number): Promise<DatosLiquidacion> {
    const response = await this.request(`/liquidaciones/datos-lote?lote_id=${loteId}`)

    if (!response.success || !response.data) {
      throw new Error("No se pudieron obtener los datos del lote")
    }

    const data = response.data
    console.log("[v0] Datos recibidos del backend:", data)

    return {
      ...data,
      lote: {
        ...data.lote,
        id: Number(data.lote.id),
        productor_id: Number(data.lote.productor_id),
        peso_inicial: Number(data.lote.peso_inicial) || 0,
        numero_jabas: Number(data.lote.numero_jabas) || 0,
      },
      pesos: this.transformPesos(data.pesos),
      pesos_registrados: data.pesos_registrados ? this.transformPesos(data.pesos_registrados) : undefined,
      categorias: data.categorias.map((cat: any) => ({
        ...cat,
        id: Number(cat.id),
        nombre_categoria: cat.nombre_categoria || cat.codigo || cat.nombre,
        precio_unitario_kg: Number(cat.precio_unitario_kg || cat.precio_kg) || 0,
      })),
      adelantos: data.adelantos.map((adel: any) => ({
        ...adel,
        id: Number(adel.id),
        monto: Number(adel.monto) || 0,
      })),
      fuente_datos: data.fuente_datos || "kardex",
    }
  }

  async crearLiquidacion(liquidacion: NuevaLiquidacion): Promise<{ liquidacion_id: number }> {
    console.log("[v0] Enviando liquidación:", liquidacion)
    const response = await this.request("/liquidaciones", {
      method: "POST",
      body: JSON.stringify(liquidacion),
    })

    if (!response.success) {
      throw new Error(response.message || "Error al crear liquidación")
    }

    return {
      liquidacion_id: response.liquidacion_id,
    }
  }

  async obtenerLiquidacion(id: number): Promise<Liquidacion> {
    const response = await this.request(`/liquidaciones/${id}`)

    if (!response.success || !response.data) {
      throw new Error("Liquidación no encontrada")
    }

    return this.transformLiquidacion(response.data)
  }

  async obtenerLiquidaciones(): Promise<Liquidacion[]> {
    try {
      const response = await this.request("/liquidaciones")

      if (!response.success || !Array.isArray(response.data)) {
        return []
      }

      return response.data.map((liq: any) => this.transformLiquidacion(liq))
    } catch (error) {
      console.error("[v0] Error obtaining liquidaciones:", error)
      return []
    }
  }

  async obtenerLiquidacionesPorProductor(productorId: number): Promise<Liquidacion[]> {
    try {
      const response = await this.request(`/liquidaciones/por-productor?productor_id=${productorId}`)

      if (!response.success || !Array.isArray(response.data)) {
        return []
      }

      return response.data.map((liq: any) => this.transformLiquidacion(liq))
    } catch (error) {
      console.error("[v0] Error obtaining liquidaciones por productor:", error)
      return []
    }
  }

  async actualizarEstado(id: number, estado_pago: string): Promise<void> {
    await this.request(`/liquidaciones/${id}`, {
      method: "PUT",
      body: JSON.stringify({ estado_pago }),
    })
  }

  async eliminarLiquidacion(id: number): Promise<void> {
    await this.request(`/liquidaciones/${id}`, {
      method: "DELETE",
    })
  }

  async obtenerResumenFinanciero(productorId: number) {
    const liquidaciones = await this.obtenerLiquidacionesPorProductor(productorId)
    const totalBruto = liquidaciones.reduce((sum, l) => sum + l.total_bruto_fruta, 0)
    const totalAdelantos = liquidaciones.reduce((sum, l) => sum + l.total_adelantos, 0)
    const totalNeto = liquidaciones.reduce((sum, l) => sum + l.total_a_pagar, 0)

    return {
      total_liquidaciones: liquidaciones.length,
      valor_total_bruto: totalBruto,
      valor_total_adelantos: totalAdelantos,
      valor_total_neto: totalNeto,
      liquidaciones_pendientes: liquidaciones.filter((l) => l.estado_pago === "PENDIENTE").length,
      liquidaciones_pagadas: liquidaciones.filter((l) => l.estado_pago === "PAGADO").length,
    }
  }
}

export const liquidacionesService = new LiquidacionesService()

export type { Liquidacion, DatosLiquidacion, NuevaLiquidacion }
