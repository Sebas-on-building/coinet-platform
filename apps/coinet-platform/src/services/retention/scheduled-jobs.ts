/**
 * ⏰ COINET RETENTION SCHEDULED JOBS
 * 
 * Cron jobs for retention system maintenance and intelligence delivery
 * 
 * Jobs:
 * - Hourly: Trigger evaluation, reward generation, failure detection
 * - Daily (6am): Morning digest generation
 * - Daily (8pm): Evening ritual generation
 * - Daily (midnight): Metrics calculation, lifecycle updates
 * - Weekly (Sunday): A/B test analysis, cohort retention
 * 
 * Usage:
 * - Set up with cron or a job scheduler (e.g., node-cron, BullMQ)
 * - Or call directly: POST /api/retention/scheduled-jobs
 * 
 * @module retention/scheduled-jobs
 * @version 1.0.0
 */

import { retentionEngine } from './index';
import { abTestingFramework } from './ab-testing-framework';
import { calculateCohortRetention } from './retention-analytics';
import { logger } from '../../utils/logger';

// =============================================================================
// JOB TYPES
// =============================================================================

export type JobType = 
  | 'hourly_maintenance'
  | 'morning_digest'
  | 'evening_ritual'
  | 'daily_metrics'
  | 'weekly_analysis';

export interface JobResult {
  jobType: JobType;
  success: boolean;
  processed: number;
  errors: number;
  durationMs: number;
  details?: Record<string, unknown>;
}

// =============================================================================
// HOURLY MAINTENANCE
// =============================================================================

/**
 * Run hourly retention maintenance
 * - Evaluate triggers for all active users
 * - Generate rewards
 * - Detect failure modes
 */
export async function runHourlyMaintenance(): Promise<JobResult> {
  const startTime = Date.now();
  let processed = 0;
  let errors = 0;
  
  try {
    logger.info('⏰ Running hourly retention maintenance');
    
    // Get active users (sessions in last 7 days)
    const activeUsers = await getActiveUsers();
    
    for (const userId of activeUsers.slice(0, 1000)) { // Limit to 1000 per run
      try {
        // Evaluate triggers
        await retentionEngine.evaluateTriggers(userId);
        
        // Generate rewards
        await retentionEngine.generateRewards(userId);
        
        processed++;
      } catch (error) {
        errors++;
        logger.warn('⏰ Hourly maintenance error for user', { userId, error });
      }
    }
    
    // Detect failures
    const failures = await retentionEngine.detectFailures();
    logger.info('⏰ Failure detection', { count: failures.length });
    
    const duration = Date.now() - startTime;
    
    return {
      jobType: 'hourly_maintenance',
      success: errors === 0,
      processed,
      errors,
      durationMs: duration,
      details: {
        activeUsers: activeUsers.length,
        failuresDetected: failures.length,
      },
    };
  } catch (error) {
    logger.error('⏰ Hourly maintenance failed', { error });
    return {
      jobType: 'hourly_maintenance',
      success: false,
      processed,
      errors: errors + 1,
      durationMs: Date.now() - startTime,
    };
  }
}

// =============================================================================
// MORNING DIGEST GENERATION
// =============================================================================

/**
 * Generate morning digest for all users with it enabled
 * Runs at 6am local time (or user's preferred time)
 */
export async function runMorningDigest(): Promise<JobResult> {
  const startTime = Date.now();
  let processed = 0;
  let errors = 0;
  
  try {
    logger.info('🌅 Running morning digest generation');
    
    // Get users with morning digest enabled
    const users = await getUsersWithMorningDigest();
    
    for (const userId of users) {
      try {
        // Generate morning ritual card
        await retentionEngine.generateRitualCard(userId, 'morning');
        
        // Send morning digest trigger
        await retentionEngine.evaluateTriggers(userId);
        
        processed++;
      } catch (error) {
        errors++;
        logger.warn('🌅 Morning digest error for user', { userId, error });
      }
    }
    
    const duration = Date.now() - startTime;
    
    return {
      jobType: 'morning_digest',
      success: errors === 0,
      processed,
      errors,
      durationMs: duration,
    };
  } catch (error) {
    logger.error('🌅 Morning digest generation failed', { error });
    return {
      jobType: 'morning_digest',
      success: false,
      processed,
      errors: errors + 1,
      durationMs: Date.now() - startTime,
    };
  }
}

// =============================================================================
// EVENING RITUAL GENERATION
// =============================================================================

/**
 * Generate evening ritual cards
 * Runs at 8pm local time
 */
export async function runEveningRitual(): Promise<JobResult> {
  const startTime = Date.now();
  let processed = 0;
  let errors = 0;
  
  try {
    logger.info('🌙 Running evening ritual generation');
    
    // Get active users
    const activeUsers = await getActiveUsers();
    
    for (const userId of activeUsers.slice(0, 500)) { // Limit to 500 per run
      try {
        await retentionEngine.generateRitualCard(userId, 'evening');
        processed++;
      } catch (error) {
        errors++;
        logger.warn('🌙 Evening ritual error for user', { userId, error });
      }
    }
    
    const duration = Date.now() - startTime;
    
    return {
      jobType: 'evening_ritual',
      success: errors === 0,
      processed,
      errors,
      durationMs: duration,
    };
  } catch (error) {
    logger.error('🌙 Evening ritual generation failed', { error });
    return {
      jobType: 'evening_ritual',
      success: false,
      processed,
      errors: errors + 1,
      durationMs: Date.now() - startTime,
    };
  }
}

