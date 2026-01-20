import { useApi } from "./use-api"
import { pedidosService } from "@/lib/services/pedidos-service"

export function usePedidos() {
  const { data: pedidos, loading, error, create, update, remove, refresh } = useApi(pedidosService)

  const getPedidosActivos = async () => {
    return await pedidosService.getPedidosActivos()
  }

  const getPedidosByEstado = async (estado: string) => {
    return await pedidosService.getPedidosByEstado(estado)
  }

  const generarCodigoPedido = async () => {
    return await pedidosService.generarCodigoPedido()
  }

  return {
    pedidos,
    loading,
    error,
    create,
    update,
    remove,
    refresh,
    getPedidosActivos,
    getPedidosByEstado,
    generarCodigoPedido,
  }
}
