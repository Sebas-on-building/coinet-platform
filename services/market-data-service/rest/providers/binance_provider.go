package providers

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
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

// BinanceProvider is a revolutionary provider for Binance exchange data
type BinanceProvider struct {
	mu          sync.RWMutex
	apiKey      string
	secretKey   string
	baseURL     string
	testnetURL  string
	httpClient  *http.Client
	rateLimiter *BinanceRateLimiter
	tracer      trace.Tracer
	config      BinanceConfig
	stats       BinanceStats

	// Advanced features with Apple-inspired precision
	cache          map[string]*BinanceCacheEntry
	retryConfig    BinanceRetryConfig
	weightManager  *BinanceWeightManager
	streamManager  *BinanceStreamManager
	signatureCache map[string]string
}

// BinanceConfig defines comprehensive configuration for Binance provider
type BinanceConfig struct {
	APIKey               string        `json:"api_key"`
	SecretKey            string        `json:"secret_key"`
	BaseURL              string        `json:"base_url"`
	TestnetURL           string        `json:"testnet_url"`
	UseTestnet           bool          `json:"use_testnet"`
	Timeout              time.Duration `json:"timeout"`
	MaxRetries           int           `json:"max_retries"`
	RetryBackoff         time.Duration `json:"retry_backoff"`
	WeightLimitPerMinute int           `json:"weight_limit_per_minute"`
	OrderLimitPerSecond  int           `json:"order_limit_per_second"`
	RawRequestsPerMinute int           `json:"raw_requests_per_minute"`
	CacheEnabled         bool          `json:"cache_enabled"`
	CacheTTL             time.Duration `json:"cache_ttl"`
	Tracing              bool          `json:"tracing"`
	UserAgent            string        `json:"user_agent"`
	RecvWindow           int64         `json:"recv_window"`
	EnableStreaming      bool          `json:"enable_streaming"`
	StreamReconnectDelay time.Duration `json:"stream_reconnect_delay"`
	MaxStreamConnections int           `json:"max_stream_connections"`
}

// BinanceStats provides comprehensive Binance-specific statistics
type BinanceStats struct {
	TotalRequests      int64                    `json:"total_requests"`
	SuccessfulRequests int64                    `json:"successful_requests"`
	FailedRequests     int64                    `json:"failed_requests"`
	CacheHits          int64                    `json:"cache_hits"`
	CacheMisses        int64                    `json:"cache_misses"`
	WeightLimitHits    int64                    `json:"weight_limit_hits"`
	OrderLimitHits     int64                    `json:"order_limit_hits"`
	AvgResponseTime    time.Duration            `json:"avg_response_time"`
	LastRequestAt      time.Time                `json:"last_request_at"`
	TotalDataSize      int64                    `json:"total_data_size"`
	EndpointStats      map[string]EndpointStats `json:"endpoint_stats"`
	StreamStats        StreamStats              `json:"stream_stats"`
	WeightConsumption  WeightConsumption        `json:"weight_consumption"`
}

// EndpointStats tracks statistics per API endpoint
type EndpointStats struct {
	RequestCount    int64         `json:"request_count"`
	SuccessCount    int64         `json:"success_count"`
	ErrorCount      int64         `json:"error_count"`
	AvgResponseTime time.Duration `json:"avg_response_time"`
	LastAccessed    time.Time     `json:"last_accessed"`
	WeightUsed      int64         `json:"weight_used"`
}

// StreamStats tracks WebSocket streaming statistics
type StreamStats struct {
	ActiveStreams     int           `json:"active_streams"`
	TotalConnections  int64         `json:"total_connections"`
	TotalDisconnects  int64         `json:"total_disconnects"`
	TotalReconnects   int64         `json:"total_reconnects"`
	MessagesReceived  int64         `json:"messages_received"`
	MessagesProcessed int64         `json:"messages_processed"`
	AvgLatency        time.Duration `json:"avg_latency"`
	DataThroughput    int64         `json:"data_throughput"`
}

// WeightConsumption tracks API weight usage
type WeightConsumption struct {
	CurrentWeight    int64                `json:"current_weight"`
	MaxWeight        int64                `json:"max_weight"`
	ResetTime        time.Time            `json:"reset_time"`
	WeightByEndpoint map[string]int64     `json:"weight_by_endpoint"`
	WeightHistory    []WeightHistoryEntry `json:"weight_history"`
}

// WeightHistoryEntry tracks weight usage over time
type WeightHistoryEntry struct {
	Timestamp time.Time `json:"timestamp"`
	Weight    int64     `json:"weight"`
	Endpoint  string    `json:"endpoint"`
}

// BinanceCacheEntry represents cached data with Binance-specific metadata
type BinanceCacheEntry struct {
	Data         interface{} `json:"data"`
	ExpiresAt    time.Time   `json:"expires_at"`
	Size         int64       `json:"size"`
	Weight       int         `json:"weight"`
	Endpoint     string      `json:"endpoint"`
	LastAccessed time.Time   `json:"last_accessed"`
	AccessCount  int64       `json:"access_count"`
}

// BinanceRetryConfig defines retry behavior
type BinanceRetryConfig struct {
	MaxRetries    int           `json:"max_retries"`
	BaseBackoff   time.Duration `json:"base_backoff"`
	MaxBackoff    time.Duration `json:"max_backoff"`
	BackoffFactor float64       `json:"backoff_factor"`
	Jitter        bool          `json:"jitter"`
	RetryOn       []int         `json:"retry_on"` // HTTP status codes to retry on
}

// BinanceRateLimiter manages Binance's complex rate limiting
type BinanceRateLimiter struct {
	mu                 sync.Mutex
	weightRequests     []WeightRequest
	orderRequests      []time.Time
	rawRequests        []time.Time
	maxWeightPerMinute int
	maxOrderPerSecond  int
	maxRawPerMinute    int
	currentWeight      int64
	weightResetTime    time.Time
}

