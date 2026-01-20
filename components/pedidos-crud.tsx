"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Plus, Edit, Trash2, Check, ChevronsUpDown, Boxes, X, Filter } from "lucide-react"
import { pedidosService } from "@/lib/services/pedidos-service"
import { personasService } from "@/lib/services/personas-service"
import { categoriasPesoService } from "@/lib/services/categorias-peso-service"
import type { Pedido, Persona } from "@/lib/types"
import { cn } from "@/lib/utils"

/* ================================
   Tipos auxiliares
================================ */

type CategoriaPeso = {
  id: number
  codigo: string
  nombre: string
  descripcion?: string | null
  precio_kg: number | string
  es_liquidable: number
  orden: number
  estado: string
}

type LoteDisponible = {
  lote_id: number
  numero_lote: string
  producto: string
  categoria_id: number
  categoria_nombre: string
  categoria_codigo: string
  saldo_disponible: number
  peso_original?: number
  total_asignado?: number
  estado_lote?: string
  precio_kg?: number
}

type LoteAsignado = {
  id: number
  lote_id: number
  numero_lote: string
  producto: string
  categoria: string
  peso_asignado: number
}

/* =======================================
   Componente principal
======================================= */

export function PedidosCrud() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [clientes, setClientes] = useState<Persona[]>([])
  const [categorias, setCategorias] = useState<CategoriaPeso[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterEstado, setFilterEstado] = useState<string>("todos")
  const [filterProducto, setFilterProducto] = useState<string>("todos")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null)
  const [openClienteCombo, setOpenClienteCombo] = useState(false)

  const [isLotesDialogOpen, setIsLotesDialogOpen] = useState(false)
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null)
  const [lotesDisponibles, setLotesDisponibles] = useState<LoteDisponible[]>([])
  const [lotesAsignados, setLotesAsignados] = useState<LoteAsignado[]>([])
  const [loadingLotes, setLoadingLotes] = useState(false)

  const [kgAsignar, setKgAsignar] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    numero_pedido: "",
    cliente_id: 0,
    producto: "",
    categoria: "",
    categoria_id: 0,
    kg_bruto: "",
    porcentaje_humedad: "",
    kg_neto: "",
    precio: "",
    total: "",
    fecha_pedido: new Date().toISOString().split("T")[0],
    estado: "pendiente" as Pedido["estado"],
    observaciones: "",
  })

  /* =======================================
     Carga inicial
  ======================================== */
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      console.log("[PedidosCrud] Cargando pedidos, clientes y categorías...")

      const [pedidosData, personasData, categoriasData] = await Promise.all([
        pedidosService.getAll(),
        personasService.getAll(),
        categoriasPesoService.getAll(),
      ])

      console.log("[PedidosCrud] pedidos:", pedidosData.length)
      console.log("[PedidosCrud] personas:", personasData.length)
      console.log("[PedidosCrud] categorias peso:", categoriasData.length)

      setPedidos(pedidosData)

      const clientesFiltered = personasData.filter(
        (p) =>
          p.tipo === "cliente" ||
          p.tipo_persona?.toLowerCase() === "cliente" ||
          (p.roles && p.roles.some((r) => r.toLowerCase().includes("cliente"))),
      )

      setClientes(clientesFiltered)
      setCategorias(categoriasData)
    } catch (error) {
      console.error("[PedidosCrud] Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  /* =======================================
     Recalcular kg_neto y total
  ======================================== */
  useEffect(() => {
    const kgBruto = Number(formData.kg_bruto || 0)
    const porcentajeHumedad = Number(formData.porcentaje_humedad || 0)
    const precio = Number(formData.precio || 0)

    const kgNeto = kgBruto * (1 - porcentajeHumedad / 100)
    const total = kgNeto * precio

    setFormData((prev) => ({
      ...prev,
      kg_neto: kgNeto > 0 ? kgNeto.toFixed(2) : "",
      total: total > 0 ? total.toFixed(2) : "",
    }))
  }, [formData.kg_bruto, formData.porcentaje_humedad, formData.precio])

  /* =======================================
     Lotes para un pedido (agrupados)
  ======================================== */
  const loadLotesForPedido = async (pedido: Pedido) => {
    try {
      setPedidoSeleccionado(pedido)
      setLoadingLotes(true)
      setKgAsignar({})
      console.log("[PedidosCrud] Cargando lotes para pedido:", pedido.id)

      const resDisponibles = await pedidosService.getLotesDisponibles()
      const resAsignados = await pedidosService.getLotesPedido(pedido.id)

      const disponiblesRaw = Array.isArray(resDisponibles)
        ? resDisponibles
        : Array.isArray(resDisponibles?.data)
          ? resDisponibles.data
          : resDisponibles
      const asignadosRaw = Array.isArray(resAsignados?.data) ? resAsignados.data : resAsignados

      console.log("[PedidosCrud] Lotes disponibles (raw del service):", disponiblesRaw)
      console.log("[PedidosCrud] Lotes asignados (raw del service):", asignadosRaw)

      const disponiblesNorm: LoteDisponible[] = (disponiblesRaw || []).map((row: any) => ({
        lote_id: Number(row.lote_id ?? row.id),
        numero_lote: String(row.numero_lote ?? ""),
        producto: String(row.producto ?? ""),
        categoria_id: Number(row.categoria_id ?? 0),
        categoria_nombre: String(row.categoria_nombre || row.categoria || "Sin categoría"),
        categoria_codigo: String(row.categoria_codigo || ""),
        saldo_disponible: Number(row.saldo_disponible ?? 0),
        peso_original: Number(row.peso_original ?? 0),
        total_asignado: Number(row.total_asignado ?? 0),
        estado_lote: row.estado_lote ?? row.estado ?? "",
        precio_kg: Number(row.precio_kg ?? 0),
      }))

      const asignadosNorm: LoteAsignado[] = (asignadosRaw || []).map((lote: any) => ({
        id: Number(lote.id),
        lote_id: Number(lote.lote_id),
        numero_lote: String(lote.numero_lote ?? ""),
        producto: String(lote.producto ?? ""),
        categoria: String(lote.categoria ?? lote.categoria_nombre ?? ""),
        peso_asignado: Number(lote.peso_asignado ?? lote.kg_asignado ?? 0),
      }))

      setLotesDisponibles(disponiblesNorm)
      setLotesAsignados(asignadosNorm)
      setIsLotesDialogOpen(true)
    } catch (error) {
      console.error("[PedidosCrud] Error cargando lotes para pedido:", error)
      alert("Error al cargar lotes para este pedido")
    } finally {
      setLoadingLotes(false)
    }
  }

  /* =======================================
     CRUD Pedido
  ======================================== */

  const handleCreate = () => {
    setEditingPedido(null)
    const año = new Date().getFullYear()

    setFormData({
      numero_pedido: `PED-${año}-${String(pedidos.length + 1).padStart(3, "0")}`,
      cliente_id: 0,
      producto: "",
      categoria: "",
      categoria_id: 0,
      kg_bruto: "",
      porcentaje_humedad: "2.5",
      kg_neto: "",
      precio: "",
      total: "",
      fecha_pedido: new Date().toISOString().split("T")[0],
      estado: "pendiente",
      observaciones: "",
    })
    setIsDialogOpen(true)
  }

  const handleEdit = (pedido: Pedido) => {
    const categoriaEncontrada = categorias.find((c) => c.nombre === pedido.categoria || c.codigo === pedido.categoria)

    setEditingPedido(pedido)
    setFormData({
      numero_pedido: pedido.numero_pedido || pedido.codigo || "",
      cliente_id: pedido.cliente_id,
      producto: pedido.producto,
      categoria: pedido.categoria || categoriaEncontrada?.nombre || "",
      categoria_id: categoriaEncontrada?.id || 0,
      kg_bruto: String(pedido.kg_bruto ?? ""),
      porcentaje_humedad: String(pedido.porcentaje_humedad ?? ""),
      kg_neto: String(pedido.kg_neto ?? ""),
      precio: String(pedido.precio ?? ""),
      total: String(pedido.total ?? ""),
      fecha_pedido: pedido.fecha_pedido,
      estado: pedido.estado,
      observaciones: pedido.observaciones || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este pedido?")) return

    try {
      await pedidosService.delete(id)
      await loadData()
    } catch (error) {
      console.error("[PedidosCrud] Error deleting pedido:", error)
      alert("Error al eliminar el pedido")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.cliente_id || formData.cliente_id === 0) {
      alert("Por favor selecciona un cliente")
      return
    }

    if (!formData.categoria_id) {
      alert("Por favor selecciona una categoría de la lista")
      return
    }

    const categoriaSeleccionada = categorias.find((c) => c.id === formData.categoria_id)

    try {
      const pedidoData = {
        numero_pedido: formData.numero_pedido,
        cliente_id: formData.cliente_id,
        producto: formData.producto,
        categoria: categoriaSeleccionada?.nombre || formData.categoria,
        kg_bruto: Number(formData.kg_bruto || 0),
        porcentaje_humedad: Number(formData.porcentaje_humedad || 0),
        kg_neto: Number(formData.kg_neto || 0),
        precio: Number(formData.precio || 0),
        total: Number(formData.total || 0),
        fecha_pedido: formData.fecha_pedido,
        estado: formData.estado,
        observaciones: formData.observaciones,
      }

      if (editingPedido) {
        await pedidosService.update(editingPedido.id, pedidoData)
      } else {
        await pedidosService.create(pedidoData as any)
      }

      setIsDialogOpen(false)
      await loadData()
    } catch (error) {
      console.error("[PedidosCrud] Error saving pedido:", error)
      alert("Error al guardar el pedido")
    }
  }

  const handleEstadoChange = async (pedidoId: number, newEstado: Pedido["estado"]) => {
    try {
      await pedidosService.updateEstado(pedidoId, newEstado)
      await loadData()
    } catch (error) {
      console.error("[PedidosCrud] Error updating estado:", error)
      alert("Error al actualizar el estado")
    }
  }

  /* =======================================
     Asignar / quitar lotes
  ======================================== */

  const keyLote = (lote: LoteDisponible) => `${lote.lote_id}-${lote.categoria_nombre}`

  const handleAsignarLote = async (lote: LoteDisponible) => {
    if (!pedidoSeleccionado) return

    const key = keyLote(lote)
    const valor = kgAsignar[key] ?? ""
    const cantidad = Number(valor || 0)

    if (!valor || isNaN(cantidad) || cantidad <= 0) {
      alert("Ingresa una cantidad válida de kg a asignar")
      return
    }

    if (cantidad > Number(lote.saldo_disponible || 0)) {
      alert(
        `No puedes asignar más de ${Number(lote.saldo_disponible || 0).toFixed(
          2,
        )} kg disponibles en esta categoría del lote`,
      )
      return
    }

    try {
      console.log("[PedidosCrud] Asignando lote:", {
        pedido_id: pedidoSeleccionado.id,
        lote_id: lote.lote_id,
        categoria: lote.categoria_nombre,
        kg_asignado: cantidad,
      })

      await pedidosService.asignarLote({
        pedido_id: pedidoSeleccionado.id,
        lote_id: lote.lote_id,
        categoria: lote.categoria_nombre,
        kg_asignado: cantidad,
      })

      setKgAsignar((prev) => {
        const copy = { ...prev }
        delete copy[key]
        return copy
      })

      await loadLotesForPedido(pedidoSeleccionado)
    } catch (error: any) {
      console.error("[PedidosCrud] Error asignando lote:", error)
      const msg = error?.response?.data?.message || error?.message || "Error al asignar lote al pedido"
      alert(msg)
    }
  }

  const handleQuitarLote = async (lote: LoteAsignado) => {
    if (!pedidoSeleccionado) return
    if (!confirm(`¿Quitar el lote ${lote.numero_lote} (${lote.categoria}) de este pedido?`)) return

    try {
      await pedidosService.quitarLote({
        pedido_id: pedidoSeleccionado.id,
        lote_id: lote.lote_id,
        categoria: lote.categoria,
        id: lote.id, // Also pass the assignment ID for more precise deletion
      })

      await loadLotesForPedido(pedidoSeleccionado)
    } catch (error) {
      console.error("[PedidosCrud] Error quitando lote:", error)
      alert("Error al quitar lote del pedido")
    }
  }

  /* =======================================
     Filtros y stats
  ======================================== */

  const productosUnicos = Array.from(new Set(pedidos.map((p) => p.producto))).filter(Boolean)

  const filteredPedidos = pedidos.filter((pedido) => {
    const matchesSearch =
      pedido.numero_pedido?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pedido.codigo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pedido.cliente_nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pedido.producto?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesEstado = filterEstado === "todos" || pedido.estado === filterEstado
    const matchesProducto = filterProducto === "todos" || pedido.producto === filterProducto

    return matchesSearch && matchesEstado && matchesProducto
  })

  const estadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case "completado":
        return "default"
      case "proceso":
        return "secondary"
      case "pendiente":
        return "outline"
      case "cancelado":
        return "destructive"
      default:
        return "outline"
    }
  }

  const stats = {
    total: pedidos.length,
    pendiente: pedidos.filter((p) => p.estado === "pendiente").length,
    proceso: pedidos.filter((p) => p.estado === "proceso").length,
    completado: pedidos.filter((p) => p.estado === "completado").length,
    totalVentas: pedidos.reduce((sum, p) => sum + Number(p.total || 0), 0),
  }

  const selectedCliente = clientes.find((c) => c.id === formData.cliente_id)

  const totalAsignado = lotesAsignados.reduce((sum, l) => sum + Number(l.peso_asignado || 0), 0)
  const kgPedido = Number(pedidoSeleccionado?.kg_neto ?? 0)
  const kgPendiente = kgPedido > 0 ? Math.max(0, kgPedido - totalAsignado) : 0

  if (loading) {
    return <div className="flex items-center justify-center h-96">Cargando pedidos...</div>
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Pedidos</h1>
          <p className="text-muted-foreground">
            Administra los pedidos de productos, asigna lotes por categoría y prepara la mercadería para exportación /
            venta.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Pedido
        </Button>
      </div>

      {/* Resumen */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendiente}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.proceso}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completado}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/ {Number(stats.totalVentas || 0).toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, cliente o producto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex gap-2 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="proceso">En Proceso</SelectItem>
              <SelectItem value="completado">Completado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterProducto} onValueChange={setFilterProducto}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Producto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los productos</SelectItem>
              {productosUnicos.map((prod) => (
                <SelectItem key={prod} value={prod}>
                  {prod}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabla de pedidos */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Kg Bruto</TableHead>
                <TableHead className="text-right">Kg Neto</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPedidos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                    No se encontraron pedidos
                  </TableCell>
                </TableRow>
              ) : (
                filteredPedidos.map((pedido) => (
                  <TableRow key={pedido.id}>
                    <TableCell className="font-medium">{pedido.numero_pedido || pedido.codigo}</TableCell>
                    <TableCell>{pedido.cliente_nombre || `Cliente #${pedido.cliente_id}`}</TableCell>
                    <TableCell>{pedido.producto}</TableCell>
                    <TableCell>{pedido.categoria}</TableCell>
                    <TableCell className="text-right">{Number(pedido.kg_bruto ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(pedido.kg_neto ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">S/ {Number(pedido.precio ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">S/ {Number(pedido.total ?? 0).toFixed(2)}</TableCell>
                    <TableCell>
                      {pedido.fecha_pedido ? new Date(pedido.fecha_pedido).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={pedido.estado}
                        onValueChange={(value) => handleEstadoChange(pedido.id, value as Pedido["estado"])}
                      >
                        <SelectTrigger className="w-[130px]">
                          <Badge variant={estadoBadgeVariant(pedido.estado)}>{pedido.estado}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendiente">Pendiente</SelectItem>
                          <SelectItem value="proceso">En Proceso</SelectItem>
                          <SelectItem value="completado">Completado</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          title="Asignar lotes"
                          onClick={() => loadLotesForPedido(pedido)}
                        >
                          <Boxes className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(pedido)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(pedido.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog CRUD Pedido */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPedido ? "Editar Pedido" : "Nuevo Pedido"}</DialogTitle>
            <DialogDescription>
              {editingPedido ? "Modifica los datos del pedido" : "Completa la información del nuevo pedido"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Numero + Cliente */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numero_pedido">Número de Pedido</Label>
                <Input
                  id="numero_pedido"
                  value={formData.numero_pedido}
                  onChange={(e) => setFormData({ ...formData, numero_pedido: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Cliente</Label>
                <Popover open={openClienteCombo} onOpenChange={setOpenClienteCombo}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openClienteCombo}
                      className="w-full justify-between bg-transparent"
                    >
                      {selectedCliente
                        ? `${selectedCliente.nombres} ${selectedCliente.apellidos}`
                        : "Buscar cliente..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar cliente por nombre o DNI..." />
                      <CommandList>
                        <CommandEmpty>No se encontró ningún cliente.</CommandEmpty>
                        <CommandGroup>
                          {clientes.map((cliente) => (
                            <CommandItem
                              key={cliente.id}
                              value={`${cliente.nombres} ${cliente.apellidos} ${cliente.dni || cliente.documento_identidad || ""}`}
                              onSelect={() => {
                                setFormData({ ...formData, cliente_id: cliente.id })
                                setOpenClienteCombo(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.cliente_id === cliente.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col">
                                <span>
                                  {cliente.nombres} {cliente.apellidos}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  DNI: {cliente.dni || cliente.documento_identidad || "N/A"}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Producto + Categoría */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="producto">Producto</Label>
                <Input
                  id="producto"
                  value={formData.producto}
                  onChange={(e) => setFormData({ ...formData, producto: e.target.value })}
                  placeholder="Ej: Jengibre, Cúrcuma"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría (desde categorias_peso)</Label>
                <Select
                  value={formData.categoria_id ? String(formData.categoria_id) : ""}
                  onValueChange={(value) => {
                    const id = Number(value)
                    const cat = categorias.find((c) => c.id === id)
                    setFormData((prev) => ({
                      ...prev,
                      categoria_id: id,
                      categoria: cat?.nombre || "",
                      precio: prev.precio || (cat && cat.precio_kg != null ? String(cat.precio_kg) : prev.precio),
                    }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.nombre} ({cat.codigo}) — S/ {Number(cat.precio_kg ?? 0).toFixed(2)}/kg
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Kg & humedad */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kg_bruto">Kg Bruto</Label>
                <Input
                  id="kg_bruto"
                  type="number"
                  step="0.01"
                  value={formData.kg_bruto}
                  onChange={(e) => setFormData({ ...formData, kg_bruto: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="porcentaje_humedad">% Humedad</Label>
                <Input
                  id="porcentaje_humedad"
                  type="number"
                  step="0.01"
                  value={formData.porcentaje_humedad}
                  onChange={(e) => setFormData({ ...formData, porcentaje_humedad: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kg_neto">Kg Neto</Label>
                <Input id="kg_neto" type="number" step="0.01" value={formData.kg_neto} readOnly className="bg-muted" />
              </div>
            </div>

            {/* Precio & total */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="precio">Precio Unitario (S/)</Label>
                <Input
                  id="precio"
                  type="number"
                  step="0.01"
                  value={formData.precio}
                  onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total">Total (S/)</Label>
                <Input id="total" type="number" step="0.01" value={formData.total} readOnly className="bg-muted" />
              </div>
            </div>

            {/* Fecha & Estado */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha_pedido">Fecha del Pedido</Label>
                <Input
                  id="fecha_pedido"
                  type="date"
                  value={formData.fecha_pedido}
                  onChange={(e) => setFormData({ ...formData, fecha_pedido: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(value) => setFormData({ ...formData, estado: value as Pedido["estado"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="proceso">En Proceso</SelectItem>
                    <SelectItem value="completado">Completado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Observaciones */}
            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                rows={3}
                placeholder="Información adicional sobre el pedido..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editingPedido ? "Actualizar" : "Crear"} Pedido</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para asignar lotes al pedido */}
      <Dialog open={isLotesDialogOpen} onOpenChange={setIsLotesDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="space-y-1">
              <div>
                Asignar Lotes al Pedido {pedidoSeleccionado?.numero_pedido}{" "}
                {pedidoSeleccionado && (
                  <span className="text-sm text-muted-foreground">
                    ({pedidoSeleccionado.producto} - {Number(pedidoSeleccionado.kg_neto ?? 0).toFixed(2)} kg netos)
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">Pedido: {Number(kgPedido || 0).toFixed(2)} kg netos</Badge>
                <Badge variant="outline">Asignado: {Number(totalAsignado || 0).toFixed(2)} kg</Badge>
                <Badge variant={kgPendiente > 0 ? "destructive" : "default"}>
                  Pendiente: {Number(kgPendiente || 0).toFixed(2)} kg
                </Badge>
              </div>
            </DialogTitle>
            <DialogDescription>
              Selecciona lotes disponibles por categoría (según pesos clasificados) para asociarlos a este pedido. Los
              lotes se pueden usar aunque estén liquidados, hasta agotar el peso clasificado original.
            </DialogDescription>
          </DialogHeader>

          {loadingLotes ? (
            <div className="py-6 text-center text-muted-foreground">Cargando lotes...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Lotes disponibles */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <Boxes className="h-4 w-4" />
                      Lotes Disponibles
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
                  {lotesDisponibles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No hay lotes con peso clasificado disponible. Verifica que los lotes tengan pesos registrados en
                      la clasificación.
                    </p>
                  ) : (
                    lotesDisponibles.map((lote) => {
                      const key = keyLote(lote)
                      return (
                        <div key={key} className="border rounded-md px-3 py-2 flex flex-col gap-2 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="font-medium">
                                {lote.numero_lote}{" "}
                                <span className="text-xs text-muted-foreground">({lote.producto})</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="outline">{lote.categoria_nombre || "Sin categoría"}</Badge>
                                <span>Original: {Number(lote.peso_original ?? 0).toFixed(2)} kg</span>
                                <span>Disponible: {Number(lote.saldo_disponible ?? 0).toFixed(2)} kg</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              max={lote.saldo_disponible}
                              placeholder="Kg a asignar"
                              value={kgAsignar[key] ?? ""}
                              onChange={(e) =>
                                setKgAsignar((prev) => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }))
                              }
                              className="h-8"
                            />
                            <Button size="sm" onClick={() => handleAsignarLote(lote)}>
                              Asignar
                            </Button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>

              {/* Lotes asignados */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Boxes className="h-4 w-4" />
                    Lotes Asignados al Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
                  {lotesAsignados.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay lotes asignados todavía a este pedido.</p>
                  ) : (
                    lotesAsignados.map((lote) => (
                      <div
                        key={lote.id}
                        className="border rounded-md px-3 py-2 flex items-center justify-between text-sm"
                      >
                        <div>
                          <div className="font-medium">
                            {lote.numero_lote} <span className="text-xs text-muted-foreground">({lote.producto})</span>
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Badge variant="outline">{lote.categoria}</Badge>
                            <span>{Number(lote.peso_asignado ?? 0).toFixed(2)} kg asignados</span>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleQuitarLote(lote)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button type="button" onClick={() => setIsLotesDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
