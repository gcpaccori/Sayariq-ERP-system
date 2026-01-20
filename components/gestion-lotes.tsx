"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Plus, AlertCircle, Eye, Search, X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { lotesService } from "@/lib/services/lotes-service"
import { useApi } from "@/lib/hooks/use-api"
import { usePersonas } from "@/lib/hooks/use-personas"
import type { Lote, Persona } from "@/lib/types"
import { format } from "date-fns"
import { es } from "date-fns/locale"

/**
 * Devuelve 0 si el valor no es un número finito.
 * Si es un número válido lo formatea con la cantidad de decimales indicada.
 */
function safeNumber(value: number | undefined | null, decimals = 2): string {
  return Number.isFinite(value as number)
    ? (value as number).toFixed(decimals)
    : "0".padEnd(decimals ? decimals + 2 : 1, "0")
}

export function GestionLotes() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("todos")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null)
  const [isDetalleOpen, setIsDetalleOpen] = useState(false)
  const [formData, setFormData] = useState({
    codigo: "",
    productor_id: 0,
    producto: "",
    variedad: "",
    fecha_recepcion: format(new Date(), "yyyy-MM-dd"),
    numero_jabas: 0,
    peso_bruto: 0,
    precio_kg: 0,
    observaciones: "",
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredLotes, setFilteredLotes] = useState<Lote[]>([])

  const [productorBusqueda, setProductorBusqueda] = useState("")
  const [mostrarResultados, setMostrarResultados] = useState(false)
  const [productorSeleccionado, setProductorSeleccionado] = useState<Persona | null>(null)

  // Cargar lotes usando el nuevo sistema API
  const {
    data: lotes,
    loading: loadingLotes,
    error: errorLotes,
    create: createLote,
    refresh: refreshLotes,
  } = useApi(lotesService, { initialLoad: true })

  // Cargar productores
  const { data: productores, loading: loadingProductores } = usePersonas(true)

  // Filtrar lotes según la pestaña activa
  useEffect(() => {
    if (lotes.length > 0) {
      let filtered = [...lotes]

      // Filtrar por término de búsqueda
      if (searchTerm) {
        filtered = filtered.filter(
          (lote) =>
            lote.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lote.producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lote.variedad?.toLowerCase().includes(searchTerm.toLowerCase()),
        )
      }

      // Filtrar por estado
      if (activeTab !== "todos") {
        filtered = filtered.filter((lote) => lote.estado === activeTab)
      }

      setFilteredLotes(filtered)
    } else {
      setFilteredLotes([])
    }
  }, [lotes, activeTab, searchTerm])

  // Filtrar productores basado en la búsqueda
  const productoresFiltrados = productores
    .filter((p) => p.roles?.includes("productor"))
    .filter((p) => {
      const searchTerm = productorBusqueda.toLowerCase()
      return (
        p.nombre.toLowerCase().includes(searchTerm) ||
        p.apellidos?.toLowerCase().includes(searchTerm) ||
        p.numero_documento.includes(searchTerm) ||
        `${p.nombre} ${p.apellidos}`.toLowerCase().includes(searchTerm)
      )
    })
    .slice(0, 5) // Limitar a 5 resultados

  const seleccionarProductor = (productor: Persona) => {
    setProductorSeleccionado(productor)
    setFormData((prev) => ({ ...prev, productor_id: productor.id }))
    setProductorBusqueda(`${productor.nombre} ${productor.apellidos}`)
    setMostrarResultados(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "numero_jabas" || name === "peso_bruto" || name === "precio_kg"
          ? Number.parseFloat(value) || 0
          : value,
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!productorSeleccionado) {
        toast({
          title: "Error",
          description: "Debe seleccionar un productor",
          variant: "destructive",
        })
        return
      }

      if (!formData.producto) {
        toast({
          title: "Error",
          description: "Debe ingresar un producto",
          variant: "destructive",
        })
        return
      }

      if (formData.numero_jabas <= 0) {
        toast({
          title: "Error",
          description: "El número de jabas debe ser mayor a 0",
          variant: "destructive",
        })
        return
      }

      await createLote({
        codigo: formData.codigo,
        productor_id: productorSeleccionado.id,
        producto: formData.producto,
        variedad: formData.variedad,
        fecha_recepcion: formData.fecha_recepcion,
        numero_jabas: formData.numero_jabas,
        peso_bruto: formData.peso_bruto,
        peso_neto: formData.peso_bruto, // Inicialmente igual al bruto
        precio_kg: formData.precio_kg,
        estado: "pendiente",
        observaciones: formData.observaciones,
      } as Omit<Lote, "id" | "created_at" | "updated_at">)

      toast({
        title: "Lote creado",
        description: `El lote ${formData.codigo} ha sido creado exitosamente`,
      })

      setIsDialogOpen(false)
      setFormData({
        codigo: "",
        productor_id: 0,
        producto: "",
        variedad: "",
        fecha_recepcion: format(new Date(), "yyyy-MM-dd"),
        numero_jabas: 0,
        peso_bruto: 0,
        precio_kg: 0,
        observaciones: "",
      })
      setProductorSeleccionado(null)
      setProductorBusqueda("")
    } catch (error) {
      console.error("Error al crear lote:", error)
      toast({
        title: "Error",
        description: "No se pudo crear el lote. Intente nuevamente.",
        variant: "destructive",
      })
    }
  }

  const verDetalle = (lote: Lote) => {
    setSelectedLote(lote)
    setIsDetalleOpen(true)
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return <Badge className="bg-green-500">Disponible</Badge>
      case "proceso":
        return <Badge className="bg-yellow-500">En Proceso</Badge>
      case "completado":
        return <Badge className="bg-blue-500">Completado</Badge>
      case "liquidado":
        return <Badge className="bg-gray-500">Liquidado</Badge>
      default:
        return <Badge className="bg-gray-500">{estado}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: es })
    } catch (error) {
      return dateString
    }
  }

  if (loadingLotes && lotes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Cargando lotes...</span>
      </div>
    )
  }

  if (errorLotes) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Error al cargar los lotes</h3>
        <p className="text-gray-600 mb-4">{errorLotes}</p>
        <Button onClick={refreshLotes}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Lotes</h2>
          <p className="text-muted-foreground">Administre los lotes de productos recibidos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Lote
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Lote</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código de Lote</Label>
                <Input id="codigo" name="codigo" value={formData.codigo} onChange={handleInputChange} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="productorBusqueda">Proveedor *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="productorBusqueda"
                    value={productorBusqueda}
                    onChange={(e) => {
                      setProductorBusqueda(e.target.value)
                      setMostrarResultados(true)
                    }}
                    onFocus={() => setMostrarResultados(true)}
                    className="pl-10"
                    placeholder="Buscar proveedor..."
                    autoComplete="off"
                  />
                  {mostrarResultados && productorBusqueda && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {productoresFiltrados.length > 0 ? (
                        productoresFiltrados.map((productor) => (
                          <div
                            key={productor.id}
                            className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                            onClick={() => seleccionarProductor(productor)}
                          >
                            <div className="font-medium">
                              {productor.nombre} {productor.apellidos}
                            </div>
                            <div className="text-sm text-gray-500">{productor.numero_documento}</div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-gray-500 text-center">No se encontraron proveedores</div>
                      )}
                    </div>
                  )}
                </div>
                {productorSeleccionado && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-green-800">
                          {productorSeleccionado.nombre} {productorSeleccionado.apellidos}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setProductorSeleccionado(null)
                          setFormData((prev) => ({ ...prev, productor_id: 0 }))
                          setProductorBusqueda("")
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="producto">Producto</Label>
                  <Select
                    name="producto"
                    value={formData.producto}
                    onValueChange={(value) => handleSelectChange("producto", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jengibre">Jengibre</SelectItem>
                      <SelectItem value="curcuma">Cúrcuma</SelectItem>
                      <SelectItem value="kion">Kion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="variedad">Variedad</Label>
                  <Input id="variedad" name="variedad" value={formData.variedad} onChange={handleInputChange} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha_recepcion">Fecha de Recepción</Label>
                <Input
                  id="fecha_recepcion"
                  name="fecha_recepcion"
                  type="date"
                  value={formData.fecha_recepcion}
                  onChange={handleInputChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero_jabas">Número de Jabas</Label>
                  <Input
                    id="numero_jabas"
                    name="numero_jabas"
                    type="number"
                    min="1"
                    value={formData.numero_jabas || ""}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="peso_bruto">Peso Bruto (kg)</Label>
                  <Input
                    id="peso_bruto"
                    name="peso_bruto"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.peso_bruto || ""}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="precio_kg">Precio por KG (opcional)</Label>
                <Input
                  id="precio_kg"
                  name="precio_kg"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.precio_kg || ""}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  name="observaciones"
                  value={formData.observaciones}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Guardar Lote</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between">
          <Tabs defaultValue="todos" value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="pendiente">Pendientes</TabsTrigger>
              <TabsTrigger value="proceso">En Proceso</TabsTrigger>
              <TabsTrigger value="completado">Completados</TabsTrigger>
              <TabsTrigger value="liquidado">Liquidados</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="w-[300px]">
            <Input
              placeholder="Buscar por código, producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Lotes Registrados</CardTitle>
            <CardDescription>
              {filteredLotes.length} {filteredLotes.length === 1 ? "lote encontrado" : "lotes encontrados"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Jabas</TableHead>
                  <TableHead>Peso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      No hay lotes registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLotes.map((lote) => (
                    <TableRow key={lote.id}>
                      <TableCell className="font-medium">{lote.codigo}</TableCell>
                      <TableCell>
                        {lote.producto} {lote.variedad ? `(${lote.variedad})` : ""}
                      </TableCell>
                      <TableCell>{formatDate(lote.fecha_recepcion)}</TableCell>
                      <TableCell>{lote.numero_jabas}</TableCell>
                      <TableCell>{safeNumber(lote.peso_neto, 1)} kg</TableCell>
                      <TableCell>{getEstadoBadge(lote.estado)}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="icon" onClick={() => verDetalle(lote)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Detalle del Lote */}
      <Dialog open={isDetalleOpen} onOpenChange={setIsDetalleOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalle del Lote</DialogTitle>
          </DialogHeader>
          {selectedLote && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Código:</span>
                  <span className="font-medium">{selectedLote.codigo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Producto:</span>
                  <span className="font-medium">
                    {selectedLote.producto} {selectedLote.variedad ? `(${selectedLote.variedad})` : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha de Recepción:</span>
                  <span className="font-medium">{formatDate(selectedLote.fecha_recepcion)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Jabas:</span>
                  <span className="font-medium">{selectedLote.numero_jabas}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Peso Neto:</span>
                  <span className="font-medium">{safeNumber(selectedLote.peso_neto, 2)} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estado:</span>
                  <span>{getEstadoBadge(selectedLote.estado)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
