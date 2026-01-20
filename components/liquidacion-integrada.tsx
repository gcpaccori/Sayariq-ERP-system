"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Calculator, DollarSign, AlertCircle } from 'lucide-react'
import { usePersonas } from "@/lib/hooks/use-personas"
import { useApi } from "@/lib/hooks/use-api"
import { lotesService } from "@/lib/services/lotes-service"
import { liquidacionesService } from "@/lib/services/liquidaciones-service"
import { adelantosService } from "@/lib/services/adelantos-service"
import type { Lote, Persona } from "@/lib/types"

export function LiquidacionIntegrada() {
  const { data: personas } = usePersonas()
  const { data: lotes } = useApi(lotesService, { initialLoad: true })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedProductor, setSelectedProductor] = useState<Persona | null>(null)
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null)
  const [precioUnitario, setPrecioUnitario] = useState(0)
  const [otrosDescuentos, setOtrosDescuentos] = useState(0)
  const [adelantosPendientes, setAdelantosPendientes] = useState<any[]>([])

  const handleSelectProductor = async (productor: Persona) => {
    setSelectedProductor(productor)
    setSelectedLote(null)

    const adelantos = await adelantosService.obtenerAdelantosPendientes(productor.id)
    setAdelantosPendientes(adelantos)
  }

  const lotesDelProductor = useMemo(() => {
    if (!selectedProductor) return []
    return (lotes as Lote[]).filter(
      (l) => l.productor_id === selectedProductor.id && (l.estado === "proceso" || l.estado === "completado")
    )
  }, [selectedProductor, lotes])

  const handleGenerateLiquidacion = async () => {
    if (!selectedLote || !selectedProductor || !precioUnitario) return

    try {
      const valorBruto = selectedLote.peso_neto * precioUnitario
      const resultado = await liquidacionesService.criarLiquidacion({
        lote_id: selectedLote.id,
        lote_codigo: selectedLote.codigo,
        productor_id: selectedProductor.id,
        productor_nombre: selectedProductor.nombre_completo || "",
        valor_bruto: valorBruto,
        otros_descuentos: otrosDescuentos,
      })

      // Close dialog and reset
      setIsDialogOpen(false)
      setSelectedProductor(null)
      setSelectedLote(null)
      setPrecioUnitario(0)
      setOtrosDescuentos(0)
    } catch (error) {
      console.error("Error generando liquidación:", error)
    }
  }

  const productoresConLotes = (personas as Persona[]).filter((p) =>
    (lotes as Lote[]).some((l) => l.productor_id === p.id)
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Liquidación de Lotes</h2>
          <p className="text-muted-foreground">Calcule y genere liquidaciones con descuentos automáticos</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Nueva Liquidación
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Generar Liquidación
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Productor *</Label>
              <Select
                value={selectedProductor?.id.toString() || ""}
                onValueChange={(id) => {
                  const prod = productoresConLotes.find((p) => p.id.toString() === id)
                  if (prod) handleSelectProductor(prod)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar productor" />
                </SelectTrigger>
                <SelectContent>
                  {productoresConLotes.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.nombre_completo} - {p.documento_identidad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {adelantosPendientes.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Este productor tiene {adelantosPendientes.length} adelanto(s) pendiente(s) que será(n) descontado(s)
                  automáticamente
                </AlertDescription>
              </Alert>
            )}

            {selectedProductor && (
              <>
                <div className="space-y-2">
                  <Label>Lote a Liquidar *</Label>
                  <Select
                    value={selectedLote?.id.toString() || ""}
                    onValueChange={(id) => {
                      const lote = lotesDelProductor.find((l) => l.id.toString() === id)
                      setSelectedLote(lote || null)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar lote" />
                    </SelectTrigger>
                    <SelectContent>
                      {lotesDelProductor.map((lote) => (
                        <SelectItem key={lote.id} value={lote.id.toString()}>
                          {lote.codigo} - {lote.peso_neto} kg
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedLote && (
                  <>
                    <Card className="bg-blue-50">
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Peso Neto:</span>
                            <span className="font-semibold">{selectedLote.peso_neto} kg</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Precio Unitario:</span>
                            <span className="font-semibold">S/ {precioUnitario.toFixed(2)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-2">
                      <Label>Precio por Kg (S/) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={precioUnitario}
                        onChange={(e) => setPrecioUnitario(Number(e.target.value))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Otros Descuentos (S/)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={otrosDescuentos}
                        onChange={(e) => setOtrosDescuentos(Number(e.target.value))}
                      />
                    </div>

                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="pt-6">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between font-semibold">
                            <span>Valor Bruto:</span>
                            <span>S/ {(selectedLote.peso_neto * precioUnitario).toFixed(2)}</span>
                          </div>
                          {adelantosPendientes.length > 0 && (
                            <div className="flex justify-between text-red-600">
                              <span>Descuento Adelantos:</span>
                              <span>
                                S/ {adelantosPendientes.reduce((sum, a) => sum + a.saldo_pendiente, 0).toFixed(2)}
                              </span>
                            </div>
                          )}
                          {otrosDescuentos > 0 && (
                            <div className="flex justify-between text-red-600">
                              <span>Otros Descuentos:</span>
                              <span>S/ {otrosDescuentos.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="border-t border-green-200 pt-2 flex justify-between font-bold text-lg">
                            <span>Valor Neto:</span>
                            <span>
                              S/{" "}
                              {(
                                selectedLote.peso_neto * precioUnitario -
                                adelantosPendientes.reduce((sum, a) => sum + a.saldo_pendiente, 0) -
                                otrosDescuentos
                              ).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Button onClick={handleGenerateLiquidacion} className="w-full">
                      <DollarSign className="mr-2 h-4 w-4" />
                      Generar Liquidación
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
