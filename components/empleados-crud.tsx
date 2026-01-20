"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Edit, Trash2, Loader2, AlertCircle, Users, UserCheck, UserX, DollarSign } from "lucide-react"
import { empleadosService } from "@/lib/services/empleados-service"
import { personasService } from "@/lib/services/personas-service"
import type { Empleado, Persona } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

export function EmpleadosCrud() {
  const { toast } = useToast()
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEmpleado, setEditingEmpleado] = useState<Empleado | null>(null)
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState<string>("todos")
  const [filtroArea, setFiltroArea] = useState<string>("todos")
  const [openPersonaCombo, setOpenPersonaCombo] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    persona_id: 0,
    cargo: "",
    area: "administrativo" as "administrativo" | "campo" | "planta" | "ventas",
    sueldo: 0,
    fecha_ingreso: new Date().toISOString().split("T")[0],
    fecha_salida: "",
    estado: "activo" as "activo" | "inactivo",
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [empleadosData, personasData] = await Promise.all([empleadosService.getAll(), personasService.getAll()])
      console.log("[v0] EmpleadosCrud: Data loaded", {
        empleados: empleadosData.length,
        personas: personasData.length,
      })
      setEmpleados(empleadosData)
      setPersonas(personasData.filter((p) => p.tipo === "empleado" || p.tipo_persona === "empleado"))
    } catch (error: any) {
      console.error("[v0] EmpleadosCrud: Error loading data", error)
      toast({
        title: "Error",
        description: error.message || "Error al cargar datos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.persona_id) {
      toast({
        title: "Error",
        description: "Debe seleccionar una persona",
        variant: "destructive",
      })
      return
    }

    try {
      if (editingEmpleado) {
        await empleadosService.update(editingEmpleado.id, formData)
        toast({ title: "Éxito", description: "Empleado actualizado correctamente" })
      } else {
        await empleadosService.create(formData)
        toast({ title: "Éxito", description: "Empleado registrado correctamente" })
      }

      setDialogOpen(false)
      resetForm()
      loadData()
    } catch (error: any) {
      console.error("[v0] EmpleadosCrud: Error submitting", error)
      toast({
        title: "Error",
        description: error.message || "Error al guardar empleado",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (empleado: Empleado) => {
    setEditingEmpleado(empleado)
    setFormData({
      persona_id: empleado.persona_id,
      cargo: empleado.cargo,
      area: empleado.area,
      sueldo: empleado.sueldo || 0,
      fecha_ingreso: empleado.fecha_ingreso || new Date().toISOString().split("T")[0],
      fecha_salida: empleado.fecha_salida || "",
      estado: empleado.estado,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar este empleado?")) return

    try {
      await empleadosService.delete(id)
      toast({ title: "Éxito", description: "Empleado eliminado correctamente" })
      loadData()
    } catch (error: any) {
      console.error("[v0] EmpleadosCrud: Error deleting", error)
      toast({
        title: "Error",
        description: error.message || "Error al eliminar empleado",
        variant: "destructive",
      })
    }
  }

  const handleChangeEstado = async (id: number, estado: "activo" | "inactivo") => {
    try {
      await empleadosService.updateEstado(id, estado)
      toast({ title: "Éxito", description: "Estado actualizado correctamente" })
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al cambiar estado",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setEditingEmpleado(null)
    setFormData({
      persona_id: 0,
      cargo: "",
      area: "administrativo",
      sueldo: 0,
      fecha_ingreso: new Date().toISOString().split("T")[0],
      fecha_salida: "",
      estado: "activo",
    })
  }

  const empleadosFiltrados = empleados.filter((emp) => {
    const matchesBusqueda =
      emp.persona_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      emp.cargo?.toLowerCase().includes(busqueda.toLowerCase()) ||
      emp.area?.toLowerCase().includes(busqueda.toLowerCase())

    const matchesEstado = filtroEstado === "todos" || emp.estado === filtroEstado
    const matchesArea = filtroArea === "todos" || emp.area === filtroArea

    return matchesBusqueda && matchesEstado && matchesArea
  })

  const stats = {
    total: empleados.length,
    activos: empleados.filter((e) => e.estado === "activo").length,
    inactivos: empleados.filter((e) => e.estado === "inactivo").length,
    sueldoTotal: empleados.filter((e) => e.estado === "activo").reduce((sum, e) => sum + (e.sueldo || 0), 0),
  }

  const getEstadoBadge = (estado: string) => {
    return estado === "activo" ? (
      <Badge className="bg-green-100 text-green-800 border-green-200">Activo</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 border-red-200">Inactivo</Badge>
    )
  }

  const getAreaBadge = (area: string) => {
    const colors = {
      administrativo: "bg-blue-100 text-blue-800 border-blue-200",
      campo: "bg-green-100 text-green-800 border-green-200",
      planta: "bg-purple-100 text-purple-800 border-purple-200",
      ventas: "bg-orange-100 text-orange-800 border-orange-200",
    }
    return <Badge className={colors[area as keyof typeof colors] || ""}>{area}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando empleados...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Empleados</h2>
          <p className="text-sm text-muted-foreground">Administración completa de personal</p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setDialogOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Empleado
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Empleados</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Activos</p>
                <p className="text-2xl font-bold text-green-600">{stats.activos}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactivos</p>
                <p className="text-2xl font-bold text-red-600">{stats.inactivos}</p>
              </div>
              <UserX className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sueldos Totales</p>
                <p className="text-2xl font-bold">S/ {stats.sueldoTotal.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, cargo o área..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="activo">Activo</SelectItem>
            <SelectItem value="inactivo">Inactivo</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroArea} onValueChange={setFiltroArea}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las áreas</SelectItem>
            <SelectItem value="administrativo">Administrativo</SelectItem>
            <SelectItem value="campo">Campo</SelectItem>
            <SelectItem value="planta">Planta</SelectItem>
            <SelectItem value="ventas">Ventas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Empleados ({empleadosFiltrados.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Sueldo</TableHead>
                <TableHead>Fecha Ingreso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empleadosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No se encontraron empleados</p>
                  </TableCell>
                </TableRow>
              ) : (
                empleadosFiltrados.map((empleado) => (
                  <TableRow key={empleado.id}>
                    <TableCell className="font-medium">{empleado.id}</TableCell>
                    <TableCell>{empleado.persona_nombre}</TableCell>
                    <TableCell>{empleado.cargo}</TableCell>
                    <TableCell>{getAreaBadge(empleado.area)}</TableCell>
                    <TableCell>S/ {(empleado.sueldo || 0).toFixed(2)}</TableCell>
                    <TableCell>{empleado.fecha_ingreso}</TableCell>
                    <TableCell>
                      <Select
                        value={empleado.estado}
                        onValueChange={(value) => handleChangeEstado(empleado.id, value as "activo" | "inactivo")}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="activo">Activo</SelectItem>
                          <SelectItem value="inactivo">Inactivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(empleado)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 bg-transparent"
                          onClick={() => handleDelete(empleado.id)}
                        >
                          <Trash2 className="h-3 w-3" />
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

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmpleado ? "Editar Empleado" : "Nuevo Empleado"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Persona Combobox */}
              <div className="col-span-2">
                <Label>Persona *</Label>
                <Popover open={openPersonaCombo} onOpenChange={setOpenPersonaCombo}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openPersonaCombo}
                      className="w-full justify-between bg-transparent"
                    >
                      {formData.persona_id
                        ? personas.find((p) => p.id === formData.persona_id)?.nombre_completo ||
                          `${personas.find((p) => p.id === formData.persona_id)?.nombres} ${personas.find((p) => p.id === formData.persona_id)?.apellidos}`
                        : "Seleccionar persona..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Buscar persona..." />
                      <CommandList>
                        <CommandEmpty>No se encontraron personas.</CommandEmpty>
                        <CommandGroup>
                          {personas.map((persona) => (
                            <CommandItem
                              key={persona.id}
                              value={`${persona.nombre_completo || `${persona.nombres} ${persona.apellidos}`} ${persona.dni || persona.documento_identidad || ""}`}
                              onSelect={() => {
                                setFormData({ ...formData, persona_id: persona.id })
                                setOpenPersonaCombo(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.persona_id === persona.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              {persona.nombre_completo || `${persona.nombres} ${persona.apellidos}`}
                              {(persona.dni || persona.documento_identidad) && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  DNI: {persona.dni || persona.documento_identidad}
                                </span>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="cargo">Cargo *</Label>
                <Input
                  id="cargo"
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  required
                  placeholder="Ej: Gerente, Operario, etc."
                />
              </div>

              <div>
                <Label htmlFor="area">Área *</Label>
                <Select
                  value={formData.area}
                  onValueChange={(value) => setFormData({ ...formData, area: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                    <SelectItem value="campo">Campo</SelectItem>
                    <SelectItem value="planta">Planta</SelectItem>
                    <SelectItem value="ventas">Ventas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sueldo">Sueldo (S/)</Label>
                <Input
                  id="sueldo"
                  type="number"
                  step="0.01"
                  value={formData.sueldo}
                  onChange={(e) => setFormData({ ...formData, sueldo: Number.parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="fecha_ingreso">Fecha de Ingreso *</Label>
                <Input
                  id="fecha_ingreso"
                  type="date"
                  value={formData.fecha_ingreso}
                  onChange={(e) => setFormData({ ...formData, fecha_ingreso: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="fecha_salida">Fecha de Salida (opcional)</Label>
                <Input
                  id="fecha_salida"
                  type="date"
                  value={formData.fecha_salida}
                  onChange={(e) => setFormData({ ...formData, fecha_salida: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="estado">Estado *</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(value) => setFormData({ ...formData, estado: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editingEmpleado ? "Actualizar" : "Registrar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
