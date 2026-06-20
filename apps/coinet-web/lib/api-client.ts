/**
 * Coinet API client — talks to the REAL Railway backend, no mock data.
 *
 * Auth: `setAuth(userId, token)` is called with a FRESH Clerk session token
 * (clerk.session.getToken()) right before each request, so we never send a
 * stale token. The backend's requireAuth verifies the Clerk JWT (sk_live);
 * no token → 401.
 */
import { API_BASE_URL } from "./api-config"
import type { ChatMessageRequest, ChatMessageResponse } from "@/types/api"

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

class ApiClient {
  private baseURL = API_BASE_URL
  private authToken: string | null = null
  private userId: string | null = null

  setAuth(userId: string | null, token: string | null) {
    this.userId = userId
    this.authToken = token
  }

  clearAuth() {
    this.userId = null
    this.authToken = null
  }

  private authHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (this.authToken) headers["Authorization"] = `Bearer ${this.authToken}`
    if (this.userId) headers["X-User-Id"] = this.userId
    return headers
  }

  private url(path: string) {
    return path.startsWith("http") ? path : `${this.baseURL}${path}`
  }

  private async parseError(res: Response): Promise<never> {
    const body = await res.json().catch(() => null)
    const message =
      (body && (body.error?.message || body.error || body.message)) || `HTTP ${res.status}`
    throw new ApiError(typeof message === "string" ? message : `HTTP ${res.status}`, res.status)
  }

  /** AUTHENTICATED mentor verdict. POST /api/chat/message */
  async sendChatMessage(
    request: ChatMessageRequest,
    signal?: AbortSignal,
  ): Promise<ChatMessageResponse> {
    const res = await fetch(this.url("/api/chat/message"), {
      method: "POST",
      headers: this.authHeaders(),
      credentials: "include",
      mode: "cors",
      body: JSON.stringify(request),
      signal,
    })
    if (!res.ok) await this.parseError(res)
    return res.json()
  }
}

export const apiClient = new ApiClient()
export { ApiError }
