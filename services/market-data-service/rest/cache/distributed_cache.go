package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

// DistributedCacheConfig defines configuration for distributed cache
type DistributedCacheConfig struct {
	RedisURL         string        `json:"redis_url"`
	Password         string        `json:"password"`
	DB               int           `json:"db"`
	MaxRetries       int           `json:"max_retries"`
	PoolSize         int           `json:"pool_size"`
	MinIdleConns     int           `json:"min_idle_conns"`
	MaxConnAge       time.Duration `json:"max_conn_age"`
	PoolTimeout      time.Duration `json:"pool_timeout"`
	IdleTimeout      time.Duration `json:"idle_timeout"`
	ConnMaxIdleTime  time.Duration `json:"conn_max_idle_time"`
	KeyPrefix        string        `json:"key_prefix"`
	DefaultTTL       time.Duration `json:"default_ttl"`
	ClusterMode      bool          `json:"cluster_mode"`
	ClusterAddrs     []string      `json:"cluster_addrs"`
	Namespace        string        `json:"namespace"`
	CompressionLevel int           `json:"compression_level"`
	Serialization    string        `json:"serialization"` // "json", "msgpack", "protobuf"
	Metrics          bool          `json:"metrics"`
	Tracing          bool          `json:"tracing"`
}

// DistributedCacheStats provides comprehensive cache statistics
type DistributedCacheStats struct {
	TotalOperations   int64         `json:"total_operations"`
	SuccessfulOps     int64         `json:"successful_ops"`
	FailedOps         int64         `json:"failed_ops"`
	CacheHits         int64         `json:"cache_hits"`
	CacheMisses       int64         `json:"cache_misses"`
	HitRatio          float64       `json:"hit_ratio"`
	AvgResponseTime   time.Duration `json:"avg_response_time"`
	ConnectionsActive int           `json:"connections_active"`
	ConnectionsIdle   int           `json:"connections_idle"`
	RedisVersion      string        `json:"redis_version"`
	Uptime            time.Duration `json:"uptime"`
	BytesTransferred  int64         `json:"bytes_transferred"`
	CompressionRatio  float64       `json:"compression_ratio"`
}

// DistributedCache is a revolutionary distributed cache with Redis backend
type DistributedCache struct {
	config    DistributedCacheConfig
	client    redis.UniversalClient
	stats     DistributedCacheStats
	tracer    trace.Tracer
	startTime time.Time
	mu        sync.RWMutex
	fallback  *MemoryCache

	// Callbacks for monitoring
	onHit      func(key string, value interface{})
	onMiss     func(key string)
	onSet      func(key string, value interface{}, ttl time.Duration)
	onError    func(operation string, err error)
	onFallback func(operation string, reason string)
}

// NewDistributedCache creates a new revolutionary distributed cache instance
func NewDistributedCache(config DistributedCacheConfig) (*DistributedCache, error) {
	// Initialize Redis client
	var client redis.UniversalClient

	if config.ClusterMode {
		client = redis.NewClusterClient(&redis.ClusterOptions{
			Addrs:           config.ClusterAddrs,
			Password:        config.Password,
			MaxRetries:      config.MaxRetries,
			PoolSize:        config.PoolSize,
			MinIdleConns:    config.MinIdleConns,
			ConnMaxLifetime: config.MaxConnAge,
			PoolTimeout:     config.PoolTimeout,
			ConnMaxIdleTime: config.IdleTimeout,
		})
	} else {
		client = redis.NewClient(&redis.Options{
			Addr:            config.RedisURL,
			Password:        config.Password,
			DB:              config.DB,
			MaxRetries:      config.MaxRetries,
			PoolSize:        config.PoolSize,
			MinIdleConns:    config.MinIdleConns,
			ConnMaxLifetime: config.MaxConnAge,
			PoolTimeout:     config.PoolTimeout,
			ConnMaxIdleTime: config.IdleTimeout,
		})
	}

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	// Initialize fallback cache
	fallback := NewMemoryCache(100 * 1024 * 1024) // 100MB fallback cache

	// Initialize tracer
	var tracer trace.Tracer
	if config.Tracing {
		tracer = otel.Tracer("distributed-cache")
	}

	dc := &DistributedCache{
		config:    config,
		client:    client,
		tracer:    tracer,
		startTime: time.Now(),
		fallback:  fallback,
		stats: DistributedCacheStats{
			RedisVersion: client.Info(ctx, "server").Val(),
		},
	}

	// Start background workers
	dc.startBackgroundWorkers()

	return dc, nil
}

