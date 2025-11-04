package exchange

import (
	"context"
	"time"
)

type Tick struct {
	Symbol    string    `json:"symbol"`
	Timestamp time.Time `json:"timestamp"`
	Price     float64   `json:"price"`
	Volume    float64   `json:"volume"`
}

type Source interface {
	Stream(ctx context.Context) <-chan Tick
}

// Add a ProviderAdapter interface for modular adapters

type ProviderAdapter interface {
	StreamWS(ctx context.Context, symbol string) <-chan Tick
	GetTickerREST(symbol string) (Tick, error)
	HealthCheck() bool
}
