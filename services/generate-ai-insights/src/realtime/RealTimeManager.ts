/**
 * =========================================
 * REAL-TIME MANAGER
 * =========================================
 * Divine world-class real-time insights updates and feedback loops
 */

import { Logger } from '../utils/Logger';
import { EventEmitter } from 'events';

// Local interfaces for types since we can't import from types due to circular dependency
interface AIInsight {
  id: string;
  type: string;
  title: string;
  description: string;
  confidence: number;
  priority: string;
  impact: string;
  effort: string;
  explanation: any;
  actions: any[];
  createdAt: Date;
  expiresAt?: Date;
  actionable: boolean;
}

interface AIRecommendation {
  id: string;
  type: string;
  priority: string;
  title: string;
  description: string;
  confidence: number;
  impact: string;
  effort: string;
  explanation: any;
  actions: any[];
  createdAt: Date;
  expiresAt?: Date;
  metadata?: any;
}

export interface RealTimeConfig {
  enabled: boolean;
  updateInterval: number; // milliseconds
  maxConnections: number;
  heartbeatInterval: number;
}

export interface RealTimeConnection {
  id: string;
  userId: string;
  subscriptions: Set<string>; // insight types, priorities, etc.
  lastActivity: Date;
  metadata?: any;
}

export interface RealTimeConnectionInput {
  userId: string;
  subscriptions: Set<string>; // insight types, priorities, etc.
  metadata?: any;
}

export interface RealTimeUpdate {
  type: 'new_insight' | 'insight_updated' | 'insight_implemented' | 'feedback_received';
  insightId?: string;
  userId?: string;
  data: any;
  timestamp: Date;
}

/**
 * Real-time manager for AI insights
 */
export class RealTimeManager extends EventEmitter {
  private logger: Logger;
  private config: RealTimeConfig;
  private connections: Map<string, RealTimeConnection> = new Map();
  private updateInterval?: NodeJS.Timeout;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(config: RealTimeConfig = {
    enabled: true,
    updateInterval: 30000, // 30 seconds
    maxConnections: 1000,
    heartbeatInterval: 60000 // 1 minute
  }) {
    super();
    this.logger = new Logger('RealTimeManager');
    this.config = config;

    if (config.enabled) {
      this.startPeriodicUpdates();
      this.startHeartbeat();
    }

    this.logger.info('Real-time manager initialized', { config });
  }

  /**
   * Add a new real-time connection
   */
  addConnection(connection: RealTimeConnectionInput): string {
    if (!this.config.enabled) {
      throw new Error('Real-time updates are disabled');
    }

    if (this.connections.size >= this.config.maxConnections) {
      throw new Error('Maximum connections reached');
    }

    const id = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullConnection: RealTimeConnection = {
      ...connection,
      id,
      lastActivity: new Date()
    };

    this.connections.set(id, fullConnection);

    this.logger.info('New real-time connection added', {
      connectionId: id,
      userId: connection.userId,
      subscriptions: Array.from(connection.subscriptions)
    });

    // Send welcome message
    this.emit('connection_added', { connectionId: id, userId: connection.userId });

    return id;
  }

  /**
   * Remove a real-time connection
   */
  removeConnection(connectionId: string): boolean {
    const removed = this.connections.delete(connectionId);

    if (removed) {
      this.logger.info('Real-time connection removed', { connectionId });
      this.emit('connection_removed', { connectionId });
    }

    return removed;
  }

  /**
   * Subscribe to insights updates
   */
  subscribe(connectionId: string, subscriptions: string[]): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    subscriptions.forEach(sub => connection.subscriptions.add(sub));
    connection.lastActivity = new Date();

    this.logger.debug('Connection subscribed to updates', {
      connectionId,
      subscriptions: subscriptions
    });

