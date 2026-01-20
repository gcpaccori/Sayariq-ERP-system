"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Search, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { useApi } from "@/lib/hooks/use-api"
import { liquidacionesService, type Liquidacion } from "@/lib/services/liquidaciones-service"
import { pagoCampoService } from "@/lib/services/pago-campo-service"
import { personasService } from "@/lib/services/personas-service"
import type { Persona } from "@/lib/types"

interface LiquidacionConDetalles extends Liquidacion {
  productor_nombre?: string
}

export function RegistroPagoCampo() {
  const { toast } = useToast()
  const [busqueda, setBusqueda] = useState("")
  const [selectedLiquidacion, setSelectedLiquidacion] = useState<LiquidacionConDetalles | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formPago, setFormPago] = useState({
    fechaPago: new Date().toISOString().split("T")[0],
    monto: "",
    datosBancarios: "",
    observaciones: "",
  })
  const [registrando, setRegistrando] = useState(false)

  const {
    data: liquidaciones,
    loading: loadingLiquidaciones,
    refresh: refreshLiquidaciones,
  } = useApi(liquidacionesService, { initialLoad: true })
  const { data: personas } = useApi(personasService, { initialLoad: true })

  const liquidacionesConDetalles: LiquidacionConDetalles[] = (liquidaciones as Liquidacion[]).map((liq) => {
    const productor = (personas as Persona[]).find((p) => p.id === liq.productor_id)
    return {
      ...liq,
      productor_nombre: productor
        ? `${productor.nombres} ${productor.apellidos}`
        : liq.productor_nombre || "Desconocido",
    }
  })

  // Filtrar liquidaciones pendientes
  const liquidacionesPendientes = liquidacionesConDetalles.filter((l) => l.estado === "pendiente")

  const liquidacionesFiltradas = liquidacionesPendientes.filter(
    (liq) =>
      liq.id.toString().includes(busqueda) ||
      liq.productor_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      liq.lote_codigo?.includes(busqueda),
  )

  const getEstadoBadge = (estado: string) => {
    const variants = {
      pendiente: "secondary",
      cancelado: "default",
      deficit: "destructive",
    }
    return <Badge variant={variants[estado as keyof typeof variants] as any}>{estado.toUpperCase()}</Badge>
  }

  const handleRegistrarPago = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedLiquidacion) return

    const monto = Number.parseFloat(formPago.monto)
    if (isNaN(monto) || monto <= 0) {
      toast({
        title: "Error",
        description: "Ingresa un monto válido",
        variant: "destructive",
      })
      return
    }

    if (monto > (selectedLiquidacion.valor_neto || 0)) {
      toast({
        title: "Error",
        description: `El monto no puede exceder S/ ${(selectedLiquidacion.valor_neto || 0).toFixed(2)}`,
        variant: "destructive",
      })
      return
    }

    setRegistrando(true)
    try {
      const nuevoPago: any = {
        lote_id: selectedLiquidacion.lote_id,
        lote_codigo: selectedLiquidacion.lote_codigo,
        productor_id: selectedLiquidacion.productor_id,
        productor_nombre: selectedLiquidacion.productor_nombre,
        monto,
        fecha_pago: formPago.fechaPago,
        metodo_pago: "transferencia",
        referencia: formPago.datosBancarios,
        observaciones: formPago.observaciones,
      }

      await pagoCampoService.create(nuevoPago)

      try {
        await fetch(`/api/liquidaciones/${selectedLiquidacion.id}/update-payment-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estado_pago: "PAGADO" }),
        })
      } catch (updateError) {
        console.error("Warning: could not update payment status:", updateError)
      }

      toast({
        title: "Éxito",
        description: `Pago de S/ ${monto.toFixed(2)} registrado correctamente`,
      })

      setIsDialogOpen(false)
      setSelectedLiquidacion(null)
      setFormPago({
        fechaPago: new Date().toISOString().split("T")[0],
        monto: "",
        datosBancarios: "",
        observaciones: "",
      })

      refreshLiquidaciones()
    } catch (error) {
      console.error("Error al registrar pago:", error)
      toast({
        title: "Error",
        description: "No se pudo registrar el pago",
        variant: "destructive",
      })
    } finally {
      setRegistrando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Registro Pago-campo</h2>
          <p className="text-muted-foreground">Gestión de pagos a productores por lotes liquidados</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Liquidaciones Pendientes de Pago</CardTitle>
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por ID, lote o productor..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingLiquidaciones ? (
            <div className="text-center py-8">
              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
              Cargando liquidaciones...
            </div>
          ) : liquidacionesFiltradas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {liquidacionesPendientes.length === 0
                ? "No hay liquidaciones pendientes"
                : "No se encontraron resultados"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Productor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Total Liquidación</TableHead>
                  <TableHead className="text-right">Descuentos</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liquidacionesFiltradas.map((liq) => (
                  <TableRow key={liq.id}>
                    <TableCell className="font-medium">{liq.id}</TableCell>
                    <TableCell>{liq.numero_liquidacion}</TableCell>
                    <TableCell>{liq.lote_codigo}</TableCell>
                    <TableCell>{liq.productor_nombre}</TableCell>
                    <TableCell>{liq.fecha_liquidacion}</TableCell>
                    <TableCell className="text-right font-medium">S/. {(liq.valor_bruto || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">S/. {(liq.descuentos_adelantos || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      S/. {(liq.valor_neto || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>{getEstadoBadge(liq.estado)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedLiquidacion(liq)
                          setIsDialogOpen(true)
                        }}
                      >
                        Pagar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para registrar pago */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>REGISTRO DE PAGO</DialogTitle>
          </DialogHeader>
          {selectedLiquidacion && (
            <form onSubmit={handleRegistrarPago} className="space-y-6">
              <Card className="bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg">Información de la Liquidación</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">PRODUCTOR</Label>
                      <div className="font-medium">{selectedLiquidacion.productor_nombre}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">LOTE</Label>
                      <div className="font-medium">{selectedLiquidacion.lote_codigo}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <Label className="text-sm text-muted-foreground">VALOR BRUTO</Label>
                    <div className="text-2xl font-bold text-green-600">
                      S/. {(selectedLiquidacion.valor_bruto || 0).toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <Label className="text-sm text-muted-foreground">DESCUENTOS</Label>
                    <div className="text-2xl font-bold">
                      S/. {(selectedLiquidacion.descuentos_adelantos || 0).toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>FECHA DE PAGO *</Label>
                  <Input
                    type="date"
                    value={formPago.fechaPago}
                    onChange={(e) => setFormPago({ ...formPago, fechaPago: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label>MONTO A PAGAR (máx. S/. {(selectedLiquidacion.valor_neto || 0).toFixed(2)}) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formPago.monto}
                    onChange={(e) => setFormPago({ ...formPago, monto: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label>DATOS BANCARIOS</Label>
                  <Input
                    placeholder="Número de transferencia, cheque, etc."
                    value={formPago.datosBancarios}
                    onChange={(e) => setFormPago({ ...formPago, datosBancarios: e.target.value })}
                  />
                </div>

                <div>
                  <Label>OBSERVACIONES</Label>
                  <Textarea
                    placeholder="Observaciones adicionales..."
                    value={formPago.observaciones}
                    onChange={(e) => setFormPago({ ...formPago, observaciones: e.target.value })}
                    rows={3}
                  />
                </div>

                <Card className="bg-green-50">
                  <CardContent className="pt-6">
                    <Label className="text-sm text-muted-foreground">VALOR NETO</Label>
                    <div className="text-xl font-bold text-green-600">
                      S/. {(selectedLiquidacion.valor_neto || 0).toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={registrando}>
                  {registrando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrar Pago
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
