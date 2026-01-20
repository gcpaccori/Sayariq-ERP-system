"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, Loader2 } from 'lucide-react'
import { useApi } from "@/lib/hooks/use-api"
import { API_ENDPOINTS } from "@/lib/config/api"
import { ApiService } from "@/lib/services/api-service"

interface ControlRentabilidad {
  id: number
  periodo: string
  ingresos_totales: number
  costos_totales: number
  ganancia_neta: number
  margen_porcentaje: number
}

class RentabilidadService {
  async getAll(): Promise<ControlRentabilidad[]> {
    const response = await ApiService.get<ControlRentabilidad[]>(API_ENDPOINTS.RENTABILIDAD)
    return Array.isArray(response) ? response : response?.data || []
  }
}

const rentabilidadService = new RentabilidadService()

export function ControlRentabilidadModule() {
  const { data: rentabilidades, loading, error, refresh } = useApi(rentabilidadService)

  if (loading && rentabilidades.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando rentabilidad...</span>
      </div>
    )
  }

  const datosGrafico = (rentabilidades as ControlRentabilidad[])
    .sort((a, b) => a.periodo.localeCompare(b.periodo))
    .map((r) => ({
      periodo: r.periodo,
      ingresos: r.ingresos_totales,
      costos: r.costos_totales,
      ganancia: r.ganancia_neta,
      margen: r.margen_porcentaje,
    }))

  const ultimoMes = (rentabilidades as ControlRentabilidad[])[0] || {}
  const margenPromedio =
    rentabilidades.length > 0
      ? rentabilidades.reduce((sum, r) => sum + r.margen_porcentaje, 0) / rentabilidades.length
      : 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Control de Rentabilidad</h1>
          <p className="text-gray-600">Análisis de ingresos, costos y márgenes</p>
        </div>
        <Button onClick={refresh}>Actualizar</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Ingresos Mes Actual</p>
                <p className="text-2xl font-bold">${ultimoMes.ingresos_totales?.toFixed(2) || "0.00"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingDown className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Costos Mes Actual</p>
                <p className="text-2xl font-bold">${ultimoMes.costos_totales?.toFixed(2) || "0.00"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Ganancia Mes Actual</p>
                <p className="text-2xl font-bold">${ultimoMes.ganancia_neta?.toFixed(2) || "0.00"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Margen de Rentabilidad Promedio: {margenPromedio.toFixed(2)}%</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={datosGrafico}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="periodo" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="margen" stroke="#8884d8" name="Margen %" />
              <Line yAxisId="right" type="monotone" dataKey="ganancia" stroke="#82ca9d" name="Ganancia" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comparativa Ingresos vs Costos</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={datosGrafico}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="periodo" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="ingresos" fill="#82ca9d" name="Ingresos" />
              <Bar dataKey="costos" fill="#ffc658" name="Costos" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
