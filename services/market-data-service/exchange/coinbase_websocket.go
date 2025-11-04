// ========================================
// REVOLUTIONARY COINBASE WEBSOCKET INTEGRATION
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
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
)

// ==========================================
// SUB-FEATURE: Core Coinbase WebSocket Configuration
// ==========================================

type CoinbaseWebSocketConfig struct {
	BaseURL                  string
	SandboxURL               string
	MaxReconnectAttempts     int
	ReconnectInterval        time.Duration
	PingInterval             time.Duration
	ReadTimeout              time.Duration
	WriteTimeout             time.Duration
	MaxMessageSize           int64
	BufferSize               int
	EnableCompression        bool
	EnableRateLimiting       bool
	MaxChannelsPerConnection int
	UseAuthentication        bool
	APIKey                   string
	APISecret                string
	Passphrase               string
}

func NewCoinbaseWebSocketConfig() *CoinbaseWebSocketConfig {
	return &CoinbaseWebSocketConfig{
		BaseURL:                  "wss://ws-feed.pro.coinbase.com",
		SandboxURL:               "wss://ws-feed-public.sandbox.pro.coinbase.com",
		MaxReconnectAttempts:     10,
		ReconnectInterval:        5 * time.Second,
		PingInterval:             30 * time.Second,
		ReadTimeout:              60 * time.Second,
		WriteTimeout:             10 * time.Second,
		MaxMessageSize:           1024 * 1024, // 1MB
		BufferSize:               10000,
		EnableCompression:        true,
		EnableRateLimiting:       true,
		MaxChannelsPerConnection: 50, // Coinbase limit
		UseAuthentication:        false,
	}
}

// ==========================================
// SUB-FEATURE: Advanced Coinbase WebSocket Manager
// ==========================================

type CoinbaseWebSocketManager struct {
	config             *CoinbaseWebSocketConfig
	connections        map[string]*CoinbaseWSConnection
	subscriptions      map[string]*CoinbaseSubscription
	messageBuffer      chan *CoinbaseWSMessage
	errorChannel       chan error
	reconnectManager   *CoinbaseReconnectionManager
	healthMonitor      *CoinbaseWSHealthMonitor
	performanceTracker *CoinbaseWSPerformanceTracker
	circuitBreaker     *CoinbaseWSCircuitBreaker
	authenticator      *CoinbaseAuthenticator
	mu                 sync.RWMutex
	isRunning          bool
	shutdownChan       chan struct{}
	ctx                context.Context
	cancel             context.CancelFunc
}

// ==========================================
// SUB-SUB-FEATURE: Coinbase WebSocket Connection
// ==========================================

type CoinbaseWSConnection struct {
	id              string
	conn            *websocket.Conn
	url             string
	channels        []string
	products        []string
	isConnected     bool
	isAuthenticated bool
	lastPingTime    time.Time
	lastPongTime    time.Time
	messageCount    int64
	errorCount      int64
	reconnectCount  int64
	channelsMu      sync.RWMutex
	connectionMu    sync.RWMutex
	manager         *CoinbaseWebSocketManager
}

// ==========================================
// SUB-SUB-FEATURE: Coinbase Subscription Management
// ==========================================

type CoinbaseSubscription struct {
	ID              string                 `json:"id"`
	Type            string                 `json:"type"`
	ProductIDs      []string               `json:"product_ids"`
	Channels        []CoinbaseChannel      `json:"channels"`
	Connection      *CoinbaseWSConnection  `json:"-"`
	IsActive        bool                   `json:"is_active"`
	CreatedAt       time.Time              `json:"created_at"`
	LastUpdate      time.Time              `json:"last_update"`
	MessageRate     float64                `json:"message_rate"`
	IsAuthenticated bool                   `json:"is_authenticated"`
	Metadata        map[string]interface{} `json:"metadata"`
}

type CoinbaseChannel struct {
	Name       string   `json:"name"`
	ProductIDs []string `json:"product_ids"`
}

// ==========================================
// SUB-SUB-FEATURE: Advanced Coinbase Message Types
// ==========================================

