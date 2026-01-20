"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Calculator, Package, Save } from 'lucide-react'
import { useApi } from "@/lib/hooks/use-api"
import { lotesService } from "@/lib/services/lotes-service"
import { kardexService } from "@/lib/services/kardex-service"
import type { Lote } from "@/lib/types"

interface ClasificacionData {
  exportable: number
  industrial: number
  descarte: number
}

export function ClasificacionProductos() {
  const { data: lotes } = useApi(lotesService, { initialLoad: true })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null)
  const [clasificacion, setClasificacion] = useState<ClasificacionData>({
    exportable: 0,
    industrial: 0,
    descarte: 0,
  })

  const totalClasificado = clasificacion.exportable + clasificacion.industrial + clasificacion.descarte
  const isValid = selectedLote && totalClasificado <= selectedLote.peso_bruto

  const handleInputChange = (key: keyof ClasificacionData, value: number) => {
    setClasificacion((prev) => ({ ...prev, [key]: value }))
  }

  const handleSaveClasificacion = async () => {
    if (!selectedLote || !isValid) return

    try {
      await kardexService.registrarMovimiento({
        lote_id: selectedLote.id,
        tipo: "ajuste",
        cantidad: totalClasificado,
        fecha: new Date().toISOString().split("T")[0],
        concepto: `Clasificación: Exp ${clasificacion.exportable}kg, Ind ${clasificacion.industrial}kg, Desc ${clasificacion.descarte}kg`,
      })

      await lotesService.update(selectedLote.id, {
        estado: "proceso",
      })

      setIsDialogOpen(false)
      setSelectedLote(null)
      setClasificacion({ exportable: 0, industrial: 0, descarte: 0 })
    } catch (error) {
      console.error("Error al guardar clasificación:", error)
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
          <p className="text-muted-foreground">Clasifique los productos por categoría</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Nueva Clasificación
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lotes Disponibles para Clasificar</CardTitle>
          <CardDescription>{lotesParaClasificar.length} lotes pendientes</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Productor</TableHead>
                <TableHead>Peso Bruto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lotesParaClasificar.map((lote) => (
                <TableRow key={lote.id}>
                  <TableCell className="font-medium">{lote.codigo}</TableCell>
                  <TableCell>{lote.productor_nombre || "N/A"}</TableCell>
                  <TableCell>{lote.peso_bruto} kg</TableCell>
                  <TableCell>
                    <Badge variant={lote.estado === "pendiente" ? "default" : "secondary"}>{lote.estado}</Badge>
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
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Clasificar Lote
            </DialogTitle>
          </DialogHeader>

          {selectedLote && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Código Lote</p>
                <p className="font-semibold">{selectedLote.codigo}</p>
                <p className="text-sm text-muted-foreground mt-2">Peso Bruto Total</p>
                <p className="font-semibold">{selectedLote.peso_bruto} kg</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Exportable (kg) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={clasificacion.exportable}
                    onChange={(e) => handleInputChange("exportable", Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Industrial (kg) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={clasificacion.industrial}
                    onChange={(e) => handleInputChange("industrial", Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Descarte (kg) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={clasificacion.descarte}
                    onChange={(e) => handleInputChange("descarte", Number(e.target.value))}
                  />
                </div>
              </div>

              <Card className="bg-gray-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-muted-foreground">Total Clasificado:</span>
                    <span className="font-semibold">{totalClasificado.toFixed(2)} kg</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Diferencia:</span>
                    <span className={`font-semibold ${totalClasificado <= selectedLote.peso_bruto ? "text-green-600" : "text-red-600"}`}>
                      {(selectedLote.peso_bruto - totalClasificado).toFixed(2)} kg
                    </span>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
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
                  disabled={!isValid}
                  className="flex-1"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Clasificación
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
