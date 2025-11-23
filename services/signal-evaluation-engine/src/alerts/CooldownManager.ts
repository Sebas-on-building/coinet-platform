/**
 * =========================================
 * COOLDOWN MANAGER
 * =========================================
 * Advanced cooldown system for preventing alert spam with
 * adaptive periods, critical anomaly bypass, alert grouping,
 * and statistical refinement
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import type {
  AlertNotification,
  AlertRule,
  AssetSignalKey,
  CooldownEntry,
  CooldownConfiguration,
  AlertGroup,
  CooldownStatistics,
  CriticalAnomalyDetection,
  CooldownEvent
} from './types';
import type { NormalizedSignal, SignalType } from '../types';

export class CooldownManager extends EventEmitter {
  private logger: Logger;
  private isInitialized: boolean = false;

  // Cooldown tracking by asset/signal combination
  private cooldownEntries: Map<string, CooldownEntry> = new Map<string, CooldownEntry>();

  // Alert groups for batching
  private alertGroups: Map<string, AlertGroup> = new Map<string, AlertGroup>();

  // Statistics tracking
  private cooldownStats: CooldownStatistics;

  // Critical anomaly detection
  private criticalDetection: CriticalAnomalyDetection;

  // Asset volatility tracking (simplified - would integrate with market data)
  private assetVolatilities: Map<string, number> = new Map();

  constructor() {
    super();
    this.logger = new Logger('CooldownManager');

    // Initialize default statistics
    this.cooldownStats = {
      totalCooldowns: 0,
      totalSuppressedAlerts: 0,
      totalCriticalBypasses: 0,
      averageCooldownPeriod: 0,
      assetCooldownStats: new Map(),
      signalTypeCooldownStats: new Map(),
      effectivenessScore: 0,
      lastUpdated: new Date()
    };

    // Default critical anomaly detection
    this.criticalDetection = {
      enabled: true,
      threshold: 0.8,
      lookbackWindow: 300, // 5 minutes
      volatilityThreshold: 0.7,
      consecutiveAlertsThreshold: 3,
      statisticalMethods: ['z_score']
    };
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing cooldown manager...');

      // Load existing cooldown entries and groups (would load from persistence)
      this.loadPersistedState();

      this.isInitialized = true;
      this.logger.info('✅ Cooldown manager initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize cooldown manager', error);
      throw error;
    }
  }

  /**
   * Check if an alert should be suppressed due to cooldown
   */
  checkCooldownSuppression(
    rule: AlertRule,
    alert: AlertNotification,
    signals: NormalizedSignal[]
  ): {
    shouldSuppress: boolean;
    reason: string;
    bypassReason?: string;
    cooldownPeriod?: number;
  } {
    if (!this.isInitialized) {
      return { shouldSuppress: false, reason: 'Cooldown manager not initialized' };
    }

    const config = rule.metadata.cooldownConfig;
    if (!config?.enabled) {
      return { shouldSuppress: false, reason: 'Cooldown disabled for this rule' };
    }

    // Generate asset/signal key
    const assetSignalKey = this.generateAssetSignalKey(alert, signals);

    // Check for active cooldown
    const cooldownEntry = this.cooldownEntries.get(this.getCooldownMapKey(assetSignalKey));

    if (!cooldownEntry) {
      // No active cooldown, allow alert
      this.startCooldown(assetSignalKey, config, rule, alert);
      return { shouldSuppress: false, reason: 'No active cooldown' };
    }

    // Check if cooldown has expired
    if (Date.now() > cooldownEntry.expiresAt.getTime()) {
      // Cooldown expired, start new one
      this.startCooldown(assetSignalKey, config, rule, alert);
      return { shouldSuppress: false, reason: 'Cooldown expired' };
    }

    // Check for critical anomaly bypass
    const isCritical = this.detectCriticalAnomaly(alert, signals, config);
    if (isCritical) {
      this.recordCriticalBypass(assetSignalKey, config);
      return {
        shouldSuppress: false,
        reason: 'Critical anomaly detected',
        bypassReason: 'Critical anomaly bypass',
        cooldownPeriod: cooldownEntry.cooldownPeriod
      };
    }

    // Check if we should group instead of suppress
    if (config.groupingEnabled && this.shouldGroupAlert(alert, assetSignalKey, config)) {
      this.addToGroup(assetSignalKey, alert, config);
      return {
        shouldSuppress: true,
        reason: 'Alert added to group',
        cooldownPeriod: cooldownEntry.cooldownPeriod
      };
    }

    // Suppress alert due to active cooldown
    this.recordSuppressedAlert(assetSignalKey, config);
    return {
      shouldSuppress: true,
      reason: 'Active cooldown period',
      cooldownPeriod: cooldownEntry.cooldownPeriod
    };
  }

  /**
   * Process grouped alerts and trigger summary alerts
   */
  processExpiredGroups(): AlertGroup[] {
    const now = Date.now();
    const expiredGroups: AlertGroup[] = [];

    for (const [groupId, group] of this.alertGroups) {
      if (now > group.expiresAt.getTime() && !group.isTriggered) {
        // Trigger the group alert
        this.triggerGroupAlert(group);
        expiredGroups.push(group);
      }
    }

    return expiredGroups;
  }

  /**
   * Get cooldown statistics
   */
  getCooldownStatistics(): CooldownStatistics {
    return { ...this.cooldownStats };
  }

  /**
   * Update cooldown configuration for a rule
   */
  updateCooldownConfig(ruleId: string, config: CooldownConfiguration): void {
    // This would update the rule's cooldown configuration
    // Implementation would depend on how rules are stored/managed
    this.logger.info('Cooldown configuration updated', { ruleId, config });
  }

  /**
   * Get active cooldown entries
   */
  getActiveCooldowns(): Array<{
    key: AssetSignalKey;
    cooldownEntry: CooldownEntry;
  }> {
    const now = Date.now();
    return Array.from(this.cooldownEntries.entries())
      .filter(([_, entry]) => now <= entry.expiresAt.getTime())
      .map(([key, entry]) => ({ key: JSON.parse(key), cooldownEntry: entry }));
  }

  /**
   * Get active alert groups
   */
  getActiveGroups(): AlertGroup[] {
    return Array.from(this.alertGroups.values())
      .filter(group => !group.isTriggered);
  }

  // Private helper methods

  private generateAssetSignalKey(alert: AlertNotification, signals: NormalizedSignal[]): AssetSignalKey {
    // Extract asset ID from signals (simplified - would need proper asset identification)
    const assetId = this.extractAssetId(signals);
    const signalType = signals[0]?.type || 'unknown';
    const severity = alert.severity;

    return {
      assetId,
      signalType,
      severity
    };
  }

  private getCooldownMapKey(assetSignalKey: AssetSignalKey): string {
    return JSON.stringify(assetSignalKey);
  }

  private extractAssetId(signals: NormalizedSignal[]): string {
    // Simplified asset ID extraction - would need proper asset identification logic
    // For now, assume first signal contains asset info
    const firstSignal = signals[0];
    if (!firstSignal) return 'unknown';

    // This would be replaced with actual asset identification logic
    return firstSignal.id.split('_')[0] || 'unknown';
  }

  private startCooldown(
    assetSignalKey: AssetSignalKey,
    config: CooldownConfiguration,
    rule: AlertRule,
    alert: AlertNotification
  ): void {
    const key = this.getCooldownMapKey(assetSignalKey);

    // Calculate adaptive cooldown period
    const cooldownPeriod = this.calculateAdaptiveCooldown(config, assetSignalKey);

    const cooldownEntry: CooldownEntry = {
      key: JSON.parse(key),
      lastAlertTime: new Date(),
      alertCount: 1,
      cooldownPeriod,
      expiresAt: new Date(Date.now() + cooldownPeriod),
      isCritical: assetSignalKey.severity === 'critical' || assetSignalKey.severity === 'emergency',
      groupedAlerts: [alert]
    };

    this.cooldownEntries.set(key, cooldownEntry);
    this.recordCooldownStart(assetSignalKey, config, cooldownPeriod);

    this.logger.debug('Cooldown started', {
      key,
      cooldownPeriod,
      severity: assetSignalKey.severity
    });
  }

  private calculateAdaptiveCooldown(config: CooldownConfiguration, assetSignalKey: AssetSignalKey): number {
    let cooldownPeriod = config.baseCooldownPeriod * 1000; // Convert to milliseconds

    // Apply asset volatility multiplier
    const volatility = this.assetVolatilities.get(assetSignalKey.assetId) || 1.0;
    cooldownPeriod *= config.assetVolatilityMultiplier * volatility;

    // Apply user tolerance multiplier
    cooldownPeriod *= config.userToleranceMultiplier;

    // Apply adaptive scaling based on historical effectiveness
    const effectiveness = this.cooldownStats.effectivenessScore;
    if (effectiveness > 0.8) {
      cooldownPeriod *= 0.8; // Reduce cooldown if very effective
    } else if (effectiveness < 0.4) {
      cooldownPeriod *= 1.2; // Increase cooldown if not effective
    }

    return Math.max(cooldownPeriod, 1000); // Minimum 1 second
  }

  private detectCriticalAnomaly(
    alert: AlertNotification,
    signals: NormalizedSignal[],
    config: CooldownConfiguration
  ): boolean {
    if (!config.criticalAnomalyBypass || !this.criticalDetection.enabled) {
      return false;
    }

    // Check confidence threshold
    if (alert.context.confidence >= config.criticalThreshold) {
      return true;
    }

    // Check for rapid consecutive alerts (indicating critical situation)
    const assetSignalKey = this.generateAssetSignalKey(alert, signals);
    const entry = this.cooldownEntries.get(this.getCooldownMapKey(assetSignalKey));

    if (entry && entry.alertCount >= this.criticalDetection.consecutiveAlertsThreshold) {
      return true;
    }

    // Check for high volatility anomaly
    const assetId = this.extractAssetId(signals);
    const volatility = this.assetVolatilities.get(assetId) || 0;

    if (volatility >= this.criticalDetection.volatilityThreshold) {
      return true;
    }

    return false;
  }

  private shouldGroupAlert(
    alert: AlertNotification,
    assetSignalKey: AssetSignalKey,
    config: CooldownConfiguration
  ): boolean {
    const existingGroup = this.alertGroups.get(this.getCooldownMapKey(assetSignalKey));

    if (!existingGroup) {
      // Create new group
      this.createAlertGroup(assetSignalKey, alert, config);
      return false; // Don't suppress, start grouping
    }

    // Check if group should be triggered
    if (existingGroup.alerts.length >= config.maxGroupSize) {
      this.triggerGroupAlert(existingGroup);
      this.createAlertGroup(assetSignalKey, alert, config);
      return false; // Don't suppress, start new group
    }

    return true; // Add to existing group
  }

  private createAlertGroup(
    assetSignalKey: AssetSignalKey,
    alert: AlertNotification,
    config: CooldownConfiguration
  ): void {
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const group: AlertGroup = {
      id: groupId,
      key: assetSignalKey,
      alerts: [alert],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + config.groupingWindow * 1000),
      summaryMessage: this.generateSummaryMessage(alert),
      severity: alert.severity,
      isTriggered: false
    };

    this.alertGroups.set(this.getCooldownMapKey(assetSignalKey), group);
  }

  private addToGroup(assetSignalKey: AssetSignalKey, alert: AlertNotification, config: CooldownConfiguration): void {
    const group = this.alertGroups.get(this.getCooldownMapKey(assetSignalKey));
    if (group && !group.isTriggered) {
      group.alerts.push(alert);
      group.summaryMessage = this.updateSummaryMessage(group);
      group.severity = this.determineGroupSeverity(group.alerts);
    }
  }

  private triggerGroupAlert(group: AlertGroup): void {
    group.isTriggered = true;

    // Create summary alert
    const summaryAlert: AlertNotification = {
      id: `group_alert_${group.id}`,
      ruleId: 'group_summary',
      ruleName: 'Alert Group Summary',
      triggeredAt: new Date(),
      severity: group.severity,
      title: `Grouped Alert: ${group.alerts.length} similar alerts`,
      description: group.summaryMessage,
      signals: [], // Would include representative signals
      context: {
        marketRegime: 'unknown',
        confidence: 0.9,
        explanation: `Summary of ${group.alerts.length} grouped alerts`
      },
      channels: {
        email: true,
        webhook: true,
        dashboard: true,
        telegram: false,
        discord: false
      },
      metadata: {
        evaluationResult: {} as any, // Would be filled with group metadata
        deliveryStatus: {},
        retryCount: 0
      }
    };

    this.emit('groupAlertTriggered', summaryAlert);

    this.logger.info('Group alert triggered', {
      groupId: group.id,
      alertCount: group.alerts.length,
      severity: group.severity
    });
  }

  private generateSummaryMessage(alert: AlertNotification): string {
    return `${alert.ruleName}: ${alert.description}`;
  }

  private updateSummaryMessage(group: AlertGroup): string {
    const alertCount = group.alerts.length;
    const firstAlert = group.alerts[0];
    const lastAlert = group.alerts[alertCount - 1];

    return `${firstAlert.ruleName}: ${alertCount} similar alerts between ${firstAlert.triggeredAt.toLocaleTimeString()} and ${lastAlert.triggeredAt.toLocaleTimeString()}`;
  }

  private determineGroupSeverity(alerts: AlertNotification[]): 'info' | 'warning' | 'critical' | 'emergency' {
    const severities = alerts.map(a => a.severity);
    const severityOrder = { info: 1, warning: 2, critical: 3, emergency: 4 };

    const maxSeverity = Math.max(...severities.map(s => severityOrder[s]));
    const severityKeys = Object.keys(severityOrder) as Array<keyof typeof severityOrder>;

    return severityKeys.find(key => severityOrder[key] === maxSeverity) || 'info';
  }

  private recordCooldownStart(assetSignalKey: AssetSignalKey, config: CooldownConfiguration, cooldownPeriod: number): void {
    this.cooldownStats.totalCooldowns++;
    this.updateAssetStats(assetSignalKey.assetId);
    this.updateSignalTypeStats(assetSignalKey.signalType);
    this.updateEffectivenessScore();
  }

  private recordSuppressedAlert(assetSignalKey: AssetSignalKey, config: CooldownConfiguration): void {
    this.cooldownStats.totalSuppressedAlerts++;
    this.updateAssetStats(assetSignalKey.assetId, true);
    this.updateSignalTypeStats(assetSignalKey.signalType, true);
  }

  private recordCriticalBypass(assetSignalKey: AssetSignalKey, config: CooldownConfiguration): void {
    this.cooldownStats.totalCriticalBypasses++;
  }

  private updateAssetStats(assetId: string, suppressed: boolean = false): void {
    const stats = this.cooldownStats.assetCooldownStats.get(assetId) || {
      cooldownCount: 0,
      suppressedCount: 0,
      averageCooldown: 0,
      lastAlertTime: new Date()
    };

    stats.cooldownCount++;
    if (suppressed) stats.suppressedCount++;
    stats.lastAlertTime = new Date();

    // Update average cooldown (simplified)
    const totalCooldowns = this.cooldownStats.assetCooldownStats.size;
    stats.averageCooldown = this.cooldownStats.averageCooldownPeriod;

    this.cooldownStats.assetCooldownStats.set(assetId, stats);
  }

  private updateSignalTypeStats(signalType: SignalType, suppressed: boolean = false): void {
    const stats = this.cooldownStats.signalTypeCooldownStats.get(signalType) || {
      cooldownCount: 0,
      suppressedCount: 0,
      averageCooldown: 0
    };

    stats.cooldownCount++;
    if (suppressed) stats.suppressedCount++;

    this.cooldownStats.signalTypeCooldownStats.set(signalType, stats);
  }

  private updateEffectivenessScore(): void {
    const totalAlerts = this.cooldownStats.totalCooldowns;
    const suppressedAlerts = this.cooldownStats.totalSuppressedAlerts;

    if (totalAlerts === 0) {
      this.cooldownStats.effectivenessScore = 0;
    } else {
      // Effectiveness based on suppression rate (higher is better)
      this.cooldownStats.effectivenessScore = Math.min(suppressedAlerts / totalAlerts, 1.0);
    }

    this.cooldownStats.lastUpdated = new Date();
  }

  private generateCooldownKey(assetSignalKey: AssetSignalKey): string {
    return JSON.stringify(assetSignalKey);
  }

  private loadPersistedState(): void {
    // Load persisted cooldown entries and groups from storage
    // This would be implemented with actual persistence layer
    this.logger.info('Loaded persisted cooldown state');
  }

  private emitCooldownEvent(event: CooldownEvent): void {
    this.emit('cooldownEvent', event);
  }
}
