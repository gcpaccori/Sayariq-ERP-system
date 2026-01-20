export interface BaseEntity {
  id: number
  created_at?: string
  updated_at?: string
}

export interface Lote extends BaseEntity {
  codigo?: string
  numero_lote?: string // Added backend field name support
  productor_id: number
  productor_nombre?: string
  peso_bruto: number
  peso_neto: number
  peso_inicial?: number // Added alternative field name
  tara: number
  numero_jabas?: number // Added alternative field name
  num_jabas?: number
  fecha_ingreso: string
  producto?: string // Added product field
  estado: "pendiente" | "proceso" | "completado" | "entregado"
  precio_unitario?: number
  total?: number
  observaciones?: string
}

export interface Persona extends BaseEntity {
  tipo?: "productor" | "empleado" | "proveedor" | "cliente"
  tipo_persona?: string // Backend field name
  nombres: string
  apellidos: string
  nombre_completo?: string
  dni?: string
  numero_documento?: string
  documento_identidad?: string
  tipo_documento?: string
  telefono?: string
  direccion?: string
  email?: string
  banco?: string
  cuenta_bancaria?: string
  activo?: boolean
  roles?: string[]
  fecha_registro?: string
  fecha_nacimiento?: string
  observaciones?: string
  estado?: string
}

export interface Empleado extends BaseEntity {
  persona_id: number
  persona_nombre?: string
  nombres?: string
  apellidos?: string
  documento_identidad?: string
  dni?: string
  telefono?: string
  cargo: string
  area: "administrativo" | "campo" | "planta" | "ventas"
  sueldo?: number
  fecha_ingreso?: string
  fecha_salida?: string
  estado: "activo" | "inactivo"
  activo?: boolean
}

export interface Pedido extends BaseEntity {
  codigo?: string
  numero_pedido?: string
  cliente_id: number
  cliente?: string
  cliente_nombre?: string
  producto: string
  categoria?: string
  kg_bruto: number
  kg_neto: number
  porcentaje_humedad?: number
  precio: number
  total: number
  fecha_pedido: string
  fecha_entrega?: string
  estado: "pendiente" | "proceso" | "completado" | "cancelado"
  observaciones?: string
}

export interface Peso extends BaseEntity {
  lote_id: number
  lote_codigo?: string
  peso_bruto: number
  tara: number
  peso_neto: number
  fecha_registro: string
  num_jabas?: number
}

export interface TransaccionBanco extends BaseEntity {
  tipo: "ingreso" | "egreso"
  fecha: string
  operacion: string
  de_quien: string
  a_quien: string
  motivo: string
  rubro: string
  tipo_operacion: string
  numero_operacion: string
  comprobante: string
  deudor: string | number
  acreedor: string | number
  estado: "pendiente" | "proceso" | "cancelado" | "completado"
  agricultor?: string | null
}

export interface MovimientoKardex extends BaseEntity {
  lote_id: number
  lote_codigo?: string
  tipo: "entrada" | "salida" | "ajuste"
  cantidad: number
  saldo: number
  fecha: string
  concepto: string
  responsable?: string
}

export interface AjusteContable extends BaseEntity {
  fecha: string
  tipo: "ingreso" | "egreso"
  categoria: string
  monto: number
  descripcion: string
  referencia?: string
}

export interface RegistroPagoCampo extends BaseEntity {
  lote_id: number
  lote_codigo?: string
  productor_id: number
  productor_nombre?: string
  monto: number
  fecha_pago: string
  metodo_pago: "efectivo" | "transferencia" | "cheque"
  referencia?: string
  observaciones?: string
}

export interface VentaCliente extends BaseEntity {
  codigo: string
  cliente: string
  fecha_venta: string
  lote_id?: number
  cantidad: number
  precio_unitario: number
  total: number
  estado: "pendiente" | "pagado" | "cancelado"
  observaciones?: string
}

export interface CostoFijo extends BaseEntity {
  categoria: string
  descripcion: string
  monto: number
  frecuencia: "diario" | "semanal" | "mensual" | "anual"
  fecha_inicio: string
  fecha_fin?: string
  activo: boolean
}

export interface ControlRentabilidad extends BaseEntity {
  periodo: string
  ingresos_totales: number
  costos_totales: number
  ganancia_neta: number
  margen_porcentaje: number
  observaciones?: string
}

export interface Adelanto extends BaseEntity {
  productor_id: number
  productor_nombre?: string
  monto: number
  fecha: string
  concepto?: string
  lote_id?: number
  pagado: boolean
}

export interface Proceso extends BaseEntity {
  codigo: string
  nombre: string
  descripcion?: string
  estado: "activo" | "inactivo"
  fecha_inicio?: string
  fecha_fin?: string
}

export interface Categoria extends BaseEntity {
  nombre: string
  nombre_categoria: string
  precio_unitario_kg: number
  descripcion?: string
  estado: "activo" | "inactivo"
}

export interface Enfermedad extends BaseEntity {
  nombre: string
  descripcion?: string
  sintomas?: string
  tratamiento?: string
  gravedad: "leve" | "moderada" | "grave"
}

export interface Liquidacion extends BaseEntity {
  lote_id: number
  productor_id: number
  fecha_liquidacion: string
  peso_total: number
  precio_unitario: number
  total_bruto: number
  descuentos: number
  adelantos: number
  total_neto: number
  estado: "pendiente" | "pagado"
}

export interface PreLiquidacion extends BaseEntity {
  lote_id: number
  productor_id: number
  fecha_evaluacion: string
  peso_evaluado: number
  precio_estimado: number
  total_estimado: number
  observaciones?: string
}

export interface Comprobante extends BaseEntity {
  tipo: "boleta" | "factura"
  numero: string
  fecha: string
  cliente: string
  monto: number
  estado: "emitido" | "anulado"
}

export interface Subproceso extends BaseEntity {
  proceso_id: number
  nombre: string
  descripcion?: string
  orden: number
  activo: boolean
}

export interface Particion extends BaseEntity {
  lote_id: number
  subproceso_id: number
  cantidad: number
  fecha: string
  responsable_id?: number
}

export interface SaldoKardex extends BaseEntity {
  lote_id: number
  saldo_actual: number
  ultima_actualizacion: string
}

// Response types
export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
