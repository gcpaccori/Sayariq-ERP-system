"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  Calculator,
  DollarSign,
  Scale,
  AlertTriangle,
  CheckCircle,
  Edit3,
  Save,
  Eye,
  FileText,
  Users,
  Banknote,
  Target,
} from "lucide-react"

// Tipos de datos
interface LoteSubproceso {
  id: string
  loteId: string
  codigoLote: string
  proveedor: string
  fechaUltimaPesada: string
  tipoSubproceso: string
  pesoFinal: number
  categorias: {
    exportable: number
    industrial: number
    nacional: number
    descarte: number
  }
  estadoVenta: "vendido" | "disponible" | "reservado"
  modalidadLiquidacion: "carga_cerrada" | "por_proceso"
  precioAcordado?: number
  ventaId?: string
}

interface PreciosCategoria {
  exportable: number
  industrial: number
  nacional: number
  descarte: number
}

interface EstadoDeuda {
  proveedorId: string
  saldoAnterior: number
  adelantosPendientes: number
  totalAdelantosDescontados: number
  saldoActual: number
  limitCredito: number
  creditoDisponible: number
}

interface EvaluacionLiquidacion {
  id: string
  proveedorId: string
  proveedor: string
  fechaEvaluacion: string
  lotes: LoteSubproceso[]
  precios: PreciosCategoria
  estadoDeuda: EstadoDeuda
  montoTotalBruto: number
  descuentoAdelantos: number
  montoNeto: number
  estado: "borrador" | "revision" | "aprobado" | "liquidado"
  observaciones: string
  responsable: string
}

// Datos mock
const mockLotesSubprocesos: LoteSubproceso[] = [
  {
    id: "1",
    loteId: "L001",
    codigoLote: "SAY-2024-001",
    proveedor: "Juan Pérez",
    fechaUltimaPesada: "2024-01-15T14:30:00",
    tipoSubproceso: "Secado Final",
    pesoFinal: 1250.5,
    categorias: {
      exportable: 850.2,
      industrial: 280.1,
      nacional: 95.2,
      descarte: 25.0,
    },
    estadoVenta: "vendido",
    modalidadLiquidacion: "por_proceso",
    ventaId: "V001",
  },
  {
    id: "2",
    loteId: "L002",
    codigoLote: "SAY-2024-002",
    proveedor: "Juan Pérez",
    fechaUltimaPesada: "2024-01-16T09:15:00",
    tipoSubproceso: "Clasificación",
    pesoFinal: 980.3,
    categorias: {
      exportable: 720.1,
      industrial: 180.2,
      nacional: 65.0,
      descarte: 15.0,
    },
    estadoVenta: "vendido",
    modalidadLiquidacion: "carga_cerrada",
    precioAcordado: 4.5,
    ventaId: "V002",
  },
]

const mockPreciosBase: PreciosCategoria = {
  exportable: 5.2,
  industrial: 3.8,
  nacional: 2.5,
  descarte: 0.8,
}

const mockEstadoDeuda: EstadoDeuda = {
  proveedorId: "P001",
  saldoAnterior: -150.0,
  adelantosPendientes: 800.0,
  totalAdelantosDescontados: 2400.0,
  saldoActual: -950.0,
  limitCredito: 5000.0,
  creditoDisponible: 4050.0,
}

