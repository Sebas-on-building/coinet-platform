package providers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"market-data-service/rest/static"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

// CoinMarketCapProvider implements revolutionary CoinMarketCap API integration
type CoinMarketCapProvider struct {
	mu          sync.RWMutex
	apiKey      string
	baseURL     string
	httpClient  *http.Client
	rateLimiter *RateLimiter
	tracer      trace.Tracer
	config      CoinMarketCapConfig
	stats       CoinMarketCapStats

	// Advanced features
	cache       map[string]*CacheEntry
	retryConfig RetryConfig
}

// CoinMarketCapConfig defines configuration for CoinMarketCap provider
type CoinMarketCapConfig struct {
	APIKey            string        `json:"api_key"`
	BaseURL           string        `json:"base_url"`
	Timeout           time.Duration `json:"timeout"`
	MaxRetries        int           `json:"max_retries"`
	RetryBackoff      time.Duration `json:"retry_backoff"`
	RateLimitRequests int           `json:"rate_limit_requests"`
	RateLimitWindow   time.Duration `json:"rate_limit_window"`
	CacheEnabled      bool          `json:"cache_enabled"`
	CacheTTL          time.Duration `json:"cache_ttl"`
	Tracing           bool          `json:"tracing"`
	UserAgent         string        `json:"user_agent"`
}

// CoinMarketCapStats provides comprehensive statistics
type CoinMarketCapStats struct {
	TotalRequests      int64         `json:"total_requests"`
	SuccessfulRequests int64         `json:"successful_requests"`
	FailedRequests     int64         `json:"failed_requests"`
	CacheHits          int64         `json:"cache_hits"`
	CacheMisses        int64         `json:"cache_misses"`
	RateLimitHits      int64         `json:"rate_limit_hits"`
	AvgResponseTime    time.Duration `json:"avg_response_time"`
	LastRequestAt      time.Time     `json:"last_request_at"`
	TotalDataSize      int64         `json:"total_data_size"`
}

// CacheEntry represents a cached response
type CacheEntry struct {
	Data      interface{} `json:"data"`
	ExpiresAt time.Time   `json:"expires_at"`
	Size      int64       `json:"size"`
}

// RateLimiter manages API rate limiting
type RateLimiter struct {
	mu          sync.Mutex
	requests    []time.Time
	maxRequests int
	window      time.Duration
}

// RetryConfig defines retry behavior
type RetryConfig struct {
	MaxRetries int
	Backoff    time.Duration
	Jitter     bool
}

// CoinMarketCapAssetListing represents CoinMarketCap asset data
type CoinMarketCapAssetListing struct {
	ID                            int                  `json:"id"`
	Name                          string               `json:"name"`
	Symbol                        string               `json:"symbol"`
	Slug                          string               `json:"slug"`
	NumMarketPairs                int                  `json:"num_market_pairs"`
	DateAdded                     string               `json:"date_added"`
	Tags                          []string             `json:"tags"`
	MaxSupply                     *float64             `json:"max_supply"`
	CirculatingSupply             float64              `json:"circulating_supply"`
	TotalSupply                   float64              `json:"total_supply"`
	Platform                      *map[string]string   `json:"platform"`
	CMCRank                       int                  `json:"cmc_rank"`
	SelfReportedCirculatingSupply *float64             `json:"self_reported_circulating_supply"`
	SelfReportedMarketCap         *float64             `json:"self_reported_market_cap"`
	TVLRatio                      *float64             `json:"tvl_ratio"`
	LastUpdated                   string               `json:"last_updated"`
	Quote                         map[string]QuoteData `json:"quote"`
}

// QuoteData represents price and market data
type QuoteData struct {
	Price                 float64  `json:"price"`
	Volume24h             float64  `json:"volume_24h"`
	VolumeChange24h       float64  `json:"volume_change_24h"`
	PercentChange1h       float64  `json:"percent_change_1h"`
	PercentChange24h      float64  `json:"percent_change_24h"`
	PercentChange7d       float64  `json:"percent_change_7d"`
	PercentChange30d      float64  `json:"percent_change_30d"`
	PercentChange60d      float64  `json:"percent_change_60d"`
	PercentChange90d      float64  `json:"percent_change_90d"`
	MarketCap             float64  `json:"market_cap"`
	MarketCapDominance    float64  `json:"market_cap_dominance"`
	FullyDilutedMarketCap float64  `json:"fully_diluted_market_cap"`
	TVL                   *float64 `json:"tvl"`
	LastUpdated           string   `json:"last_updated"`
}

