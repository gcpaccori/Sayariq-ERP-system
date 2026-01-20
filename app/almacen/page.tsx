"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Warehouse, Clock, AlertTriangle, Package, Search, Calendar, Scale, Plus, CheckCircle2, Circle, DollarSign, X, Calculator, User } from 'lucide-react'
import { useApi } from "@/lib/hooks/use-api"
import { lotesService } from "@/lib/services/lotes-service"
import { usePersonas } from "@/lib/hooks/use-personas"
import type { Lote } from "@/lib/types/index"

type EstadoLiquidacion = "recibido" | "procesado" | "liquidado" | "pagado"

function calcularDiasDesdeFecha(fechaIngreso: string): number {
  try {
    const fecha = new Date(fechaIngreso)
    const hoy = new Date()
    const diff = hoy.getTime() - fecha.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  } catch {
    return 0
  }
}

function getEstadoFrescura(diasDesdeCosecha: number): "optimo" | "proximo-a-vencer" | "en-riesgo" {
  if (diasDesdeCosecha <= 5) return "optimo"
  if (diasDesdeCosecha <= 10) return "proximo-a-vencer"
  return "en-riesgo"
}

function mapearEstadoLiquidacion(estadoLote: string): EstadoLiquidacion {
  switch (estadoLote) {
    case "pendiente":
      return "recibido"
    case "proceso":
      return "procesado"
    case "completado":
    case "liquidado":
      return "liquidado"
    case "entregado":
      return "pagado"
    default:
      return "recibido"
  }
}

