package exchange

import (
	"context"
	"encoding/json"
	"log"
	"time"
	"github.com/gorilla/websocket"
)

type bitfinexSource struct{}

func NewBitfinex() Source {
	return &bitfinexSource{}
}

func (b *bitfinexSource) Stream(ctx context.Context) <-chan Tick {
	ch := make(chan Tick, 100)
	go func() {
		defer close(ch)
		cws, _, err := websocket.DefaultDialer.Dial("wss://api-pub.bitfinex.com/ws/2", nil)
		if err != nil {
			log.Printf("Bitfinex WS error: %v", err)
			return
		}
		defer cws.Close()
		sub := map[string]interface{}{
			"event": "subscribe",
			"channel": "trades",
			"symbol": "tBTCUSD",
		}
		cws.WriteJSON(sub)
		for {
			select {
			case <-ctx.Done():
				return
			default:
				_, msg, err := cws.ReadMessage()
				if err != nil {
					log.Printf("Bitfinex read error: %v", err)
					return
				}
				var arr []interface{}
				if err := json.Unmarshal(msg, &arr); err != nil || len(arr) < 3 {
					continue
				}
				if len(arr) > 1 {
					// [CHANNEL_ID, "tu", [ID, MTS, AMOUNT, PRICE]]
					eventType, ok := arr[1].(string)
					if ok && eventType == "tu" {
						trade, ok := arr[2].([]interface{})
						if ok && len(trade) >= 4 {
							mts := int64(trade[1].(float64))
							amount := trade[2].(float64)
							price := trade[3].(float64)
							tick := Tick{
								Symbol:    "BTCUSD",
								Timestamp: time.UnixMilli(mts),
								Price:     price,
								Volume:    amount,
							}
							ch <- tick
						}
					}
				}
			}
		}
	}()
	return ch
} 