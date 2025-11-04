package cache

import (
	"container/list"
	"encoding/json"
	"fmt"
	"sync"
	"time"
)

// MemoryCacheItem represents a cached item with metadata
type MemoryCacheItem struct {
	Key        string      `json:"key"`
	Value      interface{} `json:"value"`
	ExpiresAt  time.Time   `json:"expires_at"`
	CreatedAt  time.Time   `json:"created_at"`
	AccessedAt time.Time   `json:"accessed_at"`
	HitCount   int64       `json:"hit_count"`
	Size       int64       `json:"size"`
}

// MemoryCacheStats provides detailed cache statistics
type MemoryCacheStats struct {
	TotalItems    int64         `json:"total_items"`
	TotalHits     int64         `json:"total_hits"`
	TotalMisses   int64         `json:"total_misses"`
	HitRatio      float64       `json:"hit_ratio"`
	MemoryUsage   int64         `json:"memory_usage"`
	EvictionCount int64         `json:"eviction_count"`
	MaxSize       int64         `json:"max_size"`
	Uptime        time.Duration `json:"uptime"`
}

// MemoryCache is a revolutionary thread-safe in-memory cache with LRU eviction
type MemoryCache struct {
	mu          sync.RWMutex
	items       map[string]*MemoryCacheItem
	lruList     *list.List
	lruElements map[string]*list.Element
	maxSize     int64
	currentSize int64
	stats       MemoryCacheStats
	startTime   time.Time

	// Advanced features
	onEviction func(key string, value interface{})
	onHit      func(key string, value interface{})
	onMiss     func(key string)
	onSet      func(key string, value interface{}, ttl time.Duration)
}

// NewMemoryCache creates a new revolutionary memory cache instance
func NewMemoryCache(maxSize int64) *MemoryCache {
	return &MemoryCache{
		items:       make(map[string]*MemoryCacheItem),
		lruList:     list.New(),
		lruElements: make(map[string]*list.Element),
		maxSize:     maxSize,
		stats: MemoryCacheStats{
			MaxSize: maxSize,
		},
		startTime: time.Now(),
	}
}

// Set stores a value with TTL in the cache with revolutionary precision
func (mc *MemoryCache) Set(key string, value interface{}, ttl time.Duration) error {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	now := time.Now()
	serialized, err := json.Marshal(value)
	if err != nil {
		return err
	}

	size := int64(len(serialized)) + int64(len(key))

	// Remove existing item if present
	if existingItem, exists := mc.items[key]; exists {
		mc.currentSize -= existingItem.Size
		mc.removeLRUElement(key)
	}

	// Ensure space for new item
	for mc.currentSize+size > mc.maxSize && mc.lruList.Len() > 0 {
		mc.evictLRU()
	}

	// Create new cache item
	item := &MemoryCacheItem{
		Key:        key,
		Value:      value,
		ExpiresAt:  now.Add(ttl),
		CreatedAt:  now,
		AccessedAt: now,
		HitCount:   0,
		Size:       size,
	}

	mc.items[key] = item
	mc.currentSize += size
	mc.stats.TotalItems++

	// Add to LRU list
	element := mc.lruList.PushFront(key)
	mc.lruElements[key] = element

	// Trigger callback
	if mc.onSet != nil {
		mc.onSet(key, value, ttl)
	}

	return nil
}

// Get retrieves a value from the cache with revolutionary elegance
func (mc *MemoryCache) Get(key string) (interface{}, bool) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	item, exists := mc.items[key]
	if !exists {
		mc.stats.TotalMisses++
		if mc.onMiss != nil {
			mc.onMiss(key)
		}
		return nil, false
	}

	// Check expiration
	if time.Now().After(item.ExpiresAt) {
		mc.removeItem(key)
		mc.stats.TotalMisses++
		if mc.onMiss != nil {
			mc.onMiss(key)
		}
		return nil, false
	}

	// Update access metadata
	item.AccessedAt = time.Now()
	item.HitCount++
	mc.stats.TotalHits++

	// Move to front of LRU list
	mc.moveToFront(key)

	// Update hit ratio
	mc.stats.HitRatio = float64(mc.stats.TotalHits) / float64(mc.stats.TotalHits+mc.stats.TotalMisses)

	// Trigger callback
	if mc.onHit != nil {
		mc.onHit(key, item.Value)
	}

	return item.Value, true
}

