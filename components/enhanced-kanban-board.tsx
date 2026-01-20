"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { lotesService } from "@/lib/services/lotes-service"
import { useApi } from "@/lib/hooks/use-api"
import { usePersonas } from "@/lib/hooks/use-personas"
import type { Lote } from "@/lib/types"
import { Package, Clock, Weight, DollarSign } from "lucide-react"

interface ProcesoEnCurso {
  id: string
  codigo: string
  loteId: string
  codigoLote: string
  producto: string
  variedad: string
  etapa: string
  jabasActuales: number
  pesoEstimado: number
  responsable: string
  fechaInicio: string
  estado: "pendiente" | "en-proceso" | "completado" | "pausado"
  subprocesos: any[]
  costoTotal: number
}

const ETAPAS = [
  { id: "pendiente", nombre: "Lotes Disponibles", color: "bg-gray-100" },
  { id: "asignado", nombre: "Procesos Asignados", color: "bg-blue-100" },
  { id: "en-proceso", nombre: "En Proceso", color: "bg-yellow-100" },
  { id: "completado", nombre: "Completados", color: "bg-green-100" },
]

const SUBPROCESOS_DISPONIBLES = [
  "Lavado",
  "Perfilado",
  "Selección",
  "Empaquetado",
  "Control de Calidad",
  "Almacenamiento",
]

