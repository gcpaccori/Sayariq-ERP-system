"use client"

import { useState, useEffect } from "react"

interface UseApiOptions {
  initialLoad?: boolean
}

interface ApiService<T> {
  getAll: () => Promise<T[]>
  getById?: (id: number) => Promise<T>
  create?: (data: Omit<T, "id" | "created_at" | "updated_at">) => Promise<T>
  update?: (id: number, data: Partial<Omit<T, "id" | "created_at" | "updated_at">>) => Promise<T>
  delete?: (id: number) => Promise<void>
}

export function useApi<T extends { id: number }>(service: ApiService<T>, options: UseApiOptions = {}) {
  const { initialLoad = true } = options
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    console.log("[v0] useApi: Starting loadData", {
      serviceName: service.constructor.name,
      initialLoad,
    })

    setLoading(true)
    setError(null)

    try {
      console.log("[v0] useApi: Calling service.getAll()")
      const result = await service.getAll()
      console.log("[v0] useApi: Data loaded successfully", {
        count: result?.length || 0,
        hasData: !!result,
      })
      setData(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      console.error("[v0] useApi: Error loading data", {
        error: errorMessage,
        errorType: err instanceof Error ? err.constructor.name : typeof err,
        stack: err instanceof Error ? err.stack : undefined,
      })
      setError(errorMessage)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const create = async (item: Omit<T, "id" | "created_at" | "updated_at">) => {
    if (!service.create) throw new Error("Create method not implemented")

    setLoading(true)
    setError(null)
    try {
      const newItem = await service.create(item)
      setData((prev) => [newItem, ...prev])
      return newItem
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al crear"
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const update = async (id: number, updates: Partial<Omit<T, "id" | "created_at" | "updated_at">>) => {
    if (!service.update) throw new Error("Update method not implemented")

    setLoading(true)
    setError(null)
    try {
      const updatedItem = await service.update(id, updates)
      setData((prev) => prev.map((item) => (item.id === id ? updatedItem : item)))
      return updatedItem
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al actualizar"
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: number) => {
    if (!service.delete) throw new Error("Delete method not implemented")

    setLoading(true)
    setError(null)
    try {
      await service.delete(id)
      setData((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al eliminar"
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const refresh = () => loadData()

  useEffect(() => {
    if (initialLoad) {
      console.log("[v0] useApi: useEffect triggered, loading data")
      loadData()
    }
  }, [initialLoad])

  return {
    data,
    loading,
    error,
    create,
    update,
    remove,
    refresh,
    loadData,
  }
}
