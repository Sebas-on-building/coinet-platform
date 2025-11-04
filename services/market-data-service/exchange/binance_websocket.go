// ========================================
// REVOLUTIONARY BINANCE WEBSOCKET INTEGRATION
// Inspired by Apple's Precision, Canva's Usability, TradingView's Power, Solana's Innovation
// ========================================

package exchange

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
)

// ==========================================
// SUB-FEATURE: Core WebSocket Configuration
// ==========================================

type BinanceWebSocketConfig struct {
	BaseURL               string
	CombinedStreamURL     string
	MaxReconnectAttempts  int
	ReconnectInterval     time.Duration
	PingInterval          time.Duration
	ReadTimeout           time.Duration
	WriteTimeout          time.Duration
	MaxMessageSize        int64
	BufferSize            int
	EnableCompression     bool
	EnableRateLimiting    bool
	MaxSubscriptionsPerWS int
}

func NewBinanceWebSocketConfig() *BinanceWebSocketConfig {
	return &BinanceWebSocketConfig{
		BaseURL:               "wss://stream.binance.com:9443/ws",
		CombinedStreamURL:     "wss://stream.binance.com:9443/stream",
		MaxReconnectAttempts:  10,
		ReconnectInterval:     5 * time.Second,
		PingInterval:          20 * time.Second,
		ReadTimeout:           60 * time.Second,
		WriteTimeout:          10 * time.Second,
		MaxMessageSize:        1024 * 1024, // 1MB
		BufferSize:            10000,
		EnableCompression:     true,
		EnableRateLimiting:    true,
		MaxSubscriptionsPerWS: 200, // Binance limit
	}
}

// ==========================================
// SUB-FEATURE: Advanced Connection Manager
// ==========================================

type BinanceWebSocketManager struct {
	config             *BinanceWebSocketConfig
	connections        map[string]*BinanceWSConnection
	subscriptions      map[string]*SubscriptionGroup
	messageBuffer      chan *WebSocketMessage
	errorChannel       chan error
	reconnectManager   *ReconnectionManager
	healthMonitor      *WSHealthMonitor
	performanceTracker *WSPerformanceTracker
	circuitBreaker     *WSCircuitBreaker
	mu                 sync.RWMutex
	isRunning          bool
	shutdownChan       chan struct{}
	ctx                context.Context
	cancel             context.CancelFunc
}

// ==========================================
// SUB-SUB-FEATURE: WebSocket Connection Wrapper
// ==========================================

type BinanceWSConnection struct {
	id              string
	conn            *websocket.Conn
	url             string
	subscriptions   []string
	isConnected     bool
	lastPingTime    time.Time
	lastPongTime    time.Time
	messageCount    int64
	errorCount      int64
	reconnectCount  int64
	subscriptionsMu sync.RWMutex
	connectionMu    sync.RWMutex
	manager         *BinanceWebSocketManager
}

// ==========================================
// SUB-SUB-FEATURE: Subscription Management
// ==========================================

type SubscriptionGroup struct {
	ID          string                 `json:"id"`
	Method      string                 `json:"method"`
	Params      []string               `json:"params"`
	Symbols     []string               `json:"symbols"`
	StreamType  string                 `json:"stream_type"`
	Connection  *BinanceWSConnection   `json:"-"`
	IsActive    bool                   `json:"is_active"`
	CreatedAt   time.Time              `json:"created_at"`
	LastUpdate  time.Time              `json:"last_update"`
	MessageRate float64                `json:"message_rate"`
	Metadata    map[string]interface{} `json:"metadata"`
}

// ==========================================
// SUB-SUB-FEATURE: Advanced Message Types
// ==========================================

type WebSocketMessage struct {
	ConnectionID string                 `json:"connection_id"`
	StreamName   string                 `json:"stream"`
	Data         json.RawMessage        `json:"data"`
	Timestamp    time.Time              `json:"timestamp"`
	MessageType  string                 `json:"message_type"`
	Symbol       string                 `json:"symbol"`
	Exchange     string                 `json:"exchange"`
	Metadata     map[string]interface{} `json:"metadata"`
}

