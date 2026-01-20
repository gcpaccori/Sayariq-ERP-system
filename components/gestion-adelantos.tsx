"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, DollarSign, TrendingUp, TrendingDown, Clock, AlertCircle } from "lucide-react"
import { useAdelantos } from "@/lib/hooks/use-adelantos"
import { usePersonas } from "@/lib/hooks/use-personas"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { NuevoAdelanto } from "@/lib/services/adelantos-service"
import { useToast } from "@/components/ui/use-toast"

export function GestionAdelantos() {
  const { toast } = useToast()
  const { data: adelantos, loading: loadingAdelantos, error: errorAdelantos, create, refresh } = useAdelantos()
  const { data: personas, loading: loadingPersonas, error: errorPersonas } = usePersonas()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<NuevoAdelanto>>({
    productor_id: "",
    productor_nombre: "",
    monto_original: 0,
    concepto: "",
    fecha_adelanto: new Date().toISOString().split("T")[0],
  })

  // Asegurar que personas sea un array
  const personasArray = Array.isArray(personas) ? personas : []
  const productores = personasArray.filter((p) => p.tipo === "productor" && p.activo)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.productor_id || !formData.monto_original || !formData.concepto) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    try {
      await create(formData as NuevoAdelanto)
      toast({
        title: "Éxito",
        description: "Adelanto creado correctamente",
      })
      setIsDialogOpen(false)
      setFormData({
        productor_id: "",
        productor_nombre: "",
        monto_original: 0,
        concepto: "",
        fecha_adelanto: new Date().toISOString().split("T")[0],
      })
    } catch (error) {
      console.error("Error creating adelanto:", error)
      toast({
        title: "Error",
        description: "No se pudo crear el adelanto",
        variant: "destructive",
      })
    }
  }

  const handleProductorChange = (productorId: string) => {
    const productor = productores.find((p) => p.$id === productorId)
    setFormData((prev) => ({
      ...prev,
      productor_id: productorId,
      productor_nombre: productor ? `${productor.nombres} ${productor.apellidos}` : "",
    }))
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente
          </Badge>
        )
      case "descontado-parcial":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            <TrendingDown className="w-3 h-3 mr-1" />
            Parcial
          </Badge>
        )
      case "descontado-total":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <TrendingUp className="w-3 h-3 mr-1" />
            Completado
          </Badge>
        )
      default:
        return <Badge variant="secondary">{estado}</Badge>
    }
  }

  // Calcular estadísticas
  const adelantosArray = Array.isArray(adelantos) ? adelantos : []
  const stats = {
    total: adelantosArray.length,
    pendientes: adelantosArray.filter((a) => a.estado === "pendiente").length,
    parciales: adelantosArray.filter((a) => a.estado === "descontado-parcial").length,
    completados: adelantosArray.filter((a) => a.estado === "descontado-total").length,
    montoTotal: adelantosArray.reduce((sum, a) => sum + a.monto_original, 0),
    saldoPendiente: adelantosArray.reduce((sum, a) => sum + a.saldo_pendiente, 0),
  }

  const isLoading = loadingAdelantos || loadingPersonas
  const hasError = errorAdelantos || errorPersonas

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Cargando adelantos...</p>
        </div>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive">Error: {errorAdelantos || errorPersonas}</p>
          <Button onClick={refresh} className="mt-2">
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Adelantos</h1>
          <p className="text-muted-foreground">Administra los adelantos otorgados a productores</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Adelanto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Adelanto</DialogTitle>
              <DialogDescription>Registra un nuevo adelanto para un productor</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="productor">Productor *</Label>
                  <Select value={formData.productor_id} onValueChange={handleProductorChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar productor" />
                    </SelectTrigger>
                    <SelectContent>
                      {productores.map((productor) => (
                        <SelectItem key={productor.$id} value={productor.$id}>
                          {productor.nombres} {productor.apellidos}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="monto">Monto *</Label>
                  <Input
                    id="monto"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={formData.monto_original || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, monto_original: Number.parseFloat(e.target.value) || 0 }))
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fecha">Fecha *</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={formData.fecha_adelanto}
                    onChange={(e) => setFormData((prev) => ({ ...prev, fecha_adelanto: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="concepto">Concepto *</Label>
                  <Textarea
                    id="concepto"
                    placeholder="Describe el motivo del adelanto..."
                    value={formData.concepto}
                    onChange={(e) => setFormData((prev) => ({ ...prev, concepto: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Crear Adelanto</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Adelantos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">S/ {stats.montoTotal.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendientes}</div>
            <p className="text-xs text-muted-foreground">Sin descuentos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parciales</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.parciales}</div>
            <p className="text-xs text-muted-foreground">Con descuentos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Pendiente</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/ {stats.saldoPendiente.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Por descontar</p>
          </CardContent>
        </Card>
      </div>

      {/* Adelantos Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Adelantos</CardTitle>
          <CardDescription>Historial completo de adelantos registrados</CardDescription>
        </CardHeader>
        <CardContent>
          {adelantosArray.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay adelantos registrados</p>
              <p className="text-sm text-muted-foreground">Crea el primer adelanto usando el botón "Nuevo Adelanto"</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Productor</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Monto Original</TableHead>
                  <TableHead>Descontado</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adelantosArray.map((adelanto) => (
                  <TableRow key={adelanto.$id}>
                    <TableCell>{format(new Date(adelanto.fecha_adelanto), "dd/MM/yyyy", { locale: es })}</TableCell>
                    <TableCell className="font-medium">{adelanto.productor_nombre}</TableCell>
                    <TableCell className="max-w-xs truncate">{adelanto.concepto}</TableCell>
                    <TableCell className="font-semibold">S/ {adelanto.monto_original.toLocaleString()}</TableCell>
                    <TableCell className="text-green-600">S/ {adelanto.monto_descontado.toLocaleString()}</TableCell>
                    <TableCell className="font-semibold text-orange-600">
                      S/ {adelanto.saldo_pendiente.toLocaleString()}
                    </TableCell>
                    <TableCell>{getEstadoBadge(adelanto.estado)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
