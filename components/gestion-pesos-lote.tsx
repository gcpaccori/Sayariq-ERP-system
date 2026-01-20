"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Scale,
  Plus,
  Save,
  Trash2,
  Edit,
  Package,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  RefreshCw,
} from "lucide-react"
import { API_CONFIG, API_ENDPOINTS } from "@/lib/config/api"
import type { Lote } from "@/lib/types"
import type { PesoLote } from "@/lib/types/pesos-lote"

/**
 * Tipos adicionales para el esquema dinámico
 * (cabecera + detalles de categorías)
 */
type CategoriaPeso = {
  id: number
  codigo: string
  nombre: string
  precio_kg?: number
}

type PesoDetalle = {
  id?: number
  peso_lote_id?: number
  categoria_id: number
  codigo?: string
  nombre?: string
  peso: number
  numero_jabas?: number
  peso_jabas?: number
}

type PesoLoteConDetalles = PesoLote & {
  fecha_pesado?: string
  peso_bruto?: number | string
  observaciones?: string | null
  detalles?: PesoDetalle[]
}

type DetalleForm = {
  peso: number
  numero_jabas: number
  peso_jabas: number
}

interface FormData {
  lote_id: number
  fecha_procesamiento: string
  peso_inicial_almacen: number
  observaciones: string
  // mapa categoria_id -> {peso, numero_jabas, peso_jabas}
  detalles: Record<number, DetalleForm>
}

const createInitialFormData = (): FormData => ({
  lote_id: 0,
  fecha_procesamiento: new Date().toISOString().split("T")[0],
  peso_inicial_almacen: 0,
  observaciones: "",
  detalles: {},
})

const emptyDetalle: DetalleForm = { peso: 0, numero_jabas: 0, peso_jabas: 0 }

