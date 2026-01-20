"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertCircle, Package, CheckCircle2, Plus, Minus, Search, Boxes } from "lucide-react"
import { pedidosService } from "@/lib/services/pedidos-service"
import type { Pedido } from "@/lib/types"

interface LoteDisponible {
  lote_id: number | string
  numero_lote: string
  producto: string
  categoria_id: number | string
  categoria_nombre: string
  categoria_codigo: string
  saldo_disponible: number | string | null
  peso_original?: number | string | null

  // snake_case (backend)
  productor_nombre?: string | null
  productor_dni?: string | null
  fecha_ingreso?: string | null

  // camelCase (por si tu service/cliente lo transforma)
  productorNombre?: string | null
  productorDni?: string | null
  fechaIngreso?: string | null

  estado_proceso?: string | null
}

interface LoteAsignado {
  id: number
  lote_id: number
  numero_lote: string
  producto: string
  categoria: string
  peso_asignado?: number | string | null
  kg_asignado?: number | string | null

  // ✅ extra data
  productor_nombre?: string | null
  productor_dni?: string | null
  fecha_ingreso?: string | null
  estado_proceso?: string | null
  peso_original?: number | string | null
  saldo_disponible?: number | string | null
}


interface LotesPorCategoria {
  [categoria: string]: LoteDisponible[]
}

/** ✅ Conversión robusta anti-NaN y anti "1,000.00" */
const toNumberSafe = (v: unknown, fallback = 0) => {
  if (v === null || v === undefined) return fallback
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback

  if (typeof v === "string") {
    let s = v.trim()
    if (!s) return fallback
    if (s.toLowerCase() === "nan") return fallback

    const hasDot = s.includes(".")
    const hasComma = s.includes(",")

    if (hasDot && hasComma) {
      if (s.lastIndexOf(".") > s.lastIndexOf(",")) s = s.replace(/,/g, "")
      else s = s.replace(/\./g, "").replace(/,/g, ".")
    } else if (hasComma && !hasDot) {
      s = s.replace(/,/g, ".")
    }

    s = s.replace(/[^0-9+\-eE.]/g, "")
    const n = Number(s)
    return Number.isFinite(n) ? n : fallback
  }

  return fallback
}

const formatDate = (v?: unknown) => {
  if (!v || typeof v !== "string") return "N/A"
  const s = v.trim()
  if (!s) return "N/A"
  return s.includes("T") ? s.split("T")[0] || "N/A" : s
}

const normStr = (v: unknown) => String(v ?? "").trim().toLowerCase()

const getKgAsignado = (lote: LoteAsignado) => toNumberSafe(lote.peso_asignado ?? lote.kg_asignado, 0)

const normalizeLoteDisponible = (l: any): LoteDisponible => ({
  ...l,
  // asegurar snake_case siempre presente
  productor_nombre: l.productor_nombre ?? l.productorNombre ?? null,
  productor_dni: l.productor_dni ?? l.productorDni ?? null,
  fecha_ingreso: l.fecha_ingreso ?? l.fechaIngreso ?? null,
})

