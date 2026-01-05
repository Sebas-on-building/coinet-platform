/**
 * 📬 COINET NOTIFICATION COMPOSER
 * 
 * Intelligent notification delivery with guardrails
 * 
 * Core Principles:
 * - Max 2 push notifications per day (unless user-set alerts)
 * - Every notification contains decision-ready data, not teasers
 * - No panic engineering (FORBIDDEN_WORDS)
 * - Opt-out first: All mechanics have clear, one-tap disable
 * 
 * Notification Types:
 * - Push: High-priority external triggers
 * - Email: Digest and summary content
 * - In-App: Variable rewards, social proof, banners
 * 
 * @module retention/notification-composer
 * @version 1.0.0
 */

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { prismaRetention } from './prisma-retention';
import {
  NotificationDeliveryRequest,
  NotificationDeliveryResult,
  ExternalTriggerChannel,
  TriggerType,
  RewardType,
  GUARDRAILS,
} from './types';

// =============================================================================
// GUARDRAILS VALIDATION
// =============================================================================

/**
 * Validate notification content against guardrails
 */
function validateContent(title: string, body: string): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  const combinedText = `${title} ${body}`.toUpperCase();
  
  // Check forbidden words
  for (const word of GUARDRAILS.FORBIDDEN_WORDS) {
    if (combinedText.includes(word.toUpperCase())) {
      violations.push(`Contains forbidden word: "${word}"`);
    }
  }
  
  // Check for question marks that could be manipulative
  if (body.includes('?') && (
    body.toLowerCase().includes('missing out') ||
    body.toLowerCase().includes('waiting for') ||
    body.toLowerCase().includes('what are you waiting')
  )) {
    violations.push('Contains manipulative question pattern');
  }
  
  return {
    valid: violations.length === 0,
    violations,
  };
}

// =============================================================================
// THROTTLING
// =============================================================================

interface ThrottleContext {
  userId: string;
  channel: ExternalTriggerChannel;
  type: string;
  todayPushCount: number;
  lastSameTypeSentAt?: Date;
  maxPushPerDay: number;
}

