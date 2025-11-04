package static

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

// StaticDataType represents different types of static data
type StaticDataType string

const (
	AssetListings     StaticDataType = "asset_listings"
	TokenMetadata     StaticDataType = "token_metadata"
	ExchangeInfo      StaticDataType = "exchange_info"
	TradingPairs      StaticDataType = "trading_pairs"
	MarketCategories  StaticDataType = "market_categories"
	HistoricalOHLC    StaticDataType = "historical_ohlc"
	MarketCapRankings StaticDataType = "market_cap_rankings"
	GlobalMetrics     StaticDataType = "global_metrics"
	NewsMetadata      StaticDataType = "news_metadata"
	SocialMetrics     StaticDataType = "social_metrics"
)

// StaticDataRequest represents a request for static data
type StaticDataRequest struct {
	ID           string                   `json:"id"`
	Type         StaticDataType           `json:"type"`
	Provider     string                   `json:"provider"`
	Symbol       string                   `json:"symbol,omitempty"`
	Symbols      []string                 `json:"symbols,omitempty"`
	Parameters   map[string]interface{}   `json:"parameters,omitempty"`
	Priority     int                      `json:"priority"`
	CacheTTL     time.Duration            `json:"cache_ttl"`
	ForceRefresh bool                     `json:"force_refresh"`
	Timeout      time.Duration            `json:"timeout"`
	Callback     func(interface{}, error) `json:"-"`
	CreatedAt    time.Time                `json:"created_at"`
}

// StaticDataResponse represents the response for static data
type StaticDataResponse struct {
	ID          string                 `json:"id"`
	Type        StaticDataType         `json:"type"`
	Provider    string                 `json:"provider"`
	Data        interface{}            `json:"data"`
	Metadata    map[string]interface{} `json:"metadata"`
	CachedAt    time.Time              `json:"cached_at"`
	ExpiresAt   time.Time              `json:"expires_at"`
	Error       error                  `json:"error,omitempty"`
	Duration    time.Duration          `json:"duration"`
	FromCache   bool                   `json:"from_cache"`
	DataSize    int64                  `json:"data_size"`
	Compression string                 `json:"compression,omitempty"`
}

// AssetListing represents basic asset information
type AssetListing struct {
	ID                string            `json:"id"`
	Symbol            string            `json:"symbol"`
	Name              string            `json:"name"`
	Slug              string            `json:"slug"`
	Category          string            `json:"category"`
	Description       string            `json:"description"`
	Logo              string            `json:"logo"`
	Website           string            `json:"website"`
	TechnicalDoc      string            `json:"technical_doc"`
	SourceCode        string            `json:"source_code"`
	Explorer          string            `json:"explorer"`
	Platform          map[string]string `json:"platform"`
	DateAdded         time.Time         `json:"date_added"`
	Tags              []string          `json:"tags"`
	MaxSupply         float64           `json:"max_supply"`
	CirculatingSupply float64           `json:"circulating_supply"`
	TotalSupply       float64           `json:"total_supply"`
	IsActive          bool              `json:"is_active"`
	InfiniteSupply    bool              `json:"infinite_supply"`
}

// StaticExchangeInfo represents exchange metadata for static data
type StaticExchangeInfo struct {
	ID                       string        `json:"id"`
	Name                     string        `json:"name"`
	YearEstablished          int           `json:"year_established"`
	Country                  string        `json:"country"`
	Description              string        `json:"description"`
	URL                      string        `json:"url"`
	Image                    string        `json:"image"`
	HasTradingIncentive      bool          `json:"has_trading_incentive"`
	TrustScore               int           `json:"trust_score"`
	TrustScoreRank           int           `json:"trust_score_rank"`
	TradeVolume24h           float64       `json:"trade_volume_24h"`
	TradeVolume24hNormalized float64       `json:"trade_volume_24h_normalized"`
	Tickers                  []TradingPair `json:"tickers"`
	StatusUpdates            []interface{} `json:"status_updates"`
	Centralized              bool          `json:"centralized"`
	PublicNotice             string        `json:"public_notice"`
	AlertNotice              string        `json:"alert_notice"`
}

