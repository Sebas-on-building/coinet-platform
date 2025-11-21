/**
 * Market Data WebSocket Subscription API
 * 
 * This API endpoint handles WebSocket subscription requests for real-time market data.
 * It supports:
 * 1. Upgrading HTTP requests to WebSocket connections
 * 2. Authentication of subscription requests
 * 3. Managing symbol subscriptions
 * 4. Broadcasting real-time market data to clients
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { Server as HttpServer } from 'http';
import { parse } from 'url';
import { Server, Socket } from 'socket.io';
import { marketDataService } from '@/lib/data/marketData';
import { subscribeToMarketUpdates } from '@/lib/data/redisClient';
import { MarketTick } from '@/lib/data/marketTick';

// Map to track active symbol subscriptions and their subscriber counts
const activeSymbols = new Map<string, number>();
// Store Redis subscriptions for each symbol
const redisSubscriptions = new Map<string, ReturnType<typeof subscribeToMarketUpdates>>();
// Socket.IO instance
let io: Server | null = null;

/**
 * Initialize Socket.IO server (if not already initialized)
 */
function getSocketIO(req: NextApiRequest, res: NextApiResponse) {
  if (io) return io;

  // Get the underlying HTTP server from the NextApiRequest
  const httpServer = (res.socket as any)?.server as HttpServer;

  // Create new Socket.IO server
  io = new Server(httpServer, {
    path: '/api/subscribe',
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_APP_URL
        : '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    serveClient: false,
    // 30MB is good for web applications, let's use 4MB max payload
    maxHttpBufferSize: 4 * 1024 * 1024,
    // Set longer ping timeout for reliability in case of network hiccups
    pingTimeout: 30000,
    // Ping interval of 20s should be sufficient
    pingInterval: 20000
  });

  setupSocketHandlers();

  return io;
}

/**
 * Configure Socket.IO event handlers
 */
function setupSocketHandlers() {
  if (!io) return;

  io.on('connection', (socket: Socket) => {
    console.log('[SocketIO] Client connected:', socket.id);

    // Handle subscription requests
    socket.on('subscribe', (data: { symbols: string[]; exchange?: string }) => {
      if (!data || !data.symbols || !Array.isArray(data.symbols)) {
        socket.emit('error', { message: 'Invalid subscription request' });
        return;
      }

      const exchange = data.exchange || 'binance';
      const symbols = data.symbols.map(s => s.toUpperCase());

      // Join socket rooms for each symbol
      symbols.forEach(symbol => {
        // Track symbol subscription count
        const currentCount = activeSymbols.get(symbol) || 0;
        activeSymbols.set(symbol, currentCount + 1);

        // Join the socket room for this symbol
        socket.join(symbol);

        // If this is the first subscriber, set up Redis subscription
        if (currentCount === 0) {
          subscribeToSymbol(symbol);
        }

        // Confirm subscription to client
        socket.emit('subscribed', { symbol, exchange });
      });

      // Store the subscribed symbols on the socket for cleanup
      const currentSymbols = socket.data.symbols || [];
      socket.data.symbols = [...new Set([...currentSymbols, ...symbols])];
    });

    // Handle unsubscribe requests
    socket.on('unsubscribe', (data: { symbols: string[] }) => {
      if (!data || !data.symbols || !Array.isArray(data.symbols)) {
        return;
      }

      const symbols = data.symbols.map(s => s.toUpperCase());

      // Leave socket rooms for each symbol
      symbols.forEach(symbol => {
        socket.leave(symbol);

        // Update subscription count
        const currentCount = activeSymbols.get(symbol) || 0;
        if (currentCount > 0) {
          const newCount = currentCount - 1;
          activeSymbols.set(symbol, newCount);

          // If no more subscribers, clean up Redis subscription
          if (newCount === 0) {
            unsubscribeFromSymbol(symbol);
          }
        }
      });

      // Update the stored subscribed symbols
      const currentSymbols = socket.data.symbols || [];
      socket.data.symbols = currentSymbols.filter(s => !symbols.includes(s));
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('[SocketIO] Client disconnected:', socket.id);

      // Clean up subscriptions
      const subscribedSymbols = socket.data.symbols || [];
      socket.emit('unsubscribe', { symbols: subscribedSymbols });
    });
  });
}

/**
 * Subscribe to Redis updates for a symbol
 */
function subscribeToSymbol(symbol: string) {
  // Check if we already have an active subscription
  if (redisSubscriptions.has(symbol)) {
    return;
  }

  console.log(`[SocketIO] Creating new Redis subscription for ${symbol}`);

  // Create new Redis PubSub subscription
  const subscription = subscribeToMarketUpdates(symbol, (tick: MarketTick) => {
    // Broadcast to all clients in the symbol room
    if (io) {
      io.to(symbol).emit('market-update', tick);
    }
  }).start();

  // Store the subscription
  redisSubscriptions.set(symbol, subscription);
}

/**
 * Unsubscribe from Redis updates for a symbol
 */
function unsubscribeFromSymbol(symbol: string) {
  const subscription = redisSubscriptions.get(symbol);
  if (subscription) {
    console.log(`[SocketIO] Closing Redis subscription for ${symbol}`);
    subscription.stop();
    redisSubscriptions.delete(symbol);
  }
}

/**
 * API route handler
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET for regular HTTP requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse the query
  const { query } = parse(req.url || '', true);

  // For regular HTTP requests, return API info
  if (!req.url?.includes('socket.io')) {
    return res.status(200).json({
      service: 'Coinet Market Data WebSocket API',
      status: 'running',
      connections: io?.sockets.sockets.size || 0,
      activeSymbols: Array.from(activeSymbols.entries()).map(([symbol, count]) => ({
        symbol,
        subscribers: count
      }))
    });
  }

  // Otherwise, handle WebSocket connection
  try {
    // Initialize Socket.IO if needed
    getSocketIO(req, res);

    // Socket.IO will handle the request
    return res.status(200).end();
  } catch (error) {
    console.error('[API] WebSocket error:', error);
    return res.status(500).json({ error: 'Failed to setup WebSocket connection' });
  }
}

// Disable the body parser to allow Socket.IO to handle the request
export const config = {
  api: {
    bodyParser: false,
  },
}; 