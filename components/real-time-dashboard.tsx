"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Activity,
  RefreshCw,
  Wifi,
  WifiOff,
  Package,
  Users,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
} from "lucide-react"

interface RealTimeData {
  timestamp: string
  lotesActivos: number
  personalActivo: number
  produccionHoy: number
  alertasActivas: number
  eficienciaGeneral: number
  conexionEstable: boolean
}

export function RealTimeDashboard() {
  const [data, setData] = useState<RealTimeData>({
    timestamp: new Date().toLocaleTimeString(),
    lotesActivos: 28,
    personalActivo: 24,
    produccionHoy: 1250,
    alertasActivas: 3,
    eficienciaGeneral: 92,
    conexionEstable: true,
  })

  const [isUpdating, setIsUpdating] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Simulación de actualización en tiempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => ({
        ...prev,
        timestamp: new Date().toLocaleTimeString(),
        lotesActivos: prev.lotesActivos + Math.floor(Math.random() * 3) - 1,
        personalActivo: Math.max(20, prev.personalActivo + Math.floor(Math.random() * 3) - 1),
        produccionHoy: prev.produccionHoy + Math.floor(Math.random() * 50),
        alertasActivas: Math.max(0, prev.alertasActivas + Math.floor(Math.random() * 2) - 1),
        eficienciaGeneral: Math.max(85, Math.min(98, prev.eficienciaGeneral + Math.random() * 2 - 1)),
        conexionEstable: Math.random() > 0.1, // 90% de tiempo conectado
      }))
      setLastUpdate(new Date())
    }, 5000) // Actualizar cada 5 segundos

    return () => clearInterval(interval)
  }, [])

  const handleManualRefresh = async () => {
    setIsUpdating(true)
    // Simular llamada a API
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsUpdating(false)
    setLastUpdate(new Date())
  }

  const estadoProduccion = [
    { etapa: "Recepción", activos: 5, capacidad: 8, porcentaje: 62.5 },
    { etapa: "Procesamiento", activos: 12, capacidad: 15, porcentaje: 80 },
    { etapa: "Empaquetado", activos: 8, capacidad: 10, porcentaje: 80 },
    { etapa: "Control Calidad", activos: 3, capacidad: 5, porcentaje: 60 },
  ]

  const alertasEnVivo = [
    {
      id: 1,
      tipo: "warning",
      mensaje: "Temperatura alta en Zona 2",
      tiempo: "Hace 2 min",
      activa: true,
    },
    {
      id: 2,
      tipo: "info",
      mensaje: "Lote LOT-2024-018 completado",
      tiempo: "Hace 5 min",
      activa: false,
    },
    {
      id: 3,
      tipo: "error",
      mensaje: "Stock crítico: Kion Orgánico",
      tiempo: "Hace 8 min",
      activa: true,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header de Estado en Tiempo Real */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              <span className="font-semibold">Dashboard en Tiempo Real</span>
            </div>
            <div className="flex items-center gap-2">
              {data.conexionEstable ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm text-muted-foreground">
                {data.conexionEstable ? "Conectado" : "Desconectado"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">Última actualización: {lastUpdate.toLocaleTimeString()}</div>
            <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isUpdating}>
              <RefreshCw className={`h-4 w-4 ${isUpdating ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>
        </div>
      </Card>

      {/* Métricas en Tiempo Real */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Lotes Activos</span>
          </div>
          <div className="text-2xl font-bold">{data.lotesActivos}</div>
          <div className="text-xs text-muted-foreground">En proceso ahora</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Personal Activo</span>
          </div>
          <div className="text-2xl font-bold">{data.personalActivo}</div>
          <div className="text-xs text-muted-foreground">Trabajando ahora</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">Producción Hoy</span>
          </div>
          <div className="text-2xl font-bold">{data.produccionHoy.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">kg procesados</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">Alertas Activas</span>
          </div>
          <div className="text-2xl font-bold">{data.alertasActivas}</div>
          <div className="text-xs text-muted-foreground">Requieren atención</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium">Eficiencia</span>
          </div>
          <div className="text-2xl font-bold">{data.eficienciaGeneral.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">General del día</div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Estado de Producción en Tiempo Real */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Estado de Producción</h3>
            <p className="text-sm text-muted-foreground">Capacidad utilizada por etapa</p>
          </div>
          <div className="space-y-4">
            {estadoProduccion.map((etapa) => (
              <div key={etapa.etapa} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{etapa.etapa}</span>
                  <span className="text-sm text-muted-foreground">
                    {etapa.activos}/{etapa.capacidad}
                  </span>
                </div>
                <Progress value={etapa.porcentaje} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{etapa.porcentaje.toFixed(1)}% utilizado</span>
                  <Badge
                    className={
                      etapa.porcentaje > 80
                        ? "bg-red-500/10 text-red-500"
                        : etapa.porcentaje > 60
                          ? "bg-yellow-500/10 text-yellow-500"
                          : "bg-green-500/10 text-green-500"
                    }
                  >
                    {etapa.porcentaje > 80 ? "Alto" : etapa.porcentaje > 60 ? "Medio" : "Bajo"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Feed de Alertas en Vivo */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Alertas en Vivo</h3>
            <p className="text-sm text-muted-foreground">Notificaciones en tiempo real</p>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {alertasEnVivo.map((alerta) => (
              <div
                key={alerta.id}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  alerta.activa ? "bg-muted/50 border-l-4 border-l-primary" : "bg-muted/20"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full mt-2 ${
                    alerta.tipo === "error" ? "bg-red-500" : alerta.tipo === "warning" ? "bg-yellow-500" : "bg-blue-500"
                  } ${alerta.activa ? "animate-pulse" : ""}`}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{alerta.mensaje}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{alerta.tiempo}</span>
                    {alerta.activa && (
                      <Badge variant="outline" className="text-xs">
                        Activa
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