    return true;
  }

  /**
   * Unsubscribe from insights updates
   */
  unsubscribe(connectionId: string, subscriptions: string[]): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    subscriptions.forEach(sub => connection.subscriptions.delete(sub));
    connection.lastActivity = new Date();

    return true;
  }

  /**
   * Send real-time update to relevant connections
   */
  sendUpdate(update: RealTimeUpdate): void {
    if (!this.config.enabled) {
      return;
    }

    const relevantConnections = this.getRelevantConnections(update);

    this.logger.debug('Sending real-time update', {
      type: update.type,
      connectionsCount: relevantConnections.length,
      insightId: update.insightId
    });

    relevantConnections.forEach(connection => {
      try {
        this.emit('update', { connectionId: connection.id, update });
        connection.lastActivity = new Date();
      } catch (error: any) {
        this.logger.error('Failed to send update to connection', {
          connectionId: connection.id,
          error: error.message
        });
      }
    });
  }

  /**
   * Send insight to relevant connections
   */
  sendInsight(insight: AIInsight | AIRecommendation, userId?: string): void {
    const update: RealTimeUpdate = {
      type: 'new_insight',
      insightId: insight.id,
      userId,
      data: insight,
      timestamp: new Date()
    };

    this.sendUpdate(update);
  }

  /**
   * Send recommendation to relevant connections (alias for sendInsight)
   */
  sendRecommendation(recommendation: AIRecommendation, userId?: string): void {
    this.sendInsight(recommendation, userId);
  }

  /**
   * Update insight status for relevant connections
   */
  updateInsightStatus(insightId: string, status: string, userId?: string): void {
    const update: RealTimeUpdate = {
      type: 'insight_updated',
      insightId,
      userId,
      data: { status },
      timestamp: new Date()
    };

    this.sendUpdate(update);
  }

  /**
   * Notify connections about insight implementation
   */
  notifyInsightImplemented(insightId: string, implementation: any, userId?: string): void {
    const update: RealTimeUpdate = {
      type: 'insight_implemented',
      insightId,
      userId,
      data: implementation,
      timestamp: new Date()
    };

    this.sendUpdate(update);
  }

  /**
   * Get connections relevant for a specific update
   */
  private getRelevantConnections(update: RealTimeUpdate): RealTimeConnection[] {
    return Array.from(this.connections.values()).filter(connection => {
      // Filter by user if specified
      if (update.userId && connection.userId !== update.userId) {
        return false;
      }

      // Filter by subscriptions
      if (update.type === 'new_insight' && update.insightId) {
        const insight = update.data as AIInsight;
        return this.matchesSubscriptions(connection.subscriptions, insight);
      }

      return true;
    });
  }

  /**
   * Check if insight matches connection subscriptions
   */
  private matchesSubscriptions(subscriptions: Set<string>, insight: AIInsight): boolean {
    // If no specific subscriptions, send all
    if (subscriptions.size === 0) {
      return true;
    }

    // Check priority subscription
    if (subscriptions.has(insight.priority) || subscriptions.has(`priority:${insight.priority}`)) {
      return true;
    }

    // Check type subscription
    if (subscriptions.has(insight.type) || subscriptions.has(`type:${insight.type}`)) {
      return true;
    }

    // Check actionable subscription
    if (subscriptions.has('actionable') && insight.actionable) {
      return true;
    }

    return false;
  }

  /**
   * Start periodic insights updates
   */
  private startPeriodicUpdates(): void {
    this.updateInterval = setInterval(async () => {
      try {
        this.logger.debug('Running periodic insights update');

        // In a real implementation, this would check for new insights
        // and send updates to subscribed connections

        this.emit('periodic_update');

      } catch (error: any) {
        this.logger.error('Periodic update failed', { error: error.message });
      }
    }, this.config.updateInterval);
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      try {
        const now = new Date();
        const staleConnections: string[] = [];

        for (const [connectionId, connection] of this.connections.entries()) {
          const timeSinceLastActivity = now.getTime() - connection.lastActivity.getTime();

          // Mark connections as stale if inactive for too long
          if (timeSinceLastActivity > this.config.heartbeatInterval * 2) {
            staleConnections.push(connectionId);
          }
        }

        // Remove stale connections
        staleConnections.forEach(connectionId => {
          this.removeConnection(connectionId);
        });

        if (staleConnections.length > 0) {
          this.logger.info('Removed stale connections', { count: staleConnections.length });
        }

      } catch (error: any) {
        this.logger.error('Heartbeat check failed', { error: error.message });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    activeConnections: number;
    subscriptions: Record<string, number>;
  } {
    const activeConnections = Array.from(this.connections.values()).filter(
      conn => Date.now() - conn.lastActivity.getTime() < this.config.heartbeatInterval
    );

    const subscriptions: Record<string, number> = {};
    for (const connection of this.connections.values()) {
      for (const sub of connection.subscriptions) {
        subscriptions[sub] = (subscriptions[sub] || 0) + 1;
      }
    }

    return {
      totalConnections: this.connections.size,
      activeConnections: activeConnections.length,
      subscriptions
    };
  }

  /**
   * Health check for real-time manager
   */
  healthCheck(): { status: 'healthy' | 'unhealthy'; details: any } {
    try {
      const stats = this.getStats();

      const isHealthy = this.config.enabled ?
        (stats.activeConnections > 0 || this.connections.size === 0) :
        true;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          ...stats,
          enabled: this.config.enabled,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }

    this.connections.clear();
    this.removeAllListeners();

    this.logger.info('Real-time manager cleaned up');
  }
}

export default RealTimeManager;
