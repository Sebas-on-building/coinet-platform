const { sendToTopic, produceMarketTick, produceStrategySignal } = require('../producer');
const topics = require('../topics');

jest.mock('kafkajs', () => {
  const mockProducer = {
    connect: jest.fn(),
    isConnected: jest.fn(() => true),
    send: jest.fn(),
  };
  return {
    Kafka: jest.fn(() => ({ producer: () => mockProducer })),
  };
});

describe('Kafka Producer', () => {
  it('should send to any topic', async () => {
    await sendToTopic(topics.MARKET_TICKS, { foo: 'bar' });
    // No error means pass (mocked)
  });
  it('should produce market tick', async () => {
    await produceMarketTick({ price: 123, timestamp: Date.now() });
  });
  it('should produce strategy signal', async () => {
    await produceStrategySignal({ symbol: 'BTC', action: 'buy' });
  });
}); 