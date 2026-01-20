"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Package,
  ShoppingCart,
  Split,
  Play,
  Clock,
  Users,
  Calendar,
  Weight,
  Factory,
  Target,
  TrendingUp,
  Settings,
  X,
  Plus,
} from "lucide-react"

interface Lote {
  id: string
  codigo: string
  producto: "curcuma" | "kion" | "jengibre"
  nombreProductor: string
  fechaRecepcion: string
  pesoNeto: number
  numeroJabas: number
  jabasDisponibles: number
  nivelHumedad: number
  estado: "disponible" | "parcial" | "agotado" | "reservado"
  modalidadCompra: "carga-cerrada" | "por-proceso"
  categorias?: {
    exportable: number
    industrial: number
    tronco: number
    descarte: number
  }
  observaciones: string
}

interface Pedido {
  id: string
  codigoVenta: string
  cliente: string
  fechaPedido: string
  fechaEntrega: string
  cantidadRequerida: number
  producto: "curcuma" | "kion" | "jengibre"
  calidad: "exportable" | "industrial" | "mixta"
  estado: "pendiente" | "en-asignacion" | "en-proceso" | "completado" | "cancelado"
  prioridad: "alta" | "media" | "baja"
  observaciones: string
  procesosAsignados: string[]
}

interface Proceso {
  id: string
  codigo: string
  loteOrigen: string
  pedidoDestino: string
  jabasAsignadas: number
  pesoEstimado: number
  fechaInicio: string
  fechaEstimadaFin: string
  estado: "programado" | "en-proceso" | "completado" | "pausado"
  personalAsignado: string[]
  etapaActual: "lavado" | "perfilado" | "seleccion" | "empaquetado" | "finalizado"
  rendimientoReal?: {
    exportable: number
    industrial: number
    tronco: number
    descarte: number
    merma: number
  }
  costos?: {
    manoObra: number
    insumos: number
    energia: number
    agua: number
  }
  observaciones: string
}

const lotesDisponibles: Lote[] = [
  {
    id: "lote-1",
    codigo: "LOT-2024-001",
    producto: "jengibre",
    nombreProductor: "Julian Benito Boza",
    fechaRecepcion: "2024-12-20",
    pesoNeto: 485.5,
    numeroJabas: 80,
    jabasDisponibles: 80,
    nivelHumedad: 5,
    estado: "disponible",
    modalidadCompra: "carga-cerrada",
    categorias: {
      exportable: 350,
      industrial: 100,
      tronco: 25,
      descarte: 10.5,
    },
    observaciones: "Calidad excelente, sin daños mecánicos",
  },
  {
    id: "lote-2",
    codigo: "LOT-2024-002",
    producto: "jengibre",
    nombreProductor: "Cooperativa San Martín",
    fechaRecepcion: "2024-12-21",
    pesoNeto: 320.0,
    numeroJabas: 50,
    jabasDisponibles: 50,
    nivelHumedad: 7,
    estado: "disponible",
    modalidadCompra: "por-proceso",
    observaciones: "Requiere clasificación detallada",
  },
  {
    id: "lote-3",
    codigo: "LOT-2024-003",
    producto: "curcuma",
    nombreProductor: "Agrícola Norte SAC",
    fechaRecepcion: "2024-12-19",
    pesoNeto: 280.5,
    numeroJabas: 45,
    jabasDisponibles: 25,
    nivelHumedad: 3,
    estado: "parcial",
    modalidadCompra: "carga-cerrada",
    categorias: {
      exportable: 200,
      industrial: 60,
      tronco: 15,
      descarte: 5.5,
    },
    observaciones: "Lote parcialmente utilizado",
  },
]

const pedidosActivos: Pedido[] = [
  {
    id: "pedido-1",
    codigoVenta: "VTA-2024-001",
    cliente: "Exportadora Lima",
    fechaPedido: "2024-12-22",
    fechaEntrega: "2024-12-28",
    cantidadRequerida: 200,
    producto: "jengibre",
    calidad: "exportable",
    estado: "pendiente",
    prioridad: "alta",
    observaciones: "Cliente premium, calidad AAA requerida",
    procesosAsignados: [],
  },
  {
    id: "pedido-2",
    codigoVenta: "VTA-2024-002",
    cliente: "Mercado Central",
    fechaPedido: "2024-12-22",
    fechaEntrega: "2024-12-30",
    cantidadRequerida: 150,
    producto: "jengibre",
    calidad: "industrial",
    estado: "pendiente",
    prioridad: "media",
    observaciones: "Mezcla de calidades aceptable",
    procesosAsignados: [],
  },
  {
    id: "pedido-3",
    codigoVenta: "VTA-2024-003",
    cliente: "Supermercados Wong",
    fechaPedido: "2024-12-21",
    fechaEntrega: "2024-12-27",
    cantidadRequerida: 100,
    producto: "curcuma",
    calidad: "exportable",
    estado: "en-asignacion",
    prioridad: "alta",
    observaciones: "Urgente para campaña navideña",
    procesosAsignados: ["PROC-001"],
  },
]

