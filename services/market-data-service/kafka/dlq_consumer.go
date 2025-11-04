package kafka

import (
	"bytes"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/segmentio/kafka-go"
)

var (
	DLQMessagesConsumed = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "coinnet_dlq_messages_consumed_total",
			Help: "Total number of DLQ messages consumed.",
		},
	)
	DLQMessagesRetried = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "coinnet_dlq_messages_retried_total",
			Help: "Total number of DLQ messages retried.",
		},
	)
	DLQMessagesAlerted = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "coinnet_dlq_messages_alerted_total",
			Help: "Total number of DLQ messages sent to alerting webhook.",
		},
	)
)

func init() {
	prometheus.MustRegister(DLQMessagesConsumed, DLQMessagesRetried, DLQMessagesAlerted)
}

type DLQConsumer struct {
	reader *kafka.Reader
}

func NewDLQConsumer(broker, groupID string) *DLQConsumer {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:   []string{broker},
		GroupID:   groupID,
		Topic:     "dlq",
		Partition: 0,
		MinBytes:  1e3,  // 1KB
		MaxBytes:  10e6, // 10MB
	})
	return &DLQConsumer{reader: reader}
}

func (c *DLQConsumer) Start(ctx context.Context) {
	log.Println("DLQ Consumer started...")
	go func() {
		c := make(chan os.Signal, 1)
		signal.Notify(c, syscall.SIGINT, syscall.SIGTERM)
		<-c
		os.Exit(0)
	}()
	for {
		m, err := c.reader.ReadMessage(ctx)
		if err != nil {
			log.Printf("DLQ read error: %v", err)
			if ctx.Err() != nil {
				return
			}
			time.Sleep(2 * time.Second)
			continue
		}
		DLQMessagesConsumed.Inc()
		var dlqMsg map[string]interface{}
		if err := json.Unmarshal(m.Value, &dlqMsg); err != nil {
			log.Printf("DLQ unmarshal error: %v", err)
			continue
		}
		log.Printf("[DLQ] Topic: %s | Key: %s | Error: %v | Payload: %v", dlqMsg["original_topic"], dlqMsg["key"], dlqMsg["error"], dlqMsg["value"])
		// Alerting: send to webhook if configured
		webhook := os.Getenv("DLQ_ALERT_WEBHOOK")
		if webhook != "" {
			go func(msg map[string]interface{}) {
				b, _ := json.Marshal(msg)
				_, err := http.Post(webhook, "application/json", bytes.NewReader(b))
				if err == nil {
					DLQMessagesAlerted.Inc()
				}
			}(dlqMsg)
		}
		// Retry logic: attempt to republish to original topic (max 1 retry)
		if origTopic, ok := dlqMsg["original_topic"].(string); ok && origTopic != "" {
			if key, ok := dlqMsg["key"].(string); ok {
				// TODO: Use the correct serialization for value
				// For now, just re-publish as JSON
				writer := kafka.NewWriter(kafka.WriterConfig{
					Brokers: []string{os.Getenv("KAFKA_BROKER")},
					Topic:   origTopic,
				})
				defer writer.Close()
				value, _ := json.Marshal(dlqMsg["value"])
				err := writer.WriteMessages(ctx, kafka.Message{
					Key:   []byte(key),
					Value: value,
				})
				if err == nil {
					DLQMessagesRetried.Inc()
					log.Printf("DLQ message retried to topic %s", origTopic)
				}
			}
		}
		// Admin UI stub: here you could push to a channel, DB, or API for admin review
	}
}

func (c *DLQConsumer) Stop() {
	c.reader.Close()
	log.Println("DLQ Consumer stopped.")
}
