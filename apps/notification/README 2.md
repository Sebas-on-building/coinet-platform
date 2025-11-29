# Notification Context

This bounded context manages alerts, multi-channel delivery, and subscriptions for Coinet.

## Features
- Alert management and rules
- Multi-channel delivery (email, SMS, push, web)
- Subscription and preference management
- Event sourcing and projections

## Atomic Modules
- `alerts/` — Alert rules, triggers, escalation
- `channels/` — Email, SMS, push, web connectors
- `subscriptions/` — User subscriptions, preferences
- `events/` — Notification events, sourcing, projections
- `api/` — Notification API endpoints

---

All code is atomic, extensible, and tested. See `/docs/` for architecture and onboarding. 