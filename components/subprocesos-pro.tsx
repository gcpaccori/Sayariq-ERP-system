"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Search,
  Users,
  Clock,
  DollarSign,
  ChevronDown,
  Play,
  Square,
  Calculator,
  Settings,
  Plus,
  Eye,
  Scale,
} from "lucide-react"

// Tipos de datos
interface Trabajador {
  id: string
  nombre: string
  apellidos: string
  genero: "hombre" | "mujer"
  activo: boolean
  documento: string
}

interface SubprocesoDetalle {
  id: string
  nombre: "lavado" | "perfilado" | "desinfeccion" | "secado" | "empaque" | "salida"
  estado: "pendiente" | "en-proceso" | "completado" | "pausado"
  horaInicio?: string
  horaFin?: string
  pesoInicial?: number
  pesoFinal?: number
  jabasIniciales: number
  jabasFinal?: number
  personalAsignado: string[]
  costoTotal: number
  observaciones: string
  fechaCreacion: string
  totalHorasTrabajadas: number
  detalleJabasPorTrabajador?: {
    [trabajadorId: string]: {
      exportable: number
      industrial: number
      jugo?: number
      descarte?: number
    }
  }
}

interface Proceso {
  id: string
  codigoLote: string
  producto: "jengibre" | "curcuma"
  fechaCreacion: string
  subprocesoActual: "lavado" | "perfilado" | "desinfeccion" | "secado" | "empaque" | "salida"
  estado: "activo" | "completado" | "pausado"
  subprocesos: SubprocesoDetalle[]
  costoTotalProceso: number
  pesoInicialProceso: number
  pesoFinalProceso?: number
  jabasInicialesProceso: number
  jabasFinalProceso?: number
}

// Datos mock
const trabajadoresMock: Trabajador[] = [
  { id: "1", nombre: "Juan", apellidos: "Pérez", genero: "hombre", activo: true, documento: "12345678" },
  { id: "2", nombre: "María", apellidos: "García", genero: "mujer", activo: true, documento: "87654321" },
  { id: "3", nombre: "Carlos", apellidos: "López", genero: "hombre", activo: true, documento: "11223344" },
  { id: "4", nombre: "Ana", apellidos: "Torres", genero: "mujer", activo: true, documento: "44332211" },
  { id: "5", nombre: "Pedro", apellidos: "Sánchez", genero: "hombre", activo: true, documento: "55667788" },
  { id: "6", nombre: "Rosa", apellidos: "Mendoza", genero: "mujer", activo: true, documento: "88776655" },
]

const procesosMock: Proceso[] = [
  {
    id: "1",
    codigoLote: "JEN-001",
    producto: "jengibre",
    fechaCreacion: "2024-01-15",
    subprocesoActual: "lavado",
    estado: "activo",
    costoTotalProceso: 0,
    pesoInicialProceso: 1000,
    jabasInicialesProceso: 50,
    subprocesos: [
      {
        id: "1-lavado",
        nombre: "lavado",
        estado: "en-proceso",
        horaInicio: "08:00",
        pesoInicial: 1000,
        jabasIniciales: 50,
        personalAsignado: ["1", "2"],
        costoTotal: 0,
        observaciones: "",
        fechaCreacion: "2024-01-15T08:00:00",
        totalHorasTrabajadas: 0,
      },
    ],
  },
  {
    id: "2",
    codigoLote: "CUR-002",
    producto: "curcuma",
    fechaCreacion: "2024-01-16",
    subprocesoActual: "perfilado",
    estado: "activo",
    costoTotalProceso: 240,
    pesoInicialProceso: 800,
    pesoFinalProceso: 720,
    jabasInicialesProceso: 40,
    jabasFinalProceso: 36,
    subprocesos: [
      {
        id: "2-lavado",
        nombre: "lavado",
        estado: "completado",
        horaInicio: "07:30",
        horaFin: "10:30",
        pesoInicial: 800,
        pesoFinal: 750,
        jabasIniciales: 40,
        jabasFinal: 38,
        personalAsignado: ["3", "4"],
        costoTotal: 120,
        observaciones: "Lavado completado sin problemas",
        fechaCreacion: "2024-01-16T07:30:00",
        totalHorasTrabajadas: 3,
      },
      {
        id: "2-perfilado",
        nombre: "perfilado",
        estado: "en-proceso",
        horaInicio: "11:00",
        pesoInicial: 750,
        jabasIniciales: 38,
        personalAsignado: ["1", "5"],
        costoTotal: 0,
        observaciones: "",
        fechaCreacion: "2024-01-16T11:00:00",
        totalHorasTrabajadas: 0,
      },
    ],
  },
]

