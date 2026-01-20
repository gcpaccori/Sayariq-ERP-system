import { databases, DATABASE_ID, COLLECTIONS } from "@/lib/appwrite"
import { Query } from "appwrite"

export interface EvaluacionLiquidacionData {
  id?: string
  proveedorId: string
  loteIds: string[]
  fechaEvaluacion: string
  estado: "borrador" | "revision" | "aprobado" | "rechazado" | "liquidado"
  observaciones: string
  totalIngresosBrutos: number
  totalCostosProcesamiento: number
  porcentajeProductor: number
  montoProductor: number
  totalAdelantos: number
  saldoFinal: number
  aprobadoPor?: string
  fechaAprobacion?: string
  createdAt?: string
  updatedAt?: string
}

export interface LoteEvaluacion {
  id: string
  codigo: string
  modalidad: "carga_cerrada" | "proceso"
  pesoIngreso: number
  pesoFinal: number
  categorias: {
    primera: number
    segunda: number
    tercera: number
    descarte: number
  }
  precios: {
    primera: number
    segunda: number
    tercera: number
    descarte: number
  }
  costosProcesamiento: number
}

export class EvaluacionLiquidacionService {
  private static collectionId = COLLECTIONS.EVALUACIONES_LIQUIDACION

  static async crear(data: EvaluacionLiquidacionData) {
    try {
      const documento = {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const response = await databases.createDocument(DATABASE_ID, this.collectionId, "unique()", documento)

      return response
    } catch (error) {
      console.error("Error al crear evaluación de liquidación:", error)
      throw error
    }
  }

  static async obtenerTodas() {
    try {
      const response = await databases.listDocuments(DATABASE_ID, this.collectionId, [
        Query.orderDesc("createdAt"),
        Query.limit(100),
      ])

      return response.documents
    } catch (error) {
      console.error("Error al obtener evaluaciones:", error)
      throw error
    }
  }

  static async obtenerPorId(id: string) {
    try {
      const response = await databases.getDocument(DATABASE_ID, this.collectionId, id)

      return response
    } catch (error) {
      console.error("Error al obtener evaluación:", error)
      throw error
    }
  }

  static async obtenerPorProveedor(proveedorId: string) {
    try {
      const response = await databases.listDocuments(DATABASE_ID, this.collectionId, [
        Query.equal("proveedorId", proveedorId),
        Query.orderDesc("createdAt"),
      ])

      return response.documents
    } catch (error) {
      console.error("Error al obtener evaluaciones por proveedor:", error)
      throw error
    }
  }

  static async actualizar(id: string, data: Partial<EvaluacionLiquidacionData>) {
    try {
      const documento = {
        ...data,
        updatedAt: new Date().toISOString(),
      }

      const response = await databases.updateDocument(DATABASE_ID, this.collectionId, id, documento)

      return response
    } catch (error) {
      console.error("Error al actualizar evaluación:", error)
      throw error
    }
  }

  static async cambiarEstado(id: string, nuevoEstado: EvaluacionLiquidacionData["estado"], aprobadoPor?: string) {
    try {
      const data: Partial<EvaluacionLiquidacionData> = {
        estado: nuevoEstado,
        updatedAt: new Date().toISOString(),
      }

      if (nuevoEstado === "aprobado" && aprobadoPor) {
        data.aprobadoPor = aprobadoPor
        data.fechaAprobacion = new Date().toISOString().split("T")[0]
      }

      const response = await databases.updateDocument(DATABASE_ID, this.collectionId, id, data)

      return response
    } catch (error) {
      console.error("Error al cambiar estado de evaluación:", error)
      throw error
    }
  }

  static async eliminar(id: string) {
    try {
      await databases.deleteDocument(DATABASE_ID, this.collectionId, id)

      return true
    } catch (error) {
      console.error("Error al eliminar evaluación:", error)
      throw error
    }
  }

  static async obtenerEstadisticas() {
    try {
      const [todas, borradores, revision, aprobadas, liquidadas] = await Promise.all([
        databases.listDocuments(DATABASE_ID, this.collectionId, [Query.limit(1000)]),
        databases.listDocuments(DATABASE_ID, this.collectionId, [Query.equal("estado", "borrador")]),
        databases.listDocuments(DATABASE_ID, this.collectionId, [Query.equal("estado", "revision")]),
        databases.listDocuments(DATABASE_ID, this.collectionId, [Query.equal("estado", "aprobado")]),
        databases.listDocuments(DATABASE_ID, this.collectionId, [Query.equal("estado", "liquidado")]),
      ])

      const totalMonto = todas.documents.reduce((sum, doc) => sum + (doc.saldoFinal || 0), 0)

      return {
        total: todas.total,
        borradores: borradores.total,
        revision: revision.total,
        aprobadas: aprobadas.total,
        liquidadas: liquidadas.total,
        montoTotal: totalMonto,
      }
    } catch (error) {
      console.error("Error al obtener estadísticas:", error)
      throw error
    }
  }

  static calcularTotales(lotes: LoteEvaluacion[], porcentajeProductor = 65) {
    const totalIngresosBrutos = lotes.reduce((sum, lote) => {
      return (
        sum +
        (lote.categorias.primera * lote.precios.primera +
          lote.categorias.segunda * lote.precios.segunda +
          lote.categorias.tercera * lote.precios.tercera +
          lote.categorias.descarte * lote.precios.descarte)
      )
    }, 0)

    const totalCostosProcesamiento = lotes.reduce((sum, lote) => sum + lote.costosProcesamiento, 0)
    const ingresoNeto = totalIngresosBrutos - totalCostosProcesamiento
    const montoProductor = ingresoNeto * (porcentajeProductor / 100)

    return {
      totalIngresosBrutos,
      totalCostosProcesamiento,
      ingresoNeto,
      montoProductor,
    }
  }
}