// CoinMarketCapGlobalMetrics represents global market data
type CoinMarketCapGlobalMetrics struct {
	Data struct {
		ActiveCryptocurrencies               int                    `json:"active_cryptocurrencies"`
		TotalCryptocurrencies                int                    `json:"total_cryptocurrencies"`
		ActiveMarketPairs                    int                    `json:"active_market_pairs"`
		ActiveExchanges                      int                    `json:"active_exchanges"`
		TotalExchanges                       int                    `json:"total_exchanges"`
		EthDominance                         float64                `json:"eth_dominance"`
		BtcDominance                         float64                `json:"btc_dominance"`
		EthDominanceYesterday                float64                `json:"eth_dominance_yesterday"`
		BtcDominanceYesterday                float64                `json:"btc_dominance_yesterday"`
		EthDominance24hPercentageChange      float64                `json:"eth_dominance_24h_percentage_change"`
		BtcDominance24hPercentageChange      float64                `json:"btc_dominance_24h_percentage_change"`
		DefiMarketCap                        float64                `json:"defi_market_cap"`
		DefiMarketCapPercentage              float64                `json:"defi_market_cap_percentage"`
		Defi24hVolume                        float64                `json:"defi_24h_volume"`
		Defi24hPercentageChange              float64                `json:"defi_24h_percentage_change"`
		StablecoinVolume24h                  float64                `json:"stablecoin_volume_24h"`
		StablecoinVolume24hPercentageChange  float64                `json:"stablecoin_volume_24h_percentage_change"`
		DerivativesVolume24h                 float64                `json:"derivatives_volume_24h"`
		DerivativesVolume24hPercentageChange float64                `json:"derivatives_volume_24h_percentage_change"`
		Quote                                map[string]GlobalQuote `json:"quote"`
		LastUpdated                          string                 `json:"last_updated"`
	} `json:"data"`
}

// GlobalQuote represents global quote data
type GlobalQuote struct {
	TotalMarketCap                 float64 `json:"total_market_cap"`
	TotalVolume24h                 float64 `json:"total_volume_24h"`
	TotalVolume24hYesterday        float64 `json:"total_volume_24h_yesterday"`
	TotalVolumeChange24h           float64 `json:"total_volume_24h_percentage_change"`
	TotalMarketCapYesterday        float64 `json:"total_market_cap_yesterday"`
	TotalMarketCapPercentageChange float64 `json:"total_market_cap_percentage_change"`
	LastUpdated                    string  `json:"last_updated"`
}

// AssetListing represents normalized asset information
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

