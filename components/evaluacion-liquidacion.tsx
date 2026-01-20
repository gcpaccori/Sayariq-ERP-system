"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Search, User, Phone, MapPin, Calendar, Package, DollarSign, TrendingUp, Eye, Calculator, FileText, ChevronDown, Check, Loader2 } from 'lucide-react'
import { cn } from "@/lib/utils"
import { useApi } from "@/lib/hooks/use-api"
import { lotesService } from "@/lib/services/lotes-service"
import { personasService } from "@/lib/services/personas-service"
import { liquidacionesService, type Liquidacion } from "@/lib/services/liquidaciones-service"
import type { Lote, Persona } from "@/lib/types"

export function EvaluacionLiquidacion() {
  const [selectedProveedor, setSelectedProveedor] = useState<Persona | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [open, setOpen] = useState(false)
  const [filteredProveedores, setFilteredProveedores] = useState<Persona[]>([])
  const [liquidacionesProveedor, setLiquidacionesProveedor] = useState<Liquidacion[]>([])

  const { data: proveedores, loading: loadingProveedores } = useApi(personasService, { initialLoad: true })
  const { data: liquidaciones, loading: loadingLiquidaciones } = useApi(liquidacionesService, { initialLoad: true })
  const { data: lotes } = useApi(lotesService, { initialLoad: true })

  useEffect(() => {
    const filtered = (proveedores as Persona[])
      .filter(
        (p) =>
          p.nombres?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.apellidos?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.dni?.includes(searchTerm) ||
          p.telefono?.includes(searchTerm),
      )
      .slice(0, 10)
    setFilteredProveedores(filtered)
  }, [searchTerm, proveedores])

  useEffect(() => {
    if (selectedProveedor) {
      const liquidacionesDel = (liquidaciones as Liquidacion[]).filter(
        (l) => l.productor_id === selectedProveedor.id,
      )
      setLiquidacionesProveedor(liquidacionesDel)
    }
  }, [selectedProveedor, liquidaciones])

  const stats = {
    totalProveedoresPendientes: (liquidaciones as Liquidacion[]).filter((l) => l.estado === "pendiente").length,
    totalMontosPendientes: (liquidaciones as Liquidacion[]).reduce(
      (sum, l) => sum + (l.estado === "pendiente" ? (l.valor_neto || 0) : 0),
      0,
    ),
    totalLiquidaciones: (liquidaciones as Liquidacion[]).length,
    totalMontoLiquidado: (liquidaciones as Liquidacion[]).reduce((sum, l) => sum + (l.valor_bruto || 0), 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Evaluación de Liquidación</h1>
          <p className="text-muted-foreground">Gestiona las liquidaciones de productores</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Liquidaciones Pendientes</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProveedoresPendientes}</div>
            <p className="text-xs text-muted-foreground">Por procesar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Total Pendiente</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/ {stats.totalMontosPendientes.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Por liquidar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Liquidaciones</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLiquidaciones}</div>
            <p className="text-xs text-muted-foreground">Registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Liquidado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/ {stats.totalMontoLiquidado.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total procesado</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Selector de Proveedor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Seleccionar Productor
            </CardTitle>
            <CardDescription>Busca un productor para ver sus liquidaciones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingProveedores ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Cargando proveedores...
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Buscar Productor</Label>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between bg-transparent"
                      >
                        {selectedProveedor
                          ? `${selectedProveedor.nombres} ${selectedProveedor.apellidos}`
                          : "Seleccionar productor..."}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput
                          placeholder="Buscar por nombre o documento..."
                          value={searchTerm}
                          onValueChange={setSearchTerm}
                        />
                        <CommandEmpty>No se encontraron productores.</CommandEmpty>
                        <CommandList>
                          <CommandGroup>
                            {filteredProveedores.map((proveedor) => (
                              <CommandItem
                                key={proveedor.id}
                                value={proveedor.id.toString()}
                                onSelect={() => {
                                  setSelectedProveedor(proveedor)
                                  setOpen(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedProveedor?.id === proveedor.id ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                <div className="flex-1">
                                  <div className="font-medium">
                                    {proveedor.nombres} {proveedor.apellidos}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {proveedor.dni} • {proveedor.telefono}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {selectedProveedor && (
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold">
                      {selectedProveedor.nombres} {selectedProveedor.apellidos}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Documento</span>
                        <p className="font-medium">{selectedProveedor.dni}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Teléfono</span>
                        <p className="font-medium">{selectedProveedor.telefono}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Dirección</span>
                        <p className="font-medium truncate">{selectedProveedor.direccion || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cuenta</span>
                        <p className="font-medium">{selectedProveedor.cuenta_bancaria || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Resumen de Productores */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen de Productores</CardTitle>
            <CardDescription>Vista general de todos los productores</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {loadingProveedores ? (
                  <div className="text-center py-8 text-muted-foreground">Cargando...</div>
                ) : (proveedores as Persona[]).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No hay productores</div>
                ) : (
                  (proveedores as Persona[]).map((proveedor) => {
                    const liquidacionesDel = (liquidaciones as Liquidacion[]).filter(
                      (l) => l.productor_id === proveedor.id,
                    )
                    const totalPendiente = liquidacionesDel
                      .filter((l) => l.estado === "pendiente")
                      .reduce((sum, l) => sum + (l.valor_neto || 0), 0)

                    return (
                      <div
                        key={proveedor.id}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50",
                          selectedProveedor?.id === proveedor.id && "bg-primary/10 border-primary",
                        )}
                        onClick={() => setSelectedProveedor(proveedor)}
                      >
                        <div className="font-medium">
                          {proveedor.nombres} {proveedor.apellidos}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground mt-2">
                          <div>
                            <div className="font-medium text-foreground">{liquidacionesDel.length}</div>
                            <div>Liquidaciones</div>
                          </div>
                          <div>
                            <div className="font-medium text-foreground">S/ {totalPendiente.toLocaleString()}</div>
                            <div>Pendiente</div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Liquidaciones del Productor */}
      <Card>
        <CardHeader>
          <CardTitle>Liquidaciones Registradas</CardTitle>
          <CardDescription>
            {selectedProveedor
              ? `Liquidaciones de ${selectedProveedor.nombres} ${selectedProveedor.apellidos}`
              : "Selecciona un productor para ver sus liquidaciones"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingLiquidaciones ? (
            <div className="text-center py-8">
              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
              Cargando liquidaciones...
            </div>
          ) : liquidacionesProveedor.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {selectedProveedor ? "No hay liquidaciones para este productor" : "Selecciona un productor"}
            </div>
          ) : (
            <div className="space-y-3">
              {liquidacionesProveedor.map((liquidacion) => (
                <div key={liquidacion.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium">{liquidacion.numero_liquidacion}</div>
                      <Badge variant={liquidacion.estado === "pendiente" ? "destructive" : "default"}>
                        {liquidacion.estado.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {liquidacion.fecha_liquidacion} • Lote: {liquidacion.lote_codigo}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">S/ {(liquidacion.valor_bruto || 0).toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Acciones */}
      {selectedProveedor && (
        <Card>
          <CardHeader>
            <CardTitle>Acciones de Liquidación</CardTitle>
            <CardDescription>Procesa la liquidación del productor seleccionado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button className="flex-1">
                <Calculator className="mr-2 h-4 w-4" />
                Crear Liquidación
              </Button>
              <Button variant="outline" className="flex-1 bg-transparent">
                <FileText className="mr-2 h-4 w-4" />
                Ver Detalle
              </Button>
              <Button variant="outline">
                <Eye className="mr-2 h-4 w-4" />
                Vista Previa
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
