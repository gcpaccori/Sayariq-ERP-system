export interface PesoLote {
  id: number
  lote_id: number
  fecha_procesamiento: string // Changed from fecha_pesado
  peso_inicial_almacen: number // Weight from warehouse

  // All 11 categories
  peso_exportable: number
  peso_industrial: number
  peso_nacional: number
  peso_jugo: number
  peso_descarte: number
  peso_primera: number
  peso_segunda: number
  peso_tercera: number
  peso_cuarta: number
  peso_quinta: number
  peso_dedos: number

  observaciones?: string
  created_at?: string

  // Joined data from lote
  numero_lote?: string
  producto?: string
  guia_ingreso?: string
  fecha_ingreso?: string // Date when batch entered warehouse
  lote_estado?: string
  estado_frescura?: string
  productor_nombre?: string
  productor_dni?: string
  num_jabas?: number

  // Calculated fields
  peso_total_clasificado?: number
  porcentaje_exportable?: number
  eficiencia_clasificacion?: number
}

export interface PesoLoteCreate {
  lote_id: number
  fecha_procesamiento: string
  peso_inicial_almacen: number
  peso_exportable: number
  peso_industrial: number
  peso_nacional: number
  peso_jugo: number
  peso_descarte: number
  peso_primera: number
  peso_segunda: number
  peso_tercera: number
  peso_cuarta: number
  peso_quinta: number
  peso_dedos: number
  observaciones?: string
}

export interface EstadisticasPeso {
  total_lotes_pesados: number
  total_registros_peso: number
  peso_bruto_total: number
  peso_exportable_total: number
  peso_industrial_total: number
  peso_descarte_total: number
  peso_bruto_promedio: number
  porcentaje_exportable_promedio: number
  porcentaje_industrial_promedio: number
  porcentaje_descarte_promedio: number
}

export interface ResumenLotePeso {
  lote_id: number
  numero_lote: string
  producto: string
  peso_inicial: number
  peso_neto: number
  productor_nombre: string
  total_pesadas: number
  peso_bruto_acumulado: number
  peso_exportable_acumulado: number
  peso_industrial_acumulado: number
  peso_descarte_acumulado: number
  primera_pesada: string
  ultima_pesada: string
}

// Category configuration with colors
export const CATEGORIAS_PESO = [
  {
    key: "peso_exportable",
    label: "Exportable",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
  {
    key: "peso_industrial",
    label: "Industrial",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  {
    key: "peso_nacional",
    label: "Nacional",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  {
    key: "peso_jugo",
    label: "Jugo",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  {
    key: "peso_descarte",
    label: "Descarte",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  {
    key: "peso_primera",
    label: "Primera",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  {
    key: "peso_segunda",
    label: "Segunda",
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
  },
  {
    key: "peso_tercera",
    label: "Tercera",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
  },
  {
    key: "peso_cuarta",
    label: "Cuarta",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  {
    key: "peso_quinta",
    label: "Quinta",
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
  },
  { key: "peso_dedos", label: "Dedos", color: "text-gray-600", bgColor: "bg-gray-50", borderColor: "border-gray-200" },
] as const

export type CategoriaKey = (typeof CATEGORIAS_PESO)[number]["key"]