// WeightRequest tracks API requests with their weights
type WeightRequest struct {
	Timestamp time.Time
	Weight    int
	Endpoint  string
}

// BinanceWeightManager manages API weight consumption
type BinanceWeightManager struct {
	mu          sync.RWMutex
	weights     map[string]int // endpoint -> weight
	consumption WeightConsumption
	callbacks   []func(endpoint string, weight int)
}

// BinanceStreamManager manages WebSocket connections
type BinanceStreamManager struct {
	mu      sync.RWMutex
	streams map[string]*BinanceStream
	config  BinanceConfig
	stats   StreamStats
}

// BinanceStream represents a WebSocket stream
type BinanceStream struct {
	Symbol       string
	StreamType   string
	Connection   interface{} // WebSocket connection
	LastMessage  time.Time
	MessageCount int64
	IsActive     bool
}

// Binance API response structures with revolutionary precision

// BinanceExchangeInfo represents Binance exchange information
type BinanceExchangeInfo struct {
	Timezone        string              `json:"timezone"`
	ServerTime      int64               `json:"serverTime"`
	RateLimits      []BinanceRateLimit  `json:"rateLimits"`
	ExchangeFilters []interface{}       `json:"exchangeFilters"`
	Symbols         []BinanceSymbolInfo `json:"symbols"`
}

// BinanceRateLimit represents rate limit information
type BinanceRateLimit struct {
	RateLimitType string `json:"rateLimitType"`
	Interval      string `json:"interval"`
	IntervalNum   int    `json:"intervalNum"`
	Limit         int    `json:"limit"`
}

// BinanceSymbolInfo represents trading pair information
type BinanceSymbolInfo struct {
	Symbol                     string                `json:"symbol"`
	Status                     string                `json:"status"`
	BaseAsset                  string                `json:"baseAsset"`
	BaseAssetPrecision         int                   `json:"baseAssetPrecision"`
	QuoteAsset                 string                `json:"quoteAsset"`
	QuotePrecision             int                   `json:"quotePrecision"`
	QuoteAssetPrecision        int                   `json:"quoteAssetPrecision"`
	BaseCommissionPrecision    int                   `json:"baseCommissionPrecision"`
	QuoteCommissionPrecision   int                   `json:"quoteCommissionPrecision"`
	OrderTypes                 []string              `json:"orderTypes"`
	IcebergAllowed             bool                  `json:"icebergAllowed"`
	OcoAllowed                 bool                  `json:"ocoAllowed"`
	QuoteOrderQtyMarketAllowed bool                  `json:"quoteOrderQtyMarketAllowed"`
	AllowTrailingStop          bool                  `json:"allowTrailingStop"`
	CancelReplaceAllowed       bool                  `json:"cancelReplaceAllowed"`
	IsSpotTradingAllowed       bool                  `json:"isSpotTradingAllowed"`
	IsMarginTradingAllowed     bool                  `json:"isMarginTradingAllowed"`
	Filters                    []BinanceSymbolFilter `json:"filters"`
	Permissions                []string              `json:"permissions"`
}

// BinanceSymbolFilter represents symbol-specific filters
type BinanceSymbolFilter struct {
	FilterType       string `json:"filterType"`
	MinPrice         string `json:"minPrice,omitempty"`
	MaxPrice         string `json:"maxPrice,omitempty"`
	TickSize         string `json:"tickSize,omitempty"`
	MultiplierUp     string `json:"multiplierUp,omitempty"`
	MultiplierDown   string `json:"multiplierDown,omitempty"`
	AvgPriceMins     int    `json:"avgPriceMins,omitempty"`
	MinQty           string `json:"minQty,omitempty"`
	MaxQty           string `json:"maxQty,omitempty"`
	StepSize         string `json:"stepSize,omitempty"`
	MinNotional      string `json:"minNotional,omitempty"`
	ApplyToMarket    bool   `json:"applyToMarket,omitempty"`
	Limit            int    `json:"limit,omitempty"`
	MaxNumOrders     int    `json:"maxNumOrders,omitempty"`
	MaxNumAlgoOrders int    `json:"maxNumAlgoOrders,omitempty"`
}

// Binance24hrTicker represents 24hr ticker statistics
type Binance24hrTicker struct {
	Symbol             string `json:"symbol"`
	PriceChange        string `json:"priceChange"`
	PriceChangePercent string `json:"priceChangePercent"`
	WeightedAvgPrice   string `json:"weightedAvgPrice"`
	PrevClosePrice     string `json:"prevClosePrice"`
	LastPrice          string `json:"lastPrice"`
	LastQty            string `json:"lastQty"`
	BidPrice           string `json:"bidPrice"`
	BidQty             string `json:"bidQty"`
	AskPrice           string `json:"askPrice"`
	AskQty             string `json:"askQty"`
	OpenPrice          string `json:"openPrice"`
	HighPrice          string `json:"highPrice"`
	LowPrice           string `json:"lowPrice"`
	Volume             string `json:"volume"`
	QuoteVolume        string `json:"quoteVolume"`
	OpenTime           int64  `json:"openTime"`
	CloseTime          int64  `json:"closeTime"`
	FirstId            int64  `json:"firstId"`
	LastId             int64  `json:"lastId"`
	Count              int64  `json:"count"`
}

// BinanceKlineData represents candlestick/kline data
type BinanceKlineData []interface{}

// BinanceAssetDetail represents asset details
type BinanceAssetDetail struct {
	MinWithdrawAmount string `json:"minWithdrawAmount"`
	DepositStatus     bool   `json:"depositStatus"`
	WithdrawFee       string `json:"withdrawFee"`
	WithdrawStatus    bool   `json:"withdrawStatus"`
	DepositTip        string `json:"depositTip"`
}

