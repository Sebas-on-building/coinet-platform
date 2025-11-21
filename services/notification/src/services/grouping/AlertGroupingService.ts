import { Logger } from '@/utils/Logger';

export interface AlertGroup {
  id: string;
  groupType: 'price_movement' | 'signal' | 'volume_spike' | 'exchange_issue' | 'general';
  title: string;
  summary: string;
  alerts: GroupedAlert[];
  firstAlertTime: Date;
  lastAlertTime: Date;
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number; // 0-100 confidence that these alerts are related
  status: 'active' | 'completed' | 'expired';
  detailsUrl?: string;
  metadata?: Record<string, any>;
}

export interface GroupedAlert {
  id: string;
  timestamp: Date;
  source: string; // exchange, signal provider, etc.
  eventType: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  data: Record<string, any>;
  similarityScore: number; // 0-100 how similar to group
  included: boolean; // whether included in final digest
}

export interface GroupingHeuristics {
  timeWindow: number; // milliseconds - how close alerts must be in time
  similarityThreshold: number; // 0-100 - minimum similarity to group
  maxGroupSize: number; // maximum alerts in a group
  groupExpiry: number; // milliseconds - when to close groups
  minAlertsForDigest: number; // minimum alerts needed for digest creation
  deduplicationWindow: number; // milliseconds - prevent duplicate alerts
}

export interface GroupingPerformance {
  totalAlerts: number;
  groupedAlerts: number;
  standaloneAlerts: number;
  averageGroupSize: number;
  groupingAccuracy: number; // 0-100 based on user feedback
  falsePositiveRate: number; // percentage of incorrect groupings
  userFatigueReduction: number; // estimated reduction in notifications sent
  lastUpdated: Date;
}

export class AlertGroupingService {
  private static instance: AlertGroupingService;
  private logger: Logger;

  // Active alert groups
  private alertGroups: Map<string, AlertGroup> = new Map();

  // Alert deduplication tracking
  private alertDeduplication: Map<string, Date> = new Map();

  // Default heuristics
  private heuristics: GroupingHeuristics = {
    timeWindow: 300000, // 5 minutes
    similarityThreshold: 70,
    maxGroupSize: 10,
    groupExpiry: 1800000, // 30 minutes
    minAlertsForDigest: 2,
    deduplicationWindow: 60000 // 1 minute
  };

  // Performance tracking
  private performance: GroupingPerformance = {
    totalAlerts: 0,
    groupedAlerts: 0,
    standaloneAlerts: 0,
    averageGroupSize: 0,
    groupingAccuracy: 95,
    falsePositiveRate: 5,
    userFatigueReduction: 0,
    lastUpdated: new Date()
  };

  // Grouping patterns for different alert types
  private groupingPatterns: Map<string, GroupingHeuristics> = new Map();

  private constructor() {
    this.logger = Logger.getInstance();
    this.initializeGroupingPatterns();
    this.startCleanupTimer();
  }

  static getInstance(): AlertGroupingService {
    if (!AlertGroupingService.instance) {
      AlertGroupingService.instance = new AlertGroupingService();
    }
    return AlertGroupingService.instance;
  }

  /**
   * Process incoming alert and determine if it should be grouped
   */
  async processAlert(alert: Omit<GroupedAlert, 'similarityScore' | 'included'>): Promise<{
    shouldGroup: boolean;
    group?: AlertGroup;
    standalone?: boolean;
  }> {
    this.performance.totalAlerts++;

    try {
      // Check for deduplication first
      if (this.isDuplicate(alert)) {
        this.logger.debug('Alert deduplicated', { alertId: alert.id, source: alert.source });
        return { shouldGroup: false, standalone: false };
      }

      // Find existing group for this alert
      const existingGroup = this.findExistingGroup(alert);

      if (existingGroup) {
        // Add to existing group
        const updatedGroup = this.addAlertToGroup(existingGroup, alert);

        if (updatedGroup.alerts.length >= this.heuristics.minAlertsForDigest) {
          return { shouldGroup: true, group: updatedGroup };
        }

        return { shouldGroup: false, group: updatedGroup };
      }

      // Create new group
      const newGroup = this.createNewGroup(alert);

      this.logger.info('New alert group created', {
        groupId: newGroup.id,
        alertId: alert.id,
        groupType: newGroup.groupType
      });

      return { shouldGroup: false, group: newGroup };

    } catch (error) {
      this.logger.error('Failed to process alert for grouping', { error, alert });
      return { shouldGroup: false, standalone: true };
    }
  }