type CoinbaseWSMessage struct {
	ConnectionID string                 `json:"connection_id"`
	Type         string                 `json:"type"`
	ProductID    string                 `json:"product_id"`
	Data         json.RawMessage        `json:"data"`
	Timestamp    time.Time              `json:"timestamp"`
	Exchange     string                 `json:"exchange"`
	Sequence     int64                  `json:"sequence"`
	Metadata     map[string]interface{} `json:"metadata"`
}

type CoinbaseTickerMessage struct {
	Type      string    `json:"type"`
	Sequence  int64     `json:"sequence"`
	ProductID string    `json:"product_id"`
	Price     string    `json:"price"`
	Open24H   string    `json:"open_24h"`
	Volume24H string    `json:"volume_24h"`
	Low24H    string    `json:"low_24h"`
	High24H   string    `json:"high_24h"`
	Volume30D string    `json:"volume_30d"`
	BestBid   string    `json:"best_bid"`
	BestAsk   string    `json:"best_ask"`
	Side      string    `json:"side"`
	Time      time.Time `json:"time"`
	TradeID   int64     `json:"trade_id"`
	LastSize  string    `json:"last_size"`
}

type CoinbaseTradeMessage struct {
	Type         string    `json:"type"`
	TradeID      int64     `json:"trade_id"`
	Sequence     int64     `json:"sequence"`
	MakerOrderID string    `json:"maker_order_id"`
	TakerOrderID string    `json:"taker_order_id"`
	Time         time.Time `json:"time"`
	ProductID    string    `json:"product_id"`
	Size         string    `json:"size"`
	Price        string    `json:"price"`
	Side         string    `json:"side"`
}

type CoinbaseLevel2Message struct {
	Type      string     `json:"type"`
	ProductID string     `json:"product_id"`
	Changes   [][]string `json:"changes"`
	Time      time.Time  `json:"time"`
}

// ==========================================
// SUB-SUB-FEATURE: Coinbase Authentication System
// ==========================================

type CoinbaseAuthenticator struct {
	apiKey       string
	apiSecret    string
	passphrase   string
	isEnabled    bool
	lastAuthTime time.Time
	mu           sync.RWMutex
}

func NewCoinbaseAuthenticator(apiKey, apiSecret, passphrase string) *CoinbaseAuthenticator {
	return &CoinbaseAuthenticator{
		apiKey:     apiKey,
		apiSecret:  apiSecret,
		passphrase: passphrase,
		isEnabled:  len(apiKey) > 0 && len(apiSecret) > 0 && len(passphrase) > 0,
	}
}

// ==========================================
// SUB-SUB-FEATURE: Coinbase Reconnection Manager
// ==========================================

type CoinbaseReconnectionManager struct {
	strategy        CoinbaseReconnectionStrategy
	maxAttempts     int
	baseDelay       time.Duration
	maxDelay        time.Duration
	jitter          bool
	exponentialBase float64
	currentAttempts map[string]int
	lastAttemptTime map[string]time.Time
	mu              sync.RWMutex
}

type CoinbaseReconnectionStrategy interface {
	NextDelay(attempt int) time.Duration
	ShouldReconnect(attempt int, err error) bool
}

type CoinbaseExponentialBackoffStrategy struct {
	BaseDelay       time.Duration
	MaxDelay        time.Duration
	ExponentialBase float64
	Jitter          bool
}

func (e *CoinbaseExponentialBackoffStrategy) NextDelay(attempt int) time.Duration {
	delay := float64(e.BaseDelay) * math.Pow(e.ExponentialBase, float64(attempt))
	if delay > float64(e.MaxDelay) {
		delay = float64(e.MaxDelay)
	}

	if e.Jitter {
		jitterRange := delay * 0.1
		jitter := (2*rand() - 1) * jitterRange
		delay += jitter
	}

	return time.Duration(delay)
}

func (e *CoinbaseExponentialBackoffStrategy) ShouldReconnect(attempt int, err error) bool {
	return attempt < 10 // Max 10 attempts
}

func rand() float64 {
	return float64(time.Now().UnixNano()%1000) / 1000.0
}

// ==========================================
// SUB-SUB-FEATURE: Coinbase Health Monitoring
// ==========================================

