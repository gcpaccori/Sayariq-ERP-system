"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Award,
  AlertTriangle,
  Users,
  Calendar,
  BarChart3,
  Filter,
  Download,
} from "lucide-react"

interface RegistroProductividad {
  id: string
  trabajadorId: string
  fecha: string
  proceso: string
  horasTrabajas: number
  cantidadProcesada: number
  cantidadEsperada: number
  eficiencia: number
  calidad: number
  observaciones: string
  lote: string
}

interface MetricasTrabajador {
  trabajadorId: string
  nombre: string
  tipo: "fijo" | "jornalero"
  especialidades: string[]
  promedioEficiencia: number
  promedioCalidad: number
  horasTotales: number
  lotesCompletados: number
  tendenciaEficiencia: "up" | "down" | "stable"
  alertas: string[]
  salarioBase?: number
  bonificaciones: number
  penalizaciones: number
}

const trabajadores: MetricasTrabajador[] = [
  {
    trabajadorId: "t1",
    nombre: "Juan Pérez",
    tipo: "fijo",
    especialidades: ["Recepción", "Lavado"],
    promedioEficiencia: 95,
    promedioCalidad: 98,
    horasTotales: 168,
    lotesCompletados: 24,
    tendenciaEficiencia: "up",
    alertas: [],
    salarioBase: 2800,
    bonificaciones: 420,
    penalizaciones: 0,
  },
  {
    trabajadorId: "t2",
    nombre: "María García",
    tipo: "jornalero",
    especialidades: ["Control Calidad", "Empaquetado"],
    promedioEficiencia: 88,
    promedioCalidad: 96,
    horasTotales: 152,
    lotesCompletados: 18,
    tendenciaEficiencia: "stable",
    alertas: ["Eficiencia por debajo del promedio"],
    bonificaciones: 180,
    penalizaciones: 50,
  },
  {
    trabajadorId: "t3",
    nombre: "Carlos López",
    tipo: "fijo",
    especialidades: ["Procesamiento", "Deshidratado"],
    promedioEficiencia: 92,
    promedioCalidad: 94,
    horasTotales: 176,
    lotesCompletados: 32,
    tendenciaEficiencia: "up",
    alertas: [],
    salarioBase: 3200,
    bonificaciones: 480,
    penalizaciones: 0,
  },
  {
    trabajadorId: "t4",
    nombre: "Ana Ruiz",
    tipo: "jornalero",
    especialidades: ["Empaquetado", "Etiquetado"],
    promedioEficiencia: 85,
    promedioCalidad: 92,
    horasTotales: 144,
    lotesCompletados: 28,
    tendenciaEficiencia: "down",
    alertas: ["Calidad en descenso", "Requiere capacitación"],
    bonificaciones: 120,
    penalizaciones: 80,
  },
  {
    trabajadorId: "t5",
    nombre: "Luis Torres",
    tipo: "jornalero",
    especialidades: ["Almacén", "Transporte"],
    promedioEficiencia: 78,
    promedioCalidad: 89,
    horasTotales: 120,
    lotesCompletados: 15,
    tendenciaEficiencia: "down",
    alertas: ["Eficiencia crítica", "Evaluación requerida"],
    bonificaciones: 60,
    penalizaciones: 120,
  },
]

const registrosRecientes: RegistroProductividad[] = [
  {
    id: "r1",
    trabajadorId: "t1",
    fecha: "2024-12-20",
    proceso: "Recepción",
    horasTrabajas: 8,
    cantidadProcesada: 520,
    cantidadEsperada: 500,
    eficiencia: 104,
    calidad: 98,
    observaciones: "Excelente rendimiento",
    lote: "LOT-2024-019",
  },
  {
    id: "r2",
    trabajadorId: "t2",
    fecha: "2024-12-20",
    proceso: "Control Calidad",
    horasTrabajas: 6,
    cantidadProcesada: 280,
    cantidadEsperada: 300,
    eficiencia: 93,
    calidad: 96,
    observaciones: "Buen trabajo, mejorar velocidad",
    lote: "LOT-2024-018",
  },
  {
    id: "r3",
    trabajadorId: "t4",
    fecha: "2024-12-20",
    proceso: "Empaquetado",
    horasTrabajas: 7,
    cantidadProcesada: 180,
    cantidadEsperada: 210,
    eficiencia: 86,
    calidad: 91,
    observaciones: "Necesita mejorar ritmo",
    lote: "LOT-2024-017",
  },
]

