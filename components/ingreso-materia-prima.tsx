"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, X, Calculator, Package, Scale, AlertCircle } from 'lucide-react'
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { usePersonas } from "@/lib/hooks/use-personas"
import { useApi } from "@/lib/hooks/use-api"
import { lotesService } from "@/lib/services/lotes-service"
import type { Persona } from "@/lib/types"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function IngresoMateriaPrima() {
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { data: personas, loading: loadingPersonas } = usePersonas()
  const { data: lotes, loading: loadingLotes, create: createLote } = useApi(lotesService, { initialLoad: true })

  const [formData, setFormData] = useState({
    tipoProducto: "",
    producto: "",
    categoria: "",
    proveedorId: "",
    fechaRecepcion: new Date().toISOString().split("T")[0],
    numeroJabas: 0,
    pesoBrutoTotal: 0,
    taraPromedio: 0,
    modalidadCompra: "por-proceso",
    lugarProcedencia: "",
    zona: "",
    transportista: "",
    placa: "",
    responsableRecepcion: "",
    deudaAnterior: 0,
    adelantoSolicitado: 0,
    observaciones: "",
  })

  const [proveedorBusqueda, setProveedorBusqueda] = useState("")
  const [mostrarResultados, setMostrarResultados] = useState(false)
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<Persona | null>(null)

  const proveedoresFiltrados = useMemo(() => {
    if (!proveedorBusqueda.trim()) return []
    const searchTerm = proveedorBusqueda.toLowerCase()
    return (Array.isArray(personas) ? personas : [])
      .filter(
        (p) =>
          p.nombre_completo?.toLowerCase().includes(searchTerm) ||
          p.documento_identidad?.includes(searchTerm) ||
          p.telefono?.includes(searchTerm),
      )
      .slice(0, 5)
  }, [proveedorBusqueda, personas])

  const calculations = useMemo(() => {
    const jabas = Number.parseFloat(String(formData.numeroJabas)) || 0
    const peso = Number.parseFloat(String(formData.pesoBrutoTotal)) || 0
    const tara = Number.parseFloat(String(formData.taraPromedio)) || 0

    const pesoPromedioPorJaba = jabas > 0 ? peso / jabas : 0
    const taraTotal = tara * jabas
    const pesoNeto = peso - taraTotal

    return {
      pesoPromedioPorJaba: pesoPromedioPorJaba.toFixed(2),
      taraTotal: taraTotal.toFixed(2),
      pesoNeto: Math.max(0, pesoNeto).toFixed(2),
    }
  }, [formData.numeroJabas, formData.pesoBrutoTotal, formData.taraPromedio])

  const seleccionarProveedor = (proveedor: Persona) => {
    setProveedorSeleccionado(proveedor)
    setFormData((prev) => ({ ...prev, proveedorId: String(proveedor.id) }))
    setProveedorBusqueda(proveedor.nombre_completo || "")
    setMostrarResultados(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        ["numeroJabas", "pesoBrutoTotal", "taraPromedio", "deudaAnterior", "adelantoSolicitado"].includes(name)
          ? Number.parseFloat(value) || 0
          : value,
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!proveedorSeleccionado) {
      toast({
        title: "Error",
        description: "Debe seleccionar un proveedor",
        variant: "destructive",
      })
      return
    }

    if (!formData.producto || !formData.categoria) {
      toast({
        title: "Error",
        description: "Complete producto y categoría",
        variant: "destructive",
      })
      return
    }

    if (formData.numeroJabas <= 0 || formData.pesoBrutoTotal <= 0) {
      toast({
        title: "Error",
        description: "Número de jabas y peso deben ser mayores a 0",
        variant: "destructive",
      })
      return
    }

    const pesoNeto = Number(calculations.pesoNeto)
    if (pesoNeto > formData.pesoBrutoTotal) {
      toast({
        title: "Error de Validación",
        description: "El peso neto no puede exceder el peso bruto",
        variant: "destructive",
      })
      return
    }

    try {
      await createLote({
        codigo: `LOT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
        productor_id: Number(proveedorSeleccionado.id),
        peso_bruto: formData.pesoBrutoTotal,
        peso_neto: pesoNeto,
        tara: Number(calculations.taraTotal),
        fecha_ingreso: formData.fechaRecepcion,
        estado: "pendiente",
        observaciones: formData.observaciones,
        num_jabas: formData.numeroJabas,
      })

      toast({
        title: "Lote registrado",
        description: `Lote de materia prima registrado exitosamente para ${proveedorSeleccionado.nombre_completo}`,
      })

      // Reset form
      setFormData({
        tipoProducto: "",
        producto: "",
        categoria: "",
        proveedorId: "",
        fechaRecepcion: new Date().toISOString().split("T")[0],
        numeroJabas: 0,
        pesoBrutoTotal: 0,
        taraPromedio: 0,
        modalidadCompra: "por-proceso",
        lugarProcedencia: "",
        zona: "",
        transportista: "",
        placa: "",
        responsableRecepcion: "",
        deudaAnterior: 0,
        adelantoSolicitado: 0,
        observaciones: "",
      })
      setProveedorSeleccionado(null)
      setProveedorBusqueda("")
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error al registrar lote:", error)
      toast({
        title: "Error",
        description: "No se pudo registrar el lote",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Ingreso de Materia Prima</h2>
          <p className="text-muted-foreground">Registre el ingreso de lotes de materia prima</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Nuevo Ingreso
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Registro de Ingreso de Lote</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Provider Search and Batch Info */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Search className="h-5 w-5" />
                      Búsqueda de Proveedor
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                        <Input
                          value={proveedorBusqueda}
                          onChange={(e) => {
                            setProveedorBusqueda(e.target.value)
                            setMostrarResultados(true)
                            setProveedorSeleccionado(null)
                          }}
                          onFocus={() => setMostrarResultados(true)}
                          className="pl-10"
                          placeholder="Buscar proveedor por nombre o documento..."
                          autoComplete="off"
                          disabled={loadingPersonas}
                        />
                        {mostrarResultados && proveedorBusqueda && (
                          <div className="absolute z-20 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {proveedoresFiltrados.length > 0 ? (
                              <>
                                {proveedoresFiltrados.map((proveedor) => (
                                  <div
                                    key={proveedor.id}
                                    className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                                    onClick={() => seleccionarProveedor(proveedor)}
                                  >
                                    <div className="font-medium">{proveedor.nombre_completo}</div>
                                    <div className="text-sm text-gray-500">
                                      Doc: {proveedor.documento_identidad} • Tel: {proveedor.telefono}
                                    </div>
                                  </div>
                                ))}
                              </>
                            ) : (
                              <div className="px-4 py-6 text-center">
                                <div className="text-gray-500">No se encontraron proveedores</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {proveedorSeleccionado && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-green-800">✅ {proveedorSeleccionado.nombre_completo}</div>
                            <div className="text-sm text-green-600 mt-1">
                              Doc: {proveedorSeleccionado.documento_identidad} • Tel: {proveedorSeleccionado.telefono}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setProveedorSeleccionado(null)
                              setFormData((prev) => ({ ...prev, proveedorId: "" }))
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

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Package className="h-5 w-5" />
                      Información del Lote
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Producto *</Label>
                        <Select
                          value={formData.producto}
                          onValueChange={(value) => handleSelectChange("producto", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="jengibre">Jengibre</SelectItem>
                            <SelectItem value="curcuma">Cúrcuma</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Categoría *</Label>
                        <Select
                          value={formData.categoria}
                          onValueChange={(value) => handleSelectChange("categoria", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="exportable">Exportable</SelectItem>
                            <SelectItem value="industrial">Industrial</SelectItem>
                            <SelectItem value="descarte">Descarte</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Número de Jabas *</Label>
                        <Input
                          name="numeroJabas"
                          type="number"
                          value={formData.numeroJabas || ""}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div>
                        <Label>Peso Bruto Total (kg) *</Label>
                        <Input
                          name="pesoBrutoTotal"
                          type="number"
                          step="0.01"
                          value={formData.pesoBrutoTotal || ""}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div>
                        <Label>Tara Promedio (kg/jaba)</Label>
                        <Input
                          name="taraPromedio"
                          type="number"
                          step="0.01"
                          value={formData.taraPromedio || ""}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Transportista</Label>
                        <Input name="transportista" value={formData.transportista} onChange={handleInputChange} />
                      </div>
                      <div>
                        <Label>Placa</Label>
                        <Input
                          name="placa"
                          value={formData.placa}
                          onChange={(e) => {
                            e.target.value = e.target.value.toUpperCase()
                            handleInputChange(e)
                          }}
                        />
                      </div>
                      <div>
                        <Label>Fecha Recepción *</Label>
                        <Input
                          name="fechaRecepcion"
                          type="date"
                          value={formData.fechaRecepcion}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Observaciones</Label>
                      <Textarea
                        name="observaciones"
                        value={formData.observaciones}
                        onChange={handleInputChange}
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Automatic Calculations */}
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
                      <p className="text-xl font-bold">{formData.numeroJabas || "0"}</p>
                    </div>

                    <div className="bg-white p-3 rounded-lg border">
                      <div className="flex items-center gap-2 mb-1">
                        <Scale className="h-3 w-3 text-gray-600" />
                        <span className="text-xs font-medium text-gray-600">Peso Bruto Total</span>
                      </div>
                      <p className="text-xl font-bold">{formData.pesoBrutoTotal || "0"} kg</p>
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
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="lg">
                Registrar Lote
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Batch List */}
      <Card>
        <CardHeader>
          <CardTitle>Lotes de Materia Prima</CardTitle>
          <CardDescription>Historial de ingresos registrados</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingLotes ? (
            <div className="text-center py-8 text-muted-foreground">Cargando lotes...</div>
          ) : lotes && lotes.length > 0 ? (
            <div className="space-y-2">
              {lotes.map((lote) => (
                <div key={lote.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{lote.codigo}</p>
                    <p className="text-sm text-gray-600">{lote.peso_bruto} kg | {lote.num_jabas} jabas</p>
                  </div>
                  <Badge>{lote.estado}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No hay lotes registrados aún</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
