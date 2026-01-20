"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Plus, CreditCard, DollarSign, AlertCircle, CheckCircle } from 'lucide-react'
import { usePersonas } from "@/lib/hooks/use-personas"
import { useApi } from "@/lib/hooks/use-api"
import type { Persona } from "@/lib/types"

export function PagosProductores() {
  const { data: personas } = usePersonas()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedProductor, setSelectedProductor] = useState<Persona | null>(null)
  const [pagos, setPagos] = useState<any[]>([])
  const [formData, setFormData] = useState({
    monto: 0,
    metodoPago: "transferencia",
    referencia: "",
    observaciones: "",
  })

  const productoresConDeuda = (personas as Persona[]).filter((p) => p.tipo === "productor" || p.roles?.includes("productor"))

  const saldoPendiente = useMemo(() => {
    if (!selectedProductor) return 0
    // This would come from database in real scenario
    return Math.random() * 10000
  }, [selectedProductor])

  const handleRegistrarPago = async () => {
    if (!selectedProductor || formData.monto <= 0) return

    if (formData.monto > saldoPendiente) {
      alert("El monto del pago no puede exceder el saldo pendiente")
      return
    }

    try {
      const nuevoPago = {
        id: Date.now(),
        productor_id: selectedProductor.id,
        productor_nombre: selectedProductor.nombre_completo,
        monto: formData.monto,
        fecha: new Date().toISOString().split("T")[0],
        metodo: formData.metodoPago,
        referencia: formData.referencia,
        estado: "realizado",
      }

      setPagos([...pagos, nuevoPago])

      // Reset form
      setFormData({ monto: 0, metodoPago: "transferencia", referencia: "", observaciones: "" })
      setIsDialogOpen(false)
      setSelectedProductor(null)
    } catch (error) {
      console.error("Error al registrar pago:", error)
    }
  }

  const estadoSaldo = saldoPendiente > 0 ? "pendiente" : "cancelado"

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pagos a Productores</h2>
          <p className="text-muted-foreground">Registre y controle los pagos realizados</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Registrar Pago
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Productores</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{productoresConDeuda.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pagos Realizados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pagos.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Pagado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">S/ {pagos.reduce((sum, p) => sum + p.monto, 0).toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Registrar Pago a Productor
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Productor *</Label>
              <Select
                value={selectedProductor?.id.toString() || ""}
                onValueChange={(id) => {
                  const prod = productoresConDeuda.find((p) => p.id.toString() === id)
                  setSelectedProductor(prod || null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar productor" />
                </SelectTrigger>
                <SelectContent>
                  {productoresConDeuda.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.nombre_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProductor && (
              <>
                {saldoPendiente > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Saldo Pendiente</AlertTitle>
                    <AlertDescription>S/ {saldoPendiente.toFixed(2)}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label>Monto a Pagar (S/) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.monto || ""}
                    onChange={(e) => setFormData({ ...formData, monto: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Método de Pago *</Label>
                  <Select value={formData.metodoPago} onValueChange={(v) => setFormData({ ...formData, metodoPago: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transferencia">Transferencia Bancaria</SelectItem>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Referencia (Nro. Comprobante)</Label>
                  <Input
                    value={formData.referencia}
                    onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Observaciones</Label>
                  <Textarea
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button onClick={handleRegistrarPago} className="flex-1">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Registrar Pago
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
          <CardDescription>{pagos.length} pagos registrados</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Productor</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                    No hay pagos registrados
                  </TableCell>
                </TableRow>
              ) : (
                pagos.map((pago) => (
                  <TableRow key={pago.id}>
                    <TableCell className="font-medium">{pago.productor_nombre}</TableCell>
                    <TableCell>{pago.fecha}</TableCell>
                    <TableCell className="font-semibold">S/ {pago.monto.toFixed(2)}</TableCell>
                    <TableCell>{pago.metodo}</TableCell>
                    <TableCell>
                      <Badge className="bg-green-600">{pago.estado}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