export function ProductividadPersonal() {
  const [filtroTipo, setFiltroTipo] = useState<string>("todos")
  const [filtroEspecialidad, setFiltroEspecialidad] = useState<string>("todos")
  const [showRegistroModal, setShowRegistroModal] = useState(false)
  const [selectedTrabajador, setSelectedTrabajador] = useState<MetricasTrabajador | null>(null)

  const getTendenciaIcon = (tendencia: string) => {
    switch (tendencia) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Target className="h-4 w-4 text-gray-500" />
    }
  }

  const getEficienciaColor = (eficiencia: number) => {
    if (eficiencia >= 90) return "text-green-500"
    if (eficiencia >= 80) return "text-yellow-500"
    return "text-red-500"
  }

  const getCalidadColor = (calidad: number) => {
    if (calidad >= 95) return "text-green-500"
    if (calidad >= 90) return "text-yellow-500"
    return "text-red-500"
  }

  const calcularBonificacionTotal = (trabajador: MetricasTrabajador) => {
    let bonificacion = 0

    // Bonificación por eficiencia
    if (trabajador.promedioEficiencia >= 95) bonificacion += 200
    else if (trabajador.promedioEficiencia >= 90) bonificacion += 100

    // Bonificación por calidad
    if (trabajador.promedioCalidad >= 95) bonificacion += 150
    else if (trabajador.promedioCalidad >= 90) bonificacion += 75

    // Bonificación por lotes completados
    bonificacion += trabajador.lotesCompletados * 5

    return bonificacion + trabajador.bonificaciones - trabajador.penalizaciones
  }

  const trabajadoresFiltrados = trabajadores.filter((trabajador) => {
    const filtroTipoMatch = filtroTipo === "todos" || trabajador.tipo === filtroTipo
    const filtroEspecialidadMatch =
      filtroEspecialidad === "todos" ||
      trabajador.especialidades.some((esp) => esp.toLowerCase().includes(filtroEspecialidad.toLowerCase()))
    return filtroTipoMatch && filtroEspecialidadMatch
  })

  return (
    <div className="space-y-6">
      {/* Métricas Generales */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Personal Total</p>
              <p className="text-2xl font-bold">{trabajadores.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Eficiencia Promedio</p>
              <p className="text-2xl font-bold">
                {Math.round(trabajadores.reduce((sum, t) => sum + t.promedioEficiencia, 0) / trabajadores.length)}%
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">Calidad Promedio</p>
              <p className="text-2xl font-bold">
                {Math.round(trabajadores.reduce((sum, t) => sum + t.promedioCalidad, 0) / trabajadores.length)}%
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">Con Alertas</p>
              <p className="text-2xl font-bold">{trabajadores.filter((t) => t.alertas.length > 0).length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Controles */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div>
            <Label>Tipo de Personal</Label>
            <select
              className="w-40 p-2 border rounded-md bg-background"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="fijo">Personal Fijo</option>
              <option value="jornalero">Jornaleros</option>
            </select>
          </div>
          <div>
            <Label>Especialidad</Label>
            <select
              className="w-40 p-2 border rounded-md bg-background"
              value={filtroEspecialidad}
              onChange={(e) => setFiltroEspecialidad(e.target.value)}
            >
              <option value="todos">Todas</option>
              <option value="recepcion">Recepción</option>
              <option value="lavado">Lavado</option>
              <option value="procesamiento">Procesamiento</option>
              <option value="empaquetado">Empaquetado</option>
              <option value="control">Control Calidad</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Más Filtros
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button onClick={() => setShowRegistroModal(true)} className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Nuevo Registro
          </Button>
        </div>
      </div>

      {/* Tabla de Productividad */}
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Productividad del Personal</h2>
          <p className="text-sm text-muted-foreground">Métricas de rendimiento y calidad</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trabajador</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Especialidades</TableHead>
              <TableHead>Eficiencia</TableHead>
              <TableHead>Calidad</TableHead>
              <TableHead>Lotes</TableHead>
              <TableHead>Horas</TableHead>
              <TableHead>Bonificación</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trabajadoresFiltrados.map((trabajador) => (
              <TableRow
                key={trabajador.trabajadorId}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedTrabajador(trabajador)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {trabajador.nombre
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{trabajador.nombre}</div>
                      <div className="text-xs text-muted-foreground">ID: {trabajador.trabajadorId}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      trabajador.tipo === "fijo" ? "bg-blue-500/10 text-blue-500" : "bg-green-500/10 text-green-500"
                    }
                  >
                    {trabajador.tipo === "fijo" ? "Fijo" : "Jornalero"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {trabajador.especialidades.map((esp, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {esp}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getTendenciaIcon(trabajador.tendenciaEficiencia)}
                    <div>
                      <div className={`font-medium ${getEficienciaColor(trabajador.promedioEficiencia)}`}>
                        {trabajador.promedioEficiencia}%
                      </div>
                      <Progress value={trabajador.promedioEficiencia} className="w-16 h-1" />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className={`font-medium ${getCalidadColor(trabajador.promedioCalidad)}`}>
                    {trabajador.promedioCalidad}%
                  </div>
                  <Progress value={trabajador.promedioCalidad} className="w-16 h-1" />
                </TableCell>
                <TableCell className="text-center font-medium">{trabajador.lotesCompletados}</TableCell>
                <TableCell className="text-center">{trabajador.horasTotales}h</TableCell>
                <TableCell>
                  <div className="text-right">
                    <div className="font-medium text-green-600">+S/ {calcularBonificacionTotal(trabajador)}</div>
                    {trabajador.penalizaciones > 0 && (
                      <div className="text-xs text-red-500">-S/ {trabajador.penalizaciones}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {trabajador.alertas.length > 0 ? (
                    <div className="space-y-1">
                      {trabajador.alertas.map((alerta, idx) => (
                        <Badge key={idx} className="bg-red-500/10 text-red-500 text-xs">
                          {alerta}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <Badge className="bg-green-500/10 text-green-500">Óptimo</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Registros Recientes */}
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Registros Recientes</h2>
          <p className="text-sm text-muted-foreground">Últimas mediciones de productividad</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Trabajador</TableHead>
              <TableHead>Proceso</TableHead>
              <TableHead>Horas</TableHead>
              <TableHead>Procesado/Esperado</TableHead>
              <TableHead>Eficiencia</TableHead>
              <TableHead>Calidad</TableHead>
              <TableHead>Observaciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrosRecientes.map((registro) => {
              const trabajador = trabajadores.find((t) => t.trabajadorId === registro.trabajadorId)
              return (
                <TableRow key={registro.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {registro.fecha}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{trabajador?.nombre}</div>
                    <div className="text-xs text-muted-foreground">{registro.lote}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{registro.proceso}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {registro.horasTrabajas}h
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-center">
                      <div className="font-medium">{registro.cantidadProcesada} kg</div>
                      <div className="text-xs text-muted-foreground">de {registro.cantidadEsperada} kg</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`text-center font-medium ${getEficienciaColor(registro.eficiencia)}`}>
                      {registro.eficiencia}%
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`text-center font-medium ${getCalidadColor(registro.calidad)}`}>
                      {registro.calidad}%
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground max-w-[200px] truncate">{registro.observaciones}</div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Modal de Detalle del Trabajador */}
      {selectedTrabajador && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {selectedTrabajador.nombre
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-semibold">{selectedTrabajador.nombre}</h2>
                    <p className="text-muted-foreground">
                      {selectedTrabajador.tipo === "fijo" ? "Personal Fijo" : "Jornalero"} -
                      {selectedTrabajador.especialidades.join(", ")}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => setSelectedTrabajador(null)}>
                  ×
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Métricas Principales */}
                <div className="space-y-4">
                  <h3 className="font-medium">Métricas Principales</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Eficiencia Promedio</span>
                      <div className="flex items-center gap-2">
                        {getTendenciaIcon(selectedTrabajador.tendenciaEficiencia)}
                        <span className={`font-bold ${getEficienciaColor(selectedTrabajador.promedioEficiencia)}`}>
                          {selectedTrabajador.promedioEficiencia}%
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Calidad Promedio</span>
                      <span className={`font-bold ${getCalidadColor(selectedTrabajador.promedioCalidad)}`}>
                        {selectedTrabajador.promedioCalidad}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Lotes Completados</span>
                      <span className="font-bold">{selectedTrabajador.lotesCompletados}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Horas Totales</span>
                      <span className="font-bold">{selectedTrabajador.horasTotales}h</span>
                    </div>
                  </div>
                </div>

                {/* Compensación */}
                <div className="space-y-4">
                  <h3 className="font-medium">Compensación</h3>
                  <div className="space-y-3">
                    {selectedTrabajador.salarioBase && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Salario Base</span>
                        <span className="font-bold">S/ {selectedTrabajador.salarioBase}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Bonificaciones</span>
                      <span className="font-bold text-green-600">+S/ {selectedTrabajador.bonificaciones}</span>
                    </div>
                    {selectedTrabajador.penalizaciones > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Penalizaciones</span>
                        <span className="font-bold text-red-600">-S/ {selectedTrabajador.penalizaciones}</span>
                      </div>
                    )}
                    <div className="border-t pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Total Bonificación</span>
                        <span className="font-bold text-lg text-green-600">
                          S/ {calcularBonificacionTotal(selectedTrabajador)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Alertas */}
                <div className="space-y-4">
                  <h3 className="font-medium">Estado y Alertas</h3>
                  {selectedTrabajador.alertas.length > 0 ? (
                    <div className="space-y-2">
                      {selectedTrabajador.alertas.map((alerta, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950/20 rounded">
                          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                          <span className="text-sm text-red-700 dark:text-red-300">{alerta}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded">
                      <Award className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-700 dark:text-green-300">Rendimiento óptimo</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6 pt-6 border-t">
                <Button variant="outline" onClick={() => setSelectedTrabajador(null)}>
                  Cerrar
                </Button>
                <Button>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Ver Historial Completo
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
