import { LiquidationReceipt } from "@/components/liquidation-receipt"

export default function LiquidationPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <LiquidationReceipt liquidationId={Number.parseInt(params.id)} />
    </div>
  )
}