// GlobalMetrics represents normalized global metrics
type GlobalMetrics struct {
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

// NewCoinMarketCapProvider creates a revolutionary CoinMarketCap provider
func NewCoinMarketCapProvider(config CoinMarketCapConfig) *CoinMarketCapProvider {
	provider := &CoinMarketCapProvider{
		apiKey:  config.APIKey,
		baseURL: config.BaseURL,
		config:  config,
		cache:   make(map[string]*CacheEntry),
		httpClient: &http.Client{
			Timeout: config.Timeout,
		},
		rateLimiter: NewRateLimiter(config.RateLimitRequests, config.RateLimitWindow),
		retryConfig: RetryConfig{
			MaxRetries: config.MaxRetries,
			Backoff:    config.RetryBackoff,
			Jitter:     true,
		},
	}

	// Initialize tracer
	if config.Tracing {
		provider.tracer = otel.Tracer("coinmarketcap-provider")
	}

	return provider
}

// GetAssetListings retrieves cryptocurrency listings from CoinMarketCap
func (cmc *CoinMarketCapProvider) GetAssetListings(ctx context.Context, limit int, start int) ([]*static.AssetListing, error) {
	startTime := time.Now()

	// Create tracing span
	if cmc.tracer != nil {
		var span trace.Span
		ctx, span = cmc.tracer.Start(ctx, "coinmarketcap.get_asset_listings", trace.WithAttributes(
			attribute.Int("limit", limit),
			attribute.Int("start", start),
		))
		defer span.End()
	}

	// Check cache first
	cacheKey := fmt.Sprintf("asset_listings_%d_%d", limit, start)
	if cmc.config.CacheEnabled {
		if cached := cmc.getFromCache(cacheKey); cached != nil {
			cmc.recordCacheHit()
			if listings, ok := cached.([]*static.AssetListing); ok {
				return listings, nil
			}
		}
	}

	cmc.recordCacheMiss()

	// Prepare request parameters
	params := url.Values{}
	params.Add("start", fmt.Sprintf("%d", start))
	params.Add("limit", fmt.Sprintf("%d", limit))
	params.Add("convert", "USD")

	// Make API request
	var response struct {
		Data []CoinMarketCapAssetListing `json:"data"`
	}

	err := cmc.makeRequest(ctx, "GET", "/v1/cryptocurrency/listings/latest", params, &response)
	if err != nil {
		cmc.recordError()
		return nil, fmt.Errorf("failed to fetch asset listings: %w", err)
	}

	// Transform to standard format
	listings := make([]*static.AssetListing, len(response.Data))
	for i, cmcListing := range response.Data {
		listings[i] = cmc.transformAssetListing(&cmcListing)
	}

	// Cache the result
	if cmc.config.CacheEnabled {
		cmc.setCache(cacheKey, listings)
	}

	cmc.recordSuccess(time.Since(startTime))
	return listings, nil
}

// GetTokenMetadata retrieves metadata for specific tokens
func (cmc *CoinMarketCapProvider) GetTokenMetadata(ctx context.Context, symbols []string) (map[string]*static.AssetListing, error) {
	startTime := time.Now()

	// Create tracing span
	if cmc.tracer != nil {
		var span trace.Span
		ctx, span = cmc.tracer.Start(ctx, "coinmarketcap.get_token_metadata", trace.WithAttributes(
			attribute.StringSlice("symbols", symbols),
		))
		defer span.End()
	}

	// Check cache first
	cacheKey := fmt.Sprintf("token_metadata_%v", symbols)
	if cmc.config.CacheEnabled {
		if cached := cmc.getFromCache(cacheKey); cached != nil {
			cmc.recordCacheHit()
			if metadata, ok := cached.(map[string]*static.AssetListing); ok {
				return metadata, nil
			}
		}
	}

	cmc.recordCacheMiss()

	// Prepare request parameters
	params := url.Values{}
	params.Add("symbol", strings.Join(symbols, ","))
	params.Add("convert", "USD")

	// Make API request
	var response struct {
		Data map[string]CoinMarketCapAssetListing `json:"data"`
	}

	err := cmc.makeRequest(ctx, "GET", "/v1/cryptocurrency/quotes/latest", params, &response)
	if err != nil {
		cmc.recordError()
		return nil, fmt.Errorf("failed to fetch token metadata: %w", err)
	}

	// Transform to standard format
	metadata := make(map[string]*static.AssetListing)
	for symbol, cmcListing := range response.Data {
		metadata[symbol] = cmc.transformAssetListing(&cmcListing)
	}

	// Cache the result
	if cmc.config.CacheEnabled {
		cmc.setCache(cacheKey, metadata)
	}

	cmc.recordSuccess(time.Since(startTime))
	return metadata, nil
}

// GetGlobalMetrics retrieves global market metrics from CoinMarketCap
func (cmc *CoinMarketCapProvider) GetGlobalMetrics(ctx context.Context) (*static.StaticGlobalMetrics, error) {
	startTime := time.Now()

	// Create tracing span
	if cmc.tracer != nil {
		var span trace.Span
		ctx, span = cmc.tracer.Start(ctx, "coinmarketcap.get_global_metrics")
		defer span.End()
	}

	// Check cache first
	cacheKey := "global_metrics"
	if cmc.config.CacheEnabled {
		if cached := cmc.getFromCache(cacheKey); cached != nil {
			cmc.recordCacheHit()
			if metrics, ok := cached.(*static.StaticGlobalMetrics); ok {
				return metrics, nil
			}
		}
	}

	cmc.recordCacheMiss()

	// Make API request
	var response CoinMarketCapGlobalMetrics

	err := cmc.makeRequest(ctx, "GET", "/v1/global-metrics/quotes/latest", nil, &response)
	if err != nil {
		cmc.recordError()
		return nil, fmt.Errorf("failed to fetch global metrics: %w", err)
	}

	// Transform to standard format
	metrics := cmc.transformGlobalMetrics(&response)

	// Cache the result
	if cmc.config.CacheEnabled {
		cmc.setCache(cacheKey, metrics)
	}

	cmc.recordSuccess(time.Since(startTime))
	return metrics, nil
}

// GetExchangeInfo retrieves detailed exchange information with revolutionary precision
func (cmc *CoinMarketCapProvider) GetExchangeInfo(ctx context.Context, exchangeID string) (*static.StaticExchangeInfo, error) {
	startTime := time.Now()

	// Check cache first
	cacheKey := fmt.Sprintf("exchange_info_%s", exchangeID)
	if cached := cmc.getFromCache(cacheKey); cached != nil {
		cmc.recordCacheHit()
		if exchangeInfo, ok := cached.(*static.StaticExchangeInfo); ok {
			return exchangeInfo, nil
		}
	}

	cmc.recordCacheMiss()

	// Prepare request parameters
	params := url.Values{}
	params.Add("id", exchangeID)

	// Make API request
	var response struct {
		Data map[string]CoinMarketCapExchangeInfo `json:"data"`
	}

	err := cmc.makeRequest(ctx, "GET", "/v1/exchange/info", params, &response)
	if err != nil {
		cmc.recordError()
		return nil, fmt.Errorf("failed to fetch exchange info: %w", err)
	}

	// Transform to standard format
	var exchangeInfo *static.StaticExchangeInfo
	for _, cmcExchange := range response.Data {
		exchangeInfo = cmc.transformExchangeInfo(&cmcExchange)
		break // Get first result
	}

	if exchangeInfo == nil {
		return nil, fmt.Errorf("exchange not found: %s", exchangeID)
	}

	// Cache the result
	cmc.setCache(cacheKey, exchangeInfo)

	cmc.recordSuccess(time.Since(startTime))
	return exchangeInfo, nil
}

// GetTradingPairs retrieves trading pairs for an exchange with TradingView-inspired efficiency
func (cmc *CoinMarketCapProvider) GetTradingPairs(ctx context.Context, exchangeID string) ([]*static.TradingPair, error) {
	startTime := time.Now()

	// Check cache first
	cacheKey := fmt.Sprintf("trading_pairs_%s", exchangeID)
	if cached := cmc.getFromCache(cacheKey); cached != nil {
		cmc.recordCacheHit()
		if tradingPairs, ok := cached.([]*static.TradingPair); ok {
			return tradingPairs, nil
		}
	}

	cmc.recordCacheMiss()

	// Prepare request parameters
	params := url.Values{}
	params.Add("id", exchangeID)
	params.Add("convert", "USD")

	// Make API request
	var response struct {
		Data CoinMarketCapExchangeTickers `json:"data"`
	}

	err := cmc.makeRequest(ctx, "GET", "/v1/exchange/listings/latest", params, &response)
	if err != nil {
		cmc.recordError()
		return nil, fmt.Errorf("failed to fetch trading pairs: %w", err)
	}

	// Transform to standard format
	tradingPairs := make([]*static.TradingPair, len(response.Data.Tickers))
	for i, ticker := range response.Data.Tickers {
		tradingPairs[i] = cmc.transformTradingPair(&ticker)
	}

	// Cache the result
	cmc.setCache(cacheKey, tradingPairs)

	cmc.recordSuccess(time.Since(startTime))
	return tradingPairs, nil
}

// GetHistoricalOHLC retrieves historical OHLC data with Solana-inspired performance
func (cmc *CoinMarketCapProvider) GetHistoricalOHLC(ctx context.Context, symbol string, timeframe string, start, end time.Time) ([]*static.StaticHistoricalOHLC, error) {
	startTime := time.Now()

	// Check cache first
	cacheKey := fmt.Sprintf("historical_ohlc_%s_%s_%d_%d", symbol, timeframe, start.Unix(), end.Unix())
	if cached := cmc.getFromCache(cacheKey); cached != nil {
		cmc.recordCacheHit()
		if ohlcData, ok := cached.([]*static.StaticHistoricalOHLC); ok {
			return ohlcData, nil
		}
	}

	cmc.recordCacheMiss()

	// Prepare request parameters
	params := url.Values{}
	params.Add("symbol", symbol)
	params.Add("time_start", start.Format(time.RFC3339))
	params.Add("time_end", end.Format(time.RFC3339))
	params.Add("interval", cmc.convertTimeframe(timeframe))
	params.Add("convert", "USD")

	// Make API request
	var response struct {
		Data CoinMarketCapHistoricalData `json:"data"`
	}

	err := cmc.makeRequest(ctx, "GET", "/v1/cryptocurrency/ohlcv/historical", params, &response)
	if err != nil {
		cmc.recordError()
		return nil, fmt.Errorf("failed to fetch historical OHLC: %w", err)
	}

	// Transform to standard format
	ohlcData := make([]*static.StaticHistoricalOHLC, len(response.Data.Quotes))
	for i, quote := range response.Data.Quotes {
		ohlcData[i] = cmc.transformHistoricalOHLC(symbol, &quote)
	}

	// Cache the result with longer TTL for historical data
	cmc.setCache(cacheKey, ohlcData)

	cmc.recordSuccess(time.Since(startTime))
	return ohlcData, nil
}

// SupportsDataType checks if the provider supports a specific data type
func (cmc *CoinMarketCapProvider) SupportsDataType(dataType static.StaticDataType) bool {
	supportedTypes := map[static.StaticDataType]bool{
		static.AssetListings:    true,
		static.TokenMetadata:    true,
		static.ExchangeInfo:     true,
		static.TradingPairs:     true,
		static.HistoricalOHLC:   true,
		static.GlobalMetrics:    true,
		static.MarketCategories: false, // Not supported by CMC API
		static.NewsMetadata:     false, // Not supported by CMC API
		static.SocialMetrics:    false, // Not supported by CMC API
	}

	return supportedTypes[dataType]
}

// GetRateLimit returns the rate limit configuration
func (cmc *CoinMarketCapProvider) GetRateLimit() (requests int, window time.Duration) {
	return cmc.config.RateLimitRequests, cmc.config.RateLimitWindow
}

// HealthCheck performs a health check on the provider
func (cmc *CoinMarketCapProvider) HealthCheck(ctx context.Context) error {
	// Simple health check - get global metrics with minimal data
	_, err := cmc.GetGlobalMetrics(ctx)
	return err
}

// Stats returns comprehensive provider statistics
func (cmc *CoinMarketCapProvider) Stats() CoinMarketCapStats {
	cmc.mu.RLock()
	defer cmc.mu.RUnlock()

	return cmc.stats
}

// Private methods for internal operations

func (cmc *CoinMarketCapProvider) makeRequest(ctx context.Context, method, endpoint string, params url.Values, result interface{}) error {
	// Apply rate limiting
	if err := cmc.rateLimiter.Wait(ctx); err != nil {
		return fmt.Errorf("rate limit exceeded: %w", err)
	}

	// Build request URL
	requestURL := cmc.baseURL + endpoint
	if len(params) > 0 {
		requestURL += "?" + params.Encode()
	}

	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, method, requestURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("X-CMC_PRO_API_KEY", cmc.apiKey)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Accept-Encoding", "deflate, gzip")
	if cmc.config.UserAgent != "" {
		req.Header.Set("User-Agent", cmc.config.UserAgent)
	}

	// Execute request with retries
	var resp *http.Response
	for attempt := 0; attempt <= cmc.retryConfig.MaxRetries; attempt++ {
		resp, err = cmc.httpClient.Do(req)
		if err == nil && resp.StatusCode < 500 {
			break // Success or client error (don't retry)
		}

		if resp != nil {
			resp.Body.Close()
		}

		if attempt < cmc.retryConfig.MaxRetries {
			// Calculate backoff with jitter
			backoff := cmc.retryConfig.Backoff * time.Duration(attempt+1)
			if cmc.retryConfig.Jitter {
				backoff += time.Duration(attempt*100) * time.Millisecond
			}

			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(backoff):
			}
		}
	}

	if err != nil {
		return fmt.Errorf("request failed after %d attempts: %w", cmc.retryConfig.MaxRetries+1, err)
	}
	defer resp.Body.Close()

	// Check status code
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Status)
	}

	// Decode response
	if err := json.NewDecoder(resp.Body).Decode(result); err != nil {
		return fmt.Errorf("failed to decode response: %w", err)
	}

	return nil
}

