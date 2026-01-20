"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { bancoService } from "@/lib/services/banco-service"
import { personasService } from "@/lib/services/personas-service"
import type { TransaccionBanco, Persona } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Plus,
  Edit,
  Trash2,
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  Check,
  ChevronsUpDown,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function LibroBancoCrud() {
  const { toast } = useToast()
  const [transacciones, setTransacciones] = useState<TransaccionBanco[]>([])
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentTransaccion, setCurrentTransaccion] = useState<TransaccionBanco | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState<string>("todos")
  const [filterRubro, setFilterRubro] = useState<string>("todos")
  const [openAgricultorCombo, setOpenAgricultorCombo] = useState(false)
  const [agricultorSearch, setAgricultorSearch] = useState("")

  // Form state
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split("T")[0],
    operacion: "",
    de_quien: "",
    a_quien: "",
    motivo: "",
    rubro: "campo",
    tipo_operacion: "pago",
    numero_operacion: "",
    comprobante: "",
    deudor: "0.00",
    acreedor: "0.00",
    estado: "pendiente" as const,
    agricultor: "",
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [transaccionesData, personasData] = await Promise.all([bancoService.getAll(), personasService.getAll()])
      console.log("[v0] Libro Banco - Datos cargados:", { transaccionesData, personasData })
      setTransacciones(transaccionesData)
      setPersonas(personasData)
    } catch (error) {
      console.error("[v0] Error al cargar datos:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del libro banco",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Filtrar agricultores (productores)
  const agricultores = useMemo(() => {
    return personas.filter((p) => {
      const esProductor =
        p.tipo === "productor" ||
        p.tipo_persona?.toLowerCase() === "productor" ||
        p.roles?.some((r) => r.toLowerCase() === "productor")

      if (!esProductor) return false

      if (!agricultorSearch) return true

      const search = agricultorSearch.toLowerCase()
      const nombre = (p.nombre_completo || `${p.nombres} ${p.apellidos}`).toLowerCase()
      const dni = (p.dni || p.numero_documento || "").toLowerCase()

      return nombre.includes(search) || dni.includes(search)
    })
  }, [personas, agricultorSearch])

  const handleOpenDialog = (transaccion?: TransaccionBanco) => {
    if (transaccion) {
      setIsEditing(true)
      setCurrentTransaccion(transaccion)
      setFormData({
        fecha: transaccion.fecha,
        operacion: transaccion.operacion,
        de_quien: transaccion.de_quien,
        a_quien: transaccion.a_quien,
        motivo: transaccion.motivo,
        rubro: transaccion.rubro,
        tipo_operacion: transaccion.tipo_operacion,
        numero_operacion: transaccion.numero_operacion,
        comprobante: transaccion.comprobante,
        deudor: String(transaccion.deudor),
        acreedor: String(transaccion.acreedor),
        estado: transaccion.estado,
        agricultor: transaccion.agricultor || "",
      })
    } else {
      setIsEditing(false)
      setCurrentTransaccion(null)
      setFormData({
        fecha: new Date().toISOString().split("T")[0],
        operacion: "",
        de_quien: "",
        a_quien: "",
        motivo: "",
        rubro: "campo",
        tipo_operacion: "pago",
        numero_operacion: "",
        comprobante: "",
        deudor: "0.00",
        acreedor: "0.00",
        estado: "pendiente",
        agricultor: "",
      })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const dataToSend = {
        ...formData,
        deudor: Number.parseFloat(formData.deudor) || 0,
        acreedor: Number.parseFloat(formData.acreedor) || 0,
      }

      if (isEditing && currentTransaccion) {
        await bancoService.update(currentTransaccion.id, dataToSend)
        toast({
          title: "Éxito",
          description: "Transacción actualizada correctamente",
        })
      } else {
        await bancoService.create(dataToSend)
        toast({
          title: "Éxito",
          description: "Transacción registrada correctamente",
        })
      }

      setIsDialogOpen(false)
      loadData()
    } catch (error) {
      console.error("[v0] Error al guardar transacción:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar la transacción",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar esta transacción?")) return

    try {
      await bancoService.delete(id)
      toast({
        title: "Éxito",
        description: "Transacción eliminada correctamente",
      })
      loadData()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la transacción",
        variant: "destructive",
      })
    }
  }

  const handleChangeEstado = async (id: number, nuevoEstado: string) => {
    try {
      await bancoService.updateEstado(id, nuevoEstado)
      toast({
        title: "Éxito",
        description: "Estado actualizado correctamente",
      })
      loadData()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      })
    }
  }

  // Filtrar transacciones
  const transaccionesFiltradas = useMemo(() => {
    return transacciones.filter((t) => {
      const matchSearch =
        !searchTerm ||
        t.operacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.de_quien.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.a_quien.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.numero_operacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.comprobante.toLowerCase().includes(searchTerm.toLowerCase())

      const matchEstado = filterEstado === "todos" || t.estado === filterEstado
      const matchRubro = filterRubro === "todos" || t.rubro === filterRubro

      return matchSearch && matchEstado && matchRubro
    })
  }, [transacciones, searchTerm, filterEstado, filterRubro])

  // Calcular estadísticas
  const stats = useMemo(() => {
    const totalIngresos = transacciones.reduce((sum, t) => sum + Number.parseFloat(String(t.acreedor)), 0)
    const totalEgresos = transacciones.reduce((sum, t) => sum + Number.parseFloat(String(t.deudor)), 0)
    const saldo = totalIngresos - totalEgresos

    return {
      totalIngresos,
      totalEgresos,
      saldo,
      totalTransacciones: transacciones.length,
    }
  }, [transacciones])

  const getEstadoBadge = (estado: string) => {
    const variants = {
      pendiente: "default",
      proceso: "secondary",
      completado: "default",
      cancelado: "destructive",
    } as const

    const icons = {
      pendiente: Clock,
      proceso: Clock,
      completado: CheckCircle2,
      cancelado: XCircle,
    }

    const Icon = icons[estado as keyof typeof icons] || Clock

    return (
      <Badge variant={variants[estado as keyof typeof variants] || "default"}>
        <Icon className="mr-1 h-3 w-3" />
        {estado}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando libro banco...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ingresos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">S/. {stats.totalIngresos.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Egresos</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">S/. {stats.totalEgresos.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", stats.saldo >= 0 ? "text-blue-600" : "text-red-600")}>
              S/. {stats.saldo.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Operaciones</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransacciones}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y acciones */}
      <Card>
        <CardHeader>
          <CardTitle>Libro Banco</CardTitle>
          <CardDescription>Gestión completa de transacciones bancarias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por operación, persona, número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="proceso">En Proceso</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterRubro} onValueChange={setFilterRubro}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Rubro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="campo">Campo</SelectItem>
                  <SelectItem value="ventas">Ventas</SelectItem>
                  <SelectItem value="gastos">Gastos</SelectItem>
                  <SelectItem value="otros">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Transacción
            </Button>
          </div>

          {/* Tabla */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>N° Operación</TableHead>
                  <TableHead>Operación</TableHead>
                  <TableHead>De Quien</TableHead>
                  <TableHead>A Quien</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Rubro</TableHead>
                  <TableHead className="text-right">Debe</TableHead>
                  <TableHead className="text-right">Haber</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transaccionesFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground">
                      No hay transacciones registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  transaccionesFiltradas.map((transaccion) => (
                    <TableRow key={transaccion.id}>
                      <TableCell>{new Date(transaccion.fecha).toLocaleDateString()}</TableCell>
                      <TableCell className="font-mono text-sm">{transaccion.numero_operacion}</TableCell>
                      <TableCell>{transaccion.operacion}</TableCell>
                      <TableCell>{transaccion.de_quien}</TableCell>
                      <TableCell>{transaccion.a_quien}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{transaccion.motivo}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{transaccion.rubro}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {Number.parseFloat(String(transaccion.deudor)) > 0
                          ? `S/. ${Number.parseFloat(String(transaccion.deudor)).toFixed(2)}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {Number.parseFloat(String(transaccion.acreedor)) > 0
                          ? `S/. ${Number.parseFloat(String(transaccion.acreedor)).toFixed(2)}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={transaccion.estado}
                          onValueChange={(value) => handleChangeEstado(transaccion.id, value)}
                        >
                          <SelectTrigger className="w-[140px]">{getEstadoBadge(transaccion.estado)}</SelectTrigger>
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
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(transaccion)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(transaccion.id)}>
                            <Trash2 className="h-4 w-4" />
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

      {/* Dialog para crear/editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Transacción" : "Nueva Transacción"}</DialogTitle>
            <DialogDescription>Complete los datos de la transacción bancaria</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha *</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero_operacion">N° Operación *</Label>
                <Input
                  id="numero_operacion"
                  value={formData.numero_operacion}
                  onChange={(e) => setFormData({ ...formData, numero_operacion: e.target.value })}
                  placeholder="OP-001"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="operacion">Operación *</Label>
              <Input
                id="operacion"
                value={formData.operacion}
                onChange={(e) => setFormData({ ...formData, operacion: e.target.value })}
                placeholder="Ej: Pago a productor, Venta de producto, etc."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="de_quien">De Quien *</Label>
                <Input
                  id="de_quien"
                  value={formData.de_quien}
                  onChange={(e) => setFormData({ ...formData, de_quien: e.target.value })}
                  placeholder="Nombre de quien envía"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="a_quien">A Quien *</Label>
                <Input
                  id="a_quien"
                  value={formData.a_quien}
                  onChange={(e) => setFormData({ ...formData, a_quien: e.target.value })}
                  placeholder="Nombre de quien recibe"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agricultor">Agricultor (Opcional)</Label>
              <Popover open={openAgricultorCombo} onOpenChange={setOpenAgricultorCombo}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openAgricultorCombo}
                    className="w-full justify-between bg-transparent"
                  >
                    {formData.agricultor || "Seleccionar agricultor..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput
                      placeholder="Buscar agricultor por nombre o DNI..."
                      value={agricultorSearch}
                      onValueChange={setAgricultorSearch}
                    />
                    <CommandList>
                      <CommandEmpty>No se encontraron agricultores.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value=""
                          onSelect={() => {
                            setFormData({ ...formData, agricultor: "" })
                            setOpenAgricultorCombo(false)
                          }}
                        >
                          <Check
                            className={cn("mr-2 h-4 w-4", (!formData.agricultor && "opacity-100") || "opacity-0")}
                          />
                          (Ninguno)
                        </CommandItem>
                        {agricultores.map((agricultor) => {
                          const nombre = agricultor.nombre_completo || `${agricultor.nombres} ${agricultor.apellidos}`
                          const dni = agricultor.dni || agricultor.numero_documento || ""
                          return (
                            <CommandItem
                              key={agricultor.id}
                              value={nombre}
                              onSelect={() => {
                                setFormData({ ...formData, agricultor: nombre })
                                setOpenAgricultorCombo(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.agricultor === nombre ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{nombre}</span>
                                {dni && <span className="text-xs text-muted-foreground">DNI: {dni}</span>}
                              </div>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo *</Label>
              <Textarea
                id="motivo"
                value={formData.motivo}
                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                placeholder="Descripción del motivo de la transacción"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rubro">Rubro *</Label>
                <Select value={formData.rubro} onValueChange={(value) => setFormData({ ...formData, rubro: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="campo">Campo</SelectItem>
                    <SelectItem value="ventas">Ventas</SelectItem>
                    <SelectItem value="gastos">Gastos</SelectItem>
                    <SelectItem value="otros">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo_operacion">Tipo Operación *</Label>
                <Select
                  value={formData.tipo_operacion}
                  onValueChange={(value) => setFormData({ ...formData, tipo_operacion: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="adelanto">Adelanto</SelectItem>
                    <SelectItem value="venta">Venta</SelectItem>
                    <SelectItem value="compra">Compra</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="otros">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comprobante">Comprobante *</Label>
                <Input
                  id="comprobante"
                  value={formData.comprobante}
                  onChange={(e) => setFormData({ ...formData, comprobante: e.target.value })}
                  placeholder="COMP-001"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deudor">Debe (Egreso) *</Label>
                <Input
                  id="deudor"
                  type="number"
                  step="0.01"
                  value={formData.deudor}
                  onChange={(e) => setFormData({ ...formData, deudor: e.target.value, acreedor: "0.00" })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="acreedor">Haber (Ingreso) *</Label>
                <Input
                  id="acreedor"
                  type="number"
                  step="0.01"
                  value={formData.acreedor}
                  onChange={(e) => setFormData({ ...formData, acreedor: e.target.value, deudor: "0.00" })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado *</Label>
              <Select
                value={formData.estado}
                onValueChange={(value: any) => setFormData({ ...formData, estado: value })}
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{isEditing ? "Actualizar" : "Crear"} Transacción</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
