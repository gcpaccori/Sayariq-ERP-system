import type { Proceso } from "@/lib/types"

export class ProcesosService {
  async getAll(): Promise<Proceso[]> {
    // TODO: Implementar cuando esté disponible el endpoint en el backend
    console.warn("Endpoint de procesos aún no implementado en el backend")
    return []
  }

  async getById(id: number): Promise<Proceso> {
    // TODO: Implementar cuando esté disponible el endpoint
    throw new Error("Endpoint not implemented")
  }

  async create(data: Omit<Proceso, "id" | "created_at" | "updated_at">): Promise<Proceso> {
    // TODO: Implementar cuando esté disponible el endpoint
    throw new Error("Endpoint not implemented")
  }

  async update(id: number, data: Partial<Omit<Proceso, "id" | "created_at" | "updated_at">>): Promise<Proceso> {
    // TODO: Implementar cuando esté disponible el endpoint
    throw new Error("Endpoint not implemented")
  }

  async delete(id: number): Promise<void> {
    // TODO: Implementar cuando esté disponible el endpoint
    throw new Error("Endpoint not implemented")
  }

  async getProcesosActivos(): Promise<Proceso[]> {
    const procesos = await this.getAll()
    return procesos.filter((p) => p.estado !== "completado" && p.estado !== "cancelado")
  }

  async getProcesosByLote(loteId: number): Promise<Proceso[]> {
    const procesos = await this.getAll()
    return procesos.filter((p) => p.lote_id === loteId)
  }

  async generarCodigoProceso(): Promise<string> {
    const timestamp = Date.now().toString().slice(-6)
    return `PROC-${timestamp}`
  }
}

export const procesosService = new ProcesosService()