// GetMultiple retrieves multiple values in a single operation for batching efficiency
func (mc *MemoryCache) GetMultiple(keys []string) map[string]interface{} {
	result := make(map[string]interface{})

	for _, key := range keys {
		if value, exists := mc.Get(key); exists {
			result[key] = value
		}
	}

	return result
}

// SetMultiple stores multiple values in a single operation for batching efficiency
func (mc *MemoryCache) SetMultiple(items map[string]interface{}, ttl time.Duration) error {
	for key, value := range items {
		if err := mc.Set(key, value, ttl); err != nil {
			return err
		}
	}
	return nil
}

// Delete removes an item from the cache
func (mc *MemoryCache) Delete(key string) bool {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	if _, exists := mc.items[key]; !exists {
		return false
	}

	mc.removeItem(key)
	return true
}

// Clear removes all items from the cache
func (mc *MemoryCache) Clear() {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	mc.items = make(map[string]*MemoryCacheItem)
	mc.lruList = list.New()
	mc.lruElements = make(map[string]*list.Element)
	mc.currentSize = 0
	mc.stats.TotalItems = 0
}

// Stats returns comprehensive cache statistics
func (mc *MemoryCache) Stats() MemoryCacheStats {
	mc.mu.RLock()
	defer mc.mu.RUnlock()

	stats := mc.stats
	stats.MemoryUsage = mc.currentSize
	stats.Uptime = time.Since(mc.startTime)

	return stats
}

// SetCallbacks configures event callbacks for monitoring
func (mc *MemoryCache) SetCallbacks(
	onEviction func(key string, value interface{}),
	onHit func(key string, value interface{}),
	onMiss func(key string),
	onSet func(key string, value interface{}, ttl time.Duration),
) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	mc.onEviction = onEviction
	mc.onHit = onHit
	mc.onMiss = onMiss
	mc.onSet = onSet
}

// CleanupExpired removes all expired items
func (mc *MemoryCache) CleanupExpired() int {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	now := time.Now()
	expiredKeys := make([]string, 0)

	for key, item := range mc.items {
		if now.After(item.ExpiresAt) {
			expiredKeys = append(expiredKeys, key)
		}
	}

	for _, key := range expiredKeys {
		mc.removeItem(key)
	}

	return len(expiredKeys)
}

// Private methods for internal operations

func (mc *MemoryCache) evictLRU() {
	if mc.lruList.Len() == 0 {
		return
	}

	// Get least recently used item
	lastElement := mc.lruList.Back()
	if lastElement == nil {
		return
	}

	key := lastElement.Value.(string)
	item := mc.items[key]

	// Trigger callback before eviction
	if mc.onEviction != nil && item != nil {
		mc.onEviction(key, item.Value)
	}

	mc.removeItem(key)
	mc.stats.EvictionCount++
}

func (mc *MemoryCache) removeItem(key string) {
	if item, exists := mc.items[key]; exists {
		mc.currentSize -= item.Size
		delete(mc.items, key)
		mc.stats.TotalItems--
	}

	mc.removeLRUElement(key)
}

func (mc *MemoryCache) removeLRUElement(key string) {
	if element, exists := mc.lruElements[key]; exists {
		mc.lruList.Remove(element)
		delete(mc.lruElements, key)
	}
}

func (mc *MemoryCache) moveToFront(key string) {
	if element, exists := mc.lruElements[key]; exists {
		mc.lruList.MoveToFront(element)
	}
}

// StartCleanupWorker starts a background goroutine to clean expired items
func (mc *MemoryCache) StartCleanupWorker(interval time.Duration) chan struct{} {
	stopChan := make(chan struct{})

	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				mc.CleanupExpired()
			case <-stopChan:
				return
			}
		}
	}()

	return stopChan
}

// HealthCheck checks the health of the memory cache
func (mc *MemoryCache) HealthCheck() error {
	mc.mu.RLock()
	defer mc.mu.RUnlock()

	// Check if the cache is responsive
	testKey := "__health_check__"
	testValue := "healthy"

	// Test set operation
	if err := mc.Set(testKey, testValue, time.Minute); err != nil {
		return fmt.Errorf("memory cache set operation failed: %w", err)
	}

	// Test get operation
	if value, exists := mc.Get(testKey); !exists {
		return fmt.Errorf("memory cache get operation failed: key not found")
	} else if value != testValue {
		return fmt.Errorf("memory cache data integrity check failed")
	}

	// Clean up test key
	mc.Delete(testKey)

	return nil
}
