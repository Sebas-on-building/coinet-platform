/**
 * Coinet User Service - Kafka Event Streaming
 * 
 * Comprehensive event emission for real-time analytics and monitoring
 */

import { Kafka, Producer, Consumer, KafkaConfig } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';

// Event schemas and types
export interface BaseEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  version: string;
  source: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: any;
}

export interface UserEvent extends BaseEvent {
  eventType: 'user.registered' | 'user.verified' | 'user.updated' | 'user.deleted' | 'user.suspended' | 'user.restored';
  data: {
    userId: string;
    email: string;
    role: string;
    tier: string;
    isVerified: boolean;
    createdAt?: string;
    updatedAt?: string;
    previousValues?: any;
  };
}

export interface AuthEvent extends BaseEvent {
  eventType: 'auth.login.success' | 'auth.login.failed' | 'auth.logout' | 'auth.token.refresh' | 'auth.password.reset' | 'auth.2fa.enabled' | 'auth.2fa.disabled';
  data: {
    userId?: string;
    email?: string;
    method: 'password' | '2fa' | 'oauth' | 'api_key';
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
    attempts?: number;
  };
}

export interface SecurityEvent extends BaseEvent {
  eventType: 'security.account.locked' | 'security.suspicious.activity' | 'security.jwt.rotated' | 'security.api.key.created' | 'security.api.key.revoked';
  data: {
    userId?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    action: string;
    resource?: string;
    ipAddress?: string;
    details: any;
  };
}

export interface SessionEvent extends BaseEvent {
  eventType: 'session.created' | 'session.terminated' | 'session.expired';
  data: {
    sessionId: string;
    userId: string;
    deviceInfo?: string;
    ipAddress?: string;
    duration?: number;
  };
}

export interface ApiKeyEvent extends BaseEvent {
  eventType: 'api_key.created' | 'api_key.used' | 'api_key.revoked' | 'api_key.expired';
  data: {
    keyId: string;
    userId: string;
    name: string;
    permissions: string[];
    scopes: string[];
    usageCount?: number;
    lastUsed?: string;
  };
}

export type CoinetEvent = UserEvent | AuthEvent | SecurityEvent | SessionEvent | ApiKeyEvent;

class KafkaEventEmitter {
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private isConnected = false;
  private config: KafkaConfig;
  private topicPrefix: string;
  private retryAttempts = 3;
  private retryDelay = 1000;

  constructor() {
    this.topicPrefix = process.env.KAFKA_TOPIC_PREFIX || 'coinet';
    
    this.config = {
      clientId: 'coinet-user-service',
      brokers: this.parseBrokers(process.env.KAFKA_BROKERS || 'localhost:9092'),
      connectionTimeout: 3000,
      requestTimeout: 25000,
      retry: {
        initialRetryTime: 100,
        retries: 8
      },
      // SSL configuration for production
      ssl: process.env.KAFKA_SSL_ENABLED === 'true' ? {
        rejectUnauthorized: false,
        ca: [process.env.KAFKA_SSL_CA || ''],
        key: process.env.KAFKA_SSL_KEY || '',
        cert: process.env.KAFKA_SSL_CERT || ''
      } : false,
      // SASL authentication for production
      sasl: process.env.KAFKA_SASL_MECHANISM ? {
        mechanism: process.env.KAFKA_SASL_MECHANISM as any,
        username: process.env.KAFKA_SASL_USERNAME || '',
        password: process.env.KAFKA_SASL_PASSWORD || ''
      } : undefined
    };
  }

  private parseBrokers(brokersString: string): string[] {
    return brokersString.split(',').map(broker => broker.trim());
  }

  public async initialize(): Promise<boolean> {
    try {
      if (!process.env.KAFKA_ENABLED || process.env.KAFKA_ENABLED === 'false') {
        console.log('⚠️  Kafka disabled, events will be logged only');
        return false;
      }

      this.kafka = new Kafka(this.config);
      this.producer = this.kafka.producer({
        maxInFlightRequests: 1,
        idempotent: true,
        transactionTimeout: 30000
      });

      await this.producer.connect();
      this.isConnected = true;

      console.log('✅ Kafka event emitter initialized successfully');
      console.log(`📡 Connected to brokers: ${Array.isArray(this.config.brokers) ? this.config.brokers.join(', ') : this.config.brokers}`);
      
      return true;
    } catch (error) {
      console.warn('⚠️  Kafka initialization failed, using fallback logging:', error instanceof Error ? error.message : 'Unknown error');
      this.isConnected = false;
      return false;
    }
  }

  public async emit(event: CoinetEvent): Promise<void> {
    const topic = this.getTopicName(event.eventType);
    
    try {
      if (this.isConnected && this.producer) {
        // Send to Kafka
        await this.sendToKafka(topic, event);
      } else {
        // Fallback to logging
        this.logEvent(event);
      }
    } catch (error) {
      console.error('Failed to emit event:', error);
      // Always fallback to logging
      this.logEvent(event);
    }
  }

  private async sendToKafka(topic: string, event: CoinetEvent): Promise<void> {
    if (!this.producer) throw new Error('Producer not initialized');

    const message = {
      key: event.userId || event.eventId,
      value: JSON.stringify(event),
      headers: {
        'event-type': event.eventType,
        'event-version': event.version,
        'source-service': event.source,
        'correlation-id': event.requestId || '',
        'timestamp': event.timestamp
      },
      timestamp: new Date(event.timestamp).getTime().toString()
    };

    await this.producer.send({
      topic,
      messages: [message]
    });

    console.log(`📡 Event emitted to Kafka: ${event.eventType} → ${topic}`);
  }