type BinanceTradeData struct {
	EventType     string `json:"e"`
	EventTime     int64  `json:"E"`
	Symbol        string `json:"s"`
	TradeID       int64  `json:"t"`
	Price         string `json:"p"`
	Quantity      string `json:"q"`
	BuyerOrderID  int64  `json:"b"`
	SellerOrderID int64  `json:"a"`
	TradeTime     int64  `json:"T"`
	IsBuyerMaker  bool   `json:"m"`
	Ignore        bool   `json:"M"`
}

type BinanceTickerData struct {
	EventType          string `json:"e"`
	EventTime          int64  `json:"E"`
	Symbol             string `json:"s"`
	PriceChange        string `json:"p"`
	PriceChangePercent string `json:"P"`
	WeightedAvgPrice   string `json:"w"`
	PrevClosePrice     string `json:"x"`
	LastPrice          string `json:"c"`
	LastQuantity       string `json:"Q"`
	BidPrice           string `json:"b"`
	BidQuantity        string `json:"B"`
	AskPrice           string `json:"a"`
	AskQuantity        string `json:"A"`
	OpenPrice          string `json:"o"`
	HighPrice          string `json:"h"`
	LowPrice           string `json:"l"`
	Volume             string `json:"v"`
	QuoteVolume        string `json:"q"`
	OpenTime           int64  `json:"O"`
	CloseTime          int64  `json:"C"`
	FirstTradeID       int64  `json:"F"`
	LastTradeID        int64  `json:"L"`
	Count              int64  `json:"n"`
}

// ==========================================
// SUB-SUB-FEATURE: Intelligent Reconnection System
// ==========================================

type ReconnectionManager struct {
	strategy        ReconnectionStrategy
	maxAttempts     int
	baseDelay       time.Duration
	maxDelay        time.Duration
	jitter          bool
	exponentialBase float64
	currentAttempts map[string]int
	lastAttemptTime map[string]time.Time
	mu              sync.RWMutex
}

type ReconnectionStrategy interface {
	NextDelay(attempt int) time.Duration
	ShouldReconnect(attempt int, err error) bool
}

type ExponentialBackoffStrategy struct {
	BaseDelay       time.Duration
	MaxDelay        time.Duration
	ExponentialBase float64
	Jitter          bool
}

func (e *ExponentialBackoffStrategy) NextDelay(attempt int) time.Duration {
	delay := float64(e.BaseDelay) * (e.ExponentialBase * float64(attempt))
	if delay > float64(e.MaxDelay) {
		delay = float64(e.MaxDelay)
	}

	if e.Jitter {
		jitterNanos := float64(delay) * 0.1 * float64(2*time.Now().UnixNano()%2-1) / 1e9
		jitter := time.Duration(jitterNanos * float64(time.Second))
		delay += float64(jitter)
	}

	return time.Duration(delay)
}

func (e *ExponentialBackoffStrategy) ShouldReconnect(attempt int, err error) bool {
	return attempt < 10 // Max 10 attempts
}

// ==========================================
// SUB-SUB-FEATURE: Health Monitoring System
// ==========================================

type WSHealthMonitor struct {
	connections         map[string]*ConnectionHealth
	overallHealth       string
	lastHealthCheck     time.Time
	healthCheckInterval time.Duration
	alertThresholds     *HealthThresholds
	mu                  sync.RWMutex
}

type ConnectionHealth struct {
	ConnectionID     string        `json:"connection_id"`
	IsConnected      bool          `json:"is_connected"`
	LastPing         time.Time     `json:"last_ping"`
	LastPong         time.Time     `json:"last_pong"`
	Latency          time.Duration `json:"latency"`
	MessageRate      float64       `json:"message_rate"`
	ErrorRate        float64       `json:"error_rate"`
	ReconnectCount   int64         `json:"reconnect_count"`
	Status           string        `json:"status"`
	LastStatusUpdate time.Time     `json:"last_status_update"`
}

type HealthThresholds struct {
	MaxLatency     time.Duration
	MinMessageRate float64
	MaxErrorRate   float64
	MaxReconnects  int64
}

// ==========================================
// SUB-SUB-FEATURE: Performance Tracking
// ==========================================