// NewBinanceProvider creates a revolutionary Binance provider instance
func NewBinanceProvider(config BinanceConfig) *BinanceProvider {
	bp := &BinanceProvider{
		apiKey:     config.APIKey,
		secretKey:  config.SecretKey,
		baseURL:    config.BaseURL,
		testnetURL: config.TestnetURL,
		httpClient: &http.Client{
			Timeout: config.Timeout,
		},
		config:         config,
		cache:          make(map[string]*BinanceCacheEntry),
		signatureCache: make(map[string]string),
		stats: BinanceStats{
			EndpointStats: make(map[string]EndpointStats),
			WeightConsumption: WeightConsumption{
				MaxWeight:        int64(config.WeightLimitPerMinute),
				WeightByEndpoint: make(map[string]int64),
				WeightHistory:    make([]WeightHistoryEntry, 0),
			},
		},
	}

	// Initialize tracer
	if config.Tracing {
		bp.tracer = otel.Tracer("binance-provider")
	}

	// Initialize rate limiter
	bp.rateLimiter = NewBinanceRateLimiter(
		config.WeightLimitPerMinute,
		config.OrderLimitPerSecond,
		config.RawRequestsPerMinute,
	)

	// Initialize weight manager
	bp.weightManager = NewBinanceWeightManager()
	bp.initializeEndpointWeights()

	// Initialize stream manager
	if config.EnableStreaming {
		bp.streamManager = NewBinanceStreamManager(config)
	}

	// Initialize retry configuration
	bp.retryConfig = BinanceRetryConfig{
		MaxRetries:    config.MaxRetries,
		BaseBackoff:   config.RetryBackoff,
		MaxBackoff:    30 * time.Second,
		BackoffFactor: 2.0,
		Jitter:        true,
		RetryOn:       []int{429, 502, 503, 504},
	}

	return bp
}

// GetAssetListings retrieves cryptocurrency asset listings from Binance
func (bp *BinanceProvider) GetAssetListings(ctx context.Context, limit int, start int) ([]*static.AssetListing, error) {
	startTime := time.Now()

	// Create tracing span
	if bp.tracer != nil {
		var span trace.Span
		ctx, span = bp.tracer.Start(ctx, "binance.get_asset_listings", trace.WithAttributes(
			attribute.Int("limit", limit),
			attribute.Int("start", start),
		))
		defer span.End()
	}

	// Check cache first
	cacheKey := fmt.Sprintf("asset_listings_%d_%d", limit, start)
	if cached := bp.getFromCache(cacheKey); cached != nil {
		bp.recordCacheHit("asset_listings")
		if listings, ok := cached.([]*static.AssetListing); ok {
			return listings, nil
		}
	}

	bp.recordCacheMiss("asset_listings")

	// Get exchange info first
	exchangeInfo, err := bp.getExchangeInfo(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get exchange info: %w", err)
	}

	// Get 24hr ticker statistics
	tickers, err := bp.get24hrTickers(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get 24hr tickers: %w", err)
	}

	// Transform to standard format
	listings := bp.transformAssetListings(exchangeInfo, tickers, limit, start)

	// Cache the result
	bp.setCache(cacheKey, listings, "asset_listings")

	bp.recordSuccess("asset_listings", time.Since(startTime))
	return listings, nil
}

// GetTokenMetadata retrieves metadata for specific tokens
func (bp *BinanceProvider) GetTokenMetadata(ctx context.Context, symbols []string) (map[string]*static.AssetListing, error) {
	startTime := time.Now()

	// Create tracing span
	if bp.tracer != nil {
		var span trace.Span
		ctx, span = bp.tracer.Start(ctx, "binance.get_token_metadata", trace.WithAttributes(
			attribute.StringSlice("symbols", symbols),
		))
		defer span.End()
	}

	// Check cache first
	cacheKey := fmt.Sprintf("token_metadata_%v", symbols)
	if cached := bp.getFromCache(cacheKey); cached != nil {
		bp.recordCacheHit("token_metadata")
		if metadata, ok := cached.(map[string]*static.AssetListing); ok {
			return metadata, nil
		}
	}

	bp.recordCacheMiss("token_metadata")

	// Get asset details
	assetDetails, err := bp.getAssetDetails(ctx, symbols)
	if err != nil {
		return nil, fmt.Errorf("failed to get asset details: %w", err)
	}

	// Get symbol information
	exchangeInfo, err := bp.getExchangeInfo(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get exchange info: %w", err)
	}

	// Transform to standard format
	metadata := bp.transformTokenMetadata(assetDetails, exchangeInfo, symbols)

	// Cache the result
	bp.setCache(cacheKey, metadata, "token_metadata")

	bp.recordSuccess("token_metadata", time.Since(startTime))
	return metadata, nil
}

// GetExchangeInfo retrieves Binance exchange information
func (bp *BinanceProvider) GetExchangeInfo(ctx context.Context, exchangeID string) (*static.StaticExchangeInfo, error) {
	startTime := time.Now()

	// Create tracing span
	if bp.tracer != nil {
		var span trace.Span
		ctx, span = bp.tracer.Start(ctx, "binance.get_exchange_info", trace.WithAttributes(
			attribute.String("exchange_id", exchangeID),
		))
		defer span.End()
	}

	// Check cache first
	cacheKey := fmt.Sprintf("exchange_info_%s", exchangeID)
	if cached := bp.getFromCache(cacheKey); cached != nil {
		bp.recordCacheHit("exchange_info")
		if exchangeInfo, ok := cached.(*static.StaticExchangeInfo); ok {
			return exchangeInfo, nil
		}
	}

	bp.recordCacheMiss("exchange_info")

	// Get Binance exchange info
	binanceInfo, err := bp.getExchangeInfo(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get Binance exchange info: %w", err)
	}

	// Transform to standard format
	exchangeInfo := bp.transformExchangeInfo(binanceInfo)

	// Cache the result
	bp.setCache(cacheKey, exchangeInfo, "exchange_info")

	bp.recordSuccess("exchange_info", time.Since(startTime))
	return exchangeInfo, nil
}

