/**
 * 🎯 COINET RETENTION SYSTEM API ROUTES
 * 
 * REST API endpoints for the Intelligence Ritual retention system
 * 
 * Endpoints:
 * - GET  /api/retention/session-start      - Initialize session with triggers/rewards
 * - POST /api/retention/query-completed    - Process completed query
 * - GET  /api/retention/notifications      - Get pending notifications
 * - POST /api/retention/notifications/:id/opened  - Mark notification opened
 * - POST /api/retention/notifications/:id/clicked - Mark notification clicked
 * - GET  /api/retention/rewards            - Get pending rewards
 * - POST /api/retention/rewards/:id/viewed - Mark reward viewed
 * - POST /api/retention/rewards/:id/clicked - Mark reward clicked
 * - GET  /api/retention/ritual-card        - Get current ritual card
 * - POST /api/retention/investment/:action - Record investment action
 * - GET  /api/retention/investment/prompts - Get pending investment prompts
 * - GET  /api/retention/personalization    - Get personalized content settings
 * - GET  /api/retention/quick-replies      - Get personalized quick replies
 * - GET  /api/retention/lifecycle          - Get user lifecycle state
 * - GET  /api/retention/metrics            - Get retention metrics (admin)
 * 
 * @module api/retention/routes
 * @version 1.0.0
 */

import { Router, Request, Response } from 'express';
import { retentionEngine } from '../../services/retention';
import { InvestmentAction, RitualTime } from '../../services/retention/types';
import { logger } from '../../utils/logger';
import { prismaRetention } from '../../services/retention/prisma-retention';

const router = Router();

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

/**
 * GET /api/retention/session-start
 * Initialize a session and get all relevant data
 */
router.get('/session-start', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const sessionId = (req as any).requestId || `session-${Date.now()}`;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }
  
  try {
    const startTime = Date.now();
    
    const sessionData = await retentionEngine.onSessionStart(userId, sessionId);
    
    // Record session in database (requires Prisma schema update)
    try {
      await prismaRetention.userSession?.create({
        data: {
          userId,
          sessionStart: new Date(),
          entryTrigger: req.query.trigger as string || 'organic',
          deviceType: req.query.device as string,
          platform: req.query.platform as string,
        },
      });
    } catch {
      // Model may not exist yet - continue without session tracking
    }
    
    const duration = Date.now() - startTime;
    
    res.json({
      success: true,
      data: {
        ...sessionData,
        processingTimeMs: duration,
      },
    });
  } catch (error) {
    logger.error('Session start failed', { userId, error });
    res.status(500).json({ error: 'Session start failed' });
  }
});

/**
 * POST /api/retention/query-completed
 * Process a completed query and get post-query actions
 */
router.post('/query-completed', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const { query, symbols, intent, sessionId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }
  
  try {
    // Record the query (requires Prisma schema update)
    try {
      await prismaRetention.userQuery?.create({
        data: {
          userId,
          sessionId,
          query,
          symbols: symbols || [],
          intent,
          createdAt: new Date(),
        },
      });
    } catch {
      // Model may not exist yet
    }
    
    // Update session query count
    if (sessionId) {
      try {
        await prismaRetention.userSession?.update({
          where: { id: sessionId },
          data: { queriesCount: { increment: 1 } },
        });
      } catch {
        // Model may not exist yet
      }
    }
    
    const result = await retentionEngine.onQueryCompleted(
      userId,
      query,
      symbols || [],
      intent
    );
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Query completion processing failed', { userId, error });
    res.status(500).json({ error: 'Processing failed' });
  }
});

// =============================================================================
// NOTIFICATIONS
// =============================================================================

/**
 * GET /api/retention/notifications
 * Get unread notifications for the user
 */
router.get('/notifications', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const limit = parseInt(req.query.limit as string) || 10;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }
  
  try {
    const notifications = await retentionEngine.getUnreadNotifications(userId);
    
    res.json({
      success: true,
      data: {
        notifications: notifications.slice(0, limit),
        hasMore: notifications.length > limit,
      },
    });
  } catch (error) {
    logger.error('Get notifications failed', { userId, error });
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

/**
 * POST /api/retention/notifications/:id/opened
 * Mark notification as opened
 */
router.post('/notifications/:id/opened', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    await prismaRetention.notificationDelivery?.update({
      where: { id },
      data: {
        status: 'opened',
        openedAt: new Date(),
      },
    });
    
    res.json({ success: true });
  } catch (error) {
    logger.debug('Mark notification opened failed', { id, error });
    res.status(404).json({ error: 'Notification not found' });
  }
});

