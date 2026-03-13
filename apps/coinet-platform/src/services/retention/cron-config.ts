/**
 * Retention cron jobs configuration.
 * Called when RETENTION_ENABLED=true to schedule retention-related tasks.
 */

import { logger } from '../../utils/logger';

export function setupRetentionCronJobs(): void {
  logger.info('Retention cron jobs placeholder - configure node-cron jobs here');
  // TODO: Add node-cron schedules for retention cleanup, analytics aggregation, etc.
}