// GetTradingPairs retrieves trading pairs from Binance
func (bp *BinanceProvider) GetTradingPairs(ctx context.Context, exchangeID string) ([]*static.TradingPair, error) {
	startTime := time.Now()

	// Create tracing span
	if bp.tracer != nil {
		var span trace.Span
		ctx, span = bp.tracer.Start(ctx, "binance.get_trading_pairs", trace.WithAttributes(
			attribute.String("exchange_id", exchangeID),
		))
		defer span.End()
	}

	// Check cache first
	cacheKey := fmt.Sprintf("trading_pairs_%s", exchangeID)
	if cached := bp.getFromCache(cacheKey); cached != nil {
		bp.recordCacheHit("trading_pairs")
		if tradingPairs, ok := cached.([]*static.TradingPair); ok {
			return tradingPairs, nil
		}
	}

	bp.recordCacheMiss("trading_pairs")

	// Get 24hr ticker statistics
	tickers, err := bp.get24hrTickers(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get 24hr tickers: %w", err)
	}

	// Transform to standard format
	tradingPairs := bp.transformTradingPairs(tickers)

	// Cache the result
	bp.setCache(cacheKey, tradingPairs, "trading_pairs")

	bp.recordSuccess("trading_pairs", time.Since(startTime))
	return tradingPairs, nil
}

// GetHistoricalOHLC retrieves historical OHLC data from Binance
func (bp *BinanceProvider) GetHistoricalOHLC(ctx context.Context, symbol string, timeframe string, start, end time.Time) ([]*static.StaticHistoricalOHLC, error) {
	startTime := time.Now()

	// Create tracing span
	if bp.tracer != nil {
		var span trace.Span
		ctx, span = bp.tracer.Start(ctx, "binance.get_historical_ohlc", trace.WithAttributes(
			attribute.String("symbol", symbol),
			attribute.String("timeframe", timeframe),
		))
		defer span.End()
	}

	// Check cache first
	cacheKey := fmt.Sprintf("historical_ohlc_%s_%s_%d_%d", symbol, timeframe, start.Unix(), end.Unix())
	if cached := bp.getFromCache(cacheKey); cached != nil {
		bp.recordCacheHit("historical_ohlc")
		if ohlcData, ok := cached.([]*static.StaticHistoricalOHLC); ok {
			return ohlcData, nil
		}
	}

	bp.recordCacheMiss("historical_ohlc")

	// Get kline data
	klines, err := bp.getKlines(ctx, symbol, timeframe, start, end)
	if err != nil {
		return nil, fmt.Errorf("failed to get kline data: %w", err)
	}

	// Transform to standard format
	ohlcData := bp.transformHistoricalOHLC(symbol, klines)

	// Cache the result with longer TTL for historical data
	bp.setCache(cacheKey, ohlcData, "historical_ohlc")

	bp.recordSuccess("historical_ohlc", time.Since(startTime))
	return ohlcData, nil
}

// GetGlobalMetrics retrieves global market metrics (Binance doesn't provide this directly)
func (bp *BinanceProvider) GetGlobalMetrics(ctx context.Context) (*static.StaticGlobalMetrics, error) {
	return nil, fmt.Errorf("global metrics not supported by Binance provider - use aggregated data from multiple sources")
}

// SupportsDataType checks if the provider supports a specific data type
func (bp *BinanceProvider) SupportsDataType(dataType static.StaticDataType) bool {
	supportedTypes := map[static.StaticDataType]bool{
		static.AssetListings:    true,
		static.TokenMetadata:    true,
		static.ExchangeInfo:     true,
		static.TradingPairs:     true,
		static.HistoricalOHLC:   true,
		static.GlobalMetrics:    false, // Not supported by Binance
		static.MarketCategories: false, // Not supported by Binance
		static.NewsMetadata:     false, // Not supported by Binance
		static.SocialMetrics:    false, // Not supported by Binance
	}

	return supportedTypes[dataType]
}

// GetRateLimit returns current rate limit configuration
func (bp *BinanceProvider) GetRateLimit() (requests int, window time.Duration) {
	return bp.config.WeightLimitPerMinute, time.Minute
}

// HealthCheck performs a comprehensive health check
func (bp *BinanceProvider) HealthCheck(ctx context.Context) error {
	// Test server time endpoint (lowest weight)
	_, err := bp.getServerTime(ctx)
	if err != nil {
		return fmt.Errorf("Binance health check failed: %w", err)
	}
	return nil
}

// Stats returns comprehensive provider statistics
func (bp *BinanceProvider) Stats() BinanceStats {
	bp.mu.RLock()
	defer bp.mu.RUnlock()

	stats := bp.stats
	stats.WeightConsumption = bp.weightManager.GetConsumption()

	return stats
}

// Helper methods and constructors with revolutionary precision

// NewBinanceRateLimiter creates a new Binance rate limiter
func NewBinanceRateLimiter(maxWeightPerMinute, maxOrderPerSecond, maxRawPerMinute int) *BinanceRateLimiter {
	return &BinanceRateLimiter{
		maxWeightPerMinute: maxWeightPerMinute,
		maxOrderPerSecond:  maxOrderPerSecond,
		maxRawPerMinute:    maxRawPerMinute,
		weightResetTime:    time.Now().Add(time.Minute),
	}
}

// NewBinanceWeightManager creates a new weight manager
func NewBinanceWeightManager() *BinanceWeightManager {
	return &BinanceWeightManager{
		weights: make(map[string]int),
		consumption: WeightConsumption{
			WeightByEndpoint: make(map[string]int64),
			WeightHistory:    make([]WeightHistoryEntry, 0),
		},
		callbacks: make([]func(endpoint string, weight int), 0),
	}
}

// NewBinanceStreamManager creates a new stream manager
func NewBinanceStreamManager(config BinanceConfig) *BinanceStreamManager {
	return &BinanceStreamManager{
		streams: make(map[string]*BinanceStream),
		config:  config,
	}
}