type CoinbaseWSHealthMonitor struct {
	connections         map[string]*CoinbaseConnectionHealth
	overallHealth       string
	lastHealthCheck     time.Time
	healthCheckInterval time.Duration
	alertThresholds     *CoinbaseHealthThresholds
	mu                  sync.RWMutex
}

type CoinbaseConnectionHealth struct {
	ConnectionID     string        `json:"connection_id"`
	IsConnected      bool          `json:"is_connected"`
	IsAuthenticated  bool          `json:"is_authenticated"`
	LastPing         time.Time     `json:"last_ping"`
	LastPong         time.Time     `json:"last_pong"`
	Latency          time.Duration `json:"latency"`
	MessageRate      float64       `json:"message_rate"`
	ErrorRate        float64       `json:"error_rate"`
	ReconnectCount   int64         `json:"reconnect_count"`
	Status           string        `json:"status"`
	LastStatusUpdate time.Time     `json:"last_status_update"`
	ChannelCount     int           `json:"channel_count"`
	ProductCount     int           `json:"product_count"`
}

type CoinbaseHealthThresholds struct {
	MaxLatency     time.Duration
	MinMessageRate float64
	MaxErrorRate   float64
	MaxReconnects  int64
	MaxChannels    int
}

// ==========================================
// SUB-SUB-FEATURE: Coinbase Performance Tracking
// ==========================================

type CoinbaseWSPerformanceTracker struct {
	totalMessages     int64
	totalErrors       int64
	totalReconnects   int64
	averageLatency    int64
	throughputPerSec  float64
	peakThroughput    float64
	startTime         time.Time
	lastUpdate        time.Time
	performanceWindow []CoinbasePerformanceSnapshot
	mu                sync.RWMutex
}

type CoinbasePerformanceSnapshot struct {
	Timestamp      time.Time `json:"timestamp"`
	MessagesPerSec float64   `json:"messages_per_sec"`
	ErrorRate      float64   `json:"error_rate"`
	AverageLatency int64     `json:"average_latency"`
	ActiveConns    int       `json:"active_connections"`
	TotalChannels  int       `json:"total_channels"`
}

// ==========================================
// SUB-SUB-FEATURE: Coinbase Circuit Breaker
// ==========================================

