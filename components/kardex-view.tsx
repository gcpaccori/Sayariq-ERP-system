"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { kardexService } from "@/lib/services/kardex-service"
import type { MovimientoKardex } from "@/lib/types"

export function KardexView() {
  const [movimientos, setMovimientos] = useState<MovimientoKardex[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cargarMovimientos = async () => {
      try {
        const data = await kardexService.obtenerTodosLosMovimientos()
        setMovimientos(data)
      } catch (error) {
        console.error("Error al cargar kardex:", error)
      } finally {
        setLoading(false)
      }
    }

    cargarMovimientos()
  }, [])

  const getBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case "entrada":
        return "default"
      case "salida":
        return "destructive"
      case "ajuste":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kardex - Inventario de Lotes</CardTitle>
        <CardDescription>Histórico completo de movimientos de inventario</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4 text-muted-foreground">Cargando kardex...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Tipo Movimiento</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Cantidad (kg)</TableHead>
                <TableHead>Saldo (kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimientos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                    No hay movimientos registrados
                  </TableCell>
                </TableRow>
              ) : (
                movimientos.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell>{new Date(mov.fecha).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{mov.lote_codigo}</TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(mov.tipo)}>{mov.tipo}</Badge>
                    </TableCell>
                    <TableCell>{mov.concepto}</TableCell>
                    <TableCell className="text-right">{mov.cantidad.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">{mov.saldo.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
