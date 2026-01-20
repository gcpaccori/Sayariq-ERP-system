"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Search, Calculator, DollarSign, Package, Scale, Edit } from "lucide-react"

interface CategoriaVenta {
  categoria: string
  kilogramos: number               // peso original categoria
  numeroJabas: number              // nº jabas categoría
  pesoJabas: number                // peso TOTAL de jabas (kg) en esa categoría
  porcentajeHumedad: number        // %
  pesoDescuentoHumedad: number     // kg
  pesoAjustadoSinHumedad: number   // peso_original - pesoJabas
  pesoNetoLiqui: number            // pesoAjustadoSinHumedad - pesoDescuentoHumedad
  precioVenta: number
  pedidoId: string
  totalVenta: number               // precioVenta * pesoNetoLiqui
}

interface LoteData {
  id: string
  loteId: string
  productor: string
  pesoTotal: number
  pesoJabas: number
  pesoNeto: number
  adelantos: number
  categoriasVentas: CategoriaVenta[]
  multiplicadorHumedad: number
  descuentoJabas: boolean
}

// ---------- CÁLCULO *ÚNICO* POR CATEGORÍA ----------
function recalcCategoria(cat: CategoriaVenta): CategoriaVenta {
  const kilos = isNaN(cat.kilogramos) ? 0 : cat.kilogramos
  const pesoJabas = isNaN(cat.pesoJabas) ? 0 : cat.pesoJabas
  const porcHum = isNaN(cat.porcentajeHumedad) ? 0 : cat.porcentajeHumedad
  const precio = isNaN(cat.precioVenta) ? 0 : cat.precioVenta

  // 1. peso ajustado sin humedad (descontando jabas)
  let pesoSinHum = kilos - pesoJabas
  if (pesoSinHum < 0) pesoSinHum = 0

  // 2. descuento humedad
  const factorHum = porcHum / 100
  const descHum = pesoSinHum * factorHum

  // 3. peso neto liquidación
  let pesoLiqui = pesoSinHum - descHum
  if (pesoLiqui < 0) pesoLiqui = 0

  const total = pesoLiqui * precio

  return {
    ...cat,
    pesoAjustadoSinHumedad: pesoSinHum,
    pesoDescuentoHumedad: descHum,
    pesoNetoLiqui: pesoLiqui,
    totalVenta: total,
  }
}

