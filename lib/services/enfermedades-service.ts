import type { Enfermedad } from "@/lib/types"

class EnfermedadesService {
  async obtenerEnfermedades(): Promise<Enfermedad[]> {
    // TODO: Implementar cuando esté disponible el endpoint en el backend
    console.warn("Endpoint de enfermedades aún no implementado en el backend")
    return []
  }

  async obtenerEnfermedadPorId(id: number): Promise<Enfermedad | null> {
    const enfermedades = await this.obtenerEnfermedades()
    return enfermedades.find((e) => e.id === id) || null
  }

  async crearEnfermedad(enfermedad: Omit<Enfermedad, "id" | "created_at" | "updated_at">): Promise<Enfermedad | null> {
    console.warn("Endpoint de enfermedades aún no implementado en el backend")
    return null
  }

  async actualizarEnfermedad(id: number, updates: Partial<Enfermedad>): Promise<Enfermedad | null> {
    console.warn("Endpoint de enfermedades aún no implementado en el backend")
    return null
  }

  async eliminarEnfermedad(id: number): Promise<boolean> {
    console.warn("Endpoint de enfermedades aún no implementado en el backend")
    return false
  }
}

export const enfermedadesService = new EnfermedadesService()