// TradingPair represents a trading pair on an exchange
type TradingPair struct {
	Base                   string             `json:"base"`
	Target                 string             `json:"target"`
	Market                 string             `json:"market"`
	Last                   float64            `json:"last"`
	Volume                 float64            `json:"volume"`
	ConvertedLast          map[string]float64 `json:"converted_last"`
	ConvertedVolume        map[string]float64 `json:"converted_volume"`
	TrustScore             string             `json:"trust_score"`
	BidAskSpreadPercentage float64            `json:"bid_ask_spread_percentage"`
	Timestamp              time.Time          `json:"timestamp"`
	LastTradedAt           time.Time          `json:"last_traded_at"`
	LastFetchAt            time.Time          `json:"last_fetch_at"`
	IsAnomaly              bool               `json:"is_anomaly"`
	IsStale                bool               `json:"is_stale"`
}

// StaticHistoricalOHLC represents historical OHLC data
type StaticHistoricalOHLC struct {
	Symbol    string    `json:"symbol"`
	Timestamp time.Time `json:"timestamp"`
	Open      float64   `json:"open"`
	High      float64   `json:"high"`
	Low       float64   `json:"low"`
	Close     float64   `json:"close"`
	Volume    float64   `json:"volume"`
	MarketCap float64   `json:"market_cap"`
}

// StaticGlobalMetrics represents global market metrics
type StaticGlobalMetrics struct {
	ActiveCryptocurrencies          int                `json:"active_cryptocurrencies"`
	TotalCryptocurrencies           int                `json:"total_cryptocurrencies"`
	ActiveMarketPairs               int                `json:"active_market_pairs"`
	ActiveExchanges                 int                `json:"active_exchanges"`
	TotalExchanges                  int                `json:"total_exchanges"`
	EthDominance                    float64            `json:"eth_dominance"`
	BtcDominance                    float64            `json:"btc_dominance"`
	DefiMarketCap                   float64            `json:"defi_market_cap"`
	DefiMarketCapPercentage         float64            `json:"defi_market_cap_percentage"`
	DefiVolume24h                   float64            `json:"defi_volume_24h"`
	DefiVolume24hPercentage         float64            `json:"defi_volume_24h_percentage"`
	Stablecoin24hVolume             float64            `json:"stablecoin_24h_volume"`
	Stablecoin24hVolumePercentage   float64            `json:"stablecoin_24h_volume_percentage"`
	DerivativesVolume24h            float64            `json:"derivatives_volume_24h"`
	DerivativesVolume24hPercentage  float64            `json:"derivatives_volume_24h_percentage"`
	TotalMarketCap                  map[string]float64 `json:"total_market_cap"`
	TotalVolume24h                  map[string]float64 `json:"total_volume_24h"`
	MarketCapPercentage             map[string]float64 `json:"market_cap_percentage"`
	MarketCapChangePercentage24hUsd float64            `json:"market_cap_change_percentage_24h_usd"`
	UpdatedAt                       time.Time          `json:"updated_at"`
}

// StaticDataManager manages static and reference data with revolutionary precision
type StaticDataManager struct {
	mu             sync.RWMutex
	cache          map[string]*StaticDataResponse
	providers      map[string]StaticDataProvider
	batchProcessor *BatchProcessor
	config         StaticDataConfig
	stats          StaticDataStats
	tracer         trace.Tracer
	startTime      time.Time

	// Advanced features
	compressionEnabled bool
	cacheTierMap       map[StaticDataType]time.Duration
	refreshScheduler   *RefreshScheduler

	// Callbacks
	onDataRefreshed  func(StaticDataType, string, interface{})
	onCacheHit       func(string, StaticDataType)
	onCacheMiss      func(string, StaticDataType)
	onProviderError  func(string, error)
	onBatchProcessed func(int, time.Duration)
}

// StaticDataProvider interface for different data providers
type StaticDataProvider interface {
	GetAssetListings(ctx context.Context, limit int, start int) ([]*AssetListing, error)
	GetTokenMetadata(ctx context.Context, symbols []string) (map[string]*AssetListing, error)
	GetExchangeInfo(ctx context.Context, exchangeID string) (*StaticExchangeInfo, error)
	GetTradingPairs(ctx context.Context, exchangeID string) ([]*TradingPair, error)
	GetHistoricalOHLC(ctx context.Context, symbol string, timeframe string, start, end time.Time) ([]*StaticHistoricalOHLC, error)
	GetGlobalMetrics(ctx context.Context) (*StaticGlobalMetrics, error)
	SupportsDataType(dataType StaticDataType) bool
	GetRateLimit() (requests int, window time.Duration)
	HealthCheck(ctx context.Context) error
}

