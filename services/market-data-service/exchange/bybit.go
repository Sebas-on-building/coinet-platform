package exchange

import (
	"context"
	"encoding/json"
	"log"
	"time"
	"github.com/gorilla/websocket"
)

type bybitSource struct{}

func NewBybit() Source {
	return &bybitSource{}
}

func (b *bybitSource) Stream(ctx context.Context) <-chan Tick {
	ch := make(chan Tick, 100)
	go func() {
		defer close(ch)
		cws, _, err := websocket.DefaultDialer.Dial("wss://stream.bybit.com/v5/public/spot", nil)
		if err != nil {
			log.Printf("Bybit WS error: %v", err)
			return
		}
		defer cws.Close()
		sub := map[string]interface{}{
			"op": "subscribe",
			"args": []string{"publicTrade.BTCUSDT"},
		}
		cws.WriteJSON(sub)
		for {
			select {
			case <-ctx.Done():
				return
			default:
				_, msg, err := cws.ReadMessage()
				if err != nil {
					log.Printf("Bybit read error: %v", err)
					return
				}
				var data struct {
					Topic string `json:"topic"`
					Data  []struct {
						T int64   `json:"T"`
						S string  `json:"s"`
						P string  `json:"p"`
						V string  `json:"v"`
					} `json:"data"`
				}
				if err := json.Unmarshal(msg, &data); err != nil {
					continue
				}
				for _, trade := range data.Data {
					price, _ := parseFloat(trade.P)
					volume, _ := parseFloat(trade.V)
					tick := Tick{
						Symbol:    trade.S,
						Timestamp: time.UnixMilli(trade.T),
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