"use client"

import { forwardRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Receipt } from "lucide-react"

interface FacturaLiquidacionProps {
  liquidacion: {
    numero: string
    fecha: string
    productor: {
      nombre: string
      documento: string
      direccion: string
      telefono: string
    }
    detalles: Array<{
      producto: string
      cantidad: number
      precioUnitario: number
      subtotal: number
    }>
    montoTotal: number
    adelantos: number
    montoNeto: number
    observaciones?: string
  }
}

export const FacturaLiquidacion = forwardRef<HTMLDivElement, FacturaLiquidacionProps>(({ liquidacion }, ref) => {
  return (
    <div ref={ref} className="bg-white p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
            <Receipt className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-primary">SAYARIQ</h1>
            <p className="text-sm text-muted-foreground">Agronegocios</p>
          </div>
        </div>
        <h2 className="text-xl font-semibold mb-2">COMPROBANTE DE LIQUIDACIÓN</h2>
        <div className="flex justify-center gap-4 text-sm">
          <span>
            <strong>N°:</strong> {liquidacion.numero}
          </span>
          <span>
            <strong>Fecha:</strong> {liquidacion.fecha}
          </span>
        </div>
      </div>

      {/* Información del Productor */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Datos del Productor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p>
                <strong>Nombre:</strong> {liquidacion.productor.nombre}
              </p>
              <p>
                <strong>Documento:</strong> {liquidacion.productor.documento}
              </p>
            </div>
            <div>
              <p>
                <strong>Teléfono:</strong> {liquidacion.productor.telefono}
              </p>
              <p>
                <strong>Dirección:</strong> {liquidacion.productor.direccion}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detalle de Productos */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Detalle de Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Producto</th>
                  <th className="text-right py-2">Cantidad (kg)</th>
                  <th className="text-right py-2">Precio Unit. (S/)</th>
                  <th className="text-right py-2">Subtotal (S/)</th>
                </tr>
              </thead>
              <tbody>
                {liquidacion.detalles.map((detalle, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">{detalle.producto}</td>
                    <td className="text-right py-2">{detalle.cantidad.toLocaleString()}</td>
                    <td className="text-right py-2">{detalle.precioUnitario.toFixed(2)}</td>
                    <td className="text-right py-2">{detalle.subtotal.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Resumen de Montos */}
      <div className="flex justify-end mb-6">
        <div className="w-80">
          <div className="space-y-2 p-4 border rounded-lg">
            <div className="flex justify-between">
              <span>Monto Total:</span>
              <span className="font-semibold">S/ {liquidacion.montoTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-orange-600">
              <span>Adelantos:</span>
              <span className="font-semibold">- S/ {liquidacion.adelantos.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold text-green-600">
              <span>MONTO NETO:</span>
              <span>S/ {liquidacion.montoNeto.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Observaciones */}
      {liquidacion.observaciones && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{liquidacion.observaciones}</p>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground mt-8 pt-4 border-t">
        <p>Este documento es un comprobante de liquidación emitido por Sayariq Agronegocios</p>
        <p>RUC: 20123456789 | Dirección: Av. Principal 123, Lima, Perú</p>
        <p>Teléfono: (01) 234-5678 | Email: info@sayariq.com</p>
        <p>Fecha de impresión: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  )
})

FacturaLiquidacion.displayName = "FacturaLiquidacion"
