package providers

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"market-data-service/rest/static"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
)

// CoinbaseProvider implements revolutionary Coinbase Advanced Trade API integration
type CoinbaseProvider struct {
	mu          sync.RWMutex
	apiKey      string
	secretKey   string
	passphrase  string
	baseURL     string
	sandboxURL  string
	httpClient  *http.Client
	rateLimiter *CoinbaseRateLimiter
	tracer      trace.Tracer
	config      CoinbaseConfig
	stats       CoinbaseStats

	// Advanced features with Apple-inspired precision
	cache          map[string]*CoinbaseCacheEntry
	retryConfig    CoinbaseRetryConfig
	weightManager  *CoinbaseWeightManager
	streamManager  *CoinbaseStreamManager
	signatureCache map[string]string
}

// CoinbaseConfig defines revolutionary configuration for Coinbase provider
type CoinbaseConfig struct {
	APIKey               string        `json:"api_key"`
	SecretKey            string        `json:"secret_key"`
	Passphrase           string        `json:"passphrase"`
	BaseURL              string        `json:"base_url"`
	SandboxURL           string        `json:"sandbox_url"`
	UseSandbox           bool          `json:"use_sandbox"`
	Timeout              time.Duration `json:"timeout"`
	MaxRetries           int           `json:"max_retries"`
	RetryBackoff         time.Duration `json:"retry_backoff"`
	RequestsPerSecond    int           `json:"requests_per_second"`
	BurstLimit           int           `json:"burst_limit"`
	CacheEnabled         bool          `json:"cache_enabled"`
	CacheTTL             time.Duration `json:"cache_ttl"`
	Tracing              bool          `json:"tracing"`
	UserAgent            string        `json:"user_agent"`
	EnableStreaming      bool          `json:"enable_streaming"`
	StreamReconnectDelay time.Duration `json:"stream_reconnect_delay"`
	MaxStreamConnections int           `json:"max_stream_connections"`
	EnableAdvancedAuth   bool          `json:"enable_advanced_auth"`
}

// CoinbaseStats tracks comprehensive statistics with TradingView-level precision
type CoinbaseStats struct {
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
	StreamStats         StreamStats              `json:"stream_stats"`
	AuthenticationStats AuthStats                `json:"authentication_stats"`
}

// AuthStats tracks authentication-related statistics
type AuthStats struct {
	TotalAuthRequests    int64         `json:"total_auth_requests"`
	SuccessfulAuth       int64         `json:"successful_auth"`
	FailedAuth           int64         `json:"failed_auth"`
	SignatureGenerated   int64         `json:"signature_generated"`
	AvgSignatureTime     time.Duration `json:"avg_signature_time"`
	LastAuthAttempt      time.Time     `json:"last_auth_attempt"`
	ConsecutiveAuthFails int           `json:"consecutive_auth_fails"`
}

// CoinbaseCacheEntry represents cached data with Canva-level organization
type CoinbaseCacheEntry struct {
	Data         interface{} `json:"data"`
	ExpiresAt    time.Time   `json:"expires_at"`
	Size         int64       `json:"size"`
	Endpoint     string      `json:"endpoint"`
	LastAccessed time.Time   `json:"last_accessed"`
	AccessCount  int64       `json:"access_count"`
	CacheHits    int64       `json:"cache_hits"`
}

// CoinbaseRetryConfig defines retry behavior with Solana-grade reliability
type CoinbaseRetryConfig struct {
	MaxRetries    int           `json:"max_retries"`
	BaseBackoff   time.Duration `json:"base_backoff"`
	MaxBackoff    time.Duration `json:"max_backoff"`
	BackoffFactor float64       `json:"backoff_factor"`
	Jitter        bool          `json:"jitter"`
	RetryOn       []int         `json:"retry_on"` // HTTP status codes to retry on
}

// CoinbaseRateLimiter manages API rate limiting with divine precision
type CoinbaseRateLimiter struct {
	mu                   sync.Mutex
	requests             []time.Time
	maxRequestsPerSecond int
	burstLimit           int
	currentBurst         int
	lastReset            time.Time
}

// CoinbaseWeightManager tracks API usage patterns
type CoinbaseWeightManager struct {
	mu        sync.RWMutex
	usage     map[string]int64 // endpoint -> usage count
	resetTime time.Time
	callbacks []func(endpoint string, usage int64)
}

// CoinbaseStreamManager handles WebSocket connections
type CoinbaseStreamManager struct {
	mu      sync.RWMutex
	streams map[string]*CoinbaseStream
	config  CoinbaseConfig
	stats   StreamStats
}

// CoinbaseStream represents a WebSocket stream
type CoinbaseStream struct {
	Symbol       string
	StreamType   string
	Connection   interface{} // WebSocket connection
	LastMessage  time.Time
	MessageCount int64
	IsActive     bool
}

// API Response Structures - Coinbase Advanced Trade API

