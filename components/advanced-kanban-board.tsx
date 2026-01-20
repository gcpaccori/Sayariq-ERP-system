"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar, Clock, DollarSign, Package, Plus, Edit, Users, Utensils, Timer } from "lucide-react"

interface Trabajador {
  id: string
  nombre: string
  tipo: "fijo" | "jornalero"
  tarifaHora?: number
  tarifaDia?: number
  especialidad: string[]
  disponible: boolean
}

interface Tarea {
  id: string
  titulo: string
  lote: string
  producto: string
  cantidad: string
  responsables: string[]
  fechaInicio: string
  fechaVencimiento: string
  horaInicio?: string
  horaFin?: string
  prioridad: "Alta" | "Media" | "Baja"
  costo: string
  descripcion: string
  incluirAlmuerzo: boolean
  pagoJornaleros: {
    [trabajadorId: string]: {
      horas: number
      tarifa: number
      almuerzo: boolean
      total: number
    }
  }
  estado: "pendiente" | "en-proceso" | "pausada" | "completada"
  progreso: number
  observaciones: string
  materialesRequeridos: string[]
  equiposRequeridos: string[]
}

interface Column {
  id: string
  title: string
  tasks: Tarea[]
  color: string
  limite?: number
}

const trabajadoresDisponibles: Trabajador[] = [
  {
    id: "t1",
    nombre: "Juan Pérez",
    tipo: "fijo",
    especialidad: ["recepcion", "lavado"],
    disponible: true,
  },
  {
    id: "t2",
    nombre: "María García",
    tipo: "jornalero",
    tarifaHora: 8.5,
    tarifaDia: 65,
    especialidad: ["control-calidad", "empaquetado"],
    disponible: true,
  },
  {
    id: "t3",
    nombre: "Carlos López",
    tipo: "fijo",
    especialidad: ["procesamiento", "deshidratado"],
    disponible: true,
  },
  {
    id: "t4",
    nombre: "Ana Ruiz",
    tipo: "jornalero",
    tarifaHora: 7.5,
    tarifaDia: 60,
    especialidad: ["empaquetado", "etiquetado"],
    disponible: true,
  },
  {
    id: "t5",
    nombre: "Luis Torres",
    tipo: "jornalero",
    tarifaHora: 9.0,
    tarifaDia: 70,
    especialidad: ["almacen", "transporte"],
    disponible: false,
  },
]

