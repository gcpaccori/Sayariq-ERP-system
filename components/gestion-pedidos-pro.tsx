"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Search, Filter, Package, Calendar, DollarSign, User, Clock, CheckCircle, Settings, Truck, Target, Scale, Tag, Droplets, Box, Award, MessageSquare, PackageOpen, Loader2, AlertCircle, Plus, X } from 'lucide-react'
import { usePedidosPro } from "@/lib/hooks/use-pedidos-pro"

// Función para calcular días de antigüedad
const calcularDiasAntiguedad = (fechaIngreso: string) => {
  const hoy = new Date()
  const fecha = new Date(fechaIngreso)
  const diferencia = Math.floor((hoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24))
  return diferencia
}

// Función para obtener estado de antigüedad
const getEstadoAntiguedad = (dias: number) => {
  if (dias <= 3) return { label: "Fresco", color: "bg-green-100 text-green-800" }
  if (dias <= 7) return { label: "Medio", color: "bg-yellow-100 text-yellow-800" }
  if (dias <= 14) return { label: "Antiguo", color: "bg-orange-100 text-orange-800" }
  return { label: "Crítico", color: "bg-red-100 text-red-800" }
}

const estadoColors = {
  pendiente: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmado: "bg-blue-100 text-blue-800 border-blue-200",
  en_proceso: "bg-orange-100 text-orange-800 border-orange-200",
  completado: "bg-green-100 text-green-800 border-green-200",
  cancelado: "bg-red-100 text-red-800 border-red-200",
}

const prioridadColors = {
  alta: "bg-red-100 text-red-800",
  media: "bg-yellow-100 text-yellow-800",
  baja: "bg-green-100 text-green-800",
}

