# DataIngestService

Fetches and ingests market, on-chain, and social data via adapters.

## Endpoints
- `POST /fetch/market` - Fetch market data
- `POST /fetch/onchain` - Fetch on-chain data
- `POST /fetch/social` - Fetch social data
- `POST /adapters/:source` - Run adapter for data source

## Tech Stack
- Node.js + TypeScript (Express)
- CCXT, CryptoCompare, Glassnode, TradingView APIs
- TimescaleDB
- Kafka/RabbitMQ

## Dockerfile
```
# Placeholder for Dockerfile
``` 