/**
 * POST /api/retention/notifications/:id/clicked
 * Mark notification as clicked
 */
router.post('/notifications/:id/clicked', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    await prismaRetention.notificationDelivery?.update({
      where: { id },
      data: {
        status: 'clicked',
        clickedAt: new Date(),
      },
    });
    
    res.json({ success: true });
  } catch (error) {
    logger.debug('Mark notification clicked failed', { id, error });
    res.status(404).json({ error: 'Notification not found' });
  }
});

// =============================================================================
// REWARDS
// =============================================================================

/**
 * GET /api/retention/rewards
 * Get pending rewards for the user
 */
router.get('/rewards', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const surface = req.query.surface as string;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }
  
  try {
    const rewards = await retentionEngine.getPendingRewards(userId);
    
    // Filter by surface if specified
    const filteredRewards = surface ?
      rewards.filter(r => r.surfaceType === surface) : rewards;
    
    res.json({
      success: true,
      data: {
        rewards: filteredRewards,
      },
    });
  } catch (error) {
    logger.error('Get rewards failed', { userId, error });
    res.status(500).json({ error: 'Failed to get rewards' });
  }
});

/**
 * POST /api/retention/rewards/:id/viewed
 * Mark reward as viewed
 */
router.post('/rewards/:id/viewed', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    await prismaRetention.retentionReward?.update({
      where: { id },
      data: {
        isViewed: true,
        viewedAt: new Date(),
      },
    });
    
    res.json({ success: true });
  } catch (error) {
    logger.debug('Mark reward viewed failed', { id, error });
    res.status(404).json({ error: 'Reward not found' });
  }
});

/**
 * POST /api/retention/rewards/:id/clicked
 * Mark reward as clicked
 */
router.post('/rewards/:id/clicked', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    await prismaRetention.retentionReward?.update({
      where: { id },
      data: {
        isClicked: true,
        clickedAt: new Date(),
      },
    });
    
    res.json({ success: true });
  } catch (error) {
    logger.debug('Mark reward clicked failed', { id, error });
    res.status(404).json({ error: 'Reward not found' });
  }
});

// =============================================================================
// DAILY RITUAL
// =============================================================================

/**
 * GET /api/retention/ritual-card
 * Get the ritual card for current time slot
 */
router.get('/ritual-card', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const forceTime = req.query.time as RitualTime;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }
  
  try {
    const time = forceTime || retentionEngine.getCurrentRitualTime();
    
    if (!time) {
      return res.json({
        success: true,
        data: {
          ritualCard: null,
          message: 'Not in a ritual time window',
        },
      });
    }
    
    const ritualCard = await retentionEngine.generateRitualCard(userId, time);
    
    res.json({
      success: true,
      data: { ritualCard },
    });
  } catch (error) {
    logger.error('Get ritual card failed', { userId, error });
    res.status(500).json({ error: 'Failed to generate ritual card' });
  }
});

// =============================================================================
// INVESTMENT ACTIONS
// =============================================================================

/**
 * POST /api/retention/investment/:action
 * Record an investment action
 */
router.post('/investment/:action', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const action = req.params.action as InvestmentAction;
  const metadata = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }
  
  const validActions: InvestmentAction[] = [
    'watchlist_add', 'price_alert', 'morning_digest', 'save_history',
    'risk_tolerance', 'portfolio_set', 'regime_prefs', 'trading_notes',
    'wallet_connect', 'referral',
  ];
  
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: 'Invalid action type' });
  }
  
  try {
    await retentionEngine.recordInvestmentAction(userId, action, metadata);
    
    res.json({
      success: true,
      data: { recorded: true },
    });
  } catch (error) {
    logger.error('Record investment action failed', { userId, action, error });
    res.status(500).json({ error: 'Failed to record action' });
  }
});

/**
 * GET /api/retention/investment/prompts
 * Get pending investment prompts
 */
