"use client"

import { useState, useEffect } from "react"
import { personasService } from "@/lib/services/personas-service"
import type { Persona } from "@/lib/types"

export function usePersonas(initialLoad = true) {
  const [data, setData] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    console.log("[v0] usePersonas: Starting loadData")

    setLoading(true)
    setError(null)

    try {
      console.log("[v0] usePersonas: Calling personasService.getAll()")
      const result = await personasService.getAll()
      console.log("[v0] usePersonas: Data loaded successfully", {
        count: result?.length || 0,
      })
      setData(result || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      console.error("[v0] usePersonas: Error loading personas", {
        error: errorMessage,
        errorType: err instanceof Error ? err.constructor.name : typeof err,
      })
      setError(errorMessage)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const create = async (persona: Omit<Persona, "id" | "created_at" | "updated_at">) => {
    setLoading(true)
    setError(null)
    try {
      const newPersona = await personasService.create(persona)
      if (newPersona) {
        setData((prev) => [newPersona, ...prev])
        return newPersona
      }
      throw new Error("No se pudo crear la persona")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al crear persona"
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const update = async (id: number, updates: Partial<Persona>) => {
    setLoading(true)
    setError(null)
    try {
      const updatedPersona = await personasService.update(id, updates)
      if (updatedPersona) {
        setData((prev) => prev.map((p) => (p.id === id ? updatedPersona : p)))
        return updatedPersona
      }
      throw new Error("No se pudo actualizar la persona")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al actualizar persona"
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: number) => {
    setLoading(true)
    setError(null)
    try {
      await personasService.delete(id)
      setData((prev) => prev.filter((p) => p.id !== id))
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al eliminar persona"
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const refresh = () => loadData()

  useEffect(() => {
    if (initialLoad) {
      console.log("[v0] usePersonas: useEffect triggered, scheduling load")
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
    update,
    remove,
    refresh,
    loadData,
  }
}
