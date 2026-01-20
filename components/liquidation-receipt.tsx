"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Printer, Download, ArrowLeft } from "lucide-react"
import Link from "next/link"
import dynamic from "next/dynamic"

const html2canvas = dynamic(() => import("html2canvas").then((mod) => ({ default: mod.default })), {
  ssr: false,
})
const jsPDF = dynamic(() => import("jspdf").then((mod) => ({ default: mod.jsPDF })), {
  ssr: false,
})

interface LiquidationData {
  id: number
  numero_liquidacion: string
  lote_id: number
  fecha_liquidacion: string
  productor_nombre: string
  productor_direccion: string
  producto: string
  asensor_campo: string
  lugar_venta: string
  dni_productor: string
  peso_inicial: number
  ingreso_jabas: number
  guia_ingreso: string
  fecha_ingreso: string
  peso_bruto: number
  peso_jabas: number
  peso_neto: number
  total_bruto_fruta: number
  costo_flete: number
  costo_cosecha: number
  costo_maquila: number
  descuento_adelanto: number
  deuda_jabas: number
  flete_descuento: number
  cosecha_descuento: number
  total_neto_pagar: number
  observaciones: string
  detalles: Array<{
    categoria: string
    cantidad: number
    precio_unitario: number
    valor_venta: number
  }>
  enfermedades: Array<{
    nombre: string
    porcentaje: number
  }>
  defectos: Array<{
    nombre: string
    porcentaje: number
  }>
}

