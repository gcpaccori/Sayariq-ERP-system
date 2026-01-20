"use client"

import { useState, useEffect, useCallback } from "react"
import { liquidacionesService } from "@/lib/services/liquidaciones-service"
import type { Liquidacion, DatosLiquidacion, NuevaLiquidacion } from "@/lib/types/liquidaciones"

export function useLiquidaciones(initialLoad = false) {
  const [data, setData] = useState<Liquidacion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLiquidaciones = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await liquidacionesService.obtenerLiquidaciones()
      setData(result)
    } catch (err: any) {
      setError(err.message || "Error al cargar liquidaciones")
      console.error("[v0] Error loading liquidaciones:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialLoad) {
      fetchLiquidaciones()
    }
  }, [initialLoad, fetchLiquidaciones])

  const obtenerDatosLote = async (loteId: number): Promise<DatosLiquidacion | null> => {
    try {
      setLoading(true)
      setError(null)
      return await liquidacionesService.obtenerDatosParaLiquidacion(loteId)
    } catch (err: any) {
      setError(err.message)
      console.error("[v0] Error fetching lote data:", err)
      return null
    } finally {
      setLoading(false)
    }
  }

  const crearLiquidacion = async (liquidacion: NuevaLiquidacion) => {
    try {
      setLoading(true)
      setError(null)
      const result = await liquidacionesService.crearLiquidacion(liquidacion)
      await fetchLiquidaciones() // Refresh list
      return result
    } catch (err: any) {
      setError(err.message)
      console.error("[v0] Error creating liquidacion:", err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    liquidaciones: data,
    loading,
    error,
    fetchLiquidaciones,
    obtenerDatosLote,
    crearLiquidacion,
  }
}
