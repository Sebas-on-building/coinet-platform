// =========================================================
// REVOLUTIONARY COINMARKETCAP PROVIDER REGISTRY
// Sub-Feature: Unified Provider Management & Intelligent Routing
// =========================================================

package exchange

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"sync/atomic"
	"time"
)

// ==========================================
// SUB-SUB-FEATURE: Provider Registry System
// ==========================================

type CoinMarketCapRegistry struct {
	adapter            *CoinMarketCapAdapter
	globalFetcher      *GlobalMetricsFetcher
	pairsAnalyzer      *MarketPairsAnalyzer
	healthMonitor      *HealthMonitor
	performanceTracker *PerformanceTracker
	intelligentRouter  *IntelligentRouter
	mu                 sync.RWMutex
	isRunning          bool
	shutdownChan       chan struct{}
}

// ==========================================
// SUB-SUB-FEATURE: Health Monitoring System
// ==========================================

type HealthMonitor struct {
	registry       *CoinMarketCapRegistry
	checkInterval  time.Duration
	healthStatus   *HealthStatus
	alertThreshold float64
	mu             sync.RWMutex
}

type HealthStatus struct {
	Overall          string            `json:"overall"`
	APIConnectivity  string            `json:"api_connectivity"`
	RateLimitStatus  string            `json:"rate_limit_status"`
	CachePerformance string            `json:"cache_performance"`
	ErrorRate        float64           `json:"error_rate"`
	ResponseTime     time.Duration     `json:"response_time"`
	LastCheck        time.Time         `json:"last_check"`
	ComponentHealth  map[string]string `json:"component_health"`
	Recommendations  []string          `json:"recommendations"`
}

// ==========================================
// SUB-SUB-FEATURE: Performance Tracking
// ==========================================

type PerformanceTracker struct {
	requestCount        int64
	successCount        int64
	errorCount          int64
	totalResponseTime   int64
	cacheHitRate        float64
	throughputPerSecond float64
	startTime           time.Time
	lastUpdate          time.Time
	mu                  sync.RWMutex
	metrics             *PerformanceMetrics
}

type PerformanceMetrics struct {
	RequestsPerSecond   float64             `json:"requests_per_second"`
	AverageResponseTime time.Duration       `json:"average_response_time"`
	SuccessRate         float64             `json:"success_rate"`
	ErrorRate           float64             `json:"error_rate"`
	CacheHitRate        float64             `json:"cache_hit_rate"`
	ThroughputTrend     []ThroughputPoint   `json:"throughput_trend"`
	PeakPerformance     *PeakMetrics        `json:"peak_performance"`
	BottleneckAnalysis  *BottleneckAnalysis `json:"bottleneck_analysis"`
}

type ThroughputPoint struct {
	Timestamp time.Time `json:"timestamp"`
	RPS       float64   `json:"rps"`
}

type PeakMetrics struct {
	MaxRPS              float64       `json:"max_rps"`
	MaxRPSTime          time.Time     `json:"max_rps_time"`
	FastestResponse     time.Duration `json:"fastest_response"`
	FastestResponseTime time.Time     `json:"fastest_response_time"`
}

type BottleneckAnalysis struct {
	PrimaryBottleneck string        `json:"primary_bottleneck"`
	RateLimitImpact   float64       `json:"rate_limit_impact"`
	NetworkLatency    time.Duration `json:"network_latency"`
	ProcessingTime    time.Duration `json:"processing_time"`
	Recommendations   []string      `json:"recommendations"`
}

// ==========================================
// SUB-SUB-FEATURE: Intelligent Router
// ==========================================

type IntelligentRouter struct {
	registry        *CoinMarketCapRegistry
	routingStrategy string // "round_robin", "least_loaded", "fastest_response", "adaptive"
	loadBalancer    *LoadBalancer
	circuitBreaker  *CircuitBreaker
	mu              sync.RWMutex
}

type LoadBalancer struct {
	endpoints []string
	current   int32
	weights   map[string]int
	health    map[string]bool
}

type CircuitBreaker struct {
	failureThreshold int
	successThreshold int
	timeout          time.Duration
	state            string // "closed", "open", "half_open"
	failureCount     int32
	successCount     int32
	lastFailureTime  time.Time
	mu               sync.RWMutex
}

