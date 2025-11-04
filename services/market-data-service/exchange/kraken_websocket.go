// ========================================
// REVOLUTIONARY KRAKEN WEBSOCKET INTEGRATION
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
// SUB-FEATURE: Core Kraken WebSocket Configuration
// ==========================================

type KrakenWebSocketConfig struct {
	PublicURL             string
	PrivateURL            string
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
	UseAuthentication     bool
	APIKey                string
	APISecret             string
}

func NewKrakenWebSocketConfig() *KrakenWebSocketConfig {
	return &KrakenWebSocketConfig{
		PublicURL:             "wss://ws.kraken.com",
		PrivateURL:            "wss://ws-auth.kraken.com",
		MaxReconnectAttempts:  10,
		ReconnectInterval:     5 * time.Second,
		PingInterval:          20 * time.Second,
		ReadTimeout:           60 * time.Second,
		WriteTimeout:          10 * time.Second,
		MaxMessageSize:        1024 * 1024, // 1MB
		BufferSize:            10000,
		EnableCompression:     true,
		EnableRateLimiting:    true,
		MaxSubscriptionsPerWS: 25, // Kraken limit
		UseAuthentication:     false,
	}
}

// ==========================================
// SUB-FEATURE: Advanced Kraken WebSocket Manager
// ==========================================

type KrakenWebSocketManager struct {
	config             *KrakenWebSocketConfig
	connections        map[string]*KrakenWSConnection
	subscriptions      map[string]*KrakenSubscription
	messageBuffer      chan *KrakenWSMessage
	errorChannel       chan error
	reconnectManager   *KrakenReconnectionManager
	healthMonitor      *KrakenWSHealthMonitor
	performanceTracker *KrakenWSPerformanceTracker
	circuitBreaker     *KrakenWSCircuitBreaker
	authenticator      *KrakenAuthenticator
	mu                 sync.RWMutex
	isRunning          bool
	shutdownChan       chan struct{}
	ctx                context.Context
	cancel             context.CancelFunc
}

// ==========================================
// SUB-SUB-FEATURE: Kraken WebSocket Connection
// ==========================================

type KrakenWSConnection struct {
	id              string
	conn            *websocket.Conn
	url             string
	subscriptions   []string
	pairs           []string
	isConnected     bool
	isAuthenticated bool
	lastPingTime    time.Time
	lastPongTime    time.Time
	messageCount    int64
	errorCount      int64
	reconnectCount  int64
	subscriptionsMu sync.RWMutex
	connectionMu    sync.RWMutex
	manager         *KrakenWebSocketManager
}

// ==========================================
// SUB-SUB-FEATURE: Kraken Subscription Management
// ==========================================

type KrakenSubscription struct {
	ID              string                 `json:"id"`
	Event           string                 `json:"event"`
	Subscription    KrakenSubParams        `json:"subscription"`
	Pair            []string               `json:"pair"`
	Connection      *KrakenWSConnection    `json:"-"`
	IsActive        bool                   `json:"is_active"`
	CreatedAt       time.Time              `json:"created_at"`
	LastUpdate      time.Time              `json:"last_update"`
	MessageRate     float64                `json:"message_rate"`
	IsAuthenticated bool                   `json:"is_authenticated"`
	Metadata        map[string]interface{} `json:"metadata"`
}

type KrakenSubParams struct {
	Name     string `json:"name"`
	Interval int    `json:"interval,omitempty"`
	Depth    int    `json:"depth,omitempty"`
	Token    string `json:"token,omitempty"`
}

// ==========================================
// SUB-SUB-FEATURE: Advanced Kraken Message Types
// ==========================================

type KrakenWSMessage struct {
	ConnectionID string                 `json:"connection_id"`
	ChannelID    int64                  `json:"channel_id"`
	Data         json.RawMessage        `json:"data"`
	Timestamp    time.Time              `json:"timestamp"`
	Exchange     string                 `json:"exchange"`
	MessageType  string                 `json:"message_type"`
	Pair         string                 `json:"pair"`
	Metadata     map[string]interface{} `json:"metadata"`
}

