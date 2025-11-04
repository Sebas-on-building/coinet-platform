package persist

import (
	"context"
	"log"
	"market-data-service/exchange"
	"market-data-service/observability"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Persister struct {
	pool *pgxpool.Pool
}

func NewPersister(connStr string) *Persister {
	pool, err := pgxpool.New(context.Background(), connStr)
	if err != nil {
		log.Fatalf("Failed to connect to TimescaleDB: %v", err)
	}
	return &Persister{pool: pool}
}

func (p *Persister) InsertTick(tick exchange.Tick) error {
	start := time.Now()
	ctx, span := observability.StartSpan(context.Background(), "tsdb_insert_tick")
	defer span.End()
	_, err := p.pool.Exec(ctx,
		`INSERT INTO market_ticks (symbol, timestamp, price, volume) VALUES ($1, $2, $3, $4)`,
		tick.Symbol, tick.Timestamp, tick.Price, tick.Volume)
	latency := time.Since(start).Seconds()
	observability.TickLatency.WithLabelValues(tick.Symbol).Observe(latency)
	if err != nil {
		observability.ErrorCount.WithLabelValues("tsdb_insert", tick.Symbol).Inc()
		span.RecordError(err)
	}
	return err
}

func (p *Persister) InsertBatch(ticks []exchange.Tick) error {
	start := time.Now()
	ctx, span := observability.StartSpan(context.Background(), "tsdb_insert_batch")
	defer span.End()
	batch := &pgx.Batch{}
	for _, tick := range ticks {
		batch.Queue(`INSERT INTO market_ticks (symbol, timestamp, price, volume) VALUES ($1, $2, $3, $4)`,
			tick.Symbol, tick.Timestamp, tick.Price, tick.Volume)
	}
	br := p.pool.SendBatch(ctx, batch)
	err := br.Close()
	latency := time.Since(start).Seconds()
	if len(ticks) > 0 {
		observability.TickLatency.WithLabelValues(ticks[0].Symbol).Observe(latency)
	}
	if err != nil {
		observability.ErrorCount.WithLabelValues("tsdb_batch", "batch").Inc()
		span.RecordError(err)
	}
	return err
}

func (p *Persister) Close() {
	p.pool.Close()
}
