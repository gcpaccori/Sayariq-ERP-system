// src/lib/services/pedidos-service.ts

import { ApiService } from "./api-service"
import { API_ENDPOINTS } from "@/lib/config/api"
import type { Pedido } from "@/lib/types"

/* =======================================
   Helpers
======================================= */
const toNumberSafe = (v: unknown, fallback = 0) => {
  if (v === null || v === undefined) return fallback
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback

  if (typeof v === "string") {
    let s = v.trim()
    if (!s) return fallback
    if (s.toLowerCase() === "nan") return fallback

    const hasDot = s.includes(".")
    const hasComma = s.includes(",")

    if (hasDot && hasComma) {
      if (s.lastIndexOf(".") > s.lastIndexOf(",")) s = s.replace(/,/g, "")
      else s = s.replace(/\./g, "").replace(/,/g, ".")
    } else if (hasComma && !hasDot) {
      s = s.replace(/,/g, ".")
    }

    s = s.replace(/[^0-9+\-eE.]/g, "")
    const n = Number(s)
    return Number.isFinite(n) ? n : fallback
  }

  return fallback
}

const asArray = (response: any): any[] => {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.rows)) return response.rows
  if (Array.isArray(response?.data?.data)) return response.data.data
  return []
}

/* =======================================
   Tipos auxiliares
======================================= */
export type LoteDisponibleDto = {
  lote_id: number
  numero_lote: string
  producto: string
  categoria_id: number
  categoria_nombre: string
  categoria_codigo: string
  saldo_disponible: number
  peso_original?: number
  total_asignado?: number
  estado_lote?: string
  estado_proceso?: string
  precio_kg?: number

  // ✅ extras
  fecha_ingreso?: string | null
  productor_nombre?: string | null
  productor_dni?: string | null
}

export type LoteAsignadoDto = {
  id: number
  pedido_id: number
  lote_id: number
  numero_lote: string
  producto: string
  categoria: string
  kg_asignado: number
  fecha_asignacion?: string | null

  // ✅ extras (igual que disponibles)
  productor_nombre?: string | null
  productor_dni?: string | null
  fecha_ingreso?: string | null
  estado_proceso?: string | null
  peso_original?: number
  saldo_disponible?: number
  total_asignado?: number
}

/* =======================================
   PEDIDOS SERVICE
======================================= */
class PedidosService {
  /* ========= CRUD PRINCIPAL ========= */
  async getAll(): Promise<Pedido[]> {
    console.log("[v0] PedidosService.getAll()")
    const response = await ApiService.get<any>(API_ENDPOINTS.PEDIDOS)

    const rows = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : []
    console.log("[v0] PedidosService.getAll() rows:", rows.length)

    return rows.map((pedido: any) => ({
      id: toNumberSafe(pedido.id),
      numero_pedido: pedido.numero_pedido || `PED-${pedido.id}`,
      codigo: pedido.numero_pedido || `PED-${pedido.id}`,
      cliente_id: toNumberSafe(pedido.cliente_id),
      cliente: pedido.cliente_nombre || `Cliente ${pedido.cliente_id}`,
      cliente_nombre: pedido.cliente_nombre,
      producto: pedido.producto || "Producto",
      categoria: pedido.categoria || "",
      kg_bruto: toNumberSafe(pedido.kg_bruto),
      porcentaje_humedad: toNumberSafe(pedido.porcentaje_humedad),
      kg_neto: toNumberSafe(pedido.kg_neto),
      precio: toNumberSafe(pedido.precio),
      total: toNumberSafe(pedido.total),
      fecha_pedido: pedido.fecha_pedido,
      estado: (pedido.estado as Pedido["estado"]) || "pendiente",
      observaciones: pedido.observaciones || "",
      created_at: pedido.created_at,
      updated_at: pedido.updated_at,
    }))
  }

  async getById(id: number): Promise<Pedido> {
    const response = await ApiService.get<any>(API_ENDPOINTS.PEDIDOS_BY_ID(id))

    return {
      id: toNumberSafe(response.id),
      numero_pedido: response.numero_pedido || `PED-${response.id}`,
      codigo: response.numero_pedido || response.codigo || `PED-${response.id}`,
      cliente_id: toNumberSafe(response.cliente_id),
      cliente: response.cliente_nombre || `Cliente ${response.cliente_id}`,
      cliente_nombre: response.cliente_nombre,
      producto: response.producto || "Producto",
      categoria: response.categoria || "",
      kg_bruto: toNumberSafe(response.kg_bruto),
      porcentaje_humedad: toNumberSafe(response.porcentaje_humedad),
      kg_neto: toNumberSafe(response.kg_neto),
      precio: toNumberSafe(response.precio),
      total: toNumberSafe(response.total),
      fecha_pedido: response.fecha_pedido,
      estado: (response.estado as Pedido["estado"]) || "pendiente",
      observaciones: response.observaciones || "",
      created_at: response.created_at,
      updated_at: response.updated_at,
    }
  }

  async create(data: Omit<Pedido, "id" | "created_at" | "updated_at">): Promise<Pedido> {
    const backendData = {
      numero_pedido: data.numero_pedido || data.codigo || `PED-${Date.now()}`,
      cliente_id: toNumberSafe(data.cliente_id),
      producto: data.producto,
      categoria: data.categoria || "",
      kg_bruto: toNumberSafe(data.kg_bruto),
      porcentaje_humedad: toNumberSafe(data.porcentaje_humedad),
      kg_neto: toNumberSafe(data.kg_neto),
      precio: toNumberSafe(data.precio),
      total: toNumberSafe(data.total, toNumberSafe(data.kg_neto) * toNumberSafe(data.precio)),
      fecha_pedido: data.fecha_pedido || new Date().toISOString().split("T")[0],
      estado: data.estado || "pendiente",
      observaciones: data.observaciones || "",
    }

    const response = await ApiService.post<any>(API_ENDPOINTS.PEDIDOS, backendData)
    return { ...backendData, ...response } as Pedido
  }

