package kafka

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/riferrei/srclient"
	"github.com/segmentio/kafka-go"
	"google.golang.org/protobuf/proto"
)

type SerializationType int

const (
	JSON SerializationType = iota
	Avro
	Protobuf
)

type Producer struct {
	writers        map[string]*kafka.Writer
	schemaRegistry *srclient.SchemaRegistryClient
	serType        SerializationType
	avroSchemaID   int
}

func NewProducer(broker string, serType SerializationType, schemaRegistryURL string, avroSubject string) *Producer {
	topics := []string{"market.ticks", "market.ohlc", "trade.signals", "dlq"}
	writers := make(map[string]*kafka.Writer)
	for _, topic := range topics {
		writers[topic] = &kafka.Writer{
			Addr:         kafka.TCP(broker),
			Topic:        topic,
			Balancer:     &kafka.Hash{},
			RequiredAcks: kafka.RequireAll,
			Async:        true,
		}
	}
	var schemaRegistry *srclient.SchemaRegistryClient
	var avroSchemaID int
	if serType == Avro && schemaRegistryURL != "" {
		schemaRegistry = srclient.CreateSchemaRegistryClient(schemaRegistryURL)
		schema, err := schemaRegistry.GetLatestSchema(avroSubject)
		if err != nil {
			log.Fatalf("Failed to get Avro schema: %v", err)
		}
		avroSchemaID = schema.ID()
	}
	p := &Producer{writers: writers, schemaRegistry: schemaRegistry, serType: serType, avroSchemaID: avroSchemaID}
	// Graceful shutdown
	go func() {
		c := make(chan os.Signal, 1)
		signal.Notify(c, syscall.SIGINT, syscall.SIGTERM)
		<-c
		for _, w := range writers {
			w.Close()
		}
		os.Exit(0)
	}()
	return p
}

func (p *Producer) Publish(topic string, key string, v interface{}) {
	var value []byte
	var err error
	switch p.serType {
	case Avro:
		// Assume v is map[string]interface{} and schema is registered
		value, err = p.serializeAvro(v)
	case Protobuf:
		// Assume v is proto.Message
		value, err = proto.Marshal(v.(proto.Message))
	default:
		value, err = json.Marshal(v)
	}
	if err != nil {
		log.Printf("Kafka marshal error: %v", err)
		p.publishDLQ(topic, key, v, err)
		return
	}
	writer, ok := p.writers[topic]
	if !ok {
		log.Printf("Kafka topic not found: %s", topic)
		p.publishDLQ(topic, key, v, err)
		return
	}
	// Retry logic
	maxRetries := 3
	for i := 0; i < maxRetries; i++ {
		err = writer.WriteMessages(context.Background(), kafka.Message{
			Key:   []byte(key),
			Value: value,
		})
		if err == nil {
			return
		}
		log.Printf("Kafka publish error (attempt %d): %v", i+1, err)
		time.Sleep(time.Duration(i+1) * 500 * time.Millisecond)
	}
	// If all retries fail, send to DLQ
	p.publishDLQ(topic, key, v, err)
}

func (p *Producer) publishDLQ(topic, key string, v interface{}, origErr error) {
	dlqWriter, ok := p.writers["dlq"]
	if !ok {
		log.Printf("DLQ topic not found")
		return
	}
	dlqMsg := map[string]interface{}{
		"original_topic": topic,
		"key":            key,
		"value":          v,
		"error":          origErr.Error(),
		"timestamp":      time.Now().UTC().Format(time.RFC3339Nano),
	}
	msg, _ := json.Marshal(dlqMsg)
	err := dlqWriter.WriteMessages(context.Background(), kafka.Message{
		Key:   []byte(key),
		Value: msg,
	})
	if err != nil {
		log.Printf("DLQ publish error: %v", err)
	}
}

func (p *Producer) serializeAvro(v interface{}) ([]byte, error) {
	// This is a placeholder. In production, use goavro or similar to encode with schema ID prefix.
	// For demo, just marshal as JSON.
	return json.Marshal(v)
}

func (p *Producer) Close() {
	for _, w := range p.writers {
		w.Close()
	}
}

// ---
// Avro Schema Example for Tick (save as tick.avsc):
// {
//   "type": "record",
//   "name": "Tick",
//   "namespace": "coinnet.marketdata",
//   "fields": [
//     {"name": "symbol", "type": "string"},
//     {"name": "timestamp", "type": "long"},
//     {"name": "price", "type": "double"},
//     {"name": "volume", "type": "double"}
//   ]
// }
//
// Protobuf Schema Example for Tick (save as tick.proto):
// syntax = "proto3";
// package coinnet.marketdata;
// message Tick {
//   string symbol = 1;
//   int64 timestamp = 2;
//   double price = 3;
//   double volume = 4;
// }
//
// To use Protobuf: generate Go code with protoc and import the generated Tick type.
// To use Avro: use goavro or similar to encode/decode with schema registry integration.
// ---