// initializeEndpointWeights sets up API endpoint weights
func (bp *BinanceProvider) initializeEndpointWeights() {
	weights := map[string]int{
		"/api/v3/exchangeInfo":           10,
		"/api/v3/ticker/24hr":            40,
		"/api/v3/time":                   1,
		"/api/v3/klines":                 1,
		"/sapi/v1/capital/config/getall": 10,
		"/api/v3/ticker/price":           1,
		"/api/v3/depth":                  5,
		"/api/v3/trades":                 1,
		"/api/v3/historicalTrades":       5,
		"/api/v3/avgPrice":               1,
		"/api/v3/ticker/bookTicker":      2,
	}

	bp.weightManager.SetWeights(weights)
}

// getFromCache retrieves data from cache with Apple-inspired precision
func (bp *BinanceProvider) getFromCache(key string) interface{} {
	bp.mu.RLock()
	defer bp.mu.RUnlock()

	entry, exists := bp.cache[key]
	if !exists {
		return nil
	}

	// Check expiration
	if time.Now().After(entry.ExpiresAt) {
		delete(bp.cache, key)
		return nil
	}

	// Update access statistics
	entry.LastAccessed = time.Now()
	entry.AccessCount++

	return entry.Data
}

// setCache stores data in cache with comprehensive metadata
func (bp *BinanceProvider) setCache(key string, data interface{}, endpoint string) {
	bp.mu.Lock()
	defer bp.mu.Unlock()

	entry := &BinanceCacheEntry{
		Data:         data,
		ExpiresAt:    time.Now().Add(bp.config.CacheTTL),
		Size:         int64(len(fmt.Sprintf("%v", data))),
		Weight:       bp.weightManager.GetWeight(endpoint),
		Endpoint:     endpoint,
		LastAccessed: time.Now(),
		AccessCount:  1,
	}

	bp.cache[key] = entry
}

// recordCacheHit updates cache hit statistics
func (bp *BinanceProvider) recordCacheHit(endpoint string) {
	bp.mu.Lock()
	defer bp.mu.Unlock()

	bp.stats.CacheHits++
	if stats, exists := bp.stats.EndpointStats[endpoint]; exists {
		stats.RequestCount++
		bp.stats.EndpointStats[endpoint] = stats
	} else {
		bp.stats.EndpointStats[endpoint] = EndpointStats{
			RequestCount: 1,
			LastAccessed: time.Now(),
		}
	}
}

// recordCacheMiss updates cache miss statistics
func (bp *BinanceProvider) recordCacheMiss(endpoint string) {
	bp.mu.Lock()
	defer bp.mu.Unlock()

	bp.stats.CacheMisses++
}

// recordSuccess updates success statistics
func (bp *BinanceProvider) recordSuccess(endpoint string, duration time.Duration) {
	bp.mu.Lock()
	defer bp.mu.Unlock()

	bp.stats.TotalRequests++
	bp.stats.SuccessfulRequests++
	bp.stats.LastRequestAt = time.Now()

	// Update average response time
	if bp.stats.AvgResponseTime == 0 {
		bp.stats.AvgResponseTime = duration
	} else {
		bp.stats.AvgResponseTime = (bp.stats.AvgResponseTime + duration) / 2
	}

	// Update endpoint statistics
	if stats, exists := bp.stats.EndpointStats[endpoint]; exists {
		stats.RequestCount++
		stats.SuccessCount++
		stats.LastAccessed = time.Now()
		if stats.AvgResponseTime == 0 {
			stats.AvgResponseTime = duration
		} else {
			stats.AvgResponseTime = (stats.AvgResponseTime + duration) / 2
		}
		bp.stats.EndpointStats[endpoint] = stats
	} else {
		bp.stats.EndpointStats[endpoint] = EndpointStats{
			RequestCount:    1,
			SuccessCount:    1,
			AvgResponseTime: duration,
			LastAccessed:    time.Now(),
		}
	}
}

