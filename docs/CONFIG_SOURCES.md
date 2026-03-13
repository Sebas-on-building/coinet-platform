# Configuration Sources

This document describes where environment variables and configuration come from, to avoid ambiguity and keep configuration consistent.

---

## Canonical Sources

| Use Case | Canonical File | Notes |
|----------|----------------|-------|
| **Monorepo / general** | `env.example` (repo root) | Broad template for all services |
| **Main platform (coinet-platform)** | `apps/coinet-platform/.env.example` | **Primary** for Chat, OmniScore, COMM, etc. |
| **API Gateway** | `services/api-gateway/env.example` | API gateway–specific vars |
| **User service** | `services/user/` | JWT_SECRET, database, etc. |
| **Market prices** | `services/market-prices/env.example` | Market data service |
| **Notification** | `services/notification/env.example` | Notification service |
| **Other services** | `services/*/env.example` or `services/*/.env.example` | Per-service overrides |

---

## Resolution Order

When the app runs, variables are typically resolved in this order (highest priority first):

1. **Process environment** (shell, `export`, or platform env vars)
2. **`.env` file** in the service/app directory
3. **Defaults** in code (avoid for secrets)

---

## Recommendations

1. **New deployments:** Start from `apps/coinet-platform/.env.example` for the main platform; add service-specific vars from `services/<service>/env.example` as needed.
2. **Single source:** Prefer one `.env` or env file per deployed service; avoid duplicating vars across multiple `.env.example` files.
3. **Secrets:** Never commit real secrets. Use placeholders in examples and set real values via CI/CD, Railway, or a secrets manager.
4. **Audit:** See `apps/coinet-platform/ENVIRONMENT_AUDIT.md` for a full list of variables and their impact.

---

## Shared Secrets

When `JWT_SECRET` is in use (legacy JWT mode), the **same value** must be set in every service that signs or verifies tokens:

| Service | File |
|---------|------|
| `apps/coinet-platform` | `apps/coinet-platform/.env` |
| `services/user` | `services/user/.env` |
| `services/api-gateway` | `services/api-gateway/.env` |

A mismatch means tokens issued by one service will be rejected by another.

## Quick Reference

- **Main platform vars:** `apps/coinet-platform/ENVIRONMENT_AUDIT.md`
- **Railway deployment:** `apps/coinet-platform/RAILWAY_VARIABLES.md`
- **Docker Compose:** `docker-compose.yml`; override `JWT_SECRET` and `NODE_ENV` for production
