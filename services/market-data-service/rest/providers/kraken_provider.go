package providers

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"crypto/sha512"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"market-data-service/rest/static"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

// KrakenProvider implements revolutionary Kraken exchange integration with divine precision
type KrakenProvider struct {
	mu          sync.RWMutex
	apiKey      string
	secretKey   string
	baseURL     string
	httpClient  *http.Client
	rateLimiter *KrakenRateLimiter
	tracer      trace.Tracer
	config      KrakenConfig
	stats       KrakenStats

	// Revolutionary features inspired by Apple & TradingView
	cache          map[string]*KrakenCacheEntry
	retryConfig    KrakenRetryConfig
	tierManager    *KrakenTierManager
	signatureCache map[string]string
	nonce          int64
}

// KrakenConfig defines comprehensive configuration for Kraken provider
type KrakenConfig struct {
	APIKey               string        `json:"api_key"`
	SecretKey            string        `json:"secret_key"`
	BaseURL              string        `json:"base_url"`
	Timeout              time.Duration `json:"timeout"`
	MaxRetries           int           `json:"max_retries"`
	RetryBackoff         time.Duration `json:"retry_backoff"`
	RateLimitRequests    int           `json:"rate_limit_requests"`
	RateLimitWindow      time.Duration `json:"rate_limit_window"`
	CacheEnabled         bool          `json:"cache_enabled"`
	CacheTTL             time.Duration `json:"cache_ttl"`
	Tracing              bool          `json:"tracing"`
	UserAgent            string        `json:"user_agent"`
	TierLevel            int           `json:"tier_level"`
	EnableStreaming      bool          `json:"enable_streaming"`
	AdvancedVerification bool          `json:"advanced_verification"`
}

// KrakenStats provides comprehensive Kraken-specific statistics
type KrakenStats struct {
	TotalRequests       int64                    `json:"total_requests"`
	SuccessfulRequests  int64                    `json:"successful_requests"`
	FailedRequests      int64                    `json:"failed_requests"`
	CacheHits           int64                    `json:"cache_hits"`
	CacheMisses         int64                    `json:"cache_misses"`
	RateLimitHits       int64                    `json:"rate_limit_hits"`
	AvgResponseTime     time.Duration            `json:"avg_response_time"`
	LastRequestAt       time.Time                `json:"last_request_at"`
	TotalDataSize       int64                    `json:"total_data_size"`
	EndpointStats       map[string]EndpointStats `json:"endpoint_stats"`
	TierUsage           TierUsageStats           `json:"tier_usage"`
	AuthenticationStats AuthStats                `json:"authentication_stats"`
}

// TierUsageStats tracks Kraken API tier usage
type TierUsageStats struct {
	CurrentTier        int           `json:"current_tier"`
	TierLimitRemaining int           `json:"tier_limit_remaining"`
	TierResetTime      time.Time     `json:"tier_reset_time"`
	CallsByTier        map[int]int64 `json:"calls_by_tier"`
}

// KrakenCacheEntry represents cached data with Kraken-specific metadata
type KrakenCacheEntry struct {
	Data         interface{} `json:"data"`
	ExpiresAt    time.Time   `json:"expires_at"`
	Size         int64       `json:"size"`
	Endpoint     string      `json:"endpoint"`
	LastAccessed time.Time   `json:"last_accessed"`
	AccessCount  int64       `json:"access_count"`
	TierCost     int         `json:"tier_cost"`
}

// KrakenRetryConfig defines retry behavior
type KrakenRetryConfig struct {
	MaxRetries    int           `json:"max_retries"`
	BaseBackoff   time.Duration `json:"base_backoff"`
	MaxBackoff    time.Duration `json:"max_backoff"`
	BackoffFactor float64       `json:"backoff_factor"`
	Jitter        bool          `json:"jitter"`
	RetryOn       []int         `json:"retry_on"`
}

// KrakenRateLimiter manages Kraken's tier-based rate limiting
type KrakenRateLimiter struct {
	mu          sync.Mutex
	requests    []KrakenRequest
	maxRequests int
	window      time.Duration
	tierLimits  map[int]int
	currentTier int
}

// KrakenRequest tracks API requests with tier information
type KrakenRequest struct {
	Timestamp time.Time
	Endpoint  string
	TierCost  int
}

// KrakenTierManager manages API tier progression
type KrakenTierManager struct {
	mu          sync.RWMutex
	currentTier int
	limits      map[int]TierLimit
	usage       TierUsageStats
}