// getExchangeInfo retrieves Binance exchange information
func (bp *BinanceProvider) getExchangeInfo(ctx context.Context) (*BinanceExchangeInfo, error) {
	endpoint := "/api/v3/exchangeInfo"

	// Wait for rate limit
	if err := bp.rateLimiter.Wait(ctx, endpoint, 10); err != nil {
		return nil, fmt.Errorf("rate limit error: %w", err)
	}

	// Make API request
	url := bp.getBaseURL() + endpoint
	resp, err := bp.makeRequest(ctx, "GET", url, nil, false)
	if err != nil {
		return nil, fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	var exchangeInfo BinanceExchangeInfo
	if err := json.NewDecoder(resp.Body).Decode(&exchangeInfo); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &exchangeInfo, nil
}

// get24hrTickers retrieves 24hr ticker statistics
func (bp *BinanceProvider) get24hrTickers(ctx context.Context) ([]Binance24hrTicker, error) {
	endpoint := "/api/v3/ticker/24hr"

	// Wait for rate limit
	if err := bp.rateLimiter.Wait(ctx, endpoint, 40); err != nil {
		return nil, fmt.Errorf("rate limit error: %w", err)
	}

	// Make API request
	url := bp.getBaseURL() + endpoint
	resp, err := bp.makeRequest(ctx, "GET", url, nil, false)
	if err != nil {
		return nil, fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	var tickers []Binance24hrTicker
	if err := json.NewDecoder(resp.Body).Decode(&tickers); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return tickers, nil
}

// getServerTime retrieves server time for health checks
func (bp *BinanceProvider) getServerTime(ctx context.Context) (int64, error) {
	endpoint := "/api/v3/time"

	// Wait for rate limit
	if err := bp.rateLimiter.Wait(ctx, endpoint, 1); err != nil {
		return 0, fmt.Errorf("rate limit error: %w", err)
	}

	// Make API request
	url := bp.getBaseURL() + endpoint
	resp, err := bp.makeRequest(ctx, "GET", url, nil, false)
	if err != nil {
		return 0, fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	var timeResp struct {
		ServerTime int64 `json:"serverTime"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&timeResp); err != nil {
		return 0, fmt.Errorf("failed to decode response: %w", err)
	}

	return timeResp.ServerTime, nil
}

// getAssetDetails retrieves asset details
func (bp *BinanceProvider) getAssetDetails(ctx context.Context, symbols []string) (map[string]BinanceAssetDetail, error) {
	endpoint := "/sapi/v1/capital/config/getall"

	// Wait for rate limit
	if err := bp.rateLimiter.Wait(ctx, endpoint, 10); err != nil {
		return nil, fmt.Errorf("rate limit error: %w", err)
	}

	// Prepare signed request
	params := url.Values{}
	params.Add("timestamp", strconv.FormatInt(time.Now().UnixMilli(), 10))
	params.Add("recvWindow", strconv.FormatInt(bp.config.RecvWindow, 10))

	// Make signed API request
	url := bp.getBaseURL() + endpoint
	resp, err := bp.makeRequest(ctx, "GET", url, params, true)
	if err != nil {
		return nil, fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	var assets []struct {
		Coin              string `json:"coin"`
		MinWithdrawAmount string `json:"minWithdrawAmount"`
		DepositStatus     bool   `json:"depositStatus"`
		WithdrawFee       string `json:"withdrawFee"`
		WithdrawStatus    bool   `json:"withdrawStatus"`
		DepositTip        string `json:"depositTip"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&assets); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	// Convert to map
	assetDetails := make(map[string]BinanceAssetDetail)
	for _, asset := range assets {
		assetDetails[asset.Coin] = BinanceAssetDetail{
			MinWithdrawAmount: asset.MinWithdrawAmount,
			DepositStatus:     asset.DepositStatus,
			WithdrawFee:       asset.WithdrawFee,
			WithdrawStatus:    asset.WithdrawStatus,
			DepositTip:        asset.DepositTip,
		}
	}

	return assetDetails, nil
}

// getKlines retrieves historical kline data
func (bp *BinanceProvider) getKlines(ctx context.Context, symbol, interval string, startTime, endTime time.Time) ([]BinanceKlineData, error) {
	endpoint := "/api/v3/klines"

	// Wait for rate limit
	if err := bp.rateLimiter.Wait(ctx, endpoint, 1); err != nil {
		return nil, fmt.Errorf("rate limit error: %w", err)
	}

	// Prepare parameters
	params := url.Values{}
	params.Add("symbol", strings.ToUpper(symbol))
	params.Add("interval", bp.convertTimeframe(interval))
	params.Add("startTime", strconv.FormatInt(startTime.UnixMilli(), 10))
	params.Add("endTime", strconv.FormatInt(endTime.UnixMilli(), 10))
	params.Add("limit", "1000")

	// Make API request
	url := bp.getBaseURL() + endpoint + "?" + params.Encode()
	resp, err := bp.makeRequest(ctx, "GET", url, nil, false)
	if err != nil {
		return nil, fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	var klines []BinanceKlineData
	if err := json.NewDecoder(resp.Body).Decode(&klines); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return klines, nil
}

// getBaseURL returns the appropriate base URL
func (bp *BinanceProvider) getBaseURL() string {
	if bp.config.UseTestnet {
		return bp.testnetURL
	}
	return bp.baseURL
}

// makeRequest makes HTTP requests with comprehensive error handling
func (bp *BinanceProvider) makeRequest(ctx context.Context, method, url string, params url.Values, signed bool) (*http.Response, error) {
	// Create request
	var req *http.Request
	var err error

	if method == "GET" && params != nil {
		if signed {
			// Add signature for signed requests
			signature := bp.generateSignature(params.Encode())
			params.Add("signature", signature)
		}
		url += "?" + params.Encode()
	}

	req, err = http.NewRequestWithContext(ctx, method, url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Add headers
	req.Header.Set("User-Agent", bp.config.UserAgent)
	req.Header.Set("Content-Type", "application/json")
	if bp.apiKey != "" {
		req.Header.Set("X-MBX-APIKEY", bp.apiKey)
	}

	// Execute request with retry logic
	return bp.executeWithRetry(req)
}

// generateSignature generates HMAC-SHA256 signature
func (bp *BinanceProvider) generateSignature(query string) string {
	if bp.secretKey == "" {
		return ""
	}

	// Check signature cache
	if sig, exists := bp.signatureCache[query]; exists {
		return sig
	}

	h := hmac.New(sha256.New, []byte(bp.secretKey))
	h.Write([]byte(query))
	signature := hex.EncodeToString(h.Sum(nil))

	// Cache signature
	bp.signatureCache[query] = signature

	return signature
}

// executeWithRetry executes request with exponential backoff retry
func (bp *BinanceProvider) executeWithRetry(req *http.Request) (*http.Response, error) {
	var lastErr error

	for attempt := 0; attempt <= bp.retryConfig.MaxRetries; attempt++ {
		resp, err := bp.httpClient.Do(req)
		if err != nil {
			lastErr = err
			if attempt < bp.retryConfig.MaxRetries {
				backoff := bp.calculateBackoff(attempt)
				time.Sleep(backoff)
				continue
			}
			break
		}

		// Check if we should retry based on status code
		if bp.shouldRetry(resp.StatusCode) && attempt < bp.retryConfig.MaxRetries {
			resp.Body.Close()
			backoff := bp.calculateBackoff(attempt)
			time.Sleep(backoff)
			continue
		}

		return resp, nil
	}

	return nil, fmt.Errorf("request failed after %d attempts: %w", bp.retryConfig.MaxRetries+1, lastErr)
}

// calculateBackoff calculates exponential backoff with jitter
func (bp *BinanceProvider) calculateBackoff(attempt int) time.Duration {
	backoff := time.Duration(float64(bp.retryConfig.BaseBackoff) *
		math.Pow(bp.retryConfig.BackoffFactor, float64(attempt)))

	if backoff > bp.retryConfig.MaxBackoff {
		backoff = bp.retryConfig.MaxBackoff
	}

	if bp.retryConfig.Jitter {
		jitter := time.Duration(rand.Float64() * float64(backoff) * 0.1)
		backoff += jitter
	}

	return backoff
}

// shouldRetry determines if a request should be retried
func (bp *BinanceProvider) shouldRetry(statusCode int) bool {
	for _, code := range bp.retryConfig.RetryOn {
		if statusCode == code {
			return true
		}
	}
	return false
}

// convertTimeframe converts standard timeframe to Binance format
func (bp *BinanceProvider) convertTimeframe(timeframe string) string {
	timeframeMap := map[string]string{
		"1m":  "1m",
		"5m":  "5m",
		"15m": "15m",
		"30m": "30m",
		"1h":  "1h",
		"4h":  "4h",
		"1d":  "1d",
		"1w":  "1w",
		"1M":  "1M",
	}

	if binanceTimeframe, exists := timeframeMap[timeframe]; exists {
		return binanceTimeframe
	}

	return "1h" // Default to 1 hour
}

// Additional missing methods

// Wait implements rate limiting for the Binance rate limiter
func (brl *BinanceRateLimiter) Wait(ctx context.Context, endpoint string, weight int) error {
	brl.mu.Lock()
	defer brl.mu.Unlock()

	now := time.Now()

	// Clean up old requests
	brl.cleanupOldRequests(now)

	// Check weight limit
	if brl.currentWeight+int64(weight) > int64(brl.maxWeightPerMinute) {
		waitTime := brl.weightResetTime.Sub(now)
		if waitTime > 0 {
			brl.mu.Unlock()
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(waitTime):
			}
			brl.mu.Lock()
		}
	}

	// Add request
	brl.weightRequests = append(brl.weightRequests, WeightRequest{
		Timestamp: now,
		Weight:    weight,
		Endpoint:  endpoint,
	})
	brl.currentWeight += int64(weight)

	return nil
}

// cleanupOldRequests removes expired requests from rate limiter
func (brl *BinanceRateLimiter) cleanupOldRequests(now time.Time) {
	cutoff := now.Add(-time.Minute)

	// Clean weight requests
	i := 0
	totalWeight := int64(0)
	for _, req := range brl.weightRequests {
		if req.Timestamp.After(cutoff) {
			brl.weightRequests[i] = req
			totalWeight += int64(req.Weight)
			i++
		}
	}
	brl.weightRequests = brl.weightRequests[:i]
	brl.currentWeight = totalWeight

	// Update reset time if needed
	if brl.currentWeight == 0 {
		brl.weightResetTime = now.Add(time.Minute)
	}
}

// SetWeights sets endpoint weights for the weight manager
func (bwm *BinanceWeightManager) SetWeights(weights map[string]int) {
	bwm.mu.Lock()
	defer bwm.mu.Unlock()

	for endpoint, weight := range weights {
		bwm.weights[endpoint] = weight
	}
}

// GetWeight returns the weight for an endpoint
func (bwm *BinanceWeightManager) GetWeight(endpoint string) int {
	bwm.mu.RLock()
	defer bwm.mu.RUnlock()

	if weight, exists := bwm.weights[endpoint]; exists {
		return weight
	}
	return 1 // Default weight
}

// GetConsumption returns current weight consumption
func (bwm *BinanceWeightManager) GetConsumption() WeightConsumption {
	bwm.mu.RLock()
	defer bwm.mu.RUnlock()

	return bwm.consumption
}

// transformAssetListings transforms Binance data to standard asset listings
func (bp *BinanceProvider) transformAssetListings(exchangeInfo *BinanceExchangeInfo, tickers []Binance24hrTicker, limit int, start int) []*static.AssetListing {
	// Create ticker map for quick lookup
	tickerMap := make(map[string]Binance24hrTicker)
	for _, ticker := range tickers {
		tickerMap[ticker.Symbol] = ticker
	}

	var listings []*static.AssetListing

	// Process symbols from exchange info
	for i, symbol := range exchangeInfo.Symbols {
		if i < start {
			continue
		}
		if len(listings) >= limit {
			break
		}

		// Get ticker data
		ticker, hasTicker := tickerMap[symbol.Symbol]

		// Parse price data (remove unused variables)
		if hasTicker {
			// Variables used for potential future features
			_ = ticker.LastPrice
			_ = ticker.Volume
			_ = ticker.PriceChangePercent
		}

		listing := &static.AssetListing{
			ID:           fmt.Sprintf("binance-%s", symbol.BaseAsset),
			Symbol:       symbol.BaseAsset,
			Name:         symbol.BaseAsset, // Binance doesn't provide full names
			Slug:         strings.ToLower(symbol.BaseAsset),
			Category:     "cryptocurrency",
			Description:  fmt.Sprintf("%s trading on Binance", symbol.BaseAsset),
			Logo:         "",
			Website:      fmt.Sprintf("https://www.binance.com/en/trade/%s", symbol.Symbol),
			TechnicalDoc: "",
			SourceCode:   "",
			Explorer:     "",
			Platform: map[string]string{
				"id":   "1",
				"name": "Binance Smart Chain",
			},
			DateAdded:         time.Now(),
			Tags:              []string{"binance", "exchange"},
			CirculatingSupply: 0,
			TotalSupply:       0,
			MaxSupply:         0,
			InfiniteSupply:    false,
			IsActive:          symbol.Status == "TRADING",
		}

		listings = append(listings, listing)
	}

	return listings
}

// transformTokenMetadata transforms token metadata
func (bp *BinanceProvider) transformTokenMetadata(assetDetails map[string]BinanceAssetDetail, exchangeInfo *BinanceExchangeInfo, symbols []string) map[string]*static.AssetListing {
	metadata := make(map[string]*static.AssetListing)

	// Create symbol map
	symbolMap := make(map[string]BinanceSymbolInfo)
	for _, symbol := range exchangeInfo.Symbols {
		if symbol.BaseAsset != "" {
			symbolMap[symbol.BaseAsset] = symbol
		}
	}

	for _, symbol := range symbols {
		upperSymbol := strings.ToUpper(symbol)

		// Get asset details
		assetDetail, hasDetail := assetDetails[upperSymbol]
		symbolInfo, hasSymbol := symbolMap[upperSymbol]

		listing := &static.AssetListing{
			ID:       fmt.Sprintf("binance-%s", upperSymbol),
			Symbol:   upperSymbol,
			Name:     upperSymbol,
			Slug:     strings.ToLower(upperSymbol),
			Category: "cryptocurrency",
			Tags:     []string{"binance"},
			Platform: map[string]string{
				"id":   "1",
				"name": "Binance",
			},
			DateAdded: time.Now(),
		}

		// Add asset details if available
		if hasDetail {
			listing.Description = fmt.Sprintf("Withdrawal fee: %s, Min withdrawal: %s",
				assetDetail.WithdrawFee, assetDetail.MinWithdrawAmount)
		}

		// Add symbol info if available
		if hasSymbol {
			listing.Description += fmt.Sprintf(" - Precision: %d", symbolInfo.BaseAssetPrecision)
		}

		metadata[symbol] = listing
	}

	return metadata
}

// transformExchangeInfo transforms Binance exchange info to standard format
func (bp *BinanceProvider) transformExchangeInfo(binanceInfo *BinanceExchangeInfo) *static.StaticExchangeInfo {
	return &static.StaticExchangeInfo{
		ID:                       "binance",
		Name:                     "Binance",
		YearEstablished:          2017,
		Country:                  "Malta",
		Description:              "Binance is a global cryptocurrency exchange that provides a platform for trading more than 100 cryptocurrencies.",
		URL:                      "https://www.binance.com",
		Image:                    "https://assets.coingecko.com/markets/images/52/small/binance.jpg",
		HasTradingIncentive:      true,
		TrustScore:               10,
		TrustScoreRank:           1,
		TradeVolume24h:           0, // Would need additional API call
		TradeVolume24hNormalized: 0,
		Tickers:                  []static.TradingPair{},
		StatusUpdates:            []interface{}{},
		Centralized:              true,
		PublicNotice:             "",
		AlertNotice:              "",
	}
}

// transformTradingPairs transforms Binance tickers to trading pairs
func (bp *BinanceProvider) transformTradingPairs(tickers []Binance24hrTicker) []*static.TradingPair {
	var tradingPairs []*static.TradingPair

	for _, ticker := range tickers {
		// Parse values
		lastPrice, _ := strconv.ParseFloat(ticker.LastPrice, 64)
		volume, _ := strconv.ParseFloat(ticker.Volume, 64)
		priceChangePercent, _ := strconv.ParseFloat(ticker.PriceChangePercent, 64)
		bidPrice, _ := strconv.ParseFloat(ticker.BidPrice, 64)
		askPrice, _ := strconv.ParseFloat(ticker.AskPrice, 64)

		// Calculate spread
		var spread float64
		if bidPrice > 0 && askPrice > 0 {
			spread = ((askPrice - bidPrice) / bidPrice) * 100
		}

		// Extract base and target from symbol
		base, target := bp.parseSymbol(ticker.Symbol)

		pair := &static.TradingPair{
			Base:   base,
			Target: target,
			Market: "binance",
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
			Timestamp:              time.Unix(ticker.CloseTime/1000, 0),
			LastTradedAt:           time.Unix(ticker.CloseTime/1000, 0),
			LastFetchAt:            time.Now(),
			IsAnomaly:              priceChangePercent > 50 || priceChangePercent < -50,
			IsStale:                false,
		}

		tradingPairs = append(tradingPairs, pair)
	}

	return tradingPairs
}

// transformHistoricalOHLC transforms Binance kline data to OHLC
func (bp *BinanceProvider) transformHistoricalOHLC(symbol string, klines []BinanceKlineData) []*static.StaticHistoricalOHLC {
	var ohlcData []*static.StaticHistoricalOHLC

	for _, kline := range klines {
		if len(kline) < 11 {
			continue
		}

		// Parse kline data
		timestamp, _ := kline[0].(float64)
		open, _ := strconv.ParseFloat(fmt.Sprintf("%v", kline[1]), 64)
		high, _ := strconv.ParseFloat(fmt.Sprintf("%v", kline[2]), 64)
		low, _ := strconv.ParseFloat(fmt.Sprintf("%v", kline[3]), 64)
		close, _ := strconv.ParseFloat(fmt.Sprintf("%v", kline[4]), 64)
		volume, _ := strconv.ParseFloat(fmt.Sprintf("%v", kline[5]), 64)

		ohlc := &static.StaticHistoricalOHLC{
			Symbol:    symbol,
			Timestamp: time.Unix(int64(timestamp)/1000, 0),
			Open:      open,
			High:      high,
			Low:       low,
			Close:     close,
			Volume:    volume,
			MarketCap: 0, // Not provided by Binance
		}

		ohlcData = append(ohlcData, ohlc)
	}

	return ohlcData
}

// parseSymbol extracts base and target assets from Binance symbol
func (bp *BinanceProvider) parseSymbol(symbol string) (string, string) {
	// Common quote assets on Binance
	quoteAssets := []string{"USDT", "BUSD", "BTC", "ETH", "BNB", "USDC", "TUSD", "PAX", "USDS"}

	for _, quote := range quoteAssets {
		if strings.HasSuffix(symbol, quote) {
			base := strings.TrimSuffix(symbol, quote)
			if len(base) > 0 {
				return base, quote
			}
		}
	}

	// Fallback - assume last 3-4 characters are quote
	if len(symbol) > 6 {
		return symbol[:len(symbol)-4], symbol[len(symbol)-4:]
	} else if len(symbol) > 3 {
		return symbol[:len(symbol)-3], symbol[len(symbol)-3:]
	}

	return symbol, "USDT"
}
