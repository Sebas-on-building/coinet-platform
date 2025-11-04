// =========================================================
// REVOLUTIONARY COINMARKETCAP SOURCE IMPLEMENTATION
// Sub-Feature: Source Interface Integration & Unified Data Streaming
// =========================================================

package exchange

import (
	"context"
	"log"
	"strings"
	"sync"
	"time"
)

// ==========================================
// SUB-SUB-FEATURE: CoinMarketCap Source
// ==========================================

type CoinMarketCapSource struct {
	registry       *CoinMarketCapRegistry
	ctx            context.Context
	cancel         context.CancelFunc
	tickerInterval time.Duration
	symbols        []string
	activeStreams  map[string]chan Tick
	mu             sync.RWMutex
	isRunning      bool
	streamBuffer   chan Tick
	bufferSize     int
}

// ==========================================
// SUB-SUB-FEATURE: Constructor & Configuration
// ==========================================

func NewCoinMarketCapSource() *CoinMarketCapSource {
	ctx, cancel := context.WithCancel(context.Background())

	source := &CoinMarketCapSource{
		registry:       NewCoinMarketCapRegistry(),
		ctx:            ctx,
		cancel:         cancel,
		tickerInterval: 60 * time.Second, // Poll every minute
		symbols:        []string{"BTC", "ETH", "BNB", "ADA", "SOL", "XRP", "DOT", "DOGE", "AVAX", "MATIC"},
		activeStreams:  make(map[string]chan Tick),
		bufferSize:     1000,
		streamBuffer:   make(chan Tick, 1000),
	}

	return source
}

func NewCoinMarketCapSourceWithSymbols(symbols []string) *CoinMarketCapSource {
	source := NewCoinMarketCapSource()
	source.symbols = symbols
	return source
}

// ==========================================
// SUB-SUB-FEATURE: Source Interface Implementation
// ==========================================

func (cms *CoinMarketCapSource) Stream(ctx context.Context) <-chan Tick {
	cms.mu.Lock()
	defer cms.mu.Unlock()

	if cms.isRunning {
		return cms.streamBuffer
	}

	// Start the registry
	if err := cms.registry.Start(ctx); err != nil {
		log.Printf("Failed to start CoinMarketCap registry: %v", err)
		close(cms.streamBuffer)
		return cms.streamBuffer
	}

	cms.isRunning = true

	// Start streaming goroutines
	go cms.startMarketDataStreaming(ctx)
	go cms.startGlobalMetricsStreaming(ctx)
	go cms.startMarketInsightsStreaming(ctx)

	log.Printf("CoinMarketCap Source started streaming %d symbols", len(cms.symbols))

	return cms.streamBuffer
}

// ==========================================
// SUB-SUB-FEATURE: Market Data Streaming
// ==========================================

func (cms *CoinMarketCapSource) startMarketDataStreaming(ctx context.Context) {
	defer func() {
		cms.mu.Lock()
		cms.isRunning = false
		close(cms.streamBuffer)
		cms.mu.Unlock()
	}()

	ticker := time.NewTicker(cms.tickerInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("CoinMarketCap market data streaming stopped")
			return
		case <-ticker.C:
			cms.fetchAndStreamTickers(ctx)
		}
	}
}

func (cms *CoinMarketCapSource) fetchAndStreamTickers(ctx context.Context) {
	// Fetch cryptocurrency listings
	listings, err := cms.registry.GetCryptocurrencyListings(ctx, 100, "USD")
	if err != nil {
		log.Printf("Failed to fetch CoinMarketCap listings: %v", err)
		return
	}

	// Convert listings to ticks and stream
	for _, listing := range listings {
		if cms.shouldIncludeSymbol(listing.Symbol) {
			if usdQuote, ok := listing.Quote["USD"]; ok {
				timestamp, _ := time.Parse(time.RFC3339, usdQuote.LastUpdated)

				tick := Tick{
					Symbol:    listing.Symbol,
					Timestamp: timestamp,
					Price:     usdQuote.Price,
					Volume:    usdQuote.Volume24h,
				}

				select {
				case cms.streamBuffer <- tick:
				case <-ctx.Done():
					return
				default:
					// Buffer full, skip this tick
					log.Printf("Stream buffer full, skipping tick for %s", listing.Symbol)
				}
			}
		}
	}

	log.Printf("Streamed %d CoinMarketCap tickers", len(listings))
}

func (cms *CoinMarketCapSource) shouldIncludeSymbol(symbol string) bool {
	if len(cms.symbols) == 0 {
		return true // Include all if no filter
	}

	for _, s := range cms.symbols {
		if strings.EqualFold(s, symbol) {
			return true
		}
	}
	return false
}