  /**
   * Create digest from completed group
   */
  async createDigest(group: AlertGroup): Promise<{
    title: string;
    summary: string;
    detailsUrl: string;
    priority: string;
    metadata: Record<string, any>;
  }> {
    try {
      // Generate digest content based on group type
      const digest = await this.generateDigestContent(group);

      this.logger.info('Alert digest created', {
        groupId: group.id,
        alertCount: group.alerts.length,
        title: digest.title
      });

      return digest;

    } catch (error) {
      this.logger.error('Failed to create digest', { error, groupId: group.id });
      throw error;
    }
  }

  /**
   * Check if alert is a duplicate
   */
  private isDuplicate(alert: Omit<GroupedAlert, 'similarityScore' | 'included'>): boolean {
    const dedupKey = this.generateDeduplicationKey(alert);
    const lastSeen = this.alertDeduplication.get(dedupKey);

    if (lastSeen && (Date.now() - lastSeen.getTime()) < this.heuristics.deduplicationWindow) {
      return true;
    }

    this.alertDeduplication.set(dedupKey, new Date());
    return false;
  }

  /**
   * Generate deduplication key for alert
   */
  private generateDeduplicationKey(alert: Omit<GroupedAlert, 'similarityScore' | 'included'>): string {
    // Create a key based on alert characteristics that should be unique
    return `${alert.source}:${alert.eventType}:${JSON.stringify(alert.data)}`;
  }

  /**
   * Find existing group that this alert should join
   */
  private findExistingGroup(alert: Omit<GroupedAlert, 'similarityScore' | 'included'>): AlertGroup | null {
    for (const group of this.alertGroups.values()) {
      if (group.status !== 'active') continue;

      // Check if group is still valid (not expired)
      if (Date.now() - group.lastAlertTime.getTime() > this.heuristics.groupExpiry) {
        group.status = 'expired';
        continue;
      }

      // Check if alert is within time window
      if (Date.now() - group.lastAlertTime.getTime() > this.heuristics.timeWindow) {
        continue;
      }

      // Calculate similarity to group
      const similarity = this.calculateSimilarity(alert, group);

      if (similarity >= this.heuristics.similarityThreshold) {
        return group;
      }
    }

    return null;
  }

  /**
   * Calculate similarity between alert and group
   */
  private calculateSimilarity(alert: Omit<GroupedAlert, 'similarityScore' | 'included'>, group: AlertGroup): number {
    // Get the most recent alert in the group for comparison
    const recentAlert = group.alerts[group.alerts.length - 1];

    if (!recentAlert) {
      return 100; // First alert in group gets perfect similarity
    }

    let similarityScore = 0;

    // Time proximity (closer = more similar)
    const timeDiff = Math.abs(alert.timestamp.getTime() - recentAlert.timestamp.getTime());
    const timeSimilarity = Math.max(0, 100 - (timeDiff / this.heuristics.timeWindow) * 100);
    similarityScore += timeSimilarity * 0.3;

    // Source similarity (same source = higher similarity)
    if (alert.source === recentAlert.source) {
      similarityScore += 30;
    }

    // Event type similarity
    if (alert.eventType === recentAlert.eventType) {
      similarityScore += 25;
    }

    // Data similarity based on alert type
    const dataSimilarity = this.calculateDataSimilarity(alert.data, recentAlert.data, group.groupType);
    similarityScore += dataSimilarity * 0.15;

    return Math.min(100, similarityScore);
  }

