import { ApiService } from "./api-service"
import { API_ENDPOINTS } from "@/lib/config/api"
import type { Persona } from "@/lib/types"

class PersonasService {
  private collectionId = "personas"

  async getAll(): Promise<Persona[]> {
    console.log("[v0] PersonasService: getAll() called")
    const response = await ApiService.get<any[]>(API_ENDPOINTS.PERSONAS)
    console.log("[v0] PersonasService: Response received", {
      isArray: Array.isArray(response),
      count: Array.isArray(response) ? response.length : 0,
      sampleData: Array.isArray(response) && response.length > 0 ? response[0] : null
    })
    
    if (Array.isArray(response)) {
      return response.map(persona => {
        // Backend sends: tipo_persona, nombre_completo, documento_identidad
        // We need: tipo, roles, nombres, apellidos, dni
        const tipo = persona.tipo_persona || persona.tipo || ""
        const roles = persona.roles || (tipo ? [tipo] : [])
        
        console.log("[v0] Transforming persona:", { 
          id: persona.id, 
          tipo_persona: persona.tipo_persona,
          tipo_calculated: tipo,
          roles_calculated: roles 
        })
        
        return {
          ...persona,
          tipo,  // Map tipo_persona to tipo
          roles, // Create roles array from tipo_persona
          // Ensure these fields exist for backward compatibility
          dni: persona.dni || persona.documento_identidad || persona.numero_documento,
          nombres: persona.nombres || persona.nombre_completo?.split(' ')[0] || "",
          apellidos: persona.apellidos || persona.nombre_completo?.split(' ').slice(1).join(' ') || "",
        } as Persona
      })
    }
    
    return response
  }

  async obtenerPersonas(): Promise<Persona[]> {
    try {
      return this.getAll()
    } catch (error) {
      console.error("Error al obtener personas:", error)
      return []
    }
  }

  async getById(id: number): Promise<Persona> {
    const response = await ApiService.get<Persona>(API_ENDPOINTS.PERSONAS_BY_ID(id))
    return response
  }

  async obtenerPersonaPorId(id: string): Promise<Persona | null> {
    try {
      const personas = await this.getAll()
      return personas.find((p) => p.$id === id) || null
    } catch (error) {
      console.error("Error al obtener persona por ID:", error)
      return null
    }
  }

  async create(data: Omit<Persona, "id" | "created_at" | "updated_at">): Promise<Persona> {
    const response = await ApiService.post<Persona>(API_ENDPOINTS.PERSONAS, data)
    return response
  }

  async crearPersona(persona: Omit<Persona, "$id" | "$createdAt" | "$updatedAt">): Promise<Persona | null> {
    try {
      return this.create(persona)
    } catch (error) {
      console.error("Error al crear persona:", error)
      return null
    }
  }

  async update(id: number, data: Partial<Omit<Persona, "id" | "created_at" | "updated_at">>): Promise<Persona> {
    const response = await ApiService.put<Persona>(API_ENDPOINTS.PERSONAS_BY_ID(id), data)
    return response
  }

  async actualizarPersona(id: string, updates: Partial<Persona>): Promise<Persona | null> {
    try {
      const persona = await this.getById(Number(id))
      const personaActualizada = { ...persona, ...updates, $updatedAt: new Date().toISOString() }
      return this.update(Number(id), personaActualizada)
    } catch (error) {
      console.error("Error al actualizar persona:", error)
      return null
    }
  }

  async delete(id: number): Promise<void> {
    await ApiService.delete(API_ENDPOINTS.PERSONAS_BY_ID(id))
  }

  async eliminarPersona(id: string): Promise<boolean> {
    try {
      await this.delete(Number(id))
      return true
    } catch (error) {
      console.error("Error al eliminar persona:", error)
      return false
    }
  }

  async getByTipo(tipo: string): Promise<Persona[]> {
    const personas = await this.getAll()
    return personas.filter((p) => p.tipo === tipo)
  }

  async getProductores(): Promise<Persona[]> {
    return this.getByTipo("productor")
  }

  async getEmpleados(): Promise<Persona[]> {
    return this.getByTipo("empleado")
  }

  async getProveedores(): Promise<Persona[]> {
    return this.getByTipo("proveedor")
  }

  private getMockPersonas(): Persona[] {
    return [
      {
        $id: "prod_001",
        $createdAt: "2024-01-01T00:00:00Z",
        $updatedAt: "2024-01-01T00:00:00Z",
        nombres: "Juan Carlos",
        apellidos: "Pérez González",
        documento_identidad: "12345678",
        tipo_documento: "DNI",
        telefono: "987654321",
        email: "juan.perez@email.com",
        direccion: "Av. Los Productores 123, Lima",
        fecha_nacimiento: "1980-05-15",
        tipo: "productor",
        activo: true,
        roles: ["productor"],
        fecha_registro: "2024-01-01",
        observaciones: "Productor principal de café orgánico",
      },
      {
        $id: "prod_002",
        $createdAt: "2024-01-02T00:00:00Z",
        $updatedAt: "2024-01-02T00:00:00Z",
        nombres: "María Elena",
        apellidos: "García Rodríguez",
        documento_identidad: "87654321",
        tipo_documento: "DNI",
        telefono: "912345678",
        email: "maria.garcia@email.com",
        direccion: "Jr. Las Flores 456, Cusco",
        fecha_nacimiento: "1975-08-22",
        tipo: "productor",
        activo: true,
        roles: ["productor"],
        fecha_registro: "2024-01-02",
        observaciones: "Especialista en cacao fino",
      },
      {
        $id: "prod_003",
        $createdAt: "2024-01-03T00:00:00Z",
        $updatedAt: "2024-01-03T00:00:00Z",
        nombres: "Carlos Alberto",
        apellidos: "López Mendoza",
        documento_identidad: "11223344",
        tipo_documento: "DNI",
        telefono: "998877665",
        email: "carlos.lopez@email.com",
        direccion: "Calle Los Andes 789, Arequipa",
        fecha_nacimiento: "1982-12-10",
        tipo: "productor",
        activo: true,
        roles: ["productor"],
        fecha_registro: "2024-01-03",
        observaciones: "Productor de quinua orgánica",
      },
      {
        $id: "emp_001",
        $createdAt: "2024-01-01T00:00:00Z",
        $updatedAt: "2024-01-01T00:00:00Z",
        nombres: "Ana Sofía",
        apellidos: "Martínez Silva",
        documento_identidad: "55667788",
        tipo_documento: "DNI",
        telefono: "955443322",
        email: "ana.martinez@empresa.com",
        direccion: "Av. Industrial 100, Lima",
        fecha_nacimiento: "1985-03-18",
        tipo: "empleado",
        activo: true,
        roles: ["supervisor", "control_calidad"],
        fecha_registro: "2024-01-01",
        observaciones: "Supervisora de control de calidad",
      },
    ]
  }
}

export const personasService = new PersonasService()
