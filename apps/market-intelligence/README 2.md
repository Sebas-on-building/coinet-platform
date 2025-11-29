# Market Intelligence Context

This bounded context handles real-time market data ingestion, normalization, distribution, and advanced analytics for Coinet.

## Features
- Multi-exchange data connectors
- Data normalization and fusion
- Event sourcing and CQRS
- Anomaly detection and arbitrage
- Stream processing (Flink, Kafka)
- Real-time API and projections

## Atomic Modules
- `connectors/` — Exchange, WebSocket, REST
- `fusion/` — Data fusion engine
- `events/` — Event types, sourcing, projections
- `anomaly/` — Outlier and manipulation detection
- `api/` — Real-time API endpoints
- `streaming/` — Flink jobs, windowed stats

---

All code is atomic, extensible, and tested. See `/docs/` for architecture and onboarding. 