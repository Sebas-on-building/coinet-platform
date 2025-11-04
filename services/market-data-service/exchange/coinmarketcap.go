// ========================================
// REVOLUTIONARY COINMARKETCAP INTEGRATION
// Inspired by Apple's Precision, Canva's Usability, TradingView's Power, Solana's Innovation
// ========================================

package exchange

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// ==========================================
// SUB-FEATURE: Core Configuration Management
// ==========================================

type CoinMarketCapConfig struct {
	APIKey          string
	BaseURL         string
	RateLimitTier   string // "basic", "hobbyist", "startup", "standard", "professional", "enterprise"
	CacheTTL        time.Duration
	RetryAttempts   int
	BackoffStrategy string // "exponential", "linear", "fibonacci"
	EnableMetrics   bool
	EnableTracing   bool
}

func NewCoinMarketCapConfig() *CoinMarketCapConfig {
	return &CoinMarketCapConfig{
		APIKey:          os.Getenv("COINMARKETCAP_API_KEY"),
		BaseURL:         "https://pro-api.coinmarketcap.com/v1",
		RateLimitTier:   getEnvOrDefault("CMC_RATE_LIMIT_TIER", "basic"),
		CacheTTL:        parseDurationOrDefault(os.Getenv("CMC_CACHE_TTL"), 60*time.Second),
		RetryAttempts:   parseIntOrDefault(os.Getenv("CMC_RETRY_ATTEMPTS"), 3),
		BackoffStrategy: getEnvOrDefault("CMC_BACKOFF_STRATEGY", "exponential"),
		EnableMetrics:   parseEnvBool("CMC_ENABLE_METRICS", true),
		EnableTracing:   parseEnvBool("CMC_ENABLE_TRACING", true),
	}
}

// ==========================================
// SUB-FEATURE: Advanced Rate Limiting System
// ==========================================

type RateLimiter struct {
	tokens          chan struct{}
	requestsPerMin  int64
	currentRequests int64
	windowStart     time.Time
	mu              sync.RWMutex
	headerLimits    *RateLimitHeaders
}

type RateLimitHeaders struct {
	Limit     int
	Remaining int
	Reset     time.Time
}

func NewRateLimiter(tier string) *RateLimiter {
	limits := map[string]int{
		"basic":        333,   // 10,000/month
		"hobbyist":     1000,  // 30,000/month
		"startup":      1667,  // 50,000/month
		"standard":     5000,  // 200,000/month
		"professional": 10000, // 1M/month
		"enterprise":   16667, // 5M/month
	}

	requestsPerMin := int64(limits[tier])
	if requestsPerMin == 0 {
		requestsPerMin = 333 // default to basic
	}

	return &RateLimiter{
		tokens:          make(chan struct{}, 10), // burst capacity
		requestsPerMin:  requestsPerMin,
		currentRequests: 0,
		windowStart:     time.Now(),
		headerLimits:    &RateLimitHeaders{},
	}
}