  private logEvent(event: CoinetEvent): void {
    console.log(`📝 Event logged: ${event.eventType}`, {
      eventId: event.eventId,
      userId: event.userId,
      timestamp: event.timestamp,
      data: event.data
    });
  }

  private getTopicName(eventType: string): string {
    const [category] = eventType.split('.');
    return `${this.topicPrefix}.${category}.events`;
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.producer) {
        await this.producer.disconnect();
      }
      this.isConnected = false;
      console.log('📡 Kafka event emitter disconnected');
    } catch (error) {
      console.error('Error disconnecting Kafka:', error);
    }
  }

  public getStatus(): any {
    return {
      connected: this.isConnected,
      brokers: this.config.brokers,
      topicPrefix: this.topicPrefix,
      ssl: !!this.config.ssl,
      sasl: !!this.config.sasl
    };
  }
}

// Event builder utilities
export class EventBuilder {
  static createUserEvent(
    eventType: UserEvent['eventType'],
    user: any,
    metadata: any = {}
  ): UserEvent {
    return {
      eventId: uuidv4(),
      eventType,
      timestamp: new Date().toISOString(),
      version: '1.0',
      source: 'user-service',
      userId: user.id,
      sessionId: metadata.sessionId,
      requestId: metadata.requestId,
      metadata,
      data: {
        userId: user.id,
        email: user.email,
        role: user.role,
        tier: user.tier,
        isVerified: user.isVerified,
        createdAt: user.createdAt?.toISOString(),
        updatedAt: user.updatedAt?.toISOString(),
        previousValues: metadata.previousValues
      }
    };
  }

  static createAuthEvent(
    eventType: AuthEvent['eventType'],
    data: Partial<AuthEvent['data']>,
    metadata: any = {}
  ): AuthEvent {
    return {
      eventId: uuidv4(),
      eventType,
      timestamp: new Date().toISOString(),
      version: '1.0',
      source: 'user-service',
      userId: data.userId,
      sessionId: metadata.sessionId,
      requestId: metadata.requestId,
      metadata,
      data: {
        method: 'password',
        ...data
      }
    };
  }

  static createSecurityEvent(
    eventType: SecurityEvent['eventType'],
    severity: SecurityEvent['data']['severity'],
    action: string,
    details: any,
    metadata: any = {}
  ): SecurityEvent {
    return {
      eventId: uuidv4(),
      eventType,
      timestamp: new Date().toISOString(),
      version: '1.0',
      source: 'user-service',
      userId: metadata.userId,
      sessionId: metadata.sessionId,
      requestId: metadata.requestId,
      metadata,
      data: {
        severity,
        action,
        resource: metadata.resource,
        ipAddress: metadata.ipAddress,
        details
      }
    };
  }

  static createSessionEvent(
    eventType: SessionEvent['eventType'],
    sessionData: Partial<SessionEvent['data']>,
    metadata: any = {}
  ): SessionEvent {
    return {
      eventId: uuidv4(),
      eventType,
      timestamp: new Date().toISOString(),
      version: '1.0',
      source: 'user-service',
      userId: sessionData.userId,
      sessionId: sessionData.sessionId,
      requestId: metadata.requestId,
      metadata,
      data: {
        sessionId: sessionData.sessionId || uuidv4(),
        userId: sessionData.userId || '',
        deviceInfo: sessionData.deviceInfo,
        ipAddress: sessionData.ipAddress,
        duration: sessionData.duration
      }
    };
  }

  static createApiKeyEvent(
    eventType: ApiKeyEvent['eventType'],
    keyData: Partial<ApiKeyEvent['data']>,
    metadata: any = {}
  ): ApiKeyEvent {
    return {
      eventId: uuidv4(),
      eventType,
      timestamp: new Date().toISOString(),
      version: '1.0',
      source: 'user-service',
      userId: keyData.userId,
      requestId: metadata.requestId,
      metadata,
      data: {
        keyId: keyData.keyId || '',
        userId: keyData.userId || '',
        name: keyData.name || '',
        permissions: keyData.permissions || [],
        scopes: keyData.scopes || [],
        usageCount: keyData.usageCount,
        lastUsed: keyData.lastUsed
      }
    };
  }
}

// Singleton event emitter instance
export const kafkaEventEmitter = new KafkaEventEmitter();

// Utility functions for common events
export const emitUserRegistered = async (user: any, metadata: any = {}) => {
  const event = EventBuilder.createUserEvent('user.registered', user, metadata);
  await kafkaEventEmitter.emit(event);
};

export const emitUserLogin = async (user: any, method: string, metadata: any = {}) => {
  const event = EventBuilder.createAuthEvent('auth.login.success', {
    userId: user.id,
    email: user.email,
    method: method as any,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent
  }, metadata);
  await kafkaEventEmitter.emit(event);
};

export const emitLoginFailed = async (email: string, reason: string, metadata: any = {}) => {
  const event = EventBuilder.createAuthEvent('auth.login.failed', {
    email,
    reason,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    attempts: metadata.attempts
  }, metadata);
  await kafkaEventEmitter.emit(event);
};

export const emitSecurityEvent = async (action: string, severity: 'low' | 'medium' | 'high' | 'critical', details: any, metadata: any = {}) => {
  const event = EventBuilder.createSecurityEvent('security.suspicious.activity', severity, action, details, metadata);
  await kafkaEventEmitter.emit(event);
};

export const emitSessionCreated = async (sessionData: any, metadata: any = {}) => {
  const event = EventBuilder.createSessionEvent('session.created', sessionData, metadata);
  await kafkaEventEmitter.emit(event);
};

export const emitApiKeyCreated = async (keyData: any, metadata: any = {}) => {
  const event = EventBuilder.createApiKeyEvent('api_key.created', keyData, metadata);
  await kafkaEventEmitter.emit(event);
};

export default KafkaEventEmitter;
