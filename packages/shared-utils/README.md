# Shared Utils

This package provides atomic utilities for CQRS, event sourcing, saga orchestration, and cross-cutting concerns for all Coinet bounded contexts.

## Features
- CQRS command and query handlers
- Event sourcing and replay utilities
- Saga orchestration for distributed transactions
- Data validation, transformation, and mapping
- Caching, logging, and error handling

## Atomic Modules
- `cqrs/` — Command, query, and handler utilities
- `event-sourcing/` — Event store, replay, projections
- `saga/` — Saga orchestration, compensation
- `validation/` — Schema and data validation
- `cache/` — Multi-layer cache utilities
- `logger/` — Structured logging
- `error/` — Error handling and reporting

---

All utilities are atomic, extensible, and used across all apps, services, and APIs.

---

## 🚀 Quick Start
1. `cd packages/shared-utils`
2. `npm install`

---

## 🏗️ Structure
- `/hooks` — React hooks
- `/functions` — Utility functions
- `/helpers` — Misc helpers

---

## 📦 Usage Example
```ts
import { useDebounce, formatNumber } from 'shared-utils';
```

---

> **Build the future of crypto analytics and trading.**
> **Pixel-perfect. Infinitely extensible. Designed for humans.**
