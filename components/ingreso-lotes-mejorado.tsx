"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, Plus, Package, Calculator, DollarSign, Scale, Eye, Info, CheckCircle } from "lucide-react"

import { usePersonas } from "@/lib/hooks/use-personas"
import { useApi } from "@/lib/hooks/use-api"
import { lotesService } from "@/lib/services/lotes-service"

// Configuración de productos específicos
const productosConfig = {
  "jengibre-comun": {
    nombre: "Jengibre Común",
    categorias: ["Exportación", "Industrial", "Jugo"],
    icono: "🫚",
  },
  "jengibre-chino": {
    nombre: "Jengibre Chino",
    categorias: ["Chino"],
    icono: "🇨🇳",
  },
  curcuma: {
    nombre: "Cúrcuma",
    categorias: ["Cúrcuma"],
    icono: "🟡",
  },
}

export default function IngresoLotesMejorado() {
  // Estados para el formulario
  const [searchTerm, setSearchTerm] = useState("")
  const [showResults, setShowResults] = useState(false)
  const [selectedProveedor, setSelectedProveedor] = useState<any>(null)
  const [showNewProveedorForm, setShowNewProveedorForm] = useState(false)
  const [newProveedor, setNewProveedor] = useState({
    nombres: "",
    apellidos: "",
    documento: "",
    telefono: "",
    direccion: "",
    tipo: "",
  })

  // Estados para los datos del lote
  const [formData, setFormData] = useState({
    producto: "",
    categoria: "",
    numeroJabas: "",
    pesoBrutoTotal: "",
    precioKg: "",
    modalidad: "",
    origen: "",
    transportista: "",
    placa: "",
    observaciones: "",
  })

  const { data: proveedores, loading: loadingProveedores } = usePersonas()
  const { data: lotes, loading: loadingLotes, create: createLote } = useApi(lotesService, { initialLoad: true })

  // Filtrar proveedores basado en la búsqueda
  const filteredProveedores = useMemo(() => {
    if (!searchTerm.trim()) return []

    const filtered = (Array.isArray(proveedores) ? proveedores : []).filter(
      (proveedor) =>
        proveedor.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proveedor.documento_identidad?.includes(searchTerm),
    )

    return filtered.slice(0, 5)
  }, [searchTerm, proveedores])

  // Obtener categorías disponibles según el producto seleccionado
  const categoriasDisponibles = useMemo(() => {
    if (!formData.producto) return []
    return productosConfig[formData.producto as keyof typeof productosConfig]?.categorias || []
  }, [formData.producto])

  // Cálculos automáticos
  const calculations = useMemo(() => {
    const jabas = Number.parseFloat(formData.numeroJabas) || 0
    const peso = Number.parseFloat(formData.pesoBrutoTotal) || 0
    const precio = Number.parseFloat(formData.precioKg) || 0

    const pesoPromedioPorJaba = jabas > 0 ? peso / jabas : 0
    const valorTotal = peso * precio
    const valorPorJaba = jabas > 0 ? valorTotal / jabas : 0

    return {
      pesoPromedioPorJaba: pesoPromedioPorJaba.toFixed(2),
      valorTotal: valorTotal.toFixed(2),
      valorPorJaba: valorPorJaba.toFixed(2),
    }
  }, [formData.numeroJabas, formData.pesoBrutoTotal, formData.precioKg])

  // Manejar selección de proveedor
  const handleSelectProveedor = (proveedor: any) => {
    setSelectedProveedor(proveedor)
    setSearchTerm(proveedor.nombre_completo || "")
    setShowResults(false)
  }

  // Manejar cambios en el formulario
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value }

      // Si cambia el producto, resetear la categoría
      if (field === "producto") {
        newData.categoria = ""
      }

      return newData
    })
  }

  // Registrar nuevo lote
  const handleSubmitLote = async () => {
    if (
      !selectedProveedor ||
      !formData.producto ||
      !formData.categoria ||
      !formData.numeroJabas ||
      !formData.pesoBrutoTotal
    ) {
      alert("Por favor complete todos los campos obligatorios")
      return
    }

    try {
      await createLote({
        codigo: formData.numeroJabas.toString(),
        productor_id: selectedProveedor.id,
        producto: formData.producto,
        categoria: formData.categoria,
        numero_jabas: Number.parseInt(formData.numeroJabas),
        peso_bruto: Number.parseFloat(formData.pesoBrutoTotal),
        peso_neto: Number.parseFloat(formData.pesoBrutoTotal),
        precio_kg: Number.parseFloat(formData.precioKg) || 0,
        fecha_recepcion: new Date().toISOString().split("T")[0],
        estado: "pendiente",
        observaciones: formData.observaciones,
      })

      alert("Lote registrado exitosamente")

      // Limpiar formulario
      setFormData({
        producto: "",
        categoria: "",
        numeroJabas: "",
        pesoBrutoTotal: "",
        precioKg: "",
        modalidad: "",
        origen: "",
        transportista: "",
        placa: "",
        observaciones: "",
      })
      setSelectedProveedor(null)
      setSearchTerm("")
    } catch (error) {
      console.error("Error al registrar lote:", error)
      alert("Error al registrar el lote")
    }
  }

  // Crear nuevo proveedor
  const handleCreateProveedor = async () => {
    // Implementación para crear nuevo proveedor
  }

  // Obtener nombre del producto para mostrar
  const getProductoNombre = (productoKey: string) => {
    return productosConfig[productoKey as keyof typeof productosConfig]?.nombre || productoKey
  }

  // Obtener icono del producto
  const getProductoIcono = (productoKey: string) => {
    return productosConfig[productoKey as keyof typeof productosConfig]?.icono || "📦"
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ingreso de Lotes Mejorado</h1>
          <p className="text-gray-600 mt-1">Sistema especializado para jengibre y cúrcuma con cálculos automáticos</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🫚</span>
          <span className="text-2xl">🟡</span>
          <Calculator className="h-8 w-8 text-blue-600" />
        </div>
      </div>

      <Tabs defaultValue="nuevo-lote" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="nuevo-lote" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Lote
          </TabsTrigger>
          <TabsTrigger value="lista-lotes" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Lista de Lotes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nuevo-lote" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulario Principal */}
            <div className="space-y-6">
              {/* Búsqueda de Proveedor */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Búsqueda de Proveedor
                  </CardTitle>
                  <CardDescription>Busque por nombre, apellido o documento</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="🔍 Buscar proveedor..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setShowResults(e.target.value.length > 0)
                      }}
                      className="pl-10"
                    />
                  </div>

                  {/* Resultados de búsqueda */}
                  {showResults && filteredProveedores.length > 0 && (
                    <div className="border rounded-lg bg-white shadow-sm max-h-48 overflow-y-auto">
                      {filteredProveedores.map((proveedor) => (
                        <div
                          key={proveedor.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                          onClick={() => handleSelectProveedor(proveedor)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{proveedor.nombre_completo}</p>
                              <p className="text-sm text-gray-500">
                                📄 Doc: {proveedor.documento_identidad} • 📞 {proveedor.telefono}
                              </p>
                            </div>
                            <Badge variant="outline">{proveedor.tipo_persona || "Persona"}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedProveedor && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800">Proveedor Seleccionado</span>
                      </div>
                      <p className="text-sm font-medium">✅ {selectedProveedor.nombre_completo}</p>
                      <p className="text-xs text-gray-600">
                        📄 Doc: {selectedProveedor.documento_identidad} | 📞 Tel: {selectedProveedor.telefono}
                      </p>
                    </div>
                  )}

                  {/* Opción para crear nuevo proveedor */}
                  {showResults && filteredProveedores.length === 0 && searchTerm.length > 0 && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 mb-2">No se encontraron proveedores</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowNewProveedorForm(true)}
                        className="text-blue-600 border-blue-300"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Crear Nuevo Proveedor
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Información del Lote */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Información del Lote
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="producto">Producto *</Label>
                      <Select value={formData.producto} onValueChange={(value) => handleInputChange("producto", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(productosConfig).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              {config.icono} {config.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="categoria">Categoría *</Label>
                      <Select
                        value={formData.categoria}
                        onValueChange={(value) => handleInputChange("categoria", value)}
                        disabled={!formData.producto}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoriasDisponibles.map((categoria) => (
                            <SelectItem key={categoria} value={categoria}>
                              {categoria}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="modalidad">Modalidad *</Label>
                      <Select
                        value={formData.modalidad}
                        onValueChange={(value) => handleInputChange("modalidad", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar modalidad" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Carga Cerrada">💰 Carga Cerrada</SelectItem>
                          <SelectItem value="Por Proceso">⏳ Por Proceso</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="precioKg">Precio por Kg (S/)</Label>
                      <Input
                        id="precioKg"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.precioKg}
                        onChange={(e) => handleInputChange("precioKg", e.target.value)}
                        disabled={formData.modalidad === "Por Proceso"}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="numeroJabas">Número de Jabas *</Label>
                      <Input
                        id="numeroJabas"
                        type="number"
                        placeholder="0"
                        value={formData.numeroJabas}
                        onChange={(e) => handleInputChange("numeroJabas", e.target.value)}
                        className="border-blue-200 focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pesoBrutoTotal">Peso Bruto Total (kg) *</Label>
                      <Input
                        id="pesoBrutoTotal"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.pesoBrutoTotal}
                        onChange={(e) => handleInputChange("pesoBrutoTotal", e.target.value)}
                        className="border-blue-200 focus:border-blue-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="origen">Origen/Procedencia</Label>
                      <Input
                        id="origen"
                        placeholder="Ej: Fundo San José, Tingo María"
                        value={formData.origen}
                        onChange={(e) => handleInputChange("origen", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="transportista">Transportista</Label>
                      <Input
                        id="transportista"
                        placeholder="Nombre del transportista"
                        value={formData.transportista}
                        onChange={(e) => handleInputChange("transportista", e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="placa">Placa del Vehículo</Label>
                    <Input
                      id="placa"
                      placeholder="ABC-123"
                      value={formData.placa}
                      onChange={(e) => handleInputChange("placa", e.target.value.toUpperCase())}
                    />
                  </div>

                  <div>
                    <Label htmlFor="observaciones">Observaciones</Label>
                    <Textarea
                      id="observaciones"
                      placeholder="Observaciones adicionales sobre el lote..."
                      value={formData.observaciones}
                      onChange={(e) => handleInputChange("observaciones", e.target.value)}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Panel de Cálculos */}
            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <Calculator className="h-5 w-5" />🧮 Cálculos Automáticos
                  </CardTitle>
                  <CardDescription className="text-blue-600">Valores calculados en tiempo real</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Datos Base */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-lg border">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-600">📦 Número de Jabas</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{formData.numeroJabas || "0"}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <div className="flex items-center gap-2 mb-1">
                        <Scale className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-600">⚖️ Peso Bruto Total</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{formData.pesoBrutoTotal || "0"} kg</p>
                    </div>
                  </div>

                  {/* Peso Promedio por Jaba */}
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">📏 Peso Promedio por Jaba</span>
                    </div>
                    <p className="text-xl font-bold text-blue-800">{calculations.pesoPromedioPorJaba} kg</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.pesoBrutoTotal && formData.numeroJabas
                        ? `${formData.pesoBrutoTotal} kg ÷ ${formData.numeroJabas} jabas`
                        : "Ingrese peso y número de jabas"}
                    </p>
                  </div>

                  {/* Cálculos Financieros para Carga Cerrada */}
                  {formData.modalidad === "Carga Cerrada" && (
                    <>
                      <div className="bg-white p-4 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-600">💵 Precio por Kilogramo</span>
                        </div>
                        <p className="text-xl font-bold text-green-800">S/ {formData.precioKg || "0.00"}</p>
                      </div>

                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Calculator className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-600">💎 Valor Total del Lote</span>
                        </div>
                        <p className="text-3xl font-bold text-green-800">S/ {calculations.valorTotal}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          {formData.pesoBrutoTotal && formData.precioKg
                            ? `${formData.pesoBrutoTotal} kg × S/ ${formData.precioKg}`
                            : "Ingrese peso y precio"}
                        </p>
                      </div>

                      <div className="bg-white p-4 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4 text-purple-600" />
                          <span className="text-sm font-medium text-purple-600">📦 Valor por Jaba</span>
                        </div>
                        <p className="text-xl font-bold text-purple-800">S/ {calculations.valorPorJaba}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {calculations.valorTotal !== "0.00" && formData.numeroJabas
                            ? `S/ ${calculations.valorTotal} ÷ ${formData.numeroJabas} jabas`
                            : "Calculado automáticamente"}
                        </p>
                      </div>

                      {/* Resumen Final */}
                      <div className="bg-gradient-to-r from-blue-100 to-green-100 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">📊 Resumen del Lote</h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{formData.numeroJabas || "0"}</div>
                            <div className="text-gray-600">Jabas</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{formData.pesoBrutoTotal || "0"}</div>
                            <div className="text-gray-600">Kg Total</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">S/ {calculations.valorTotal}</div>
                            <div className="text-gray-600">Valor Total</div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Alerta para modalidad Por Proceso */}
                  {formData.modalidad === "Por Proceso" && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        ⏳ Para modalidad "Por Proceso", el valor se calculará después del procesamiento según los
                        rendimientos obtenidos en cada categoría.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Información del producto seleccionado */}
                  {formData.producto && (
                    <div className="bg-white p-4 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{getProductoIcono(formData.producto)}</span>
                        <span className="font-medium text-orange-800">{getProductoNombre(formData.producto)}</span>
                        {formData.categoria && (
                          <Badge variant="outline" className="text-orange-600 border-orange-300">
                            {formData.categoria}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Botón de registro */}
              <Button
                onClick={handleSubmitLote}
                className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
                disabled={
                  !selectedProveedor ||
                  !formData.producto ||
                  !formData.categoria ||
                  !formData.numeroJabas ||
                  !formData.pesoBrutoTotal
                }
              >
                <Plus className="h-5 w-5 mr-2" />
                Registrar Lote
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="lista-lotes">
          <Card>
            <CardHeader>
              <CardTitle>Lotes Registrados</CardTitle>
              <CardDescription>Lista completa de lotes de jengibre y cúrcuma ingresados al sistema</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLotes ? (
                <div className="text-center py-4">Cargando lotes...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Jabas</TableHead>
                      <TableHead>Peso (kg)</TableHead>
                      <TableHead>Precio/kg</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Modalidad</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-4">
                          No hay lotes registrados
                        </TableCell>
                      </TableRow>
                    ) : (
                      lotes.map((lote) => (
                        <TableRow key={lote.id}>
                          <TableCell className="font-medium">{lote.id}</TableCell>
                          <TableCell>{lote.proveedor}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{getProductoIcono(lote.producto)}</span>
                              <span>{getProductoNombre(lote.producto)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{lote.categoria}</Badge>
                          </TableCell>
                          <TableCell className="text-center">{lote.numero_jabas}</TableCell>
                          <TableCell className="text-right">{lote.peso_bruto} kg</TableCell>
                          <TableCell className="text-right">S/ {lote.precio_kg.toFixed(2)}</TableCell>
                          <TableCell className="font-medium text-right">
                            {lote.modalidad === "Carga Cerrada" ? (
                              <span className="text-green-600">S/ {(lote.peso_bruto * lote.precio_kg).toFixed(2)}</span>
                            ) : (
                              <span className="text-gray-500">Por calcular</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={lote.modalidad === "Carga Cerrada" ? "default" : "secondary"}>
                              {lote.modalidad}
                            </Badge>
                          </TableCell>
                          <TableCell>{lote.fecha_recepcion}</TableCell>
                          <TableCell>
                            <Badge variant={lote.estado === "pendiente" ? "default" : "secondary"}>{lote.estado}</Badge>
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Detalle del Lote {lote.id}</DialogTitle>
                                  <DialogDescription>Información completa del lote registrado</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Proveedor</Label>
                                      <p className="font-medium">{lote.proveedor}</p>
                                    </div>
                                    <div>
                                      <Label>Producto</Label>
                                      <p className="font-medium flex items-center gap-2">
                                        <span>{getProductoIcono(lote.producto)}</span>
                                        {getProductoNombre(lote.producto)} - {lote.categoria}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-4">
                                    <div>
                                      <Label>Jabas</Label>
                                      <p className="font-medium">{lote.numero_jabas}</p>
                                    </div>
                                    <div>
                                      <Label>Peso Total</Label>
                                      <p className="font-medium">{lote.peso_bruto} kg</p>
                                    </div>
                                    <div>
                                      <Label>Peso/Jaba</Label>
                                      <p className="font-medium">
                                        {(lote.peso_bruto / lote.numero_jabas).toFixed(2)} kg
                                      </p>
                                    </div>
                                  </div>
                                  {lote.modalidad === "Carga Cerrada" && (
                                    <div className="grid grid-cols-3 gap-4">
                                      <div>
                                        <Label>Precio por kg</Label>
                                        <p className="font-medium">S/ {lote.precio_kg.toFixed(2)}</p>
                                      </div>
                                      <div>
                                        <Label>Valor Total</Label>
                                        <p className="font-bold text-green-600">
                                          S/ {(lote.peso_bruto * lote.precio_kg).toFixed(2)}
                                        </p>
                                      </div>
                                      <div>
                                        <Label>Valor por Jaba</Label>
                                        <p className="font-medium">
                                          S/ {((lote.peso_bruto * lote.precio_kg) / lote.numero_jabas).toFixed(2)}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal para crear nuevo proveedor */}
      <Dialog open={showNewProveedorForm} onOpenChange={setShowNewProveedorForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>➕ Crear Nuevo Proveedor</DialogTitle>
            <DialogDescription>Complete la información del nuevo proveedor</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nombres">Nombres *</Label>
                <Input
                  id="nombres"
                  value={newProveedor.nombres}
                  onChange={(e) => setNewProveedor((prev) => ({ ...prev, nombres: e.target.value }))}
                  placeholder="Nombres del proveedor"
                  className="border-green-200 focus:border-green-400"
                />
              </div>
              <div>
                <Label htmlFor="apellidos">Apellidos *</Label>
                <Input
                  id="apellidos"
                  value={newProveedor.apellidos}
                  onChange={(e) => setNewProveedor((prev) => ({ ...prev, apellidos: e.target.value }))}
                  placeholder="Apellidos del proveedor"
                  className="border-green-200 focus:border-green-400"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="documento">Documento *</Label>
                <Input
                  id="documento"
                  value={newProveedor.documento}
                  onChange={(e) => setNewProveedor((prev) => ({ ...prev, documento: e.target.value }))}
                  placeholder="DNI o documento"
                  className="border-green-200 focus:border-green-400"
                />
              </div>
              <div>
                <Label htmlFor="telefono">Teléfono *</Label>
                <Input
                  id="telefono"
                  value={newProveedor.telefono}
                  onChange={(e) => setNewProveedor((prev) => ({ ...prev, telefono: e.target.value }))}
                  placeholder="Número de teléfono"
                  className="border-green-200 focus:border-green-400"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={newProveedor.direccion}
                onChange={(e) => setNewProveedor((prev) => ({ ...prev, direccion: e.target.value }))}
                placeholder="Dirección completa"
                className="border-green-200 focus:border-green-400"
              />
            </div>
            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                value={newProveedor.tipo}
                onValueChange={(value) => setNewProveedor((prev) => ({ ...prev, tipo: value }))}
              >
                <SelectTrigger className="border-green-200 focus:border-green-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Productor">👨‍🌾 Productor</SelectItem>
                  <SelectItem value="Acopiador">📦 Acopiador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleCreateProveedor} className="flex-1 bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Crear Proveedor
              </Button>
              <Button variant="outline" onClick={() => setShowNewProveedorForm(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
