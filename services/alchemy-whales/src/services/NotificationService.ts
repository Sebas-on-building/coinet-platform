/**
 * Notification Service - Triggers alerts for whale movements
 */

import axios from 'axios';
import { NormalizedTransfer, WhaleTier, ServiceConfig } from '../types';
import { createLogger } from '../utils/logger';
import { formatUsd } from '../utils/validation';

export class NotificationService {
  private logger: any;
  private config: ServiceConfig['features'];
  private enabled: boolean;

  constructor(config: ServiceConfig['features']) {
    this.logger = createLogger({ component: 'NotificationService' });
    this.config = config;
    this.enabled = config.enableNotifications && !!config.notificationServiceUrl;

    if (!this.enabled) {
      this.logger.warn('Notifications disabled or no service URL configured');
    } else {
      this.logger.info('Notification service initialized', {
        url: config.notificationServiceUrl,
      });
    }
  }

  /**
   * Send whale alert notification
   */
  async sendWhaleAlert(transfer: NormalizedTransfer): Promise<void> {
    if (!this.enabled || !transfer.whaleTier) {
      return;
    }

    try {
      const notification = this.buildWhaleNotification(transfer);
      
      await axios.post(
        this.config.notificationServiceUrl!,
        notification,
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.info('Whale alert sent', {
        transfer: transfer.id,
        tier: transfer.whaleTier,
        valueUsd: transfer.valueUsd,
      });
    } catch (error: any) {
      this.logger.error('Failed to send whale alert', {
        error: error.message,
        transfer: transfer.id,
      });
    }
  }

  /**
   * Batch send whale alerts
   */
  async sendBatchWhaleAlerts(transfers: NormalizedTransfer[]): Promise<void> {
    const whaleTransfers = transfers.filter(t => t.whaleTier !== null);
    
    if (whaleTransfers.length === 0) {
      return;
    }

    this.logger.info('Sending batch whale alerts', {
      count: whaleTransfers.length,
    });

    // Send in parallel with some concurrency limit
    const concurrency = 5;
    for (let i = 0; i < whaleTransfers.length; i += concurrency) {
      const batch = whaleTransfers.slice(i, i + concurrency);
      await Promise.all(batch.map(transfer => this.sendWhaleAlert(transfer)));
    }

    this.logger.info('Batch whale alerts sent', {
      total: whaleTransfers.length,
    });
  }

  /**
   * Build notification payload
   */
  private buildWhaleNotification(transfer: NormalizedTransfer): any {
    const tierEmoji = this.getWhaleTierEmoji(transfer.whaleTier!);

    return {
      type: 'whale_alert',
      priority: this.getNotificationPriority(transfer.whaleTier!),
      title: `${tierEmoji} Whale Alert: ${formatUsd(transfer.valueUsd)}`,
      message: this.buildMessage(transfer),
      data: {
        transferId: transfer.id,
        chain: transfer.chain,
        transactionHash: transfer.transactionHash,
        from: transfer.from,
        to: transfer.to,
        valueUsd: transfer.valueUsd,
        whaleTier: transfer.whaleTier,
        category: transfer.category,
        timestamp: transfer.blockTimestamp.toISOString(),
      },
      tags: [
        'whale',
        transfer.whaleTier!,
        transfer.chain,
        transfer.category,
      ],
      channels: ['push', 'email', 'webhook'],
      metadata: {
        fromEntity: transfer.fromEntity?.name,
        toEntity: transfer.toEntity?.name,
        asset: transfer.asset.symbol,
      },
    };
  }

  /**
   * Build notification message
   */
  private buildMessage(transfer: NormalizedTransfer): string {
    const chainName = transfer.chain.charAt(0).toUpperCase() + transfer.chain.slice(1);
    const asset = transfer.asset.symbol || 'tokens';
    const fromLabel = transfer.fromEntity?.name || this.shortenAddress(transfer.from);
    const toLabel = transfer.toEntity?.name || this.shortenAddress(transfer.to || '');

    let message = `${formatUsd(transfer.valueUsd)} in ${asset} transferred on ${chainName}\n`;
    message += `From: ${fromLabel}\n`;
    message += `To: ${toLabel}\n`;
    message += `Category: ${transfer.category}\n`;
    message += `Block: ${transfer.blockNumber}`;

    return message;
  }

  /**
   * Get emoji for whale tier
   */
  private getWhaleTierEmoji(tier: WhaleTier): string {
    const emojis: Record<WhaleTier, string> = {
      [WhaleTier.WHALE]: '🐋',
      [WhaleTier.LARGE_WHALE]: '🐳',
      [WhaleTier.MEGA_WHALE]: '🌊',
    };
    return emojis[tier];
  }

  /**
   * Get notification priority
   */
  private getNotificationPriority(tier: WhaleTier): string {
    const priorities: Record<WhaleTier, string> = {
      [WhaleTier.WHALE]: 'normal',
      [WhaleTier.LARGE_WHALE]: 'high',
      [WhaleTier.MEGA_WHALE]: 'urgent',
    };
    return priorities[tier];
  }

  /**
   * Shorten address for display
   */
  private shortenAddress(address: string): string {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Test notification
   */
  async testNotification(): Promise<boolean> {
    if (!this.enabled) {
      this.logger.warn('Cannot test: notifications disabled');
      return false;
    }

    try {
      await axios.post(
        this.config.notificationServiceUrl!,
        {
          type: 'test',
          title: 'Alchemy Whales Service Test',
          message: 'This is a test notification from the whales service',
          timestamp: new Date().toISOString(),
        },
        { timeout: 5000 }
      );

      this.logger.info('Test notification sent successfully');
      return true;
    } catch (error: any) {
      this.logger.error('Test notification failed', { error: error.message });
      return false;
    }
  }
}

export default NotificationService;