// TierLimit defines limits for each Kraken API tier
type TierLimit struct {
	CallsPerMinute int
	CallsPerDay    int
	Description    string
}

// Kraken API response structures with revolutionary precision

// KrakenResponse represents the standard Kraken API response
type KrakenResponse struct {
	Error  []string    `json:"error"`
	Result interface{} `json:"result"`
}

// KrakenAssetPair represents Kraken trading pair information
type KrakenAssetPair struct {
	AltName           string     `json:"altname"`
	WSName            string     `json:"wsname"`
	AClassBase        string     `json:"aclass_base"`
	Base              string     `json:"base"`
	AClassQuote       string     `json:"aclass_quote"`
	Quote             string     `json:"quote"`
	Lot               string     `json:"lot"`
	PairDecimals      int        `json:"pair_decimals"`
	LotDecimals       int        `json:"lot_decimals"`
	LotMultiplier     int        `json:"lot_multiplier"`
	LeverageBuy       []int      `json:"leverage_buy"`
	LeverageSell      []int      `json:"leverage_sell"`
	Fees              [][]string `json:"fees"`
	FeesMaker         [][]string `json:"fees_maker"`
	FeeVolumeCurrency string     `json:"fee_volume_currency"`
	MarginCall        int        `json:"margin_call"`
	MarginStop        int        `json:"margin_stop"`
	OrderMin          string     `json:"ordermin"`
}

// KrakenTicker represents 24hr ticker statistics
type KrakenTicker struct {
	Ask                 []string `json:"a"` // ask [price, whole lot volume, lot volume]
	Bid                 []string `json:"b"` // bid [price, whole lot volume, lot volume]
	LastTradeClosed     []string `json:"c"` // last trade closed [price, lot volume]
	Volume              []string `json:"v"` // volume [today, last 24 hours]
	VolumeWeightedPrice []string `json:"p"` // volume weighted average price [today, last 24 hours]
	NumberOfTrades      []int    `json:"t"` // number of trades [today, last 24 hours]
	Low                 []string `json:"l"` // low [today, last 24 hours]
	High                []string `json:"h"` // high [today, last 24 hours]
	TodayOpeningPrice   string   `json:"o"` // today's opening price
}

// KrakenOHLCData represents historical OHLC data
type KrakenOHLCData struct {
	Time   int64  `json:"time"`
	Open   string `json:"open"`
	High   string `json:"high"`
	Low    string `json:"low"`
	Close  string `json:"close"`
	VWAP   string `json:"vwap"`
	Volume string `json:"volume"`
	Count  int    `json:"count"`
}

// NewKrakenProvider creates a revolutionary Kraken provider instance
func NewKrakenProvider(config KrakenConfig) *KrakenProvider {
	kp := &KrakenProvider{
		apiKey:    config.APIKey,
		secretKey: config.SecretKey,
		baseURL:   config.BaseURL,
		httpClient: &http.Client{
			Timeout: config.Timeout,
		},
		config:         config,
		cache:          make(map[string]*KrakenCacheEntry),
		signatureCache: make(map[string]string),
		nonce:          time.Now().UnixNano(),
		stats: KrakenStats{
			EndpointStats: make(map[string]EndpointStats),
			TierUsage: TierUsageStats{
				CurrentTier: config.TierLevel,
				CallsByTier: make(map[int]int64),
			},
		},
	}

	// Initialize tracer
	if config.Tracing {
		kp.tracer = otel.Tracer("kraken-provider")
	}

	// Initialize rate limiter with tier support
	kp.rateLimiter = NewKrakenRateLimiter(
		config.RateLimitRequests,
		config.RateLimitWindow,
		config.TierLevel,
	)

	// Initialize tier manager
	kp.tierManager = NewKrakenTierManager(config.TierLevel)

	// Initialize retry configuration
	kp.retryConfig = KrakenRetryConfig{
		MaxRetries:    config.MaxRetries,
		BaseBackoff:   config.RetryBackoff,
		MaxBackoff:    30 * time.Second,
		BackoffFactor: 2.0,
		Jitter:        true,
		RetryOn:       []int{429, 502, 503, 504, 520, 521, 522, 524},
	}

	return kp
}