export function EnhancedKanbanBoard() {
  const { toast } = useToast()
  const [procesosEnCurso, setProcesosEnCurso] = useState<ProcesoEnCurso[]>([])
  const [isAsignarPersonalOpen, setIsAsignarPersonalOpen] = useState(false)
  const [isIniciarProcesoOpen, setIsIniciarProcesoOpen] = useState(false)
  const [isDescontarJabasOpen, setIsDescontarJabasOpen] = useState(false)
  const [selectedProceso, setSelectedProceso] = useState<ProcesoEnCurso | null>(null)
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null)
  const [personalSeleccionado, setPersonalSeleccionado] = useState<string[]>([])
  const [procesoForm, setProcesoForm] = useState({
    responsable: "",
    subprocesos: [] as string[],
    observaciones: "",
  })
  const [descontoForm, setDescontoForm] = useState({
    cantidadJabas: 0,
    destino: "almacen" as "almacen" | "sobrantes",
    categoria: "exportable" as "exportable" | "industrial" | "jugo" | "descarte",
    motivo: "",
  })

  // Cargar datos
  const { data: lotes, refresh: refreshLotes } = useApi(lotesService, { initialLoad: true })
  const { data: personal } = usePersonas(true)

  // Filtrar personal disponible (jornaleros)
  const personalDisponible = personal.filter((p) => p.roles?.includes("jornalero") || p.roles?.includes("operario"))

  // Generar procesos desde lotes disponibles
  useEffect(() => {
    const generarProcesosDesdeProduccion = () => {
      const procesosGenerados: ProcesoEnCurso[] = []

      lotes.forEach((lote) => {
        if (lote.estado === "disponible") {
          // Lotes disponibles para convertir en procesos
          procesosGenerados.push({
            id: `lote-${lote.$id}`,
            codigo: `${lote.codigo}`,
            loteId: lote.$id,
            codigoLote: lote.codigo,
            producto: lote.producto,
            variedad: lote.variedad || "",
            etapa: "pendiente",
            jabasActuales: lote.jabasDisponibles,
            pesoEstimado: lote.jabasDisponibles * lote.pesoPromedioPorJaba,
            responsable: "",
            fechaInicio: lote.fechaRecepcion,
            estado: "pendiente",
            subprocesos: [],
            costoTotal: 0,
          })
        } else if (lote.estado === "en-proceso") {
          // Lotes que ya son procesos
          procesosGenerados.push({
            id: `proceso-${lote.$id}`,
            codigo: `${lote.codigo}-P01`, // Código de proceso
            loteId: lote.$id,
            codigoLote: lote.codigo,
            producto: lote.producto,
            variedad: lote.variedad || "",
            etapa: "en-proceso",
            jabasActuales: lote.jabasDisponibles,
            pesoEstimado: lote.jabasDisponibles * lote.pesoPromedioPorJaba,
            responsable: lote.responsableRecepcion || "",
            fechaInicio: lote.fechaRecepcion,
            estado: "en-proceso",
            subprocesos: [], // Se cargarían desde la base de datos
            costoTotal: 0,
          })
        }
      })

      setProcesosEnCurso(procesosGenerados)
    }

    if (lotes.length > 0) {
      generarProcesosDesdeProduccion()
    }
  }, [lotes])

  const handleIniciarProceso = (lote: Lote) => {
    setSelectedLote(lote)
    setProcesoForm({
      responsable: "",
      subprocesos: [],
      observaciones: "",
    })
    setIsIniciarProcesoOpen(true)
  }

  const handleAsignarPersonal = (proceso: ProcesoEnCurso) => {
    setSelectedProceso(proceso)
    setPersonalSeleccionado([])
    setIsAsignarPersonalOpen(true)
  }

  const handleDescontarJabas = (proceso: ProcesoEnCurso) => {
    setSelectedProceso(proceso)
    setDescontoForm({
      cantidadJabas: 0,
      destino: "almacen",
      categoria: "exportable",
      motivo: "",
    })
    setIsDescontarJabasOpen(true)
  }

  const handleSubmitIniciarProceso = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedLote) return

    try {
      // Convertir lote en proceso
      const codigoProceso = `${selectedLote.codigo}-P01`

      // Actualizar el lote a estado "en-proceso"
      await lotesService.update(selectedLote.$id, {
        estado: "en-proceso",
      })

      toast({
        title: "Proceso iniciado",
        description: `El lote ${selectedLote.codigo} se ha convertido en proceso ${codigoProceso}`,
      })

      setIsIniciarProcesoOpen(false)
      refreshLotes()
    } catch (error) {
      console.error("Error al iniciar proceso:", error)
      toast({
        title: "Error",
        description: "No se pudo iniciar el proceso",
        variant: "destructive",
      })
    }
  }

  const handleSubmitDescontarJabas = async () => {
    if (!selectedProceso) return

    try {
      const lote = lotes.find((l) => l.$id === selectedProceso.loteId)
      if (!lote) return

      const nuevasJabas = lote.jabasDisponibles - descontoForm.cantidadJabas

      await lotesService.update(lote.$id, {
        jabasDisponibles: nuevasJabas,
        estado: nuevasJabas === 0 ? "completado" : lote.estado,
      })

      toast({
        title: "Jabas descontadas",
        description: `Se han descontado ${descontoForm.cantidadJabas} jabas del proceso ${selectedProceso.codigo}`,
      })

      setIsDescontarJabasOpen(false)
      refreshLotes()
    } catch (error) {
      console.error("Error al descontar jabas:", error)
      toast({
        title: "Error",
        description: "No se pudieron descontar las jabas",
        variant: "destructive",
      })
    }
  }

  const avanzarSubproceso = async (proceso: ProcesoEnCurso, subprocesoIndex: number) => {
    // Lógica para avanzar subproceso (Pendiente → En Curso → Completado)
    toast({
      title: "Subproceso avanzado",
      description: `Subproceso actualizado para ${proceso.codigo}`,
    })
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Lotes Disponibles</p>
                <p className="text-2xl font-bold">{lotes.filter((l) => l.estado === "pendiente").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Procesos Activos</p>
                <p className="text-2xl font-bold">{lotes.filter((l) => l.estado === "proceso").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Weight className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Peso</p>
                <p className="text-2xl font-bold">
                  {lotes
                    .filter((l) => l.estado === "proceso")
                    .reduce((total, l) => total + l.peso_neto, 0)
                    .toFixed(0)}{" "}
                  kg
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Personal Activo</p>
                <p className="text-2xl font-bold">{personal.filter((p) => p.activo).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center py-12 text-muted-foreground">
        <p>Tablero Kanban en desarrollo</p>
        <p className="text-sm">Los endpoints del backend están siendo implementados</p>
      </div>

      {/* Board Kanban */}
      {/* Tablero Kanban en desarrollo */}
    </div>
  )
}