type CoinbaseWSCircuitBreaker struct {
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

func NewCoinbaseWebSocketManager() *CoinbaseWebSocketManager {
	ctx, cancel := context.WithCancel(context.Background())

	config := NewCoinbaseWebSocketConfig()

	manager := &CoinbaseWebSocketManager{
		config:        config,
		connections:   make(map[string]*CoinbaseWSConnection),
		subscriptions: make(map[string]*CoinbaseSubscription),
		messageBuffer: make(chan *CoinbaseWSMessage, config.BufferSize),
		errorChannel:  make(chan error, 1000),
		shutdownChan:  make(chan struct{}),
		ctx:           ctx,
		cancel:        cancel,
	}

	// Initialize sub-components
	manager.reconnectManager = &CoinbaseReconnectionManager{
		strategy: &CoinbaseExponentialBackoffStrategy{
			BaseDelay:       2 * time.Second,
			MaxDelay:        300 * time.Second,
			ExponentialBase: 2.0,
			Jitter:          true,
		},
		maxAttempts:     config.MaxReconnectAttempts,
		currentAttempts: make(map[string]int),
		lastAttemptTime: make(map[string]time.Time),
	}

	manager.healthMonitor = &CoinbaseWSHealthMonitor{
		connections:         make(map[string]*CoinbaseConnectionHealth),
		healthCheckInterval: 30 * time.Second,
		alertThresholds: &CoinbaseHealthThresholds{
			MaxLatency:     5 * time.Second,
			MinMessageRate: 1.0,
			MaxErrorRate:   0.05,
			MaxReconnects:  10,
			MaxChannels:    50,
		},
	}

	manager.performanceTracker = &CoinbaseWSPerformanceTracker{
		startTime:         time.Now(),
		lastUpdate:        time.Now(),
		performanceWindow: make([]CoinbasePerformanceSnapshot, 0, 100),
	}

	manager.circuitBreaker = &CoinbaseWSCircuitBreaker{
		state:               "closed",
		failureThreshold:    5,
		successThreshold:    3,
		timeout:             60 * time.Second,
		halfOpenMaxRequests: 5,
	}

	manager.authenticator = NewCoinbaseAuthenticator(
		config.APIKey,
		config.APISecret,
		config.Passphrase,
	)

	return manager
}

// ==========================================
// SUB-FEATURE: Connection Management
// ==========================================

func (cwm *CoinbaseWebSocketManager) Start() error {
	cwm.mu.Lock()
	defer cwm.mu.Unlock()

	if cwm.isRunning {
		return fmt.Errorf("Coinbase WebSocket Manager is already running")
	}

	log.Println("🚀 Starting Revolutionary Coinbase WebSocket Manager...")

	// Start core goroutines
	go cwm.messageProcessor()
	go cwm.errorHandler()
	go cwm.healthChecker()
	go cwm.performanceMonitor()

	cwm.isRunning = true
	log.Println("✅ Coinbase WebSocket Manager started successfully")

	return nil
}

func (cwm *CoinbaseWebSocketManager) CreateConnection(connectionID string, useSandbox bool) (*CoinbaseWSConnection, error) {
	cwm.mu.Lock()
	defer cwm.mu.Unlock()

	if _, exists := cwm.connections[connectionID]; exists {
		return nil, fmt.Errorf("connection %s already exists", connectionID)
	}

	var wsURL string
	if useSandbox {
		wsURL = cwm.config.SandboxURL
	} else {
		wsURL = cwm.config.BaseURL
	}

	conn := &CoinbaseWSConnection{
		id:       connectionID,
		url:      wsURL,
		channels: make([]string, 0),
		products: make([]string, 0),
		manager:  cwm,
	}

	if err := conn.connect(); err != nil {
		return nil, fmt.Errorf("failed to create connection: %w", err)
	}

	cwm.connections[connectionID] = conn

	// Initialize health monitoring for this connection
	cwm.healthMonitor.mu.Lock()
	cwm.healthMonitor.connections[connectionID] = &CoinbaseConnectionHealth{
		ConnectionID:     connectionID,
		IsConnected:      true,
		IsAuthenticated:  conn.isAuthenticated,
		Status:           "healthy",
		LastStatusUpdate: time.Now(),
	}
	cwm.healthMonitor.mu.Unlock()

	log.Printf("✅ Created Coinbase WebSocket connection: %s", connectionID)
	return conn, nil
}

func (conn *CoinbaseWSConnection) connect() error {
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

func (conn *CoinbaseWSConnection) readMessages() {
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
				log.Printf("❌ Coinbase WebSocket read error: %v", err)
				return
			}

			if messageType == websocket.TextMessage {
				atomic.AddInt64(&conn.messageCount, 1)
				conn.processMessage(message)
			}
		}
	}
}

func (conn *CoinbaseWSConnection) processMessage(message []byte) {
	wsMsg := &CoinbaseWSMessage{
		ConnectionID: conn.id,
		Data:         json.RawMessage(message),
		Timestamp:    time.Now(),
		Exchange:     "coinbase",
	}

	// Parse message to extract type and product_id
	var baseMessage struct {
		Type      string `json:"type"`
		ProductID string `json:"product_id"`
		Sequence  int64  `json:"sequence"`
	}

	if err := json.Unmarshal(message, &baseMessage); err == nil {
		wsMsg.Type = baseMessage.Type
		wsMsg.ProductID = baseMessage.ProductID
		wsMsg.Sequence = baseMessage.Sequence
	}

	// Send to message buffer
	select {
	case conn.manager.messageBuffer <- wsMsg:
	default:
		log.Printf("⚠️ Message buffer full, dropping message from %s", conn.id)
	}
}

// ==========================================
// SUB-SUB-FEATURE: Subscription Management
// ==========================================

