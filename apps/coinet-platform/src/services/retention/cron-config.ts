/**
 * ⏰ COINET RETENTION CRON CONFIGURATION
 * 
 * Cron schedule configuration for retention system jobs
 * 
 * Install node-cron: npm install node-cron @types/node-cron
 * 
 * Usage:
 * ```typescript
 * import { setupRetentionCronJobs } from './services/retention/cron-config';
 * setupRetentionCronJobs();
 * ```
 * 
 * @module retention/cron-config
 * @version 1.0.0
 */

import * as cron from 'node-cron';
import { runScheduledJob, JobType } from './scheduled-jobs';
import { logger } from '../../utils/logger';

// =============================================================================
// CRON SCHEDULES
// =============================================================================

/**
 * Cron schedule patterns:
 * - Minute Hour Day Month DayOfWeek
 * - * * * * * = every minute
 * - 0 * * * * = every hour at minute 0
 * - 0 6 * * * = every day at 6am
 * - 0 0 * * 0 = every Sunday at midnight
 */

const CRON_SCHEDULES: Record<JobType, string> = {
  hourly_maintenance: '0 * * * *',      // Every hour at minute 0
  morning_digest: '0 6 * * *',          // Every day at 6am
  evening_ritual: '0 20 * * *',        // Every day at 8pm (20:00)
  daily_metrics: '0 0 * * *',          // Every day at midnight
  weekly_analysis: '0 0 * * 0',        // Every Sunday at midnight
};

// =============================================================================
// CRON JOB SETUP
// =============================================================================

let cronJobs: cron.ScheduledTask[] = [];

/**
 * Setup all retention cron jobs
 */
export function setupRetentionCronJobs(): void {
  logger.info('⏰ Setting up retention cron jobs');
  
  // Clear existing jobs
  cronJobs.forEach(job => job.stop());
  cronJobs = [];
  
  // Setup hourly maintenance
  const hourlyJob = cron.schedule(CRON_SCHEDULES.hourly_maintenance, async () => {
    logger.info('⏰ Running hourly maintenance cron job');
    try {
      const result = await runScheduledJob('hourly_maintenance');
      logger.info('⏰ Hourly maintenance completed', result);
    } catch (error) {
      logger.error('⏰ Hourly maintenance cron job failed', { error });
    }
  }, {
    scheduled: true,
    timezone: 'UTC',
  });
  cronJobs.push(hourlyJob);
  
  // Setup morning digest
  const morningJob = cron.schedule(CRON_SCHEDULES.morning_digest, async () => {
    logger.info('⏰ Running morning digest cron job');
    try {
      const result = await runScheduledJob('morning_digest');
      logger.info('⏰ Morning digest completed', result);
    } catch (error) {
      logger.error('⏰ Morning digest cron job failed', { error });
    }
  }, {
    scheduled: true,
    timezone: 'UTC',
  });
  cronJobs.push(morningJob);
  
  // Setup evening ritual
  const eveningJob = cron.schedule(CRON_SCHEDULES.evening_ritual, async () => {
    logger.info('⏰ Running evening ritual cron job');
    try {
      const result = await runScheduledJob('evening_ritual');
      logger.info('⏰ Evening ritual completed', result);
    } catch (error) {
      logger.error('⏰ Evening ritual cron job failed', { error });
    }
  }, {
    scheduled: true,
    timezone: 'UTC',
  });
  cronJobs.push(eveningJob);
  
  // Setup daily metrics
  const dailyJob = cron.schedule(CRON_SCHEDULES.daily_metrics, async () => {
    logger.info('⏰ Running daily metrics cron job');
    try {
      const result = await runScheduledJob('daily_metrics');
      logger.info('⏰ Daily metrics completed', result);
    } catch (error) {
      logger.error('⏰ Daily metrics cron job failed', { error });
    }
  }, {
    scheduled: true,
    timezone: 'UTC',
  });
  cronJobs.push(dailyJob);
  
  // Setup weekly analysis
  const weeklyJob = cron.schedule(CRON_SCHEDULES.weekly_analysis, async () => {
    logger.info('⏰ Running weekly analysis cron job');
    try {
      const result = await runScheduledJob('weekly_analysis');
      logger.info('⏰ Weekly analysis completed', result);
    } catch (error) {
      logger.error('⏰ Weekly analysis cron job failed', { error });
    }
  }, {
    scheduled: true,
    timezone: 'UTC',
  });
  cronJobs.push(weeklyJob);
  
  logger.info('⏰ Retention cron jobs setup complete', {
    jobsCount: cronJobs.length,
    schedules: CRON_SCHEDULES,
  });
}

/**
 * Stop all retention cron jobs
 */
export function stopRetentionCronJobs(): void {
  logger.info('⏰ Stopping retention cron jobs');
  cronJobs.forEach(job => job.stop());
  cronJobs = [];
}

/**
 * Get status of all cron jobs
 */
export function getCronJobStatus(): Array<{ jobType: JobType; schedule: string; running: boolean }> {
  return Object.entries(CRON_SCHEDULES).map(([jobType, schedule]) => ({
    jobType: jobType as JobType,
    schedule,
    running: cronJobs.some(job => job.getStatus() === 'scheduled'),
  }));
}

// =============================================================================
// ALTERNATIVE: EXTERNAL CRON SETUP
// =============================================================================

/**
 * For production, you may want to use external cron (e.g., system cron, Kubernetes CronJob)
 * 
 * Add to crontab (crontab -e):
 * 
 * # Retention System Jobs
 * 0 * * * * curl -X POST http://localhost:3000/api/retention/scheduled-jobs -H "X-Cron-Key: YOUR_SECRET_KEY" -H "Content-Type: application/json" -d '{"jobType":"hourly_maintenance"}'
 * 0 6 * * * curl -X POST http://localhost:3000/api/retention/scheduled-jobs -H "X-Cron-Key: YOUR_SECRET_KEY" -H "Content-Type: application/json" -d '{"jobType":"morning_digest"}'
 * 0 20 * * * curl -X POST http://localhost:3000/api/retention/scheduled-jobs -H "X-Cron-Key: YOUR_SECRET_KEY" -H "Content-Type: application/json" -d '{"jobType":"evening_ritual"}'
 * 0 0 * * * curl -X POST http://localhost:3000/api/retention/scheduled-jobs -H "X-Cron-Key: YOUR_SECRET_KEY" -H "Content-Type: application/json" -d '{"jobType":"daily_metrics"}'
 * 0 0 * * 0 curl -X POST http://localhost:3000/api/retention/scheduled-jobs -H "X-Cron-Key: YOUR_SECRET_KEY" -H "Content-Type: application/json" -d '{"jobType":"weekly_analysis"}'
 */