const initialColumns: Column[] = [
  {
    id: "pendientes",
    title: "Tareas Pendientes",
    color: "bg-gray-500",
    limite: 10,
    tasks: [
      {
        id: "task-1",
        titulo: "Recepción Kion Orgánico",
        lote: "LOT-2024-019",
        producto: "Kion",
        cantidad: "500 kg",
        responsables: ["t1"],
        fechaInicio: "2024-12-21",
        fechaVencimiento: "2024-12-21",
        horaInicio: "08:00",
        horaFin: "12:00",
        prioridad: "Alta",
        costo: "$320",
        descripcion: "Recepción y control inicial de calidad de kion orgánico certificado",
        incluirAlmuerzo: false,
        pagoJornaleros: {},
        estado: "pendiente",
        progreso: 0,
        observaciones: "",
        materialesRequeridos: ["Balanza", "Termómetro", "Higrómetro"],
        equiposRequeridos: ["Montacargas", "Pallets"],
      },
    ],
  },
  {
    id: "asignadas",
    title: "Asignadas",
    color: "bg-blue-500",
    limite: 8,
    tasks: [
      {
        id: "task-2",
        titulo: "Lavado Cúrcuma Premium",
        lote: "LOT-2024-020",
        producto: "Cúrcuma",
        cantidad: "300 kg",
        responsables: ["t2", "t4"],
        fechaInicio: "2024-12-21",
        fechaVencimiento: "2024-12-21",
        horaInicio: "09:00",
        horaFin: "17:00",
        prioridad: "Media",
        costo: "$450",
        descripcion: "Proceso de lavado y desinfección con ozono",
        incluirAlmuerzo: true,
        pagoJornaleros: {
          t2: { horas: 8, tarifa: 8.5, almuerzo: true, total: 78 }, // 8.5 * 8 + 10 almuerzo
          t4: { horas: 8, tarifa: 7.5, almuerzo: true, total: 70 }, // 7.5 * 8 + 10 almuerzo
        },
        estado: "pendiente",
        progreso: 0,
        observaciones: "Verificar temperatura del agua",
        materialesRequeridos: ["Ozono", "Agua tratada", "Detergente orgánico"],
        equiposRequeridos: ["Lavadora industrial", "Sistema de ozono"],
      },
    ],
  },
  {
    id: "en-proceso",
    title: "En Proceso",
    color: "bg-yellow-500",
    limite: 6,
    tasks: [
      {
        id: "task-3",
        titulo: "Deshidratado Kion",
        lote: "LOT-2024-018",
        producto: "Kion Deshidratado",
        cantidad: "200 kg",
        responsables: ["t3"],
        fechaInicio: "2024-12-20",
        fechaVencimiento: "2024-12-22",
        horaInicio: "06:00",
        horaFin: "14:00",
        prioridad: "Alta",
        costo: "$800",
        descripcion: "Proceso de deshidratación controlada a 60°C",
        incluirAlmuerzo: true,
        pagoJornaleros: {},
        estado: "en-proceso",
        progreso: 65,
        observaciones: "Monitorear temperatura cada 2 horas",
        materialesRequeridos: ["Bandejas", "Termómetro digital"],
        equiposRequeridos: ["Deshidratador industrial", "Ventiladores"],
      },
    ],
  },
  {
    id: "control-calidad",
    title: "Control de Calidad",
    color: "bg-purple-500",
    limite: 5,
    tasks: [],
  },
  {
    id: "empaquetado",
    title: "Empaquetado",
    color: "bg-orange-500",
    limite: 8,
    tasks: [
      {
        id: "task-4",
        titulo: "Empaque Cúrcuma Molida",
        lote: "LOT-2024-017",
        producto: "Cúrcuma Molida",
        cantidad: "150 kg",
        responsables: ["t2", "t4"],
        fechaInicio: "2024-12-20",
        fechaVencimiento: "2024-12-21",
        horaInicio: "14:00",
        horaFin: "18:00",
        prioridad: "Media",
        costo: "$320",
        descripcion: "Empaquetado en bolsas de 1kg con etiquetado",
        incluirAlmuerzo: false,
        pagoJornaleros: {
          t2: { horas: 4, tarifa: 8.5, almuerzo: false, total: 34 },
          t4: { horas: 4, tarifa: 7.5, almuerzo: false, total: 30 },
        },
        estado: "en-proceso",
        progreso: 80,
        observaciones: "Verificar sellado hermético",
        materialesRequeridos: ["Bolsas 1kg", "Etiquetas", "Sellador"],
        equiposRequeridos: ["Empaquetadora", "Balanza de precisión"],
      },
    ],
  },
  {
    id: "completadas",
    title: "Completadas",
    color: "bg-green-500",
    tasks: [
      {
        id: "task-5",
        titulo: "Almacenamiento Kion Fresco",
        lote: "LOT-2024-016",
        producto: "Kion Fresco",
        cantidad: "400 kg",
        responsables: ["t5"],
        fechaInicio: "2024-12-19",
        fechaVencimiento: "2024-12-19",
        horaInicio: "16:00",
        horaFin: "18:00",
        prioridad: "Baja",
        costo: "$180",
        descripcion: "Almacenamiento en cámara fría",
        incluirAlmuerzo: false,
        pagoJornaleros: {
          t5: { horas: 2, tarifa: 9.0, almuerzo: false, total: 18 },
        },
        estado: "completada",
        progreso: 100,
        observaciones: "Completado sin observaciones",
        materialesRequeridos: ["Pallets", "Film plástico"],
        equiposRequeridos: ["Montacargas"],
      },
    ],
  },
]