func (cwm *CoinbaseWebSocketManager) SubscribeToTicker(connectionID string, productIDs []string) error {
	conn, exists := cwm.connections[connectionID]
	if !exists {
		return fmt.Errorf("connection %s not found", connectionID)
	}

	channels := []CoinbaseChannel{
		{
			Name:       "ticker",
			ProductIDs: productIDs,
		},
	}

	subscription := &CoinbaseSubscription{
		ID:         fmt.Sprintf("ticker_%s_%d", connectionID, time.Now().Unix()),
		Type:       "subscribe",
		ProductIDs: productIDs,
		Channels:   channels,
		Connection: conn,
		IsActive:   true,
		CreatedAt:  time.Now(),
		LastUpdate: time.Now(),
		Metadata:   make(map[string]interface{}),
	}

	if err := conn.subscribe(subscription); err != nil {
		return fmt.Errorf("failed to subscribe to ticker: %w", err)
	}

	cwm.mu.Lock()
	cwm.subscriptions[subscription.ID] = subscription
	cwm.mu.Unlock()

	log.Printf("✅ Subscribed to Coinbase ticker for products: %v", productIDs)
	return nil
}

func (cwm *CoinbaseWebSocketManager) SubscribeToMatches(connectionID string, productIDs []string) error {
	conn, exists := cwm.connections[connectionID]
	if !exists {
		return fmt.Errorf("connection %s not found", connectionID)
	}

	channels := []CoinbaseChannel{
		{
			Name:       "matches",
			ProductIDs: productIDs,
		},
	}

	subscription := &CoinbaseSubscription{
		ID:         fmt.Sprintf("matches_%s_%d", connectionID, time.Now().Unix()),
		Type:       "subscribe",
		ProductIDs: productIDs,
		Channels:   channels,
		Connection: conn,
		IsActive:   true,
		CreatedAt:  time.Now(),
		LastUpdate: time.Now(),
		Metadata:   make(map[string]interface{}),
	}

	if err := conn.subscribe(subscription); err != nil {
		return fmt.Errorf("failed to subscribe to matches: %w", err)
	}

	cwm.mu.Lock()
	cwm.subscriptions[subscription.ID] = subscription
	cwm.mu.Unlock()

	log.Printf("✅ Subscribed to Coinbase matches for products: %v", productIDs)
	return nil
}

func (cwm *CoinbaseWebSocketManager) SubscribeToLevel2(connectionID string, productIDs []string) error {
	conn, exists := cwm.connections[connectionID]
	if !exists {
		return fmt.Errorf("connection %s not found", connectionID)
	}

	channels := []CoinbaseChannel{
		{
			Name:       "level2",
			ProductIDs: productIDs,
		},
	}

	subscription := &CoinbaseSubscription{
		ID:         fmt.Sprintf("level2_%s_%d", connectionID, time.Now().Unix()),
		Type:       "subscribe",
		ProductIDs: productIDs,
		Channels:   channels,
		Connection: conn,
		IsActive:   true,
		CreatedAt:  time.Now(),
		LastUpdate: time.Now(),
		Metadata:   make(map[string]interface{}),
	}

	if err := conn.subscribe(subscription); err != nil {
		return fmt.Errorf("failed to subscribe to level2: %w", err)
	}

	cwm.mu.Lock()
	cwm.subscriptions[subscription.ID] = subscription
	cwm.mu.Unlock()

	log.Printf("✅ Subscribed to Coinbase level2 for products: %v", productIDs)
	return nil
}

func (conn *CoinbaseWSConnection) subscribe(subscription *CoinbaseSubscription) error {
	conn.connectionMu.RLock()
	defer conn.connectionMu.RUnlock()

	if !conn.isConnected || conn.conn == nil {
		return fmt.Errorf("connection is not established")
	}

	subMessage := map[string]interface{}{
		"type":        subscription.Type,
		"product_ids": subscription.ProductIDs,
		"channels":    subscription.Channels,
	}

	conn.conn.SetWriteDeadline(time.Now().Add(conn.manager.config.WriteTimeout))
	if err := conn.conn.WriteJSON(subMessage); err != nil {
		return fmt.Errorf("failed to send subscription: %w", err)
	}

	conn.channelsMu.Lock()
	for _, channel := range subscription.Channels {
		conn.channels = append(conn.channels, channel.Name)
		conn.products = append(conn.products, channel.ProductIDs...)
	}
	conn.channelsMu.Unlock()

	return nil
}

