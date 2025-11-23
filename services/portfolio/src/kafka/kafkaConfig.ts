export const kafkaConfig = {
  clientId: 'portfolio-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
};

export const kafkaTopics = {
  marketTicks: 'market.ticks',
  marketOHLC: 'market.ohlc',
  tradeSignals: 'trade.signals',
  portfolioEvents: 'portfolio-events',
}; 