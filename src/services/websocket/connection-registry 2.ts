import { config } from "../../config/env";
import {
  ConnectionManager,
  ConnectionConfig,
  ConnectionStats,
} from "./connection-manager";

interface ConnectionRegistryOptions {
  loggerEnabled?: boolean;
  silentFailMode?: boolean;
  maxConcurrentConnections?: number;
}

/**
 * Connection Registry
 *
 * Manages all WebSocket connections in the application
 * Provides monitoring, status reporting, and central management
 */
export class ConnectionRegistry {
  private static instance: ConnectionRegistry;
  private connections: Map<string, ConnectionManager> = new Map();
  private options: ConnectionRegistryOptions;
  private statusReportInterval: NodeJS.Timeout | null = null;
  private readonly DEFAULT_OPTIONS: ConnectionRegistryOptions = {
    loggerEnabled: true,
    silentFailMode: process.env.NODE_ENV === "production",
    maxConcurrentConnections: 10,
  };

  private constructor(options: ConnectionRegistryOptions = {}) {
    this.options = { ...this.DEFAULT_OPTIONS, ...options };
    this.initializeStatusReporting();
  }

  public static getInstance(
    options?: ConnectionRegistryOptions,
  ): ConnectionRegistry {
    if (!ConnectionRegistry.instance) {
      ConnectionRegistry.instance = new ConnectionRegistry(options);
    }
    return ConnectionRegistry.instance;
  }

  /**
   * Create a new connection to a WebSocket server
   */
  public createConnection(
    name: string,
    connectionConfig: Partial<ConnectionConfig>,
  ): ConnectionManager {
    // Check if we've reached the limit
    if (
      this.connections.size >= (this.options.maxConcurrentConnections || 10)
    ) {
      this.log(
        `Maximum connections reached (${this.options.maxConcurrentConnections}). Cannot create new connection: ${name}`,
      );
      throw new Error(
        `Maximum connections reached (${this.options.maxConcurrentConnections})`,
      );
    }

    // Check if it already exists
    if (this.connections.has(name)) {
      return this.connections.get(name)!;
    }

    // For WebSockets with authentication, add API keys from config
    let authParams = connectionConfig.authParams || {};
    if (["binance", "coingecko"].includes(name)) {
      authParams = this.getAuthParamsForSource(name, authParams);
    }

    // Create the connection configuration
    const fullConfig: ConnectionConfig = {
      url: this.getUrlForSource(name),
      name,
      silentFailure: this.options.silentFailMode,
      ...connectionConfig,
      authParams,
    };

    // Create and store the connection
    const connection = new ConnectionManager(fullConfig);
    this.connections.set(name, connection);

    // Log the creation
    this.log(`Created WebSocket connection: ${name}`);

    return connection;
  }

  /**
   * Get a connection by name
   */
  public getConnection(name: string): ConnectionManager | undefined {
    return this.connections.get(name);
  }

  /**
   * Get all connections
   */
  public getAllConnections(): Map<string, ConnectionManager> {
    return new Map(this.connections);
  }

  /**
   * Close a specific connection
   */
  public closeConnection(name: string): boolean {
    const connection = this.connections.get(name);
    if (connection) {
      connection.disconnect();
      this.connections.delete(name);
      this.log(`Closed WebSocket connection: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * Close all connections
   */
  public closeAllConnections(): void {
    this.connections.forEach((connection, name) => {
      connection.disconnect();
      this.log(`Closed WebSocket connection: ${name}`);
    });
    this.connections.clear();
  }

  /**
   * Get statistics for all connections
   */
  public getAllStats(): Record<string, ConnectionStats> {
    const stats: Record<string, ConnectionStats> = {};

    this.connections.forEach((connection, name) => {
      stats[name] = connection.getStats();
    });

    return stats;
  }

  /**
   * Initialize scheduled status reporting
   */
  private initializeStatusReporting(): void {
    if (this.options.loggerEnabled) {
      this.statusReportInterval = setInterval(() => {
        this.reportStatus();
      }, 60000); // Report every minute
    }
  }

  /**
   * Report the status of all connections
   */
  private reportStatus(): void {
    const stats = this.getAllStats();
    const connectionCount = Object.keys(stats).length;

    this.log(
      `WebSocket Connection Status Report (${connectionCount} connections)`,
    );

    Object.entries(stats).forEach(([name, connectionStats]) => {
      this.log(
        `  ${name}: ${connectionStats.state} (Errors: ${connectionStats.errorCount}, Messages: ${connectionStats.messageCount})`,
      );
    });
  }

  /**
   * Get the WebSocket URL for a given source
   */
  private getUrlForSource(source: string): string {
    if (source in config.websocket) {
      return config.websocket[
        source as keyof typeof config.websocket
      ] as string;
    }

    throw new Error(`Unknown WebSocket source: ${source}`);
  }

  /**
   * Get authentication parameters for a source
   */
  private getAuthParamsForSource(
    source: string,
    existing: Record<string, string>,
  ): Record<string, string> {
    const apiConfig = config.api[source as keyof typeof config.api];

    if (!apiConfig || !apiConfig.apiKeys || apiConfig.apiKeys.length === 0) {
      this.log(`Warning: No API keys found for ${source}`);
      return existing;
    }

    // Use the first API key
    const apiKey = apiConfig.apiKeys[0].key;

    if (source === "binance") {
      return {
        ...existing,
        apiKey,
      };
    } else if (source === "coingecko") {
      return {
        ...existing,
        x_cg_pro_api_key: apiKey,
      };
    }

    return existing;
  }

  /**
   * Log a message if logging is enabled
   */
  private log(message: string): void {
    if (this.options.loggerEnabled) {
      console.log(`[ConnectionRegistry] ${message}`);
    }
  }

  /**
   * Cleanup on application shutdown
   */
  public dispose(): void {
    if (this.statusReportInterval) {
      clearInterval(this.statusReportInterval);
      this.statusReportInterval = null;
    }

    this.closeAllConnections();
  }
}
