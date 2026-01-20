"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Plus, FileText, AlertTriangle, TrendingDown } from 'lucide-react'
import { useApi } from "@/lib/hooks/use-api"
import { lotesService } from "@/lib/services/lotes-service"
import { kardexService } from "@/lib/services/kardex-service"
import type { Lote, MovimientoKardex } from "@/lib/types"

export function FacturacionIntegrada() {
  const { data: lotes } = useApi(lotesService, { initialLoad: true })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null)
  const [movimientos, setMovimientos] = useState<MovimientoKardex[]>([])
  const [diferencias, setDiferencias] = useState<any[]>([])
  const [formData, setFormData] = useState({
    cantidad: 0,
    cliente: "",
    precioVenta: 0,
  })

  const lotesDisponibles = (lotes as Lote[]).filter((l) => l.estado === "completado" || l.estado === "liquidado")

  const handleSelectLote = async (lote: Lote) => {
    setSelectedLote(lote)
    try {
      const movs = await kardexService.obtenerMovimientosLote(lote.id)
      setMovimientos(movs)

      const entradas = movs.filter((m) => m.tipo === "entrada").reduce((sum, m) => sum + m.cantidad, 0)
      const salidas = movs.filter((m) => m.tipo === "salida").reduce((sum, m) => sum + m.cantidad, 0)
      const diferencia = lote.peso_bruto - (entradas - salidas)

      if (Math.abs(diferencia) > 0.01) {
        setDiferencias([{ lote_id: lote.id, diferencia, tipo: diferencia > 0 ? "falta" : "exceso" }])
      }
    } catch (error) {
      console.error("Error cargando movimientos:", error)
    }
  }

  const handleGenerarFactura = () => {
    if (!selectedLote || formData.cantidad <= 0) return

    const ultimoSaldo = movimientos.length > 0 ? movimientos[0].saldo : 0
    if (formData.cantidad > ultimoSaldo) {
      alert(`Cantidad solicitada (${formData.cantidad} kg) excede saldo disponible (${ultimoSaldo} kg)`)
      return
    }

    // Aquí se generaría la factura real conectada a la BD
    console.log("Factura generada:", {
      lote: selectedLote.codigo,
      cliente: formData.cliente,
      cantidad: formData.cantidad,
      total: formData.cantidad * formData.precioVenta,
    })

    setIsDialogOpen(false)
    setSelectedLote(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Facturación y Ventas</h2>
          <p className="text-muted-foreground">Gestione facturas y controle diferencias de inventario</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Nueva Factura
        </Button>
      </div>

      {diferencias.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Diferencias Detectadas</AlertTitle>
          <AlertDescription>
            Se detectaron {diferencias.length} diferencia(s) de inventario que requieren atención
          </AlertDescription>
        </Alert>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generar Factura
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Lote *</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
                {lotesDisponibles.map((lote) => (
                  <button
                    key={lote.id}
                    onClick={() => handleSelectLote(lote)}
                    className={`w-full text-left p-3 rounded border-2 transition ${
                      selectedLote?.id === lote.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <p className="font-medium">{lote.codigo}</p>
                    <p className="text-sm text-gray-600">{lote.peso_bruto} kg | Productor: {lote.productor_nombre}</p>
                  </button>
                ))}
              </div>
            </div>

            {selectedLote && (
              <>
                <Card className="bg-blue-50">
                  <CardContent className="pt-6">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Peso Inicial:</span>
                        <span className="font-semibold">{selectedLote.peso_bruto} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Saldo Disponible:</span>
                        <span className="font-semibold">
                          {movimientos.length > 0 ? movimientos[0].saldo : selectedLote.peso_bruto} kg
                        </span>
                      </div>
                      {diferencias.length > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Diferencia Detectada:</span>
                          <span className="font-semibold">{diferencias[0].diferencia.toFixed(2)} kg</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Input
                    value={formData.cliente}
                    onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cantidad a Vender (kg) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.cantidad || ""}
                    onChange={(e) => setFormData({ ...formData, cantidad: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Precio por Kg (S/) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.precioVenta || ""}
                    onChange={(e) => setFormData({ ...formData, precioVenta: Number(e.target.value) })}
                  />
                </div>

                <Card className="bg-green-50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Factura:</span>
                      <span>S/ {(formData.cantidad * formData.precioVenta).toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Button onClick={handleGenerarFactura} className="w-full">
                  <FileText className="mr-2 h-4 w-4" />
                  Generar Factura
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {diferencias.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <TrendingDown className="h-5 w-5" />
              Diferencias de Inventario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote</TableHead>
                  <TableHead>Diferencia (kg)</TableHead>
                  <TableHead>Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {diferencias.map((diff) => (
                  <TableRow key={diff.lote_id}>
                    <TableCell>{selectedLote?.codigo}</TableCell>
                    <TableCell className="font-semibold">{diff.diferencia.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={diff.tipo === "falta" ? "destructive" : "secondary"}>
                        {diff.tipo === "falta" ? "Falta Material" : "Exceso Material"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
