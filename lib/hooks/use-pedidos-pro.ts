"use client"

import { useState } from "react"
import { useApi } from "./use-api"
import { pedidosService } from "@/lib/services/pedidos-service"

export function usePedidosPro() {
  const { data, loading, error, refresh } = useApi(pedidosService, { initialLoad: true })
  const [actionLoading, setActionLoading] = useState(false)

  const create = async (pedidoData: any) => {
    setActionLoading(true)
    try {
      const newPedido = await pedidosService.create(pedidoData)
      await refresh()
      return newPedido
    } catch (err) {
      console.error("[v0] Error creating pedido:", err)
      throw err
    } finally {
      setActionLoading(false)
    }
  }

  const update = async (id: number, updates: any) => {
    setActionLoading(true)
    try {
      const updatedPedido = await pedidosService.update(id, updates)
      await refresh()
      return updatedPedido
    } catch (err) {
      console.error("[v0] Error updating pedido:", err)
      throw err
    } finally {
      setActionLoading(false)
    }
  }

  const remove = async (id: number) => {
    setActionLoading(true)
    try {
      await pedidosService.delete(id)
      await refresh()
      return true
    } catch (err) {
      console.error("[v0] Error deleting pedido:", err)
      throw err
    } finally {
      setActionLoading(false)
    }
  }

  return {
    data: Array.isArray(data) ? data : [],
    loading: loading || actionLoading,
    error,
    refresh,
    create,
    update,
    remove,
  }
}