func (rl *RateLimiter) Acquire(ctx context.Context) error {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	if now.Sub(rl.windowStart) >= time.Minute {
		rl.currentRequests = 0
		rl.windowStart = now
	}

	if rl.currentRequests >= rl.requestsPerMin {
		waitTime := time.Minute - now.Sub(rl.windowStart)
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(waitTime):
			rl.currentRequests = 0
			rl.windowStart = time.Now()
		}
	}

	select {
	case rl.tokens <- struct{}{}:
		rl.currentRequests++
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (rl *RateLimiter) Release() {
	select {
	case <-rl.tokens:
	default:
	}
}

// ==========================================
// SUB-FEATURE: Intelligent Caching System
// ==========================================

type CacheEntry struct {
	Data      interface{}
	ExpiresAt time.Time
	HitCount  int64
	LastHit   time.Time
}

type IntelligentCache struct {
	entries    map[string]*CacheEntry
	mu         sync.RWMutex
	ttl        time.Duration
	maxEntries int
	metrics    *CacheMetrics
}

type CacheMetrics struct {
	Hits        int64
	Misses      int64
	Evictions   int64
	TotalReads  int64
	TotalWrites int64
}

func NewIntelligentCache(ttl time.Duration, maxEntries int) *IntelligentCache {
	cache := &IntelligentCache{
		entries:    make(map[string]*CacheEntry),
		ttl:        ttl,
		maxEntries: maxEntries,
		metrics:    &CacheMetrics{},
	}

	// Start cleanup goroutine
	go cache.cleanupExpired()

	return cache
}

func (c *IntelligentCache) Get(key string) (interface{}, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	atomic.AddInt64(&c.metrics.TotalReads, 1)

	entry, exists := c.entries[key]
	if !exists || time.Now().After(entry.ExpiresAt) {
		atomic.AddInt64(&c.metrics.Misses, 1)
		return nil, false
	}

	atomic.AddInt64(&entry.HitCount, 1)
	entry.LastHit = time.Now()
	atomic.AddInt64(&c.metrics.Hits, 1)

	return entry.Data, true
}

func (c *IntelligentCache) Set(key string, value interface{}) {
	c.mu.Lock()
	defer c.mu.Unlock()

	atomic.AddInt64(&c.metrics.TotalWrites, 1)

	// Evict if at capacity
	if len(c.entries) >= c.maxEntries {
		c.evictLRU()
	}

	c.entries[key] = &CacheEntry{
		Data:      value,
		ExpiresAt: time.Now().Add(c.ttl),
		HitCount:  0,
		LastHit:   time.Now(),
	}
}

func (c *IntelligentCache) evictLRU() {
	var oldestKey string
	var oldestTime time.Time

	for key, entry := range c.entries {
		if oldestKey == "" || entry.LastHit.Before(oldestTime) {
			oldestKey = key
			oldestTime = entry.LastHit
		}
	}

	if oldestKey != "" {
		delete(c.entries, oldestKey)
		atomic.AddInt64(&c.metrics.Evictions, 1)
	}
}

func (c *IntelligentCache) cleanupExpired() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		c.mu.Lock()
		now := time.Now()
		for key, entry := range c.entries {
			if now.After(entry.ExpiresAt) {
				delete(c.entries, key)
			}
		}
		c.mu.Unlock()
	}
}

// ==========================================
// SUB-FEATURE: Advanced Backoff Strategies
// ==========================================

type BackoffStrategy interface {
	NextDelay(attempt int) time.Duration
}

type ExponentialBackoff struct {
	baseDelay time.Duration
	maxDelay  time.Duration
	factor    float64
}

func (e *ExponentialBackoff) NextDelay(attempt int) time.Duration {
	delay := float64(e.baseDelay) * (e.factor * float64(attempt))
	if delay > float64(e.maxDelay) {
		delay = float64(e.maxDelay)
	}
	return time.Duration(delay)
}

type LinearBackoff struct {
	baseDelay time.Duration
	increment time.Duration
}

func (l *LinearBackoff) NextDelay(attempt int) time.Duration {
	return l.baseDelay + (l.increment * time.Duration(attempt))
}

type FibonacciBackoff struct {
	baseDelay time.Duration
}

func (f *FibonacciBackoff) NextDelay(attempt int) time.Duration {
	return f.baseDelay * time.Duration(fibonacci(attempt))
}

func fibonacci(n int) int {
	if n <= 1 {
		return n
	}
	return fibonacci(n-1) + fibonacci(n-2)
}

// ==========================================
// SUB-FEATURE: Revolutionary CoinMarketCap Adapter
// ==========================================

type CoinMarketCapAdapter struct {
	config          *CoinMarketCapConfig
	rateLimiter     *RateLimiter
	cache           *IntelligentCache
	httpClient      *http.Client
	backoffStrategy BackoffStrategy
	metrics         *AdapterMetrics
	mu              sync.RWMutex
}

type AdapterMetrics struct {
	TotalRequests      int64
	SuccessfulRequests int64
	FailedRequests     int64
	CacheHits          int64
	CacheMisses        int64
	AverageLatency     int64
	RateLimitHits      int64
}

func NewCoinMarketCapAdapter() *CoinMarketCapAdapter {
	config := NewCoinMarketCapConfig()

	var backoffStrategy BackoffStrategy
	switch config.BackoffStrategy {
	case "linear":
		backoffStrategy = &LinearBackoff{baseDelay: time.Second, increment: time.Second}
	case "fibonacci":
		backoffStrategy = &FibonacciBackoff{baseDelay: time.Second}
	default:
		backoffStrategy = &ExponentialBackoff{baseDelay: time.Second, maxDelay: 30 * time.Second, factor: 2.0}
	}

	return &CoinMarketCapAdapter{
		config:          config,
		rateLimiter:     NewRateLimiter(config.RateLimitTier),
		cache:           NewIntelligentCache(config.CacheTTL, 1000),
		httpClient:      &http.Client{Timeout: 30 * time.Second},
		backoffStrategy: backoffStrategy,
		metrics:         &AdapterMetrics{},
	}
}

