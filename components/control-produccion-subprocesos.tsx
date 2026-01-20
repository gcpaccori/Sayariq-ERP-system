"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Eye,
  BarChart3,
  TrendingUp,
  Package,
  Award,
  Zap,
  Factory,
  AlertTriangle,
  Trophy,
  Medal,
  Star,
  Edit,
  Save,
  X,
} from "lucide-react"

// Tipos de datos
interface ProcesoActivo {
  id: string
  pedido: string
  cliente: string
  fechaInicio: string
  operacionesCompletadas: number
  operacionesTotales: number
  pesoTotal: number
  estado: "en-proceso" | "completado" | "pausado"
  eficiencia: number
  operaciones: string[]
}

interface DetalleProduccion {
  categoria: string
  pesoObjetivo: number
  pesoReal: number
  porcentaje: number
  lotes: string[]
  esObjetivoPrincipal: boolean
}

interface LoteCalidad {
  lote: string
  proveedor: string
  pesoInicial: number
  pesoFinal: number
  eficiencia: number
  calidad: "excelente" | "buena" | "regular" | "deficiente"
  categorias: {
    primera: number
    segunda: number
    tercera: number
    descarte: number
  }
}

interface RegistroProduccion {
  operacion: string
  pesoInicial: number
  pesoFinal: number
  merma: number
  observaciones: string
  responsable: string
  fechaRegistro: string
  categorias: {
    primera: number
    segunda: number
    tercera: number
    descarte: number
  }
}

// Datos mock
const procesosActivos: ProcesoActivo[] = [
  {
    id: "PROC-001",
    pedido: "PED-001",
    cliente: "Exportadora Lima",
    fechaInicio: "2024-01-20",
    operacionesCompletadas: 4,
    operacionesTotales: 6,
    pesoTotal: 2500,
    estado: "en-proceso",
    eficiencia: 87,
    operaciones: ["lavado", "perfilado", "empaque"],
  },
  {
    id: "PROC-002",
    pedido: "PED-002",
    cliente: "Mercado Central",
    fechaInicio: "2024-01-19",
    operacionesCompletadas: 6,
    operacionesTotales: 6,
    pesoTotal: 1800,
    estado: "completado",
    eficiencia: 92,
    operaciones: ["lavado", "secado"],
  },
  {
    id: "PROC-003",
    pedido: "PED-003",
    cliente: "Supermercados Norte",
    fechaInicio: "2024-01-21",
    operacionesCompletadas: 2,
    operacionesTotales: 5,
    pesoTotal: 3200,
    estado: "en-proceso",
    eficiencia: 78,
    operaciones: ["lavado", "perfilado", "desinfeccion", "secado", "empaque"],
  },
]

const detallesProduccion: Record<string, DetalleProduccion[]> = {
  "PROC-001": [
    {
      categoria: "Primera",
      pesoObjetivo: 1500,
      pesoReal: 1420,
      porcentaje: 94.7,
      lotes: ["L001", "L003", "L005"],
      esObjetivoPrincipal: true,
    },
    {
      categoria: "Segunda",
      pesoObjetivo: 0,
      pesoReal: 750,
      porcentaje: 0,
      lotes: ["L002", "L004"],
      esObjetivoPrincipal: false,
    },
    {
      categoria: "Tercera",
      pesoObjetivo: 0,
      pesoReal: 180,
      porcentaje: 0,
      lotes: ["L006"],
      esObjetivoPrincipal: false,
    },
    {
      categoria: "Descarte",
      pesoObjetivo: 0,
      pesoReal: 150,
      porcentaje: 0,
      lotes: ["L007"],
      esObjetivoPrincipal: false,
    },
  ],
  "PROC-002": [
    {
      categoria: "Primera",
      pesoObjetivo: 1200,
      pesoReal: 1280,
      porcentaje: 106.7,
      lotes: ["L008", "L009"],
      esObjetivoPrincipal: true,
    },
    {
      categoria: "Segunda",
      pesoObjetivo: 0,
      pesoReal: 380,
      porcentaje: 0,
      lotes: ["L010"],
      esObjetivoPrincipal: false,
    },
    {
      categoria: "Tercera",
      pesoObjetivo: 0,
      pesoReal: 120,
      porcentaje: 0,
      lotes: ["L011"],
      esObjetivoPrincipal: false,
    },
    {
      categoria: "Descarte",
      pesoObjetivo: 0,
      pesoReal: 20,
      porcentaje: 0,
      lotes: ["L012"],
      esObjetivoPrincipal: false,
    },
  ],
}

