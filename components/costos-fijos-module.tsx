"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { Plus, Trash2, Edit, AlertCircle, Loader2 } from 'lucide-react'
import { useApi } from "@/lib/hooks/use-api"
import { API_ENDPOINTS } from "@/lib/config/api"
import { ApiService } from "@/lib/services/api-service"

interface CostoFijo {
  id: number
  categoria: string
  descripcion: string
  monto: number
  frecuencia: "diario" | "semanal" | "mensual" | "anual"
  fecha_inicio: string
  fecha_fin?: string
  activo: boolean
}

const costosService = {
  getAll: async () => {
    const response = await ApiService.get<CostoFijo[]>(API_ENDPOINTS.COSTOS_FIJOS)
    return Array.isArray(response) ? response : response?.data || []
  },
  create: async (data: any) => {
    return await ApiService.post<any>(API_ENDPOINTS.COSTOS_FIJOS, data)
  },
  update: async (id: number, data: any) => {
    return await ApiService.put<any>(API_ENDPOINTS.COSTOS_FIJOS_BY_ID(id), data)
  },
  delete: async (id: number) => {
    await ApiService.delete(API_ENDPOINTS.COSTOS_FIJOS_BY_ID(id))
  },
}

const CATEGORIAS_COLORES = {
  Infraestructura: "#8884d8",
  "Servicios Básicos": "#82ca9d",
  Personal: "#ffc658",
  Equipos: "#ff7c7c",
  Mantenimiento: "#8dd1e1",
  Otros: "#d084d0",
}

export function CostosFijosModule() {
  const { data: costos, loading, error, refresh, remove } = useApi(costosService)
  const [filtroCategoria, setFiltroCategoria] = useState("")

  const costosActivos = (costos as CostoFijo[]).filter((c) => c.activo)
  const costosFiltrados = filtroCategoria
    ? costosActivos.filter((c) => c.categoria === filtroCategoria)
    : costosActivos

  const totalMensual = costosFiltrados
    .filter((c) => c.frecuencia === "mensual")
    .reduce((sum, c) => sum + c.monto, 0)

  const datosGrafico = Object.entries(
    costosActivos.reduce(
      (acc, c) => {
        acc[c.categoria] = (acc[c.categoria] || 0) + c.monto
        return acc
      },
      {} as Record<string, number>
    )
  ).map(([categoria, monto]) => ({
    name: categoria,
    value: monto,
  }))

  const categorias = Array.from(new Set(costosActivos.map((c) => c.categoria)))

  if (loading && costos.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando costos fijos...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Costos Fijos</h1>
          <p className="text-gray-600">Gestión de costos operativos</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Costo
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Total Mensual</p>
              <p className="text-2xl font-bold">${totalMensual.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Cantidad de Costos</p>
              <p className="text-2xl font-bold">{costosFiltrados.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Categorías Activas</p>
              <p className="text-2xl font-bold">{categorias.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distribución por Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={datosGrafico}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: $${value.toFixed(0)}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {datosGrafico.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CATEGORIAS_COLORES[entry.name as keyof typeof CATEGORIAS_COLORES] || "#999"} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filtrar por Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filtroCategoria === "" ? "default" : "outline"}
              onClick={() => setFiltroCategoria("")}
            >
              Todas
            </Button>
            {categorias.map((cat) => (
              <Button
                key={cat}
                variant={filtroCategoria === cat ? "default" : "outline"}
                onClick={() => setFiltroCategoria(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Costos ({costosFiltrados.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoría</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Frecuencia</TableHead>
                <TableHead>Fecha Inicio</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    No hay costos fijos registrados
                  </TableCell>
                </TableRow>
              ) : (
                costosFiltrados.map((costo) => (
                  <TableRow key={costo.id}>
                    <TableCell>
                      <Badge variant="secondary">{costo.categoria}</Badge>
                    </TableCell>
                    <TableCell>{costo.descripcion}</TableCell>
                    <TableCell className="font-bold">${costo.monto.toFixed(2)}</TableCell>
                    <TableCell>{costo.frecuencia}</TableCell>
                    <TableCell>{new Date(costo.fecha_inicio).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => remove(costo.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
