# Coinet Backend Microservices Architecture

This directory contains all backend microservices for the Coinet platform. Each service is modular, containerized, and designed for scalability, security, and extensibility.

## Services Overview

- **auth**: AuthService (OAuth2, JWT, RBAC)
- **user**: UserService (profile, roles, billing)
- **chart**: ChartService (chart configs, layouts, export)
- **analytics**: AnalyticsService (indicators, backtesting)
- **ai**: AIService (LLM orchestration, RAG, streaming chat)
- **notification**: NotificationService (alerts, push/email, in-app)
- **ingest**: DataIngestService (market, on-chain, social, adapters)

## Tech Stack
- Node.js + TypeScript (Express/Fastify/NestJS)
- Python + FastAPI (for AI/ML endpoints)
- Docker & Kubernetes
- PostgreSQL + TimescaleDB
- Redis
- Kafka/RabbitMQ
- Pinecone/Weaviate/pgvector (vector DB)

## Communication
- REST/GraphQL APIs
- WebSockets (live updates)
- gRPC (optional, internal)

## Directory Structure
```
/services
  /auth
  /user
  /chart
  /analytics
  /ai
  /notification
  /ingest
```

Each service contains its own README, Dockerfile, and source code. 