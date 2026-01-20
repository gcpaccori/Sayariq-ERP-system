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
      <Tabs defaultValue="movimientos" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
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
            <FileText className="mr-2 h-4 w-4" />
            Reportes
          </TabsTrigger>
        </TabsList>

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