// ==========================================
// SUB-FEATURE: Multi-Symbol Listings Fetcher
// ==========================================

type CryptocurrencyListing struct {
	ID                int                    `json:"id"`
	Name              string                 `json:"name"`
	Symbol            string                 `json:"symbol"`
	Slug              string                 `json:"slug"`
	NumMarketPairs    int                    `json:"num_market_pairs"`
	DateAdded         string                 `json:"date_added"`
	Tags              []string               `json:"tags"`
	MaxSupply         *float64               `json:"max_supply"`
	CirculatingSupply float64                `json:"circulating_supply"`
	TotalSupply       float64                `json:"total_supply"`
	Platform          map[string]interface{} `json:"platform"`
	CMCRank           int                    `json:"cmc_rank"`
	LastUpdated       string                 `json:"last_updated"`
	Quote             map[string]Quote       `json:"quote"`
}

type Quote struct {
	Price                 float64 `json:"price"`
	Volume24h             float64 `json:"volume_24h"`
	VolumeChange24h       float64 `json:"volume_change_24h"`
	PercentChange1h       float64 `json:"percent_change_1h"`
	PercentChange24h      float64 `json:"percent_change_24h"`
	PercentChange7d       float64 `json:"percent_change_7d"`
	PercentChange30d      float64 `json:"percent_change_30d"`
	PercentChange60d      float64 `json:"percent_change_60d"`
	PercentChange90d      float64 `json:"percent_change_90d"`
	MarketCap             float64 `json:"market_cap"`
	MarketCapDominance    float64 `json:"market_cap_dominance"`
	FullyDilutedMarketCap float64 `json:"fully_diluted_market_cap"`
	LastUpdated           string  `json:"last_updated"`
}

func (cmc *CoinMarketCapAdapter) FetchCoinMarketCapListings(ctx context.Context, limit int, convert string) ([]CryptocurrencyListing, error) {
	cacheKey := fmt.Sprintf("listings_%d_%s", limit, convert)

	// Try cache first
	if cached, found := cmc.cache.Get(cacheKey); found {
		atomic.AddInt64(&cmc.metrics.CacheHits, 1)
		return cached.([]CryptocurrencyListing), nil
	}
	atomic.AddInt64(&cmc.metrics.CacheMisses, 1)

	// Acquire rate limit
	if err := cmc.rateLimiter.Acquire(ctx); err != nil {
		return nil, fmt.Errorf("rate limit acquire failed: %w", err)
	}
	defer cmc.rateLimiter.Release()

	// Build request with retry logic
	var result []CryptocurrencyListing
	var err error

	for attempt := 0; attempt < cmc.config.RetryAttempts; attempt++ {
		result, err = cmc.performListingsRequest(ctx, limit, convert)
		if err == nil {
			break
		}

		if attempt < cmc.config.RetryAttempts-1 {
			delay := cmc.backoffStrategy.NextDelay(attempt)
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(delay):
				continue
			}
		}
	}

	if err != nil {
		atomic.AddInt64(&cmc.metrics.FailedRequests, 1)
		return nil, err
	}

	atomic.AddInt64(&cmc.metrics.SuccessfulRequests, 1)

	// Cache successful result
	cmc.cache.Set(cacheKey, result)

	return result, nil
}

func (cmc *CoinMarketCapAdapter) performListingsRequest(ctx context.Context, limit int, convert string) ([]CryptocurrencyListing, error) {
	startTime := time.Now()
	defer func() {
		latency := time.Since(startTime).Milliseconds()
		atomic.StoreInt64(&cmc.metrics.AverageLatency, latency)
	}()

	url := fmt.Sprintf("%s/cryptocurrency/listings/latest?limit=%d&convert=%s", cmc.config.BaseURL, limit, convert)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("X-CMC_PRO_API_KEY", cmc.config.APIKey)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Accept-Encoding", "gzip")
	req.Header.Set("User-Agent", "Coinet-MarketData-Service/1.0")

	atomic.AddInt64(&cmc.metrics.TotalRequests, 1)

	resp, err := cmc.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Parse rate limit headers
	cmc.parseRateLimitHeaders(resp)

	if resp.StatusCode == 429 {
		atomic.AddInt64(&cmc.metrics.RateLimitHits, 1)
		return nil, fmt.Errorf("rate limit exceeded")
	}

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("API error: status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var response struct {
		Status struct {
			Timestamp    string `json:"timestamp"`
			ErrorCode    int    `json:"error_code"`
			ErrorMessage string `json:"error_message"`
			Elapsed      int    `json:"elapsed"`
			CreditCount  int    `json:"credit_count"`
		} `json:"status"`
		Data []CryptocurrencyListing `json:"data"`
	}

	if err := json.Unmarshal(body, &response); err != nil {
		return nil, err
	}

	if response.Status.ErrorCode != 0 {
		return nil, fmt.Errorf("API error: %s", response.Status.ErrorMessage)
	}

	return response.Data, nil
}