// GetAssetListings retrieves cryptocurrency asset listings from Kraken
func (kp *KrakenProvider) GetAssetListings(ctx context.Context, limit int, start int) ([]*static.AssetListing, error) {
	startTime := time.Now()

	// Create tracing span
	if kp.tracer != nil {
		var span trace.Span
		ctx, span = kp.tracer.Start(ctx, "kraken.get_asset_listings", trace.WithAttributes(
			attribute.Int("limit", limit),
			attribute.Int("start", start),
		))
		defer span.End()
	}

	// Check cache first
	cacheKey := fmt.Sprintf("asset_listings_%d_%d", limit, start)
	if cached := kp.getFromCache(cacheKey); cached != nil {
		kp.recordCacheHit("asset_listings")
		if listings, ok := cached.([]*static.AssetListing); ok {
			return listings, nil
		}
	}

	kp.recordCacheMiss("asset_listings")

	// Get asset pairs from Kraken
	assetPairs, err := kp.getAssetPairs(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get asset pairs: %w", err)
	}

	// Transform to standard format
	listings := kp.transformAssetListings(assetPairs, limit, start)

	// Cache the result
	kp.setCache(cacheKey, listings, "asset_listings")

	kp.recordSuccess("asset_listings", time.Since(startTime))
	return listings, nil
}

// GetTokenMetadata retrieves metadata for specific tokens
func (kp *KrakenProvider) GetTokenMetadata(ctx context.Context, symbols []string) (map[string]*static.AssetListing, error) {
	// Kraken doesn't provide detailed token metadata via public API
	return nil, fmt.Errorf("token metadata not supported by Kraken public API")
}

// GetExchangeInfo retrieves Kraken exchange information
func (kp *KrakenProvider) GetExchangeInfo(ctx context.Context, exchangeID string) (*static.StaticExchangeInfo, error) {
	startTime := time.Now()

	// Check cache first
	cacheKey := fmt.Sprintf("exchange_info_%s", exchangeID)
	if cached := kp.getFromCache(cacheKey); cached != nil {
		kp.recordCacheHit("exchange_info")
		if exchangeInfo, ok := cached.(*static.StaticExchangeInfo); ok {
			return exchangeInfo, nil
		}
	}

	kp.recordCacheMiss("exchange_info")

	// Get server time and system status
	systemStatus, err := kp.getSystemStatus(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get system status: %w", err)
	}

	// Transform to standard format
	exchangeInfo := kp.transformExchangeInfo(systemStatus)

	// Cache the result
	kp.setCache(cacheKey, exchangeInfo, "exchange_info")

	kp.recordSuccess("exchange_info", time.Since(startTime))
	return exchangeInfo, nil
}

// GetTradingPairs retrieves trading pairs from Kraken
func (kp *KrakenProvider) GetTradingPairs(ctx context.Context, exchangeID string) ([]*static.TradingPair, error) {
	startTime := time.Now()

	// Check cache first
	cacheKey := fmt.Sprintf("trading_pairs_%s", exchangeID)
	if cached := kp.getFromCache(cacheKey); cached != nil {
		kp.recordCacheHit("trading_pairs")
		if tradingPairs, ok := cached.([]*static.TradingPair); ok {
			return tradingPairs, nil
		}
	}

	kp.recordCacheMiss("trading_pairs")

	// Get ticker information
	tickers, err := kp.getTickers(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get tickers: %w", err)
	}

	// Transform to standard format
	tradingPairs := kp.transformTradingPairs(tickers)

	// Cache the result
	kp.setCache(cacheKey, tradingPairs, "trading_pairs")

	kp.recordSuccess("trading_pairs", time.Since(startTime))
	return tradingPairs, nil
}

// GetHistoricalOHLC retrieves historical OHLC data from Kraken
func (kp *KrakenProvider) GetHistoricalOHLC(ctx context.Context, symbol string, timeframe string, start, end time.Time) ([]*static.StaticHistoricalOHLC, error) {
	startTime := time.Now()

	// Check cache first
	cacheKey := fmt.Sprintf("historical_ohlc_%s_%s_%d_%d", symbol, timeframe, start.Unix(), end.Unix())
	if cached := kp.getFromCache(cacheKey); cached != nil {
		kp.recordCacheHit("historical_ohlc")
		if ohlcData, ok := cached.([]*static.StaticHistoricalOHLC); ok {
			return ohlcData, nil
		}
	}

	kp.recordCacheMiss("historical_ohlc")

	// Get OHLC data
	ohlcData, err := kp.getOHLC(ctx, symbol, timeframe, start)
	if err != nil {
		return nil, fmt.Errorf("failed to get OHLC data: %w", err)
	}

	// Transform to standard format
	historicalData := kp.transformHistoricalOHLC(symbol, ohlcData)

	// Cache the result
	kp.setCache(cacheKey, historicalData, "historical_ohlc")

	kp.recordSuccess("historical_ohlc", time.Since(startTime))
	return historicalData, nil
}