// CoinbaseProduct represents a trading product
type CoinbaseProduct struct {
	ProductID                 string   `json:"product_id"`
	Price                     string   `json:"price"`
	PricePercentageChange24h  string   `json:"price_percentage_change_24h"`
	Volume24h                 string   `json:"volume_24h"`
	VolumePercentageChange24h string   `json:"volume_percentage_change_24h"`
	BaseIncrement             string   `json:"base_increment"`
	QuoteIncrement            string   `json:"quote_increment"`
	QuoteMinSize              string   `json:"quote_min_size"`
	QuoteMaxSize              string   `json:"quote_max_size"`
	BaseMinSize               string   `json:"base_min_size"`
	BaseMaxSize               string   `json:"base_max_size"`
	BaseName                  string   `json:"base_name"`
	QuoteName                 string   `json:"quote_name"`
	Watched                   bool     `json:"watched"`
	IsDisabled                bool     `json:"is_disabled"`
	New                       bool     `json:"new"`
	Status                    string   `json:"status"`
	CancelOnly                bool     `json:"cancel_only"`
	LimitOnly                 bool     `json:"limit_only"`
	PostOnly                  bool     `json:"post_only"`
	TradingDisabled           bool     `json:"trading_disabled"`
	AuctionMode               bool     `json:"auction_mode"`
	ProductType               string   `json:"product_type"`
	QuoteCurrencyID           string   `json:"quote_currency_id"`
	BaseCurrencyID            string   `json:"base_currency_id"`
	MidMarketPrice            string   `json:"mid_market_price"`
	Alias                     string   `json:"alias"`
	AliasTo                   []string `json:"alias_to"`
	BaseDisplaySymbol         string   `json:"base_display_symbol"`
	QuoteDisplaySymbol        string   `json:"quote_display_symbol"`
}

// CoinbaseProductsResponse wraps the products API response
type CoinbaseProductsResponse struct {
	Products    []CoinbaseProduct   `json:"products"`
	NumProducts int                 `json:"num_products"`
	Pagination  *CoinbasePagination `json:"pagination,omitempty"`
}

// CoinbasePagination represents pagination information
type CoinbasePagination struct {
	Limit         int    `json:"limit"`
	Order         string `json:"order"`
	StartingAfter string `json:"starting_after,omitempty"`
	EndingBefore  string `json:"ending_before,omitempty"`
	HasNext       bool   `json:"has_next"`
}

// CoinbaseTicker represents market ticker data
type CoinbaseTicker struct {
	Trades  []CoinbaseTrade `json:"trades"`
	BestBid CoinbaseBidAsk  `json:"best_bid"`
	BestAsk CoinbaseBidAsk  `json:"best_ask"`
}

// CoinbaseTrade represents a recent trade
type CoinbaseTrade struct {
	TradeID   string    `json:"trade_id"`
	ProductID string    `json:"product_id"`
	Price     string    `json:"price"`
	Size      string    `json:"size"`
	Time      time.Time `json:"time"`
	Side      string    `json:"side"`
	Bid       string    `json:"bid"`
	Ask       string    `json:"ask"`
}

// CoinbaseBidAsk represents bid/ask data
type CoinbaseBidAsk struct {
	Price string `json:"price"`
	Size  string `json:"size"`
}

// CoinbaseCandle represents historical price data
type CoinbaseCandle struct {
	Start  int64  `json:"start"`
	Low    string `json:"low"`
	High   string `json:"high"`
	Open   string `json:"open"`
	Close  string `json:"close"`
	Volume string `json:"volume"`
}

// CoinbaseCandlesResponse wraps the candles API response
type CoinbaseCandlesResponse struct {
	Candles []CoinbaseCandle `json:"candles"`
}

// CoinbaseCurrency represents currency information
type CoinbaseCurrency struct {
	CurrencyID        string                     `json:"currency_id"`
	Name              string                     `json:"name"`
	MinSize           string                     `json:"min_size"`
	Status            string                     `json:"status"`
	MaxPrecision      string                     `json:"max_precision"`
	ConvertibleTo     []string                   `json:"convertible_to"`
	Details           CoinbaseCurrencyDetails    `json:"details"`
	DefaultNetwork    string                     `json:"default_network"`
	SupportedNetworks []CoinbaseSupportedNetwork `json:"supported_networks"`
}

// CoinbaseCurrencyDetails represents detailed currency information
type CoinbaseCurrencyDetails struct {
	Type                  string   `json:"type"`
	Symbol                string   `json:"symbol"`
	NetworkConfirmations  int      `json:"network_confirmations"`
	SortOrder             int      `json:"sort_order"`
	CryptoAddressLink     string   `json:"crypto_address_link"`
	CryptoTransactionLink string   `json:"crypto_transaction_link"`
	PushPaymentMethods    []string `json:"push_payment_methods"`
	GroupTypes            []string `json:"group_types"`
	DisplayName           string   `json:"display_name"`
	Color                 string   `json:"color"`
	Exponent              int      `json:"exponent"`
}

// CoinbaseSupportedNetwork represents supported blockchain networks
type CoinbaseSupportedNetwork struct {
	ID                    string `json:"id"`
	Name                  string `json:"name"`
	Status                string `json:"status"`
	ContractAddress       string `json:"contract_address"`
	CryptoAddressLink     string `json:"crypto_address_link"`
	CryptoTransactionLink string `json:"crypto_transaction_link"`
	MinWithdrawalAmount   string `json:"min_withdrawal_amount"`
	MaxWithdrawalAmount   string `json:"max_withdrawal_amount"`
	NetworkConfirmations  int    `json:"network_confirmations"`
	ProcessingTimeSeconds int    `json:"processing_time_seconds"`
}

// CoinbaseCurrenciesResponse wraps the currencies API response
type CoinbaseCurrenciesResponse struct {
	Currencies []CoinbaseCurrency `json:"currencies"`
}

