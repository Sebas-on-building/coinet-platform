/**
 * Backend base-URL resolution for the Coinet frontend.
 *
 * Order:
 *  1. VITE_API_URL (explicit) — used in production (https://api.coinet.ai).
 *  2. In dev, return "" so requests use relative URLs and hit the Vite proxy
 *     (see vite.config.ts), which forwards /api to the real backend and dodges
 *     CORS.
 *  3. Production fallback to https://api.coinet.ai.
 */
export const getBackendURL = (): string => {
  const explicit = import.meta.env.VITE_API_URL as string | undefined;
  if (explicit) return explicit.replace(/\/$/, "");

  if (import.meta.env.DEV) return ""; // relative => Vite proxy

  return "https://api.coinet.ai";
};

export const API_BASE_URL = getBackendURL();
