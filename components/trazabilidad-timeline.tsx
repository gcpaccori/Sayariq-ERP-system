"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { lotesService } from "@/lib/services/lotes-service"
import { procesosService } from "@/lib/services/procesos-service"
import { useApi } from "@/lib/hooks/use-api"
import type { Lote, Particion } from "@/lib/types"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Loader2, AlertCircle } from "lucide-react"

export function TrazabilidadTimeline() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("activos")
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null)
  const [selectedParticion, setSelectedParticion] = useState<Particion | null>(null)
  const [isProcesoDialogOpen, setIsProcesoDialogOpen] = useState(false)
  const [isDetalleDialogOpen, setIsDetalleDialogOpen] = useState(false)
  const [procesoForm, setProcesoForm] = useState({
    tipo: "",
    descripcion: "",
    duracionHoras: 0,
    duracionMinutos: 0,
    jabasInicio: 0,
    jabasFinal: 0,
    pesoInicio: 0,
    pesoFinal: 0,
    costoManoObra: 0,
    costoInsumos: 0,
    costoOtros: 0,
  })

  const {
    data: lotes,
    loading: loadingLotes,
    error: errorLotes,
    update: updateLote,
    refresh: refreshLotes,
  } = useApi(lotesService, { initialLoad: true })

  const {
    data: procesos,
    loading: loadingProcesos,
    error: errorProcesos,
    create: createProceso,
    refresh: refreshProcesos,
  } = useApi(procesosService, { initialLoad: true })

  // Filtrar lotes según la pestaña activa
  const [filteredLotes, setFilteredLotes] = useState<Lote[]>([])

  useEffect(() => {
    if (lotes.length > 0) {
      let filtered = [...lotes]

      // Filtrar por estado
      if (activeTab === "activos") {
        filtered = filtered.filter(
          (lote) =>
            lote.estado === "disponible" ||
            lote.estado === "parcial" ||
            lote.particiones?.some((p) => p.estado === "en_proceso"),
        )
      } else if (activeTab === "completados") {
        filtered = filtered.filter(
          (lote) =>
            lote.estado === "agotado" ||
            lote.estado === "liquidado" ||
            lote.particiones?.every((p) => p.estado === "completado"),
        )
      }

      setFilteredLotes(filtered)
    } else {
      setFilteredLotes([])
    }
  }, [lotes, activeTab])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setProcesoForm((prev) => ({
      ...prev,
      [name]: [
        "duracionHoras",
        "duracionMinutos",
        "jabasInicio",
        "jabasFinal",
        "pesoInicio",
        "pesoFinal",
        "costoManoObra",
        "costoInsumos",
        "costoOtros",
      ].includes(name)
        ? Number.parseFloat(value) || 0
        : value,
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setProcesoForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectLote = (lote: Lote) => {
    setSelectedLote(lote)
    setSelectedParticion(null)
  }

  const handleSelectParticion = (particion: Particion) => {
    setSelectedParticion(particion)
  }

  const handleSubmitProceso = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedLote || !selectedParticion) {
      toast({
        title: "Error",
        description: "Debe seleccionar un lote y una partición",
        variant: "destructive",
      })
      return
    }

    if (!procesoForm.tipo) {
      toast({
        title: "Error",
        description: "Debe seleccionar un tipo de proceso",
        variant: "destructive",
      })
      return
    }

    if (procesoForm.jabasFinal > procesoForm.jabasInicio) {
      toast({
        title: "Error",
        description: "El número de jabas final no puede ser mayor al inicial",
        variant: "destructive",
      })
      return
    }

    try {
      const duracionTotal = procesoForm.duracionHoras * 60 + procesoForm.duracionMinutos
      const costoTotal = procesoForm.costoManoObra + procesoForm.costoInsumos + procesoForm.costoOtros

      // TODO: Crear el proceso cuando el endpoint esté disponible
      console.warn("Creación de procesos pendiente de implementación en el backend")

      toast({
        title: "Proceso registrado",
        description: `El proceso ha sido registrado exitosamente`,
      })

      setIsProcesoDialogOpen(false)
      setProcesoForm({
        tipo: "",
        descripcion: "",
        duracionHoras: 0,
        duracionMinutos: 0,
        jabasInicio: 0,
        jabasFinal: 0,
        pesoInicio: 0,
        pesoFinal: 0,
        costoManoObra: 0,
        costoInsumos: 0,
        costoOtros: 0,
      })

      refreshLotes()
      refreshProcesos()
    } catch (error) {
      console.error("Error al registrar proceso:", error)
      toast({
        title: "Error",
        description: "No se pudo registrar el proceso. Intente nuevamente.",
        variant: "destructive",
      })
    }
  }

  const handleCrearParticion = async () => {
    if (!selectedLote) return

    try {
      if (selectedLote.peso_neto <= 0) {
        toast({
          title: "Error",
          description: "No hay peso disponible para crear una partición",
          variant: "destructive",
        })
        return
      }

      // TODO: Crear nueva partición cuando el backend esté disponible
      console.warn("Creación de particiones pendiente de implementación en el backend")

      toast({
        title: "Partición creada",
        description: `La partición ha sido creada exitosamente`,
      })

      refreshLotes()
    } catch (error) {
      console.error("Error al crear partición:", error)
      toast({
        title: "Error",
        description: "No se pudo crear la partición. Intente nuevamente.",
        variant: "destructive",
      })
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: es })
    } catch (error) {
      return dateString
    }
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "en_proceso":
        return <Badge className="bg-yellow-500">En Proceso</Badge>
      case "completado":
        return <Badge className="bg-green-500">Completado</Badge>
      default:
        return <Badge className="bg-gray-500">{estado}</Badge>
    }
  }

  const getTipoProcesoBadge = (tipo: string) => {
    switch (tipo) {
      case "recepcion":
        return <Badge className="bg-blue-500">Recepción</Badge>
      case "seleccion":
        return <Badge className="bg-purple-500">Selección</Badge>
      case "lavado":
        return <Badge className="bg-cyan-500">Lavado</Badge>
      case "secado":
        return <Badge className="bg-orange-500">Secado</Badge>
      case "empaque":
        return <Badge className="bg-green-500">Empaque</Badge>
      case "almacenamiento":
        return <Badge className="bg-gray-500">Almacenamiento</Badge>
      default:
        return <Badge className="bg-gray-500">{tipo}</Badge>
    }
  }

  const calcularProgreso = (particion: Particion) => {
    if (!particion.procesos || particion.procesos.length === 0) return 0

    // Calcular progreso basado en la cantidad de procesos completados
    // Asumimos que un lote completo pasa por 5 procesos: recepción, selección, lavado, secado y empaque
    const procesosCompletados = new Set(particion.procesos.map((p) => p.tipo)).size
    return Math.min((procesosCompletados / 5) * 100, 100)
  }

  const calcularCostoTotal = (particion: Particion) => {
    if (!particion.procesos || particion.procesos.length === 0) return 0

    return particion.procesos.reduce((total, proceso) => total + (proceso.costoTotal || 0), 0)
  }

  if (loadingLotes && lotes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Cargando datos de trazabilidad...</span>
      </div>
    )
  }

  if (errorLotes) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Error al cargar los datos</h3>
        <p className="text-gray-600 mb-4">{errorLotes}</p>
        <Button onClick={refreshLotes}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Trazabilidad</h2>
          <p className="text-muted-foreground">Seguimiento de lotes y procesos</p>
        </div>
      </div>

      <div className="text-center py-12 text-muted-foreground">
        <p>Sistema de trazabilidad en desarrollo</p>
        <p className="text-sm">Los endpoints del backend están siendo implementados</p>
      </div>
    </div>
  )
}
