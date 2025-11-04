package exchange

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// CoinbaseAdapter: Modular adapter for REST and WebSocket (sub-feature: modularity)
type CoinbaseAdapter struct {
	wsConns   map[string]*websocket.Conn // sub-feature: multi-symbol
	wsMu      sync.Mutex
	rateLimit chan struct{} // sub-feature: rate limiting
	apiKey    string
	baseURL   string
}

// NewCoinbaseAdapter: Constructor for CoinbaseAdapter (sub-feature: extensibility)
func NewCoinbaseAdapter() *CoinbaseAdapter {
	return &CoinbaseAdapter{
		wsConns:   make(map[string]*websocket.Conn),
		rateLimit: make(chan struct{}, 10), // allow 10 concurrent requests
		apiKey:    os.Getenv("COINBASE_API_KEY"),
		baseURL:   "https://api.exchange.coinbase.com",
	}
}

// StreamWS: Stream real-time ticker for any symbol (sub-feature: multi-symbol, fallback)
func (c *CoinbaseAdapter) StreamWS(ctx context.Context, symbol string) <-chan Tick {
	ch := make(chan Tick, 100)
	go func() {
		defer close(ch)
		cws, _, err := websocket.DefaultDialer.Dial("wss://ws-feed.pro.coinbase.com", nil)
		if err != nil {
			log.Printf("Coinbase WS error: %v", err)
			return
		}
		c.wsMu.Lock()
		c.wsConns[symbol] = cws
		c.wsMu.Unlock()
		defer func() {
			c.wsMu.Lock()
			delete(c.wsConns, symbol)
			c.wsMu.Unlock()
			cws.Close()
		}()
		// Subscribe to ticker channel for symbol
		sub := map[string]interface{}{
			"type": "subscribe",
			"channels": []map[string]interface{}{{
				"name":        "ticker",
				"product_ids": []string{symbol},
			}},
		}
		cws.WriteJSON(sub)
		for {
			select {
			case <-ctx.Done():
				return
			default:
				_, msg, err := cws.ReadMessage()
				if err != nil {
					log.Printf("Coinbase read error: %v", err)
					return
				}
				var data struct {
					Time      string `json:"time"`
					ProductID string `json:"product_id"`
					Price     string `json:"price"`
					LastSize  string `json:"last_size"`
				}
				if err := json.Unmarshal(msg, &data); err != nil {
					continue
				}
				price, _ := strconv.ParseFloat(data.Price, 64)
				volume, _ := strconv.ParseFloat(data.LastSize, 64)
				t, _ := time.Parse(time.RFC3339Nano, data.Time)
				tick := Tick{
					Symbol:    data.ProductID,
					Timestamp: t,
					Price:     price,
					Volume:    volume,
				}
				ch <- tick
			}
		}
	}()
	return ch
}

// GetTickerREST: Fetch ticker via REST (sub-feature: REST integration, rate limiting, fallback)
func (c *CoinbaseAdapter) GetTickerREST(symbol string) (Tick, error) {
	c.rateLimit <- struct{}{}        // acquire rate limit token
	defer func() { <-c.rateLimit }() // release token
	url := c.baseURL + "/products/" + symbol + "/ticker"
	resp, err := http.Get(url)
	if err != nil {
		return Tick{}, err
	}
	defer resp.Body.Close()
	var data struct {
		Price  string `json:"price"`
		Volume string `json:"volume"`
		Time   string `json:"time"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return Tick{}, err
	}
	price, _ := strconv.ParseFloat(data.Price, 64)
	volume, _ := strconv.ParseFloat(data.Volume, 64)
	t, _ := time.Parse(time.RFC3339Nano, data.Time)
	return Tick{
		Symbol:    symbol,
		Timestamp: t,
		Price:     price,
		Volume:    volume,
	}, nil
}

// HealthCheck: Check if Coinbase API is healthy (sub-feature: health monitoring)
func (c *CoinbaseAdapter) HealthCheck() bool {
	resp, err := http.Get(c.baseURL + "/products")
	if err != nil || resp.StatusCode != 200 {
		return false
	}
	return true
}
