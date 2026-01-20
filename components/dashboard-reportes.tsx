"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, DollarSign, Package, BarChart3 } from "lucide-react"

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

import { useApi } from "@/lib/hooks/use-api"
import { lotesService } from "@/lib/services/lotes-service"
import { libroBancoService } from "@/lib/services/libro-banco-service"
import { liquidacionesService } from "@/lib/services/liquidaciones-service"

const PIE_COLORS = ["#0f766e", "#0369a1", "#7c3aed", "#ea580c", "#16a34a", "#facc15"]

export function DashboardReportes() {
  const { data: lotes } = useApi(lotesService, { initialLoad: true })
  const { data: libroBanco } = useApi(libroBancoService, { initialLoad: true })
  const { data: liquidaciones } = useApi(liquidacionesService, { initialLoad: true })

  const stats = useMemo(() => {
    const lotesArr = Array.isArray(lotes) ? lotes : []
    const libroArr = Array.isArray(libroBanco) ? libroBanco : []
    const liqArr = Array.isArray(liquidaciones) ? liquidaciones : []

    const lotesTotal = lotesArr.length
    const lotesCompletados = lotesArr.filter((l: any) => l.estado === "liquidado").length
    const pesoTotal = lotesArr.reduce((sum: number, l: any) => sum + (Number(l.peso_inicial ?? l.peso_bruto ?? 0) || 0), 0)

    const ingresos = libroArr
      .filter((e: any) => e.tipo_operacion === "venta")
      .reduce((sum: number, e: any) => sum + (Number(e.acreedor) || 0), 0)

    const egresos = libroArr
      .filter((e: any) => e.tipo_operacion === "pago")
      .reduce((sum: number, e: any) => sum + (Number(e.deudor) || 0), 0)

    const montoLiquidaciones = liqArr.reduce((sum: number, l: any) => sum + (Number(l.total_a_pagar) || 0), 0)

    return {
      lotesTotal,
      lotesCompletados,
      pesoTotal: pesoTotal.toFixed(2),
      ingresos: ingresos.toFixed(2),
      egresos: egresos.toFixed(2),
      balance: (ingresos - egresos).toFixed(2),
      montoLiquidaciones: montoLiquidaciones.toFixed(2),
    }
  }, [lotes, libroBanco, liquidaciones])

  // Lotes por estado (para tabla + gráfica)
  const lotesPorEstadoData = useMemo(() => {
    const lotesArr = Array.isArray(lotes) ? lotes : []
    const estados = ["pendiente", "proceso", "liquidado", "cancelado"]
    const total = lotesArr.length || 1

    return estados.map((estado) => {
      const cantidad = lotesArr.filter((l: any) => l.estado === estado).length
      const porcentaje = (cantidad / total) * 100
      return {
        estado,
        cantidad,
        porcentaje: Number.isFinite(porcentaje) ? Number(porcentaje.toFixed(1)) : 0,
      }
    })
  }, [lotes])

  // Peso por producto (para evaluar qué producto mueve más kilos)
  const pesoPorProductoData = useMemo(() => {
    const lotesArr = Array.isArray(lotes) ? lotes : []
    const map = new Map<string, number>()

    lotesArr.forEach((l: any) => {
      const producto = (l.producto || "Sin producto").toString()
      const peso = Number(l.peso_inicial ?? l.peso_bruto ?? 0) || 0
      map.set(producto, (map.get(producto) || 0) + peso)
    })

    return Array.from(map.entries())
      .map(([producto, peso]) => ({ producto, peso: Number(peso.toFixed(2)) }))
      .sort((a, b) => b.peso - a.peso)
  }, [lotes])

  // Flujo mensual de ingresos vs egresos (gestión de caja)
  const flujoMensualData = useMemo(() => {
    const libroArr = Array.isArray(libroBanco) ? libroBanco : []
    const map = new Map<
      string,
      {
        mes: string
        ingresos: number
        egresos: number
      }
    >()

    const formatMes = (fechaStr: string | null | undefined) => {
      if (!fechaStr) return "Sin fecha"
      const d = new Date(fechaStr)
      if (isNaN(d.getTime())) return "Sin fecha"
      const año = d.getFullYear()
      const mes = `${d.getMonth() + 1}`.padStart(2, "0")
      return `${año}-${mes}`
    }

    libroArr.forEach((e: any) => {
      const mesKey = formatMes(e.fecha)
      if (!map.has(mesKey)) {
        map.set(mesKey, { mes: mesKey, ingresos: 0, egresos: 0 })
      }
      const row = map.get(mesKey)!
      if (e.tipo_operacion === "venta") {
        row.ingresos += Number(e.acreedor) || 0
      } else if (e.tipo_operacion === "pago") {
        row.egresos += Number(e.deudor) || 0
      }
    })

    return Array.from(map.values())
      .map((r) => ({
        ...r,
        ingresos: Number(r.ingresos.toFixed(2)),
        egresos: Number(r.egresos.toFixed(2)),
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
  }, [libroBanco])

  // Liquidaciones por mes (cuánto se está pagando a campo)
  const liquidacionesPorMesData = useMemo(() => {
    const liqArr = Array.isArray(liquidaciones) ? liquidaciones : []
    const map = new Map<string, number>()

    const formatMes = (fechaStr: string | null | undefined) => {
      if (!fechaStr) return "Sin fecha"
      const d = new Date(fechaStr)
      if (isNaN(d.getTime())) return "Sin fecha"
      const año = d.getFullYear()
      const mes = `${d.getMonth() + 1}`.padStart(2, "0")
      return `${año}-${mes}`
    }

    liqArr.forEach((l: any) => {
      const fechaBase = l.fecha_liquidacion || l.fecha || l.created_at
      const mesKey = formatMes(fechaBase)
      const monto = Number(l.total_a_pagar) || 0
      map.set(mesKey, (map.get(mesKey) || 0) + monto)
    })

    return Array.from(map.entries())
      .map(([mes, monto]) => ({ mes, monto: Number(monto.toFixed(2)) }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
  }, [liquidaciones])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Reportes</h1>
        <p className="text-muted-foreground mt-1">Resumen financiero y operativo del negocio</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lotes</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lotesTotal}</div>
            <p className="text-xs text-muted-foreground">{stats.lotesCompletados} liquidados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peso Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pesoTotal} kg</div>
            <p className="text-xs text-muted-foreground">Ingresado al proceso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/ {stats.ingresos}</div>
            <p className="text-xs text-muted-foreground">Por ventas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${Number(stats.balance) >= 0 ? "text-green-600" : "text-red-600"}`}>
              S/ {stats.balance}
            </div>
            <p className="text-xs text-muted-foreground">Ingresos - Egresos</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de reportes */}
      <Tabs defaultValue="operativo" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="operativo">Operativo</TabsTrigger>
          <TabsTrigger value="financiero">Financiero</TabsTrigger>
          <TabsTrigger value="libro-banco">Libro Banco</TabsTrigger>
        </TabsList>

        {/* Reporte Operativo */}
        <TabsContent value="operativo" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Tabla de estados */}
            <Card>
              <CardHeader>
                <CardTitle>Estado de Lotes</CardTitle>
                <CardDescription>Distribución de lotes por estado</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estado</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Porcentaje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotesPorEstadoData.map((row) => (
                      <TableRow key={row.estado}>
                        <TableCell>
                          <Badge>{row.estado}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">{row.cantidad}</TableCell>
                        <TableCell>{row.porcentaje}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Gráfico de estados */}
            <Card>
              <CardHeader>
                <CardTitle>Gráfico de Lotes por Estado</CardTitle>
                <CardDescription>Vista rápida de carga en cada fase</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lotesPorEstadoData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="estado" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="cantidad" name="Cantidad" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Peso por producto */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Peso por Producto</CardTitle>
                <CardDescription>Qué productos están moviendo más kilos</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {pesoPorProductoData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pesoPorProductoData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="producto" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="peso" name="Kg" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-sm">No hay datos de lotes para graficar.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mix de Productos (Peso %)</CardTitle>
                <CardDescription>Participación porcentual por producto</CardDescription>
              </CardHeader>
              <CardContent className="h-72 flex items-center justify-center">
                {pesoPorProductoData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pesoPorProductoData}
                        dataKey="peso"
                        nameKey="producto"
                        outerRadius={90}
                        innerRadius={50}
                        label
                      >
                        {pesoPorProductoData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-sm">No hay datos de lotes para graficar.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reporte Financiero */}
        <TabsContent value="financiero" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-lg">Ingresos por Ventas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">S/ {stats.ingresos}</p>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-red-200">
              <CardHeader>
                <CardTitle className="text-lg">Egresos por Pagos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-600">S/ {stats.egresos}</p>
              </CardContent>
            </Card>

            <Card className={`${Number(stats.balance) >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              <CardHeader>
                <CardTitle className="text-lg">Balance Neto</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${Number(stats.balance) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  S/ {stats.balance}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Flujo de caja mensual */}
            <Card>
              <CardHeader>
                <CardTitle>Flujo Mensual de Caja</CardTitle>
                <CardDescription>Ingresos vs egresos por mes</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {flujoMensualData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={flujoMensualData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="ingresos" stroke="#16a34a" name="Ingresos" />
                      <Line type="monotone" dataKey="egresos" stroke="#dc2626" name="Egresos" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-sm">No hay movimientos suficientes para graficar.</p>
                )}
              </CardContent>
            </Card>

            {/* Pagos a campo (liquidaciones) */}
            <Card>
              <CardHeader>
                <CardTitle>Pagos a Campo (Liquidaciones)</CardTitle>
                <CardDescription>Montos liquidados a productores por mes</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {liquidacionesPorMesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={liquidacionesPorMesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="monto" name="Pagado a campo" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-sm">No hay liquidaciones registradas para graficar.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reporte Libro Banco */}
        <TabsContent value="libro-banco" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Últimas Operaciones</CardTitle>
              <CardDescription>Últimas 10 operaciones en Libro Banco</CardDescription>
            </CardHeader>
            <CardContent>
              {Array.isArray(libroBanco) && libroBanco.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Operación</TableHead>
                      <TableHead>De / A Quien</TableHead>
                      <TableHead className="text-right">Deudor</TableHead>
                      <TableHead className="text-right">Acreedor</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {libroBanco.slice(0, 10).map((entry: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="text-sm">{entry.fecha}</TableCell>
                        <TableCell className="text-sm">{entry.operacion}</TableCell>
                        <TableCell className="text-sm">
                          {entry.de_quien} / {entry.a_quien}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {Number(entry.deudor) > 0 ? `S/ ${Number(entry.deudor).toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {Number(entry.acreedor) > 0 ? `S/ ${Number(entry.acreedor).toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={entry.estado === "cancelado" ? "default" : "secondary"}>
                            {entry.estado}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-4">No hay operaciones registradas</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