router.get('/investment/prompts', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const context = req.query.context as string;
  const symbol = req.query.symbol as string;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }
  
  try {
    // Check each action type for eligibility
    const actions: InvestmentAction[] = [
      'watchlist_add', 'price_alert', 'morning_digest',
      'risk_tolerance', 'portfolio_set',
    ];
    
    const prompts = [];
    
    for (const action of actions) {
      const { shouldPrompt } = await retentionEngine.shouldPromptInvestment(
        userId,
        action,
        { context, symbol }
      );
      
      if (shouldPrompt) {
        prompts.push(retentionEngine.generateInvestmentPrompt(
          userId,
          action,
          { context, symbol }
        ));
      }
    }
    
    res.json({
      success: true,
      data: { prompts },
    });
  } catch (error) {
    logger.error('Get investment prompts failed', { userId, error });
    res.status(500).json({ error: 'Failed to get prompts' });
  }
});

// =============================================================================
// PERSONALIZATION
// =============================================================================

/**
 * GET /api/retention/personalization
 * Get personalized content settings
 */
router.get('/personalization', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }
  
  try {
    const [context, content] = await Promise.all([
      retentionEngine.getPersonalizationContext(userId),
      retentionEngine.getPersonalizedContent(userId),
    ]);
    
    res.json({
      success: true,
      data: { context, content },
    });
  } catch (error) {
    logger.error('Get personalization failed', { userId, error });
    res.status(500).json({ error: 'Failed to get personalization' });
  }
});

/**
 * GET /api/retention/quick-replies
 * Get personalized quick reply chips
 */
router.get('/quick-replies', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  const symbol = req.query.symbol as string;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }
  
  try {
    const quickReplies = await retentionEngine.getQuickReplies(userId, symbol);
    
    res.json({
      success: true,
      data: { quickReplies },
    });
  } catch (error) {
    logger.error('Get quick replies failed', { userId, error });
    res.status(500).json({ error: 'Failed to get quick replies' });
  }
});

/**
 * GET /api/retention/ai-instructions
 * Get personalized AI format instructions
 */
router.get('/ai-instructions', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }
  
  try {
    const instructions = await retentionEngine.getAIFormatInstructions(userId);
    
    res.json({
      success: true,
      data: { instructions },
    });
  } catch (error) {
    logger.error('Get AI instructions failed', { userId, error });
    res.status(500).json({ error: 'Failed to get instructions' });
  }
});

// =============================================================================
// LIFECYCLE
// =============================================================================

/**
 * GET /api/retention/lifecycle
 * Get user lifecycle state and next best actions
 */
router.get('/lifecycle', async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }
  
  try {
    const [lifecycle, nextBestActions] = await Promise.all([
      retentionEngine.updateLifecycleState(userId),
      retentionEngine.getNextBestActions(userId),
    ]);
    
    res.json({
      success: true,
      data: { lifecycle, nextBestActions },
    });
  } catch (error) {
    logger.error('Get lifecycle failed', { userId, error });
    res.status(500).json({ error: 'Failed to get lifecycle' });
  }
});

// =============================================================================
// ADMIN / METRICS
// =============================================================================

/**
 * GET /api/retention/metrics
 * Get retention metrics (admin only)
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = await retentionEngine.calculateMetrics();
    
    res.json({
      success: true,
      data: { metrics },
    });
  } catch (error) {
    logger.error('Get metrics failed', { error });
    res.status(500).json({ error: 'Failed to calculate metrics' });
  }
});

/**
 * GET /api/retention/failures
 * Get detected failure modes (admin only)
 */
router.get('/failures', async (req: Request, res: Response) => {
  try {
    const failures = await retentionEngine.detectFailures();
    
    res.json({
      success: true,
      data: { failures },
    });
  } catch (error) {
    logger.error('Get failures failed', { error });
    res.status(500).json({ error: 'Failed to detect failures' });
  }
});

/**
 * POST /api/retention/scheduled-jobs
 * Run scheduled retention jobs (cron endpoint)
 * 
 * Body: { jobType?: 'hourly_maintenance' | 'morning_digest' | 'evening_ritual' | 'daily_metrics' | 'weekly_analysis' }
 * If no jobType provided, runs all jobs
 */
router.post('/scheduled-jobs', async (req: Request, res: Response) => {
  const authKey = req.headers['x-cron-key'];
  
  // Simple auth for cron jobs
  if (authKey !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const { runScheduledJob, runAllScheduledJobs } = await import('../../services/retention/scheduled-jobs');
    const { jobType } = req.body;
    
    let result;
    if (jobType) {
      result = await runScheduledJob(jobType);
    } else {
      const results = await runAllScheduledJobs();
      result = results;
    }
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Scheduled jobs failed', { error });
    res.status(500).json({ error: 'Scheduled jobs failed', details: (error as Error).message });
  }
});

export default router;
