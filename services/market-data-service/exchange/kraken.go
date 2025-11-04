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

// KrakenAdapter: Modular adapter for REST and WebSocket (sub-feature: modularity)
type KrakenAdapter struct {
	wsConns   map[string]*websocket.Conn // sub-feature: multi-symbol
	wsMu      sync.Mutex
	rateLimit chan struct{} // sub-feature: rate limiting
	apiKey    string
	baseURL   string
}

// NewKrakenAdapter: Constructor for KrakenAdapter (sub-feature: extensibility)
func NewKrakenAdapter() *KrakenAdapter {
	return &KrakenAdapter{
		wsConns:   make(map[string]*websocket.Conn),
		rateLimit: make(chan struct{}, 10), // allow 10 concurrent requests
		apiKey:    os.Getenv("KRAKEN_API_KEY"),
		baseURL:   "https://api.kraken.com/0/public",
	}
}

// StreamWS: Stream real-time trades for any symbol (sub-feature: multi-symbol, fallback)
func (k *KrakenAdapter) StreamWS(ctx context.Context, symbol string) <-chan Tick {
	ch := make(chan Tick, 100)
	go func() {
		defer close(ch)
		cws, _, err := websocket.DefaultDialer.Dial("wss://ws.kraken.com", nil)
		if err != nil {
			log.Printf("Kraken WS error: %v", err)
			return
		}
		k.wsMu.Lock()
		k.wsConns[symbol] = cws
		k.wsMu.Unlock()
		defer func() {
			k.wsMu.Lock()
			delete(k.wsConns, symbol)
			k.wsMu.Unlock()
			cws.Close()
		}()
		sub := map[string]interface{}{
			"event":        "subscribe",
			"pair":         []string{symbol},
			"subscription": map[string]string{"name": "trade"},
		}
		cws.WriteJSON(sub)
		for {
			select {
			case <-ctx.Done():
				return
			default:
				_, msg, err := cws.ReadMessage()
				if err != nil {
					log.Printf("Kraken read error: %v", err)
					return
				}
				var arr []interface{}
				if err := json.Unmarshal(msg, &arr); err != nil || len(arr) < 3 {
					continue
				}
				trades, ok := arr[1].([]interface{})
				if !ok || len(trades) == 0 {
					continue
				}
				trade, ok := trades[0].([]interface{})
				if !ok || len(trade) < 3 {
					continue
				}
				price, _ := strconv.ParseFloat(trade[0].(string), 64)
				volume, _ := strconv.ParseFloat(trade[1].(string), 64)
				tick := Tick{
					Symbol:    symbol,
					Timestamp: time.Now().UTC(),
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
func (k *KrakenAdapter) GetTickerREST(symbol string) (Tick, error) {
	k.rateLimit <- struct{}{}        // acquire rate limit token
	defer func() { <-k.rateLimit }() // release token
	url := k.baseURL + "/Ticker?pair=" + symbol
	resp, err := http.Get(url)
	if err != nil {
		return Tick{}, err
	}
	defer resp.Body.Close()
	var data struct {
		Result map[string]struct {
			C []string `json:"c"`
			V []string `json:"v"`
		} `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return Tick{}, err
	}
	for _, v := range data.Result {
		price, _ := strconv.ParseFloat(v.C[0], 64)
		volume, _ := strconv.ParseFloat(v.V[0], 64)
		return Tick{
			Symbol:    symbol,
			Timestamp: time.Now().UTC(),
			Price:     price,
			Volume:    volume,
		}, nil
	}
	return Tick{}, nil
}

// HealthCheck: Check if Kraken API is healthy (sub-feature: health monitoring)
func (k *KrakenAdapter) HealthCheck() bool {
	resp, err := http.Get(k.baseURL + "/Time")
	if err != nil || resp.StatusCode != 200 {
		return false
	}
	return true
}