export function LoteLiquidacion() {
  const [lotes, setLotes] = useState<LoteData[]>(() => {
    const base: LoteData[] = [
      {
        id: "1",
        loteId: "L001",
        productor: "Juan Pérez",
        pesoTotal: 1000,
        pesoJabas: 50,
        pesoNeto: 950,
        adelantos: 500,
        multiplicadorHumedad: 0.95,
        descuentoJabas: true,
        categoriasVentas: [
          {
            categoria: "Exportable",
            kilogramos: 1,
            numeroJabas: 1,
            pesoJabas: 0.05,    // si aquí pones 0.05, con 4% hum y 8.5/kg te da ~7.75
            porcentajeHumedad: 4,
            pesoDescuentoHumedad: 0,
            pesoAjustadoSinHumedad: 0,
            pesoNetoLiqui: 0,
            precioVenta: 8.5,
            pedidoId: "P001",
            totalVenta: 0,
          },
          {
            categoria: "Industrial",
            kilogramos: 1,
            numeroJabas: 2,
            pesoJabas: 0.05,
            porcentajeHumedad: 0.4,
            pesoDescuentoHumedad: 0,
            pesoAjustadoSinHumedad: 0,
            pesoNetoLiqui: 0,
            precioVenta: 3.5,
            pedidoId: "P001",
            totalVenta: 0,
          },
        ],
      },
    ]

    // recálculo inicial
    return base.map((lote) => ({
      ...lote,
      categoriasVentas: lote.categoriasVentas.map(recalcCategoria),
    }))
  })

  const [selectedLote, setSelectedLote] = useState<LoteData>(lotes[0])
  const [searchTerm, setSearchTerm] = useState("")
  const [editingPrices, setEditingPrices] = useState(false)

  const updateLoteState = (updated: LoteData) => {
    setSelectedLote(updated)
    setLotes((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
  }

  const calcularTotalVentas = (lote: LoteData) =>
    lote.categoriasVentas.reduce((sum, cat) => sum + cat.totalVenta, 0)

  const calcularPesoLiquidacionGlobal = (lote: LoteData) => {
    let pesoFinal = lote.pesoTotal
    if (lote.descuentoJabas) pesoFinal -= lote.pesoJabas
    return pesoFinal * lote.multiplicadorHumedad
  }

  const calcularLiquidacionFinal = (lote: LoteData) =>
    calcularTotalVentas(lote) - lote.adelantos

  // --------- handlers de categoría ----------
  const updateCategoria = (
    index: number,
    updater: (c: CategoriaVenta) => CategoriaVenta
  ) => {
    const updated: LoteData = { ...selectedLote }
    const cats = [...updated.categoriasVentas]

    const updatedCat = updater(cats[index])
    cats[index] = recalcCategoria(updatedCat)

    updated.categoriasVentas = cats
    updateLoteState(updated)
  }

  const handleUpdateKilogramos = (i: number, v: number) =>
    updateCategoria(i, (c) => ({ ...c, kilogramos: isNaN(v) ? 0 : v }))

  const handleUpdateNumeroJabas = (i: number, v: number) =>
    updateCategoria(i, (c) => ({ ...c, numeroJabas: isNaN(v) ? 0 : v }))

  const handleUpdatePesoJabas = (i: number, v: number) =>
    updateCategoria(i, (c) => ({ ...c, pesoJabas: isNaN(v) ? 0 : v }))

  const handleUpdatePorcentajeHumedad = (i: number, v: number) =>
    updateCategoria(i, (c) => ({ ...c, porcentajeHumedad: isNaN(v) ? 0 : v }))

  const handleUpdatePrecioVenta = (i: number, v: number) =>
    updateCategoria(i, (c) => ({ ...c, precioVenta: isNaN(v) ? 0 : v }))

  // ----- otros handlers -----
  const handleUpdateMultiplicadorGlobal = (v: number) => {
    const updated: LoteData = {
      ...selectedLote,
      multiplicadorHumedad: isNaN(v) ? 0 : v,
    }
    updateLoteState(updated)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lote Liquidación</h1>
          <p className="text-muted-foreground">
            Liquidación con descuento de jabas y humedad por categoría
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Selector de lote */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Seleccionar Lote</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar lote..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="space-y-2">
              {lotes
                .filter(
                  (l) =>
                    l.loteId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    l.productor.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((lote) => (
                  <Button
                    key={lote.id}
                    variant={selectedLote.id === lote.id ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setSelectedLote(lote)}
                  >
                    <Package className="mr-2 h-4 w-4" />
                    {lote.loteId} - {lote.productor}
                  </Button>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Detalles del lote */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Liquidación Lote {selectedLote.loteId}
                  </CardTitle>
                  <CardDescription>
                    Productor: {selectedLote.productor}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  <DollarSign className="mr-1 h-4 w-4" />
                  S/ {calcularLiquidacionFinal(selectedLote).toFixed(2)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="ventas" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="ventas">Ventas por Categoría</TabsTrigger>
                  <TabsTrigger value="calculos">Cálculos</TabsTrigger>
                  <TabsTrigger value="ajustes">Ajustes</TabsTrigger>
                  <TabsTrigger value="resumen">Resumen</TabsTrigger>
                </TabsList>

                {/* TAB VENTAS */}
                <TabsContent value="ventas" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Detalle por Categoría</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingPrices(!editingPrices)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      {editingPrices ? "Cerrar edición precios" : "Editar Precios"}
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Peso Original (kg)</TableHead>
                        <TableHead>N° Jabas</TableHead>
                        <TableHead>Peso Jabas (kg)</TableHead>
                        <TableHead>Peso Ajustado (kg)</TableHead>
                        <TableHead>Hum. (%)</TableHead>
                        <TableHead>Desc. Hum. (kg)</TableHead>
                        <TableHead>Peso Neto Liqui (kg)</TableHead>
                        <TableHead>Precio/kg</TableHead>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedLote.categoriasVentas.map((categoria, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {categoria.categoria}
                          </TableCell>

                          {/* Peso original */}
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={categoria.kilogramos}
                              onChange={(e) =>
                                handleUpdateKilogramos(
                                  index,
                                  Number.parseFloat(e.target.value || "0")
                                )
                              }
                              className="w-24"
                            />
                          </TableCell>

                          {/* N° jabas (informativo por ahora) */}
                          <TableCell>
                            <Input
                              type="number"
                              step="1"
                              value={categoria.numeroJabas}
                              onChange={(e) =>
                                handleUpdateNumeroJabas(
                                  index,
                                  Number.parseInt(e.target.value || "0")
                                )
                              }
                              className="w-20"
                            />
                          </TableCell>

                          {/* Peso jabas (kg totales) - ESTE SÍ IMPACTA */}
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={categoria.pesoJabas}
                              onChange={(e) =>
                                handleUpdatePesoJabas(
                                  index,
                                  Number.parseFloat(e.target.value || "0")
                                )
                              }
                              className="w-24"
                            />
                          </TableCell>

                          {/* Peso ajustado sin humedad = kilo - pesoJabas */}
                          <TableCell>
                            {categoria.pesoAjustadoSinHumedad.toFixed(2)} kg
                          </TableCell>

                          {/* Humedad % */}
                          <TableCell>
                            <Input
                              type="number"
                              step="0.1"
                              value={categoria.porcentajeHumedad}
                              onChange={(e) =>
                                handleUpdatePorcentajeHumedad(
                                  index,
                                  Number.parseFloat(e.target.value || "0")
                                )
                              }
                              className="w-20"
                            />
                          </TableCell>

                          {/* Descuento humedad */}
                          <TableCell>
                            {categoria.pesoDescuentoHumedad.toFixed(2)} kg
                          </TableCell>

                          {/* Peso neto liquidación */}
                          <TableCell>
                            {categoria.pesoNetoLiqui.toFixed(2)} kg
                          </TableCell>

                          {/* Precio / kg */}
                          <TableCell>
                            {editingPrices ? (
                              <Input
                                type="number"
                                step="0.01"
                                value={categoria.precioVenta}
                                onChange={(e) =>
                                  handleUpdatePrecioVenta(
                                    index,
                                    Number.parseFloat(e.target.value || "0")
                                  )
                                }
                                className="w-20"
                              />
                            ) : (
                              `S/ ${categoria.precioVenta.toFixed(2)}`
                            )}
                          </TableCell>

                          {/* Pedido */}
                          <TableCell>
                            <Badge variant="outline">{categoria.pedidoId}</Badge>
                          </TableCell>

                          {/* Total venta */}
                          <TableCell className="font-semibold">
                            S/ {categoria.totalVenta.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}

                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell colSpan={10}>Total Ventas</TableCell>
                        <TableCell>
                          S/ {calcularTotalVentas(selectedLote).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TabsContent>

                {/* TAB CÁLCULOS */}
                <TabsContent value="calculos" className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Pesos Globales</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span>Peso Total:</span>
                          <span className="font-semibold">
                            {selectedLote.pesoTotal} kg
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Peso Jabas:</span>
                          <span className="font-semibold">
                            {selectedLote.pesoJabas} kg
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Peso Neto:</span>
                          <span className="font-semibold">
                            {selectedLote.pesoNeto} kg
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span>Peso Liquidación Global:</span>
                          <span className="font-semibold text-primary">
                            {calcularPesoLiquidacionGlobal(selectedLote).toFixed(2)} kg
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Financiero</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span>Total Ventas (categorías):</span>
                          <span className="font-semibold text-green-600">
                            S/ {calcularTotalVentas(selectedLote).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Adelantos:</span>
                          <span className="font-semibold text-red-600">
                            -S/ {selectedLote.adelantos.toFixed(2)}
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span>Liquidación Final:</span>
                          <span className="font-semibold text-primary text-lg">
                            S/ {calcularLiquidacionFinal(selectedLote).toFixed(2)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* TAB AJUSTES */}
                <TabsContent value="ajustes" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Ajustes Globales de Peso
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="descuento-jabas"
                            checked={selectedLote.descuentoJabas}
                            onChange={(e) =>
                              updateLoteState({
                                ...selectedLote,
                                descuentoJabas: e.target.checked,
                              })
                            }
                          />
                          <Label htmlFor="descuento-jabas">
                            Descontar peso de jabas (global)
                          </Label>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="multiplicador-humedad">
                            Multiplicador Humedad Global (
                            {(selectedLote.multiplicadorHumedad * 100).toFixed(1)}%)
                          </Label>
                          <Input
                            id="multiplicador-humedad"
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={selectedLote.multiplicadorHumedad}
                            onChange={(e) =>
                              handleUpdateMultiplicadorGlobal(
                                Number.parseFloat(e.target.value || "0")
                              )
                            }
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Adelantos</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="adelantos">Adelantos Otorgados</Label>
                          <Input
                            id="adelantos"
                            type="number"
                            step="0.01"
                            value={selectedLote.adelantos}
                            onChange={(e) =>
                              updateLoteState({
                                ...selectedLote,
                                adelantos: Number.parseFloat(e.target.value || "0"),
                              })
                            }
                          />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Los adelantos se descuentan del total de ventas de categorías
                          para obtener la liquidación final.
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* TAB RESUMEN */}
                <TabsContent value="resumen" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl">Resumen de Liquidación</CardTitle>
                      <CardDescription>
                        Lote {selectedLote.loteId} - {selectedLote.productor}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <Scale className="mx-auto h-8 w-8 text-blue-600 mb-2" />
                          <div className="text-2xl font-bold text-blue-600">
                            {calcularPesoLiquidacionGlobal(selectedLote).toFixed(0)}
                          </div>
                          <div className="text-sm text-blue-600">
                            kg Liquidación Global
                          </div>
                        </div>

                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <DollarSign className="mx-auto h-8 w-8 text-green-600 mb-2" />
                          <div className="text-2xl font-bold text-green-600">
                            S/ {calcularTotalVentas(selectedLote).toFixed(0)}
                          </div>
                          <div className="text-sm text-green-600">Total Ventas</div>
                        </div>

                        <div className="text-center p-4 bg-primary/10 rounded-lg">
                          <Calculator className="mx-auto h-8 w-8 text-primary mb-2" />
                          <div className="text-2xl font-bold text-primary">
                            S/ {calcularLiquidacionFinal(selectedLote).toFixed(0)}
                          </div>
                          <div className="text-sm text-primary">
                            Liquidación Final
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3 text-sm">
                        <h4 className="font-semibold">Desglose Global:</h4>
                        <div className="flex justify-between">
                          <span>Peso original:</span>
                          <span>{selectedLote.pesoTotal} kg</span>
                        </div>
                        {selectedLote.descuentoJabas && (
                          <div className="flex justify-between">
                            <span>- Descuento jabas global:</span>
                            <span>{selectedLote.pesoJabas} kg</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>× Multiplicador humedad global:</span>
                          <span>
                            {(selectedLote.multiplicadorHumedad * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between font-semibold border-t pt-2">
                          <span>= Peso liquidación global:</span>
                          <span>
                            {calcularPesoLiquidacionGlobal(selectedLote).toFixed(2)} kg
                          </span>
                        </div>
                      </div>

                      <Button className="w-full" size="lg">
                        <Calculator className="mr-2 h-4 w-4" />
                        Procesar Liquidación
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
