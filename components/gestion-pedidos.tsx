"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Search,
  Filter,
  Package,
  Clock,
  Target,
  Loader2,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
} from "lucide-react"
import { usePedidosPro } from "@/lib/hooks/use-pedidos-pro"
import { usePersonas } from "@/lib/hooks/use-personas"

const estadoColors = {
  pendiente: "bg-yellow-100 text-yellow-800 border-yellow-200",
  proceso: "bg-blue-100 text-blue-800 border-blue-200",
  completado: "bg-green-100 text-green-800 border-green-200",
  cancelado: "bg-red-100 text-red-800 border-red-200",
}

export function GestionPedidos() {
  const { data: pedidos, loading, error, refresh, create, update, remove } = usePedidosPro()
  const { data: personas } = usePersonas()

  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [busqueda, setBusqueda] = useState("")
  const [modalNuevoPedido, setModalNuevoPedido] = useState(false)
  const [modalEditarPedido, setModalEditarPedido] = useState(false)
  const [pedidoEditando, setPedidoEditando] = useState<any>(null)
  const [searchClienteTerm, setSearchClienteTerm] = useState("")

  const [formPedido, setFormPedido] = useState({
    cliente_id: "",
    producto: "jengibre",
    categoria: "exportacion",
    kg_bruto: "",
    kg_neto: "",
    porcentaje_humedad: "",
    precio: "",
    fecha_pedido: new Date().toISOString().split("T")[0],
    observaciones: "",
  })

  const clientes =
    personas?.filter((p) => {
      const tipo = (p.tipo || "").toLowerCase()
      const tipoPersona = (p.tipo_persona || "").toLowerCase()
      const roles = p.roles || []
      return tipo === "cliente" || tipoPersona === "cliente" || roles.some((r) => r.toLowerCase() === "cliente")
    }) || []

  const clientesFiltrados = clientes.filter((c) => {
    const searchLower = searchClienteTerm.toLowerCase()
    const nombre = c.nombre_completo || `${c.nombres} ${c.apellidos}` || ""
    const dni = c.dni || c.documento_identidad || c.numero_documento || ""
    return nombre.toLowerCase().includes(searchLower) || dni.includes(searchLower)
  })

  const pedidosFiltrados = pedidos.filter((pedido) => {
    const matchEstado = filtroEstado === "todos" || pedido.estado === filtroEstado
    const searchLower = busqueda.toLowerCase()
    const matchBusqueda =
      (pedido.cliente || "").toLowerCase().includes(searchLower) ||
      (pedido.numero_pedido || "").toLowerCase().includes(searchLower) ||
      (pedido.producto || "").toLowerCase().includes(searchLower)
    return matchEstado && matchBusqueda
  })

  const estadisticas = {
    total: pedidos.length,
    pendientes: pedidos.filter((p) => p.estado === "pendiente").length,
    proceso: pedidos.filter((p) => p.estado === "proceso").length,
    completados: pedidos.filter((p) => p.estado === "completado").length,
  }

  useEffect(() => {
    if (formPedido.kg_bruto && formPedido.porcentaje_humedad) {
      const bruto = Number(formPedido.kg_bruto)
      const humedad = Number(formPedido.porcentaje_humedad)
      const neto = bruto * (1 - humedad / 100)
      setFormPedido((prev) => ({ ...prev, kg_neto: neto.toFixed(2) }))
    }
  }, [formPedido.kg_bruto, formPedido.porcentaje_humedad])

  const handleCrearPedido = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formPedido.cliente_id) {
      alert("Debe seleccionar un cliente")
      return
    }

    try {
      const kg_neto = Number(formPedido.kg_neto) || 0
      const precio = Number(formPedido.precio) || 0

      const nuevoPedido = {
        cliente_id: Number(formPedido.cliente_id),
        producto: formPedido.producto,
        categoria: formPedido.categoria,
        kg_bruto: Number(formPedido.kg_bruto) || 0,
        kg_neto: kg_neto,
        porcentaje_humedad: Number(formPedido.porcentaje_humedad) || 0,
        precio: precio,
        total: kg_neto * precio,
        fecha_pedido: formPedido.fecha_pedido,
        estado: "pendiente" as const,
        observaciones: formPedido.observaciones,
      }

      console.log("[v0] Creating pedido:", nuevoPedido)
      await create(nuevoPedido)

      resetForm()
      setModalNuevoPedido(false)
      refresh()
      alert("Pedido creado correctamente")
    } catch (error) {
      console.error("[v0] Error al crear pedido:", error)
      alert("Error al crear el pedido. Verifique los datos e intente nuevamente.")
    }
  }

  const handleEditarPedido = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!pedidoEditando) return

    try {
      const kg_neto = Number(formPedido.kg_neto) || 0
      const precio = Number(formPedido.precio) || 0

      const datosActualizados = {
        cliente_id: Number(formPedido.cliente_id),
        producto: formPedido.producto,
        categoria: formPedido.categoria,
        kg_bruto: Number(formPedido.kg_bruto) || 0,
        kg_neto: kg_neto,
        porcentaje_humedad: Number(formPedido.porcentaje_humedad) || 0,
        precio: precio,
        total: kg_neto * precio,
        fecha_pedido: formPedido.fecha_pedido,
        observaciones: formPedido.observaciones,
      }

      console.log("[v0] Updating pedido:", pedidoEditando.id, datosActualizados)
      await update(pedidoEditando.id, datosActualizados)

      setModalEditarPedido(false)
      setPedidoEditando(null)
      resetForm()
      refresh()
      alert("Pedido actualizado correctamente")
    } catch (error) {
      console.error("[v0] Error al actualizar pedido:", error)
      alert("Error al actualizar el pedido. Verifique los datos e intente nuevamente.")
    }
  }

  const handleEliminarPedido = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar este pedido? Esta acción no se puede deshacer.")) return

    try {
      console.log("[v0] Deleting pedido:", id)
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
      console.log("[v0] Updating estado:", id, nuevoEstado)
      await update(id, { estado: nuevoEstado })
      refresh()
      alert(`Estado actualizado a: ${nuevoEstado}`)
    } catch (error) {
      console.error("[v0] Error al actualizar estado:", error)
      alert("Error al actualizar el estado")
    }
  }

  const abrirModalEditar = (pedido: any) => {
    setPedidoEditando(pedido)
    setFormPedido({
      cliente_id: String(pedido.cliente_id),
      producto: pedido.producto || "jengibre",
      categoria: pedido.categoria || "exportacion",
      kg_bruto: String(pedido.kg_bruto || 0),
      kg_neto: String(pedido.kg_neto || 0),
      porcentaje_humedad: String(pedido.porcentaje_humedad || 0),
      precio: String(pedido.precio || 0),
      fecha_pedido: pedido.fecha_pedido,
      observaciones: pedido.observaciones || "",
    })
    setModalEditarPedido(true)
  }

  const resetForm = () => {
    setFormPedido({
      cliente_id: "",
      producto: "jengibre",
      categoria: "exportacion",
      kg_bruto: "",
      kg_neto: "",
      porcentaje_humedad: "",
      precio: "",
      fecha_pedido: new Date().toISOString().split("T")[0],
      observaciones: "",
    })
    setSearchClienteTerm("")
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Pedidos</h1>
          <p className="text-gray-600">Administración completa de pedidos de clientes</p>
        </div>
        <Button onClick={() => setModalNuevoPedido(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Pedido
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pedidos</p>
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
                <p className="text-sm text-gray-600">En Proceso</p>
                <p className="text-2xl font-bold text-blue-600">{estadisticas.proceso}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
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

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por cliente, número o producto..."
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
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="proceso">En Proceso</SelectItem>
                <SelectItem value="completado">Completados</SelectItem>
                <SelectItem value="cancelado">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Kg Neto</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      No hay pedidos que coincidan con los filtros
                    </TableCell>
                  </TableRow>
                ) : (
                  pedidosFiltrados.map((pedido) => (
                    <TableRow key={pedido.id}>
                      <TableCell className="font-medium">{pedido.numero_pedido || `PED-${pedido.id}`}</TableCell>
                      <TableCell>{pedido.cliente || pedido.cliente_nombre || `Cliente ${pedido.cliente_id}`}</TableCell>
                      <TableCell className="capitalize">{pedido.producto}</TableCell>
                      <TableCell className="capitalize">{pedido.categoria}</TableCell>
                      <TableCell className="text-right">{Number(pedido.kg_neto).toFixed(2)} kg</TableCell>
                      <TableCell className="text-right">S/. {Number(pedido.precio).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">S/. {Number(pedido.total).toFixed(2)}</TableCell>
                      <TableCell>{pedido.fecha_pedido}</TableCell>
                      <TableCell>
                        <Badge className={estadoColors[pedido.estado]}>{pedido.estado}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {pedido.estado === "pendiente" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleActualizarEstado(pedido.id, "proceso")}
                              title="Marcar como En Proceso"
                            >
                              <CheckCircle className="h-4 w-4 text-blue-600" />
                            </Button>
                          )}
                          {pedido.estado === "proceso" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleActualizarEstado(pedido.id, "completado")}
                              title="Marcar como Completado"
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => abrirModalEditar(pedido)} title="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEliminarPedido(pedido.id)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={modalNuevoPedido}
        onOpenChange={(open) => {
          setModalNuevoPedido(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Pedido</DialogTitle>
            <DialogDescription>Complete los datos del pedido</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCrearPedido} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="cliente_id">Cliente *</Label>
                <div className="space-y-2">
                  <Input
                    placeholder="Buscar cliente por nombre o DNI..."
                    value={searchClienteTerm}
                    onChange={(e) => setSearchClienteTerm(e.target.value)}
                  />
                  <Select
                    value={formPedido.cliente_id}
                    onValueChange={(value) => setFormPedido({ ...formPedido, cliente_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientesFiltrados.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">No hay clientes disponibles</div>
                      ) : (
                        clientesFiltrados.map((cliente) => (
                          <SelectItem key={cliente.id} value={String(cliente.id)}>
                            {cliente.nombre_completo || `${cliente.nombres} ${cliente.apellidos}`} -{" "}
                            {cliente.dni || cliente.documento_identidad || cliente.numero_documento}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="producto">Producto *</Label>
                <Select
                  value={formPedido.producto}
                  onValueChange={(value) => setFormPedido({ ...formPedido, producto: value })}
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
                <Label htmlFor="categoria">Categoría *</Label>
                <Select
                  value={formPedido.categoria}
                  onValueChange={(value) => setFormPedido({ ...formPedido, categoria: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exportacion">Exportación</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                    <SelectItem value="descarte">Descarte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="kg_bruto">Peso Bruto (kg) *</Label>
                <Input
                  id="kg_bruto"
                  type="number"
                  step="0.01"
                  value={formPedido.kg_bruto}
                  onChange={(e) => setFormPedido({ ...formPedido, kg_bruto: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="porcentaje_humedad">Humedad (%)</Label>
                <Input
                  id="porcentaje_humedad"
                  type="number"
                  step="0.01"
                  value={formPedido.porcentaje_humedad}
                  onChange={(e) => setFormPedido({ ...formPedido, porcentaje_humedad: e.target.value })}
                  placeholder="Ej: 12.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kg_neto">Peso Neto (kg) *</Label>
                <Input
                  id="kg_neto"
                  type="number"
                  step="0.01"
                  value={formPedido.kg_neto}
                  onChange={(e) => setFormPedido({ ...formPedido, kg_neto: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="precio">Precio (S/./kg) *</Label>
                <Input
                  id="precio"
                  type="number"
                  step="0.01"
                  value={formPedido.precio}
                  onChange={(e) => setFormPedido({ ...formPedido, precio: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha_pedido">Fecha de Pedido *</Label>
                <Input
                  id="fecha_pedido"
                  type="date"
                  value={formPedido.fecha_pedido}
                  onChange={(e) => setFormPedido({ ...formPedido, fecha_pedido: e.target.value })}
                  required
                />
              </div>
              {formPedido.kg_neto && formPedido.precio && (
                <div className="col-span-2 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Total:{" "}
                    <span className="text-xl font-bold text-gray-900">
                      S/. {(Number(formPedido.kg_neto) * Number(formPedido.precio)).toFixed(2)}
                    </span>
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={formPedido.observaciones}
                onChange={(e) => setFormPedido({ ...formPedido, observaciones: e.target.value })}
                rows={3}
                placeholder="Notas adicionales sobre el pedido..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setModalNuevoPedido(false)
                  resetForm()
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">Crear Pedido</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={modalEditarPedido}
        onOpenChange={(open) => {
          setModalEditarPedido(open)
          if (!open) {
            setPedidoEditando(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Pedido</DialogTitle>
            <DialogDescription>Modifique los datos del pedido</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditarPedido} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="cliente_id_edit">Cliente *</Label>
                <Select
                  value={formPedido.cliente_id}
                  onValueChange={(value) => setFormPedido({ ...formPedido, cliente_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={String(cliente.id)}>
                        {cliente.nombre_completo || `${cliente.nombres} ${cliente.apellidos}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="producto_edit">Producto *</Label>
                <Select
                  value={formPedido.producto}
                  onValueChange={(value) => setFormPedido({ ...formPedido, producto: value })}
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
                <Label htmlFor="categoria_edit">Categoría *</Label>
                <Select
                  value={formPedido.categoria}
                  onValueChange={(value) => setFormPedido({ ...formPedido, categoria: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exportacion">Exportación</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                    <SelectItem value="descarte">Descarte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="kg_bruto_edit">Peso Bruto (kg) *</Label>
                <Input
                  id="kg_bruto_edit"
                  type="number"
                  step="0.01"
                  value={formPedido.kg_bruto}
                  onChange={(e) => setFormPedido({ ...formPedido, kg_bruto: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="porcentaje_humedad_edit">Humedad (%)</Label>
                <Input
                  id="porcentaje_humedad_edit"
                  type="number"
                  step="0.01"
                  value={formPedido.porcentaje_humedad}
                  onChange={(e) => setFormPedido({ ...formPedido, porcentaje_humedad: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kg_neto_edit">Peso Neto (kg) *</Label>
                <Input
                  id="kg_neto_edit"
                  type="number"
                  step="0.01"
                  value={formPedido.kg_neto}
                  onChange={(e) => setFormPedido({ ...formPedido, kg_neto: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="precio_edit">Precio (S/./kg) *</Label>
                <Input
                  id="precio_edit"
                  type="number"
                  step="0.01"
                  value={formPedido.precio}
                  onChange={(e) => setFormPedido({ ...formPedido, precio: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha_pedido_edit">Fecha de Pedido *</Label>
                <Input
                  id="fecha_pedido_edit"
                  type="date"
                  value={formPedido.fecha_pedido}
                  onChange={(e) => setFormPedido({ ...formPedido, fecha_pedido: e.target.value })}
                  required
                />
              </div>
              {formPedido.kg_neto && formPedido.precio && (
                <div className="col-span-2 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Total:{" "}
                    <span className="text-xl font-bold text-gray-900">
                      S/. {(Number(formPedido.kg_neto) * Number(formPedido.precio)).toFixed(2)}
                    </span>
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="observaciones_edit">Observaciones</Label>
              <Textarea
                id="observaciones_edit"
                value={formPedido.observaciones}
                onChange={(e) => setFormPedido({ ...formPedido, observaciones: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setModalEditarPedido(false)
                  setPedidoEditando(null)
                  resetForm()
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">Guardar Cambios</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