const lotesCalidad: Record<string, LoteCalidad[]> = {
  "PROC-001": [
    {
      lote: "L001",
      proveedor: "Juan Pérez",
      pesoInicial: 500,
      pesoFinal: 480,
      eficiencia: 96,
      calidad: "excelente",
      categorias: { primera: 400, segunda: 60, tercera: 15, descarte: 5 },
    },
    {
      lote: "L002",
      proveedor: "María García",
      pesoInicial: 450,
      pesoFinal: 420,
      eficiencia: 93,
      calidad: "buena",
      categorias: { primera: 300, segunda: 80, tercera: 30, descarte: 10 },
    },
    {
      lote: "L003",
      proveedor: "Carlos López",
      pesoInicial: 600,
      pesoFinal: 580,
      eficiencia: 97,
      calidad: "excelente",
      categorias: { primera: 480, segunda: 70, tercera: 20, descarte: 10 },
    },
  ],
  "PROC-002": [
    {
      lote: "L008",
      proveedor: "Ana Rodríguez",
      pesoInicial: 800,
      pesoFinal: 760,
      eficiencia: 95,
      calidad: "excelente",
      categorias: { primera: 650, segunda: 80, tercera: 25, descarte: 5 },
    },
    {
      lote: "L009",
      proveedor: "Pedro Martín",
      pesoInicial: 700,
      pesoFinal: 650,
      eficiencia: 93,
      calidad: "buena",
      categorias: { primera: 520, segunda: 90, tercera: 30, descarte: 10 },
    },
  ],
}