type WSPerformanceTracker struct {
	totalMessages     int64
	totalErrors       int64
	totalReconnects   int64
	averageLatency    int64
	throughputPerSec  float64
	peakThroughput    float64
	startTime         time.Time
	lastUpdate        time.Time
	performanceWindow []PerformanceSnapshot
	mu                sync.RWMutex
}

type PerformanceSnapshot struct {
	Timestamp      time.Time `json:"timestamp"`
	MessagesPerSec float64   `json:"messages_per_sec"`
	ErrorRate      float64   `json:"error_rate"`
	AverageLatency int64     `json:"average_latency"`
	ActiveConns    int       `json:"active_connections"`
}

// ==========================================
// SUB-SUB-FEATURE: Circuit Breaker Pattern
// ==========================================

type WSCircuitBreaker struct {
	state               string // "closed", "open", "half_open"
	failureCount        int64
	successCount        int64
	lastFailureTime     time.Time
	failureThreshold    int64
	successThreshold    int64
	timeout             time.Duration
	halfOpenMaxRequests int64
	halfOpenRequests    int64
	mu                  sync.RWMutex
}

// ==========================================
// SUB-FEATURE: Constructor & Initialization
// ==========================================

func NewBinanceWebSocketManager() *BinanceWebSocketManager {
	ctx, cancel := context.WithCancel(context.Background())

	config := NewBinanceWebSocketConfig()

	manager := &BinanceWebSocketManager{
		config:        config,
		connections:   make(map[string]*BinanceWSConnection),
		subscriptions: make(map[string]*SubscriptionGroup),
		messageBuffer: make(chan *WebSocketMessage, config.BufferSize),
		errorChannel:  make(chan error, 1000),
		shutdownChan:  make(chan struct{}),
		ctx:           ctx,
		cancel:        cancel,
	}

	// Initialize sub-components
	manager.reconnectManager = &ReconnectionManager{
		strategy: &ExponentialBackoffStrategy{
			BaseDelay:       2 * time.Second,
			MaxDelay:        300 * time.Second,
			ExponentialBase: 2.0,
			Jitter:          true,
		},
		maxAttempts:     config.MaxReconnectAttempts,
		currentAttempts: make(map[string]int),
		lastAttemptTime: make(map[string]time.Time),
	}

	manager.healthMonitor = &WSHealthMonitor{
		connections:         make(map[string]*ConnectionHealth),
		healthCheckInterval: 30 * time.Second,
		alertThresholds: &HealthThresholds{
			MaxLatency:     5 * time.Second,
			MinMessageRate: 1.0,
			MaxErrorRate:   0.05,
			MaxReconnects:  10,
		},
	}

	manager.performanceTracker = &WSPerformanceTracker{
		startTime:         time.Now(),
		lastUpdate:        time.Now(),
		performanceWindow: make([]PerformanceSnapshot, 0, 100),
	}

	manager.circuitBreaker = &WSCircuitBreaker{
		state:               "closed",
		failureThreshold:    5,
		successThreshold:    3,
		timeout:             60 * time.Second,
		halfOpenMaxRequests: 5,
	}

	return manager
}

// ==========================================
// SUB-FEATURE: Connection Management
// ==========================================

func (bwm *BinanceWebSocketManager) Start() error {
	bwm.mu.Lock()
	defer bwm.mu.Unlock()

	if bwm.isRunning {
		return fmt.Errorf("Binance WebSocket Manager is already running")
	}

	log.Println("🚀 Starting Revolutionary Binance WebSocket Manager...")

	// Start core goroutines
	go bwm.messageProcessor()
	go bwm.errorHandler()
	go bwm.healthChecker()
	go bwm.performanceTrackerRoutine()

	bwm.isRunning = true
	log.Println("✅ Binance WebSocket Manager started successfully")

	return nil
}

