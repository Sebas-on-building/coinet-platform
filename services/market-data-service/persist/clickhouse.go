package persist

import (
	"context"
	"log"
	"market-data-service/exchange"
	"market-data-service/observability"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
)

type CHPersister struct {
	conn clickhouse.Conn
}

func NewCHPersister(connStr string) *CHPersister {
	conn, err := clickhouse.Open(&clickhouse.Options{
		Addr: []string{connStr},
		Auth: clickhouse.Auth{
			Database: "default",
			Username: "default",
			Password: "",
		},
	})
	if err != nil {
		log.Fatalf("Failed to connect to ClickHouse: %v", err)
	}
	return &CHPersister{conn: conn}
}

func (p *CHPersister) InsertTick(tick exchange.Tick) error {
	start := time.Now()
	ctx, span := observability.StartSpan(context.Background(), "ch_insert_tick")
	defer span.End()
	err := p.conn.Exec(ctx, `INSERT INTO market_ticks (symbol, timestamp, price, volume) VALUES (?, ?, ?, ?)`,
		tick.Symbol, tick.Timestamp, tick.Price, tick.Volume)
	latency := time.Since(start).Seconds()
	observability.TickLatency.WithLabelValues(tick.Symbol).Observe(latency)
	if err != nil {
		observability.ErrorCount.WithLabelValues("ch_insert", tick.Symbol).Inc()
		span.RecordError(err)
	}
	return err
}

func (p *CHPersister) InsertBatch(ticks []exchange.Tick) error {
	start := time.Now()
	ctx, span := observability.StartSpan(context.Background(), "ch_insert_batch")
	defer span.End()
	batch, err := p.conn.PrepareBatch(ctx, `INSERT INTO market_ticks (symbol, timestamp, price, volume) VALUES (?, ?, ?, ?)`)
	if err != nil {
		observability.ErrorCount.WithLabelValues("ch_batch_prepare", "batch").Inc()
		span.RecordError(err)
		return err
	}
	for _, tick := range ticks {
		if err := batch.Append(tick.Symbol, tick.Timestamp, tick.Price, tick.Volume); err != nil {
			observability.ErrorCount.WithLabelValues("ch_batch_append", tick.Symbol).Inc()
			span.RecordError(err)
			return err
		}
	}
	err = batch.Send()
	latency := time.Since(start).Seconds()
	if len(ticks) > 0 {
		observability.TickLatency.WithLabelValues(ticks[0].Symbol).Observe(latency)
	}
	if err != nil {
		observability.ErrorCount.WithLabelValues("ch_batch_send", "batch").Inc()
		span.RecordError(err)
	}
	return err
}

func (p *CHPersister) Close() {
	p.conn.Close()
}
