"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  FileText,
  Printer,
  Download,
  Eye,
  Plus,
  Edit,
  CheckCircle,
  Clock,
  ChevronDown,
  Check,
  Receipt,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Productor {
  id: string
  nombre: string
  documento: string
  telefono: string
  direccion: string
  banco: string
  numeroCuenta: string
  cargasVendidas: number
  montoTotal: number
  adelantos: number
  saldoPendiente: number
}

interface Liquidacion {
  id: string
  numero: string
  productorId: string
  productorNombre: string
  fecha: string
  fechaVencimiento: string
  montoTotal: number
  adelantos: number
  montoNeto: number
  estado: "Borrador" | "Emitida" | "Pagada"
  observaciones: string
  metodoPago: string
  numeroComprobante?: string
  fechaPago?: string
}

interface DetalleLiquidacion {
  id: string
  producto: string
  cantidad: number
  precioUnitario: number
  calidad: string
  descuentos: number
  subtotal: number
}

const mockProductores: Productor[] = [
  {
    id: "1",
    nombre: "Juan Carlos Mendoza",
    documento: "12345678",
    telefono: "987654321",
    direccion: "Av. Los Productores 123, Lima",
    banco: "Banco de Crédito del Perú",
    numeroCuenta: "194-123456789-0-12",
    cargasVendidas: 15,
    montoTotal: 45000,
    adelantos: 12000,
    saldoPendiente: 33000,
  },
  {
    id: "2",
    nombre: "María Elena Quispe",
    documento: "87654321",
    telefono: "912345678",
    direccion: "Jr. San Martín 456, Huancayo",
    banco: "Banco Continental",
    numeroCuenta: "011-987654321-0-45",
    cargasVendidas: 8,
    montoTotal: 24000,
    adelantos: 8000,
    saldoPendiente: 16000,
  },
  {
    id: "3",
    nombre: "Carlos Alberto Rojas",
    documento: "11223344",
    telefono: "998877665",
    direccion: "Calle Los Andes 789, Cusco",
    banco: "Interbank",
    numeroCuenta: "898-445566778-0-89",
    cargasVendidas: 25,
    montoTotal: 75000,
    adelantos: 20000,
    saldoPendiente: 55000,
  },
]

const mockLiquidaciones: Liquidacion[] = [
  {
    id: "1",
    numero: "LIQ-2024-001",
    productorId: "1",
    productorNombre: "Juan Carlos Mendoza",
    fecha: "2024-01-20",
    fechaVencimiento: "2024-01-27",
    montoTotal: 45000,
    adelantos: 12000,
    montoNeto: 33000,
    estado: "Emitida",
    observaciones: "Liquidación correspondiente a cargas de enero",
    metodoPago: "Transferencia Bancaria",
  },
  {
    id: "2",
    numero: "LIQ-2024-002",
    productorId: "2",
    productorNombre: "María Elena Quispe",
    fecha: "2024-01-21",
    fechaVencimiento: "2024-01-28",
    montoTotal: 24000,
    adelantos: 8000,
    montoNeto: 16000,
    estado: "Pagada",
    observaciones: "Pago realizado por transferencia",
    metodoPago: "Transferencia Bancaria",
    numeroComprobante: "TRF-001234",
    fechaPago: "2024-01-22",
  },
]

const mockDetalleLiquidacion: DetalleLiquidacion[] = [
  {
    id: "1",
    producto: "Café Pergamino Premium",
    cantidad: 800,
    precioUnitario: 18.5,
    calidad: "Premium",
    descuentos: 500,
    subtotal: 14300,
  },
  {
    id: "2",
    producto: "Café Pergamino Estándar",
    cantidad: 1200,
    precioUnitario: 16.0,
    calidad: "Estándar",
    descuentos: 800,
    subtotal: 18400,
  },
]