// GetGlobalMetrics retrieves global market metrics (not supported by Kraken)
func (kp *KrakenProvider) GetGlobalMetrics(ctx context.Context) (*static.StaticGlobalMetrics, error) {
	return nil, fmt.Errorf("global metrics not supported by Kraken provider")
}

// SupportsDataType checks if the provider supports a specific data type
func (kp *KrakenProvider) SupportsDataType(dataType static.StaticDataType) bool {
	supportedTypes := map[static.StaticDataType]bool{
		static.AssetListings:    true,
		static.TokenMetadata:    false, // Limited public API
		static.ExchangeInfo:     true,
		static.TradingPairs:     true,
		static.HistoricalOHLC:   true,
		static.GlobalMetrics:    false, // Not provided
		static.MarketCategories: false, // Not provided
		static.NewsMetadata:     false, // Not provided
		static.SocialMetrics:    false, // Not provided
	}

	return supportedTypes[dataType]
}

// GetRateLimit returns current rate limit configuration
func (kp *KrakenProvider) GetRateLimit() (requests int, window time.Duration) {
	return kp.config.RateLimitRequests, kp.config.RateLimitWindow
}

// HealthCheck performs a comprehensive health check
func (kp *KrakenProvider) HealthCheck(ctx context.Context) error {
	// Test server time endpoint (lowest cost)
	_, err := kp.getServerTime(ctx)
	return err
}

// Stats returns comprehensive provider statistics
func (kp *KrakenProvider) Stats() KrakenStats {
	kp.mu.RLock()
	defer kp.mu.RUnlock()

	stats := kp.stats
	stats.TierUsage = kp.tierManager.GetUsage()

	return stats
}

// Helper methods and constructors

// NewKrakenRateLimiter creates a new Kraken rate limiter with tier support
func NewKrakenRateLimiter(maxRequests int, window time.Duration, tier int) *KrakenRateLimiter {
	tierLimits := map[int]int{
		1: 15,  // Starter tier
		2: 20,  // Intermediate tier
		3: 50,  // Pro tier
		4: 100, // Pro+ tier
	}

	return &KrakenRateLimiter{
		maxRequests: maxRequests,
		window:      window,
		tierLimits:  tierLimits,
		currentTier: tier,
		requests:    make([]KrakenRequest, 0),
	}
}

// NewKrakenTierManager creates a new tier manager
func NewKrakenTierManager(initialTier int) *KrakenTierManager {
	limits := map[int]TierLimit{
		1: {CallsPerMinute: 15, CallsPerDay: 15000, Description: "Starter"},
		2: {CallsPerMinute: 20, CallsPerDay: 20000, Description: "Intermediate"},
		3: {CallsPerMinute: 50, CallsPerDay: 50000, Description: "Pro"},
		4: {CallsPerMinute: 100, CallsPerDay: 100000, Description: "Pro+"},
	}

	return &KrakenTierManager{
		currentTier: initialTier,
		limits:      limits,
		usage: TierUsageStats{
			CurrentTier: initialTier,
			CallsByTier: make(map[int]int64),
		},
	}
}

// Cache management methods

func (kp *KrakenProvider) getFromCache(key string) interface{} {
	kp.mu.RLock()
	defer kp.mu.RUnlock()

	entry, exists := kp.cache[key]
	if !exists {
		return nil
	}

	if time.Now().After(entry.ExpiresAt) {
		delete(kp.cache, key)
		return nil
	}

	entry.LastAccessed = time.Now()
	entry.AccessCount++

	return entry.Data
}

func (kp *KrakenProvider) setCache(key string, data interface{}, endpoint string) {
	kp.mu.Lock()
	defer kp.mu.Unlock()

	entry := &KrakenCacheEntry{
		Data:         data,
		ExpiresAt:    time.Now().Add(kp.config.CacheTTL),
		Size:         int64(len(fmt.Sprintf("%v", data))),
		Endpoint:     endpoint,
		LastAccessed: time.Now(),
		AccessCount:  1,
		TierCost:     kp.getTierCost(endpoint),
	}

	kp.cache[key] = entry
}

func (kp *KrakenProvider) recordCacheHit(endpoint string) {
	kp.mu.Lock()
	defer kp.mu.Unlock()

	kp.stats.CacheHits++
	if stats, exists := kp.stats.EndpointStats[endpoint]; exists {
		stats.RequestCount++
		kp.stats.EndpointStats[endpoint] = stats
	}
}