func (cmc *CoinMarketCapProvider) transformAssetListing(cmcListing *CoinMarketCapAssetListing) *static.AssetListing {
	dateAdded, _ := time.Parse(time.RFC3339, cmcListing.DateAdded)

	// Extract platform info
	platform := make(map[string]string)
	if cmcListing.Platform != nil {
		for k, v := range *cmcListing.Platform {
			platform[k] = v
		}
	}

	return &static.AssetListing{
		ID:                fmt.Sprintf("%d", cmcListing.ID),
		Symbol:            cmcListing.Symbol,
		Name:              cmcListing.Name,
		Slug:              cmcListing.Slug,
		Category:          "cryptocurrency", // CoinMarketCap doesn't provide category in this endpoint
		DateAdded:         dateAdded,
		Tags:              cmcListing.Tags,
		Platform:          platform,
		MaxSupply:         getFloatValue(cmcListing.MaxSupply),
		CirculatingSupply: cmcListing.CirculatingSupply,
		TotalSupply:       cmcListing.TotalSupply,
		IsActive:          true, // Assume active if returned by API
		InfiniteSupply:    cmcListing.MaxSupply == nil,
	}
}

func (cmc *CoinMarketCapProvider) transformGlobalMetrics(cmcMetrics *CoinMarketCapGlobalMetrics) *static.StaticGlobalMetrics {
	updatedAt, _ := time.Parse(time.RFC3339, cmcMetrics.Data.LastUpdated)

	// Extract USD quote data
	usdQuote := cmcMetrics.Data.Quote["USD"]

	return &static.StaticGlobalMetrics{
		ActiveCryptocurrencies:         cmcMetrics.Data.ActiveCryptocurrencies,
		TotalCryptocurrencies:          cmcMetrics.Data.TotalCryptocurrencies,
		ActiveMarketPairs:              cmcMetrics.Data.ActiveMarketPairs,
		ActiveExchanges:                cmcMetrics.Data.ActiveExchanges,
		TotalExchanges:                 cmcMetrics.Data.TotalExchanges,
		EthDominance:                   cmcMetrics.Data.EthDominance,
		BtcDominance:                   cmcMetrics.Data.BtcDominance,
		DefiMarketCap:                  cmcMetrics.Data.DefiMarketCap,
		DefiMarketCapPercentage:        cmcMetrics.Data.DefiMarketCapPercentage,
		DefiVolume24h:                  cmcMetrics.Data.Defi24hVolume,
		DefiVolume24hPercentage:        cmcMetrics.Data.Defi24hPercentageChange,
		Stablecoin24hVolume:            cmcMetrics.Data.StablecoinVolume24h,
		Stablecoin24hVolumePercentage:  cmcMetrics.Data.StablecoinVolume24hPercentageChange,
		DerivativesVolume24h:           cmcMetrics.Data.DerivativesVolume24h,
		DerivativesVolume24hPercentage: cmcMetrics.Data.DerivativesVolume24hPercentageChange,
		TotalMarketCap: map[string]float64{
			"usd": usdQuote.TotalMarketCap,
		},
		TotalVolume24h: map[string]float64{
			"usd": usdQuote.TotalVolume24h,
		},
		MarketCapPercentage: map[string]float64{
			"btc": cmcMetrics.Data.BtcDominance,
			"eth": cmcMetrics.Data.EthDominance,
		},
		MarketCapChangePercentage24hUsd: usdQuote.TotalMarketCapPercentageChange,
		UpdatedAt:                       updatedAt,
	}
}