  async update(id: number, data: Partial<Omit<Pedido, "id" | "created_at" | "updated_at">>): Promise<Pedido> {
    const payload: any = { ...data }
    if (payload.kg_neto !== undefined && payload.precio !== undefined) {
      payload.total = toNumberSafe(payload.kg_neto) * toNumberSafe(payload.precio)
    }
    const response = await ApiService.put<any>(API_ENDPOINTS.PEDIDOS_BY_ID(id), payload)
    return { id, ...response } as Pedido
  }

  async delete(id: number): Promise<void> {
    await ApiService.delete(API_ENDPOINTS.PEDIDOS_BY_ID(id))
  }

  async updateEstado(id: number, estado: Pedido["estado"]): Promise<Pedido> {
    return this.update(id, { estado })
  }

  /* ========= LOTES ========= */

  async getLotesDisponibles(): Promise<LoteDisponibleDto[]> {
    console.log("[v0] PedidosService.getLotesDisponibles()")
    const response = await ApiService.get<any>("/pedidos/lotes-disponibles")
    const rows = asArray(response)

    if (!rows.length) {
      console.warn("[PedidosService] lotesDisponibles vacío o no array:", response)
      return []
    }

    return rows.map((row) => ({
      lote_id: toNumberSafe(row.lote_id ?? row.id),
      numero_lote: String(row.numero_lote ?? ""),
      producto: String(row.producto ?? ""),
      categoria_id: toNumberSafe(row.categoria_id),
      categoria_nombre: String(row.categoria_nombre ?? row.categoria ?? ""),
      categoria_codigo: String(row.categoria_codigo ?? ""),
      saldo_disponible: toNumberSafe(row.saldo_disponible),
      peso_original: toNumberSafe(row.peso_original),
      total_asignado: toNumberSafe(row.total_asignado),
      estado_lote: row.estado_lote ?? row.estado ?? undefined,
      estado_proceso: row.estado_proceso ?? undefined,
      precio_kg: toNumberSafe(row.precio_kg),

      // ✅ extras
      fecha_ingreso: row.fecha_ingreso ?? row.fechaIngreso ?? null,
      productor_nombre: row.productor_nombre ?? row.productorNombre ?? null,
      productor_dni: row.productor_dni ?? row.productorDni ?? null,
    }))
  }

  async getLotesPedido(pedidoId: number): Promise<LoteAsignadoDto[]> {
    console.log("[v0] PedidosService.getLotesPedido()", { pedidoId })
    const response = await ApiService.get<any>(`/pedidos/${pedidoId}/lotes`)
    const rows = asArray(response)

    if (!rows.length) {
      console.warn("[PedidosService] getLotesPedido vacío o no array:", response)
      return []
    }

    // ✅ CLAVE: NO BOTAR LOS CAMPOS EXTRA
    return rows.map((row) => ({
      id: toNumberSafe(row.id),
      pedido_id: toNumberSafe(row.pedido_id ?? pedidoId),
      lote_id: toNumberSafe(row.lote_id),
      numero_lote: String(row.numero_lote ?? ""),
      producto: String(row.producto ?? ""),
      categoria: String(row.categoria ?? row.categoria_nombre ?? row.categoria_codigo ?? ""),
      kg_asignado: toNumberSafe(row.kg_asignado ?? row.peso_asignado),
      fecha_asignacion: row.fecha_asignacion ?? null,

      // ✅ extras
      productor_nombre: row.productor_nombre ?? row.productorNombre ?? null,
      productor_dni: row.productor_dni ?? row.productorDni ?? null,
      fecha_ingreso: row.fecha_ingreso ?? row.fechaIngreso ?? null,
      estado_proceso: row.estado_proceso ?? null,
      peso_original: toNumberSafe(row.peso_original),
      saldo_disponible: toNumberSafe(row.saldo_disponible),
      total_asignado: toNumberSafe(row.total_asignado),
    }))
  }

  async asignarLote(payload: { pedido_id: number | string; lote_id: number | string; categoria: string; kg_asignado: number | string }) {
    const body = {
      pedido_id: String(payload.pedido_id),
      lote_id: toNumberSafe(payload.lote_id),
      categoria: payload.categoria,
      kg_asignado: toNumberSafe(payload.kg_asignado),
    }
    console.log("[v0] PedidosService.asignarLote()", body)
    return await ApiService.post("/pedidos/asignar-lote", body)
  }

  async quitarLote(payload: { pedido_id: number | string; lote_id: number | string; categoria?: string; id?: number }) {
    const body: any = {}
    if (payload.id) {
      body.id = toNumberSafe(payload.id)
    } else {
      body.pedido_id = String(payload.pedido_id)
      body.lote_id = toNumberSafe(payload.lote_id)
      if (payload.categoria) body.categoria = payload.categoria
    }
    console.log("[v0] PedidosService.quitarLote()", body)
    return await ApiService.post("/pedidos/quitar-lote", body)
  }
}

export const pedidosService = new PedidosService()
export default pedidosService
