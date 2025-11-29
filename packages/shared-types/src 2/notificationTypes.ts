// =============================================================================
// NOTIFICATION SYSTEM TYPES
// =============================================================================
// Shared TypeScript types for the high-throughput notification logging system

export enum NotificationChannel {
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WEBHOOK = 'WEBHOOK',
  DISCORD = 'DISCORD',
  TELEGRAM = 'TELEGRAM',
  IN_APP = 'IN_APP'
}

export enum NotificationStatus {
  QUEUED = 'QUEUED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  RETRY = 'RETRY',
  CANCELLED = 'CANCELLED'
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

// =============================================================================
// CORE NOTIFICATION LOG INTERFACE
// =============================================================================

export interface NotificationLog {
  id: string
  alertId?: string
  userId: string
  tenantId: string

  channel: NotificationChannel
  status: NotificationStatus
  priority: NotificationPriority

  queuedAt: Date
  sentAt?: Date
  deliveredAt?: Date
  acknowledgedAt?: Date
  processedAt?: Date

  retryCount: number
  maxRetries: number
  errorCodes: string[]
  errorMessage?: string

  provider?: string
  providerId?: string
  providerResponse?: any

  messageTitle?: string
  messageContent?: string // Encrypted content
  messagePayload?: any    // Encrypted structured data

  deliveryTimeMs?: number
  cost?: number
  campaignId?: string

  userAgent?: string
  ipAddress?: string
  deviceId?: string
  sessionId?: string

  createdAt: Date
  updatedAt: Date

  metadata?: any
}

// =============================================================================
// NOTIFICATION CAMPAIGN INTERFACE
// =============================================================================

export interface NotificationCampaign {
  id: string
  name: string
  description?: string

  channels: NotificationChannel[]
  priority: NotificationPriority

  userSegment?: string
  tenantId: string

  scheduledAt?: Date
  recurring: boolean
  frequency?: string

  abTestEnabled: boolean
  variants?: any

  totalSent: number
  totalDelivered: number
  totalFailed: number
  totalCost: number

  isActive: boolean
  createdAt: Date
  updatedAt: Date

  notifications?: NotificationLog[]
}

// =============================================================================
// ANALYTICS INTERFACES
// =============================================================================

export interface NotificationAnalytics {
  channel: NotificationChannel
  status: NotificationStatus
  tenantId: string
  hour: Date
  count: number
  avgDeliveryTime?: number
  totalCost: number
}

export interface TenantStatistics {
  tenantId: string
  tenantName: string
  tenantSlug: string
  totalNotifications: number
  deliveredNotifications: number
  failedNotifications: number
  avgDeliveryTimeMs?: number
  totalCost: number
  lastNotificationAt?: Date
}

export interface PartitionStats {
  partitionName: string
  size: string
  rowsInserted: number
  rowsUpdated: number
  rowsDeleted: number
  liveRows: number
  deadRows: number
}

// =============================================================================
// QUERY INTERFACES
// =============================================================================

export interface NotificationQuery {
  userId?: string
  tenantId?: string
  channel?: NotificationChannel
  status?: NotificationStatus
  priority?: NotificationPriority
  startDate?: Date
  endDate?: Date
  alertId?: string
  campaignId?: string
  limit?: number
  offset?: number
}

export interface NotificationAnalyticsQuery {
  tenantId?: string
  channel?: NotificationChannel
  status?: NotificationStatus
  startDate?: Date
  endDate?: Date
  groupBy?: 'hour' | 'day' | 'week' | 'month'
}

// =============================================================================
// RESPONSE INTERFACES
// =============================================================================

export interface NotificationResponse {
  success: boolean
  data?: NotificationLog | NotificationLog[]
  error?: string
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface AnalyticsResponse {
  success: boolean
  data?: NotificationAnalytics[]
  summary?: {
    totalNotifications: number
    avgDeliveryTime?: number
    totalCost: number
    successRate: number
  }
  error?: string
}

// =============================================================================
// TENANT MANAGEMENT INTERFACES
// =============================================================================

export interface TenantInfo {
  id: string
  name: string
  slug: string
  domain?: string
  isActive: boolean
  settings: any
}

export interface TenantAccessLog {
  id: string
  tenantId: string
  userId?: string
  action: string
  resource: string
  resourceId?: string
  ipAddress?: string
  userAgent?: string
  success: boolean
  errorMessage?: string
  timestamp: Date
}

// =============================================================================
// ENCRYPTION INTERFACES
// =============================================================================

export interface EncryptionKeyInfo {
  id: string
  keyName: string
  algorithm: string
  isActive: boolean
  createdAt: Date
  expiresAt?: Date
  rotatedAt?: Date
  rotationCount: number
  daysUntilExpiry?: number
}

export interface EncryptionHealth {
  checkName: string
  status: 'OK' | 'WARNING' | 'CRITICAL'
  details: string
  recommendation: string
}

// =============================================================================
// PROVIDER INTERFACES
// =============================================================================

export interface NotificationProvider {
  name: string
  type: NotificationChannel
  config: {
    apiKey?: string
    apiSecret?: string
    endpoint?: string
    region?: string
    [key: string]: any
  }
  isActive: boolean
  rateLimit?: number
  costPerNotification?: number
}

export interface ProviderResponse {
  provider: string
  providerId?: string
  status: 'success' | 'error'
  response: any
  errorCode?: string
  errorMessage?: string
  deliveryTimeMs?: number
  cost?: number
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

export interface NotificationBatch {
  notifications: Omit<NotificationLog, 'id' | 'createdAt' | 'updatedAt'>[]
  campaignId?: string
  priority?: NotificationPriority
}

export interface BatchOperationResult {
  success: boolean
  processedCount: number
  failedCount: number
  errors: Array<{
    index: number
    notification: NotificationLog
    error: string
  }>
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const NOTIFICATION_CHANNELS = Object.values(NotificationChannel)
export const NOTIFICATION_STATUSES = Object.values(NotificationStatus)
export const NOTIFICATION_PRIORITIES = Object.values(NotificationPriority)

export const DEFAULT_MAX_RETRIES = 3
export const DEFAULT_TENANT_ID = 'default'
export const ENCRYPTION_KEY_NAME = 'notification-logs-master-key'

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type NotificationChannelType = keyof typeof NotificationChannel
export type NotificationStatusType = keyof typeof NotificationStatus
export type NotificationPriorityType = keyof typeof NotificationPriority

export type CreateNotificationLog = Omit<NotificationLog, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateNotificationLog = Partial<Pick<NotificationLog, 'status' | 'sentAt' | 'deliveredAt' | 'acknowledgedAt' | 'errorCodes' | 'errorMessage' | 'providerResponse'>>

export interface NotificationLogWithAlert extends NotificationLog {
  alert?: {
    id: string
    name: string
    symbol: string
    condition: string
    threshold: number
    isActive: boolean
  }
}

export interface NotificationLogWithCampaign extends NotificationLog {
  campaign?: {
    id: string
    name: string
    description?: string
    abTestEnabled: boolean
  }
}