// ==========================================
// SUB-SUB-FEATURE: Ping/Pong Mechanism
// ==========================================

func (conn *CoinbaseWSConnection) pingLoop() {
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

func (conn *CoinbaseWSConnection) attemptReconnection() {
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

	// Resubscribe to all channels
	conn.resubscribe()

	log.Printf("✅ Successfully reconnected: %s", conn.id)
}

func (conn *CoinbaseWSConnection) resubscribe() {
	conn.channelsMu.RLock()
	channels := make([]string, len(conn.channels))
	products := make([]string, len(conn.products))
	copy(channels, conn.channels)
	copy(products, conn.products)
	conn.channelsMu.RUnlock()

	// Group products by channel and resubscribe
	channelProducts := make(map[string][]string)
	for i, channel := range channels {
		if i < len(products) {
			channelProducts[channel] = append(channelProducts[channel], products[i])
		}
	}

	for channel, prods := range channelProducts {
		switch channel {
		case "ticker":
			conn.manager.SubscribeToTicker(conn.id, prods)
		case "matches":
			conn.manager.SubscribeToMatches(conn.id, prods)
		case "level2":
			conn.manager.SubscribeToLevel2(conn.id, prods)
		}
	}
}

// ==========================================
// SUB-FEATURE: Message Processing & Health Monitoring
// ==========================================

func (cwm *CoinbaseWebSocketManager) messageProcessor() {
	for {
		select {
		case <-cwm.ctx.Done():
			return
		case msg := <-cwm.messageBuffer:
			cwm.processWebSocketMessage(msg)
			atomic.AddInt64(&cwm.performanceTracker.totalMessages, 1)
		}
	}
}

func (cwm *CoinbaseWebSocketManager) processWebSocketMessage(msg *CoinbaseWSMessage) {
	// Convert WebSocket message to unified Tick format
	tick, err := cwm.convertToTick(msg)
	if err != nil {
		log.Printf("❌ Failed to convert message to tick: %v", err)
		return
	}

	// Emit the tick to the main stream
	log.Printf("📊 Processed Coinbase tick: %s @ $%.2f", tick.Symbol, tick.Price)
}

func (cwm *CoinbaseWebSocketManager) convertToTick(msg *CoinbaseWSMessage) (Tick, error) {
	switch msg.Type {
	case "ticker":
		return cwm.convertTickerToTick(msg)
	case "match":
		return cwm.convertMatchToTick(msg)
	case "l2update":
		return cwm.convertLevel2ToTick(msg)
	default:
		return Tick{}, fmt.Errorf("unsupported message type: %s", msg.Type)
	}
}

func (cwm *CoinbaseWebSocketManager) convertTickerToTick(msg *CoinbaseWSMessage) (Tick, error) {
	var ticker CoinbaseTickerMessage
	if err := json.Unmarshal(msg.Data, &ticker); err != nil {
		return Tick{}, err
	}

	price, _ := strconv.ParseFloat(ticker.Price, 64)
	volume24h, _ := strconv.ParseFloat(ticker.Volume24H, 64)

	return Tick{
		Symbol:    ticker.ProductID,
		Timestamp: ticker.Time,
		Price:     price,
		Volume:    volume24h,
	}, nil
}

func (cwm *CoinbaseWebSocketManager) convertMatchToTick(msg *CoinbaseWSMessage) (Tick, error) {
	var trade CoinbaseTradeMessage
	if err := json.Unmarshal(msg.Data, &trade); err != nil {
		return Tick{}, err
	}

	price, _ := strconv.ParseFloat(trade.Price, 64)
	size, _ := strconv.ParseFloat(trade.Size, 64)

	return Tick{
		Symbol:    trade.ProductID,
		Timestamp: trade.Time,
		Price:     price,
		Volume:    size,
	}, nil
}

func (cwm *CoinbaseWebSocketManager) convertLevel2ToTick(msg *CoinbaseWSMessage) (Tick, error) {
	var level2 CoinbaseLevel2Message
	if err := json.Unmarshal(msg.Data, &level2); err != nil {
		return Tick{}, err
	}

	// For level2 updates, we'll use the first change as the tick
	if len(level2.Changes) > 0 && len(level2.Changes[0]) >= 2 {
		price, _ := strconv.ParseFloat(level2.Changes[0][1], 64)
		size, _ := strconv.ParseFloat(level2.Changes[0][2], 64)

		return Tick{
			Symbol:    level2.ProductID,
			Timestamp: level2.Time,
			Price:     price,
			Volume:    size,
		}, nil
	}

	return Tick{}, fmt.Errorf("invalid level2 data")
}

func (cwm *CoinbaseWebSocketManager) errorHandler() {
	for {
		select {
		case <-cwm.ctx.Done():
			return
		case err := <-cwm.errorChannel:
			atomic.AddInt64(&cwm.performanceTracker.totalErrors, 1)
			log.Printf("❌ Coinbase WebSocket error: %v", err)
		}
	}
}

func (cwm *CoinbaseWebSocketManager) healthChecker() {
	ticker := time.NewTicker(cwm.healthMonitor.healthCheckInterval)
	defer ticker.Stop()

	for {
		select {
		case <-cwm.ctx.Done():
			return
		case <-ticker.C:
			cwm.performHealthCheck()
		}
	}
}

func (cwm *CoinbaseWebSocketManager) performHealthCheck() {
	cwm.healthMonitor.mu.Lock()
	defer cwm.healthMonitor.mu.Unlock()

	healthy := 0
	total := 0

	for connID, conn := range cwm.connections {
		health := cwm.healthMonitor.connections[connID]
		if health == nil {
			continue
		}

		total++

		// Update connection health metrics
		health.IsConnected = conn.isConnected
		health.IsAuthenticated = conn.isAuthenticated
		health.MessageRate = float64(atomic.LoadInt64(&conn.messageCount)) / time.Since(health.LastStatusUpdate).Seconds()
		health.ErrorRate = float64(atomic.LoadInt64(&conn.errorCount)) / math.Max(1, float64(atomic.LoadInt64(&conn.messageCount)))
		health.ReconnectCount = atomic.LoadInt64(&conn.reconnectCount)

		conn.channelsMu.RLock()
		health.ChannelCount = len(conn.channels)
		health.ProductCount = len(conn.products)
		conn.channelsMu.RUnlock()

		// Calculate latency
		if !conn.lastPongTime.IsZero() && !conn.lastPingTime.IsZero() {
			health.Latency = conn.lastPongTime.Sub(conn.lastPingTime)
		}

		// Determine health status
		if conn.isConnected &&
			health.Latency < cwm.healthMonitor.alertThresholds.MaxLatency &&
			health.ErrorRate < cwm.healthMonitor.alertThresholds.MaxErrorRate &&
			health.ReconnectCount < cwm.healthMonitor.alertThresholds.MaxReconnects &&
			health.ChannelCount <= cwm.healthMonitor.alertThresholds.MaxChannels {
			health.Status = "healthy"
			healthy++
		} else {
			health.Status = "unhealthy"
		}

		health.LastStatusUpdate = time.Now()
	}

	// Determine overall health
	if total == 0 {
		cwm.healthMonitor.overallHealth = "no_connections"
	} else if healthy == total {
		cwm.healthMonitor.overallHealth = "healthy"
	} else if healthy > total/2 {
		cwm.healthMonitor.overallHealth = "degraded"
	} else {
		cwm.healthMonitor.overallHealth = "unhealthy"
	}

	cwm.healthMonitor.lastHealthCheck = time.Now()

	log.Printf("🏥 Coinbase WS Health: %s (%d/%d connections healthy)",
		cwm.healthMonitor.overallHealth, healthy, total)
}

func (cwm *CoinbaseWebSocketManager) performanceMonitor() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-cwm.ctx.Done():
			return
		case <-ticker.C:
			cwm.updatePerformanceMetrics()
		}
	}
}

