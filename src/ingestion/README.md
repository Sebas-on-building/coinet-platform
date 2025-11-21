# Ingestion Pipeline & Event Bus

## Topics

- `market-ticks`
- `onchain-metrics`
- `social-metrics`
- `news-articles`

## Schemas

Schemas are defined in the `schemas/` directory using Avro format. Register these schemas in your schema registry and update the schema IDs in `src/config/kafkaConfig.ts`.

## Producers

Each producer (see files in this directory) publishes to its respective topic using the base producer class and Avro serialization.

## Health Check

Use `healthCheck.ts` to monitor Kafka connectivity and topic metadata. Extend this to monitor consumer lag and other metrics as needed.

## Configuration

Kafka and schema registry configuration is in `src/config/kafkaConfig.ts`.

## Requirements

- Kafka cluster
- Schema Registry (e.g., Confluent)
- Node.js dependencies: `kafkajs`, `@kafkajs/confluent-schema-registry`

## Usage

1. Register schemas in the registry.
2. Update schema IDs in `kafkaConfig.ts`.
3. Use the producer classes to publish data to Kafka topics.
