import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = "https://citeapurimac.org/backend/api"

const buildBackendUrl = (path: string, searchParams?: string) => {
  const normalizedPath = path.endsWith("/") ? path : `${path}/`
  return `${BACKEND_URL}/${normalizedPath}${searchParams ? `?${searchParams}` : ""}`
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const path = params.path.join("/")
    const searchParams = request.nextUrl.searchParams.toString()
    const url = buildBackendUrl(path, searchParams)

    console.log("[v0] Proxy GET:", url)

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    })

    const text = await response.text()
    if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
      console.error("[v0] Proxy GET received HTML instead of JSON")
      return NextResponse.json(
        { error: "El backend devolvió HTML en lugar de JSON. Verifica la ruta o el servidor." },
        { status: 502 },
      )
    }
    const data = text ? JSON.parse(text) : []
    console.log("[v0] Proxy Response:", {
      status: response.status,
      dataLength: Array.isArray(data) ? data.length : "not array",
    })

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("[v0] Proxy Error:", error)
    return NextResponse.json(
      { error: "Error al conectar con el backend", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const path = params.path.join("/")
    const url = buildBackendUrl(path)
    const body = await request.json()

    console.log("[v0] Proxy POST:", url, body)

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(body),
    })

    const text = await response.text()
    if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
      console.error("[v0] Proxy POST received HTML instead of JSON")
      return NextResponse.json(
        { error: "El backend devolvió HTML en lugar de JSON. Verifica la ruta o el servidor." },
        { status: 502 },
      )
    }
    const data = text ? JSON.parse(text) : {}
    console.log("[v0] Proxy Response:", { status: response.status })

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("[v0] Proxy Error:", error)
    return NextResponse.json(
      { error: "Error al conectar con el backend", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const path = params.path.join("/")
    const url = buildBackendUrl(path)
    const body = await request.json()

    console.log("[v0] Proxy PUT:", url, body)

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(body),
    })

    const text = await response.text()
    if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
      console.error("[v0] Proxy PUT received HTML instead of JSON")
      return NextResponse.json(
        { error: "El backend devolvió HTML en lugar de JSON. Verifica la ruta o el servidor." },
        { status: 502 },
      )
    }
    const data = text ? JSON.parse(text) : {}
    console.log("[v0] Proxy Response:", { status: response.status })

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("[v0] Proxy Error:", error)
    return NextResponse.json(
      { error: "Error al conectar con el backend", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const path = params.path.join("/")
    const url = buildBackendUrl(path)

    console.log("[v0] Proxy DELETE:", url)

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    })

    const text = await response.text()
    if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
      console.error("[v0] Proxy DELETE received HTML instead of JSON")
      return NextResponse.json(
        { error: "El backend devolvió HTML en lugar de JSON. Verifica la ruta o el servidor." },
        { status: 502 },
      )
    }
    const data = text ? JSON.parse(text) : {}
    console.log("[v0] Proxy Response:", { status: response.status })

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("[v0] Proxy Error:", error)
    return NextResponse.json(
      { error: "Error al conectar con el backend", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
