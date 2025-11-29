# Trading Context

This bounded context powers trading strategy, backtesting, and execution for Coinet.

## Features
- Strategy development and simulation
- Backtesting and performance analytics
- Execution simulation and integration
- Event sourcing and CQRS
- Trading projections and reporting

## Atomic Modules
- `strategy/` — Strategy models, templates
- `backtester/` — Backtesting engine
- `execution/` — Execution simulation, integration
- `events/` — Trading events, sourcing, projections
- `api/` — Trading API endpoints

---

All code is atomic, extensible, and tested. See `/docs/` for architecture and onboarding. 