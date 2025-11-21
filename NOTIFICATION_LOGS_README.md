# 🚀 Coinet Notification Logs System

## World-Class High-Throughput Notification Logging Infrastructure

This document describes the enterprise-grade notification logging system designed to handle billions of notification records with exceptional performance, security, and analytics capabilities.

## 🎯 Overview

The notification_logs system is built to:
- **Handle billions of records** with optimal performance
- **Provide real-time analytics** for per-channel performance monitoring
- **Ensure tenant isolation** with row-level security
- **Encrypt sensitive data** at rest using AES-256-GCM
- **Support automatic partitioning** for time-based queries
- **Enable comprehensive audit trails** for compliance

## 🏗️ Architecture

### Core Components

1. **NotificationLog Table** - High-throughput logging of all notification events
2. **NotificationCampaign Table** - A/B testing and bulk notification management
3. **Partitioning System** - Monthly partitioning for performance optimization
4. **Tenant Security** - Multi-tenant isolation with RLS policies
5. **Encryption Layer** - AES-256-GCM encryption for sensitive data
6. **Analytics Views** - Real-time performance monitoring

### Key Features

- **Multi-channel support**: Push, Email, SMS, Webhook, Discord, Telegram, In-app
- **Status tracking**: Queued → Sending → Sent → Delivered/Failed
- **Retry mechanism**: Configurable retry attempts with exponential backoff
- **Provider integration**: AWS SNS, Firebase, Twilio, and custom providers
- **Cost tracking**: Per-notification cost calculation and reporting
- **Performance metrics**: Delivery time, success rates, and throughput analytics

## 📊 Database Schema

### NotificationLog Table

```sql
CREATE TABLE notification_logs (
    id VARCHAR(36) PRIMARY KEY,
    alertId VARCHAR(36),              -- Reference to triggering alert
    userId VARCHAR(36) NOT NULL,      -- Target user
    tenantId VARCHAR(36) NOT NULL,    -- Multi-tenant isolation
    channel NotificationChannel,      -- PUSH, EMAIL, SMS, etc.
    status NotificationStatus,        -- QUEUED, SENT, DELIVERED, FAILED
    priority NotificationPriority,    -- LOW, NORMAL, HIGH, URGENT
    queuedAt TIMESTAMP(6),
    sentAt TIMESTAMP(6),
    deliveredAt TIMESTAMP(6),
    acknowledgedAt TIMESTAMP(6),
    retryCount SMALLINT DEFAULT 0,
    maxRetries SMALLINT DEFAULT 3,
    errorCodes TEXT[],
    provider VARCHAR(100),
    messageContent TEXT,              -- Encrypted content
    messagePayload JSONB,             -- Encrypted structured data
    deliveryTimeMs INTEGER,
    cost DECIMAL(10,6),
    createdAt TIMESTAMP(6),
    updatedAt TIMESTAMP(6)
);
```

### NotificationCampaign Table

```sql
CREATE TABLE notification_campaigns (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255),
    channels NotificationChannel[],
    priority NotificationPriority,
    userSegment VARCHAR(100),         -- SQL WHERE clause
    tenantId VARCHAR(36),
    scheduledAt TIMESTAMP(6),
    recurring BOOLEAN,
    abTestEnabled BOOLEAN,
    totalSent INTEGER,
    totalDelivered INTEGER,
    totalFailed INTEGER,
    totalCost DECIMAL(15,6)
);
```

## 🔧 Setup Instructions

### 1. Database Migration

Run the migration to create the notification system tables:

```bash
# Generate and apply the migration
npx prisma migrate dev --name add_notification_logs_system

# Or apply existing migration
npx prisma migrate deploy
```

### 2. Partitioning Setup

Execute the partitioning setup script:

```bash
psql -d coinet_db -f scripts/setup_notification_logs_partitioning.sql
```

### 3. Tenant Security Setup

Set up tenant isolation and security:

```bash
psql -d coinet_db -f scripts/tenant_security_setup.sql
```

### 4. Encryption Setup

Configure encryption for sensitive data:

```bash
psql -d coinet_db -f scripts/encryption_setup.sql
```

## 📈 Performance Optimizations

### Compound Indexes

The system includes optimized indexes for common query patterns:

```sql
-- Per-user, per-channel analytics
CREATE INDEX notification_logs_userId_channel_queuedAt_idx
ON notification_logs (userId, channel, queuedAt);

-- Status-based filtering
CREATE INDEX notification_logs_status_queuedAt_idx
ON notification_logs (status, queuedAt);

-- Provider performance monitoring
CREATE INDEX notification_logs_provider_status_idx
ON notification_logs (provider, status);
```

### Partitioning Strategy

- **Monthly partitioning** for optimal time-based queries
- **Automatic partition creation** for new months
- **Partition cleanup** for data retention compliance
- **Partition-aware analytics** views for performance

### Query Optimization Tips