func (cmc *CoinMarketCapAdapter) parseRateLimitHeaders(resp *http.Response) {
	if limitStr := resp.Header.Get("X-RateLimit-Limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			cmc.rateLimiter.mu.Lock()
			cmc.rateLimiter.headerLimits.Limit = limit
			cmc.rateLimiter.mu.Unlock()
		}
	}

	if remainingStr := resp.Header.Get("X-RateLimit-Remaining"); remainingStr != "" {
		if remaining, err := strconv.Atoi(remainingStr); err == nil {
			cmc.rateLimiter.mu.Lock()
			cmc.rateLimiter.headerLimits.Remaining = remaining
			cmc.rateLimiter.mu.Unlock()
		}
	}
}

// ==========================================
// SUB-FEATURE: Interface Implementation
// ==========================================

func (cmc *CoinMarketCapAdapter) StreamWS(ctx context.Context, symbol string) <-chan Tick {
	// CoinMarketCap doesn't support WebSocket, return periodic REST polling
	ch := make(chan Tick)

	go func() {
		defer close(ch)
		ticker := time.NewTicker(60 * time.Second) // Poll every minute
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if tick, err := cmc.GetTickerREST(symbol); err == nil {
					select {
					case ch <- tick:
					case <-ctx.Done():
						return
					}
				}
			}
		}
	}()

	return ch
}

func (cmc *CoinMarketCapAdapter) GetTickerREST(symbol string) (Tick, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	listings, err := cmc.FetchCoinMarketCapListings(ctx, 100, "USD")
	if err != nil {
		return Tick{}, err
	}

	for _, listing := range listings {
		if strings.EqualFold(listing.Symbol, symbol) {
			if usdQuote, ok := listing.Quote["USD"]; ok {
				timestamp, _ := time.Parse(time.RFC3339, usdQuote.LastUpdated)
				return Tick{
					Symbol:    symbol,
					Timestamp: timestamp,
					Price:     usdQuote.Price,
					Volume:    usdQuote.Volume24h,
				}, nil
			}
		}
	}

	return Tick{}, fmt.Errorf("symbol %s not found", symbol)
}

func (cmc *CoinMarketCapAdapter) HealthCheck() bool {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	url := cmc.config.BaseURL + "/key/info"
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return false
	}

	req.Header.Set("X-CMC_PRO_API_KEY", cmc.config.APIKey)

	resp, err := cmc.httpClient.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == 200
}

// ==========================================
// SUB-FEATURE: Metrics and Observability
// ==========================================

func (cmc *CoinMarketCapAdapter) GetMetrics() *AdapterMetrics {
	return cmc.metrics
}

func (cmc *CoinMarketCapAdapter) GetCacheMetrics() *CacheMetrics {
	return cmc.cache.metrics
}

func (cmc *CoinMarketCapAdapter) LogMetrics() {
	log.Printf("CoinMarketCap Adapter Metrics: Total Requests: %d, Success: %d, Failed: %d, Cache Hit Rate: %.2f%%",
		atomic.LoadInt64(&cmc.metrics.TotalRequests),
		atomic.LoadInt64(&cmc.metrics.SuccessfulRequests),
		atomic.LoadInt64(&cmc.metrics.FailedRequests),
		float64(atomic.LoadInt64(&cmc.metrics.CacheHits))/float64(atomic.LoadInt64(&cmc.metrics.CacheHits)+atomic.LoadInt64(&cmc.metrics.CacheMisses))*100,
	)
}

// ==========================================
// SUB-FEATURE: Utility Functions
// ==========================================

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func parseIntOrDefault(value string, defaultValue int) int {
	if parsed, err := strconv.Atoi(value); err == nil {
		return parsed
	}
	return defaultValue
}

func parseDurationOrDefault(value string, defaultValue time.Duration) time.Duration {
	if parsed, err := time.ParseDuration(value); err == nil {
		return parsed
	}
	return defaultValue
}

func parseEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.ParseBool(value); err == nil {
			return parsed
		}
	}
	return defaultValue
}

// --- END: Modular CoinMarketCap Adapter ---
