import { ApiService } from "./api-service"
import { API_ENDPOINTS } from "@/lib/config/api"
import { libroBancoService } from "./libro-banco-service"

export interface PagoCampoCompleto {
  id?: number
  lote_id: number
  productor_id: number
  numero_liquidacion: string
  monto_liquidacion: number
  adelantos_aplicados: number
  monto_neto: number
  monto_pagado: number
  saldo_pendiente: number
  estado: "pendiente" | "cancelado" | "deficit"
  fecha_pago: string
  comprobante: string
  observaciones: string
  created_at?: string
  updated_at?: string
}

export class PagoCampoCompletoService {
  async getAll(): Promise<PagoCampoCompleto[]> {
    const response = await ApiService.get<PagoCampoCompleto[]>(API_ENDPOINTS.PAGO_CAMPO)
    return response
  }

  async create(data: Omit<PagoCampoCompleto, "id" | "created_at" | "updated_at">): Promise<PagoCampoCompleto> {
    const response = await ApiService.post<PagoCampoCompleto>(
      API_ENDPOINTS.PAGO_CAMPO,
      data
    )
    return response
  }

  async update(
    id: number,
    data: Partial<Omit<PagoCampoCompleto, "id" | "created_at" | "updated_at">>
  ): Promise<PagoCampoCompleto> {
    const response = await ApiService.put<PagoCampoCompleto>(
      API_ENDPOINTS.PAGO_CAMPO_BY_ID(id),
      data
    )
    return response
  }

  // Registrar pago con actualización automática a Libro Banco
  async registrarPagoConLibroBanco(
    pago: Omit<PagoCampoCompleto, "id" | "created_at" | "updated_at">,
    productor_nombre: string
  ): Promise<{
    pago: PagoCampoCompleto
    libroBanco: any
  }> {
    // Crear pago
    const pagoCr = await this.create(pago)

    // Registrar en Libro Banco automáticamente
    const libroBanco = await libroBancoService.registrarPagoAutomatico(
      productor_nombre,
      pago.monto_pagado,
      `Liquidación ${pago.numero_liquidacion}`,
      pago.fecha_pago
    )

    return { pago: pagoCr, libroBanco }
  }
}

export const pagoCampoCompletoService = new PagoCampoCompletoService()
