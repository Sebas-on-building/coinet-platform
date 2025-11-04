package exchange

import (
	"context"
	"encoding/json"
	"log"
	"time"
	"github.com/gorilla/websocket"
)

type huobiSource struct{}

func NewHuobi() Source {
	return &huobiSource{}
}

func (h *huobiSource) Stream(ctx context.Context) <-chan Tick {
	ch := make(chan Tick, 100)
	go func() {
		defer close(ch)
		cws, _, err := websocket.DefaultDialer.Dial("wss://api.huobi.pro/ws", nil)
		if err != nil {
			log.Printf("Huobi WS error: %v", err)
			return
		}
		defer cws.Close()
		sub := map[string]interface{}{
			"sub": "market.btcusdt.trade.detail",
			"id": "id1",
		}
		cws.WriteJSON(sub)
		for {
			select {
			case <-ctx.Done():
				return
			default:
				_, msg, err := cws.ReadMessage()
				if err != nil {
					log.Printf("Huobi read error: %v", err)
					return
				}
				var data struct {
					Ch string `json:"ch"`
					Tick struct {
						Data []struct {
							Ts int64   `json:"ts"`
							Price float64 `json:"price"`
							Amount float64 `json:"amount"`
						} `json:"data"`
					} `json:"tick"`
				}
				if err := json.Unmarshal(msg, &data); err != nil {
					continue
				}
				for _, trade := range data.Tick.Data {
					tick := Tick{
						Symbol:    "BTCUSDT",
						Timestamp: time.UnixMilli(trade.Ts),
						Price:     trade.Price,
						Volume:    trade.Amount,
					}
					ch <- tick
				}
			}
		}
	}()
	return ch
} 