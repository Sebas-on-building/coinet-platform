// =========================================================
// REVOLUTIONARY COINMARKETCAP GLOBAL METRICS MODULE
// Sub-Feature: Global Market Data & Cryptocurrency Metrics
// =========================================================

package exchange

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

// ==========================================
// SUB-SUB-FEATURE: Global Market Metrics
// ==========================================

type GlobalMetrics struct {
	ActiveCryptocurrencies          int              `json:"active_cryptocurrencies"`
	TotalCryptocurrencies           int              `json:"total_cryptocurrencies"`
	ActiveMarketPairs               int              `json:"active_market_pairs"`
	ActiveExchanges                 int              `json:"active_exchanges"`
	TotalExchanges                  int              `json:"total_exchanges"`
	EthDominance                    float64          `json:"eth_dominance"`
	BtcDominance                    float64          `json:"btc_dominance"`
	EthDominanceYesterday           float64          `json:"eth_dominance_yesterday"`
	BtcDominanceYesterday           float64          `json:"btc_dominance_yesterday"`
	EthDominance24hPercentageChange float64          `json:"eth_dominance_24h_percentage_change"`
	BtcDominance24hPercentageChange float64          `json:"btc_dominance_24h_percentage_change"`
	LastUpdated                     string           `json:"last_updated"`
	TotalMarketCap                  map[string]Quote `json:"quote"`
}

type DeFiMetrics struct {
	Name                              string  `json:"name"`
	TotalMarketCap                    float64 `json:"total_market_cap"`
	TotalMarketCapYesterday           float64 `json:"total_market_cap_yesterday"`
	TotalMarketCap24hPercentageChange float64 `json:"total_market_cap_24h_percentage_change"`
	TotalVolume24h                    float64 `json:"total_volume_24h"`
	TotalVolume24hYesterday           float64 `json:"total_volume_24h_yesterday"`
	TotalVolume24h24hPercentageChange float64 `json:"total_volume_24h_24h_percentage_change"`
	LastUpdated                       string  `json:"last_updated"`
	DefiDominance                     float64 `json:"defi_dominance"`
	DefiDominanceYesterday            float64 `json:"defi_dominance_yesterday"`
	DefiDominance24hPercentageChange  float64 `json:"defi_dominance_24h_percentage_change"`
}

// ==========================================
// SUB-SUB-FEATURE: Global Metrics Fetcher
// ==========================================

type GlobalMetricsFetcher struct {
	adapter      *CoinMarketCapAdapter
	globalCache  *IntelligentCache
	defiCache    *IntelligentCache
	mu           sync.RWMutex
	updateTicker *time.Ticker
	isRunning    bool
	lastGlobal   *GlobalMetrics
	lastDefi     *DeFiMetrics
}

func NewGlobalMetricsFetcher(adapter *CoinMarketCapAdapter) *GlobalMetricsFetcher {
	return &GlobalMetricsFetcher{
		adapter:      adapter,
		globalCache:  NewIntelligentCache(5*time.Minute, 100),
		defiCache:    NewIntelligentCache(5*time.Minute, 100),
		updateTicker: time.NewTicker(2 * time.Minute),
	}
}

func (gmf *GlobalMetricsFetcher) StartPeriodicUpdates(ctx context.Context) {
	gmf.mu.Lock()
	gmf.isRunning = true
	gmf.mu.Unlock()

	go func() {
		defer func() {
			gmf.mu.Lock()
			gmf.isRunning = false
			gmf.mu.Unlock()
		}()

		for {
			select {
			case <-ctx.Done():
				return
			case <-gmf.updateTicker.C:
				// Fetch global metrics
				if global, err := gmf.FetchGlobalMetrics(ctx); err == nil {
					gmf.mu.Lock()
					gmf.lastGlobal = global
					gmf.mu.Unlock()
				}

				// Fetch DeFi metrics
				if defi, err := gmf.FetchDeFiMetrics(ctx); err == nil {
					gmf.mu.Lock()
					gmf.lastDefi = defi
					gmf.mu.Unlock()
				}
			}
		}
	}()
}

