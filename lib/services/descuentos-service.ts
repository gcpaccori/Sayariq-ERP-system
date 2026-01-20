export interface ConfiguracionDescuentos {
  jabas_precio: number
  flete_porcentaje: number
  recibo_egreso_porcentaje: number
  cosecha_porcentaje: number
  costo_procesamiento_porcentaje: number
}

// Configuración de descuentos según el negocio
export const DESCUENTOS_CONFIG: ConfiguracionDescuentos = {
  jabas_precio: 5.0, // Precio fijo por jaba
  flete_porcentaje: 2.0, // 2% del total
  recibo_egreso_porcentaje: 1.0, // 1% del total
  cosecha_porcentaje: 1.5, // 1.5% del total
  costo_procesamiento_porcentaje: 3.0, // 3% del total
}

export class DescuentosService {
  // Calcular descuentos totales
  calcularDescuentosTotales(
    peso_total: number,
    numero_jabas: number,
    monto_bruto: number,
    config: Partial<ConfiguracionDescuentos> = {}
  ): {
    descuento_jabas: number
    descuento_flete: number
    descuento_recibo_egreso: number
    descuento_cosecha: number
    descuento_procesamiento: number
    total_descuentos: number
    monto_neto: number
  } {
    const cfg = { ...DESCUENTOS_CONFIG, ...config }

    const descuento_jabas = numero_jabas * cfg.jabas_precio
    const descuento_flete = monto_bruto * (cfg.flete_porcentaje / 100)
    const descuento_recibo_egreso = monto_bruto * (cfg.recibo_egreso_porcentaje / 100)
    const descuento_cosecha = monto_bruto * (cfg.cosecha_porcentaje / 100)
    const descuento_procesamiento = monto_bruto * (cfg.costo_procesamiento_porcentaje / 100)

    const total_descuentos =
      descuento_jabas +
      descuento_flete +
      descuento_recibo_egreso +
      descuento_cosecha +
      descuento_procesamiento

    return {
      descuento_jabas,
      descuento_flete,
      descuento_recibo_egreso,
      descuento_cosecha,
      descuento_procesamiento,
      total_descuentos,
      monto_neto: Math.max(0, monto_bruto - total_descuentos),
    }
  }

  // Aplicar descuentos a ajustes contables
  aplicarDescuentos(
    monto_bruto: number,
    numero_jabas: number,
    config: Partial<ConfiguracionDescuentos> = {}
  ): number {
    const descuentos = this.calcularDescuentosTotales(0, numero_jabas, monto_bruto, config)
    return descuentos.monto_neto
  }
}

export const descuentosService = new DescuentosService()