async function getThrottleContext(
  userId: string,
  channel: ExternalTriggerChannel,
  type: string
): Promise<ThrottleContext> {
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
  
  const [todayPushCount, lastSameType, preferences] = await Promise.all([
    prismaRetention.notificationDelivery.count({
      where: {
        userId,
        channel: 'push',
        createdAt: { gte: todayStart },
        status: { in: ['sent', 'delivered'] },
      },
    }),
    prismaRetention.notificationDelivery.findFirst({
      where: {
        userId,
        notificationType: type,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.userPreferences.findUnique({
      where: { userId },
    }),
  ]);
  
  return {
    userId,
    channel,
    type,
    todayPushCount,
    lastSameTypeSentAt: lastSameType?.sentAt ?? undefined,
    maxPushPerDay: (preferences as any)?.maxPushPerDay ?? GUARDRAILS.MAX_PUSH_PER_DAY,
  };
}

/**
 * Check if notification should be throttled
 */
function shouldThrottle(
  context: ThrottleContext,
  isUserSetAlert: boolean = false
): { throttled: boolean; reason?: string } {
  // User-set alerts bypass push limit
  if (context.channel === 'push' && !isUserSetAlert) {
    if (context.todayPushCount >= context.maxPushPerDay) {
      return {
        throttled: true,
        reason: `Daily push limit reached (${context.maxPushPerDay})`,
      };
    }
  }
  
  // Check minimum interval for same type
  if (context.lastSameTypeSentAt) {
    const hoursSinceLast = (Date.now() - context.lastSameTypeSentAt.getTime()) / (1000 * 60 * 60);
    
    // Type-specific intervals
    const minIntervals: Record<string, number> = {
      regime_shift: 6,
      morning_digest: 24,
      habit_reinforcement: 24,
      opportunity_moment: 24,
    };
    
    const minInterval = minIntervals[context.type] ?? 1;
    
    if (hoursSinceLast < minInterval) {
      return {
        throttled: true,
        reason: `Minimum interval not met (${minInterval}h required, ${hoursSinceLast.toFixed(1)}h elapsed)`,
      };
    }
  }
  
  return { throttled: false };
}

// =============================================================================
// NOTIFICATION DELIVERY
// =============================================================================

/**
 * Deliver a notification with all guardrails
 */
export async function deliverNotification(
  request: NotificationDeliveryRequest
): Promise<NotificationDeliveryResult> {
  const startTime = performance.now();
  
  try {
    // 1. Validate content against guardrails
    const validation = validateContent(request.title, request.body);
    if (!validation.valid) {
      logger.warn('📬 Notification blocked by guardrails', {
        userId: request.userId,
        type: request.type,
        violations: validation.violations,
      });
      
      return {
        success: false,
        throttled: false,
        error: `Content violation: ${validation.violations.join(', ')}`,
      };
    }
    
    // 2. Check throttling
    const throttleContext = await getThrottleContext(
      request.userId,
      request.channel,
      request.type
    );
    
    const isUserSetAlert = request.type === 'watchlist_threshold';
    
    const throttleResult = shouldThrottle(throttleContext, isUserSetAlert);
    
    if (throttleResult.throttled) {
      // Downgrade push to in-app if throttled
      if (request.channel === 'push') {
        request.channel = 'in_app';
        logger.debug('📬 Downgraded push to in-app due to throttling', {
          userId: request.userId,
          type: request.type,
          reason: throttleResult.reason,
        });
      } else {
        logger.debug('📬 Notification throttled', {
          userId: request.userId,
          type: request.type,
          reason: throttleResult.reason,
        });
        
        return {
          success: false,
          throttled: true,
          throttleReason: throttleResult.reason,
        };
      }
    }
    
    // 3. Create notification record
    const notification = await prismaRetention.notificationDelivery.create({
      data: {
        userId: request.userId,
        notificationType: request.type,
        channel: request.channel,
        title: request.title,
        body: request.body,
        symbol: request.symbol,
        metadata: request.metadata,
        status: 'pending',
        abTestId: request.abTestId,
        variant: request.variant,
        createdAt: new Date(),
      },
    });
    
    // 4. Attempt delivery based on channel
    let delivered = false;
    
    switch (request.channel) {
      case 'push':
        delivered = await deliverPush(notification.id, request);
        break;
      
      case 'email':
        delivered = await deliverEmail(notification.id, request);
        break;
      
      case 'in_app':
        // In-app notifications are instantly "delivered"
        delivered = true;
        break;
    }
    
    // 5. Update status
    await prismaRetention.notificationDelivery.update({
      where: { id: notification.id },
      data: {
        status: delivered ? 'sent' : 'failed',
        sentAt: delivered ? new Date() : null,
        failureReason: delivered ? null : 'Delivery failed',
      },
    });
    
    const processingTime = performance.now() - startTime;
    logger.debug('📬 Notification delivered', {
      userId: request.userId,
      type: request.type,
      channel: request.channel,
      notificationId: notification.id,
      processingTimeMs: processingTime.toFixed(1),
    });
    
    return {
      success: delivered,
      notificationId: notification.id,
      throttled: false,
    };
  } catch (error) {
    logger.error('📬 Notification delivery failed', {
      userId: request.userId,
      type: request.type,
      error,
    });
    
    return {
      success: false,
      throttled: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// CHANNEL-SPECIFIC DELIVERY
// =============================================================================

/**
 * Deliver push notification
 * In production, integrate with FCM/APNs
 */
async function deliverPush(
  notificationId: string,
  request: NotificationDeliveryRequest
): Promise<boolean> {
  // TODO: Integrate with push notification service (FCM, APNs, Expo Push)
  // For now, simulate successful delivery
  
  logger.debug('📬 Push notification queued', {
    notificationId,
    userId: request.userId,
    title: request.title,
  });
  
  // Simulate delivery delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return true;
}

/**
 * Deliver email notification
 * In production, integrate with email service (SendGrid, Postmark, etc.)
 */
async function deliverEmail(
  notificationId: string,
  request: NotificationDeliveryRequest
): Promise<boolean> {
  // TODO: Integrate with email service
  // For now, simulate successful delivery
  
  logger.debug('📬 Email notification queued', {
    notificationId,
    userId: request.userId,
    title: request.title,
  });
  
  // Simulate delivery delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return true;
}

// =============================================================================
// ENGAGEMENT TRACKING
// =============================================================================

/**
 * Record notification opened
 */
export async function recordNotificationOpened(notificationId: string): Promise<void> {
  try {
    await prismaRetention.notificationDelivery.update({
      where: { id: notificationId },
      data: {
        status: 'opened',
        openedAt: new Date(),
      },
    });
    
    logger.debug('📬 Notification opened', { notificationId });
  } catch (error) {
    logger.debug('Failed to record notification open', { notificationId, error });
  }
}

/**
 * Record notification clicked (CTA action)
 */
export async function recordNotificationClicked(notificationId: string): Promise<void> {
  try {
    await prismaRetention.notificationDelivery.update({
      where: { id: notificationId },
      data: {
        status: 'clicked',
        clickedAt: new Date(),
      },
    });
    
    logger.debug('📬 Notification clicked', { notificationId });
  } catch (error) {
    logger.debug('Failed to record notification click', { notificationId, error });
  }
}

// =============================================================================
// NOTIFICATION TEMPLATES
// =============================================================================

interface NotificationTemplate {
  type: TriggerType | RewardType | 'daily_ritual';
  channel: ExternalTriggerChannel;
  titleTemplate: string;
  bodyTemplate: string;
}

const TEMPLATES: NotificationTemplate[] = [
  // Trigger templates
  {
    type: 'regime_shift',
    channel: 'push',
    titleTemplate: 'Market shifted to {regime}',
    bodyTemplate: '{affected_count} of your watched coins affected—{summary}',
  },
  {
    type: 'watchlist_threshold',
    channel: 'push',
    titleTemplate: '{symbol} {direction} your ${threshold} alert',
    bodyTemplate: 'Now at ${price} ({change}% today)',
  },
  {
    type: 'morning_digest',
    channel: 'push',
    titleTemplate: 'Good morning. {summary_emoji}',
    bodyTemplate: 'Overnight: {summary}. {highlight}',
  },
  {
    type: 'opportunity_moment',
    channel: 'in_app',
    titleTemplate: '{symbol} moved to {quadrant}',
    bodyTemplate: 'QS {qs}, OS {os}—{interpretation}',
  },
  {
    type: 'conversation_memory',
    channel: 'in_app',
    titleTemplate: 'Update on {symbol}',
    bodyTemplate: 'You asked {days_ago} days ago. OmniScore {direction} {delta} pts',
  },
  {
    type: 'habit_reinforcement',
    channel: 'push',
    titleTemplate: 'Your watchlist hasn\'t checked itself yet today 👀',
    bodyTemplate: '{coin_count} coins waiting. Keep your {streak}-day streak!',
  },
  
  // Reward templates
  {
    type: 'early_adopter',
    channel: 'in_app',
    titleTemplate: 'Early Signal 🎯',
    bodyTemplate: 'You added {symbol} {days_ago} days ago—now {trend}',
  },
  {
    type: 'quadrant_transition',
    channel: 'in_app',
    titleTemplate: 'Builder Opportunity 💎',
    bodyTemplate: '{symbol} entered {quadrant} (QS {qs}, OS {os})',
  },
  {
    type: 'decision_validation',
    channel: 'in_app',
    titleTemplate: 'Your Call 📈',
    bodyTemplate: '{symbol} is {direction} {change}% since you analyzed it',
  },
];

/**
 * Get template for notification type
 */
export function getTemplate(type: string): NotificationTemplate | undefined {
  return TEMPLATES.find(t => t.type === type);
}

/**
 * Render template with variables
 */
export function renderTemplate(
  template: NotificationTemplate,
  variables: Record<string, unknown>
): { title: string; body: string } {
  let title = template.titleTemplate;
  let body = template.bodyTemplate;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    title = title.replace(new RegExp(placeholder, 'g'), String(value));
    body = body.replace(new RegExp(placeholder, 'g'), String(value));
  }
  
  return { title, body };
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Get unread notifications for a user (for in-app display)
 */
export async function getUnreadNotifications(
  userId: string,
  limit: number = 10
): Promise<Array<{
  id: string;
  type: string;
  title: string;
  body: string;
  symbol?: string;
  createdAt: Date;
}>> {
  try {
    const notifications = await prismaRetention.notificationDelivery.findMany({
      where: {
        userId,
        channel: 'in_app',
        openedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        notificationType: true,
        title: true,
        body: true,
        symbol: true,
        createdAt: true,
      },
    });
    
    return notifications.map(n => ({
      id: n.id,
      type: n.notificationType,
      title: n.title,
      body: n.body,
      symbol: n.symbol ?? undefined,
      createdAt: n.createdAt,
    }));
  } catch (error) {
    logger.debug('Failed to get unread notifications', { userId, error });
    return [];
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(userId: string): Promise<number> {
  try {
    const result = await prismaRetention.notificationDelivery.updateMany({
      where: {
        userId,
        openedAt: null,
      },
      data: {
        openedAt: new Date(),
        status: 'opened',
      },
    });
    
    return result.count;
  } catch (error) {
    logger.debug('Failed to mark notifications as read', { userId, error });
    return 0;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const notificationComposer = {
  deliver: deliverNotification,
  recordOpened: recordNotificationOpened,
  recordClicked: recordNotificationClicked,
  getTemplate,
  renderTemplate,
  getUnread: getUnreadNotifications,
  markAllAsRead,
  validateContent,
};

export default notificationComposer;