// Set stores a value with TTL in the distributed cache
func (dc *DistributedCache) Set(key string, value interface{}, ttl time.Duration) error {
	ctx := context.Background()
	startTime := time.Now()

	// Create tracing span
	if dc.tracer != nil {
		var span trace.Span
		ctx, span = dc.tracer.Start(ctx, "cache.set", trace.WithAttributes(
			attribute.String("cache.key", key),
			attribute.String("cache.operation", "set"),
		))
		defer span.End()
	}

	// Prepare key and value
	finalKey := dc.buildKey(key)
	serializedValue, err := dc.serialize(value)
	if err != nil {
		dc.recordError("set", err)
		return dc.fallbackSet(key, value, ttl, "serialization_error")
	}

	// Store in Redis
	err = dc.client.Set(ctx, finalKey, serializedValue, ttl).Err()
	if err != nil {
		dc.recordError("set", err)
		return dc.fallbackSet(key, value, ttl, "redis_error")
	}

	// Update statistics
	dc.recordOperation("set", time.Since(startTime), true)
	dc.recordBytesTransferred(int64(len(serializedValue)))

	// Trigger callback
	if dc.onSet != nil {
		dc.onSet(key, value, ttl)
	}

	return nil
}

// Get retrieves a value from the distributed cache
func (dc *DistributedCache) Get(key string) (interface{}, bool) {
	ctx := context.Background()
	startTime := time.Now()

	// Create tracing span
	if dc.tracer != nil {
		var span trace.Span
		ctx, span = dc.tracer.Start(ctx, "cache.get", trace.WithAttributes(
			attribute.String("cache.key", key),
			attribute.String("cache.operation", "get"),
		))
		defer span.End()
	}

	// Prepare key
	finalKey := dc.buildKey(key)

	// Get from Redis
	result, err := dc.client.Get(ctx, finalKey).Result()
	if err != nil {
		if err == redis.Nil {
			// Cache miss
			dc.recordOperation("get", time.Since(startTime), true)
			dc.recordCacheMiss()
			if dc.onMiss != nil {
				dc.onMiss(key)
			}

			// Try fallback cache
			if value, exists := dc.fallback.Get(key); exists {
				if dc.onFallback != nil {
					dc.onFallback("get", "redis_miss_fallback_hit")
				}
				return value, true
			}

			return nil, false
		}

		// Redis error, try fallback
		dc.recordError("get", err)
		if value, exists := dc.fallback.Get(key); exists {
			if dc.onFallback != nil {
				dc.onFallback("get", "redis_error_fallback_hit")
			}
			return value, true
		}

		return nil, false
	}

	// Deserialize value
	value, err := dc.deserialize(result)
	if err != nil {
		dc.recordError("get", err)
		return nil, false
	}

	// Update statistics
	dc.recordOperation("get", time.Since(startTime), true)
	dc.recordCacheHit()
	dc.recordBytesTransferred(int64(len(result)))

	// Trigger callback
	if dc.onHit != nil {
		dc.onHit(key, value)
	}

	return value, true
}

// GetMultiple retrieves multiple values in a single operation
func (dc *DistributedCache) GetMultiple(keys []string) map[string]interface{} {
	ctx := context.Background()
	startTime := time.Now()

	// Create tracing span
	if dc.tracer != nil {
		var span trace.Span
		ctx, span = dc.tracer.Start(ctx, "cache.get_multiple", trace.WithAttributes(
			attribute.Int("cache.keys_count", len(keys)),
			attribute.String("cache.operation", "get_multiple"),
		))
		defer span.End()
	}

	// Prepare keys
	finalKeys := make([]string, len(keys))
	keyMap := make(map[string]string) // finalKey -> originalKey
	for i, key := range keys {
		finalKeys[i] = dc.buildKey(key)
		keyMap[finalKeys[i]] = key
	}

	// Get from Redis using pipeline
	pipe := dc.client.Pipeline()
	cmds := make([]*redis.StringCmd, len(finalKeys))
	for i, key := range finalKeys {
		cmds[i] = pipe.Get(ctx, key)
	}

	_, err := pipe.Exec(ctx)

	result := make(map[string]interface{})

	// Process results
	for i, cmd := range cmds {
		finalKey := finalKeys[i]
		originalKey := keyMap[finalKey]

		if cmd.Err() == nil {
			// Successful get
			value, deserErr := dc.deserialize(cmd.Val())
			if deserErr == nil {
				result[originalKey] = value
				dc.recordCacheHit()
			} else {
				dc.recordError("get_multiple", deserErr)
			}
		} else if cmd.Err() == redis.Nil {
			// Cache miss
			dc.recordCacheMiss()

			// Try fallback cache
			if value, exists := dc.fallback.Get(originalKey); exists {
				result[originalKey] = value
				if dc.onFallback != nil {
					dc.onFallback("get_multiple", "redis_miss_fallback_hit")
				}
			}
		} else {
			// Redis error
			dc.recordError("get_multiple", cmd.Err())

			// Try fallback cache
			if value, exists := dc.fallback.Get(originalKey); exists {
				result[originalKey] = value
				if dc.onFallback != nil {
					dc.onFallback("get_multiple", "redis_error_fallback_hit")
				}
			}
		}
	}

	// Update statistics
	dc.recordOperation("get_multiple", time.Since(startTime), err == nil)

	return result
}

