"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { LiquidationReceiptModal } from "./liquidation-receipt-modal"
import {
  AlertCircle,
  Calculator,
  Check,
  DollarSign,
  Loader2,
  Plus,
  Search,
  TrendingUp,
  Package,
  Receipt,
  Eye,
  Info,
} from "lucide-react"
import { useLiquidaciones } from "@/lib/hooks/use-liquidaciones"
import { lotesService } from "@/lib/services/lotes-service"
import type {
  DatosLiquidacion,
  DetalleLiquidacion,
  NuevaLiquidacion,
  Liquidacion,
  PesosLiquidacion,
} from "@/lib/types/liquidaciones"

const CATEGORIAS_CONFIG: Array<{
  codigo: string
  campo: keyof PesosLiquidacion
  nombre: string
}> = [
  { codigo: "exportable", campo: "peso_exportable", nombre: "Exportable" },
  { codigo: "industrial", campo: "peso_industrial", nombre: "Industrial" },
  { codigo: "nacional", campo: "peso_nacional", nombre: "Nacional" },
  { codigo: "jugo", campo: "peso_jugo", nombre: "Jugo" },
  { codigo: "descarte", campo: "peso_descarte", nombre: "Descarte" },
  { codigo: "primera", campo: "peso_primera", nombre: "Primera" },
  { codigo: "segunda", campo: "peso_segunda", nombre: "Segunda" },
  { codigo: "tercera", campo: "peso_tercera", nombre: "Tercera" },
  { codigo: "cuarta", campo: "peso_cuarta", nombre: "Cuarta" },
  { codigo: "quinta", campo: "peso_quinta", nombre: "Quinta" },
  { codigo: "dedos", campo: "peso_dedos", nombre: "Dedos" },
]

// Extiende el tipo de detalle para incluir las nuevas columnas
type DetalleLiquidacionConJabas = DetalleLiquidacion & {
  numero_jabas?: number
  peso_jabas?: number
  porcentaje_humedad?: number
  peso_descuento_humedad?: number
}

// Recalcula descuento por humedad y subtotal de una categoría
const recalcularCategoria = (cat: DetalleLiquidacionConJabas): DetalleLiquidacionConJabas => {
  const pesoAjustado = Number(cat.peso_ajustado || 0)
  const porcentaje = Number(cat.porcentaje_humedad || 0)
  const precio = Number(cat.precio_unitario || 0)

  const factor = isNaN(porcentaje) ? 0 : porcentaje / 100
  const pesoDescHum = pesoAjustado * factor
  const pesoNetoLiqui = pesoAjustado - pesoDescHum

  const subtotal = pesoNetoLiqui * precio

  return {
    ...cat,
    peso_descuento_humedad: pesoDescHum,
    subtotal,
  }
}

