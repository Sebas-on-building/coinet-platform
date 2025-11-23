# Kafka Module for Coinet

## Overview
This module provides a modular, extensible, and production-grade Kafka integration for Coinet, inspired by the design and UX of Apple, Canva, TradingView, and Solana.

## Structure
- `producer.js`: Modular producer for all topics (market.ticks, strategy.signals, etc.)
- `consumer.js`: Modular consumer with support for consumer groups, partition assignment, and extensible handlers
- `streams.js`: Multi-window, multi-symbol, multi-aggregate, plugin-extensible analytics stream processor (Kafka Streams/KSQL ready, plugin hooks)
- `topics.js`: Centralized topic registry for all Kafka topics (market.ticks, market.avg10s, market.avg30s, market.avg5m, market.avg1h, market.avg1d, market.median30s, market.stddev30s, plugin.sentiment, plugin.anomaly, plugin.forecast, plugin.custom, etc.)
- `README.md`: This documentation

## Usage
- **Producers**: Use `produceMarketTick`, `produceStrategySignal`, or `sendToTopic` for any topic
- **Consumers**: Use `startKafkaConsumer` to launch all core and service-specific consumers
- **Streams**: Use `startRollingAggregateStream` for rolling analytics (10s, 30s, 5m, 1h, 1d, all symbols, all aggregates)
- **Plugin Analytics**: Pass plugin hooks to `startRollingAggregateStream` for custom analytics (sentiment, anomaly, forecast, custom)

## Extensibility
- Add new topics in `topics.js`
- Add new producers/consumers/streams/aggregates as needed
- Add plugin/custom aggregate hooks in `streams.js`
- All code is modular, testable, and ready for plugins/AI/analytics

## Topics
- `market.ticks`, `strategy.signals`, `market.avg10s`, `market.avg30s`, `market.avg5m`, `market.avg1h`, `market.avg1d`
- `market.median30s`, `market.stddev30s`
- `plugin.sentiment`, `plugin.anomaly`, `plugin.forecast`, `plugin.custom`
- `audit.log`

## Dashboard Integration
- All topics and aggregates are ready for real-time dashboard widgets (see design/monitoring.md)
- Plugin analytics and custom aggregates are first-class citizens in the UI/UX

## Design/UX Reference
- **Apple**: Clean, intuitive, pixel-perfect code and error handling
- **Canva**: Modular, drag-and-drop extensibility for new topics/services
- **TradingView**: Real-time analytics and event streaming
- **Solana**: High-performance, scalable, and beautiful architecture

---

This module is the backbone of Coinet's real-time, event-driven architecture. Every detail is crafted for extensibility, reliability, and beauty. 