// StaticDataConfig defines configuration for static data manager
type StaticDataConfig struct {
	CacheSize          int64                            `json:"cache_size"`
	DefaultCacheTTL    time.Duration                    `json:"default_cache_ttl"`
	MaxBatchSize       int                              `json:"max_batch_size"`
	BatchTimeout       time.Duration                    `json:"batch_timeout"`
	CompressionEnabled bool                             `json:"compression_enabled"`
	RefreshInterval    time.Duration                    `json:"refresh_interval"`
	Tracing            bool                             `json:"tracing"`
	CacheTiers         map[StaticDataType]time.Duration `json:"cache_tiers"`
	ProviderPriority   map[StaticDataType][]string      `json:"provider_priority"`
	FallbackEnabled    bool                             `json:"fallback_enabled"`
	MaxRetries         int                              `json:"max_retries"`
	RetryBackoff       time.Duration                    `json:"retry_backoff"`
}

// StaticDataStats provides comprehensive statistics
type StaticDataStats struct {
	TotalRequests      int64                    `json:"total_requests"`
	CacheHits          int64                    `json:"cache_hits"`
	CacheMisses        int64                    `json:"cache_misses"`
	HitRatio           float64                  `json:"hit_ratio"`
	ProviderRequests   map[string]int64         `json:"provider_requests"`
	ProviderErrors     map[string]int64         `json:"provider_errors"`
	DataTypeRequests   map[StaticDataType]int64 `json:"data_type_requests"`
	AvgResponseTime    time.Duration            `json:"avg_response_time"`
	BatchesProcessed   int64                    `json:"batches_processed"`
	RefreshesCompleted int64                    `json:"refreshes_completed"`
	TotalDataSize      int64                    `json:"total_data_size"`
	CompressionSavings int64                    `json:"compression_savings"`
	Uptime             time.Duration            `json:"uptime"`
}

// BatchProcessor represents the batch processor (referenced from batch package)
type BatchProcessor struct {
	// Implementation would be in the batch package
}

// RefreshScheduler manages automatic data refresh
type RefreshScheduler struct {
	mu        sync.RWMutex
	schedules map[string]time.Time
	ticker    *time.Ticker
	stopChan  chan struct{}
}

// NewStaticDataManager creates a revolutionary static data manager
func NewStaticDataManager(config StaticDataConfig) *StaticDataManager {
	sdm := &StaticDataManager{
		cache:              make(map[string]*StaticDataResponse),
		providers:          make(map[string]StaticDataProvider),
		config:             config,
		compressionEnabled: config.CompressionEnabled,
		cacheTierMap:       config.CacheTiers,
		stats: StaticDataStats{
			ProviderRequests: make(map[string]int64),
			ProviderErrors:   make(map[string]int64),
			DataTypeRequests: make(map[StaticDataType]int64),
		},
		startTime: time.Now(),
	}

	// Initialize tracer
	if config.Tracing {
		sdm.tracer = otel.Tracer("static-data-manager")
	}

	// Initialize batch processor
	batchConfig := BatchProcessorConfig{
		MaxBatchSize:     config.MaxBatchSize,
		MinBatchSize:     1,
		MaxWaitTime:      config.BatchTimeout,
		AdaptiveBatching: true,
		Deduplication:    true,
		Tracing:          config.Tracing,
	}

	sdm.batchProcessor = NewBatchProcessor(batchConfig, sdm.processBatch)

	// Initialize refresh scheduler
	sdm.refreshScheduler = NewRefreshScheduler(config.RefreshInterval, sdm)

	return sdm
}

// RegisterProvider registers a new static data provider
func (sdm *StaticDataManager) RegisterProvider(name string, provider StaticDataProvider) error {
	sdm.mu.Lock()
	defer sdm.mu.Unlock()

	// Test provider health
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := provider.HealthCheck(ctx); err != nil {
		return fmt.Errorf("provider %s health check failed: %w", name, err)
	}

	sdm.providers[name] = provider
	sdm.stats.ProviderRequests[name] = 0
	sdm.stats.ProviderErrors[name] = 0

	return nil
}