  /**
   * Calculate data similarity based on alert type
   */
  private calculateDataSimilarity(data1: Record<string, any>, data2: Record<string, any>, groupType: string): number {
    switch (groupType) {
      case 'price_movement':
        return this.calculatePriceMovementSimilarity(data1, data2);
      case 'signal':
        return this.calculateSignalSimilarity(data1, data2);
      case 'volume_spike':
        return this.calculateVolumeSimilarity(data1, data2);
      case 'exchange_issue':
        return this.calculateExchangeIssueSimilarity(data1, data2);
      default:
        return this.calculateGeneralSimilarity(data1, data2);
    }
  }

  /**
   * Calculate price movement similarity
   */
  private calculatePriceMovementSimilarity(data1: Record<string, any>, data2: Record<string, any>): number {
    const symbol1 = data1.symbol?.toLowerCase();
    const symbol2 = data2.symbol?.toLowerCase();

    if (symbol1 !== symbol2) return 0;

    const price1 = parseFloat(data1.price || data1.lastPrice || '0');
    const price2 = parseFloat(data2.price || data2.lastPrice || '0');

    if (price1 === 0 || price2 === 0) return 50; // Unknown similarity

    // Similar price movements (within 5% difference)
    const priceDiff = Math.abs(price1 - price2) / Math.max(price1, price2);
    return Math.max(0, 100 - (priceDiff * 100));
  }

  /**
   * Calculate signal similarity
   */
  private calculateSignalSimilarity(data1: Record<string, any>, data2: Record<string, any>): number {
    const signalType1 = data1.signalType?.toLowerCase();
    const signalType2 = data2.signalType?.toLowerCase();

    if (signalType1 !== signalType2) return 0;

    // Same signal type gets high similarity
    return 80;
  }

  /**
   * Calculate volume similarity
   */
  private calculateVolumeSimilarity(data1: Record<string, any>, data2: Record<string, any>): number {
    const symbol1 = data1.symbol?.toLowerCase();
    const symbol2 = data2.symbol?.toLowerCase();

    if (symbol1 !== symbol2) return 0;

    // Volume spikes for same symbol are highly related
    return 90;
  }

  /**
   * Calculate exchange issue similarity
   */
  private calculateExchangeIssueSimilarity(data1: Record<string, any>, data2: Record<string, any>): number {
    const exchange1 = data1.exchange?.toLowerCase();
    const exchange2 = data2.exchange?.toLowerCase();

    if (exchange1 !== exchange2) return 0;

    // Issues on same exchange are highly related
    return 85;
  }

  /**
   * Calculate general similarity
   */
  private calculateGeneralSimilarity(data1: Record<string, any>, data2: Record<string, any>): number {
    // Simple key-value comparison for general alerts
    const keys1 = Object.keys(data1);
    const keys2 = Object.keys(data2);

    if (keys1.length === 0 || keys2.length === 0) return 0;

    // Check if they have similar structure
    const commonKeys = keys1.filter(key => keys2.includes(key));
    const keySimilarity = (commonKeys.length / Math.max(keys1.length, keys2.length)) * 100;

    return Math.min(60, keySimilarity); // Cap at 60% for general similarity
  }

