import { useApi } from "./use-api"
import { lotesService } from "@/lib/services/lotes-service"

export function useLotes() {
  const { data: lotes, loading, error, create, update, remove, refresh } = useApi(lotesService)

  const getLotesDisponibles = async () => {
    return await lotesService.getLotesDisponibles()
  }

  const getLotesByProductor = async (productorId: number) => {
    return await lotesService.getLotesByProductor(productorId)
  }

  const getLotesByEstado = async (estado: string) => {
    return await lotesService.getLotesByEstado(estado)
  }

  const generarCodigoLote = async () => {
    return await lotesService.generarCodigoLote()
  }

  return {
    lotes,
    loading,
    error,
    create,
    update,
    remove,
    refresh,
    getLotesDisponibles,
    getLotesByProductor,
    getLotesByEstado,
    generarCodigoLote,
  }
}
