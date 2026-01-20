import { ApiService } from "./api-service"

export interface ProveedorDeuda {
  id: number
  nombre: string
  documento: string
  telefono: string
  saldoActual: number
  limitCredito: number
  creditoDisponible: number
  adelantosPendientes: number
  totalAdelantosDescontados: number
  ultimoMovimiento: string
  estado: "activo" | "suspendido" | "bloqueado"
  movimientos?: any[]
  estadisticas?: any
}

export interface MovimientoFinanciero {
  id: number
  proveedor_id: number
  fecha: string
  tipo: "adelanto" | "descuento" | "ajuste_positivo" | "ajuste_negativo" | "liquidacion"
  monto: number
  descripcion: string
  referencia?: string
  responsable: string
  estado: "pendiente" | "aplicado" | "cancelado"
}

export class DeudasProveedoresService {
  async getAll(): Promise<ProveedorDeuda[]> {
    console.log("[v0] DeudasProveedoresService: getAll() called")
    const response = await ApiService.get<ProveedorDeuda[]>("/api/proxy/deudas-proveedores")
    return Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : []
  }

  async getById(id: number): Promise<ProveedorDeuda> {
    const response = await ApiService.get<ProveedorDeuda>(`/api/proxy/deudas-proveedores/${id}`)
    return response
  }

  async registrarAdelanto(proveedorId: number, monto: number, descripcion: string) {
    const response = await ApiService.post("/api/proxy/deudas-proveedores/adelanto", {
      proveedor_id: proveedorId,
      monto,
      descripcion,
      fecha: new Date().toISOString().split("T")[0],
    })
    return response
  }

  async registrarAjuste(proveedorId: number, monto: number, tipo: string, descripcion: string) {
    const response = await ApiService.post("/api/proxy/deudas-proveedores/ajuste", {
      proveedor_id: proveedorId,
      monto,
      tipo,
      descripcion,
      fecha: new Date().toISOString().split("T")[0],
    })
    return response
  }

  async getMovimientos(proveedorId: number): Promise<MovimientoFinanciero[]> {
    const response = await ApiService.get<MovimientoFinanciero[]>(
      `/api/proxy/deudas-proveedores/${proveedorId}/movimientos`
    )
    return Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : []
  }
}

export const deudasProveedoresService = new DeudasProveedoresService()
