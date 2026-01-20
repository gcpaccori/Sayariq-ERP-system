import { ApiService } from "./api-service"
import { API_ENDPOINTS } from "@/lib/config/api"

export interface NumeroGenerado {
  tipo: "lote" | "guia" | "liquidacion" | "factura"
  numero: string
  secuencial: number
}

export class NumeroService {
  // Generar número de lote: LOTE-AAAA-XXX
  async generarNumeroLote(): Promise<string> {
    try {
      const response = await ApiService.post<NumeroGenerado>(
        `${API_ENDPOINTS.BASE}/numeros/lote`,
        {}
      )
      return response.numero
    } catch (error) {
      // Fallback local si el backend no tiene el endpoint
      const year = new Date().getFullYear()
      const timestamp = Date.now()
      const random = Math.floor(Math.random() * 1000)
      return `LOTE-${year}-${String(timestamp).slice(-3)}${String(random).slice(0, 1)}`
    }
  }

  // Generar número de guía: GI-XXX-AAAA
  async generarNumeroGuia(): Promise<string> {
    try {
      const response = await ApiService.post<NumeroGenerado>(
        `${API_ENDPOINTS.BASE}/numeros/guia`,
        {}
      )
      return response.numero
    } catch (error) {
      const year = new Date().getFullYear()
      const timestamp = Date.now()
      const random = Math.floor(Math.random() * 1000)
      return `GI-${String(random).slice(-3)}-${year}`
    }
  }

  // Generar número de liquidación: LIQ-XXX-AAAA
  async generarNumeroLiquidacion(): Promise<string> {
    try {
      const response = await ApiService.post<NumeroGenerado>(
        `${API_ENDPOINTS.BASE}/numeros/liquidacion`,
        {}
      )
      return response.numero
    } catch (error) {
      const year = new Date().getFullYear()
      const timestamp = Date.now()
      const random = Math.floor(Math.random() * 1000)
      return `LIQ-${String(random).slice(-3)}-${year}`
    }
  }

  // Generar número de factura: FACT-XXX-AAAA
  async generarNumeroFactura(): Promise<string> {
    try {
      const response = await ApiService.post<NumeroGenerado>(
        `${API_ENDPOINTS.BASE}/numeros/factura`,
        {}
      )
      return response.numero
    } catch (error) {
      const year = new Date().getFullYear()
      const timestamp = Date.now()
      const random = Math.floor(Math.random() * 1000)
      return `FACT-${String(random).slice(-3)}-${year}`
    }
  }
}

export const numeroService = new NumeroService()