const personalDisponible = [
  { id: "p1", nombre: "Juan Pérez", especialidad: "Lavado" },
  { id: "p2", nombre: "María García", especialidad: "Perfilado" },
  { id: "p3", nombre: "Carlos López", especialidad: "Selección" },
  { id: "p4", nombre: "Ana Ruiz", especialidad: "Empaquetado" },
]

export function AsignacionProcesamiento() {
  const [lotes, setLotes] = useState<Lote[]>(lotesDisponibles)
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosActivos)
  const [procesos, setProcesos] = useState<Proceso[]>([])
  const [showAsignacionModal, setShowAsignacionModal] = useState(false)
  const [showProcesoModal, setShowProcesoModal] = useState(false)
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null)
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null)
  const [draggedLote, setDraggedLote] = useState<Lote | null>(null)
  const [showPedidoModal, setShowPedidoModal] = useState(false)
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null)
  const [isCreatingPedido, setIsCreatingPedido] = useState(false)
  const [pedidoFormData, setPedidoFormData] = useState({
    codigoVenta: "",
    cliente: "",
    fechaPedido: "",
    fechaEntrega: "",
    cantidadRequerida: 0,
    producto: "jengibre" as "curcuma" | "kion" | "jengibre",
    calidad: "exportable" as "exportable" | "industrial" | "mixta",
    prioridad: "media" as "alta" | "media" | "baja",
    observaciones: "",
    lotesAsignados: [] as Array<{
      loteId: string
      jabasAsignadas: number
      pesoEstimado: number
    }>,
  })

  const [asignacionData, setAsignacionData] = useState({
    jabasAsignadas: 0,
    pesoEstimado: 0,
    fechaInicio: "",
    fechaEstimadaFin: "",
    personalAsignado: [] as string[],
    observaciones: "",
  })

  const handleDragStart = (lote: Lote) => {
    setDraggedLote(lote)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, pedido: Pedido) => {
    e.preventDefault()
    if (draggedLote && draggedLote.producto === pedido.producto) {
      setSelectedLote(draggedLote)
      setSelectedPedido(pedido)
      setAsignacionData({
        jabasAsignadas: Math.min(draggedLote.jabasDisponibles, Math.ceil(pedido.cantidadRequerida / 6)),
        pesoEstimado: Math.min(draggedLote.pesoNeto, pedido.cantidadRequerida),
        fechaInicio: new Date().toISOString().split("T")[0],
        fechaEstimadaFin: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        personalAsignado: [],
        observaciones: "",
      })
      setShowAsignacionModal(true)
    }
    setDraggedLote(null)
  }

  const handleCreateProceso = () => {
    if (!selectedLote || !selectedPedido) return

    const nuevoProceso: Proceso = {
      id: `proceso-${Date.now()}`,
      codigo: `PROC-${Date.now().toString().slice(-6)}`,
      loteOrigen: selectedLote.id,
      pedidoDestino: selectedPedido.id,
      jabasAsignadas: asignacionData.jabasAsignadas,
      pesoEstimado: asignacionData.pesoEstimado,
      fechaInicio: asignacionData.fechaInicio,
      fechaEstimadaFin: asignacionData.fechaEstimadaFin,
      estado: "programado",
      personalAsignado: asignacionData.personalAsignado,
      etapaActual: "lavado",
      observaciones: asignacionData.observaciones,
    }

    setProcesos((prev) => [...prev, nuevoProceso])

    // Actualizar lote
    setLotes((prev) =>
      prev.map((lote) => {
        if (lote.id === selectedLote.id) {
          const nuevasJabasDisponibles = lote.jabasDisponibles - asignacionData.jabasAsignadas
          return {
            ...lote,
            jabasDisponibles: nuevasJabasDisponibles,
            estado:
              nuevasJabasDisponibles === 0
                ? "agotado"
                : nuevasJabasDisponibles < lote.numeroJabas
                  ? "parcial"
                  : "disponible",
          }
        }
        return lote
      }),
    )

    // Actualizar pedido
    setPedidos((prev) =>
      prev.map((pedido) => {
        if (pedido.id === selectedPedido.id) {
          return {
            ...pedido,
            procesosAsignados: [...pedido.procesosAsignados, nuevoProceso.codigo],
            estado: "en-asignacion",
          }
        }
        return pedido
      }),
    )

    setShowAsignacionModal(false)
    resetAsignacionData()
  }

  const resetAsignacionData = () => {
    setAsignacionData({
      jabasAsignadas: 0,
      pesoEstimado: 0,
      fechaInicio: "",
      fechaEstimadaFin: "",
      personalAsignado: [],
      observaciones: "",
    })
    setSelectedLote(null)
    setSelectedPedido(null)
  }

  const handleIniciarPedido = (pedido: Pedido) => {
    setPedidos((prev) => prev.map((p) => (p.id === pedido.id ? { ...p, estado: "en-proceso" as const } : p)))
  }

  const handleCancelarPedido = (pedido: Pedido) => {
    // Liberar lotes asignados
    const procesosDelPedido = procesos.filter((p) => p.pedidoDestino === pedido.id)

    procesosDelPedido.forEach((proceso) => {
      setLotes((prev) =>
        prev.map((lote) => {
          if (lote.id === proceso.loteOrigen) {
            const nuevasJabasDisponibles = lote.jabasDisponibles + proceso.jabasAsignadas
            return {
              ...lote,
              jabasDisponibles: nuevasJabasDisponibles,
              estado: nuevasJabasDisponibles === lote.numeroJabas ? ("disponible" as const) : ("parcial" as const),
            }
          }
          return lote
        }),
      )
    })

    // Eliminar procesos del pedido
    setProcesos((prev) => prev.filter((p) => p.pedidoDestino !== pedido.id))

    // Cancelar pedido
    setPedidos((prev) =>
      prev.map((p) => (p.id === pedido.id ? { ...p, estado: "cancelado" as const, procesosAsignados: [] } : p)),
    )
  }

  const handleEditarPedido = (pedido: Pedido) => {
    setEditingPedido(pedido)
    setPedidoFormData({
      codigoVenta: pedido.codigoVenta,
      cliente: pedido.cliente,
      fechaPedido: pedido.fechaPedido,
      fechaEntrega: pedido.fechaEntrega,
      cantidadRequerida: pedido.cantidadRequerida,
      producto: pedido.producto,
      calidad: pedido.calidad,
      prioridad: pedido.prioridad,
      observaciones: pedido.observaciones,
      lotesAsignados: procesos
        .filter((p) => p.pedidoDestino === pedido.id)
        .map((p) => ({
          loteId: p.loteOrigen,
          jabasAsignadas: p.jabasAsignadas,
          pesoEstimado: p.pesoEstimado,
        })),
    })
    setShowPedidoModal(true)
  }

  const handleNuevoPedido = () => {
    setIsCreatingPedido(true)
    setEditingPedido(null)
    setPedidoFormData({
      codigoVenta: `VTA-${new Date().getFullYear()}-${String(pedidos.length + 1).padStart(3, "0")}`,
      cliente: "",
      fechaPedido: new Date().toISOString().split("T")[0],
      fechaEntrega: "",
      cantidadRequerida: 0,
      producto: "jengibre",
      calidad: "exportable",
      prioridad: "media",
      observaciones: "",
      lotesAsignados: [],
    })
    setShowPedidoModal(true)
  }

  const handleGuardarPedido = () => {
    if (isCreatingPedido) {
      // Crear nuevo pedido
      const nuevoPedido: Pedido = {
        id: `pedido-${Date.now()}`,
        ...pedidoFormData,
        estado: "pendiente",
        procesosAsignados: [],
      }
      setPedidos((prev) => [...prev, nuevoPedido])

      // Crear procesos para lotes asignados
      pedidoFormData.lotesAsignados.forEach((loteAsignado) => {
        const nuevoProceso: Proceso = {
          id: `proceso-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          codigo: `PROC-${Date.now().toString().slice(-6)}`,
          loteOrigen: loteAsignado.loteId,
          pedidoDestino: nuevoPedido.id,
          jabasAsignadas: loteAsignado.jabasAsignadas,
          pesoEstimado: loteAsignado.pesoEstimado,
          fechaInicio: new Date().toISOString().split("T")[0],
          fechaEstimadaFin: pedidoFormData.fechaEntrega,
          estado: "programado",
          personalAsignado: [],
          etapaActual: "lavado",
          observaciones: "",
        }
        setProcesos((prev) => [...prev, nuevoProceso])

        // Actualizar lote
        setLotes((prev) =>
          prev.map((lote) => {
            if (lote.id === loteAsignado.loteId) {
              const nuevasJabasDisponibles = lote.jabasDisponibles - loteAsignado.jabasAsignadas
              return {
                ...lote,
                jabasDisponibles: nuevasJabasDisponibles,
                estado:
                  nuevasJabasDisponibles === 0
                    ? ("agotado" as const)
                    : nuevasJabasDisponibles < lote.numeroJabas
                      ? ("parcial" as const)
                      : ("disponible" as const),
              }
            }
            return lote
          }),
        )
      })
    } else if (editingPedido) {
      // Actualizar pedido existente
      setPedidos((prev) => prev.map((p) => (p.id === editingPedido.id ? { ...p, ...pedidoFormData } : p)))
    }

    setShowPedidoModal(false)
    setIsCreatingPedido(false)
    setEditingPedido(null)
  }

  const handleAgregarLoteAPedido = (loteId: string, jabas: number) => {
    const lote = lotes.find((l) => l.id === loteId)
    if (!lote) return

    const pesoEstimado = (jabas * lote.pesoNeto) / lote.numeroJabas

    setPedidoFormData((prev) => ({
      ...prev,
      lotesAsignados: [
        ...prev.lotesAsignados.filter((l) => l.loteId !== loteId),
        { loteId, jabasAsignadas: jabas, pesoEstimado },
      ],
    }))
  }

  const handleRemoverLoteDePedido = (loteId: string) => {
    setPedidoFormData((prev) => ({
      ...prev,
      lotesAsignados: prev.lotesAsignados.filter((l) => l.loteId !== loteId),
    }))
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "disponible":
        return "bg-green-500/10 text-green-500"
      case "parcial":
        return "bg-yellow-500/10 text-yellow-500"
      case "agotado":
        return "bg-red-500/10 text-red-500"
      case "reservado":
        return "bg-blue-500/10 text-blue-500"
      case "pendiente":
        return "bg-orange-500/10 text-orange-500"
      case "en-asignacion":
        return "bg-blue-500/10 text-blue-500"
      case "en-proceso":
        return "bg-purple-500/10 text-purple-500"
      case "completado":
        return "bg-green-500/10 text-green-500"
      case "programado":
        return "bg-gray-500/10 text-gray-500"
      case "pausado":
        return "bg-red-500/10 text-red-500"
      case "cancelado":
        return "bg-red-500/10 text-red-500"
      default:
        return "bg-gray-500/10 text-gray-500"
    }
  }

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case "alta":
        return "bg-red-500/10 text-red-500"
      case "media":
        return "bg-yellow-500/10 text-yellow-500"
      case "baja":
        return "bg-green-500/10 text-green-500"
      default:
        return "bg-gray-500/10 text-gray-500"
    }
  }

  const getEtapaIcon = (etapa: string) => {
    switch (etapa) {
      case "lavado":
        return "🧽"
      case "perfilado":
        return "✂️"
      case "seleccion":
        return "🔍"
      case "empaquetado":
        return "📦"
      case "finalizado":
        return "✅"
      default:
        return "⏳"
    }
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">Asignación y Procesamiento</h1>
          <p className="text-sm text-muted-foreground">Gestión de lotes, pedidos y procesos de producción</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 text-sm">
            <Target className="h-4 w-4" />
            Optimizar Asignación
          </Button>
          <Button onClick={() => setShowProcesoModal(true)} className="gap-2 text-sm">
            <Play className="h-4 w-4" />
            Iniciar Proceso
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
        <Card className="p-3 lg:p-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 lg:h-5 lg:w-5 text-blue-500" />
            <div>
              <p className="text-xs lg:text-sm text-muted-foreground">Lotes Disponibles</p>
              <p className="text-lg lg:text-2xl font-bold">{lotes.filter((l) => l.estado === "disponible").length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 lg:p-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 lg:h-5 lg:w-5 text-green-500" />
            <div>
              <p className="text-xs lg:text-sm text-muted-foreground">Pedidos Activos</p>
              <p className="text-lg lg:text-2xl font-bold">{pedidos.filter((p) => p.estado !== "completado").length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 lg:p-4">
          <div className="flex items-center gap-2">
            <Factory className="h-4 w-4 lg:h-5 lg:w-5 text-purple-500" />
            <div>
              <p className="text-xs lg:text-sm text-muted-foreground">Procesos Activos</p>
              <p className="text-lg lg:text-2xl font-bold">
                {procesos.filter((p) => p.estado !== "completado").length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-3 lg:p-4">
          <div className="flex items-center gap-2">
            <Weight className="h-4 w-4 lg:h-5 lg:w-5 text-orange-500" />
            <div>
              <p className="text-xs lg:text-sm text-muted-foreground">Jabas en Proceso</p>
              <p className="text-lg lg:text-2xl font-bold">{procesos.reduce((sum, p) => sum + p.jabasAsignadas, 0)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 lg:p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5 text-teal-500" />
            <div>
              <p className="text-xs lg:text-sm text-muted-foreground">Eficiencia</p>
              <p className="text-lg lg:text-2xl font-bold">94%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 lg:gap-6">
        {/* Lotes Disponibles */}
        <div className="xl:col-span-1">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-blue-500" />
              <h2 className="font-semibold">Lotes Disponibles</h2>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {lotes
                .filter((lote) => lote.estado !== "agotado")
                .map((lote) => (
                  <Card
                    key={lote.id}
                    className="p-3 cursor-grab hover:shadow-md transition-shadow"
                    draggable
                    onDragStart={() => handleDragStart(lote)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{lote.codigo}</span>
                        <Badge className={getEstadoColor(lote.estado)}>{lote.estado}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <div>{lote.producto.toUpperCase()}</div>
                        <div>{lote.nombreProductor}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Jabas:</span>
                          <span className="ml-1 font-medium">
                            {lote.jabasDisponibles}/{lote.numeroJabas}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Peso:</span>
                          <span className="ml-1 font-medium">{lote.pesoNeto.toFixed(1)} kg</span>
                        </div>
                      </div>
                      {lote.modalidadCompra === "carga-cerrada" && lote.categorias && (
                        <div className="text-xs bg-muted/50 rounded p-2">
                          <div className="font-medium mb-1">Categorías conocidas:</div>
                          <div className="grid grid-cols-2 gap-1">
                            <span>Exp: {lote.categorias.exportable}kg</span>
                            <span>Ind: {lote.categorias.industrial}kg</span>
                            <span>Tronco: {lote.categorias.tronco}kg</span>
                            <span>Desc: {lote.categorias.descarte}kg</span>
                          </div>
                        </div>
                      )}
                      {lote.modalidadCompra === "por-proceso" && (
                        <div className="text-xs bg-yellow-50 dark:bg-yellow-950/20 rounded p-2">
                          <span className="text-yellow-700 dark:text-yellow-300">⚠️ Requiere clasificación</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
            </div>
          </Card>
        </div>

        {/* Pedidos Activos */}
        <div className="xl:col-span-2">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-green-500" />
                <h2 className="font-semibold">Pedidos Activos</h2>
              </div>
              <Button onClick={handleNuevoPedido} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Pedido
              </Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pedidos
                .filter((pedido) => pedido.estado !== "completado" && pedido.estado !== "cancelado")
                .map((pedido) => (
                  <Card
                    key={pedido.id}
                    className="p-4 border-2 border-dashed border-muted hover:border-primary/50 transition-colors"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, pedido)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-sm">{pedido.codigoVenta}</h3>
                          <p className="text-xs text-muted-foreground">{pedido.cliente}</p>
                        </div>
                        <div className="flex gap-1">
                          <Badge className={getPrioridadColor(pedido.prioridad)}>{pedido.prioridad}</Badge>
                          <Badge className={getEstadoColor(pedido.estado)}>{pedido.estado}</Badge>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Package className="h-3 w-3" />
                          <span>{pedido.producto.toUpperCase()}</span>
                          <span>•</span>
                          <span>{pedido.cantidadRequerida} kg</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>Entrega: {pedido.fechaEntrega}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Target className="h-3 w-3" />
                          <span>Calidad: {pedido.calidad}</span>
                        </div>
                      </div>

                      {pedido.procesosAsignados.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-medium">Procesos Asignados:</div>
                          <div className="flex flex-wrap gap-1">
                            {pedido.procesosAsignados.map((procesoId) => {
                              const proceso = procesos.find((p) => p.codigo === procesoId)
                              return (
                                <Badge key={procesoId} variant="outline" className="text-xs">
                                  {procesoId}
                                  {proceso && <span className="ml-1">{getEtapaIcon(proceso.etapaActual)}</span>}
                                </Badge>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                        {pedido.observaciones}
                      </div>

                      {/* Botones de Acción */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditarPedido(pedido)}
                          className="gap-1 text-xs"
                        >
                          <Settings className="h-3 w-3" />
                          Gestionar
                        </Button>

                        {pedido.estado === "pendiente" && (
                          <Button size="sm" onClick={() => handleIniciarPedido(pedido)} className="gap-1 text-xs">
                            <Play className="h-3 w-3" />
                            Iniciar
                          </Button>
                        )}

                        {pedido.estado !== "completado" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleCancelarPedido(pedido)}
                            className="gap-1 text-xs"
                          >
                            <X className="h-3 w-3" />
                            Cancelar
                          </Button>
                        )}
                      </div>

                      {pedido.estado === "pendiente" && (
                        <div className="text-center text-xs text-muted-foreground border-t pt-2">
                          Arrastra un lote aquí para asignar
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
            </div>
          </Card>
        </div>

        {/* Procesos en Curso */}
        <div className="xl:col-span-1">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Factory className="h-5 w-5 text-purple-500" />
              <h2 className="font-semibold">Procesos en Curso</h2>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {procesos.map((proceso) => {
                const loteOrigen = lotes.find((l) => l.id === proceso.loteOrigen)
                const pedidoDestino = pedidos.find((p) => p.id === proceso.pedidoDestino)
                return (
                  <Card key={proceso.id} className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{proceso.codigo}</span>
                        <Badge className={getEstadoColor(proceso.estado)}>{proceso.estado}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <div>De: {loteOrigen?.codigo}</div>
                        <div>Para: {pedidoDestino?.codigoVenta}</div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-2xl">{getEtapaIcon(proceso.etapaActual)}</span>
                        <div>
                          <div className="font-medium">{proceso.etapaActual}</div>
                          <div className="text-muted-foreground">{proceso.jabasAsignadas} jabas</div>
                        </div>
                      </div>
                      {proceso.personalAsignado.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <div className="flex gap-1">
                            {proceso.personalAsignado.map((personaId) => {
                              const persona = personalDisponible.find((p) => p.id === personaId)
                              return (
                                <Avatar key={personaId} className="h-5 w-5">
                                  <AvatarFallback className="text-xs">
                                    {persona?.nombre
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Fin: {proceso.fechaEstimadaFin}</span>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal de Asignación */}
      {showAsignacionModal && selectedLote && selectedPedido && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h2 className="text-lg lg:text-xl font-semibold">Asignar Lote a Pedido</h2>
                <Button variant="ghost" onClick={() => setShowAsignacionModal(false)}>
                  ×
                </Button>
              </div>

              <div className="space-y-6">
                {/* Información de Origen y Destino */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="p-4 bg-blue-50 dark:bg-blue-950/20">
                    <h3 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Lote Origen</h3>
                    <div className="space-y-1 text-sm">
                      <div>
                        <strong>Código:</strong> {selectedLote.codigo}
                      </div>
                      <div>
                        <strong>Productor:</strong> {selectedLote.nombreProductor}
                      </div>
                      <div>
                        <strong>Jabas disponibles:</strong> {selectedLote.jabasDisponibles}
                      </div>
                      <div>
                        <strong>Peso neto:</strong> {selectedLote.pesoNeto.toFixed(1)} kg
                      </div>
                      <div>
                        <strong>Modalidad:</strong> {selectedLote.modalidadCompra}
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 bg-green-50 dark:bg-green-950/20">
                    <h3 className="font-medium text-green-700 dark:text-green-300 mb-2">Pedido Destino</h3>
                    <div className="space-y-1 text-sm">
                      <div>
                        <strong>Código:</strong> {selectedPedido.codigoVenta}
                      </div>
                      <div>
                        <strong>Cliente:</strong> {selectedPedido.cliente}
                      </div>
                      <div>
                        <strong>Cantidad requerida:</strong> {selectedPedido.cantidadRequerida} kg
                      </div>
                      <div>
                        <strong>Calidad:</strong> {selectedPedido.calidad}
                      </div>
                      <div>
                        <strong>Entrega:</strong> {selectedPedido.fechaEntrega}
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Configuración del Proceso */}
                <div className="space-y-4">
                  <h3 className="font-medium">Configuración del Proceso</h3>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="jabasAsignadas">Jabas a Asignar *</Label>
                      <Input
                        id="jabasAsignadas"
                        type="number"
                        min="1"
                        max={selectedLote.jabasDisponibles}
                        value={asignacionData.jabasAsignadas}
                        onChange={(e) =>
                          setAsignacionData((prev) => ({
                            ...prev,
                            jabasAsignadas: Number.parseInt(e.target.value) || 0,
                            pesoEstimado:
                              (Number.parseInt(e.target.value) || 0) *
                              (selectedLote.pesoNeto / selectedLote.numeroJabas),
                          }))
                        }
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Máximo: {selectedLote.jabasDisponibles} jabas disponibles
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="pesoEstimado">Peso Estimado (kg)</Label>
                      <Input
                        id="pesoEstimado"
                        type="number"
                        step="0.1"
                        value={asignacionData.pesoEstimado.toFixed(1)}
                        onChange={(e) =>
                          setAsignacionData((prev) => ({
                            ...prev,
                            pesoEstimado: Number.parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fechaInicio">Fecha de Inicio</Label>
                      <Input
                        id="fechaInicio"
                        type="date"
                        value={asignacionData.fechaInicio}
                        onChange={(e) => setAsignacionData((prev) => ({ ...prev, fechaInicio: e.target.value }))}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fechaEstimadaFin">Fecha Estimada de Fin</Label>
                      <Input
                        id="fechaEstimadaFin"
                        type="date"
                        value={asignacionData.fechaEstimadaFin}
                        onChange={(e) => setAsignacionData((prev) => ({ ...prev, fechaEstimadaFin: e.target.value }))}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Personal Asignado</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {personalDisponible.map((persona) => (
                        <label
                          key={persona.id}
                          className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50"
                        >
                          <input
                            type="checkbox"
                            checked={asignacionData.personalAsignado.includes(persona.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAsignacionData((prev) => ({
                                  ...prev,
                                  personalAsignado: [...prev.personalAsignado, persona.id],
                                }))
                              } else {
                                setAsignacionData((prev) => ({
                                  ...prev,
                                  personalAsignado: prev.personalAsignado.filter((id) => id !== persona.id),
                                }))
                              }
                            }}
                          />
                          <div className="text-sm">
                            <div className="font-medium">{persona.nombre}</div>
                            <div className="text-xs text-muted-foreground">{persona.especialidad}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="observaciones">Observaciones</Label>
                    <Textarea
                      id="observaciones"
                      value={asignacionData.observaciones}
                      onChange={(e) => setAsignacionData((prev) => ({ ...prev, observaciones: e.target.value }))}
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                </div>

                {/* Resumen */}
                <Card className="p-4 bg-muted/50">
                  <h4 className="font-medium mb-2">Resumen del Proceso</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Código del proceso:</span>
                      <p className="font-medium">PROC-{Date.now().toString().slice(-6)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Jabas restantes en lote:</span>
                      <p className="font-medium">{selectedLote.jabasDisponibles - asignacionData.jabasAsignadas}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Estado del lote después:</span>
                      <p className="font-medium">
                        {selectedLote.jabasDisponibles - asignacionData.jabasAsignadas === 0 ? "Agotado" : "Parcial"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duración estimada:</span>
                      <p className="font-medium">
                        {asignacionData.fechaInicio && asignacionData.fechaEstimadaFin
                          ? Math.ceil(
                              (new Date(asignacionData.fechaEstimadaFin).getTime() -
                                new Date(asignacionData.fechaInicio).getTime()) /
                                (1000 * 60 * 60 * 24),
                            )
                          : 0}{" "}
                        días
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-6 border-t">
                <Button variant="outline" onClick={() => setShowAsignacionModal(false)} className="text-sm">
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateProceso}
                  disabled={asignacionData.jabasAsignadas === 0 || !asignacionData.fechaInicio}
                  className="text-sm"
                >
                  <Split className="h-4 w-4 mr-2" />
                  Crear Proceso
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal de Gestión de Pedidos */}
      {showPedidoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h2 className="text-lg lg:text-xl font-semibold">
                  {isCreatingPedido ? "Nuevo Pedido" : "Gestionar Pedido"}
                </h2>
                <Button variant="ghost" onClick={() => setShowPedidoModal(false)}>
                  ×
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Información del Pedido */}
                <div className="space-y-4">
                  <h3 className="font-medium">Información del Pedido</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="codigoVenta">Código de Venta</Label>
                      <Input
                        id="codigoVenta"
                        value={pedidoFormData.codigoVenta}
                        onChange={(e) => setPedidoFormData((prev) => ({ ...prev, codigoVenta: e.target.value }))}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cliente">Cliente</Label>
                      <Input
                        id="cliente"
                        value={pedidoFormData.cliente}
                        onChange={(e) => setPedidoFormData((prev) => ({ ...prev, cliente: e.target.value }))}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fechaPedido">Fecha de Pedido</Label>
                      <Input
                        id="fechaPedido"
                        type="date"
                        value={pedidoFormData.fechaPedido}
                        onChange={(e) => setPedidoFormData((prev) => ({ ...prev, fechaPedido: e.target.value }))}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fechaEntrega">Fecha de Entrega</Label>
                      <Input
                        id="fechaEntrega"
                        type="date"
                        value={pedidoFormData.fechaEntrega}
                        onChange={(e) => setPedidoFormData((prev) => ({ ...prev, fechaEntrega: e.target.value }))}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="producto">Producto</Label>
                      <select
                        id="producto"
                        value={pedidoFormData.producto}
                        onChange={(e) =>
                          setPedidoFormData((prev) => ({
                            ...prev,
                            producto: e.target.value as "curcuma" | "kion" | "jengibre",
                            lotesAsignados: [], // Reset lotes when changing product
                          }))
                        }
                        className="w-full p-2 border rounded text-sm"
                      >
                        <option value="jengibre">Jengibre</option>
                        <option value="curcuma">Cúrcuma</option>
                        <option value="kion">Kion</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="cantidadRequerida">Cantidad Requerida (kg)</Label>
                      <Input
                        id="cantidadRequerida"
                        type="number"
                        value={pedidoFormData.cantidadRequerida}
                        onChange={(e) =>
                          setPedidoFormData((prev) => ({ ...prev, cantidadRequerida: Number(e.target.value) }))
                        }
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="calidad">Calidad</Label>
                      <select
                        id="calidad"
                        value={pedidoFormData.calidad}
                        onChange={(e) =>
                          setPedidoFormData((prev) => ({
                            ...prev,
                            calidad: e.target.value as "exportable" | "industrial" | "mixta",
                          }))
                        }
                        className="w-full p-2 border rounded text-sm"
                      >
                        <option value="exportable">Exportable</option>
                        <option value="industrial">Industrial</option>
                        <option value="mixta">Mixta</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="prioridad">Prioridad</Label>
                      <select
                        id="prioridad"
                        value={pedidoFormData.prioridad}
                        onChange={(e) =>
                          setPedidoFormData((prev) => ({
                            ...prev,
                            prioridad: e.target.value as "alta" | "media" | "baja",
                          }))
                        }
                        className="w-full p-2 border rounded text-sm"
                      >
                        <option value="alta">Alta</option>
                        <option value="media">Media</option>
                        <option value="baja">Baja</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="observacionesPedido">Observaciones</Label>
                    <Textarea
                      id="observacionesPedido"
                      value={pedidoFormData.observaciones}
                      onChange={(e) => setPedidoFormData((prev) => ({ ...prev, observaciones: e.target.value }))}
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                </div>

                {/* Gestión de Lotes */}
                <div className="space-y-4">
                  <h3 className="font-medium">Lotes Asignados</h3>

                  {/* Lotes ya asignados */}
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {pedidoFormData.lotesAsignados.map((loteAsignado) => {
                      const lote = lotes.find((l) => l.id === loteAsignado.loteId)
                      if (!lote) return null

                      return (
                        <Card key={loteAsignado.loteId} className="p-3 bg-green-50 dark:bg-green-950/20">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{lote.codigo}</div>
                              <div className="text-xs text-muted-foreground">{lote.nombreProductor}</div>
                              <div className="text-xs">
                                <span>Jabas: {loteAsignado.jabasAsignadas}</span>
                                <span className="ml-2">Peso: {loteAsignado.pesoEstimado.toFixed(1)} kg</span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoverLoteDePedido(loteAsignado.loteId)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      )
                    })}
                  </div>

                  {/* Lotes disponibles para agregar */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">Lotes Disponibles ({pedidoFormData.producto})</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {lotes
                        .filter(
                          (lote) =>
                            lote.producto === pedidoFormData.producto &&
                            lote.jabasDisponibles > 0 &&
                            !pedidoFormData.lotesAsignados.some((la) => la.loteId === lote.id),
                        )
                        .map((lote) => (
                          <Card key={lote.id} className="p-3">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-sm">{lote.codigo}</div>
                                  <div className="text-xs text-muted-foreground">{lote.nombreProductor}</div>
                                </div>
                                <Badge className={getEstadoColor(lote.estado)}>{lote.estado}</Badge>
                              </div>

                              <div className="text-xs">
                                <span>
                                  Disponibles: {lote.jabasDisponibles}/{lote.numeroJabas} jabas
                                </span>
                                <span className="ml-2">Peso: {lote.pesoNeto.toFixed(1)} kg</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="1"
                                  max={lote.jabasDisponibles}
                                  placeholder="Jabas"
                                  className="text-xs h-8 w-20"
                                  id={`jabas-${lote.id}`}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const input = document.getElementById(`jabas-${lote.id}`) as HTMLInputElement
                                    const jabas = Number.parseInt(input.value) || 0
                                    if (jabas > 0 && jabas <= lote.jabasDisponibles) {
                                      handleAgregarLoteAPedido(lote.id, jabas)
                                      input.value = ""
                                    }
                                  }}
                                  className="gap-1 text-xs h-8"
                                >
                                  <Plus className="h-3 w-3" />
                                  Agregar
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                    </div>
                  </div>

                  {/* Resumen */}
                  <Card className="p-3 bg-muted/50">
                    <h4 className="font-medium text-sm mb-2">Resumen</h4>
                    <div className="text-xs space-y-1">
                      <div>
                        Total jabas asignadas:{" "}
                        {pedidoFormData.lotesAsignados.reduce((sum, l) => sum + l.jabasAsignadas, 0)}
                      </div>
                      <div>
                        Peso total estimado:{" "}
                        {pedidoFormData.lotesAsignados.reduce((sum, l) => sum + l.pesoEstimado, 0).toFixed(1)} kg
                      </div>
                      <div>Cantidad requerida: {pedidoFormData.cantidadRequerida} kg</div>
                      <div
                        className={
                          pedidoFormData.lotesAsignados.reduce((sum, l) => sum + l.pesoEstimado, 0) >=
                          pedidoFormData.cantidadRequerida
                            ? "text-green-600 font-medium"
                            : "text-red-600 font-medium"
                        }
                      >
                        {pedidoFormData.lotesAsignados.reduce((sum, l) => sum + l.pesoEstimado, 0) >=
                        pedidoFormData.cantidadRequerida
                          ? "✅ Cantidad suficiente"
                          : "⚠️ Cantidad insuficiente"}
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-6 border-t">
                <Button variant="outline" onClick={() => setShowPedidoModal(false)} className="text-sm">
                  Cancelar
                </Button>
                <Button
                  onClick={handleGuardarPedido}
                  disabled={
                    !pedidoFormData.cliente || !pedidoFormData.fechaEntrega || pedidoFormData.cantidadRequerida <= 0
                  }
                  className="text-sm"
                >
                  {isCreatingPedido ? "Crear Pedido" : "Guardar Cambios"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
