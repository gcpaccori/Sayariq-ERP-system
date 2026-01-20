"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useApi } from "@/lib/hooks/use-api"
import { lotesService } from "@/lib/services/lotes-service"
import { useAdelantos } from "@/lib/hooks/use-adelantos"
import { usePersonas } from "@/lib/hooks/use-personas"
import {
  DollarSign,
  Package,
  Clock,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle,
  BarChart3,
} from "lucide-react"
import {
  ResponsiveContainer,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart as ReLineChart,
  Line,
} from "recharts"

type EstadisticasDashboard = {
  totalAdelantosPendientes: number
  totalAdelantosAplicados: number
  lotesEnAlmacen: number
  lotesEnProceso: number
  lotesLiquidados: number
  productoresConDeuda: number
  diasPromedioAlmacen: number
  rendimientoPromedio: number
  kgTotalesPendientes: number
  kgTotalesRecibidos: number
  kgTotalesLiquidados: number
  productoresActivos: number
}

export function DashboardOverview() {
  const [estadisticas, setEstadisticas] = useState<EstadisticasDashboard>({
    totalAdelantosPendientes: 0,
    totalAdelantosAplicados: 0,
    lotesEnAlmacen: 0,
    lotesEnProceso: 0,
    lotesLiquidados: 0,
    productoresConDeuda: 0,
    diasPromedioAlmacen: 0,
    rendimientoPromedio: 0,
    kgTotalesPendientes: 0,
    kgTotalesRecibidos: 0,
    kgTotalesLiquidados: 0,
    productoresActivos: 0,
  })

  const [isClient, setIsClient] = useState(false)

  const {
    data: lotes,
    error: lotesError,
    loading: lotesLoading,
  } = useApi(lotesService, { initialLoad: true })
  const { data: adelantos, error: adelantosError } = useAdelantos(true)
  const { data: personas, error: personasError } = usePersonas(true)

  const lotesArray = Array.isArray(lotes) ? lotes : []
  const adelantosArray = Array.isArray(adelantos) ? adelantos : []
  const personasArray = Array.isArray(personas) ? personas : []

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (lotesArray.length > 0 || adelantosArray.length > 0 || personasArray.length > 0) {
      calcularEstadisticas()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotesArray, adelantosArray, personasArray])

  const calcularEstadisticas = () => {
    // === ADELANTOS ===
    let totalAdelantosPendientes = 0
    let totalAdelantosAplicados = 0
    const productoresConDeudaSet = new Set<number>()

    adelantosArray.forEach((a: any) => {
      const monto = Number(a.monto_original ?? a.monto ?? 0)
      if (a.estado === "pendiente") {
        totalAdelantosPendientes += monto
        if (a.productor_id) productoresConDeudaSet.add(a.productor_id)
      }
      if (a.estado === "aplicado") {
        totalAdelantosAplicados += monto
      }
    })

    // === LOTES / STOCK ===
    const hoy = new Date()
    let lotesEnAlmacen = 0
    let lotesEnProceso = 0
    let lotesLiquidados = 0
    let diasAcumuladosAlmacen = 0
    let lotesParaDias = 0

    let kgTotalesPendientes = 0
    let kgTotalesRecibidos = 0
    let kgTotalesLiquidados = 0

    lotesArray.forEach((l: any) => {
      const estado = l.estado
      const pesoInicial = Number(l.peso_inicial ?? 0)
      const pesoNeto = Number(l.peso_neto ?? 0)
      const fechaIngresoStr = l.fecha_ingreso

      kgTotalesRecibidos += pesoInicial

      if (estado === "pendiente") {
        lotesEnAlmacen++
        kgTotalesPendientes += pesoInicial
      } else if (estado === "proceso") {
        lotesEnProceso++
        kgTotalesPendientes += pesoInicial
      } else if (estado === "liquidado") {
        lotesLiquidados++
        kgTotalesLiquidados += pesoNeto || pesoInicial
      }

      if ((estado === "pendiente" || estado === "proceso") && fechaIngresoStr) {
        const fechaIngreso = new Date(fechaIngresoStr)
        if (!isNaN(fechaIngreso.getTime())) {
          const diffMs = hoy.getTime() - fechaIngreso.getTime()
          const diffDias = diffMs / (1000 * 60 * 60 * 24)
          if (diffDias >= 0) {
            diasAcumuladosAlmacen += diffDias
            lotesParaDias++
          }
        }
      }
    })

    const diasPromedioAlmacen = lotesParaDias > 0 ? diasAcumuladosAlmacen / lotesParaDias : 0

    let sumaRendimientos = 0
    let conteoRendimientos = 0

    lotesArray.forEach((l: any) => {
      const pesoInicial = Number(l.peso_inicial ?? 0)
      const pesoNeto = Number(l.peso_neto ?? 0)
      if (l.estado === "liquidado" && pesoInicial > 0 && pesoNeto > 0) {
        const rendimiento = (pesoNeto / pesoInicial) * 100
        sumaRendimientos += rendimiento
        conteoRendimientos++
      }
    })

    const rendimientoPromedio = conteoRendimientos > 0 ? sumaRendimientos / conteoRendimientos : 0

    const productoresActivos = personasArray.filter(
      (p: any) => p.tipo_persona === "productor" && p.estado === "activo",
    ).length

    setEstadisticas({
      totalAdelantosPendientes,
      totalAdelantosAplicados,
      lotesEnAlmacen,
      lotesEnProceso,
      lotesLiquidados,
      productoresConDeuda: productoresConDeudaSet.size,
      diasPromedioAlmacen,
      rendimientoPromedio,
      kgTotalesPendientes,
      kgTotalesRecibidos,
      kgTotalesLiquidados,
      productoresActivos,
    })
  }

  const getAlertaAlmacen = () => {
    if (estadisticas.diasPromedioAlmacen > 8) {
      return { tipo: "critico", mensaje: "Productos cerca del límite de almacenamiento" }
    } else if (estadisticas.diasPromedioAlmacen > 5) {
      return { tipo: "advertencia", mensaje: "Monitorear tiempo en almacén" }
    }
    return { tipo: "normal", mensaje: "Tiempo de almacenamiento óptimo" }
  }

  const alertaAlmacen = getAlertaAlmacen()

  // === DATOS PARA GRÁFICOS ===

  const lotesPorEstadoData = useMemo(() => {
    const estados = ["pendiente", "proceso", "liquidado", "cancelado"]
    return estados
      .map((estado) => {
        const lotesEstado = lotesArray.filter((l: any) => l.estado === estado)
        const kgEstado = lotesEstado.reduce(
          (sum: number, l: any) => sum + Number(l.peso_inicial ?? l.peso_neto ?? 0),
          0,
        )
        const label = estado.charAt(0).toUpperCase() + estado.slice(1)
        return {
          estado: label,
          lotes: lotesEstado.length,
          kg: Number(kgEstado.toFixed(2)),
        }
      })
      .filter((d) => d.lotes > 0 || d.kg > 0)
  }, [lotesArray])

  const kilosPorProductoData = useMemo(() => {
    const map = new Map<string, { kg: number; lotes: number }>()

    lotesArray.forEach((l: any) => {
      const producto = (l.producto as string) || "Sin producto"
      const peso = Number(l.peso_inicial ?? l.peso_neto ?? 0)
      const actual = map.get(producto) ?? { kg: 0, lotes: 0 }
      actual.kg += peso
      actual.lotes += 1
      map.set(producto, actual)
    })

    return Array.from(map.entries())
      .map(([producto, { kg, lotes }]) => ({
        producto,
        kg: Number(kg.toFixed(2)),
        lotes,
      }))
      .sort((a, b) => b.kg - a.kg)
      .slice(0, 5)
  }, [lotesArray])

  const deudaPorProductorData = useMemo(() => {
    const map = new Map<number, { productor: string; deuda: number }>()

    adelantosArray
      .filter((a: any) => a.estado === "pendiente")
      .forEach((a: any) => {
        const monto = Number(a.monto_original ?? a.monto ?? 0)
        const productorId = a.productor_id
        if (!productorId) return

        const persona = personasArray.find((p: any) => p.id === productorId)
        const nombre = persona?.nombre_completo ?? `Productor #${productorId}`

        const actual = map.get(productorId) ?? { productor: nombre, deuda: 0 }
        actual.deuda += monto
        map.set(productorId, actual)
      })

    return Array.from(map.values())
      .sort((a, b) => b.deuda - a.deuda)
      .slice(0, 5)
      .map((item) => ({
        productor: item.productor,
        deuda: Number(item.deuda.toFixed(2)),
      }))
  }, [adelantosArray, personasArray])

  const ingresoLotesPorMesData = useMemo(() => {
    const map = new Map<
      string,
      {
        label: string
        lotes: number
        kg: number
      }
    >()

    lotesArray.forEach((l: any) => {
      const fechaStr = l.fecha_ingreso
      if (!fechaStr) return
      const fecha = new Date(fechaStr)
      if (isNaN(fecha.getTime())) return

      const year = fecha.getFullYear()
      const month = fecha.getMonth() + 1
      const key = `${year}-${month.toString().padStart(2, "0")}`

      const monthLabel = fecha.toLocaleString("es-PE", { month: "short" })
      const label = `${monthLabel} ${String(year).slice(-2)}`

      if (!map.has(key)) {
        map.set(key, { label, lotes: 0, kg: 0 })
      }
      const item = map.get(key)!
      item.lotes += 1
      item.kg += Number(l.peso_inicial ?? 0)
    })

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => ({
        ...value,
        kg: Number(value.kg.toFixed(2)),
      }))
  }, [lotesArray])

  // Tooltip bonito
  const tooltipStyle = {
    backgroundColor: "hsl(var(--background))",
    borderRadius: 12,
    border: "1px solid hsl(var(--border))",
    boxShadow: "0 10px 25px rgba(15, 23, 42, 0.12)",
    color: "hsl(var(--foreground))",
    fontSize: "0.75rem",
  } as React.CSSProperties

  if (!isClient || lotesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Dashboard Operativo</h1>
            <p className="text-muted-foreground">Cargando datos...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard Operativo</h1>
          <p className="text-muted-foreground">Visión global de la operación y la gestión económica</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Actualizado: {new Date().toLocaleTimeString()}
          </Badge>
        </div>
      </div>

      {(lotesError || adelantosError || personasError) && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 dark:text-red-100">Error al cargar datos</h3>
                <div className="text-sm text-red-800 dark:text-red-200 space-y-1 mt-2">
                  {lotesError && <p>Lotes: {String(lotesError)}</p>}
                  {adelantosError && <p>Adelantos: {String(adelantosError)}</p>}
                  {personasError && <p>Personas: {String(personasError)}</p>}
                </div>
                <p className="text-xs text-red-700 dark:text-red-300 mt-2">
                  Revisa la consola del navegador (F12) para más detalles.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100/60 dark:from-red-950 dark:to-red-900/40 border-none shadow-sm">
          <CardContent className="p-4 flex items-center space-x-3">
            <div className="rounded-full bg-red-100 dark:bg-red-900/60 p-2">
              <DollarSign className="h-6 w-6 text-red-600 dark:text-red-300" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-red-800/80 dark:text-red-200/80 uppercase tracking-wide">
                Deuda con productores
              </p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-100">
                S/ {estadisticas.totalAdelantosPendientes.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-red-700/80 dark:text-red-200/80">
                {estadisticas.productoresConDeuda} productores con adelantos
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-sky-50 to-sky-100/60 dark:from-sky-950 dark:to-sky-900/40 border-none shadow-sm">
          <CardContent className="p-4 flex items-center space-x-3">
            <div className="rounded-full bg-sky-100 dark:bg-sky-900/60 p-2">
              <Package className="h-6 w-6 text-sky-600 dark:text-sky-300" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-sky-800/80 dark:text-sky-200/80 uppercase tracking-wide">
                Stock en almacén
              </p>
              <p className="text-2xl font-bold text-sky-700 dark:text-sky-100">
                {estadisticas.kgTotalesPendientes.toFixed(2)} kg
              </p>
              <p className="text-xs text-sky-700/80 dark:text-sky-200/80">
                {estadisticas.lotesEnAlmacen} lotes pendientes / {estadisticas.lotesEnProceso} en proceso
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 dark:from-emerald-950 dark:to-emerald-900/40 border-none shadow-sm">
          <CardContent className="p-4 flex items-center space-x-3">
            <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/60 p-2">
              <Clock className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80 uppercase tracking-wide">
                Lotes liquidados
              </p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-100">
                {estadisticas.lotesLiquidados}
              </p>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-200/80">
                {estadisticas.kgTotalesLiquidados.toFixed(2)} kg ya pagados
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-50 to-violet-100/60 dark:from-violet-950 dark:to-violet-900/40 border-none shadow-sm">
          <CardContent className="p-4 flex items-center space-x-3">
            <div className="rounded-full bg-violet-100 dark:bg-violet-900/60 p-2">
              <TrendingUp className="h-6 w-6 text-violet-600 dark:text-violet-300" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-violet-800/80 dark:text-violet-200/80 uppercase tracking-wide">
                Rendimiento promedio
              </p>
              <p className="text-2xl font-bold text-violet-700 dark:text-violet-100">
                {estadisticas.rendimientoPromedio.toFixed(1)}%
              </p>
              <p className="text-xs text-violet-700/80 dark:text-violet-200/80">
                Neto vs inicial en lotes liquidados
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fila: almacén + lotes por estado + deuda productor */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Estado del almacén */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              {alertaAlmacen.tipo === "critico" && <AlertTriangle className="h-5 w-5 text-red-500" />}
              {alertaAlmacen.tipo === "advertencia" && <Clock className="h-5 w-5 text-amber-500" />}
              {alertaAlmacen.tipo === "normal" && <CheckCircle className="h-5 w-5 text-emerald-500" />}
              Estado del almacén
            </CardTitle>
            <CardDescription>Rotación y días promedio de permanencia</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p
                className={`text-sm ${
                  alertaAlmacen.tipo === "critico"
                    ? "text-red-600"
                    : alertaAlmacen.tipo === "advertencia"
                      ? "text-amber-600"
                      : "text-emerald-600"
                }`}
              >
                {alertaAlmacen.mensaje}
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Tiempo promedio en almacén:</span>
                  <span className="font-semibold">{estadisticas.diasPromedioAlmacen.toFixed(1)} días</span>
                </div>
                <Progress value={(estadisticas.diasPromedioAlmacen / 10) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Límite recomendado: 10 días en bruto, 2 días post-lavado
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Kg recibidos</p>
                  <p className="text-lg font-semibold">
                    {estadisticas.kgTotalesRecibidos.toFixed(2)} kg
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Productores activos</p>
                  <p className="text-lg font-semibold">{estadisticas.productoresActivos}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lotes por estado */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-sky-500" />
              Lotes por estado
            </CardTitle>
            <CardDescription>Lotes y kg según su estado operativo</CardDescription>
          </CardHeader>
          <CardContent className="h-52">
            {lotesPorEstadoData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay datos de lotes para mostrar.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={lotesPorEstadoData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="estado" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={{ stroke: "#cbd5f5" }} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={{ stroke: "#cbd5f5" }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={{ stroke: "#cbd5f5" }}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: "0.7rem" }} />
                  <Bar
                    yAxisId="left"
                    dataKey="lotes"
                    name="Lotes"
                    fill="#38bdf8"
                    radius={[6, 6, 0, 0]}
                    barSize={18}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="kg"
                    name="Kg"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                    barSize={18}
                  />
                </ReBarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Deuda por productor */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-500" />
              Deuda por productor
            </CardTitle>
            <CardDescription>Top 5 productores con mayores adelantos pendientes</CardDescription>
          </CardHeader>
          <CardContent className="h-52">
            {deudaPorProductorData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay adelantos pendientes registrados.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart
                  data={deudaPorProductorData}
                  layout="vertical"
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={{ stroke: "#cbd5f5" }} />
                  <YAxis
                    type="category"
                    dataKey="productor"
                    width={120}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={{ stroke: "#cbd5f5" }}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: "0.7rem" }} />
                  <Bar
                    dataKey="deuda"
                    name="Deuda (S/)"
                    fill="#f97316"
                    radius={[0, 6, 6, 0]}
                    barSize={16}
                  />
                </ReBarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fila: kilos por producto + ingreso por mes */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Kilos por producto */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              Kilos por producto
            </CardTitle>
            <CardDescription>Top productos por kilos recibidos</CardDescription>
          </CardHeader>
          <CardContent className="h-56">
            {kilosPorProductoData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay lotes registrados para mostrar productos.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart
                  data={kilosPorProductoData}
                  margin={{ top: 8, right: 8, left: -12, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="producto"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={{ stroke: "#cbd5f5" }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={40}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={{ stroke: "#cbd5f5" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: "0.7rem" }} />
                  <Bar
                    dataKey="kg"
                    name="Kg"
                    fill="#8b5cf6"
                    radius={[6, 6, 0, 0]}
                    barSize={22}
                  />
                </ReBarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Ingreso de lotes por mes */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-500" />
              Ingreso de lotes por mes
            </CardTitle>
            <CardDescription>Evolución del volumen recibido</CardDescription>
          </CardHeader>
          <CardContent className="h-56">
            {ingresoLotesPorMesData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay histórico de ingresos por mes.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ReLineChart data={ingresoLotesPorMesData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={{ stroke: "#cbd5f5" }}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={{ stroke: "#cbd5f5" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: "0.7rem" }} />
                  <Line
                    type="monotone"
                    dataKey="kg"
                    name="Kg recibidos"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 3, strokeWidth: 1, fill: "#10b981" }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="lotes"
                    name="Lotes"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    dot={{ r: 3, strokeWidth: 1, fill: "#0ea5e9" }}
                    activeDot={{ r: 5 }}
                  />
                </ReLineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Acciones rápidas */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Acciones rápidas</CardTitle>
          <CardDescription>Operaciones clave del día a día</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="flex flex-col items-center p-4 border rounded-xl hover:bg-sky-50 dark:hover:bg-sky-900/30 cursor-pointer transition-colors">
              <Package className="h-7 w-7 text-sky-500 mb-2" />
              <span className="text-sm font-medium">Registrar lote</span>
            </button>
            <button className="flex flex-col items-center p-4 border rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer transition-colors">
              <DollarSign className="h-7 w-7 text-red-500 mb-2" />
              <span className="text-sm font-medium">Nuevo adelanto</span>
            </button>
            <button className="flex flex-col items-center p-4 border rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer transition-colors">
              <Users className="h-7 w-7 text-emerald-500 mb-2" />
              <span className="text-sm font-medium">Ver productores</span>
            </button>
            <button className="flex flex-col items-center p-4 border rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/30 cursor-pointer transition-colors">
              <BarChart3 className="h-7 w-7 text-violet-500 mb-2" />
              <span className="text-sm font-medium">Ver reportes</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
