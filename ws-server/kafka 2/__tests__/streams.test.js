const sendToTopic = jest.fn();
const { startRollingAggregateStream } = require('../streams');
const topics = require('../topics');

jest.mock('kafkajs', () => {
  let eachMessageHandler;
  const mockConsumer = {
    connect: jest.fn(),
    subscribe: jest.fn(),
    run: jest.fn(({ eachMessage }) => { eachMessageHandler = eachMessage; return Promise.resolve(); }),
  };
  return {
    Kafka: jest.fn(() => ({ consumer: () => mockConsumer })),
    __setEachMessageHandler: handler => { eachMessageHandler = handler; },
    __getEachMessageHandler: () => eachMessageHandler,
  };
});

jest.mock('../producer', () => ({ sendToTopic }));

describe('Kafka Streams', () => {
  it('should start rolling aggregate stream for all windows, aggregates, and plugin analytics', async () => {
    const pluginHook = jest.fn().mockResolvedValue({ topic: topics.PLUGIN_CUSTOM, data: { foo: 'bar' } });
    await startRollingAggregateStream({ brokers: ['localhost:9092'] }, [pluginHook]);
    // Simulate a tick message
    const { __getEachMessageHandler } = require('kafkajs');
    const now = Date.now();
    await __getEachMessageHandler()({ message: { value: Buffer.from(JSON.stringify({ symbol: 'BTC', price: 100, timestamp: now })) } });
    expect(pluginHook).toBeCalled();
    expect(sendToTopic).toBeCalledWith(topics.PLUGIN_CUSTOM, { foo: 'bar' });
  });
}); 