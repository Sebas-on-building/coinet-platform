/**
 * 🗄️ Coinet Platform - Database Client
 * 
 * Divine Prisma client initialization with connection pooling,
 * error handling, and query optimization.
 */

import { PrismaClient } from '@prisma/client';

// Extend PrismaClient with custom logging and error handling
export class CoinetPrismaClient extends PrismaClient {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
      errorFormat: 'pretty',
    });

    // Connection lifecycle hooks (if supported)
    try {
      (this as any).$on('beforeExit', async () => {
        console.log('📊 Prisma Client: Disconnecting from database...');
      });
    } catch {
      // Event emitter not available in all Prisma versions
    }
  }

  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number }> {
    try {
      // Check if DATABASE_URL is configured
      if (!process.env.DATABASE_URL) {
        return {
          healthy: false,
        };
      }

      const start = Date.now();
      await this.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;

      return {
        healthy: true,
        latency,
      };
    } catch (error) {
      // Don't log errors in health check to avoid spam
      return {
        healthy: false,
      };
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    try {
      // Only count if database is connected and tables exist
      const [conversations, messages, agents] = await Promise.all([
        this.conversation.count().catch(() => 0),
        this.message.count().catch(() => 0),
        this.agent.count().catch(() => 0),
      ]);

      return {
        conversations,
        messages,
        agents,
        alerts: 0, // Will be available after migrations
        insights: 0, // Will be available after migrations
      };
    } catch (error) {
      console.error('❌ Failed to get database stats:', error);
      return {
        conversations: 0,
        messages: 0,
        agents: 0,
        alerts: 0,
        insights: 0,
      };
    }
  }
}

// Singleton instance - export the client
export const prisma = new CoinetPrismaClient();

// Graceful shutdown handling
process.on('beforeExit', async () => {
  console.log('🛑 Closing Prisma Client connection...');
  await prisma.$disconnect();
});

export default prisma;

