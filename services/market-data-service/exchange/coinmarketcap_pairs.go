// =========================================================
// REVOLUTIONARY COINMARKETCAP MARKET PAIRS MODULE
// Sub-Feature: Market Pairs Analysis & Trading Intelligence
// =========================================================

package exchange

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"
)

// ==========================================
// SUB-SUB-FEATURE: Market Pair Data Structures
// ==========================================

type MarketPair struct {
	ID               int             `json:"id"`
	BaseSymbol       string          `json:"base_symbol"`
	BaseCurrencyID   int             `json:"base_currency_id"`
	QuoteSymbol      string          `json:"quote_symbol"`
	QuoteCurrencyID  int             `json:"quote_currency_id"`
	MarketID         int             `json:"market_id"`
	MarketName       string          `json:"market_name"`
	MarketSlug       string          `json:"market_slug"`
	Category         string          `json:"category"`
	FeeType          string          `json:"fee_type"`
	OutlierDetected  int             `json:"outlier_detected"`
	Price            float64         `json:"price"`
	Volume24hBase    float64         `json:"volume_24h_base"`
	Volume24hQuote   float64         `json:"volume_24h_quote"`
	Volume24hUSD     float64         `json:"volume_24h_usd"`
	VolumePercentage float64         `json:"volume_percentage"`
	LastUpdated      string          `json:"last_updated"`
	ExchangeNotice   string          `json:"exchange_notice"`
	PriceExcluded    int             `json:"price_excluded"`
	VolumeExcluded   int             `json:"volume_excluded"`
	MarketPairBase   MarketPairBase  `json:"market_pair_base"`
	MarketPairQuote  MarketPairQuote `json:"market_pair_quote"`
}

type MarketPairBase struct {
	CurrencyID   int    `json:"currency_id"`
	CurrencyName string `json:"currency_name"`
	CurrencySlug string `json:"currency_slug"`
	CurrencyType string `json:"currency_type"`
}

type MarketPairQuote struct {
	CurrencyID   int    `json:"currency_id"`
	CurrencyName string `json:"currency_name"`
	CurrencySlug string `json:"currency_slug"`
	CurrencyType string `json:"currency_type"`
}

type ExchangeInfo struct {
	ID                  int    `json:"id"`
	Name                string `json:"name"`
	Slug                string `json:"slug"`
	IsActive            int    `json:"is_active"`
	FirstHistoricalData string `json:"first_historical_data"`
	LastHistoricalData  string `json:"last_historical_data"`
}

// ==========================================
// SUB-SUB-FEATURE: Market Pairs Analyzer
// ==========================================

type MarketPairsAnalyzer struct {
	adapter         *CoinMarketCapAdapter
	pairsCache      *IntelligentCache
	exchangeCache   *IntelligentCache
	analysisCache   *IntelligentCache
	mu              sync.RWMutex
	lastPairsUpdate time.Time
	cachedPairs     map[string][]MarketPair
	exchangeInfo    map[int]*ExchangeInfo
}

func NewMarketPairsAnalyzer(adapter *CoinMarketCapAdapter) *MarketPairsAnalyzer {
	return &MarketPairsAnalyzer{
		adapter:       adapter,
		pairsCache:    NewIntelligentCache(10*time.Minute, 500),
		exchangeCache: NewIntelligentCache(30*time.Minute, 100),
		analysisCache: NewIntelligentCache(5*time.Minute, 200),
		cachedPairs:   make(map[string][]MarketPair),
		exchangeInfo:  make(map[int]*ExchangeInfo),
	}
}