export function ControlProduccionSubprocesos() {
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<string | null>(null)
  const [modalDetalles, setModalDetalles] = useState(false)
  const [modalAnalisis, setModalAnalisis] = useState(false)
  const [modalRegistro, setModalRegistro] = useState(false)
  const [operacionActual, setOperacionActual] = useState("")
  const [registroProduccion, setRegistroProduccion] = useState<RegistroProduccion>({
    operacion: "",
    pesoInicial: 0,
    pesoFinal: 0,
    merma: 0,
    observaciones: "",
    responsable: "",
    fechaRegistro: new Date().toISOString().split("T")[0],
    categorias: {
      primera: 0,
      segunda: 0,
      tercera: 0,
      descarte: 0,
    },
  })
  const [editandoDetalle, setEditandoDetalle] = useState<string | null>(null)
  const [detallesEditados, setDetallesEditados] = useState<Record<string, DetalleProduccion>>({})

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "en-proceso":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">En Proceso</Badge>
      case "completado":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completado</Badge>
      case "pausado":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pausado</Badge>
      default:
        return <Badge variant="secondary">{estado}</Badge>
    }
  }

  const getCalidadBadge = (calidad: string) => {
    switch (calidad) {
      case "excelente":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <Trophy className="w-3 h-3 mr-1" />
            Excelente
          </Badge>
        )
      case "buena":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <Medal className="w-3 h-3 mr-1" />
            Buena
          </Badge>
        )
      case "regular":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Star className="w-3 h-3 mr-1" />
            Regular
          </Badge>
        )
      case "deficiente":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Deficiente
          </Badge>
        )
      default:
        return <Badge variant="secondary">{calidad}</Badge>
    }
  }

  const abrirDetalles = (procesoId: string) => {
    setProcesoSeleccionado(procesoId)
    setModalDetalles(true)
  }

  const abrirAnalisis = (procesoId: string) => {
    setProcesoSeleccionado(procesoId)
    setModalAnalisis(true)
  }

  const abrirRegistro = (procesoId: string) => {
    setProcesoSeleccionado(procesoId)
    const proceso = procesosActivos.find((p) => p.id === procesoId)
    if (proceso && proceso.operaciones.length > 0) {
      setOperacionActual(proceso.operaciones[0])
      setRegistroProduccion({
        operacion: proceso.operaciones[0],
        pesoInicial: 0,
        pesoFinal: 0,
        merma: 0,
        observaciones: "",
        responsable: "",
        fechaRegistro: new Date().toISOString().split("T")[0],
        categorias: {
          primera: 0,
          segunda: 0,
          tercera: 0,
          descarte: 0,
        },
      })
    }
    setModalRegistro(true)
  }

  const guardarRegistro = () => {
    // Aquí se guardaría el registro en la base de datos
    console.log("Guardando registro:", registroProduccion)
    setModalRegistro(false)
    // Actualizar los datos del proceso
  }

  const iniciarEdicion = (categoria: string, detalle: DetalleProduccion) => {
    setEditandoDetalle(categoria)
    setDetallesEditados({
      ...detallesEditados,
      [categoria]: { ...detalle },
    })
  }

  const guardarEdicion = (categoria: string) => {
    // Aquí se guardarían los cambios en la base de datos
    console.log("Guardando cambios para:", categoria, detallesEditados[categoria])
    setEditandoDetalle(null)
    // Actualizar los datos en detallesProduccion
  }

  const cancelarEdicion = () => {
    setEditandoDetalle(null)
    setDetallesEditados({})
  }

  const actualizarDetalleEditado = (categoria: string, campo: keyof DetalleProduccion, valor: any) => {
    setDetallesEditados({
      ...detallesEditados,
      [categoria]: {
        ...detallesEditados[categoria],
        [campo]: valor,
      },
    })
  }

  const actualizarCategoria = (categoria: keyof RegistroProduccion["categorias"], valor: number) => {
    const nuevasCategorias = {
      ...registroProduccion.categorias,
      [categoria]: valor,
    }
    const totalCategorias = Object.values(nuevasCategorias).reduce((sum, val) => sum + val, 0)
    const merma = registroProduccion.pesoInicial - totalCategorias

    setRegistroProduccion((prev) => ({
      ...prev,
      categorias: nuevasCategorias,
      pesoFinal: totalCategorias,
      merma: merma > 0 ? merma : 0,
    }))
  }

  // Calcular KPIs
  const totalProcesos = procesosActivos.length
  const procesosCompletados = procesosActivos.filter((p) => p.estado === "completado").length
  const pesoTotalProcesado = procesosActivos.reduce((sum, p) => sum + p.pesoTotal, 0)
  const eficienciaPromedio = procesosActivos.reduce((sum, p) => sum + p.eficiencia, 0) / totalProcesos
  const lotesExcelentes = Object.values(lotesCalidad)
    .flat()
    .filter((l) => l.calidad === "excelente").length

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Control de Producción</h1>
          <p className="text-muted-foreground">Monitoreo y análisis de procesos de producción</p>
        </div>
      </div>

      {/* KPIs principales - Más pequeños */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="p-3">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold">{pesoTotalProcesado.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">kg Total</p>
              </div>
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="p-3">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold">{eficienciaPromedio.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Eficiencia</p>
              </div>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="p-3">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold">
                  {procesosCompletados}/{totalProcesos}
                </p>
                <p className="text-xs text-muted-foreground">Procesos</p>
              </div>
              <Factory className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="p-3">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold">{lotesExcelentes}</p>
                <p className="text-xs text-muted-foreground">Lotes Exc.</p>
              </div>
              <Award className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="p-3">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold">{(pesoTotalProcesado / totalProcesos).toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">kg/proceso</p>
              </div>
              <Zap className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de procesos activos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Procesos Activos
          </CardTitle>
          <CardDescription>Control y seguimiento de procesos de producción</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha Inicio</TableHead>
                <TableHead>Progreso</TableHead>
                <TableHead>Peso (kg)</TableHead>
                <TableHead>Eficiencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {procesosActivos.map((proceso) => (
                <TableRow key={proceso.id}>
                  <TableCell className="font-medium">{proceso.pedido}</TableCell>
                  <TableCell>{proceso.cliente}</TableCell>
                  <TableCell>{proceso.fechaInicio}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={(proceso.operacionesCompletadas / proceso.operacionesTotales) * 100}
                        className="w-16"
                      />
                      <span className="text-sm text-muted-foreground">
                        {proceso.operacionesCompletadas}/{proceso.operacionesTotales}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{proceso.pesoTotal.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span
                        className={`font-semibold ${proceso.eficiencia >= 90 ? "text-green-600" : proceso.eficiencia >= 80 ? "text-yellow-600" : "text-red-600"}`}
                      >
                        {proceso.eficiencia}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{getEstadoBadge(proceso.estado)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => abrirDetalles(proceso.id)}>
                        <Eye className="h-4 w-4 mr-1" />
                        Detalles
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => abrirAnalisis(proceso.id)}>
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Análisis
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => abrirRegistro(proceso.id)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Registrar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Registro de Producción */}
      <Dialog open={modalRegistro} onOpenChange={setModalRegistro}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Registrar Producción
              <Button variant="ghost" size="sm" onClick={() => setModalRegistro(false)}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>Registrar kilogramos procesados para el proceso {procesoSeleccionado}</DialogDescription>
          </DialogHeader>

          {procesoSeleccionado && (
            <div className="space-y-6">
              {/* Selección de operación */}
              <div>
                <Label>Operación a Registrar</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {procesosActivos
                    .find((p) => p.id === procesoSeleccionado)
                    ?.operaciones.map((operacion) => (
                      <Button
                        key={operacion}
                        variant={operacionActual === operacion ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setOperacionActual(operacion)
                          setRegistroProduccion((prev) => ({ ...prev, operacion }))
                        }}
                      >
                        {operacion}
                      </Button>
                    ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Responsable</Label>
                  <Input
                    value={registroProduccion.responsable}
                    onChange={(e) => setRegistroProduccion((prev) => ({ ...prev, responsable: e.target.value }))}
                    placeholder="Nombre del responsable"
                  />
                </div>
                <div>
                  <Label>Fecha de Registro</Label>
                  <Input
                    type="date"
                    value={registroProduccion.fechaRegistro}
                    onChange={(e) => setRegistroProduccion((prev) => ({ ...prev, fechaRegistro: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>Peso Inicial (kg)</Label>
                <Input
                  type="number"
                  value={registroProduccion.pesoInicial}
                  onChange={(e) => {
                    const pesoInicial = Number(e.target.value)
                    setRegistroProduccion((prev) => ({ ...prev, pesoInicial }))
                  }}
                  placeholder="0"
                />
              </div>

              {/* Distribución por categorías */}
              <div>
                <Label className="text-base font-semibold">Distribución por Categorías (kg)</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                  <div>
                    <Label className="text-sm text-green-600">Primera</Label>
                    <Input
                      type="number"
                      value={registroProduccion.categorias.primera}
                      onChange={(e) => actualizarCategoria("primera", Number(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-blue-600">Segunda</Label>
                    <Input
                      type="number"
                      value={registroProduccion.categorias.segunda}
                      onChange={(e) => actualizarCategoria("segunda", Number(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-yellow-600">Tercera</Label>
                    <Input
                      type="number"
                      value={registroProduccion.categorias.tercera}
                      onChange={(e) => actualizarCategoria("tercera", Number(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-red-600">Descarte</Label>
                    <Input
                      type="number"
                      value={registroProduccion.categorias.descarte}
                      onChange={(e) => actualizarCategoria("descarte", Number(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>Observaciones</Label>
                <Textarea
                  value={registroProduccion.observaciones}
                  onChange={(e) => setRegistroProduccion((prev) => ({ ...prev, observaciones: e.target.value }))}
                  placeholder="Observaciones adicionales sobre el proceso..."
                  rows={3}
                />
              </div>

              {/* Resumen */}
              <Card className="bg-blue-50">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-4">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{registroProduccion.pesoInicial}</p>
                      <p className="text-sm text-gray-600">kg Inicial</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{registroProduccion.pesoFinal}</p>
                      <p className="text-sm text-gray-600">kg Final</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">{registroProduccion.merma}</p>
                      <p className="text-sm text-gray-600">kg Merma</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600">
                        {registroProduccion.pesoInicial > 0
                          ? ((registroProduccion.pesoFinal / registroProduccion.pesoInicial) * 100).toFixed(1)
                          : 0}
                        %
                      </p>
                      <p className="text-sm text-gray-600">Eficiencia</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-2 bg-green-100 rounded">
                      <p className="font-bold text-green-700">{registroProduccion.categorias.primera} kg</p>
                      <p className="text-xs text-green-600">Primera</p>
                    </div>
                    <div className="p-2 bg-blue-100 rounded">
                      <p className="font-bold text-blue-700">{registroProduccion.categorias.segunda} kg</p>
                      <p className="text-xs text-blue-600">Segunda</p>
                    </div>
                    <div className="p-2 bg-yellow-100 rounded">
                      <p className="font-bold text-yellow-700">{registroProduccion.categorias.tercera} kg</p>
                      <p className="text-xs text-yellow-600">Tercera</p>
                    </div>
                    <div className="p-2 bg-red-100 rounded">
                      <p className="font-bold text-red-700">{registroProduccion.categorias.descarte} kg</p>
                      <p className="text-xs text-red-600">Descarte</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setModalRegistro(false)}>
              Cancelar
            </Button>
            <Button
              onClick={guardarRegistro}
              disabled={
                !registroProduccion.operacion ||
                !registroProduccion.responsable ||
                registroProduccion.pesoInicial <= 0 ||
                registroProduccion.pesoFinal <= 0
              }
            >
              <Save className="h-4 w-4 mr-2" />
              Guardar Registro
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalles de Producción */}
      <Dialog open={modalDetalles} onOpenChange={setModalDetalles}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Detalles de Producción
              <Button variant="ghost" size="sm" onClick={() => setModalDetalles(false)}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>Información detallada del proceso {procesoSeleccionado}</DialogDescription>
          </DialogHeader>

          {procesoSeleccionado && detallesProduccion[procesoSeleccionado] && (
            <div className="space-y-6">
              {/* Peso total unificado */}
              <Card className="bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Resumen General</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {detallesProduccion[procesoSeleccionado]
                          .reduce((total, detalle) => total + detalle.pesoReal, 0)
                          .toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">kg Peso Total Procesado</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {detallesProduccion[procesoSeleccionado]
                          .filter((d) => d.esObjetivoPrincipal)
                          .reduce((total, detalle) => total + detalle.pesoReal, 0)
                          .toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">kg Objetivo Principal</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">
                        {detallesProduccion[procesoSeleccionado]
                          .filter((d) => !d.esObjetivoPrincipal)
                          .reduce((total, detalle) => total + detalle.pesoReal, 0)
                          .toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">kg Subproductos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Categorías separadas por objetivo */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Objetivo Principal */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-green-600">🎯 Objetivo Principal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {detallesProduccion[procesoSeleccionado]
                      .filter((detalle) => detalle.esObjetivoPrincipal)
                      .map((detalle, index) => (
                        <div key={index} className="space-y-2 p-3 border rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">{detalle.categoria}</span>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  detalle.porcentaje >= 100
                                    ? "default"
                                    : detalle.porcentaje >= 90
                                      ? "secondary"
                                      : "destructive"
                                }
                              >
                                {detalle.porcentaje.toFixed(1)}%
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => iniciarEdicion(detalle.categoria, detalle)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          {editandoDetalle === detalle.categoria ? (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm items-center">
                                <span className="text-muted-foreground">Objetivo:</span>
                                <Input
                                  type="number"
                                  value={detallesEditados[detalle.categoria]?.pesoObjetivo || detalle.pesoObjetivo}
                                  onChange={(e) =>
                                    actualizarDetalleEditado(detalle.categoria, "pesoObjetivo", Number(e.target.value))
                                  }
                                  className="w-20 h-6 text-xs"
                                />
                              </div>
                              <div className="flex justify-between text-sm items-center">
                                <span className="text-muted-foreground">Real:</span>
                                <Input
                                  type="number"
                                  value={detallesEditados[detalle.categoria]?.pesoReal || detalle.pesoReal}
                                  onChange={(e) =>
                                    actualizarDetalleEditado(detalle.categoria, "pesoReal", Number(e.target.value))
                                  }
                                  className="w-20 h-6 text-xs"
                                />
                              </div>
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="outline" onClick={() => guardarEdicion(detalle.categoria)}>
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancelarEdicion}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Objetivo:</span>
                                <span className="font-semibold">{detalle.pesoObjetivo} kg</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Real:</span>
                                <span className="font-semibold">{detalle.pesoReal} kg</span>
                              </div>
                            </>
                          )}

                          <Progress value={Math.min(detalle.porcentaje, 100)} className="mt-2" />
                          <div className="flex flex-wrap gap-1 mt-2">
                            {detalle.lotes.map((lote, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {lote}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </Card>

                {/* Subproductos */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-orange-600">📦 Subproductos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {detallesProduccion[procesoSeleccionado]
                        .filter((detalle) => !detalle.esObjetivoPrincipal)
                        .map((detalle, index) => (
                          <div key={index} className="p-3 border rounded-lg bg-gray-50">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium">{detalle.categoria}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-orange-600">{detalle.pesoReal} kg</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => iniciarEdicion(detalle.categoria, detalle)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            {editandoDetalle === detalle.categoria ? (
                              <div className="space-y-2">
                                <Input
                                  type="number"
                                  value={detallesEditados[detalle.categoria]?.pesoReal || detalle.pesoReal}
                                  onChange={(e) =>
                                    actualizarDetalleEditado(detalle.categoria, "pesoReal", Number(e.target.value))
                                  }
                                  className="w-full h-6 text-xs"
                                />
                                <div className="flex justify-end gap-1">
                                  <Button size="sm" variant="outline" onClick={() => guardarEdicion(detalle.categoria)}>
                                    <Save className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={cancelarEdicion}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {detalle.lotes.map((lote, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {lote}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Análisis de Lotes */}
      <Dialog open={modalAnalisis} onOpenChange={setModalAnalisis}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Análisis de Calidad por Lotes
              <Button variant="ghost" size="sm" onClick={() => setModalAnalisis(false)}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              Ranking de lotes y análisis de calidad para el proceso {procesoSeleccionado}
            </DialogDescription>
          </DialogHeader>

          {procesoSeleccionado && lotesCalidad[procesoSeleccionado] && (
            <div className="space-y-6">
              {/* Ranking de lotes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Ranking de Lotes por Calidad
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {lotesCalidad[procesoSeleccionado]
                      .sort((a, b) => b.eficiencia - a.eficiencia)
                      .map((lote, index) => (
                        <div key={lote.lote} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {index === 0 && <Trophy className="h-5 w-5 text-yellow-500" />}
                              {index === 1 && <Medal className="h-5 w-5 text-gray-400" />}
                              {index === 2 && <Award className="h-5 w-5 text-orange-500" />}
                              <span className="font-semibold">#{index + 1}</span>
                            </div>
                            <div>
                              <div className="font-medium">
                                {lote.lote} - {lote.proveedor}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {lote.pesoInicial} kg → {lote.pesoFinal} kg
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="font-semibold">{lote.eficiencia}%</div>
                              <div className="text-sm text-muted-foreground">Eficiencia</div>
                            </div>
                            {getCalidadBadge(lote.calidad)}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Detalle por categorías */}
              <Card>
                <CardHeader>
                  <CardTitle>Producción por Categorías</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lote</TableHead>
                          <TableHead>Proveedor</TableHead>
                          <TableHead>Primera (kg)</TableHead>
                          <TableHead>Segunda (kg)</TableHead>
                          <TableHead>Tercera (kg)</TableHead>
                          <TableHead>Descarte (kg)</TableHead>
                          <TableHead>Eficiencia</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lotesCalidad[procesoSeleccionado].map((lote) => (
                          <TableRow key={lote.lote}>
                            <TableCell className="font-medium">{lote.lote}</TableCell>
                            <TableCell>{lote.proveedor}</TableCell>
                            <TableCell className="text-green-600 font-semibold">{lote.categorias.primera}</TableCell>
                            <TableCell className="text-blue-600 font-semibold">{lote.categorias.segunda}</TableCell>
                            <TableCell className="text-yellow-600 font-semibold">{lote.categorias.tercera}</TableCell>
                            <TableCell className="text-red-600 font-semibold">{lote.categorias.descarte}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-semibold ${lote.eficiencia >= 95 ? "text-green-600" : lote.eficiencia >= 90 ? "text-yellow-600" : "text-red-600"}`}
                                >
                                  {lote.eficiencia}%
                                </span>
                                {getCalidadBadge(lote.calidad)}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
