import { ApiService } from "./api-service"
import type { Empleado } from "@/lib/types"

export class EmpleadosService {
  async getAll(): Promise<Empleado[]> {
    console.log("[v0] EmpleadosService: Fetching all empleados")
    const response = await ApiService.get<Empleado[]>("/api/proxy/empleados")
    console.log("[v0] EmpleadosService: Response", { count: Array.isArray(response) ? response.length : 0 })

    // Transform data to match frontend format
    const empleados = Array.isArray(response) ? response : []
    return empleados.map((emp) => ({
      ...emp,
      activo: emp.estado === "activo",
      persona_nombre: emp.persona_nombre || `${emp.nombres || ""} ${emp.apellidos || ""}`.trim(),
    }))
  }

  async getById(id: number): Promise<Empleado> {
    const response = await ApiService.get<Empleado>(`/api/proxy/empleados/${id}`)
    return response
  }

  async create(data: Omit<Empleado, "id" | "created_at" | "updated_at">): Promise<Empleado> {
    console.log("[v0] EmpleadosService: Creating empleado", data)
    const payload = {
      ...data,
      estado: data.estado || "activo",
      fecha_ingreso: data.fecha_ingreso || new Date().toISOString().split("T")[0],
    }
    const response = await ApiService.post<Empleado>("/api/proxy/empleados", payload)
    return response
  }

  async update(id: number, data: Partial<Empleado>): Promise<Empleado> {
    console.log("[v0] EmpleadosService: Updating empleado", { id, data })
    const response = await ApiService.put<Empleado>(`/api/proxy/empleados/${id}`, data)
    return response
  }

  async delete(id: number): Promise<void> {
    console.log("[v0] EmpleadosService: Deleting empleado", { id })
    await ApiService.delete(`/api/proxy/empleados/${id}`)
  }

  async updateEstado(id: number, estado: "activo" | "inactivo"): Promise<Empleado> {
    return this.update(id, { estado })
  }
}

export const empleadosService = new EmpleadosService()