// ==========================================
// SUB-SUB-FEATURE: Registry Constructor
// ==========================================

func NewCoinMarketCapRegistry() *CoinMarketCapRegistry {
	adapter := NewCoinMarketCapAdapter()

	registry := &CoinMarketCapRegistry{
		adapter:       adapter,
		globalFetcher: NewGlobalMetricsFetcher(adapter),
		pairsAnalyzer: NewMarketPairsAnalyzer(adapter),
		shutdownChan:  make(chan struct{}),
	}

	registry.healthMonitor = NewHealthMonitor(registry)
	registry.performanceTracker = NewPerformanceTracker()
	registry.intelligentRouter = NewIntelligentRouter(registry)

	return registry
}

func NewHealthMonitor(registry *CoinMarketCapRegistry) *HealthMonitor {
	return &HealthMonitor{
		registry:       registry,
		checkInterval:  30 * time.Second,
		alertThreshold: 0.05, // 5% error rate threshold
		healthStatus: &HealthStatus{
			ComponentHealth: make(map[string]string),
			LastCheck:       time.Now(),
		},
	}
}

func NewPerformanceTracker() *PerformanceTracker {
	return &PerformanceTracker{
		startTime:  time.Now(),
		lastUpdate: time.Now(),
		metrics: &PerformanceMetrics{
			ThroughputTrend: make([]ThroughputPoint, 0),
			PeakPerformance: &PeakMetrics{},
			BottleneckAnalysis: &BottleneckAnalysis{
				Recommendations: make([]string, 0),
			},
		},
	}
}

func NewIntelligentRouter(registry *CoinMarketCapRegistry) *IntelligentRouter {
	return &IntelligentRouter{
		registry:        registry,
		routingStrategy: "adaptive",
		loadBalancer: &LoadBalancer{
			endpoints: []string{"primary", "fallback"},
			weights:   make(map[string]int),
			health:    make(map[string]bool),
		},
		circuitBreaker: &CircuitBreaker{
			failureThreshold: 5,
			successThreshold: 3,
			timeout:          60 * time.Second,
			state:            "closed",
		},
	}
}

// ==========================================
// SUB-SUB-FEATURE: Registry Lifecycle Management
// ==========================================

func (r *CoinMarketCapRegistry) Start(ctx context.Context) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.isRunning {
		return fmt.Errorf("registry is already running")
	}

	log.Println("Starting CoinMarketCap Registry...")

	// Start global metrics fetcher
	r.globalFetcher.StartPeriodicUpdates(ctx)

	// Start health monitoring
	go r.healthMonitor.StartMonitoring(ctx)

	// Start performance tracking
	go r.performanceTracker.StartTracking(ctx)

	// Initialize intelligent router
	r.intelligentRouter.Initialize()

	r.isRunning = true
	log.Println("CoinMarketCap Registry started successfully")

	return nil
}

func (r *CoinMarketCapRegistry) Stop() {
	r.mu.Lock()
	defer r.mu.Unlock()

	if !r.isRunning {
		return
	}

	log.Println("Stopping CoinMarketCap Registry...")

	close(r.shutdownChan)
	r.globalFetcher.Stop()

	r.isRunning = false
	log.Println("CoinMarketCap Registry stopped")
}

// ==========================================
// SUB-SUB-FEATURE: Unified API Interface
// ==========================================

func (r *CoinMarketCapRegistry) GetCryptocurrencyListings(ctx context.Context, limit int, convert string) ([]CryptocurrencyListing, error) {
	start := time.Now()
	defer func() {
		r.performanceTracker.RecordRequest(time.Since(start), nil)
	}()

	// Check circuit breaker
	if !r.intelligentRouter.circuitBreaker.CanExecute() {
		return nil, fmt.Errorf("circuit breaker is open")
	}

	listings, err := r.adapter.FetchCoinMarketCapListings(ctx, limit, convert)
	if err != nil {
		r.intelligentRouter.circuitBreaker.RecordFailure()
		r.performanceTracker.RecordRequest(time.Since(start), err)
		return nil, err
	}

	r.intelligentRouter.circuitBreaker.RecordSuccess()
	return listings, nil
}

func (r *CoinMarketCapRegistry) GetGlobalMetrics(ctx context.Context) (*GlobalMetrics, error) {
	return r.globalFetcher.FetchGlobalMetrics(ctx)
}

