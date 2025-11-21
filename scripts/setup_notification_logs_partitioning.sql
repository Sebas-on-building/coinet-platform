-- =============================================================================
-- NOTIFICATION LOGS PARTITIONING SETUP
-- =============================================================================
-- This script sets up monthly partitioning for the notification_logs table
-- to handle billions of rows with optimal performance for time-based queries.

-- 1. Create the master partitioned table (if not already created)
-- This should be run after the initial migration

-- 2. Create a function to automatically create new partitions
CREATE OR REPLACE FUNCTION create_notification_logs_partition(
    partition_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
RETURNS TEXT AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
    sql_command TEXT;
BEGIN
    -- Calculate partition boundaries (monthly)
    start_date := DATE_TRUNC('month', partition_date::DATE);
    end_date := start_date + INTERVAL '1 month';

    -- Generate partition name: notification_logs_y2024m01
    partition_name := 'notification_logs_y' ||
                     EXTRACT(YEAR FROM start_date) ||
                     'm' ||
                     LPAD(EXTRACT(MONTH FROM start_date)::TEXT, 2, '0');

    -- Check if partition already exists
    IF EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = partition_name
        AND n.nspname = 'public'
    ) THEN
        RETURN 'Partition ' || partition_name || ' already exists';
    END IF;

    -- Create the partition
    sql_command := FORMAT(
        'CREATE TABLE %I PARTITION OF notification_logs ' ||
        'FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
    );

    EXECUTE sql_command;

    -- Create indexes on the new partition (matching the parent table indexes)
    EXECUTE FORMAT('CREATE INDEX %I ON %I ("userId", "channel", "queuedAt")', partition_name || '_user_channel_time_idx', partition_name);
    EXECUTE FORMAT('CREATE INDEX %I ON %I ("status", "queuedAt")', partition_name || '_status_time_idx', partition_name);
    EXECUTE FORMAT('CREATE INDEX %I ON %I ("deliveredAt")', partition_name || '_delivered_idx', partition_name);

    RETURN 'Created partition: ' || partition_name;
END;
$$ LANGUAGE plpgsql;

-- 3. Create initial partitions for the next 12 months
DO $$
DECLARE
    current_date DATE := CURRENT_DATE;
    i INTEGER := 0;
BEGIN
    FOR i IN 0..11 LOOP
        PERFORM create_notification_logs_partition((current_date + (i * INTERVAL '1 month'))::TIMESTAMP);
    END LOOP;
END;
$$;

-- 4. Create a trigger function to automatically create partitions for new data
CREATE OR REPLACE FUNCTION auto_create_notification_partition()
RETURNS TRIGGER AS $$
DECLARE
    partition_date DATE;
    partition_name TEXT;
BEGIN
    -- Extract the month from queuedAt for partitioning
    partition_date := DATE_TRUNC('month', NEW."queuedAt");

    -- Generate partition name
    partition_name := 'notification_logs_y' ||
                     EXTRACT(YEAR FROM partition_date) ||
                     'm' ||
                     LPAD(EXTRACT(MONTH FROM partition_date)::TEXT, 2, '0');

    -- Check if partition exists, create if not
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = partition_name
        AND n.nspname = 'public'
    ) THEN
        PERFORM create_notification_logs_partition(partition_date);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger to auto-create partitions
CREATE TRIGGER trigger_auto_create_notification_partition
    BEFORE INSERT ON notification_logs
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_notification_partition();

-- 6. Create a maintenance function to clean up old partitions
CREATE OR REPLACE FUNCTION cleanup_old_notification_partitions(
    retention_months INTEGER DEFAULT 12
)
RETURNS TABLE(dropped_partitions TEXT[]) AS $$
DECLARE
    cutoff_date DATE;
    partition_record RECORD;
    dropped_partitions TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Calculate cutoff date
    cutoff_date := CURRENT_DATE - (retention_months || ' months')::INTERVAL;

    -- Find and drop old partitions
    FOR partition_record IN
        SELECT c.relname as partition_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname LIKE 'notification_logs_y%m%'
        AND n.nspname = 'public'
        AND c.relname < 'notification_logs_y' ||
                       EXTRACT(YEAR FROM cutoff_date) ||
                       'm' ||
                       LPAD(EXTRACT(MONTH FROM cutoff_date)::TEXT, 2, '0')
        AND c.relkind = 'r' -- regular table (partition)
    LOOP
        EXECUTE 'DROP TABLE ' || partition_record.partition_name;
        dropped_partitions := dropped_partitions || partition_record.partition_name;
    END LOOP;

    RETURN QUERY SELECT dropped_partitions;
END;
$$ LANGUAGE plpgsql;

-- 7. Create a scheduled job to clean up old partitions (example using pg_cron)
-- Note: This requires the pg_cron extension to be installed
-- SELECT cron.schedule('cleanup-notification-partitions', '0 2 1 * *', 'SELECT cleanup_old_notification_partitions(12);');

-- 8. Create performance monitoring views
CREATE OR REPLACE VIEW notification_partition_stats AS
SELECT
    c.relname as partition_name,
    pg_size_pretty(pg_total_relation_size(c.oid)) as size,
    s.n_tup_ins as rows_inserted,
    s.n_tup_upd as rows_updated,
    s.n_tup_del as rows_deleted,
    s.n_live_tup as live_rows,
    s.n_dead_tup as dead_rows
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_stat_user_tables s ON s.relname = c.relname
WHERE c.relname LIKE 'notification_logs_y%m%'
AND n.nspname = 'public'
ORDER BY c.relname;

