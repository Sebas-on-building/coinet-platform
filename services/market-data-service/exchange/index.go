// --- BEGIN: Provider Adapter Registry ---
package exchange

var Providers = map[string]ProviderAdapter{
	"binance":       NewBinanceAdapter(),
	"coinbase":      NewCoinbaseAdapter(),
	"kraken":        NewKrakenAdapter(),
	"coinmarketcap": NewCoinMarketCapAdapter(),
}

// --- END: Provider Adapter Registry ---