// GetStaticData retrieves static data with intelligent caching and batching
func (sdm *StaticDataManager) GetStaticData(req *StaticDataRequest) (*StaticDataResponse, error) {
	ctx := context.Background()
	startTime := time.Now()

	// Create tracing span
	if sdm.tracer != nil {
		var span trace.Span
		ctx, span = sdm.tracer.Start(ctx, "static_data.get", trace.WithAttributes(
			attribute.String("data.type", string(req.Type)),
			attribute.String("data.provider", req.Provider),
			attribute.String("data.symbol", req.Symbol),
		))
		defer span.End()
	}

	// Generate cache key
	cacheKey := sdm.generateCacheKey(req)

	// Check cache first (unless force refresh)
	if !req.ForceRefresh {
		if cachedData := sdm.getCachedData(cacheKey); cachedData != nil {
			sdm.recordCacheHit(req.Type)
			if sdm.onCacheHit != nil {
				sdm.onCacheHit(cacheKey, req.Type)
			}
			return cachedData, nil
		}
	}

	// Cache miss - need to fetch data
	sdm.recordCacheMiss(req.Type)
	if sdm.onCacheMiss != nil {
		sdm.onCacheMiss(cacheKey, req.Type)
	}

	// Create batch request
	batchReq := &BatchRequest{
		ID:        req.ID,
		Key:       cacheKey,
		Data:      req,
		Priority:  req.Priority,
		Timeout:   req.Timeout,
		CreatedAt: time.Now(),
	}

	// Add to batch processor
	if err := sdm.batchProcessor.AddRequest(batchReq); err != nil {
		return nil, fmt.Errorf("failed to add request to batch: %w", err)
	}

	// Wait for processing (this would be implemented with channels in real code)
	// For now, process immediately for demo
	responses, err := sdm.processBatch([]*BatchRequest{batchReq})
	if err != nil {
		return nil, err
	}

	if len(responses) == 0 {
		return nil, fmt.Errorf("no response received")
	}

	response := responses[0]
	if response.Error != nil {
		return nil, response.Error
	}

	// Update statistics
	sdm.updateStats(req.Type, time.Since(startTime))

	return response.Data.(*StaticDataResponse), nil
}

// GetAssetListings retrieves cryptocurrency asset listings
func (sdm *StaticDataManager) GetAssetListings(provider string, limit, start int, cacheTTL time.Duration) ([]*AssetListing, error) {
	req := &StaticDataRequest{
		ID:       fmt.Sprintf("asset_listings_%s_%d_%d", provider, limit, start),
		Type:     AssetListings,
		Provider: provider,
		Parameters: map[string]interface{}{
			"limit": limit,
			"start": start,
		},
		Priority: 5,
		CacheTTL: cacheTTL,
	}

	response, err := sdm.GetStaticData(req)
	if err != nil {
		return nil, err
	}

	listings, ok := response.Data.([]*AssetListing)
	if !ok {
		return nil, fmt.Errorf("invalid data type for asset listings")
	}

	return listings, nil
}

// GetTokenMetadata retrieves metadata for specific tokens
func (sdm *StaticDataManager) GetTokenMetadata(provider string, symbols []string, cacheTTL time.Duration) (map[string]*AssetListing, error) {
	req := &StaticDataRequest{
		ID:       fmt.Sprintf("token_metadata_%s_%v", provider, symbols),
		Type:     TokenMetadata,
		Provider: provider,
		Symbols:  symbols,
		Priority: 7,
		CacheTTL: cacheTTL,
	}

	response, err := sdm.GetStaticData(req)
	if err != nil {
		return nil, err
	}

	metadata, ok := response.Data.(map[string]*AssetListing)
	if !ok {
		return nil, fmt.Errorf("invalid data type for token metadata")
	}

	return metadata, nil
}