func (r *CoinMarketCapRegistry) GetDeFiMetrics(ctx context.Context) (*DeFiMetrics, error) {
	return r.globalFetcher.FetchDeFiMetrics(ctx)
}

func (r *CoinMarketCapRegistry) GetMarketAnalysis(ctx context.Context, symbol string) (*MarketAnalysis, error) {
	return r.pairsAnalyzer.AnalyzeMarket(ctx, symbol)
}

func (r *CoinMarketCapRegistry) GetMarketInsights() (*MarketInsights, error) {
	return r.globalFetcher.GenerateMarketInsights()
}

// ==========================================
// SUB-SUB-FEATURE: Health Monitoring Implementation
// ==========================================

func (hm *HealthMonitor) StartMonitoring(ctx context.Context) {
	ticker := time.NewTicker(hm.checkInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			hm.performHealthCheck(ctx)
		}
	}
}

func (hm *HealthMonitor) performHealthCheck(ctx context.Context) {
	_ = ctx // Acknowledge unused parameter
	hm.mu.Lock()
	defer hm.mu.Unlock()

	start := time.Now()

	// Check API connectivity
	if hm.registry.adapter.HealthCheck() {
		hm.healthStatus.APIConnectivity = "Healthy"
		hm.healthStatus.ComponentHealth["API"] = "Healthy"
	} else {
		hm.healthStatus.APIConnectivity = "Unhealthy"
		hm.healthStatus.ComponentHealth["API"] = "Unhealthy"
	}

	// Check rate limit status
	metrics := hm.registry.adapter.GetMetrics()
	if atomic.LoadInt64(&metrics.RateLimitHits) > 0 {
		hm.healthStatus.RateLimitStatus = "Warning"
	} else {
		hm.healthStatus.RateLimitStatus = "Healthy"
	}

	// Check cache performance
	cacheMetrics := hm.registry.adapter.GetCacheMetrics()
	hitRate := float64(atomic.LoadInt64(&cacheMetrics.Hits)) /
		float64(atomic.LoadInt64(&cacheMetrics.Hits)+atomic.LoadInt64(&cacheMetrics.Misses))

	if hitRate > 0.8 {
		hm.healthStatus.CachePerformance = "Excellent"
	} else if hitRate > 0.6 {
		hm.healthStatus.CachePerformance = "Good"
	} else if hitRate > 0.4 {
		hm.healthStatus.CachePerformance = "Fair"
	} else {
		hm.healthStatus.CachePerformance = "Poor"
	}

	// Calculate error rate
	totalRequests := atomic.LoadInt64(&metrics.TotalRequests)
	failedRequests := atomic.LoadInt64(&metrics.FailedRequests)
	if totalRequests > 0 {
		hm.healthStatus.ErrorRate = float64(failedRequests) / float64(totalRequests)
	}

	// Record response time
	hm.healthStatus.ResponseTime = time.Since(start)
	hm.healthStatus.LastCheck = time.Now()

	// Determine overall health
	hm.determineOverallHealth()

	// Generate recommendations
	hm.generateRecommendations()

	// Log health status
	hm.logHealthStatus()
}

func (hm *HealthMonitor) determineOverallHealth() {
	healthScore := 0

	if hm.healthStatus.APIConnectivity == "Healthy" {
		healthScore += 30
	}

	if hm.healthStatus.RateLimitStatus == "Healthy" {
		healthScore += 25
	} else if hm.healthStatus.RateLimitStatus == "Warning" {
		healthScore += 15
	}

	switch hm.healthStatus.CachePerformance {
	case "Excellent":
		healthScore += 25
	case "Good":
		healthScore += 20
	case "Fair":
		healthScore += 10
	}

	if hm.healthStatus.ErrorRate < hm.alertThreshold {
		healthScore += 20
	} else if hm.healthStatus.ErrorRate < hm.alertThreshold*2 {
		healthScore += 10
	}

	switch {
	case healthScore >= 90:
		hm.healthStatus.Overall = "Excellent"
	case healthScore >= 75:
		hm.healthStatus.Overall = "Good"
	case healthScore >= 60:
		hm.healthStatus.Overall = "Fair"
	case healthScore >= 40:
		hm.healthStatus.Overall = "Poor"
	default:
		hm.healthStatus.Overall = "Critical"
	}
}

