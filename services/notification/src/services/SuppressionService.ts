import { SuppressionList, UnsubscribeRequest, EmailEvent } from '@/types';
import { Logger } from '@/utils/Logger';

export interface SuppressionRule {
  id: string;
  name: string;
  type: 'domain' | 'email' | 'pattern' | 'campaign';
  value: string;
  action: 'block' | 'bounce' | 'complaint';
  reason: string | undefined;
  expiresAt: Date | undefined;
  createdAt: Date;
  createdBy: string;
  isActive: boolean;
}

export interface SuppressionCheck {
  isSuppressed: boolean;
  reason?: string;
  rule?: SuppressionRule;
  canOverride: boolean;
  overrideReason?: string;
}

export class SuppressionService {
  private static instance: SuppressionService;
  private logger: Logger;
  private suppressionLists: Map<string, SuppressionList> = new Map();
  private suppressionRules: Map<string, SuppressionRule> = new Map();

  // In-memory storage for demo - in production, this would use Redis/database
  private suppressedEmails: Set<string> = new Set();
  private bounceCounts: Map<string, number> = new Map();
  private complaintCounts: Map<string, number> = new Map();

  private constructor() {
    this.logger = Logger.getInstance();
    this.initializeDefaultSuppressionLists();
  }

  static getInstance(): SuppressionService {
    if (!SuppressionService.instance) {
      SuppressionService.instance = new SuppressionService();
    }
    return SuppressionService.instance;
  }

