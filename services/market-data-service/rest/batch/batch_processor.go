package batch

import (
	"context"
	"fmt"
	"sync"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

// BatchRequest represents a single request in a batch
type BatchRequest struct {
	ID        string                   `json:"id"`
	Key       string                   `json:"key"`
	Data      interface{}              `json:"data"`
	Priority  int                      `json:"priority"` // Higher number = higher priority
	Metadata  map[string]interface{}   `json:"metadata"`
	CreatedAt time.Time                `json:"created_at"`
	Timeout   time.Duration            `json:"timeout"`
	Callback  func(interface{}, error) `json:"-"`
}

// BatchResponse represents the response for a batch request
type BatchResponse struct {
	ID       string        `json:"id"`
	Key      string        `json:"key"`
	Data     interface{}   `json:"data"`
	Error    error         `json:"error"`
	Duration time.Duration `json:"duration"`
}

// BatchProcessor handles intelligent batching of requests
type BatchProcessor struct {
	mu             sync.RWMutex
	requests       []*BatchRequest
	priorityQueue  map[int][]*BatchRequest // priority -> requests
	maxBatchSize   int
	maxWaitTime    time.Duration
	minBatchSize   int
	processor      func([]*BatchRequest) ([]*BatchResponse, error)
	ticker         *time.Ticker
	stopChan       chan struct{}
	processingChan chan struct{}

	// Statistics
	stats BatchProcessorStats

	// Advanced features
	adaptiveBatching   bool
	compressionEnabled bool
	deduplication      bool
	dedupeMap          map[string]*BatchRequest
	tracer             trace.Tracer

	// Callbacks
	onBatchProcessed func([]*BatchRequest, []*BatchResponse, time.Duration)
	onRequestQueued  func(*BatchRequest)
	onRequestTimeout func(*BatchRequest)
	onError          func(error)
}

// BatchProcessorStats provides comprehensive statistics
type BatchProcessorStats struct {
	TotalRequests        int64         `json:"total_requests"`
	ProcessedRequests    int64         `json:"processed_requests"`
	FailedRequests       int64         `json:"failed_requests"`
	TotalBatches         int64         `json:"total_batches"`
	AvgBatchSize         float64       `json:"avg_batch_size"`
	AvgProcessingTime    time.Duration `json:"avg_processing_time"`
	QueueLength          int           `json:"queue_length"`
	DeduplicatedRequests int64         `json:"deduplicated_requests"`
	TimeoutRequests      int64         `json:"timeout_requests"`
	CompressionRatio     float64       `json:"compression_ratio"`
	Uptime               time.Duration `json:"uptime"`
	LastBatchProcessedAt time.Time     `json:"last_batch_processed_at"`
}

// BatchProcessorConfig defines configuration for batch processor
type BatchProcessorConfig struct {
	MaxBatchSize       int           `json:"max_batch_size"`
	MinBatchSize       int           `json:"min_batch_size"`
	MaxWaitTime        time.Duration `json:"max_wait_time"`
	AdaptiveBatching   bool          `json:"adaptive_batching"`
	CompressionEnabled bool          `json:"compression_enabled"`
	Deduplication      bool          `json:"deduplication"`
	Tracing            bool          `json:"tracing"`
}

// NewBatchProcessor creates a revolutionary batch processor
func NewBatchProcessor(
	config BatchProcessorConfig,
	processor func([]*BatchRequest) ([]*BatchResponse, error),
) *BatchProcessor {
	bp := &BatchProcessor{
		requests:           make([]*BatchRequest, 0),
		priorityQueue:      make(map[int][]*BatchRequest),
		maxBatchSize:       config.MaxBatchSize,
		maxWaitTime:        config.MaxWaitTime,
		minBatchSize:       config.MinBatchSize,
		processor:          processor,
		stopChan:           make(chan struct{}),
		processingChan:     make(chan struct{}, 1),
		adaptiveBatching:   config.AdaptiveBatching,
		compressionEnabled: config.CompressionEnabled,
		deduplication:      config.Deduplication,
		dedupeMap:          make(map[string]*BatchRequest),
		stats: BatchProcessorStats{
			LastBatchProcessedAt: time.Now(),
		},
	}

	// Initialize tracer
	if config.Tracing {
		bp.tracer = otel.Tracer("batch-processor")
	}

	// Start processing ticker
	bp.ticker = time.NewTicker(config.MaxWaitTime)

	// Start background processor
	go bp.processLoop()

	return bp
}

// AddRequest adds a request to the batch queue with revolutionary intelligence
func (bp *BatchProcessor) AddRequest(req *BatchRequest) error {
	ctx := context.Background()

	// Create tracing span
	if bp.tracer != nil {
		var span trace.Span
		ctx, span = bp.tracer.Start(ctx, "batch.add_request", trace.WithAttributes(
			attribute.String("request.id", req.ID),
			attribute.String("request.key", req.Key),
			attribute.Int("request.priority", req.Priority),
		))
		defer span.End()
	}

	bp.mu.Lock()
	defer bp.mu.Unlock()

	// Set creation time if not set
	if req.CreatedAt.IsZero() {
		req.CreatedAt = time.Now()
	}

	// Handle deduplication
	if bp.deduplication {
		if existingReq, exists := bp.dedupeMap[req.Key]; exists {
			// Update existing request with higher priority
			if req.Priority > existingReq.Priority {
				existingReq.Priority = req.Priority
				existingReq.Data = req.Data
				existingReq.Metadata = req.Metadata
				existingReq.Callback = req.Callback
			}
			bp.stats.DeduplicatedRequests++
			return nil
		}
		bp.dedupeMap[req.Key] = req
	}

	// Add to priority queue
	if bp.priorityQueue[req.Priority] == nil {
		bp.priorityQueue[req.Priority] = make([]*BatchRequest, 0)
	}
	bp.priorityQueue[req.Priority] = append(bp.priorityQueue[req.Priority], req)

	// Add to main queue (for processing)
	bp.requests = append(bp.requests, req)
	bp.stats.TotalRequests++

	// Trigger callback
	if bp.onRequestQueued != nil {
		bp.onRequestQueued(req)
	}

	// Trigger immediate processing if batch is full
	if len(bp.requests) >= bp.maxBatchSize {
		select {
		case bp.processingChan <- struct{}{}:
		default:
			// Processing already in progress
		}
	}

	// Adaptive batching: adjust batch size based on queue length
	if bp.adaptiveBatching {
		bp.adjustBatchSize()
	}

	return nil
}

// ProcessBatch immediately processes current batch
func (bp *BatchProcessor) ProcessBatch() error {
	select {
	case bp.processingChan <- struct{}{}:
		return nil
	default:
		return fmt.Errorf("batch processing already in progress")
	}
}

// Stats returns comprehensive batch processor statistics
func (bp *BatchProcessor) Stats() BatchProcessorStats {
	bp.mu.RLock()
	defer bp.mu.RUnlock()

	stats := bp.stats
	stats.QueueLength = len(bp.requests)
	stats.Uptime = time.Since(bp.stats.LastBatchProcessedAt)

	// Calculate average batch size
	if stats.TotalBatches > 0 {
		stats.AvgBatchSize = float64(stats.ProcessedRequests) / float64(stats.TotalBatches)
	}

	return stats
}

// SetCallbacks configures event callbacks for monitoring
func (bp *BatchProcessor) SetCallbacks(
	onBatchProcessed func([]*BatchRequest, []*BatchResponse, time.Duration),
	onRequestQueued func(*BatchRequest),
	onRequestTimeout func(*BatchRequest),
	onError func(error),
) {
	bp.mu.Lock()
	defer bp.mu.Unlock()

	bp.onBatchProcessed = onBatchProcessed
	bp.onRequestQueued = onRequestQueued
	bp.onRequestTimeout = onRequestTimeout
	bp.onError = onError
}

// Stop gracefully shuts down the batch processor
func (bp *BatchProcessor) Stop() {
	close(bp.stopChan)
	bp.ticker.Stop()

	// Process remaining requests
	bp.processBatch()
}

// Private methods for internal operations

func (bp *BatchProcessor) processLoop() {
	for {
		select {
		case <-bp.ticker.C:
			// Time-based processing
			if len(bp.requests) >= bp.minBatchSize {
				select {
				case bp.processingChan <- struct{}{}:
				default:
					// Processing already in progress
				}
			}

		case <-bp.processingChan:
			// Size-based or manual processing
			bp.processBatch()

		case <-bp.stopChan:
			return
		}
	}
}

func (bp *BatchProcessor) processBatch() {
	ctx := context.Background()
	startTime := time.Now()

	// Create tracing span
	if bp.tracer != nil {
		var span trace.Span
		ctx, span = bp.tracer.Start(ctx, "batch.process", trace.WithAttributes(
			attribute.String("batch.operation", "process"),
		))
		defer span.End()
	}

	bp.mu.Lock()

	// Check if there's anything to process
	if len(bp.requests) == 0 {
		bp.mu.Unlock()
		return
	}

	// Get batch for processing (prioritized)
	batch := bp.getBatchForProcessing()
	if len(batch) == 0 {
		bp.mu.Unlock()
		return
	}

	// Update statistics
	bp.stats.TotalBatches++
	bp.stats.LastBatchProcessedAt = time.Now()

	bp.mu.Unlock()

	// Process the batch
	responses, err := bp.processor(batch)
	processingDuration := time.Since(startTime)

	// Handle processing results
	bp.handleBatchResults(batch, responses, err, processingDuration)

	// Update statistics
	bp.mu.Lock()
	if err == nil {
		bp.stats.ProcessedRequests += int64(len(batch))
	} else {
		bp.stats.FailedRequests += int64(len(batch))
		if bp.onError != nil {
			bp.onError(err)
		}
	}

	// Update average processing time
	if bp.stats.TotalBatches == 1 {
		bp.stats.AvgProcessingTime = processingDuration
	} else {
		bp.stats.AvgProcessingTime = time.Duration(
			(int64(bp.stats.AvgProcessingTime)*int64(bp.stats.TotalBatches-1) + int64(processingDuration)) / int64(bp.stats.TotalBatches),
		)
	}

	bp.mu.Unlock()

	// Trigger callback
	if bp.onBatchProcessed != nil {
		bp.onBatchProcessed(batch, responses, processingDuration)
	}
}

func (bp *BatchProcessor) getBatchForProcessing() []*BatchRequest {
	// Get highest priority requests first
	batch := make([]*BatchRequest, 0, bp.maxBatchSize)

	// Sort priorities in descending order
	priorities := make([]int, 0, len(bp.priorityQueue))
	for priority := range bp.priorityQueue {
		priorities = append(priorities, priority)
	}

	// Simple sort (for small arrays)
	for i := 0; i < len(priorities)-1; i++ {
		for j := i + 1; j < len(priorities); j++ {
			if priorities[i] < priorities[j] {
				priorities[i], priorities[j] = priorities[j], priorities[i]
			}
		}
	}

	// Build batch from highest priority to lowest
	remainingRequests := make([]*BatchRequest, 0)
	newPriorityQueue := make(map[int][]*BatchRequest)

	for _, priority := range priorities {
		requests := bp.priorityQueue[priority]
		for _, req := range requests {
			// Check timeout
			if req.Timeout > 0 && time.Since(req.CreatedAt) > req.Timeout {
				bp.stats.TimeoutRequests++
				if bp.onRequestTimeout != nil {
					bp.onRequestTimeout(req)
				}
				continue
			}

			if len(batch) < bp.maxBatchSize {
				batch = append(batch, req)
				// Remove from deduplication map
				if bp.deduplication {
					delete(bp.dedupeMap, req.Key)
				}
			} else {
				// Add back to queue for next batch
				if newPriorityQueue[priority] == nil {
					newPriorityQueue[priority] = make([]*BatchRequest, 0)
				}
				newPriorityQueue[priority] = append(newPriorityQueue[priority], req)
				remainingRequests = append(remainingRequests, req)
			}
		}
	}

	// Update queues
	bp.requests = remainingRequests
	bp.priorityQueue = newPriorityQueue

	return batch
}

func (bp *BatchProcessor) handleBatchResults(
	batch []*BatchRequest,
	responses []*BatchResponse,
	err error,
	duration time.Duration,
) {
	// Create response map for quick lookup
	responseMap := make(map[string]*BatchResponse)
	if responses != nil {
		for _, resp := range responses {
			responseMap[resp.ID] = resp
		}
	}

	// Process each request in the batch
	for _, req := range batch {
		var result interface{}
		var resultErr error

		if err != nil {
			// Batch processing failed
			resultErr = err
		} else if resp, exists := responseMap[req.ID]; exists {
			// Found response for this request
			result = resp.Data
			resultErr = resp.Error
		} else {
			// No response found
			resultErr = fmt.Errorf("no response found for request %s", req.ID)
		}

		// Call callback if provided
		if req.Callback != nil {
			req.Callback(result, resultErr)
		}
	}
}

func (bp *BatchProcessor) adjustBatchSize() {
	queueLength := len(bp.requests)

	// Adaptive batching logic
	if queueLength > bp.maxBatchSize*2 {
		// High load: increase batch size for efficiency
		bp.maxBatchSize = min(bp.maxBatchSize*2, 1000)
	} else if queueLength < bp.minBatchSize && bp.maxBatchSize > bp.minBatchSize {
		// Low load: decrease batch size for responsiveness
		bp.maxBatchSize = max(bp.maxBatchSize/2, bp.minBatchSize)
	}
}

// Utility functions
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
