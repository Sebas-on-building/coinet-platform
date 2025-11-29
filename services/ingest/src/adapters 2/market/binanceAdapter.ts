// =============================================================================
// COINET AI BINANCE ADAPTER - ENHANCED FOR KAFKA STREAMING
// Real-time market data streaming from Binance WebSocket API
// =============================================================================

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { z } from 'zod';
import { KafkaProducerClient, MarketDataMessage } from '../../integrations/kafkaProducer';

// Export types that are imported by other modules
export interface MarketDataPoint {
  timestamp: string;
  symbol: string;
  price: number;
  volume: number;
  change24h?: number;
  source: string;
  exchange: string;
  open?: number;
  high?: number;
  low?: number;
  weightedAvgPrice?: number;
  tradeCount?: number;
  bidPrice?: number;
  askPrice?: number;
}

export interface TradeData {
  timestamp: string;
  symbol: string;
  price: number;
  quantity: number;
  tradeId: number;
  isBuyerMaker: boolean;
  source: string;
  exchange: string;
}

export interface OrderBookData {
  timestamp: string;
  symbol: string;
  exchange: string;
  bids: Array<[string, string]>;
  asks: Array<[string, string]>;
  lastUpdateId: number;
  source: string;
}

// Binance WebSocket API schemas
const BinanceTickerSchema = z.object({
  e: z.string().optional(), // Event type
  E: z.number().optional(), // Event time
  s: z.string().optional(), // Symbol
  c: z.string().optional(), // Close price
  o: z.string().optional(), // Open price
  h: z.string().optional(), // High price
  l: z.string().optional(), // Low price
  v: z.string().optional(), // Total traded base asset volume
  q: z.string().optional(), // Total traded quote asset volume
  P: z.string().optional(), // Price change percent
  p: z.string(), // Price change
  w: z.string(), // Weighted average price
  x: z.string(), // Previous day's close price
  Q: z.string(), // Last quantity
  b: z.string(), // Best bid price
  B: z.string(), // Best bid quantity
  a: z.string(), // Best ask price
  A: z.string(), // Best ask quantity
  n: z.number(), // Total number of trades
});

const BinanceTradeSchema = z.object({
  e: z.string(), // Event type
  E: z.number(), // Event time
  s: z.string(), // Symbol
  t: z.number(), // Trade ID
  p: z.string(), // Price
  q: z.string(), // Quantity
  b: z.number(), // Buyer order ID
  a: z.number(), // Seller order ID
  T: z.number(), // Trade time
  m: z.boolean(), // Is the buyer the market maker?
  M: z.boolean(), // Ignore
});

const BinanceDepthSchema = z.object({
  e: z.string(), // Event type
  E: z.number(), // Event time
  s: z.string(), // Symbol
  U: z.number(), // First update ID in event
  u: z.number(), // Final update ID in event
  b: z.array(z.array(z.string())), // Bids to be updated
  a: z.array(z.array(z.string())), // Asks to be updated
});

export interface BinanceAdapterConfig {
  symbols: string[];
  enableTicker: boolean;
  enableTrades: boolean;
  enableDepth: boolean;
  kafkaProducer?: KafkaProducerClient;
  enableKafkaStreaming: boolean;
}

export interface SymbolStats {
  symbol: string;
  messagesReceived: number;
  lastUpdate: number;
  priceChange24h: number;
  volume24h: number;
  currentPrice: number;
}

export class BinanceAdapter extends EventEmitter {
  private config: BinanceAdapterConfig;
  private websockets: Map<string, WebSocket> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private symbolStats: Map<string, SymbolStats> = new Map();
  private kafkaProducer?: KafkaProducerClient;

