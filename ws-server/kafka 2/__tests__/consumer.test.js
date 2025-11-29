const { startKafkaConsumer } = require('../consumer');
const topics = require('../topics');

jest.mock('kafkajs', () => {
  const mockConsumer = {
    connect: jest.fn(),
    subscribe: jest.fn(),
    run: jest.fn(({ eachMessage }) => Promise.resolve()),
  };
  return {
    Kafka: jest.fn(() => ({ consumer: () => mockConsumer })),
  };
});

jest.mock('../../ws/subscriptions', () => ({ broadcastToSubscribers: jest.fn() }));
jest.mock('../../ws/audit', () => ({ auditLog: jest.fn() }));

describe('Kafka Consumer', () => {
  it('should start all consumers without error', async () => {
    await startKafkaConsumer({ brokers: ['localhost:9092'] }, { clients: [] }, { publish: jest.fn() });
  });
}); 