func (gmf *GlobalMetricsFetcher) FetchGlobalMetrics(ctx context.Context) (*GlobalMetrics, error) {
	cacheKey := "global_metrics"

	if cached, found := gmf.globalCache.Get(cacheKey); found {
		return cached.(*GlobalMetrics), nil
	}

	if err := gmf.adapter.rateLimiter.Acquire(ctx); err != nil {
		return nil, fmt.Errorf("rate limit acquire failed: %w", err)
	}
	defer gmf.adapter.rateLimiter.Release()

	url := fmt.Sprintf("%s/global-metrics/quotes/latest", gmf.adapter.config.BaseURL)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("X-CMC_PRO_API_KEY", gmf.adapter.config.APIKey)
	req.Header.Set("Accept", "application/json")

	resp, err := gmf.adapter.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

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
		} `json:"status"`
		Data GlobalMetrics `json:"data"`
	}

	if err := json.Unmarshal(body, &response); err != nil {
		return nil, err
	}

	if response.Status.ErrorCode != 0 {
		return nil, fmt.Errorf("API error: %s", response.Status.ErrorMessage)
	}

	gmf.globalCache.Set(cacheKey, &response.Data)
	return &response.Data, nil
}

func (gmf *GlobalMetricsFetcher) FetchDeFiMetrics(ctx context.Context) (*DeFiMetrics, error) {
	cacheKey := "defi_metrics"

	if cached, found := gmf.defiCache.Get(cacheKey); found {
		return cached.(*DeFiMetrics), nil
	}

	if err := gmf.adapter.rateLimiter.Acquire(ctx); err != nil {
		return nil, fmt.Errorf("rate limit acquire failed: %w", err)
	}
	defer gmf.adapter.rateLimiter.Release()

	url := fmt.Sprintf("%s/global-metrics/quotes/latest?aux=defi_volume_24h,defi_volume_24h_reported,defi_market_cap,defi_24h_percentage_change", gmf.adapter.config.BaseURL)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("X-CMC_PRO_API_KEY", gmf.adapter.config.APIKey)
	req.Header.Set("Accept", "application/json")

	resp, err := gmf.adapter.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

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
		} `json:"status"`
		Data struct {
			Defi DeFiMetrics `json:"defi"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &response); err != nil {
		return nil, err
	}

	if response.Status.ErrorCode != 0 {
		return nil, fmt.Errorf("API error: %s", response.Status.ErrorMessage)
	}

	gmf.defiCache.Set(cacheKey, &response.Data.Defi)
	return &response.Data.Defi, nil
}

// ==========================================
// SUB-SUB-FEATURE: Market Insights Generator
// ==========================================

type MarketInsights struct {
	MarketTrend            string    `json:"market_trend"`
	DominanceShift         string    `json:"dominance_shift"`
	VolumeAnalysis         string    `json:"volume_analysis"`
	DeFiPerformance        string    `json:"defi_performance"`
	MarketCapGrowthRate    float64   `json:"market_cap_growth_rate"`
	ActiveTradingIntensity float64   `json:"active_trading_intensity"`
	RecommendedActions     []string  `json:"recommended_actions"`
	RiskLevel              string    `json:"risk_level"`
	Timestamp              time.Time `json:"timestamp"`
}

func (gmf *GlobalMetricsFetcher) GenerateMarketInsights() (*MarketInsights, error) {
	gmf.mu.RLock()
	global := gmf.lastGlobal
	defi := gmf.lastDefi
	gmf.mu.RUnlock()

	if global == nil {
		return nil, fmt.Errorf("no global metrics available")
	}

	insights := &MarketInsights{
		Timestamp: time.Now(),
	}

	// Analyze market trend
	if usdQuote, ok := global.TotalMarketCap["USD"]; ok {
		if usdQuote.PercentChange24h > 5 {
			insights.MarketTrend = "Strongly Bullish"
		} else if usdQuote.PercentChange24h > 1 {
			insights.MarketTrend = "Bullish"
		} else if usdQuote.PercentChange24h > -1 {
			insights.MarketTrend = "Sideways"
		} else if usdQuote.PercentChange24h > -5 {
			insights.MarketTrend = "Bearish"
		} else {
			insights.MarketTrend = "Strongly Bearish"
		}

		insights.MarketCapGrowthRate = usdQuote.PercentChange24h
	}

	// Analyze dominance shift
	btcChange := global.BtcDominance24hPercentageChange
	ethChange := global.EthDominance24hPercentageChange

	if btcChange > 1 && ethChange < -1 {
		insights.DominanceShift = "Bitcoin gaining dominance over Ethereum"
	} else if ethChange > 1 && btcChange < -1 {
		insights.DominanceShift = "Ethereum gaining dominance over Bitcoin"
	} else if btcChange > 0 && ethChange > 0 {
		insights.DominanceShift = "Both BTC and ETH gaining dominance - altcoin weakness"
	} else {
		insights.DominanceShift = "Altcoin season - BTC/ETH dominance declining"
	}

	// Volume analysis
	if usdQuote, ok := global.TotalMarketCap["USD"]; ok {
		insights.ActiveTradingIntensity = usdQuote.Volume24h / usdQuote.MarketCap * 100

		if insights.ActiveTradingIntensity > 5 {
			insights.VolumeAnalysis = "High trading activity - increased volatility expected"
		} else if insights.ActiveTradingIntensity > 2 {
			insights.VolumeAnalysis = "Moderate trading activity - normal market conditions"
		} else {
			insights.VolumeAnalysis = "Low trading activity - potential for breakout"
		}
	}

	// DeFi analysis
	if defi != nil {
		if defi.TotalMarketCap24hPercentageChange > 3 {
			insights.DeFiPerformance = "DeFi sector outperforming broader market"
		} else if defi.TotalMarketCap24hPercentageChange < -3 {
			insights.DeFiPerformance = "DeFi sector underperforming broader market"
		} else {
			insights.DeFiPerformance = "DeFi sector moving in line with broader market"
		}
	}

	// Generate recommendations
	insights.RecommendedActions = gmf.generateRecommendations(insights)

	// Assess risk level
	insights.RiskLevel = gmf.assessRiskLevel(insights)

	return insights, nil
}

func (gmf *GlobalMetricsFetcher) generateRecommendations(insights *MarketInsights) []string {
	var recommendations []string

	switch insights.MarketTrend {
	case "Strongly Bullish":
		recommendations = append(recommendations, "Consider taking profits on existing positions")
		recommendations = append(recommendations, "Monitor for potential overheating signals")
	case "Bullish":
		recommendations = append(recommendations, "Good entry point for long positions")
		recommendations = append(recommendations, "Focus on high-quality projects")
	case "Bearish":
		recommendations = append(recommendations, "Consider reducing exposure")
		recommendations = append(recommendations, "Look for strong support levels")
	case "Strongly Bearish":
		recommendations = append(recommendations, "Preserve capital - wait for clear reversal signals")
		recommendations = append(recommendations, "Focus on defensive strategies")
	default:
		recommendations = append(recommendations, "Maintain current positions")
		recommendations = append(recommendations, "Wait for clearer directional signals")
	}

	if insights.ActiveTradingIntensity > 5 {
		recommendations = append(recommendations, "High volatility - use tight stop losses")
	}

	return recommendations
}

func (gmf *GlobalMetricsFetcher) assessRiskLevel(insights *MarketInsights) string {
	riskScore := 0

	// Market trend risk
	switch insights.MarketTrend {
	case "Strongly Bullish", "Strongly Bearish":
		riskScore += 3
	case "Bullish", "Bearish":
		riskScore += 2
	default:
		riskScore += 1
	}

	// Volume risk
	if insights.ActiveTradingIntensity > 5 {
		riskScore += 2
	} else if insights.ActiveTradingIntensity > 2 {
		riskScore += 1
	}

	// Dominance instability
	if insights.DominanceShift == "Altcoin season - BTC/ETH dominance declining" {
		riskScore += 2
	}

	switch {
	case riskScore >= 6:
		return "Very High"
	case riskScore >= 4:
		return "High"
	case riskScore >= 2:
		return "Moderate"
	default:
		return "Low"
	}
}

func (gmf *GlobalMetricsFetcher) Stop() {
	gmf.mu.Lock()
	defer gmf.mu.Unlock()

	if gmf.updateTicker != nil {
		gmf.updateTicker.Stop()
	}
	gmf.isRunning = false
}

func (gmf *GlobalMetricsFetcher) GetLatestGlobalMetrics() *GlobalMetrics {
	gmf.mu.RLock()
	defer gmf.mu.RUnlock()
	return gmf.lastGlobal
}

func (gmf *GlobalMetricsFetcher) GetLatestDeFiMetrics() *DeFiMetrics {
	gmf.mu.RLock()
	defer gmf.mu.RUnlock()
	return gmf.lastDefi
}
