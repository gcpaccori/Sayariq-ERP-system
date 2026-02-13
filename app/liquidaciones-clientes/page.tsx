import { LiquidacionClientes } from "@/components/liquidacion-clientes"

export default function LiquidacionClientesPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Liquidaciones de Clientes</h1>
        <p className="text-muted-foreground">
          Sistema de liquidación de ventas a clientes
        </p>
      </div>
      <LiquidacionClientes />
    </div>
  )
}
