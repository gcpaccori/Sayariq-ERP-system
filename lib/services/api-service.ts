import { API_CONFIG } from "@/lib/config/api"

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: unknown,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export class ApiService {
  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`

    console.log("[v0] API Request:", {
      method: options.method || "GET",
      url,
      endpoint,
      baseURL: API_CONFIG.BASE_URL,
    })

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...API_CONFIG.HEADERS,
          ...options.headers,
        },
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      })

      console.log("[v0] API Response:", {
        url,
        status: response.status,
        ok: response.ok,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        console.error("[v0] API Error Response:", {
          url,
          status: response.status,
          errorData,
        })
        throw new ApiError(errorData?.message || `HTTP error! status: ${response.status}`, response.status, errorData)
      }

      const data = await response.json()
      console.log("[v0] API Success:", {
        url,
        dataType: typeof data,
        isArray: Array.isArray(data),
        hasDataProperty: data && typeof data === "object" && "data" in data,
      })

      // Si es un array directo, devolverlo como está
      // Si tiene propiedad 'data', devolver solo la data
      // Si es otro objeto, devolverlo completo
      if (Array.isArray(data)) {
        console.log("[v0] Backend returned array directly, wrapping in ApiResponse format")
        return data as T
      }

      if (data && typeof data === "object" && "data" in data) {
        console.log("[v0] Backend returned ApiResponse format with data property")
        return data as T
      }

      console.log("[v0] Backend returned object, returning as is")
      return data as T
    } catch (error) {
      console.error("[v0] API Request Failed:", {
        url,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : typeof error,
      })

      if (error instanceof ApiError) {
        throw error
      }

      if (error instanceof Error) {
        throw new ApiError(error.message)
      }

      throw new ApiError("Unknown error occurred")
    }
  }

  static async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" })
  }

  static async post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  static async put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  static async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" })
  }
}
