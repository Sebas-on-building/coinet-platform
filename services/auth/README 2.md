# AuthService

Handles authentication, OAuth2.0 (Google, Apple), JWT issuance, RBAC, and session management.

## Endpoints
- `POST /login` - Email/password login
- `GET /auth/google` - Google OAuth2.0
- `GET /auth/apple` - Apple OAuth2.0
- `POST /token` - Exchange code for JWT
- `GET /me` - Get current user info

## Tech Stack
- Node.js + TypeScript (Express)
- JWT (jsonwebtoken)
- OAuth2.0 (passport.js)
- PostgreSQL (user store)

## Dockerfile
```
# Placeholder for Dockerfile
``` 