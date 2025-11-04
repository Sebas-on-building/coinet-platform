package exchange

import (
	"context"
	"encoding/json"
	"log"
	"strconv"
	"time"

	"github.com/gorilla/websocket"
)

type okxSource struct{}

func NewOKX() Source {
	return &okxSource{}
}

func (o *okxSource) Stream(ctx context.Context) <-chan Tick {
	ch := make(chan Tick, 100)
	go func() {
		defer close(ch)
		cws, _, err := websocket.DefaultDialer.Dial("wss://ws.okx.com:8443/ws/v5/public", nil)
		if err != nil {
			log.Printf("OKX WS error: %v", err)
			return
		}
		defer cws.Close()
		sub := map[string]interface{}{
			"op": "subscribe",
			"args": []map[string]string{{
				"channel": "trades",
				"instId":  "BTC-USDT",
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
					log.Printf("OKX read error: %v", err)
					return
				}
				var data struct {
					Arg struct {
						InstId string `json:"instId"`
					} `json:"arg"`
					Data []struct {
						Ts string `json:"ts"`
						Px string `json:"px"`
						Sz string `json:"sz"`
					} `json:"data"`
				}
				if err := json.Unmarshal(msg, &data); err != nil {
					continue
				}
				for _, trade := range data.Data {
					price, _ := parseFloat(trade.Px)
					volume, _ := parseFloat(trade.Sz)
					ts, _ := strconv.ParseInt(trade.Ts, 10, 64)
					tick := Tick{
						Symbol:    data.Arg.InstId,
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
