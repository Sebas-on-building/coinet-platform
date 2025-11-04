package observability

import (
	"net/http"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	TicksIngested = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "coinnet_ticks_ingested_total",
			Help: "Total number of market ticks ingested from all sources.",
		},
		[]string{"exchange"},
	)
	TicksPublished = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "coinnet_ticks_published_total",
			Help: "Total number of market ticks published to Kafka.",
		},
	)
	TicksPersisted = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "coinnet_ticks_persisted_total",
			Help: "Total number of market ticks persisted to DB.",
		},
	)
	ErrorCount = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "coinnet_errors_total",
			Help: "Total number of errors by component.",
		},
		[]string{"component", "exchange"},
	)
	TickLatency = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "coinnet_tick_latency_seconds",
			Help:    "Latency from tick ingestion to persistence.",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"exchange"},
	)
	TickThroughput = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "coinnet_tick_throughput_per_sec",
			Help: "Current tick throughput per exchange.",
		},
		[]string{"exchange"},
	)
	TickLatencySymbol = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "coinnet_tick_latency_symbol_seconds",
			Help:    "Latency from tick ingestion to persistence per symbol.",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"exchange", "symbol"},
	)
	TickThroughputSymbol = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "coinnet_tick_throughput_symbol_per_sec",
			Help: "Current tick throughput per exchange and symbol.",
		},
		[]string{"exchange", "symbol"},
	)
)

func InitMetrics() {
	prometheus.MustRegister(TicksIngested, TicksPublished, TicksPersisted, ErrorCount, TickLatency, TickThroughput, TickLatencySymbol, TickThroughputSymbol)
	http.Handle("/metrics", promhttp.Handler())
}
