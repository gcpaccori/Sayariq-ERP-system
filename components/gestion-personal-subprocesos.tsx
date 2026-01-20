"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Users, Trash2, RefreshCw, User, UserPlus, Edit, Check, X, Loader2, AlertCircle } from 'lucide-react'
import { usePersonalSubprocesos } from "@/lib/hooks/use-personal-subprocesos"

// Tipos de datos
interface AsignacionPersonal {
  operacion: string
  hombres: number
  mujeres: number
  horaInicio: string
  horaFin: string
  personalReutilizable: boolean
  personalAsignado: string[]
}

interface PlanificacionActiva {
  id: string
  pedidoId: string
  codigoPedido: string
  codigoLote: string
  fechaPlanificacion: string
  operaciones: AsignacionPersonal[]
  estado: "planificado" | "en-proceso" | "completado" | "cancelado"
  totalPersonal: number
  personalDisponible: number
}

interface PersonalDisponible {
  id: string
  nombre: string
  genero: "hombre" | "mujer"
  especialidad: string[]
  disponible: boolean
}

export function GestionPersonalSubprocesos() {
  const { planificaciones, personalDisponible, loading, error, refresh } = usePersonalSubprocesos()
  const [busqueda, setBusqueda] = useState("")

  const planificacionesFiltradas = planificaciones.filter(
    (plan) =>
      plan.codigoPedido?.toLowerCase().includes(busqueda.toLowerCase()) ||
      plan.codigoLote?.toLowerCase().includes(busqueda.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando planificaciones...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={refresh}>Reintentar</Button>
        </div>
      </div>
    )
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "planificado":
        return <Badge variant="outline">Planificado</Badge>
      case "en-proceso":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">En Proceso</Badge>
      case "completado":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completado</Badge>
      case "cancelado":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelado</Badge>
      default:
        return <Badge variant="secondary">{estado}</Badge>
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Gestión de Personal - Subprocesos</h2>
          <p className="text-sm text-gray-600">Planificación de personal por operaciones con reutilización</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Planificación
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex space-x-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por pedido o lote..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabla de planificaciones activas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Planificaciones Activas ({planificacionesFiltradas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Operaciones</TableHead>
                <TableHead>Personal Total</TableHead>
                <TableHead>Personal Único</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {planificacionesFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-4">
                    No hay planificaciones registradas
                  </TableCell>
                </TableRow>
              ) : (
                planificacionesFiltradas.map((planificacion) => (
                  <TableRow key={planificacion.id}>
                    <TableCell className="font-medium">{planificacion.codigoPedido}</TableCell>
                    <TableCell>{planificacion.codigoLote}</TableCell>
                    <TableCell>{planificacion.fechaPlanificacion}</TableCell>
                    <TableCell>
                      <span className="text-sm">{planificacion.operaciones?.length || 0} ops</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">{planificacion.totalPersonal}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{planificacion.personalDisponible}</span>
                    </TableCell>
                    <TableCell>{getEstadoBadge(planificacion.estado)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Personal Disponible Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Personal Disponible ({personalDisponible.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {personalDisponible.map((persona) => (
              <Badge key={persona.id} variant="outline" className="text-xs">
                {persona.nombre}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
