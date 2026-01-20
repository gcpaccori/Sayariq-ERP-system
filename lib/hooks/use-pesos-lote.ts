"use client"

import { useState, useEffect } from "react"
import { PesosLoteService } from "@/lib/services/pesos-lote-service"
import type { PesoLote, PesoLoteCreate, EstadisticasPeso } from "@/lib/types/pesos-lote"

export function usePesosLote() {
  const [registros, setRegistros] = useState<PesoLote[]>([])
  const [estadisticas, setEstadisticas] = useState<{
    general: EstadisticasPeso
    por_producto: any[]
    tendencia_mensual: any[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [registrosData, statsData] = await Promise.all([
        PesosLoteService.getAll(),
        PesosLoteService.getEstadisticas(),
      ])
      setRegistros(registrosData)
      setEstadisticas(statsData)
    } catch (err) {
      console.error("Error loading pesos lote data:", err)
      setError(err instanceof Error ? err.message : "Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const createRegistro = async (data: PesoLoteCreate) => {
    try {
      await PesosLoteService.create(data)
      await loadData()
      return true
    } catch (err) {
      console.error("Error creating registro:", err)
      setError(err instanceof Error ? err.message : "Error al crear registro")
      return false
    }
  }

  const updateRegistro = async (id: number, data: Partial<PesoLoteCreate>) => {
    try {
      await PesosLoteService.update(id, data)
      await loadData()
      return true
    } catch (err) {
      console.error("Error updating registro:", err)
      setError(err instanceof Error ? err.message : "Error al actualizar registro")
      return false
    }
  }

  const deleteRegistro = async (id: number) => {
    try {
      await PesosLoteService.delete(id)
      await loadData()
      return true
    } catch (err) {
      console.error("Error deleting registro:", err)
      setError(err instanceof Error ? err.message : "Error al eliminar registro")
      return false
    }
  }

  return {
    registros,
    estadisticas,
    loading,
    error,
    refresh: loadData,
    createRegistro,
    updateRegistro,
    deleteRegistro,
  }
}