type KrakenTickerMessage struct {
	ChannelID   int64     `json:"channel_id"`
	Ask         [3]string `json:"a"` // [price, wholeLotVolume, lotVolume]
	Bid         [3]string `json:"b"` // [price, wholeLotVolume, lotVolume]
	Close       [2]string `json:"c"` // [price, lotVolume]
	Volume      [2]string `json:"v"` // [today, last24Hours]
	VolumeAvg   [2]string `json:"p"` // [today, last24Hours]
	NumTrades   [2]int64  `json:"t"` // [today, last24Hours]
	Low         [2]string `json:"l"` // [today, last24Hours]
	High        [2]string `json:"h"` // [today, last24Hours]
	Open        [2]string `json:"o"` // [today, last24Hours]
	ChannelName string    `json:"channel_name"`
	Pair        string    `json:"pair"`
}

type KrakenTradeMessage struct {
	ChannelID   int64           `json:"channel_id"`
	Trades      [][]interface{} `json:"trades"`
	ChannelName string          `json:"channel_name"`
	Pair        string          `json:"pair"`
}

type KrakenBookMessage struct {
	ChannelID   int64                  `json:"channel_id"`
	Asks        [][]string             `json:"as,omitempty"`
	Bids        [][]string             `json:"bs,omitempty"`
	Changes     map[string]interface{} `json:"changes,omitempty"`
	ChannelName string                 `json:"channel_name"`
	Pair        string                 `json:"pair"`
}

// ==========================================
// SUB-SUB-FEATURE: Kraken Authentication System
// ==========================================

type KrakenAuthenticator struct {
	apiKey       string
	apiSecret    string
	isEnabled    bool
	token        string
	lastAuthTime time.Time
	mu           sync.RWMutex
}

func NewKrakenAuthenticator(apiKey, apiSecret string) *KrakenAuthenticator {
	return &KrakenAuthenticator{
		apiKey:    apiKey,
		apiSecret: apiSecret,
		isEnabled: len(apiKey) > 0 && len(apiSecret) > 0,
	}
}

// ==========================================
// SUB-SUB-FEATURE: Kraken Reconnection Manager
// ==========================================

type KrakenReconnectionManager struct {
	strategy        KrakenReconnectionStrategy
	maxAttempts     int
	baseDelay       time.Duration
	maxDelay        time.Duration
	jitter          bool
	exponentialBase float64
	currentAttempts map[string]int
	lastAttemptTime map[string]time.Time
	mu              sync.RWMutex
}

type KrakenReconnectionStrategy interface {
	NextDelay(attempt int) time.Duration
	ShouldReconnect(attempt int, err error) bool
}

type KrakenExponentialBackoffStrategy struct {
	BaseDelay       time.Duration
	MaxDelay        time.Duration
	ExponentialBase float64
	Jitter          bool
}

func (e *KrakenExponentialBackoffStrategy) NextDelay(attempt int) time.Duration {
	delay := float64(e.BaseDelay) * math.Pow(e.ExponentialBase, float64(attempt))
	if delay > float64(e.MaxDelay) {
		delay = float64(e.MaxDelay)
	}

	if e.Jitter {
		jitterRange := delay * 0.1
		jitter := (2*krakenRand() - 1) * jitterRange
		delay += jitter
	}

	return time.Duration(delay)
}

func (e *KrakenExponentialBackoffStrategy) ShouldReconnect(attempt int, err error) bool {
	return attempt < 10 // Max 10 attempts
}

func krakenRand() float64 {
	return float64(time.Now().UnixNano()%1000) / 1000.0
}

// ==========================================
// SUB-SUB-FEATURE: Kraken Health Monitoring
// ==========================================

type KrakenWSHealthMonitor struct {
	connections         map[string]*KrakenConnectionHealth
	overallHealth       string
	lastHealthCheck     time.Time
	healthCheckInterval time.Duration
	alertThresholds     *KrakenHealthThresholds
	mu                  sync.RWMutex
}

