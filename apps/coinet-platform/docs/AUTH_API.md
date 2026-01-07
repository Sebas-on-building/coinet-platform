# Authentication API Documentation

## Overview

The Coinet Platform uses JWT (JSON Web Tokens) for authentication. All protected endpoints require a valid JWT token in the `Authorization` header.

## Authentication Flow

```
┌─────────┐      ┌─────────────┐      ┌─────────────┐
│  Client │      │  Auth API   │      │  Protected  │
│         │      │             │      │  Endpoints  │
└────┬────┘      └──────┬──────┘      └──────┬──────┘
     │                  │                    │
     │  POST /auth/login                     │
     │  {email, password}                    │
     ├──────────────────>                    │
     │                  │                    │
     │  {token, user}   │                    │
     <──────────────────┤                    │
     │                  │                    │
     │  GET /api/chat/* │                    │
     │  Authorization: Bearer <token>        │
     ├───────────────────────────────────────>
     │                  │                    │
     │                  │  {response data}   │
     <───────────────────────────────────────┤
```

## Endpoints

### POST /auth/login

Authenticate a user and receive a JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr_123abc",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER",
      "tier": "PRO",
      "avatar": "https://...",
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-06T00:00:00.000Z",
      "last_sign_in_at": "2026-01-06T00:00:00.000Z"
    }
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Invalid email or password",
  "requestId": "req-1234567890-abc"
}
```

**Rate Limit:** 20 requests per minute per IP

---

### POST /auth/register

Create a new user account.

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "securepassword123",
  "name": "Jane Doe"  // optional
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr_456def",
      "email": "newuser@example.com",
      "name": "Jane Doe",
      "role": "USER",
      "tier": "FREE",
      ...
    }
  }
}
```

**Rate Limit:** 20 requests per minute per IP

---

### GET /auth/me

Get the current authenticated user's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "id": "usr_123abc",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER",
    "tier": "PRO",
    ...
  }
}
```

---

### POST /auth/logout

Invalidate the current session.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Using the Token

Include the JWT token in the `Authorization` header for all protected requests:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Example (JavaScript/Fetch):
```javascript
const response = await fetch('/api/chat/message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ message: 'Hello!' })
});
```

### Example (cURL):
```bash
curl -X POST https://api.coinet.ai/api/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{"message": "Hello!"}'
```

---

## Error Codes

All authentication errors include a `requestId` for debugging and a standardized error code.

| Code | HTTP Status | Description | User Action |
|------|-------------|-------------|-------------|
| `AUTH_MISSING_TOKEN` | 401 | No token provided | Provide token in Authorization header |
| `AUTH_MALFORMED_TOKEN` | 401 | Token format is invalid | Re-authenticate to get a new token |
| `AUTH_INVALID_TOKEN` | 401 | Token signature verification failed | Re-authenticate |
| `AUTH_EXPIRED_TOKEN` | 401 | Token has expired | Re-authenticate |
| `AUTH_USER_NOT_FOUND` | 401 | User associated with token not found | Contact support |
| `AUTH_USER_INACTIVE` | 403 | User account is inactive | Contact support |
| `AUTH_USER_SUSPENDED` | 403 | User account is suspended | Contact support |
| `AUTH_CONFIG_ERROR` | 500 | Server configuration error | Retry later |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Wait and retry |

### Error Response Format:
```json
{
  "success": false,
  "error": {
    "code": "AUTH_EXPIRED_TOKEN",
    "message": "Session expired. Please log in again."
  },
  "requestId": "req-1234567890-abc"
}
```

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/login` | 20 requests | 1 minute |
| `/auth/register` | 20 requests | 1 minute |
| `/api/chat/message` | 60 requests | 1 minute |
| `/api/chat/stream` | 30 requests | 1 minute |
| Auth failures (per IP) | 10 attempts | 15 minutes |

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1704534000
Retry-After: 45  (only when rate limited)
```

---

## Token Claims

The JWT token payload contains:

| Claim | Description |
|-------|-------------|
| `userId` | User's unique identifier |
| `email` | User's email address |
| `role` | User's role (`USER`, `ADMIN`) |
| `tier` | Subscription tier (`FREE`, `PRO`, `ENTERPRISE`) |
| `sessionId` | Session identifier (optional) |
| `tokenId` | Unique token ID for revocation (optional) |
| `iat` | Issued at timestamp |
| `exp` | Expiration timestamp |
| `iss` | Issuer (`coinet-platform`) |
| `aud` | Audience (`coinet-users`) |

---

## Token Expiration

- **Access Token TTL:** 7 days
- **Recommendation:** Store tokens securely and implement token refresh logic

### Handling Expired Tokens (Frontend):

```javascript
async function makeAuthenticatedRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${getToken()}`
    }
  });
  
  if (response.status === 401) {
    const data = await response.json();
    if (data.error?.code === 'AUTH_EXPIRED_TOKEN') {
      // Clear token and redirect to login
      clearToken();
      redirectToLogin();
      return;
    }
  }
  
  return response;
}
```

---

## Security Best Practices

1. **Never store tokens in localStorage** for production apps - prefer httpOnly cookies
2. **Keep tokens short-lived** and implement refresh token rotation
3. **Always use HTTPS** to prevent token interception
4. **Validate tokens on every request** - don't trust client-side validation
5. **Implement logout everywhere** by invalidating sessions server-side

---

## Deprecation Notice

⚠️ **The `x-access-token` header is deprecated** and will be removed in a future version. Please use the standard `Authorization: Bearer <token>` header instead.

---

## Environment Variables

For backend configuration:

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret key for signing tokens |
| `JWT_ISSUER` | No | Token issuer (default: `coinet-platform`) |
| `JWT_AUDIENCE` | No | Token audience (default: `coinet-users`) |
| `JWT_CLOCK_TOLERANCE_SEC` | No | Clock skew tolerance (default: `5`) |
| `AUTH_ENFORCE_CHAT` | No | Enforce auth on chat routes (default: `false`) |
| `AUTH_ALLOW_LEGACY_X_ACCESS_TOKEN` | No | Allow deprecated header (default: `false`) |
| `AUTH_VERIFY_USER_IN_DB` | No | Verify user status in DB (default: `true`) |
| `AUTH_USER_CACHE_TTL_SEC` | No | User cache TTL (default: `60`) |
