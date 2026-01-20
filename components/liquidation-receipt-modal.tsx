"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Download, Printer, AlertCircle } from "lucide-react"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

interface ReceiptModalProps {
  open: boolean
  liquidacionId: string | null
  onOpenChange: (open: boolean) => void
}

interface LiquidacionData {
  id: string | number
  numero_liquidacion: string
  estado_pago?: "PENDIENTE" | "PAGADO" | "ANULADO"
  nombre_completo?: string
  productor_nombre?: string
  numero_lote?: string
  lote_codigo?: string
  fecha_liquidacion: string
  total_bruto_fruta: number
  costo_flete: number
  costo_cosecha: number
  costo_maquila: number
  total_adelantos: number
  total_a_pagar: number
  detalle_categorias?: Array<{
    nombre_categoria: string
    peso_ajustado: number
    precio_unitario: number
    subtotal: number
  }>
  [key: string]: any
}

export function LiquidationReceiptModal({ open, liquidacionId, onOpenChange }: ReceiptModalProps) {
  const [loading, setLoading] = useState(false)
  const [liquidacion, setLiquidacion] = useState<LiquidacionData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && liquidacionId) {
      fetchLiquidacion()
    }
  }, [open, liquidacionId])

  const fetchLiquidacion = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log("[v0] Modal: Fetching liquidation:", liquidacionId)
      const response = await fetch(`/api/liquidaciones/${liquidacionId}`)

      console.log("[v0] Modal: Response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[v0] Modal: Error data:", errorData)
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] Modal: Data received:", data)
      setLiquidacion(data)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error loading receipt"
      console.error("[v0] Modal: Error:", errorMsg)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    if (!liquidacion) return

    try {
      const element = document.getElementById("receipt-content")
      if (!element) return

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      })

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      const imgData = canvas.toDataURL("image/png")
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
      pdf.save(`Liquidacion-${liquidacion.numero_liquidacion}.pdf`)
    } catch (err) {
      console.error("Error generating PDF:", err)
    }
  }

  const estadoPago = liquidacion?.estado_pago || "PENDIENTE"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Comprobante de Liquidación</span>
            {liquidacion && (
              <Badge
                variant={estadoPago === "PAGADO" ? "default" : estadoPago === "ANULADO" ? "destructive" : "secondary"}
              >
                {estadoPago}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>{liquidacion?.numero_liquidacion}</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {liquidacion && !loading && (
          <>
            {estadoPago === "PENDIENTE" && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  ⚠️ Esta liquidación <strong>NO HA SIDO PAGADA</strong> aún. Registra el pago en "Registro Pago-campo"
                  para actualizar el estado.
                </AlertDescription>
              </Alert>
            )}

            {estadoPago === "PAGADO" && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">✓ Liquidación PAGADA correctamente</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 mb-4">
              <Button onClick={handlePrint} variant="outline" className="gap-2 bg-transparent">
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>
              <Button onClick={handleDownloadPDF} className="gap-2">
                <Download className="h-4 w-4" />
                Descargar PDF
              </Button>
            </div>

            {/* Receipt Content */}
            <div id="receipt-content" className="bg-white p-8 space-y-4 print:p-0 print:space-y-2 text-sm">
              {/* Header */}
              <div className="border-b-2 pb-4">
                <h1 className="text-2xl font-bold text-center">AGRONEGOCIOS SAYARIQ SAC</h1>
                <p className="text-center text-muted-foreground">Comprobante de Liquidación</p>
              </div>

              {/* Info Row 1 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="border p-3">
                  <p className="text-xs text-muted-foreground">Nro LIQUIDACION</p>
                  <p className="font-bold text-lg">{liquidacion.numero_liquidacion}</p>
                </div>
                <div className="border p-3">
                  <p className="text-xs text-muted-foreground">ESTADO</p>
                  <Badge className="mt-1">{estadoPago}</Badge>
                </div>
                <div className="border p-3">
                  <p className="text-xs text-muted-foreground">Fecha</p>
                  <p className="font-medium">{new Date(liquidacion.fecha_liquidacion).toLocaleDateString("es-PE")}</p>
                </div>
              </div>

              {/* Productor Info */}
              <div className="border p-4 bg-gray-50">
                <p className="text-xs text-muted-foreground mb-1">Señor (es):</p>
                <p className="font-bold text-lg">
                  {liquidacion.nombre_completo || liquidacion.productor_nombre || "No especificado"}
                </p>
                <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Lote:</p>
                    <p className="font-medium">
                      {liquidacion.numero_lote || liquidacion.lote_codigo || liquidacion.lote_id}
                    </p>
                  </div>
                </div>
              </div>

              {/* Categories Table */}
              {liquidacion.detalle_categorias && liquidacion.detalle_categorias.length > 0 && (
                <div>
                  <h3 className="font-bold mb-2">Detalle por Categorías</h3>
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow>
                        <TableHead>DESCRIPCIÓN</TableHead>
                        <TableHead className="text-right">CANTIDAD (kg)</TableHead>
                        <TableHead className="text-right">P. UNITARIO</TableHead>
                        <TableHead className="text-right">VALOR VENTA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {liquidacion.detalle_categorias.map((det, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{det.nombre_categoria}</TableCell>
                          <TableCell className="text-right">{Number(det.peso_ajustado).toFixed(2)}</TableCell>
                          <TableCell className="text-right">S/ {Number(det.precio_unitario).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">S/ {Number(det.subtotal).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Financial Summary */}
              <div className="border-t-2 pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Total Bruto Ventas:</span>
                  <span className="font-medium">S/ {Number(liquidacion.total_bruto_fruta).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>(-) Costo Flete:</span>
                  <span>S/ {Number(liquidacion.costo_flete).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>(-) Costo Cosecha:</span>
                  <span>S/ {Number(liquidacion.costo_cosecha).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>(-) Costo Maquila:</span>
                  <span>S/ {Number(liquidacion.costo_maquila).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-destructive">
                  <span>(-) Adelantos:</span>
                  <span>S/ {Number(liquidacion.total_adelantos).toFixed(2)}</span>
                </div>

                <div className="flex justify-between font-bold text-lg bg-green-50 p-3 rounded">
                  <span>NETO A PAGAR:</span>
                  <span className="text-green-600">S/ {Number(liquidacion.total_a_pagar).toFixed(2)}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t-2 pt-4 text-center text-xs text-muted-foreground">
                <p>SAYARIQ</p>
                <p>Comprobante generado automáticamente</p>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
