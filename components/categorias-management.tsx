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
import { Search, Plus, Edit, Trash2, Package, DollarSign } from "lucide-react"
import { categoriasService } from "@/lib/services/categorias-service"
import type { Categoria } from "@/lib/types/appwrite"

export function CategoriasManagement() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [filtroGrupo, setFiltroGrupo] = useState<"todos" | "grupo1" | "grupo2">("todos")
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null)
  const [formulario, setFormulario] = useState({
    nombre: "",
    grupo: "grupo1" as "grupo1" | "grupo2",
    descripcion: "",
    unidad: "kg",
    precioReferencial: 0,
    activo: true,
    orden: 0,
  })

  useEffect(() => {
    cargarCategorias()
  }, [])

  const cargarCategorias = async () => {
    const data = await categoriasService.obtenerCategorias()
    setCategorias(data)
  }

  const categoriasFiltradas = categorias.filter((categoria) => {
    const coincideBusqueda =
      categoria.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      categoria.descripcion?.toLowerCase().includes(busqueda.toLowerCase())

    const coincideGrupo = filtroGrupo === "todos" || categoria.grupo === filtroGrupo

    return coincideBusqueda && coincideGrupo
  })

  const abrirFormulario = (categoria?: Categoria) => {
    if (categoria) {
      setCategoriaEditando(categoria)
      setFormulario({
        nombre: categoria.nombre,
        grupo: categoria.grupo,
        descripcion: categoria.descripcion || "",
        unidad: categoria.unidad,
        precioReferencial: categoria.precioReferencial || 0,
        activo: categoria.activo,
        orden: categoria.orden,
      })
    } else {
      setCategoriaEditando(null)
      setFormulario({
        nombre: "",
        grupo: "grupo1",
        descripcion: "",
        unidad: "kg",
        precioReferencial: 0,
        activo: true,
        orden: categorias.length + 1,
      })
    }
    setMostrarFormulario(true)
  }

  const guardarCategoria = async () => {
    if (categoriaEditando) {
      await categoriasService.actualizarCategoria(categoriaEditando.$id, formulario)
    } else {
      await categoriasService.crearCategoria(formulario)
    }
    await cargarCategorias()
    setMostrarFormulario(false)
  }

  const eliminarCategoria = async (id: string) => {
    if (confirm("¿Está seguro de eliminar esta categoría?")) {
      await categoriasService.eliminarCategoria(id)
      await cargarCategorias()
    }
  }

  const grupo1Count = categorias.filter((c) => c.grupo === "grupo1" && c.activo).length
  const grupo2Count = categorias.filter((c) => c.grupo === "grupo2" && c.activo).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Categorías</h1>
          <p className="text-gray-600">Administra las categorías de clasificación de productos</p>
        </div>
        <Button onClick={() => abrirFormulario()}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Categoría
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Categorías</p>
                <p className="text-2xl font-bold">{categorias.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Grupo 1 (Exportación)</p>
                <p className="text-2xl font-bold">{grupo1Count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Grupo 2 (Grado)</p>
                <p className="text-2xl font-bold">{grupo2Count}</p>
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
                placeholder="Buscar por nombre o descripción..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filtroGrupo} onValueChange={(value: any) => setFiltroGrupo(value)}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filtrar por grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los grupos</SelectItem>
                <SelectItem value="grupo1">Grupo 1 (Exportación)</SelectItem>
                <SelectItem value="grupo2">Grupo 2 (Grado)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de categorías */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Categorías ({categoriasFiltradas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Precio Ref.</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoriasFiltradas.map((categoria) => (
                <TableRow key={categoria.$id}>
                  <TableCell className="font-medium">{categoria.orden}</TableCell>
                  <TableCell className="font-medium">{categoria.nombre}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        categoria.grupo === "grupo1" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                      }
                    >
                      {categoria.grupo === "grupo1" ? "Exportación" : "Grado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{categoria.descripcion || "-"}</TableCell>
                  <TableCell>{categoria.unidad}</TableCell>
                  <TableCell>S/ {categoria.precioReferencial?.toFixed(2) || "0.00"}</TableCell>
                  <TableCell>
                    <Badge variant={categoria.activo ? "default" : "secondary"}>
                      {categoria.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => abrirFormulario(categoria)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => eliminarCategoria(categoria.$id)}
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
            <DialogTitle>{categoriaEditando ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle>
            <DialogDescription>
              {categoriaEditando ? "Modifica los datos de la categoría" : "Completa los datos de la nueva categoría"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={formulario.nombre}
                  onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })}
                  placeholder="Ej: Exportable"
                />
              </div>

              <div className="space-y-2">
                <Label>Grupo *</Label>
                <Select
                  value={formulario.grupo}
                  onValueChange={(value: any) => setFormulario({ ...formulario, grupo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grupo1">Grupo 1 (Calidad Exportación)</SelectItem>
                    <SelectItem value="grupo2">Grupo 2 (Clasificación Grado)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={formulario.descripcion}
                onChange={(e) => setFormulario({ ...formulario, descripcion: e.target.value })}
                placeholder="Descripción de la categoría..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Unidad *</Label>
                <Input
                  value={formulario.unidad}
                  onChange={(e) => setFormulario({ ...formulario, unidad: e.target.value })}
                  placeholder="kg"
                />
              </div>

              <div className="space-y-2">
                <Label>Precio Referencial</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formulario.precioReferencial}
                  onChange={(e) =>
                    setFormulario({ ...formulario, precioReferencial: Number.parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                />
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
              <Label htmlFor="activo">Categoría activa</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setMostrarFormulario(false)}>
                Cancelar
              </Button>
              <Button onClick={guardarCategoria}>Guardar Categoría</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
