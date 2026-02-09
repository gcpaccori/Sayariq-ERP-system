"use client"

/**
 * =====================================================
 * KARDEX INTEGRAL ERP - SISTEMA COMPLETO
 * =====================================================
 * El mejor sistema de Kardex Industrial para Sayariq
 * Integra control físico y financiero en tiempo real
 */

import { useState, useEffect, useMemo } from "react"
import { format, isSameMonth } from "date-fns"
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
import { personasService } from "@/lib/services/personas-service"
import { useApi } from "@/lib/hooks/use-api"
import type {
  DashboardKardex,
  MovimientoKardexIntegral,
  SaldoFisico,
  SaldoFinanciero,
  EstadoCuentaProductor,
} from "@/lib/types/kardex-integral"
import type { Persona } from "@/lib/types"

export function KardexIntegralERP() {
  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState<DashboardKardex | null>(null)
  const [saldosFisicos, setSaldosFisicos] = useState<SaldoFisico[]>([])
  const [saldosFinancieros, setSaldosFinancieros] = useState<SaldoFinanciero[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoKardexIntegral[]>([])
  const [filtroTipo, setFiltroTipo] = useState<string>("todos")
  const [filtroDocumento, setFiltroDocumento] = useState<string>("todos")
  const [searchTerm, setSearchTerm] = useState("")
  const [productorSeleccionado, setProductorSeleccionado] = useState<string>("")
  const [estadoCuenta, setEstadoCuenta] = useState<EstadoCuentaProductor | null>(null)
  const [cargandoEstadoCuenta, setCargandoEstadoCuenta] = useState(false)

  const { data: personasData } = useApi(personasService, { initialLoad: true })
  const productores = useMemo(
    () =>
      Array.isArray(personasData)
        ? (personasData as Persona[]).filter((persona) =>
            (persona.roles || []).includes("productor") || persona.tipo_persona === "productor",
          )
        : [],
    [personasData],
  )

  const formatFechaCorta = (value?: string | null) => {
    if (!value) return "—"
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return "—"
    return format(parsed, "dd/MM/yyyy")
  }

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

  const resumenCalidades = useMemo(() => {
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

  const resumenFinanciero = useMemo(() => {
    const financieros = movimientos.filter((mov) => mov.tipo_kardex === "financiero")
    const fechas = financieros
      .map((mov) => new Date(mov.fecha_movimiento))
      .filter((fecha) => !Number.isNaN(fecha.getTime()))
    const fechaReferencia = fechas.length > 0 ? new Date(Math.max(...fechas.map((f) => f.getTime()))) : new Date()
    const financierosMes = financieros.filter((mov) => {
      const fecha = new Date(mov.fecha_movimiento)
      return !Number.isNaN(fecha.getTime()) && isSameMonth(fecha, fechaReferencia)
    })
    const totalIngresos = financierosMes.reduce(
      (acc, mov) => acc + (mov.tipo_movimiento === "ingreso" ? Number(mov.monto || 0) : 0),
      0,
    )
    const totalEgresos = financierosMes.reduce(
      (acc, mov) => acc + (mov.tipo_movimiento === "egreso" ? Number(mov.monto || 0) : 0),
      0,
    )
    const totalVentas = financierosMes.reduce(
      (acc, mov) =>
        acc + (mov.documento_tipo === "venta" && mov.tipo_movimiento === "ingreso" ? Number(mov.monto || 0) : 0),
      0,
    )
    const totalAdelantos = financierosMes.reduce(
      (acc, mov) =>
        acc + (mov.documento_tipo === "adelanto" && mov.tipo_movimiento === "egreso" ? Number(mov.monto || 0) : 0),
      0,
    )
    const totalPagosProductor = financierosMes.reduce(
      (acc, mov) =>
        acc +
        (["liquidacion", "pago"].includes(mov.documento_tipo) && mov.tipo_movimiento === "egreso"
          ? Number(mov.monto || 0)
          : 0),
      0,
    )

    const saldoBanco = saldosFinancieros.find((saldo) => saldo.cuenta_tipo === "banco")?.saldo_actual || 0
    const saldoCaja = saldosFinancieros.find((saldo) => saldo.cuenta_tipo === "caja")?.saldo_actual || 0
    return {
      mesReferencia: fechaReferencia,
      totalIngresos,
      totalEgresos,
      totalVentas,
      totalAdelantos,
      totalPagosProductor,
      saldoDisponible: saldoBanco + saldoCaja,
    }
  }, [movimientos, saldosFinancieros])

  useEffect(() => {
    const cargarEstadoCuenta = async () => {
      if (!productorSeleccionado) {
        setEstadoCuenta(null)
        return
      }
      setCargandoEstadoCuenta(true)
      try {
        const data = await kardexIntegralService.obtenerEstadoCuentaProductor(Number(productorSeleccionado))
        setEstadoCuenta(data)
      } catch (error) {
        console.error("Error al cargar estado de cuenta:", error)
        setEstadoCuenta(null)
      } finally {
        setCargandoEstadoCuenta(false)
      }
    }

    cargarEstadoCuenta()
  }, [productorSeleccionado])

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

      {/* TARJETA GERENCIAL */}
      <Card className="border-2 border-primary/10 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Resumen Gerencial</CardTitle>
          <CardDescription>
            Visión inmediata de calidades disponibles y control financiero (ventas, adelantos y pagos).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">Stock por calidad</h3>
            </div>
            <div className="rounded-lg border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Calidad</TableHead>
                    <TableHead className="text-right">Kg disponibles</TableHead>
                    <TableHead className="text-right">Lotes activos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumenCalidades.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                        Sin stock registrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    resumenCalidades.map((item) => (
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
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">Control financiero</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Dinero disponible</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-700">
                    S/ {resumenFinanciero.saldoDisponible.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Caja + banco en cuentas registradas.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Ventas del mes ({format(resumenFinanciero.mesReferencia, "MM/yyyy")})</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    S/ {resumenFinanciero.totalVentas.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">Cobros asociados a lotes vendidos.</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Adelantos del mes ({format(resumenFinanciero.mesReferencia, "MM/yyyy")})</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-amber-700">
                    S/ {resumenFinanciero.totalAdelantos.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">Pagos adelantados a productores.</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Pagos del mes ({format(resumenFinanciero.mesReferencia, "MM/yyyy")})</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-700">
                    S/ {resumenFinanciero.totalPagosProductor.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">Liquidaciones y pagos por lote.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TABS PRINCIPALES */}
      <Tabs defaultValue="control" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="control">
            <Eye className="mr-2 h-4 w-4" />
            Control Total
          </TabsTrigger>
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

        {/* TAB: CONTROL GERENCIAL */}
        <TabsContent value="control" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Control total de carga y dinero</CardTitle>
              <CardDescription>
                Relacione ventas, adelantos y deudas por productor para una vista gerencial completa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Productor</Label>
                  <Select value={productorSeleccionado} onValueChange={setProductorSeleccionado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un productor" />
                    </SelectTrigger>
                    <SelectContent>
                      {productores.map((productor) => (
                        <SelectItem key={productor.id} value={String(productor.id)}>
                          {productor.nombre_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    Resumen financiero del mes ({format(resumenFinanciero.mesReferencia, "MMMM yyyy", { locale: es })})
                  </Label>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>Ingresos totales</span>
                      <span className="font-semibold text-green-700">
                        S/ {resumenFinanciero.totalIngresos.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span>Egresos totales</span>
                      <span className="font-semibold text-red-700">
                        S/ {resumenFinanciero.totalEgresos.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span>Saldo neto</span>
                      <span className="font-semibold">
                        S/ {(resumenFinanciero.totalIngresos - resumenFinanciero.totalEgresos).toLocaleString("es-PE", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-base">Estado de cuenta del productor</CardTitle>
                  <CardDescription>
                    Adelantos, pagos y saldo pendiente según el Kardex integral.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!productorSeleccionado ? (
                    <p className="text-sm text-muted-foreground">Seleccione un productor para ver su estado.</p>
                  ) : cargandoEstadoCuenta ? (
                    <p className="text-sm text-muted-foreground">Cargando estado de cuenta...</p>
                  ) : !estadoCuenta ? (
                    <p className="text-sm text-muted-foreground">No hay información disponible.</p>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Adelantos</p>
                        <p className="text-lg font-semibold text-amber-700">
                          S/ {(estadoCuenta.resumen?.total_adelantos ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Pagos</p>
                        <p className="text-lg font-semibold text-red-700">
                          S/ {(estadoCuenta.resumen?.total_pagos ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Saldo por regularizar</p>
                        <p className="text-lg font-semibold">
                          S/ {(estadoCuenta.resumen?.saldo ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

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
                      <TableHead>Productor</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Ingreso</TableHead>
                      <TableHead className="text-right">Antigüedad (días)</TableHead>
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
                        <TableCell>{saldo.productor_nombre || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{saldo.categoria_nombre}</Badge>
                        </TableCell>
                        <TableCell>{formatFechaCorta(saldo.fecha_ingreso_categoria || saldo.fecha_ingreso_lote)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {saldo.antiguedad_dias ?? "—"}
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
