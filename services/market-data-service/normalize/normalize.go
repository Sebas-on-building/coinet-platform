package normalize

import (
	"market-data-service/exchange"
)

func Tick(t interface{}) exchange.Tick {
	switch v := t.(type) {
	case exchange.Tick:
		return v
	default:
		// fallback: return zero value
		return exchange.Tick{}
	}
}

func NormalizeTick(provider string, raw interface{}) exchange.Tick {
	switch provider {
	case "binance":
		if t, ok := raw.(exchange.Tick); ok {
			return t
		}
	case "coinbase":
		if t, ok := raw.(exchange.Tick); ok {
			return t
		}
	case "kraken":
		if t, ok := raw.(exchange.Tick); ok {
			return t
		}
	case "coinmarketcap":
		if t, ok := raw.(exchange.Tick); ok {
			return t
		}
	}
	// fallback: return zero value
	return exchange.Tick{}
}