func (hm *HealthMonitor) generateRecommendations() {
	hm.healthStatus.Recommendations = hm.healthStatus.Recommendations[:0] // Clear existing

	if hm.healthStatus.APIConnectivity == "Unhealthy" {
		hm.healthStatus.Recommendations = append(hm.healthStatus.Recommendations,
			"API connectivity issues detected - check network connection and API key")
	}

	if hm.healthStatus.RateLimitStatus == "Warning" {
		hm.healthStatus.Recommendations = append(hm.healthStatus.Recommendations,
			"Rate limit hits detected - consider upgrading plan or implementing more aggressive caching")
	}

	if hm.healthStatus.CachePerformance == "Poor" || hm.healthStatus.CachePerformance == "Fair" {
		hm.healthStatus.Recommendations = append(hm.healthStatus.Recommendations,
			"Cache performance is suboptimal - review caching strategy and TTL settings")
	}

	if hm.healthStatus.ErrorRate > hm.alertThreshold {
		hm.healthStatus.Recommendations = append(hm.healthStatus.Recommendations,
			fmt.Sprintf("Error rate (%.2f%%) exceeds threshold - investigate error patterns",
				hm.healthStatus.ErrorRate*100))
	}
}

func (hm *HealthMonitor) logHealthStatus() {
	log.Printf("CoinMarketCap Health Status: Overall=%s, API=%s, RateLimit=%s, Cache=%s, ErrorRate=%.2f%%",
		hm.healthStatus.Overall,
		hm.healthStatus.APIConnectivity,
		hm.healthStatus.RateLimitStatus,
		hm.healthStatus.CachePerformance,
		hm.healthStatus.ErrorRate*100)
}

// ==========================================
// SUB-SUB-FEATURE: Performance Tracking Implementation
// ==========================================

func (pt *PerformanceTracker) StartTracking(ctx context.Context) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			pt.updateMetrics()
		}
	}
}

func (pt *PerformanceTracker) RecordRequest(duration time.Duration, err error) {
	atomic.AddInt64(&pt.requestCount, 1)
	atomic.AddInt64(&pt.totalResponseTime, int64(duration))

	if err == nil {
		atomic.AddInt64(&pt.successCount, 1)
	} else {
		atomic.AddInt64(&pt.errorCount, 1)
	}
}

func (pt *PerformanceTracker) updateMetrics() {
	pt.mu.Lock()
	defer pt.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(pt.lastUpdate).Seconds()

	totalRequests := atomic.LoadInt64(&pt.requestCount)
	successCount := atomic.LoadInt64(&pt.successCount)
	errorCount := atomic.LoadInt64(&pt.errorCount)
	totalResponseTime := atomic.LoadInt64(&pt.totalResponseTime)

	if totalRequests > 0 {
		pt.metrics.SuccessRate = float64(successCount) / float64(totalRequests)
		pt.metrics.ErrorRate = float64(errorCount) / float64(totalRequests)
		pt.metrics.AverageResponseTime = time.Duration(totalResponseTime / totalRequests)
	}

	if elapsed > 0 {
		currentRPS := float64(totalRequests) / time.Since(pt.startTime).Seconds()
		pt.metrics.RequestsPerSecond = currentRPS

		// Record throughput point
		pt.metrics.ThroughputTrend = append(pt.metrics.ThroughputTrend, ThroughputPoint{
			Timestamp: now,
			RPS:       currentRPS,
		})

		// Keep only last 100 points
		if len(pt.metrics.ThroughputTrend) > 100 {
			pt.metrics.ThroughputTrend = pt.metrics.ThroughputTrend[1:]
		}

		// Update peak performance
		if currentRPS > pt.metrics.PeakPerformance.MaxRPS {
			pt.metrics.PeakPerformance.MaxRPS = currentRPS
			pt.metrics.PeakPerformance.MaxRPSTime = now
		}

		if pt.metrics.AverageResponseTime < pt.metrics.PeakPerformance.FastestResponse ||
			pt.metrics.PeakPerformance.FastestResponse == 0 {
			pt.metrics.PeakPerformance.FastestResponse = pt.metrics.AverageResponseTime
			pt.metrics.PeakPerformance.FastestResponseTime = now
		}
	}

	pt.lastUpdate = now
	pt.analyzeBottlenecks()
}

