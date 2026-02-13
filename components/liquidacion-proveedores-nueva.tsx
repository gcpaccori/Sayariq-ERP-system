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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Plus, DollarSign, FileText, CheckCircle, Clock, Eye, Download, AlertCircle, TrendingDown } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { 
  liquidacionProveedoresService,
  type LiquidacionProveedor,
  type LotePendiente,
  type DetalleCategoriaProveedor,
  type NuevaLiquidacionProveedor 
} from "@/lib/services/liquidaciones-proveedores-service"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export function LiquidacionProveedoresNueva() {
  const { toast } = useToast()
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionProveedor[]>([])
  const [pendientes, setPendientes] = useState<LotePendiente[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isPagoDialogOpen, setIsPagoDialogOpen] = useState(false)
  const [selectedLiquidacion, setSelectedLiquidacion] = useState<LiquidacionProveedor | null>(null)
  
  // Formulario
  const [proveedorId, setProveedorId] = useState<number | null>(null)
  const [loteId, setLoteId] = useState<number | null>(null)
  const [adelantosPendientes, setAdelantosPendientes] = useState<any[]>([])
  const [totalAdelantosPendientes, setTotalAdelantosPendientes] = useState(0)
  const [categorias, setCategorias] = useState<any[]>([])
  const [detalles, setDetalles] = useState<DetalleCategoriaProveedor[]>([])
  const [formaPago, setFormaPago] = useState<"adelanto" | "credito" | "contado">("contado")
  const [observaciones, setObservaciones] = useState("")
  
  // Pago
  const [montoPago, setMontoPago] = useState(0)
  const [cuentaPago, setCuentaPago] = useState<"banco" | "caja">("banco")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [liqData, pendData] = await Promise.all([
        liquidacionProveedoresService.getAll(),
        liquidacionProveedoresService.getPendientes()
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

  const handleSelectLote = async (lote: LotePendiente) => {
    try {
      const datos = await liquidacionProveedoresService.getDatosProveedor(lote.proveedor_id)
      if (datos) {
        setProveedorId(lote.proveedor_id)
        setLoteId(lote.lote_id)
        setAdelantosPendientes(datos.adelantos)
        setTotalAdelantosPendientes(datos.total_adelantos_pendientes)
        setCategorias(datos.categorias)
        
        // Inicializar detalles con todas las categorías
        setDetalles(datos.categorias.map(cat => ({
          categoria_id: cat.id,
          categoria_nombre: cat.nombre,
          peso_ajustado: 0,
          precio_unitario: cat.precio_kg,
          subtotal: 0
        })))
        
        // Sugerir forma de pago según adelantos
        if (datos.total_adelantos_pendientes > 0) {
          setFormaPago("adelanto")
        } else {
          setFormaPago("contado")
        }
        
        setIsDialogOpen(true)
      }
    } catch (error) {
      console.error("Error cargando datos del proveedor:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del proveedor",
        variant: "destructive"
      })
    }
  }

  const handleDetalleChange = (index: number, field: keyof DetalleCategoriaProveedor, value: number) => {
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

  const calcularTotalAPagar = () => {
    const total = calcularTotal()
    if (formaPago === "adelanto") {
      return Math.max(0, total - totalAdelantosPendientes)
    }
    return total
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!proveedorId || !loteId) {
      toast({
        title: "Error",
        description: "Debe seleccionar un proveedor y lote",
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

    const total = calcularTotal()

    // Validar adelantos
    if (formaPago === "adelanto" && totalAdelantosPendientes < total) {
      const confirmacion = window.confirm(
        `Los adelantos pendientes (S/ ${totalAdelantosPendientes.toFixed(2)}) son insuficientes para cubrir el total (S/ ${total.toFixed(2)}). ` +
        `Se pagará la diferencia de S/ ${(total - totalAdelantosPendientes).toFixed(2)}. ¿Desea continuar?`
      )
      if (!confirmacion) return
    }

    const liquidacion: NuevaLiquidacionProveedor = {
      proveedor_id: proveedorId,
      lote_id: loteId,
      detalles_categorias: detallesFiltrados,
      forma_pago: formaPago,
      monto_total: total,
      observaciones: observaciones || undefined
    }

    try {
      const result = await liquidacionProveedoresService.create(liquidacion)
      
      if (result) {
        let mensaje = `Liquidación ${result.numero_liquidacion} creada correctamente`
        
        if (formaPago === "adelanto") {
          mensaje += `\nAdelantos descontados: S/ ${result.total_adelantos.toFixed(2)}`
          if (result.total_a_pagar > 0) {
            mensaje += `\nSaldo a pagar: S/ ${result.total_a_pagar.toFixed(2)}`
          }
        } else if (formaPago === "credito") {
          mensaje += `\nPendiente de pago: S/ ${result.total_a_pagar.toFixed(2)}`
        } else {
          mensaje += `\nPagado: S/ ${result.total_a_pagar.toFixed(2)}`
        }
        
        toast({
          title: "Éxito",
          description: mensaje
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
    setProveedorId(null)
    setLoteId(null)
    setAdelantosPendientes([])
    setTotalAdelantosPendientes(0)
    setCategorias([])
    setDetalles([])
    setFormaPago("contado")
    setObservaciones("")
  }

  const handleVerDetalle = async (liquidacion: LiquidacionProveedor) => {
    try {
      const detalle = await liquidacionProveedoresService.getById(liquidacion.id)
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

  const handleRegistrarPago = async () => {
    if (!selectedLiquidacion || montoPago <= 0) {
      toast({
        title: "Error",
        description: "Debe ingresar un monto válido",
        variant: "destructive"
      })
      return
    }

    try {
      const result = await liquidacionProveedoresService.registrarPago(selectedLiquidacion.id, {
        monto: montoPago,
        cuenta_tipo: cuentaPago
      })
      
      if (result) {
        toast({
          title: "Éxito",
          description: `Pago registrado. Nuevo estado: ${result.estado_pago}`
        })
        setIsPagoDialogOpen(false)
        setIsDetailDialogOpen(false)
        setMontoPago(0)
        loadData()
      }
    } catch (error) {
      console.error("Error registrando pago:", error)
      toast({
        title: "Error",
        description: "No se pudo registrar el pago",
        variant: "destructive"
      })
    }
  }

  const handleGenerarComprobante = async (id: number) => {
    try {
      const comprobante = await liquidacionProveedoresService.generarComprobante(id)
      if (comprobante) {
        toast({
          title: "Éxito",
          description: "Comprobante generado correctamente"
        })
      }
    } catch (error) {
      console.error("Error generando comprobante:", error)
      toast({
        title: "Error",
        description: "No se pudo generar el comprobante",
        variant: "destructive"
      })
    }
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "pendiente_pago":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente Pago
          </Badge>
        )
      case "pagado_parcial":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            <TrendingDown className="w-3 h-3 mr-1" />
            Pagado Parcial
          </Badge>
        )
      case "pagado_total":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Pagado Total
          </Badge>
        )
      case "pagado_con_adelanto":
        return (
          <Badge variant="default" className="bg-purple-100 text-purple-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Con Adelanto
          </Badge>
        )
      default:
        return <Badge variant="secondary">{estado}</Badge>
    }
  }

  const getFormaPagoBadge = (forma: string) => {
    switch (forma) {
      case "adelanto":
        return <Badge variant="outline" className="bg-purple-50">Adelanto</Badge>
      case "credito":
        return <Badge variant="outline" className="bg-yellow-50">Crédito</Badge>
      case "contado":
        return <Badge variant="outline" className="bg-green-50">Contado</Badge>
      default:
        return <Badge variant="secondary">{forma}</Badge>
    }
  }

  // Calcular estadísticas
  const stats = {
    total: liquidaciones.length,
    pendientes: liquidaciones.filter(l => l.estado_pago === "pendiente_pago").length,
    pagadas: liquidaciones.filter(l => l.estado_pago === "pagado_total" || l.estado_pago === "pagado_con_adelanto").length,
    montoTotal: liquidaciones.reduce((sum, l) => sum + l.total_bruto_fruta, 0),
    montoPendiente: liquidaciones
      .filter(l => l.estado_pago === "pendiente_pago" || l.estado_pago === "pagado_parcial")
      .reduce((sum, l) => sum + (l.total_a_pagar - (l.monto_pagado || 0)), 0)
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
            <CardDescription>Pendientes de Pago</CardDescription>
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
            <CardDescription>Pagadas</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.pagadas}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? ((stats.pagadas / stats.total) * 100).toFixed(1) : 0}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Lotes Pendientes</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{pendientes.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Por liquidar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lotes Pendientes */}
      {pendientes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lotes Pendientes de Liquidación</CardTitle>
            <CardDescription>
              Proveedores con lotes listos para liquidar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Fecha Ingreso</TableHead>
                  <TableHead>Peso (kg)</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendientes.map((lote) => (
                  <TableRow key={lote.lote_id}>
                    <TableCell className="font-medium">{lote.proveedor_nombre}</TableCell>
                    <TableCell>{lote.numero_lote}</TableCell>
                    <TableCell>{lote.producto}</TableCell>
                    <TableCell>
                      {format(new Date(lote.fecha_ingreso), "dd MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>{lote.peso_neto.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{lote.estado}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleSelectLote(lote)}
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
          <CardTitle>Liquidaciones de Proveedores</CardTitle>
          <CardDescription>
            Historial de liquidaciones de compras
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Forma Pago</TableHead>
                <TableHead>Monto Total</TableHead>
                <TableHead>Adelantos</TableHead>
                <TableHead>A Pagar</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {liquidaciones.map((liquidacion) => (
                <TableRow key={liquidacion.id}>
                  <TableCell className="font-medium">{liquidacion.numero_liquidacion}</TableCell>
                  <TableCell>{liquidacion.proveedor_nombre}</TableCell>
                  <TableCell>{liquidacion.numero_lote || "-"}</TableCell>
                  <TableCell>
                    {format(new Date(liquidacion.fecha_liquidacion), "dd MMM yyyy", { locale: es })}
                  </TableCell>
                  <TableCell>{getFormaPagoBadge(liquidacion.forma_pago)}</TableCell>
                  <TableCell>S/ {liquidacion.total_bruto_fruta.toFixed(2)}</TableCell>
                  <TableCell>S/ {liquidacion.total_adelantos.toFixed(2)}</TableCell>
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
                        onClick={() => handleGenerarComprobante(liquidacion.id)}
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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Liquidación de Proveedor</DialogTitle>
            <DialogDescription>
              Registre los detalles de la liquidación de compra
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Proveedor ID</Label>
                <Input value={proveedorId || ""} disabled />
              </div>
              <div>
                <Label>Lote ID</Label>
                <Input value={loteId || ""} disabled />
              </div>
            </div>

            {/* Adelantos Pendientes */}
            {adelantosPendientes.length > 0 && (
              <Card className="bg-purple-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Adelantos Pendientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {adelantosPendientes.map((adelanto, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{adelanto.concepto}</span>
                        <span className="font-medium">S/ {adelanto.saldo_pendiente.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 border-t font-semibold">
                      <span>Total Adelantos:</span>
                      <span className="text-purple-700">S/ {totalAdelantosPendientes.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Forma de Pago */}
            <div>
              <Label>Forma de Pago</Label>
              <RadioGroup value={formaPago} onValueChange={(value: any) => setFormaPago(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="adelanto" id="adelanto" disabled={totalAdelantosPendientes === 0} />
                  <Label htmlFor="adelanto" className={totalAdelantosPendientes === 0 ? "text-muted-foreground" : ""}>
                    Adelanto (Descontar de adelantos pendientes)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="credito" id="credito" />
                  <Label htmlFor="credito">Crédito (Pago posterior)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="contado" id="contado" />
                  <Label htmlFor="contado">Contado (Pago inmediato)</Label>
                </div>
              </RadioGroup>
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

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Bruto:</span>
                <span className="text-xl font-bold">
                  S/ {calcularTotal().toFixed(2)}
                </span>
              </div>
              {formaPago === "adelanto" && totalAdelantosPendientes > 0 && (
                <>
                  <div className="flex justify-between items-center text-sm text-purple-700">
                    <span>(-) Adelantos:</span>
                    <span>- S/ {Math.min(calcularTotal(), totalAdelantosPendientes).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-lg font-semibold">Total a Pagar:</span>
                    <span className="text-2xl font-bold text-primary">
                      S/ {calcularTotalAPagar().toFixed(2)}
                    </span>
                  </div>
                </>
              )}
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
                  <Label>Proveedor</Label>
                  <p className="text-sm">{selectedLiquidacion.proveedor_nombre}</p>
                </div>
                <div>
                  <Label>Fecha</Label>
                  <p className="text-sm">
                    {format(new Date(selectedLiquidacion.fecha_liquidacion), "dd MMM yyyy HH:mm", { locale: es })}
                  </p>
                </div>
                <div>
                  <Label>Forma de Pago</Label>
                  <div>{getFormaPagoBadge(selectedLiquidacion.forma_pago)}</div>
                </div>
                <div>
                  <Label>Estado</Label>
                  <div>{getEstadoBadge(selectedLiquidacion.estado_pago)}</div>
                </div>
                <div>
                  <Label>Total Bruto</Label>
                  <p className="text-lg font-semibold">S/ {selectedLiquidacion.total_bruto_fruta.toFixed(2)}</p>
                </div>
                <div>
                  <Label>Adelantos Descontados</Label>
                  <p className="text-lg font-semibold text-purple-700">S/ {selectedLiquidacion.total_adelantos.toFixed(2)}</p>
                </div>
                <div>
                  <Label>Total a Pagar</Label>
                  <p className="text-xl font-bold text-primary">S/ {selectedLiquidacion.total_a_pagar.toFixed(2)}</p>
                </div>
                {selectedLiquidacion.monto_pagado !== undefined && selectedLiquidacion.monto_pagado > 0 && (
                  <div>
                    <Label>Monto Pagado</Label>
                    <p className="text-lg font-semibold text-green-700">S/ {selectedLiquidacion.monto_pagado.toFixed(2)}</p>
                  </div>
                )}
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
                {(selectedLiquidacion.estado_pago === "pendiente_pago" || selectedLiquidacion.estado_pago === "pagado_parcial") && (
                  <Button
                    onClick={() => setIsPagoDialogOpen(true)}
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Registrar Pago
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => handleGenerarComprobante(selectedLiquidacion.id)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Comprobante
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Registrar Pago */}
      <Dialog open={isPagoDialogOpen} onOpenChange={setIsPagoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              Registre el pago de la liquidación a crédito
            </DialogDescription>
          </DialogHeader>

          {selectedLiquidacion && (
            <div className="space-y-4">
              <div>
                <Label>Saldo Pendiente</Label>
                <p className="text-2xl font-bold text-primary">
                  S/ {(selectedLiquidacion.total_a_pagar - (selectedLiquidacion.monto_pagado || 0)).toFixed(2)}
                </p>
              </div>

              <div>
                <Label htmlFor="montoPago">Monto a Pagar (S/)</Label>
                <Input
                  id="montoPago"
                  type="number"
                  step="0.01"
                  value={montoPago}
                  onChange={(e) => setMontoPago(parseFloat(e.target.value) || 0)}
                  max={selectedLiquidacion.total_a_pagar - (selectedLiquidacion.monto_pagado || 0)}
                />
              </div>

              <div>
                <Label htmlFor="cuentaPago">Cuenta de Pago</Label>
                <Select value={cuentaPago} onValueChange={(value: any) => setCuentaPago(value)}>
                  <SelectTrigger id="cuentaPago">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="banco">Banco</SelectItem>
                    <SelectItem value="caja">Caja</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsPagoDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleRegistrarPago}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirmar Pago
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
