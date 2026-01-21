"use client"

/**
 * =====================================================
 * KARDEX INTEGRAL ERP - SISTEMA COMPLETO
 * =====================================================
 * El mejor sistema de Kardex Industrial para Sayariq
 * Integra control físico y financiero en tiempo real
 */

import { useState, useEffect, useMemo } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  AlertTriangle,
  Eye,
  FileText,
  BarChart3,
  ArrowUpDown,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  Search,
  Plus,
  Minus,
  CheckCircle2,
  XCircle,
  Clock,
  Wallet,
  ShoppingCart,
  Users,
  Box,
  Activity,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"

import kardexIntegralService from "@/lib/services/kardex-integral-service"
import type {
  DashboardKardex,
  MovimientoKardexIntegral,
  SaldoFisico,
  SaldoFinanciero,
} from "@/lib/types/kardex-integral"

export function KardexIntegralERP() {
  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState<DashboardKardex | null>(null)
  const [saldosFisicos, setSaldosFisicos] = useState<SaldoFisico[]>([])
  const [saldosFinancieros, setSaldosFinancieros] = useState<SaldoFinanciero[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoKardexIntegral[]>([])
  const [filtroTipo, setFiltroTipo] = useState<string>("todos")
  const [filtroDocumento, setFiltroDocumento] = useState<string>("todos")
  const [searchTerm, setSearchTerm] = useState("")

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const [dashData, fisicos, financieros, movs] = await Promise.all([
        kardexIntegralService.obtenerDashboard(),
        kardexIntegralService.obtenerSaldosFisicos(),
        kardexIntegralService.obtenerSaldosFinancieros(),
        kardexIntegralService.obtenerMovimientos({ limit: 50 }),
      ])

      setDashboard(dashData)
      setSaldosFisicos(fisicos)
      setSaldosFinancieros(financieros)
      setMovimientos(movs.movimientos)
    } catch (error) {
      console.error("Error al cargar datos del kardex:", error)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar movimientos
  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((mov) => {
      const cumpleTipo = filtroTipo === "todos" || mov.tipo_kardex === filtroTipo
      const cumpleDocumento =
        filtroDocumento === "todos" || mov.documento_tipo === filtroDocumento
      const cumpleBusqueda =
        searchTerm === "" ||
        mov.concepto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mov.documento_tipo.toLowerCase().includes(searchTerm.toLowerCase())

      return cumpleTipo && cumpleDocumento && cumpleBusqueda
    })
  }, [movimientos, filtroTipo, filtroDocumento, searchTerm])

  if (loading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Kardex Integral ERP</h1>
          <p className="text-muted-foreground mt-1">
            Sistema completo de control físico y financiero en tiempo real
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={cargarDatos}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button variant="default">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* ALERTAS */}
      {dashboard?.alertas && dashboard.alertas.length > 0 && (
        <div className="space-y-2">
          {dashboard.alertas.map((alerta, idx) => (
            <Alert
              key={idx}
              variant={alerta.tipo === "error" ? "destructive" : "default"}
              className={
                alerta.tipo === "warning"
                  ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
                  : ""
              }
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {alerta.tipo === "error" ? "Error" : alerta.tipo === "warning" ? "Advertencia" : "Info"}
              </AlertTitle>
              <AlertDescription>{alerta.mensaje}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* TARJETAS DE RESUMEN */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Stock Total */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.resumen_fisico.total_stock_kg.toLocaleString("es-PE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              kg
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboard?.resumen_fisico.total_lotes_activos} lotes activos
            </p>
          </CardContent>
        </Card>

        {/* Valor Inventario */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Inventario</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              S/{" "}
              {dashboard?.resumen_fisico.valor_inventario.toLocaleString("es-PE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboard?.resumen_fisico.total_categorias} categorías
            </p>
          </CardContent>
        </Card>

        {/* Saldo Banco */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Banco</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              S/{" "}
              {dashboard?.resumen_financiero.saldo_banco.toLocaleString("es-PE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Caja: S/{" "}
              {dashboard?.resumen_financiero.saldo_caja.toLocaleString("es-PE", {
                minimumFractionDigits: 2,
              })}
            </p>
          </CardContent>
        </Card>

        {/* Flujo Neto Mes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flujo Neto Mes</CardTitle>
            {dashboard && dashboard.resumen_financiero.flujo_neto_mes >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                dashboard && dashboard.resumen_financiero.flujo_neto_mes >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              S/{" "}
              {dashboard?.resumen_financiero.flujo_neto_mes.toLocaleString("es-PE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Ventas: S/{" "}
              {dashboard?.resumen_financiero.total_ventas_mes.toLocaleString("es-PE", {
                minimumFractionDigits: 0,
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* TABS PRINCIPALES */}
      <Tabs defaultValue="detallado" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="detallado">
            <FileText className="mr-2 h-4 w-4" />
            Detallado
          </TabsTrigger>
          <TabsTrigger value="movimientos">
            <Activity className="mr-2 h-4 w-4" />
            Movimientos
          </TabsTrigger>
          <TabsTrigger value="fisico">
            <Box className="mr-2 h-4 w-4" />
            Stock Físico
          </TabsTrigger>
          <TabsTrigger value="financiero">
            <DollarSign className="mr-2 h-4 w-4" />
            Cuentas
          </TabsTrigger>
          <TabsTrigger value="reportes">
            <BarChart3 className="mr-2 h-4 w-4" />
            Reportes
          </TabsTrigger>
        </TabsList>

        {/* TAB: VISTA DETALLADA COMBINADA */}
        <TabsContent value="detallado" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Registro Detallado de Operaciones</CardTitle>
                  <CardDescription className="text-xs">
                    Vista combinada: físico + financiero con detalles de calidades y kilajes
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={cargarDatos}>
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Actualizar
                  </Button>
                  <Button size="sm">
                    <Download className="mr-2 h-3 w-3" />
                    Exportar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[90px] text-xs">Fecha</TableHead>
                      <TableHead className="w-[100px] text-xs">Operación</TableHead>
                      <TableHead className="w-[110px] text-xs">Documento</TableHead>
                      <TableHead className="w-[150px] text-xs">Persona</TableHead>
                      <TableHead className="w-[120px] text-xs">Producto/Cuenta</TableHead>
                      <TableHead className="w-[100px] text-xs">Calidad</TableHead>
                      <TableHead className="w-[80px] text-xs text-right">Kg</TableHead>
                      <TableHead className="w-[90px] text-xs text-right">Monto S/</TableHead>
                      <TableHead className="w-[80px] text-xs text-right">Saldo Kg</TableHead>
                      <TableHead className="w-[90px] text-xs text-right">Saldo S/</TableHead>
                      <TableHead className="w-[80px] text-xs">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimientosFiltrados.slice(0, 10).map((mov) => (
                      <TableRow key={mov.id} className="text-xs hover:bg-muted/30">
                        <TableCell className="py-2 font-mono">
                          {format(new Date(mov.fecha_movimiento), "dd/MM/yy HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1">
                            {mov.tipo_movimiento === "ingreso" ? (
                              <TrendingUp className="h-3 w-3 text-green-600" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-600" />
                            )}
                            <span className="capitalize">
                              {mov.tipo_kardex === "fisico" ? "Entrada" : ""}
                              {mov.tipo_kardex === "financiero" && mov.tipo_movimiento === "egreso" ? "Pago" : ""}
                              {mov.tipo_kardex === "financiero" && mov.tipo_movimiento === "ingreso" ? "Cobro" : ""}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <div>
                            <div className="font-medium text-xs">{mov.documento_tipo.toUpperCase()}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {mov.documento_numero || `#${mov.documento_id}`}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <div>
                            <div className="font-medium text-xs truncate max-w-[140px]">
                              {mov.persona_nombre || "—"}
                            </div>
                            <div className="text-[10px] text-muted-foreground capitalize">
                              {mov.persona_tipo || "—"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          {mov.tipo_kardex === "fisico" ? (
                            <div>
                              <div className="text-xs font-medium">{mov.producto_nombre || "Producto"}</div>
                              <div className="text-[10px] text-muted-foreground">
                                Lote: {mov.lote_codigo || mov.lote_id}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs capitalize">{mov.cuenta_descripcion || mov.cuenta_tipo}</div>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          {mov.categoria_nombre ? (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {mov.categoria_nombre}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono text-xs">
                          {mov.peso_kg ? (
                            <span className={mov.tipo_movimiento === "ingreso" ? "text-green-700" : "text-red-700"}>
                              {mov.tipo_movimiento === "ingreso" ? "+" : "-"}
                              {parseFloat(mov.peso_kg.toString()).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono text-xs">
                          {mov.monto ? (
                            <span className={mov.tipo_movimiento === "egreso" ? "text-red-700" : "text-green-700"}>
                              {mov.tipo_movimiento === "egreso" ? "-" : "+"}
                              {parseFloat(mov.monto.toString()).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono text-xs font-semibold">
                          {mov.saldo_fisico_kg
                            ? parseFloat(mov.saldo_fisico_kg.toString()).toFixed(2)
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono text-xs font-semibold">
                          {mov.saldo_financiero
                            ? parseFloat(mov.saldo_financiero.toString()).toFixed(2)
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="py-2">
                          {mov.tipo_movimiento === "ingreso" ? (
                            <Badge variant="default" className="bg-green-100 text-green-800 text-[10px] px-1 py-0">
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="default" className="bg-red-100 text-red-800 text-[10px] px-1 py-0">
                              Procesado
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Paginación */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-xs text-muted-foreground">
                  Mostrando {Math.min(10, movimientosFiltrados.length)} de {movimientosFiltrados.length} registros
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled>
                    Anterior
                  </Button>
                  <Button size="sm" variant="outline">
                    Siguiente
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: MOVIMIENTOS */}
        <TabsContent value="movimientos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Movimientos Recientes</CardTitle>
              <CardDescription>
                Todos los movimientos físicos y financieros del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filtros */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar movimiento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Tipo Kardex" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="fisico">Físico</SelectItem>
                    <SelectItem value="financiero">Financiero</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filtroDocumento} onValueChange={setFiltroDocumento}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Tipo Documento" />
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

              {/* Tabla de movimientos */}
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Movimiento</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Cantidad/Monto</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimientosFiltrados.map((mov) => (
                      <TableRow key={mov.id}>
                        <TableCell className="font-medium">
                          {format(new Date(mov.fecha_movimiento), "dd/MM/yyyy", { locale: es })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={mov.tipo_kardex === "fisico" ? "default" : "secondary"}>
                            {mov.tipo_kardex === "fisico" ? "Físico" : "Financiero"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {mov.tipo_movimiento === "ingreso" ? (
                              <Plus className="h-4 w-4 text-green-600" />
                            ) : (
                              <Minus className="h-4 w-4 text-red-600" />
                            )}
                            <span
                              className={
                                mov.tipo_movimiento === "ingreso"
                                  ? "text-green-600"
                                  : "text-red-600"
                              }
                            >
                              {mov.tipo_movimiento === "ingreso" ? "Ingreso" : "Egreso"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="capitalize">{mov.documento_tipo}</span> #{mov.documento_id}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          {mov.concepto || "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {mov.tipo_kardex === "fisico" ? (
                            <span>
                              {mov.peso_kg?.toLocaleString("es-PE", {
                                minimumFractionDigits: 2,
                              })}{" "}
                              kg
                            </span>
                          ) : (
                            <span>
                              S/{" "}
                              {mov.monto?.toLocaleString("es-PE", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {mov.tipo_kardex === "fisico" ? (
                            <span>
                              {mov.saldo_fisico_kg?.toLocaleString("es-PE", {
                                minimumFractionDigits: 2,
                              })}{" "}
                              kg
                            </span>
                          ) : (
                            <span>
                              S/{" "}
                              {mov.saldo_financiero?.toLocaleString("es-PE", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: STOCK FÍSICO */}
        <TabsContent value="fisico" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Físico por Lote y Categoría</CardTitle>
              <CardDescription>Inventario actual de todos los productos</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lote</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Stock Actual (kg)</TableHead>
                      <TableHead className="text-right">Total Ingresos</TableHead>
                      <TableHead className="text-right">Total Egresos</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saldosFisicos.map((saldo) => (
                      <TableRow key={`${saldo.lote_id}-${saldo.categoria_id}`}>
                        <TableCell className="font-medium">{saldo.lote_codigo}</TableCell>
                        <TableCell>{saldo.producto_nombre}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{saldo.categoria_nombre}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {saldo.saldo_actual.toLocaleString("es-PE", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-mono">
                          {saldo.total_ingresos.toLocaleString("es-PE", {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-mono">
                          {saldo.total_egresos.toLocaleString("es-PE", {
                            minimumFractionDigits: 2,
                          })}
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
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: FINANCIERO */}
        <TabsContent value="financiero" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {saldosFinancieros.map((saldo) => (
              <Card key={saldo.cuenta_tipo}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {saldo.cuenta_tipo === "banco" && <Wallet className="h-5 w-5" />}
                    {saldo.cuenta_tipo === "caja" && <DollarSign className="h-5 w-5" />}
                    {saldo.cuenta_tipo === "ventas" && <ShoppingCart className="h-5 w-5" />}
                    {saldo.cuenta_tipo === "produccion" && <Activity className="h-5 w-5" />}
                    <span className="capitalize">{saldo.cuenta_tipo}</span>
                  </CardTitle>
                  <CardDescription>{saldo.cuenta_descripcion || "Cuenta general"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo Actual</p>
                    <p className="text-3xl font-bold">
                      S/{" "}
                      {saldo.saldo_actual.toLocaleString("es-PE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Ingresos</p>
                      <p className="text-sm font-semibold text-green-600">
                        S/{" "}
                        {saldo.total_ingresos.toLocaleString("es-PE", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Egresos</p>
                      <p className="text-sm font-semibold text-red-600">
                        S/{" "}
                        {saldo.total_egresos.toLocaleString("es-PE", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB: REPORTES */}
        <TabsContent value="reportes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Estado de Cuenta Productor
                </CardTitle>
                <CardDescription>Ver cuentas por cobrar/pagar a productores</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Ver Reporte</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Flujo de Caja
                </CardTitle>
                <CardDescription>Análisis de ingresos y egresos</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Ver Reporte</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Box className="h-5 w-5" />
                  Valorización de Inventario
                </CardTitle>
                <CardDescription>Valor total del stock actual</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Ver Reporte</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Análisis de Rentabilidad
                </CardTitle>
                <CardDescription>Márgenes y rentabilidad por producto</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Ver Reporte</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-10 w-[300px]" />
        <Skeleton className="h-4 w-[500px]" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-[100px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[150px]" />
              <Skeleton className="h-3 w-[100px] mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
