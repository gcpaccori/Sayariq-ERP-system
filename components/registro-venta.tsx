"use client"

import { useState } from "react"
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
import { kardexService } from "@/lib/services/kardex-service"
import { ventasService } from "@/lib/services/ventas-service"
import type { MovimientoKardex } from "@/lib/types"

interface KardexAgregado {
  categoria: string
  pesoTotal: number
  pesoDisponible: number
}

export function RegistroVenta() {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    producto: "",
    categoria: "exportable",
    kg: "",
    precio: "",
    cliente: "",
    observaciones: "",
  })
  const [registrando, setRegistrando] = useState(false)

  const { data: kardexData, loading: loadingKardex, refresh: refreshKardex } = useApi(kardexService, { initialLoad: true })

  // Aggregate movements by category
  const kardexAgregado: KardexAgregado[] = []
  ;(kardexData as MovimientoKardex[]).forEach((movimiento) => {
    let cat = kardexAgregado.find((k) => k.categoria === movimiento.concepto)
    if (!cat) {
      cat = {
        categoria: movimiento.concepto || "Sin categoría",
        pesoTotal: 0,
        pesoDisponible: 0,
      }
      kardexAgregado.push(cat)
    }
    if (movimiento.tipo === "entrada") {
      cat.pesoTotal += movimiento.cantidad
      cat.pesoDisponible += movimiento.cantidad
    } else if (movimiento.tipo === "salida") {
      cat.pesoDisponible -= movimiento.cantidad
    }
  })

  const totalKg = Number.parseFloat(formData.kg) || 0
  const precioUnitario = Number.parseFloat(formData.precio) || 0
  const total = totalKg * precioUnitario

  const kardexSeleccionado = kardexAgregado.find((k) => k.categoria === formData.categoria)
  const pesoDisponible = kardexSeleccionado?.pesoDisponible || 0

  const isFormValid =
    formData.producto &&
    formData.categoria &&
    totalKg > 0 &&
    precioUnitario > 0 &&
    formData.cliente &&
    totalKg <= pesoDisponible

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
      const codigoVenta = `VTA-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`

      await ventasService.create({
        codigo: codigoVenta,
        cliente: formData.cliente,
        fecha_venta: new Date().toISOString().split("T")[0],
        cantidad: totalKg,
        precio_unitario: precioUnitario,
        total,
        estado: "pendiente",
        observaciones: formData.observaciones,
      })

      toast({
        title: "Éxito",
        description: `Venta registrada: ${codigoVenta}`,
      })

      setFormData({
        producto: "",
        categoria: "exportable",
        kg: "",
        precio: "",
        cliente: "",
        observaciones: "",
      })

      refreshKardex()
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
          <p className="text-muted-foreground">Registrar ventas de productos a clientes</p>
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
                <Label>CLIENTE *</Label>
                <Input
                  placeholder="Nombre del cliente"
                  value={formData.cliente}
                  onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>PRODUCTO VENDIDO *</Label>
                <Input
                  placeholder="Nombre del producto"
                  value={formData.producto}
                  onChange={(e) => setFormData({ ...formData, producto: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>KG *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.kg}
                    onChange={(e) => setFormData({ ...formData, kg: e.target.value })}
                    max={pesoDisponible}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Disponible: {pesoDisponible.toFixed(2)} kg</p>
                </div>
                <div>
                  <Label>PRECIO (S/./kg) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>CATEGORÍA *</Label>
                <Select value={formData.categoria} onValueChange={(val) => setFormData({ ...formData, categoria: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exportable">Exportable</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                    <SelectItem value="descarte">Descarte</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>OBSERVACIONES</Label>
                <Textarea
                  placeholder="Observaciones..."
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="pt-4 border-t">
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
              <CardTitle>KARDEX</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingKardex ? (
                <div className="text-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                  Cargando kardex...
                </div>
              ) : kardexAgregado.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No hay movimientos en kardex</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CATEGORÍA</TableHead>
                      <TableHead className="text-right">PESO TOTAL</TableHead>
                      <TableHead className="text-right">PESO DISPONIBLE</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kardexAgregado.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.categoria}</TableCell>
                        <TableCell className="text-right">{item.pesoTotal.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          {item.pesoDisponible.toFixed(2)}
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
