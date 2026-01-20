import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://citeapurimac.org/backend"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "ID requerido y debe ser numérico" }, { status: 400 })
    }

    console.log("[v0] API Route: Fetching liquidation", id, "from", BACKEND_URL)

    const url = `${BACKEND_URL}/liquidaciones/${id}`
    console.log("[v0] API Route: Full URL:", url)

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    console.log("[v0] API Route: Status:", response.status)
    console.log("[v0] API Route: Content-Type:", response.headers.get("content-type"))

    const responseText = await response.text()
    console.log("[v0] API Route: Response length:", responseText.length)

    if (!response.ok) {
      console.error("[v0] API Route: Backend error", response.status)
      return NextResponse.json(
        { error: "Backend error", status: response.status, preview: responseText.substring(0, 300) },
        { status: response.status },
      )
    }

    let json
    try {
      json = JSON.parse(responseText)
    } catch (err) {
      console.error("[v0] API Route: Invalid JSON")
      return NextResponse.json(
        { error: "Respuesta inválida del backend", preview: responseText.substring(0, 300) },
        { status: 502 },
      )
    }

    // ✅ BACKEND DEVUELVE ARRAY
    if (Array.isArray(json.data)) {
      const fixed = json.data.map((item: any) => ({
        ...item,
        estado_pago: item.estado_pago || "PENDIENTE",
      }))

      return NextResponse.json(fixed)
    }

    // Si por alguna razón viene como objeto
    if (json.data && typeof json.data === "object") {
      return NextResponse.json({
        ...json.data,
        estado_pago: json.data.estado_pago || "PENDIENTE",
      })
    }

    return NextResponse.json({ error: "Formato inesperado del backend" }, { status: 500 })
  } catch (error) {
    console.error("[v0] API Route: Exception:", error)
    return NextResponse.json(
      {
        error: "Error al obtener liquidación",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
