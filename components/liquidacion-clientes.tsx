"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, DollarSign, FileText, CheckCircle, Clock, Trash2, Eye, Download } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { 
  liquidacionClientesService,
  type LiquidacionCliente,
  type PedidoPendiente,
  type DetalleCategoriaCliente,
  type NuevaLiquidacionCliente 
} from "@/lib/services/liquidaciones-clientes-service"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export function LiquidacionClientes() {
  const { toast } = useToast()
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionCliente[]>([])
  const [pendientes, setPendientes] = useState<PedidoPendiente[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [selectedLiquidacion, setSelectedLiquidacion] = useState<LiquidacionCliente | null>(null)
  
  // Formulario
  const [clienteId, setClienteId] = useState<number | null>(null)
  const [pedidoId, setPedidoId] = useState<number | null>(null)
  const [categorias, setCategorias] = useState<any[]>([])
  const [detalles, setDetalles] = useState<DetalleCategoriaCliente[]>([])
  const [observaciones, setObservaciones] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [liqData, pendData] = await Promise.all([
        liquidacionClientesService.getAll(),
        liquidacionClientesService.getPendientes()
      ])
      setLiquidaciones(liqData)
      setPendientes(pendData)
    } catch (error) {
      console.error("Error cargando datos:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPedido = async (pedido: PedidoPendiente) => {
    try {
      const datos = await liquidacionClientesService.getDatosCliente(pedido.cliente_id)
      if (datos) {
        setClienteId(pedido.cliente_id)
        setPedidoId(pedido.pedido_id)
        setCategorias(datos.categorias)
        // Inicializar detalles con todas las categorías
        setDetalles(datos.categorias.map(cat => ({
          categoria_id: cat.id,
          categoria_nombre: cat.nombre,
          peso_ajustado: 0,
          precio_unitario: cat.precio_kg,
          subtotal: 0
        })))
        setIsDialogOpen(true)
      }
    } catch (error) {
      console.error("Error cargando datos del cliente:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del cliente",
        variant: "destructive"
      })
    }
  }

  const handleDetalleChange = (index: number, field: keyof DetalleCategoriaCliente, value: number) => {
    const newDetalles = [...detalles]
    newDetalles[index] = {
      ...newDetalles[index],
      [field]: value
    }
    
    // Recalcular subtotal
    if (field === 'peso_ajustado' || field === 'precio_unitario') {
      newDetalles[index].subtotal = newDetalles[index].peso_ajustado * newDetalles[index].precio_unitario
    }
    
    setDetalles(newDetalles)
  }

  const calcularTotal = () => {
    return detalles.reduce((sum, det) => sum + det.subtotal, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!clienteId || !pedidoId) {
      toast({
        title: "Error",
        description: "Debe seleccionar un cliente y pedido",
        variant: "destructive"
      })
      return
    }

    // Filtrar solo detalles con peso > 0
    const detallesFiltrados = detalles.filter(det => det.peso_ajustado > 0)

    if (detallesFiltrados.length === 0) {
      toast({
        title: "Error",
        description: "Debe ingresar al menos un peso de categoría",
        variant: "destructive"
      })
      return
    }

    const liquidacion: NuevaLiquidacionCliente = {
      cliente_id: clienteId,
      pedido_id: pedidoId,
      detalles_categorias: detallesFiltrados,
      monto_total: calcularTotal(),
      observaciones: observaciones || undefined
    }

    try {
      const result = await liquidacionClientesService.create(liquidacion)
      
      if (result) {
        toast({
          title: "Éxito",
          description: `Liquidación ${result.numero_liquidacion} creada correctamente`
        })
        setIsDialogOpen(false)
        resetForm()
        loadData()
      }
    } catch (error) {
      console.error("Error creando liquidación:", error)
      toast({
        title: "Error",
        description: "No se pudo crear la liquidación",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setClienteId(null)
    setPedidoId(null)
    setCategorias([])
    setDetalles([])
    setObservaciones("")
  }

  const handleVerDetalle = async (liquidacion: LiquidacionCliente) => {
    try {
      const detalle = await liquidacionClientesService.getById(liquidacion.id)
      if (detalle) {
        setSelectedLiquidacion(detalle)
        setIsDetailDialogOpen(true)
      }
    } catch (error) {
      console.error("Error cargando detalle:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar el detalle",
        variant: "destructive"
      })
    }
  }

  const handleMarcarCobrado = async (id: number) => {
    try {
      const success = await liquidacionClientesService.marcarComoCobrado(id)
      if (success) {
        toast({
          title: "Éxito",
          description: "Liquidación marcada como cobrada"
        })
        loadData()
        setIsDetailDialogOpen(false)
      }
    } catch (error) {
      console.error("Error marcando como cobrado:", error)
      toast({
        title: "Error",
        description: "No se pudo marcar como cobrado",
        variant: "destructive"
      })
    }
  }

  const handleGenerarBoleta = async (id: number) => {
    try {
      const boleta = await liquidacionClientesService.generarBoleta(id)
      if (boleta) {
        // Aquí podrías abrir un modal con el PDF o descargar
        toast({
          title: "Éxito",
          description: "Boleta generada correctamente"
        })
      }
    } catch (error) {
      console.error("Error generando boleta:", error)
      toast({
        title: "Error",
        description: "No se pudo generar la boleta",
        variant: "destructive"
      })
    }
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "pendiente_cobro":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente Cobro
          </Badge>
        )
      case "cobrado_parcial":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            Cobrado Parcial
          </Badge>
        )
      case "cobrado_total":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Cobrado
          </Badge>
        )
      default:
        return <Badge variant="secondary">{estado}</Badge>
    }
  }

  // Calcular estadísticas
  const stats = {
    total: liquidaciones.length,
    pendientes: liquidaciones.filter(l => l.estado_pago === "pendiente_cobro").length,
    cobradas: liquidaciones.filter(l => l.estado_pago === "cobrado_total").length,
    montoTotal: liquidaciones.reduce((sum, l) => sum + l.total_a_pagar, 0),
    montoPendiente: liquidaciones
      .filter(l => l.estado_pago === "pendiente_cobro")
      .reduce((sum, l) => sum + l.total_a_pagar, 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Cargando liquidaciones...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Liquidaciones</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              S/ {stats.montoTotal.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendientes de Cobro</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{stats.pendientes}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              S/ {stats.montoPendiente.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cobradas</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.cobradas}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? ((stats.cobradas / stats.total) * 100).toFixed(1) : 0}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pedidos Pendientes</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{pendientes.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Por liquidar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pedidos Pendientes */}
      {pendientes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pedidos Pendientes de Liquidación</CardTitle>
            <CardDescription>
              Clientes con pedidos listos para liquidar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Fecha Pedido</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Lotes</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendientes.map((pedido) => (
                  <TableRow key={pedido.pedido_id}>
                    <TableCell className="font-medium">{pedido.cliente_nombre}</TableCell>
                    <TableCell>{pedido.numero_pedido}</TableCell>
                    <TableCell>
                      {format(new Date(pedido.fecha_pedido), "dd MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{pedido.estado}</Badge>
                    </TableCell>
                    <TableCell>{pedido.cantidad_lotes}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleSelectPedido(pedido)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Liquidar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Liquidaciones Existentes */}
      <Card>
        <CardHeader>
          <CardTitle>Liquidaciones de Clientes</CardTitle>
          <CardDescription>
            Historial de liquidaciones de ventas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Monto Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {liquidaciones.map((liquidacion) => (
                <TableRow key={liquidacion.id}>
                  <TableCell className="font-medium">{liquidacion.numero_liquidacion}</TableCell>
                  <TableCell>{liquidacion.cliente_nombre}</TableCell>
                  <TableCell>{liquidacion.numero_pedido || "-"}</TableCell>
                  <TableCell>
                    {format(new Date(liquidacion.fecha_liquidacion), "dd MMM yyyy", { locale: es })}
                  </TableCell>
                  <TableCell>S/ {liquidacion.total_a_pagar.toFixed(2)}</TableCell>
                  <TableCell>{getEstadoBadge(liquidacion.estado_pago)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVerDetalle(liquidacion)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerarBoleta(liquidacion.id)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog: Nueva Liquidación */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Liquidación de Cliente</DialogTitle>
            <DialogDescription>
              Registre los detalles de la liquidación de venta
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cliente ID</Label>
                <Input value={clienteId || ""} disabled />
              </div>
              <div>
                <Label>Pedido ID</Label>
                <Input value={pedidoId || ""} disabled />
              </div>
            </div>

            <div>
              <Label>Detalles por Categoría</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Peso (kg)</TableHead>
                    <TableHead>Precio Unit. (S/)</TableHead>
                    <TableHead>Subtotal (S/)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detalles.map((detalle, index) => (
                    <TableRow key={index}>
                      <TableCell>{detalle.categoria_nombre}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={detalle.peso_ajustado}
                          onChange={(e) => handleDetalleChange(index, 'peso_ajustado', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={detalle.precio_unitario}
                          onChange={(e) => handleDetalleChange(index, 'precio_unitario', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {detalle.subtotal.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-2xl font-bold text-primary">
                  S/ {calcularTotal().toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Observaciones adicionales..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                <FileText className="w-4 h-4 mr-2" />
                Crear Liquidación
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalle Liquidación */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalle de Liquidación</DialogTitle>
            <DialogDescription>
              {selectedLiquidacion?.numero_liquidacion}
            </DialogDescription>
          </DialogHeader>

          {selectedLiquidacion && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cliente</Label>
                  <p className="text-sm">{selectedLiquidacion.cliente_nombre}</p>
                </div>
                <div>
                  <Label>Fecha</Label>
                  <p className="text-sm">
                    {format(new Date(selectedLiquidacion.fecha_liquidacion), "dd MMM yyyy HH:mm", { locale: es })}
                  </p>
                </div>
                <div>
                  <Label>Estado</Label>
                  <div>{getEstadoBadge(selectedLiquidacion.estado_pago)}</div>
                </div>
                <div>
                  <Label>Monto Total</Label>
                  <p className="text-lg font-semibold">S/ {selectedLiquidacion.total_a_pagar.toFixed(2)}</p>
                </div>
              </div>

              <div>
                <Label>Detalles por Categoría</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Peso (kg)</TableHead>
                      <TableHead>Precio Unit.</TableHead>
                      <TableHead>Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedLiquidacion.detalle_categorias?.map((detalle, index) => (
                      <TableRow key={index}>
                        <TableCell>{detalle.categoria_nombre}</TableCell>
                        <TableCell>{detalle.peso_ajustado.toFixed(2)}</TableCell>
                        <TableCell>S/ {detalle.precio_unitario.toFixed(2)}</TableCell>
                        <TableCell>S/ {detalle.subtotal.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selectedLiquidacion.observaciones && (
                <div>
                  <Label>Observaciones</Label>
                  <p className="text-sm text-muted-foreground">{selectedLiquidacion.observaciones}</p>
                </div>
              )}

              <DialogFooter>
                {selectedLiquidacion.estado_pago === "pendiente_cobro" && (
                  <Button
                    onClick={() => handleMarcarCobrado(selectedLiquidacion.id)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Marcar como Cobrado
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => handleGenerarBoleta(selectedLiquidacion.id)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Boleta
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
