package main

import (
	"context"
	"encoding/json"
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"market-data-service/rest"
)

// Revolutionary main function with divine precision
func main() {
	// Parse command line flags
	var configPath string
	flag.StringVar(&configPath, "config", "config/rest-server.json", "Path to configuration file")
	flag.Parse()

	log.Println("🚀 Starting Coinet Revolutionary REST API Server v1.2.1")
	log.Println("💎 Designed with inspiration from Apple, Canva, TradingView, and Solana")
	log.Println("🔥 Divine precision in every sub-feature")

	// Load configuration
	config, err := loadConfiguration(configPath)
	if err != nil {
		log.Fatalf("❌ Failed to load configuration: %v", err)
	}

	// Create revolutionary REST server
	server, err := rest.NewRevolutionaryRESTServer(config)
	if err != nil {
		log.Fatalf("❌ Failed to create REST server: %v", err)
	}

	// Setup graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle shutdown signals
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Start server in goroutine
	go func() {
		if err := server.Start(); err != nil {
			log.Printf("❌ Server error: %v", err)
			cancel()
		}
	}()

	// Wait for shutdown signal
	select {
	case sig := <-sigChan:
		log.Printf("🛑 Received signal: %v", sig)
	case <-ctx.Done():
		log.Println("🛑 Context cancelled")
	}

	// Graceful shutdown
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	log.Println("🔄 Initiating graceful shutdown...")
	if err := server.Stop(shutdownCtx); err != nil {
		log.Printf("⚠️ Shutdown error: %v", err)
	}

	log.Println("✅ Revolutionary REST API Server shut down successfully")
}

// loadConfiguration loads the server configuration with revolutionary precision
func loadConfiguration(path string) (rest.RESTServerConfig, error) {
	var config rest.RESTServerConfig

	// Set revolutionary defaults
	config = rest.RESTServerConfig{
		Host: "0.0.0.0",
		Port: 8080,

		// Cache configuration (TradingView-inspired performance)
		MemoryCacheSize: 512 * 1024 * 1024, // 512MB
		RedisURL:        os.Getenv("REDIS_URL"),
		RedisPassword:   os.Getenv("REDIS_PASSWORD"),
		CacheDefaultTTL: 5 * time.Minute,

		// Batch processing (Solana-inspired efficiency)
		MaxBatchSize:     50,
		BatchTimeout:     2 * time.Second,
		AdaptiveBatching: true,

		// Observability (Apple-inspired monitoring)
		TracingEnabled: true,
		MetricsEnabled: true,
		LogLevel:       "info",

		// Security (Divine precision)
		EnableCORS:       true,
		AllowedOrigins:   []string{"*"},
		RateLimitEnabled: true,

		// Revolutionary provider configuration
		Providers: map[string]rest.ProviderConfig{
			"coinmarketcap": {
				Enabled:   true,
				APIKey:    os.Getenv("COINMARKETCAP_API_KEY"),
				BaseURL:   "https://pro-api.coinmarketcap.com/v1",
				RateLimit: 30,
				Timeout:   10 * time.Second,
				Priority:  1,
				Metadata: map[string]string{
					"description": "CoinMarketCap Pro API",
					"website":     "https://coinmarketcap.com",
				},
			},
			"binance": {
				Enabled:   true,
				APIKey:    os.Getenv("BINANCE_API_KEY"),
				BaseURL:   "https://api.binance.com/api/v3",
				RateLimit: 1200,
				Timeout:   5 * time.Second,
				Priority:  2,
				Metadata: map[string]string{
					"description": "Binance Public API",
					"website":     "https://binance.com",
				},
			},
			"coinbase": {
				Enabled:   true,
				APIKey:    os.Getenv("COINBASE_API_KEY"),
				BaseURL:   "https://api.coinbase.com/v2",
				RateLimit: 1000,
				Timeout:   8 * time.Second,
				Priority:  3,
				Metadata: map[string]string{
					"description": "Coinbase Pro API",
					"website":     "https://pro.coinbase.com",
				},
			},
			"kraken": {
				Enabled:   true,
				APIKey:    os.Getenv("KRAKEN_API_KEY"),
				BaseURL:   "https://api.kraken.com/0/public",
				RateLimit: 15,
				Timeout:   15 * time.Second,
				Priority:  4,
				Metadata: map[string]string{
					"description": "Kraken Public API",
					"website":     "https://kraken.com",
				},
			},
		},
	}

	// Load from file if it exists
	if _, err := os.Stat(path); err == nil {
		log.Printf("📄 Loading configuration from: %s", path)

		file, err := os.Open(path)
		if err != nil {
			return config, err
		}
		defer file.Close()

		decoder := json.NewDecoder(file)
		if err := decoder.Decode(&config); err != nil {
			return config, err
		}

		log.Println("✅ Configuration loaded successfully")
	} else {
		log.Println("📄 Using default configuration (no config file found)")
	}

	// Override with environment variables (Canva-inspired flexibility)
	if host := os.Getenv("REST_HOST"); host != "" {
		config.Host = host
	}

	if port := os.Getenv("REST_PORT"); port != "" {
		// Parse port if needed
		config.Port = 8080 // Simplified for this example
	}

	// Log revolutionary configuration
	log.Printf("🎯 Server will start on %s:%d", config.Host, config.Port)
	log.Printf("💾 Memory Cache Size: %d MB", config.MemoryCacheSize/(1024*1024))
	log.Printf("🔄 Redis URL: %s", maskSensitiveURL(config.RedisURL))
	log.Printf("📦 Max Batch Size: %d", config.MaxBatchSize)
	log.Printf("⏱️  Batch Timeout: %v", config.BatchTimeout)
	log.Printf("📊 Tracing: %v", config.TracingEnabled)
	log.Printf("📈 Metrics: %v", config.MetricsEnabled)
	log.Printf("🔒 CORS: %v", config.EnableCORS)
	log.Printf("⚡ Rate Limiting: %v", config.RateLimitEnabled)

	// Log enabled providers
	enabledProviders := 0
	for name, provider := range config.Providers {
		if provider.Enabled {
			enabledProviders++
			log.Printf("✅ Provider: %s (Priority: %d, Rate: %d/min)",
				name, provider.Priority, provider.RateLimit)
		}
	}
	log.Printf("🌟 Total enabled providers: %d", enabledProviders)

	return config, nil
}

// maskSensitiveURL masks sensitive information in URLs
func maskSensitiveURL(url string) string {
	if url == "" {
		return "disabled"
	}

	// Mask the URL for security (simplified)
	if len(url) > 20 {
		return url[:10] + "..." + url[len(url)-7:]
	}

	return url
}