const subprocesosDisponibles = [
  { value: "lavado", label: "Lavado", icon: "💧", descripcion: "Limpieza inicial del producto" },
  { value: "perfilado", label: "Perfilado", icon: "✂️", descripcion: "Selección y clasificación por calidad" },
  { value: "desinfeccion", label: "Desinfección", icon: "🧽", descripcion: "Proceso de desinfección y sanitización" },
  { value: "secado", label: "Secado", icon: "🌡️", descripcion: "Reducción de humedad del producto" },
  { value: "empaque", label: "Empaque", icon: "📦", descripcion: "Empacado final para distribución" },
  { value: "salida", label: "Salida", icon: "🚚", descripcion: "Preparación para despacho" },
]

const categoriasPago = [
  { value: "exportable", label: "Exportable", precio: 2.5 },
  { value: "industrial", label: "Industrial", precio: 1.8 },
  { value: "jugo", label: "Jugo", precio: 1.2 },
  { value: "descarte", label: "Descarte", precio: 0.5 },
]

const categoriasEmpaque = [
  { value: "exportable", label: "Exportable", precio: 2.5 },
  { value: "industrial", label: "Industrial", precio: 1.8 },
]

export function SubprocesosPro() {
  const [procesos, setProcesos] = useState<Proceso[]>(procesosMock)
  const [trabajadores] = useState<Trabajador[]>(trabajadoresMock)
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<Proceso | null>(null)
  const [subprocesoEditando, setSubprocesoEditando] = useState<SubprocesoDetalle | null>(null)
  const [modalPersonalAbierto, setModalPersonalAbierto] = useState(false)
  const [modalMatrizAbierto, setModalMatrizAbierto] = useState(false)
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false)
  const [modalNuevoSubprocesoAbierto, setModalNuevoSubprocesoAbierto] = useState(false)
  const [busquedaHombres, setBusquedaHombres] = useState("")
  const [busquedaMujeres, setBusquedaMujeres] = useState("")
  const [personalSeleccionado, setPersonalSeleccionado] = useState<string[]>([])
  const [matrizJabas, setMatrizJabas] = useState<{ [key: string]: { [categoria: string]: number } }>({})
  const [nuevoSubproceso, setNuevoSubproceso] = useState({
    tipo: "",
    jabasIniciales: 0,
    pesoInicial: 0,
    observaciones: "",
  })

  // Filtrar trabajadores
  const trabajadoresHombres = trabajadores.filter(
    (t) =>
      t.genero === "hombre" &&
      t.activo &&
      (t.nombre.toLowerCase().includes(busquedaHombres.toLowerCase()) ||
        t.apellidos.toLowerCase().includes(busquedaHombres.toLowerCase()) ||
        t.documento.includes(busquedaHombres)),
  )

  const trabajadoresMujeres = trabajadores.filter(
    (t) =>
      t.genero === "mujer" &&
      t.activo &&
      (t.nombre.toLowerCase().includes(busquedaMujeres.toLowerCase()) ||
        t.apellidos.toLowerCase().includes(busquedaMujeres.toLowerCase()) ||
        t.documento.includes(busquedaMujeres)),
  )

  // Calcular horas trabajadas
  const calcularHorasTrabajadas = (horaInicio?: string, horaFin?: string): number => {
    if (!horaInicio || !horaFin) return 0
    const inicio = new Date(`2024-01-01 ${horaInicio}`)
    const fin = new Date(`2024-01-01 ${horaFin}`)
    return (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60)
  }

  // Calcular costos
  const calcularCostoPersonal = (subproceso: SubprocesoDetalle, totalJabas: number) => {
    if (!subproceso.horaInicio || !subproceso.horaFin) return 0

    const horasTrabajadas = calcularHorasTrabajadas(subproceso.horaInicio, subproceso.horaFin)
    let costoTotal = 0

    subproceso.personalAsignado.forEach((trabajadorId) => {
      const trabajador = trabajadores.find((t) => t.id === trabajadorId)
      if (!trabajador) return

      if (subproceso.nombre === "perfilado" || subproceso.nombre === "empaque") {
        // Pago por jabas procesadas (adicional al jornal)
        const jabasPorTrabajador = Math.floor(totalJabas / subproceso.personalAsignado.length)
        const tarifaPorJaba = trabajador.genero === "hombre" ? 1.2 : 1.0
        const costoJabas = jabasPorTrabajador * tarifaPorJaba

        // Pago por horas también
        const tarifaPorHora = trabajador.genero === "hombre" ? 7.5 : 6.25
        const costoHoras = horasTrabajadas * tarifaPorHora

        costoTotal += costoJabas + costoHoras
      } else {
        // Solo pago por horas
        const tarifaPorHora = trabajador.genero === "hombre" ? 7.5 : 6.25
        costoTotal += horasTrabajadas * tarifaPorHora
      }
    })

    return costoTotal
  }

  const cambiarSubproceso = (procesoId: string, nuevoSubproceso: string) => {
    setProcesos((prev) =>
      prev.map((proceso) => {
        if (proceso.id === procesoId) {
          const subprocesoExistente = proceso.subprocesos.find((s) => s.nombre === nuevoSubproceso)

          if (!subprocesoExistente) {
            // Crear nuevo subproceso
            const nuevoSubprocesoObj: SubprocesoDetalle = {
              id: `${procesoId}-${nuevoSubproceso}-${Date.now()}`,
              nombre: nuevoSubproceso as any,
              estado: "pendiente",
              horaInicio: new Date().toLocaleTimeString("es-PE", { hour12: false, hour: "2-digit", minute: "2-digit" }),
              jabasIniciales: 0,
              personalAsignado: [],
              costoTotal: 0,
              observaciones: "",
              fechaCreacion: new Date().toISOString(),
              totalHorasTrabajadas: 0,
            }

            return {
              ...proceso,
              subprocesoActual: nuevoSubproceso as any,
              subprocesos: [...proceso.subprocesos, nuevoSubprocesoObj],
            }
          } else {
            return {
              ...proceso,
              subprocesoActual: nuevoSubproceso as any,
            }
          }
        }
        return proceso
      }),
    )
  }

  const agregarNuevoSubproceso = () => {
    if (!procesoSeleccionado || !nuevoSubproceso.tipo) return

    const nuevoSubprocesoObj: SubprocesoDetalle = {
      id: `${procesoSeleccionado.id}-${nuevoSubproceso.tipo}-${Date.now()}`,
      nombre: nuevoSubproceso.tipo as any,
      estado: "pendiente",
      horaInicio: new Date().toLocaleTimeString("es-PE", { hour12: false, hour: "2-digit", minute: "2-digit" }),
      jabasIniciales: nuevoSubproceso.jabasIniciales,
      pesoInicial: nuevoSubproceso.pesoInicial,
      personalAsignado: [],
      costoTotal: 0,
      observaciones: nuevoSubproceso.observaciones,
      fechaCreacion: new Date().toISOString(),
      totalHorasTrabajadas: 0,
    }

    setProcesos((prev) =>
      prev.map((proceso) => {
        if (proceso.id === procesoSeleccionado.id) {
          return {
            ...proceso,
            subprocesos: [...proceso.subprocesos, nuevoSubprocesoObj],
          }
        }
        return proceso
      }),
    )

    setNuevoSubproceso({ tipo: "", jabasIniciales: 0, pesoInicial: 0, observaciones: "" })
    setModalNuevoSubprocesoAbierto(false)
  }

  const iniciarSubproceso = (procesoId: string, subprocesoId: string) => {
    setProcesos((prev) =>
      prev.map((proceso) => {
        if (proceso.id === procesoId) {
          return {
            ...proceso,
            subprocesos: proceso.subprocesos.map((sub) => {
              if (sub.id === subprocesoId) {
                return {
                  ...sub,
                  estado: "en-proceso" as const,
                  horaInicio:
                    sub.horaInicio ||
                    new Date().toLocaleTimeString("es-PE", { hour12: false, hour: "2-digit", minute: "2-digit" }),
                }
              }
              return sub
            }),
          }
        }
        return proceso
      }),
    )
  }

  const finalizarSubproceso = (procesoId: string, subprocesoId: string) => {
    setProcesos((prev) =>
      prev.map((proceso) => {
        if (proceso.id === procesoId) {
          return {
            ...proceso,
            subprocesos: proceso.subprocesos.map((sub) => {
              if (sub.id === subprocesoId) {
                const horaFin = new Date().toLocaleTimeString("es-PE", {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                })
                const horasTrabajadas = calcularHorasTrabajadas(sub.horaInicio, horaFin)
                const costoCalculado = calcularCostoPersonal({ ...sub, horaFin }, sub.jabasFinal || sub.jabasIniciales)

                return {
                  ...sub,
                  estado: "completado" as const,
                  horaFin,
                  totalHorasTrabajadas: horasTrabajadas,
                  costoTotal: costoCalculado,
                }
              }
              return sub
            }),
          }
        }
        return proceso
      }),
    )
  }

  const guardarPersonal = () => {
    if (subprocesoEditando && procesoSeleccionado) {
      setProcesos((prev) =>
        prev.map((proceso) => {
          if (proceso.id === procesoSeleccionado.id) {
            return {
              ...proceso,
              subprocesos: proceso.subprocesos.map((sub) => {
                if (sub.id === subprocesoEditando.id) {
                  return {
                    ...sub,
                    personalAsignado: personalSeleccionado,
                  }
                }
                return sub
              }),
            }
          }
          return proceso
        }),
      )
      setModalPersonalAbierto(false)
    }
  }

  const calcularPagoTrabajador = (trabajadorId: string) => {
    const trabajador = trabajadores.find((t) => t.id === trabajadorId)
    if (!trabajador) return 0

    let total = 0
    const categorias = subprocesoEditando?.nombre === "empaque" ? categoriasEmpaque : categoriasPago

    categorias.forEach((categoria) => {
      const jabas = matrizJabas[trabajadorId]?.[categoria.value] || 0
      total += jabas * categoria.precio
    })
    return total
  }

  const actualizarMatrizJabas = (trabajadorId: string, categoria: string, jabas: number) => {
    setMatrizJabas((prev) => ({
      ...prev,
      [trabajadorId]: {
        ...prev[trabajadorId],
        [categoria]: jabas,
      },
    }))
  }

  const actualizarHorario = (procesoId: string, subprocesoId: string, tipo: "inicio" | "fin", hora: string) => {
    setProcesos((prev) =>
      prev.map((proceso) => {
        if (proceso.id === procesoId) {
          return {
            ...proceso,
            subprocesos: proceso.subprocesos.map((sub) => {
              if (sub.id === subprocesoId) {
                const updatedSub = {
                  ...sub,
                  [tipo === "inicio" ? "horaInicio" : "horaFin"]: hora,
                }

                // Recalcular horas y costo si ambas horas están disponibles
                if (updatedSub.horaInicio && updatedSub.horaFin) {
                  updatedSub.totalHorasTrabajadas = calcularHorasTrabajadas(updatedSub.horaInicio, updatedSub.horaFin)
                  updatedSub.costoTotal = calcularCostoPersonal(
                    updatedSub,
                    updatedSub.jabasFinal || updatedSub.jabasIniciales,
                  )
                }

                return updatedSub
              }
              return sub
            }),
          }
        }
        return proceso
      }),
    )
  }

  const actualizarDatos = (procesoId: string, subprocesoId: string, campo: string, valor: number) => {
    setProcesos((prev) =>
      prev.map((proceso) => {
        if (proceso.id === procesoId) {
          return {
            ...proceso,
            subprocesos: proceso.subprocesos.map((sub) => {
              if (sub.id === subprocesoId) {
                const updatedSub = {
                  ...sub,
                  [campo]: valor,
                }

                // Recalcular costo si es necesario
                if (updatedSub.horaInicio && updatedSub.horaFin) {
                  updatedSub.costoTotal = calcularCostoPersonal(
                    updatedSub,
                    updatedSub.jabasFinal || updatedSub.jabasIniciales,
                  )
                }

                return updatedSub
              }
              return sub
            }),
          }
        }
        return proceso
      }),
    )
  }

  const actualizarPesoProceso = (procesoId: string, campo: string, valor: number) => {
    setProcesos((prev) =>
      prev.map((proceso) => {
        if (proceso.id === procesoId) {
          return {
            ...proceso,
            [campo]: valor,
          }
        }
        return proceso
      }),
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Settings className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Procesos Activos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {procesos.filter((p) => p.estado === "activo").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Personal Activo</p>
                <p className="text-2xl font-bold text-gray-900">{trabajadores.filter((t) => t.activo).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">En Proceso</p>
                <p className="text-2xl font-bold text-gray-900">
                  {procesos.reduce((acc, p) => acc + p.subprocesos.filter((s) => s.estado === "en-proceso").length, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Costo Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  S/{" "}
                  {procesos
                    .reduce((acc, p) => acc + p.subprocesos.reduce((subAcc, s) => subAcc + s.costoTotal, 0), 0)
                    .toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de procesos */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {procesos.map((proceso) => {
          const subprocesoActual = proceso.subprocesos.find((s) => s.nombre === proceso.subprocesoActual)

          return (
            <Card key={proceso.id} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{proceso.codigoLote}</CardTitle>
                  <Badge variant={proceso.estado === "activo" ? "default" : "secondary"}>{proceso.estado}</Badge>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span className="capitalize">{proceso.producto}</span>
                  <span>•</span>
                  <span>{proceso.fechaCreacion}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Información general del proceso */}
                <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-blue-800">Información del Proceso</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setProcesoSeleccionado(proceso)
                        setModalDetalleAbierto(true)
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Detalle
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-600">Peso Inicial:</span>
                      <Input
                        type="number"
                        value={proceso.pesoInicialProceso || ""}
                        onChange={(e) =>
                          actualizarPesoProceso(proceso.id, "pesoInicialProceso", Number(e.target.value))
                        }
                        className="h-6 text-xs mt-1"
                        placeholder="kg"
                      />
                    </div>
                    <div>
                      <span className="text-gray-600">Peso Final:</span>
                      <Input
                        type="number"
                        value={proceso.pesoFinalProceso || ""}
                        onChange={(e) => actualizarPesoProceso(proceso.id, "pesoFinalProceso", Number(e.target.value))}
                        className="h-6 text-xs mt-1"
                        placeholder="kg"
                      />
                    </div>
                    <div>
                      <span className="text-gray-600">Jabas Iniciales:</span>
                      <Input
                        type="number"
                        value={proceso.jabasInicialesProceso || ""}
                        onChange={(e) =>
                          actualizarPesoProceso(proceso.id, "jabasInicialesProceso", Number(e.target.value))
                        }
                        className="h-6 text-xs mt-1"
                        placeholder="jabas"
                      />
                    </div>
                    <div>
                      <span className="text-gray-600">Jabas Final:</span>
                      <Input
                        type="number"
                        value={proceso.jabasFinalProceso || ""}
                        onChange={(e) => actualizarPesoProceso(proceso.id, "jabasFinalProceso", Number(e.target.value))}
                        className="h-6 text-xs mt-1"
                        placeholder="jabas"
                      />
                    </div>
                  </div>
                </div>

                {/* Subproceso actual */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Subproceso Actual</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 bg-transparent">
                          {subprocesosDisponibles.find((s) => s.value === proceso.subprocesoActual)?.icon}{" "}
                          {subprocesosDisponibles.find((s) => s.value === proceso.subprocesoActual)?.label}
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {subprocesosDisponibles.map((subproceso) => (
                          <DropdownMenuItem
                            key={subproceso.value}
                            onClick={() => cambiarSubproceso(proceso.id, subproceso.value)}
                          >
                            {subproceso.icon} {subproceso.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {subprocesoActual && (
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={
                            subprocesoActual.estado === "completado"
                              ? "default"
                              : subprocesoActual.estado === "en-proceso"
                                ? "secondary"
                                : subprocesoActual.estado === "pausado"
                                  ? "destructive"
                                  : "outline"
                          }
                        >
                          {subprocesoActual.estado}
                        </Badge>
                        <div className="flex space-x-1">
                          {subprocesoActual.estado === "pendiente" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => iniciarSubproceso(proceso.id, subprocesoActual.id)}
                            >
                              <Play className="h-3 w-3" />
                            </Button>
                          )}
                          {subprocesoActual.estado === "en-proceso" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => finalizarSubproceso(proceso.id, subprocesoActual.id)}
                            >
                              <Square className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">Hora Inicio</Label>
                          <Input
                            type="time"
                            value={subprocesoActual.horaInicio || ""}
                            onChange={(e) =>
                              actualizarHorario(proceso.id, subprocesoActual.id, "inicio", e.target.value)
                            }
                            className="h-7 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">Hora Fin</Label>
                          <Input
                            type="time"
                            value={subprocesoActual.horaFin || ""}
                            onChange={(e) => actualizarHorario(proceso.id, subprocesoActual.id, "fin", e.target.value)}
                            className="h-7 text-xs"
                            disabled={subprocesoActual.estado === "pendiente"}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">Jabas Iniciales</Label>
                          <Input
                            type="number"
                            value={subprocesoActual.jabasIniciales || ""}
                            onChange={(e) =>
                              actualizarDatos(proceso.id, subprocesoActual.id, "jabasIniciales", Number(e.target.value))
                            }
                            className="h-7 text-xs"
                            min="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">Jabas Final</Label>
                          <Input
                            type="number"
                            value={subprocesoActual.jabasFinal || ""}
                            onChange={(e) =>
                              actualizarDatos(proceso.id, subprocesoActual.id, "jabasFinal", Number(e.target.value))
                            }
                            className="h-7 text-xs"
                            min="0"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">Peso Inicial (kg)</Label>
                          <Input
                            type="number"
                            value={subprocesoActual.pesoInicial || ""}
                            onChange={(e) =>
                              actualizarDatos(proceso.id, subprocesoActual.id, "pesoInicial", Number(e.target.value))
                            }
                            className="h-7 text-xs"
                            min="0"
                            step="0.1"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">Peso Final (kg)</Label>
                          <Input
                            type="number"
                            value={subprocesoActual.pesoFinal || ""}
                            onChange={(e) =>
                              actualizarDatos(proceso.id, subprocesoActual.id, "pesoFinal", Number(e.target.value))
                            }
                            className="h-7 text-xs"
                            min="0"
                            step="0.1"
                          />
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setProcesoSeleccionado(proceso)
                            setSubprocesoEditando(subprocesoActual)
                            setPersonalSeleccionado(subprocesoActual.personalAsignado)
                            setModalPersonalAbierto(true)
                          }}
                        >
                          <Users className="h-3 w-3 mr-1" />
                          Personal ({subprocesoActual.personalAsignado.length})
                        </Button>

                        {(subprocesoActual.nombre === "perfilado" || subprocesoActual.nombre === "empaque") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setProcesoSeleccionado(proceso)
                              setSubprocesoEditando(subprocesoActual)
                              setModalMatrizAbierto(true)
                            }}
                          >
                            <Calculator className="h-3 w-3 mr-1" />
                            Matriz
                          </Button>
                        )}
                      </div>

                      {/* Información adicional del subproceso */}
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>Horas trabajadas: {subprocesoActual.totalHorasTrabajadas.toFixed(1)}h</div>
                        <div>Costo: S/ {subprocesoActual.costoTotal.toFixed(2)}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Botón para agregar nuevo subproceso */}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => {
                    setProcesoSeleccionado(proceso)
                    setModalNuevoSubprocesoAbierto(true)
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar Subproceso
                </Button>

                {/* Progreso de subprocesos */}
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Progreso ({proceso.subprocesos.length} subprocesos)</Label>
                  <div className="flex space-x-1">
                    {subprocesosDisponibles.map((subproceso) => {
                      const subprocesoData = proceso.subprocesos.find((s) => s.nombre === subproceso.value)
                      const estado = subprocesoData?.estado || "pendiente"

                      return (
                        <div
                          key={subproceso.value}
                          className={`flex-1 h-2 rounded-full ${
                            estado === "completado"
                              ? "bg-green-500"
                              : estado === "en-proceso"
                                ? "bg-blue-500"
                                : estado === "pausado"
                                  ? "bg-red-500"
                                  : "bg-gray-200"
                          }`}
                          title={`${subproceso.label}: ${estado}`}
                        />
                      )
                    })}
                  </div>
                </div>

                {/* Costo total */}
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Costo Total:</span>
                    <span className="font-semibold">
                      S/ {proceso.subprocesos.reduce((acc, s) => acc + s.costoTotal, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Modal de Detalle del Proceso */}
      <Dialog open={modalDetalleAbierto} onOpenChange={setModalDetalleAbierto}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Proceso - {procesoSeleccionado?.codigoLote}</DialogTitle>
          </DialogHeader>

          {procesoSeleccionado && (
            <div className="space-y-6">
              {/* Información general */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Información General</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm text-gray-600">Código Lote</Label>
                        <p className="font-semibold">{procesoSeleccionado.codigoLote}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Producto</Label>
                        <p className="font-semibold capitalize">{procesoSeleccionado.producto}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Fecha Creación</Label>
                        <p className="font-semibold">{procesoSeleccionado.fechaCreacion}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Estado</Label>
                        <Badge variant={procesoSeleccionado.estado === "activo" ? "default" : "secondary"}>
                          {procesoSeleccionado.estado}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Scale className="h-5 w-5 mr-2" />
                      Pesado General
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm text-gray-600">Peso Inicial</Label>
                        <p className="font-semibold">{procesoSeleccionado.pesoInicialProceso || 0} kg</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Peso Final</Label>
                        <p className="font-semibold">{procesoSeleccionado.pesoFinalProceso || 0} kg</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Jabas Iniciales</Label>
                        <p className="font-semibold">{procesoSeleccionado.jabasInicialesProceso || 0}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Jabas Final</Label>
                        <p className="font-semibold">{procesoSeleccionado.jabasFinalProceso || 0}</p>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Merma:</span>
                        <span className="font-semibold text-red-600">
                          {(
                            (procesoSeleccionado.pesoInicialProceso || 0) - (procesoSeleccionado.pesoFinalProceso || 0)
                          ).toFixed(1)}{" "}
                          kg
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Lista de subprocesos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Subprocesos ({procesoSeleccionado.subprocesos.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {procesoSeleccionado.subprocesos.map((subproceso, index) => (
                      <div key={subproceso.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl">
                              {subprocesosDisponibles.find((s) => s.value === subproceso.nombre)?.icon}
                            </span>
                            <div>
                              <h4 className="font-semibold">
                                {index + 1}. {subprocesosDisponibles.find((s) => s.value === subproceso.nombre)?.label}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {subprocesosDisponibles.find((s) => s.value === subproceso.nombre)?.descripcion}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={
                              subproceso.estado === "completado"
                                ? "default"
                                : subproceso.estado === "en-proceso"
                                  ? "secondary"
                                  : subproceso.estado === "pausado"
                                    ? "destructive"
                                    : "outline"
                            }
                          >
                            {subproceso.estado}
                          </Badge>
                        </div>

                        <div className="grid md:grid-cols-4 gap-4">
                          <div>
                            <Label className="text-xs text-gray-500">Horario</Label>
                            <p className="text-sm font-medium">
                              {subproceso.horaInicio || "No iniciado"} - {subproceso.horaFin || "En proceso"}
                            </p>
                            <p className="text-xs text-gray-600">{subproceso.totalHorasTrabajadas.toFixed(1)} horas</p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Jabas</Label>
                            <p className="text-sm font-medium">
                              {subproceso.jabasIniciales} → {subproceso.jabasFinal || "En proceso"}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Peso (kg)</Label>
                            <p className="text-sm font-medium">
                              {subproceso.pesoInicial || 0} → {subproceso.pesoFinal || "En proceso"}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Personal</Label>
                            <p className="text-sm font-medium">{subproceso.personalAsignado.length} operarios</p>
                            <p className="text-xs text-gray-600">S/ {subproceso.costoTotal.toFixed(2)}</p>
                          </div>
                        </div>

                        {subproceso.personalAsignado.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <Label className="text-xs text-gray-500">Personal Asignado</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {subproceso.personalAsignado.map((trabajadorId) => {
                                const trabajador = trabajadores.find((t) => t.id === trabajadorId)
                                return trabajador ? (
                                  <Badge key={trabajadorId} variant="outline" className="text-xs">
                                    {trabajador.genero === "hombre" ? "👨" : "👩"} {trabajador.nombre}{" "}
                                    {trabajador.apellidos}
                                  </Badge>
                                ) : null
                              })}
                            </div>
                          </div>
                        )}

                        {subproceso.observaciones && (
                          <div className="mt-3 pt-3 border-t">
                            <Label className="text-xs text-gray-500">Observaciones</Label>
                            <p className="text-sm">{subproceso.observaciones}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Resumen de costos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumen de Costos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {procesoSeleccionado.subprocesos.map((subproceso, index) => (
                      <div key={subproceso.id} className="flex justify-between items-center">
                        <span className="text-sm">
                          {index + 1}. {subprocesosDisponibles.find((s) => s.value === subproceso.nombre)?.label}
                        </span>
                        <span className="font-medium">S/ {subproceso.costoTotal.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t flex justify-between items-center font-semibold">
                      <span>TOTAL</span>
                      <span>
                        S/ {procesoSeleccionado.subprocesos.reduce((acc, s) => acc + s.costoTotal, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={() => setModalDetalleAbierto(false)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para Agregar Nuevo Subproceso */}
      <Dialog open={modalNuevoSubprocesoAbierto} onOpenChange={setModalNuevoSubprocesoAbierto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Subproceso</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Tipo de Subproceso *</Label>
              <Select
                value={nuevoSubproceso.tipo}
                onValueChange={(value) => setNuevoSubproceso((prev) => ({ ...prev, tipo: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar subproceso" />
                </SelectTrigger>
                <SelectContent>
                  {subprocesosDisponibles.map((subproceso) => (
                    <SelectItem key={subproceso.value} value={subproceso.value}>
                      {subproceso.icon} {subproceso.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Jabas Iniciales *</Label>
                <Input
                  type="number"
                  value={nuevoSubproceso.jabasIniciales}
                  onChange={(e) => setNuevoSubproceso((prev) => ({ ...prev, jabasIniciales: Number(e.target.value) }))}
                  min="0"
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Peso Inicial (kg)</Label>
                <Input
                  type="number"
                  value={nuevoSubproceso.pesoInicial}
                  onChange={(e) => setNuevoSubproceso((prev) => ({ ...prev, pesoInicial: Number(e.target.value) }))}
                  min="0"
                  step="0.1"
                  placeholder="0.0"
                />
              </div>
            </div>

            <div>
              <Label>Observaciones</Label>
              <Textarea
                value={nuevoSubproceso.observaciones}
                onChange={(e) => setNuevoSubproceso((prev) => ({ ...prev, observaciones: e.target.value }))}
                placeholder="Observaciones del subproceso..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setModalNuevoSubprocesoAbierto(false)}>
              Cancelar
            </Button>
            <Button
              onClick={agregarNuevoSubproceso}
              disabled={!nuevoSubproceso.tipo || nuevoSubproceso.jabasIniciales <= 0}
            >
              Agregar Subproceso
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Personal */}
      <Dialog open={modalPersonalAbierto} onOpenChange={setModalPersonalAbierto}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Asignar Personal - {subprocesoEditando?.nombre}</DialogTitle>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Hombres */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-blue-600">👨 Hombres</h3>
                <Badge variant="outline">{trabajadoresHombres.length}</Badge>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar hombres..."
                  value={busquedaHombres}
                  onChange={(e) => setBusquedaHombres(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="border rounded-lg max-h-60 overflow-y-auto">
                {trabajadoresHombres.map((trabajador) => (
                  <div key={trabajador.id} className="flex items-center space-x-3 p-3 border-b last:border-b-0">
                    <Checkbox
                      checked={personalSeleccionado.includes(trabajador.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setPersonalSeleccionado((prev) => [...prev, trabajador.id])
                        } else {
                          setPersonalSeleccionado((prev) => prev.filter((id) => id !== trabajador.id))
                        }
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-medium">
                        {trabajador.nombre} {trabajador.apellidos}
                      </p>
                      <p className="text-sm text-gray-500">DNI: {trabajador.documento}</p>
                    </div>
                    <div className="text-xs text-gray-500">S/ 7.5/h | S/ 60/día</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mujeres */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-pink-600">👩 Mujeres</h3>
                <Badge variant="outline">{trabajadoresMujeres.length}</Badge>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar mujeres..."
                  value={busquedaMujeres}
                  onChange={(e) => setBusquedaMujeres(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="border rounded-lg max-h-60 overflow-y-auto">
                {trabajadoresMujeres.map((trabajador) => (
                  <div key={trabajador.id} className="flex items-center space-x-3 p-3 border-b last:border-b-0">
                    <Checkbox
                      checked={personalSeleccionado.includes(trabajador.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setPersonalSeleccionado((prev) => [...prev, trabajador.id])
                        } else {
                          setPersonalSeleccionado((prev) => prev.filter((id) => id !== trabajador.id))
                        }
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-medium">
                        {trabajador.nombre} {trabajador.apellidos}
                      </p>
                      <p className="text-sm text-gray-500">DNI: {trabajador.documento}</p>
                    </div>
                    <div className="text-xs text-gray-500">S/ 6.25/h | S/ 50/día</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Personal seleccionado */}
          {personalSeleccionado.length > 0 && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">
                Personal Seleccionado ({personalSeleccionado.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {personalSeleccionado.map((id) => {
                  const trabajador = trabajadores.find((t) => t.id === id)
                  return trabajador ? (
                    <Badge key={id} variant="secondary" className="bg-green-100 text-green-800">
                      {trabajador.genero === "hombre" ? "👨" : "👩"} {trabajador.nombre} {trabajador.apellidos}
                    </Badge>
                  ) : null
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setModalPersonalAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarPersonal}>Guardar Personal</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Matriz de Jabas */}
      <Dialog open={modalMatrizAbierto} onOpenChange={setModalMatrizAbierto}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Matriz de Jabas por Trabajador - {subprocesoEditando?.nombre}</DialogTitle>
          </DialogHeader>

          {subprocesoEditando && (
            <div className="space-y-6">
              {/* Tabla de matriz */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-3 text-left">Trabajador</th>
                      {(subprocesoEditando.nombre === "empaque" ? categoriasEmpaque : categoriasPago).map(
                        (categoria) => (
                          <th key={categoria.value} className="border border-gray-300 p-3 text-center">
                            {categoria.label}
                            <br />
                            <span className="text-xs text-gray-500">S/ {categoria.precio}/jaba</span>
                          </th>
                        ),
                      )}
                      <th className="border border-gray-300 p-3 text-center bg-green-50">Total a Pagar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subprocesoEditando.personalAsignado.map((trabajadorId) => {
                      const trabajador = trabajadores.find((t) => t.id === trabajadorId)
                      if (!trabajador) return null

                      return (
                        <tr key={trabajadorId}>
                          <td className="border border-gray-300 p-3">
                            <div className="flex items-center space-x-2">
                              <span>{trabajador.genero === "hombre" ? "👨" : "👩"}</span>
                              <div>
                                <p className="font-medium">
                                  {trabajador.nombre} {trabajador.apellidos}
                                </p>
                                <p className="text-xs text-gray-500">{trabajador.documento}</p>
                              </div>
                            </div>
                          </td>
                          {(subprocesoEditando.nombre === "empaque" ? categoriasEmpaque : categoriasPago).map(
                            (categoria) => (
                              <td key={categoria.value} className="border border-gray-300 p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={matrizJabas[trabajadorId]?.[categoria.value] || ""}
                                  onChange={(e) =>
                                    actualizarMatrizJabas(
                                      trabajadorId,
                                      categoria.value,
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                  className="text-center"
                                />
                              </td>
                            ),
                          )}
                          <td className="border border-gray-300 p-3 text-center bg-green-50 font-semibold">
                            S/ {calcularPagoTrabajador(trabajadorId).toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-semibold">
                      <td className="border border-gray-300 p-3">TOTAL</td>
                      {(subprocesoEditando.nombre === "empaque" ? categoriasEmpaque : categoriasPago).map(
                        (categoria) => (
                          <td key={categoria.value} className="border border-gray-300 p-3 text-center">
                            {subprocesoEditando.personalAsignado.reduce(
                              (sum, trabajadorId) => sum + (matrizJabas[trabajadorId]?.[categoria.value] || 0),
                              0,
                            )}{" "}
                            jabas
                          </td>
                        ),
                      )}
                      <td className="border border-gray-300 p-3 text-center bg-green-100">
                        S/{" "}
                        {subprocesoEditando.personalAsignado
                          .reduce((sum, trabajadorId) => sum + calcularPagoTrabajador(trabajadorId), 0)
                          .toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Resumen por categoría */}
              <div className="grid md:grid-cols-4 gap-4">
                {(subprocesoEditando.nombre === "empaque" ? categoriasEmpaque : categoriasPago).map((categoria) => {
                  const totalJabas = subprocesoEditando.personalAsignado.reduce(
                    (sum, trabajadorId) => sum + (matrizJabas[trabajadorId]?.[categoria.value] || 0),
                    0,
                  )
                  const totalPago = totalJabas * categoria.precio

                  return (
                    <Card key={categoria.value}>
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-sm">{categoria.label}</h4>
                        <p className="text-2xl font-bold">{totalJabas}</p>
                        <p className="text-xs text-gray-500">jabas</p>
                        <p className="text-sm font-medium text-green-600">S/ {totalPago.toFixed(2)}</p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setModalMatrizAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setModalMatrizAbierto(false)}>Guardar Matriz</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