// NewCoinbaseProvider creates a new revolutionary Coinbase provider
func NewCoinbaseProvider(config CoinbaseConfig) *CoinbaseProvider {
	// Set defaults with Apple-level attention to detail
	if config.BaseURL == "" {
		config.BaseURL = "https://api.coinbase.com/api/v3/brokerage"
	}
	if config.SandboxURL == "" {
		config.SandboxURL = "https://api-public.sandbox.pro.coinbase.com"
	}
	if config.Timeout == 0 {
		config.Timeout = 30 * time.Second
	}
	if config.MaxRetries == 0 {
		config.MaxRetries = 3
	}
	if config.RetryBackoff == 0 {
		config.RetryBackoff = time.Second
	}
	if config.RequestsPerSecond == 0 {
		config.RequestsPerSecond = 10 // Coinbase default
	}
	if config.BurstLimit == 0 {
		config.BurstLimit = 20
	}
	if config.CacheTTL == 0 {
		config.CacheTTL = 5 * time.Minute
	}
	if config.UserAgent == "" {
		config.UserAgent = "Coinet-Revolutionary-Market-Data/1.0"
	}

	// Initialize HTTP client with divine precision
	httpClient := &http.Client{
		Timeout: config.Timeout,
		Transport: &http.Transport{
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 10,
			IdleConnTimeout:     90 * time.Second,
		},
	}

	// Initialize tracer if enabled
	var tracer trace.Tracer
	if config.Tracing {
		tracer = otel.Tracer("coinbase-provider")
	}

	provider := &CoinbaseProvider{
		apiKey:      config.APIKey,
		secretKey:   config.SecretKey,
		passphrase:  config.Passphrase,
		baseURL:     config.BaseURL,
		sandboxURL:  config.SandboxURL,
		httpClient:  httpClient,
		rateLimiter: NewCoinbaseRateLimiter(config.RequestsPerSecond, config.BurstLimit),
		tracer:      tracer,
		config:      config,
		stats: CoinbaseStats{
			EndpointStats:       make(map[string]EndpointStats),
			StreamStats:         StreamStats{},
			AuthenticationStats: AuthStats{},
		},
		cache: make(map[string]*CoinbaseCacheEntry),
		retryConfig: CoinbaseRetryConfig{
			MaxRetries:    config.MaxRetries,
			BaseBackoff:   config.RetryBackoff,
			MaxBackoff:    30 * time.Second,
			BackoffFactor: 2.0,
			Jitter:        true,
			RetryOn:       []int{429, 502, 503, 504},
		},
		weightManager:  NewCoinbaseWeightManager(),
		streamManager:  NewCoinbaseStreamManager(config),
		signatureCache: make(map[string]string),
	}

	return provider
}

// GetAssetListings retrieves asset listings with revolutionary precision
func (cp *CoinbaseProvider) GetAssetListings(ctx context.Context, limit int, start int) ([]*static.AssetListing, error) {
	span := cp.startSpan(ctx, "GetAssetListings")
	defer span.End()

	cacheKey := fmt.Sprintf("asset_listings_%d_%d", limit, start)
	if cached := cp.getFromCache(cacheKey); cached != nil {
		if listings, ok := cached.([]*static.AssetListing); ok {
			cp.recordCacheHit("products")
			return listings, nil
		}
	}
	cp.recordCacheMiss("products")

	// Get products and currencies in parallel for efficiency
	var products []CoinbaseProduct
	var currencies []CoinbaseCurrency
	var productsErr, currenciesErr error

	// Use goroutines for parallel requests - Solana-grade performance
	done := make(chan struct{}, 2)

	go func() {
		defer func() { done <- struct{}{} }()
		productsResp, err := cp.getProducts(ctx, limit, start)
		if err != nil {
			productsErr = err
			return
		}
		products = productsResp.Products
	}()

	go func() {
		defer func() { done <- struct{}{} }()
		currenciesResp, err := cp.getCurrencies(ctx)
		if err != nil {
			currenciesErr = err
			return
		}
		currencies = currenciesResp.Currencies
	}()

	// Wait for both requests to complete
	<-done
	<-done

	if productsErr != nil {
		return nil, fmt.Errorf("failed to get products: %w", productsErr)
	}
	if currenciesErr != nil {
		return nil, fmt.Errorf("failed to get currencies: %w", currenciesErr)
	}

	// Transform to standard format with Apple-level attention to detail
	listings := cp.transformAssetListings(products, currencies, limit, start)

	// Cache with intelligent expiration
	cp.setCache(cacheKey, listings, "products")

	return listings, nil
}

// GetTokenMetadata retrieves token metadata with TradingView precision
func (cp *CoinbaseProvider) GetTokenMetadata(ctx context.Context, symbols []string) (map[string]*static.AssetListing, error) {
	span := cp.startSpan(ctx, "GetTokenMetadata")
	defer span.End()

	cacheKey := fmt.Sprintf("token_metadata_%s", strings.Join(symbols, ","))
	if cached := cp.getFromCache(cacheKey); cached != nil {
		if metadata, ok := cached.(map[string]*static.AssetListing); ok {
			cp.recordCacheHit("currencies")
			return metadata, nil
		}
	}
	cp.recordCacheMiss("currencies")

	// Get all currencies for efficient lookup
	currenciesResp, err := cp.getCurrencies(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get currencies: %w", err)
	}

	// Transform to metadata format
	metadata := cp.transformTokenMetadata(currenciesResp.Currencies, symbols)

	// Cache with intelligent expiration
	cp.setCache(cacheKey, metadata, "currencies")

	return metadata, nil
}