export function GestionPesosLote() {
  const [lotes, setLotes] = useState<Lote[]>([])
  const [registros, setRegistros] = useState<PesoLoteConDetalles[]>([])
  const [categorias, setCategorias] = useState<CategoriaPeso[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [selectedLoteData, setSelectedLoteData] = useState<Lote | null>(null)
  const [formData, setFormData] = useState<FormData>(createInitialFormData())
  const [activeTab, setActiveTab] = useState("nuevo")

  // Lotes disponibles (no completado/entregado)
  const lotesDisponibles = useMemo(() => {
    return lotes.filter((lote) => {
      const estado = lote.estado?.toLowerCase()
      return estado !== "completado" && estado !== "entregado"
    })
  }, [lotes])

  // Map lote_id -> registro de pesos
  const lotesConRegistro = useMemo(() => {
    const map = new Map<string, PesoLoteConDetalles>()
    registros.forEach((r) => {
      map.set(String(r.lote_id), r)
    })
    return map
  }, [registros])

  // 👉 Lote liquidado (bloquea edición y guardado)
  const loteLiquidado = useMemo(() => {
    if (!selectedLoteData) return false
    return selectedLoteData.estado?.toLowerCase() === "liquidado"
  }, [selectedLoteData])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [lotesRes, registrosRes, categoriasRes] = await Promise.all([
        fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.LOTES}`),
        fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.PESOS_LOTE}`),
        // endpoint de categorías (ajusta si usas otro)
        fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.PESOS_LOTE}/categorias`),
      ])

      if (lotesRes.ok) {
        const lotesData = await lotesRes.json()
        const lotesArray = Array.isArray(lotesData) ? lotesData : lotesData.data || []
        console.log("[v0] Lotes cargados:", lotesArray.length)
        setLotes(lotesArray)
      }

      if (registrosRes.ok) {
        const registrosData = await registrosRes.json()
        const registrosArray: PesoLoteConDetalles[] = Array.isArray(registrosData)
          ? registrosData
          : registrosData.data || []
        console.log("[v0] Registros de procesamiento cargados:", registrosArray.length, registrosArray)
        setRegistros(registrosArray)
      }

      if (categoriasRes.ok) {
        const catData = await categoriasRes.json()
        const catArray = Array.isArray(catData.data) ? catData.data : Array.isArray(catData) ? catData : []
        const parsed = catArray.map((c: any) => ({
          id: Number(c.id),
          codigo: String(c.codigo),
          nombre: String(c.nombre),
          precio_kg: c.precio_kg != null ? Number(c.precio_kg) : undefined,
        }))
        console.log("[v0] Categorías cargadas:", parsed.length, parsed)
        setCategorias(parsed)
      }
    } catch (err) {
      console.error("[v0] Error fetching data:", err)
      setError("Error al cargar los datos")
    } finally {
      setLoading(false)
    }
  }

  const getLotePeso = (lote: Lote): number => {
    const peso =
      lote.peso_neto ?? lote.peso_inicial ?? lote.peso_bruto ?? (lote as any).peso ?? (lote as any).peso_total ?? 0
    const result = typeof peso === "string" ? Number.parseFloat(peso) : Number(peso)
    return isNaN(result) ? 0 : result
  }

  const handleLoteSelect = (loteId: string) => {
    console.log("[v0] handleLoteSelect:", loteId)

    const lote = lotes.find((l) => String(l.id) === loteId)

    if (!lote) {
      console.log("[v0] Lote no encontrado")
      setSelectedLoteData(null)
      setFormData(createInitialFormData())
      return
    }

    console.log("[v0] Lote encontrado:", lote)
    setSelectedLoteData(lote)

    const pesoDelAlmacen = getLotePeso(lote)
    console.log("[v0] Peso del almacén:", pesoDelAlmacen)

    // Buscar si ya hay registro de ese lote
    const registroExistente = lotesConRegistro.get(String(lote.id))

    if (registroExistente) {
      console.log("[v0] Cargando registro existente para edición:", registroExistente)
      setEditingId(Number(registroExistente.id))

      const parseNum = (val: any) => {
        const n = typeof val === "string" ? Number.parseFloat(val) : Number(val)
        return isNaN(n) ? 0 : n
      }

      const detallesMap: Record<number, DetalleForm> = {}
      if (Array.isArray(registroExistente.detalles)) {
        registroExistente.detalles.forEach((d) => {
          if (d.categoria_id) {
            detallesMap[d.categoria_id] = {
              peso: parseNum(d.peso),
              numero_jabas: d.numero_jabas != null ? parseNum(d.numero_jabas) : 0,
              peso_jabas: d.peso_jabas != null ? parseNum(d.peso_jabas) : 0,
            }
          }
        })
      }

      setFormData({
        lote_id: Number(lote.id),
        fecha_procesamiento:
          (registroExistente as any).fecha_pesado?.split("T")[0] ||
          (registroExistente as any).fecha_procesamiento?.split("T")[0] ||
          new Date().toISOString().split("T")[0],
        peso_inicial_almacen: parseNum((registroExistente as any).peso_bruto) || pesoDelAlmacen,
        observaciones: registroExistente.observaciones || "",
        detalles: detallesMap,
      })
      setSuccess("Lote con registro existente. Se cargaron los datos para edición.")
    } else {
      // Nuevo registro
      console.log("[v0] Nuevo registro - peso inicial:", pesoDelAlmacen)
      setEditingId(null)
      setFormData({
        ...createInitialFormData(),
        lote_id: Number(lote.id),
        peso_inicial_almacen: pesoDelAlmacen,
      })
      setSuccess(null)
    }
  }

  const handleDetalleChange = (categoriaId: number, field: keyof DetalleForm, value: string) => {
    const numValue = value === "" ? 0 : Number.parseFloat(value)
    setFormData((prev) => {
      const prevDetalle = prev.detalles[categoriaId] ?? emptyDetalle
      const updated: DetalleForm = {
        ...prevDetalle,
        [field]: isNaN(numValue) ? 0 : numValue,
      }
      return {
        ...prev,
        detalles: {
          ...prev.detalles,
          [categoriaId]: updated,
        },
      }
    })
  }

  const handleSubmit = async () => {
    try {
      // Seguridad extra: aunque el botón esté deshabilitado, validamos aquí también
      if (loteLiquidado) {
        setError("Este lote está liquidado y no puede modificarse.")
        return
      }

      if (formData.lote_id === 0) {
        setError("Debe seleccionar un lote")
        return
      }

      // Armar arreglo de detalles para el backend
      const detallesPayload = Object.entries(formData.detalles)
        .filter(([, detalle]) => Number(detalle.peso) > 0) // usamos el peso como mínimo requerido
        .map(([categoriaId, detalle]) => ({
          categoria_id: Number(categoriaId),
          peso: Number(detalle.peso) || 0,
          numero_jabas: Number(detalle.numero_jabas) || 0,
          peso_jabas: Number(detalle.peso_jabas) || 0,
        }))

      if (detallesPayload.length === 0) {
        setError("Debe ingresar al menos un peso en alguna categoría")
        return
      }

      const sumaCategorias = detallesPayload.reduce((sum, d) => sum + (d.peso || 0), 0)

      const payload = {
        lote_id: formData.lote_id,
        fecha_pesado: formData.fecha_procesamiento,
        // si el peso del almacén es 0, usamos la suma
        peso_bruto: formData.peso_inicial_almacen > 0 ? formData.peso_inicial_almacen : sumaCategorias,
        observaciones: formData.observaciones,
        detalles: detallesPayload,
      }

      console.log("[v0] Guardando:", payload)

      setSaving(true)
      setError(null)

      const url = editingId
        ? `${API_CONFIG.BASE_URL}${API_ENDPOINTS.PESOS_LOTE}/${editingId}`
        : `${API_CONFIG.BASE_URL}${API_ENDPOINTS.PESOS_LOTE}`

      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        // Intentar leer mensaje del backend
        const errorData = await res.json().catch(() => null)

        // Si el backend devuelve 404 con "sin cambios", lo consideramos éxito suave
        if (errorData?.message?.toString().includes("sin cambios")) {
          setSuccess("Registro actualizado (sin cambios en datos)")
          resetForm()
          fetchData()
          return
        }

        throw new Error(errorData?.message || errorData?.error || "Error al guardar")
      }

      setSuccess(editingId ? "Registro actualizado correctamente" : "Registro creado correctamente")
      resetForm()
      fetchData()
    } catch (err) {
      console.error("[v0] Error saving:", err)
      setError(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setFormData(createInitialFormData())
    setEditingId(null)
    setSelectedLoteData(null)
    // mantenemos success/error como estén
  }

  const handleEdit = (registro: PesoLoteConDetalles) => {
    const lote = lotes.find((l) => String(l.id) === String(registro.lote_id))
    setSelectedLoteData(lote || null)
    handleLoteSelect(String(registro.lote_id))
    setActiveTab("nuevo")
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar este registro?")) return

    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.PESOS_LOTE}/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Error al eliminar")

      setSuccess("Registro eliminado correctamente")
      fetchData()
    } catch (err) {
      console.error("[v0] Error deleting:", err)
      setError("Error al eliminar el registro")
    }
  }

  // Peso total clasificado (suma de todas las categorías)
  const pesoTotalClasificado = useMemo(() => {
    return Object.values(formData.detalles || {}).reduce((sum, det) => sum + (det?.peso || 0), 0)
  }, [formData.detalles])

  const diferencia = formData.peso_inicial_almacen - pesoTotalClasificado

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando datos...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Procesamiento de Lotes</h1>
          <p className="text-muted-foreground">
            Registre la clasificación de pesos por categoría después del procesamiento
          </p>
        </div>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="nuevo" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {editingId ? "Editar Registro" : "Nuevo Registro"}
          </TabsTrigger>
          <TabsTrigger value="historial" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Historial ({registros.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nuevo" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Selección de lote */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Selección de Lote
                </CardTitle>
                <CardDescription>Seleccione el lote a procesar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Lote *</Label>
                  <Select value={formData.lote_id > 0 ? String(formData.lote_id) : ""} onValueChange={handleLoteSelect}>
                    <SelectTrigger className="h-auto py-3">
                      <SelectValue placeholder="Seleccionar lote..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[400px]">
                      {lotesDisponibles.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">No hay lotes disponibles</div>
                      ) : (
                        lotesDisponibles.map((lote) => {
                          const tieneRegistro = lotesConRegistro.has(String(lote.id))
                          const pesoLote = getLotePeso(lote)
                          return (
                            <SelectItem key={lote.id} value={String(lote.id)} className="py-3">
                              <div className="flex items-start gap-3 w-full">
                                {tieneRegistro ? (
                                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                ) : (
                                  <Clock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                )}
                                <div className="flex flex-col gap-0.5 min-w-0">
                                  <span className="font-medium">
                                    {lote.codigo || lote.numero_lote || `Lote #${lote.id}`}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {lote.producto || "Sin producto"} - {pesoLote.toFixed(2)} kg
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {lote.productor_nombre || "Sin productor"} |{" "}
                                    {lote.fecha_ingreso
                                      ? new Date(lote.fecha_ingreso).toLocaleDateString()
                                      : "Sin fecha"}
                                  </span>
                                  {tieneRegistro && (
                                    <Badge
                                      variant="outline"
                                      className="w-fit text-xs mt-1 text-green-600 border-green-300"
                                    >
                                      Procesado - Click para editar
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          )
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedLoteData && (
                  <div className="p-4 rounded-lg bg-muted/50 space-y-3 border">
                    <h4 className="font-medium flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Información del Lote
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Código:</span>
                        <p className="font-medium">
                          {selectedLoteData.codigo ||
                            selectedLoteData.numero_lote ||
                            `#${selectedLoteData.id}`}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Producto:</span>
                        <p className="font-medium">{selectedLoteData.producto || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Productor:</span>
                        <p className="font-medium">{selectedLoteData.productor_nombre || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Jabas:</span>
                        <p className="font-medium">{selectedLoteData.numero_jabas || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fecha Ingreso:</span>
                        <p className="font-medium">
                          {selectedLoteData.fecha_ingreso
                            ? new Date(selectedLoteData.fecha_ingreso).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Estado:</span>
                        <Badge variant="outline">{selectedLoteData.estado || "N/A"}</Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* Aviso de lote liquidado */}
                {loteLiquidado && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Este lote está <strong>LIQUIDADO</strong> y no puede modificarse.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label>Fecha de Procesamiento *</Label>
                  <Input
                    type="date"
                    value={formData.fecha_procesamiento}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, fecha_procesamiento: e.target.value }))
                    }
                    disabled={loteLiquidado}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Peso Inicial del Almacén (kg)</Label>
                  <Input type="number" value={formData.peso_inicial_almacen} readOnly className="bg-muted" />
                  <p className="text-xs text-muted-foreground">
                    Este valor se obtiene automáticamente del lote seleccionado
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Resumen */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Resumen de Clasificación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-600">Peso Inicial</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {formData.peso_inicial_almacen.toFixed(2)} kg
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-600">Peso Clasificado</p>
                    <p className="text-2xl font-bold text-green-700">
                      {pesoTotalClasificado.toFixed(2)} kg
                    </p>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-lg border ${
                    Math.abs(diferencia) < 0.01
                      ? "bg-green-50 border-green-200"
                      : diferencia > 0
                        ? "bg-amber-50 border-amber-200"
                        : "bg-red-50 border-red-200"
                  }`}
                >
                  <p className="text-sm text-muted-foreground">Diferencia</p>
                  <p
                    className={`text-xl font-bold ${
                      Math.abs(diferencia) < 0.01
                        ? "text-green-700"
                        : diferencia > 0
                          ? "text-amber-700"
                          : "text-red-700"
                    }`}
                  >
                    {diferencia > 0 ? "+" : ""}
                    {diferencia.toFixed(2)} kg
                  </p>
                  {Math.abs(diferencia) > 0.01 && (
                    <p className="text-xs mt-1 text-muted-foreground">
                      {diferencia > 0 ? "Falta clasificar peso" : "Excede el peso inicial"}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Observaciones</Label>
                  <Textarea
                    value={formData.observaciones}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, observaciones: e.target.value }))
                    }
                    placeholder="Notas adicionales sobre el procesamiento..."
                    rows={3}
                    disabled={loteLiquidado}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={saving || formData.lote_id === 0 || loteLiquidado}
                    className="flex-1"
                  >
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    {editingId ? "Actualizar" : "Guardar"}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cuadro de categorías dinámicas */}
          <Card>
            <CardHeader>
              <CardTitle>Pesos y Jabas por Categoría</CardTitle>
              <CardDescription>
                Ingrese el peso, número de jabas y peso de jabas para cada categoría
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categorias.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay categorías configuradas en la base de datos.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {categorias.map((cat) => {
                    const detalle = formData.detalles[cat.id] ?? emptyDetalle
                    const valorPeso = detalle.peso || 0
                    const valorJabas = detalle.numero_jabas || 0
                    const valorPesoJabas = detalle.peso_jabas || 0
                    const porcentaje =
                      valorPeso > 0 && formData.peso_inicial_almacen > 0
                        ? ((valorPeso / formData.peso_inicial_almacen) * 100).toFixed(1)
                        : null
                    return (
                      <div key={cat.id} className="p-4 rounded-lg border-2 bg-muted/40 space-y-2">
                        <Label className="text-sm font-medium">{cat.nombre}</Label>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Peso (kg)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={valorPeso || ""}
                            onChange={(e) => handleDetalleChange(cat.id, "peso", e.target.value)}
                            placeholder="0.00"
                            disabled={loteLiquidado}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">N° jabas</Label>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            value={valorJabas || ""}
                            onChange={(e) => handleDetalleChange(cat.id, "numero_jabas", e.target.value)}
                            placeholder="0"
                            disabled={loteLiquidado}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Peso jabas (kg)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={valorPesoJabas || ""}
                            onChange={(e) => handleDetalleChange(cat.id, "peso_jabas", e.target.value)}
                            placeholder="0.00"
                            disabled={loteLiquidado}
                          />
                        </div>
                        {porcentaje && (
                          <p className="text-xs text-muted-foreground mt-1">Peso: {porcentaje}%</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Historial */}
        <TabsContent value="historial">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Procesamiento</CardTitle>
              <CardDescription>Registros de clasificación realizados</CardDescription>
            </CardHeader>
            <CardContent>
              {registros.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay registros de procesamiento</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lote</TableHead>
                        <TableHead>Fecha Proc.</TableHead>
                        <TableHead className="text-right">Peso Inicial</TableHead>
                        <TableHead className="text-right">Total Clasif.</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registros.map((registro) => {
                        const lote = lotes.find((l) => String(l.id) === String(registro.lote_id))
                        const parseNum = (v: any) => {
                          const n = typeof v === "string" ? Number.parseFloat(v) : Number(v)
                          return isNaN(n) ? 0 : n
                        }
                        const totalClasif =
                          registro.detalles?.reduce((sum, d) => sum + parseNum(d.peso), 0) ?? 0

                        return (
                          <TableRow key={registro.id}>
                            <TableCell className="font-medium">
                              {lote?.codigo || lote?.numero_lote || `Lote #${registro.lote_id}`}
                            </TableCell>
                            <TableCell>
                              {(registro as any).fecha_pesado
                                ? new Date((registro as any).fecha_pesado).toLocaleDateString()
                                : (registro as any).fecha_procesamiento
                                  ? new Date((registro as any).fecha_procesamiento).toLocaleDateString()
                                  : "N/A"}
                            </TableCell>
                            <TableCell className="text-right">
                              {parseNum((registro as any).peso_bruto).toFixed(2)} kg
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {totalClasif.toFixed(2)} kg
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => handleEdit(registro)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(Number(registro.id))}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default GestionPesosLote
