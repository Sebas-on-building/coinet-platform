/**
 * Injectable authenticated fetch for shared-models slices.
 * Call setApiFetcher() at app bootstrap with apiClient.getJson (or equivalent)
 * so all API calls include Authorization: Bearer + credentials.
 */

export type ApiFetcher = (url: string) => Promise<unknown>;

let apiFetcher: ApiFetcher | null = null;

/**
 * Set the authenticated fetcher. Call from app bootstrap:
 *   setApiFetcher((url) => apiClient.getJson(url))
 */
export function setApiFetcher(fn: ApiFetcher): void {
  apiFetcher = fn;
}

/**
 * Get portfolios via authenticated fetch, or fallback to fetch with credentials.
 */
export async function fetchJson<T = unknown>(url: string): Promise<T> {
  if (apiFetcher) {
    return apiFetcher(url) as Promise<T>;
  }
  const res = await fetch(url, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('Unauthorized');
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}