func (bwm *BinanceWebSocketManager) CreateConnection(connectionID string, streamType string) (*BinanceWSConnection, error) {
	bwm.mu.Lock()
	defer bwm.mu.Unlock()

	if _, exists := bwm.connections[connectionID]; exists {
		return nil, fmt.Errorf("connection %s already exists", connectionID)
	}

	var wsURL string
	if streamType == "combined" {
		wsURL = bwm.config.CombinedStreamURL
	} else {
		wsURL = bwm.config.BaseURL
	}

	conn := &BinanceWSConnection{
		id:            connectionID,
		url:           wsURL,
		subscriptions: make([]string, 0),
		manager:       bwm,
	}

	if err := conn.connect(); err != nil {
		return nil, fmt.Errorf("failed to create connection: %w", err)
	}

	bwm.connections[connectionID] = conn

	// Initialize health monitoring for this connection
	bwm.healthMonitor.mu.Lock()
	bwm.healthMonitor.connections[connectionID] = &ConnectionHealth{
		ConnectionID:     connectionID,
		IsConnected:      true,
		Status:           "healthy",
		LastStatusUpdate: time.Now(),
	}
	bwm.healthMonitor.mu.Unlock()

	log.Printf("✅ Created Binance WebSocket connection: %s", connectionID)
	return conn, nil
}

func (conn *BinanceWSConnection) connect() error {
	conn.connectionMu.Lock()
	defer conn.connectionMu.Unlock()

	dialer := websocket.Dialer{
		EnableCompression: conn.manager.config.EnableCompression,
		HandshakeTimeout:  30 * time.Second,
	}

	c, _, err := dialer.Dial(conn.url, nil)
	if err != nil {
		return fmt.Errorf("failed to dial %s: %w", conn.url, err)
	}

	c.SetReadLimit(conn.manager.config.MaxMessageSize)
	c.SetReadDeadline(time.Now().Add(conn.manager.config.ReadTimeout))
	c.SetPongHandler(func(appData string) error {
		conn.lastPongTime = time.Now()
		c.SetReadDeadline(time.Now().Add(conn.manager.config.ReadTimeout))
		return nil
	})

	conn.conn = c
	conn.isConnected = true

	// Start message reading goroutine
	go conn.readMessages()

	// Start ping goroutine
	go conn.pingLoop()

	return nil
}

// ==========================================
// SUB-SUB-FEATURE: Message Processing
// ==========================================

func (conn *BinanceWSConnection) readMessages() {
	defer func() {
		conn.connectionMu.Lock()
		conn.isConnected = false
		if conn.conn != nil {
			conn.conn.Close()
		}
		conn.connectionMu.Unlock()

		// Attempt reconnection
		go conn.attemptReconnection()
	}()

	for {
		select {
		case <-conn.manager.ctx.Done():
			return
		default:
			messageType, message, err := conn.conn.ReadMessage()
			if err != nil {
				atomic.AddInt64(&conn.errorCount, 1)
				log.Printf("❌ Binance WebSocket read error: %v", err)
				return
			}

			if messageType == websocket.TextMessage {
				atomic.AddInt64(&conn.messageCount, 1)
				conn.processMessage(message)
			}
		}
	}
}

func (conn *BinanceWSConnection) processMessage(message []byte) {
	wsMsg := &WebSocketMessage{
		ConnectionID: conn.id,
		Data:         json.RawMessage(message),
		Timestamp:    time.Now(),
		Exchange:     "binance",
	}

	// Parse message to extract stream name and symbol
	var streamData struct {
		Stream string          `json:"stream"`
		Data   json.RawMessage `json:"data"`
	}

	if err := json.Unmarshal(message, &streamData); err == nil {
		wsMsg.StreamName = streamData.Stream
		wsMsg.Data = streamData.Data

		// Extract symbol from stream name
		if symbol := extractSymbolFromStream(streamData.Stream); symbol != "" {
			wsMsg.Symbol = symbol
		}
	} else {
		// Direct data without stream wrapper
		var directData map[string]interface{}
		if err := json.Unmarshal(message, &directData); err == nil {
			if symbol, ok := directData["s"].(string); ok {
				wsMsg.Symbol = symbol
			}
			if eventType, ok := directData["e"].(string); ok {
				wsMsg.MessageType = eventType
			}
		}
	}

	// Send to message buffer
	select {
	case conn.manager.messageBuffer <- wsMsg:
	default:
		log.Printf("⚠️ Message buffer full, dropping message from %s", conn.id)
	}
}

func extractSymbolFromStream(streamName string) string {
	// Extract symbol from stream names like "btcusdt@trade" or "btcusdt@ticker"
	if len(streamName) == 0 {
		return ""
	}

	parts := strings.Split(streamName, "@")
	if len(parts) > 0 {
		return strings.ToUpper(parts[0])
	}

	return ""
}