export function GestionLiquidaciones() {
  const { liquidaciones, loading, error, obtenerDatosLote, crearLiquidacion, fetchLiquidaciones } =
    useLiquidaciones(true)

  const [lotes, setLotes] = useState<any[]>([])
  const [loadingLotes, setLoadingLotes] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [showLoteSearch, setShowLoteSearch] = useState(false)

  const [showDialog, setShowDialog] = useState(false)
  const [selectedLoteId, setSelectedLoteId] = useState<number | null>(null)
  const [datosLote, setDatosLote] = useState<DatosLiquidacion | null>(null)
  const [loadingDatos, setLoadingDatos] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [selectedLiquidacion, setSelectedLiquidacion] = useState<Liquidacion | null>(null)

  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null)

  const [costoFlete, setCostoFlete] = useState(0)
  const [costoCosecha, setCostoCosecha] = useState(0)
  const [costoMaquila, setCostoMaquila] = useState(0)
  const [descuentoJabas, setDescuentoJabas] = useState(0)
  const [multiplicadorHumedad, setMultiplicadorHumedad] = useState(0.95)
  const [categorias, setCategorias] = useState<DetalleLiquidacionConJabas[]>([])
  const [adelantosSeleccionados, setAdelantosSeleccionados] = useState<number[]>([])

  useEffect(() => {
    fetchLotes()
  }, [])

  const fetchLotes = async () => {
    setLoadingLotes(true)
    try {
      const allLotes = await lotesService.getAll()
      console.log("[v0] Fetched lotes:", allLotes?.length || 0)
      setLotes(Array.isArray(allLotes) ? allLotes : [])
    } catch (err) {
      console.error("[v0] Error fetching lotes:", err)
      setLotes([])
    }
    setLoadingLotes(false)
  }

  const lotesDisponibles = lotes.filter((l) => l.estado !== "liquidado" && l.estado !== "cancelado" && l.numero_lote)

  const lotesFiltrados = lotesDisponibles.filter((l) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      l.numero_lote?.toLowerCase().includes(term) ||
      l.producto?.toLowerCase().includes(term) ||
      l.productor_nombre?.toLowerCase().includes(term)
    )
  })

  const handleBuscarLote = (term: string) => {
    setSearchTerm(term)
    setShowLoteSearch(true)
  }

  const handleSeleccionarLote = async (lote: any) => {
    setLoadingDatos(true)
    setSelectedLoteId(lote.id)
    setShowLoteSearch(false)
    setSearchTerm(lote.numero_lote)

    try {
      const datos = await obtenerDatosLote(lote.id)
      console.log("[v0] Datos para liquidación (desde kardex):", datos)

      if (datos) {
        setDatosLote(datos)

        const numJabasLote = Number(datos.lote.numero_jabas) || 0
        // Por ahora, mantenemos este criterio global para descuento por jabas
        setDescuentoJabas(numJabasLote * 2)

        const categoriasIniciales: DetalleLiquidacionConJabas[] = []

        console.log("[v0] Pesos desde kardex:", datos.pesos)
        console.log("[v0] Categorías de precio disponibles:", datos.categorias)

        // Iterar sobre TODAS las categorías configuradas
        for (const config of CATEGORIAS_CONFIG) {
          const pesoKardex = Number(datos.pesos[config.campo]) || 0

          if (pesoKardex > 0) {
            // Buscar precio de esta categoría
            const catPrecio = datos.categorias.find(
              (c) =>
                c.nombre_categoria?.toLowerCase().includes(config.codigo) ||
                c.codigo?.toLowerCase() === config.codigo ||
                (c as any).nombre?.toLowerCase().includes(config.codigo),
            )

            const precioUnitario = Number(catPrecio?.precio_unitario_kg) || 0
            const pesoAjustado = pesoKardex * multiplicadorHumedad

            // porcentaje de humedad por categoría (inicialmente 0)
            const categoriaBase: DetalleLiquidacionConJabas = {
              categoria_id: catPrecio?.id || 0,
              nombre_categoria: config.nombre,
              categoria: config.codigo, // Código para el backend
              peso_categoria_original: pesoKardex,
              peso_ajustado: pesoAjustado,
              precio_unitario: precioUnitario,
              subtotal: 0, // se recalcula
              numero_jabas: 0,
              peso_jabas: 0,
              porcentaje_humedad: 0,
              peso_descuento_humedad: 0,
            }

            const categoriaRecalculada = recalcularCategoria(categoriaBase)
            categoriasIniciales.push(categoriaRecalculada)

            console.log(
              `[v0] Categoría ${config.nombre}: ${pesoKardex}kg @ S/${precioUnitario}/kg, peso_ajustado=${pesoAjustado.toFixed(
                2,
              )}, subtotal=${categoriaRecalculada.subtotal.toFixed(2)}`,
            )
          }
        }

        console.log("[v0] Categorías inicializadas:", categoriasIniciales.length, "categorías con peso > 0")
        setCategorias(categoriasIniciales)

        if (datos.adelantos && datos.adelantos.length > 0) {
          setAdelantosSeleccionados(datos.adelantos.map((a) => a.id))
        }
      }
    } catch (err) {
      console.error("[v0] Error selecting lote:", err)
    }

    setLoadingDatos(false)
  }

  const pesoBrutoTotal = categorias.reduce((sum, cat) => sum + Number(cat.peso_categoria_original || 0), 0)
  const pesoNetoSinJabas = pesoBrutoTotal - descuentoJabas
  const pesoFinalAjustado = pesoNetoSinJabas * multiplicadorHumedad

  // Total bruto de la liquidación se basa en el subtotal ya ajustado por humedad
  const totalBrutoFruta = categorias.reduce((sum, cat) => sum + Number(cat.subtotal || 0), 0)

  const totalDescuentos = Number(costoFlete) + Number(costoCosecha) + Number(costoMaquila)

  const totalAdelantos =
    datosLote?.adelantos
      .filter((a) => adelantosSeleccionados.includes(a.id))
      .reduce((sum, a) => sum + Number(a.monto || 0), 0) || 0

  const totalAPagar = totalBrutoFruta - totalDescuentos - totalAdelantos

  const handleUpdateCategoria = (
    index: number,
    field: keyof DetalleLiquidacionConJabas,
    value: number,
  ) => {
    const newCategorias = [...categorias]

    const cat = {
      ...newCategorias[index],
      [field]: value,
    }

    // Recalcular subtotal y descuento humedad cuando cambia:
    // peso_ajustado, precio_unitario o porcentaje_humedad
    if (field === "peso_ajustado" || field === "precio_unitario" || field === "porcentaje_humedad") {
      newCategorias[index] = recalcularCategoria(cat)
    } else {
      newCategorias[index] = cat
    }

    setCategorias(newCategorias)
  }

  const toggleAdelanto = (adelantoId: number) => {
    setAdelantosSeleccionados((prev) =>
      prev.includes(adelantoId) ? prev.filter((id) => id !== adelantoId) : [...prev, adelantoId],
    )
  }

  const handleCrearLiquidacion = async () => {
    if (!datosLote || !selectedLoteId) return

    if (categorias.length === 0) {
      alert("Error: No hay categorías para liquidar. El lote debe tener pesos registrados en el kardex.")
      return
    }

    if (totalBrutoFruta === 0) {
      alert("Error: El total bruto de la liquidación es cero. Verifica los pesos, humedad y precios.")
      return
    }

    setSubmitting(true)
    try {
      const nuevaLiquidacion: NuevaLiquidacion = {
        lote_id: selectedLoteId,
        fecha_liquidacion: new Date().toISOString(),
        total_bruto_fruta: totalBrutoFruta,
        costo_flete: costoFlete,
        costo_cosecha: costoCosecha,
        costo_maquila: costoMaquila,
        descuento_jabas: descuentoJabas,
        total_adelantos: totalAdelantos,
        total_a_pagar: totalAPagar,
        estado_pago: "PENDIENTE",
        // detalle_categorias incluye numero_jabas, peso_jabas, porcentaje_humedad, peso_descuento_humedad, etc.
        detalle_categorias: categorias,
        adelantos_aplicados: adelantosSeleccionados,
      }

      console.log("[v0] Creando liquidación con", categorias.length, "categorías:", nuevaLiquidacion)
      await crearLiquidacion(nuevaLiquidacion)
      await fetchLotes()
      resetForm()
      setShowDialog(false)
    } catch (err: any) {
      console.error("[v0] Error creating liquidacion:", err)
      alert(`Error al crear liquidación: ${err.message || "Error desconocido"}`)
    }
    setSubmitting(false)
  }

  const resetForm = () => {
    setSelectedLoteId(null)
    setDatosLote(null)
    setSearchTerm("")
    setCostoFlete(0)
    setCostoCosecha(0)
    setCostoMaquila(0)
    setDescuentoJabas(0)
    setMultiplicadorHumedad(0.95)
    setCategorias([])
    setAdelantosSeleccionados([])
  }

  const openNewLiquidacion = () => {
    resetForm()
    setShowDialog(true)
  }

  const handleVerDetalle = (liquidacion: Liquidacion) => {
    setSelectedLiquidacion(liquidacion)
    setShowDetailDialog(true)
  }

  const handleVerComprobante = (liquidacionId: string) => {
    setSelectedReceiptId(liquidacionId)
    setShowReceiptModal(true)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value)
  }

  const totalLiquidaciones = liquidaciones?.length || 0
  const liquidacionesPendientes = liquidaciones?.filter((l) => l.estado_pago === "PENDIENTE").length || 0
  const totalPagado =
    liquidaciones?.filter((l) => l.estado_pago === "PAGADO").reduce((sum, l) => sum + Number(l.total_a_pagar), 0) || 0

  const liquidacionesMostradas = liquidaciones.filter(
    (liq) => liq.estado_pago !== "PAGADO" && liq.estado_pago !== "ANULADO",
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Liquidación de Lotes</h1>
          <p className="text-muted-foreground">
            Gestiona las liquidaciones de pago a productores según el rendimiento de sus lotes
          </p>
        </div>
        <Button onClick={openNewLiquidacion} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Liquidación
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Liquidaciones</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLiquidaciones}</div>
            <p className="text-xs text-muted-foreground">registradas en el sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes de Pago</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{liquidacionesPendientes}</div>
            <p className="text-xs text-muted-foreground">requieren atención</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lotes Disponibles</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lotesDisponibles.length}</div>
            <p className="text-xs text-muted-foreground">listos para liquidar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pagado</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPagado)}</div>
            <p className="text-xs text-muted-foreground">en liquidaciones completadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Liquidations List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Liquidaciones Creadas ({liquidacionesMostradas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {liquidacionesMostradas.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {liquidaciones.length === 0 ? "No hay liquidaciones" : "Todas las liquidaciones han sido pagadas"}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nro Liquidación</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Productor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Total Ventas</TableHead>
                  <TableHead className="text-right">Adelantos</TableHead>
                  <TableHead className="text-right">Neto a Pagar</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liquidacionesMostradas.map((liq) => (
                  <TableRow key={liq.id}>
                    <TableCell className="font-medium">{liq.numero_liquidacion}</TableCell>
                    <TableCell>{liq.numero_lote}</TableCell>
                    <TableCell>{liq.nombre_completo}</TableCell>
                    <TableCell>{new Date(liq.fecha_liquidacion).toLocaleDateString("es-PE")}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(liq.total_bruto_fruta))}</TableCell>
                    <TableCell className="text-right text-destructive">
                      -{formatCurrency(Number(liq.total_adelantos))}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(Number(liq.total_a_pagar))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          liq.estado_pago === "PAGADO"
                            ? "default"
                            : liq.estado_pago === "ANULADO"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {liq.estado_pago}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVerComprobante(liq.id.toString())}
                        className="gap-1"
                      >
                        <Receipt className="h-4 w-4" />
                        Comprobante
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleVerDetalle(liq)} className="gap-1">
                        <Eye className="h-4 w-4" />
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <LiquidationReceiptModal
        open={showReceiptModal}
        liquidacionId={selectedReceiptId}
        onOpenChange={setShowReceiptModal}
      />

      {/* New Liquidacion Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Nueva Liquidación de Lote
            </DialogTitle>
            <DialogDescription>
              Busca un lote para calcular y registrar la liquidación al productor (datos desde Kardex)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Lote Search */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">1. Buscar Lote</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número de lote, producto o productor..."
                  value={searchTerm}
                  onChange={(e) => handleBuscarLote(e.target.value)}
                  onFocus={() => setShowLoteSearch(true)}
                  className="pl-10"
                />
              </div>

              {showLoteSearch && (
                <Card className="mt-2">
                  <CardContent className="p-2 max-h-60 overflow-y-auto">
                    {loadingLotes ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : lotesFiltrados.length === 0 ? (
                      <p className="text-center py-4 text-muted-foreground">
                        {lotesDisponibles.length === 0
                          ? "No hay lotes disponibles para liquidar"
                          : "No se encontraron lotes con ese criterio"}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {lotesFiltrados.slice(0, 10).map((lote) => (
                          <button
                            key={lote.id}
                            onClick={() => handleSeleccionarLote(lote)}
                            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent text-left transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Package className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{lote.numero_lote}</p>
                                <p className="text-sm text-muted-foreground">
                                  {lote.producto} - {lote.productor_nombre || "Sin productor"}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline">{lote.estado}</Badge>
                              <p className="text-sm text-muted-foreground mt-1">
                                {Number(lote.peso_inicial || 0).toFixed(2)} kg
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {loadingDatos && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Cargando datos del lote desde kardex...</span>
              </div>
            )}

            {datosLote && !loadingDatos && (
              <>
                {/* Lote Info */}
                <Card className="bg-muted/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Lote Seleccionado
                      <Badge variant="outline" className="ml-2 text-xs">
                        <Info className="h-3 w-3 mr-1" />
                        Datos desde Kardex
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Número de Lote</p>
                        <p className="font-medium">{datosLote.lote.numero_lote}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Producto</p>
                        <p className="font-medium">{datosLote.lote.producto}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Productor</p>
                        <p className="font-medium">{datosLote.lote.nombre_completo}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Fecha Ingreso</p>
                        <p className="font-medium">
                          {new Date(datosLote.lote.fecha_ingreso).toLocaleDateString("es-PE")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Weight Adjustments */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">2. Ajustes de Peso</Label>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Peso Total (Kardex)</Label>
                          <p className="text-xl font-bold">{pesoBrutoTotal.toFixed(2)} kg</p>
                        </div>
                        <div>
                          <Label>Descuento Jabas (kg)</Label>
                          <Input
                            type="number"
                            value={descuentoJabas}
                            onChange={(e) => setDescuentoJabas(Number(e.target.value))}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Multiplicador Humedad Global</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={multiplicadorHumedad}
                            onChange={(e) => setMultiplicadorHumedad(Number(e.target.value))}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Peso Final Ajustado (global)</Label>
                          <p className="text-xl font-bold text-primary">{pesoFinalAjustado.toFixed(2)} kg</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Categories Detail */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    3. Detalle por Categoría ({categorias.length} categorías)
                  </Label>
                  <Card>
                    <CardContent className="pt-4">
                      {categorias.length === 0 ? (
                        <div className="text-center py-8">
                          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                          <p className="font-medium text-lg mb-2">No hay stock disponible en el kardex</p>
                          <p className="text-muted-foreground">
                            Este lote no tiene saldo de stock en el kardex. Debe registrar los pesos por categoría
                            primero.
                          </p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Categoría</TableHead>
                              <TableHead className="text-right">Peso Original (kg)</TableHead>
                              <TableHead className="text-right">Peso Ajustado (kg)</TableHead>
                              <TableHead className="text-right">N° Jabas</TableHead>
                              <TableHead className="text-right">Peso Jabas (kg)</TableHead>
                              <TableHead className="text-right">Hum. (%)</TableHead>
                              <TableHead className="text-right">Desc. Hum. (kg)</TableHead>
                              <TableHead className="text-right">Peso Neto Liqui (kg)</TableHead>
                              <TableHead className="text-right">Precio/kg (S/)</TableHead>
                              <TableHead className="text-right">Subtotal (S/)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {categorias.map((cat, index) => {
                              const pesoAjustado = Number(cat.peso_ajustado || 0)
                              const porcHum = Number(cat.porcentaje_humedad || 0)
                              const descHum =
                                typeof cat.peso_descuento_humedad === "number"
                                  ? cat.peso_descuento_humedad
                                  : pesoAjustado * (isNaN(porcHum) ? 0 : porcHum / 100)
                              const pesoLiqui = pesoAjustado - descHum

                              return (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">{cat.nombre_categoria}</TableCell>

                                  <TableCell className="text-right">
                                    {Number(cat.peso_categoria_original).toFixed(2)}
                                  </TableCell>

                                  <TableCell className="text-right">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={cat.peso_ajustado}
                                      onChange={(e) =>
                                        handleUpdateCategoria(
                                          index,
                                          "peso_ajustado",
                                          Number(e.target.value),
                                        )
                                      }
                                      className="w-24 text-right"
                                    />
                                  </TableCell>

                                  <TableCell className="text-right">
                                    <Input
                                      type="number"
                                      step="1"
                                      value={cat.numero_jabas ?? 0}
                                      onChange={(e) =>
                                        handleUpdateCategoria(
                                          index,
                                          "numero_jabas",
                                          Number(e.target.value),
                                        )
                                      }
                                      className="w-24 text-right"
                                    />
                                  </TableCell>

                                  <TableCell className="text-right">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={cat.peso_jabas ?? 0}
                                      onChange={(e) =>
                                        handleUpdateCategoria(
                                          index,
                                          "peso_jabas",
                                          Number(e.target.value),
                                        )
                                      }
                                      className="w-24 text-right"
                                    />
                                  </TableCell>

                                  <TableCell className="text-right">
                                    <Input
                                      type="number"
                                      step="0.1"
                                      value={cat.porcentaje_humedad ?? 0}
                                      onChange={(e) =>
                                        handleUpdateCategoria(
                                          index,
                                          "porcentaje_humedad",
                                          Number(e.target.value),
                                        )
                                      }
                                      className="w-20 text-right"
                                    />
                                  </TableCell>

                                  <TableCell className="text-right">
                                    {Number(descHum).toFixed(2)}
                                  </TableCell>

                                  <TableCell className="text-right">
                                    {Number(pesoLiqui).toFixed(2)}
                                  </TableCell>

                                  <TableCell className="text-right">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={cat.precio_unitario}
                                      onChange={(e) =>
                                        handleUpdateCategoria(
                                          index,
                                          "precio_unitario",
                                          Number(e.target.value),
                                        )
                                      }
                                      className="w-24 text-right"
                                    />
                                  </TableCell>

                                  <TableCell className="text-right font-bold">
                                    {formatCurrency(Number(cat.subtotal))}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                            <TableRow className="bg-muted/50">
                              <TableCell colSpan={9} className="text-right font-bold">
                                Total Bruto Ventas:
                              </TableCell>
                              <TableCell className="text-right font-bold text-lg">
                                {formatCurrency(totalBrutoFruta)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Costs */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">4. Costos y Descuentos</Label>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Costo Flete (S/)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={costoFlete}
                            onChange={(e) => setCostoFlete(Number(e.target.value))}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Costo Cosecha (S/)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={costoCosecha}
                            onChange={(e) => setCostoCosecha(Number(e.target.value))}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Costo Maquila (S/)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={costoMaquila}
                            onChange={(e) => setCostoMaquila(Number(e.target.value))}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Advances */}
                {datosLote.adelantos && datosLote.adelantos.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">5. Adelantos a Descontar</Label>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          {datosLote.adelantos.map((adelanto) => (
                            <div
                              key={adelanto.id}
                              className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={adelantosSeleccionados.includes(adelanto.id)}
                                  onCheckedChange={() => toggleAdelanto(adelanto.id)}
                                />
                                <div>
                                  <p className="font-medium">
                                    {new Date(adelanto.fecha_adelanto).toLocaleDateString("es-PE")}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {adelanto.motivo || "Sin motivo"}
                                  </p>
                                </div>
                              </div>
                              <p className="font-bold text-destructive">
                                {formatCurrency(Number(adelanto.monto))}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Summary */}
                <Card className="border-2 border-primary">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Resumen de Liquidación
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Bruto Ventas ({categorias.length} categorías):</span>
                        <span className="font-medium">{formatCurrency(totalBrutoFruta)}</span>
                      </div>
                      <div className="flex justify-between text-destructive">
                        <span>(-) Costos y Descuentos:</span>
                        <span>{formatCurrency(totalDescuentos)}</span>
                      </div>
                      <div className="flex justify-between text-destructive">
                        <span>(-) Adelantos:</span>
                        <span>{formatCurrency(totalAdelantos)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>TOTAL NETO A PAGAR:</span>
                        <span className={totalAPagar >= 0 ? "text-green-600" : "text-destructive"}>
                          {formatCurrency(totalAPagar)}
                        </span>
                      </div>
                    </div>

                    {datosLote.lote.banco && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Información de Pago:</p>
                        <p className="font-medium">
                          {datosLote.lote.banco} - {datosLote.lote.cuenta_bancaria}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {totalAPagar < 0 && (
                  <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive rounded-lg">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <p className="text-destructive">
                      El total a pagar es negativo. Los adelantos superan el valor de la liquidación.
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCrearLiquidacion} disabled={submitting || categorias.length === 0}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Crear Liquidación
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Liquidación</DialogTitle>
            <DialogDescription>Información completa de la liquidación seleccionada</DialogDescription>
          </DialogHeader>

          {selectedLiquidacion && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Información General</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Lote</p>
                      <p className="font-medium">{selectedLiquidacion.numero_lote}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Productor</p>
                      <p className="font-medium">{selectedLiquidacion.nombre_completo}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fecha</p>
                      <p className="font-medium">
                        {new Date(selectedLiquidacion.fecha_liquidacion).toLocaleDateString("es-PE")}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Estado</p>
                      <Badge
                        variant={
                          selectedLiquidacion.estado_pago === "PAGADO"
                            ? "default"
                            : selectedLiquidacion.estado_pago === "ANULADO"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {selectedLiquidacion.estado_pago}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {selectedLiquidacion.detalle_categorias &&
                selectedLiquidacion.detalle_categorias.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Detalle por Categorías</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Categoría</TableHead>
                            <TableHead className="text-right">Peso Ajustado (kg)</TableHead>
                            <TableHead className="text-right">% Humedad</TableHead>
                            <TableHead className="text-right">Desc. Hum. (kg)</TableHead>
                            <TableHead className="text-right">N° Jabas</TableHead>
                            <TableHead className="text-right">Peso Jabas (kg)</TableHead>
                            <TableHead className="text-right">Precio/kg</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedLiquidacion.detalle_categorias.map((det: any, idx: number) => {
                            const pesoAjust = Number(det.peso_categoria_original ?? det.peso_ajustado ?? 0)
                            const porcHum = Number(det.porcentaje_humedad ?? 0)
                            const descHum = Number(det.peso_descuento_humedad ?? 0)
                            const pesoLiqui = pesoAjust - descHum

                            return (
                              <TableRow key={idx}>
                                <TableCell>{det.nombre_categoria || "Sin categoría"}</TableCell>
                                <TableCell className="text-right">
                                  {Number(det.peso_ajustado).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {porcHum.toFixed(2)}%
                                </TableCell>
                                <TableCell className="text-right">
                                  {descHum.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {det.numero_jabas ?? 0}
                                </TableCell>
                                <TableCell className="text-right">
                                  {Number(det.peso_jabas ?? 0).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(Number(det.precio_unitario))}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(Number(det.subtotal))}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Resumen Financiero</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Bruto Fruta:</span>
                      <span>{formatCurrency(Number(selectedLiquidacion.total_bruto_fruta))}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>(-) Costo Flete:</span>
                      <span>{formatCurrency(Number(selectedLiquidacion.costo_flete))}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>(-) Costo Cosecha:</span>
                      <span>{formatCurrency(Number(selectedLiquidacion.costo_cosecha))}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>(-) Costo Maquila:</span>
                      <span>{formatCurrency(Number(selectedLiquidacion.costo_maquila))}</span>
                    </div>
                    <div className="flex justify-between text-destructive">
                      <span>(-) Adelantos:</span>
                      <span>{formatCurrency(Number(selectedLiquidacion.total_adelantos))}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total a Pagar:</span>
                      <span className="text-green-600">
                        {formatCurrency(Number(selectedLiquidacion.total_a_pagar))}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
