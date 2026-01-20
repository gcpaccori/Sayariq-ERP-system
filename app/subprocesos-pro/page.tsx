import { Suspense } from "react"
import { SubprocesosPro } from "@/components/subprocesos-pro"

export default function SubprocesosProPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Control de Subprocesos Pro</h1>
        <p className="text-gray-600 mt-2">Gestión avanzada de subprocesos con control de personal y costos</p>
      </div>

      <Suspense fallback={<div>Cargando...</div>}>
        <SubprocesosPro />
      </Suspense>
    </div>
  )
}
