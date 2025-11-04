package exchange

import (
	"context"
	"encoding/json"
	"log"
	"strconv"
	"time"

	"github.com/gorilla/websocket"
)

type gateioSource struct{}

func NewGateIO() Source {
	return &gateioSource{}
}

func (g *gateioSource) Stream(ctx context.Context) <-chan Tick {
	ch := make(chan Tick, 100)
	go func() {
		defer close(ch)
		cws, _, err := websocket.DefaultDialer.Dial("wss://api.gateio.ws/ws/v4/", nil)
		if err != nil {
			log.Printf("Gate.io WS error: %v", err)
			return
		}
		defer cws.Close()
		sub := map[string]interface{}{
			"time":    time.Now().Unix(),
			"channel": "spot.trades",
			"event":   "subscribe",
			"payload": []string{"BTC_USDT"},
		}
		cws.WriteJSON(sub)
		for {
			select {
			case <-ctx.Done():
				return
			default:
				_, msg, err := cws.ReadMessage()
				if err != nil {
					log.Printf("Gate.io read error: %v", err)
					return
				}
				var data struct {
					Result  string `json:"result"`
					Time    int64  `json:"time"`
					Channel string `json:"channel"`
					Event   string `json:"event"`
					Payload []struct {
						Time   string `json:"time"`
						Price  string `json:"price"`
						Amount string `json:"amount"`
					} `json:"payload"`
				}
				if err := json.Unmarshal(msg, &data); err != nil {
					continue
				}
				for _, trade := range data.Payload {
					price, _ := parseFloat(trade.Price)
					volume, _ := parseFloat(trade.Amount)
					ts, _ := strconv.ParseInt(trade.Time, 10, 64)
					tick := Tick{
						Symbol:    "BTC_USDT",
						Timestamp: time.UnixMilli(ts),
						Price:     price,
						Volume:    volume,
					}
					ch <- tick
				}
			}
		}
	}()
	return ch
}