// GetHistoricalOHLC retrieves historical OHLC data
func (sdm *StaticDataManager) GetHistoricalOHLC(provider, symbol, timeframe string, start, end time.Time, cacheTTL time.Duration) ([]*StaticHistoricalOHLC, error) {
	req := &StaticDataRequest{
		ID:       fmt.Sprintf("historical_ohlc_%s_%s_%s_%d_%d", provider, symbol, timeframe, start.Unix(), end.Unix()),
		Type:     HistoricalOHLC,
		Provider: provider,
		Symbol:   symbol,
		Parameters: map[string]interface{}{
			"timeframe": timeframe,
			"start":     start,
			"end":       end,
		},
		Priority: 3,
		CacheTTL: cacheTTL,
	}

	response, err := sdm.GetStaticData(req)
	if err != nil {
		return nil, err
	}

	ohlcData, ok := response.Data.([]*StaticHistoricalOHLC)
	if !ok {
		return nil, fmt.Errorf("invalid data type for historical OHLC")
	}

	return ohlcData, nil
}

// GetGlobalMetrics retrieves global market metrics
func (sdm *StaticDataManager) GetGlobalMetrics(provider string, cacheTTL time.Duration) (*StaticGlobalMetrics, error) {
	req := &StaticDataRequest{
		ID:       fmt.Sprintf("global_metrics_%s", provider),
		Type:     GlobalMetrics,
		Provider: provider,
		Priority: 8,
		CacheTTL: cacheTTL,
	}

	response, err := sdm.GetStaticData(req)
	if err != nil {
		return nil, err
	}

	metrics, ok := response.Data.(*StaticGlobalMetrics)
	if !ok {
		return nil, fmt.Errorf("invalid data type for global metrics")
	}

	return metrics, nil
}

// Stats returns comprehensive statistics
func (sdm *StaticDataManager) Stats() StaticDataStats {
	sdm.mu.RLock()
	defer sdm.mu.RUnlock()

	stats := sdm.stats
	stats.Uptime = time.Since(sdm.startTime)

	// Calculate hit ratio
	if stats.CacheHits+stats.CacheMisses > 0 {
		stats.HitRatio = float64(stats.CacheHits) / float64(stats.CacheHits+stats.CacheMisses)
	}

	return stats
}

// SetCallbacks configures event callbacks for monitoring
func (sdm *StaticDataManager) SetCallbacks(
	onDataRefreshed func(StaticDataType, string, interface{}),
	onCacheHit func(string, StaticDataType),
	onCacheMiss func(string, StaticDataType),
	onProviderError func(string, error),
	onBatchProcessed func(int, time.Duration),
) {
	sdm.mu.Lock()
	defer sdm.mu.Unlock()

	sdm.onDataRefreshed = onDataRefreshed
	sdm.onCacheHit = onCacheHit
	sdm.onCacheMiss = onCacheMiss
	sdm.onProviderError = onProviderError
	sdm.onBatchProcessed = onBatchProcessed
}

// Close gracefully shuts down the static data manager
func (sdm *StaticDataManager) Close() error {
	sdm.batchProcessor.Stop()
	sdm.refreshScheduler.Stop()
	return nil
}

// HealthCheck checks the health of the static data manager
func (sdm *StaticDataManager) HealthCheck() error {
	sdm.mu.RLock()
	defer sdm.mu.RUnlock()

	// Check if we have active providers
	if len(sdm.providers) == 0 {
		return fmt.Errorf("no providers registered")
	}

	// Test at least one provider
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var lastErr error
	healthyProviders := 0

	for name, provider := range sdm.providers {
		if err := provider.HealthCheck(ctx); err != nil {
			lastErr = fmt.Errorf("provider %s health check failed: %w", name, err)
			continue
		}
		healthyProviders++
	}

	if healthyProviders == 0 {
		return fmt.Errorf("all providers are unhealthy, last error: %w", lastErr)
	}

	return nil
}

// Private methods for internal operations

func (sdm *StaticDataManager) generateCacheKey(req *StaticDataRequest) string {
	key := fmt.Sprintf("%s:%s:%s", req.Type, req.Provider, req.Symbol)

	if len(req.Symbols) > 0 {
		key += fmt.Sprintf(":%v", req.Symbols)
	}

	if req.Parameters != nil {
		paramData, _ := json.Marshal(req.Parameters)
		key += fmt.Sprintf(":%s", string(paramData))
	}

	return key
}

