"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, AlertCircle, Clock, XCircle } from 'lucide-react'

interface FlowStep {
  name: string
  status: "completed" | "in-progress" | "pending" | "error"
  count?: number
}

export function BusinessFlowStatus({
  steps,
}: {
  steps: FlowStep[]
}) {
  const completedCount = steps.filter((s) => s.status === "completed").length
  const totalCount = steps.length
  const progress = (completedCount / totalCount) * 100

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case "in-progress":
        return <Clock className="h-5 w-5 text-blue-600" />
      case "pending":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-600">Completado</Badge>
      case "in-progress":
        return <Badge className="bg-blue-600">En proceso</Badge>
      case "pending":
        return <Badge className="bg-yellow-600">Pendiente</Badge>
      case "error":
        return <Badge className="bg-red-600">Error</Badge>
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estado del Flujo de Negocio</CardTitle>
        <CardDescription>Progreso del procesamiento</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Progreso General</span>
            <span className="text-sm text-muted-foreground">
              {completedCount} de {totalCount}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-3">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-center gap-4">
              {getStatusIcon(step.status)}
              <div className="flex-1">
                <p className="font-medium">{step.name}</p>
                {step.count !== undefined && <p className="text-sm text-muted-foreground">{step.count} registros</p>}
              </div>
              {getStatusBadge(step.status)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
