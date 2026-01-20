"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  Package,
  Scale,
  Calendar,
  Tag,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Layers,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface CalidadGenerada {
  categoria: string
  kilogramos: number
  porcentaje: number
  esperado: boolean
  observaciones?: string
}

interface LoteDetalle {
  id: string
  loteId: string
  fechaProceso: string
  kilogramosUsados: number
  kilogramosDisponibles: number
  jabas: number
  categoria: string
  eficiencia: number
  calidadesGeneradas: CalidadGenerada[]
}

interface AnalisisLotePedido {
  id: string
  loteId: string
  pedidoId: string
  clienteId: string
  kilogramosSolicitados: number
  kilogramosEntregados: number
  kilogramosAceptadosExtra: number
  jabas: number
  categoria: string
  fechaPedido: string
  fechaCompletado: string
  lotesUtilizados: LoteDetalle[]
  totalSobra: number
  porcentajeEficiencia: number
  estadoCliente: "aceptado" | "rechazado" | "parcial"
  observaciones: string
}

export function LotesPedidos() {
  const [analisisLotes, setAnalisisLotes] = useState<AnalisisLotePedido[]>([
    {
      id: "1",
      loteId: "L001",
      pedidoId: "P001",
      clienteId: "CLI001",
      kilogramosSolicitados: 1000,
      kilogramosEntregados: 1150,
      kilogramosAceptadosExtra: 150,
      jabas: 58,
      categoria: "Exportación",
      fechaPedido: "2024-01-15",
      fechaCompletado: "2024-01-17",
      lotesUtilizados: [
        {
          id: "1",
          loteId: "L001-A",
          fechaProceso: "2024-01-16",
          kilogramosUsados: 450,
          kilogramosDisponibles: 500,
          jabas: 22,
          categoria: "Exportación",
          eficiencia: 90,
          calidadesGeneradas: [
            { categoria: "Exportación", kilogramos: 380, porcentaje: 84.4, esperado: true },
            {
              categoria: "Nacional",
              kilogramos: 50,
              porcentaje: 11.1,
              esperado: false,
              observaciones: "Calidad inferior por humedad",
            },
            {
              categoria: "Descarte",
              kilogramos: 20,
              porcentaje: 4.4,
              esperado: false,
              observaciones: "Producto dañado",
            },
          ],
        },
        {
          id: "2",
          loteId: "L001-B",
          fechaProceso: "2024-01-17",
          kilogramosUsados: 700,
          kilogramosDisponibles: 750,
          jabas: 36,
          categoria: "Exportación",
          eficiencia: 93.3,
          calidadesGeneradas: [
            { categoria: "Exportación", kilogramos: 620, porcentaje: 88.6, esperado: true },
            {
              categoria: "Premium",
              kilogramos: 60,
              porcentaje: 8.6,
              esperado: false,
              observaciones: "Calidad superior inesperada",
            },
            { categoria: "Nacional", kilogramos: 20, porcentaje: 2.9, esperado: false },
          ],
        },
      ],
      totalSobra: 100,
      porcentajeEficiencia: 91.7,
      estadoCliente: "aceptado",
      observaciones: "Cliente aceptó 150kg extra por buena calidad",
    },
    {
      id: "2",
      loteId: "L002",
      pedidoId: "P002",
      clienteId: "CLI002",
      kilogramosSolicitados: 800,
      kilogramosEntregados: 750,
      kilogramosAceptadosExtra: 0,
      jabas: 38,
      categoria: "Nacional",
      fechaPedido: "2024-01-18",
      fechaCompletado: "2024-01-19",
      lotesUtilizados: [
        {
          id: "3",
          loteId: "L002-A",
          fechaProceso: "2024-01-19",
          kilogramosUsados: 750,
          kilogramosDisponibles: 920,
          jabas: 38,
          categoria: "Nacional",
          eficiencia: 81.5,
          calidadesGeneradas: [
            { categoria: "Nacional", kilogramos: 580, porcentaje: 77.3, esperado: true },
            {
              categoria: "Descarte",
              kilogramos: 120,
              porcentaje: 16.0,
              esperado: false,
              observaciones: "Alta humedad y defectos",
            },
            {
              categoria: "Exportación",
              kilogramos: 50,
              porcentaje: 6.7,
              esperado: false,
              observaciones: "Calidad superior inesperada",
            },
          ],
        },
      ],
      totalSobra: 170,
      porcentajeEficiencia: 81.5,
      estadoCliente: "parcial",
      observaciones: "No se completó el pedido por calidad inferior en parte del lote",
    },
  ])

  const [searchTerm, setSearchTerm] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("todos")

  const filteredAnalisis = analisisLotes.filter((analisis) => {
    const matchesSearch =
      analisis.loteId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      analisis.pedidoId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      analisis.clienteId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      analisis.categoria.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter =
      filtroEstado === "todos" ||
      (filtroEstado === "eficiente" && analisis.porcentajeEficiencia >= 90) ||
      (filtroEstado === "sobra" && analisis.totalSobra > 0) ||
      (filtroEstado === "aceptado-extra" && analisis.kilogramosAceptadosExtra > 0) ||
      (filtroEstado === "incompleto" && analisis.kilogramosEntregados < analisis.kilogramosSolicitados)

    return matchesSearch && matchesFilter
  })

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "aceptado":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Aceptado
          </Badge>
        )
      case "parcial":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <AlertCircle className="mr-1 h-3 w-3" />
            Parcial
          </Badge>
        )
      case "rechazado":
        return (
          <Badge className="bg-red-100 text-red-800">
            <AlertCircle className="mr-1 h-3 w-3" />
            Rechazado
          </Badge>
        )
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  const getCalidadBadge = (calidad: CalidadGenerada) => {
    if (calidad.esperado) {
      return <Badge className="bg-green-100 text-green-800">Esperada</Badge>
    } else if (calidad.categoria === "Premium" || calidad.categoria === "Exportación") {
      return <Badge className="bg-blue-100 text-blue-800">Superior</Badge>
    } else if (calidad.categoria === "Descarte") {
      return <Badge className="bg-red-100 text-red-800">Descarte</Badge>
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800">No Esperada</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Análisis Lotes Pedidos</h1>
          <p className="text-muted-foreground">
            Análisis del comportamiento de lotes en pedidos, eficiencia y aceptación de sobras
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por lote, pedido, cliente o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por comportamiento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="eficiente">Alta Eficiencia (≥90%)</SelectItem>
            <SelectItem value="sobra">Con Sobras</SelectItem>
            <SelectItem value="aceptado-extra">Extra Aceptado</SelectItem>
            <SelectItem value="incompleto">Incompletos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6">
        {filteredAnalisis.map((analisis) => (
          <Card key={analisis.id} className="overflow-hidden">
            <CardHeader className="bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Lote {analisis.loteId} - Pedido {analisis.pedidoId}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {analisis.fechaPedido} → {analisis.fechaCompletado}
                    </span>
                    <Badge variant="outline">
                      <Tag className="mr-1 h-3 w-3" />
                      {analisis.categoria}
                    </Badge>
                    <span className="text-sm">Cliente: {analisis.clienteId}</span>
                  </CardDescription>
                </div>
                <div className="text-right space-y-2">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{analisis.kilogramosEntregados} kg</span>
                    <span className="text-muted-foreground">de {analisis.kilogramosSolicitados} kg</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    {getEstadoBadge(analisis.estadoCliente)}
                    <div className="flex items-center gap-1">
                      {analisis.porcentajeEficiencia >= 90 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium">{analisis.porcentajeEficiencia}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <Tabs defaultValue="resumen" className="w-full">
                <TabsList>
                  <TabsTrigger value="resumen">Resumen</TabsTrigger>
                  <TabsTrigger value="lotes-detalle">Detalle Lotes</TabsTrigger>
                  <TabsTrigger value="calidades">Calidades Generadas</TabsTrigger>
                  <TabsTrigger value="comportamiento">Comportamiento</TabsTrigger>
                </TabsList>

                <TabsContent value="resumen" className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-blue-600">{analisis.kilogramosSolicitados} kg</div>
                        <p className="text-xs text-muted-foreground">Solicitado</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-green-600">{analisis.kilogramosEntregados} kg</div>
                        <p className="text-xs text-muted-foreground">Entregado</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-orange-600">{analisis.kilogramosAceptadosExtra} kg</div>
                        <p className="text-xs text-muted-foreground">Extra Aceptado</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-purple-600">{analisis.totalSobra} kg</div>
                        <p className="text-xs text-muted-foreground">Sobra Total</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Eficiencia del Lote</span>
                      <span>{analisis.porcentajeEficiencia}%</span>
                    </div>
                    <Progress value={analisis.porcentajeEficiencia} className="h-2" />
                  </div>

                  {analisis.observaciones && (
                    <Card className="bg-blue-50">
                      <CardContent className="p-4">
                        <p className="text-sm">
                          <strong>Observaciones:</strong> {analisis.observaciones}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="lotes-detalle" className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lote ID</TableHead>
                        <TableHead>Fecha Proceso</TableHead>
                        <TableHead>Usado / Disponible</TableHead>
                        <TableHead>Eficiencia</TableHead>
                        <TableHead>Jabas</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Calidades</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analisis.lotesUtilizados.map((lote) => (
                        <TableRow key={lote.id}>
                          <TableCell className="font-medium">{lote.loteId}</TableCell>
                          <TableCell>{lote.fechaProceso}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm">
                                {lote.kilogramosUsados} / {lote.kilogramosDisponibles} kg
                              </div>
                              <Progress
                                value={(lote.kilogramosUsados / lote.kilogramosDisponibles) * 100}
                                className="h-1"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {lote.eficiencia >= 90 ? (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                              )}
                              <span className={lote.eficiencia >= 90 ? "text-green-600" : "text-red-600"}>
                                {lote.eficiencia}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{lote.jabas}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{lote.categoria}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Layers className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{lote.calidadesGeneradas.length} tipos</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="calidades" className="space-y-4">
                  <div className="space-y-6">
                    {analisis.lotesUtilizados.map((lote) => (
                      <Card key={lote.id}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Package className="h-5 w-5" />
                            {lote.loteId} - Análisis de Calidades
                          </CardTitle>
                          <CardDescription>
                            Comparación entre calidades esperadas vs obtenidas y su impacto en el pedido
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <Card className="bg-green-50 border-green-200">
                                <CardContent className="p-4">
                                  <div className="text-2xl font-bold text-green-600">
                                    {lote.calidadesGeneradas
                                      .filter((c) => c.esperado)
                                      .reduce((sum, c) => sum + c.kilogramos, 0)}{" "}
                                    kg
                                  </div>
                                  <p className="text-xs text-muted-foreground">Calidad Esperada</p>
                                  <p className="text-xs text-green-600">
                                    {(
                                      (lote.calidadesGeneradas
                                        .filter((c) => c.esperado)
                                        .reduce((sum, c) => sum + c.kilogramos, 0) /
                                        lote.kilogramosUsados) *
                                      100
                                    ).toFixed(1)}
                                    % del lote
                                  </p>
                                </CardContent>
                              </Card>
                              <Card className="bg-blue-50 border-blue-200">
                                <CardContent className="p-4">
                                  <div className="text-2xl font-bold text-blue-600">
                                    {lote.calidadesGeneradas
                                      .filter((c) => !c.esperado && c.categoria !== "Descarte")
                                      .reduce((sum, c) => sum + c.kilogramos, 0)}{" "}
                                    kg
                                  </div>
                                  <p className="text-xs text-muted-foreground">Calidad Reasignable</p>
                                  <p className="text-xs text-blue-600">Puede ir a otros pedidos</p>
                                </CardContent>
                              </Card>
                              <Card className="bg-red-50 border-red-200">
                                <CardContent className="p-4">
                                  <div className="text-2xl font-bold text-red-600">
                                    {lote.calidadesGeneradas
                                      .filter((c) => c.categoria === "Descarte")
                                      .reduce((sum, c) => sum + c.kilogramos, 0)}{" "}
                                    kg
                                  </div>
                                  <p className="text-xs text-muted-foreground">Descarte</p>
                                  <p className="text-xs text-red-600">Pérdida total</p>
                                </CardContent>
                              </Card>
                              <Card className="bg-purple-50 border-purple-200">
                                <CardContent className="p-4">
                                  <div className="text-2xl font-bold text-purple-600">
                                    {(
                                      (lote.calidadesGeneradas
                                        .filter((c) => !c.esperado)
                                        .reduce((sum, c) => sum + c.kilogramos, 0) /
                                        lote.kilogramosUsados) *
                                      100
                                    ).toFixed(1)}
                                    %
                                  </div>
                                  <p className="text-xs text-muted-foreground">Variación</p>
                                  <p className="text-xs text-purple-600">Del total procesado</p>
                                </CardContent>
                              </Card>
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="text-lg font-semibold">Desglose de Calidades</h4>
                                <Badge variant="outline">
                                  Total: {lote.calidadesGeneradas.reduce((sum, c) => sum + c.kilogramos, 0)} kg
                                </Badge>
                              </div>

                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Categoría</TableHead>
                                    <TableHead>Kilogramos</TableHead>
                                    <TableHead>% del Lote</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Impacto en Pedido</TableHead>
                                    <TableHead>Observaciones</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {lote.calidadesGeneradas
                                    .sort((a, b) => b.kilogramos - a.kilogramos)
                                    .map((calidad, index) => (
                                      <TableRow key={index} className={!calidad.esperado ? "bg-yellow-50" : ""}>
                                        <TableCell className="font-medium">
                                          <Badge
                                            variant="outline"
                                            className={
                                              calidad.categoria === "Exportación"
                                                ? "border-green-500 text-green-700"
                                                : calidad.categoria === "Premium"
                                                  ? "border-blue-500 text-blue-700"
                                                  : calidad.categoria === "Nacional"
                                                    ? "border-orange-500 text-orange-700"
                                                    : calidad.categoria === "Descarte"
                                                      ? "border-red-500 text-red-700"
                                                      : ""
                                            }
                                          >
                                            {calidad.categoria}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          <div className="font-semibold">{calidad.kilogramos} kg</div>
                                        </TableCell>
                                        <TableCell>
                                          <div className="space-y-1">
                                            <span className="font-medium">{calidad.porcentaje}%</span>
                                            <Progress value={calidad.porcentaje} className="h-2" />
                                          </div>
                                        </TableCell>
                                        <TableCell>{getCalidadBadge(calidad)}</TableCell>
                                        <TableCell>
                                          {calidad.esperado ? (
                                            <Badge className="bg-green-100 text-green-800">✓ Cumple pedido</Badge>
                                          ) : calidad.categoria === "Descarte" ? (
                                            <Badge className="bg-red-100 text-red-800">✗ Pérdida</Badge>
                                          ) : (
                                            <Badge className="bg-blue-100 text-blue-800">→ Reasignar</Badge>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground max-w-xs">
                                          {calidad.observaciones || "Sin observaciones"}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                </TableBody>
                              </Table>
                            </div>

                            {lote.calidadesGeneradas.some((c) => !c.esperado) && (
                              <Card className="bg-orange-50 border-orange-200">
                                <CardHeader>
                                  <CardTitle className="text-lg text-orange-800 flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5" />
                                    Análisis de Variaciones en el Lote
                                  </CardTitle>
                                  <CardDescription>
                                    Explicación de por qué el lote no rindió según lo esperado
                                  </CardDescription>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <h5 className="font-semibold text-orange-800 mb-2">Calidades No Esperadas:</h5>
                                        <div className="space-y-2">
                                          {lote.calidadesGeneradas
                                            .filter((c) => !c.esperado)
                                            .map((calidad, index) => (
                                              <div
                                                key={index}
                                                className="flex justify-between items-center p-2 bg-white rounded border"
                                              >
                                                <div>
                                                  <Badge variant="outline" className="mr-2">
                                                    {calidad.categoria}
                                                  </Badge>
                                                  <span className="text-sm font-medium">{calidad.kilogramos} kg</span>
                                                </div>
                                                <div className="text-right">
                                                  <div className="text-sm text-orange-700">
                                                    {calidad.categoria === "Descarte"
                                                      ? "Pérdida directa"
                                                      : calidad.categoria === "Premium"
                                                        ? "Calidad superior"
                                                        : "Calidad diferente"}
                                                  </div>
                                                  <div className="text-xs text-muted-foreground">
                                                    {calidad.porcentaje}% del lote
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                        </div>
                                      </div>

                                      <div>
                                        <h5 className="font-semibold text-orange-800 mb-2">Impacto en el Pedido:</h5>
                                        <div className="space-y-2">
                                          <div className="p-2 bg-white rounded border">
                                            <div className="text-sm">
                                              <strong>Kilogramos perdidos por descarte:</strong>
                                            </div>
                                            <div className="text-lg font-bold text-red-600">
                                              {lote.calidadesGeneradas
                                                .filter((c) => c.categoria === "Descarte")
                                                .reduce((sum, c) => sum + c.kilogramos, 0)}{" "}
                                              kg
                                            </div>
                                          </div>

                                          <div className="p-2 bg-white rounded border">
                                            <div className="text-sm">
                                              <strong>Kilogramos para reasignar:</strong>
                                            </div>
                                            <div className="text-lg font-bold text-blue-600">
                                              {lote.calidadesGeneradas
                                                .filter((c) => !c.esperado && c.categoria !== "Descarte")
                                                .reduce((sum, c) => sum + c.kilogramos, 0)}{" "}
                                              kg
                                            </div>
                                          </div>

                                          <div className="p-2 bg-white rounded border">
                                            <div className="text-sm">
                                              <strong>Eficiencia real del lote:</strong>
                                            </div>
                                            <div className="text-lg font-bold text-green-600">
                                              {(
                                                (lote.calidadesGeneradas
                                                  .filter((c) => c.esperado)
                                                  .reduce((sum, c) => sum + c.kilogramos, 0) /
                                                  lote.kilogramosUsados) *
                                                100
                                              ).toFixed(1)}
                                              %
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                      <h6 className="font-semibold text-blue-800 mb-2">Recomendaciones:</h6>
                                      <ul className="text-sm text-blue-700 space-y-1">
                                        {lote.calidadesGeneradas.some(
                                          (c) => c.categoria === "Descarte" && c.kilogramos > 50,
                                        ) && <li>• Revisar proceso de selección inicial para reducir descarte</li>}
                                        {lote.calidadesGeneradas.some(
                                          (c) => !c.esperado && c.categoria !== "Descarte",
                                        ) && (
                                          <li>
                                            • Considerar reasignar{" "}
                                            {lote.calidadesGeneradas
                                              .filter((c) => !c.esperado && c.categoria !== "Descarte")
                                              .reduce((sum, c) => sum + c.kilogramos, 0)}{" "}
                                            kg a otros pedidos
                                          </li>
                                        )}
                                        {lote.eficiencia < 85 && (
                                          <li>• Evaluar condiciones de almacenamiento y transporte del lote</li>
                                        )}
                                      </ul>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="comportamiento" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Análisis de Cumplimiento</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span>Pedido Completado:</span>
                          <Badge
                            variant={
                              analisis.kilogramosEntregados >= analisis.kilogramosSolicitados
                                ? "default"
                                : "destructive"
                            }
                          >
                            {analisis.kilogramosEntregados >= analisis.kilogramosSolicitados ? "Sí" : "No"}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Cliente Aceptó Extra:</span>
                          <Badge variant={analisis.kilogramosAceptadosExtra > 0 ? "default" : "secondary"}>
                            {analisis.kilogramosAceptadosExtra > 0 ? "Sí" : "No"}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Eficiencia Alta:</span>
                          <Badge variant={analisis.porcentajeEficiencia >= 90 ? "default" : "destructive"}>
                            {analisis.porcentajeEficiencia >= 90 ? "Sí" : "No"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Impacto Económico</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span>Sobra Generada:</span>
                          <span className="font-semibold text-orange-600">{analisis.totalSobra} kg</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Extra Vendido:</span>
                          <span className="font-semibold text-green-600">{analisis.kilogramosAceptadosExtra} kg</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Estado Final:</span>
                          {getEstadoBadge(analisis.estadoCliente)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