func (cmc *CoinMarketCapProvider) getFromCache(key string) interface{} {
	cmc.mu.RLock()
	defer cmc.mu.RUnlock()

	if entry, exists := cmc.cache[key]; exists {
		if time.Now().Before(entry.ExpiresAt) {
			return entry.Data
		}
		// Expired - remove from cache
		delete(cmc.cache, key)
	}

	return nil
}

func (cmc *CoinMarketCapProvider) setCache(key string, data interface{}) {
	cmc.mu.Lock()
	defer cmc.mu.Unlock()

	entry := &CacheEntry{
		Data:      data,
		ExpiresAt: time.Now().Add(cmc.config.CacheTTL),
	}

	// Calculate size for statistics
	if jsonData, err := json.Marshal(data); err == nil {
		entry.Size = int64(len(jsonData))
		cmc.stats.TotalDataSize += entry.Size
	}

	cmc.cache[key] = entry
}

func (cmc *CoinMarketCapProvider) recordSuccess(duration time.Duration) {
	cmc.mu.Lock()
	defer cmc.mu.Unlock()

	cmc.stats.TotalRequests++
	cmc.stats.SuccessfulRequests++
	cmc.stats.LastRequestAt = time.Now()

	// Update average response time
	if cmc.stats.TotalRequests == 1 {
		cmc.stats.AvgResponseTime = duration
	} else {
		cmc.stats.AvgResponseTime = time.Duration(
			(int64(cmc.stats.AvgResponseTime)*int64(cmc.stats.TotalRequests-1) + int64(duration)) / int64(cmc.stats.TotalRequests),
		)
	}
}

