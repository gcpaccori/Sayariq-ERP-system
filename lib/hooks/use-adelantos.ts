"use client"

import { useState, useEffect } from "react"
import { adelantosService, type Adelanto, type NuevoAdelanto } from "@/lib/services/adelantos-service"

export function useAdelantos(initialLoad = true) {
  const [data, setData] = useState<Adelanto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await adelantosService.obtenerAdelantos()
      setData(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      console.error("Error loading adelantos:", errorMessage)
      setError(errorMessage)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const create = async (adelanto: NuevoAdelanto) => {
    setLoading(true)
    setError(null)
    try {
      const newAdelanto = await adelantosService.crearAdelanto(adelanto)
      if (newAdelanto) {
        setData((prev) => [newAdelanto, ...prev])
        return newAdelanto
      }
      throw new Error("No se pudo crear el adelanto")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al crear adelanto"
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const getByProductor = async (productorId: number) => {
    try {
      return await adelantosService.obtenerAdelantosPorProductor(productorId)
    } catch (err) {
      console.error("Error getting adelantos by productor:", err)
      return []
    }
  }

  const getPendientes = async (productorId: number) => {
    try {
      return await adelantosService.obtenerAdelantosPendientes(productorId)
    } catch (err) {
      console.error("Error getting adelantos pendientes:", err)
      return []
    }
  }

  const calcularSaldo = async (productorId: number) => {
    try {
      return await adelantosService.calcularSaldoProductor(productorId)
    } catch (err) {
      console.error("Error calculating saldo:", err)
      return {
        total_adelantos: 0,
        total_descontado: 0,
        saldo_pendiente: 0,
        adelantos_activos: 0,
      }
    }
  }

  const descontar = async (adelantoId: number, loteId: number, loteCodigo: string, montoDescuento: number) => {
    try {
      const success = await adelantosService.descontarAdelanto(adelantoId, loteId, loteCodigo, montoDescuento)
      if (success) {
        await loadData() // Recargar datos después del descuento
      }
      return success
    } catch (err) {
      console.error("Error descontando adelanto:", err)
      return false
    }
  }

  const procesarDescuentosAutomaticos = async (
    productorId: number,
    loteId: number,
    loteCodigo: string,
    valorLote: number,
  ) => {
    try {
      return await adelantosService.procesarDescuentosAutomaticos(productorId, loteId, loteCodigo, valorLote)
    } catch (err) {
      console.error("Error processing automatic discounts:", err)
      return {
        descuentos_aplicados: [],
        monto_total_descontado: 0,
        saldo_final: valorLote,
      }
    }
  }

  const refresh = () => loadData()

  useEffect(() => {
    if (initialLoad) {
      const timer = setTimeout(() => {
        loadData()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [initialLoad])

  return {
    data,
    loading,
    error,
    create,
    getByProductor,
    getPendientes,
    calcularSaldo,
    descontar,
    procesarDescuentosAutomaticos,
    refresh,
    loadData,
  }
}
