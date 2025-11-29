module.exports = {
  ws: { port: process.env.WS_PORT || 8080 },
  kafka: { brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',') },
  redis: { url: process.env.REDIS_URL || 'redis://localhost:6379' },
  // Add more config as needed
}; 