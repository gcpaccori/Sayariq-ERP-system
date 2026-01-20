"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Edit, Trash2, DollarSign, Factory, Home, AlertTriangle, TrendingUp, Calculator } from "lucide-react"

interface CostoBase {
  id: string
  nombre: string
  descripcion: string
  categoria: string
  subcategoria: string
  monto: number
  moneda: "USD" | "PEN"
  fechaCreacion: string
  fechaVigencia: string
  fechaVencimiento?: string
  activo: boolean
  observaciones: string
}

interface CostoFijo extends CostoBase {
  tipo: "fijo"
  frecuencia: "mensual" | "trimestral" | "semestral" | "anual"
  proveedor?: string
  numeroFactura?: string
  centroCosto: string
  esRecurrente: boolean
}

interface CostoVariable extends CostoBase {
  tipo: "variable"
  unidadMedida: string
  costoPorUnidad: number
  volumenMinimo?: number
  volumenMaximo?: number
  proveedor?: string
  tiempoEntrega: number
}

interface CostoProceso extends CostoBase {
  tipo: "proceso"
  procesoId: string
  procesoNombre: string
  costoPorKg: number
  costoPorHora?: number
  costoPorLote?: number
  equiposRequeridos: string[]
  personalRequerido: number
  tiempoEstimado: number
}

interface CostoMerma extends CostoBase {
  tipo: "merma"
  procesoId: string
  procesoNombre: string
  porcentajeMerma: number
  valorPerdido: number
  causas: string[]
  medicionPor: "peso" | "volumen" | "unidades"
}

type Costo = CostoFijo | CostoVariable | CostoProceso | CostoMerma

const categoriasCostosFijos = [
  { id: "personal", nombre: "Personal", subcategorias: ["Sueldos", "Beneficios", "Capacitación", "Seguros"] },
  { id: "infraestructura", nombre: "Infraestructura", subcategorias: ["Alquiler", "Mantenimiento", "Seguridad"] },
  { id: "servicios", nombre: "Servicios", subcategorias: ["Luz", "Agua", "Gas", "Internet", "Teléfono"] },
  { id: "administrativos", nombre: "Administrativos", subcategorias: ["Contabilidad", "Legal", "Bancarios"] },
  { id: "seguros", nombre: "Seguros", subcategorias: ["Responsabilidad Civil", "Incendio", "Robo"] },
]

const categoriasVariables = [
  { id: "materias-primas", nombre: "Materias Primas", subcategorias: ["Kion", "Cúrcuma", "Insumos"] },
  { id: "insumos", nombre: "Insumos", subcategorias: ["Empaques", "Etiquetas", "Químicos", "Combustible"] },
  { id: "transporte", nombre: "Transporte", subcategorias: ["Combustible", "Mantenimiento", "Peajes"] },
  { id: "servicios-variables", nombre: "Servicios Variables", subcategorias: ["Laboratorio", "Certificaciones"] },
]

const procesosProduccion = [
  { id: "recepcion", nombre: "Recepción MP" },
  { id: "lavado", nombre: "Lavado y Limpieza" },
  { id: "procesamiento", nombre: "Procesamiento" },
  { id: "deshidratado", nombre: "Deshidratado" },
  { id: "molido", nombre: "Molido" },
  { id: "empaquetado", nombre: "Empaquetado" },
  { id: "control-calidad", nombre: "Control de Calidad" },
  { id: "almacenamiento", nombre: "Almacenamiento" },
]

