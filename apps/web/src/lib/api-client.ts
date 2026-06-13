/**
 * Coinet API client.
 *
 * Talks to the REAL Railway backend. No mock data ever.
 *
 * Auth model (mirrors the proven client-web pattern):
 *  - `setAuth(userId, token)` is called by the auth layer (Clerk, Milestone 2).
 *  - When a Clerk token is present we send `Authorization: Bearer <token>`.
 *  - We also send `X-User-Id` (Clerk user id, or a demo id) which the backend
 *    accepts in demo mode.
 *
 * Milestone 1 uses `getJudgment()`, which hits the PUBLIC `GET /api/judgment`
 * endpoint and needs no auth at all — proving the raw connection with a real
 * engine verdict.
 */
import { API_BASE_URL } from "./api-config";
import type {
  ChatMessageRequest,
  ChatMessageResponse,
  JudgmentResponse,
  MarketRegimeResponse,
} from "@/types/api";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

class ApiClient {
  private baseURL: string;
  private authToken: string | null = null;
  private userId: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /** Set Clerk auth context (Milestone 2). */
  setAuth(userId: string | null, token: string | null) {
    this.userId = userId;
    this.authToken = token;
  }

  clearAuth() {
    this.userId = null;
    this.authToken = null;
  }

  get isAuthenticated() {
    return Boolean(this.authToken);
  }

  private authHeaders(base: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...base,
    };
    if (this.authToken) headers["Authorization"] = `Bearer ${this.authToken}`;
    if (this.userId) headers["X-User-Id"] = this.userId;
    return headers;
  }

  private url(path: string) {
    return path.startsWith("http") ? path : `${this.baseURL}${path}`;
  }

  private async parseError(res: Response): Promise<never> {
    const body = await res.json().catch(() => null);
    const message =
      (body && (body.error?.message || body.error || body.message)) ||
      `HTTP ${res.status}`;
    throw new ApiError(
      typeof message === "string" ? message : `HTTP ${res.status}`,
      res.status,
    );
  }

  /**
   * PUBLIC judgment endpoint — real engine, no auth.
   * GET /api/judgment?symbol=BTC
   */
  async getJudgment(symbol: string, signal?: AbortSignal): Promise<JudgmentResponse> {
    const clean = symbol.trim().toUpperCase();
    const res = await fetch(
      this.url(`/api/judgment?symbol=${encodeURIComponent(clean)}`),
      { method: "GET", headers: { Accept: "application/json" }, signal },
    );
    if (!res.ok) await this.parseError(res);
    return res.json();
  }

  /** GET /api/market-regime — regime context (Milestone 4, additive). */
  async getMarketRegime(signal?: AbortSignal): Promise<MarketRegimeResponse> {
    const res = await fetch(this.url("/api/market-regime"), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });
    if (!res.ok) await this.parseError(res);
    return res.json();
  }

  /** Health check. GET /api/health */
  async health(signal?: AbortSignal): Promise<{ ok: boolean; service?: string }> {
    const res = await fetch(this.url("/api/health"), { signal });
    if (!res.ok) await this.parseError(res);
    return res.json();
  }

  /**
   * AUTHENTICATED chat verdict. POST /api/chat/message  (Milestone 2)
   */
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
    });
    if (!res.ok) await this.parseError(res);
    return res.json();
  }
}

export const apiClient = new ApiClient();
export { ApiError };
