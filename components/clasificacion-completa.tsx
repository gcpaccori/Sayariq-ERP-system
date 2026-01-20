"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Calculator, Package, Save, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

import { useApi } from "@/lib/hooks/use-api"
import { lotesService } from "@/lib/services/lotes-service"
import { pesosService } from "@/lib/services/pesos-service"
import { ajusteContableService } from "@/lib/services/ajuste-contable-service"
import { kardexAutomaticoService } from "@/lib/services/kardex-automatico-service"
import { descuentosService } from "@/lib/services/descuentos-service"
import type { Lote } from "@/lib/types"

interface ClasificacionFormData {
  peso_exportable: number
  peso_industrial: number
  peso_descarte: number
  precio_exportable: number
  precio_industrial: number
  precio_descarte: number
}

export function ClasificacionCompleta() {
  const { data: lotes, refresh } = useApi(lotesService, { initialLoad: true })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null)
  const [loading, setLoading] = useState(false)
  const [clasificacion, setClasificacion] = useState<ClasificacionFormData>({
    peso_exportable: 0,
    peso_industrial: 0,
    peso_descarte: 0,
    precio_exportable: 8.5,
    precio_industrial: 4.2,
    precio_descarte: 1.5,
  })

  const totalPeso =
    clasificacion.peso_exportable +
    clasificacion.peso_industrial +
    clasificacion.peso_descarte

  // Calcular montos brutos por categoría
  const montoExportable = clasificacion.peso_exportable * clasificacion.precio_exportable
  const montoIndustrial = clasificacion.peso_industrial * clasificacion.precio_industrial
  const montoDescarte = clasificacion.peso_descarte * clasificacion.precio_descarte
  const montoBruto = montoExportable + montoIndustrial + montoDescarte

  // Calcular descuentos
  const descuentos = descuentosService.calcularDescuentosTotales(
    totalPeso,
    selectedLote?.numero_jabas || 0,
    montoBruto
  )

  const isValid = selectedLote && totalPeso <= selectedLote.peso_inicial

  const handleInputChange = (key: keyof ClasificacionFormData, value: number) => {
    setClasificacion((prev) => ({ ...prev, [key]: value }))
  }

  const handleSaveClasificacion = async () => {
    if (!selectedLote || !isValid) return

    setLoading(true)
    try {
      // 1. Registrar pesos del lote
      await pesosService.create({
        lote_id: selectedLote.id,
        fecha_pesado: new Date().toISOString().split("T")[0],
        peso_bruto: selectedLote.peso_inicial,
        peso_exportable: clasificacion.peso_exportable,
        peso_industrial: clasificacion.peso_industrial,
        peso_descarte: clasificacion.peso_descarte,
        observaciones: `Clasificación realizada - Exportable: ${clasificacion.peso_exportable}kg, Industrial: ${clasificacion.peso_industrial}kg, Descarte: ${clasificacion.peso_descarte}kg`,
      })

      // 2. Registrar ingreso automático en kardex
      await kardexAutomaticoService.registrarIngresoAutomatico(
        selectedLote.id,
        {
          peso_exportable: clasificacion.peso_exportable,
          peso_industrial: clasificacion.peso_industrial,
          peso_descarte: clasificacion.peso_descarte,
          fecha: new Date().toISOString().split("T")[0],
        }
      )

      // 3. Crear ajuste contable con descuentos aplicados
      await ajusteContableService.create({
        lote_id: selectedLote.id,
        tipo_ajuste: "por_proceso",
        peso_exportable: clasificacion.peso_exportable,
        precio_exportable: clasificacion.precio_exportable,
        monto_exportable: montoExportable,
        peso_industrial: clasificacion.peso_industrial,
        precio_industrial: clasificacion.precio_industrial,
        monto_industrial: montoIndustrial,
        peso_descarte: clasificacion.peso_descarte,
        precio_descarte: clasificacion.precio_descarte,
        monto_descarte: montoDescarte,
        total_proceso: descuentos.monto_neto,
        peso_ingreso: selectedLote.peso_inicial,
        precio_kg: montoBruto / selectedLote.peso_inicial,
        total_carga: montoBruto,
        fecha_liquidacion: new Date().toISOString().split("T")[0],
        serie: "B001",
        numero_liquidacion: "",
        observaciones: `Clasificación completada - Descuentos: Jabas S/${descuentos.descuento_jabas.toFixed(2)}, Flete S/${descuentos.descuento_flete.toFixed(2)}, Recibo S/${descuentos.descuento_recibo_egreso.toFixed(2)}, Cosecha S/${descuentos.descuento_cosecha.toFixed(2)}, Procesamiento S/${descuentos.descuento_procesamiento.toFixed(2)}`,
        estado: "pendiente",
      })

      // 4. Actualizar estado del lote a "clasificado"
      await lotesService.update(selectedLote.id, {
        estado: "proceso",
        peso_neto: totalPeso,
      })

      alert("Clasificación guardada exitosamente!\nKardex actualizado automáticamente.")

      setIsDialogOpen(false)
      setSelectedLote(null)
      setClasificacion({
        peso_exportable: 0,
        peso_industrial: 0,
        peso_descarte: 0,
        precio_exportable: 8.5,
        precio_industrial: 4.2,
        precio_descarte: 1.5,
      })

      await refresh()
    } catch (error) {
      console.error("[v0] Error al guardar clasificación:", error)
      alert("Error al guardar la clasificación")
    } finally {
      setLoading(false)
    }
  }

  const lotesParaClasificar = (lotes as Lote[]).filter(
    (l) => l.estado === "pendiente" || l.estado === "proceso"
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Clasificación de Productos</h2>
          <p className="text-muted-foreground">
            Clasificación automática con cálculo de descuentos y actualización de kardex
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Nueva Clasificación
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lotes Disponibles para Clasificar</CardTitle>
          <CardDescription>{lotesParaClasificar.length} lotes pendientes de clasificación</CardDescription>
        </CardHeader>
        <CardContent>
          {lotesParaClasificar.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No hay lotes para clasificar</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Lote</TableHead>
                  <TableHead>N° Guía</TableHead>
                  <TableHead>Peso Inicial</TableHead>
                  <TableHead>Jabas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotesParaClasificar.map((lote) => (
                  <TableRow key={lote.id}>
                    <TableCell className="font-medium">{lote.numero_lote}</TableCell>
                    <TableCell>{lote.guia_ingreso}</TableCell>
                    <TableCell>{lote.peso_inicial} kg</TableCell>
                    <TableCell>{lote.numero_jabas}</TableCell>
                    <TableCell>
                      <Badge variant={lote.estado === "pendiente" ? "default" : "secondary"}>
                        {lote.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedLote(lote)
                          setIsDialogOpen(true)
                        }}
                      >
                        Clasificar
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Clasificar Lote - {selectedLote?.numero_lote}
            </DialogTitle>
          </DialogHeader>

          {selectedLote && (
            <Tabs defaultValue="clasificacion" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="clasificacion">Clasificación</TabsTrigger>
                <TabsTrigger value="resumen">Resumen Financiero</TabsTrigger>
              </TabsList>

              <TabsContent value="clasificacion" className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">N° Lote</p>
                      <p className="font-semibold">{selectedLote.numero_lote}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Peso Inicial</p>
                      <p className="font-semibold">{selectedLote.peso_inicial} kg</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">N° Jabas</p>
                      <p className="font-semibold">{selectedLote.numero_jabas}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Pesos por Categoría
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Exportable (kg)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={clasificacion.peso_exportable}
                          onChange={(e) =>
                            handleInputChange("peso_exportable", Number(e.target.value))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Industrial (kg)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={clasificacion.peso_industrial}
                          onChange={(e) =>
                            handleInputChange("peso_industrial", Number(e.target.value))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Descarte (kg)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={clasificacion.peso_descarte}
                          onChange={(e) =>
                            handleInputChange("peso_descarte", Number(e.target.value))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Precios por Categoría (S/ kg)
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Precio Exportable</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={clasificacion.precio_exportable}
                          onChange={(e) =>
                            handleInputChange("precio_exportable", Number(e.target.value))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Precio Industrial</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={clasificacion.precio_industrial}
                          onChange={(e) =>
                            handleInputChange("precio_industrial", Number(e.target.value))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Precio Descarte</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={clasificacion.precio_descarte}
                          onChange={(e) =>
                            handleInputChange("precio_descarte", Number(e.target.value))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total Peso Clasificado:</span>
                          <span className="font-semibold">{totalPeso.toFixed(2)} kg</span>
                        </div>
                        <div
                          className={`flex justify-between ${
                            isValid ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          <span>Diferencia:</span>
                          <span className="font-semibold">
                            {(selectedLote.peso_inicial - totalPeso).toFixed(2)} kg
                          </span>
                        </div>
                        {!isValid && (
                          <Alert className="mt-2 bg-red-50 border-red-300">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800">
                              El total clasificado excede el peso inicial
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="resumen" className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground mb-1">Monto Exportable</p>
                        <p className="text-2xl font-bold text-green-600">
                          S/ {montoExportable.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {clasificacion.peso_exportable} kg × S/{clasificacion.precio_exportable}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground mb-1">Monto Industrial</p>
                        <p className="text-2xl font-bold text-blue-600">
                          S/ {montoIndustrial.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {clasificacion.peso_industrial} kg × S/{clasificacion.precio_industrial}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground mb-1">Monto Descarte</p>
                        <p className="text-2xl font-bold text-gray-600">
                          S/ {montoDescarte.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {clasificacion.peso_descarte} kg × S/{clasificacion.precio_descarte}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
                    <CardHeader>
                      <CardTitle className="text-lg">Monto Bruto</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-orange-600">S/ {montoBruto.toFixed(2)}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-red-50 border-red-200">
                    <CardHeader>
                      <CardTitle className="text-lg">Descuentos Aplicados</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Descuento Jabas:</span>
                        <span className="font-semibold">
                          -S/ {descuentos.descuento_jabas.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Descuento Flete (2%):</span>
                        <span className="font-semibold">
                          -S/ {descuentos.descuento_flete.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Descuento Recibo Egreso (1%):</span>
                        <span className="font-semibold">
                          -S/ {descuentos.descuento_recibo_egreso.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Descuento Cosecha (1.5%):</span>
                        <span className="font-semibold">
                          -S/ {descuentos.descuento_cosecha.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Descuento Procesamiento (3%):</span>
                        <span className="font-semibold">
                          -S/ {descuentos.descuento_procesamiento.toFixed(2)}
                        </span>
                      </div>
                      <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                        <span>Total Descuentos:</span>
                        <span className="text-red-600">
                          -S/ {descuentos.total_descuentos.toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-green-50 border-green-200">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Monto Neto (para Liquidación)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-bold text-green-600">
                        S/ {descuentos.monto_neto.toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>

                  <Alert className="bg-blue-50 border-blue-300">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      El kardex se actualizará automáticamente con: Exportable {clasificacion.peso_exportable} kg,
                      Industrial {clasificacion.peso_industrial} kg, Descarte {clasificacion.peso_descarte} kg
                    </AlertDescription>
                  </Alert>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <div className="flex gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false)
                setSelectedLote(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveClasificacion}
              disabled={!isValid || loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Clasificación
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