  /**
   * Check if an email address is suppressed
   */
  async checkSuppression(email: string, campaignId?: string): Promise<SuppressionCheck> {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // Check global suppression lists
      for (const [listId, list] of this.suppressionLists) {
        if (list.emails.includes(normalizedEmail)) {
          return {
            isSuppressed: true,
            reason: `Email in suppression list: ${list.name}`,
            rule: this.createRuleFromList(list),
            canOverride: false,
          };
        }
      }

      // Check suppression rules
      for (const [ruleId, rule] of this.suppressionRules) {
        if (!rule.isActive) continue;

        let matches = false;

        switch (rule.type) {
          case 'email':
            matches = normalizedEmail === rule.value.toLowerCase();
            break;
          case 'domain':
            matches = normalizedEmail.endsWith(`@${rule.value.toLowerCase()}`);
            break;
          case 'pattern':
            matches = new RegExp(rule.value, 'i').test(normalizedEmail);
            break;
          case 'campaign':
            matches = campaignId === rule.value;
            break;
        }

        if (matches) {
          return {
            isSuppressed: true,
            reason: `Matches suppression rule: ${rule.name}`,
            rule,
            canOverride: rule.action === 'bounce' || rule.action === 'complaint',
          };
        }
      }

      // Check bounce/complaint thresholds
      const bounceCount = this.bounceCounts.get(normalizedEmail) || 0;
      const complaintCount = this.complaintCounts.get(normalizedEmail) || 0;

      if (bounceCount >= 3) {
        return {
          isSuppressed: true,
          reason: `Too many bounces (${bounceCount})`,
          canOverride: true,
          overrideReason: 'Manual review required for high bounce rate',
        };
      }

      if (complaintCount >= 1) {
        return {
          isSuppressed: true,
          reason: `Has complaints (${complaintCount})`,
          canOverride: false,
        };
      }

      return {
        isSuppressed: false,
        canOverride: false,
      };

    } catch (error) {
      this.logger.error('Suppression check failed', { error, email, campaignId });
      // Default to allowing if check fails
      return {
        isSuppressed: false,
        canOverride: false,
      };
    }
  }

  /**
   * Add email to suppression list
   */
  async addToSuppression(
    email: string,
    type: 'bounce' | 'complaint' | 'unsubscribe' | 'manual',
    reason?: string,
    source?: string,
    expiresAt?: Date
  ): Promise<boolean> {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // Find or create suppression list
      let list = Array.from(this.suppressionLists.values()).find(l => l.type === type);

      if (!list) {
        list = {
          id: `${type}-list-${Date.now()}`,
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} List`,
          type,
          emails: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt,
          source,
          reason,
        };
        this.suppressionLists.set(list.id, list);
      }

      if (!list.emails.includes(normalizedEmail)) {
        list.emails.push(normalizedEmail);
        list.updatedAt = new Date();
      }

      // Also add to in-memory set for quick lookup
      this.suppressedEmails.add(normalizedEmail);

      // Update bounce/complaint counts
      if (type === 'bounce') {
        const currentCount = this.bounceCounts.get(normalizedEmail) || 0;
        this.bounceCounts.set(normalizedEmail, currentCount + 1);
      } else if (type === 'complaint') {
        const currentCount = this.complaintCounts.get(normalizedEmail) || 0;
        this.complaintCounts.set(normalizedEmail, currentCount + 1);
      }

      this.logger.info(`Email added to suppression list`, {
        email: normalizedEmail,
        type,
        reason,
        source,
        expiresAt
      });

      return true;

    } catch (error) {
      this.logger.error('Failed to add email to suppression', { error, email, type });
      return false;
    }
  }

  /**
   * Remove email from suppression list
   */
  async removeFromSuppression(email: string, type?: string): Promise<boolean> {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      let removed = false;

      // Remove from specific lists if type is specified
      if (type) {
        const list = Array.from(this.suppressionLists.values()).find(l => l.type === type);
        if (list) {
          const index = list.emails.indexOf(normalizedEmail);
          if (index > -1) {
            list.emails.splice(index, 1);
            list.updatedAt = new Date();
            removed = true;
          }
        }
      } else {
        // Remove from all lists
        for (const list of this.suppressionLists.values()) {
          const index = list.emails.indexOf(normalizedEmail);
          if (index > -1) {
            list.emails.splice(index, 1);
            list.updatedAt = new Date();
            removed = true;
          }
        }
      }

      // Remove from in-memory set
      if (this.suppressedEmails.has(normalizedEmail)) {
        this.suppressedEmails.delete(normalizedEmail);
        removed = true;
      }

      // Reset bounce/complaint counts if fully removed
      if (removed) {
        this.bounceCounts.delete(normalizedEmail);
        this.complaintCounts.delete(normalizedEmail);
      }

      this.logger.info(`Email removed from suppression`, { email: normalizedEmail, type, removed });

      return removed;

    } catch (error) {
      this.logger.error('Failed to remove email from suppression', { error, email, type });
      return false;
    }
  }

  /**
   * Handle unsubscribe request
   */
  async handleUnsubscribe(request: UnsubscribeRequest): Promise<boolean> {
    try {
      const { email, campaignId, reason, ipAddress, userAgent } = request;

      // Add to unsubscribe suppression list
      const success = await this.addToSuppression(
        email,
        'unsubscribe',
        reason || 'User unsubscribed',
        `campaign:${campaignId || 'global'}`,
        undefined // No expiration for unsubscribes
      );

      if (success) {
        this.logger.info('Unsubscribe request processed', {
          email,
          campaignId,
          reason,
          ipAddress,
          userAgent,
          timestamp: request.timestamp,
        });
      }

      return success;

    } catch (error) {
      this.logger.error('Failed to handle unsubscribe request', { error, request });
      return false;
    }
  }

  /**
   * Handle email event (bounce, complaint, etc.)
   */
  async handleEmailEvent(event: EmailEvent): Promise<void> {
    try {
      const { email, type, campaignId, provider, metadata } = event;

      switch (type) {
        case 'bounced':
          await this.addToSuppression(
            email,
            'bounce',
            `Bounce from ${provider}`,
            `event:${event.id}`,
            this.getBounceExpirationDate()
          );
          break;

        case 'complained':
          await this.addToSuppression(
            email,
            'complaint',
            `Complaint from ${provider}`,
            `event:${event.id}`,
            undefined // Complaints never expire
          );
          break;

        case 'unsubscribed':
          await this.addToSuppression(
            email,
            'unsubscribe',
            'User unsubscribed',
            `event:${event.id}`,
            undefined // Unsubscribes never expire
          );
          break;
      }

      this.logger.info('Email event processed for suppression', {
        email,
        type,
        campaignId,
        provider,
        eventId: event.id,
      });

    } catch (error) {
      this.logger.error('Failed to handle email event for suppression', { error, event });
    }
  }

  /**
   * Get suppression statistics
   */
  getSuppressionStats(): {
    totalSuppressed: number;
    byType: Record<string, number>;
    byList: Record<string, number>;
    bounceCounts: Record<string, number>;
    complaintCounts: Record<string, number>;
  } {
    const byType: Record<string, number> = {};
    const byList: Record<string, number> = {};

    for (const list of this.suppressionLists.values()) {
      byType[list.type] = (byType[list.type] || 0) + list.emails.length;
      byList[list.name] = list.emails.length;
    }

    const bounceCounts: Record<string, number> = {};
    for (const [email, count] of this.bounceCounts) {
      bounceCounts[email] = count;
    }

    const complaintCounts: Record<string, number> = {};
    for (const [email, count] of this.complaintCounts) {
      complaintCounts[email] = count;
    }

    return {
      totalSuppressed: this.suppressedEmails.size,
      byType,
      byList,
      bounceCounts,
      complaintCounts,
    };
  }

  /**
   * Add suppression rule
   */
  addSuppressionRule(rule: Omit<SuppressionRule, 'id' | 'createdAt'>): SuppressionRule {
    const newRule: SuppressionRule = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      expiresAt: rule.expiresAt,
    };

    this.suppressionRules.set(newRule.id, newRule);

    this.logger.info(`Suppression rule added`, {
      id: newRule.id,
      name: newRule.name,
      type: newRule.type,
      value: newRule.value,
      action: newRule.action,
    });

    return newRule;
  }

  /**
   * Remove suppression rule
   */
  removeSuppressionRule(ruleId: string): boolean {
    const deleted = this.suppressionRules.delete(ruleId);
    if (deleted) {
      this.logger.info(`Suppression rule removed`, { ruleId });
    }
    return deleted;
  }

  /**
   * Get all suppression rules
   */
  getSuppressionRules(): SuppressionRule[] {
    return Array.from(this.suppressionRules.values());
  }

  /**
   * Get all suppression lists
   */
  getSuppressionLists(): SuppressionList[] {
    return Array.from(this.suppressionLists.values());
  }

  private initializeDefaultSuppressionLists(): void {
    // Create default suppression lists
    const bounceList: SuppressionList = {
      id: 'bounce-list',
      name: 'Bounce List',
      type: 'bounce',
      emails: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: undefined,
      source: 'system',
      reason: 'Automatic bounce handling',
    };

    const complaintList: SuppressionList = {
      id: 'complaint-list',
      name: 'Complaint List',
      type: 'complaint',
      emails: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: undefined,
      source: 'system',
      reason: 'Automatic complaint handling',
    };

    const unsubscribeList: SuppressionList = {
      id: 'unsubscribe-list',
      name: 'Unsubscribe List',
      type: 'unsubscribe',
      emails: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: undefined,
      source: 'system',
      reason: 'User unsubscribe requests',
    };

    this.suppressionLists.set(bounceList.id, bounceList);
    this.suppressionLists.set(complaintList.id, complaintList);
    this.suppressionLists.set(unsubscribeList.id, unsubscribeList);

    this.logger.info('Default suppression lists initialized');
  }

  private createRuleFromList(list: SuppressionList): SuppressionRule {
    return {
      id: `list-rule-${list.id}`,
      name: `Auto-generated from ${list.name}`,
      type: 'email',
      value: '', // This would be set per email in actual checking
      action: list.type === 'bounce' ? 'bounce' : list.type === 'complaint' ? 'complaint' : 'block',
      reason: list.reason,
      expiresAt: undefined,
      createdAt: list.createdAt,
      createdBy: 'system',
      isActive: true,
    };
  }

  private getBounceExpirationDate(): Date {
    // Bounces expire after 30 days by default
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 30);
    return expiration;
  }

  /**
   * Bulk check suppression for multiple emails
   */
  async checkMultipleSuppressions(emails: string[], campaignId?: string): Promise<Map<string, SuppressionCheck>> {
    const results = new Map<string, SuppressionCheck>();

    for (const email of emails) {
      results.set(email, await this.checkSuppression(email, campaignId));
    }

    return results;
  }

  /**
   * Clean up expired suppression entries
   */
  async cleanupExpiredSuppressions(): Promise<number> {
    let cleanedCount = 0;

    for (const [listId, list] of this.suppressionLists) {
      if (list.expiresAt && list.expiresAt <= new Date()) {
        // Remove entire expired list
        this.suppressionLists.delete(listId);

        // Remove emails from in-memory storage
        for (const email of list.emails) {
          this.suppressedEmails.delete(email.toLowerCase());
        }

        cleanedCount += list.emails.length;
        this.logger.info(`Expired suppression list removed`, { listId, emailCount: list.emails.length });
      } else {
        // Clean individual expired emails from list
        const originalCount = list.emails.length;
        list.emails = list.emails.filter(email => {
          // For individual email expiration, we'd need to track per-email expiration
          // For now, we'll assume list-level expiration
          return true;
        });

        const removedCount = originalCount - list.emails.length;
        if (removedCount > 0) {
          cleanedCount += removedCount;
        }
      }
    }

    if (cleanedCount > 0) {
      this.logger.info(`Cleaned up ${cleanedCount} expired suppression entries`);
    }

    return cleanedCount;
  }

  /**
   * Export suppression data (for backup/reporting)
   */
  exportSuppressionData(): {
    lists: SuppressionList[];
    rules: SuppressionRule[];
    stats: {
      totalSuppressed: number;
      byType: Record<string, number>;
      byList: Record<string, number>;
      bounceCounts: Record<string, number>;
      complaintCounts: Record<string, number>;
    };
    timestamp: Date;
  } {
    return {
      lists: Array.from(this.suppressionLists.values()),
      rules: Array.from(this.suppressionRules.values()),
      stats: this.getSuppressionStats(),
      timestamp: new Date(),
    };
  }

  /**
   * Import suppression data (for restore/backup)
   */
  async importSuppressionData(data: {
    lists: SuppressionList[];
    rules: SuppressionRule[];
  }): Promise<void> {
    try {
      // Clear existing data
      this.suppressionLists.clear();
      this.suppressionRules.clear();
      this.suppressedEmails.clear();
      this.bounceCounts.clear();
      this.complaintCounts.clear();

      // Import lists
      for (const list of data.lists) {
        this.suppressionLists.set(list.id, list);
        for (const email of list.emails) {
          this.suppressedEmails.add(email.toLowerCase());
        }
      }

      // Import rules
      for (const rule of data.rules) {
        this.suppressionRules.set(rule.id, rule);
      }

      this.logger.info('Suppression data imported successfully', {
        listCount: data.lists.length,
        ruleCount: data.rules.length,
      });

    } catch (error) {
      this.logger.error('Failed to import suppression data', { error, data });
      throw error;
    }
  }
}

