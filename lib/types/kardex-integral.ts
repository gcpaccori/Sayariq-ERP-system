/**
 * =====================================================
 * TIPOS PARA KARDEX INTEGRAL
 * =====================================================
 */

export type TipoKardex = "fisico" | "financiero"
export type TipoMovimiento = "ingreso" | "egreso" | "salida"
export type DocumentoTipo = "liquidacion" | "venta" | "adelanto" | "pesaje" | "ajuste" | "pago"
export type CuentaTipo = "caja" | "banco" | "adelantos" | "ventas" | "produccion"
export type PersonaTipo = "productor" | "cliente" | "empleado" | "proveedor"

export interface MovimientoKardexIntegral {
  id: number
  fecha_movimiento: string
  tipo_kardex: TipoKardex
  tipo_movimiento: TipoMovimiento
  documento_tipo: DocumentoTipo
  documento_id: number | null
  documento_numero: string | null
  
  // Campos físicos
  lote_id: number | null
  categoria_id: number | null
  categoria_nombre: string | null
  peso_kg: number | null
  saldo_fisico_kg: number | null
  
  // Campos financieros
  cuenta_tipo: CuentaTipo | null
  monto: number | null
  saldo_financiero: number | null
  
  // Entidades
  persona_id: number | null
  persona_nombre: string | null
  persona_tipo: PersonaTipo | null
  
  // Detalles
  concepto: string
  observaciones: string | null
  usuario_registro: string | null
  created_at: string
  updated_at: string | null
}

export interface SaldoFisico {
  lote_id: number
  numero_lote: string
  lote_codigo: string
  producto: string
  producto_nombre: string
  categoria_id: number
  categoria_nombre: string
  total_ingresos: number
  total_salidas: number
  total_egresos: number
  saldo_actual: number
}

export interface SaldoFinanciero {
  cuenta_tipo: CuentaTipo
  cuenta_descripcion?: string | null
  total_ingresos: number
  total_egresos: number
  saldo_actual: number
}

export interface MovimientoPorProductor {
  persona_id: number
  persona_nombre: string
  tipo_kardex: TipoKardex
  tipo_movimiento: TipoMovimiento
  documento_tipo: DocumentoTipo
  cantidad_movimientos: number
  total_peso_kg: number
  total_monto: number
}

export interface ResumenPorDocumento {
  documento_tipo: DocumentoTipo
  documento_numero: string | null
  documento_id: number | null
  fecha_movimiento: string
  persona_nombre: string | null
  peso_total: number
  monto_total: number
}

export interface EstadoCuentaProductor {
  productor: {
    id: number
    nombre_completo: string
    documento_identidad: string
    telefono: string | null
    banco: string | null
    cuenta_bancaria: string | null
  }
  resumen: {
    total_peso_comprado_kg: number
    total_adelantos: number
    total_pagos: number
    saldo: number
  }
  movimientos_fisicos: MovimientoKardexIntegral[]
  movimientos_financieros: MovimientoKardexIntegral[]
}

export interface FlujoCaja {
  periodo: {
    desde: string
    hasta: string
  }
  resumen: {
    total_ingresos: number
    total_egresos: number
    flujo_neto: number
  }
  movimientos: {
    fecha: string
    cuenta_tipo: CuentaTipo
    tipo_movimiento: TipoMovimiento
    documento_tipo: DocumentoTipo
    total: number
  }[]
}

export interface ReporteInventario {
  resumen: {
    total_items: number
    peso_total_kg: number
    valor_total: number
  }
  inventario: {
    numero_lote: string
    producto: string
    productor_id: number
    productor_nombre: string
    categoria_nombre: string
    stock_kg: number
    precio_kg: number
    valor_inventario: number
  }[]
}

export interface RegistrarLiquidacion {
  liquidacion_id: number
  lote_id: number
  productor_id: number
  numero_liquidacion: string
  total_pagar: number
}

export interface RegistrarVenta {
  pedido_id: number
  lote_id: number
  cliente_id: number
  categoria_id: number
  peso_vendido: number
  monto_venta: number
}

export interface RegistrarAdelanto {
  adelanto_id: number
  productor_id: number
  monto: number
}

export interface RegistrarMovimientoManual {
  tipo_kardex: TipoKardex
  tipo_movimiento: TipoMovimiento
  documento_tipo: DocumentoTipo
  concepto: string
  fecha_movimiento?: string
  documento_id?: number
  documento_numero?: string
  observaciones?: string
  usuario_registro?: string
  
  // Si es físico
  lote_id?: number
  categoria_id?: number
  categoria_nombre?: string
  peso_kg?: number
  
  // Si es financiero
  cuenta_tipo?: CuentaTipo
  monto?: number
  
  // Opcional
  persona_id?: number
  persona_nombre?: string
  persona_tipo?: PersonaTipo
}

export interface FiltrosKardex {
  tipo_kardex?: TipoKardex
  tipo_movimiento?: TipoMovimiento
  documento_tipo?: DocumentoTipo
  lote_id?: number
  categoria_id?: number
  persona_id?: number
  fecha_desde?: string
  fecha_hasta?: string
  limit?: number
  offset?: number
}

export interface PaginacionKardex {
  total: number
  limit: number
  offset: number
  pages: number
}

export interface ResponseKardex<T> {
  success: boolean
  data?: T
  message?: string
  pagination?: PaginacionKardex
}

// Dashboard types
export interface DashboardKardex {
  resumen_fisico: {
    total_stock_kg: number
    total_lotes_activos: number
    total_categorias: number
    valor_inventario: number
  }
  resumen_financiero: {
    saldo_banco: number
    saldo_caja: number
    total_ventas_mes: number
    total_pagos_mes: number
    flujo_neto_mes: number
  }
  movimientos_recientes: MovimientoKardexIntegral[]
  alertas: {
    tipo: "info" | "warning" | "error"
    mensaje: string
    fecha: string
  }[]
  graficos: {
    movimientos_diarios: {
      fecha: string
      ingresos: number
      egresos: number
    }[]
    stock_por_categoria: {
      categoria: string
      peso: number
      valor: number
    }[]
    flujo_mensual: {
      mes: string
      ingresos: number
      egresos: number
      neto: number
    }[]
  }
}
