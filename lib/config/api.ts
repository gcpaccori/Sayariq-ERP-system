export const API_CONFIG = {
  BASE_URL: "/api/proxy",
  TIMEOUT: 30000,
  HEADERS: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
} as const

export const API_ENDPOINTS = {
  // Lotes
  LOTES: "/lotes",
  LOTES_BY_ID: (id: string | number) => `/lotes/${id}`,

  // Personas
  PERSONAS: "/personas",
  PERSONAS_BY_ID: (id: string | number) => `/personas/${id}`,

  // Empleados
  EMPLEADOS: "/empleados",
  EMPLEADOS_BY_ID: (id: string | number) => `/empleados/${id}`,

  // Pedidos
  PEDIDOS: "/pedidos",
  PEDIDOS_BY_ID: (id: string | number) => `/pedidos/${id}`,

  // Análisis Lotes Pedidos
  ANALISIS_LOTES_PEDIDOS: "/analisis-lotes-pedidos",
  ANALISIS_LOTES_PEDIDOS_BY_ID: (id: string | number) => `/analisis-lotes-pedidos/${id}`,

  // Pesos
  PESOS: "/pesos",
  PESOS_BY_ID: (id: string | number) => `/pesos/${id}`,

  // Pesos Lote (New Module)
  PESOS_LOTE: "/pesos-lote",
  PESOS_LOTE_BY_ID: (id: string | number) => `/pesos-lote/${id}`,
  PESOS_LOTE_ESTADISTICAS: "/pesos-lote/estadisticas",
  PESOS_LOTE_RESUMEN_LOTE: (loteId: string | number) => `/pesos-lote/${loteId}/resumen-lote`,

  // Banco
  BANCO: "/banco",
  BANCO_BY_ID: (id: string | number) => `/banco/${id}`,

  // Kardex
  KARDEX: "/kardex",
  KARDEX_BY_ID: (id: string | number) => `/kardex/${id}`,

  // Ajuste Contable
  AJUSTE_CONTABLE: "/ajuste-contable",
  AJUSTE_CONTABLE_BY_ID: (id: string | number) => `/ajuste-contable/${id}`,

  // Pago Campo
  PAGO_CAMPO: "/pago-campo",
  PAGO_CAMPO_BY_ID: (id: string | number) => `/pago-campo/${id}`,

  // Ventas
  VENTAS: "/ventas",
  VENTAS_BY_ID: (id: string | number) => `/ventas/${id}`,

  // Costos Fijos
  COSTOS_FIJOS: "/costos-fijos",
  COSTOS_FIJOS_BY_ID: (id: string | number) => `/costos-fijos/${id}`,

  // Rentabilidad
  RENTABILIDAD: "/rentabilidad",
  RENTABILIDAD_BY_ID: (id: string | number) => `/rentabilidad/${id}`,

  // Adelantos
  ADELANTOS: "/adelantos",
  ADELANTOS_BY_ID: (id: string | number) => `/adelantos/${id}`,

  // Categorías
  CATEGORIAS: "/categorias",
  CATEGORIAS_BY_ID: (id: string | number) => `/categorias/${id}`,
  CATEGORIAS_ACTIVAS: "/categorias/activas",

  // Liquidaciones
  LIQUIDACIONES: "/liquidaciones",
  LIQUIDACIONES_BY_ID: (id: string | number) => `/liquidaciones/${id}`,

  LIQUIDACIONES_DATOS_LOTE: (loteId: string | number) => `/liquidaciones/datos-lote?lote_id=${loteId}`,
  LIQUIDACIONES_POR_PRODUCTOR: (productorId: string | number) =>
    `/liquidaciones/por-productor?productor_id=${productorId}`,
  LIQUIDACIONES_COMPROBANTE: (id: string | number) => `/liquidaciones/${id}/comprobante`,

  // Registro Pesos (old)
  REGISTRO_PESOS: "/registro-pesos",
  REGISTRO_PESOS_BY_ID: (id: string | number) => `/registro-pesos/${id}`,
  REGISTRO_PESOS_ESTADISTICAS: "/registro-pesos/estadisticas",
  REGISTRO_PESOS_RESUMEN_LOTE: (loteId: string | number) => `/registro-pesos/${loteId}/resumen-lote`,

  // Kardex Integral (NEW)
  KARDEX_INTEGRAL: "/kardex-integral",
  KARDEX_INTEGRAL_BY_ID: (id: string | number) => `/kardex-integral/${id}`,
  KARDEX_INTEGRAL_SALDOS_FISICO: "/kardex-integral/saldos/fisico",
  KARDEX_INTEGRAL_SALDOS_FINANCIERO: "/kardex-integral/saldos/financiero",
  KARDEX_INTEGRAL_POR_PRODUCTOR: (productorId: string | number) => `/kardex-integral/por-productor/${productorId}`,
  KARDEX_INTEGRAL_POR_DOCUMENTO: "/kardex-integral/por-documento",
  KARDEX_INTEGRAL_ESTADO_CUENTA: (productorId: string | number) => `/kardex-integral/reporte/estado-cuenta/${productorId}`,
  KARDEX_INTEGRAL_FLUJO_CAJA: "/kardex-integral/reporte/flujo-caja",
  KARDEX_INTEGRAL_INVENTARIO: "/kardex-integral/reporte/inventario",
  KARDEX_INTEGRAL_REGISTRAR_LIQUIDACION: "/kardex-integral/liquidacion",
  KARDEX_INTEGRAL_REGISTRAR_VENTA: "/kardex-integral/venta",
  KARDEX_INTEGRAL_REGISTRAR_ADELANTO: "/kardex-integral/adelanto",
  KARDEX_INTEGRAL_REGISTRAR_MANUAL: "/kardex-integral/manual",
} as const

export interface ApiRequestOptions {
  endpoint: string
  method?: "GET" | "POST" | "PUT" | "DELETE"
  data?: any
}

export async function apiRequest<T>(options: ApiRequestOptions): Promise<T> {
  const { endpoint, method = "GET", data } = options
  const url = `${API_CONFIG.BASE_URL}${endpoint}`

  const fetchOptions: RequestInit = {
    method,
    headers: API_CONFIG.HEADERS,
    signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
  }

  if (data && (method === "POST" || method === "PUT")) {
    fetchOptions.body = JSON.stringify(data)
  }

  try {
    const response = await fetch(url, fetchOptions)

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.message || `HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    // Handle different response formats
    if (result && typeof result === "object" && "success" in result && "data" in result) {
      return result.data as T
    }

    return result as T
  } catch (error) {
    console.error("[v0] API Request Error:", error)
    throw error
  }
}
