import { TokenStorage, secureFetch } from './security';

// --- CSRF Token Management ---
let csrfToken: string | null = null;
export async function fetchCSRFToken() {
  const res = await secureFetch('/api/auth/csrf');
  if (res.ok) {
    const data = await res.json();
    csrfToken = data.csrfToken;
  }
  return csrfToken;
}

// --- Secure Login ---
export async function login(email: string, password: string) {
  await fetchCSRFToken();
  const res = await secureFetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken || '',
    },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Login failed');
  // Token is set via httpOnly cookie by backend, fallback to memory for SPA
  // Optionally: parse user info from response
  return true;
}

// --- Secure Logout ---
export async function logout() {
  await secureFetch('/api/auth/logout', { method: 'POST', headers: { 'X-CSRF-Token': csrfToken || '' } });
  TokenStorage.clear();
}

// --- Token Refresh (silent, httpOnly cookie) ---
export async function refreshToken() {
  const res = await secureFetch('/api/auth/refresh', { method: 'POST', headers: { 'X-CSRF-Token': csrfToken || '' } });
  if (!res.ok) throw new Error('Token refresh failed');
  // Token is set via httpOnly cookie by backend
  return true;
}

// --- User Session Management ---
export async function getCurrentUser() {
  const res = await secureFetch('/api/auth/me');
  if (!res.ok) return null;
  const user = await res.json();
  // Parse and map custom claims if present
  if (user && user.claims) {
    return mapClaimsToUser(parseClaims(user.claims));
  }
  return user;
}
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}

// --- SSO (OAuth) Login ---
export async function loginWithSSO(provider: 'google' | 'apple' | 'github' | string) {
  await fetchCSRFToken();
  // Redirect to backend SSO endpoint (which handles OAuth flow)
  const ssoUrl = `/api/auth/sso/${provider}?csrfToken=${encodeURIComponent(csrfToken || '')}`;
  window.location.href = ssoUrl;
}

// --- Advanced SSO: SAML (Enterprise) ---
export async function loginWithSAML(entityId: string) {
  await fetchCSRFToken();
  // Redirect to backend SAML SSO endpoint (which handles SAML flow)
  const samlUrl = `/api/auth/saml?entityId=${encodeURIComponent(entityId)}&csrfToken=${encodeURIComponent(csrfToken || '')}`;
  window.location.href = samlUrl;
}

// --- Advanced SSO: OIDC (Generic Enterprise) ---
export async function loginWithOIDC(issuer: string, clientId: string) {
  await fetchCSRFToken();
  // Redirect to backend OIDC SSO endpoint (which handles OIDC flow)
  const oidcUrl = `/api/auth/oidc?issuer=${encodeURIComponent(issuer)}&clientId=${encodeURIComponent(clientId)}&csrfToken=${encodeURIComponent(csrfToken || '')}`;
  window.location.href = oidcUrl;
}

// --- Custom Claims Parsing and Mapping ---
export function parseClaims(claims: any): any {
  // Handles SAML/OIDC claims, normalizes keys, supports custom transforms
  const normalized: Record<string, any> = {};
  for (const key in claims) {
    let normKey = key.toLowerCase().replace(/[-_]/g, '');
    normalized[normKey] = claims[key];
  }
  // Example: custom transforms (email, groups, roles, etc)
  if (normalized['emailaddress']) normalized['email'] = normalized['emailaddress'];
  if (normalized['groups'] && typeof normalized['groups'] === 'string') {
    normalized['groups'] = normalized['groups'].split(',');
  }
  return normalized;
}

export function mapClaimsToUser(claims: any): any {
  // Flexible mapping: map claims to user profile fields
  return {
    id: claims['sub'] || claims['userid'] || claims['email'],
    email: claims['email'],
    name: claims['name'] || claims['displayname'] || claims['givenname'],
    avatar: claims['picture'] || claims['avatarurl'],
    roles: claims['roles'] || claims['groups'] || [],
    org: claims['org'] || claims['organization'],
    rawClaims: claims,
  };
}

// --- Extensible for any enterprise mapping, group/role mapping, etc. ---
// Add SSO/MFA flows as new functions, using secureFetch and CSRF protection 