  constructor(config: BinanceAdapterConfig) {
    super();
    this.config = config;
    
    if (config.kafkaProducer && config.enableKafkaStreaming) {
      this.kafkaProducer = config.kafkaProducer;
      console.log('✅ Kafka streaming enabled for Binance adapter');
    }

    // Initialize symbol stats
    config.symbols.forEach(symbol => {
      this.symbolStats.set(symbol, {
        symbol,
        messagesReceived: 0,
        lastUpdate: 0,
        priceChange24h: 0,
        volume24h: 0,
        currentPrice: 0,
      });
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Binance adapter is already running');
      return;
    }

    console.log('🚀 Starting Binance WebSocket connections...');
    
    try {
      // Connect to Kafka if enabled
      if (this.kafkaProducer && this.config.enableKafkaStreaming) {
        await this.kafkaProducer.connect();
        console.log('✅ Kafka producer connected for Binance streaming');
      }

      // Start WebSocket connections for each symbol
      for (const symbol of this.config.symbols) {
        await this.connectSymbol(symbol);
      }

      // Start health monitoring
      this.startHealthMonitoring();
      
      this.isRunning = true;
      console.log(`✅ Binance adapter started for ${this.config.symbols.length} symbols`);
      this.emit('started', { symbols: this.config.symbols });

    } catch (error) {
      console.error('❌ Failed to start Binance adapter:', error);
      await this.stop();
      throw error;
    }
  }

  private async connectSymbol(symbol: string): Promise<void> {
    const symbolLower = symbol.toLowerCase();
    const streams: string[] = [];

    // Build stream list based on configuration
    if (this.config.enableTicker) {
      streams.push(`${symbolLower}@ticker`);
    }
    if (this.config.enableTrades) {
      streams.push(`${symbolLower}@trade`);
    }
    if (this.config.enableDepth) {
      streams.push(`${symbolLower}@depth@100ms`);
    }

    if (streams.length === 0) {
      console.warn(`⚠️ No streams configured for symbol: ${symbol}`);
      return;
    }

    const streamParam = streams.join('/');
    const wsUrl = `wss://stream.binance.com:9443/ws/${streamParam}`;

    console.log(`🔗 Connecting to Binance WebSocket for ${symbol}: ${streams.join(', ')}`);

    const ws = new WebSocket(wsUrl);
    this.websockets.set(symbol, ws);

    ws.on('open', () => {
      console.log(`✅ Connected to Binance WebSocket for ${symbol}`);
      this.reconnectAttempts.set(symbol, 0);
      this.emit('symbolConnected', { symbol, streams });
    });

    ws.on('message', (data) => {
      this.handleMessage(symbol, data);
    });

    ws.on('close', (code, reason) => {
      console.log(`⚠️ Binance WebSocket closed for ${symbol}: ${code} ${reason}`);
      this.emit('symbolDisconnected', { symbol, code, reason: reason.toString() });
      
      if (this.isRunning) {
        this.scheduleReconnect(symbol);
      }
    });

    ws.on('error', (error) => {
      console.error(`❌ Binance WebSocket error for ${symbol}:`, error);
      this.emit('symbolError', { symbol, error });
    });

    ws.on('ping', () => {
      ws.pong();
    });
  }

  private handleMessage(symbol: string, data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      
      // Update symbol stats
      const stats = this.symbolStats.get(symbol);
      if (stats) {
        stats.messagesReceived++;
        stats.lastUpdate = Date.now();
        this.symbolStats.set(symbol, stats);
      }

      // Handle different message types
      switch (message.e) {
        case '24hrTicker':
          this.handleTickerData(symbol, message);
          break;
        case 'trade':
          this.handleTradeData(symbol, message);
          break;
        case 'depthUpdate':
          this.handleDepthData(symbol, message);
          break;
        default:
          console.log(`📊 Unknown message type from ${symbol}:`, message.e);
      }

    } catch (error) {
      console.error(`❌ Error parsing message from ${symbol}:`, error);
      this.emit('parseError', { symbol, error, data: data.toString() });
    }
  }

  private async handleTickerData(symbol: string, data: any): Promise<void> {
    try {
      const ticker = BinanceTickerSchema.parse(data);
      
      // Skip if essential fields missing
      if (!ticker.s || !ticker.c) {
        console.warn(`Skipping incomplete ticker data for ${symbol}:`, JSON.stringify(data).slice(0, 200));
        return;
      }
      
      const marketData = {
        timestamp: new Date(ticker.E || Date.now()).toISOString(),
        symbol: ticker.s,
        price: parseFloat(ticker.c || '0'),
        volume: parseFloat(ticker.v || '0'),
        change24h: parseFloat(ticker.P || '0'),
        source: 'binance',
        exchange: 'binance',
        open: parseFloat(ticker.o || '0'),
        high: parseFloat(ticker.h || '0'),
        low: parseFloat(ticker.l || '0'),
        weightedAvgPrice: parseFloat(ticker.w || '0'),
        tradeCount: ticker.n || 0,
        bidPrice: parseFloat(ticker.b || '0'),
        askPrice: parseFloat(ticker.a || '0'),
      };

      // Update symbol stats
      const stats = this.symbolStats.get(symbol);
      if (stats) {
        stats.currentPrice = marketData.price;
        stats.priceChange24h = marketData.change24h;
        stats.volume24h = marketData.volume;
        this.symbolStats.set(symbol, stats);
      }

      // Emit event for local processing
      this.emit('marketData', marketData);

      // Stream to Kafka if enabled
      if (this.kafkaProducer && this.config.enableKafkaStreaming) {
        const kafkaMessage: MarketDataMessage = {
          timestamp: marketData.timestamp,
          symbol: marketData.symbol,
          price: marketData.price,
          volume: marketData.volume,
          change24h: marketData.change24h,
          source: marketData.source,
          exchange: marketData.exchange,
        };

        await this.kafkaProducer.publishMarketData(kafkaMessage);
      }

    } catch (error) {
      console.error(`❌ Error processing ticker data for ${symbol}:`, error);
    }
  }

