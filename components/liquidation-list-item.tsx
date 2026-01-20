"use client"

import type { Liquidacion } from "@/lib/types/liquidaciones"
import { Button } from "@/components/ui/button"
import { Eye, FileText } from "lucide-react"
import Link from "next/link"

interface LiquidationListItemProps {
  liquidacion: Liquidacion
}

export function LiquidationListItem({ liquidacion }: LiquidationListItemProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value)
  }

  return (
    <tr>
      <td className="py-3 px-4 border-b border-gray-50">
        {new Date(liquidacion.fecha_liquidacion).toLocaleDateString("es-PE")}
      </td>
      <td className="py-3 px-4 border-b border-gray-50 font-medium">{liquidacion.numero_lote}</td>
      <td className="py-3 px-4 border-b border-gray-50">{liquidacion.nombre_completo}</td>
      <td className="py-3 px-4 border-b border-gray-50 text-right">
        {formatCurrency(Number(liquidacion.total_bruto_fruta))}
      </td>
      <td className="py-3 px-4 border-b border-gray-50 text-right text-red-600">
        -{formatCurrency(Number(liquidacion.total_adelantos))}
      </td>
      <td className="py-3 px-4 border-b border-gray-50 text-right font-bold">
        {formatCurrency(Number(liquidacion.total_a_pagar))}
      </td>
      <td className="py-3 px-4 border-b border-gray-50">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            liquidacion.estado_pago === "PAGADO"
              ? "bg-green-100 text-green-800"
              : liquidacion.estado_pago === "ANULADO"
                ? "bg-red-100 text-red-800"
                : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {liquidacion.estado_pago}
        </span>
      </td>
      <td className="py-3 px-4 border-b border-gray-50 space-x-2 flex">
        <Link href={`/liquidaciones/${liquidacion.id}`}>
          <Button variant="ghost" size="sm" className="gap-1">
            <FileText className="h-4 w-4" />
            Comprobante
          </Button>
        </Link>
        <Button variant="ghost" size="sm" className="gap-1">
          <Eye className="h-4 w-4" />
          Ver
        </Button>
      </td>
    </tr>
  )
}
