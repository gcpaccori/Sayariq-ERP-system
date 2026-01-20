"use client"

import { useState, useEffect } from "react"
import {
  EvaluacionLiquidacionService,
  type EvaluacionLiquidacionData,
} from "@/lib/services/evaluacion-liquidacion-service"

export function useEvaluacionLiquidacion() {
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionLiquidacionData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargarEvaluaciones = async () => {
    try {
      setLoading(true)
      const data = await EvaluacionLiquidacionService.obtenerTodas()
      setEvaluaciones(data as EvaluacionLiquidacionData[])
      setError(null)
    } catch (err) {
      setError("Error al cargar evaluaciones")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const crearEvaluacion = async (data: EvaluacionLiquidacionData) => {
    try {
      const nuevaEvaluacion = await EvaluacionLiquidacionService.crear(data)
      setEvaluaciones((prev) => [nuevaEvaluacion as EvaluacionLiquidacionData, ...prev])
      return nuevaEvaluacion
    } catch (err) {
      setError("Error al crear evaluación")
      throw err
    }
  }

  const actualizarEvaluacion = async (id: string, data: Partial<EvaluacionLiquidacionData>) => {
    try {
      const evaluacionActualizada = await EvaluacionLiquidacionService.actualizar(id, data)
      setEvaluaciones((prev) =>
        prev.map((evaluacion) => (evaluacion.id === id ? { ...evaluacion, ...data } : evaluacion)),
      )
      return evaluacionActualizada
    } catch (err) {
      setError("Error al actualizar evaluación")
      throw err
    }
  }

  const cambiarEstado = async (id: string, nuevoEstado: EvaluacionLiquidacionData["estado"], aprobadoPor?: string) => {
    try {
      await EvaluacionLiquidacionService.cambiarEstado(id, nuevoEstado, aprobadoPor)
      setEvaluaciones((prev) =>
        prev.map((evaluacion) =>
          evaluacion.id === id
            ? {
                ...evaluacion,
                estado: nuevoEstado,
                ...(nuevoEstado === "aprobado" &&
                  aprobadoPor && {
                    aprobadoPor,
                    fechaAprobacion: new Date().toISOString().split("T")[0],
                  }),
              }
            : evaluacion,
        ),
      )
    } catch (err) {
      setError("Error al cambiar estado")
      throw err
    }
  }

  const eliminarEvaluacion = async (id: string) => {
    try {
      await EvaluacionLiquidacionService.eliminar(id)
      setEvaluaciones((prev) => prev.filter((evaluacion) => evaluacion.id !== id))
    } catch (err) {
      setError("Error al eliminar evaluación")
      throw err
    }
  }

  useEffect(() => {
    cargarEvaluaciones()
  }, [])

  return {
    evaluaciones,
    loading,
    error,
    cargarEvaluaciones,
    crearEvaluacion,
    actualizarEvaluacion,
    cambiarEstado,
    eliminarEvaluacion,
  }
}

export function useEvaluacionEstadisticas() {
  const [estadisticas, setEstadisticas] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargarEstadisticas = async () => {
    try {
      setLoading(true)
      const data = await EvaluacionLiquidacionService.obtenerEstadisticas()
      setEstadisticas(data)
      setError(null)
    } catch (err) {
      setError("Error al cargar estadísticas")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarEstadisticas()
  }, [])

  return {
    estadisticas,
    loading,
    error,
    cargarEstadisticas,
  }
}