export function EvaluacionLiquidacionAvanzada() {
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState("")
  const [lotesDisponibles, setLotesDisponibles] = useState<LoteSubproceso[]>([])
  const [lotesSeleccionados, setLotesSeleccionados] = useState<string[]>([])
  const [precios, setPrecios] = useState<PreciosCategoria>(mockPreciosBase)
  const [preciosEditando, setPreciosEditando] = useState(false)
  const [evaluacion, setEvaluacion] = useState<EvaluacionLiquidacion | null>(null)
  const [observaciones, setObservaciones] = useState("")

  // Cargar lotes cuando se selecciona proveedor
  useEffect(() => {
    if (proveedorSeleccionado) {
      const lotesFiltrados = mockLotesSubprocesos.filter(
        (lote) => lote.proveedor === proveedorSeleccionado && lote.estadoVenta === "vendido",
      )
      setLotesDisponibles(lotesFiltrados)
    }
  }, [proveedorSeleccionado])

  // Calcular totales
  const calcularTotales = () => {
    const lotesEvaluacion = lotesDisponibles.filter((lote) => lotesSeleccionados.includes(lote.id))

    let montoTotalBruto = 0

    lotesEvaluacion.forEach((lote) => {
      if (lote.modalidadLiquidacion === "carga_cerrada") {
        montoTotalBruto += lote.pesoFinal * (lote.precioAcordado || 0)
      } else {
        montoTotalBruto +=
          lote.categorias.exportable * precios.exportable +
          lote.categorias.industrial * precios.industrial +
          lote.categorias.nacional * precios.nacional +
          lote.categorias.descarte * precios.descarte
      }
    })

    const descuentoAdelantos = mockEstadoDeuda.adelantosPendientes
    const montoNeto = montoTotalBruto - descuentoAdelantos

    return { montoTotalBruto, descuentoAdelantos, montoNeto }
  }

  const { montoTotalBruto, descuentoAdelantos, montoNeto } = calcularTotales()

  const crearEvaluacion = () => {
    const nuevaEvaluacion: EvaluacionLiquidacion = {
      id: `EVAL-${Date.now()}`,
      proveedorId: "P001",
      proveedor: proveedorSeleccionado,
      fechaEvaluacion: new Date().toISOString(),
      lotes: lotesDisponibles.filter((lote) => lotesSeleccionados.includes(lote.id)),
      precios,
      estadoDeuda: mockEstadoDeuda,
      montoTotalBruto,
      descuentoAdelantos,
      montoNeto,
      estado: "borrador",
      observaciones,
      responsable: "Admin",
    }
    setEvaluacion(nuevaEvaluacion)
  }

  const aprobarEvaluacion = () => {
    if (evaluacion) {
      setEvaluacion({
        ...evaluacion,
        estado: "aprobado",
      })
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Evaluación de Liquidación Avanzada</h1>
          <p className="text-gray-600 mt-2">
            Sistema avanzado de evaluación con integración completa de subprocesos y gestión de deudas
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Target className="w-4 h-4 mr-2" />
          Módulo Avanzado
        </Badge>
      </div>

      <Tabs defaultValue="seleccion" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="seleccion">1. Selección</TabsTrigger>
          <TabsTrigger value="evaluacion">2. Evaluación</TabsTrigger>
          <TabsTrigger value="revision">3. Revisión</TabsTrigger>
          <TabsTrigger value="aprobacion">4. Aprobación</TabsTrigger>
        </TabsList>

        {/* Paso 1: Selección de Proveedor y Lotes */}
        <TabsContent value="seleccion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Selección de Proveedor
              </CardTitle>
              <CardDescription>Selecciona el proveedor y los lotes vendidos para evaluar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="proveedor">Proveedor</Label>
                  <Select value={proveedorSeleccionado} onValueChange={setProveedorSeleccionado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Juan Pérez">Juan Pérez</SelectItem>
                      <SelectItem value="María García">María García</SelectItem>
                      <SelectItem value="Carlos López">Carlos López</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estado de Crédito</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Progress
                      value={(mockEstadoDeuda.creditoDisponible / mockEstadoDeuda.limitCredito) * 100}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium">S/ {mockEstadoDeuda.creditoDisponible.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {proveedorSeleccionado && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Lotes Vendidos Disponibles</h3>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Sel.</TableHead>
                          <TableHead>Código Lote</TableHead>
                          <TableHead>Última Pesada</TableHead>
                          <TableHead>Subproceso</TableHead>
                          <TableHead>Peso Final</TableHead>
                          <TableHead>Modalidad</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lotesDisponibles.map((lote) => (
                          <TableRow key={lote.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={lotesSeleccionados.includes(lote.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setLotesSeleccionados([...lotesSeleccionados, lote.id])
                                  } else {
                                    setLotesSeleccionados(lotesSeleccionados.filter((id) => id !== lote.id))
                                  }
                                }}
                                className="rounded"
                              />
                            </TableCell>
                            <TableCell className="font-medium">{lote.codigoLote}</TableCell>
                            <TableCell>{new Date(lote.fechaUltimaPesada).toLocaleDateString("es-PE")}</TableCell>
                            <TableCell>{lote.tipoSubproceso}</TableCell>
                            <TableCell>{lote.pesoFinal.toFixed(2)} kg</TableCell>
                            <TableCell>
                              <Badge variant={lote.modalidadLiquidacion === "carga_cerrada" ? "default" : "secondary"}>
                                {lote.modalidadLiquidacion === "carga_cerrada" ? "Carga Cerrada" : "Por Proceso"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-green-600">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Vendido
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paso 2: Evaluación y Precios */}
        <TabsContent value="evaluacion" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Precios por Categoría
                  <Button variant="outline" size="sm" onClick={() => setPreciosEditando(!preciosEditando)}>
                    {preciosEditando ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(precios).map(([categoria, precio]) => (
                  <div key={categoria} className="flex items-center justify-between">
                    <Label className="capitalize">{categoria}</Label>
                    {preciosEditando ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={precio}
                        onChange={(e) =>
                          setPrecios({
                            ...precios,
                            [categoria]: Number.parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-24"
                      />
                    ) : (
                      <span className="font-medium">S/ {precio.toFixed(2)}</span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="w-5 h-5" />
                  Estado de Deuda
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Saldo Anterior:</span>
                  <span className="font-medium text-red-600">S/ {mockEstadoDeuda.saldoAnterior.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Adelantos Pendientes:</span>
                  <span className="font-medium text-orange-600">
                    S/ {mockEstadoDeuda.adelantosPendientes.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Adelantos Descontados:</span>
                  <span className="font-medium text-gray-600">
                    S/ {mockEstadoDeuda.totalAdelantosDescontados.toFixed(2)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Saldo Actual:</span>
                  <span className={mockEstadoDeuda.saldoActual < 0 ? "text-red-600" : "text-green-600"}>
                    S/ {mockEstadoDeuda.saldoActual.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Crédito Disponible:</span>
                  <span>S/ {mockEstadoDeuda.creditoDisponible.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detalle de Lotes Seleccionados */}
          {lotesSeleccionados.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="w-5 h-5" />
                  Detalle de Evaluación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lote</TableHead>
                      <TableHead>Modalidad</TableHead>
                      <TableHead>Exportable</TableHead>
                      <TableHead>Industrial</TableHead>
                      <TableHead>Nacional</TableHead>
                      <TableHead>Descarte</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotesDisponibles
                      .filter((lote) => lotesSeleccionados.includes(lote.id))
                      .map((lote) => {
                        const total =
                          lote.modalidadLiquidacion === "carga_cerrada"
                            ? lote.pesoFinal * (lote.precioAcordado || 0)
                            : lote.categorias.exportable * precios.exportable +
                              lote.categorias.industrial * precios.industrial +
                              lote.categorias.nacional * precios.nacional +
                              lote.categorias.descarte * precios.descarte

                        return (
                          <TableRow key={lote.id}>
                            <TableCell className="font-medium">{lote.codigoLote}</TableCell>
                            <TableCell>
                              <Badge variant={lote.modalidadLiquidacion === "carga_cerrada" ? "default" : "secondary"}>
                                {lote.modalidadLiquidacion === "carga_cerrada" ? "Cerrada" : "Proceso"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {lote.modalidadLiquidacion === "carga_cerrada"
                                ? "-"
                                : `${lote.categorias.exportable.toFixed(1)} kg`}
                            </TableCell>
                            <TableCell>
                              {lote.modalidadLiquidacion === "carga_cerrada"
                                ? "-"
                                : `${lote.categorias.industrial.toFixed(1)} kg`}
                            </TableCell>
                            <TableCell>
                              {lote.modalidadLiquidacion === "carga_cerrada"
                                ? "-"
                                : `${lote.categorias.nacional.toFixed(1)} kg`}
                            </TableCell>
                            <TableCell>
                              {lote.modalidadLiquidacion === "carga_cerrada"
                                ? "-"
                                : `${lote.categorias.descarte.toFixed(1)} kg`}
                            </TableCell>
                            <TableCell className="font-semibold">S/ {total.toFixed(2)}</TableCell>
                          </TableRow>
                        )
                      })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Paso 3: Revisión */}
        <TabsContent value="revision" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Resumen de Liquidación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">S/ {montoTotalBruto.toFixed(2)}</div>
                  <div className="text-sm text-gray-600">Monto Bruto</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">S/ {descuentoAdelantos.toFixed(2)}</div>
                  <div className="text-sm text-gray-600">Descuento Adelantos</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">S/ {montoNeto.toFixed(2)}</div>
                  <div className="text-sm text-gray-600">Monto Neto</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Agregar observaciones sobre la evaluación..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={crearEvaluacion} className="flex-1">
                  <FileText className="w-4 h-4 mr-2" />
                  Crear Evaluación
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paso 4: Aprobación */}
        <TabsContent value="aprobacion" className="space-y-6">
          {evaluacion ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Evaluación Creada
                  <Badge
                    variant={
                      evaluacion.estado === "aprobado"
                        ? "default"
                        : evaluacion.estado === "borrador"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {evaluacion.estado}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  ID: {evaluacion.id} | Fecha: {new Date(evaluacion.fechaEvaluacion).toLocaleDateString("es-PE")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Proveedor:</strong> {evaluacion.proveedor}
                  </div>
                  <div>
                    <strong>Lotes:</strong> {evaluacion.lotes.length}
                  </div>
                  <div>
                    <strong>Monto Bruto:</strong> S/ {evaluacion.montoTotalBruto.toFixed(2)}
                  </div>
                  <div>
                    <strong>Monto Neto:</strong> S/ {evaluacion.montoNeto.toFixed(2)}
                  </div>
                </div>

                {evaluacion.observaciones && (
                  <div>
                    <strong>Observaciones:</strong>
                    <p className="text-gray-600 mt-1">{evaluacion.observaciones}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {evaluacion.estado === "borrador" && (
                    <Button onClick={aprobarEvaluacion}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aprobar Evaluación
                    </Button>
                  )}
                  <Button variant="outline">
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Detalle Completo
                  </Button>
                  <Button variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    Exportar PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Completa los pasos anteriores para crear la evaluación de liquidación.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