// GetExchangeInfo retrieves exchange information with Canva-level organization
func (cp *CoinbaseProvider) GetExchangeInfo(ctx context.Context, exchangeID string) (*static.StaticExchangeInfo, error) {
	span := cp.startSpan(ctx, "GetExchangeInfo")
	defer span.End()

	cacheKey := fmt.Sprintf("exchange_info_%s", exchangeID)
	if cached := cp.getFromCache(cacheKey); cached != nil {
		if info, ok := cached.(*static.StaticExchangeInfo); ok {
			cp.recordCacheHit("exchange_info")
			return info, nil
		}
	}
	cp.recordCacheMiss("exchange_info")

	// Get products to calculate trading volume
	productsResp, err := cp.getProducts(ctx, 1000, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to get products for exchange info: %w", err)
	}

	// Transform to standard format
	info := cp.transformExchangeInfo(productsResp.Products)

	// Cache with extended expiration
	cp.setCache(cacheKey, info, "exchange_info")

	return info, nil
}

// GetTradingPairs retrieves trading pairs with divine precision
func (cp *CoinbaseProvider) GetTradingPairs(ctx context.Context, exchangeID string) ([]*static.TradingPair, error) {
	span := cp.startSpan(ctx, "GetTradingPairs")
	defer span.End()

	cacheKey := fmt.Sprintf("trading_pairs_%s", exchangeID)
	if cached := cp.getFromCache(cacheKey); cached != nil {
		if pairs, ok := cached.([]*static.TradingPair); ok {
			cp.recordCacheHit("products")
			return pairs, nil
		}
	}
	cp.recordCacheMiss("products")

	// Get all products with market data
	productsResp, err := cp.getProducts(ctx, 1000, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to get products: %w", err)
	}

	// Transform to trading pairs
	pairs := cp.transformTradingPairs(productsResp.Products)

	// Cache results
	cp.setCache(cacheKey, pairs, "products")

	return pairs, nil
}

// GetHistoricalOHLC retrieves historical OHLC data with Solana-grade reliability
func (cp *CoinbaseProvider) GetHistoricalOHLC(ctx context.Context, symbol string, timeframe string, start, end time.Time) ([]*static.StaticHistoricalOHLC, error) {
	span := cp.startSpan(ctx, "GetHistoricalOHLC")
	defer span.End()

	cacheKey := fmt.Sprintf("historical_ohlc_%s_%s_%d_%d", symbol, timeframe, start.Unix(), end.Unix())
	if cached := cp.getFromCache(cacheKey); cached != nil {
		if ohlc, ok := cached.([]*static.StaticHistoricalOHLC); ok {
			cp.recordCacheHit("candles")
			return ohlc, nil
		}
	}
	cp.recordCacheMiss("candles")

	// Convert timeframe to Coinbase format
	granularity := cp.convertTimeframe(timeframe)

	// Get candles data
	candlesResp, err := cp.getCandles(ctx, symbol, granularity, start, end)
	if err != nil {
		return nil, fmt.Errorf("failed to get candles: %w", err)
	}

	// Transform to OHLC format
	ohlcData := cp.transformHistoricalOHLC(symbol, candlesResp.Candles)

	// Cache results
	cp.setCache(cacheKey, ohlcData, "candles")

	return ohlcData, nil
}

// GetGlobalMetrics returns nil as Coinbase doesn't provide global metrics
func (cp *CoinbaseProvider) GetGlobalMetrics(ctx context.Context) (*static.StaticGlobalMetrics, error) {
	return nil, fmt.Errorf("global metrics not supported by Coinbase provider")
}

// SupportsDataType checks if the provider supports a specific data type
func (cp *CoinbaseProvider) SupportsDataType(dataType static.StaticDataType) bool {
	supportedTypes := map[static.StaticDataType]bool{
		static.AssetListings:     true,
		static.TokenMetadata:     true,
		static.ExchangeInfo:      true,
		static.TradingPairs:      true,
		static.HistoricalOHLC:    true,
		static.MarketCategories:  false,
		static.MarketCapRankings: false,
		static.GlobalMetrics:     false,
		static.NewsMetadata:      false,
		static.SocialMetrics:     false,
	}

	return supportedTypes[dataType]
}

// GetRateLimit returns the current rate limit configuration
func (cp *CoinbaseProvider) GetRateLimit() (requests int, window time.Duration) {
	return cp.config.RequestsPerSecond, time.Second
}

// HealthCheck performs a health check with minimal resource usage
func (cp *CoinbaseProvider) HealthCheck(ctx context.Context) error {
	// Use the products endpoint with minimal data
	_, err := cp.getProducts(ctx, 1, 0)
	if err != nil {
		return fmt.Errorf("coinbase health check failed: %w", err)
	}
	return nil
}

// Stats returns comprehensive provider statistics
func (cp *CoinbaseProvider) Stats() CoinbaseStats {
	cp.mu.RLock()
	defer cp.mu.RUnlock()

	// Calculate hit ratio
	totalRequests := cp.stats.CacheHits + cp.stats.CacheMisses
	if totalRequests > 0 {
		cp.stats.AuthenticationStats.TotalAuthRequests = totalRequests
	}

	return cp.stats
}

// Helper functions for revolutionary functionality

// NewCoinbaseRateLimiter creates a new rate limiter
func NewCoinbaseRateLimiter(requestsPerSecond, burstLimit int) *CoinbaseRateLimiter {
	return &CoinbaseRateLimiter{
		requests:             make([]time.Time, 0),
		maxRequestsPerSecond: requestsPerSecond,
		burstLimit:           burstLimit,
		lastReset:            time.Now(),
	}
}

