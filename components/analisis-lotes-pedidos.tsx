"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { useAnalisisLotesPedidos } from "@/lib/hooks/use-analisis-lotes-pedidos"
import {
  BarChart3,
  TrendingUp,
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Activity,
  PieChart,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"

export function AnalisisLotesPedidos() {
  const {
    metricasGenerales,
    analisisCompleto,
    eficienciaLotes,
    aceptacionSobras,
    resumenSobras,
    comportamientoTemporal,
    loading,
    error,
    refresh,
    loadData,
    isLoading,
  } = useAnalisisLotesPedidos()

  const [activeTab, setActiveTab] = useState("metricas")

  const safeNumber = (value: number | undefined | null, decimals = 2): string => {
    if (value === undefined || value === null || isNaN(value)) return "0." + "0".repeat(decimals)
    return Number(value).toFixed(decimals)
  }

  const safeInteger = (value: number | undefined | null): number => {
    if (value === undefined || value === null || isNaN(value)) return 0
    return Math.floor(Number(value))
  }

  const getEstadoFrescuraBadge = (estado: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      optimo: { variant: "default", label: "Óptimo" },
      proximo_vencer: { variant: "secondary", label: "Próximo a vencer" },
      en_riesgo: { variant: "destructive", label: "En riesgo" },
    }
    const config = variants[estado] || { variant: "outline", label: estado }
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    )
  }

  const getCategoriaSobrasBadge = (categoria: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" }> = {
      "Sin sobras": { variant: "default" },
      "Sobras mínimas (<5%)": { variant: "secondary" },
      "Sobras moderadas (5-15%)": { variant: "secondary" },
      "Sobras altas (>15%)": { variant: "destructive" },
    }
    const config = variants[categoria] || { variant: "outline" }
    return (
      <Badge variant={config.variant} className="text-xs">
        {categoria}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Error al cargar análisis: {error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Análisis Lotes-Pedidos</h1>
          <p className="text-muted-foreground">
            Análisis del comportamiento de lotes en pedidos, eficiencia y aceptación de sobras
          </p>
        </div>
        <Button onClick={loadData} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Métricas Generales */}
      {metricasGenerales && Object.keys(metricasGenerales).length > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lotes Utilizados</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{safeInteger(metricasGenerales.total_lotes_usados)}</div>
                <p className="text-xs text-muted-foreground">Total de lotes en operación</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pedidos Atendidos</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{safeInteger(metricasGenerales.total_pedidos_atendidos)}</div>
                <p className="text-xs text-muted-foreground">Pedidos procesados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Eficiencia de Peso</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{safeNumber(metricasGenerales.eficiencia_peso)}%</div>
                <Progress value={safeInteger(metricasGenerales.eficiencia_peso)} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Peso Total Asignado</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{safeNumber(metricasGenerales.peso_total_asignado)} kg</div>
                <p className="text-xs text-muted-foreground">
                  Promedio: {safeNumber(metricasGenerales.peso_promedio_asignacion)} kg
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Estados de Asignaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Estado de Asignaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completadas</p>
                    <p className="text-2xl font-bold">{safeInteger(metricasGenerales.asignaciones_completadas)}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">En Proceso</p>
                    <p className="text-2xl font-bold">{safeInteger(metricasGenerales.asignaciones_en_proceso)}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Planificadas</p>
                    <p className="text-2xl font-bold">{safeInteger(metricasGenerales.asignaciones_planificadas)}</p>
                  </div>
                  <Activity className="h-8 w-8 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>No hay datos disponibles para mostrar métricas generales.</AlertDescription>
        </Alert>
      )}

      {/* Tabs de Análisis Detallado */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="metricas">Análisis Completo</TabsTrigger>
          <TabsTrigger value="eficiencia">Eficiencia Lotes</TabsTrigger>
          <TabsTrigger value="sobras">Aceptación Sobras</TabsTrigger>
          <TabsTrigger value="temporal">Comportamiento Temporal</TabsTrigger>
        </TabsList>

        <TabsContent value="metricas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análisis Completo de Asignaciones</CardTitle>
              <CardDescription>
                Detalle de todas las asignaciones de lotes a pedidos con métricas de eficiencia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lote</TableHead>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Productor</TableHead>
                      <TableHead className="text-right">Peso Asignado</TableHead>
                      <TableHead className="text-right">% Usado</TableHead>
                      <TableHead className="text-right">Peso Sobrante</TableHead>
                      <TableHead className="text-right">Días Almacén</TableHead>
                      <TableHead className="text-right">Eficiencia</TableHead>
                      <TableHead>Frescura</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!analisisCompleto || analisisCompleto.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">
                          No hay datos de análisis disponibles
                        </TableCell>
                      </TableRow>
                    ) : (
                      analisisCompleto.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.numero_lote}</TableCell>
                          <TableCell>{item.numero_pedido}</TableCell>
                          <TableCell className="text-sm">{item.productor_nombre}</TableCell>
                          <TableCell className="text-right">{safeNumber(item.peso_asignado)} kg</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={safeInteger(item.porcentaje_usado) > 80 ? "default" : "secondary"}>
                              {safeNumber(item.porcentaje_usado, 1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{safeNumber(item.peso_sobrante)} kg</TableCell>
                          <TableCell className="text-right">{safeInteger(item.dias_en_almacen)} días</TableCell>
                          <TableCell className="text-right">
                            <Progress value={safeInteger(item.eficiencia_lote)} className="w-16" />
                          </TableCell>
                          <TableCell>{getEstadoFrescuraBadge(item.estado_frescura)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eficiencia" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Eficiencia por Lote</CardTitle>
              <CardDescription>
                Análisis de eficiencia de procesamiento y tasa de utilización de cada lote
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lote</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Productor</TableHead>
                      <TableHead className="text-right">Peso Inicial</TableHead>
                      <TableHead className="text-right">Peso Neto</TableHead>
                      <TableHead className="text-right">Asignaciones</TableHead>
                      <TableHead className="text-right">Peso Asignado</TableHead>
                      <TableHead className="text-right">Disponible</TableHead>
                      <TableHead className="text-right">Tasa Utilización</TableHead>
                      <TableHead className="text-right">Eficiencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!eficienciaLotes || eficienciaLotes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground">
                          No hay datos de eficiencia disponibles
                        </TableCell>
                      </TableRow>
                    ) : (
                      eficienciaLotes.map((lote) => (
                        <TableRow key={lote.lote_id}>
                          <TableCell className="font-medium">{lote.numero_lote}</TableCell>
                          <TableCell>{lote.producto}</TableCell>
                          <TableCell className="text-sm">{lote.productor_nombre}</TableCell>
                          <TableCell className="text-right">{safeNumber(lote.peso_inicial)} kg</TableCell>
                          <TableCell className="text-right">{safeNumber(lote.peso_neto)} kg</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline">{safeInteger(lote.numero_asignaciones)}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{safeNumber(lote.peso_total_asignado)} kg</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={safeInteger(lote.peso_disponible) > 0 ? "secondary" : "default"}>
                              {safeNumber(lote.peso_disponible)} kg
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2">
                              <Progress value={safeInteger(lote.tasa_utilizacion)} className="w-16" />
                              <span className="text-sm">{safeNumber(lote.tasa_utilizacion, 1)}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={safeInteger(lote.eficiencia_procesamiento) > 85 ? "default" : "secondary"}>
                              {safeNumber(lote.eficiencia_procesamiento, 1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sobras" className="space-y-4">
          {/* Resumen de Sobras */}
          {resumenSobras && Object.keys(resumenSobras).length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Resumen de Sobras
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                    <p className="text-sm font-medium text-muted-foreground">Sobras Mínimas</p>
                    <p className="text-2xl font-bold">{safeInteger(resumenSobras.sobras_minimas)}</p>
                    <p className="text-xs text-muted-foreground">{"<5%"}</p>
                  </div>
                  <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                    <p className="text-sm font-medium text-muted-foreground">Sobras Moderadas</p>
                    <p className="text-2xl font-bold">{safeInteger(resumenSobras.sobras_moderadas)}</p>
                    <p className="text-xs text-muted-foreground">5-15%</p>
                  </div>
                  <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
                    <p className="text-sm font-medium text-muted-foreground">Sobras Altas</p>
                    <p className="text-2xl font-bold">{safeInteger(resumenSobras.sobras_altas)}</p>
                    <p className="text-xs text-muted-foreground">{">15%"}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">Total Peso Sobras</p>
                    <p className="text-2xl font-bold">{safeNumber(resumenSobras.peso_total_sobras)}</p>
                    <p className="text-xs text-muted-foreground">kg</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Detalle de Sobras */}
          <Card>
            <CardHeader>
              <CardTitle>Detalle de Aceptación de Sobras</CardTitle>
              <CardDescription>Análisis detallado de los lotes con sobras y su categorización</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lote</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Productor</TableHead>
                      <TableHead className="text-right">Peso Neto</TableHead>
                      <TableHead className="text-right">Peso Sobrante</TableHead>
                      <TableHead className="text-right">% Sobras</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Frescura</TableHead>
                      <TableHead className="text-right">Días Almacén</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!aceptacionSobras || aceptacionSobras.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">
                          No hay datos de sobras disponibles
                        </TableCell>
                      </TableRow>
                    ) : (
                      aceptacionSobras.map((sobra) => (
                        <TableRow key={sobra.lote_id}>
                          <TableCell className="font-medium">{sobra.numero_lote}</TableCell>
                          <TableCell>{sobra.producto}</TableCell>
                          <TableCell className="text-sm">{sobra.productor_nombre}</TableCell>
                          <TableCell className="text-right">{safeNumber(sobra.peso_neto)} kg</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{safeNumber(sobra.peso_sobrante)} kg</Badge>
                          </TableCell>
                          <TableCell className="text-right">{safeNumber(sobra.porcentaje_sobras, 1)}%</TableCell>
                          <TableCell>{getCategoriaSobrasBadge(sobra.categoria_sobras)}</TableCell>
                          <TableCell>{getEstadoFrescuraBadge(sobra.estado_frescura)}</TableCell>
                          <TableCell className="text-right">{safeInteger(sobra.dias_en_almacen)} días</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="temporal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comportamiento Temporal</CardTitle>
              <CardDescription>Tendencias mensuales de asignaciones y procesamiento de lotes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead className="text-right">Asignaciones</TableHead>
                      <TableHead className="text-right">Peso Total</TableHead>
                      <TableHead className="text-right">Lotes Únicos</TableHead>
                      <TableHead className="text-right">Promedio por Asignación</TableHead>
                      <TableHead className="text-right">Eficiencia Promedio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!comportamientoTemporal || comportamientoTemporal.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No hay datos temporales disponibles
                        </TableCell>
                      </TableRow>
                    ) : (
                      comportamientoTemporal.map((item) => (
                        <TableRow key={`${item.anio}-${item.mes}`}>
                          <TableCell className="font-medium">
                            {item.mes}/{item.anio}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge>{safeInteger(item.total_asignaciones)}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{safeNumber(item.peso_total_mes)} kg</TableCell>
                          <TableCell className="text-right">{safeInteger(item.lotes_unicos)}</TableCell>
                          <TableCell className="text-right">{safeNumber(item.promedio_peso_asignacion)} kg</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2">
                              <Progress value={safeInteger(item.eficiencia_promedio)} className="w-16" />
                              <span className="text-sm">{safeNumber(item.eficiencia_promedio, 1)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