func (kp *KrakenProvider) recordCacheMiss(endpoint string) {
	kp.mu.Lock()
	defer kp.mu.Unlock()

	kp.stats.CacheMisses++
}

func (kp *KrakenProvider) recordSuccess(endpoint string, duration time.Duration) {
	kp.mu.Lock()
	defer kp.mu.Unlock()

	kp.stats.TotalRequests++
	kp.stats.SuccessfulRequests++
	kp.stats.LastRequestAt = time.Now()

	if kp.stats.AvgResponseTime == 0 {
		kp.stats.AvgResponseTime = duration
	} else {
		kp.stats.AvgResponseTime = (kp.stats.AvgResponseTime + duration) / 2
	}
}

// API communication methods

func (kp *KrakenProvider) getAssetPairs(ctx context.Context) (map[string]KrakenAssetPair, error) {
	endpoint := "/AssetPairs"

	if err := kp.rateLimiter.Wait(ctx, endpoint); err != nil {
		return nil, fmt.Errorf("rate limit error: %w", err)
	}

	url := kp.baseURL + endpoint
	resp, err := kp.makeRequest(ctx, "GET", url, nil, false)
	if err != nil {
		return nil, fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	var krakenResp KrakenResponse
	if err := json.NewDecoder(resp.Body).Decode(&krakenResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if len(krakenResp.Error) > 0 {
		return nil, fmt.Errorf("Kraken API error: %v", krakenResp.Error)
	}

	assetPairs := make(map[string]KrakenAssetPair)
	if result, ok := krakenResp.Result.(map[string]interface{}); ok {
		for key, value := range result {
			if pairData, err := json.Marshal(value); err == nil {
				var pair KrakenAssetPair
				if json.Unmarshal(pairData, &pair) == nil {
					assetPairs[key] = pair
				}
			}
		}
	}

	return assetPairs, nil
}

func (kp *KrakenProvider) getTickers(ctx context.Context) (map[string]KrakenTicker, error) {
	endpoint := "/Ticker"

	if err := kp.rateLimiter.Wait(ctx, endpoint); err != nil {
		return nil, fmt.Errorf("rate limit error: %w", err)
	}

	url := kp.baseURL + endpoint
	resp, err := kp.makeRequest(ctx, "GET", url, nil, false)
	if err != nil {
		return nil, fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	var krakenResp KrakenResponse
	if err := json.NewDecoder(resp.Body).Decode(&krakenResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if len(krakenResp.Error) > 0 {
		return nil, fmt.Errorf("Kraken API error: %v", krakenResp.Error)
	}

	tickers := make(map[string]KrakenTicker)
	if result, ok := krakenResp.Result.(map[string]interface{}); ok {
		for key, value := range result {
			if tickerData, err := json.Marshal(value); err == nil {
				var ticker KrakenTicker
				if json.Unmarshal(tickerData, &ticker) == nil {
					tickers[key] = ticker
				}
			}
		}
	}

	return tickers, nil
}

func (kp *KrakenProvider) getSystemStatus(ctx context.Context) (map[string]interface{}, error) {
	endpoint := "/SystemStatus"

	if err := kp.rateLimiter.Wait(ctx, endpoint); err != nil {
		return nil, fmt.Errorf("rate limit error: %w", err)
	}

	url := kp.baseURL + endpoint
	resp, err := kp.makeRequest(ctx, "GET", url, nil, false)
	if err != nil {
		return nil, fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	var krakenResp KrakenResponse
	if err := json.NewDecoder(resp.Body).Decode(&krakenResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if len(krakenResp.Error) > 0 {
		return nil, fmt.Errorf("Kraken API error: %v", krakenResp.Error)
	}

	if result, ok := krakenResp.Result.(map[string]interface{}); ok {
		return result, nil
	}

	return nil, fmt.Errorf("invalid system status response")
}

func (kp *KrakenProvider) getServerTime(ctx context.Context) (int64, error) {
	endpoint := "/Time"

	if err := kp.rateLimiter.Wait(ctx, endpoint); err != nil {
		return 0, fmt.Errorf("rate limit error: %w", err)
	}

	url := kp.baseURL + endpoint
	resp, err := kp.makeRequest(ctx, "GET", url, nil, false)
	if err != nil {
		return 0, fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	var krakenResp KrakenResponse
	if err := json.NewDecoder(resp.Body).Decode(&krakenResp); err != nil {
		return 0, fmt.Errorf("failed to decode response: %w", err)
	}

	if len(krakenResp.Error) > 0 {
		return 0, fmt.Errorf("Kraken API error: %v", krakenResp.Error)
	}

	if result, ok := krakenResp.Result.(map[string]interface{}); ok {
		if unixtime, exists := result["unixtime"]; exists {
			if timestamp, ok := unixtime.(float64); ok {
				return int64(timestamp), nil
			}
		}
	}

	return 0, fmt.Errorf("invalid time response")
}

func (kp *KrakenProvider) getOHLC(ctx context.Context, symbol, interval string, since time.Time) ([]KrakenOHLCData, error) {
	endpoint := "/OHLC"

	if err := kp.rateLimiter.Wait(ctx, endpoint); err != nil {
		return nil, fmt.Errorf("rate limit error: %w", err)
	}

	params := url.Values{}
	params.Add("pair", symbol)
	params.Add("interval", kp.convertTimeframe(interval))
	if !since.IsZero() {
		params.Add("since", strconv.FormatInt(since.Unix(), 10))
	}

	url := kp.baseURL + endpoint + "?" + params.Encode()
	resp, err := kp.makeRequest(ctx, "GET", url, nil, false)
	if err != nil {
		return nil, fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	var krakenResp KrakenResponse
	if err := json.NewDecoder(resp.Body).Decode(&krakenResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if len(krakenResp.Error) > 0 {
		return nil, fmt.Errorf("Kraken API error: %v", krakenResp.Error)
	}

	var ohlcData []KrakenOHLCData
	if result, ok := krakenResp.Result.(map[string]interface{}); ok {
		for key, value := range result {
			if key == "last" {
				continue // Skip the 'last' field
			}
			if dataArray, ok := value.([]interface{}); ok {
				for _, item := range dataArray {
					if itemArray, ok := item.([]interface{}); ok && len(itemArray) >= 8 {
						timestamp, _ := itemArray[0].(float64)
						open, _ := itemArray[1].(string)
						high, _ := itemArray[2].(string)
						low, _ := itemArray[3].(string)
						close, _ := itemArray[4].(string)
						vwap, _ := itemArray[5].(string)
						volume, _ := itemArray[6].(string)
						count, _ := itemArray[7].(float64)

						ohlc := KrakenOHLCData{
							Time:   int64(timestamp),
							Open:   open,
							High:   high,
							Low:    low,
							Close:  close,
							VWAP:   vwap,
							Volume: volume,
							Count:  int(count),
						}
						ohlcData = append(ohlcData, ohlc)
					}
				}
			}
		}
	}

	return ohlcData, nil
}

// HTTP request methods with retry logic

func (kp *KrakenProvider) makeRequest(ctx context.Context, method, url string, params url.Values, signed bool) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, method, url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Add headers
	req.Header.Set("User-Agent", kp.config.UserAgent)
	if kp.apiKey != "" {
		req.Header.Set("API-Key", kp.apiKey)
	}

	if signed && params != nil {
		// Add signature for private endpoints
		signature := kp.generateSignature(url, params.Encode())
		req.Header.Set("API-Sign", signature)
	}

	// Execute request with retry logic
	return kp.executeWithRetry(req)
}

func (kp *KrakenProvider) generateSignature(endpoint string, postData string) string {
	if kp.secretKey == "" {
		return ""
	}

	kp.mu.Lock()
	kp.nonce++
	nonce := kp.nonce
	kp.mu.Unlock()

	nonceStr := strconv.FormatInt(nonce, 10)
	message := nonceStr + postData
	sha256Hash := sha256.Sum256([]byte(message))

	// Decode secret key
	secretKeyBytes, err := base64.StdEncoding.DecodeString(kp.secretKey)
	if err != nil {
		return ""
	}

	// Create HMAC-SHA512
	h := hmac.New(sha512.New, secretKeyBytes)
	h.Write([]byte(endpoint))
	h.Write(sha256Hash[:])

	return base64.StdEncoding.EncodeToString(h.Sum(nil))
}

func (kp *KrakenProvider) executeWithRetry(req *http.Request) (*http.Response, error) {
	var lastErr error

	for attempt := 0; attempt <= kp.retryConfig.MaxRetries; attempt++ {
		resp, err := kp.httpClient.Do(req)
		if err != nil {
			lastErr = err
			if attempt < kp.retryConfig.MaxRetries {
				backoff := kp.calculateBackoff(attempt)
				time.Sleep(backoff)
				continue
			}
			break
		}

		if kp.shouldRetry(resp.StatusCode) && attempt < kp.retryConfig.MaxRetries {
			resp.Body.Close()
			backoff := kp.calculateBackoff(attempt)
			time.Sleep(backoff)
			continue
		}

		return resp, nil
	}

	return nil, fmt.Errorf("request failed after %d attempts: %w", kp.retryConfig.MaxRetries+1, lastErr)
}

func (kp *KrakenProvider) calculateBackoff(attempt int) time.Duration {
	backoff := time.Duration(float64(kp.retryConfig.BaseBackoff) *
		math.Pow(kp.retryConfig.BackoffFactor, float64(attempt)))

	if backoff > kp.retryConfig.MaxBackoff {
		backoff = kp.retryConfig.MaxBackoff
	}

	if kp.retryConfig.Jitter {
		jitter := time.Duration(rand.Float64() * float64(backoff) * 0.1)
		backoff += jitter
	}

	return backoff
}

func (kp *KrakenProvider) shouldRetry(statusCode int) bool {
	for _, code := range kp.retryConfig.RetryOn {
		if statusCode == code {
			return true
		}
	}
	return false
}

// Utility methods

func (kp *KrakenProvider) convertTimeframe(timeframe string) string {
	timeframeMap := map[string]string{
		"1m":  "1",
		"5m":  "5",
		"15m": "15",
		"30m": "30",
		"1h":  "60",
		"4h":  "240",
		"1d":  "1440",
		"1w":  "10080",
		"2w":  "21600",
	}

	if krakenTimeframe, exists := timeframeMap[timeframe]; exists {
		return krakenTimeframe
	}

	return "60" // Default to 1 hour
}

func (kp *KrakenProvider) getTierCost(endpoint string) int {
	tierCosts := map[string]int{
		"asset_listings":  1,
		"exchange_info":   1,
		"trading_pairs":   1,
		"historical_ohlc": 1,
		"/AssetPairs":     1,
		"/Ticker":         1,
		"/SystemStatus":   1,
		"/Time":           1,
		"/OHLC":           1,
	}

	if cost, exists := tierCosts[endpoint]; exists {
		return cost
	}
	return 1 // Default cost
}

// Data transformation methods

func (kp *KrakenProvider) transformAssetListings(assetPairs map[string]KrakenAssetPair, limit, start int) []*static.AssetListing {
	var listings []*static.AssetListing
	count := 0

	for pairName, pair := range assetPairs {
		if count < start {
			count++
			continue
		}
		if len(listings) >= limit {
			break
		}

		listing := &static.AssetListing{
			ID:          fmt.Sprintf("kraken-%s", pair.Base),
			Symbol:      pair.Base,
			Name:        pair.Base,
			Slug:        strings.ToLower(pair.Base),
			Category:    "cryptocurrency",
			Description: fmt.Sprintf("%s trading pair on Kraken", pairName),
			Logo:        "",
			Website:     fmt.Sprintf("https://www.kraken.com/prices/%s", strings.ToLower(pair.Base)),
			Platform: map[string]string{
				"id":   "kraken",
				"name": "Kraken",
			},
			DateAdded: time.Now(),
			Tags:      []string{"kraken", "exchange"},
			IsActive:  true,
		}

		listings = append(listings, listing)
		count++
	}

	return listings
}

func (kp *KrakenProvider) transformExchangeInfo(systemStatus map[string]interface{}) *static.StaticExchangeInfo {
	status := "online"
	if statusStr, ok := systemStatus["status"].(string); ok {
		status = statusStr
	}

	return &static.StaticExchangeInfo{
		ID:                       "kraken",
		Name:                     "Kraken",
		YearEstablished:          2011,
		Country:                  "United States",
		Description:              "Kraken is a US-based cryptocurrency exchange that provides crypto-to-fiat trading and is regulated in multiple jurisdictions.",
		URL:                      "https://www.kraken.com",
		Image:                    "https://assets.coingecko.com/markets/images/29/small/kraken.jpg",
		HasTradingIncentive:      false,
		TrustScore:               9,
		TrustScoreRank:           3,
		TradeVolume24h:           0, // Would need additional API call
		TradeVolume24hNormalized: 0,
		Tickers:                  []static.TradingPair{},
		StatusUpdates:            []interface{}{status},
		Centralized:              true,
		PublicNotice:             "",
		AlertNotice:              "",
	}
}

func (kp *KrakenProvider) transformTradingPairs(tickers map[string]KrakenTicker) []*static.TradingPair {
	var tradingPairs []*static.TradingPair

	for pairName, ticker := range tickers {
		// Parse values
		var lastPrice, volume, bidPrice, askPrice float64

		if len(ticker.LastTradeClosed) >= 1 {
			lastPrice, _ = strconv.ParseFloat(ticker.LastTradeClosed[0], 64)
		}
		if len(ticker.Volume) >= 2 {
			volume, _ = strconv.ParseFloat(ticker.Volume[1], 64)
		}
		if len(ticker.Bid) >= 1 {
			bidPrice, _ = strconv.ParseFloat(ticker.Bid[0], 64)
		}
		if len(ticker.Ask) >= 1 {
			askPrice, _ = strconv.ParseFloat(ticker.Ask[0], 64)
		}

		// Calculate spread
		var spread float64
		if bidPrice > 0 && askPrice > 0 {
			spread = ((askPrice - bidPrice) / bidPrice) * 100
		}

		// Extract base and target from pair name
		base, target := kp.parsePairName(pairName)

		pair := &static.TradingPair{
			Base:   base,
			Target: target,
			Market: "kraken",
			Last:   lastPrice,
			Volume: volume,
			ConvertedLast: map[string]float64{
				"usd": lastPrice,
			},
			ConvertedVolume: map[string]float64{
				"usd": volume,
			},
			TrustScore:             "green",
			BidAskSpreadPercentage: spread,
			Timestamp:              time.Now(),
			LastTradedAt:           time.Now(),
			LastFetchAt:            time.Now(),
			IsAnomaly:              false,
			IsStale:                false,
		}

		tradingPairs = append(tradingPairs, pair)
	}

	return tradingPairs
}

func (kp *KrakenProvider) transformHistoricalOHLC(symbol string, ohlcData []KrakenOHLCData) []*static.StaticHistoricalOHLC {
	var historicalData []*static.StaticHistoricalOHLC

	for _, ohlc := range ohlcData {
		open, _ := strconv.ParseFloat(ohlc.Open, 64)
		high, _ := strconv.ParseFloat(ohlc.High, 64)
		low, _ := strconv.ParseFloat(ohlc.Low, 64)
		close, _ := strconv.ParseFloat(ohlc.Close, 64)
		volume, _ := strconv.ParseFloat(ohlc.Volume, 64)

		historical := &static.StaticHistoricalOHLC{
			Symbol:    symbol,
			Timestamp: time.Unix(ohlc.Time, 0),
			Open:      open,
			High:      high,
			Low:       low,
			Close:     close,
			Volume:    volume,
			MarketCap: 0, // Not provided by Kraken
		}

		historicalData = append(historicalData, historical)
	}

	return historicalData
}

func (kp *KrakenProvider) parsePairName(pairName string) (string, string) {
	// Common Kraken quote currencies
	quotes := []string{"USD", "EUR", "GBP", "CAD", "JPY", "AUD", "CHF", "XBT", "ETH"}

	for _, quote := range quotes {
		if strings.HasSuffix(pairName, quote) {
			base := strings.TrimSuffix(pairName, quote)
			if len(base) > 0 {
				return base, quote
			}
		}
	}

	// Fallback - assume last 3 characters are quote
	if len(pairName) > 6 {
		return pairName[:len(pairName)-3], pairName[len(pairName)-3:]
	}

	return pairName, "USD"
}

// Rate limiter methods

func (krl *KrakenRateLimiter) Wait(ctx context.Context, endpoint string) error {
	krl.mu.Lock()
	defer krl.mu.Unlock()

	now := time.Now()
	krl.cleanupOldRequests(now)

	tierCost := 1 // Default cost
	tierLimit := krl.tierLimits[krl.currentTier]

	if len(krl.requests) >= tierLimit {
		waitTime := krl.window - now.Sub(krl.requests[0].Timestamp)
		if waitTime > 0 {
			krl.mu.Unlock()
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(waitTime):
			}
			krl.mu.Lock()
		}
	}

	krl.requests = append(krl.requests, KrakenRequest{
		Timestamp: now,
		Endpoint:  endpoint,
		TierCost:  tierCost,
	})

	return nil
}

func (krl *KrakenRateLimiter) cleanupOldRequests(now time.Time) {
	cutoff := now.Add(-krl.window)
	i := 0
	for _, req := range krl.requests {
		if req.Timestamp.After(cutoff) {
			krl.requests[i] = req
			i++
		}
	}
	krl.requests = krl.requests[:i]
}

func (ktm *KrakenTierManager) GetUsage() TierUsageStats {
	ktm.mu.RLock()
	defer ktm.mu.RUnlock()
	return ktm.usage
}