// ==========================================
// SUB-SUB-FEATURE: Global Metrics Streaming
// ==========================================

func (cms *CoinMarketCapSource) startGlobalMetricsStreaming(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Minute) // Every 5 minutes
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			cms.streamGlobalMetrics(ctx)
		}
	}
}

func (cms *CoinMarketCapSource) streamGlobalMetrics(ctx context.Context) {
	globalMetrics, err := cms.registry.GetGlobalMetrics(ctx)
	if err != nil {
		log.Printf("Failed to fetch global metrics: %v", err)
		return
	}

	// Convert global metrics to synthetic ticks
	if usdQuote, ok := globalMetrics.TotalMarketCap["USD"]; ok {
		timestamp, _ := time.Parse(time.RFC3339, usdQuote.LastUpdated)

		// Total market cap tick
		marketCapTick := Tick{
			Symbol:    "TOTAL_MARKET_CAP",
			Timestamp: timestamp,
			Price:     usdQuote.MarketCap,
			Volume:    usdQuote.Volume24h,
		}

		select {
		case cms.streamBuffer <- marketCapTick:
		case <-ctx.Done():
			return
		default:
		}

		// BTC dominance tick
		btcDominanceTick := Tick{
			Symbol:    "BTC_DOMINANCE",
			Timestamp: timestamp,
			Price:     globalMetrics.BtcDominance,
			Volume:    0,
		}

		select {
		case cms.streamBuffer <- btcDominanceTick:
		case <-ctx.Done():
			return
		default:
		}

		// ETH dominance tick
		ethDominanceTick := Tick{
			Symbol:    "ETH_DOMINANCE",
			Timestamp: timestamp,
			Price:     globalMetrics.EthDominance,
			Volume:    0,
		}

		select {
		case cms.streamBuffer <- ethDominanceTick:
		case <-ctx.Done():
			return
		default:
		}
	}

	log.Println("Streamed global metrics as synthetic ticks")
}

// ==========================================
// SUB-SUB-FEATURE: Market Insights Streaming
// ==========================================

func (cms *CoinMarketCapSource) startMarketInsightsStreaming(ctx context.Context) {
	ticker := time.NewTicker(10 * time.Minute) // Every 10 minutes
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			cms.streamMarketInsights(ctx)
		}
	}
}

func (cms *CoinMarketCapSource) streamMarketInsights(ctx context.Context) {
	insights, err := cms.registry.GetMarketInsights()
	if err != nil {
		log.Printf("Failed to fetch market insights: %v", err)
		return
	}

	// Convert insights to synthetic metrics ticks
	riskTick := Tick{
		Symbol:    "MARKET_RISK_LEVEL",
		Timestamp: insights.Timestamp,
		Price:     cms.riskLevelToNumeric(insights.RiskLevel),
		Volume:    0,
	}

	select {
	case cms.streamBuffer <- riskTick:
	case <-ctx.Done():
		return
	default:
	}

	trendTick := Tick{
		Symbol:    "MARKET_TREND_STRENGTH",
		Timestamp: insights.Timestamp,
		Price:     cms.marketTrendToNumeric(insights.MarketTrend),
		Volume:    insights.ActiveTradingIntensity,
	}

	select {
	case cms.streamBuffer <- trendTick:
	case <-ctx.Done():
		return
	default:
	}

	log.Println("Streamed market insights as synthetic ticks")
}

func (cms *CoinMarketCapSource) riskLevelToNumeric(riskLevel string) float64 {
	switch riskLevel {
	case "Low":
		return 1.0
	case "Moderate":
		return 2.0
	case "High":
		return 3.0
	case "Very High":
		return 4.0
	default:
		return 0.0
	}
}

func (cms *CoinMarketCapSource) marketTrendToNumeric(trend string) float64 {
	switch trend {
	case "Strongly Bearish":
		return -2.0
	case "Bearish":
		return -1.0
	case "Sideways":
		return 0.0
	case "Bullish":
		return 1.0
	case "Strongly Bullish":
		return 2.0
	default:
		return 0.0
	}
}

// ==========================================
// SUB-SUB-FEATURE: Advanced Streaming Features
// ==========================================

func (cms *CoinMarketCapSource) AddSymbol(symbol string) {
	cms.mu.Lock()
	defer cms.mu.Unlock()

	for _, s := range cms.symbols {
		if strings.EqualFold(s, symbol) {
			return // Already exists
		}
	}

	cms.symbols = append(cms.symbols, strings.ToUpper(symbol))
	log.Printf("Added symbol %s to CoinMarketCap streaming", symbol)
}

