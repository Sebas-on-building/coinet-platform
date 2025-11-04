# Market Data Service

## Onboarding for New Developers

Welcome to the Coinet Market Data Service! This service is designed for extensibility, reliability, and observability. Follow these steps to get started:

1. **Clone the repo and install Go 1.22+**
2. **Install dependencies:**
   ```sh
   go mod tidy
   ```
3. **Set up your environment variables:**
   - `KAFKA_BROKER` (e.g., localhost:9092)
   - `KAFKA_SERIALIZATION` (json, avro, or protobuf)
   - `SCHEMA_REGISTRY_URL` (for Avro)
   - `KAFKA_AVRO_SUBJECT` (for Avro)
   - `DLQ_ALERT_WEBHOOK` (optional, for alerting)
4. **Run the service:**
   ```sh
   go run ./cmd/market-data-service
   ```
5. **Run the DLQ consumer:**
   ```sh
   DLQ_CONSUMER=1 KAFKA_BROKER=localhost:9092 go run ./cmd/market-data-service
   ```

## Serialization: Avro & Protobuf

- **Avro**: Place your Avro schema (e.g., `schemas/tick.avsc`) and register it with your schema registry.
- **Protobuf**: Place your proto file (e.g., `proto/tick.proto`) and generate Go code:
  ```sh
  protoc --go_out=. proto/tick.proto
  ```
- **Switch serialization**: Set `KAFKA_SERIALIZATION=json|avro|protobuf`.
- **Schema registry**: Set `SCHEMA_REGISTRY_URL` and `KAFKA_AVRO_SUBJECT` for Avro.

## Dead-Letter Queue (DLQ)

- All failed Kafka publishes are sent to the `dlq` topic with error context.
- The DLQ consumer (`DLQ_CONSUMER=1 ...`) logs, alerts, and can retry failed messages.
- **Alerting**: Set `DLQ_ALERT_WEBHOOK` to send failed messages to a webhook (e.g., Slack, PagerDuty).
- **Retries**: The DLQ consumer attempts to republish failed messages once.
- **Admin UI**: Extend the DLQ consumer to push failed messages to a DB, API, or channel for admin review.

## Observability & Metrics

- Prometheus metrics for DLQ events, retries, and alerting are exposed.
- Integrate with Grafana for real-time monitoring.

## Best Practices

- Keep schemas in `schemas/` (Avro) and `proto/` (Protobuf).
- Use the DLQ for all error handling and observability.
- Extend the DLQ consumer for alerting, retries, and admin UI as your needs grow.
- All code is modular, extensible, and production-grade.

---

For more, see `kafka/producer.go`, `kafka/dlq_consumer.go`, and the sample schemas in `schemas/` and `proto/`. 