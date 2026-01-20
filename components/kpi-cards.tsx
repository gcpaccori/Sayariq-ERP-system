import type React from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, DollarSign, Percent, Target, Clock, Package, CheckCircle } from "lucide-react"

interface KPICardProps {
  titulo: string
  valor: string
  meta?: string
  cambio: {
    valor: string
    porcentaje: string
    positivo: boolean
  }
  progreso?: number
  icono: React.ElementType
  color: string
  descripcion?: string
}

export function KPICard({ titulo, valor, meta, cambio, progreso, icono: Icon, color, descripcion }: KPICardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${color}`} />
          <h3 className="text-sm font-medium text-muted-foreground">{titulo}</h3>
        </div>
        {cambio.positivo ? (
          <TrendingUp className="h-4 w-4 text-green-500" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-500" />
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold">{valor}</p>
          {meta && <span className="text-sm text-muted-foreground">/ {meta}</span>}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {cambio.positivo ? "+" : ""}
            {cambio.valor}
          </span>
          <Badge className={cambio.positivo ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}>
            {cambio.porcentaje}
          </Badge>
        </div>

        {progreso !== undefined && (
          <div className="space-y-1">
            <Progress value={progreso} className="h-2" />
            <div className="text-xs text-muted-foreground text-right">{progreso}% de la meta</div>
          </div>
        )}

        {descripcion && <p className="text-xs text-muted-foreground">{descripcion}</p>}
      </div>
    </Card>
  )
}

export function KPIDashboard() {
  const kpis = [
    {
      titulo: "Ingresos Mensuales",
      valor: "$75,280",
      meta: "$80,000",
      cambio: { valor: "$5,240", porcentaje: "+7.5%", positivo: true },
      progreso: 94,
      icono: DollarSign,
      color: "text-green-500",
      descripcion: "Meta mensual casi alcanzada",
    },
    {
      titulo: "Margen de Utilidad",
      valor: "38.2%",
      meta: "40%",
      cambio: { valor: "2.1%", porcentaje: "+5.8%", positivo: true },
      progreso: 95,
      icono: Percent,
      color: "text-blue-500",
      descripcion: "Excelente rentabilidad",
    },
    {
      titulo: "Eficiencia Operativa",
      valor: "92%",
      meta: "95%",
      cambio: { valor: "3%", porcentaje: "+3.4%", positivo: true },
      progreso: 97,
      icono: Target,
      color: "text-purple-500",
      descripcion: "Procesos optimizados",
    },
    {
      titulo: "Tiempo Promedio Proceso",
      valor: "4.2 días",
      meta: "4.0 días",
      cambio: { valor: "0.3 días", porcentaje: "-6.7%", positivo: false },
      progreso: 95,
      icono: Clock,
      color: "text-yellow-500",
      descripcion: "Necesita optimización",
    },
    {
      titulo: "Lotes Completados",
      valor: "156",
      meta: "160",
      cambio: { valor: "12", porcentaje: "+8.3%", positivo: true },
      progreso: 97,
      icono: Package,
      color: "text-orange-500",
      descripcion: "Producción estable",
    },
    {
      titulo: "Satisfacción Clientes",
      valor: "4.8/5",
      meta: "4.5/5",
      cambio: { valor: "0.2", porcentaje: "+4.3%", positivo: true },
      progreso: 96,
      icono: CheckCircle,
      color: "text-emerald-500",
      descripción: "Excelente calidad",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {kpis.map((kpi, index) => (
        <KPICard key={index} {...kpi} />
      ))}
    </div>
  )
}
