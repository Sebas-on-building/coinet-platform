/**
 * =========================================
 * EXCHANGE REGISTRY
 * =========================================
 * Manages and coordinates connections to multiple exchanges
 */

import { EventEmitter } from 'events';
import { ExchangeType, ExchangeClient, FeedConfig } from '../types';
import { Logger } from '../utils/Logger';

export class ExchangeRegistry extends EventEmitter {
  private logger: Logger;
  private clients: Map<ExchangeType, ExchangeClient> = new Map();
  private configs: Map<ExchangeType, FeedConfig> = new Map();
  private isInitialized: Map<ExchangeType, boolean> = new Map();

  constructor() {
    super();
    this.logger = new Logger('ExchangeRegistry');
  }

  /**
   * Register an exchange client
   */
  registerExchange(exchange: ExchangeType, client: ExchangeClient, config: FeedConfig): void {
    this.clients.set(exchange, client);
    this.configs.set(exchange, config);
    this.isInitialized.set(exchange, false);

    this.logger.info(`✅ Registered exchange: ${exchange}`);
    this.emit('exchangeRegistered', { exchange, config });
  }

  /**
   * Initialize an exchange connection
   */
  async initializeExchange(exchange: ExchangeType): Promise<void> {
    const client = this.clients.get(exchange);
    if (!client) {
      throw new Error(`No client registered for exchange: ${exchange}`);
    }

    try {
      await client.connect();
      this.isInitialized.set(exchange, true);

      this.logger.info(`✅ Initialized exchange: ${exchange}`);
      this.emit('exchangeInitialized', exchange);

    } catch (error) {
      this.logger.error(`❌ Failed to initialize exchange: ${exchange}`, error);
      throw error;
    }
  }

  /**
   * Get exchange client
   */
  getExchangeClient(exchange: ExchangeType): ExchangeClient | undefined {
    return this.clients.get(exchange);
  }

  /**
   * Get exchange configuration
   */
  getExchangeConfig(exchange: ExchangeType): FeedConfig | undefined {
    return this.configs.get(exchange);
  }

  /**
   * Check if exchange is initialized
   */
  isExchangeInitialized(exchange: ExchangeType): boolean {
    return this.isInitialized.get(exchange) || false;
  }

  /**
   * Stop all exchange connections
   */
  async stopAll(): Promise<void> {
    this.logger.info('🛑 Stopping all exchange connections...');

    const stopPromises = Array.from(this.clients.entries()).map(async ([exchange, client]) => {
      try {
        await client.disconnect();
        this.logger.info(`✅ Stopped exchange: ${exchange}`);
      } catch (error) {
        this.logger.error(`❌ Error stopping exchange: ${exchange}`, error);
      }
    });

    await Promise.allSettled(stopPromises);
    this.logger.info('✅ All exchanges stopped');
  }

  /**
   * Get all registered exchanges
   */
  getRegisteredExchanges(): ExchangeType[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Get registry status
   */
  getStatus(): any {
    const status = {
      registeredExchanges: this.getRegisteredExchanges().length,
      initializedExchanges: 0,
      exchanges: {} as Record<string, any>
    };

    for (const exchange of this.getRegisteredExchanges()) {
      const isInitialized = this.isExchangeInitialized(exchange);
      const client = this.clients.get(exchange);

      status.exchanges[exchange] = {
        initialized: isInitialized,
        connected: client ? client.isConnected() : false
      };

      if (isInitialized) {
        status.initializedExchanges++;
      }
    }

    return status;
  }
}
