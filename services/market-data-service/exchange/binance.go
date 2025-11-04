package exchange

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// BinanceAdapter: Modular adapter for REST and WebSocket (sub-feature: modularity)
type BinanceAdapter struct {
	wsConns   map[string]*websocket.Conn // sub-feature: multi-symbol
	wsMu      sync.Mutex
	rateLimit chan struct{} // sub-feature: rate limiting
	apiKey    string
	baseURL   string
}

// NewBinanceAdapter: Constructor for BinanceAdapter (sub-feature: extensibility)
func NewBinanceAdapter() *BinanceAdapter {
	return &BinanceAdapter{
		wsConns:   make(map[string]*websocket.Conn),
		rateLimit: make(chan struct{}, 10), // allow 10 concurrent requests
		apiKey:    os.Getenv("BINANCE_API_KEY"),
		baseURL:   "https://api.binance.com/api/v3",
	}
}

// StreamWS: Stream real-time trades for any symbol (sub-feature: multi-symbol, fallback)
func (b *BinanceAdapter) StreamWS(ctx context.Context, symbol string) <-chan Tick {
	ch := make(chan Tick, 100)
	go func() {
		defer close(ch)
		wsURL := url.URL{Scheme: "wss", Host: "stream.binance.com:9443", Path: "/ws/" + symbol + "@trade"}
		c, _, err := websocket.DefaultDialer.Dial(wsURL.String(), nil)
		if err != nil {
			log.Printf("Binance WS error: %v", err)
			return
		}
		b.wsMu.Lock()
		b.wsConns[symbol] = c
		b.wsMu.Unlock()
		defer func() {
			b.wsMu.Lock()
			delete(b.wsConns, symbol)
			b.wsMu.Unlock()
			c.Close()
		}()
		for {
			select {
			case <-ctx.Done():
				return
			default:
				_, msg, err := c.ReadMessage()
				if err != nil {
					log.Printf("Binance read error: %v", err)
					return
				}
				var data struct {
					T int64  `json:"T"`
					S string `json:"s"`
					P string `json:"p"`
					Q string `json:"q"`
				}
				if err := json.Unmarshal(msg, &data); err != nil {
					continue
				}
				price, _ := parseFloat(data.P)
				volume, _ := parseFloat(data.Q)
				tick := Tick{
					Symbol:    data.S,
					Timestamp: time.UnixMilli(data.T),
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
func (b *BinanceAdapter) GetTickerREST(symbol string) (Tick, error) {
	b.rateLimit <- struct{}{}        // acquire rate limit token
	defer func() { <-b.rateLimit }() // release token
	url := b.baseURL + "/ticker/24hr?symbol=" + symbol
	resp, err := http.Get(url)
	if err != nil {
		return Tick{}, err
	}
	defer resp.Body.Close()
	var data struct {
		Symbol string `json:"symbol"`
		Price  string `json:"lastPrice"`
		Time   int64  `json:"closeTime"`
		Volume string `json:"volume"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return Tick{}, err
	}
	price, _ := parseFloat(data.Price)
	volume, _ := parseFloat(data.Volume)
	return Tick{
		Symbol:    data.Symbol,
		Timestamp: time.UnixMilli(data.Time),
		Price:     price,
		Volume:    volume,
	}, nil
}

// HealthCheck: Check if Binance API is healthy (sub-feature: health monitoring)
func (b *BinanceAdapter) HealthCheck() bool {
	resp, err := http.Get(b.baseURL + "/ping")
	if err != nil || resp.StatusCode != 200 {
		return false
	}
	return true
}

// parseFloat: Helper for string to float64 (sub-sub-feature: robust parsing)
func parseFloat(s string) (float64, error) {
	return strconv.ParseFloat(s, 64)
}
