"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2 } from 'lucide-react'
import { useToast } from "@/components/ui/use-toast"
import { useApi } from "@/lib/hooks/use-api"
import { pedidosService, type LoteAsignadoDto } from "@/lib/services/pedidos-service"
import { ventasService } from "@/lib/services/ventas-service"
import type { Pedido } from "@/lib/types"

type VentaLoteRegistro = {
  lote_id: number
  categoria_id?: number | null
  categoria?: string
  kg_vendido: number
}

export function RegistroVenta() {
  const { toast } = useToast()
  const [registrando, setRegistrando] = useState(false)
  const [pedidoSeleccionadoId, setPedidoSeleccionadoId] = useState<number | null>(null)
  const [lotesAsignados, setLotesAsignados] = useState<LoteAsignadoDto[]>([])
  const [lotesVendidos, setLotesVendidos] = useState<Record<string, number>>({})
  const [detalleVenta, setDetalleVenta] = useState<Record<string, number>>({})
  const [precioUnitario, setPrecioUnitario] = useState<string>("")
  const [observaciones, setObservaciones] = useState<string>("")

  const { data: pedidosData, loading: loadingPedidos } = useApi(pedidosService, { initialLoad: true })

  const pedidos = useMemo(() => (Array.isArray(pedidosData) ? (pedidosData as Pedido[]) : []), [pedidosData])
  const pedidoSeleccionado = useMemo(
    () => pedidos.find((pedido) => pedido.id === pedidoSeleccionadoId) || null,
    [pedidos, pedidoSeleccionadoId],
  )

  const buildKey = (loteId: number, categoriaId?: number | null, categoria?: string) =>
    `${loteId}-${categoriaId ?? "na"}-${(categoria || "").toLowerCase()}`

  useEffect(() => {
    const fetchDetalle = async () => {
      if (!pedidoSeleccionadoId) {
        setLotesAsignados([])
        setLotesVendidos({})
        setDetalleVenta({})
        return
      }

      try {
        const [asignados, vendidos] = await Promise.all([
          pedidosService.getLotesPedido(pedidoSeleccionadoId),
          ventasService.getLotesVendidosByPedido(pedidoSeleccionadoId),
        ])

        const vendidosMap: Record<string, number> = {}
        vendidos.forEach((row) => {
          const key = buildKey(row.lote_id, row.categoria_id, row.categoria)
          vendidosMap[key] = (vendidosMap[key] || 0) + (Number(row.kg_vendido) || 0)
        })

        setLotesAsignados(asignados)
        setLotesVendidos(vendidosMap)
        setDetalleVenta({})
      } catch (error) {
        console.error("Error al cargar lotes del pedido:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los lotes asignados",
          variant: "destructive",
        })
      }
    }

    fetchDetalle()
  }, [pedidoSeleccionadoId, toast])

  useEffect(() => {
    if (pedidoSeleccionado) {
      setPrecioUnitario(pedidoSeleccionado.precio ? String(pedidoSeleccionado.precio) : "")
    }
  }, [pedidoSeleccionado])

  const lotesConSaldos = useMemo(
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
    () =>
      Object.values(detalleVenta).reduce((acc, kg) => acc + (Number(kg) || 0), 0),
    [detalleVenta],
  )
  const precioUnitarioNumero = Number.parseFloat(precioUnitario) || 0
  const total = totalKg * precioUnitarioNumero

  const invalidLotes = lotesConSaldos.filter((lote) => {
    const kg = Number(detalleVenta[lote.key] || 0)
    return kg > lote.disponible + 0.001
  })

  const isFormValid =
    pedidoSeleccionado &&
    totalKg > 0 &&
    precioUnitarioNumero > 0 &&
    invalidLotes.length === 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isFormValid) {
      toast({
        title: "Error",
        description: "Verifica que todos los campos sean válidos y haya peso disponible",
        variant: "destructive",
      })
      return
    }

    setRegistrando(true)
    try {
      if (!pedidoSeleccionado) {
        return
      }

      const lotesParaVenta: VentaLoteRegistro[] = lotesConSaldos
        .map((lote) => ({
          lote_id: lote.lote_id,
          categoria_id: lote.categoria_id ?? null,
          categoria: lote.categoria,
          kg_vendido: Number(detalleVenta[lote.key] || 0),
        }))
        .filter((item) => item.kg_vendido > 0)

      await ventasService.createPedidoVenta({
        pedido_id: pedidoSeleccionado.id,
        fecha_venta: new Date().toISOString().split("T")[0],
        observaciones,
        precio: precioUnitarioNumero,
        lotes: lotesParaVenta,
      })

      toast({
        title: "Éxito",
        description: `Venta registrada para el pedido ${pedidoSeleccionado.numero_pedido}`,
      })

      setDetalleVenta({})
      setObservaciones("")
    } catch (error) {
      console.error("Error al registrar venta:", error)
      toast({
        title: "Error",
        description: "No se pudo registrar la venta",
        variant: "destructive",
      })
    } finally {
      setRegistrando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Registro Venta</h2>
          <p className="text-muted-foreground">Registrar ventas por lotes asignados a pedidos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario de venta */}
        <Card>
          <CardHeader>
            <CardTitle>NUEVA VENTA</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>PEDIDO *</Label>
                <Select
                  value={pedidoSeleccionadoId ? String(pedidoSeleccionadoId) : ""}
                  onValueChange={(value) => setPedidoSeleccionadoId(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingPedidos ? "Cargando..." : "Seleccione un pedido"} />
                  </SelectTrigger>
                  <SelectContent>
                    {pedidos.map((pedido) => (
                      <SelectItem key={pedido.id} value={String(pedido.id)}>
                        {pedido.numero_pedido || `Pedido #${pedido.id}`} - {pedido.cliente_nombre || "Cliente"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>OBSERVACIONES</Label>
                <Textarea
                  placeholder="Observaciones..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="pt-4 border-t">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label>PRECIO UNITARIO (S/ kg) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={precioUnitario}
                      onChange={(e) => setPrecioUnitario(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>TOTAL KG</Label>
                    <Input type="number" value={totalKg.toFixed(2)} readOnly />
                  </div>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-medium">TOTAL</span>
                  <span className="text-2xl font-bold text-green-600">S/. {total.toFixed(2)}</span>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={!isFormValid || registrando}>
                {registrando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar Venta
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Kardex */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>LOTES ASIGNADOS</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPedidos ? (
                <div className="text-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                  Cargando lotes...
                </div>
              ) : !pedidoSeleccionado ? (
                <div className="text-center py-8 text-muted-foreground">Seleccione un pedido para ver los lotes</div>
              ) : lotesConSaldos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No hay lotes asignados a este pedido</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lote</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Asignado (kg)</TableHead>
                      <TableHead className="text-right">Vendido (kg)</TableHead>
                      <TableHead className="text-right">Disponible (kg)</TableHead>
                      <TableHead className="text-right">Kg a vender</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotesConSaldos.map((lote) => (
                      <TableRow key={lote.key}>
                        <TableCell className="font-medium">{lote.numero_lote}</TableCell>
                        <TableCell>{lote.categoria}</TableCell>
                        <TableCell className="text-right">{Number(lote.kg_asignado || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">{lote.vendido.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-bold text-green-600">{lote.disponible.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            max={lote.disponible}
                            value={detalleVenta[lote.key] ?? ""}
                            onChange={(e) =>
                              setDetalleVenta((prev) => ({
                                ...prev,
                                [lote.key]: e.target.value ? Number(e.target.value) : 0,
                              }))
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