export function AdvancedKanbanBoard() {
  const [columns, setColumns] = useState(initialColumns)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Tarea | null>(null)
  const [selectedTask, setSelectedTask] = useState<Tarea | null>(null)

  const [newTask, setNewTask] = useState<Partial<Tarea>>({
    titulo: "",
    lote: "",
    producto: "",
    cantidad: "",
    responsables: [],
    fechaInicio: "",
    fechaVencimiento: "",
    horaInicio: "",
    horaFin: "",
    prioridad: "Media",
    descripcion: "",
    incluirAlmuerzo: false,
    pagoJornaleros: {},
    materialesRequeridos: [],
    equiposRequeridos: [],
  })

  const getPriorityColor = (prioridad: string) => {
    switch (prioridad) {
      case "Alta":
        return "bg-red-500/10 text-red-500"
      case "Media":
        return "bg-yellow-500/10 text-yellow-500"
      case "Baja":
        return "bg-green-500/10 text-green-500"
      default:
        return "bg-gray-500/10 text-gray-500"
    }
  }

  const calcularPagoTotal = (pagoJornaleros: Tarea["pagoJornaleros"]) => {
    return Object.values(pagoJornaleros).reduce((total, pago) => total + pago.total, 0)
  }

  const handleAsignarTrabajador = (trabajadorId: string) => {
    if (!newTask.responsables?.includes(trabajadorId)) {
      setNewTask((prev) => ({
        ...prev,
        responsables: [...(prev.responsables || []), trabajadorId],
      }))
    }
  }

  const handleRemoverTrabajador = (trabajadorId: string) => {
    setNewTask((prev) => ({
      ...prev,
      responsables: prev.responsables?.filter((id) => id !== trabajadorId) || [],
    }))
  }

  const calcularPagoJornalero = (trabajadorId: string, horas: number, incluirAlmuerzo: boolean) => {
    const trabajador = trabajadoresDisponibles.find((t) => t.id === trabajadorId)
    if (!trabajador || trabajador.tipo !== "jornalero") return 0

    const pagoHoras = (trabajador.tarifaHora || 0) * horas
    const pagoAlmuerzo = incluirAlmuerzo ? 10 : 0 // $10 por almuerzo
    return pagoHoras + pagoAlmuerzo
  }

  const handleSaveTask = () => {
    if (!newTask.titulo || !newTask.lote) return

    const task: Tarea = {
      id: `task-${Date.now()}`,
      titulo: newTask.titulo || "",
      lote: newTask.lote || "",
      producto: newTask.producto || "",
      cantidad: newTask.cantidad || "",
      responsables: newTask.responsables || [],
      fechaInicio: newTask.fechaInicio || "",
      fechaVencimiento: newTask.fechaVencimiento || "",
      horaInicio: newTask.horaInicio,
      horaFin: newTask.horaFin,
      prioridad: newTask.prioridad || "Media",
      costo: newTask.costo || "$0",
      descripcion: newTask.descripcion || "",
      incluirAlmuerzo: newTask.incluirAlmuerzo || false,
      pagoJornaleros: newTask.pagoJornaleros || {},
      estado: "pendiente",
      progreso: 0,
      observaciones: "",
      materialesRequeridos: newTask.materialesRequeridos || [],
      equiposRequeridos: newTask.equiposRequeridos || [],
    }

    setColumns((prev) => prev.map((col) => (col.id === "pendientes" ? { ...col, tasks: [...col.tasks, task] } : col)))

    setShowTaskModal(false)
    setNewTask({
      titulo: "",
      lote: "",
      producto: "",
      cantidad: "",
      responsables: [],
      fechaInicio: "",
      fechaVencimiento: "",
      horaInicio: "",
      horaFin: "",
      prioridad: "Media",
      descripcion: "",
      incluirAlmuerzo: false,
      pagoJornaleros: {},
      materialesRequeridos: [],
      equiposRequeridos: [],
    })
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Personal Activo</p>
              <p className="text-2xl font-bold">{trabajadoresDisponibles.filter((t) => t.disponible).length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Tareas Activas</p>
              <p className="text-2xl font-bold">{columns.reduce((total, col) => total + col.tasks.length, 0)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">Costo Jornaleros Hoy</p>
              <p className="text-2xl font-bold">
                $
                {columns
                  .flatMap((col) => col.tasks)
                  .reduce((total, task) => total + calcularPagoTotal(task.pagoJornaleros), 0)
                  .toFixed(2)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-sm text-muted-foreground">Eficiencia</p>
              <p className="text-2xl font-bold">94%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Botón para nueva tarea */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Board de Producción</h2>
        <Button onClick={() => setShowTaskModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Tarea
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-6 overflow-x-auto pb-6">
        {columns.map((column) => (
          <div key={column.id} className="flex-shrink-0 w-80">
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${column.color}`} />
              <h3 className="font-semibold">{column.title}</h3>
              <Badge variant="secondary" className="ml-auto">
                {column.tasks.length}
                {column.limite && `/${column.limite}`}
              </Badge>
            </div>
            <div className="space-y-3">
              {column.tasks.map((task) => (
                <Card
                  key={task.id}
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedTask(task)}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-sm">{task.titulo}</h4>
                      <Badge className={getPriorityColor(task.prioridad)}>{task.prioridad}</Badge>
                    </div>

                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Package className="h-3 w-3" />
                        <span>{task.lote}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{task.producto}</span>
                        <span>•</span>
                        <span>{task.cantidad}</span>
                      </div>
                      {task.horaInicio && task.horaFin && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>
                            {task.horaInicio} - {task.horaFin}
                          </span>
                        </div>
                      )}
                    </div>

                    {task.progreso > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Progreso</span>
                          <span>{task.progreso}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${task.progreso}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">{task.descripcion}</p>

                    {/* Personal asignado */}
                    <div className="flex items-center gap-2">
                      {task.responsables.map((responsableId) => {
                        const trabajador = trabajadoresDisponibles.find((t) => t.id === responsableId)
                        return (
                          <Avatar key={responsableId} className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {trabajador?.nombre
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                        )
                      })}
                      {task.incluirAlmuerzo && <Utensils className="h-3 w-3 text-orange-500" />}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <DollarSign className="h-3 w-3" />
                        <span>{task.costo}</span>
                        {Object.keys(task.pagoJornaleros).length > 0 && (
                          <span className="text-orange-500">+${calcularPagoTotal(task.pagoJornaleros).toFixed(2)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span className="text-xs">{task.fechaVencimiento}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              <Card className="p-4 border-dashed border-2 text-center text-muted-foreground hover:bg-muted/50 cursor-pointer transition-colors">
                <span className="text-sm">+ Agregar tarea</span>
              </Card>
            </div>
          </div>
        ))}
      </div>

      {/* Modal para nueva tarea */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Nueva Tarea de Producción</h2>
                <Button variant="ghost" onClick={() => setShowTaskModal(false)}>
                  ×
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Información básica */}
                <div className="space-y-4">
                  <h3 className="font-medium">Información Básica</h3>
                  <div>
                    <Label htmlFor="titulo">Título de la Tarea *</Label>
                    <Input
                      id="titulo"
                      value={newTask.titulo}
                      onChange={(e) => setNewTask((prev) => ({ ...prev, titulo: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="lote">Lote *</Label>
                      <Input
                        id="lote"
                        value={newTask.lote}
                        onChange={(e) => setNewTask((prev) => ({ ...prev, lote: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="producto">Producto</Label>
                      <select
                        className="w-full p-2 border rounded-md bg-background"
                        value={newTask.producto}
                        onChange={(e) => setNewTask((prev) => ({ ...prev, producto: e.target.value }))}
                      >
                        <option value="">Seleccionar</option>
                        <option value="Kion Orgánico">Kion Orgánico</option>
                        <option value="Kion Convencional">Kion Convencional</option>
                        <option value="Cúrcuma Premium">Cúrcuma Premium</option>
                        <option value="Cúrcuma Estándar">Cúrcuma Estándar</option>
                        <option value="Mix Especias">Mix Especias</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cantidad">Cantidad</Label>
                      <Input
                        id="cantidad"
                        value={newTask.cantidad}
                        onChange={(e) => setNewTask((prev) => ({ ...prev, cantidad: e.target.value }))}
                        placeholder="ej: 500 kg"
                      />
                    </div>
                    <div>
                      <Label htmlFor="prioridad">Prioridad</Label>
                      <select
                        className="w-full p-2 border rounded-md bg-background"
                        value={newTask.prioridad}
                        onChange={(e) =>
                          setNewTask((prev) => ({ ...prev, prioridad: e.target.value as "Alta" | "Media" | "Baja" }))
                        }
                      >
                        <option value="Baja">Baja</option>
                        <option value="Media">Media</option>
                        <option value="Alta">Alta</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea
                      id="descripcion"
                      value={newTask.descripcion}
                      onChange={(e) => setNewTask((prev) => ({ ...prev, descripcion: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </div>

                {/* Programación y personal */}
                <div className="space-y-4">
                  <h3 className="font-medium">Programación y Personal</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fechaInicio">Fecha Inicio</Label>
                      <Input
                        id="fechaInicio"
                        type="date"
                        value={newTask.fechaInicio}
                        onChange={(e) => setNewTask((prev) => ({ ...prev, fechaInicio: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="fechaVencimiento">Fecha Vencimiento</Label>
                      <Input
                        id="fechaVencimiento"
                        type="date"
                        value={newTask.fechaVencimiento}
                        onChange={(e) => setNewTask((prev) => ({ ...prev, fechaVencimiento: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="horaInicio">Hora Inicio</Label>
                      <Input
                        id="horaInicio"
                        type="time"
                        value={newTask.horaInicio}
                        onChange={(e) => setNewTask((prev) => ({ ...prev, horaInicio: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="horaFin">Hora Fin</Label>
                      <Input
                        id="horaFin"
                        type="time"
                        value={newTask.horaFin}
                        onChange={(e) => setNewTask((prev) => ({ ...prev, horaFin: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="incluirAlmuerzo"
                      checked={newTask.incluirAlmuerzo}
                      onCheckedChange={(checked) =>
                        setNewTask((prev) => ({ ...prev, incluirAlmuerzo: checked as boolean }))
                      }
                    />
                    <Label htmlFor="incluirAlmuerzo" className="flex items-center gap-2">
                      <Utensils className="h-4 w-4" />
                      Incluir almuerzo (+$10 por persona)
                    </Label>
                  </div>

                  <div>
                    <Label>Personal Asignado</Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                      {trabajadoresDisponibles.map((trabajador) => (
                        <div
                          key={trabajador.id}
                          className="flex items-center justify-between p-2 hover:bg-muted rounded"
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={newTask.responsables?.includes(trabajador.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  handleAsignarTrabajador(trabajador.id)
                                } else {
                                  handleRemoverTrabajador(trabajador.id)
                                }
                              }}
                            />
                            <div>
                              <span className="font-medium">{trabajador.nombre}</span>
                              <div className="text-xs text-muted-foreground">
                                {trabajador.tipo === "jornalero" && (
                                  <span>
                                    ${trabajador.tarifaHora}/h - ${trabajador.tarifaDia}/día
                                  </span>
                                )}
                                <span className="ml-2">{trabajador.especialidad.join(", ")}</span>
                              </div>
                            </div>
                          </div>
                          <Badge
                            className={
                              trabajador.disponible ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                            }
                          >
                            {trabajador.disponible ? "Disponible" : "Ocupado"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cálculo de costos para jornaleros */}
                  {newTask.responsables && newTask.responsables.length > 0 && (
                    <div className="space-y-2">
                      <Label>Cálculo de Pagos (Jornaleros)</Label>
                      <div className="border rounded-md p-3 space-y-2">
                        {newTask.responsables
                          .map((id) => trabajadoresDisponibles.find((t) => t.id === id))
                          .filter((t) => t?.tipo === "jornalero")
                          .map((trabajador) => {
                            if (!trabajador) return null
                            const horas =
                              newTask.horaInicio && newTask.horaFin
                                ? Math.abs(
                                    new Date(`2000-01-01T${newTask.horaFin}`).getTime() -
                                      new Date(`2000-01-01T${newTask.horaInicio}`).getTime(),
                                  ) /
                                  (1000 * 60 * 60)
                                : 8
                            const pago = calcularPagoJornalero(trabajador.id, horas, newTask.incluirAlmuerzo || false)

                            return (
                              <div key={trabajador.id} className="flex justify-between items-center text-sm">
                                <span>{trabajador.nombre}</span>
                                <div className="text-right">
                                  <div>
                                    ${trabajador.tarifaHora} × {horas}h = $
                                    {((trabajador.tarifaHora || 0) * horas).toFixed(2)}
                                  </div>
                                  {newTask.incluirAlmuerzo && (
                                    <div className="text-xs text-muted-foreground">+ $10 almuerzo</div>
                                  )}
                                  <div className="font-medium">${pago.toFixed(2)}</div>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6 pt-6 border-t">
                <Button variant="outline" onClick={() => setShowTaskModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveTask}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Tarea
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal de detalle de tarea */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">{selectedTask.titulo}</h2>
                <Button variant="ghost" onClick={() => setSelectedTask(null)}>
                  ×
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Lote</Label>
                    <p className="font-medium">{selectedTask.lote}</p>
                  </div>
                  <div>
                    <Label>Producto</Label>
                    <p className="font-medium">{selectedTask.producto}</p>
                  </div>
                  <div>
                    <Label>Cantidad</Label>
                    <p className="font-medium">{selectedTask.cantidad}</p>
                  </div>
                  <div>
                    <Label>Prioridad</Label>
                    <Badge className={getPriorityColor(selectedTask.prioridad)}>{selectedTask.prioridad}</Badge>
                  </div>
                </div>

                <div>
                  <Label>Descripción</Label>
                  <p className="text-sm text-muted-foreground">{selectedTask.descripcion}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Horario</Label>
                    <p className="font-medium">
                      {selectedTask.horaInicio} - {selectedTask.horaFin}
                    </p>
                  </div>
                  <div>
                    <Label>Fecha</Label>
                    <p className="font-medium">{selectedTask.fechaInicio}</p>
                  </div>
                </div>

                <div>
                  <Label>Personal Asignado</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedTask.responsables.map((responsableId) => {
                      const trabajador = trabajadoresDisponibles.find((t) => t.id === responsableId)
                      return (
                        <div key={responsableId} className="flex items-center gap-2 bg-muted rounded-md p-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {trabajador?.nombre
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{trabajador?.nombre}</span>
                          {trabajador?.tipo === "jornalero" && (
                            <Badge variant="outline" className="text-xs">
                              Jornalero
                            </Badge>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {Object.keys(selectedTask.pagoJornaleros).length > 0 && (
                  <div>
                    <Label>Pagos Calculados</Label>
                    <div className="border rounded-md p-3 space-y-2 mt-2">
                      {Object.entries(selectedTask.pagoJornaleros).map(([trabajadorId, pago]) => {
                        const trabajador = trabajadoresDisponibles.find((t) => t.id === trabajadorId)
                        return (
                          <div key={trabajadorId} className="flex justify-between items-center">
                            <span className="font-medium">{trabajador?.nombre}</span>
                            <div className="text-right">
                              <div className="text-sm">
                                ${pago.tarifa} × {pago.horas}h = ${(pago.tarifa * pago.horas).toFixed(2)}
                              </div>
                              {pago.almuerzo && <div className="text-xs text-muted-foreground">+ $10 almuerzo</div>}
                              <div className="font-bold text-green-600">${pago.total.toFixed(2)}</div>
                            </div>
                          </div>
                        )
                      })}
                      <div className="border-t pt-2 flex justify-between font-bold">
                        <span>Total Jornaleros:</span>
                        <span>${calcularPagoTotal(selectedTask.pagoJornaleros).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTask.progreso > 0 && (
                  <div>
                    <Label>Progreso</Label>
                    <div className="space-y-2 mt-2">
                      <div className="flex justify-between">
                        <span>Completado</span>
                        <span>{selectedTask.progreso}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3">
                        <div
                          className="bg-primary h-3 rounded-full transition-all"
                          style={{ width: `${selectedTask.progreso}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-4 mt-6 pt-6 border-t">
                <Button variant="outline" onClick={() => setSelectedTask(null)}>
                  Cerrar
                </Button>
                <Button>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Tarea
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
