package exchange

import (
	"context"
	"encoding/json"
	"log"
	"time"
	"github.com/gorilla/websocket"
)

type bitstampSource struct{}

func NewBitstamp() Source {
	return &bitstampSource{}
}

func (b *bitstampSource) Stream(ctx context.Context) <-chan Tick {
	ch := make(chan Tick, 100)
	go func() {
		defer close(ch)
		cws, _, err := websocket.DefaultDialer.Dial("wss://ws.bitstamp.net", nil)
		if err != nil {
			log.Printf("Bitstamp WS error: %v", err)
			return
		}
		defer cws.Close()
		sub := map[string]interface{}{
			"event": "bts:subscribe",
			"data": map[string]string{"channel": "live_trades_btcusd"},
		}
		cws.WriteJSON(sub)
		for {
			select {
			case <-ctx.Done():
				return
			default:
				_, msg, err := cws.ReadMessage()
				if err != nil {
					log.Printf("Bitstamp read error: %v", err)
					return
				}
				var data struct {
					Event string `json:"event"`
					Data struct {
						Timestamp string `json:"timestamp"`
						Price     float64 `json:"price"`
						Amount    float64 `json:"amount"`
					} `json:"data"`
				}
				if err := json.Unmarshal(msg, &data); err != nil {
					continue
				}
				if data.Event == "trade" {
					ts, _ := time.Parse("1136239445", data.Data.Timestamp)
					tick := Tick{
						Symbol:    "BTCUSD",
						Timestamp: ts,
						Price:     data.Data.Price,
						Volume:    data.Data.Amount,
					}
					ch <- tick
				}
			}
		}
	}()
	return ch
} 