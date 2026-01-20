import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = "https://citeapurimac.org/backend"

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const path = params.path.join("/")
    const searchParams = request.nextUrl.searchParams.toString()
    const url = `${BACKEND_URL}/${path}${searchParams ? `?${searchParams}` : ""}`

    console.log("[v0] Proxy GET:", url)

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()
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
    const url = `${BACKEND_URL}/${path}`
    const body = await request.json()

    console.log("[v0] Proxy POST:", url, body)

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
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
    const url = `${BACKEND_URL}/${path}`
    const body = await request.json()

    console.log("[v0] Proxy PUT:", url, body)

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
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
    const url = `${BACKEND_URL}/${path}`

    console.log("[v0] Proxy DELETE:", url)

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()
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