```sql
-- Use partition key in WHERE clause for optimal performance
SELECT * FROM notification_logs
WHERE queuedAt >= '2024-01-01'
  AND queuedAt < '2024-02-01'
  AND tenantId = 'tenant-123';

-- Use compound indexes for analytics
SELECT channel, status, COUNT(*)
FROM notification_logs
WHERE userId = 'user-123'
  AND queuedAt >= NOW() - INTERVAL '30 days'
GROUP BY channel, status;
```

## 🔒 Security Implementation

### Tenant Isolation

- **Row Level Security (RLS)** enabled on all tables
- **Tenant context** automatically set per request
- **Audit logging** for all tenant operations
- **Tenant-aware triggers** for automatic data assignment

### Encryption at Rest

- **AES-256-GCM encryption** for sensitive message content
- **Key rotation** capabilities for compliance
- **Encryption audit logging** for security monitoring
- **Secure key management** with expiration tracking

### Access Control

```sql
-- Set tenant context for multi-tenant queries
SELECT set_tenant_context('acme-corp');

-- Verify tenant isolation
SELECT * FROM verify_tenant_isolation();

-- Get tenant statistics
SELECT * FROM tenant_statistics WHERE tenant_slug = 'acme-corp';
```

## 📊 Analytics and Monitoring

### Real-time Analytics

```sql
-- Get notification performance by channel
SELECT * FROM notification_analytics
WHERE tenantId = 'tenant-123'
ORDER BY hour DESC;

-- Get partition statistics
SELECT * FROM notification_partition_stats
ORDER BY partition_name;

-- Check system health
SELECT * FROM check_encryption_health();
```

### Performance Metrics

The system tracks:
- **Delivery success rates** by channel and provider
- **Average delivery times** for performance monitoring
- **Cost per notification** for budget tracking
- **Throughput metrics** for capacity planning
- **Error rates** for provider reliability assessment

### Custom Analytics Queries

```typescript
// Example analytics query
const analytics = await prisma.$queryRaw`
  SELECT
    channel,
    status,
    COUNT(*) as count,
    AVG(deliveryTimeMs) as avg_delivery_time,
    SUM(cost) as total_cost
  FROM notification_logs
  WHERE tenantId = ${tenantId}
    AND queuedAt >= ${startDate}
    AND queuedAt <= ${endDate}
  GROUP BY channel, status
  ORDER BY count DESC
`;
```

## 🔄 Usage Examples

### Creating Notification Logs

```typescript
import { NotificationChannel, NotificationStatus, NotificationPriority } from '@coinet/shared-types';

const notificationLog = await prisma.notificationLog.create({
  data: {
    userId: 'user-123',
    tenantId: 'tenant-456',
    channel: NotificationChannel.EMAIL,
    status: NotificationStatus.QUEUED,
    priority: NotificationPriority.NORMAL,
    messageTitle: 'Price Alert',
    messageContent: 'BTC has reached $50,000',
    messagePayload: {
      symbol: 'BTC',
      price: 50000,
      alertId: 'alert-789'
    },
    metadata: {
      alertType: 'price_threshold',
      triggeredBy: 'automated_system'
    }
  }
});
```

### Querying Notifications

```typescript
// Get notifications for a specific user
const userNotifications = await prisma.notificationLog.findMany({
  where: {
    userId: 'user-123',
    tenantId: 'tenant-456',
    status: {
      in: [NotificationStatus.DELIVERED, NotificationStatus.FAILED]
    }
  },
  orderBy: {
    createdAt: 'desc'
  },
  take: 50
});

// Get analytics by channel
const channelAnalytics = await prisma.notificationLog.groupBy({
  by: ['channel', 'status'],
  where: {
    tenantId: 'tenant-456',
    queuedAt: {
      gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
    }
  },
  _count: {
    id: true
  },
  _avg: {
    deliveryTimeMs: true
  }
});
```

### Updating Notification Status

```typescript
// Mark notification as delivered
await prisma.notificationLog.update({
  where: { id: 'notification-123' },
  data: {
    status: NotificationStatus.DELIVERED,
    deliveredAt: new Date(),
    deliveryTimeMs: 150, // 150ms delivery time
    providerResponse: {
      messageId: 'msg_123',
      status: 'delivered'
    }
  }
});

// Handle failed notification with retry
await prisma.notificationLog.update({
  where: { id: 'notification-456' },
  data: {
    status: NotificationStatus.RETRY,
    retryCount: {
      increment: 1
    },
    errorCodes: ['PROVIDER_TIMEOUT'],
    errorMessage: 'Request timed out after 30 seconds'
  }
});
```

### Campaign Management

```typescript
// Create a notification campaign
const campaign = await prisma.notificationCampaign.create({
  data: {
    name: 'BTC Price Drop Campaign',
    channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
    priority: NotificationPriority.HIGH,
    userSegment: 'tier = PREMIUM AND portfolios.symbol = BTC',
    tenantId: 'tenant-456',
    abTestEnabled: true,
    variants: {
      control: { title: 'BTC Price Alert' },
      variantA: { title: 'Bitcoin Price Update' },
      variantB: { title: 'BTC Market Movement' }
    }
  }
});
```