func (cms *CoinMarketCapSource) RemoveSymbol(symbol string) {
	cms.mu.Lock()
	defer cms.mu.Unlock()

	for i, s := range cms.symbols {
		if strings.EqualFold(s, symbol) {
			cms.symbols = append(cms.symbols[:i], cms.symbols[i+1:]...)
			log.Printf("Removed symbol %s from CoinMarketCap streaming", symbol)
			return
		}
	}
}

func (cms *CoinMarketCapSource) GetSymbols() []string {
	cms.mu.RLock()
	defer cms.mu.RUnlock()

	symbols := make([]string, len(cms.symbols))
	copy(symbols, cms.symbols)
	return symbols
}

func (cms *CoinMarketCapSource) SetTickerInterval(interval time.Duration) {
	cms.mu.Lock()
	defer cms.mu.Unlock()

	cms.tickerInterval = interval
	log.Printf("Set CoinMarketCap ticker interval to %s", interval)
}

// ==========================================
// SUB-SUB-FEATURE: Market Analysis on Demand
// ==========================================

func (cms *CoinMarketCapSource) GetMarketAnalysis(ctx context.Context, symbol string) (*MarketAnalysis, error) {
	return cms.registry.GetMarketAnalysis(ctx, symbol)
}

func (cms *CoinMarketCapSource) GetGlobalMetrics(ctx context.Context) (*GlobalMetrics, error) {
	return cms.registry.GetGlobalMetrics(ctx)
}

func (cms *CoinMarketCapSource) GetDeFiMetrics(ctx context.Context) (*DeFiMetrics, error) {
	return cms.registry.GetDeFiMetrics(ctx)
}

func (cms *CoinMarketCapSource) GetMarketInsights() (*MarketInsights, error) {
	return cms.registry.GetMarketInsights()
}

// ==========================================
// SUB-SUB-FEATURE: Health & Performance Monitoring
// ==========================================

func (cms *CoinMarketCapSource) GetHealthStatus() *HealthStatus {
	return cms.registry.GetHealthStatus()
}

func (cms *CoinMarketCapSource) GetPerformanceMetrics() *PerformanceMetrics {
	return cms.registry.GetPerformanceMetrics()
}

func (cms *CoinMarketCapSource) IsHealthy() bool {
	health := cms.registry.GetHealthStatus()
	return health.Overall == "Excellent" || health.Overall == "Good"
}

func (cms *CoinMarketCapSource) GetStatus() map[string]interface{} {
	cms.mu.RLock()
	defer cms.mu.RUnlock()

	return map[string]interface{}{
		"is_running":      cms.isRunning,
		"symbols_count":   len(cms.symbols),
		"symbols":         cms.symbols,
		"ticker_interval": cms.tickerInterval.String(),
		"buffer_size":     cms.bufferSize,
		"buffer_usage":    len(cms.streamBuffer),
		"registry_status": cms.registry.GetRegistryStatus(),
	}
}

// ==========================================
// SUB-SUB-FEATURE: Graceful Shutdown
// ==========================================

func (cms *CoinMarketCapSource) Stop() {
	cms.mu.Lock()
	defer cms.mu.Unlock()

	if !cms.isRunning {
		return
	}

	log.Println("Stopping CoinMarketCap Source...")

	cms.cancel()
	cms.registry.Stop()

	// Close all active streams
	for symbol, ch := range cms.activeStreams {
		close(ch)
		delete(cms.activeStreams, symbol)
	}

	cms.isRunning = false
	log.Println("CoinMarketCap Source stopped successfully")
}

// ==========================================
// SUB-SUB-FEATURE: Utility Functions
// ==========================================

func (cms *CoinMarketCapSource) ExportConfiguration() map[string]interface{} {
	cms.mu.RLock()
	defer cms.mu.RUnlock()

	return map[string]interface{}{
		"ticker_interval": cms.tickerInterval.String(),
		"symbols":         cms.symbols,
		"buffer_size":     cms.bufferSize,
		"is_running":      cms.isRunning,
	}
}

func (cms *CoinMarketCapSource) ImportConfiguration(config map[string]interface{}) error {
	cms.mu.Lock()
	defer cms.mu.Unlock()

	if intervalStr, ok := config["ticker_interval"].(string); ok {
		if interval, err := time.ParseDuration(intervalStr); err == nil {
			cms.tickerInterval = interval
		}
	}

	if symbols, ok := config["symbols"].([]string); ok {
		cms.symbols = symbols
	}

	if bufferSize, ok := config["buffer_size"].(int); ok {
		cms.bufferSize = bufferSize
		// Recreate buffer with new size
		cms.streamBuffer = make(chan Tick, bufferSize)
	}

	return nil
}

// ==========================================
// SUB-SUB-FEATURE: Factory Function
// ==========================================

func NewCoinMarketCap() Source {
	return NewCoinMarketCapSource()
}