type KrakenConnectionHealth struct {
	ConnectionID      string        `json:"connection_id"`
	IsConnected       bool          `json:"is_connected"`
	IsAuthenticated   bool          `json:"is_authenticated"`
	LastPing          time.Time     `json:"last_ping"`
	LastPong          time.Time     `json:"last_pong"`
	Latency           time.Duration `json:"latency"`
	MessageRate       float64       `json:"message_rate"`
	ErrorRate         float64       `json:"error_rate"`
	ReconnectCount    int64         `json:"reconnect_count"`
	Status            string        `json:"status"`
	LastStatusUpdate  time.Time     `json:"last_status_update"`
	SubscriptionCount int           `json:"subscription_count"`
	PairCount         int           `json:"pair_count"`
}

type KrakenHealthThresholds struct {
	MaxLatency       time.Duration
	MinMessageRate   float64
	MaxErrorRate     float64
	MaxReconnects    int64
	MaxSubscriptions int
}

// ==========================================
// SUB-SUB-FEATURE: Kraken Performance Tracking
// ==========================================

type KrakenWSPerformanceTracker struct {
	totalMessages     int64
	totalErrors       int64
	totalReconnects   int64
	averageLatency    int64
	throughputPerSec  float64
	peakThroughput    float64
	startTime         time.Time
	lastUpdate        time.Time
	performanceWindow []KrakenPerformanceSnapshot
	mu                sync.RWMutex
}

type KrakenPerformanceSnapshot struct {
	Timestamp          time.Time `json:"timestamp"`
	MessagesPerSec     float64   `json:"messages_per_sec"`
	ErrorRate          float64   `json:"error_rate"`
	AverageLatency     int64     `json:"average_latency"`
	ActiveConns        int       `json:"active_connections"`
	TotalSubscriptions int       `json:"total_subscriptions"`
}

// ==========================================
// SUB-SUB-FEATURE: Kraken Circuit Breaker
// ==========================================

