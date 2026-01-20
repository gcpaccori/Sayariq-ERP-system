"use client"

/**
 * Validaciones críticas del flujo de negocio
 * Implementa todas las reglas de negocio documentadas en el documento de requisitos
 */

import type { Lote, Persona, Adelanto } from "@/lib/types"

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// ============================================================================
// VALIDACIONES DE INGRESO DE MATERIA PRIMA
// ============================================================================

export function validarIngresoMateriaPrima(lote: {
  peso_bruto: number
  peso_neto?: number
  num_jabas: number
  productor_id?: number
}): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (lote.peso_bruto <= 0) {
    errors.push("Peso bruto debe ser mayor a 0 kg")
  }

  if (lote.num_jabas <= 0) {
    errors.push("Número de jabas debe ser mayor a 0")
  }

  if (!lote.productor_id) {
    errors.push("Productor es requerido")
  }

  if (lote.peso_neto && lote.peso_neto < 0) {
    errors.push("Peso neto no puede ser negativo")
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

// ============================================================================
// VALIDACIONES DE CLASIFICACIÓN
// ============================================================================

export function validarClasificacion(clasificacion: {
  peso_bruto: number
  exportable: number
  industrial: number
  descarte: number
}): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const totalClasificado = clasificacion.exportable + clasificacion.industrial + clasificacion.descarte

  if (totalClasificado > clasificacion.peso_bruto) {
    errors.push(
      `Peso clasificado (${totalClasificado} kg) no puede exceder peso bruto (${clasificacion.peso_bruto} kg)`
    )
  }

  const diferencia = clasificacion.peso_bruto - totalClasificado
  if (diferencia > 0 && diferencia > clasificacion.peso_bruto * 0.05) {
    // Alert if loss > 5%
    warnings.push(
      `Merma detectada: ${diferencia.toFixed(2)} kg (${((diferencia / clasificacion.peso_bruto) * 100).toFixed(1)}% de pérdida)`
    )
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

// ============================================================================
// VALIDACIONES DE LIQUIDACIÓN
// ============================================================================

export function validarLiquidacion(liquidacion: {
  productor_id: number
  peso_neto: number
  precio_unitario: number
  adelantos_totales: number
  otros_descuentos: number
}): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (liquidacion.peso_neto <= 0) {
    errors.push("Peso neto debe ser mayor a 0")
  }

  if (liquidacion.precio_unitario <= 0) {
    errors.push("Precio unitario debe ser mayor a 0")
  }

  const valorBruto = liquidacion.peso_neto * liquidacion.precio_unitario
  const descuentosTotales = liquidacion.adelantos_totales + liquidacion.otros_descuentos

  if (liquidacion.adelantos_totales > valorBruto) {
    warnings.push(
      `Adelantos (S/ ${liquidacion.adelantos_totales.toFixed(2)}) exceden valor bruto (S/ ${valorBruto.toFixed(2)}). Saldo será negativo.`
    )
  }

  // This would be checked against the database in real scenario
  // if (!productor.cuenta_bancaria) {
  //   errors.push('Productor debe tener datos bancarios registrados antes de liquidar')
  // }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

// ============================================================================
// VALIDACIONES DE PAGOS
// ============================================================================

export function validarPago(pago: {
  monto: number
  saldo_pendiente: number
  metodo_pago: string
  referencia?: string
}): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (pago.monto <= 0) {
    errors.push("Monto del pago debe ser mayor a 0")
  }

  if (pago.monto > pago.saldo_pendiente) {
    errors.push(
      `Monto del pago (S/ ${pago.monto.toFixed(2)}) no puede exceder saldo pendiente (S/ ${pago.saldo_pendiente.toFixed(2)})`
    )
  }

  if (pago.metodo_pago === "transferencia" && !pago.referencia) {
    warnings.push("Se recomienda registrar el número de transferencia como referencia")
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

// ============================================================================
// VALIDACIONES DE FACTURACIÓN
// ============================================================================

export function validarFactura(factura: {
  cantidad_venta: number
  saldo_inventario: number
  precio_venta: number
  cliente: string
}): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (factura.cantidad_venta <= 0) {
    errors.push("Cantidad a vender debe ser mayor a 0")
  }

  if (factura.cantidad_venta > factura.saldo_inventario) {
    errors.push(
      `Cantidad solicitada (${factura.cantidad_venta} kg) excede saldo disponible (${factura.saldo_inventario} kg)`
    )
  }

  if (factura.precio_venta <= 0) {
    errors.push("Precio de venta debe ser mayor a 0")
  }

  if (!factura.cliente || factura.cliente.trim().length === 0) {
    errors.push("Cliente es requerido")
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

// ============================================================================
// VALIDACIONES DE GUÍA DE REMISIÓN
// ============================================================================

export function validarGuiaRemision(guia: {
  numero_guia: string
  guias_existentes: string[]
  fecha_emision: string
  fecha_ingreso: string
}): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (guia.guias_existentes.includes(guia.numero_guia)) {
    errors.push(`N° Guía ${guia.numero_guia} ya existe en el sistema`)
  }

  if (new Date(guia.fecha_emision) < new Date(guia.fecha_ingreso)) {
    errors.push("Fecha de emisión no puede ser anterior a fecha de ingreso")
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

// ============================================================================
// VALIDACIONES GLOBALES DEL FLUJO
// ============================================================================

export function validarFlujoContinuo(paso: string, contexto: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  switch (paso) {
    case "ingreso_a_clasificacion":
      if (!["pendiente", "proceso"].includes(contexto.lote_estado)) {
        errors.push(`Lote debe estar en estado pendiente o proceso, no ${contexto.lote_estado}`)
      }
      break

    case "clasificacion_a_liquidacion":
      if (contexto.lote_estado !== "proceso" && contexto.lote_estado !== "completado") {
        errors.push("Lote debe estar clasificado antes de liquidar")
      }
      break

    case "liquidacion_a_pago":
      if (!contexto.productor_banco || !contexto.productor_cuenta) {
        warnings.push("Productor no tiene datos bancarios. Se requiere antes de pagar")
      }
      break

    case "pago_a_factura":
      if (contexto.diferencia_inventario > contexto.lote_peso_bruto * 0.01) {
        errors.push(
          `Diferencia de inventario detectada (${contexto.diferencia_inventario.toFixed(2)} kg). Requiere ajuste antes de facturar.`
        )
      }
      break
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

// ============================================================================
// UTILIDAD: VALIDAR Y REPORTAR
// ============================================================================

export function validarYReportar(
  validationResult: ValidationResult,
  contexto: string
): { procedeOk: boolean; mensaje: string } {
  if (validationResult.isValid && validationResult.warnings.length === 0) {
    return { procedeOk: true, mensaje: "Validación exitosa" }
  }

  let mensaje = `Validación en ${contexto}:\n`

  if (validationResult.errors.length > 0) {
    mensaje += "\n❌ ERRORES:\n"
    validationResult.errors.forEach((e) => {
      mensaje += `  - ${e}\n`
    })
  }

  if (validationResult.warnings.length > 0) {
    mensaje += "\n⚠️ ADVERTENCIAS:\n"
    validationResult.warnings.forEach((w) => {
      mensaje += `  - ${w}\n`
    })
  }

  return {
    procedeOk: validationResult.errors.length === 0,
    mensaje,
  }
}