export function CostosManagement() {
  const [costos, setCostos] = useState<Costo[]>([])
  const [showModal, setShowModal] = useState(false)
  const [tipoCosteSeleccionado, setTipoCosteSeleccionado] = useState<"fijo" | "variable" | "proceso" | "merma">("fijo")
  const [editingCosto, setEditingCosto] = useState<Costo | null>(null)
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todos")
  const [filtroTipo, setFiltroTipo] = useState<string>("todos")

  const [nuevoCosto, setNuevoCosto] = useState<Partial<Costo>>({
    nombre: "",
    descripcion: "",
    categoria: "",
    subcategoria: "",
    monto: 0,
    moneda: "PEN",
    fechaVigencia: "",
    activo: true,
    observaciones: "",
  })

  const resetForm = () => {
    setNuevoCosto({
      nombre: "",
      descripcion: "",
      categoria: "",
      subcategoria: "",
      monto: 0,
      moneda: "PEN",
      fechaVigencia: "",
      activo: true,
      observaciones: "",
    })
    setEditingCosto(null)
  }

  const handleSaveCosto = () => {
    if (!nuevoCosto.nombre || !nuevoCosto.categoria) return

    const costoBase = {
      id: editingCosto?.id || `costo-${Date.now()}`,
      nombre: nuevoCosto.nombre || "",
      descripcion: nuevoCosto.descripcion || "",
      categoria: nuevoCosto.categoria || "",
      subcategoria: nuevoCosto.subcategoria || "",
      monto: nuevoCosto.monto || 0,
      moneda: nuevoCosto.moneda || "PEN",
      fechaCreacion: editingCosto?.fechaCreacion || new Date().toISOString().split("T")[0],
      fechaVigencia: nuevoCosto.fechaVigencia || "",
      activo: nuevoCosto.activo ?? true,
      observaciones: nuevoCosto.observaciones || "",
    }

    let costo: Costo

    switch (tipoCosteSeleccionado) {
      case "fijo":
        costo = {
          ...costoBase,
          tipo: "fijo",
          frecuencia: (nuevoCosto as any).frecuencia || "mensual",
          proveedor: (nuevoCosto as any).proveedor,
          centroCosto: (nuevoCosto as any).centroCosto || "",
          esRecurrente: (nuevoCosto as any).esRecurrente ?? true,
        } as CostoFijo
        break
      case "variable":
        costo = {
          ...costoBase,
          tipo: "variable",
          unidadMedida: (nuevoCosto as any).unidadMedida || "",
          costoPorUnidad: (nuevoCosto as any).costoPorUnidad || 0,
          proveedor: (nuevoCosto as any).proveedor,
          tiempoEntrega: (nuevoCosto as any).tiempoEntrega || 0,
        } as CostoVariable
        break
      case "proceso":
        costo = {
          ...costoBase,
          tipo: "proceso",
          procesoId: (nuevoCosto as any).procesoId || "",
          procesoNombre: (nuevoCosto as any).procesoNombre || "",
          costoPorKg: (nuevoCosto as any).costoPorKg || 0,
          costoPorHora: (nuevoCosto as any).costoPorHora,
          costoPorLote: (nuevoCosto as any).costoPorLote,
          equiposRequeridos: (nuevoCosto as any).equiposRequeridos || [],
          personalRequerido: (nuevoCosto as any).personalRequerido || 1,
          tiempoEstimado: (nuevoCosto as any).tiempoEstimado || 0,
        } as CostoProceso
        break
      case "merma":
        costo = {
          ...costoBase,
          tipo: "merma",
          procesoId: (nuevoCosto as any).procesoId || "",
          procesoNombre: (nuevoCosto as any).procesoNombre || "",
          porcentajeMerma: (nuevoCosto as any).porcentajeMerma || 0,
          valorPerdido: (nuevoCosto as any).valorPerdido || 0,
          causas: (nuevoCosto as any).causas || [],
          medicionPor: (nuevoCosto as any).medicionPor || "peso",
        } as CostoMerma
        break
    }

    if (editingCosto) {
      setCostos((prev) => prev.map((c) => (c.id === editingCosto.id ? costo : c)))
    } else {
      setCostos((prev) => [...prev, costo])
    }

    setShowModal(false)
    resetForm()
  }

  const handleEditCosto = (costo: Costo) => {
    setEditingCosto(costo)
    setTipoCosteSeleccionado(costo.tipo)
    setNuevoCosto(costo)
    setShowModal(true)
  }

  const handleDeleteCosto = (id: string) => {
    setCostos((prev) => prev.filter((c) => c.id !== id))
  }

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "fijo":
        return <Home className="h-4 w-4 text-blue-500" />
      case "variable":
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case "proceso":
        return <Factory className="h-4 w-4 text-purple-500" />
      case "merma":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <DollarSign className="h-4 w-4" />
    }
  }

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case "fijo":
        return "bg-blue-500/10 text-blue-500"
      case "variable":
        return "bg-green-500/10 text-green-500"
      case "proceso":
        return "bg-purple-500/10 text-purple-500"
      case "merma":
        return "bg-red-500/10 text-red-500"
      default:
        return "bg-gray-500/10 text-gray-500"
    }
  }

  const costosFiltrados = costos.filter((costo) => {
    const filtroTipoMatch = filtroTipo === "todos" || costo.tipo === filtroTipo
    const filtroCategoriaMatch = filtroCategoria === "todos" || costo.categoria === filtroCategoria
    return filtroTipoMatch && filtroCategoriaMatch
  })

  const calcularTotalPorTipo = (tipo: string) => {
    return costos.filter((c) => c.tipo === tipo && c.activo).reduce((total, c) => total + c.monto, 0)
  }

  return (
    <div className="space-y-6">
      {/* Resumen de Costos */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Costos Fijos</p>
              <p className="text-2xl font-bold">S/ {calcularTotalPorTipo("fijo").toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Costos Variables</p>
              <p className="text-2xl font-bold">S/ {calcularTotalPorTipo("variable").toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">Costos de Proceso</p>
              <p className="text-2xl font-bold">S/ {calcularTotalPorTipo("proceso").toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">Costos por Mermas</p>
              <p className="text-2xl font-bold">S/ {calcularTotalPorTipo("merma").toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Controles */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div>
            <Label>Filtrar por Tipo</Label>
            <select
              className="w-40 p-2 border rounded-md bg-background"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="fijo">Costos Fijos</option>
              <option value="variable">Costos Variables</option>
              <option value="proceso">Costos de Proceso</option>
              <option value="merma">Costos por Mermas</option>
            </select>
          </div>
          <div>
            <Label>Filtrar por Categoría</Label>
            <select
              className="w-40 p-2 border rounded-md bg-background"
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
            >
              <option value="todos">Todas</option>
              <option value="personal">Personal</option>
              <option value="infraestructura">Infraestructura</option>
              <option value="servicios">Servicios</option>
              <option value="materias-primas">Materias Primas</option>
              <option value="insumos">Insumos</option>
            </select>
          </div>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Costo
        </Button>
      </div>

      {/* Tabla de Costos */}
      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Vigencia</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {costosFiltrados.map((costo) => (
              <TableRow key={costo.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getTipoIcon(costo.tipo)}
                    <Badge className={getTipoColor(costo.tipo)}>{costo.tipo}</Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{costo.nombre}</div>
                    <div className="text-xs text-muted-foreground">{costo.descripcion}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{costo.categoria}</div>
                    <div className="text-xs text-muted-foreground">{costo.subcategoria}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    {costo.moneda} {costo.monto.toLocaleString()}
                  </div>
                  {costo.tipo === "variable" && (
                    <div className="text-xs text-muted-foreground">Por {(costo as CostoVariable).unidadMedida}</div>
                  )}
                  {costo.tipo === "proceso" && (
                    <div className="text-xs text-muted-foreground">Por kg: S/ {(costo as CostoProceso).costoPorKg}</div>
                  )}
                  {costo.tipo === "merma" && (
                    <div className="text-xs text-muted-foreground">{(costo as CostoMerma).porcentajeMerma}% merma</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">{costo.fechaVigencia}</div>
                  {costo.tipo === "fijo" && (
                    <div className="text-xs text-muted-foreground">{(costo as CostoFijo).frecuencia}</div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={costo.activo ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}>
                    {costo.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEditCosto(costo)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDeleteCosto(costo.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Modal para Nuevo/Editar Costo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">{editingCosto ? "Editar Costo" : "Nuevo Costo"}</h2>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                >
                  ×
                </Button>
              </div>

              {/* Selector de Tipo de Costo */}
              <div className="mb-6">
                <Label>Tipo de Costo</Label>
                <div className="grid grid-cols-4 gap-4 mt-2">
                  {[
                    { tipo: "fijo", label: "Costo Fijo", icon: Home, desc: "Sueldos, alquiler, servicios" },
                    { tipo: "variable", label: "Costo Variable", icon: TrendingUp, desc: "Materias primas, insumos" },
                    { tipo: "proceso", label: "Costo de Proceso", icon: Factory, desc: "Por etapa productiva" },
                    { tipo: "merma", label: "Costo por Merma", icon: AlertTriangle, desc: "Pérdidas y desperdicios" },
                  ].map(({ tipo, label, icon: Icon, desc }) => (
                    <Card
                      key={tipo}
                      className={`p-4 cursor-pointer transition-colors ${
                        tipoCosteSeleccionado === tipo ? "border-primary bg-primary/5" : ""
                      }`}
                      onClick={() => setTipoCosteSeleccionado(tipo as any)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Formulario Dinámico según Tipo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Información Básica */}
                <div className="space-y-4">
                  <h3 className="font-medium">Información Básica</h3>
                  <div>
                    <Label htmlFor="nombre">Nombre del Costo *</Label>
                    <Input
                      id="nombre"
                      value={nuevoCosto.nombre}
                      onChange={(e) => setNuevoCosto((prev) => ({ ...prev, nombre: e.target.value }))}
                      placeholder="ej: Sueldo Gerente General"
                    />
                  </div>
                  <div>
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea
                      id="descripcion"
                      value={nuevoCosto.descripcion}
                      onChange={(e) => setNuevoCosto((prev) => ({ ...prev, descripcion: e.target.value }))}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="categoria">Categoría *</Label>
                      <select
                        className="w-full p-2 border rounded-md bg-background"
                        value={nuevoCosto.categoria}
                        onChange={(e) => setNuevoCosto((prev) => ({ ...prev, categoria: e.target.value }))}
                      >
                        <option value="">Seleccionar</option>
                        {tipoCosteSeleccionado === "fijo" &&
                          categoriasCostosFijos.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.nombre}
                            </option>
                          ))}
                        {tipoCosteSeleccionado === "variable" &&
                          categoriasVariables.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.nombre}
                            </option>
                          ))}
                        {(tipoCosteSeleccionado === "proceso" || tipoCosteSeleccionado === "merma") && (
                          <option value="produccion">Producción</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="subcategoria">Subcategoría</Label>
                      <select
                        className="w-full p-2 border rounded-md bg-background"
                        value={nuevoCosto.subcategoria}
                        onChange={(e) => setNuevoCosto((prev) => ({ ...prev, subcategoria: e.target.value }))}
                      >
                        <option value="">Seleccionar</option>
                        {tipoCosteSeleccionado === "fijo" &&
                          categoriasCostosFijos
                            .find((cat) => cat.id === nuevoCosto.categoria)
                            ?.subcategorias.map((sub) => (
                              <option key={sub} value={sub}>
                                {sub}
                              </option>
                            ))}
                        {tipoCosteSeleccionado === "variable" &&
                          categoriasVariables
                            .find((cat) => cat.id === nuevoCosto.categoria)
                            ?.subcategorias.map((sub) => (
                              <option key={sub} value={sub}>
                                {sub}
                              </option>
                            ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="monto">Monto *</Label>
                      <Input
                        id="monto"
                        type="number"
                        step="0.01"
                        value={nuevoCosto.monto}
                        onChange={(e) =>
                          setNuevoCosto((prev) => ({ ...prev, monto: Number.parseFloat(e.target.value) || 0 }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="moneda">Moneda</Label>
                      <select
                        className="w-full p-2 border rounded-md bg-background"
                        value={nuevoCosto.moneda}
                        onChange={(e) =>
                          setNuevoCosto((prev) => ({ ...prev, moneda: e.target.value as "USD" | "PEN" }))
                        }
                      >
                        <option value="PEN">PEN (Soles)</option>
                        <option value="USD">USD (Dólares)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Información Específica por Tipo */}
                <div className="space-y-4">
                  <h3 className="font-medium">Información Específica</h3>

                  {/* Costos Fijos */}
                  {tipoCosteSeleccionado === "fijo" && (
                    <>
                      <div>
                        <Label htmlFor="frecuencia">Frecuencia de Pago</Label>
                        <select
                          className="w-full p-2 border rounded-md bg-background"
                          value={(nuevoCosto as any).frecuencia || "mensual"}
                          onChange={(e) => setNuevoCosto((prev) => ({ ...prev, frecuencia: e.target.value }))}
                        >
                          <option value="mensual">Mensual</option>
                          <option value="trimestral">Trimestral</option>
                          <option value="semestral">Semestral</option>
                          <option value="anual">Anual</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="centroCosto">Centro de Costo</Label>
                        <select
                          className="w-full p-2 border rounded-md bg-background"
                          value={(nuevoCosto as any).centroCosto || ""}
                          onChange={(e) => setNuevoCosto((prev) => ({ ...prev, centroCosto: e.target.value }))}
                        >
                          <option value="">Seleccionar</option>
                          <option value="administracion">Administración</option>
                          <option value="produccion">Producción</option>
                          <option value="ventas">Ventas</option>
                          <option value="logistica">Logística</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="proveedor">Proveedor</Label>
                        <Input
                          id="proveedor"
                          value={(nuevoCosto as any).proveedor || ""}
                          onChange={(e) => setNuevoCosto((prev) => ({ ...prev, proveedor: e.target.value }))}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="esRecurrente"
                          checked={(nuevoCosto as any).esRecurrente ?? true}
                          onCheckedChange={(checked) =>
                            setNuevoCosto((prev) => ({ ...prev, esRecurrente: checked as boolean }))
                          }
                        />
                        <Label htmlFor="esRecurrente">Es recurrente</Label>
                      </div>
                    </>
                  )}

                  {/* Costos Variables */}
                  {tipoCosteSeleccionado === "variable" && (
                    <>
                      <div>
                        <Label htmlFor="unidadMedida">Unidad de Medida</Label>
                        <select
                          className="w-full p-2 border rounded-md bg-background"
                          value={(nuevoCosto as any).unidadMedida || ""}
                          onChange={(e) => setNuevoCosto((prev) => ({ ...prev, unidadMedida: e.target.value }))}
                        >
                          <option value="">Seleccionar</option>
                          <option value="kg">Kilogramos</option>
                          <option value="litros">Litros</option>
                          <option value="unidades">Unidades</option>
                          <option value="metros">Metros</option>
                          <option value="horas">Horas</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="costoPorUnidad">Costo por Unidad</Label>
                        <Input
                          id="costoPorUnidad"
                          type="number"
                          step="0.01"
                          value={(nuevoCosto as any).costoPorUnidad || 0}
                          onChange={(e) =>
                            setNuevoCosto((prev) => ({
                              ...prev,
                              costoPorUnidad: Number.parseFloat(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="volumenMinimo">Volumen Mínimo</Label>
                          <Input
                            id="volumenMinimo"
                            type="number"
                            value={(nuevoCosto as any).volumenMinimo || ""}
                            onChange={(e) =>
                              setNuevoCosto((prev) => ({
                                ...prev,
                                volumenMinimo: Number.parseFloat(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="volumenMaximo">Volumen Máximo</Label>
                          <Input
                            id="volumenMaximo"
                            type="number"
                            value={(nuevoCosto as any).volumenMaximo || ""}
                            onChange={(e) =>
                              setNuevoCosto((prev) => ({
                                ...prev,
                                volumenMaximo: Number.parseFloat(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="tiempoEntrega">Tiempo de Entrega (días)</Label>
                        <Input
                          id="tiempoEntrega"
                          type="number"
                          value={(nuevoCosto as any).tiempoEntrega || 0}
                          onChange={(e) =>
                            setNuevoCosto((prev) => ({ ...prev, tiempoEntrega: Number.parseInt(e.target.value) || 0 }))
                          }
                        />
                      </div>
                    </>
                  )}

                  {/* Costos de Proceso */}
                  {tipoCosteSeleccionado === "proceso" && (
                    <>
                      <div>
                        <Label htmlFor="procesoId">Proceso</Label>
                        <select
                          className="w-full p-2 border rounded-md bg-background"
                          value={(nuevoCosto as any).procesoId || ""}
                          onChange={(e) => {
                            const proceso = procesosProduccion.find((p) => p.id === e.target.value)
                            setNuevoCosto((prev) => ({
                              ...prev,
                              procesoId: e.target.value,
                              procesoNombre: proceso?.nombre || "",
                            }))
                          }}
                        >
                          <option value="">Seleccionar Proceso</option>
                          {procesosProduccion.map((proceso) => (
                            <option key={proceso.id} value={proceso.id}>
                              {proceso.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="costoPorKg">Costo por Kg</Label>
                          <Input
                            id="costoPorKg"
                            type="number"
                            step="0.01"
                            value={(nuevoCosto as any).costoPorKg || 0}
                            onChange={(e) =>
                              setNuevoCosto((prev) => ({ ...prev, costoPorKg: Number.parseFloat(e.target.value) || 0 }))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="costoPorHora">Costo por Hora</Label>
                          <Input
                            id="costoPorHora"
                            type="number"
                            step="0.01"
                            value={(nuevoCosto as any).costoPorHora || ""}
                            onChange={(e) =>
                              setNuevoCosto((prev) => ({
                                ...prev,
                                costoPorHora: Number.parseFloat(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="costoPorLote">Costo por Lote</Label>
                          <Input
                            id="costoPorLote"
                            type="number"
                            step="0.01"
                            value={(nuevoCosto as any).costoPorLote || ""}
                            onChange={(e) =>
                              setNuevoCosto((prev) => ({
                                ...prev,
                                costoPorLote: Number.parseFloat(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="personalRequerido">Personal Requerido</Label>
                          <Input
                            id="personalRequerido"
                            type="number"
                            value={(nuevoCosto as any).personalRequerido || 1}
                            onChange={(e) =>
                              setNuevoCosto((prev) => ({
                                ...prev,
                                personalRequerido: Number.parseInt(e.target.value) || 1,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="tiempoEstimado">Tiempo Estimado (horas)</Label>
                          <Input
                            id="tiempoEstimado"
                            type="number"
                            step="0.5"
                            value={(nuevoCosto as any).tiempoEstimado || 0}
                            onChange={(e) =>
                              setNuevoCosto((prev) => ({
                                ...prev,
                                tiempoEstimado: Number.parseFloat(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Costos por Merma */}
                  {tipoCosteSeleccionado === "merma" && (
                    <>
                      <div>
                        <Label htmlFor="procesoMerma">Proceso donde ocurre la merma</Label>
                        <select
                          className="w-full p-2 border rounded-md bg-background"
                          value={(nuevoCosto as any).procesoId || ""}
                          onChange={(e) => {
                            const proceso = procesosProduccion.find((p) => p.id === e.target.value)
                            setNuevoCosto((prev) => ({
                              ...prev,
                              procesoId: e.target.value,
                              procesoNombre: proceso?.nombre || "",
                            }))
                          }}
                        >
                          <option value="">Seleccionar Proceso</option>
                          {procesosProduccion.map((proceso) => (
                            <option key={proceso.id} value={proceso.id}>
                              {proceso.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="porcentajeMerma">Porcentaje de Merma (%)</Label>
                          <Input
                            id="porcentajeMerma"
                            type="number"
                            step="0.1"
                            max="100"
                            value={(nuevoCosto as any).porcentajeMerma || 0}
                            onChange={(e) =>
                              setNuevoCosto((prev) => ({
                                ...prev,
                                porcentajeMerma: Number.parseFloat(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="valorPerdido">Valor Perdido por Kg</Label>
                          <Input
                            id="valorPerdido"
                            type="number"
                            step="0.01"
                            value={(nuevoCosto as any).valorPerdido || 0}
                            onChange={(e) =>
                              setNuevoCosto((prev) => ({
                                ...prev,
                                valorPerdido: Number.parseFloat(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="medicionPor">Medición por</Label>
                        <select
                          className="w-full p-2 border rounded-md bg-background"
                          value={(nuevoCosto as any).medicionPor || "peso"}
                          onChange={(e) => setNuevoCosto((prev) => ({ ...prev, medicionPor: e.target.value }))}
                        >
                          <option value="peso">Peso</option>
                          <option value="volumen">Volumen</option>
                          <option value="unidades">Unidades</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div>
                    <Label htmlFor="fechaVigencia">Fecha de Vigencia</Label>
                    <Input
                      id="fechaVigencia"
                      type="date"
                      value={nuevoCosto.fechaVigencia}
                      onChange={(e) => setNuevoCosto((prev) => ({ ...prev, fechaVigencia: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="observaciones">Observaciones</Label>
                    <Textarea
                      id="observaciones"
                      value={nuevoCosto.observaciones}
                      onChange={(e) => setNuevoCosto((prev) => ({ ...prev, observaciones: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveCosto}>
                  <Calculator className="h-4 w-4 mr-2" />
                  {editingCosto ? "Actualizar" : "Guardar"} Costo
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