  /**
   * Add alert to existing group
   */
  private addAlertToGroup(group: AlertGroup, alert: Omit<GroupedAlert, 'similarityScore' | 'included'>): AlertGroup {
    const similarity = this.calculateSimilarity(alert, group);
    const groupedAlert: GroupedAlert = {
      ...alert,
      similarityScore: similarity,
      included: similarity >= this.heuristics.similarityThreshold
    };

    group.alerts.push(groupedAlert);
    group.lastAlertTime = new Date();

    // Update group priority based on highest alert priority
    const maxPriority = Math.max(...group.alerts.map(a => this.getPriorityWeight(a.priority)));
    group.priority = this.getPriorityFromWeight(maxPriority);

    // Update confidence based on similarity scores
    const avgSimilarity = group.alerts.reduce((sum, a) => sum + a.similarityScore, 0) / group.alerts.length;
    group.confidence = Math.min(100, avgSimilarity + 20); // Boost confidence for well-grouped alerts

    // Check if group should be completed
    if (group.alerts.length >= this.heuristics.maxGroupSize) {
      group.status = 'completed';
    }

    return group;
  }

  /**
   * Create new alert group
   */
  private createNewGroup(alert: Omit<GroupedAlert, 'similarityScore' | 'included'>): AlertGroup {
    const groupType = this.determineGroupType(alert);
    const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newGroup: AlertGroup = {
      id: groupId,
      groupType,
      title: this.generateGroupTitle(groupType, alert),
      summary: this.generateGroupSummary(groupType, []),
      alerts: [{
        ...alert,
        similarityScore: 100, // First alert has perfect similarity to itself
        included: true
      }],
      firstAlertTime: alert.timestamp,
      lastAlertTime: alert.timestamp,
      priority: alert.priority,
      confidence: 100,
      status: 'active'
    };

    this.alertGroups.set(groupId, newGroup);
    return newGroup;
  }

  /**
   * Determine group type based on alert characteristics
   */
  private determineGroupType(alert: Omit<GroupedAlert, 'similarityScore' | 'included'>): AlertGroup['groupType'] {
    const { eventType, data } = alert;

    // Price movement detection
    if (eventType.includes('price') || data.symbol || data.price) {
      return 'price_movement';
    }

    // Signal detection
    if (eventType.includes('signal') || data.signalType) {
      return 'signal';
    }

    // Volume spike detection
    if (eventType.includes('volume') || data.volume) {
      return 'volume_spike';
    }

    // Exchange issue detection
    if (eventType.includes('exchange') || data.exchange) {
      return 'exchange_issue';
    }

    return 'general';
  }

  /**
   * Generate group title
   */
  private generateGroupTitle(groupType: AlertGroup['groupType'], alert: Omit<GroupedAlert, 'similarityScore' | 'included'>): string {
    switch (groupType) {
      case 'price_movement':
        return `Price Movement: ${alert.data.symbol || 'Multiple Assets'}`;
      case 'signal':
        return `Trading Signals: ${alert.data.signalType || 'Multiple Signals'}`;
      case 'volume_spike':
        return `Volume Spike: ${alert.data.symbol || 'Multiple Assets'}`;
      case 'exchange_issue':
        return `Exchange Issues: ${alert.data.exchange || 'Multiple Exchanges'}`;
      default:
        return `Alert Group: ${alert.eventType}`;
    }
  }

  /**
   * Generate group summary
   */
  private generateGroupSummary(groupType: AlertGroup['groupType'], alerts: GroupedAlert[]): string {
    switch (groupType) {
      case 'price_movement':
        return `${alerts.length} price movements detected across ${this.getUniqueValues(alerts, 'data.symbol').length} assets`;
      case 'signal':
        return `${alerts.length} trading signals generated for ${this.getUniqueValues(alerts, 'data.symbol').length} assets`;
      case 'volume_spike':
        return `${alerts.length} volume spikes detected across ${this.getUniqueValues(alerts, 'data.symbol').length} assets`;
      case 'exchange_issue':
        return `${alerts.length} exchange issues reported across ${this.getUniqueValues(alerts, 'data.exchange').length} exchanges`;
      default:
        return `${alerts.length} related alerts detected`;
    }
  }