// NewCoinbaseWeightManager creates a new weight manager
func NewCoinbaseWeightManager() *CoinbaseWeightManager {
	return &CoinbaseWeightManager{
		usage:     make(map[string]int64),
		resetTime: time.Now().Add(time.Hour), // Reset hourly
		callbacks: make([]func(endpoint string, usage int64), 0),
	}
}

// NewCoinbaseStreamManager creates a new stream manager
func NewCoinbaseStreamManager(config CoinbaseConfig) *CoinbaseStreamManager {
	return &CoinbaseStreamManager{
		streams: make(map[string]*CoinbaseStream),
		config:  config,
		stats:   StreamStats{},
	}
}

// Helper methods for API communication and data transformation

// startSpan creates a new OpenTelemetry span for tracing
func (cp *CoinbaseProvider) startSpan(ctx context.Context, operation string) trace.Span {
	if cp.tracer != nil {
		_, span := cp.tracer.Start(ctx, operation)
		return span
	}
	return trace.SpanFromContext(ctx)
}

// getFromCache retrieves data from cache
func (cp *CoinbaseProvider) getFromCache(key string) interface{} {
	cp.mu.RLock()
	defer cp.mu.RUnlock()

	entry, exists := cp.cache[key]
	if !exists || time.Now().After(entry.ExpiresAt) {
		return nil
	}

	// Update access statistics
	entry.LastAccessed = time.Now()
	entry.AccessCount++
	entry.CacheHits++

	return entry.Data
}

// setCache stores data in cache with expiration
func (cp *CoinbaseProvider) setCache(key string, data interface{}, endpoint string) {
	cp.mu.Lock()
	defer cp.mu.Unlock()

	cp.cache[key] = &CoinbaseCacheEntry{
		Data:         data,
		ExpiresAt:    time.Now().Add(cp.config.CacheTTL),
		Size:         int64(len(fmt.Sprintf("%v", data))),
		Endpoint:     endpoint,
		LastAccessed: time.Now(),
		AccessCount:  1,
		CacheHits:    0,
	}
}

// recordCacheHit records a cache hit for statistics
func (cp *CoinbaseProvider) recordCacheHit(endpoint string) {
	cp.mu.Lock()
	defer cp.mu.Unlock()

	cp.stats.CacheHits++

	if ep, exists := cp.stats.EndpointStats[endpoint]; exists {
		ep.LastAccessed = time.Now()
		cp.stats.EndpointStats[endpoint] = ep
	} else {
		cp.stats.EndpointStats[endpoint] = EndpointStats{
			LastAccessed: time.Now(),
		}
	}
}

// recordCacheMiss records a cache miss for statistics
func (cp *CoinbaseProvider) recordCacheMiss(endpoint string) {
	cp.mu.Lock()
	defer cp.mu.Unlock()

	cp.stats.CacheMisses++

	if ep, exists := cp.stats.EndpointStats[endpoint]; exists {
		ep.LastAccessed = time.Now()
		cp.stats.EndpointStats[endpoint] = ep
	} else {
		cp.stats.EndpointStats[endpoint] = EndpointStats{
			LastAccessed: time.Now(),
		}
	}
}

// recordSuccess records a successful API call
func (cp *CoinbaseProvider) recordSuccess(endpoint string, duration time.Duration) {
	cp.mu.Lock()
	defer cp.mu.Unlock()

	cp.stats.TotalRequests++
	cp.stats.SuccessfulRequests++
	cp.stats.LastRequestAt = time.Now()

	// Update average response time
	if cp.stats.AvgResponseTime == 0 {
		cp.stats.AvgResponseTime = duration
	} else {
		cp.stats.AvgResponseTime = (cp.stats.AvgResponseTime + duration) / 2
	}

	// Update endpoint statistics
	ep := cp.stats.EndpointStats[endpoint]
	ep.RequestCount++
	ep.SuccessCount++
	ep.LastAccessed = time.Now()
	if ep.AvgResponseTime == 0 {
		ep.AvgResponseTime = duration
	} else {
		ep.AvgResponseTime = (ep.AvgResponseTime + duration) / 2
	}
	cp.stats.EndpointStats[endpoint] = ep
}

// recordError records a failed API call
func (cp *CoinbaseProvider) recordError(endpoint string, duration time.Duration) {
	cp.mu.Lock()
	defer cp.mu.Unlock()

	cp.stats.TotalRequests++
	cp.stats.FailedRequests++
	cp.stats.LastRequestAt = time.Now()

	// Update endpoint statistics
	ep := cp.stats.EndpointStats[endpoint]
	ep.RequestCount++
	ep.ErrorCount++
	ep.LastAccessed = time.Now()
	cp.stats.EndpointStats[endpoint] = ep
}

// API Communication Methods