func (sdm *StaticDataManager) getCachedData(key string) *StaticDataResponse {
	sdm.mu.RLock()
	defer sdm.mu.RUnlock()

	if cached, exists := sdm.cache[key]; exists {
		// Check expiration
		if time.Now().Before(cached.ExpiresAt) {
			// Create a copy to avoid mutation
			response := *cached
			response.FromCache = true
			return &response
		}

		// Expired - remove from cache
		delete(sdm.cache, key)
	}

	return nil
}

func (sdm *StaticDataManager) setCachedData(key string, response *StaticDataResponse) {
	sdm.mu.Lock()
	defer sdm.mu.Unlock()

	response.CachedAt = time.Now()
	sdm.cache[key] = response

	// Update data size statistics
	if data, err := json.Marshal(response.Data); err == nil {
		response.DataSize = int64(len(data))
		sdm.stats.TotalDataSize += response.DataSize
	}
}

func (sdm *StaticDataManager) processBatch(requests []*BatchRequest) ([]*BatchResponse, error) {
	responses := make([]*BatchResponse, 0, len(requests))

	// Group requests by provider for efficient processing
	providerGroups := make(map[string][]*BatchRequest)
	for _, req := range requests {
		staticReq := req.Data.(*StaticDataRequest)
		if providerGroups[staticReq.Provider] == nil {
			providerGroups[staticReq.Provider] = make([]*BatchRequest, 0)
		}
		providerGroups[staticReq.Provider] = append(providerGroups[staticReq.Provider], req)
	}

	// Process each provider group
	for providerName, providerRequests := range providerGroups {
		provider, exists := sdm.providers[providerName]
		if !exists {
			// Provider not found - create error responses
			for _, req := range providerRequests {
				responses = append(responses, &BatchResponse{
					ID:    req.ID,
					Key:   req.Key,
					Error: fmt.Errorf("provider %s not found", providerName),
				})
			}
			continue
		}

		// Process requests for this provider
		for _, req := range providerRequests {
			response := sdm.processProviderRequest(provider, providerName, req)
			responses = append(responses, response)
		}
	}

	// Update batch statistics
	sdm.stats.BatchesProcessed++
	if sdm.onBatchProcessed != nil {
		sdm.onBatchProcessed(len(requests), time.Since(time.Now()))
	}

	return responses, nil
}

func (sdm *StaticDataManager) processProviderRequest(provider StaticDataProvider, providerName string, req *BatchRequest) *BatchResponse {
	startTime := time.Now()
	staticReq := req.Data.(*StaticDataRequest)

	ctx, cancel := context.WithTimeout(context.Background(), staticReq.Timeout)
	defer cancel()

	var data interface{}
	var err error

	// Route to appropriate provider method based on data type
	switch staticReq.Type {
	case AssetListings:
		limit := staticReq.Parameters["limit"].(int)
		start := staticReq.Parameters["start"].(int)
		data, err = provider.GetAssetListings(ctx, limit, start)

	case TokenMetadata:
		data, err = provider.GetTokenMetadata(ctx, staticReq.Symbols)

	case ExchangeInfo:
		data, err = provider.GetExchangeInfo(ctx, staticReq.Symbol)

	case TradingPairs:
		data, err = provider.GetTradingPairs(ctx, staticReq.Symbol)

	case HistoricalOHLC:
		timeframe := staticReq.Parameters["timeframe"].(string)
		start := staticReq.Parameters["start"].(time.Time)
		end := staticReq.Parameters["end"].(time.Time)
		data, err = provider.GetHistoricalOHLC(ctx, staticReq.Symbol, timeframe, start, end)

	case GlobalMetrics:
		data, err = provider.GetGlobalMetrics(ctx)

	default:
		err = fmt.Errorf("unsupported data type: %s", staticReq.Type)
	}

	duration := time.Since(startTime)

	// Update provider statistics
	sdm.mu.Lock()
	sdm.stats.ProviderRequests[providerName]++
	if err != nil {
		sdm.stats.ProviderErrors[providerName]++
		if sdm.onProviderError != nil {
			sdm.onProviderError(providerName, err)
		}
	}
	sdm.mu.Unlock()

	// Create response
	response := &StaticDataResponse{
		ID:        staticReq.ID,
		Type:      staticReq.Type,
		Provider:  providerName,
		Data:      data,
		Error:     err,
		Duration:  duration,
		FromCache: false,
	}

	// Cache successful responses
	if err == nil && data != nil {
		cacheTTL := staticReq.CacheTTL
		if cacheTTL == 0 {
			cacheTTL = sdm.config.DefaultCacheTTL
		}

		response.ExpiresAt = time.Now().Add(cacheTTL)
		sdm.setCachedData(req.Key, response)

		// Trigger refresh callback
		if sdm.onDataRefreshed != nil {
			sdm.onDataRefreshed(staticReq.Type, providerName, data)
		}
	}

	return &BatchResponse{
		ID:       req.ID,
		Key:      req.Key,
		Data:     response,
		Error:    err,
		Duration: duration,
	}
}