## 🛠️ Maintenance Procedures

### Daily Maintenance

```sql
-- Analyze all partitions for query planner optimization
SELECT 'ANALYZE ' || c.relname || ';'
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname LIKE 'notification_logs_y%m%'
AND n.nspname = 'public';

-- Check partition health
SELECT * FROM check_partition_health();

-- Monitor encryption health
SELECT * FROM check_encryption_health();
```

### Weekly Maintenance

```sql
-- Clean up old partitions (older than 12 months)
SELECT cleanup_old_notification_partitions(12);

-- Update partition statistics
ANALYZE notification_logs;

-- Check for performance issues
SELECT * FROM get_partition_recommendations();
```

### Monthly Maintenance

```sql
-- Rotate encryption keys for security compliance
SELECT rotate_encryption_key('notification-logs-master-key');

-- Full backup of tenant data
SELECT * FROM backup_tenant_data('all');

-- Review tenant statistics
SELECT * FROM tenant_statistics ORDER BY total_cost DESC;
```

## 🔍 Monitoring and Alerting

### Key Metrics to Monitor

1. **Notification Throughput**: Notifications per minute/hour
2. **Delivery Success Rate**: Percentage of successful deliveries
3. **Average Delivery Time**: Performance indicator
4. **Error Rates**: By channel and provider
5. **Partition Sizes**: Monitor for performance issues
6. **Encryption Key Health**: Key expiration and rotation status

### Alerting Rules

```yaml
# Example Prometheus alerting rules
groups:
  - name: notification-system
    rules:
      - alert: HighNotificationFailureRate
        expr: rate(notification_logs_failed_total[5m]) / rate(notification_logs_sent_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning

      - alert: SlowDeliveryTime
        expr: histogram_quantile(0.95, rate(notification_logs_delivery_time_bucket[5m])) > 1000
        for: 10m
        labels:
          severity: warning

      - alert: PartitionSizeTooLarge
        expr: pg_total_relation_size('notification_logs_y' || to_char(now(), 'YYYYmm')) > 10 * 1024 * 1024 * 1024
        for: 1h
        labels:
          severity: critical
```

## 🆘 Troubleshooting

### Common Issues

#### High Query Latency

**Symptoms**: Slow analytics queries, timeout errors
**Solution**:
1. Check if queries are using partition keys
2. Verify index usage with `EXPLAIN ANALYZE`
3. Consider adding missing indexes
4. Check partition sizes and cleanup old data

#### Encryption Key Issues

**Symptoms**: Decryption failures, audit log errors
**Solution**:
1. Verify active encryption keys: `SELECT * FROM list_encryption_keys();`
2. Check key expiration: `SELECT * FROM get_encryption_key_info('key-name');`
3. Rotate keys if needed: `SELECT rotate_encryption_key('key-name');`

#### Tenant Isolation Problems

**Symptoms**: Users seeing other tenants' data
**Solution**:
1. Verify tenant context is set: `SHOW app.current_tenant;`
2. Check RLS policies: `SELECT * FROM verify_tenant_isolation();`
3. Review audit logs: `SELECT * FROM tenant_access_log WHERE success = false;`

### Performance Tuning

```sql
-- Check slow queries
SELECT * FROM pg_stat_statements
WHERE query LIKE '%notification_logs%'
ORDER BY mean_time DESC;

-- Check index usage
SELECT * FROM pg_stat_user_indexes
WHERE relname LIKE 'notification_logs%'
ORDER BY idx_scan DESC;

-- Check table bloat
SELECT * FROM pg_stat_user_tables
WHERE relname LIKE 'notification_logs%'
ORDER BY n_dead_tup DESC;
```

## 📚 API Reference

### NotificationLog Model

```typescript
interface NotificationLog {
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
  retryCount: number
  maxRetries: number
  errorCodes: string[]
  errorMessage?: string
  provider?: string
  providerId?: string
  providerResponse?: any
  messageTitle?: string
  messageContent?: string  // Encrypted
  messagePayload?: any    // Encrypted
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
```

### Key Functions

- `set_tenant_context(tenant_slug)` - Set tenant isolation context
- `encrypt_notification_data(content)` - Encrypt sensitive data
- `decrypt_notification_data(encrypted)` - Decrypt sensitive data
- `rotate_encryption_key(key_name)` - Rotate encryption keys
- `create_notification_logs_partition(date)` - Create new partition
- `cleanup_old_notification_partitions(months)` - Remove old partitions

## 🤝 Contributing

When contributing to the notification system:

1. **Performance**: Always consider the impact on billions of rows
2. **Security**: Ensure tenant isolation and encryption are maintained
3. **Monitoring**: Add appropriate metrics and alerting
4. **Documentation**: Update this README with any changes
5. **Testing**: Include performance tests for large datasets

## 📞 Support

For issues or questions about the notification logs system:

1. Check the troubleshooting section above
2. Review the audit logs for security issues
3. Monitor partition health and performance metrics
4. Verify encryption key status and rotation schedule

---

**Built with ❤️ for world-class performance at scale**
