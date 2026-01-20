"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Banknote, TrendingUp, Users, CreditCard, Plus, FileText, Edit3, Loader2, AlertCircle } from 'lucide-react'
import { useDeudasProveedores } from "@/lib/hooks/use-deudas-proveedores"
import { ProveedorDeuda } from "@/types/proveedor-deuda" // Assuming ProveedorDeuda type is defined somewhere

export function GestionDeudasProveedores() {
  const { data: proveedores, loading, error, refresh } = useDeudasProveedores()
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<ProveedorDeuda | null>(null)
  const [mostrarDialogoAdelanto, setMostrarDialogoAdelanto] = useState(false)
  const [mostrarDialogoAjuste, setMostrarDialogoAjuste] = useState(false)
  const [nuevoAdelanto, setNuevoAdelanto] = useState({ monto: 0, descripcion: "" })
  const [nuevoAjuste, setNuevoAjuste] = useState({ tipo: "positivo", monto: 0, descripcion: "" })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando proveedores...</span>
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

  const registrarAdelanto = () => {
    if (proveedorSeleccionado && nuevoAdelanto.monto > 0) {
      alert("Adelanto registrado exitosamente (integración con API próxima)")
      setMostrarDialogoAdelanto(false)
      setNuevoAdelanto({ monto: 0, descripcion: "" })
    }
  }

  const registrarAjuste = () => {
    if (proveedorSeleccionado && nuevoAjuste.monto > 0) {
      alert("Ajuste registrado exitosamente (integración con API próxima)")
      setMostrarDialogoAjuste(false)
      setNuevoAjuste({ tipo: "positivo", monto: 0, descripcion: "" })
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Deudas de Proveedores</h1>
          <p className="text-gray-600 mt-2">Sistema unificado de adelantos, estado de cuenta y gestión financiera</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Banknote className="w-4 h-4 mr-2" />
          Módulo Financiero
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Proveedores */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Proveedores ({proveedores.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {proveedores.length === 0 ? (
              <p className="text-gray-500 text-sm">No hay proveedores registrados</p>
            ) : (
              proveedores.map((proveedor) => (
                <div
                  key={proveedor.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    proveedorSeleccionado?.id === proveedor.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setProveedorSeleccionado(proveedor)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{proveedor.nombre}</div>
                      <div className="text-sm text-gray-500">{proveedor.documento}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${proveedor.saldoActual >= 0 ? "text-green-600" : "text-red-600"}`}>
                        S/ {proveedor.saldoActual.toFixed(2)}
                      </div>
                      <Badge
                        variant={
                          proveedor.estado === "activo"
                            ? "default"
                            : proveedor.estado === "suspendido"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-xs"
                      >
                        {proveedor.estado}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Progress value={(proveedor.creditoDisponible / proveedor.limitCredito) * 100} className="h-2" />
                    <div className="text-xs text-gray-500 mt-1">
                      Crédito: S/ {proveedor.creditoDisponible.toFixed(2)} / S/ {proveedor.limitCredito.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Detalle del Proveedor */}
        <div className="lg:col-span-2 space-y-6">
          {proveedorSeleccionado ? (
            <>
              {/* Resumen Financiero */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      {proveedorSeleccionado.nombre}
                    </span>
                    <div className="flex gap-2">
                      <Dialog open={mostrarDialogoAdelanto} onOpenChange={setMostrarDialogoAdelanto}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Adelanto
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Registrar Adelanto</DialogTitle>
                            <DialogDescription>
                              Crédito disponible: S/ {proveedorSeleccionado.creditoDisponible.toFixed(2)}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="monto-adelanto">Monto</Label>
                              <Input
                                id="monto-adelanto"
                                type="number"
                                step="0.01"
                                value={nuevoAdelanto.monto}
                                onChange={(e) =>
                                  setNuevoAdelanto({
                                    ...nuevoAdelanto,
                                    monto: Number.parseFloat(e.target.value) || 0,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <Label htmlFor="descripcion-adelanto">Descripción</Label>
                              <Textarea
                                id="descripcion-adelanto"
                                value={nuevoAdelanto.descripcion}
                                onChange={(e) =>
                                  setNuevoAdelanto({
                                    ...nuevoAdelanto,
                                    descripcion: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setMostrarDialogoAdelanto(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={registrarAdelanto}>Registrar Adelanto</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Dialog open={mostrarDialogoAjuste} onOpenChange={setMostrarDialogoAjuste}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Edit3 className="w-4 h-4 mr-2" />
                            Ajuste
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Registrar Ajuste Manual</DialogTitle>
                            <DialogDescription>Realizar ajustes positivos o negativos al saldo</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="tipo-ajuste">Tipo de Ajuste</Label>
                              <Select
                                value={nuevoAjuste.tipo}
                                onValueChange={(value) =>
                                  setNuevoAjuste({
                                    ...nuevoAjuste,
                                    tipo: value as "positivo" | "negativo",
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="positivo">Ajuste Positivo (+)</SelectItem>
                                  <SelectItem value="negativo">Ajuste Negativo (-)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="monto-ajuste">Monto</Label>
                              <Input
                                id="monto-ajuste"
                                type="number"
                                step="0.01"
                                value={nuevoAjuste.monto}
                                onChange={(e) =>
                                  setNuevoAjuste({
                                    ...nuevoAjuste,
                                    monto: Number.parseFloat(e.target.value) || 0,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <Label htmlFor="descripcion-ajuste">Justificación</Label>
                              <Textarea
                                id="descripcion-ajuste"
                                value={nuevoAjuste.descripcion}
                                onChange={(e) =>
                                  setNuevoAjuste({
                                    ...nuevoAjuste,
                                    descripcion: e.target.value,
                                  })
                                }
                                placeholder="Justificación del ajuste..."
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setMostrarDialogoAjuste(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={registrarAjuste}>Registrar Ajuste</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div
                        className={`text-xl font-bold ${
                          proveedorSeleccionado.saldoActual >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        S/ {proveedorSeleccionado.saldoActual.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">Saldo Actual</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-xl font-bold text-orange-600">
                        S/ {proveedorSeleccionado.adelantosPendientes.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">Adelantos Pendientes</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-xl font-bold text-green-600">
                        S/ {proveedorSeleccionado.creditoDisponible.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">Crédito Disponible</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-xl font-bold text-gray-600">
                        S/ {proveedorSeleccionado.totalAdelantosDescontados.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">Total Descontado</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="movimientos" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
                  <TabsTrigger value="estadisticas">Estadísticas</TabsTrigger>
                </TabsList>

                <TabsContent value="movimientos">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Historial de Movimientos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Monto</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Responsable</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {proveedorSeleccionado.movimientos.map((movimiento) => (
                            <TableRow key={movimiento.id}>
                              <TableCell>{movimiento.fecha}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    movimiento.tipo === "adelanto"
                                      ? "default"
                                      : movimiento.tipo === "descuento"
                                        ? "secondary"
                                        : movimiento.tipo === "ajuste_positivo"
                                          ? "outline"
                                          : "destructive"
                                  }
                                >
                                  {movimiento.tipo.replace("_", " ")}
                                </Badge>
                              </TableCell>
                              <TableCell>{movimiento.descripcion}</TableCell>
                              <TableCell className={movimiento.monto >= 0 ? "text-green-600" : "text-red-600"}>
                                S/ {Math.abs(movimiento.monto).toFixed(2)}
                                {movimiento.monto >= 0 ? " (+)" : " (-)"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    movimiento.estado === "aplicado"
                                      ? "default"
                                      : movimiento.estado === "pendiente"
                                        ? "secondary"
                                        : "destructive"
                                  }
                                >
                                  {movimiento.estado}
                                </Badge>
                              </TableCell>
                              <TableCell>{movimiento.responsable}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="estadisticas">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Estadísticas de Producción
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 border rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {proveedorSeleccionado.estadisticas.totalKgEntregados.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600">kg Entregados</div>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {proveedorSeleccionado.estadisticas.totalLiquidaciones}
                          </div>
                          <div className="text-sm text-gray-600">Liquidaciones</div>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {proveedorSeleccionado.estadisticas.promedioCalidad.toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-600">Calidad Promedio</div>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">
                            {proveedorSeleccionado.estadisticas.frecuenciaEntregas.toFixed(1)}
                          </div>
                          <div className="text-sm text-gray-600">Entregas/Mes</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Selecciona un proveedor para ver su información detallada</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
