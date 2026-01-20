"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DollarSign, TrendingUp, TrendingDown, FileText, AlertCircle, Clock } from "lucide-react"
import { adelantosService, type Adelanto } from "@/lib/services/adelantos-service"
import { liquidacionesService, type Liquidacion } from "@/lib/services/liquidaciones-service"

interface EstadoCuentaProductor {
  productor_id: string
  productor_nombre: string
  saldo_adelantos: {
    total_adelantos: number
    total_descontado: number
    saldo_pendiente: number
    adelantos_activos: number
  }
  resumen_liquidaciones: {
    total_liquidaciones: number
    valor_total_neto: number
    liquidaciones_pendientes: number
    liquidaciones_pagadas: number
  }
  saldo_final: number // Positivo = empresa debe, Negativo = productor debe
  adelantos: Adelanto[]
  liquidaciones: Liquidacion[]
}

export function EstadoCuentaProductor() {
  const [productores] = useState([
    { id: "1", nombre: "Juan Pérez" },
    { id: "2", nombre: "María García" },
    { id: "3", nombre: "Carlos López" },
    { id: "4", nombre: "Ana Martínez" },
  ])

  const [productorSeleccionado, setProductorSeleccionado] = useState<string>("")
  const [estadoCuenta, setEstadoCuenta] = useState<EstadoCuentaProductor | null>(null)
  const [cargando, setCargando] = useState(false)
  const [filtroFecha, setFiltroFecha] = useState("")
  const [busqueda, setBusqueda] = useState("")

  const cargarEstadoCuenta = async (productorId: string) => {
    if (!productorId) return

    setCargando(true)
    try {
      const productor = productores.find((p) => p.id === productorId)
      if (!productor) return

      // Cargar datos en paralelo
      const [saldoAdelantos, resumenLiquidaciones, adelantos, liquidaciones] = await Promise.all([
        adelantosService.calcularSaldoProductor(productorId),
        liquidacionesService.obtenerResumenFinanciero(productorId),
        adelantosService.obtenerAdelantosPorProductor(productorId),
        liquidacionesService.obtenerLiquidacionesPorProductor(productorId),
      ])

      // Calcular saldo final
      const saldoFinal = resumenLiquidaciones.valor_total_neto - saldoAdelantos.saldo_pendiente

      setEstadoCuenta({
        productor_id: productorId,
        productor_nombre: productor.nombre,
        saldo_adelantos: saldoAdelantos,
        resumen_liquidaciones: resumenLiquidaciones,
        saldo_final: saldoFinal,
        adelantos,
        liquidaciones,
      })
    } catch (error) {
      console.error("Error al cargar estado de cuenta:", error)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    if (productorSeleccionado) {
      cargarEstadoCuenta(productorSeleccionado)
    }
  }, [productorSeleccionado])

  const formatearMoneda = (monto: number) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(monto)
  }

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getEstadoBadge = (estado: string) => {
    const variants = {
      pendiente: "destructive",
      "descontado-parcial": "secondary",
      "descontado-total": "default",
      borrador: "outline",
      confirmada: "secondary",
      pagada: "default",
    } as const

    return (
      <Badge variant={variants[estado as keyof typeof variants] || "outline"}>
        {estado.replace("-", " ").toUpperCase()}
      </Badge>
    )
  }

  if (!estadoCuenta) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Estado de Cuenta</h1>
            <p className="text-gray-600">Balance financiero por productor</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Seleccionar Productor</CardTitle>
            <CardDescription>Elige un productor para ver su estado de cuenta detallado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="productor">Productor</Label>
                <Select value={productorSeleccionado} onValueChange={setProductorSeleccionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar productor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {productores.map((productor) => (
                      <SelectItem key={productor.id} value={productor.id}>
                        {productor.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Estado de Cuenta</h1>
          <p className="text-gray-600">{estadoCuenta.productor_nombre}</p>
        </div>
        <Button variant="outline" onClick={() => setProductorSeleccionado("")}>
          Cambiar Productor
        </Button>
      </div>

      {/* Resumen General */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adelantos Pendientes</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatearMoneda(estadoCuenta.saldo_adelantos.saldo_pendiente)}
            </div>
            <p className="text-xs text-muted-foreground">
              {estadoCuenta.saldo_adelantos.adelantos_activos} adelantos activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Liquidado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatearMoneda(estadoCuenta.resumen_liquidaciones.valor_total_neto)}
            </div>
            <p className="text-xs text-muted-foreground">
              {estadoCuenta.resumen_liquidaciones.total_liquidaciones} liquidaciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Final</CardTitle>
            {estadoCuenta.saldo_final >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${estadoCuenta.saldo_final >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatearMoneda(Math.abs(estadoCuenta.saldo_final))}
            </div>
            <p className="text-xs text-muted-foreground">
              {estadoCuenta.saldo_final >= 0 ? "Empresa debe" : "Productor debe"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {estadoCuenta.resumen_liquidaciones.liquidaciones_pendientes}
            </div>
            <p className="text-xs text-muted-foreground">Liquidaciones por pagar</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de Saldo */}
      {estadoCuenta.saldo_final !== 0 && (
        <Alert className={estadoCuenta.saldo_final >= 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <AlertCircle className={`h-4 w-4 ${estadoCuenta.saldo_final >= 0 ? "text-green-600" : "text-red-600"}`} />
          <AlertDescription className={estadoCuenta.saldo_final >= 0 ? "text-green-800" : "text-red-800"}>
            {estadoCuenta.saldo_final >= 0
              ? `La empresa debe ${formatearMoneda(estadoCuenta.saldo_final)} a este productor.`
              : `Este productor debe ${formatearMoneda(Math.abs(estadoCuenta.saldo_final))} a la empresa.`}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs de Detalles */}
      <Tabs defaultValue="adelantos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="adelantos">Adelantos ({estadoCuenta.adelantos.length})</TabsTrigger>
          <TabsTrigger value="liquidaciones">Liquidaciones ({estadoCuenta.liquidaciones.length})</TabsTrigger>
          <TabsTrigger value="movimientos">Todos los Movimientos</TabsTrigger>
        </TabsList>

        <TabsContent value="adelantos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Adelantos</CardTitle>
              <CardDescription>Todos los adelantos otorgados y su estado actual</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Monto Original</TableHead>
                      <TableHead>Descontado</TableHead>
                      <TableHead>Saldo</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estadoCuenta.adelantos.map((adelanto) => (
                      <TableRow key={adelanto.$id}>
                        <TableCell>{formatearFecha(adelanto.fecha_adelanto)}</TableCell>
                        <TableCell>{adelanto.concepto}</TableCell>
                        <TableCell>{formatearMoneda(adelanto.monto_original)}</TableCell>
                        <TableCell>{formatearMoneda(adelanto.monto_descontado)}</TableCell>
                        <TableCell>{formatearMoneda(adelanto.saldo_pendiente)}</TableCell>
                        <TableCell>{getEstadoBadge(adelanto.estado)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="liquidaciones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Liquidaciones</CardTitle>
              <CardDescription>Todas las liquidaciones procesadas</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Valor Bruto</TableHead>
                      <TableHead>Desc. Adelantos</TableHead>
                      <TableHead>Otros Desc.</TableHead>
                      <TableHead>Valor Neto</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estadoCuenta.liquidaciones.map((liquidacion) => (
                      <TableRow key={liquidacion.$id}>
                        <TableCell>{formatearFecha(liquidacion.fecha_liquidacion)}</TableCell>
                        <TableCell>{liquidacion.lote_codigo}</TableCell>
                        <TableCell>{formatearMoneda(liquidacion.valor_bruto)}</TableCell>
                        <TableCell>{formatearMoneda(liquidacion.descuentos_adelantos)}</TableCell>
                        <TableCell>{formatearMoneda(liquidacion.otros_descuentos)}</TableCell>
                        <TableCell className="font-medium">{formatearMoneda(liquidacion.valor_neto)}</TableCell>
                        <TableCell>{getEstadoBadge(liquidacion.estado)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movimientos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Todos los Movimientos</CardTitle>
              <CardDescription>Cronología completa de adelantos y liquidaciones</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {/* Aquí se mostrarían todos los movimientos ordenados cronológicamente */}
                  <div className="text-center text-gray-500 py-8">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Vista de movimientos cronológicos en desarrollo</p>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