  /**
   * Generate digest content for group
   */
  private async generateDigestContent(group: AlertGroup): Promise<{
    title: string;
    summary: string;
    detailsUrl: string;
    priority: string;
    metadata: Record<string, any>;
  }> {
    const includedAlerts = group.alerts.filter(a => a.included);

    return {
      title: `${group.title} (${includedAlerts.length} alerts)`,
      summary: this.generateDetailedSummary(group),
      detailsUrl: `/alerts/group/${group.id}`,
      priority: group.priority,
      metadata: {
        groupId: group.id,
        groupType: group.groupType,
        alertCount: includedAlerts.length,
        timeRange: {
          start: group.firstAlertTime,
          end: group.lastAlertTime
        },
        sources: this.getUniqueValues(includedAlerts, 'source'),
        confidence: group.confidence
      }
    };
  }

  /**
   * Generate detailed summary for digest
   */
  private generateDetailedSummary(group: AlertGroup): string {
    const includedAlerts = group.alerts.filter(a => a.included);

    switch (group.groupType) {
      case 'price_movement':
        const symbols = this.getUniqueValues(includedAlerts, 'data.symbol');
        const priceChanges = includedAlerts.map(a => ({
          symbol: a.data.symbol,
          change: a.data.priceChange || a.data.change || 'N/A',
          direction: a.data.direction || (a.data.price > a.data.previousPrice ? 'up' : 'down')
        }));

        return `Price movements detected for ${symbols.join(', ')}. ${priceChanges.length} significant changes observed.`;

      case 'signal':
        const signalTypes = this.getUniqueValues(includedAlerts, 'data.signalType');
        return `Trading signals generated: ${signalTypes.join(', ')}. ${includedAlerts.length} signals across ${this.getUniqueValues(includedAlerts, 'data.symbol').length} assets.`;

      case 'volume_spike':
        const volumeSymbols = this.getUniqueValues(includedAlerts, 'data.symbol');
        return `Volume spikes detected for ${volumeSymbols.join(', ')}. Unusual trading activity observed.`;

      case 'exchange_issue':
        const exchanges = this.getUniqueValues(includedAlerts, 'data.exchange');
        return `Exchange issues reported for ${exchanges.join(', ')}. Service disruptions or technical problems detected.`;

      default:
        return `${includedAlerts.length} related alerts from ${this.getUniqueValues(includedAlerts, 'source').length} sources.`;
    }
  }

  /**
   * Get unique values from array of objects
   */
  private getUniqueValues(alerts: GroupedAlert[], path: string): string[] {
    const values = new Set<string>();

    for (const alert of alerts) {
      const value = this.getNestedValue(alert, path);
      if (value) values.add(String(value));
    }

    return Array.from(values);
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Initialize grouping patterns for different alert types
   */
  private initializeGroupingPatterns(): void {
    // Price movement - very strict time window, high similarity required
    this.groupingPatterns.set('price_movement', {
      timeWindow: 60000, // 1 minute
      similarityThreshold: 85,
      maxGroupSize: 15,
      groupExpiry: 300000, // 5 minutes
      minAlertsForDigest: 3,
      deduplicationWindow: 30000 // 30 seconds
    });

    // Signals - moderate time window, medium similarity
    this.groupingPatterns.set('signal', {
      timeWindow: 300000, // 5 minutes
      similarityThreshold: 70,
      maxGroupSize: 10,
      groupExpiry: 900000, // 15 minutes
      minAlertsForDigest: 2,
      deduplicationWindow: 60000 // 1 minute
    });

    // Volume spikes - wide time window, high similarity for same symbol
    this.groupingPatterns.set('volume_spike', {
      timeWindow: 600000, // 10 minutes
      similarityThreshold: 80,
      maxGroupSize: 8,
      groupExpiry: 1800000, // 30 minutes
      minAlertsForDigest: 2,
      deduplicationWindow: 120000 // 2 minutes
    });

    // Exchange issues - wide time window, lower similarity threshold
    this.groupingPatterns.set('exchange_issue', {
      timeWindow: 1800000, // 30 minutes
      similarityThreshold: 60,
      maxGroupSize: 12,
      groupExpiry: 3600000, // 1 hour
      minAlertsForDigest: 2,
      deduplicationWindow: 300000 // 5 minutes
    });
  }

  /**
   * Get priority weight for comparison
   */
  private getPriorityWeight(priority: string): number {
    switch (priority) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 1;
    }
  }