// ==========================================
// SUB-SUB-FEATURE: Subscription Management
// ==========================================

func (bwm *BinanceWebSocketManager) SubscribeToTrades(connectionID string, symbols []string) error {
	conn, exists := bwm.connections[connectionID]
	if !exists {
		return fmt.Errorf("connection %s not found", connectionID)
	}

	streams := make([]string, len(symbols))
	for i, symbol := range symbols {
		streams[i] = strings.ToLower(symbol) + "@trade"
	}

	subscription := &SubscriptionGroup{
		ID:         fmt.Sprintf("trades_%s_%d", connectionID, time.Now().Unix()),
		Method:     "SUBSCRIBE",
		Params:     streams,
		Symbols:    symbols,
		StreamType: "trade",
		Connection: conn,
		IsActive:   true,
		CreatedAt:  time.Now(),
		LastUpdate: time.Now(),
		Metadata:   make(map[string]interface{}),
	}

	if err := conn.subscribe(subscription); err != nil {
		return fmt.Errorf("failed to subscribe to trades: %w", err)
	}

	bwm.mu.Lock()
	bwm.subscriptions[subscription.ID] = subscription
	bwm.mu.Unlock()

	log.Printf("✅ Subscribed to trades for symbols: %v", symbols)
	return nil
}

func (bwm *BinanceWebSocketManager) SubscribeToTickers(connectionID string, symbols []string) error {
	conn, exists := bwm.connections[connectionID]
	if !exists {
		return fmt.Errorf("connection %s not found", connectionID)
	}

	streams := make([]string, len(symbols))
	for i, symbol := range symbols {
		streams[i] = strings.ToLower(symbol) + "@ticker"
	}

	subscription := &SubscriptionGroup{
		ID:         fmt.Sprintf("tickers_%s_%d", connectionID, time.Now().Unix()),
		Method:     "SUBSCRIBE",
		Params:     streams,
		Symbols:    symbols,
		StreamType: "ticker",
		Connection: conn,
		IsActive:   true,
		CreatedAt:  time.Now(),
		LastUpdate: time.Now(),
		Metadata:   make(map[string]interface{}),
	}

	if err := conn.subscribe(subscription); err != nil {
		return fmt.Errorf("failed to subscribe to tickers: %w", err)
	}

	bwm.mu.Lock()
	bwm.subscriptions[subscription.ID] = subscription
	bwm.mu.Unlock()

	log.Printf("✅ Subscribed to tickers for symbols: %v", symbols)
	return nil
}

func (conn *BinanceWSConnection) subscribe(subscription *SubscriptionGroup) error {
	conn.connectionMu.RLock()
	defer conn.connectionMu.RUnlock()

	if !conn.isConnected || conn.conn == nil {
		return fmt.Errorf("connection is not established")
	}

	subMessage := map[string]interface{}{
		"method": subscription.Method,
		"params": subscription.Params,
		"id":     subscription.ID,
	}

	conn.conn.SetWriteDeadline(time.Now().Add(conn.manager.config.WriteTimeout))
	if err := conn.conn.WriteJSON(subMessage); err != nil {
		return fmt.Errorf("failed to send subscription: %w", err)
	}

	conn.subscriptionsMu.Lock()
	conn.subscriptions = append(conn.subscriptions, subscription.ID)
	conn.subscriptionsMu.Unlock()

	return nil
}

// ==========================================
// SUB-SUB-FEATURE: Ping/Pong Mechanism
// ==========================================

func (conn *BinanceWSConnection) pingLoop() {
	ticker := time.NewTicker(conn.manager.config.PingInterval)
	defer ticker.Stop()

	for {
		select {
		case <-conn.manager.ctx.Done():
			return
		case <-ticker.C:
			if !conn.isConnected {
				return
			}

			conn.connectionMu.RLock()
			if conn.conn != nil {
				conn.lastPingTime = time.Now()
				conn.conn.SetWriteDeadline(time.Now().Add(conn.manager.config.WriteTimeout))
				if err := conn.conn.WriteMessage(websocket.PingMessage, []byte{}); err != nil {
					log.Printf("❌ Ping failed for connection %s: %v", conn.id, err)
					conn.connectionMu.RUnlock()
					return
				}
			}
			conn.connectionMu.RUnlock()
		}
	}
}