func (mpa *MarketPairsAnalyzer) FetchMarketPairs(ctx context.Context, symbol string, limit int) ([]MarketPair, error) {
	cacheKey := fmt.Sprintf("pairs_%s_%d", symbol, limit)

	if cached, found := mpa.pairsCache.Get(cacheKey); found {
		return cached.([]MarketPair), nil
	}

	if err := mpa.adapter.rateLimiter.Acquire(ctx); err != nil {
		return nil, fmt.Errorf("rate limit acquire failed: %w", err)
	}
	defer mpa.adapter.rateLimiter.Release()

	url := fmt.Sprintf("%s/cryptocurrency/market-pairs/latest?symbol=%s&limit=%d",
		mpa.adapter.config.BaseURL, symbol, limit)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("X-CMC_PRO_API_KEY", mpa.adapter.config.APIKey)
	req.Header.Set("Accept", "application/json")

	resp, err := mpa.adapter.httpClient.Do(req)
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
			ID             int          `json:"id"`
			Name           string       `json:"name"`
			Symbol         string       `json:"symbol"`
			NumMarketPairs int          `json:"num_market_pairs"`
			MarketPairs    []MarketPair `json:"market_pairs"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &response); err != nil {
		return nil, err
	}

	if response.Status.ErrorCode != 0 {
		return nil, fmt.Errorf("API error: %s", response.Status.ErrorMessage)
	}

	mpa.pairsCache.Set(cacheKey, response.Data.MarketPairs)

	mpa.mu.Lock()
	mpa.cachedPairs[symbol] = response.Data.MarketPairs
	mpa.lastPairsUpdate = time.Now()
	mpa.mu.Unlock()

	return response.Data.MarketPairs, nil
}

// ==========================================
// SUB-SUB-FEATURE: Advanced Market Analysis
// ==========================================

type MarketAnalysis struct {
	Symbol                 string                 `json:"symbol"`
	TotalPairs             int                    `json:"total_pairs"`
	TotalVolume24hUSD      float64                `json:"total_volume_24h_usd"`
	AveragePrice           float64                `json:"average_price"`
	PriceDeviation         float64                `json:"price_deviation"`
	TopExchanges           []ExchangeVolume       `json:"top_exchanges"`
	VolumeDistribution     map[string]float64     `json:"volume_distribution"`
	PriceDiscrepancy       *PriceDiscrepancy      `json:"price_discrepancy"`
	LiquidityAnalysis      *LiquidityAnalysis     `json:"liquidity_analysis"`
	ArbitrageOpportunities []ArbitrageOpportunity `json:"arbitrage_opportunities"`
	TradingRecommendations []string               `json:"trading_recommendations"`
	RiskAssessment         *RiskAssessment        `json:"risk_assessment"`
	Timestamp              time.Time              `json:"timestamp"`
}

type ExchangeVolume struct {
	ExchangeName  string  `json:"exchange_name"`
	Volume24hUSD  float64 `json:"volume_24h_usd"`
	VolumePercent float64 `json:"volume_percent"`
	Price         float64 `json:"price"`
	PairCount     int     `json:"pair_count"`
}

type PriceDiscrepancy struct {
	HighestPrice    float64 `json:"highest_price"`
	LowestPrice     float64 `json:"lowest_price"`
	PriceSpread     float64 `json:"price_spread"`
	SpreadPercent   float64 `json:"spread_percent"`
	HighestExchange string  `json:"highest_exchange"`
	LowestExchange  string  `json:"lowest_exchange"`
}

type LiquidityAnalysis struct {
	TotalLiquidity float64            `json:"total_liquidity"`
	LiquidityTiers map[string]float64 `json:"liquidity_tiers"`
	MarketDepth    string             `json:"market_depth"`
	SlippageRisk   string             `json:"slippage_risk"`
}

type ArbitrageOpportunity struct {
	BuyExchange    string  `json:"buy_exchange"`
	SellExchange   string  `json:"sell_exchange"`
	BuyPrice       float64 `json:"buy_price"`
	SellPrice      float64 `json:"sell_price"`
	ProfitPercent  float64 `json:"profit_percent"`
	RequiredVolume float64 `json:"required_volume"`
	RiskLevel      string  `json:"risk_level"`
}

type RiskAssessment struct {
	OverallRisk         string            `json:"overall_risk"`
	VolumeConcentration float64           `json:"volume_concentration"`
	PriceVolatility     float64           `json:"price_volatility"`
	LiquidityRisk       string            `json:"liquidity_risk"`
	ExchangeRisk        map[string]string `json:"exchange_risk"`
}

func (mpa *MarketPairsAnalyzer) AnalyzeMarket(ctx context.Context, symbol string) (*MarketAnalysis, error) {
	cacheKey := fmt.Sprintf("analysis_%s", symbol)

	if cached, found := mpa.analysisCache.Get(cacheKey); found {
		return cached.(*MarketAnalysis), nil
	}

	pairs, err := mpa.FetchMarketPairs(ctx, symbol, 100)
	if err != nil {
		return nil, err
	}

	analysis := &MarketAnalysis{
		Symbol:             symbol,
		TotalPairs:         len(pairs),
		VolumeDistribution: make(map[string]float64),
		Timestamp:          time.Now(),
	}

	// Calculate basic metrics
	var totalVolume, totalWeightedPrice, totalWeight float64
	var prices []float64
	exchangeVolumes := make(map[string]*ExchangeVolume)

	for _, pair := range pairs {
		totalVolume += pair.Volume24hUSD
		weight := pair.Volume24hUSD
		totalWeightedPrice += pair.Price * weight
		totalWeight += weight
		prices = append(prices, pair.Price)

		// Track exchange volumes
		if ev, exists := exchangeVolumes[pair.MarketName]; exists {
			ev.Volume24hUSD += pair.Volume24hUSD
			ev.PairCount++
		} else {
			exchangeVolumes[pair.MarketName] = &ExchangeVolume{
				ExchangeName: pair.MarketName,
				Volume24hUSD: pair.Volume24hUSD,
				Price:        pair.Price,
				PairCount:    1,
			}
		}
	}

	analysis.TotalVolume24hUSD = totalVolume
	if totalWeight > 0 {
		analysis.AveragePrice = totalWeightedPrice / totalWeight
	}

	// Calculate price deviation
	if len(prices) > 0 {
		analysis.PriceDeviation = mpa.calculateStandardDeviation(prices)
	}

	// Process exchange data
	var exchangeList []ExchangeVolume
	for _, ev := range exchangeVolumes {
		ev.VolumePercent = (ev.Volume24hUSD / totalVolume) * 100
		exchangeList = append(exchangeList, *ev)
	}

	// Sort by volume
	sort.Slice(exchangeList, func(i, j int) bool {
		return exchangeList[i].Volume24hUSD > exchangeList[j].Volume24hUSD
	})

	// Keep top 10 exchanges
	if len(exchangeList) > 10 {
		analysis.TopExchanges = exchangeList[:10]
	} else {
		analysis.TopExchanges = exchangeList
	}

	// Calculate volume distribution
	for _, ex := range analysis.TopExchanges {
		analysis.VolumeDistribution[ex.ExchangeName] = ex.VolumePercent
	}

	// Price discrepancy analysis
	analysis.PriceDiscrepancy = mpa.analyzePriceDiscrepancy(pairs)

	// Liquidity analysis
	analysis.LiquidityAnalysis = mpa.analyzeLiquidity(pairs, totalVolume)

	// Arbitrage opportunities
	analysis.ArbitrageOpportunities = mpa.findArbitrageOpportunities(pairs)

	// Risk assessment
	analysis.RiskAssessment = mpa.assessRisk(pairs, exchangeList, analysis.PriceDiscrepancy)

	// Trading recommendations
	analysis.TradingRecommendations = mpa.generateTradingRecommendations(analysis)

	mpa.analysisCache.Set(cacheKey, analysis)
	return analysis, nil
}

func (mpa *MarketPairsAnalyzer) calculateStandardDeviation(prices []float64) float64 {
	if len(prices) == 0 {
		return 0
	}

	var sum, mean float64
	for _, price := range prices {
		sum += price
	}
	mean = sum / float64(len(prices))

	var variance float64
	for _, price := range prices {
		variance += math.Pow(price-mean, 2)
	}
	variance /= float64(len(prices))

	return math.Sqrt(variance)
}

func (mpa *MarketPairsAnalyzer) analyzePriceDiscrepancy(pairs []MarketPair) *PriceDiscrepancy {
	if len(pairs) == 0 {
		return nil
	}

	highest := pairs[0]
	lowest := pairs[0]

	for _, pair := range pairs {
		if pair.Price > highest.Price {
			highest = pair
		}
		if pair.Price < lowest.Price && pair.Price > 0 {
			lowest = pair
		}
	}

	spread := highest.Price - lowest.Price
	spreadPercent := (spread / lowest.Price) * 100

	return &PriceDiscrepancy{
		HighestPrice:    highest.Price,
		LowestPrice:     lowest.Price,
		PriceSpread:     spread,
		SpreadPercent:   spreadPercent,
		HighestExchange: highest.MarketName,
		LowestExchange:  lowest.MarketName,
	}
}

func (mpa *MarketPairsAnalyzer) analyzeLiquidity(pairs []MarketPair, totalVolume float64) *LiquidityAnalysis {
	tiers := map[string]float64{
		"Tier1": 0, // >$10M daily volume
		"Tier2": 0, // $1M-$10M
		"Tier3": 0, // $100K-$1M
		"Tier4": 0, // <$100K
	}

	for _, pair := range pairs {
		volume := pair.Volume24hUSD
		switch {
		case volume > 10000000:
			tiers["Tier1"] += volume
		case volume > 1000000:
			tiers["Tier2"] += volume
		case volume > 100000:
			tiers["Tier3"] += volume
		default:
			tiers["Tier4"] += volume
		}
	}

	// Convert to percentages
	for tier := range tiers {
		tiers[tier] = (tiers[tier] / totalVolume) * 100
	}

	var marketDepth, slippageRisk string

	if tiers["Tier1"] > 60 {
		marketDepth = "Excellent"
		slippageRisk = "Very Low"
	} else if tiers["Tier1"]+tiers["Tier2"] > 70 {
		marketDepth = "Good"
		slippageRisk = "Low"
	} else if tiers["Tier1"]+tiers["Tier2"]+tiers["Tier3"] > 80 {
		marketDepth = "Moderate"
		slippageRisk = "Moderate"
	} else {
		marketDepth = "Poor"
		slippageRisk = "High"
	}

	return &LiquidityAnalysis{
		TotalLiquidity: totalVolume,
		LiquidityTiers: tiers,
		MarketDepth:    marketDepth,
		SlippageRisk:   slippageRisk,
	}
}

func (mpa *MarketPairsAnalyzer) findArbitrageOpportunities(pairs []MarketPair) []ArbitrageOpportunity {
	var opportunities []ArbitrageOpportunity

	// Find price differences between exchanges
	for i, pair1 := range pairs {
		for j, pair2 := range pairs {
			if i != j && pair1.Price > 0 && pair2.Price > 0 {
				if pair1.Price > pair2.Price {
					profitPercent := ((pair1.Price - pair2.Price) / pair2.Price) * 100

					// Only consider significant opportunities (>1% profit)
					if profitPercent > 1 {
						minVolume := math.Min(pair1.Volume24hUSD, pair2.Volume24hUSD)

						var riskLevel string
						switch {
						case minVolume > 1000000 && profitPercent < 5:
							riskLevel = "Low"
						case minVolume > 100000 && profitPercent < 10:
							riskLevel = "Medium"
						default:
							riskLevel = "High"
						}

						opportunities = append(opportunities, ArbitrageOpportunity{
							BuyExchange:    pair2.MarketName,
							SellExchange:   pair1.MarketName,
							BuyPrice:       pair2.Price,
							SellPrice:      pair1.Price,
							ProfitPercent:  profitPercent,
							RequiredVolume: minVolume * 0.1, // 10% of available volume
							RiskLevel:      riskLevel,
						})
					}
				}
			}
		}
	}

	// Sort by profit potential
	sort.Slice(opportunities, func(i, j int) bool {
		return opportunities[i].ProfitPercent > opportunities[j].ProfitPercent
	})

	// Return top 5 opportunities
	if len(opportunities) > 5 {
		return opportunities[:5]
	}
	return opportunities
}

func (mpa *MarketPairsAnalyzer) assessRisk(pairs []MarketPair, exchanges []ExchangeVolume, discrepancy *PriceDiscrepancy) *RiskAssessment {
	risk := &RiskAssessment{
		ExchangeRisk: make(map[string]string),
	}

	// Volume concentration risk
	if len(exchanges) > 0 {
		topExchangePercent := exchanges[0].VolumePercent
		risk.VolumeConcentration = topExchangePercent

		if topExchangePercent > 50 {
			risk.OverallRisk = "High"
		} else if topExchangePercent > 30 {
			risk.OverallRisk = "Medium"
		} else {
			risk.OverallRisk = "Low"
		}
	}

	// Price volatility
	if discrepancy != nil {
		risk.PriceVolatility = discrepancy.SpreadPercent
	}

	// Liquidity risk
	totalVolume := 0.0
	for _, pair := range pairs {
		totalVolume += pair.Volume24hUSD
	}

	switch {
	case totalVolume > 50000000:
		risk.LiquidityRisk = "Very Low"
	case totalVolume > 10000000:
		risk.LiquidityRisk = "Low"
	case totalVolume > 1000000:
		risk.LiquidityRisk = "Medium"
	default:
		risk.LiquidityRisk = "High"
	}

	// Exchange-specific risk assessment
	knownRiskyExchanges := map[string]bool{
		"unknown": true,
		"new":     true,
	}

	for _, ex := range exchanges {
		exchangeName := strings.ToLower(ex.ExchangeName)
		if knownRiskyExchanges[exchangeName] || ex.Volume24hUSD < 100000 {
			risk.ExchangeRisk[ex.ExchangeName] = "High"
		} else if ex.Volume24hUSD < 1000000 {
			risk.ExchangeRisk[ex.ExchangeName] = "Medium"
		} else {
			risk.ExchangeRisk[ex.ExchangeName] = "Low"
		}
	}

	return risk
}

func (mpa *MarketPairsAnalyzer) generateTradingRecommendations(analysis *MarketAnalysis) []string {
	var recommendations []string

	// Liquidity recommendations
	if analysis.LiquidityAnalysis != nil {
		switch analysis.LiquidityAnalysis.SlippageRisk {
		case "Very Low", "Low":
			recommendations = append(recommendations, "Excellent liquidity - suitable for large trades")
		case "Moderate":
			recommendations = append(recommendations, "Moderate liquidity - use limit orders for large positions")
		case "High":
			recommendations = append(recommendations, "Low liquidity - split large orders and use market making strategies")
		}
	}

	// Price discrepancy recommendations
	if analysis.PriceDiscrepancy != nil && analysis.PriceDiscrepancy.SpreadPercent > 2 {
		recommendations = append(recommendations,
			fmt.Sprintf("Significant price spread (%.2f%%) detected - arbitrage opportunities available",
				analysis.PriceDiscrepancy.SpreadPercent))
	}

	// Exchange concentration recommendations
	if analysis.RiskAssessment != nil && analysis.RiskAssessment.VolumeConcentration > 40 {
		recommendations = append(recommendations,
			"High volume concentration detected - diversify across multiple exchanges")
	}

	// Arbitrage recommendations
	if len(analysis.ArbitrageOpportunities) > 0 {
		for _, opp := range analysis.ArbitrageOpportunities {
			if opp.RiskLevel == "Low" && opp.ProfitPercent > 2 {
				recommendations = append(recommendations,
					fmt.Sprintf("Low-risk arbitrage opportunity: Buy on %s, sell on %s (%.2f%% profit)",
						opp.BuyExchange, opp.SellExchange, opp.ProfitPercent))
			}
		}
	}

	return recommendations
}
