"use client"

import { useState, useCallback, useEffect } from "react"
import {
  RegistroPesosService,
  type RegistroPeso,
  type Estadisticas,
  type CreateRegistroPesoData,
} from "@/lib/services/registro-pesos-service"
import { lotesService, type Lote } from "@/lib/services/lotes-service"

export function useRegistroPesos() {
  const [registros, setRegistros] = useState<RegistroPeso[]>([])
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null)
  const [lotes, setLotes] = useState<Lote[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [registrosData, estadisticasData, lotesData] = await Promise.all([
        RegistroPesosService.getAll(),
        RegistroPesosService.getEstadisticas(),
        lotesService.getAll(),
      ])

      setRegistros(registrosData.data || [])
      setEstadisticas(estadisticasData)
      setLotes(lotesData || [])
    } catch (err: any) {
      setError(err.message || "Error al cargar datos")
      console.error("Error loading registro pesos data:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const createRegistro = useCallback(
    async (data: CreateRegistroPesoData) => {
      setIsLoading(true)
      setError(null)
      try {
        await RegistroPesosService.create(data)
        await loadData()
        return { success: true }
      } catch (err: any) {
        setError(err.message || "Error al crear registro")
        return { success: false, error: err.message }
      } finally {
        setIsLoading(false)
      }
    },
    [loadData],
  )

  const updateRegistro = useCallback(
    async (id: number, data: Partial<CreateRegistroPesoData>) => {
      setIsLoading(true)
      setError(null)
      try {
        await RegistroPesosService.update(id, data)
        await loadData()
        return { success: true }
      } catch (err: any) {
        setError(err.message || "Error al actualizar registro")
        return { success: false, error: err.message }
      } finally {
        setIsLoading(false)
      }
    },
    [loadData],
  )

  const deleteRegistro = useCallback(
    async (id: number) => {
      setIsLoading(true)
      setError(null)
      try {
        await RegistroPesosService.delete(id)
        await loadData()
        return { success: true }
      } catch (err: any) {
        setError(err.message || "Error al eliminar registro")
        return { success: false, error: err.message }
      } finally {
        setIsLoading(false)
      }
    },
    [loadData],
  )

  return {
    registros,
    estadisticas,
    lotes,
    isLoading,
    error,
    loadData,
    createRegistro,
    updateRegistro,
    deleteRegistro,
  }
}
