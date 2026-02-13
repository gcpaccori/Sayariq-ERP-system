"use client"

import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { useApi } from "@/lib/hooks/use-api"
import { usePersonas } from "@/lib/hooks/use-personas"
import { adelantosService, type Adelanto } from "@/lib/services/adelantos-service"
import { liquidacionesService } from "@/lib/services/liquidaciones-service"
import { lotesService } from "@/lib/services/lotes-service"
import type { Liquidacion } from "@/lib/types/liquidaciones"
import type { Lote, Persona } from "@/lib/types"
import { CheckCircle2, AlertCircle, Coins, Receipt, Search } from "lucide-react"

const formatCurrency = (value: number) =>
  `S/ ${value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const formatDate = (value?: string) => {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return format(parsed, "dd MMM yyyy", { locale: es })
}

const resolvePersonaNombre = (persona: Persona) =>
  persona.nombre_completo || `${persona.nombres} ${persona.apellidos}`.trim() || "Sin nombre"

export function LiquidacionProveedores() {
  const { toast } = useToast()
  const { data: personas, loading: loadingPersonas } = usePersonas()
  const { data: lotes, loading: loadingLotes, refresh: refreshLotes } = useApi(lotesService, { initialLoad: true })
  const {
    data: liquidaciones,
    loading: loadingLiquidaciones,
    refresh: refreshLiquidaciones,
  } = useApi(liquidacionesService, { initialLoad: true })

  const [search, setSearch] = useState("")
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<string>("")
  const [adelantos, setAdelantos] = useState<Adelanto[]>([])
  const [loadingAdelantos, setLoadingAdelantos] = useState(false)

  const proveedores = useMemo(() => {
    const filtered = personas.filter((persona) => {
      const tipo = (persona.tipo || persona.tipo_persona || "").toLowerCase()
      return ["productor", "proveedor", "acopiador", "empresa"].some((label) => tipo.includes(label))
    })
    return filtered.length > 0 ? filtered : personas
  }, [personas])

  useEffect(() => {
    if (!proveedorSeleccionado && proveedores.length > 0) {
      setProveedorSeleccionado(String(proveedores[0].id))
    }
  }, [proveedores, proveedorSeleccionado])

  useEffect(() => {
    const cargarAdelantos = async () => {
      if (!proveedorSeleccionado) {
        setAdelantos([])
        return
      }
      setLoadingAdelantos(true)
      try {
        const data = await adelantosService.obtenerAdelantosPorProductor(Number(proveedorSeleccionado))
        setAdelantos(data)
      } catch (error) {
        console.error("Error al cargar adelantos:", error)
        setAdelantos([])
      } finally {
        setLoadingAdelantos(false)
      }
    }

    cargarAdelantos()
  }, [proveedorSeleccionado])

  const proveedorActivo = useMemo(
    () => proveedores.find((persona) => String(persona.id) === proveedorSeleccionado) || null,
    [proveedorSeleccionado, proveedores],
  )

  const lotesProveedor = useMemo(
    () => (lotes as Lote[]).filter((lote) => String(lote.productor_id) === proveedorSeleccionado),
    [lotes, proveedorSeleccionado],
  )

  const liquidacionesProveedor = useMemo(() => {
    const lotesIds = new Set(lotesProveedor.map((lote) => lote.id))
    return (liquidaciones as Liquidacion[]).filter((liq) => lotesIds.has(liq.lote_id))
  }, [liquidaciones, lotesProveedor])

  const liquidacionPorLote = useMemo(() => {
    const map = new Map<number, Liquidacion>()
    liquidacionesProveedor.forEach((liq) => map.set(liq.lote_id, liq))
    return map
  }, [liquidacionesProveedor])

  const adelantosPendientes = useMemo(
    () => adelantos.filter((adelanto) => adelanto.estado !== "descontado-total"),
    [adelantos],
  )

  const totalAdelantosPendientes = useMemo(
    () => adelantosPendientes.reduce((acc, adelanto) => acc + (adelanto.saldo_pendiente || 0), 0),
    [adelantosPendientes],
  )

  const totalPorPagar = useMemo(
    () =>
      liquidacionesProveedor.reduce(
        (acc, liq) => acc + (liq.estado_pago === "PAGADO" ? 0 : Number(liq.total_a_pagar || 0)),
        0,
      ),
    [liquidacionesProveedor],
  )

  const lotesFiltrados = useMemo(() => {
    if (!search) return lotesProveedor
    const term = search.toLowerCase()
    return lotesProveedor.filter((lote) => {
      const codigo = (lote.numero_lote || lote.codigo || "").toLowerCase()
      return codigo.includes(term) || (lote.producto || "").toLowerCase().includes(term)
    })
  }, [lotesProveedor, search])

  const handleActualizarEstado = async (liq: Liquidacion) => {
    try {
      await liquidacionesService.actualizarEstado(liq.id, "PAGADO")
      toast({
        title: "Pago registrado",
        description: `La liquidación ${liq.numero_liquidacion || liq.id} ahora está marcada como pagada.`,
      })
      refreshLiquidaciones()
      refreshLotes()
    } catch (error) {
      console.error("Error al actualizar liquidación:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la liquidación.",
        variant: "destructive",
      })
    }
  }

  const resumenLotes = useMemo(() => {
    const total = lotesProveedor.length
    const liquidado = lotesProveedor.filter((lote) => liquidacionPorLote.has(lote.id)).length
    return { total, liquidado, pendiente: total - liquidado }
  }, [lotesProveedor, liquidacionPorLote])

  const tieneAdelantosSinLote = adelantosPendientes.length > 0 && lotesProveedor.length === 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Liquidación de Proveedores</h2>
          <p className="text-muted-foreground">
            Controla pagos, adelantos y estado de lotes para productores, acopiadores y empresas asociadas.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Receipt className="h-4 w-4" />
          Kardex financiero se actualiza al registrar pagos y liquidaciones.
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecciona proveedor</CardTitle>
          <CardDescription>Busca y analiza el estado de lotes, adelantos y pagos.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[280px_1fr]">
          <div className="space-y-3">
            <Label>Proveedor / Productor</Label>
            <Select
              value={proveedorSeleccionado}
              onValueChange={(value) => setProveedorSeleccionado(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingPersonas ? "Cargando..." : "Seleccionar proveedor"} />
              </SelectTrigger>
              <SelectContent>
                {proveedores.map((persona) => (
                  <SelectItem key={persona.id} value={String(persona.id)}>
                    {resolvePersonaNombre(persona)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label>Búsqueda rápida</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por código de lote o producto"
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de lotes</CardDescription>
            <CardTitle className="text-2xl">{resumenLotes.total}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {resumenLotes.liquidado} liquidados · {resumenLotes.pendiente} pendientes
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Por pagar</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalPorPagar)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Liquidaciones pendientes de pago.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Adelantos pendientes</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalAdelantosPendientes)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {adelantosPendientes.length} adelanto(s) en proceso.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Estado general</CardDescription>
            <CardTitle className="text-xl">
              {tieneAdelantosSinLote ? "Adelantado sin carga" : "Operativo"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {tieneAdelantosSinLote
              ? "Hay adelantos activos sin lotes asociados."
              : "Lotes y adelantos con trazabilidad."}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="lotes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="lotes">Lotes</TabsTrigger>
          <TabsTrigger value="liquidaciones">Liquidaciones</TabsTrigger>
          <TabsTrigger value="adelantos">Adelantos</TabsTrigger>
        </TabsList>

        <TabsContent value="lotes">
          <Card>
            <CardHeader>
              <CardTitle>Lotes del proveedor</CardTitle>
              <CardDescription>Estado de cada lote según liquidación y pagos registrados.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLotes ? (
                <p className="text-sm text-muted-foreground">Cargando lotes...</p>
              ) : lotesFiltrados.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay lotes para este proveedor.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lote</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Fecha ingreso</TableHead>
                      <TableHead className="text-right">Kg neto</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotesFiltrados.map((lote) => {
                      const liquidacion = liquidacionPorLote.get(lote.id)
                      const estado = liquidacion
                        ? liquidacion.estado_pago === "PAGADO"
                          ? "Pagado"
                          : "Liquidado pendiente"
                        : "En deuda"
                      return (
                        <TableRow key={lote.id}>
                          <TableCell className="font-medium">{lote.numero_lote || lote.codigo || "-"}</TableCell>
                          <TableCell>{lote.producto || "-"}</TableCell>
                          <TableCell>{formatDate(lote.fecha_ingreso)}</TableCell>
                          <TableCell className="text-right">
                            {(lote.peso_neto || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={estado === "Pagado" ? "default" : estado === "En deuda" ? "destructive" : "secondary"}>
                              {estado}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="liquidaciones">
          <Card>
            <CardHeader>
              <CardTitle>Liquidaciones y pagos</CardTitle>
              <CardDescription>Registra el pago y confirma la salida de dinero en el kardex.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingLiquidaciones ? (
                <p className="text-sm text-muted-foreground">Cargando liquidaciones...</p>
              ) : liquidacionesProveedor.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay liquidaciones registradas.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N°</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liquidacionesProveedor.map((liq) => (
                      <TableRow key={liq.id}>
                        <TableCell className="font-medium">{liq.numero_liquidacion || `LIQ-${liq.id}`}</TableCell>
                        <TableCell>{liq.numero_lote || "-"}</TableCell>
                        <TableCell>{formatDate(liq.fecha_liquidacion)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(liq.total_a_pagar || 0))}</TableCell>
                        <TableCell>
                          <Badge variant={liq.estado_pago === "PAGADO" ? "default" : "secondary"}>
                            {liq.estado_pago}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={liq.estado_pago === "PAGADO"}
                            onClick={() => handleActualizarEstado(liq)}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Marcar pagado
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <Separator />
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <span>
                  Al marcar como pagado, el movimiento se refleja como salida de dinero en el Kardex Integral.
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adelantos">
          <Card>
            <CardHeader>
              <CardTitle>Adelantos y cobertura de lotes</CardTitle>
              <CardDescription>Verifica qué lotes ya cubrieron adelantos y cuáles están pendientes.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAdelantos ? (
                <p className="text-sm text-muted-foreground">Cargando adelantos...</p>
              ) : adelantos.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay adelantos registrados.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Lotes cubiertos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adelantos.map((adelanto) => (
                      <TableRow key={adelanto.id}>
                        <TableCell>{formatDate(adelanto.fecha_adelanto)}</TableCell>
                        <TableCell>{adelanto.concepto || "Adelanto"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(adelanto.monto_original)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(adelanto.saldo_pendiente)}</TableCell>
                        <TableCell>
                          <Badge variant={adelanto.estado === "descontado-total" ? "default" : "secondary"}>
                            {adelanto.estado.replace("-", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {adelanto.descuentos?.length ? (
                            <div className="flex flex-wrap gap-1">
                              {adelanto.descuentos.map((descuento, index) => (
                                <Badge key={`${descuento.lote_id}-${index}`} variant="outline">
                                  {descuento.lote_codigo || `Lote ${descuento.lote_id}`}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Sin lote</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {proveedorActivo && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Resumen financiero del proveedor</CardTitle>
            <CardDescription>{resolvePersonaNombre(proveedorActivo)}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Coins className="h-4 w-4" />
                <span>Total por pagar</span>
              </div>
              <p className="text-2xl font-semibold">{formatCurrency(totalPorPagar)}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Receipt className="h-4 w-4" />
                <span>Liquidaciones registradas</span>
              </div>
              <p className="text-2xl font-semibold">{liquidacionesProveedor.length}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                <span>Adelantos activos</span>
              </div>
              <p className="text-2xl font-semibold">{adelantosPendientes.length}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