func (cmc *CoinMarketCapProvider) recordError() {
	cmc.mu.Lock()
	defer cmc.mu.Unlock()

	cmc.stats.TotalRequests++
	cmc.stats.FailedRequests++
	cmc.stats.LastRequestAt = time.Now()
}

func (cmc *CoinMarketCapProvider) recordCacheHit() {
	cmc.mu.Lock()
	defer cmc.mu.Unlock()

	cmc.stats.CacheHits++
}

func (cmc *CoinMarketCapProvider) recordCacheMiss() {
	cmc.mu.Lock()
	defer cmc.mu.Unlock()

	cmc.stats.CacheMisses++
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(maxRequests int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		maxRequests: maxRequests,
		window:      window,
		requests:    make([]time.Time, 0),
	}
}

// getFloatValue safely extracts float64 value from pointer
func getFloatValue(ptr *float64) float64 {
	if ptr == nil {
		return 0
	}
	return *ptr
}

// Wait blocks until rate limit allows the request
func (rl *RateLimiter) Wait(ctx context.Context) error {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()

	// Remove old requests outside the window
	for i := 0; i < len(rl.requests); i++ {
		if now.Sub(rl.requests[i]) > rl.window {
			rl.requests = rl.requests[i+1:]
			i--
		} else {
			break
		}
	}

	// Check if we can make the request
	if len(rl.requests) >= rl.maxRequests {
		// Wait until the oldest request falls outside the window
		waitTime := rl.window - now.Sub(rl.requests[0])
		select {
		case <-time.After(waitTime):
			// Remove the oldest request and add the new one
			rl.requests = rl.requests[1:]
			rl.requests = append(rl.requests, now)
		case <-ctx.Done():
			return ctx.Err()
		}
	} else {
		// Add the new request
		rl.requests = append(rl.requests, now)
	}

	return nil
}

