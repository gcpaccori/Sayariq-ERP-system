"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Search, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

import { useApi } from "@/lib/hooks/use-api"
import { usePersonas } from "@/lib/hooks/use-personas"
import { lotesService } from "@/lib/services/lotes-service"
import { numeroService } from "@/lib/services/numero-service"
import { kardexAutomaticoService } from "@/lib/services/kardex-automatico-service"

export default function IngresoLotesCompleto() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProducer, setSelectedProducer] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [numeroLoteGenerado, setNumeroLoteGenerado] = useState("")
  const [numeroGuiaGenerado, setNumeroGuiaGenerado] = useState("")

  const [formData, setFormData] = useState({
    producto: "Espárragos Verdes",
    peso_inicial: "",
    numero_jabas: "",
    observaciones: "",
  })

  const { data: productores } = usePersonas()
  const { data: lotes, create: createLote } = useApi(lotesService, { initialLoad: true })

  const filteredProductores = (Array.isArray(productores) ? productores : [])
    .filter((p) =>
      p.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.documento_identidad?.includes(searchTerm)
    )
    .slice(0, 5)

  const handleGenerarNumeros = async () => {
    setLoading(true)
    try {
      const lote = await numeroService.generarNumeroLote()
      const guia = await numeroService.generarNumeroGuia()
      setNumeroLoteGenerado(lote)
      setNumeroGuiaGenerado(guia)
      console.log("[v0] Números generados:", { lote, guia })
    } catch (error) {
      console.error("[v0] Error generando números:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedProducer || !formData.peso_inicial || !formData.numero_jabas) {
      alert("Por favor complete todos los campos obligatorios")
      return
    }

    if (!numeroLoteGenerado || !numeroGuiaGenerado) {
      alert("Debe generar los números de lote y guía primero")
      return
    }

    setLoading(true)
    try {
      // Crear el lote
      const nuevoLote = await createLote({
        numero_lote: numeroLoteGenerado,
        guia_ingreso: numeroGuiaGenerado,
        productor_id: selectedProducer.id,
        producto: formData.producto,
        fecha_ingreso: new Date().toISOString().split("T")[0],
        peso_inicial: Number.parseFloat(formData.peso_inicial),
        numero_jabas: Number.parseInt(formData.numero_jabas),
        estado: "pendiente",
        observaciones: formData.observaciones,
      })

      alert(`Lote registrado exitosamente!\nN° Lote: ${numeroLoteGenerado}\nN° Guía: ${numeroGuiaGenerado}`)

      // Limpiar formulario
      setFormData({
        producto: "Espárragos Verdes",
        peso_inicial: "",
        numero_jabas: "",
        observaciones: "",
      })
      setSelectedProducer(null)
      setSearchTerm("")
      setNumeroLoteGenerado("")
      setNumeroGuiaGenerado("")
    } catch (error) {
      console.error("[v0] Error:", error)
      alert("Error al registrar el lote")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ingreso de Materia Prima</h1>
        <p className="text-gray-600 mt-1">Registro de lotes con números auto-generados y kardex automático</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Seleccionar Productor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Input
                  placeholder="Buscar por nombre o documento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {filteredProductores.length > 0 && (
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {filteredProductores.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 hover:bg-gray-100 cursor-pointer border-b"
                      onClick={() => {
                        setSelectedProducer(p)
                        setSearchTerm(p.nombre_completo)
                      }}
                    >
                      <p className="font-medium">{p.nombre_completo}</p>
                      <p className="text-sm text-gray-600">{p.documento_identidad}</p>
                    </div>
                  ))}
                </div>
              )}

              {selectedProducer && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Productor seleccionado</span>
                  </div>
                  <p className="text-sm font-medium">{selectedProducer.nombre_completo}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Información del Lote</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Producto</Label>
                <Select value={formData.producto} onValueChange={(v) => setFormData({ ...formData, producto: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Espárragos Verdes">Espárragos Verdes</SelectItem>
                    <SelectItem value="Espárragos Blancos">Espárragos Blancos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Peso Inicial (kg) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.peso_inicial}
                  onChange={(e) => setFormData({ ...formData, peso_inicial: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>Número de Jabas *</Label>
                <Input
                  type="number"
                  value={formData.numero_jabas}
                  onChange={(e) => setFormData({ ...formData, numero_jabas: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label>Observaciones</Label>
                <Textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  placeholder="Observaciones del lote..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                Generación de Números
              </CardTitle>
              <CardDescription>Auto-incremento del sistema SAYARIQ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {numeroLoteGenerado && (
                <div className="p-4 bg-white rounded-lg border-2 border-green-500">
                  <p className="text-sm text-gray-600 mb-1">N° Lote</p>
                  <p className="text-2xl font-bold text-green-600">{numeroLoteGenerado}</p>
                </div>
              )}

              {numeroGuiaGenerado && (
                <div className="p-4 bg-white rounded-lg border-2 border-green-500">
                  <p className="text-sm text-gray-600 mb-1">N° Guía de Ingreso</p>
                  <p className="text-2xl font-bold text-green-600">{numeroGuiaGenerado}</p>
                </div>
              )}

              {!numeroLoteGenerado && (
                <Button
                  onClick={handleGenerarNumeros}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Generar Números de Lote y Guía
                    </>
                  )}
                </Button>
              )}

              {numeroLoteGenerado && (
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Registrar Lote Completo
                    </>
                  )}
                </Button>
              )}

              {numeroLoteGenerado && (
                <Alert className="bg-green-100 border-green-300">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Números generados correctamente. El kardex se actualizará automáticamente al clasificar.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Últimos Lotes Ingresados</CardTitle>
            </CardHeader>
            <CardContent>
              {lotes.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hay lotes registrados</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° Lote</TableHead>
                      <TableHead>Guía</TableHead>
                      <TableHead>Productor</TableHead>
                      <TableHead>Peso</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotes.slice(0, 5).map((lote) => (
                      <TableRow key={lote.id}>
                        <TableCell className="font-medium">{lote.numero_lote}</TableCell>
                        <TableCell>{lote.guia_ingreso}</TableCell>
                        <TableCell className="text-sm">{lote.productor_id}</TableCell>
                        <TableCell>{lote.peso_inicial} kg</TableCell>
                        <TableCell>
                          <Badge variant={lote.estado === "pendiente" ? "default" : "secondary"}>
                            {lote.estado}
                          </Badge>
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
