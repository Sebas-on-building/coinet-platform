export const kafkaConfig = {
  clientId: "coient-app",
  brokers: ["localhost:29092"], // <--- use 29092 for host access!
};

// Canonical Kafka topics for Coinet
export const kafkaTopics = {
  marketTicks: 'market.ticks',
  marketOHLC: 'market.ohlc',
  tradeSignals: 'trade.signals',
  portfolioEvents: 'portfolio-events',
  // Add more as needed
};

// Partitioning: All topics are partitioned by symbol for parallelism and scalability.
// Use the symbol as the message key for all producers.

export const registryConfig = {
  host: "http://localhost:8081", // Correct Schema Registry URL
};

// These schema IDs should be set after registering schemas in the registry
export const marketTicksSchemaId = 1;
export const onchainMetricsSchemaId = 2;
export const socialMetricsSchemaId = 3;
export const newsArticlesSchemaId = 4;
