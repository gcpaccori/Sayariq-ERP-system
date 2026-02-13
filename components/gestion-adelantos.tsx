"use client"

import type React from "react"
import { useState, useMemo } from "react"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, DollarSign, TrendingUp, TrendingDown, Clock, AlertCircle, Edit, Trash2, Search, Users } from "lucide-react"
import { useAdelantos } from "@/lib/hooks/use-adelantos"
import { usePersonas } from "@/lib/hooks/use-personas"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { NuevoAdelanto } from "@/lib/services/adelantos-service"
import { useToast } from "@/components/ui/use-toast"

export function GestionAdelantos() {
  const { toast } = useToast()
  const { data: adelantos, loading: loadingAdelantos, error: errorAdelantos, create, refresh } = useAdelantos()
  const { data: personas, loading: loadingPersonas, error: errorPersonas } = usePersonas()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [filtroProductor, setFiltroProductor] = useState<string>("todos")
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState<Partial<NuevoAdelanto>>({
    productor_id: 0,
    productor_nombre: "",
    monto_original: 0,
    concepto: "",
    fecha_adelanto: new Date().toISOString().split("T")[0],
  })
  const [editFormData, setEditFormData] = useState<{
    concepto: string
    monto_original: number
  }>({ concepto: "", monto_original: 0 })

  const personasArray = Array.isArray(personas) ? personas : []
  const productores = personasArray.filter(
    (p) => p.tipo === "productor" && (p.activo !== false && p.estado !== "inactivo"),
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.productor_id || !formData.monto_original || !formData.concepto) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    try {
      await create(formData as NuevoAdelanto)
      toast({
        title: "Éxito",
        description: "Adelanto creado correctamente",
      })
      setIsDialogOpen(false)
      setFormData({
        productor_id: 0,
        productor_nombre: "",
        monto_original: 0,
        concepto: "",
        fecha_adelanto: new Date().toISOString().split("T")[0],
      })
    } catch (error) {
      console.error("Error creating adelanto:", error)
      toast({
        title: "Error",
        description: "No se pudo crear el adelanto",
        variant: "destructive",
      })
    }
  }

  const handleProductorChange = (productorId: string) => {
    const productor = productores.find((p) => String(p.id) === productorId)
    setFormData((prev) => ({
      ...prev,
      productor_id: Number(productorId),
      productor_nombre: productor ? `${productor.nombres} ${productor.apellidos}` : "",
    }))
  }

  const handleEditAdelanto = (adelanto: { id: number; concepto: string; monto_original: number; estado: string }) => {
    if (adelanto.estado === "descontado-total") {
      toast({ title: "No editable", description: "Este adelanto ya fue descontado completamente", variant: "destructive" })
      return
    }
    setEditingId(adelanto.id)
    setEditFormData({ concepto: adelanto.concepto, monto_original: adelanto.monto_original })
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    try {
      const response = await fetch(`/api/proxy/adelantos/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concepto: editFormData.concepto }),
      })
      if (!response.ok) throw new Error("Error al actualizar")
      toast({ title: "Éxito", description: "Adelanto actualizado correctamente" })
      setIsEditDialogOpen(false)
      setEditingId(null)
      refresh()
    } catch (error) {
      console.error("Error updating adelanto:", error)
      toast({ title: "Error", description: "No se pudo actualizar el adelanto", variant: "destructive" })
    }
  }

  const handleDeleteAdelanto = async (id: number, estado: string) => {
    if (estado !== "pendiente") {
      toast({ title: "No eliminable", description: "Solo se pueden eliminar adelantos pendientes", variant: "destructive" })
      return
    }
    try {
      const response = await fetch(`/api/proxy/adelantos/${id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Error al eliminar")
      toast({ title: "Éxito", description: "Adelanto eliminado correctamente" })
      refresh()
    } catch (error) {
      console.error("Error deleting adelanto:", error)
      toast({ title: "Error", description: "No se pudo eliminar el adelanto", variant: "destructive" })
    }
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente
          </Badge>
        )
      case "descontado-parcial":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            <TrendingDown className="w-3 h-3 mr-1" />
            Parcial
          </Badge>
        )
      case "descontado-total":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <TrendingUp className="w-3 h-3 mr-1" />
            Completado
          </Badge>
        )
      default:
        return <Badge variant="secondary">{estado}</Badge>
    }
  }

  const adelantosArray = Array.isArray(adelantos) ? adelantos : []

  const adelantosFiltrados = useMemo(() => {
    let filtered = adelantosArray
    if (filtroProductor !== "todos") {
      filtered = filtered.filter((a) => String(a.productor_id) === filtroProductor)
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (a) =>
          a.productor_nombre?.toLowerCase().includes(term) ||
          a.concepto?.toLowerCase().includes(term),
      )
    }
    return filtered
  }, [adelantosArray, filtroProductor, searchTerm])

  const stats = {
    total: adelantosFiltrados.length,
    pendientes: adelantosFiltrados.filter((a) => a.estado === "pendiente").length,
    parciales: adelantosFiltrados.filter((a) => a.estado === "descontado-parcial").length,
    completados: adelantosFiltrados.filter((a) => a.estado === "descontado-total").length,
    montoTotal: adelantosFiltrados.reduce((sum, a) => sum + Number(a.monto_original || 0), 0),
    saldoPendiente: adelantosFiltrados.reduce((sum, a) => sum + Number(a.saldo_pendiente || 0), 0),
  }

  const productorSeleccionado = filtroProductor !== "todos"
    ? productores.find((p) => String(p.id) === filtroProductor)
    : null

  const saldoProductor = useMemo(() => {
    if (!productorSeleccionado) return null
    const adelantosProductor = adelantosArray.filter((a) => String(a.productor_id) === filtroProductor)
    return {
      total_adelantos: adelantosProductor.reduce((s, a) => s + Number(a.monto_original || 0), 0),
      total_descontado: adelantosProductor.reduce((s, a) => s + Number(a.monto_descontado || 0), 0),
      saldo_pendiente: adelantosProductor.reduce((s, a) => s + Number(a.saldo_pendiente || 0), 0),
      adelantos_activos: adelantosProductor.filter((a) => a.estado !== "descontado-total").length,
    }
  }, [adelantosArray, filtroProductor, productorSeleccionado])

  const isLoading = loadingAdelantos || loadingPersonas
  const hasError = errorAdelantos || errorPersonas

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Cargando adelantos...</p>
        </div>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive">Error: {errorAdelantos || errorPersonas}</p>
          <Button onClick={refresh} className="mt-2">
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Adelantos</h1>
          <p className="text-muted-foreground">Administra los adelantos otorgados a productores</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Adelanto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Adelanto</DialogTitle>
              <DialogDescription>Registra un nuevo adelanto para un productor</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="productor">Productor *</Label>
                  <Select value={formData.productor_id ? String(formData.productor_id) : ""} onValueChange={handleProductorChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar productor" />
                    </SelectTrigger>
                    <SelectContent>
                      {productores.map((productor) => (
                        <SelectItem key={productor.id} value={String(productor.id)}>
                          {productor.nombres} {productor.apellidos}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="monto">Monto (S/) *</Label>
                  <Input
                    id="monto"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={formData.monto_original || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, monto_original: Number.parseFloat(e.target.value) || 0 }))
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fecha">Fecha *</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={formData.fecha_adelanto}
                    onChange={(e) => setFormData((prev) => ({ ...prev, fecha_adelanto: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="concepto">Concepto *</Label>
                  <Textarea
                    id="concepto"
                    placeholder="Describe el motivo del adelanto..."
                    value={formData.concepto}
                    onChange={(e) => setFormData((prev) => ({ ...prev, concepto: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Crear Adelanto</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Buscar</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por productor o concepto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-64">
              <Label className="text-xs text-muted-foreground">Filtrar por Productor</Label>
              <Select value={filtroProductor} onValueChange={setFiltroProductor}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Todos los productores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los productores</SelectItem>
                  {productores.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nombres} {p.apellidos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance del Productor Seleccionado */}
      {saldoProductor && productorSeleccionado && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Balance de {productorSeleccionado.nombres} {productorSeleccionado.apellidos}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Adelantos</p>
                <p className="text-lg font-bold">S/ {saldoProductor.total_adelantos.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Descontado</p>
                <p className="text-lg font-bold text-green-600">S/ {saldoProductor.total_descontado.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Saldo Pendiente</p>
                <p className="text-lg font-bold text-orange-600">S/ {saldoProductor.saldo_pendiente.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Adelantos Activos</p>
                <p className="text-lg font-bold">{saldoProductor.adelantos_activos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Adelantos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">S/ {stats.montoTotal.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendientes}</div>
            <p className="text-xs text-muted-foreground">Sin descuentos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parciales</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.parciales}</div>
            <p className="text-xs text-muted-foreground">Con descuentos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Pendiente</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/ {stats.saldoPendiente.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Por descontar</p>
          </CardContent>
        </Card>
      </div>

      {/* Adelantos Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Adelantos</CardTitle>
          <CardDescription>
            {filtroProductor !== "todos"
              ? `Mostrando adelantos de ${productorSeleccionado?.nombres} ${productorSeleccionado?.apellidos}`
              : "Historial completo de adelantos registrados"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {adelantosFiltrados.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay adelantos registrados</p>
              <p className="text-sm text-muted-foreground">Crea el primer adelanto usando el botón &quot;Nuevo Adelanto&quot;</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Productor</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Monto Original</TableHead>
                  <TableHead className="text-right">Descontado</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adelantosFiltrados.map((adelanto) => (
                  <TableRow key={adelanto.id}>
                    <TableCell>{format(new Date(adelanto.fecha_adelanto), "dd/MM/yyyy", { locale: es })}</TableCell>
                    <TableCell className="font-medium">{adelanto.productor_nombre}</TableCell>
                    <TableCell className="max-w-xs truncate">{adelanto.concepto}</TableCell>
                    <TableCell className="text-right font-semibold">S/ {Number(adelanto.monto_original).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-green-600">S/ {Number(adelanto.monto_descontado).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold text-orange-600">
                      S/ {Number(adelanto.saldo_pendiente).toLocaleString()}
                    </TableCell>
                    <TableCell>{getEstadoBadge(adelanto.estado)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditAdelanto(adelanto)}
                          disabled={adelanto.estado === "descontado-total"}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteAdelanto(adelanto.id, adelanto.estado)}
                          className="text-red-600 hover:text-red-700"
                          disabled={adelanto.estado !== "pendiente"}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Adelanto</DialogTitle>
            <DialogDescription>Modifica el concepto del adelanto</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Concepto</Label>
              <Textarea
                value={editFormData.concepto}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, concepto: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
