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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, TrendingUp, TrendingDown, Package, Search } from "lucide-react"
import type { MovimientoKardex, SaldoKardex } from "@/lib/types/appwrite"

export function KardexLotes() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroLote, setFiltroLote] = useState("todos")
  const [isNuevoMovimientoOpen, setIsNuevoMovimientoOpen] = useState(false)

  // Mock data - replace with actual data from service
  const [movimientos] = useState<MovimientoKardex[]>([
    {
      $id: "1",
      fecha: "2024-12-15",
      loteId: "lote1",
      codigoLote: "LOT-2024-018",
      tipoMovimiento: "ingreso",
      categoria: "exportable",
      cantidad: 3671,
      precioUnitario: 2.2,
      valorTotal: 8076.2,
      saldoAnterior: 0,
      saldoActual: 3671,
      motivo: "Procesamiento inicial",
      responsable: "Juan Pérez",
      documentoReferencia: "C2425-0356",
    } as MovimientoKardex,
    {
      $id: "2",
      fecha: "2024-12-15",
      loteId: "lote1",
      codigoLote: "LOT-2024-018",
      tipoMovimiento: "ingreso",
      categoria: "industrial",
      cantidad: 446,
      precioUnitario: 1.2,
      valorTotal: 535.2,
      saldoAnterior: 0,
      saldoActual: 446,
      motivo: "Procesamiento inicial",
      responsable: "Juan Pérez",
      documentoReferencia: "C2425-0356",
    } as MovimientoKardex,
    {
      $id: "3",
      fecha: "2024-12-16",
      loteId: "lote1",
      codigoLote: "LOT-2024-018",
      tipoMovimiento: "salida",
      categoria: "exportable",
      cantidad: 500,
      precioUnitario: 2.2,
      valorTotal: 1100,
      saldoAnterior: 3671,
      saldoActual: 3171,
      motivo: "Venta a cliente",
      responsable: "María García",
      documentoReferencia: "VTA-001",
    } as MovimientoKardex,
  ])

  const [saldos] = useState<SaldoKardex[]>([
    {
      loteId: "lote1",
      codigoLote: "LOT-2024-018",
      exportable: 3171,
      industrial: 446,
      descarte: 133.6,
      total: 3750.6,
      ultimaActualizacion: "2024-12-16",
    },
    {
      loteId: "lote2",
      codigoLote: "LOT-2024-019",
      exportable: 2500,
      industrial: 300,
      descarte: 100,
      total: 2900,
      ultimaActualizacion: "2024-12-15",
    },
  ])

  const [formData, setFormData] = useState({
    loteId: "",
    codigoLote: "",
    tipoMovimiento: "ingreso" as "ingreso" | "salida",
    categoria: "exportable" as "exportable" | "industrial" | "descarte",
    cantidad: "",
    precioUnitario: "",
    motivo: "",
    responsable: "",
    documentoReferencia: "",
  })

  const movimientosFiltrados = movimientos.filter((mov) => {
    const coincideBusqueda =
      mov.codigoLote.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.motivo.toLowerCase().includes(searchTerm.toLowerCase())

    const coincideLote = filtroLote === "todos" || mov.loteId === filtroLote

    return coincideBusqueda && coincideLote
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Registrar movimiento:", formData)
    setIsNuevoMovimientoOpen(false)
  }

  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(valor)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Kardex de Lotes</h1>
            <p className="text-gray-600">Control de ingresos, salidas y saldos por categoría</p>
          </div>
        </div>
        <Dialog open={isNuevoMovimientoOpen} onOpenChange={setIsNuevoMovimientoOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Movimiento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Registrar Movimiento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigoLote">Código de Lote *</Label>
                  <Input
                    id="codigoLote"
                    value={formData.codigoLote}
                    onChange={(e) => setFormData({ ...formData, codigoLote: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipoMovimiento">Tipo de Movimiento *</Label>
                  <Select
                    value={formData.tipoMovimiento}
                    onValueChange={(value: "ingreso" | "salida") => setFormData({ ...formData, tipoMovimiento: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ingreso">Ingreso</SelectItem>
                      <SelectItem value="salida">Salida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoría *</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(value: "exportable" | "industrial" | "descarte") =>
                      setFormData({ ...formData, categoria: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exportable">Exportable</SelectItem>
                      <SelectItem value="industrial">Industrial</SelectItem>
                      <SelectItem value="descarte">Descarte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cantidad">Cantidad (kg) *</Label>
                  <Input
                    id="cantidad"
                    type="number"
                    step="0.01"
                    value={formData.cantidad}
                    onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="precioUnitario">Precio Unitario (S/)</Label>
                  <Input
                    id="precioUnitario"
                    type="number"
                    step="0.01"
                    value={formData.precioUnitario}
                    onChange={(e) => setFormData({ ...formData, precioUnitario: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="responsable">Responsable *</Label>
                  <Input
                    id="responsable"
                    value={formData.responsable}
                    onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                    required
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

              <div className="space-y-2">
                <Label htmlFor="documentoReferencia">Documento de Referencia</Label>
                <Input
                  id="documentoReferencia"
                  value={formData.documentoReferencia}
                  onChange={(e) => setFormData({ ...formData, documentoReferencia: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsNuevoMovimientoOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Registrar Movimiento</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumen de Saldos */}
      <Card className="sayariq-card">
        <CardHeader>
          <CardTitle>Saldos Actuales por Lote</CardTitle>
          <CardDescription>Vista consolidada de inventario por categoría</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código Lote</TableHead>
                  <TableHead className="text-right">Exportable (kg)</TableHead>
                  <TableHead className="text-right">Industrial (kg)</TableHead>
                  <TableHead className="text-right">Descarte (kg)</TableHead>
                  <TableHead className="text-right">Total (kg)</TableHead>
                  <TableHead>Última Actualización</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {saldos.map((saldo) => (
                  <TableRow key={saldo.loteId}>
                    <TableCell className="font-medium">{saldo.codigoLote}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {saldo.exportable.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-blue-600 font-medium">
                      {saldo.industrial.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600 font-medium">
                      {saldo.descarte.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-bold">{saldo.total.toFixed(2)}</TableCell>
                    <TableCell>{new Date(saldo.ultimaActualizacion).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card className="sayariq-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por código de lote o motivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 sayariq-input"
              />
            </div>
            <Select value={filtroLote} onValueChange={setFiltroLote}>
              <SelectTrigger className="w-full sm:w-48 sayariq-input">
                <SelectValue placeholder="Filtrar por lote" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los lotes</SelectItem>
                {saldos.map((saldo) => (
                  <SelectItem key={saldo.loteId} value={saldo.loteId}>
                    {saldo.codigoLote}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Movimientos por Categoría */}
      <Card className="sayariq-card">
        <CardHeader>
          <CardTitle>Movimientos de Kardex</CardTitle>
          <CardDescription>{movimientosFiltrados.length} movimientos registrados</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="todos" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="exportable">Exportable</TabsTrigger>
              <TabsTrigger value="industrial">Industrial</TabsTrigger>
              <TabsTrigger value="descarte">Descarte</TabsTrigger>
            </TabsList>

            <TabsContent value="todos" className="mt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Saldo Anterior</TableHead>
                      <TableHead className="text-right">Saldo Actual</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimientosFiltrados.map((mov) => (
                      <TableRow key={mov.$id}>
                        <TableCell>{new Date(mov.fecha).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{mov.codigoLote}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {mov.tipoMovimiento === "ingreso" ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            )}
                            <span className={mov.tipoMovimiento === "ingreso" ? "text-green-600" : "text-red-600"}>
                              {mov.tipoMovimiento === "ingreso" ? "Ingreso" : "Salida"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{mov.categoria}</TableCell>
                        <TableCell className="text-right font-medium">{mov.cantidad.toFixed(2)} kg</TableCell>
                        <TableCell className="text-right">{mov.saldoAnterior.toFixed(2)} kg</TableCell>
                        <TableCell className="text-right font-bold">{mov.saldoActual.toFixed(2)} kg</TableCell>
                        <TableCell className="text-right">
                          {mov.valorTotal ? formatearMoneda(mov.valorTotal) : "-"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{mov.motivo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {["exportable", "industrial", "descarte"].map((categoria) => (
              <TabsContent key={categoria} value={categoria} className="mt-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Lote</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Saldo Anterior</TableHead>
                        <TableHead className="text-right">Saldo Actual</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                        <TableHead>Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movimientosFiltrados
                        .filter((mov) => mov.categoria === categoria)
                        .map((mov) => (
                          <TableRow key={mov.$id}>
                            <TableCell>{new Date(mov.fecha).toLocaleDateString()}</TableCell>
                            <TableCell className="font-medium">{mov.codigoLote}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {mov.tipoMovimiento === "ingreso" ? (
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 text-red-600" />
                                )}
                                <span className={mov.tipoMovimiento === "ingreso" ? "text-green-600" : "text-red-600"}>
                                  {mov.tipoMovimiento === "ingreso" ? "Ingreso" : "Salida"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">{mov.cantidad.toFixed(2)} kg</TableCell>
                            <TableCell className="text-right">{mov.saldoAnterior.toFixed(2)} kg</TableCell>
                            <TableCell className="text-right font-bold">{mov.saldoActual.toFixed(2)} kg</TableCell>
                            <TableCell className="text-right">
                              {mov.valorTotal ? formatearMoneda(mov.valorTotal) : "-"}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{mov.motivo}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