// SetMultiple stores multiple values in a single operation
func (dc *DistributedCache) SetMultiple(items map[string]interface{}, ttl time.Duration) error {
	ctx := context.Background()
	startTime := time.Now()

	// Create tracing span
	if dc.tracer != nil {
		var span trace.Span
		ctx, span = dc.tracer.Start(ctx, "cache.set_multiple", trace.WithAttributes(
			attribute.Int("cache.items_count", len(items)),
			attribute.String("cache.operation", "set_multiple"),
		))
		defer span.End()
	}

	// Use pipeline for efficiency
	pipe := dc.client.Pipeline()
	var totalBytes int64

	for key, value := range items {
		finalKey := dc.buildKey(key)
		serializedValue, err := dc.serialize(value)
		if err != nil {
			dc.recordError("set_multiple", err)
			// Store in fallback cache
			dc.fallback.Set(key, value, ttl)
			continue
		}

		pipe.Set(ctx, finalKey, serializedValue, ttl)
		totalBytes += int64(len(serializedValue))
	}

	// Execute pipeline
	_, err := pipe.Exec(ctx)
	if err != nil {
		dc.recordError("set_multiple", err)
		// Fallback to memory cache
		dc.fallback.SetMultiple(items, ttl)
		if dc.onFallback != nil {
			dc.onFallback("set_multiple", "redis_error")
		}
		return err
	}

	// Update statistics
	dc.recordOperation("set_multiple", time.Since(startTime), true)
	dc.recordBytesTransferred(totalBytes)

	// Trigger callbacks
	if dc.onSet != nil {
		for key, value := range items {
			dc.onSet(key, value, ttl)
		}
	}

	return nil
}

// Delete removes an item from the cache
func (dc *DistributedCache) Delete(key string) bool {
	ctx := context.Background()
	startTime := time.Now()

	// Create tracing span
	if dc.tracer != nil {
		var span trace.Span
		ctx, span = dc.tracer.Start(ctx, "cache.delete", trace.WithAttributes(
			attribute.String("cache.key", key),
			attribute.String("cache.operation", "delete"),
		))
		defer span.End()
	}

	finalKey := dc.buildKey(key)

	// Delete from Redis
	result, err := dc.client.Del(ctx, finalKey).Result()
	if err != nil {
		dc.recordError("delete", err)
	}

	// Also delete from fallback cache
	dc.fallback.Delete(key)

	// Update statistics
	dc.recordOperation("delete", time.Since(startTime), err == nil)

	return result > 0
}

// Clear removes all items from the cache
func (dc *DistributedCache) Clear() error {
	ctx := context.Background()
	startTime := time.Now()

	// Create tracing span
	if dc.tracer != nil {
		var span trace.Span
		ctx, span = dc.tracer.Start(ctx, "cache.clear", trace.WithAttributes(
			attribute.String("cache.operation", "clear"),
		))
		defer span.End()
	}

	// Clear Redis keys with prefix
	pattern := dc.buildKey("*")
	iter := dc.client.Scan(ctx, 0, pattern, 0).Iterator()

	for iter.Next(ctx) {
		key := iter.Val()
		dc.client.Del(ctx, key)
	}

	if err := iter.Err(); err != nil {
		dc.recordError("clear", err)
		return err
	}

	// Clear fallback cache
	dc.fallback.Clear()

	// Update statistics
	dc.recordOperation("clear", time.Since(startTime), true)

	return nil
}

// Stats returns comprehensive cache statistics
func (dc *DistributedCache) Stats() DistributedCacheStats {
	dc.mu.RLock()
	defer dc.mu.RUnlock()

	stats := dc.stats
	stats.Uptime = time.Since(dc.startTime)

	// Get Redis connection stats
	if poolStats := dc.client.PoolStats(); poolStats != nil {
		stats.ConnectionsActive = int(poolStats.IdleConns)
		stats.ConnectionsIdle = int(poolStats.IdleConns)
	}

	// Calculate hit ratio
	if stats.CacheHits+stats.CacheMisses > 0 {
		stats.HitRatio = float64(stats.CacheHits) / float64(stats.CacheHits+stats.CacheMisses)
	}

	return stats
}

