"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, DollarSign, TrendingUp, AlertCircle, Loader2 } from 'lucide-react'
import { useApi } from "@/lib/hooks/use-api"
import { API_ENDPOINTS } from "@/lib/config/api"
import { ApiService } from "@/lib/services/api-service"

interface VentaCliente {
  id: number
  cliente_id: number
  cliente_nombre: string
  fecha_venta: string
  cantidad: number
  precio_unitario: number
  total: number
  estado: "pendiente" | "pagado" | "cancelado"
  pagado?: number
  telefono?: string
  email?: string
}

const ventasService = {
  getAll: async () => {
    const response = await ApiService.get<VentaCliente[]>(API_ENDPOINTS.VENTAS)
    return Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : []
  },
  create: async (data: any) => {
    const response = await ApiService.post<any>(API_ENDPOINTS.VENTAS, data)
    return response
  },
  update: async (id: number, data: any) => {
    const response = await ApiService.put<any>(API_ENDPOINTS.VENTAS, data)
    return response
  },
  delete: async (id: number) => {
    await ApiService.delete(API_ENDPOINTS.VENTAS)
  },
}

export function VentasClientes() {
  const { data: ventas, loading, error, refresh } = useApi(ventasService)
  const [busqueda, setBusqueda] = useState("")

  const ventasArray = Array.isArray(ventas) ? ventas : []
  
  const ventasFiltradas = ventasArray.filter((v) =>
    v.cliente_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    v.email?.toLowerCase().includes(busqueda.toLowerCase())
  )

  const totalVentas = ventasFiltradas.reduce((sum, v) => sum + (Number(v.total) || 0), 0)
  const totalPagado = ventasFiltradas.reduce((sum, v) => sum + (Number(v.pagado) || 0), 0)
  const pendientePago = totalVentas - totalPagado

  const safeTotal = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  if (loading && ventasArray.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando ventas...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Ventas a Clientes</h1>
          <p className="text-gray-600">Control de ventas y cobros</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Venta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Ventas</p>
                <p className="text-2xl font-bold">${safeTotal(totalVentas).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Pagado</p>
                <p className="text-2xl font-bold">${safeTotal(totalPagado).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Por Cobrar</p>
                <p className="text-2xl font-bold">${safeTotal(pendientePago).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por cliente..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Ventas ({ventasFiltradas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Precio Unit.</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Pagado</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ventasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-4">
                    No hay ventas registradas
                  </TableCell>
                </TableRow>
              ) : (
                ventasFiltradas.map((venta) => (
                  <TableRow key={venta.id}>
                    <TableCell>{venta.cliente_nombre}</TableCell>
                    <TableCell>{new Date(venta.fecha_venta).toLocaleDateString()}</TableCell>
                    <TableCell>{venta.cantidad}</TableCell>
                    <TableCell>${safeTotal(venta.precio_unitario).toFixed(2)}</TableCell>
                    <TableCell>${safeTotal(venta.total).toFixed(2)}</TableCell>
                    <TableCell>${safeTotal(venta.pagado || 0).toFixed(2)}</TableCell>
                    <TableCell>${safeTotal(safeTotal(venta.total) - safeTotal(venta.pagado || 0)).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={venta.estado === "pagado" ? "default" : "secondary"}
                      >
                        {venta.estado}
                      </Badge>
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
