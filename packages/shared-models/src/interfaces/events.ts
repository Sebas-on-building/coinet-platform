export interface Event<T = unknown> {
  id: string;
  type: string;
  data: T;
  timestamp: Date;
  source: string;
  version: string;
}

export interface EventHandler<T = unknown> {
  eventType: string;
  handle(event: Event<T>): Promise<void>;
}

export interface EventBus {
  publish(event: Event): Promise<void>;
  subscribe<T>(eventType: string, handler: EventHandler<T>): void;
  unsubscribe(eventType: string, handler: EventHandler): void;
}

export interface MarketEvent extends Event {
  type: 'market.price_update' | 'market.volume_spike' | 'market.anomaly';
  data: {
    symbol: string;
    price?: number;
    volume?: number;
    change?: number;
  };
}

export interface UserEvent extends Event {
  type: 'user.registered' | 'user.login' | 'user.logout' | 'user.updated';
  data: {
    userId: string;
    email?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface AIEvent extends Event {
  type: 'ai.inference_requested' | 'ai.inference_completed' | 'ai.feedback_received';
  data: {
    requestId: string;
    userId: string;
    provider?: string;
    model?: string;
    tokens?: number;
  };
} 