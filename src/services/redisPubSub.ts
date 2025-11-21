import Redis, { Redis as RedisType } from 'ioredis';

type MessageHandler = (channel: string, message: string) => void;

export class RedisPubSubService {
  private publisher: RedisType;
  private subscriber: RedisType;

  constructor() {
    this.publisher = new Redis();
    this.subscriber = new Redis();
  }

  // Publish alert notification
  async publishAlert(channel: string, message: string) {
    await this.publisher.publish(`alerts:${channel}`, message);
  }

  // Subscribe to alert notifications
  async subscribeAlert(channel: string, handler: MessageHandler) {
    await this.subscriber.subscribe(`alerts:${channel}`);
    this.subscriber.on('message', (chan: string, msg: string) => {
      if (chan === `alerts:${channel}`) handler(chan, msg);
    });
  }

  // Publish inter-service event
  async publishEvent(channel: string, payload: any) {
    await this.publisher.publish(`event:${channel}`, JSON.stringify(payload));
  }

  // Subscribe to inter-service events
  async subscribeEvent(channel: string, handler: MessageHandler) {
    await this.subscriber.subscribe(`event:${channel}`);
    this.subscriber.on('message', (chan: string, msg: string) => {
      if (chan === `event:${channel}`) handler(chan, msg);
    });
  }

  // Extensible: Add more pub/sub patterns as needed
} 