"use client"

import { useState, useEffect, useCallback } from "react"
import { adelantosService, type Adelanto, type NuevoAdelanto, type ActualizarAdelanto } from "@/lib/services/adelantos-service"

export function useAdelantos(initialLoad = true) {
  const [data, setData] = useState<Adelanto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await adelantosService.getAll()
      setData(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      console.error("[Sayariq] Error loading adelantos:", errorMessage)
      setError(errorMessage)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [])

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

  const update = async (id: number | string, updates: ActualizarAdelanto) => {
    setLoading(true)
    setError(null)
    try {
      const updatedAdelanto = await adelantosService.actualizarAdelanto(id, updates)
      if (updatedAdelanto) {
        setData((prev) =>
          prev.map((a) => {
            const aId = a.id ?? (a as any).$id
            return String(aId) === String(id) ? { ...a, ...updatedAdelanto } : a
          })
        )
        return updatedAdelanto
      }
      throw new Error("No se pudo actualizar el adelanto")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al actualizar adelanto"
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: number | string) => {
    setLoading(true)
    setError(null)
    try {
      await adelantosService.eliminarAdelanto(id)
      setData((prev) =>
        prev.filter((a) => {
          const aId = a.id ?? (a as any).$id
          return String(aId) !== String(id)
        })
      )
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al eliminar adelanto"
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const getByProductor = async (productorId: number | string) => {
    try {
      return await adelantosService.obtenerAdelantosPorProductor(productorId)
    } catch (err) {
      console.error("[Sayariq] Error getting adelantos by productor:", err)
      return []
    }
  }

  const getPendientes = async (productorId: number | string) => {
    try {
      return await adelantosService.obtenerAdelantosPendientes(productorId)
    } catch (err) {
      console.error("[Sayariq] Error getting adelantos pendientes:", err)
      return []
    }
  }

  const calcularSaldo = async (productorId: number | string) => {
    try {
      return await adelantosService.calcularSaldoProductor(productorId)
    } catch (err) {
      console.error("[Sayariq] Error calculating saldo:", err)
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
        await loadData()
      }
      return success
    } catch (err) {
      console.error("[Sayariq] Error descontando adelanto:", err)
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
      console.error("[Sayariq] Error processing automatic discounts:", err)
      return {
        descuentos_aplicados: [],
        monto_total_descontado: 0,
        saldo_final: valorLote,
      }
    }
  }

  const refresh = useCallback(() => loadData(), [loadData])

  useEffect(() => {
    if (initialLoad) {
      const timer = setTimeout(() => {
        loadData()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [initialLoad, loadData])

  return {
    data,
    loading,
    error,
    create,
    update,
    remove,
    getByProductor,
    getPendientes,
    calcularSaldo,
    descontar,
    procesarDescuentosAutomaticos,
    refresh,
    loadData,
  }
}