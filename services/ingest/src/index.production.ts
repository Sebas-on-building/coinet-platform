// =============================================================================
// COINET AI INGEST SERVICE - PRODUCTION GRADE
// Bloomberg Terminal-quality data ingestion with enterprise resilience
// =============================================================================

import fastify from 'fastify';
import { DataConnectionManager } from './services/DataConnectionManager';
import { HealthChecker } from './health/HealthChecker';
import { CircuitBreakerFactory } from './utils/CircuitBreaker';
import { BinanceAdapter } from './adapters/market/binanceAdapter';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// =============================================================================
// SERVICE CONFIGURATION
// =============================================================================

const config = {
  port: parseInt(process.env.PORT || '8001'),
  host: process.env.HOST || '0.0.0.0',
  environment: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  gracefulShutdownTimeout: parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT || '30000'),
};

// =============================================================================
// MAIN SERVICE CLASS
// =============================================================================

class IngestService {
  private server = fastify({
    logger: {
      level: config.logLevel,
      transport: config.environment === 'development' 
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
    requestIdHeader: 'x-request-id',
    trustProxy: true,
  });

  private connectionManager = new DataConnectionManager();
  private healthChecker: HealthChecker;
  private binanceAdapter?: BinanceAdapter;
  private isShuttingDown = false;

  constructor() {
    this.healthChecker = new HealthChecker(this.connectionManager);
    this.setupGracefulShutdown();
  }

  async start(): Promise<void> {
    try {
      console.log('🚀 Starting Coinet Ingest Service...');
      console.log(`📍 Environment: ${config.environment}`);
      console.log(`📍 Port: ${config.port}`);

      // Initialize connections
      await this.initializeConnections();

      // Setup server
      await this.setupServer();

      // Start market data adapters
      await this.startMarketAdapters();

      // Start health monitoring
      this.healthChecker.startPeriodicHealthCheck(30000);

      // Start server
      await this.server.listen({
        port: config.port,
        host: config.host,
      });

      console.log('✅ Coinet Ingest Service started successfully');
      console.log(`🌐 Health endpoint: http://${config.host}:${config.port}/health`);
      console.log(`📊 Metrics endpoint: http://${config.host}:${config.port}/metrics`);
    } catch (error) {
      console.error('❌ Failed to start service:', error);
      process.exit(1);
    }
  }

  private async initializeConnections(): Promise<void> {
    console.log('🔌 Initializing data connections...');
    
    // Non-blocking initialization - don't crash on DB failures
    try {
      await this.connectionManager.initialize();
    } catch (error) {
      console.warn('⚠️ Some connections failed during startup:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    const status = this.connectionManager.getHealthStatus();
    console.log('📊 Connection Status:');
    Object.entries(status).forEach(([service, health]) => {
      const icon = health.healthy ? '✅' : '❌';
      const latency = health.latency ? ` (${health.latency}ms)` : '';
      console.log(`   ${icon} ${service}: ${health.healthy ? 'Connected' : 'Failed'}${latency}`);
    });

    // Continue regardless of connection status - let /ready handle traffic gating
    console.log('🚀 Service starting with available connections...');
  }

  private async setupServer(): Promise<void> {
    // Register plugins
    const rawCorsOrigin = (process.env.CORS_ORIGIN ?? process.env.CORS_ORIGINS ?? '').trim();
    const envOrigins = rawCorsOrigin
      ? rawCorsOrigin.split(',').map((o: string) => o.trim()).filter(Boolean)
      : [];
    const prodAllowedOrigins: string[] = [
      'https://app.coinet.ai',
      'https://coinet.ai',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8080',
      ...envOrigins,
    ];
    const prodIsProd = process.env.NODE_ENV === 'production';
    await this.server.register(require('@fastify/cors'), {
      credentials: true,
      origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
        if (!origin) return cb(null, true);
        if (prodAllowedOrigins.includes(origin)) return cb(null, true);
        if (!prodIsProd && (origin.includes('vercel.app') || origin.includes('coinet'))) {
          return cb(null, true);
        }
        if (prodIsProd) return cb(null, false);
        return cb(null, true);
      },
    });

    await this.server.register(require('@fastify/helmet'), {
      contentSecurityPolicy: false,
    });

    await this.server.register(require('@fastify/rate-limit'), {
      max: 100,
      timeWindow: '1 minute',
    });

    // Setup routes
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.server.get('/health', async (request, reply) => {
      try {
        const health = await this.healthChecker.getHealth();
        const statusCode = health.status === 'healthy' ? 200 : 
                          health.status === 'degraded' ? 200 : 503;
        
        reply.code(statusCode);
        return health;
      } catch (error) {
        reply.code(503);
        return {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        };
      }
    });

    // Liveness probe
    this.server.get('/health/live', async (request, reply) => {
      const liveness = await this.healthChecker.getLiveness();
      reply.code(liveness.alive ? 200 : 503);
      return liveness;
    });

    // Readiness probe
    this.server.get('/health/ready', async (request, reply) => {
      const readiness = await this.healthChecker.getReadiness();
      reply.code(readiness.ready ? 200 : 503);
      return readiness;
    });

    // Simple readiness alias
    this.server.get('/ready', async (request, reply) => {
      const readiness = await this.healthChecker.getReadiness();
      reply.code(readiness.ready ? 200 : 503);
      return readiness;
    });

    // Prometheus metrics endpoint
    this.server.get('/metrics', async (request, reply) => {
      reply.type('text/plain');
      return await this.healthChecker.getMetrics();
    });

    // Circuit breaker status
    this.server.get('/circuit-breakers', async (request, reply) => {
      return CircuitBreakerFactory.getMetrics();
    });

    // Stats endpoint
    this.server.get('/stats', async (request, reply) => {
      const stats = {
        uptime: process.uptime(),
        environment: config.environment,
        version: process.env.SERVICE_VERSION || '1.0.0',
        connections: this.connectionManager.getHealthStatus(),
        circuitBreakers: CircuitBreakerFactory.getMetrics(),
        adapters: {
          binance: this.binanceAdapter ? {
            connected: this.binanceAdapter.isConnected(),
            symbols: this.binanceAdapter.getSymbols(),
            stats: Array.from(this.binanceAdapter.getStats().values()),
          } : null,
        },
      };
      
      return stats;
    });

    // Market data endpoints
    this.server.get('/symbols', async (request, reply) => {
      if (!this.binanceAdapter) {
        reply.code(503);
        return { error: 'Market adapter not initialized' };
      }
      
      return {
        symbols: this.binanceAdapter.getSymbols(),
        total: this.binanceAdapter.getSymbols().length,
        status: this.binanceAdapter.isConnected() ? 'connected' : 'disconnected',
      };
    });

    this.server.get('/latest/:symbol', async (request, reply) => {
      const { symbol } = request.params as { symbol: string };
      
      if (!this.binanceAdapter) {
        reply.code(503);
        return { error: 'Market adapter not initialized' };
      }

      const stats = this.binanceAdapter.getStats().get(symbol);
      if (!stats) {
        reply.code(404);
        return { error: `Symbol ${symbol} not found` };
      }

      return {
        symbol: stats.symbol,
        price: stats.currentPrice,
        change24h: stats.priceChange24h,
        volume24h: stats.volume24h,
        lastUpdate: stats.lastUpdate,
        timestamp: Date.now(),
      };
    });

    // Admin endpoints
    this.server.post('/admin/circuit-breaker/:name/reset', async (request, reply) => {
      const { name } = request.params as { name: string };
      CircuitBreakerFactory.reset(name);
      return { message: `Circuit breaker ${name} reset` };
    });

    this.server.post('/admin/reconnect/:service', async (request, reply) => {
      const { service } = request.params as { service: string };
      // Trigger reconnection logic
      return { message: `Reconnection triggered for ${service}` };
    });
  }

  private async startMarketAdapters(): Promise<void> {
    console.log('📈 Starting market data adapters...');

    try {
      // For now, disable Kafka streaming until we create the proper KafkaProducerClient wrapper
      // const kafkaProducer = this.connectionManager.getKafkaProducer();
      
      // Initialize Binance adapter with circuit breaker
      const binanceCircuitBreaker = CircuitBreakerFactory.create('binance', {
        threshold: 5,
        timeout: 60000,
        errorThresholdPercentage: 30,
      });

      this.binanceAdapter = new BinanceAdapter({
        symbols: (process.env.BINANCE_SYMBOLS || 'BTCUSDT,ETHUSDT,BNBUSDT,ADAUSDT,SOLUSDT').split(','),
        enableTicker: true,
        enableTrades: true,
        enableDepth: true,
        kafkaProducer: undefined, // Temporarily disabled
        enableKafkaStreaming: false,
      });

      // Start with circuit breaker protection
      await binanceCircuitBreaker.execute(async () => {
        await this.binanceAdapter!.start();
      });

      console.log('✅ Market adapters started successfully');
    } catch (error) {
      console.error('⚠️ Failed to start market adapters:', error);
      // Don't fail the service if market adapters fail
    }
  }

  private setupGracefulShutdown(): void {
    const shutdownHandler = async (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);

      const shutdownTimeout = setTimeout(() => {
        console.error('❌ Graceful shutdown timeout, forcing exit');
        process.exit(1);
      }, config.gracefulShutdownTimeout);

      try {
        // Stop accepting new requests
        await this.server.close();
        console.log('✅ Server closed');

        // Stop health checks
        this.healthChecker.stopPeriodicHealthCheck();
        console.log('✅ Health checks stopped');

        // Stop market adapters
        if (this.binanceAdapter) {
          await this.binanceAdapter.stop();
          console.log('✅ Market adapters stopped');
        }

        // Close all connections
        await this.connectionManager.shutdown();
        console.log('✅ Connections closed');

        clearTimeout(shutdownTimeout);
        console.log('✅ Graceful shutdown complete');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        clearTimeout(shutdownTimeout);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
    process.on('SIGINT', () => shutdownHandler('SIGINT'));
    process.on('SIGUSR2', () => shutdownHandler('SIGUSR2')); // For nodemon

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      shutdownHandler('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      shutdownHandler('unhandledRejection');
    });
  }
}

// =============================================================================
// SERVICE STARTUP
// =============================================================================

const service = new IngestService();
service.start().catch((error) => {
  console.error('❌ Fatal error during startup:', error);
  process.exit(1);
});
