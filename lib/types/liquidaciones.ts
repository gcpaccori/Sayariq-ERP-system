export interface Categoria {
  id: number
  nombre_categoria: string
  codigo?: string
  precio_unitario_kg: number
  descripcion?: string
  es_liquidable?: boolean
  estado: "activo" | "inactivo"
}

export interface DetalleLiquidacion {
  id?: number
  liquidacion_id?: number
  categoria_id: number
  nombre_categoria?: string
  categoria?: string // alias for nombre_categoria used by backend
  peso_categoria_original: number
  peso_ajustado: number
  precio_unitario: number
  subtotal: number
}

export interface Liquidacion {
  id: number
  numero_liquidacion?: string
  lote_id: number
  numero_lote?: string
  guia_ingreso?: string
  producto?: string
  productor_nombre?: string
  productor_dni?: string
  fecha_liquidacion: string
  peso_bruto?: number
  total_bruto_fruta: number
  costo_flete: number
  costo_cosecha: number
  costo_maquila: number
  descuento_jabas: number
  total_adelantos: number
  total_a_pagar: number
  estado?: string
  estado_pago: "PENDIENTE" | "PAGADO" | "ANULADO"
  observaciones?: string
  nombre_completo?: string
  documento_identidad?: string
  banco?: string
  cuenta_bancaria?: string
  peso_inicial?: number
  numero_jabas?: number
  detalles?: DetalleLiquidacionCompleto[]
  detalle_categorias?: DetalleLiquidacion[]
  created_at?: string
  updated_at?: string
}

export interface PesosLiquidacion {
  peso_bruto_total: number
  peso_exportable: number
  peso_industrial: number
  peso_descarte: number
  peso_nacional: number
  peso_jugo: number
  peso_primera: number
  peso_segunda: number
  peso_tercera: number
  peso_cuarta: number
  peso_quinta: number
  peso_dedos: number
}

export interface DatosLiquidacion {
  lote: {
    id: number
    numero_lote: string
    producto: string
    productor_id: number
    nombre_completo: string
    documento_identidad: string
    telefono?: string
    direccion?: string
    banco?: string
    cuenta_bancaria?: string
    peso_inicial: number
    numero_jabas: number
    fecha_ingreso: string
  }
  pesos: PesosLiquidacion
  // Pesos físicos registrados (referencia)
  pesos_registrados?: PesosLiquidacion
  categorias: Categoria[]
  adelantos: Array<{
    id: number
    monto: number
    fecha_adelanto: string
    motivo?: string
    estado: string
  }>
  numero_liquidacion: string
  fuente_datos?: "kardex" | "pesos_lote"
}

export interface NuevaLiquidacion {
  lote_id: number
  fecha_liquidacion?: string
  total_bruto_fruta: number
  costo_flete?: number
  costo_cosecha?: number
  costo_maquila?: number
  descuento_jabas?: number
  total_adelantos?: number
  total_a_pagar: number
  estado_pago?: "PENDIENTE" | "PAGADO" | "ANULADO"
  detalle_categorias?: Omit<DetalleLiquidacion, "id" | "liquidacion_id">[]
  adelantos_aplicados?: number[]
}

export interface CategoriaLiquidacion {
  id: number
  nombre_categoria: string
  descripcion: string
  precio_unitario_kg: number
  es_liquidable: boolean
  orden: number
}

export interface DatosParaLiquidacion {
  lote: {
    id: number
    numero_lote: string
    guia_ingreso: string
    productor_id: number
    producto: string
    fecha_ingreso: string
    fecha_proceso: string | null
    peso_inicial: number
    peso_neto: number | null
    numero_jabas: number
    estado: string
    estado_frescura: string
    observaciones: string | null
    productor_nombre: string
    productor_dni: string
  }
  pesos: PesosLiquidacion
  total_adelantos: number
  categorias: CategoriaLiquidacion[]
  tiene_stock_kardex: boolean
}

export interface DetalleLiquidacionCompleto {
  id: number
  liquidacion_id: number
  categoria_id: number
  categoria_nombre?: string
  peso_categoria_original: number
  peso_ajustado: number
  precio_unitario: number
  subtotal: number
  created_at?: string
}

export const CATEGORIAS_MAP: Record<string, { campo: keyof PesosLiquidacion; nombre: string }> = {
  exportable: { campo: "peso_exportable", nombre: "Exportable" },
  industrial: { campo: "peso_industrial", nombre: "Industrial" },
  descarte: { campo: "peso_descarte", nombre: "Descarte" },
  nacional: { campo: "peso_nacional", nombre: "Nacional" },
  jugo: { campo: "peso_jugo", nombre: "Jugo" },
  primera: { campo: "peso_primera", nombre: "Primera" },
  segunda: { campo: "peso_segunda", nombre: "Segunda" },
  tercera: { campo: "peso_tercera", nombre: "Tercera" },
  cuarta: { campo: "peso_cuarta", nombre: "Cuarta" },
  quinta: { campo: "peso_quinta", nombre: "Quinta" },
  dedos: { campo: "peso_dedos", nombre: "Dedos" },
}
