package exchange

import (
	"context"
	"io/ioutil"
	"log"
	"market-data-service/observability"
	"net/http"
	"time"
)

type restPollSource struct {
	url      string
	interval time.Duration
	parse    func([]byte) (Tick, error)
}

func NewRestPoll(url string, interval time.Duration, parse func([]byte) (Tick, error)) Source {
	return &restPollSource{url: url, interval: interval, parse: parse}
}

func (r *restPollSource) Stream(ctx context.Context) <-chan Tick {
	ch := make(chan Tick, 100)
	go func() {
		defer close(ch)
		ticker := time.NewTicker(r.interval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				start := time.Now()
				resp, err := http.Get(r.url)
				if err != nil {
					observability.ErrorCount.WithLabelValues("rest_poll", "rest").Inc()
					log.Printf("REST poll error: %v", err)
					continue
				}
				body, err := ioutil.ReadAll(resp.Body)
				resp.Body.Close()
				if err != nil {
					observability.ErrorCount.WithLabelValues("rest_read", "rest").Inc()
					log.Printf("REST read error: %v", err)
					continue
				}
				tick, err := r.parse(body)
				if err != nil {
					observability.ErrorCount.WithLabelValues("rest_parse", "rest").Inc()
					log.Printf("REST parse error: %v", err)
					continue
				}
				latency := time.Since(start).Seconds()
				observability.TickLatency.WithLabelValues(tick.Symbol).Observe(latency)
				ch <- tick
			}
		}
	}()
	return ch
}
