/**
 * API base URL for the Coinet backend (Railway).
 *
 * Next env (build-time inlined). Defaults to the production API; override with
 * NEXT_PUBLIC_API_URL for local/staging. The backend CORS allowlist already
 * includes app.coinet.ai and localhost:3000.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.coinet.ai"
