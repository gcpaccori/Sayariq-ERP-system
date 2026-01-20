"use client"

import { useState, useEffect } from "react"
import {
  analisisLotesPedidosService,
  type MetricasGenerales,
  type AnalisisCompleto,
  type EficienciaLote,
  type AceptacionSobras,
  type ResumenSobras,
  type ComportamientoTemporal,
} from "@/lib/services/analisis-lotes-pedidos-service"

export function useAnalisisLotesPedidos() {
  const [metricasGenerales, setMetricasGenerales] = useState<MetricasGenerales | null>(null)
  const [analisisCompleto, setAnalisisCompleto] = useState<AnalisisCompleto[]>([])
  const [eficienciaLotes, setEficienciaLotes] = useState<EficienciaLote[]>([])
  const [aceptacionSobras, setAceptacionSobras] = useState<AceptacionSobras[]>([])
  const [resumenSobras, setResumenSobras] = useState<ResumenSobras | null>(null)
  const [comportamientoTemporal, setComportamientoTemporal] = useState<ComportamientoTemporal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    console.log("[v0] useAnalisisLotesPedidos: Starting loadData")
    setLoading(true)
    setError(null)

    try {
      const [metricas, analisis, eficiencia, sobras, temporal] = await Promise.all([
        analisisLotesPedidosService.getMetricasGenerales(),
        analisisLotesPedidosService.getAnalisisCompleto(),
        analisisLotesPedidosService.getEficienciaLotes(),
        analisisLotesPedidosService.getAceptacionSobras(),
        analisisLotesPedidosService.getComportamientoTemporal(),
      ])

      setMetricasGenerales(metricas)
      setAnalisisCompleto(analisis)
      setEficienciaLotes(eficiencia)
      setAceptacionSobras(sobras.detalle)
      setResumenSobras(sobras.resumen)
      setComportamientoTemporal(temporal)

      console.log("[v0] useAnalisisLotesPedidos: Data loaded successfully")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al cargar análisis"
      console.error("[v0] useAnalisisLotesPedidos: Error loading data", err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const refresh = () => loadData()

  useEffect(() => {
    loadData()
  }, [])

  return {
    metricasGenerales,
    analisisCompleto,
    eficienciaLotes,
    aceptacionSobras,
    resumenSobras,
    comportamientoTemporal,
    loading,
    error,
    refresh,
  }
}