export function AsignacionLotesCompleta() {
  const [pedidosActivos, setPedidosActivos] = useState<Pedido[]>([])
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null)
  const [lotesDisponibles, setLotesDisponibles] = useState<LoteDisponible[]>([])
  const [lotesAsignados, setLotesAsignados] = useState<LoteAsignado[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingLotes, setLoadingLotes] = useState(false)
  const [searchPedido, setSearchPedido] = useState("")
  const [kgAsignar, setKgAsignar] = useState<Record<string, string>>({})
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const loadPedidos = async () => {
      try {
        setLoading(true)
        const todos = await pedidosService.getAll()
        const activos = todos.filter((p: Pedido) => p.estado === "pendiente" || p.estado === "proceso")
        setPedidosActivos(activos)
      } catch (error) {
        console.error("[v0] Error cargando pedidos:", error)
        alert("Error al cargar pedidos")
      } finally {
        setLoading(false)
      }
    }
    loadPedidos()
  }, [])

  const handleSeleccionarPedido = async (pedido: Pedido) => {
    try {
      setLoadingLotes(true)
      setPedidoSeleccionado(pedido)
      setKgAsignar({})

      // ✅ Traemos y normalizamos para asegurar productor/fecha
      const disponiblesRaw = await pedidosService.getLotesDisponibles()
      const disponibles = (disponiblesRaw ?? []).map(normalizeLoteDisponible)

      // ✅ Filtrar por CATEGORÍA + PRODUCTO (evita espárragos en jengibre)
      const lotesCompatibles = disponibles.filter(
        (l) =>
          normStr(l.categoria_nombre) === normStr(pedido.categoria) &&
          normStr(l.producto) === normStr(pedido.producto),
      )

      setLotesDisponibles(lotesCompatibles)

      const asignados = await pedidosService.getLotesPedido(pedido.id)
      setLotesAsignados(asignados)

      setModalOpen(true)
    } catch (error) {
      console.error("[v0] Error cargando lotes:", error)
      alert("Error al cargar lotes disponibles")
    } finally {
      setLoadingLotes(false)
    }
  }

  const lotesAgrupados: LotesPorCategoria = lotesDisponibles.reduce((acc, lote) => {
    const cat = lote.categoria_nombre || "Sin categoría"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(lote)
    return acc
  }, {} as LotesPorCategoria)

  const handleAsignarLote = async (lote: LoteDisponible) => {
    if (!pedidoSeleccionado) return

    const key = `${lote.lote_id}-${lote.categoria_nombre}`
    const valor = kgAsignar[key] ?? ""
    const cantidad = toNumberSafe(valor, Number.NaN)

    if (!valor || !Number.isFinite(cantidad) || cantidad <= 0) {
      alert("Ingresa una cantidad válida de kg")
      return
    }

    const disponible = toNumberSafe(lote.saldo_disponible, 0)
    if (cantidad > disponible) {
      alert(`No puedes asignar más de ${disponible.toFixed(2)} kg disponibles`)
      return
    }

    try {
      await pedidosService.asignarLote({
        pedido_id: pedidoSeleccionado.id,
        lote_id: Number(lote.lote_id),
        categoria: lote.categoria_nombre,
        kg_asignado: cantidad,
      })

      setKgAsignar((prev) => {
        const copy = { ...prev }
        delete copy[key]
        return copy
      })

      await handleSeleccionarPedido(pedidoSeleccionado)
    } catch (error: any) {
      console.error("[v0] Error asignando lote:", error)
      alert(error?.response?.data?.message || "Error al asignar lote")
    }
  }

  const handleQuitarLote = async (lote: LoteAsignado) => {
    if (!pedidoSeleccionado) return
    if (!confirm(`¿Quitar ${lote.numero_lote} de este pedido?`)) return

    try {
      await pedidosService.quitarLote({
        pedido_id: pedidoSeleccionado.id,
        lote_id: lote.lote_id,
        id: lote.id,
      })

      await handleSeleccionarPedido(pedidoSeleccionado)
    } catch (error) {
      console.error("[v0] Error removiendo lote:", error)
      alert("Error al remover lote")
    }
  }

  const totalAsignado = lotesAsignados.reduce((sum, l) => sum + getKgAsignado(l), 0)
  const kgPedido = toNumberSafe(pedidoSeleccionado?.kg_neto, 0)
  const kgPendiente = Math.max(0, kgPedido - totalAsignado)
  const porcentajeAsignacion = kgPedido > 0 ? (totalAsignado / kgPedido) * 100 : 0

  const pedidosFiltrados = pedidosActivos.filter(
    (p) =>
      p.numero_pedido.toLowerCase().includes(searchPedido.toLowerCase()) ||
      p.cliente_nombre?.toLowerCase().includes(searchPedido.toLowerCase()),
  )

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Asignación de Lotes</h1>
        <p className="text-muted-foreground">Asigna lotes disponibles a pedidos pendientes o en proceso</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pedidosActivos.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Pendiente de asignación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lotes Disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lotesDisponibles.length}</div>
            <p className="text-xs text-muted-foreground mt-1">En categoría y producto del pedido</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Asignados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lotesAsignados.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{totalAsignado.toFixed(2)} kg</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendiente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{kgPendiente.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">kg por asignar</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <CardTitle>Pedidos Activos</CardTitle>
              <CardDescription>Selecciona un pedido para ver sus lotes compatibles</CardDescription>
            </div>
            <div className="w-64 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número o cliente..."
                value={searchPedido}
                onChange={(e) => setSearchPedido(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando pedidos...</div>
          ) : pedidosFiltrados.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No hay pedidos activos para asignar</AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pedidosFiltrados.map((pedido) => (
                <Card
                  key={pedido.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
                  onClick={() => handleSeleccionarPedido(pedido)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-base">{pedido.numero_pedido}</CardTitle>
                        <CardDescription className="text-sm">{pedido.cliente_nombre}</CardDescription>
                      </div>
                      <Badge variant={pedido.estado === "pendiente" ? "destructive" : "secondary"}>{pedido.estado}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Producto:</span>
                        <span className="font-medium">{pedido.producto}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Categoría:</span>
                        <Badge variant="outline">{pedido.categoria}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Kg Neto:</span>
                        <span className="font-bold text-primary">{toNumberSafe(pedido.kg_neto, 0).toFixed(2)} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Precio/kg:</span>
                        <span>${toNumberSafe(pedido.precio, 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="font-bold">${toNumberSafe(pedido.total, 0).toFixed(2)}</span>
                      </div>
                    </div>
                    <Button className="w-full" onClick={() => handleSeleccionarPedido(pedido)}>
                      <Package className="h-4 w-4 mr-2" />
                      Ver y Asignar Lotes
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Asignar Lotes - {pedidoSeleccionado?.numero_pedido}</DialogTitle>
            <DialogDescription className="space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
  <div>
    <span className="text-muted-foreground">Cliente:</span>
    <p className="font-semibold">{pedidoSeleccionado?.cliente_nombre}</p>
  </div>

  <div>
    <span className="text-muted-foreground">Producto:</span>
    <p className="font-semibold">{pedidoSeleccionado?.producto || "N/A"}</p>
  </div>

  <div>
    <span className="text-muted-foreground">Categoría:</span>
    <p className="font-semibold">{pedidoSeleccionado?.categoria}</p>
  </div>

  <div>
    <span className="text-muted-foreground">Kg Requerido:</span>
    <p className="font-semibold">{kgPedido.toFixed(2)} kg</p>
  </div>

  <div>
    <span className="text-muted-foreground">Estado:</span>
    <Badge>{pedidoSeleccionado?.estado}</Badge>
  </div>
</div>


              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Asignado: {totalAsignado.toFixed(2)} kg</span>
                  <span className="text-destructive">Pendiente: {kgPendiente.toFixed(2)} kg</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all"
                    style={{ width: `${Math.min(porcentajeAsignacion, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-right">{porcentajeAsignacion.toFixed(0)}% completado</p>
              </div>
            </DialogDescription>
          </DialogHeader>

          {loadingLotes ? (
            <div className="py-8 text-center text-muted-foreground">Cargando lotes disponibles...</div>
          ) : (
            <Tabs defaultValue="disponibles" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="disponibles">Lotes Disponibles ({lotesDisponibles.length})</TabsTrigger>
                <TabsTrigger value="asignados">Asignados ({lotesAsignados.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="disponibles" className="space-y-4">
                {lotesDisponibles.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No hay lotes disponibles para {pedidoSeleccionado?.producto} en la categoría {pedidoSeleccionado?.categoria}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <ScrollArea className="h-[450px] border rounded-lg p-4">
                    <div className="space-y-4">
                      {Object.entries(lotesAgrupados).map(([categoria, lotes]) => (
                        <div key={categoria} className="space-y-3">
                          <div className="sticky top-0 bg-background/95 backdrop-blur pb-2 border-b">
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                              <Boxes className="h-4 w-4" />
                              {categoria}
                              <Badge variant="secondary">{lotes.length} lotes</Badge>
                            </h3>
                          </div>

                          <div className="space-y-3 pl-2">
                            {lotes.map((lote) => {
                              const key = `${lote.lote_id}-${lote.categoria_nombre}`
                              const disponible = toNumberSafe(lote.saldo_disponible, 0)
                              const pesoOriginal = toNumberSafe(lote.peso_original, 0)

                              const productor =
                                lote.productor_nombre ??
                                lote.productorNombre ??
                                null

                              const ingreso =
                                lote.fecha_ingreso ??
                                lote.fechaIngreso ??
                                null

                              return (
                                <Card key={key} className="p-4">
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">Lote:</span>
                                        <p className="font-mono font-semibold">{lote.numero_lote}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Producto:</span>
                                        <p className="font-semibold">{lote.producto}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Productor:</span>
                                        <p className="font-semibold">{productor || "N/A"}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Estado:</span>
                                        <Badge variant="outline">{lote.estado_proceso || "Procesado"}</Badge>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 text-sm bg-secondary/30 p-2 rounded">
                                      <div>
                                        <span className="text-xs text-muted-foreground">Peso Original</span>
                                        <p className="font-bold">{pesoOriginal.toFixed(2)} kg</p>
                                      </div>
                                      <div>
                                        <span className="text-xs text-muted-foreground">Disponible</span>
                                        <p className="font-bold text-green-600">{disponible.toFixed(2)} kg</p>
                                      </div>
                                      <div>
                                        <span className="text-xs text-muted-foreground">Ingreso</span>
                                        <p className="font-mono text-xs">{formatDate(ingreso)}</p>
                                      </div>
                                    </div>

                                    <div className="flex gap-2 items-end">
                                      <div className="flex-1">
                                        <label className="text-xs text-muted-foreground">Kg a asignar</label>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          min={0}
                                          max={disponible}
                                          placeholder="0.00"
                                          value={kgAsignar[key] ?? ""}
                                          onChange={(e) =>
                                            setKgAsignar((prev) => ({
                                              ...prev,
                                              [key]: e.target.value,
                                            }))
                                          }
                                        />
                                      </div>
                                      <Button onClick={() => handleAsignarLote(lote)} size="sm" className="gap-1">
                                        <Plus className="h-4 w-4" />
                                        Asignar
                                      </Button>
                                    </div>
                                  </div>
                                </Card>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="asignados" className="space-y-4">
                {lotesAsignados.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Aún no hay lotes asignados a este pedido</AlertDescription>
                  </Alert>
                ) : (
                  <ScrollArea className="h-[450px] border rounded-lg p-4">
                    <div className="space-y-3">
                      {lotesAsignados.map((lote) => {
  const asignado = getKgAsignado(lote)
  const pesoOriginal = toNumberSafe(lote.peso_original, 0)
  const saldo = toNumberSafe(lote.saldo_disponible, 0)

  return (
    <Card key={lote.id} className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="font-semibold text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            {lote.numero_lote}
          </div>

          <div className="text-sm text-muted-foreground">
            {lote.producto} • <Badge variant="outline">{lote.categoria}</Badge>
          </div>

          <div className="text-sm font-bold text-primary">
            {asignado.toFixed(2)} kg asignados
          </div>

          {/* ✅ extra info como en disponibles */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs bg-secondary/30 p-2 rounded">
            <div>
              <span className="text-muted-foreground">Productor</span>
              <div className="font-medium">{lote.productor_nombre || "N/A"}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Ingreso</span>
              <div className="font-mono">{formatDate(lote.fecha_ingreso)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Estado</span>
              <div className="font-medium">{lote.estado_proceso || "N/A"}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Peso Original</span>
              <div className="font-bold">{pesoOriginal.toFixed(2)} kg</div>
            </div>
            <div>
              <span className="text-muted-foreground">Saldo actual</span>
              <div className="font-bold">{saldo.toFixed(2)} kg</div>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleQuitarLote(lote)}
          className="text-destructive hover:bg-destructive/10"
        >
          <Minus className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
})}

                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