export default function AlmacenPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  
  const [proveedorBusqueda, setProveedorBusqueda] = useState("")
  const [mostrarResultadosProveedor, setMostrarResultadosProveedor] = useState(false)
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    productor_id: "",
    producto: "jengibre",
    peso_bruto: "",
    num_jabas: "",
    tara_promedio: "",
    tipo_compra: "directa",
    precio_fijo: "",
    transportista: "",
    placa: "",
    observaciones: "",
  })

  const { data: lotes, loading: loadingLotes, refresh: refreshLotes } = useApi(lotesService, { initialLoad: true })
  const { data: personas, loading: loadingPersonas } = usePersonas()

  const productores = useMemo(() => {
    if (!Array.isArray(personas) || personas.length === 0) return []
    console.log("[v0] Total personas loaded:", personas.length)
    console.log("[v0] First persona sample:", personas[0])
    
    const prods = personas.filter((p) => {
      const tipo = (p.tipo || "").toLowerCase()
      const tipoPersona = (p.tipo_persona || "").toLowerCase()
      const rolesMatch = p.roles?.some((r: string) => r.toLowerCase() === "productor")
      
      const isProductor = tipo === "productor" || tipoPersona === "productor" || rolesMatch
      
      if (isProductor) {
        console.log("[v0] Found productor:", { 
          nombre: p.nombre_completo || `${p.nombres} ${p.apellidos}`,
          tipo: p.tipo,
          tipo_persona: p.tipo_persona,
          roles: p.roles 
        })
      }
      
      return isProductor
    })
    
    console.log("[v0] Productores filtered:", prods.length)
    return prods
  }, [personas])

  const proveedoresFiltrados = useMemo(() => {
    if (!proveedorBusqueda.trim()) return []
    const searchLower = proveedorBusqueda.toLowerCase()
    
    const filtered = productores.filter((p) => {
      const nombreCompleto = `${p.nombres || ''} ${p.apellidos || ''}`.toLowerCase()
      const dni = (p.dni || p.numero_documento || p.documento_identidad || '').toLowerCase()
      const telefono = (p.telefono || '').toLowerCase()
      const matchNombre = nombreCompleto.includes(searchLower)
      const matchDni = dni.includes(searchLower)
      const matchTelefono = telefono.includes(searchLower)
      return matchNombre || matchDni || matchTelefono
    }).slice(0, 5)
    
    console.log("[v0] Provider search:", { searchTerm: proveedorBusqueda, totalProductores: productores.length, filtered: filtered.length })
    return filtered
  }, [proveedorBusqueda, productores])

  const calculations = useMemo(() => {
    const jabas = Number.parseFloat(formData.num_jabas) || 0
    const peso = Number.parseFloat(formData.peso_bruto) || 0
    const tara = Number.parseFloat(formData.tara_promedio) || 0

    const pesoPromedioPorJaba = jabas > 0 ? peso / jabas : 0
    const taraTotal = tara * jabas
    const pesoNeto = peso - taraTotal

    return {
      pesoPromedioPorJaba: pesoPromedioPorJaba.toFixed(2),
      taraTotal: taraTotal.toFixed(2),
      pesoNeto: Math.max(0, pesoNeto).toFixed(2),
    }
  }, [formData.num_jabas, formData.peso_bruto, formData.tara_promedio])

  const precioTotal = useMemo(() => {
    if (formData.tipo_compra === "cerrada" && formData.precio_fijo) {
      const pesoNeto = Number(calculations.pesoNeto) || 0
      const precioUnitario = Number(formData.precio_fijo) || 0
      return (pesoNeto * precioUnitario).toFixed(2)
    }
    return "0.00"
  }, [formData.tipo_compra, formData.precio_fijo, calculations.pesoNeto])

  const lotesAlmacen = useMemo(() => {
    if (!Array.isArray(lotes)) return []
    
    return lotes.map((lote) => {
      // Backend sends: productor_nombre, numero_lote
      const proveedor = lote.productor_nombre || "Sin proveedor"
      const codigo = lote.numero_lote || lote.codigo || `LOTE-${lote.id}`
      const diasDesdeCosecha = calcularDiasDesdeFecha(lote.fecha_ingreso)
      const estado = getEstadoFrescura(diasDesdeCosecha)
      const estadoLiquidacion = mapearEstadoLiquidacion(lote.estado)
      
      return {
        id: String(lote.id),
        codigo,
        producto: lote.producto || "jengibre",
        proveedor,
        fechaIngreso: lote.fecha_ingreso,
        diasDesdeCosecha,
        numeroJabas: Number(lote.numero_jabas || lote.num_jabas || 0),
        jabasCompletas: Number(lote.numero_jabas || lote.num_jabas || 0),
        pesoTotal: Number(lote.peso_neto || lote.peso_inicial || lote.peso_bruto || 0),
        estado,
        estadoLiquidacion,
        proximaAccion: lote.estado === "pendiente" ? "sin-asignar" : 
                      lote.estado === "proceso" ? "en-proceso" : 
                      lote.estado === "completado" || lote.estado === "liquidado" ? "finalizado-envio" : "asignado-lote",
        loteOriginal: lote,
      }
    })
  }, [lotes])

  const lotesFiltrados = lotesAlmacen.filter((lote) => {
    const coincideBusqueda =
      (lote.codigo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lote.proveedor || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lote.producto || "").toLowerCase().includes(searchTerm.toLowerCase())

    const coincideEstado = filtroEstado === "todos" || lote.estado === filtroEstado

    return coincideBusqueda && coincideEstado
  })

  const getFrescuraSemaforo = (diasDesdeCosecha: number) => {
    if (diasDesdeCosecha <= 5) {
      return <Circle className="h-4 w-4 text-green-500 fill-current" />
    } else if (diasDesdeCosecha <= 10) {
      return <Circle className="h-4 w-4 text-yellow-500 fill-current" />
    } else {
      return <Circle className="h-4 w-4 text-red-500 fill-current" />
    }
  }

  const getEstadoLiquidacionBadge = (estado: EstadoLiquidacion) => {
    const config = {
      recibido: { text: "Recibido", color: "text-blue-600", bgColor: "bg-blue-50", icon: Package },
      procesado: { text: "Procesado", color: "text-yellow-600", bgColor: "bg-yellow-50", icon: Clock },
      liquidado: { text: "Liquidado", color: "text-orange-600", bgColor: "bg-orange-50", icon: DollarSign },
      pagado: { text: "Pagado", color: "text-green-600", bgColor: "bg-green-50", icon: CheckCircle2 },
    }

    const { text, color, bgColor, icon: Icon } = config[estado]
    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${bgColor}`}>
        <Icon className={`h-4 w-4 ${color}`} />
        <span className={`text-sm font-medium ${color}`}>{text}</span>
      </div>
    )
  }

  const getProximaAccionTexto = (accion: string) => {
    const labels = {
      "sin-asignar": { text: "Sin Asignar", color: "text-red-600", bgColor: "bg-red-50", circle: "text-red-500" },
      "asignado-lote": {
        text: "Asignado a Lote",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        circle: "text-yellow-500",
      },
      "en-proceso": { text: "En Proceso", color: "text-blue-600", bgColor: "bg-blue-50", circle: "text-blue-500" },
      "finalizado-envio": {
        text: "Finalizado para Envío",
        color: "text-green-600",
        bgColor: "bg-green-50",
        circle: "text-green-500" },
    }

    const config = labels[accion as keyof typeof labels] || labels["sin-asignar"]
    return (
      <div className="flex items-center gap-2">
        <Circle className={`h-3 w-3 fill-current ${config.circle}`} />
        <span className={`text-sm font-medium ${config.color}`}>{config.text}</span>
      </div>
    )
  }

  const getDiasColor = (diasDesdeCosecha: number) => {
    if (diasDesdeCosecha > 10) return "text-red-600 font-bold"
    if (diasDesdeCosecha > 5) return "text-yellow-600 font-medium"
    return "text-green-600"
  }

  const getEstadoTexto = (estado: string) => {
    const labels = {
      optimo: { text: "Óptimo", color: "text-green-600", bgColor: "bg-green-50" },
      "proximo-a-vencer": { text: "Próximo a Vencer", color: "text-yellow-600", bgColor: "bg-yellow-50" },
      "en-riesgo": { text: "En Riesgo", color: "text-red-600", bgColor: "bg-red-50" },
    }

    const config = labels[estado as keyof typeof labels] || labels.optimo
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
        {config.text}
      </span>
    )
  }

  const handleLiquidar = async (lote: any) => {
    try {
      await lotesService.update(Number(lote.id), { estado: "completado" })
      refreshLotes()
      alert(`Lote ${lote.codigo} liquidado correctamente`)
    } catch (error) {
      console.error("[v0] Error al liquidar lote:", error)
      alert("Error al liquidar el lote")
    }
  }

  const seleccionarProveedor = (proveedor: any) => {
    setProveedorSeleccionado(proveedor)
    setFormData({ ...formData, productor_id: String(proveedor.id) })
    setProveedorBusqueda(`${proveedor.nombres || ''} ${proveedor.apellidos || ''}`)
    setMostrarResultadosProveedor(false)
  }

  const handleSubmitIngreso = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!proveedorSeleccionado) {
      alert("Debe seleccionar un proveedor")
      return
    }

    try {
      const codigo = await lotesService.generarCodigoLote()
      const pesoNeto = Number(calculations.pesoNeto)
      
      const nuevoLote = {
        numero_lote: codigo, // Backend expects numero_lote
        guia_ingreso: `GI-${Date.now()}`, // Generate unique guia_ingreso
        productor_id: Number(formData.productor_id),
        producto: formData.producto,
        fecha_ingreso: new Date().toISOString().split('T')[0],
        peso_inicial: Number(formData.peso_bruto),
        peso_neto: pesoNeto,
        numero_jabas: Number(formData.num_jabas),
        estado: "pendiente" as const,
        observaciones: formData.observaciones || "",
      }

      console.log("[v0] Creating lote with data:", nuevoLote)
      await lotesService.create(nuevoLote)
      
      // Reset form
      setFormData({
        productor_id: "",
        producto: "jengibre",
        peso_bruto: "",
        num_jabas: "",
        tara_promedio: "",
        tipo_compra: "directa",
        precio_fijo: "",
        transportista: "",
        placa: "",
        observaciones: "",
      })
      setProveedorSeleccionado(null)
      setProveedorBusqueda("")
      setMostrarFormulario(false)
      refreshLotes()
      alert(`Ingreso registrado correctamente. Código: ${codigo}`)
    } catch (error) {
      console.error("[v0] Error al registrar ingreso:", error)
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"
      alert(`Error al registrar el ingreso: ${errorMessage}`)
    }
  }

  const lotesCriticos = lotesAlmacen.filter(
    (lote) => lote.proximaAccion === "sin-asignar" && lote.diasDesdeCosecha > 10,
  )

  const lotesConAlertas = lotesAlmacen.filter((lote) => lote.proximaAccion === "sin-asignar")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Warehouse className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Control de Almacén</h1>
            <p className="text-gray-600">Gestión de lotes y control de materia prima</p>
          </div>
        </div>
        <Button onClick={() => setMostrarFormulario(!mostrarFormulario)}>
          <Plus className="mr-2 h-4 w-4" />
          {mostrarFormulario ? "Cancelar" : "Nuevo Ingreso Materia Prima"}
        </Button>
      </div>

      {mostrarFormulario && (
        <Card className="sayariq-card border-primary">
          <CardHeader>
            <CardTitle>Nuevo Ingreso de Materia Prima</CardTitle>
            <CardDescription>Registre la recepción de materia prima del productor</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitIngreso} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Form Data */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Provider Search with Lupa */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Search className="h-5 w-5" />
                        Búsqueda de Proveedor
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                        <Input
                          value={proveedorBusqueda}
                          onChange={(e) => {
                            setProveedorBusqueda(e.target.value)
                            setMostrarResultadosProveedor(true)
                            if (!e.target.value) setProveedorSeleccionado(null)
                          }}
                          onFocus={() => setMostrarResultadosProveedor(true)}
                          className="pl-10"
                          placeholder="🔍 Buscar proveedor por nombre, DNI o teléfono..."
                          disabled={loadingPersonas}
                        />
                        {mostrarResultadosProveedor && proveedorBusqueda && (
                          <div className="absolute z-20 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {proveedoresFiltrados.length > 0 ? (
                              <>
                                {proveedoresFiltrados.map((proveedor) => (
                                  <div
                                    key={proveedor.id}
                                    className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                                    onClick={() => seleccionarProveedor(proveedor)}
                                  >
                                    <div className="font-medium">{proveedor.nombres} {proveedor.apellidos}</div>
                                    <div className="text-sm text-gray-500">
                                      DNI: {proveedor.dni || proveedor.numero_documento || proveedor.documento_identidad || 'N/A'} • Tel: {proveedor.telefono || 'N/A'}
                                    </div>
                                  </div>
                                ))}
                              </>
                            ) : (
                              <div className="px-4 py-6 text-center text-gray-500">
                                No se encontraron proveedores
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {proveedorSeleccionado && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-green-800 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4" />
                                {proveedorSeleccionado.nombres} {proveedorSeleccionado.apellidos}
                              </div>
                              <div className="text-sm text-green-600 mt-1">
                                DNI: {proveedorSeleccionado.dni || proveedorSeleccionado.numero_documento || proveedorSeleccionado.documento_identidad || 'N/A'} • Tel: {proveedorSeleccionado.telefono || 'N/A'}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setProveedorSeleccionado(null)
                                setFormData({ ...formData, productor_id: "" })
                                setProveedorBusqueda("")
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Batch Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Package className="h-5 w-5" />
                        Información del Lote
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="producto">Producto *</Label>
                          <Select
                            value={formData.producto}
                            onValueChange={(value) => setFormData({ ...formData, producto: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="jengibre">🫚 Jengibre</SelectItem>
                              <SelectItem value="curcuma">🟡 Cúrcuma</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="tipo_compra">Tipo de Compra *</Label>
                          <Select
                            value={formData.tipo_compra}
                            onValueChange={(value) => setFormData({ ...formData, tipo_compra: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="directa">💰 Compra Directa (clasificar después)</SelectItem>
                              <SelectItem value="cerrada">📦 Carga Cerrada (precio fijo)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="num_jabas">Número de Jabas *</Label>
                          <Input
                            id="num_jabas"
                            type="number"
                            placeholder="0"
                            value={formData.num_jabas}
                            onChange={(e) => setFormData({ ...formData, num_jabas: e.target.value })}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="peso_bruto">Peso Bruto (kg) *</Label>
                          <Input
                            id="peso_bruto"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={formData.peso_bruto}
                            onChange={(e) => setFormData({ ...formData, peso_bruto: e.target.value })}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="tara_promedio">Tara Promedio (kg/jaba)</Label>
                          <Input
                            id="tara_promedio"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={formData.tara_promedio}
                            onChange={(e) => setFormData({ ...formData, tara_promedio: e.target.value })}
                          />
                        </div>
                      </div>

                      {formData.tipo_compra === "cerrada" && (
                        <div className="space-y-2">
                          <Label htmlFor="precio_fijo">Precio Fijo (S/. por kg) *</Label>
                          <Input
                            id="precio_fijo"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={formData.precio_fijo}
                            onChange={(e) => setFormData({ ...formData, precio_fijo: e.target.value })}
                            required={formData.tipo_compra === "cerrada"}
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="transportista">Transportista</Label>
                          <Input
                            id="transportista"
                            placeholder="Nombre del transportista"
                            value={formData.transportista}
                            onChange={(e) => setFormData({ ...formData, transportista: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="placa">Placa del Vehículo</Label>
                          <Input
                            id="placa"
                            placeholder="ABC-123"
                            value={formData.placa}
                            onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="observaciones">Observaciones</Label>
                        <Textarea
                          id="observaciones"
                          placeholder="Notas adicionales sobre el ingreso..."
                          value={formData.observaciones}
                          onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                          rows={3}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Calculations */}
                <div className="space-y-4">
                  <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Calculator className="h-4 w-4" />
                        Cálculos Automáticos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="bg-white p-3 rounded-lg border">
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="h-3 w-3 text-gray-600" />
                          <span className="text-xs font-medium text-gray-600">Número de Jabas</span>
                        </div>
                        <p className="text-xl font-bold">{formData.num_jabas || "0"}</p>
                      </div>

                      <div className="bg-white p-3 rounded-lg border">
                        <div className="flex items-center gap-2 mb-1">
                          <Scale className="h-3 w-3 text-gray-600" />
                          <span className="text-xs font-medium text-gray-600">Peso Bruto Total</span>
                        </div>
                        <p className="text-xl font-bold">{formData.peso_bruto || "0"} kg</p>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Calculator className="h-3 w-3 text-blue-600" />
                          <span className="text-xs font-medium text-blue-600">Peso por Jaba</span>
                        </div>
                        <p className="text-xl font-bold text-blue-800">{calculations.pesoPromedioPorJaba} kg</p>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-amber-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Scale className="h-3 w-3 text-amber-600" />
                          <span className="text-xs font-medium text-amber-600">Tara Total</span>
                        </div>
                        <p className="text-xl font-bold text-amber-800">{calculations.taraTotal} kg</p>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Scale className="h-3 w-3 text-green-600" />
                          <span className="text-xs font-medium text-green-600">Peso Neto</span>
                        </div>
                        <p className="text-xl font-bold text-green-800">{calculations.pesoNeto} kg</p>
                      </div>

                      {formData.tipo_compra === "cerrada" && formData.precio_fijo && (
                        <div className="bg-white p-3 rounded-lg border border-purple-200">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="h-3 w-3 text-purple-600" />
                            <span className="text-xs font-medium text-purple-600">Precio Total</span>
                          </div>
                          <p className="text-xl font-bold text-purple-800">S/. {precioTotal}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {calculations.pesoNeto} kg × S/. {formData.precio_fijo}/kg
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {proveedorSeleccionado && (
                    <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <User className="h-4 w-4" />
                          Proveedor Seleccionado
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600">Nombre:</span>
                          <p className="font-medium">{proveedorSeleccionado.nombres} {proveedorSeleccionado.apellidos}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">DNI:</span>
                          <p className="font-medium">{proveedorSeleccionado.dni || proveedorSeleccionado.numero_documento || proveedorSeleccionado.documento_identidad || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Teléfono:</span>
                          <p className="font-medium">{proveedorSeleccionado.telefono || 'N/A'}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setMostrarFormulario(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!proveedorSeleccionado}>
                  Registrar Ingreso
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Estadísticas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="sayariq-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Lotes</p>
                <p className="text-2xl font-bold text-gray-900">{lotesAlmacen.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="sayariq-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Lotes Críticos</p>
                <p className="text-2xl font-bold text-red-600">{lotesCriticos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="sayariq-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Sin Asignar</p>
                <p className="text-2xl font-bold text-orange-600">{lotesConAlertas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="sayariq-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Scale className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Peso Total</p>
                <p className="text-2xl font-bold text-green-600">
                  {(lotesAlmacen.reduce((sum, lote) => sum + (Number(lote.pesoTotal) || 0), 0)).toFixed(0)} kg
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas Críticas */}
      {lotesCriticos.length > 0 && (
        <Card className="sayariq-card border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertas Críticas - Lotes Sin Asignar con Más de 10 Días desde Ingreso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lotesCriticos.map((lote) => (
                <div
                  key={lote.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-lg border-l-4 border-red-500 gap-3"
                >
                  <div>
                    <span className="font-bold">{lote.codigo}</span> - {lote.proveedor}
                    <div className="text-sm text-gray-600">
                      {lote.diasDesdeCosecha} días desde ingreso - Estado: {lote.estadoLiquidacion}
                    </div>
                  </div>
                  <div className="text-right">
                    {getProximaAccionTexto(lote.proximaAccion)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card className="sayariq-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por código, proveedor o producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 sayariq-input"
              />
            </div>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-full sm:w-48 sayariq-input">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="optimo">Óptimo</SelectItem>
                <SelectItem value="proximo-a-vencer">Próximo a Vencer</SelectItem>
                <SelectItem value="en-riesgo">En Riesgo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Control de Lotes */}
      <Card className="sayariq-card">
        <CardHeader>
          <CardTitle>Control de Lotes en Almacén</CardTitle>
          <CardDescription>
            {loadingLotes ? "Cargando..." : `${lotesFiltrados.length} lotes encontrados`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingLotes ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4 animate-pulse" />
              <p>Cargando lotes...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="sayariq-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Proveedor</th>
                    <th>Producto</th>
                    <th>Días desde Ingreso</th>
                    <th>Jabas</th>
                    <th>Peso (kg)</th>
                    <th>Estado (Frescura)</th>
                    <th>Estado Liquidación</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {lotesFiltrados.map((lote) => (
                    <tr key={lote.id} className="hover:bg-gray-50">
                      <td className="font-medium">{lote.codigo}</td>
                      <td>{lote.proveedor}</td>
                      <td className="capitalize">{lote.producto}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className={
                            lote.diasDesdeCosecha > 10 ? "text-red-600 font-bold" :
                            lote.diasDesdeCosecha > 5 ? "text-yellow-600 font-medium" :
                            "text-green-600"
                          }>{lote.diasDesdeCosecha} días</span>
                        </div>
                      </td>
                      <td>
                        <div className="text-sm">
                          <div className="font-medium">{lote.jabasCompletas}/{lote.numeroJabas}</div>
                          <div className="text-gray-500 text-xs">completas/total</div>
                        </div>
                      </td>
                      <td>
                        <div className="font-medium">{(Number(lote.pesoTotal) || 0).toFixed(2)}</div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {getFrescuraSemaforo(lote.diasDesdeCosecha)}
                          {getEstadoTexto(lote.estado)}
                        </div>
                      </td>
                      <td>{getEstadoLiquidacionBadge(lote.estadoLiquidacion)}</td>
                      <td>
                        {lote.estadoLiquidacion === "procesado" && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleLiquidar(lote)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Liquidar
                          </Button>
                        )}
                        {lote.estadoLiquidacion === "recibido" && (
                          <span className="text-xs text-gray-500">Pendiente clasificar</span>
                        )}
                        {lote.estadoLiquidacion === "liquidado" && (
                          <span className="text-xs text-orange-600">Pendiente pago</span>
                        )}
                        {lote.estadoLiquidacion === "pagado" && (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loadingLotes && lotesFiltrados.length === 0 && (
            <div className="text-center py-8">
              <Warehouse className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron lotes en almacén</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