  /**
   * Get priority from weight
   */
  private getPriorityFromWeight(weight: number): AlertGroup['priority'] {
    if (weight >= 4) return 'critical';
    if (weight >= 3) return 'high';
    if (weight >= 2) return 'medium';
    return 'low';
  }

  /**
   * Start cleanup timer to remove expired groups
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredGroups();
    }, 60000); // Run every minute
  }

  /**
   * Clean up expired groups
   */
  private cleanupExpiredGroups(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [groupId, group] of this.alertGroups.entries()) {
      if (group.status === 'active' &&
          (now - group.lastAlertTime.getTime()) > this.heuristics.groupExpiry) {
        group.status = 'expired';
        cleanedCount++;
      }

      // Remove completed groups after 24 hours
      if (group.status === 'completed' &&
          (now - group.lastAlertTime.getTime()) > 86400000) {
        this.alertGroups.delete(groupId);
      }
    }

    if (cleanedCount > 0) {
      this.logger.info(`Cleaned up ${cleanedCount} expired alert groups`);
    }
  }

  /**
   * Get active groups for a specific type
   */
  getActiveGroups(type?: string): AlertGroup[] {
    return Array.from(this.alertGroups.values()).filter(group =>
      group.status === 'active' && (!type || group.groupType === type)
    );
  }

  /**
   * Complete a group (force completion)
   */
  completeGroup(groupId: string): boolean {
    const group = this.alertGroups.get(groupId);
    if (group && group.status === 'active') {
      group.status = 'completed';
      this.logger.info('Alert group force completed', { groupId, alertCount: group.alerts.length });
      return true;
    }
    return false;
  }

  /**
   * Update grouping heuristics
   */
  updateHeuristics(newHeuristics: Partial<GroupingHeuristics>): void {
    this.heuristics = { ...this.heuristics, ...newHeuristics };
    this.logger.info('Alert grouping heuristics updated', { heuristics: this.heuristics });
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): GroupingPerformance {
    const totalGroups = Array.from(this.alertGroups.values()).length;
    const completedGroups = Array.from(this.alertGroups.values())
      .filter(g => g.status === 'completed').length;

    if (completedGroups > 0) {
      this.performance.averageGroupSize =
        Array.from(this.alertGroups.values())
          .filter(g => g.status === 'completed')
          .reduce((sum, g) => sum + g.alerts.length, 0) / completedGroups;
    }

    this.performance.lastUpdated = new Date();
    return { ...this.performance };
  }

  /**
   * Record grouping feedback for performance tracking
   */
  recordFeedback(groupId: string, accurate: boolean): void {
    const group = this.alertGroups.get(groupId);
    if (!group) return;

    // Update performance metrics based on feedback
    if (accurate) {
      this.performance.groupingAccuracy = Math.min(100,
        this.performance.groupingAccuracy + 0.1);
    } else {
      this.performance.falsePositiveRate = Math.max(0,
        this.performance.falsePositiveRate + 0.1);
    }

    this.logger.info('Alert grouping feedback recorded', {
      groupId,
      accurate,
      currentAccuracy: this.performance.groupingAccuracy,
      currentFalsePositiveRate: this.performance.falsePositiveRate
    });
  }

  /**
   * Get group by ID
   */
  getGroup(groupId: string): AlertGroup | undefined {
    return this.alertGroups.get(groupId);
  }

  /**
   * Get all groups (for admin/analytics)
   */
  getAllGroups(): AlertGroup[] {
    return Array.from(this.alertGroups.values());
  }
}
