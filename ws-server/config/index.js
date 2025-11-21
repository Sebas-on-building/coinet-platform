module.exports = {
  kafka: {
    brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'],
    replicationFactor: 2,
    // Add more Kafka config as needed
  },
  // ...other config
}; 