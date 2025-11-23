/**
 * =============================================================================
 * COINET SHARED DATABASE PACKAGE
 * Export all database connection management utilities
 * =============================================================================
 */

export {
  ConnectionManager,
  createConnectionManager,
  getConnectionManager,
  type DatabaseConfig,
  type ConnectionHealth,
  type ConnectionMetrics,
} from './ConnectionManager';

export { default } from './ConnectionManager';
