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
import { Plus, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

import { useApi } from "@/lib/hooks/use-api"
import { pedidosService } from "@/lib/services/pedidos-service"
import { kardexAutomaticoService } from "@/lib/services/kardex-automatico-service"
import { libroBancoService } from "@/lib/services/libro-banco-service"
import { numeroService } from "@/lib/services/numero-service"
import type { Pedido } from "@/lib/types"

interface VentaData {
  pedido_id: number
  kg_vendido: number
  precio_unitario: number
}

export function VentasIntegrada() {
  const { data: pedidos, refresh } = useApi(pedidosService, { initialLoad: true })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null)
  const [loading, setLoading] = useState(false)
  const [numeroFactura, setNumeroFactura] = useState("")
  const [ventaData, setVentaData] = useState<VentaData>({
    pedido_id: 0,
    kg_vendido: 0,
    precio_unitario: 0,
  })

  const handleSelectPedido = async (pedido: Pedido) => {
    setSelectedPedido(pedido)
    setVentaData({
      pedido_id: pedido.id,
      kg_vendido: pedido.kg_neto || 0,
      precio_unitario: pedido.precio || 0,
    })

    // Generar número de factura
    const numero = await numeroService.generarNumeroFactura()
    setNumeroFactura(numero)

    setIsDialogOpen(true)
  }

  const montoTotal = ventaData.kg_vendido * ventaData.precio_unitario

  const handleGuardarVenta = async () => {
    if (!selectedPedido) return

    setLoading(true)
    try {
      const fecha = new Date().toISOString().split("T")[0]

      // 1. Registrar salida automática en kardex
      const lote_id = selectedPedido.lote_id || 1 // Obtener del pedido
      await kardexAutomaticoService.registrarSalidaAutomatica(
        lote_id,
        "exportable", // Asumir categoría exportable
        ventaData.kg_vendido,
        numeroFactura,
        fecha
      )

      // 2. Registrar venta automática en Libro Banco
      await libroBancoService.registrarVentaAutomatica(
        selectedPedido.cliente_nombre || "Cliente",
        montoTotal,
        numeroFactura,
        fecha
      )

      // 3. Actualizar estado del pedido
      await pedidosService.update(selectedPedido.id, {
        estado: "completado",
      })

      alert(
        `Venta registrada exitosamente!\nN° Factura: ${numeroFactura}\nKardex y Libro Banco actualizados automáticamente.`
      )

      setIsDialogOpen(false)
      setSelectedPedido(null)
      setNumeroFactura("")
      setVentaData({ pedido_id: 0, kg_vendido: 0, precio_unitario: 0 })

      await refresh()
    } catch (error) {
      console.error("[v0] Error registrando venta:", error)
      alert("Error al registrar la venta")
    } finally {
      setLoading(false)
    }
  }

  const pedidosPendientes = (pedidos as Pedido[]).filter(
    (p) => p.estado === "pendiente" || p.estado === "proceso"
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Ventas</h2>
          <p className="text-muted-foreground">
            Registro de ventas con kardex automático y libro banco
          </p>
        </div>
        <Button size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Nueva Venta
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos Pendientes</CardTitle>
          <CardDescription>{pedidosPendientes.length} pedidos listos para vender</CardDescription>
        </CardHeader>
        <CardContent>
          {pedidosPendientes.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No hay pedidos pendientes</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Kg Neto</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidosPendientes.map((pedido) => (
                  <TableRow key={pedido.id}>
                    <TableCell className="font-medium">{pedido.numero_pedido}</TableCell>
                    <TableCell>{pedido.cliente_nombre}</TableCell>
                    <TableCell>{pedido.producto}</TableCell>
                    <TableCell>{pedido.kg_neto} kg</TableCell>
                    <TableCell>S/ {pedido.precio?.toFixed(2) || "0.00"}</TableCell>
                    <TableCell className="text-green-600 font-semibold">
                      S/ {((pedido.kg_neto || 0) * (pedido.precio || 0)).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={pedido.estado === "pendiente" ? "default" : "secondary"}>
                        {pedido.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSelectPedido(pedido)}
                      >
                        Vender
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Registrar Venta - {selectedPedido?.numero_pedido}
            </DialogTitle>
          </DialogHeader>

          {selectedPedido && (
            <div className="space-y-6">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">N° Factura</p>
                      <p className="font-semibold text-lg">{numeroFactura}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cliente</p>
                      <p className="font-semibold">{selectedPedido.cliente_nombre}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha</p>
                      <p className="font-semibold">{new Date().toISOString().split("T")[0]}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <div>
                  <Label>Kg Disponible para Vender</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={ventaData.kg_vendido}
                    onChange={(e) =>
                      setVentaData({
                        ...ventaData,
                        kg_vendido: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div>
                  <Label>Precio Unitario (S/ kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={ventaData.precio_unitario}
                    onChange={(e) =>
                      setVentaData({
                        ...ventaData,
                        precio_unitario: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Kg Vendidos:</span>
                      <span className="font-semibold">{ventaData.kg_vendido} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Precio Unitario:</span>
                      <span className="font-semibold">S/ {ventaData.precio_unitario.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between text-lg font-bold">
                      <span>Monto Total:</span>
                      <span className="text-green-600">S/ {montoTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Alert className="bg-blue-50 border-blue-300">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Se registrará automáticamente: Kardex (salida {ventaData.kg_vendido} kg),
                  Factura #{numeroFactura}, Libro Banco (ingreso S/ {montoTotal.toFixed(2)})
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleGuardarVenta}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Registrar Venta
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