// ==========================================
// SUB-SUB-FEATURE: Reconnection Logic
// ==========================================

func (conn *BinanceWSConnection) attemptReconnection() {
	manager := conn.manager

	manager.reconnectManager.mu.Lock()
	attempts := manager.reconnectManager.currentAttempts[conn.id]
	manager.reconnectManager.currentAttempts[conn.id] = attempts + 1
	manager.reconnectManager.mu.Unlock()

	if attempts >= manager.config.MaxReconnectAttempts {
		log.Printf("❌ Max reconnection attempts reached for connection %s", conn.id)
		return
	}

	delay := manager.reconnectManager.strategy.NextDelay(attempts)
	log.Printf("🔄 Attempting reconnection for %s in %v (attempt %d)", conn.id, delay, attempts+1)

	time.Sleep(delay)

	if err := conn.connect(); err != nil {
		atomic.AddInt64(&conn.reconnectCount, 1)
		log.Printf("❌ Reconnection failed for %s: %v", conn.id, err)
		go conn.attemptReconnection()
		return
	}

	// Reset attempt counter on successful reconnection
	manager.reconnectManager.mu.Lock()
	manager.reconnectManager.currentAttempts[conn.id] = 0
	manager.reconnectManager.mu.Unlock()

	// Resubscribe to all streams
	conn.resubscribe()

	log.Printf("✅ Successfully reconnected: %s", conn.id)
}

func (conn *BinanceWSConnection) resubscribe() {
	conn.subscriptionsMu.RLock()
	subscriptionIDs := make([]string, len(conn.subscriptions))
	copy(subscriptionIDs, conn.subscriptions)
	conn.subscriptionsMu.RUnlock()

	for _, subID := range subscriptionIDs {
		if sub, exists := conn.manager.subscriptions[subID]; exists && sub.IsActive {
			if err := conn.subscribe(sub); err != nil {
				log.Printf("❌ Failed to resubscribe to %s: %v", subID, err)
			}
		}
	}
}

// ==========================================
// SUB-FEATURE: Message Processing & Health Monitoring
// ==========================================

func (bwm *BinanceWebSocketManager) messageProcessor() {
	for {
		select {
		case <-bwm.ctx.Done():
			return
		case msg := <-bwm.messageBuffer:
			if msg != nil {
				atomic.AddInt64(&bwm.performanceTracker.totalMessages, 1)
				bwm.processWebSocketMessage(msg)
			}
		}
	}
}

func (bwm *BinanceWebSocketManager) processWebSocketMessage(msg *WebSocketMessage) {
	// Convert WebSocket message to unified Tick format
	tick, err := bwm.convertToTick(msg)
	if err != nil {
		log.Printf("❌ Failed to convert message to tick: %v", err)
		return
	}

	// Emit the tick to the main stream
	// This would integrate with the main streaming system
	log.Printf("📊 Processed Binance tick: %s @ $%.2f", tick.Symbol, tick.Price)
}

func (bwm *BinanceWebSocketManager) convertToTick(msg *WebSocketMessage) (Tick, error) {
	switch msg.MessageType {
	case "trade":
		return bwm.convertTradeToTick(msg)
	case "24hrTicker":
		return bwm.convertTickerToTick(msg)
	default:
		// Try to detect message type from data
		return bwm.detectAndConvertMessage(msg)
	}
}

func (bwm *BinanceWebSocketManager) convertTradeToTick(msg *WebSocketMessage) (Tick, error) {
	var trade BinanceTradeData
	if err := json.Unmarshal(msg.Data, &trade); err != nil {
		return Tick{}, err
	}

	price, _ := strconv.ParseFloat(trade.Price, 64)
	quantity, _ := strconv.ParseFloat(trade.Quantity, 64)

	return Tick{
		Symbol:    trade.Symbol,
		Timestamp: time.UnixMilli(trade.TradeTime),
		Price:     price,
		Volume:    quantity,
	}, nil
}

