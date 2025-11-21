# AI Analytics Context

This bounded context powers all AI, ML, NLP, and predictive analytics for Coinet.

## Features
- Machine learning pipelines (MLOps)
- Feature store (real-time and batch)
- LLM integration (OpenAI, Gemini, etc.)
- Computer vision (chart pattern, OCR)
- Reinforcement learning for trading
- Event sourcing and projections

## Atomic Modules
- `ml/` — Model training, validation, registry
- `feature-store/` — Feature engineering, lineage
- `llm/` — LLM, RAG, prompt templates
- `vision/` — Chart pattern, OCR, anomaly detection
- `rl/` — Trading environment, agent orchestration
- `events/` — AI events, sourcing, projections

---

All code is atomic, extensible, and tested. See `/docs/` for architecture and onboarding. 