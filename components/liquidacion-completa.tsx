"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DollarSign, AlertCircle, CheckCircle, Loader2, Eye } from 'lucide-react'

import { useApi } from "@/lib/hooks/use-api"
import { lotesService } from "@/lib/services/lotes-service"
import { ajusteContableService } from "@/lib/services/ajuste-contable-service"
import { adelantosService } from "@/lib/services/adelantos-service"
import { numeroService } from "@/lib/services/numero-service"
import type { Lote } from "@/lib/types"

interface LiquidacionData {
  lote_id: number
  productor_id: number
  monto_bruto: number
  adelantos_aplicados: number
  monto_neto: number
  estado: "pendiente" | "cancelado" | "deficit"
  numero_liquidacion: string
}

export function LiquidacionCompleta() {
  const { data: lotes } = useApi(lotesService, { initialLoad: true })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedLote, setSelectedLote] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [numeroLiquidacion, setNumeroLiquidacion] = useState("")
  const [adelantosSeleccionados, setAdelantosSeleccionados] = useState<number[]>([])
  const [adelantos, setAdelantos] = useState<any[]>([])
  const [ajusteContable, setAjusteContable] = useState<any>(null)

  const cargarDatos = async (lote: Lote) => {
    try {
      // Cargar ajuste contable
      const ajustes = await ajusteContableService.getAll()
      const ajuste = ajustes.find((a) => a.lote_id === lote.id)
      setAjusteContable(ajuste)

      // Cargar adelantos del productor
      const todos = await adelantosService.getByProductor(lote.productor_id)
      setAdelantos(todos)

      // Generar número de liquidación
      const numero = await numeroService.generarNumeroLiquidacion()
      setNumeroLiquidacion(numero)
    } catch (error) {
      console.error("[v0] Error cargando datos:", error)
    }
  }

  const handleSelectLote = async (lote: Lote) => {
    setSelectedLote(lote)
    await cargarDatos(lote)
    setIsDialogOpen(true)
  }

  // Calcular totales
  const totalAdelantosSeleccionados = adelantos
    .filter((a) => adelantosSeleccionados.includes(a.id))
    .reduce((sum, a) => sum + a.monto, 0)

  const montoBruto = ajusteContable?.total_proceso || 0
  const montoNeto = Math.max(0, montoBruto - totalAdelantosSeleccionados)
  const estado: "pendiente" | "cancelado" | "deficit" =
    montoNeto === 0 ? "cancelado" : montoNeto < 0 ? "deficit" : "pendiente"

  const lotesParaLiquidar = (lotes as Lote[]).filter((l) => l.estado === "proceso")

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Liquidación de Lotes</h2>
          <p className="text-muted-foreground">
            Cálculo automático con múltiples adelantos y control de déficit
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lotes Listos para Liquidar</CardTitle>
          <CardDescription>
            {lotesParaLiquidar.length} lotes clasificados listos para liquidación
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lotesParaLiquidar.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No hay lotes clasificados para liquidar
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Lote</TableHead>
                  <TableHead>Productor</TableHead>
                  <TableHead>Peso Neto</TableHead>
                  <TableHead>Monto Bruto</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotesParaLiquidar.map((lote) => (
                  <TableRow key={lote.id}>
                    <TableCell className="font-medium">{lote.numero_lote}</TableCell>
                    <TableCell>{lote.productor_id}</TableCell>
                    <TableCell>{lote.peso_neto} kg</TableCell>
                    <TableCell className="text-green-600 font-semibold">S/ 0.00</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSelectLote(lote)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Liquidar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Liquidación - {selectedLote?.numero_lote}
            </DialogTitle>
          </DialogHeader>

          {selectedLote && ajusteContable && (
            <div className="space-y-6">
              {/* Información del Lote */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">N° Lote</p>
                      <p className="font-semibold">{selectedLote.numero_lote}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">N° Liquidación</p>
                      <p className="font-semibold">{numeroLiquidacion}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Peso Neto</p>
                      <p className="font-semibold">{selectedLote.peso_neto} kg</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Jabas</p>
                      <p className="font-semibold">{selectedLote.numero_jabas}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resumen de Montos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Resumen Financiero
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Exportable</p>
                      <p className="text-xl font-bold text-green-600">
                        S/ {ajusteContable.monto_exportable?.toFixed(2) || "0.00"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {ajusteContable.peso_exportable} kg × S/{ajusteContable.precio_exportable}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Industrial</p>
                      <p className="text-xl font-bold text-blue-600">
                        S/ {ajusteContable.monto_industrial?.toFixed(2) || "0.00"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {ajusteContable.peso_industrial} kg × S/{ajusteContable.precio_industrial}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Descarte</p>
                      <p className="text-xl font-bold text-gray-600">
                        S/ {ajusteContable.monto_descarte?.toFixed(2) || "0.00"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {ajusteContable.peso_descarte} kg × S/{ajusteContable.precio_descarte}
                      </p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg border-2 border-orange-300">
                      <p className="text-sm text-muted-foreground">Monto Bruto</p>
                      <p className="text-2xl font-bold text-orange-600">
                        S/ {montoBruto.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Adelantos */}
              <Card>
                <CardHeader>
                  <CardTitle>Adelantos del Productor</CardTitle>
                  <CardDescription>
                    {adelantos.length} adelanto(s) disponible(s) - Seleccione cuáles aplicar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {adelantos.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      Sin adelantos registrados
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {adelantos.map((adelanto) => (
                        <div
                          key={adelanto.id}
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={adelantosSeleccionados.includes(adelanto.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAdelantosSeleccionados([
                                  ...adelantosSeleccionados,
                                  adelanto.id,
                                ])
                              } else {
                                setAdelantosSeleccionados(
                                  adelantosSeleccionados.filter((id) => id !== adelanto.id)
                                )
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <div className="flex-1">
                            <p className="font-medium">{adelanto.motivo}</p>
                            <p className="text-sm text-gray-600">
                              Fecha: {adelanto.fecha_adelanto} - Estado: {adelanto.estado}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">S/ {adelanto.monto.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Cálculo Final */}
              <Card className={estado === "cancelado" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex justify-between">
                    <span className="font-semibold">Monto Bruto:</span>
                    <span className="text-lg font-bold">S/ {montoBruto.toFixed(2)}</span>
                  </div>

                  <div className="border-t pt-3">
                    <div className="flex justify-between mb-2">
                      <span>Menos: Adelantos Seleccionados</span>
                      <span className="font-semibold">
                        -S/ {totalAdelantosSeleccionados.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="text-lg font-bold">
                      {estado === "deficit" ? "Déficit a Cobrar:" : "Monto a Pagar:"}
                    </span>
                    <span
                      className={`text-2xl font-bold ${
                        estado === "cancelado"
                          ? "text-green-600"
                          : estado === "deficit"
                            ? "text-red-600"
                            : "text-blue-600"
                      }`}
                    >
                      S/ {Math.abs(montoNeto).toFixed(2)}
                    </span>
                  </div>

                  <Badge
                    className="w-full justify-center py-2 text-base"
                    variant={estado === "cancelado" ? "default" : "destructive"}
                  >
                    {estado === "cancelado"
                      ? "CANCELADO - Sin saldo pendiente"
                      : estado === "deficit"
                        ? "DÉFICIT - Productor debe"
                        : "PENDIENTE DE PAGO"}
                  </Badge>

                  {estado === "deficit" && (
                    <Alert className="bg-red-100 border-red-400">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        El productor tiene un déficit de S/ {Math.abs(montoNeto).toFixed(2)} que
                        debe cubrir con futuros adelantos.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Guardar Liquidación
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
