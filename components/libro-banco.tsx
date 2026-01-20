"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, DollarSign, TrendingDown, Search, Calendar } from "lucide-react"
import type { TransaccionBanco } from "@/lib/types/appwrite"

export function LibroBanco() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [filtroRubro, setFiltroRubro] = useState("todos")
  const [isNuevaTransaccionOpen, setIsNuevaTransaccionOpen] = useState(false)

  // Mock data - replace with actual data from service
  const [transacciones] = useState<TransaccionBanco[]>([
    {
      $id: "1",
      fecha: "2024-12-08",
      operacion: "TRANSFERENCIA A TERCEROS BCP",
      aQuien: "VEGA LOYOLA MARCOS ARMANDO",
      deQuien: "ND",
      motivo: "LOTE 0249",
      rubroEconomico: "campo",
      numeroOperacion: "1061214",
      comprobante: "",
      deudor: 0,
      acreedor: 2586.6,
      estado: "cancelado",
      agricultor: "VEGA LOYOLA MARCOS ARMANDO",
      loteRelacionado: "LOTE 0249",
    } as TransaccionBanco,
    {
      $id: "2",
      fecha: "2024-12-08",
      operacion: "TRANSFERENCIA A TERCEROS BCP",
      aQuien: "MAMAN: CASTAÑEDA CARLOS DANIEL",
      deQuien: "ND",
      motivo: "VENTA NATIVA - NACIONAL",
      rubroEconomico: "venta",
      numeroOperacion: "162121",
      comprobante: "",
      deudor: 0,
      acreedor: 1415.84,
      estado: "cancelado",
    } as TransaccionBanco,
    {
      $id: "3",
      fecha: "2024-12-12",
      operacion: "TRANSFERENCIA A TERCEROS BCP",
      aQuien: "RAMIREZ TAIPE ELISEO",
      deQuien: "ND",
      motivo: "LOTE 0250",
      rubroEconomico: "campo",
      numeroOperacion: "1185425",
      comprobante: "",
      deudor: 0,
      acreedor: 2883,
      estado: "pendiente",
      agricultor: "RAMIREZ TAIPE ELISEO",
      loteRelacionado: "LOTE 0250",
    } as TransaccionBanco,
    {
      $id: "4",
      fecha: "2024-12-16",
      operacion: "ADELANTO MATERIA PRIMA",
      aQuien: "ND",
      deQuien: "QUISPE ORTIZ SABINA",
      motivo: "ADELANTO MATERIA PRIMA",
      rubroEconomico: "campo",
      numeroOperacion: "729812",
      comprobante: "",
      deudor: 1000,
      acreedor: 0,
      estado: "pendiente",
      agricultor: "QUISPE ORTIZ SABINA",
    } as TransaccionBanco,
  ])

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split("T")[0],
    operacion: "",
    aQuien: "",
    deQuien: "",
    motivo: "",
    rubroEconomico: "campo" as "campo" | "venta" | "nd",
    numeroOperacion: "",
    comprobante: "",
    deudor: "",
    acreedor: "",
    estado: "pendiente" as "cancelado" | "pendiente" | "deficit",
    agricultor: "",
    loteRelacionado: "",
  })

  const transaccionesFiltradas = transacciones.filter((trans) => {
    const coincideBusqueda =
      trans.operacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trans.aQuien.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trans.motivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (trans.agricultor && trans.agricultor.toLowerCase().includes(searchTerm.toLowerCase()))

    const coincideEstado = filtroEstado === "todos" || trans.estado === filtroEstado
    const coincideRubro = filtroRubro === "todos" || trans.rubroEconomico === filtroRubro

    return coincideBusqueda && coincideEstado && coincideRubro
  })

  const sumaPagoPendiente = transacciones
    .filter((t) => t.estado === "pendiente")
    .reduce((sum, t) => sum + t.acreedor, 0)

  const sumaAdelantosPendientes = transacciones
    .filter((t) => t.rubroEconomico === "campo" && t.estado === "pendiente" && t.deudor > 0)
    .reduce((sum, t) => sum + t.deudor, 0)

  const recuentoLiquidacionesPendientes = transacciones.filter((t) => t.estado === "pendiente" && t.acreedor > 0).length

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Registrar transacción:", formData)
    setIsNuevaTransaccionOpen(false)
  }

  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(valor)
  }

  const getEstadoBadge = (estado: string) => {
    const config = {
      cancelado: { label: "Cancelado", variant: "default" as const, className: "bg-green-100 text-green-800" },
      pendiente: { label: "Pendiente", variant: "secondary" as const, className: "bg-orange-100 text-orange-800" },
      deficit: { label: "Déficit", variant: "destructive" as const, className: "bg-yellow-100 text-yellow-800" },
    }

    const { label, className } = config[estado as keyof typeof config]
    return <Badge className={className}>{label}</Badge>
  }

  const getRubroBadge = (rubro: string) => {
    const config = {
      campo: { label: "Campo", className: "bg-blue-100 text-blue-800" },
      venta: { label: "Venta", className: "bg-green-100 text-green-800" },
      nd: { label: "N/D", className: "bg-gray-100 text-gray-800" },
    }

    const { label, className } = config[rubro as keyof typeof config]
    return <Badge className={className}>{label}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Libro Banco</h1>
            <p className="text-gray-600">Registro de transacciones bancarias y adelantos</p>
          </div>
        </div>
        <Dialog open={isNuevaTransaccionOpen} onOpenChange={setIsNuevaTransaccionOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Transacción
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Nueva Transacción</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha">Fecha *</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numeroOperacion">N° Operación *</Label>
                  <Input
                    id="numeroOperacion"
                    value={formData.numeroOperacion}
                    onChange={(e) => setFormData({ ...formData, numeroOperacion: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="operacion">Operación *</Label>
                <Input
                  id="operacion"
                  value={formData.operacion}
                  onChange={(e) => setFormData({ ...formData, operacion: e.target.value })}
                  placeholder="Ej: TRANSFERENCIA A TERCEROS BCP"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="aQuien">¿A Quién?</Label>
                  <Input
                    id="aQuien"
                    value={formData.aQuien}
                    onChange={(e) => setFormData({ ...formData, aQuien: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deQuien">¿De Quién?</Label>
                  <Input
                    id="deQuien"
                    value={formData.deQuien}
                    onChange={(e) => setFormData({ ...formData, deQuien: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo *</Label>
                <Input
                  id="motivo"
                  value={formData.motivo}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rubroEconomico">Rubro Económico *</Label>
                  <Select
                    value={formData.rubroEconomico}
                    onValueChange={(value: "campo" | "venta" | "nd") =>
                      setFormData({ ...formData, rubroEconomico: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="campo">Campo</SelectItem>
                      <SelectItem value="venta">Venta</SelectItem>
                      <SelectItem value="nd">N/D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado *</Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value: "cancelado" | "pendiente" | "deficit") =>
                      setFormData({ ...formData, estado: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                      <SelectItem value="deficit">Déficit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deudor">Deudor (S/)</Label>
                  <Input
                    id="deudor"
                    type="number"
                    step="0.01"
                    value={formData.deudor}
                    onChange={(e) => setFormData({ ...formData, deudor: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="acreedor">Acreedor (S/)</Label>
                  <Input
                    id="acreedor"
                    type="number"
                    step="0.01"
                    value={formData.acreedor}
                    onChange={(e) => setFormData({ ...formData, acreedor: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agricultor">Agricultor</Label>
                  <Input
                    id="agricultor"
                    value={formData.agricultor}
                    onChange={(e) => setFormData({ ...formData, agricultor: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loteRelacionado">Lote Relacionado</Label>
                  <Input
                    id="loteRelacionado"
                    value={formData.loteRelacionado}
                    onChange={(e) => setFormData({ ...formData, loteRelacionado: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comprobante">Comprobante</Label>
                <Input
                  id="comprobante"
                  value={formData.comprobante}
                  onChange={(e) => setFormData({ ...formData, comprobante: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsNuevaTransaccionOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Registrar Transacción</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumen Financiero */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="sayariq-card border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Suma de Pago Pendiente</p>
                <p className="text-2xl font-bold text-orange-600">{formatearMoneda(sumaPagoPendiente)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="sayariq-card border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Suma de Adelantos Pendientes</p>
                <p className="text-2xl font-bold text-blue-600">{formatearMoneda(sumaAdelantosPendientes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="sayariq-card border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Recuento de Liquidaciones Pendiente</p>
                <p className="text-2xl font-bold text-purple-600">{recuentoLiquidacionesPendientes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="sayariq-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por operación, agricultor o motivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 sayariq-input"
              />
            </div>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-full sm:w-48 sayariq-input">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
                <SelectItem value="deficit">Déficit</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroRubro} onValueChange={setFiltroRubro}>
              <SelectTrigger className="w-full sm:w-48 sayariq-input">
                <SelectValue placeholder="Filtrar por rubro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los rubros</SelectItem>
                <SelectItem value="campo">Campo</SelectItem>
                <SelectItem value="venta">Venta</SelectItem>
                <SelectItem value="nd">N/D</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Transacciones */}
      <Card className="sayariq-card">
        <CardHeader>
          <CardTitle>Registro de Transacciones</CardTitle>
          <CardDescription>{transaccionesFiltradas.length} transacciones encontradas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Operación</TableHead>
                  <TableHead>¿A Quién? / ¿De Quién?</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Rubro</TableHead>
                  <TableHead>N° Operación</TableHead>
                  <TableHead className="text-right">Deudor</TableHead>
                  <TableHead className="text-right">Acreedor</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Agricultor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transaccionesFiltradas.map((trans) => (
                  <TableRow
                    key={trans.$id}
                    className={
                      trans.rubroEconomico === "campo"
                        ? "bg-blue-50"
                        : trans.rubroEconomico === "venta"
                          ? "bg-green-50"
                          : ""
                    }
                  >
                    <TableCell>{new Date(trans.fecha).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium max-w-xs truncate">{trans.operacion}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {trans.aQuien !== "ND" && <div className="font-medium">A: {trans.aQuien}</div>}
                        {trans.deQuien !== "ND" && <div className="text-gray-600">De: {trans.deQuien}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{trans.motivo}</TableCell>
                    <TableCell>{getRubroBadge(trans.rubroEconomico)}</TableCell>
                    <TableCell>{trans.numeroOperacion}</TableCell>
                    <TableCell className="text-right">
                      {trans.deudor > 0 ? (
                        <span className="text-red-600 font-medium">{formatearMoneda(trans.deudor)}</span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {trans.acreedor > 0 ? (
                        <span className="text-green-600 font-medium">{formatearMoneda(trans.acreedor)}</span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{getEstadoBadge(trans.estado)}</TableCell>
                    <TableCell className="max-w-xs truncate">{trans.agricultor || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