-- 9. Create analytics view with partition awareness
CREATE OR REPLACE VIEW notification_analytics_partitioned AS
SELECT
    "channel",
    "status",
    "tenantId",
    DATE_TRUNC('day', "queuedAt") as day,
    COUNT(*) as count,
    AVG("deliveryTimeMs") as avg_delivery_time_ms,
    SUM("cost") as total_cost,
    MIN("queuedAt") as earliest_notification,
    MAX("queuedAt") as latest_notification
FROM notification_logs
WHERE "queuedAt" >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY "channel", "status", "tenantId", DATE_TRUNC('day', "queuedAt")
ORDER BY day DESC, "channel", "status";

-- 10. Create indexes for common query patterns on the master table
-- (These will be inherited by all partitions)

-- Index for time-range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "notification_logs_time_range_idx"
ON notification_logs ("queuedAt", "channel", "status");

-- Index for tenant-specific queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "notification_logs_tenant_time_idx"
ON notification_logs ("tenantId", "queuedAt");

-- Index for user analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS "notification_logs_user_analytics_idx"
ON notification_logs ("userId", "channel", "status", "queuedAt");

-- 11. Create a function to get partition recommendations
CREATE OR REPLACE FUNCTION get_partition_recommendations()
RETURNS TABLE(
    recommendation TEXT,
    reason TEXT,
    impact TEXT
) AS $$
BEGIN
    RETURN QUERY VALUES
    ('Monitor partition sizes', 'Large partitions may impact query performance', 'Medium'),
    ('Regular partition cleanup', 'Remove data older than retention policy', 'High'),
    ('Index maintenance', 'Rebuild indexes on large partitions periodically', 'Medium'),
    ('Query optimization', 'Ensure queries use partition keys effectively', 'High'),
    ('Archive old data', 'Move very old data to cold storage', 'Low');
END;
$$ LANGUAGE plpgsql;

-- 12. Create monitoring alerts for partition health
-- This would typically be integrated with your monitoring system
CREATE OR REPLACE FUNCTION check_partition_health()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
DECLARE
    partition_count INTEGER;
    large_partitions INTEGER;
    total_size BIGINT;
BEGIN
    -- Count total partitions
    SELECT COUNT(*) INTO partition_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname LIKE 'notification_logs_y%m%'
    AND n.nspname = 'public';

    -- Count large partitions (> 10GB)
    SELECT COUNT(*) INTO large_partitions
    FROM pg_class c
    WHERE c.relname LIKE 'notification_logs_y%m%'
    AND pg_total_relation_size(c.oid) > 10 * 1024 * 1024 * 1024;

    -- Calculate total size
    SELECT SUM(pg_total_relation_size(c.oid)) INTO total_size
    FROM pg_class c
    WHERE c.relname LIKE 'notification_logs_y%m%';

    RETURN QUERY VALUES
    ('Partition Count', CASE WHEN partition_count > 0 THEN 'OK' ELSE 'WARNING' END,
     partition_count::TEXT || ' partitions found'),
    ('Large Partitions', CASE WHEN large_partitions = 0 THEN 'OK' ELSE 'WARNING' END,
     large_partitions::TEXT || ' partitions > 10GB'),
    ('Total Size', 'OK',
     pg_size_pretty(total_size) || ' total partition size');
END;
$$ LANGUAGE plpgsql;

-- 13. Enable partition-specific autovacuum settings
-- Adjust autovacuum settings for better performance on large partitions
ALTER TABLE notification_logs SET (
    autovacuum_vacuum_scale_factor = 0.02,
    autovacuum_analyze_scale_factor = 0.01,
    autovacuum_vacuum_threshold = 10000,
    autovacuum_analyze_threshold = 5000
);

-- 14. Create a maintenance script template
/*
-- To be run periodically (e.g., weekly) as a maintenance script:

-- 1. Analyze all partitions for query planner statistics
SELECT 'ANALYZE ' || c.relname || ';'
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname LIKE 'notification_logs_y%m%'
AND n.nspname = 'public';

-- 2. Check for partitions that need optimization
SELECT check_partition_health();

-- 3. Clean up old partitions if needed
SELECT cleanup_old_notification_partitions(12);

-- 4. Update partition statistics
SELECT get_partition_recommendations();
*/

-- 15. Create helpful comments
COMMENT ON FUNCTION create_notification_logs_partition(DATE) IS 'Creates a new monthly partition for notification_logs table';
COMMENT ON FUNCTION auto_create_notification_partition() IS 'Automatically creates partitions when new data is inserted';
COMMENT ON FUNCTION cleanup_old_notification_partitions(INTEGER) IS 'Removes old partitions beyond retention period';
COMMENT ON FUNCTION check_partition_health() IS 'Returns health status of notification log partitions';
COMMENT ON VIEW notification_partition_stats IS 'Statistics for all notification log partitions';
COMMENT ON VIEW notification_analytics_partitioned IS 'Partition-aware analytics view for recent notification data';