type KrakenWSCircuitBreaker struct {
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

func NewKrakenWebSocketManager() *KrakenWebSocketManager {
	ctx, cancel := context.WithCancel(context.Background())

	config := NewKrakenWebSocketConfig()

	manager := &KrakenWebSocketManager{
		config:        config,
		connections:   make(map[string]*KrakenWSConnection),
		subscriptions: make(map[string]*KrakenSubscription),
		messageBuffer: make(chan *KrakenWSMessage, config.BufferSize),
		errorChannel:  make(chan error, 1000),
		shutdownChan:  make(chan struct{}),
		ctx:           ctx,
		cancel:        cancel,
	}

	// Initialize sub-components
	manager.reconnectManager = &KrakenReconnectionManager{
		strategy: &KrakenExponentialBackoffStrategy{
			BaseDelay:       2 * time.Second,
			MaxDelay:        300 * time.Second,
			ExponentialBase: 2.0,
			Jitter:          true,
		},
		maxAttempts:     config.MaxReconnectAttempts,
		currentAttempts: make(map[string]int),
		lastAttemptTime: make(map[string]time.Time),
	}

	manager.healthMonitor = &KrakenWSHealthMonitor{
		connections:         make(map[string]*KrakenConnectionHealth),
		healthCheckInterval: 30 * time.Second,
		alertThresholds: &KrakenHealthThresholds{
			MaxLatency:       5 * time.Second,
			MinMessageRate:   1.0,
			MaxErrorRate:     0.05,
			MaxReconnects:    10,
			MaxSubscriptions: 25,
		},
	}

	manager.performanceTracker = &KrakenWSPerformanceTracker{
		startTime:         time.Now(),
		lastUpdate:        time.Now(),
		performanceWindow: make([]KrakenPerformanceSnapshot, 0, 100),
	}

	manager.circuitBreaker = &KrakenWSCircuitBreaker{
		state:               "closed",
		failureThreshold:    5,
		successThreshold:    3,
		timeout:             60 * time.Second,
		halfOpenMaxRequests: 5,
	}

	manager.authenticator = NewKrakenAuthenticator(
		config.APIKey,
		config.APISecret,
	)

	return manager
}

// ==========================================
// SUB-FEATURE: Connection Management
// ==========================================

func (kwm *KrakenWebSocketManager) Start() error {
	kwm.mu.Lock()
	defer kwm.mu.Unlock()

	if kwm.isRunning {
		return fmt.Errorf("Kraken WebSocket Manager is already running")
	}

	log.Println("🚀 Starting Revolutionary Kraken WebSocket Manager...")

	// Start core goroutines
	go kwm.messageProcessor()
	go kwm.errorHandler()
	go kwm.healthChecker()
	go kwm.performanceMonitor()

	kwm.isRunning = true
	log.Println("✅ Kraken WebSocket Manager started successfully")

	return nil
}

func (kwm *KrakenWebSocketManager) CreateConnection(connectionID string, usePrivate bool) (*KrakenWSConnection, error) {
	kwm.mu.Lock()
	defer kwm.mu.Unlock()

	if _, exists := kwm.connections[connectionID]; exists {
		return nil, fmt.Errorf("connection %s already exists", connectionID)
	}

	var wsURL string
	if usePrivate {
		wsURL = kwm.config.PrivateURL
	} else {
		wsURL = kwm.config.PublicURL
	}

	conn := &KrakenWSConnection{
		id:            connectionID,
		url:           wsURL,
		subscriptions: make([]string, 0),
		pairs:         make([]string, 0),
		manager:       kwm,
	}

	if err := conn.connect(); err != nil {
		return nil, fmt.Errorf("failed to create connection: %w", err)
	}

	kwm.connections[connectionID] = conn

	// Initialize health monitoring for this connection
	kwm.healthMonitor.mu.Lock()
	kwm.healthMonitor.connections[connectionID] = &KrakenConnectionHealth{
		ConnectionID:     connectionID,
		IsConnected:      true,
		IsAuthenticated:  conn.isAuthenticated,
		Status:           "healthy",
		LastStatusUpdate: time.Now(),
	}
	kwm.healthMonitor.mu.Unlock()

	log.Printf("✅ Created Kraken WebSocket connection: %s", connectionID)
	return conn, nil
}

func (conn *KrakenWSConnection) connect() error {
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

func (conn *KrakenWSConnection) readMessages() {
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
				log.Printf("❌ Kraken WebSocket read error: %v", err)
				return
			}

			if messageType == websocket.TextMessage {
				atomic.AddInt64(&conn.messageCount, 1)
				conn.processMessage(message)
			}
		}
	}
}

