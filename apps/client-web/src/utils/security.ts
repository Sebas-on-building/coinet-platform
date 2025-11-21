// --- Secure Token Storage ---
// Uses httpOnly cookies if possible, falls back to in-memory for SPA tokens
export const TokenStorage = (() => {
  let memoryToken: string | null = null;
  return {
    set(token: string) {
      // Try to set httpOnly cookie via server (recommended)
      // Fallback: store in memory (never localStorage/sessionStorage for sensitive tokens)
      memoryToken = token;
    },
    get() {
      // In real app, fetch from cookie via server-side or secure API
      return memoryToken;
    },
    clear() {
      memoryToken = null;
    },
  };
})();

// --- HTTPS Enforcement ---
export function enforceHTTPS() {
  if (typeof window !== 'undefined' && window.location.protocol !== 'https:') {
    window.location.href = 'https://' + window.location.host + window.location.pathname + window.location.search;
  }
}

// --- CORS-aware Fetch Wrapper ---
export async function secureFetch(input: RequestInfo, init: RequestInit = {}) {
  const opts: RequestInit = {
    ...init,
    credentials: 'include', // Always send cookies for CORS
    headers: {
      ...(init.headers || {}),
      'X-Requested-With': 'XMLHttpRequest',
    },
  };
  try {
    const res = await fetch(input, opts);
    if (res.status === 403 && res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      if (data.error && data.error.startsWith('CORS')) {
        throw new Error('CORS error: ' + data.error);
      }
    }
    return res;
  } catch (err) {
    // Optionally: log/report CORS or network errors
    throw err;
  }
}

// --- Usage Example (in Next.js _app.tsx or useEffect) ---
// useEffect(() => { enforceHTTPS(); }, []); 