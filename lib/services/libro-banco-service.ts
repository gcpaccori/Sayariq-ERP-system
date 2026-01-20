import { ApiService } from "./api-service"
import { API_ENDPOINTS } from "@/lib/config/api"

export interface LibroBancoEntry {
  id?: number
  fecha: string
  operacion: string
  de_quien: string
  a_quien: string
  motivo: string
  rubro: "campo" | "economico" | "ventas"
  tipo_operacion: "adelanto" | "venta" | "pago" | "impuesto" | "otros"
  numero_operacion: string
  comprobante: string
  deudor: number
  acreedor: number
  estado: "cancelado" | "pendiente"
  agricultor?: string
  created_at?: string
}

export class LibroBancoService {
  async getAll(): Promise<LibroBancoEntry[]> {
    const response = await ApiService.get<LibroBancoEntry[]>(API_ENDPOINTS.BANCO)
    return response
  }

  async create(data: Omit<LibroBancoEntry, "id" | "created_at">): Promise<LibroBancoEntry> {
    const response = await ApiService.post<LibroBancoEntry>(
      API_ENDPOINTS.BANCO,
      data
    )
    return response
  }

  // Registrar pago automático en Libro Banco
  async registrarPagoAutomatico(
    productor_nombre: string,
    monto: number,
    referencia: string,
    fecha: string
  ): Promise<LibroBancoEntry> {
    return this.create({
      fecha,
      operacion: "Pago a productor",
      de_quien: "SAYARIQ SYSTEM",
      a_quien: productor_nombre,
      motivo: referencia,
      rubro: "campo",
      tipo_operacion: "pago",
      numero_operacion: `PAGO-${Date.now()}`,
      comprobante: "",
      deudor: monto,
      acreedor: 0,
      estado: "pendiente",
      agricultor: productor_nombre,
    })
  }

  // Registrar venta automática en Libro Banco
  async registrarVentaAutomatica(
    cliente_nombre: string,
    monto: number,
    referencia: string,
    fecha: string
  ): Promise<LibroBancoEntry> {
    return this.create({
      fecha,
      operacion: "Venta de espárragos",
      de_quien: cliente_nombre,
      a_quien: "SAYARIQ SYSTEM",
      motivo: referencia,
      rubro: "ventas",
      tipo_operacion: "venta",
      numero_operacion: `VENTA-${Date.now()}`,
      comprobante: "",
      deudor: 0,
      acreedor: monto,
      estado: "cancelado",
    })
  }

  // Registrar adelanto automático en Libro Banco
  async registrarAdelantoAutomatico(
    productor_nombre: string,
    monto: number,
    fecha: string
  ): Promise<LibroBancoEntry> {
    return this.create({
      fecha,
      operacion: "Adelanto a productor",
      de_quien: "SAYARIQ SYSTEM",
      a_quien: productor_nombre,
      motivo: "Adelanto para cosecha",
      rubro: "campo",
      tipo_operacion: "adelanto",
      numero_operacion: `ADELANTO-${Date.now()}`,
      comprobante: "",
      deudor: monto,
      acreedor: 0,
      estado: "cancelado",
      agricultor: productor_nombre,
    })
  }
}

export const libroBancoService = new LibroBancoService()
