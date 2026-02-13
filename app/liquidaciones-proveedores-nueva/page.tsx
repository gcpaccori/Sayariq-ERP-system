import { LiquidacionProveedoresNueva } from "@/components/liquidacion-proveedores-nueva"

export default function LiquidacionProveedoresNuevaPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Liquidaciones de Proveedores</h1>
        <p className="text-muted-foreground">
          Sistema de liquidación de compras a proveedores con adelantos, crédito y contado
        </p>
      </div>
      <LiquidacionProveedoresNueva />
    </div>
  )
}
