export interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp: Date;
  id?: string;
}

export interface WebSocketEvent {
  event: string;
  channel: string;
  data: unknown;
}

export interface SubscriptionRequest {
  action: 'subscribe' | 'unsubscribe';
  channel: string;
  symbols?: string[];
  params?: Record<string, unknown>;
}

export interface MarketDataStream {
  symbol: string;
  price: number;
  volume: number;
  timestamp: Date;
  type: 'ticker' | 'trade' | 'orderbook';
}

export interface ChatStream {
  sessionId: string;
  message: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface NotificationStream {
  userId: string;
  type: 'alert' | 'trade' | 'news' | 'system';
  title: string;
  message: string;
  data?: unknown;
  timestamp: Date;
} 