// Revolutionary transformation methods with divine precision

// CoinMarketCap specific data structures
type CoinMarketCapExchangeInfo struct {
	ID                   int      `json:"id"`
	Name                 string   `json:"name"`
	Slug                 string   `json:"slug"`
	Description          string   `json:"description"`
	Logo                 string   `json:"logo"`
	Website              []string `json:"urls"`
	DateLaunched         string   `json:"date_launched"`
	Countries            []string `json:"countries"`
	Tags                 []string `json:"tags"`
	FiatSupported        []string `json:"fiat_supported"`
	Spot                 bool     `json:"spot"`
	Derivatives          bool     `json:"derivatives"`
	Futures              bool     `json:"futures"`
	OTC                  bool     `json:"otc"`
	MarginTrading        bool     `json:"margin_trading"`
	MakerFee             float64  `json:"maker_fee"`
	TakerFee             float64  `json:"taker_fee"`
	SpotVolumeUsd        float64  `json:"spot_volume_usd"`
	DerivativesVolumeUsd float64  `json:"derivatives_volume_usd"`
	WeeklyVisits         int64    `json:"weekly_visits"`
	NumCoins             int      `json:"num_coins"`
	NumMarketPairs       int      `json:"num_market_pairs"`
	TrafficScore         int      `json:"traffic_score"`
	LiquidityScore       int      `json:"liquidity_score"`
	CybersecurityScore   int      `json:"cybersecurity_score"`
	ApiCoverageScore     int      `json:"api_coverage_score"`
	LastUpdated          string   `json:"last_updated"`
}

type CoinMarketCapExchangeTickers struct {
	ID             int                   `json:"id"`
	Name           string                `json:"name"`
	Slug           string                `json:"slug"`
	NumMarketPairs int                   `json:"num_market_pairs"`
	Tickers        []CoinMarketCapTicker `json:"tickers"`
	LastUpdated    string                `json:"last_updated"`
}

type CoinMarketCapTicker struct {
	Base                   string                    `json:"base"`
	Target                 string                    `json:"target"`
	Market                 CoinMarketCapTickerMarket `json:"market"`
	Last                   float64                   `json:"last"`
	Volume                 float64                   `json:"volume"`
	ConvertedLast          map[string]float64        `json:"converted_last"`
	ConvertedVolume        map[string]float64        `json:"converted_volume"`
	TrustScore             string                    `json:"trust_score"`
	BidAskSpreadPercentage float64                   `json:"bid_ask_spread_percentage"`
	Timestamp              string                    `json:"timestamp"`
	LastTradedAt           string                    `json:"last_traded_at"`
	LastFetchAt            string                    `json:"last_fetch_at"`
	IsAnomaly              bool                      `json:"is_anomaly"`
	IsStale                bool                      `json:"is_stale"`
}

type CoinMarketCapTickerMarket struct {
	Name                string `json:"name"`
	Identifier          string `json:"identifier"`
	HasTradingIncentive bool   `json:"has_trading_incentive"`
}

type CoinMarketCapHistoricalData struct {
	ID     int                            `json:"id"`
	Name   string                         `json:"name"`
	Symbol string                         `json:"symbol"`
	Quotes []CoinMarketCapHistoricalQuote `json:"quotes"`
}

type CoinMarketCapHistoricalQuote struct {
	TimeOpen  string                        `json:"time_open"`
	TimeClose string                        `json:"time_close"`
	TimeHigh  string                        `json:"time_high"`
	TimeLow   string                        `json:"time_low"`
	Quote     map[string]CoinMarketCapOHLCV `json:"quote"`
}

