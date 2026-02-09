"use client"

import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { useApi } from "@/lib/hooks/use-api"
import { numeroService } from "@/lib/services/numero-service"
import { pedidosService, type LoteAsignadoDto } from "@/lib/services/pedidos-service"
import { ventasService } from "@/lib/services/ventas-service"
import type { Pedido, VentaCliente } from "@/lib/types"
import { FileText, Loader2, Receipt, RefreshCw, ShoppingBag } from "lucide-react"

type VentaDetalle = Record<string, number>

const formatCurrency = (value: number) =>
  `S/ ${value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const formatDate = (value?: string) => {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return format(parsed, "dd MMM yyyy", { locale: es })
}

const buildKey = (loteId: number, categoriaId?: number | null, categoria?: string) =>
  `${loteId}-${categoriaId ?? "na"}-${(categoria || "").toLowerCase()}`

export function BoletasVentas() {
  const { toast } = useToast()
  const {
    data: pedidosData,
    loading: loadingPedidos,
    refresh: refreshPedidos,
  } = useApi(pedidosService, { initialLoad: true })

  const [pedidoSeleccionadoId, setPedidoSeleccionadoId] = useState<number | null>(null)
  const [lotesAsignados, setLotesAsignados] = useState<LoteAsignadoDto[]>([])
  const [lotesVendidos, setLotesVendidos] = useState<Record<string, number>>({})
  const [ventasRegistradas, setVentasRegistradas] = useState<VentaCliente[]>([])
  const [detalleVenta, setDetalleVenta] = useState<VentaDetalle>({})
  const [precioUnitario, setPrecioUnitario] = useState<string>("")
  const [observaciones, setObservaciones] = useState<string>("")
  const [numeroBoleta, setNumeroBoleta] = useState<string>("")
  const [fechaVenta, setFechaVenta] = useState<string>(new Date().toISOString().split("T")[0])
  const [guardando, setGuardando] = useState(false)

  const pedidos = useMemo(() => (Array.isArray(pedidosData) ? (pedidosData as Pedido[]) : []), [pedidosData])
  const pedidosPendientes = useMemo(
    () => pedidos.filter((pedido) => pedido.estado === "pendiente" || pedido.estado === "proceso"),
    [pedidos],
  )

  const pedidoSeleccionado = useMemo(
    () => pedidos.find((pedido) => pedido.id === pedidoSeleccionadoId) || null,
    [pedidos, pedidoSeleccionadoId],
  )

  useEffect(() => {
    const cargarDetalles = async () => {
      if (!pedidoSeleccionadoId) {
        setLotesAsignados([])
        setLotesVendidos({})
        setVentasRegistradas([])
        setDetalleVenta({})
        setNumeroBoleta("")
        return
      }

      try {
        const [asignados, vendidos, ventas, numero] = await Promise.all([
          pedidosService.getLotesPedido(pedidoSeleccionadoId),
          ventasService.getLotesVendidosByPedido(pedidoSeleccionadoId),
          ventasService.getVentasByPedido(pedidoSeleccionadoId),
          numeroService.generarNumeroFactura(),
        ])

        const vendidosMap: Record<string, number> = {}
        vendidos.forEach((row) => {
          const key = buildKey(row.lote_id, row.categoria_id, row.categoria)
          vendidosMap[key] = (vendidosMap[key] || 0) + (Number(row.kg_vendido) || 0)
        })

        setLotesAsignados(asignados)
        setLotesVendidos(vendidosMap)
        setVentasRegistradas(Array.isArray(ventas) ? ventas : [])
        setDetalleVenta({})
        setNumeroBoleta(numero)
      } catch (error) {
        console.error("Error al cargar detalles del pedido:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los detalles del pedido.",
          variant: "destructive",
        })
      }
    }

    cargarDetalles()
  }, [pedidoSeleccionadoId, toast])

  useEffect(() => {
    if (pedidoSeleccionado) {
      setPrecioUnitario(pedidoSeleccionado.precio ? String(pedidoSeleccionado.precio) : "")
    }
  }, [pedidoSeleccionado])

  const lotesConDisponibilidad = useMemo(
    () =>
      lotesAsignados.map((lote) => {
        const key = buildKey(lote.lote_id, lote.categoria_id, lote.categoria)
        const vendido = lotesVendidos[key] || 0
        const asignado = Number(lote.kg_asignado) || 0
        const disponible = Math.max(asignado - vendido, 0)
        return { ...lote, vendido, disponible, key }
      }),
    [lotesAsignados, lotesVendidos],
  )

  const totalKg = useMemo(
    () => Object.values(detalleVenta).reduce((acc, kg) => acc + (Number(kg) || 0), 0),
    [detalleVenta],
  )
  const precioUnitarioNumero = Number.parseFloat(precioUnitario) || 0
  const totalVenta = totalKg * precioUnitarioNumero

  const invalidLotes = lotesConDisponibilidad.filter((lote) => {
    const kg = Number(detalleVenta[lote.key] || 0)
    return kg > lote.disponible + 0.001
  })

  const isFormValid =
    pedidoSeleccionado &&
    totalKg > 0 &&
    precioUnitarioNumero > 0 &&
    invalidLotes.length === 0 &&
    Boolean(numeroBoleta)

  const handleAsignarDisponible = (key: string, disponible: number) => {
    setDetalleVenta((prev) => ({ ...prev, [key]: disponible }))
  }

  const handleGuardarVenta = async () => {
    if (!pedidoSeleccionado || !isFormValid) return

    setGuardando(true)
    try {
      const lotesParaVenta = lotesConDisponibilidad
        .map((lote) => ({
          lote_id: lote.lote_id,
          categoria_id: lote.categoria_id ?? null,
          categoria: lote.categoria,
          kg_vendido: Number(detalleVenta[lote.key] || 0),
        }))
        .filter((item) => item.kg_vendido > 0)

      await ventasService.createPedidoVenta({
        pedido_id: pedidoSeleccionado.id,
        fecha_venta: fechaVenta,
        observaciones,
        precio: precioUnitarioNumero,
        lotes: lotesParaVenta,
      })

      const totalPedido = pedidoSeleccionado.kg_neto || 0
      const nuevoEstado = totalKg >= totalPedido - 0.01 ? "completado" : "proceso"
      await pedidosService.updateEstado(pedidoSeleccionado.id, nuevoEstado)

      toast({
        title: "Boleta registrada",
        description: `La venta ${numeroBoleta} fue registrada correctamente.`,
      })

      setDetalleVenta({})
      setObservaciones("")
      setNumeroBoleta(await numeroService.generarNumeroFactura())
      setVentasRegistradas(await ventasService.getVentasByPedido(pedidoSeleccionado.id))
      refreshPedidos()
    } catch (error) {
      console.error("Error al registrar venta:", error)
      toast({
        title: "Error",
        description: "No se pudo registrar la boleta de venta.",
        variant: "destructive",
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Boletas de Venta</h2>
          <p className="text-muted-foreground">
            Emite boletas por pedido y registra el ingreso de dinero en el Kardex Integral.
          </p>
        </div>
        <Button variant="outline" onClick={refreshPedidos}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar pedidos
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>Pedidos listos para facturar</CardTitle>
            <CardDescription>{pedidosPendientes.length} pedidos pendientes o en proceso.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingPedidos ? (
              <p className="text-sm text-muted-foreground">Cargando pedidos...</p>
            ) : pedidosPendientes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay pedidos disponibles.</p>
            ) : (
              <div className="space-y-3">
                {pedidosPendientes.map((pedido) => (
                  <button
                    key={pedido.id}
                    className={`w-full rounded-lg border p-4 text-left transition ${
                      pedido.id === pedidoSeleccionadoId ? "border-primary bg-primary/5" : "hover:border-primary/50"
                    }`}
                    onClick={() => setPedidoSeleccionadoId(pedido.id)}
                    type="button"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Pedido</p>
                        <p className="text-lg font-semibold">{pedido.numero_pedido || `PED-${pedido.id}`}</p>
                      </div>
                      <Badge variant={pedido.estado === "pendiente" ? "default" : "secondary"}>
                        {pedido.estado}
                      </Badge>
                    </div>
                    <Separator className="my-3" />
                    <div className="grid gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>Cliente</span>
                        <span className="font-medium text-foreground">{pedido.cliente_nombre || pedido.cliente}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Producto</span>
                        <span className="font-medium text-foreground">{pedido.producto}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Kg neto</span>
                        <span className="font-medium text-foreground">{pedido.kg_neto.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Total esperado</span>
                        <span className="font-semibold text-foreground">{formatCurrency(pedido.total || 0)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Emitir boleta</CardTitle>
            <CardDescription>Completa el detalle de lotes y confirma la venta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!pedidoSeleccionado ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                <ShoppingBag className="mx-auto h-8 w-8" />
                <p className="mt-2">Selecciona un pedido para generar la boleta.</p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>N° Boleta</Label>
                    <Input value={numeroBoleta} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de venta</Label>
                    <Input
                      type="date"
                      value={fechaVenta}
                      onChange={(event) => setFechaVenta(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Precio por Kg</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={precioUnitario}
                      onChange={(event) => setPrecioUnitario(event.target.value)}
                    />
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                    <div className="flex items-center justify-between">
                      <span>Cliente</span>
                      <span className="font-medium text-foreground">
                        {pedidoSeleccionado.cliente_nombre || pedidoSeleccionado.cliente}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Producto</span>
                      <span className="font-medium text-foreground">{pedidoSeleccionado.producto}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Kg neto pedido</span>
                      <span className="font-medium text-foreground">{pedidoSeleccionado.kg_neto.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Fecha pedido</span>
                      <span className="font-medium text-foreground">{formatDate(pedidoSeleccionado.fecha_pedido)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Detalle por lote</Label>
                    {invalidLotes.length > 0 && (
                      <Badge variant="destructive">Peso excedido en {invalidLotes.length} lote(s)</Badge>
                    )}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lote</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Asignado</TableHead>
                        <TableHead className="text-right">Disponible</TableHead>
                        <TableHead className="text-right">Kg a vender</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lotesConDisponibilidad.map((lote) => (
                        <TableRow key={lote.key}>
                          <TableCell className="font-medium">{lote.numero_lote || `Lote ${lote.lote_id}`}</TableCell>
                          <TableCell>{lote.categoria || "General"}</TableCell>
                          <TableCell className="text-right">{lote.kg_asignado.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{lote.disponible.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Input
                                className="w-28 text-right"
                                type="number"
                                step="0.01"
                                min={0}
                                value={detalleVenta[lote.key] ?? ""}
                                onChange={(event) =>
                                  setDetalleVenta((prev) => ({ ...prev, [lote.key]: Number(event.target.value) }))
                                }
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleAsignarDisponible(lote.key, lote.disponible)}
                              >
                                Max
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="bg-muted/30">
                    <CardHeader className="pb-2">
                      <CardDescription>Kg a facturar</CardDescription>
                      <CardTitle className="text-xl">{totalKg.toFixed(2)}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="bg-muted/30">
                    <CardHeader className="pb-2">
                      <CardDescription>Precio unitario</CardDescription>
                      <CardTitle className="text-xl">{formatCurrency(precioUnitarioNumero)}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="bg-muted/30">
                    <CardHeader className="pb-2">
                      <CardDescription>Total venta</CardDescription>
                      <CardTitle className="text-xl">{formatCurrency(totalVenta)}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                <div className="space-y-2">
                  <Label>Observaciones</Label>
                  <Textarea
                    value={observaciones}
                    onChange={(event) => setObservaciones(event.target.value)}
                    placeholder="Notas adicionales para la boleta."
                  />
                </div>

                <Button className="w-full" onClick={handleGuardarVenta} disabled={!isFormValid || guardando}>
                  {guardando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Receipt className="mr-2 h-4 w-4" />}
                  Registrar boleta y cobrar
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Boletas emitidas para este pedido</CardTitle>
          <CardDescription>Historial de ventas registradas y estado de pago.</CardDescription>
        </CardHeader>
        <CardContent>
          {!pedidoSeleccionado ? (
            <p className="text-sm text-muted-foreground">Selecciona un pedido para ver el historial.</p>
          ) : ventasRegistradas.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay boletas registradas para este pedido.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ventasRegistradas.map((venta) => (
                  <TableRow key={venta.id}>
                    <TableCell className="font-medium">{venta.codigo || `VENTA-${venta.id}`}</TableCell>
                    <TableCell>{formatDate(venta.fecha_venta)}</TableCell>
                    <TableCell className="text-right">{venta.cantidad?.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(venta.total || 0)}</TableCell>
                    <TableCell>
                      <Badge variant={venta.estado === "pagado" ? "default" : "secondary"}>{venta.estado}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Notas de operación</CardTitle>
          <CardDescription>Validaciones automáticas para mantener consistencia en Kardex.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <FileText className="mt-0.5 h-4 w-4" />
            <span>La boleta registra ingreso financiero y salida de stock automáticamente.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Receipt className="mt-0.5 h-4 w-4" />
            <span>El sistema valida el peso disponible por lote antes de guardar.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <ShoppingBag className="mt-0.5 h-4 w-4" />
            <span>El estado del pedido se actualiza a “proceso” o “completado”.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