func (cwm *CoinbaseWebSocketManager) updatePerformanceMetrics() {
	cwm.performanceTracker.mu.Lock()
	defer cwm.performanceTracker.mu.Unlock()

	now := time.Now()

	totalMessages := atomic.LoadInt64(&cwm.performanceTracker.totalMessages)
	currentThroughput := float64(totalMessages) / time.Since(cwm.performanceTracker.startTime).Seconds()

	if currentThroughput > cwm.performanceTracker.peakThroughput {
		cwm.performanceTracker.peakThroughput = currentThroughput
	}

	cwm.performanceTracker.throughputPerSec = currentThroughput
	cwm.performanceTracker.lastUpdate = now

	// Calculate total channels
	totalChannels := 0
	for _, conn := range cwm.connections {
		conn.channelsMu.RLock()
		totalChannels += len(conn.channels)
		conn.channelsMu.RUnlock()
	}

	// Add performance snapshot
	snapshot := CoinbasePerformanceSnapshot{
		Timestamp:      now,
		MessagesPerSec: currentThroughput,
		ErrorRate:      float64(atomic.LoadInt64(&cwm.performanceTracker.totalErrors)) / math.Max(1, float64(totalMessages)),
		ActiveConns:    len(cwm.connections),
		TotalChannels:  totalChannels,
	}

	cwm.performanceTracker.performanceWindow = append(cwm.performanceTracker.performanceWindow, snapshot)

	// Keep only last 100 snapshots
	if len(cwm.performanceTracker.performanceWindow) > 100 {
		cwm.performanceTracker.performanceWindow = cwm.performanceTracker.performanceWindow[1:]
	}
}