// SetCallbacks configures event callbacks for monitoring
func (dc *DistributedCache) SetCallbacks(
	onHit func(key string, value interface{}),
	onMiss func(key string),
	onSet func(key string, value interface{}, ttl time.Duration),
	onError func(operation string, err error),
	onFallback func(operation string, reason string),
) {
	dc.mu.Lock()
	defer dc.mu.Unlock()

	dc.onHit = onHit
	dc.onMiss = onMiss
	dc.onSet = onSet
	dc.onError = onError
	dc.onFallback = onFallback
}

// Close gracefully shuts down the distributed cache
func (dc *DistributedCache) Close() error {
	return dc.client.Close()
}

// HealthCheck checks the health of the distributed cache
func (dc *DistributedCache) HealthCheck() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Test basic connectivity
	if err := dc.client.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("redis ping failed: %w", err)
	}

	// Test set/get operation
	testKey := dc.buildKey("__health_check__")
	testValue := "healthy"

	if err := dc.client.Set(ctx, testKey, testValue, time.Minute).Err(); err != nil {
		return fmt.Errorf("redis set failed: %w", err)
	}

	result, err := dc.client.Get(ctx, testKey).Result()
	if err != nil {
		return fmt.Errorf("redis get failed: %w", err)
	}

	if result != testValue {
		return fmt.Errorf("redis data integrity check failed")
	}

	// Clean up test key
	dc.client.Del(ctx, testKey)

	return nil
}

// Private methods for internal operations

func (dc *DistributedCache) buildKey(key string) string {
	if dc.config.Namespace != "" {
		return fmt.Sprintf("%s:%s:%s", dc.config.KeyPrefix, dc.config.Namespace, key)
	}
	return fmt.Sprintf("%s:%s", dc.config.KeyPrefix, key)
}

func (dc *DistributedCache) serialize(value interface{}) (string, error) {
	switch dc.config.Serialization {
	case "json":
		fallthrough
	default:
		data, err := json.Marshal(value)
		if err != nil {
			return "", err
		}
		return string(data), nil
	}
}

func (dc *DistributedCache) deserialize(data string) (interface{}, error) {
	switch dc.config.Serialization {
	case "json":
		fallthrough
	default:
		var value interface{}
		err := json.Unmarshal([]byte(data), &value)
		if err != nil {
			return nil, err
		}
		return value, nil
	}
}

func (dc *DistributedCache) fallbackSet(key string, value interface{}, ttl time.Duration, reason string) error {
	if dc.onFallback != nil {
		dc.onFallback("set", reason)
	}
	return dc.fallback.Set(key, value, ttl)
}

func (dc *DistributedCache) recordOperation(operation string, duration time.Duration, success bool) {
	dc.mu.Lock()
	defer dc.mu.Unlock()

	dc.stats.TotalOperations++
	if success {
		dc.stats.SuccessfulOps++
	} else {
		dc.stats.FailedOps++
	}

	// Update average response time
	if dc.stats.TotalOperations == 1 {
		dc.stats.AvgResponseTime = duration
	} else {
		dc.stats.AvgResponseTime = time.Duration(
			(int64(dc.stats.AvgResponseTime)*int64(dc.stats.TotalOperations-1) + int64(duration)) / int64(dc.stats.TotalOperations),
		)
	}
}

func (dc *DistributedCache) recordCacheHit() {
	dc.mu.Lock()
	defer dc.mu.Unlock()
	dc.stats.CacheHits++
}

func (dc *DistributedCache) recordCacheMiss() {
	dc.mu.Lock()
	defer dc.mu.Unlock()
	dc.stats.CacheMisses++
}

func (dc *DistributedCache) recordError(operation string, err error) {
	dc.mu.Lock()
	defer dc.mu.Unlock()
	dc.stats.FailedOps++

	if dc.onError != nil {
		dc.onError(operation, err)
	}
}

func (dc *DistributedCache) recordBytesTransferred(bytes int64) {
	dc.mu.Lock()
	defer dc.mu.Unlock()
	dc.stats.BytesTransferred += bytes
}

func (dc *DistributedCache) startBackgroundWorkers() {
	// Start fallback cache cleanup worker
	dc.fallback.StartCleanupWorker(5 * time.Minute)

	// Start statistics collection worker
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		for range ticker.C {
			// Update connection stats and other metrics
			// This could be expanded to collect more detailed metrics
		}
	}()
}