export function LiquidacionesSayariq() {
  const [selectedProductor, setSelectedProductor] = useState<Productor | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [open, setOpen] = useState(false)
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>(mockLiquidaciones)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [selectedLiquidacion, setSelectedLiquidacion] = useState<Liquidacion | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const filteredProductores = mockProductores.filter(
    (productor) =>
      productor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      productor.documento.includes(searchTerm) ||
      productor.telefono.includes(searchTerm),
  )

  const handleCreateLiquidacion = () => {
    if (!selectedProductor) return

    const newLiquidacion: Liquidacion = {
      id: Date.now().toString(),
      numero: `LIQ-2024-${String(liquidaciones.length + 1).padStart(3, "0")}`,
      productorId: selectedProductor.id,
      productorNombre: selectedProductor.nombre,
      fecha: new Date().toISOString().split("T")[0],
      fechaVencimiento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      montoTotal: selectedProductor.montoTotal,
      adelantos: selectedProductor.adelantos,
      montoNeto: selectedProductor.saldoPendiente,
      estado: "Borrador",
      observaciones: "",
      metodoPago: "Transferencia Bancaria",
    }

    setLiquidaciones([...liquidaciones, newLiquidacion])
    setShowCreateDialog(false)
    setSelectedProductor(null)
  }

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML
      const originalContent = document.body.innerHTML
      document.body.innerHTML = printContent
      window.print()
      document.body.innerHTML = originalContent
      window.location.reload()
    }
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "Borrador":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Borrador
          </Badge>
        )
      case "Emitida":
        return (
          <Badge variant="default">
            <FileText className="w-3 h-3 mr-1" />
            Emitida
          </Badge>
        )
      case "Pagada":
        return (
          <Badge variant="destructive">
            <CheckCircle className="w-3 h-3 mr-1" />
            Pagada
          </Badge>
        )
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Liquidaciones Sayariq</h1>
          <p className="text-muted-foreground">Gestión profesional de liquidaciones y comprobantes de pago</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Liquidación
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Nueva Liquidación</DialogTitle>
              <DialogDescription>Selecciona un productor para crear su liquidación</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Buscar Productor</Label>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="w-full justify-between bg-transparent"
                    >
                      {selectedProductor ? selectedProductor.nombre : "Seleccionar productor..."}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput
                        placeholder="Buscar por nombre, documento o teléfono..."
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                      />
                      <CommandEmpty>No se encontraron productores.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {filteredProductores.map((productor) => (
                            <CommandItem
                              key={productor.id}
                              value={productor.id}
                              onSelect={() => {
                                setSelectedProductor(productor)
                                setOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedProductor?.id === productor.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <div className="flex-1">
                                <div className="font-medium">{productor.nombre}</div>
                                <div className="text-sm text-muted-foreground">
                                  {productor.documento} • Saldo: S/ {productor.saldoPendiente.toLocaleString()}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {selectedProductor && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold">Resumen de Liquidación</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Monto Total</div>
                      <div className="font-semibold">S/ {selectedProductor.montoTotal.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Adelantos</div>
                      <div className="font-semibold text-orange-600">
                        S/ {selectedProductor.adelantos.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Monto Neto</div>
                      <div className="font-semibold text-green-600">
                        S/ {selectedProductor.saldoPendiente.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Cargas</div>
                      <div className="font-semibold">{selectedProductor.cargasVendidas}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateLiquidacion} disabled={!selectedProductor}>
                  Crear Liquidación
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Liquidaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Liquidaciones Recientes</CardTitle>
          <CardDescription>Gestiona todas las liquidaciones emitidas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {liquidaciones.map((liquidacion) => (
              <div key={liquidacion.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="font-semibold">{liquidacion.numero}</div>
                    {getEstadoBadge(liquidacion.estado)}
                  </div>
                  <div className="text-sm text-muted-foreground mb-1">
                    <strong>{liquidacion.productorNombre}</strong>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Fecha: {liquidacion.fecha} • Vence: {liquidacion.fechaVencimiento}
                  </div>
                  {liquidacion.fechaPago && (
                    <div className="text-sm text-green-600">
                      Pagado: {liquidacion.fechaPago} • {liquidacion.numeroComprobante}
                    </div>
                  )}
                </div>
                <div className="text-right mr-4">
                  <div className="font-semibold text-lg">S/ {liquidacion.montoNeto.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Monto Neto</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedLiquidacion(liquidacion)
                      setShowDetailDialog(true)
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Detalle */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Liquidación</DialogTitle>
            <DialogDescription>
              {selectedLiquidacion?.numero} - {selectedLiquidacion?.productorNombre}
            </DialogDescription>
          </DialogHeader>

          {selectedLiquidacion && (
            <div className="space-y-6">
              {/* Comprobante de Liquidación */}
              <div ref={printRef} className="bg-white p-8 border rounded-lg">
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                      <Receipt className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-primary">SAYARIQ</h2>
                      <p className="text-sm text-muted-foreground">Agronegocios</p>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold">COMPROBANTE DE LIQUIDACIÓN</h3>
                  <p className="text-muted-foreground">{selectedLiquidacion.numero}</p>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h4 className="font-semibold mb-3">DATOS DEL PRODUCTOR</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Nombre:</strong> {selectedLiquidacion.productorNombre}
                      </div>
                      <div>
                        <strong>Documento:</strong>{" "}
                        {mockProductores.find((p) => p.id === selectedLiquidacion.productorId)?.documento}
                      </div>
                      <div>
                        <strong>Teléfono:</strong>{" "}
                        {mockProductores.find((p) => p.id === selectedLiquidacion.productorId)?.telefono}
                      </div>
                      <div>
                        <strong>Dirección:</strong>{" "}
                        {mockProductores.find((p) => p.id === selectedLiquidacion.productorId)?.direccion}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">DATOS DE LIQUIDACIÓN</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Fecha:</strong> {selectedLiquidacion.fecha}
                      </div>
                      <div>
                        <strong>Vencimiento:</strong> {selectedLiquidacion.fechaVencimiento}
                      </div>
                      <div>
                        <strong>Estado:</strong> {selectedLiquidacion.estado}
                      </div>
                      <div>
                        <strong>Método de Pago:</strong> {selectedLiquidacion.metodoPago}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h4 className="font-semibold mb-4">DETALLE DE PRODUCTOS</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3">Producto</th>
                          <th className="text-right p-3">Cantidad (kg)</th>
                          <th className="text-right p-3">Precio Unit.</th>
                          <th className="text-right p-3">Calidad</th>
                          <th className="text-right p-3">Descuentos</th>
                          <th className="text-right p-3">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockDetalleLiquidacion.map((detalle) => (
                          <tr key={detalle.id} className="border-t">
                            <td className="p-3">{detalle.producto}</td>
                            <td className="text-right p-3">{detalle.cantidad.toLocaleString()}</td>
                            <td className="text-right p-3">S/ {detalle.precioUnitario}</td>
                            <td className="text-right p-3">{detalle.calidad}</td>
                            <td className="text-right p-3">S/ {detalle.descuentos.toLocaleString()}</td>
                            <td className="text-right p-3 font-semibold">S/ {detalle.subtotal.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <div className="flex justify-end">
                    <div className="w-80 space-y-2">
                      <div className="flex justify-between">
                        <span>Monto Total:</span>
                        <span className="font-semibold">S/ {selectedLiquidacion.montoTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-orange-600">
                        <span>Adelantos:</span>
                        <span className="font-semibold">- S/ {selectedLiquidacion.adelantos.toLocaleString()}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold text-green-600">
                        <span>MONTO NETO A PAGAR:</span>
                        <span>S/ {selectedLiquidacion.montoNeto.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedLiquidacion.observaciones && (
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold mb-2">Observaciones:</h4>
                    <p className="text-sm">{selectedLiquidacion.observaciones}</p>
                  </div>
                )}

                <div className="mt-8 text-center text-xs text-muted-foreground">
                  <p>Este documento es un comprobante de liquidación emitido por Sayariq Agronegocios</p>
                  <p>Fecha de emisión: {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                  Cerrar
                </Button>
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir
                </Button>
                <Button>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
