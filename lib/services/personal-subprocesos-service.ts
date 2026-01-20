import { ApiService } from "./api-service"

export interface PlanificacionPersonal {
  id: number
  pedidoId: string
  codigoLote: string
  fechaPlanificacion: string
  operaciones: any[]
  estado: "planificado" | "en-proceso" | "completado" | "cancelado"
  totalPersonal: number
  personalDisponible: number
}

export interface PersonalDisponible {
  id: number
  nombre: string
  genero: "hombre" | "mujer"
  especialidad: string[]
  disponible: boolean
}

export class PersonalSubprocesosService {
  async getPlanificaciones(): Promise<PlanificacionPersonal[]> {
    console.log("[v0] PersonalSubprocesosService: getPlanificaciones() called")
    const response = await ApiService.get<PlanificacionPersonal[]>("/api/proxy/planificaciones-personal")
    return Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : []
  }

  async getPersonalDisponible(): Promise<PersonalDisponible[]> {
    const response = await ApiService.get<PersonalDisponible[]>("/api/proxy/personal-disponible")
    return Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : []
  }

  async crearPlanificacion(data: Partial<PlanificacionPersonal>) {
    const response = await ApiService.post<PlanificacionPersonal>("/api/proxy/planificaciones-personal", data)
    return response
  }

  async actualizarPlanificacion(id: number, data: Partial<PlanificacionPersonal>) {
    const response = await ApiService.put<PlanificacionPersonal>("/api/proxy/planificaciones-personal", data)
    return response
  }

  async eliminarPlanificacion(id: number) {
    await ApiService.delete(`/api/proxy/planificaciones-personal/${id}`)
  }
}

export const personalSubprocesosService = new PersonalSubprocesosService()
