"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, Edit, Trash2, AlertTriangle, Activity } from "lucide-react"
import { enfermedadesService } from "@/lib/services/enfermedades-service"
import type { Enfermedad } from "@/lib/types/appwrite"

export function EnfermedadesManagement() {
  const [enfermedades, setEnfermedades] = useState<Enfermedad[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [filtroSeveridad, setFiltroSeveridad] = useState<"todos" | "baja" | "media" | "alta">("todos")
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [enfermedadEditando, setEnfermedadEditando] = useState<Enfermedad | null>(null)
  const [formulario, setFormulario] = useState({
    nombre: "",
    nombreCientifico: "",
    descripcion: "",
    severidad: "media" as "baja" | "media" | "alta",
    impactoEnGrado: "" as "" | "exportable" | "industrial" | "nacional" | "descarte",
    activo: true,
    orden: 0,
  })

  useEffect(() => {
    cargarEnfermedades()
  }, [])

  const cargarEnfermedades = async () => {
    const data = await enfermedadesService.obtenerEnfermedades()
    setEnfermedades(data)
  }

  const enfermedadesFiltradas = enfermedades.filter((enfermedad) => {
    const coincideBusqueda =
      enfermedad.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      enfermedad.nombreCientifico?.toLowerCase().includes(busqueda.toLowerCase()) ||
      enfermedad.descripcion?.toLowerCase().includes(busqueda.toLowerCase())

    const coincideSeveridad = filtroSeveridad === "todos" || enfermedad.severidad === filtroSeveridad

    return coincideBusqueda && coincideSeveridad
  })

  const abrirFormulario = (enfermedad?: Enfermedad) => {
    if (enfermedad) {
      setEnfermedadEditando(enfermedad)
      setFormulario({
        nombre: enfermedad.nombre,
        nombreCientifico: enfermedad.nombreCientifico || "",
        descripcion: enfermedad.descripcion || "",
        severidad: enfermedad.severidad,
        impactoEnGrado: enfermedad.impactoEnGrado || "",
        activo: enfermedad.activo,
        orden: enfermedad.orden,
      })
    } else {
      setEnfermedadEditando(null)
      setFormulario({
        nombre: "",
        nombreCientifico: "",
        descripcion: "",
        severidad: "media",
        impactoEnGrado: "",
        activo: true,
        orden: enfermedades.length + 1,
      })
    }
    setMostrarFormulario(true)
  }

  const guardarEnfermedad = async () => {
    const data = {
      ...formulario,
      impactoEnGrado: formulario.impactoEnGrado || undefined,
    }

    if (enfermedadEditando) {
      await enfermedadesService.actualizarEnfermedad(enfermedadEditando.$id, data)
    } else {
      await enfermedadesService.crearEnfermedad(data)
    }
    await cargarEnfermedades()
    setMostrarFormulario(false)
  }

  const eliminarEnfermedad = async (id: string) => {
    if (confirm("¿Está seguro de eliminar esta enfermedad?")) {
      await enfermedadesService.eliminarEnfermedad(id)
      await cargarEnfermedades()
    }
  }

  const getSeveridadColor = (severidad: string) => {
    switch (severidad) {
      case "alta":
        return "bg-red-100 text-red-800"
      case "media":
        return "bg-yellow-100 text-yellow-800"
      case "baja":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const altaCount = enfermedades.filter((e) => e.severidad === "alta" && e.activo).length
  const mediaCount = enfermedades.filter((e) => e.severidad === "media" && e.activo).length
  const bajaCount = enfermedades.filter((e) => e.severidad === "baja" && e.activo).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Enfermedades</h1>
          <p className="text-gray-600">Administra el catálogo de enfermedades y defectos</p>
        </div>
        <Button onClick={() => abrirFormulario()}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Enfermedad
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Enfermedades</p>
                <p className="text-2xl font-bold">{enfermedades.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Severidad Alta</p>
                <p className="text-2xl font-bold">{altaCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Severidad Media</p>
                <p className="text-2xl font-bold">{mediaCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Severidad Baja</p>
                <p className="text-2xl font-bold">{bajaCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, nombre científico o descripción..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filtroSeveridad} onValueChange={(value: any) => setFiltroSeveridad(value)}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filtrar por severidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las severidades</SelectItem>
                <SelectItem value="alta">Severidad Alta</SelectItem>
                <SelectItem value="media">Severidad Media</SelectItem>
                <SelectItem value="baja">Severidad Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de enfermedades */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Enfermedades ({enfermedadesFiltradas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Nombre Científico</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Severidad</TableHead>
                <TableHead>Impacto en Grado</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enfermedadesFiltradas.map((enfermedad) => (
                <TableRow key={enfermedad.$id}>
                  <TableCell className="font-medium">{enfermedad.orden}</TableCell>
                  <TableCell className="font-medium">{enfermedad.nombre}</TableCell>
                  <TableCell className="italic text-sm">{enfermedad.nombreCientifico || "-"}</TableCell>
                  <TableCell className="max-w-xs truncate">{enfermedad.descripcion || "-"}</TableCell>
                  <TableCell>
                    <Badge className={getSeveridadColor(enfermedad.severidad)}>
                      {enfermedad.severidad.charAt(0).toUpperCase() + enfermedad.severidad.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {enfermedad.impactoEnGrado ? <Badge variant="outline">{enfermedad.impactoEnGrado}</Badge> : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={enfermedad.activo ? "default" : "secondary"}>
                      {enfermedad.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => abrirFormulario(enfermedad)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => eliminarEnfermedad(enfermedad.$id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de formulario */}
      <Dialog open={mostrarFormulario} onOpenChange={setMostrarFormulario}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{enfermedadEditando ? "Editar Enfermedad" : "Nueva Enfermedad"}</DialogTitle>
            <DialogDescription>
              {enfermedadEditando ? "Modifica los datos de la enfermedad" : "Completa los datos de la nueva enfermedad"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={formulario.nombre}
                  onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })}
                  placeholder="Ej: Pudrición Bacteriana"
                />
              </div>

              <div className="space-y-2">
                <Label>Nombre Científico</Label>
                <Input
                  value={formulario.nombreCientifico}
                  onChange={(e) => setFormulario({ ...formulario, nombreCientifico: e.target.value })}
                  placeholder="Ej: Erwinia carotovora"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={formulario.descripcion}
                onChange={(e) => setFormulario({ ...formulario, descripcion: e.target.value })}
                placeholder="Descripción de la enfermedad..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Severidad *</Label>
                <Select
                  value={formulario.severidad}
                  onValueChange={(value: any) => setFormulario({ ...formulario, severidad: value })}
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

              <div className="space-y-2">
                <Label>Impacto en Grado</Label>
                <Select
                  value={formulario.impactoEnGrado}
                  onValueChange={(value: any) => setFormulario({ ...formulario, impactoEnGrado: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ninguno">Ninguno</SelectItem>
                    <SelectItem value="exportable">Exportable</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                    <SelectItem value="nacional">Nacional</SelectItem>
                    <SelectItem value="descarte">Descarte</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Orden</Label>
                <Input
                  type="number"
                  value={formulario.orden}
                  onChange={(e) => setFormulario({ ...formulario, orden: Number.parseInt(e.target.value) || 0 })}
                  placeholder="1"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="activo"
                checked={formulario.activo}
                onChange={(e) => setFormulario({ ...formulario, activo: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="activo">Enfermedad activa</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setMostrarFormulario(false)}>
                Cancelar
              </Button>
              <Button onClick={guardarEnfermedad}>Guardar Enfermedad</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