func (pt *PerformanceTracker) analyzeBottlenecks() {
	analysis := pt.metrics.BottleneckAnalysis
	analysis.Recommendations = analysis.Recommendations[:0] // Clear existing

	// Analyze error rate
	if pt.metrics.ErrorRate > 0.05 {
		analysis.PrimaryBottleneck = "High Error Rate"
		analysis.Recommendations = append(analysis.Recommendations,
			"Investigate and resolve error patterns to improve performance")
	}

	// Analyze response time
	if pt.metrics.AverageResponseTime > 5*time.Second {
		if analysis.PrimaryBottleneck == "" {
			analysis.PrimaryBottleneck = "High Response Time"
		}
		analysis.Recommendations = append(analysis.Recommendations,
			"Optimize request processing and consider additional caching")
	}

	// Analyze throughput trend
	if len(pt.metrics.ThroughputTrend) > 10 {
		recent := pt.metrics.ThroughputTrend[len(pt.metrics.ThroughputTrend)-10:]
		declining := true
		for i := 1; i < len(recent); i++ {
			if recent[i].RPS >= recent[i-1].RPS {
				declining = false
				break
			}
		}

		if declining {
			analysis.Recommendations = append(analysis.Recommendations,
				"Declining throughput trend detected - investigate system resources")
		}
	}
}

// ==========================================
// SUB-SUB-FEATURE: Circuit Breaker Implementation
// ==========================================

func (cb *CircuitBreaker) CanExecute() bool {
	cb.mu.RLock()
	defer cb.mu.RUnlock()

	switch cb.state {
	case "open":
		return time.Since(cb.lastFailureTime) > cb.timeout
	case "half_open":
		return true
	default: // closed
		return true
	}
}

func (cb *CircuitBreaker) RecordSuccess() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	atomic.AddInt32(&cb.successCount, 1)

	if cb.state == "half_open" && atomic.LoadInt32(&cb.successCount) >= int32(cb.successThreshold) {
		cb.state = "closed"
		atomic.StoreInt32(&cb.failureCount, 0)
		atomic.StoreInt32(&cb.successCount, 0)
	}
}

func (cb *CircuitBreaker) RecordFailure() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	atomic.AddInt32(&cb.failureCount, 1)
	cb.lastFailureTime = time.Now()

	if cb.state == "closed" && atomic.LoadInt32(&cb.failureCount) >= int32(cb.failureThreshold) {
		cb.state = "open"
	} else if cb.state == "half_open" {
		cb.state = "open"
		atomic.StoreInt32(&cb.successCount, 0)
	}
}

// ==========================================
// SUB-SUB-FEATURE: Registry Status & Metrics
// ==========================================

func (r *CoinMarketCapRegistry) GetHealthStatus() *HealthStatus {
	r.healthMonitor.mu.RLock()
	defer r.healthMonitor.mu.RUnlock()
	return r.healthMonitor.healthStatus
}

func (r *CoinMarketCapRegistry) GetPerformanceMetrics() *PerformanceMetrics {
	r.performanceTracker.mu.RLock()
	defer r.performanceTracker.mu.RUnlock()
	return r.performanceTracker.metrics
}

func (r *CoinMarketCapRegistry) GetRegistryStatus() map[string]interface{} {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return map[string]interface{}{
		"is_running":            r.isRunning,
		"health_status":         r.GetHealthStatus(),
		"performance_metrics":   r.GetPerformanceMetrics(),
		"adapter_metrics":       r.adapter.GetMetrics(),
		"cache_metrics":         r.adapter.GetCacheMetrics(),
		"circuit_breaker_state": r.intelligentRouter.circuitBreaker.state,
	}
}

func (r *CoinMarketCapRegistry) ExportMetricsJSON() ([]byte, error) {
	status := r.GetRegistryStatus()
	return json.MarshalIndent(status, "", "  ")
}

// ==========================================
// SUB-SUB-FEATURE: Intelligent Router Implementation
// ==========================================

func (ir *IntelligentRouter) Initialize() {
	ir.loadBalancer.weights["primary"] = 70
	ir.loadBalancer.weights["fallback"] = 30
	ir.loadBalancer.health["primary"] = true
	ir.loadBalancer.health["fallback"] = true
}
