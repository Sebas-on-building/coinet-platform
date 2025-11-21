# Shared Models

This package contains all atomic TypeScript types, events, CQRS commands/queries, projections, and API contracts for every bounded context in Coinet.

## Features
- Atomic domain models for every context
- Event types for event sourcing
- CQRS commands and queries
- Projections for optimized read models
- API contracts for REST, GraphQL, and microservices

## Atomic Modules
- `market-intelligence/` — Market events, commands, projections
- `portfolio-management/` — Portfolio events, commands, projections
- `ai-analytics/` — ML, feature, and AI events
- `user-experience/` — UX events, personalization
- `trading/` — Trading events, strategy, execution
- `notification/` — Alert, channel, subscription events
- `security/` — Auth, risk, privacy events

---

All types are atomic, versioned, and used across all apps, services, and APIs.

---

## 🚀 Quick Start
1. `cd packages/shared-models`
2. `npm install`

---

## 🏗️ Structure
- `/types` — Core types and interfaces
- `/schemas` — Validation schemas (Zod, Yup, etc.)
- `/graphql` — GraphQL types and fragments
- `/openapi` — OpenAPI types and docs

---

## 📦 Usage Example
```ts
import { User, Portfolio, Token } from 'shared-models/types';
```

---

> **Build the future of crypto analytics and trading.**
> **Pixel-perfect. Infinitely extensible. Designed for humans.**