func (sdm *StaticDataManager) recordCacheHit(dataType StaticDataType) {
	sdm.mu.Lock()
	defer sdm.mu.Unlock()

	sdm.stats.CacheHits++
	sdm.stats.DataTypeRequests[dataType]++
}

func (sdm *StaticDataManager) recordCacheMiss(dataType StaticDataType) {
	sdm.mu.Lock()
	defer sdm.mu.Unlock()

	sdm.stats.CacheMisses++
	sdm.stats.DataTypeRequests[dataType]++
}

func (sdm *StaticDataManager) updateStats(dataType StaticDataType, duration time.Duration) {
	sdm.mu.Lock()
	defer sdm.mu.Unlock()

	sdm.stats.TotalRequests++

	// Update average response time
	if sdm.stats.TotalRequests == 1 {
		sdm.stats.AvgResponseTime = duration
	} else {
		sdm.stats.AvgResponseTime = time.Duration(
			(int64(sdm.stats.AvgResponseTime)*int64(sdm.stats.TotalRequests-1) + int64(duration)) / int64(sdm.stats.TotalRequests),
		)
	}
}

// NewRefreshScheduler creates a new refresh scheduler
func NewRefreshScheduler(interval time.Duration, manager *StaticDataManager) *RefreshScheduler {
	rs := &RefreshScheduler{
		schedules: make(map[string]time.Time),
		ticker:    time.NewTicker(interval),
		stopChan:  make(chan struct{}),
	}

	// Start background refresh worker
	go rs.refreshLoop(manager)

	return rs
}

// Stop gracefully shuts down the refresh scheduler
func (rs *RefreshScheduler) Stop() {
	close(rs.stopChan)
	rs.ticker.Stop()
}

func (rs *RefreshScheduler) refreshLoop(manager *StaticDataManager) {
	for {
		select {
		case <-rs.ticker.C:
			// Perform scheduled refreshes
			rs.performScheduledRefreshes(manager)

		case <-rs.stopChan:
			return
		}
	}
}

func (rs *RefreshScheduler) performScheduledRefreshes(manager *StaticDataManager) {
	// Implementation for scheduled refreshes would go here
	// This could include checking cache expiration times and pre-emptively refreshing data
}

// NewBatchProcessor creates a new batch processor (stub implementation)
func NewBatchProcessor(config BatchProcessorConfig, processor func([]*BatchRequest) ([]*BatchResponse, error)) *BatchProcessor {
	// This would be the actual implementation from the batch package
	return &BatchProcessor{}
}

// BatchProcessorConfig configuration for batch processor (stub)
type BatchProcessorConfig struct {
	MaxBatchSize     int
	MinBatchSize     int
	MaxWaitTime      time.Duration
	AdaptiveBatching bool
	Deduplication    bool
	Tracing          bool
}

// BatchRequest represents a batch request (stub)
type BatchRequest struct {
	ID        string
	Key       string
	Data      interface{}
	Priority  int
	Timeout   time.Duration
	CreatedAt time.Time
}

// BatchResponse represents a batch response (stub)
type BatchResponse struct {
	ID       string
	Key      string
	Data     interface{}
	Error    error
	Duration time.Duration
}

// AddRequest adds a request to batch (stub)
func (bp *BatchProcessor) AddRequest(req *BatchRequest) error {
	// Stub implementation
	return nil
}

// Stop stops the batch processor (stub)
func (bp *BatchProcessor) Stop() {
	// Stub implementation
}