export function LiquidationReceipt({ liquidationId }: { liquidationId: number }) {
  const [data, setData] = useState<LiquidationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [receiptRef, setReceiptRef] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/liquidaciones/${liquidationId}`)
        if (!response.ok) throw new Error("Error al cargar liquidación")
        const jsonData = await response.json()
        setData(jsonData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [liquidationId])

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    if (!receiptRef || !data) return

    try {
      const { default: html2canvasLib } = await import("html2canvas")
      const { default: jsPDFLib } = await import("jspdf")

      const canvas = await html2canvasLib(receiptRef, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      })

      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      const pdf = new jsPDFLib("p", "mm", "a4")

      let heightLeft = imgHeight
      let position = 0

      const imgData = canvas.toDataURL("image/png")
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
      heightLeft -= 297

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
        heightLeft -= 297
      }

      pdf.save(`Liquidacion_${data.numero_liquidacion}.pdf`)
    } catch (err) {
      console.error("Error al generar PDF:", err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-600">Cargando liquidación...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto">
        <Link href="/liquidaciones">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
          </Button>
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error || "Liquidación no encontrada"}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Print Controls */}
      <div className="mb-4 flex gap-2 print:hidden flex-wrap">
        <Link href="/liquidaciones">
          <Button variant="ghost">
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
          </Button>
        </Link>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="w-4 h-4 mr-2" /> Imprimir
        </Button>
        <Button onClick={handleDownloadPDF} className="bg-green-600 hover:bg-green-700">
          <Download className="w-4 h-4 mr-2" /> Descargar PDF
        </Button>
      </div>

      {/* Receipt */}
      <div
        ref={setReceiptRef}
        className="bg-white border border-gray-200 p-8 print:border-0 print:p-0"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6 border-b-4 border-green-600 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-green-700">S</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AGRONEGOCIOS SAYARIQ SAC</h1>
              <p className="text-sm text-gray-600">Procesamiento y comercialización de productos</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">Nro LIQUIDACION</p>
            <p className="text-lg font-bold text-green-700">{data.numero_liquidacion}</p>
            <p className="text-xs text-gray-600 mt-2">ASESOR DE CAMPO:</p>
            <p className="text-sm">{data.asensor_campo || "0"}</p>
          </div>
        </div>

        {/* Producer Data */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-xs font-semibold text-gray-700">Señor (es):</p>
            <div className="bg-green-100 p-3 rounded mt-1">
              <p className="font-bold text-gray-900">{data.productor_nombre}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-700">Producto:</p>
            <div className="bg-yellow-200 p-3 rounded mt-1 font-bold">{data.producto}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="font-semibold">Dirección:</p>
            <p>{data.productor_direccion || "0"}</p>
          </div>
          <div>
            <p className="font-semibold">D.N.I.:</p>
            <p>{data.dni_productor || "-"}</p>
          </div>
          <div>
            <p className="font-semibold">Lugar de Venta:</p>
            <p>{data.lugar_venta}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6 text-sm bg-gray-50 p-4 rounded">
          <div>
            <p className="font-semibold">Según Guía de Ingreso de M.P.Nº:</p>
            <p className="font-bold">{data.guia_ingreso}</p>
          </div>
          <div>
            <p className="font-semibold">Ingreso jabas:</p>
            <p>{data.ingreso_jabas}</p>
          </div>
          <div>
            <p className="font-semibold">Peso inicial:</p>
            <p>{Number(data.peso_inicial).toFixed(2)}</p>
          </div>
        </div>

        <div className="mb-6 text-sm">
          <p className="font-semibold">Fecha de ingreso de carga:</p>
          <p>{new Date(data.fecha_ingreso).toLocaleDateString("es-PE")}</p>
        </div>

        {/* Details Table */}
        <table className="w-full mb-6 border-collapse">
          <thead>
            <tr className="bg-green-600 text-white">
              <th className="border border-gray-300 p-2 text-left font-semibold">CANT.</th>
              <th className="border border-gray-300 p-2 text-left font-semibold">DESCRIPCIÓN</th>
              <th className="border border-gray-300 p-2 text-right font-semibold">P. UNITARIO</th>
              <th className="border border-gray-300 p-2 text-right font-semibold">VALOR DE VENTA</th>
            </tr>
          </thead>
          <tbody>
            {data.detalles.map((detalle, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="border border-gray-300 p-2 font-semibold">{detalle.cantidad.toFixed(2)}</td>
                <td className="border border-gray-300 p-2 font-semibold text-gray-900 uppercase">
                  {detalle.categoria}
                </td>
                <td className="border border-gray-300 p-2 text-right">S/ {detalle.precio_unitario.toFixed(2)}</td>
                <td className="border border-gray-300 p-2 text-right font-semibold">
                  S/ {detalle.valor_venta.toFixed(2)}
                </td>
              </tr>
            ))}
            <tr className="bg-green-100 font-bold">
              <td colSpan={2} className="border border-gray-300 p-2">
                PESO NETO
              </td>
              <td className="border border-gray-300 p-2 text-right">TOTAL</td>
              <td className="border border-gray-300 p-2 text-right">S/ {data.total_bruto_fruta.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <p className="font-semibold text-sm">RENDIM EXP</p>
            <p className="text-lg font-bold">34%</p>
          </div>
          <div className="col-span-2">
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="font-semibold p-2">Adelanto 1</td>
                  <td className="text-right p-2 bg-yellow-200 font-bold">
                    S/ {(data.descuento_adelanto || 0).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Final Summary */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div></div>
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="font-semibold p-2">DEUDA JABAS</td>
                <td className="text-right p-2">S/ {(data.deuda_jabas || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td className="font-semibold p-2">FLETE</td>
                <td className="text-right p-2">S/ {(data.costo_flete || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td className="font-semibold p-2">COSECHA</td>
                <td className="text-right p-2">S/ {(data.costo_cosecha || 0).toFixed(2)}</td>
              </tr>
              <tr className="bg-yellow-200 font-bold border-t-2 border-yellow-400">
                <td className="p-2">NETO A PAGAR</td>
                <td className="text-right p-2">S/ {data.total_neto_pagar.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Quality Report */}
        <div className="mb-6">
          <h3 className="font-bold text-center underline mb-4">REPORTE DE MUESTREO DE CALIDAD</h3>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="font-bold text-sm mb-2">ENFERMEDADES</h4>
              <table className="w-full text-xs border-collapse">
                <tbody>
                  {data.enfermedades.map((enf, idx) => (
                    <tr key={idx} className="border border-gray-300">
                      <td className="p-2">{enf.nombre}</td>
                      <td className="p-2 text-right">{enf.porcentaje.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-2">DEFECTOS</h4>
              <table className="w-full text-xs border-collapse">
                <tbody>
                  {data.defectos.map((def, idx) => (
                    <tr key={idx} className="border border-gray-300">
                      <td className="p-2">{def.nombre}</td>
                      <td className="p-2 text-right">{def.porcentaje.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Observations */}
        <div className="mb-6">
          <p className="font-bold text-sm mb-2">OTROS / OBSERVACIÓN</p>
          <div className="border border-gray-300 p-4 min-h-16 text-sm">{data.observaciones || ""}</div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-end text-xs">
          <div>
            <p className="font-semibold">Fecha de Emisión:</p>
            <p>{new Date(data.fecha_liquidacion).toLocaleDateString("es-PE")}</p>
          </div>
          <div className="text-center">
            <div className="h-16 mb-2"></div>
            <p className="font-bold">SAYARIQ</p>
          </div>
        </div>
      </div>
    </div>
  )
}
