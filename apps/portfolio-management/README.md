# Portfolio Management Context

This bounded context manages user portfolios, holdings, analytics, and risk for Coinet.

## Features
- Holdings and transaction tracking
- Performance and risk analytics
- Event sourcing and CQRS
- Portfolio projections and reporting
- Integration with trading and AI analytics

## Atomic Modules
- `holdings/` — Asset, transaction, and balance models
- `analytics/` — Performance, risk, and metrics
- `events/` — Portfolio events, sourcing, projections
- `api/` — Portfolio API endpoints
- `integration/` — Trading, AI, and market data

---

All code is atomic, extensible, and tested. See `/docs/` for architecture and onboarding. 