  private async handleTradeData(symbol: string, data: any): Promise<void> {
    try {
      const trade = BinanceTradeSchema.parse(data);
      
      const tradeData = {
        timestamp: new Date(trade.T).toISOString(),
        symbol: trade.s,
        price: parseFloat(trade.p),
        quantity: parseFloat(trade.q),
        tradeId: trade.t,
        isBuyerMaker: trade.m,
        source: 'binance',
        exchange: 'binance',
      };

      // Emit event for local processing
      this.emit('tradeData', tradeData);

      // Stream to Kafka if enabled
      if (this.kafkaProducer && this.config.enableKafkaStreaming) {
        const kafkaMessage: MarketDataMessage = {
          timestamp: tradeData.timestamp,
          symbol: tradeData.symbol,
          price: tradeData.price,
          volume: tradeData.quantity,
          source: tradeData.source,
          exchange: tradeData.exchange,
        };

        await this.kafkaProducer.publishMarketData(kafkaMessage);
      }

    } catch (error) {
      console.error(`❌ Error processing trade data for ${symbol}:`, error);
    }
  }

  private handleDepthData(symbol: string, data: any): void {
    try {
      const depth = BinanceDepthSchema.parse(data);
      
      const orderBookData = {
        timestamp: new Date(depth.E).toISOString(),
        symbol: depth.s,
        bids: depth.b.map(([price, quantity]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity),
        })),
        asks: depth.a.map(([price, quantity]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity),
        })),
        source: 'binance',
        exchange: 'binance',
      };

      // Emit event for local processing
      this.emit('orderBookData', orderBookData);

    } catch (error) {
      console.error(`❌ Error processing depth data for ${symbol}:`, error);
    }
  }

  private scheduleReconnect(symbol: string): void {
    const attempts = this.reconnectAttempts.get(symbol) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts reached for ${symbol}`);
      this.emit('maxReconnectAttemptsReached', { symbol });
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, attempts); // Exponential backoff
    
    console.log(`🔄 Scheduling reconnect for ${symbol} in ${delay}ms (attempt ${attempts + 1})`);
    
    setTimeout(async () => {
      if (this.isRunning) {
        this.reconnectAttempts.set(symbol, attempts + 1);
        await this.connectSymbol(symbol);
      }
    }, delay);
  }

  private startHealthMonitoring(): void {
    this.pingInterval = setInterval(() => {
      this.websockets.forEach((ws, symbol) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      });
    }, 30000); // Ping every 30 seconds
  }

  async addSymbol(symbol: string): Promise<void> {
    if (this.config.symbols.includes(symbol)) {
      console.log(`⚠️ Symbol ${symbol} already being monitored`);
      return;
    }

    this.config.symbols.push(symbol);
    this.symbolStats.set(symbol, {
      symbol,
      messagesReceived: 0,
      lastUpdate: 0,
      priceChange24h: 0,
      volume24h: 0,
      currentPrice: 0,
    });

    if (this.isRunning) {
      await this.connectSymbol(symbol);
    }

    console.log(`✅ Added symbol ${symbol} to monitoring`);
  }

  async removeSymbol(symbol: string): Promise<void> {
    const index = this.config.symbols.indexOf(symbol);
    if (index === -1) {
      console.log(`⚠️ Symbol ${symbol} not being monitored`);
      return;
    }

    // Close WebSocket connection
    const ws = this.websockets.get(symbol);
    if (ws) {
      ws.close();
      this.websockets.delete(symbol);
    }

    // Remove from configuration and stats
    this.config.symbols.splice(index, 1);
    this.symbolStats.delete(symbol);

    console.log(`✅ Removed symbol ${symbol} from monitoring`);
  }

  getSymbolStats(): SymbolStats[] {
    return Array.from(this.symbolStats.values());
  }

  getConnectionStatus(): { [symbol: string]: string } {
    const status: { [symbol: string]: string } = {};
    
    this.websockets.forEach((ws, symbol) => {
      switch (ws.readyState) {
        case WebSocket.CONNECTING:
          status[symbol] = 'connecting';
          break;
        case WebSocket.OPEN:
          status[symbol] = 'connected';
          break;
        case WebSocket.CLOSING:
          status[symbol] = 'closing';
          break;
        case WebSocket.CLOSED:
          status[symbol] = 'disconnected';
          break;
        default:
          status[symbol] = 'unknown';
      }
    });

    return status;
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping Binance adapter...');
    
    this.isRunning = false;

    // Clear health monitoring
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    // Close all WebSocket connections
    const closePromises = Array.from(this.websockets.entries()).map(([symbol, ws]) => {
      return new Promise<void>((resolve) => {
        ws.close();
        ws.on('close', () => resolve());
        // Force close after 5 seconds
        setTimeout(() => resolve(), 5000);
      });
    });

    await Promise.all(closePromises);
    this.websockets.clear();

    // Disconnect Kafka producer if connected
    if (this.kafkaProducer && this.config.enableKafkaStreaming) {
      await this.kafkaProducer.disconnect();
      console.log('✅ Kafka producer disconnected');
    }

    console.log('✅ Binance adapter stopped');
    this.emit('stopped');
  }

  // Public API methods for production index
  isConnected(): boolean {
    return this.isRunning && this.websockets.size > 0;
  }

  getSymbols(): string[] {
    return this.config.symbols;
  }

  getStats(): Map<string, SymbolStats> {
    return new Map(this.symbolStats);
  }
} 