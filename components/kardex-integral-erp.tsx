"use client"

/**
 * KARDEX GENERAL - SAYARIQ SYSTEM
 *
 * Vista simplificada del Kardex que muestra:
 * 1. Movimiento de producto por categorías (entradas y salidas)
 * 2. Deudas pendientes (dinero)
 */

import { useState, useEffect, useMemo } from "react"
import { format } from "date-fns"
import {
  Package,
  DollarSign,
  RefreshCw,
  Plus,
  Minus,
  CheckCircle2,
  XCircle,
  Activity,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"

import kardexIntegralService from "@/lib/services/kardex-integral-service"
import type {
  MovimientoKardexIntegral,
  SaldoFisico,
  SaldoFinanciero,
} from "@/lib/types/kardex-integral"

export function KardexIntegralERP() {
  const [loading, setLoading] = useState(true)
  const [saldosFisicos, setSaldosFisicos] = useState<SaldoFisico[]>([])
  const [saldosFinancieros, setSaldosFinancieros] = useState<SaldoFinanciero[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoKardexIntegral[]>([])
  const [filtroTipo, setFiltroTipo] = useState<string>("todos")
  const [filtroDocumento, setFiltroDocumento] = useState<string>("todos")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const [fisicos, financieros, movs] = await Promise.all([
        kardexIntegralService.obtenerSaldosFisicos(),
        kardexIntegralService.obtenerSaldosFinancieros(),
        kardexIntegralService.obtenerMovimientos({ limit: 100 }),
      ])

      setSaldosFisicos(fisicos)
      setSaldosFinancieros(financieros)
      setMovimientos(movs.movimientos)
    } catch (error) {
      console.error("Error al cargar datos del kardex:", error)
    } finally {
      setLoading(false)
    }
  }

  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((mov) => {
      const cumpleTipo = filtroTipo === "todos" || mov.tipo_kardex === filtroTipo
      const cumpleDocumento =
        filtroDocumento === "todos" || mov.documento_tipo === filtroDocumento
      const cumpleBusqueda =
        searchTerm === "" ||
        mov.concepto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mov.persona_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mov.documento_tipo.toLowerCase().includes(searchTerm.toLowerCase())

      return cumpleTipo && cumpleDocumento && cumpleBusqueda
    })
  }, [movimientos, filtroTipo, filtroDocumento, searchTerm])

  const resumenCategorias = useMemo(() => {
    const resumen = new Map<string, { totalKg: number; lotes: Set<number> }>()
    saldosFisicos.forEach((saldo) => {
      const key = saldo.categoria_nombre || "Sin categoría"
      if (!resumen.has(key)) {
        resumen.set(key, { totalKg: 0, lotes: new Set() })
      }
      const item = resumen.get(key)
      if (item) {
        item.totalKg += saldo.saldo_actual || 0
        item.lotes.add(saldo.lote_id)
      }
    })
    return Array.from(resumen.entries()).map(([categoria, info]) => ({
      categoria,
      totalKg: info.totalKg,
      lotes: info.lotes.size,
    }))
  }, [saldosFisicos])

  const resumenDeudas = useMemo(() => {
    const financieros = saldosFinancieros || []
    const totalDeudas = financieros
      .filter((s) => s.cuenta_tipo === "adelantos")
      .reduce((sum, s) => sum + (s.total_egresos || 0), 0)
    const totalPagado = financieros
      .filter((s) => s.cuenta_tipo === "adelantos")
      .reduce((sum, s) => sum + (s.total_ingresos || 0), 0)
    return {
      totalDeudas,
      totalPagado,
      saldoPendiente: totalDeudas - totalPagado,
    }
  }, [saldosFinancieros])

  const totalStockKg = useMemo(() => {
    return saldosFisicos.reduce((sum, s) => sum + (s.saldo_actual || 0), 0)
  }, [saldosFisicos])

  const totalLotesActivos = useMemo(() => {
    return new Set(saldosFisicos.map((s) => s.lote_id)).size
  }, [saldosFisicos])

  if (loading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kardex General</h1>
          <p className="text-muted-foreground mt-1">
            Movimiento de producto por categorías y control de deudas
          </p>
        </div>
        <Button variant="outline" onClick={cargarDatos}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* TARJETAS RESUMEN */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Stock Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {totalStockKg.toLocaleString("es-PE", { minimumFractionDigits: 2 })} kg
            </p>
            <p className="text-xs text-muted-foreground">En {totalLotesActivos} lotes activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Categorías</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{resumenCategorias.length}</p>
            <p className="text-xs text-muted-foreground">Categorías con stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{movimientos.length}</p>
            <p className="text-xs text-muted-foreground">Registros totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Deudas Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-700">
              S/ {resumenDeudas.saldoPendiente.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground">Adelantos por regularizar</p>
          </CardContent>
        </Card>
      </div>

      {/* TABS PRINCIPALES */}
      <Tabs defaultValue="categorias" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="categorias">
            <Package className="mr-2 h-4 w-4" />
            Stock por Categoría
          </TabsTrigger>
          <TabsTrigger value="movimientos">
            <Activity className="mr-2 h-4 w-4" />
            Entradas y Salidas
          </TabsTrigger>
          <TabsTrigger value="deudas">
            <DollarSign className="mr-2 h-4 w-4" />
            Deudas
          </TabsTrigger>
        </TabsList>

        {/* TAB: STOCK POR CATEGORÍA */}
        <TabsContent value="categorias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumen por Categoría</CardTitle>
              <CardDescription>Stock disponible agrupado por tipo de producto</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Kg Disponibles</TableHead>
                    <TableHead className="text-right">Lotes Activos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumenCategorias.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">
                        No hay stock registrado en el Kardex.
                      </TableCell>
                    </TableRow>
                  ) : (
                    resumenCategorias.map((item) => (
                      <TableRow key={item.categoria}>
                        <TableCell className="font-medium">{item.categoria}</TableCell>
                        <TableCell className="text-right font-mono">
                          {item.totalKg.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">{item.lotes}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalle por Lote</CardTitle>
              <CardDescription>Stock físico desglosado por lote y categoría</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lote</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Productor</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Entradas (kg)</TableHead>
                      <TableHead className="text-right">Salidas (kg)</TableHead>
                      <TableHead className="text-right">Saldo (kg)</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saldosFisicos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                          No hay datos de inventario.
                        </TableCell>
                      </TableRow>
                    ) : (
                      saldosFisicos.map((saldo) => (
                        <TableRow key={`${saldo.lote_id}-${saldo.categoria_id ?? saldo.categoria_nombre}`}>
                          <TableCell className="font-medium">{saldo.lote_codigo || saldo.numero_lote}</TableCell>
                          <TableCell>{saldo.producto_nombre || saldo.producto}</TableCell>
                          <TableCell>{saldo.productor_nombre || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{saldo.categoria_nombre || "Sin categoría"}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-green-600 font-mono">
                            +{saldo.total_ingresos.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right text-red-600 font-mono">
                            -{saldo.total_egresos.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold">
                            {saldo.saldo_actual.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            {saldo.saldo_actual > 0 ? (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Disponible
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <XCircle className="mr-1 h-3 w-3" />
                                Agotado
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: ENTRADAS Y SALIDAS */}
        <TabsContent value="movimientos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registro de Movimientos</CardTitle>
              <CardDescription>Historial de entradas y salidas de producto</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Buscar por concepto o persona..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="fisico">Producto (Físico)</SelectItem>
                    <SelectItem value="financiero">Dinero (Financiero)</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filtroDocumento} onValueChange={setFiltroDocumento}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Documento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="liquidacion">Liquidación</SelectItem>
                    <SelectItem value="venta">Venta</SelectItem>
                    <SelectItem value="adelanto">Adelanto</SelectItem>
                    <SelectItem value="ajuste">Ajuste</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Dirección</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Persona</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Kg</TableHead>
                      <TableHead className="text-right">Monto S/</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimientosFiltrados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                          No hay movimientos que coincidan con los filtros.
                        </TableCell>
                      </TableRow>
                    ) : (
                      movimientosFiltrados.map((mov) => (
                        <TableRow key={mov.id}>
                          <TableCell className="font-mono text-sm">
                            {format(new Date(mov.fecha_movimiento), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell>
                            <Badge variant={mov.tipo_kardex === "fisico" ? "default" : "secondary"}>
                              {mov.tipo_kardex === "fisico" ? "Producto" : "Dinero"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {mov.tipo_movimiento === "ingreso" ? (
                                <Plus className="h-4 w-4 text-green-600" />
                              ) : (
                                <Minus className="h-4 w-4 text-red-600" />
                              )}
                              <span className={mov.tipo_movimiento === "ingreso" ? "text-green-600" : "text-red-600"}>
                                {mov.tipo_movimiento === "ingreso" ? "Entrada" : "Salida"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="capitalize">{mov.documento_tipo}</span>
                            {mov.documento_numero && (
                              <span className="text-xs text-muted-foreground ml-1">({mov.documento_numero})</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">{mov.persona_nombre || "—"}</TableCell>
                          <TableCell>
                            {mov.categoria_nombre ? (
                              <Badge variant="outline" className="text-xs">{mov.categoria_nombre}</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {mov.peso_kg ? (
                              <span className={mov.tipo_movimiento === "ingreso" ? "text-green-700" : "text-red-700"}>
                                {mov.tipo_movimiento === "ingreso" ? "+" : "-"}
                                {parseFloat(mov.peso_kg.toString()).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {mov.monto ? (
                              <span className={mov.tipo_movimiento === "egreso" ? "text-red-700" : "text-green-700"}>
                                {mov.tipo_movimiento === "egreso" ? "-" : "+"}S/{" "}
                                {parseFloat(mov.monto.toString()).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>

              <div className="text-xs text-muted-foreground text-right">
                {movimientosFiltrados.length} movimientos encontrados
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: DEUDAS */}
        <TabsContent value="deudas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Control de Deudas</CardTitle>
              <CardDescription>Resumen de adelantos y pagos pendientes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                {saldosFinancieros.length === 0 ? (
                  <div className="col-span-3 text-center text-sm text-muted-foreground py-8">
                    No hay datos financieros registrados en el Kardex.
                  </div>
                ) : (
                  saldosFinancieros.map((saldo) => (
                    <Card key={saldo.cuenta_tipo} className="bg-muted/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm capitalize flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          {saldo.cuenta_tipo}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-2xl font-bold">
                          S/ {saldo.saldo_actual.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Ingresos:</span>
                            <span className="ml-1 text-green-600 font-mono">
                              S/ {saldo.total_ingresos.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Egresos:</span>
                            <span className="ml-1 text-red-600 font-mono">
                              S/ {saldo.total_egresos.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Movimientos Financieros Recientes</CardTitle>
                  <CardDescription>Adelantos, liquidaciones y pagos</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Persona</TableHead>
                          <TableHead>Concepto</TableHead>
                          <TableHead>Cuenta</TableHead>
                          <TableHead className="text-right">Monto S/</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movimientos
                          .filter((mov) => mov.tipo_kardex === "financiero")
                          .map((mov) => (
                            <TableRow key={mov.id}>
                              <TableCell className="font-mono text-sm">
                                {format(new Date(mov.fecha_movimiento), "dd/MM/yyyy")}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={mov.tipo_movimiento === "ingreso" ? "default" : "destructive"}
                                  className="text-xs"
                                >
                                  {mov.tipo_movimiento === "ingreso" ? "Ingreso" : "Egreso"}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-[150px] truncate">
                                {mov.persona_nombre || "—"}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">{mov.concepto}</TableCell>
                              <TableCell className="capitalize">{mov.cuenta_tipo}</TableCell>
                              <TableCell className="text-right font-mono font-semibold">
                                <span
                                  className={mov.tipo_movimiento === "egreso" ? "text-red-700" : "text-green-700"}
                                >
                                  {mov.tipo_movimiento === "egreso" ? "-" : "+"}S/{" "}
                                  {parseFloat(mov.monto?.toString() || "0").toFixed(2)}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-4 w-[400px]" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-[100px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[120px]" />
              <Skeleton className="h-3 w-[80px] mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