export function GestionPedidosPro() {
  const { data: pedidosData, loading, error, refresh, create, update, remove } = usePedidosPro()
  
  console.log("[v0] GestionPedidosPro: pedidosData", pedidosData)
  console.log("[v0] GestionPedidosPro: loading", loading)
  console.log("[v0] GestionPedidosPro: error", error)
  
  const pedidos = Array.isArray(pedidosData) ? pedidosData : []
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [busqueda, setBusqueda] = useState("")
  const [modalAsignar, setModalAsignar] = useState(false)
  const [modalNuevoPedido, setModalNuevoPedido] = useState(false)
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<any>(null)
  const [asignaciones, setAsignaciones] = useState({})
  const [comentariosLotes, setComentariosLotes] = useState({})

  const [formNuevoPedido, setFormNuevoPedido] = useState({
    cliente: "",
    producto: "jengibre",
    categoria: "",
    presentacion: "",
    cantidad: "",
    peso_requerido: "",
    precio_unitario: "",
    fecha_entrega: "",
    prioridad: "media",
    observaciones: "",
  })

  const pedidosFiltrados = pedidos.filter((pedido) => {
    const matchEstado = filtroEstado === "todos" || pedido.estado === filtroEstado
    const matchBusqueda =
      pedido.cliente.toLowerCase().includes(busqueda.toLowerCase()) ||
      pedido.id.toString().toLowerCase().includes(busqueda.toLowerCase()) ||
      pedido.producto.toLowerCase().includes(busqueda.toLowerCase())
    return matchEstado && matchBusqueda
  })

  const estadisticas = {
    total: pedidos.length,
    pendientes: pedidos.filter((p) => p.estado === "pendiente").length,
    confirmados: pedidos.filter((p) => p.estado === "confirmado").length,
    enProceso: pedidos.filter((p) => p.estado === "en_proceso").length,
    completados: pedidos.filter((p) => p.estado === "completado").length,
  }

  const handleAsignarLotes = () => {
    if (!pedidoSeleccionado) return

    const lotesAsignados = Object.entries(asignaciones)
      .filter(([_, jabas]) => jabas > 0)
      .map(([loteId, jabas]) => {
        const lote = pedidosData.find((p) => p.lotesDisponibles.some((l) => l.id === loteId))
        return {
          loteId,
          jabas: Number.parseInt(jabas),
          peso: Number.parseInt(jabas) * lote.pesoPromedio,
          comentario: comentariosLotes[loteId] || "",
        }
      })

    const pesoTotal = lotesAsignados.reduce((sum, asig) => sum + asig.peso, 0)

    setPedidos(
      pedidos.map((p) =>
        p.id === pedidoSeleccionado.id ? { ...p, lotesAsignados, pesoTotal, estado: "en_proceso" } : p,
      ),
    )

    setModalAsignar(false)
    setPedidoSeleccionado(null)
    setAsignaciones({})
    setComentariosLotes({})
  }

  const abrirModalAsignar = (pedido) => {
    setPedidoSeleccionado(pedido)
    setModalAsignar(true)
    // Inicializar asignaciones existentes
    const asignacionesExistentes = {}
    const comentariosExistentes = {}
    pedido.lotesAsignados.forEach((asig) => {
      asignacionesExistentes[asig.loteId] = asig.jabas
      comentariosExistentes[asig.loteId] = asig.comentario || ""
    })
    setAsignaciones(asignacionesExistentes)
    setComentariosLotes(comentariosExistentes)
  }

  // Obtener lotes disponibles ordenados por FIFO (más antiguos primero)
  const getLotesDisponiblesOrdenados = () => {
    if (!pedidoSeleccionado) return []

    return pedidosData
      .filter(
        (pedido) =>
          pedido.producto === pedidoSeleccionado.producto &&
          pedido.presentacion === pedidoSeleccionado.presentacion,
      )
      .flatMap((p) => p.lotesDisponibles)
      .sort((a, b) => new Date(a.fechaIngreso).getTime() - new Date(b.fechaIngreso).getTime()) // FIFO: más antiguos primero
  }

  const handleCrearPedido = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const nuevoPedido = {
        cliente: formNuevoPedido.cliente,
        producto: formNuevoPedido.producto,
        categoria: formNuevoPedido.categoria || "exportacion",
        presentacion: formNuevoPedido.presentacion || "lavado-seco",
        cantidad: Number(formNuevoPedido.cantidad),
        peso_requerido: Number(formNuevoPedido.peso_requerido),
        precio_unitario: Number(formNuevoPedido.precio_unitario),
        fecha_entrega: formNuevoPedido.fecha_entrega,
        prioridad: formNuevoPedido.prioridad as "alta" | "media" | "baja",
        estado: "pendiente" as const,
        observaciones: formNuevoPedido.observaciones,
      }

      console.log("[v0] Creating pedido:", nuevoPedido)
      await create(nuevoPedido)
      
      // Reset form
      setFormNuevoPedido({
        cliente: "",
        producto: "jengibre",
        categoria: "",
        presentacion: "",
        cantidad: "",
        peso_requerido: "",
        precio_unitario: "",
        fecha_entrega: "",
        prioridad: "media",
        observaciones: "",
      })
      setModalNuevoPedido(false)
      refresh()
      alert("Pedido creado correctamente")
    } catch (error) {
      console.error("[v0] Error al crear pedido:", error)
      alert("Error al crear el pedido")
    }
  }

  const handleEliminarPedido = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar este pedido?")) return
    
    try {
      await remove(id)
      refresh()
      alert("Pedido eliminado correctamente")
    } catch (error) {
      console.error("[v0] Error al eliminar pedido:", error)
      alert("Error al eliminar el pedido")
    }
  }

  const handleActualizarEstado = async (id: number, nuevoEstado: string) => {
    try {
      await update(id, { estado: nuevoEstado })
      refresh()
      alert(`Estado actualizado a: ${nuevoEstado}`)
    } catch (error) {
      console.error("[v0] Error al actualizar estado:", error)
      alert("Error al actualizar el estado")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando pedidos...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={refresh}>Reintentar</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Pedidos Pro</h1>
          <p className="text-gray-600">Sistema avanzado de pedidos con asignación de lotes</p>
        </div>
        <Button onClick={() => setModalNuevoPedido(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Pedido
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{estadisticas.total}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{estadisticas.pendientes}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Confirmados</p>
                <p className="text-2xl font-bold text-blue-600">{estadisticas.confirmados}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En Proceso</p>
                <p className="text-2xl font-bold text-orange-600">{estadisticas.enProceso}</p>
              </div>
              <Settings className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completados</p>
                <p className="text-2xl font-bold text-green-600">{estadisticas.completados}</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por cliente, ID o producto..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="confirmado">Confirmados</SelectItem>
                <SelectItem value="en_proceso">En Proceso</SelectItem>
                <SelectItem value="completado">Completados</SelectItem>
                <SelectItem value="cancelado">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Pedidos */}
      <div className="space-y-4">
        {pedidosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-40">
              <p className="text-gray-500">No hay pedidos que coincidan con los filtros</p>
            </CardContent>
          </Card>
        ) : (
          pedidosFiltrados.map((pedido) => (
            <Card key={pedido.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">PED-{pedido.id}</h3>
                      <Badge className={estadoColors[pedido.estado]}>
                        {pedido.estado.replace("_", " ").toUpperCase()}
                      </Badge>
                      <Badge className={prioridadColors[pedido.prioridad]}>{pedido.prioridad.toUpperCase()}</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{pedido.cliente}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span>{pedido.producto} - {pedido.categoria}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>Entrega: {pedido.fechaEntrega}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          {pedido.moneda} {pedido.total.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Droplets className="h-4 w-4" />
                        <span>
                          {pedido.presentacion} - {pedido.humedad}% humedad
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Box className="h-4 w-4" />
                        <span>{pedido.empaque}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Scale className="h-4 w-4" />
                        <span>{pedido.calibre || "Sin calibrar"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        <span>{pedido.etiquetado || "Sin etiqueta"}</span>
                      </div>
                    </div>

                    {pedido.lotesAsignados.length > 0 && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <PackageOpen className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-800">Lotes Asignados:</span>
                        </div>
                        <div className="space-y-2">
                          {pedido.lotesAsignados.map((asig, idx) => (
                            <div key={idx} className="flex justify-between items-start">
                              <div className="flex-1">
                                <span className="font-medium">{asig.loteId}:</span>
                                <span className="ml-2">
                                  {asig.jabas} jabas ({asig.peso.toFixed(1)} kg)
                                </span>
                                {asig.comentario && (
                                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
                                    <MessageSquare className="h-3 w-3" />
                                    <span>{asig.comentario}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-green-300">
                          <div className="flex justify-between font-medium text-green-800">
                            <span>Peso Total:</span>
                            <span>{pedido.pesoTotal.toFixed(1)} kg</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {pedido.certificaciones.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-blue-500" />
                        <div className="flex gap-1">
                          {pedido.certificaciones.map((cert, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {cert}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    {(pedido.estado === "confirmado" || pedido.estado === "en_proceso") && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => abrirModalAsignar(pedido)}
                      >
                        <Truck className="h-4 w-4 mr-1" />
                        Asignar
                      </Button>
                    )}
                    {pedido.estado === "pendiente" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleActualizarEstado(pedido.id, "confirmado")}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Confirmar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleEliminarPedido(pedido.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de Asignación de Lotes */}
      <Dialog open={modalAsignar} onOpenChange={setModalAsignar}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-green-700">Asignar Lotes al Pedido</DialogTitle>
            <DialogDescription>
              {pedidoSeleccionado && (
                <div className="flex items-center gap-4 mt-2">
                  <span>
                    Pedido: PED-{pedidoSeleccionado.id} - {pedidoSeleccionado.cliente}
                  </span>
                  <div className="flex items-center gap-2 text-lg font-bold text-blue-600">
                    <Scale className="h-5 w-5" />
                    <span>Peso requerido: {pedidoSeleccionado.pesoRequerido} kg</span>
                  </div>
                  <div className="flex items-center gap-2 text-lg font-bold text-green-600">
                    <span>{pedidoSeleccionado.producto === "Jengibre" ? "🫚" : "🟡"}</span>
                    <span>Producto: {pedidoSeleccionado.producto}</span>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {pedidoSeleccionado && (
            <div className="space-y-6">
              {/* Información del Pedido */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <h4 className="font-medium text-blue-800 mb-2">Especificaciones del Pedido</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Producto:</span>
                      <p className="font-medium">{pedidoSeleccionado.producto}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Categoría:</span>
                      <p className="font-medium">{pedidoSeleccionado.categoria}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Presentación:</span>
                      <p className="font-medium">{pedidoSeleccionado.presentacion}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Humedad:</span>
                      <p className="font-medium">{pedidoSeleccionado.humedad}%</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Cantidad:</span>
                      <p className="font-medium">{pedidoSeleccionado.cantidad} jabas</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Empaque:</span>
                      <p className="font-medium">{pedidoSeleccionado.empaque}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Calibre:</span>
                      <p className="font-medium">{pedidoSeleccionado.calibre || "Sin especificar"}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Entrega:</span>
                      <p className="font-medium">{pedidoSeleccionado.fechaEntrega}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lotes Disponibles - Ordenados por FIFO */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">
                  Lotes Disponibles (ordenados por antigüedad - más antiguos primero)
                </h4>
                <div className="space-y-3">
                  {getLotesDisponiblesOrdenados().map((lote) => {
                    const diasAntiguedad = calcularDiasAntiguedad(lote.fechaIngreso)
                    const estadoAntiguedad = getEstadoAntiguedad(diasAntiguedad)

                    return (
                      <Card key={lote.id} className="border-2 hover:border-green-300 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-8 gap-4">
                              <div>
                                <span className="text-sm text-gray-600">Lote</span>
                                <p className="font-medium">{lote.id}</p>
                              </div>
                              <div>
                                <span className="text-sm text-gray-600">Proveedor</span>
                                <p className="font-medium">{lote.proveedor}</p>
                              </div>
                              <div>
                                <span className="text-sm text-gray-600">Fecha Ingreso</span>
                                <p className="font-medium">{lote.fechaIngreso}</p>
                                <p className="text-xs text-gray-500">{diasAntiguedad} días</p>
                              </div>
                              <div>
                                <span className="text-sm text-gray-600">Producto</span>
                                <p className="font-medium">
                                  {lote.producto === "Jengibre" ? "🫚" : "🟡"} {lote.producto}
                                </p>
                              </div>
                              <div>
                                <span className="text-sm text-gray-600">Antigüedad</span>
                                <Badge className={estadoAntiguedad.color}>{estadoAntiguedad.label}</Badge>
                              </div>
                              <div>
                                <span className="text-sm text-gray-600">Humedad</span>
                                <p className="font-medium">{lote.humedad}%</p>
                              </div>
                              <div>
                                <span className="text-sm text-gray-600">Disponibles</span>
                                <p className="font-medium text-green-600">
                                  {lote.jabasDisponibles}/{lote.jabasTotal}
                                </p>
                              </div>
                              <div>
                                <span className="text-sm text-gray-600">Peso/Jaba</span>
                                <p className="font-medium">{lote.pesoPromedio} kg</p>
                              </div>
                            </div>
                            <div className="ml-4 w-40 space-y-2">
                              <div>
                                <Label htmlFor={`asignar-${lote.id}`} className="text-sm">
                                  Jabas a asignar
                                </Label>
                                <Input
                                  id={`asignar-${lote.id}`}
                                  type="number"
                                  min="0"
                                  max={lote.jabasDisponibles}
                                  value={asignaciones[lote.id] || 0}
                                  onChange={(e) =>
                                    setAsignaciones({
                                      ...asignaciones,
                                      [lote.id]: Number.parseInt(e.target.value) || 0,
                                    })
                                  }
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`comentario-${lote.id}`} className="text-sm">
                                  Comentario
                                </Label>
                                <Textarea
                                  id={`comentario-${lote.id}`}
                                  placeholder="Comentario opcional..."
                                  value={comentariosLotes[lote.id] || ""}
                                  onChange={(e) =>
                                    setComentariosLotes({
                                      ...comentariosLotes,
                                      [lote.id]: e.target.value,
                                    })
                                  }
                                  className="mt-1"
                                  rows={2}
                                />
                              </div>
                            </div>
                          </div>
                          {asignaciones[lote.id] > 0 && (
                            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm">
                              <div className="flex justify-between">
                                <span>Peso asignado:</span>
                                <span className="font-medium">
                                  {(asignaciones[lote.id] * lote.pesoPromedio).toFixed(1)} kg
                                </span>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>

              {/* Resumen de Asignación */}
              {Object.values(asignaciones).some((jabas) => jabas > 0) && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-green-800 mb-3">Resumen de Asignación</h4>
                    <div className="space-y-2">
                      {Object.entries(asignaciones)
                        .filter(([_, jabas]) => jabas > 0)
                        .map(([loteId, jabas]) => {
                          const lote = pedidosData.find((p) => p.lotesDisponibles.some((l) => l.id === loteId))
                          return (
                            <div key={loteId} className="flex justify-between text-sm">
                              <span>
                                {loteId} ({lote.proveedor}):
                              </span>
                              <span className="font-medium">
                                {jabas} jabas = {(jabas * lote.pesoPromedio).toFixed(1)} kg
                              </span>
                            </div>
                          )
                        })}
                    </div>
                    <Separator className="my-3" />
                    <div className="flex justify-between font-medium text-green-800">
                      <span>Total Asignado:</span>
                      <span>
                        {Object.entries(asignaciones)
                          .filter(([_, jabas]) => jabas > 0)
                          .reduce((sum, [loteId, jabas]) => {
                            const lote = pedidosData.find((p) => p.lotesDisponibles.some((l) => l.id === loteId))
                            return sum + jabas * lote.pesoPromedio
                          }, 0)
                          .toFixed(1)}{" "}
                        kg
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                      <span>Jabas totales:</span>
                      <span>{Object.values(asignaciones).reduce((sum, jabas) => sum + jabas, 0)} jabas</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                      <span>Peso requerido:</span>
                      <span>{pedidoSeleccionado.pesoRequerido} kg</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setModalAsignar(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleAsignarLotes}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={!Object.values(asignaciones).some((jabas) => jabas > 0)}
                >
                  Confirmar Asignación
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal for creating new pedido */}
      <Dialog open={modalNuevoPedido} onOpenChange={setModalNuevoPedido}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Pedido</DialogTitle>
            <DialogDescription>Ingrese los datos del pedido</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCrearPedido} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente *</Label>
                <Input
                  id="cliente"
                  value={formNuevoPedido.cliente}
                  onChange={(e) => setFormNuevoPedido({ ...formNuevoPedido, cliente: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="producto">Producto *</Label>
                <Select
                  value={formNuevoPedido.producto}
                  onValueChange={(value) => setFormNuevoPedido({ ...formNuevoPedido, producto: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jengibre">Jengibre</SelectItem>
                    <SelectItem value="curcuma">Cúrcuma</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cantidad">Cantidad (jabas) *</Label>
                <Input
                  id="cantidad"
                  type="number"
                  value={formNuevoPedido.cantidad}
                  onChange={(e) => setFormNuevoPedido({ ...formNuevoPedido, cantidad: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="peso_requerido">Peso Requerido (kg) *</Label>
                <Input
                  id="peso_requerido"
                  type="number"
                  step="0.01"
                  value={formNuevoPedido.peso_requerido}
                  onChange={(e) => setFormNuevoPedido({ ...formNuevoPedido, peso_requerido: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="precio_unitario">Precio Unitario (S/./kg) *</Label>
                <Input
                  id="precio_unitario"
                  type="number"
                  step="0.01"
                  value={formNuevoPedido.precio_unitario}
                  onChange={(e) => setFormNuevoPedido({ ...formNuevoPedido, precio_unitario: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha_entrega">Fecha de Entrega *</Label>
                <Input
                  id="fecha_entrega"
                  type="date"
                  value={formNuevoPedido.fecha_entrega}
                  onChange={(e) => setFormNuevoPedido({ ...formNuevoPedido, fecha_entrega: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prioridad">Prioridad</Label>
                <Select
                  value={formNuevoPedido.prioridad}
                  onValueChange={(value) => setFormNuevoPedido({ ...formNuevoPedido, prioridad: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={formNuevoPedido.observaciones}
                onChange={(e) => setFormNuevoPedido({ ...formNuevoPedido, observaciones: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setModalNuevoPedido(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Crear Pedido
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