// ==========================================
// SUB-FEATURE: API Interface & Management
// ==========================================

func (cwm *CoinbaseWebSocketManager) GetActiveConnections() map[string]*CoinbaseWSConnection {
	cwm.mu.RLock()
	defer cwm.mu.RUnlock()

	connections := make(map[string]*CoinbaseWSConnection)
	for id, conn := range cwm.connections {
		connections[id] = conn
	}
	return connections
}

func (cwm *CoinbaseWebSocketManager) GetHealthStatus() map[string]interface{} {
	cwm.healthMonitor.mu.RLock()
	defer cwm.healthMonitor.mu.RUnlock()

	return map[string]interface{}{
		"overall_health":       cwm.healthMonitor.overallHealth,
		"last_health_check":    cwm.healthMonitor.lastHealthCheck,
		"connection_health":    cwm.healthMonitor.connections,
		"total_connections":    len(cwm.connections),
		"active_subscriptions": len(cwm.subscriptions),
	}
}

func (cwm *CoinbaseWebSocketManager) GetPerformanceMetrics() map[string]interface{} {
	cwm.performanceTracker.mu.RLock()
	defer cwm.performanceTracker.mu.RUnlock()

	return map[string]interface{}{
		"total_messages":     atomic.LoadInt64(&cwm.performanceTracker.totalMessages),
		"total_errors":       atomic.LoadInt64(&cwm.performanceTracker.totalErrors),
		"total_reconnects":   atomic.LoadInt64(&cwm.performanceTracker.totalReconnects),
		"throughput_per_sec": cwm.performanceTracker.throughputPerSec,
		"peak_throughput":    cwm.performanceTracker.peakThroughput,
		"uptime":             time.Since(cwm.performanceTracker.startTime),
		"performance_window": cwm.performanceTracker.performanceWindow,
	}
}

// ==========================================
// SUB-FEATURE: Graceful Shutdown
// ==========================================

func (cwm *CoinbaseWebSocketManager) Stop() {
	cwm.mu.Lock()
	defer cwm.mu.Unlock()

	if !cwm.isRunning {
		return
	}

	log.Println("🛑 Stopping Coinbase WebSocket Manager...")

	cwm.cancel()
	close(cwm.shutdownChan)

	// Close all connections gracefully
	for _, conn := range cwm.connections {
		conn.close()
	}

	cwm.isRunning = false
	log.Println("✅ Coinbase WebSocket Manager stopped successfully")
}

func (conn *CoinbaseWSConnection) close() {
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

func NewCoinbaseWebSocket() *CoinbaseWebSocketManager {
	return NewCoinbaseWebSocketManager()
}