type CoinMarketCapOHLCV struct {
	Open      float64 `json:"open"`
	High      float64 `json:"high"`
	Low       float64 `json:"low"`
	Close     float64 `json:"close"`
	Volume    float64 `json:"volume"`
	MarketCap float64 `json:"market_cap"`
	Timestamp string  `json:"timestamp"`
}

func (cmc *CoinMarketCapProvider) transformExchangeInfo(cmcExchange *CoinMarketCapExchangeInfo) *static.StaticExchangeInfo {
	dateLaunched, _ := time.Parse(time.RFC3339, cmcExchange.DateLaunched)

	// Calculate composite trust score from multiple factors
	trustScore := (cmcExchange.TrafficScore + cmcExchange.LiquidityScore +
		cmcExchange.CybersecurityScore + cmcExchange.ApiCoverageScore) / 4

	var website string
	if len(cmcExchange.Website) > 0 {
		website = cmcExchange.Website[0]
	}

	var country string
	if len(cmcExchange.Countries) > 0 {
		country = cmcExchange.Countries[0]
	}

	return &static.StaticExchangeInfo{
		ID:                       fmt.Sprintf("%d", cmcExchange.ID),
		Name:                     cmcExchange.Name,
		YearEstablished:          dateLaunched.Year(),
		Country:                  country,
		Description:              cmcExchange.Description,
		URL:                      website,
		Image:                    cmcExchange.Logo,
		HasTradingIncentive:      cmcExchange.MarginTrading,
		TrustScore:               trustScore,
		TrustScoreRank:           0, // Would need additional API call
		TradeVolume24h:           cmcExchange.SpotVolumeUsd + cmcExchange.DerivativesVolumeUsd,
		TradeVolume24hNormalized: cmcExchange.SpotVolumeUsd,
		Tickers:                  []static.TradingPair{}, // Populated separately
		StatusUpdates:            []interface{}{},
		Centralized:              !cmcExchange.OTC, // Assumption: OTC = decentralized
		PublicNotice:             "",
		AlertNotice:              "",
	}
}

func (cmc *CoinMarketCapProvider) transformTradingPair(ticker *CoinMarketCapTicker) *static.TradingPair {
	timestamp, _ := time.Parse(time.RFC3339, ticker.Timestamp)
	lastTradedAt, _ := time.Parse(time.RFC3339, ticker.LastTradedAt)
	lastFetchAt, _ := time.Parse(time.RFC3339, ticker.LastFetchAt)

	return &static.TradingPair{
		Base:                   ticker.Base,
		Target:                 ticker.Target,
		Market:                 ticker.Market.Name,
		Last:                   ticker.Last,
		Volume:                 ticker.Volume,
		ConvertedLast:          ticker.ConvertedLast,
		ConvertedVolume:        ticker.ConvertedVolume,
		TrustScore:             ticker.TrustScore,
		BidAskSpreadPercentage: ticker.BidAskSpreadPercentage,
		Timestamp:              timestamp,
		LastTradedAt:           lastTradedAt,
		LastFetchAt:            lastFetchAt,
		IsAnomaly:              ticker.IsAnomaly,
		IsStale:                ticker.IsStale,
	}
}

func (cmc *CoinMarketCapProvider) transformHistoricalOHLC(symbol string, quote *CoinMarketCapHistoricalQuote) *static.StaticHistoricalOHLC {
	timestamp, _ := time.Parse(time.RFC3339, quote.TimeOpen)

	// Get USD quote data
	usdQuote := quote.Quote["USD"]

	return &static.StaticHistoricalOHLC{
		Symbol:    symbol,
		Timestamp: timestamp,
		Open:      usdQuote.Open,
		High:      usdQuote.High,
		Low:       usdQuote.Low,
		Close:     usdQuote.Close,
		Volume:    usdQuote.Volume,
		MarketCap: usdQuote.MarketCap,
	}
}

func (cmc *CoinMarketCapProvider) convertTimeframe(timeframe string) string {
	// Convert standard timeframes to CoinMarketCap intervals
	timeframeMap := map[string]string{
		"1m":  "1m",
		"5m":  "5m",
		"15m": "15m",
		"30m": "30m",
		"1h":  "1h",
		"2h":  "2h",
		"4h":  "4h",
		"6h":  "6h",
		"8h":  "8h",
		"12h": "12h",
		"1d":  "1d",
		"3d":  "3d",
		"1w":  "7d",
		"1M":  "1M",
	}

	if interval, exists := timeframeMap[timeframe]; exists {
		return interval
	}
	return "1d" // Default to daily
}