// =============================================================================
// DAILY METRICS CALCULATION
// =============================================================================

/**
 * Calculate daily retention metrics
 * Runs at midnight
 */
export async function runDailyMetrics(): Promise<JobResult> {
  const startTime = Date.now();
  let processed = 0;
  let errors = 0;
  
  try {
    logger.info('📊 Running daily metrics calculation');
    
    // Calculate metrics
    const metrics = await retentionEngine.calculateMetrics();
    
    // Update lifecycle states for all users
    const users = await getAllUsers();
    
    for (const userId of users.slice(0, 2000)) { // Limit to 2000 per run
      try {
        await retentionEngine.updateLifecycleState(userId);
        processed++;
      } catch (error) {
        errors++;
        logger.warn('📊 Lifecycle update error for user', { userId, error });
      }
    }
    
    const duration = Date.now() - startTime;
    
    return {
      jobType: 'daily_metrics',
      success: errors === 0,
      processed,
      errors,
      durationMs: duration,
      details: {
        metrics,
      },
    };
  } catch (error) {
    logger.error('📊 Daily metrics calculation failed', { error });
    return {
      jobType: 'daily_metrics',
      success: false,
      processed,
      errors: errors + 1,
      durationMs: Date.now() - startTime,
    };
  }
}

// =============================================================================
// WEEKLY ANALYSIS
// =============================================================================

/**
 * Run weekly analysis and A/B test evaluation
 * Runs on Sundays
 */
export async function runWeeklyAnalysis(): Promise<JobResult> {
  const startTime = Date.now();
  let processed = 0;
  let errors = 0;
  
  try {
    logger.info('📈 Running weekly analysis');
    
    // Analyze A/B tests
    const abTests = await getActiveABTests();
    
    for (const testId of abTests) {
      try {
        await abTestingFramework.analyzeTestResults(testId);
        processed++;
      } catch (error) {
        errors++;
        logger.warn('📈 A/B test analysis error', { testId, error });
      }
    }
    
    // Calculate cohort retention
    const cohorts = await getRecentCohorts();
    
    for (const cohortDate of cohorts) {
      try {
        await calculateCohortRetention(cohortDate, [7, 14, 30, 60, 90]);
        processed++;
      } catch (error) {
        errors++;
        logger.warn('📈 Cohort retention error', { cohortDate, error });
      }
    }
    
    const duration = Date.now() - startTime;
    
    return {
      jobType: 'weekly_analysis',
      success: errors === 0,
      processed,
      errors,
      durationMs: duration,
    };
  } catch (error) {
    logger.error('📈 Weekly analysis failed', { error });
    return {
      jobType: 'weekly_analysis',
      success: false,
      processed,
      errors: errors + 1,
      durationMs: Date.now() - startTime,
    };
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getActiveUsers(): Promise<string[]> {
  // Get users with sessions in last 7 days
  const { prismaRetention } = await import('./prisma-retention');
  
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const sessions = await prismaRetention.userSession?.findMany({
      where: {
        sessionStart: { gte: weekAgo },
      },
      select: { userId: true },
      distinct: ['userId'],
    }) || [];
    
    return [...new Set(sessions.map((s: any) => s.userId))];
  } catch {
    return [];
  }
}

async function getUsersWithMorningDigest(): Promise<string[]> {
  const { prisma } = await import('../../db/client');
  
  try {
    const users = await prisma.userPreferences.findMany({
      where: {
        morningDigestEnabled: true,
      } as any,
      select: { userId: true },
    });
    
    return users.map(u => u.userId);
  } catch {
    return [];
  }
}

async function getAllUsers(): Promise<string[]> {
  const { prisma } = await import('../../db/client');
  
  try {
    const users = await (prisma as any).user.findMany({
      select: { id: true },
    });
    
    return users.map((u: any) => u.id);
  } catch {
    return [];
  }
}

async function getActiveABTests(): Promise<string[]> {
  const { prismaRetention } = await import('./prisma-retention');
  
  try {
    const tests = await prismaRetention.retentionABTest?.findMany({
      where: {
        status: 'running',
      },
      select: { id: true },
    }) || [];
    
    return tests.map((t: any) => t.id);
  } catch {
    return [];
  }
}

async function getRecentCohorts(): Promise<Date[]> {
  // Get signup dates from last 90 days, grouped by day
  const cohorts: Date[] = [];
  const today = new Date();
  
  for (let i = 0; i < 90; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    cohorts.push(date);
  }
  
  return cohorts;
}

// =============================================================================
// MAIN RUNNER
// =============================================================================

/**
 * Run all scheduled jobs based on job type
 */
export async function runScheduledJob(jobType: JobType): Promise<JobResult> {
  switch (jobType) {
    case 'hourly_maintenance':
      return runHourlyMaintenance();
    case 'morning_digest':
      return runMorningDigest();
    case 'evening_ritual':
      return runEveningRitual();
    case 'daily_metrics':
      return runDailyMetrics();
    case 'weekly_analysis':
      return runWeeklyAnalysis();
    default:
      throw new Error(`Unknown job type: ${jobType}`);
  }
}

/**
 * Run all scheduled jobs (for testing/admin)
 */
export async function runAllScheduledJobs(): Promise<JobResult[]> {
  const results: JobResult[] = [];
  
  // Run in sequence to avoid overwhelming the system
  results.push(await runHourlyMaintenance());
  results.push(await runDailyMetrics());
  
  return results;
}
