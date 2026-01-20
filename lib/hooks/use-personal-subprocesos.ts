import { useState, useEffect } from "react"
import { personalSubprocesosService, type PlanificacionPersonal, type PersonalDisponible } from "@/lib/services/personal-subprocesos-service"
import { useToast } from "@/components/ui/use-toast"

export function usePersonalSubprocesos() {
  const { toast } = useToast()
  const [planificaciones, setPlanificaciones] = useState<PlanificacionPersonal[]>([])
  const [personalDisponible, setPersonalDisponible] = useState<PersonalDisponible[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log("[v0] usePersonalSubprocesos: Loading data...")
      const [planificacionesData, personalData] = await Promise.all([
        personalSubprocesosService.getPlanificaciones(),
        personalSubprocesosService.getPersonalDisponible(),
      ])
      console.log("[v0] usePersonalSubprocesos: Data loaded", { 
        planificaciones: planificacionesData.length, 
        personal: personalData.length 
      })
      setPlanificaciones(planificacionesData)
      setPersonalDisponible(personalData)
    } catch (err: any) {
      const message = err.message || "Error loading data"
      console.error("[v0] usePersonalSubprocesos: Error", { message })
      setError(message)
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return {
    planificaciones,
    personalDisponible,
    loading,
    error,
    refresh: loadData,
  }
}