func (bwm *BinanceWebSocketManager) convertTickerToTick(msg *WebSocketMessage) (Tick, error) {
	var ticker BinanceTickerData
	if err := json.Unmarshal(msg.Data, &ticker); err != nil {
		return Tick{}, err
	}

	price, _ := strconv.ParseFloat(ticker.LastPrice, 64)
	volume, _ := strconv.ParseFloat(ticker.Volume, 64)

	return Tick{
		Symbol:    ticker.Symbol,
		Timestamp: time.UnixMilli(ticker.EventTime),
		Price:     price,
		Volume:    volume,
	}, nil
}

func (bwm *BinanceWebSocketManager) detectAndConvertMessage(msg *WebSocketMessage) (Tick, error) {
	// Try to auto-detect message type and convert
	var raw map[string]interface{}
	if err := json.Unmarshal(msg.Data, &raw); err != nil {
		return Tick{}, err
	}

	if eventType, ok := raw["e"].(string); ok {
		msg.MessageType = eventType
		return bwm.convertToTick(msg)
	}

	return Tick{}, fmt.Errorf("unknown message format")
}

func (bwm *BinanceWebSocketManager) healthChecker() {
	ticker := time.NewTicker(bwm.healthMonitor.healthCheckInterval)
	defer ticker.Stop()

	for {
		select {
		case <-bwm.ctx.Done():
			return
		case <-ticker.C:
			bwm.performHealthCheck()
		}
	}
}

func (bwm *BinanceWebSocketManager) performHealthCheck() {
	bwm.healthMonitor.mu.Lock()
	defer bwm.healthMonitor.mu.Unlock()

	healthy := 0
	total := 0

	for connID, conn := range bwm.connections {
		health := bwm.healthMonitor.connections[connID]
		if health == nil {
			continue
		}

		total++

		// Update connection health metrics
		health.IsConnected = conn.isConnected
		health.MessageRate = float64(atomic.LoadInt64(&conn.messageCount)) / time.Since(health.LastStatusUpdate).Seconds()
		health.ErrorRate = float64(atomic.LoadInt64(&conn.errorCount)) / math.Max(1, float64(atomic.LoadInt64(&conn.messageCount)))
		health.ReconnectCount = atomic.LoadInt64(&conn.reconnectCount)

		// Calculate latency
		if !conn.lastPongTime.IsZero() && !conn.lastPingTime.IsZero() {
			health.Latency = conn.lastPongTime.Sub(conn.lastPingTime)
		}

		// Determine health status
		if conn.isConnected &&
			health.Latency < bwm.healthMonitor.alertThresholds.MaxLatency &&
			health.ErrorRate < bwm.healthMonitor.alertThresholds.MaxErrorRate &&
			health.ReconnectCount < bwm.healthMonitor.alertThresholds.MaxReconnects {
			health.Status = "healthy"
			healthy++
		} else {
			health.Status = "unhealthy"
		}

		health.LastStatusUpdate = time.Now()
	}

	// Determine overall health
	if total == 0 {
		bwm.healthMonitor.overallHealth = "no_connections"
	} else if healthy == total {
		bwm.healthMonitor.overallHealth = "healthy"
	} else if healthy > total/2 {
		bwm.healthMonitor.overallHealth = "degraded"
	} else {
		bwm.healthMonitor.overallHealth = "unhealthy"
	}

	bwm.healthMonitor.lastHealthCheck = time.Now()

	log.Printf("🏥 Binance WS Health: %s (%d/%d connections healthy)",
		bwm.healthMonitor.overallHealth, healthy, total)
}

func (bwm *BinanceWebSocketManager) performanceTrackerRoutine() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-bwm.ctx.Done():
			return
		case <-ticker.C:
			bwm.updatePerformanceMetrics()
		}
	}
}

