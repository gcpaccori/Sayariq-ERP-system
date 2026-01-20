import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Clock, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Target, Truck } from "lucide-react"

const metricsOperacionales = [
  {
    categoria: "Producción",
    metricas: [
      { nombre: "Lotes en Proceso", valor: 28, meta: 30, unidad: "lotes", tendencia: "up" },
      { nombre: "Capacidad Utilizada", valor: 85, meta: 90, unidad: "%", tendencia: "up" },
      { nombre: "Tiempo Ciclo Promedio", valor: 4.2, meta: 4.0, unidad: "días", tendencia: "down" },
      { nombre: "Eficiencia General", valor: 92, meta: 95, unidad: "%", tendencia: "up" },
    ],
  },
  {
    categoria: "Calidad",
    metricas: [
      { nombre: "Lotes Aprobados", valor: 98.5, meta: 99, unidad: "%", tendencia: "up" },
      { nombre: "Rechazos", valor: 1.5, meta: 1, unidad: "%", tendencia: "down" },
      { nombre: "Reprocesos", valor: 2.8, meta: 2, unidad: "%", tendencia: "down" },
      { nombre: "Certificaciones", valor: 100, meta: 100, unidad: "%", tendencia: "stable" },
    ],
  },
  {
    categoria: "Logística",
    metricas: [
      { nombre: "Entregas a Tiempo", valor: 94, meta: 95, unidad: "%", tendencia: "up" },
      { nombre: "Costo por Envío", valor: 45, meta: 40, unidad: "$", tendencia: "down" },
      { nombre: "Rotación Inventario", valor: 12, meta: 15, unidad: "veces/año", tendencia: "up" },
      { nombre: "Stock Disponible", valor: 87, meta: 85, unidad: "%", tendencia: "up" },
    ],
  },
]

const alertasOperacionales = [
  {
    tipo: "Crítico",
    mensaje: "Capacidad de Almacén C al 95%",
    area: "Logística",
    tiempo: "Hace 1 hora",
    accion: "Programar despachos urgentes",
    icono: AlertTriangle,
    color: "text-red-500",
  },
  {
    tipo: "Advertencia",
    mensaje: "Tiempo de proceso aumentó 15%",
    area: "Producción",
    tiempo: "Hace 3 horas",
    accion: "Revisar línea de deshidratado",
    icono: Clock,
    color: "text-yellow-500",
  },
  {
    tipo: "Info",
    mensaje: "Nueva certificación orgánica aprobada",
    area: "Calidad",
    tiempo: "Hace 6 horas",
    accion: "Actualizar documentación",
    icono: CheckCircle,
    color: "text-green-500",
  },
  {
    tipo: "Advertencia",
    mensaje: "Proveedor principal con retraso",
    area: "Compras",
    tiempo: "Hace 8 horas",
    accion: "Contactar proveedor alternativo",
    icono: Truck,
    color: "text-yellow-500",
  },
]

const rendimientoPersonal = [
  {
    nombre: "Juan Pérez",
    area: "Producción",
    eficiencia: 96,
    lotesCompletados: 24,
    horasExtras: 8,
    calificacion: 4.8,
  },
  {
    nombre: "María García",
    area: "Control Calidad",
    eficiencia: 98,
    lotesCompletados: 18,
    horasExtras: 4,
    calificacion: 4.9,
  },
  {
    nombre: "Carlos López",
    area: "Empaquetado",
    eficiencia: 94,
    lotesCompletados: 32,
    horasExtras: 12,
    calificacion: 4.7,
  },
  {
    nombre: "Ana Ruiz",
    area: "Logística",
    eficiencia: 92,
    lotesCompletados: 28,
    horasExtras: 6,
    calificacion: 4.6,
  },
]

const getTendenciaIcon = (tendencia: string) => {
  switch (tendencia) {
    case "up":
      return <TrendingUp className="h-3 w-3 text-green-500" />
    case "down":
      return <TrendingDown className="h-3 w-3 text-red-500" />
    default:
      return <Target className="h-3 w-3 text-gray-500" />
  }
}

const getTendenciaColor = (tendencia: string) => {
  switch (tendencia) {
    case "up":
      return "text-green-500"
    case "down":
      return "text-red-500"
    default:
      return "text-gray-500"
  }
}

export function MetricasOperacionales() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {metricsOperacionales.map((categoria) => (
        <Card key={categoria.categoria} className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">{categoria.categoria}</h3>
            <p className="text-sm text-muted-foreground">Métricas operacionales clave</p>
          </div>
          <div className="space-y-4">
            {categoria.metricas.map((metrica) => {
              const progreso = metrica.meta ? (metrica.valor / metrica.meta) * 100 : 0
              const cumpleMeta = metrica.valor >= metrica.meta

              return (
                <div key={metrica.nombre} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{metrica.nombre}</span>
                    <div className="flex items-center gap-1">
                      {getTendenciaIcon(metrica.tendencia)}
                      <span className={`text-sm font-bold ${getTendenciaColor(metrica.tendencia)}`}>
                        {metrica.valor}
                        {metrica.unidad}
                      </span>
                    </div>
                  </div>
                  {metrica.meta && (
                    <div className="space-y-1">
                      <Progress value={Math.min(progreso, 100)} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          Meta: {metrica.meta}
                          {metrica.unidad}
                        </span>
                        <Badge
                          className={cumpleMeta ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"}
                        >
                          {cumpleMeta ? "Cumplida" : "Pendiente"}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      ))}
    </div>
  )
}

export function AlertasOperacionales() {
  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Alertas Operacionales</h3>
        <p className="text-sm text-muted-foreground">Notificaciones y acciones requeridas</p>
      </div>
      <div className="space-y-3">
        {alertasOperacionales.map((alerta, index) => {
          const Icon = alerta.icono
          return (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
              <Icon className={`h-5 w-5 ${alerta.color} mt-0.5`} />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <Badge
                    className={
                      alerta.tipo === "Crítico"
                        ? "bg-red-500/10 text-red-500"
                        : alerta.tipo === "Advertencia"
                          ? "bg-yellow-500/10 text-yellow-500"
                          : "bg-blue-500/10 text-blue-500"
                    }
                  >
                    {alerta.tipo}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{alerta.tiempo}</span>
                </div>
                <p className="text-sm font-medium">{alerta.mensaje}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Área: {alerta.area}</span>
                  <span className="text-xs font-medium text-primary">{alerta.accion}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export function RendimientoPersonal() {
  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Rendimiento del Personal</h3>
        <p className="text-sm text-muted-foreground">Métricas de productividad por empleado</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empleado</TableHead>
            <TableHead>Área</TableHead>
            <TableHead>Eficiencia</TableHead>
            <TableHead>Lotes</TableHead>
            <TableHead>H. Extras</TableHead>
            <TableHead>Rating</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rendimientoPersonal.map((empleado) => (
            <TableRow key={empleado.nombre}>
              <TableCell className="font-medium">{empleado.nombre}</TableCell>
              <TableCell>
                <Badge variant="outline">{empleado.area}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress value={empleado.eficiencia} className="w-16 h-2" />
                  <span className="text-sm font-medium">{empleado.eficiencia}%</span>
                </div>
              </TableCell>
              <TableCell className="text-center">{empleado.lotesCompletados}</TableCell>
              <TableCell className="text-center">{empleado.horasExtras}h</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">{empleado.calificacion}</span>
                  <span className="text-yellow-500">★</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