func (conn *KrakenWSConnection) processMessage(message []byte) {
	wsMsg := &KrakenWSMessage{
		ConnectionID: conn.id,
		Data:         json.RawMessage(message),
		Timestamp:    time.Now(),
		Exchange:     "kraken",
	}

	// Parse message to extract channel ID and type
	var rawMessage []interface{}
	if err := json.Unmarshal(message, &rawMessage); err == nil && len(rawMessage) > 0 {
		// Handle array-based messages (market data)
		if len(rawMessage) >= 3 {
			if channelID, ok := rawMessage[0].(float64); ok {
				wsMsg.ChannelID = int64(channelID)
			}
			if pair, ok := rawMessage[len(rawMessage)-1].(string); ok {
				wsMsg.Pair = pair
			}
			if channelName, ok := rawMessage[len(rawMessage)-2].(string); ok {
				wsMsg.MessageType = channelName
			}
		}
	} else {
		// Handle object-based messages (events, errors)
		var eventMessage map[string]interface{}
		if err := json.Unmarshal(message, &eventMessage); err == nil {
			if event, ok := eventMessage["event"].(string); ok {
				wsMsg.MessageType = event
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

// ==========================================
// SUB-SUB-FEATURE: Subscription Management
// ==========================================

func (kwm *KrakenWebSocketManager) SubscribeToTicker(connectionID string, pairs []string) error {
	conn, exists := kwm.connections[connectionID]
	if !exists {
		return fmt.Errorf("connection %s not found", connectionID)
	}

	subscription := &KrakenSubscription{
		ID:    fmt.Sprintf("ticker_%s_%d", connectionID, time.Now().Unix()),
		Event: "subscribe",
		Subscription: KrakenSubParams{
			Name: "ticker",
		},
		Pair:       pairs,
		Connection: conn,
		IsActive:   true,
		CreatedAt:  time.Now(),
		LastUpdate: time.Now(),
		Metadata:   make(map[string]interface{}),
	}

	if err := conn.subscribe(subscription); err != nil {
		return fmt.Errorf("failed to subscribe to ticker: %w", err)
	}

	kwm.mu.Lock()
	kwm.subscriptions[subscription.ID] = subscription
	kwm.mu.Unlock()

	log.Printf("✅ Subscribed to Kraken ticker for pairs: %v", pairs)
	return nil
}

func (kwm *KrakenWebSocketManager) SubscribeToTrade(connectionID string, pairs []string) error {
	conn, exists := kwm.connections[connectionID]
	if !exists {
		return fmt.Errorf("connection %s not found", connectionID)
	}

	subscription := &KrakenSubscription{
		ID:    fmt.Sprintf("trade_%s_%d", connectionID, time.Now().Unix()),
		Event: "subscribe",
		Subscription: KrakenSubParams{
			Name: "trade",
		},
		Pair:       pairs,
		Connection: conn,
		IsActive:   true,
		CreatedAt:  time.Now(),
		LastUpdate: time.Now(),
		Metadata:   make(map[string]interface{}),
	}

	if err := conn.subscribe(subscription); err != nil {
		return fmt.Errorf("failed to subscribe to trade: %w", err)
	}

	kwm.mu.Lock()
	kwm.subscriptions[subscription.ID] = subscription
	kwm.mu.Unlock()

	log.Printf("✅ Subscribed to Kraken trade for pairs: %v", pairs)
	return nil
}

func (kwm *KrakenWebSocketManager) SubscribeToBook(connectionID string, pairs []string, depth int) error {
	conn, exists := kwm.connections[connectionID]
	if !exists {
		return fmt.Errorf("connection %s not found", connectionID)
	}

	subscription := &KrakenSubscription{
		ID:    fmt.Sprintf("book_%s_%d", connectionID, time.Now().Unix()),
		Event: "subscribe",
		Subscription: KrakenSubParams{
			Name:  "book",
			Depth: depth,
		},
		Pair:       pairs,
		Connection: conn,
		IsActive:   true,
		CreatedAt:  time.Now(),
		LastUpdate: time.Now(),
		Metadata:   make(map[string]interface{}),
	}

	if err := conn.subscribe(subscription); err != nil {
		return fmt.Errorf("failed to subscribe to book: %w", err)
	}

	kwm.mu.Lock()
	kwm.subscriptions[subscription.ID] = subscription
	kwm.mu.Unlock()

	log.Printf("✅ Subscribed to Kraken book for pairs: %v (depth: %d)", pairs, depth)
	return nil
}

func (conn *KrakenWSConnection) subscribe(subscription *KrakenSubscription) error {
	conn.connectionMu.RLock()
	defer conn.connectionMu.RUnlock()

	if !conn.isConnected || conn.conn == nil {
		return fmt.Errorf("connection is not established")
	}

	subMessage := map[string]interface{}{
		"event":        subscription.Event,
		"pair":         subscription.Pair,
		"subscription": subscription.Subscription,
	}

	conn.conn.SetWriteDeadline(time.Now().Add(conn.manager.config.WriteTimeout))
	if err := conn.conn.WriteJSON(subMessage); err != nil {
		return fmt.Errorf("failed to send subscription: %w", err)
	}

	conn.subscriptionsMu.Lock()
	conn.subscriptions = append(conn.subscriptions, subscription.ID)
	conn.pairs = append(conn.pairs, subscription.Pair...)
	conn.subscriptionsMu.Unlock()

	return nil
}

// ==========================================
// SUB-SUB-FEATURE: Ping/Pong Mechanism
// ==========================================

func (conn *KrakenWSConnection) pingLoop() {
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

func (conn *KrakenWSConnection) attemptReconnection() {
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

func (conn *KrakenWSConnection) resubscribe() {
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

func (kwm *KrakenWebSocketManager) messageProcessor() {
	for {
		select {
		case <-kwm.ctx.Done():
			return
		case msg := <-kwm.messageBuffer:
			kwm.processWebSocketMessage(msg)
			atomic.AddInt64(&kwm.performanceTracker.totalMessages, 1)
		}
	}
}

func (kwm *KrakenWebSocketManager) processWebSocketMessage(msg *KrakenWSMessage) {
	// Convert WebSocket message to unified Tick format
	tick, err := kwm.convertToTick(msg)
	if err != nil {
		log.Printf("❌ Failed to convert message to tick: %v", err)
		return
	}

	// Emit the tick to the main stream
	log.Printf("📊 Processed Kraken tick: %s @ $%.2f", tick.Symbol, tick.Price)
}

func (kwm *KrakenWebSocketManager) convertToTick(msg *KrakenWSMessage) (Tick, error) {
	switch msg.MessageType {
	case "ticker":
		return kwm.convertTickerToTick(msg)
	case "trade":
		return kwm.convertTradeToTick(msg)
	case "book":
		return kwm.convertBookToTick(msg)
	default:
		return Tick{}, fmt.Errorf("unsupported message type: %s", msg.MessageType)
	}
}

func (kwm *KrakenWebSocketManager) convertTickerToTick(msg *KrakenWSMessage) (Tick, error) {
	var rawData []interface{}
	if err := json.Unmarshal(msg.Data, &rawData); err != nil {
		return Tick{}, err
	}

	if len(rawData) < 2 {
		return Tick{}, fmt.Errorf("invalid ticker data format")
	}

	tickerData, ok := rawData[1].(map[string]interface{})
	if !ok {
		return Tick{}, fmt.Errorf("invalid ticker data structure")
	}

	// Extract close price (current price)
	var price float64
	if closeData, ok := tickerData["c"].([]interface{}); ok && len(closeData) > 0 {
		if priceStr, ok := closeData[0].(string); ok {
			price, _ = strconv.ParseFloat(priceStr, 64)
		}
	}

	// Extract volume
	var volume float64
	if volumeData, ok := tickerData["v"].([]interface{}); ok && len(volumeData) > 0 {
		if volumeStr, ok := volumeData[0].(string); ok {
			volume, _ = strconv.ParseFloat(volumeStr, 64)
		}
	}

	return Tick{
		Symbol:    msg.Pair,
		Timestamp: msg.Timestamp,
		Price:     price,
		Volume:    volume,
	}, nil
}

func (kwm *KrakenWebSocketManager) convertTradeToTick(msg *KrakenWSMessage) (Tick, error) {
	var rawData []interface{}
	if err := json.Unmarshal(msg.Data, &rawData); err != nil {
		return Tick{}, err
	}

	if len(rawData) < 2 {
		return Tick{}, fmt.Errorf("invalid trade data format")
	}

	tradesData, ok := rawData[1].([]interface{})
	if !ok || len(tradesData) == 0 {
		return Tick{}, fmt.Errorf("invalid trade data structure")
	}

	// Get the first trade
	firstTrade, ok := tradesData[0].([]interface{})
	if !ok || len(firstTrade) < 3 {
		return Tick{}, fmt.Errorf("invalid trade entry structure")
	}

	priceStr, ok := firstTrade[0].(string)
	if !ok {
		return Tick{}, fmt.Errorf("invalid price format")
	}

	volumeStr, ok := firstTrade[1].(string)
	if !ok {
		return Tick{}, fmt.Errorf("invalid volume format")
	}

	price, _ := strconv.ParseFloat(priceStr, 64)
	volume, _ := strconv.ParseFloat(volumeStr, 64)

	return Tick{
		Symbol:    msg.Pair,
		Timestamp: msg.Timestamp,
		Price:     price,
		Volume:    volume,
	}, nil
}

func (kwm *KrakenWebSocketManager) convertBookToTick(msg *KrakenWSMessage) (Tick, error) {
	var rawData []interface{}
	if err := json.Unmarshal(msg.Data, &rawData); err != nil {
		return Tick{}, err
	}

	if len(rawData) < 2 {
		return Tick{}, fmt.Errorf("invalid book data format")
	}

	bookData, ok := rawData[1].(map[string]interface{})
	if !ok {
		return Tick{}, fmt.Errorf("invalid book data structure")
	}

	// Try to extract best bid/ask
	var price float64
	if asksData, ok := bookData["as"].([]interface{}); ok && len(asksData) > 0 {
		if askEntry, ok := asksData[0].([]interface{}); ok && len(askEntry) > 0 {
			if priceStr, ok := askEntry[0].(string); ok {
				price, _ = strconv.ParseFloat(priceStr, 64)
			}
		}
	} else if bidsData, ok := bookData["bs"].([]interface{}); ok && len(bidsData) > 0 {
		if bidEntry, ok := bidsData[0].([]interface{}); ok && len(bidEntry) > 0 {
			if priceStr, ok := bidEntry[0].(string); ok {
				price, _ = strconv.ParseFloat(priceStr, 64)
			}
		}
	}

	return Tick{
		Symbol:    msg.Pair,
		Timestamp: msg.Timestamp,
		Price:     price,
		Volume:    0, // Book updates don't include volume
	}, nil
}

func (kwm *KrakenWebSocketManager) errorHandler() {
	for {
		select {
		case <-kwm.ctx.Done():
			return
		case err := <-kwm.errorChannel:
			atomic.AddInt64(&kwm.performanceTracker.totalErrors, 1)
			log.Printf("❌ Kraken WebSocket error: %v", err)
		}
	}
}

func (kwm *KrakenWebSocketManager) healthChecker() {
	ticker := time.NewTicker(kwm.healthMonitor.healthCheckInterval)
	defer ticker.Stop()

	for {
		select {
		case <-kwm.ctx.Done():
			return
		case <-ticker.C:
			kwm.performHealthCheck()
		}
	}
}

func (kwm *KrakenWebSocketManager) performHealthCheck() {
	kwm.healthMonitor.mu.Lock()
	defer kwm.healthMonitor.mu.Unlock()

	healthy := 0
	total := 0

	for connID, conn := range kwm.connections {
		health := kwm.healthMonitor.connections[connID]
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

		conn.subscriptionsMu.RLock()
		health.SubscriptionCount = len(conn.subscriptions)
		health.PairCount = len(conn.pairs)
		conn.subscriptionsMu.RUnlock()

		// Calculate latency
		if !conn.lastPongTime.IsZero() && !conn.lastPingTime.IsZero() {
			health.Latency = conn.lastPongTime.Sub(conn.lastPingTime)
		}

		// Determine health status
		if conn.isConnected &&
			health.Latency < kwm.healthMonitor.alertThresholds.MaxLatency &&
			health.ErrorRate < kwm.healthMonitor.alertThresholds.MaxErrorRate &&
			health.ReconnectCount < kwm.healthMonitor.alertThresholds.MaxReconnects &&
			health.SubscriptionCount <= kwm.healthMonitor.alertThresholds.MaxSubscriptions {
			health.Status = "healthy"
			healthy++
		} else {
			health.Status = "unhealthy"
		}

		health.LastStatusUpdate = time.Now()
	}

	// Determine overall health
	if total == 0 {
		kwm.healthMonitor.overallHealth = "no_connections"
	} else if healthy == total {
		kwm.healthMonitor.overallHealth = "healthy"
	} else if healthy > total/2 {
		kwm.healthMonitor.overallHealth = "degraded"
	} else {
		kwm.healthMonitor.overallHealth = "unhealthy"
	}

	kwm.healthMonitor.lastHealthCheck = time.Now()

	log.Printf("🏥 Kraken WS Health: %s (%d/%d connections healthy)",
		kwm.healthMonitor.overallHealth, healthy, total)
}

func (kwm *KrakenWebSocketManager) performanceMonitor() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-kwm.ctx.Done():
			return
		case <-ticker.C:
			kwm.updatePerformanceMetrics()
		}
	}
}

func (kwm *KrakenWebSocketManager) updatePerformanceMetrics() {
	kwm.performanceTracker.mu.Lock()
	defer kwm.performanceTracker.mu.Unlock()

	now := time.Now()

	totalMessages := atomic.LoadInt64(&kwm.performanceTracker.totalMessages)
	currentThroughput := float64(totalMessages) / time.Since(kwm.performanceTracker.startTime).Seconds()

	if currentThroughput > kwm.performanceTracker.peakThroughput {
		kwm.performanceTracker.peakThroughput = currentThroughput
	}

	kwm.performanceTracker.throughputPerSec = currentThroughput
	kwm.performanceTracker.lastUpdate = now

	// Calculate total subscriptions
	totalSubscriptions := 0
	for _, conn := range kwm.connections {
		conn.subscriptionsMu.RLock()
		totalSubscriptions += len(conn.subscriptions)
		conn.subscriptionsMu.RUnlock()
	}

	// Add performance snapshot
	snapshot := KrakenPerformanceSnapshot{
		Timestamp:          now,
		MessagesPerSec:     currentThroughput,
		ErrorRate:          float64(atomic.LoadInt64(&kwm.performanceTracker.totalErrors)) / math.Max(1, float64(totalMessages)),
		ActiveConns:        len(kwm.connections),
		TotalSubscriptions: totalSubscriptions,
	}

	kwm.performanceTracker.performanceWindow = append(kwm.performanceTracker.performanceWindow, snapshot)

	// Keep only last 100 snapshots
	if len(kwm.performanceTracker.performanceWindow) > 100 {
		kwm.performanceTracker.performanceWindow = kwm.performanceTracker.performanceWindow[1:]
	}
}

// ==========================================
// SUB-FEATURE: API Interface & Management
// ==========================================

func (kwm *KrakenWebSocketManager) GetActiveConnections() map[string]*KrakenWSConnection {
	kwm.mu.RLock()
	defer kwm.mu.RUnlock()

	connections := make(map[string]*KrakenWSConnection)
	for id, conn := range kwm.connections {
		connections[id] = conn
	}
	return connections
}

func (kwm *KrakenWebSocketManager) GetHealthStatus() map[string]interface{} {
	kwm.healthMonitor.mu.RLock()
	defer kwm.healthMonitor.mu.RUnlock()

	return map[string]interface{}{
		"overall_health":       kwm.healthMonitor.overallHealth,
		"last_health_check":    kwm.healthMonitor.lastHealthCheck,
		"connection_health":    kwm.healthMonitor.connections,
		"total_connections":    len(kwm.connections),
		"active_subscriptions": len(kwm.subscriptions),
	}
}

func (kwm *KrakenWebSocketManager) GetPerformanceMetrics() map[string]interface{} {
	kwm.performanceTracker.mu.RLock()
	defer kwm.performanceTracker.mu.RUnlock()

	return map[string]interface{}{
		"total_messages":     atomic.LoadInt64(&kwm.performanceTracker.totalMessages),
		"total_errors":       atomic.LoadInt64(&kwm.performanceTracker.totalErrors),
		"total_reconnects":   atomic.LoadInt64(&kwm.performanceTracker.totalReconnects),
		"throughput_per_sec": kwm.performanceTracker.throughputPerSec,
		"peak_throughput":    kwm.performanceTracker.peakThroughput,
		"uptime":             time.Since(kwm.performanceTracker.startTime),
		"performance_window": kwm.performanceTracker.performanceWindow,
	}
}

// ==========================================
// SUB-FEATURE: Graceful Shutdown
// ==========================================

func (kwm *KrakenWebSocketManager) Stop() {
	kwm.mu.Lock()
	defer kwm.mu.Unlock()

	if !kwm.isRunning {
		return
	}

	log.Println("🛑 Stopping Kraken WebSocket Manager...")

	kwm.cancel()
	close(kwm.shutdownChan)

	// Close all connections gracefully
	for _, conn := range kwm.connections {
		conn.close()
	}

	kwm.isRunning = false
	log.Println("✅ Kraken WebSocket Manager stopped successfully")
}

func (conn *KrakenWSConnection) close() {
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

func NewKrakenWebSocket() *KrakenWebSocketManager {
	return NewKrakenWebSocketManager()
}
