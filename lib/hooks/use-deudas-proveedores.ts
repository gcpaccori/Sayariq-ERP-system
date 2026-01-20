import { useState, useEffect } from "react"
import { deudasProveedoresService, type ProveedorDeuda } from "@/lib/services/deudas-proveedores-service"
import { useToast } from "@/components/ui/use-toast"

export function useDeudasProveedores() {
  const { toast } = useToast()
  const [data, setData] = useState<ProveedorDeuda[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log("[v0] useDeudasProveedores: Loading data...")
      const response = await deudasProveedoresService.getAll()
      console.log("[v0] useDeudasProveedores: Data loaded", { count: response.length })
      setData(response)
    } catch (err: any) {
      const message = err.message || "Error loading deudas"
      console.error("[v0] useDeudasProveedores: Error", { message })
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
    data,
    loading,
    error,
    refresh: loadData,
  }
}
