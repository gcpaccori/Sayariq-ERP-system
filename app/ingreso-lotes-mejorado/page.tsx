import { Suspense } from "react"
import IngresoLotesMejorado from "@/components/ingreso-lotes-mejorado"

export default function IngresoLotesMejoradoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<div>Cargando...</div>}>
        <IngresoLotesMejorado />
      </Suspense>
    </div>
  )
}
