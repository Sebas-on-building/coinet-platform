import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { errorManager, ServiceError } from '../errors/ErrorManager';
import { Logger } from '../logging/Logger';
import { MetricsCollector } from '../metrics/MetricsCollector';
import { authService, TokenPayload } from '../auth/AuthService';

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
  id?: string;
}

export interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  sessionId?: string;
  rooms?: Set<string>;
  lastActivity?: number;
  authenticated?: boolean;
}

export interface WebSocketRoom {
  id: string;
  name: string;
  clients: Set<WebSocket>;
  metadata?: Record<string, any>;
  createdAt: number;
  lastActivity: number;
}

export interface ConnectionInfo {
  userId?: string;
  sessionId?: string;
  ip: string;
  userAgent: string;
  connectedAt: number;
  lastActivity: number;
  rooms: string[];
}

export class WebSocketService {
  private static instance: WebSocketService;
  private wss: WebSocketServer | null = null;
  private logger: Logger;
  private metricsCollector: MetricsCollector;
  private clients: Map<WebSocket, AuthenticatedWebSocket> = new Map();
  private rooms: Map<string, WebSocketRoom> = new Map();
  private messageHandlers: Map<string, (ws: WebSocket, message: WebSocketMessage) => void> = new Map();
  private connectionCleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.logger = Logger.getInstance();
    this.metricsCollector = MetricsCollector.getInstance();
    this.setupDefaultHandlers();
  }

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  initialize(server: any, options: { port?: number; path?: string } = {}): void {
    try {
      this.wss = new WebSocketServer({
        server,
        port: options.port,
        path: options.path || '/ws'
      });

      this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
        this.handleConnection(ws, request);
      });

      this.wss.on('error', (error: Error) => {
        errorManager.handleError(error, {
          operation: 'websocket_server_error',
          component: 'websocket_service'
        });
      });

      // Setup cleanup interval
      this.connectionCleanupInterval = setInterval(() => {
        this.cleanupInactiveConnections();
      }, 60 * 1000); // Every minute

      this.logger.info('WebSocket server initialized', {
        port: options.port,
        path: options.path || '/ws'
      });

    } catch (error) {
      errorManager.handleError(error as Error, {
        operation: 'websocket_initialize',
        component: 'websocket_service'
      });
      throw new ServiceError('WEBSOCKET_INIT_FAILED', 'Failed to initialize WebSocket server', error as Error);
    }
  }

  private handleConnection(ws: WebSocket, request: IncomingMessage): void {
    // Add custom properties to the WebSocket instance
    (ws as any).userId = undefined;
    (ws as any).sessionId = undefined;
    (ws as any).rooms = new Set<string>();
    (ws as any).lastActivity = Date.now();
    (ws as any).authenticated = false;

    const authenticatedWs = ws as AuthenticatedWebSocket;
    this.clients.set(ws, authenticatedWs);
    this.metricsCollector.incrementCounter('websocket_connections_total');

    const ip = request.socket.remoteAddress || 'unknown';
    const userAgent = request.headers['user-agent'] || 'unknown';

    this.logger.info('New WebSocket connection', {
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });

    // Set up message handler
    ws.on('message', (data: Buffer) => {
      this.handleMessage(ws, data);
    });

    // Set up close handler
    ws.on('close', (code: number, reason: Buffer) => {
      this.handleDisconnection(ws, code, reason);
    });

    // Set up error handler
    ws.on('error', (error: Error) => {
      this.handleError(ws, error);
    });

    // Send welcome message
    this.sendMessage(ws, {
      type: 'welcome',
      payload: {
        message: 'Connected to Coinet WebSocket',
        timestamp: Date.now()
      },
      timestamp: Date.now()
    });
  }

  private handleMessage(ws: WebSocket, data: Buffer): void {
    try {
      (ws as any).lastActivity = Date.now();

      const message: WebSocketMessage = JSON.parse(data.toString());

      this.logger.debug('Received WebSocket message', {
        type: message.type,
        userId: (ws as any).userId,
        sessionId: (ws as any).sessionId
      });

      // Handle authentication first
      if (message.type === 'auth' && !(ws as any).authenticated) {
        this.handleAuthentication(ws, message);
        return;
      }

      // Require authentication for all other messages
      if (!(ws as any).authenticated) {
        this.sendError(ws, 'AUTHENTICATION_REQUIRED', 'Authentication required');
        return;
      }

      // Handle the message
      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        handler(ws, message);
      } else {
        this.sendError(ws, 'UNKNOWN_MESSAGE_TYPE', `Unknown message type: ${message.type}`);
      }

      this.metricsCollector.incrementCounter('websocket_messages_received', { type: message.type });

    } catch (error) {
      errorManager.handleError(error as Error, {
        operation: 'websocket_handle_message',
        component: 'websocket_service',
        userId: (ws as any).userId
      });
      this.sendError(ws, 'MESSAGE_PARSE_ERROR', 'Failed to parse message');
    }
  }

  private async handleAuthentication(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    try {
      const { token } = message.payload;

      if (!token) {
        this.sendError(ws, 'MISSING_TOKEN', 'Authentication token is required');
        return;
      }

      const payload: TokenPayload = await authService.verifyAccessToken(token);

      (ws as any).userId = payload.sub;
      (ws as any).sessionId = payload.sessionId;
      (ws as any).authenticated = true;

      // Update session activity
      if (payload.sessionId) {
        authService.updateSessionActivity(payload.sessionId);
      }

      this.sendMessage(ws, {
        type: 'auth_success',
        payload: {
          userId: payload.sub,
          role: payload.role
        },
        timestamp: Date.now()
      });

      this.metricsCollector.incrementCounter('websocket_auth_success');

      this.logger.info('WebSocket authentication successful', {
        userId: payload.sub,
        sessionId: payload.sessionId
      });

    } catch (error) {
      this.metricsCollector.incrementCounter('websocket_auth_failed');
      this.sendError(ws, 'AUTHENTICATION_FAILED', 'Invalid authentication token');
      ws.close(1008, 'Authentication failed');
    }
  }

  private handleDisconnection(ws: WebSocket, code: number, reason: Buffer): void {
    this.logger.info('WebSocket disconnection', {
      userId: (ws as any).userId,
      sessionId: (ws as any).sessionId,
      code,
      reason: reason.toString()
    });

    // Remove from all rooms
    const rooms = (ws as any).rooms as Set<string>;
    if (rooms) {
      for (const roomId of rooms) {
        this.leaveRoom(ws, roomId);
      }
    }

    // Remove from clients
    this.clients.delete(ws);
    this.metricsCollector.incrementCounter('websocket_disconnections_total');
  }

  private handleError(ws: WebSocket, error: Error): void {
    errorManager.handleError(error, {
      operation: 'websocket_client_error',
      component: 'websocket_service',
      userId: (ws as any).userId
    });
    this.metricsCollector.incrementCounter('websocket_errors_total');
  }

  private setupDefaultHandlers(): void {
    // Join room handler
    this.messageHandlers.set('join_room', (ws: WebSocket, message: WebSocketMessage) => {
      const { roomId, metadata } = message.payload;
      this.joinRoom(ws, roomId, metadata);
    });

    // Leave room handler
    this.messageHandlers.set('leave_room', (ws: WebSocket, message: WebSocketMessage) => {
      const { roomId } = message.payload;
      this.leaveRoom(ws, roomId);
    });

    // Ping handler
    this.messageHandlers.set('ping', (ws: WebSocket, message: WebSocketMessage) => {
      this.sendMessage(ws, {
        type: 'pong',
        payload: { timestamp: Date.now() },
        timestamp: Date.now()
      });
    });

    // Subscribe to market data
    this.messageHandlers.set('subscribe_market', (ws: WebSocket, message: WebSocketMessage) => {
      const { symbols } = message.payload;
      this.subscribeToMarketData(ws, symbols);
    });

    // Subscribe to portfolio updates
    this.messageHandlers.set('subscribe_portfolio', (ws: WebSocket, message: WebSocketMessage) => {
      this.subscribeToPortfolioUpdates(ws);
    });
  }

  private joinRoom(ws: WebSocket, roomId: string, metadata?: Record<string, any>): void {
    if (!(ws as any).authenticated) {
      this.sendError(ws, 'AUTHENTICATION_REQUIRED', 'Authentication required to join room');
      return;
    }

    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        name: roomId,
        clients: new Set(),
        metadata,
        createdAt: Date.now(),
        lastActivity: Date.now()
      };
      this.rooms.set(roomId, room);
    }

    room.clients.add(ws);
    room.lastActivity = Date.now();
    ((ws as any).rooms as Set<string>).add(roomId);

    this.sendMessage(ws, {
      type: 'room_joined',
      payload: {
        roomId,
        clientCount: room.clients.size
      },
      timestamp: Date.now()
    });

    this.logger.info('Client joined room', {
      userId: (ws as any).userId,
      roomId,
      clientCount: room.clients.size
    });
  }

  private leaveRoom(ws: WebSocket, roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.clients.delete(ws);
      ((ws as any).rooms as Set<string>).delete(roomId);

      if (room.clients.size === 0) {
        this.rooms.delete(roomId);
      } else {
        room.lastActivity = Date.now();
      }

      this.sendMessage(ws, {
        type: 'room_left',
        payload: {
          roomId,
          clientCount: room.clients.size
        },
        timestamp: Date.now()
      });

      this.logger.info('Client left room', {
        userId: (ws as any).userId,
        roomId,
        clientCount: room.clients.size
      });
    }
  }

  private subscribeToMarketData(ws: WebSocket, symbols: string[]): void {
    const roomId = `market_${symbols.join('_')}`;
    this.joinRoom(ws, roomId, { type: 'market_data', symbols });
  }

  private subscribeToPortfolioUpdates(ws: WebSocket): void {
    const userId = (ws as any).userId;
    if (!userId) return;
    const roomId = `portfolio_${userId}`;
    this.joinRoom(ws, roomId, { type: 'portfolio_updates', userId });
  }

  private sendMessage(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
        this.metricsCollector.incrementCounter('websocket_messages_sent', { type: message.type });
      } catch (error) {
        errorManager.handleError(error as Error, {
          operation: 'websocket_send_message',
          component: 'websocket_service',
          userId: (ws as any).userId
        });
      }
    }
  }

  private sendError(ws: WebSocket, code: string, message: string): void {
    this.sendMessage(ws, {
      type: 'error',
      payload: {
        code,
        message,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    });
  }

  // Public methods
  broadcast(message: WebSocketMessage, roomId?: string): void {
    if (roomId) {
      this.broadcastToRoom(roomId, message);
    } else {
      this.broadcastToAll(message);
    }
  }

  private broadcastToRoom(roomId: string, message: WebSocketMessage): void {
    const room = this.rooms.get(roomId);
    if (room) {
      for (const client of room.clients) {
        this.sendMessage(client, message);
      }
    }
  }

  private broadcastToAll(message: WebSocketMessage): void {
    for (const client of this.clients.values()) {
      if ((client as any).authenticated) {
        this.sendMessage(client, message);
      }
    }
  }

  sendToUser(userId: string, message: WebSocketMessage): void {
    for (const client of this.clients.values()) {
      if ((client as any).userId === userId && (client as any).authenticated) {
        this.sendMessage(client, message);
      }
    }
  }

  addMessageHandler(type: string, handler: (ws: WebSocket, message: WebSocketMessage) => void): void {
    this.messageHandlers.set(type, handler);
  }

  removeMessageHandler(type: string): void {
    this.messageHandlers.delete(type);
  }

  private cleanupInactiveConnections(): void {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes

    for (const [ws, client] of this.clients.entries()) {
      const lastActivity = (client as any).lastActivity;
      if (lastActivity && (now - lastActivity) > timeout) {
        this.logger.info('Closing inactive WebSocket connection', {
          userId: (client as any).userId,
          lastActivity
        });
        ws.close(1000, 'Connection timeout');
      }
    }
  }

  getConnectionInfo(): ConnectionInfo[] {
    return Array.from(this.clients.values()).map(client => ({
      userId: (client as any).userId,
      sessionId: (client as any).sessionId,
      ip: 'unknown', // Would need to store from connection
      userAgent: 'unknown', // Would need to store from connection
      connectedAt: 0, // Would need to store from connection
      lastActivity: (client as any).lastActivity || 0,
      rooms: Array.from((client as any).rooms || [])
    }));
  }

  getRoomInfo(): Array<{ id: string; name: string; clientCount: number; metadata?: Record<string, any> }> {
    return Array.from(this.rooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      clientCount: room.clients.size,
      metadata: room.metadata
    }));
  }

  getStats(): {
    totalConnections: number;
    authenticatedConnections: number;
    totalRooms: number;
    totalMessagesSent: number;
    totalMessagesReceived: number;
    totalErrors: number;
  } {
    const authenticatedConnections = Array.from(this.clients.values()).filter(client => (client as any).authenticated).length;

    return {
      totalConnections: this.clients.size,
      authenticatedConnections,
      totalRooms: this.rooms.size,
      totalMessagesSent: this.metricsCollector.getCounterValue('websocket_messages_sent'),
      totalMessagesReceived: this.metricsCollector.getCounterValue('websocket_messages_received'),
      totalErrors: this.metricsCollector.getCounterValue('websocket_errors_total')
    };
  }

  shutdown(): void {
    if (this.connectionCleanupInterval) {
      clearInterval(this.connectionCleanupInterval);
    }

    if (this.wss) {
      this.wss.close();
    }

    // Close all client connections
    for (const client of this.clients.keys()) {
      client.close(1001, 'Server shutdown');
    }

    this.clients.clear();
    this.rooms.clear();
    this.logger.info('WebSocket service shut down');
  }
}

export const webSocketService = WebSocketService.getInstance(); 