// getProducts retrieves products from Coinbase API
func (cp *CoinbaseProvider) getProducts(ctx context.Context, limit, offset int) (*CoinbaseProductsResponse, error) {
	endpoint := "products"
	startTime := time.Now()

	// Wait for rate limiter
	if err := cp.rateLimiter.Wait(ctx); err != nil {
		return nil, fmt.Errorf("rate limit exceeded: %w", err)
	}

	// Build URL with parameters
	baseURL := cp.getBaseURL()
	params := url.Values{}
	if limit > 0 {
		params.Set("limit", strconv.Itoa(limit))
	}
	if offset > 0 {
		params.Set("offset", strconv.Itoa(offset))
	}
	params.Set("product_type", "SPOT")

	fullURL := fmt.Sprintf("%s/%s?%s", baseURL, endpoint, params.Encode())

	// Create request
	req, err := http.NewRequestWithContext(ctx, "GET", fullURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Add headers
	cp.addHeaders(req)

	// Execute request with retry
	resp, err := cp.executeWithRetry(req)
	if err != nil {
		cp.recordError(endpoint, time.Since(startTime))
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	// Parse response
	var productsResp CoinbaseProductsResponse
	if err := json.NewDecoder(resp.Body).Decode(&productsResp); err != nil {
		cp.recordError(endpoint, time.Since(startTime))
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	cp.recordSuccess(endpoint, time.Since(startTime))
	return &productsResp, nil
}

// getCurrencies retrieves currencies from Coinbase API
func (cp *CoinbaseProvider) getCurrencies(ctx context.Context) (*CoinbaseCurrenciesResponse, error) {
	endpoint := "currencies"
	startTime := time.Now()

	// Wait for rate limiter
	if err := cp.rateLimiter.Wait(ctx); err != nil {
		return nil, fmt.Errorf("rate limit exceeded: %w", err)
	}

	// Build URL
	baseURL := cp.getBaseURL()
	fullURL := fmt.Sprintf("%s/%s", baseURL, endpoint)

	// Create request
	req, err := http.NewRequestWithContext(ctx, "GET", fullURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Add headers
	cp.addHeaders(req)

	// Execute request with retry
	resp, err := cp.executeWithRetry(req)
	if err != nil {
		cp.recordError(endpoint, time.Since(startTime))
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	// Parse response
	var currenciesResp CoinbaseCurrenciesResponse
	if err := json.NewDecoder(resp.Body).Decode(&currenciesResp); err != nil {
		cp.recordError(endpoint, time.Since(startTime))
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	cp.recordSuccess(endpoint, time.Since(startTime))
	return &currenciesResp, nil
}

// getCandles retrieves historical candle data
func (cp *CoinbaseProvider) getCandles(ctx context.Context, symbol, granularity string, start, end time.Time) (*CoinbaseCandlesResponse, error) {
	endpoint := fmt.Sprintf("products/%s/candles", symbol)
	startTime := time.Now()

	// Wait for rate limiter
	if err := cp.rateLimiter.Wait(ctx); err != nil {
		return nil, fmt.Errorf("rate limit exceeded: %w", err)
	}

	// Build URL with parameters
	baseURL := cp.getBaseURL()
	params := url.Values{}
	params.Set("start", strconv.FormatInt(start.Unix(), 10))
	params.Set("end", strconv.FormatInt(end.Unix(), 10))
	params.Set("granularity", granularity)

	fullURL := fmt.Sprintf("%s/%s?%s", baseURL, endpoint, params.Encode())

	// Create request
	req, err := http.NewRequestWithContext(ctx, "GET", fullURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Add headers
	cp.addHeaders(req)

	// Execute request with retry
	resp, err := cp.executeWithRetry(req)
	if err != nil {
		cp.recordError(endpoint, time.Since(startTime))
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	// Parse response
	var candlesResp CoinbaseCandlesResponse
	if err := json.NewDecoder(resp.Body).Decode(&candlesResp); err != nil {
		cp.recordError(endpoint, time.Since(startTime))
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	cp.recordSuccess(endpoint, time.Since(startTime))
	return &candlesResp, nil
}

// getBaseURL returns the appropriate base URL
func (cp *CoinbaseProvider) getBaseURL() string {
	if cp.config.UseSandbox {
		return cp.sandboxURL
	}
	return cp.baseURL
}

// addHeaders adds required headers to the request
func (cp *CoinbaseProvider) addHeaders(req *http.Request) {
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", cp.config.UserAgent)

	// Add authentication headers if API key is provided
	if cp.apiKey != "" {
		timestamp := strconv.FormatInt(time.Now().Unix(), 10)
		message := timestamp + req.Method + req.URL.Path
		if req.URL.RawQuery != "" {
			message += "?" + req.URL.RawQuery
		}

		signature := cp.generateSignature(message)

		req.Header.Set("CB-ACCESS-KEY", cp.apiKey)
		req.Header.Set("CB-ACCESS-SIGN", signature)
		req.Header.Set("CB-ACCESS-TIMESTAMP", timestamp)
		req.Header.Set("CB-ACCESS-PASSPHRASE", cp.passphrase)
	}
}

// generateSignature generates HMAC-SHA256 signature for authentication
func (cp *CoinbaseProvider) generateSignature(message string) string {
	// Check cache first
	cp.mu.RLock()
	if cached, exists := cp.signatureCache[message]; exists {
		cp.mu.RUnlock()
		return cached
	}
	cp.mu.RUnlock()

	// Generate new signature
	key, _ := base64.StdEncoding.DecodeString(cp.secretKey)
	h := hmac.New(sha256.New, key)
	h.Write([]byte(message))
	signature := base64.StdEncoding.EncodeToString(h.Sum(nil))

	// Cache signature
	cp.mu.Lock()
	cp.signatureCache[message] = signature
	cp.stats.AuthenticationStats.SignatureGenerated++
	cp.mu.Unlock()

	return signature
}

// executeWithRetry executes HTTP request with retry logic
func (cp *CoinbaseProvider) executeWithRetry(req *http.Request) (*http.Response, error) {
	var lastErr error

	for attempt := 0; attempt <= cp.retryConfig.MaxRetries; attempt++ {
		if attempt > 0 {
			backoff := cp.calculateBackoff(attempt)
			time.Sleep(backoff)
		}

		resp, err := cp.httpClient.Do(req)
		if err != nil {
			lastErr = err
			continue
		}

		// Check if we should retry based on status code
		if cp.shouldRetry(resp.StatusCode) {
			resp.Body.Close()
			lastErr = fmt.Errorf("HTTP %d", resp.StatusCode)
			continue
		}

		return resp, nil
	}

	return nil, fmt.Errorf("max retries exceeded: %w", lastErr)
}

// calculateBackoff calculates exponential backoff with jitter
func (cp *CoinbaseProvider) calculateBackoff(attempt int) time.Duration {
	backoff := cp.retryConfig.BaseBackoff
	for i := 0; i < attempt; i++ {
		backoff = time.Duration(float64(backoff) * cp.retryConfig.BackoffFactor)
		if backoff > cp.retryConfig.MaxBackoff {
			backoff = cp.retryConfig.MaxBackoff
			break
		}
	}

	// Add jitter if enabled
	if cp.retryConfig.Jitter {
		jitter := time.Duration(float64(backoff) * 0.1)
		nanoFactor := float64(time.Now().UnixNano()) / 1e9
		jitterAmount := float64(jitter) * (2.0*nanoFactor - 1.0)
		backoff += time.Duration(jitterAmount)
	}

	return backoff
}

// shouldRetry checks if request should be retried based on status code
func (cp *CoinbaseProvider) shouldRetry(statusCode int) bool {
	for _, code := range cp.retryConfig.RetryOn {
		if statusCode == code {
			return true
		}
	}
	return false
}

// convertTimeframe converts standard timeframe to Coinbase granularity
func (cp *CoinbaseProvider) convertTimeframe(timeframe string) string {
	timeframeMap := map[string]string{
		"1m":  "ONE_MINUTE",
		"5m":  "FIVE_MINUTE",
		"15m": "FIFTEEN_MINUTE",
		"1h":  "ONE_HOUR",
		"6h":  "SIX_HOUR",
		"1d":  "ONE_DAY",
	}

	if mapped, exists := timeframeMap[timeframe]; exists {
		return mapped
	}
	return "ONE_HOUR" // Default
}

// Data Transformation Methods

// transformAssetListings transforms products and currencies to asset listings
func (cp *CoinbaseProvider) transformAssetListings(products []CoinbaseProduct, currencies []CoinbaseCurrency, limit, start int) []*static.AssetListing {
	var listings []*static.AssetListing

	// Create currency lookup map
	currencyMap := make(map[string]CoinbaseCurrency)
	for _, currency := range currencies {
		currencyMap[currency.CurrencyID] = currency
	}

	// Apply pagination
	endIndex := start + limit
	if endIndex > len(products) {
		endIndex = len(products)
	}
	if start >= len(products) {
		return listings
	}

	paginatedProducts := products[start:endIndex]

	for _, product := range paginatedProducts {
		// Skip non-active products
		if product.IsDisabled || product.TradingDisabled {
			continue
		}

		// Get base currency details
		baseCurrency, hasCurrency := currencyMap[product.BaseCurrencyID]

		listing := &static.AssetListing{
			ID:       fmt.Sprintf("coinbase-%s", product.BaseCurrencyID),
			Symbol:   product.BaseCurrencyID,
			Name:     product.BaseName,
			Slug:     strings.ToLower(product.BaseCurrencyID),
			Category: "cryptocurrency",
			Tags:     []string{"coinbase", "spot"},
			Platform: map[string]string{
				"id":   "coinbase",
				"name": "Coinbase",
			},
			DateAdded: time.Now(),
			IsActive:  !product.IsDisabled,
		}

		// Add currency details if available
		if hasCurrency {
			listing.Name = baseCurrency.Name
			if baseCurrency.Details.DisplayName != "" {
				listing.Name = baseCurrency.Details.DisplayName
			}
			listing.Description = fmt.Sprintf("Min size: %s, Status: %s", baseCurrency.MinSize, baseCurrency.Status)
		}

		// Parse pricing information
		if price, err := strconv.ParseFloat(product.Price, 64); err == nil && price > 0 {
			listing.Description += fmt.Sprintf(" - Current price: $%.2f", price)
		}

		listings = append(listings, listing)
	}

	return listings
}

// transformTokenMetadata transforms currencies to token metadata
func (cp *CoinbaseProvider) transformTokenMetadata(currencies []CoinbaseCurrency, symbols []string) map[string]*static.AssetListing {
	metadata := make(map[string]*static.AssetListing)

	// Create symbol lookup
	symbolSet := make(map[string]bool)
	for _, symbol := range symbols {
		symbolSet[strings.ToUpper(symbol)] = true
	}

	for _, currency := range currencies {
		upperSymbol := strings.ToUpper(currency.CurrencyID)

		// Filter by requested symbols
		if len(symbols) > 0 && !symbolSet[upperSymbol] {
			continue
		}

		listing := &static.AssetListing{
			ID:       fmt.Sprintf("coinbase-%s", currency.CurrencyID),
			Symbol:   currency.CurrencyID,
			Name:     currency.Name,
			Slug:     strings.ToLower(currency.CurrencyID),
			Category: currency.Details.Type,
			Tags:     []string{"coinbase"},
			Platform: map[string]string{
				"id":   "coinbase",
				"name": "Coinbase",
			},
			DateAdded:   time.Now(),
			Description: fmt.Sprintf("Status: %s, Min size: %s", currency.Status, currency.MinSize),
			IsActive:    currency.Status == "online",
		}

		// Add network information
		if len(currency.SupportedNetworks) > 0 {
			networks := make([]string, len(currency.SupportedNetworks))
			for i, network := range currency.SupportedNetworks {
				networks[i] = network.Name
			}
			listing.Description += fmt.Sprintf(" - Networks: %s", strings.Join(networks, ", "))
		}

		metadata[currency.CurrencyID] = listing
	}

	return metadata
}

// transformExchangeInfo transforms products to exchange info
func (cp *CoinbaseProvider) transformExchangeInfo(products []CoinbaseProduct) *static.StaticExchangeInfo {
	var totalVolume float64
	activePairs := 0

	for _, product := range products {
		if !product.IsDisabled && !product.TradingDisabled {
			activePairs++
			if volume, err := strconv.ParseFloat(product.Volume24h, 64); err == nil {
				totalVolume += volume
			}
		}
	}

	return &static.StaticExchangeInfo{
		ID:                       "coinbase",
		Name:                     "Coinbase",
		YearEstablished:          2012,
		Country:                  "United States",
		Description:              "Coinbase is a digital currency exchange headquartered in San Francisco, California, United States.",
		URL:                      "https://www.coinbase.com",
		Image:                    "https://assets.coingecko.com/markets/images/23/small/Coinbase_Coin_Primary.png",
		HasTradingIncentive:      false,
		TrustScore:               10,
		TrustScoreRank:           2,
		TradeVolume24h:           totalVolume,
		TradeVolume24hNormalized: totalVolume,
		Tickers:                  []static.TradingPair{},
		StatusUpdates:            []interface{}{},
		Centralized:              true,
		PublicNotice:             "",
		AlertNotice:              "",
	}
}

// transformTradingPairs transforms products to trading pairs
func (cp *CoinbaseProvider) transformTradingPairs(products []CoinbaseProduct) []*static.TradingPair {
	var pairs []*static.TradingPair

	for _, product := range products {
		// Skip disabled products
		if product.IsDisabled || product.TradingDisabled {
			continue
		}

		// Parse values
		lastPrice, _ := strconv.ParseFloat(product.Price, 64)
		volume, _ := strconv.ParseFloat(product.Volume24h, 64)
		priceChange, _ := strconv.ParseFloat(product.PricePercentageChange24h, 64)

		// Calculate spread (approximation)
		var spread float64
		if midPrice, err := strconv.ParseFloat(product.MidMarketPrice, 64); err == nil && midPrice > 0 {
			spread = 0.01 // Approximate 1 basis point for Coinbase
		}

		pair := &static.TradingPair{
			Base:   product.BaseCurrencyID,
			Target: product.QuoteCurrencyID,
			Market: "coinbase",
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
			IsAnomaly:              priceChange > 50 || priceChange < -50,
			IsStale:                false,
		}

		pairs = append(pairs, pair)
	}

	return pairs
}

// transformHistoricalOHLC transforms candles to OHLC data
func (cp *CoinbaseProvider) transformHistoricalOHLC(symbol string, candles []CoinbaseCandle) []*static.StaticHistoricalOHLC {
	var ohlcData []*static.StaticHistoricalOHLC

	for _, candle := range candles {
		// Parse values
		open, _ := strconv.ParseFloat(candle.Open, 64)
		high, _ := strconv.ParseFloat(candle.High, 64)
		low, _ := strconv.ParseFloat(candle.Low, 64)
		close, _ := strconv.ParseFloat(candle.Close, 64)
		volume, _ := strconv.ParseFloat(candle.Volume, 64)

		ohlc := &static.StaticHistoricalOHLC{
			Symbol:    symbol,
			Timestamp: time.Unix(candle.Start, 0),
			Open:      open,
			High:      high,
			Low:       low,
			Close:     close,
			Volume:    volume,
			MarketCap: 0, // Not provided by Coinbase
		}

		ohlcData = append(ohlcData, ohlc)
	}

	// Sort by timestamp ascending
	sort.Slice(ohlcData, func(i, j int) bool {
		return ohlcData[i].Timestamp.Before(ohlcData[j].Timestamp)
	})

	return ohlcData
}

// Rate Limiter Methods

// Wait implements rate limiting with burst support
func (crl *CoinbaseRateLimiter) Wait(ctx context.Context) error {
	crl.mu.Lock()
	defer crl.mu.Unlock()

	now := time.Now()

	// Clean up old requests (older than 1 second)
	cutoff := now.Add(-time.Second)
	filtered := crl.requests[:0]
	for _, reqTime := range crl.requests {
		if reqTime.After(cutoff) {
			filtered = append(filtered, reqTime)
		}
	}
	crl.requests = filtered

	// Check if we can make a request
	if len(crl.requests) >= crl.maxRequestsPerSecond {
		// Calculate wait time
		oldestRequest := crl.requests[0]
		waitTime := time.Second - now.Sub(oldestRequest)

		if waitTime > 0 {
			// Wait for the required time
			timer := time.NewTimer(waitTime)
			defer timer.Stop()

			select {
			case <-timer.C:
				// Continue after waiting
			case <-ctx.Done():
				return ctx.Err()
			}
		}
	}

	// Add current request
	crl.requests = append(crl.requests, now)
	return nil
}