func (bwm *BinanceWebSocketManager) updatePerformanceMetrics() {
	bwm.performanceTracker.mu.Lock()
	defer bwm.performanceTracker.mu.Unlock()

	now := time.Now()

	totalMessages := atomic.LoadInt64(&bwm.performanceTracker.totalMessages)
	currentThroughput := float64(totalMessages) / time.Since(bwm.performanceTracker.startTime).Seconds()

	if currentThroughput > bwm.performanceTracker.peakThroughput {
		bwm.performanceTracker.peakThroughput = currentThroughput
	}

	bwm.performanceTracker.throughputPerSec = currentThroughput
	bwm.performanceTracker.lastUpdate = now

	// Add performance snapshot
	snapshot := PerformanceSnapshot{
		Timestamp:      now,
		MessagesPerSec: currentThroughput,
		ErrorRate:      float64(atomic.LoadInt64(&bwm.performanceTracker.totalErrors)) / math.Max(1, float64(totalMessages)),
		ActiveConns:    len(bwm.connections),
	}

	bwm.performanceTracker.performanceWindow = append(bwm.performanceTracker.performanceWindow, snapshot)

	// Keep only last 100 snapshots
	if len(bwm.performanceTracker.performanceWindow) > 100 {
		bwm.performanceTracker.performanceWindow = bwm.performanceTracker.performanceWindow[1:]
	}
}

// ==========================================
// SUB-FEATURE: API Interface & Management
// ==========================================

func (bwm *BinanceWebSocketManager) GetActiveConnections() map[string]*BinanceWSConnection {
	bwm.mu.RLock()
	defer bwm.mu.RUnlock()

	connections := make(map[string]*BinanceWSConnection)
	for id, conn := range bwm.connections {
		connections[id] = conn
	}
	return connections
}

func (bwm *BinanceWebSocketManager) GetHealthStatus() map[string]interface{} {
	bwm.healthMonitor.mu.RLock()
	defer bwm.healthMonitor.mu.RUnlock()

	return map[string]interface{}{
		"overall_health":       bwm.healthMonitor.overallHealth,
		"last_health_check":    bwm.healthMonitor.lastHealthCheck,
		"connection_health":    bwm.healthMonitor.connections,
		"total_connections":    len(bwm.connections),
		"active_subscriptions": len(bwm.subscriptions),
	}
}

func (bwm *BinanceWebSocketManager) GetPerformanceMetrics() map[string]interface{} {
	bwm.performanceTracker.mu.RLock()
	defer bwm.performanceTracker.mu.RUnlock()

	return map[string]interface{}{
		"total_messages":     atomic.LoadInt64(&bwm.performanceTracker.totalMessages),
		"total_errors":       atomic.LoadInt64(&bwm.performanceTracker.totalErrors),
		"total_reconnects":   atomic.LoadInt64(&bwm.performanceTracker.totalReconnects),
		"throughput_per_sec": bwm.performanceTracker.throughputPerSec,
		"peak_throughput":    bwm.performanceTracker.peakThroughput,
		"uptime":             time.Since(bwm.performanceTracker.startTime),
		"performance_window": bwm.performanceTracker.performanceWindow,
	}
}

// ==========================================
// SUB-FEATURE: Graceful Shutdown
// ==========================================

func (bwm *BinanceWebSocketManager) Stop() {
	bwm.mu.Lock()
	defer bwm.mu.Unlock()

	if !bwm.isRunning {
		return
	}

	log.Println("🛑 Stopping Binance WebSocket Manager...")

	bwm.cancel()
	close(bwm.shutdownChan)

	// Close all connections gracefully
	for _, conn := range bwm.connections {
		conn.close()
	}

	bwm.isRunning = false
	log.Println("✅ Binance WebSocket Manager stopped successfully")
}

func (conn *BinanceWSConnection) close() {
	conn.connectionMu.Lock()
	defer conn.connectionMu.Unlock()

	if conn.conn != nil {
		conn.conn.Close()
		conn.conn = nil
	}
	conn.isConnected = false
}

// ==========================================
// SUB-FEATURE: Revolutionary Factory Function
// ==========================================

func NewBinanceWebSocket() *BinanceWebSocketManager {
	return NewBinanceWebSocketManager()
}

// Add missing errorHandler method
func (bwm *BinanceWebSocketManager) errorHandler() {
	for {
		select {
		case <-bwm.ctx.Done():
			return
		case err := <-bwm.errorChannel:
			if err != nil {
				log.Printf("❌ Binance WebSocket Error: %v", err)
				atomic.AddInt64(&bwm.performanceTracker.totalErrors, 1)
			}
		}
	}
}
