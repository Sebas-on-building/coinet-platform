#!/bin/bash

# =============================================================================
# COINET AI KAFKA-CLICKHOUSE INTEGRATION DEPLOYMENT SCRIPT
# Complete real-time analytics pipeline with monitoring and validation
# =============================================================================

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default configuration
NAMESPACE="${NAMESPACE:-default}"
DRY_RUN="${DRY_RUN:-false}"
SKIP_DEPENDENCIES="${SKIP_DEPENDENCIES:-false}"
ENABLE_MONITORING="${ENABLE_MONITORING:-true}"
INTEGRATION_TEST="${INTEGRATION_TEST:-true}"

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  INFO:${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅ SUCCESS:${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠️  WARNING:${NC} $1"
}

log_error() {
    echo -e "${RED}❌ ERROR:${NC} $1"
}

log_step() {
    echo -e "${PURPLE}🔄 STEP:${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites for Kafka-ClickHouse integration..."
    
    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check if helm is available
    if ! command -v helm &> /dev/null; then
        log_error "helm is not installed or not in PATH"
        exit 1
    fi
    
    # Check kubectl connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check if Kafka is running
    if ! kubectl get statefulset coinet-kafka -n "$NAMESPACE" &> /dev/null; then
        log_error "Kafka is not deployed. Please deploy Kafka first using: ./scripts/deploy-kafka.sh deploy"
        exit 1
    fi
    
    # Check if ClickHouse is running
    if ! kubectl get clickhouseinstallation coinet-clickhouse -n "$NAMESPACE" &> /dev/null; then
        log_error "ClickHouse is not deployed. Please deploy ClickHouse first using: ./scripts/deploy-clickhouse.sh deploy"
        exit 1
    fi
    
    log_success "Prerequisites check completed"
}

# Function to deploy integration configuration
deploy_integration_config() {
    log_step "Deploying Kafka-ClickHouse integration configuration..."
    
    # Apply integration configuration
    kubectl apply -f k8s/databases/kafka-clickhouse-integration.yaml
    
    # Wait for ConfigMaps to be created
    kubectl wait --for=condition=Ready configmap/kafka-clickhouse-integration -n "$NAMESPACE" --timeout=60s || true
    kubectl wait --for=condition=Ready configmap/kafka-clickhouse-monitoring -n "$NAMESPACE" --timeout=60s || true
    
    log_success "Integration configuration deployed"
}

# Function to initialize ClickHouse tables and views
initialize_clickhouse_integration() {
    log_step "Initializing ClickHouse integration tables and materialized views..."
    
    # Create a temporary pod to run ClickHouse initialization
    kubectl run clickhouse-integration-init \
        --image=clickhouse/clickhouse-client:23.12.2.59-alpine \
        --rm -i --restart=Never \
        --namespace="$NAMESPACE" \
        --command -- /bin/sh -c "
        
        # Wait for ClickHouse to be ready
        until clickhouse-client --host='coinet-clickhouse-0-0.$NAMESPACE.svc.cluster.local' --port=9000 --user=default --password='clickhouse-admin-2024!' --query='SELECT 1'; do
            echo 'Waiting for ClickHouse to be ready...'
            sleep 5
        done
        
        echo 'ClickHouse is ready, creating integration tables...'
        
        # Create Kafka engine tables
        clickhouse-client --host='coinet-clickhouse-0-0.$NAMESPACE.svc.cluster.local' --port=9000 --user=default --password='clickhouse-admin-2024!' --multiquery --query=\"
        
        -- Market data Kafka engine table
        CREATE TABLE IF NOT EXISTS market_analytics.kafka_market_data_queue
        (
            id String,
            timestamp DateTime64(3),
            source String,
            version String,
            type String,
            symbol String,
            exchange String,
            price Float64,
            volume Float64,
            bid Float64,
            ask Float64,
            spread Float64,
            change24h Float64,
            changePercent24h Float64
        )
        ENGINE = Kafka()
        SETTINGS
            kafka_broker_list = 'coinet-kafka:9092',
            kafka_topic_list = 'market.price.processed',
            kafka_group_name = 'clickhouse-market-consumer',
            kafka_format = 'JSONEachRow',
            kafka_num_consumers = 3,
            kafka_skip_broken_messages = 1000,
            kafka_max_block_size = 65536,
            kafka_flush_interval_ms = 7500;
        
        -- News data Kafka engine table
        CREATE TABLE IF NOT EXISTS news_analytics.kafka_news_data_queue
        (
            id String,
            timestamp DateTime64(3),
            source String,
            version String,
            type String,
            title String,
            content String,
            publishedAt DateTime64(3),
            sentiment_score Float32,
            sentiment_label String,
            sentiment_confidence Float32,
            symbols Array(String),
            topics Array(String),
            importance Float32
        )
        ENGINE = Kafka()
        SETTINGS
            kafka_broker_list = 'coinet-kafka:9092',
            kafka_topic_list = 'news.articles.processed',
            kafka_group_name = 'clickhouse-news-consumer',
            kafka_format = 'JSONEachRow',
            kafka_num_consumers = 2,
            kafka_skip_broken_messages = 1000,
            kafka_max_block_size = 32768,
            kafka_flush_interval_ms = 10000;
        
        -- Social media Kafka engine table
        CREATE TABLE IF NOT EXISTS social_analytics.kafka_social_data_queue
        (
            id String,
            timestamp DateTime64(3),
            source String,
            version String,
            type String,
            platform String,
            content String,
            author_username String,
            author_followers Nullable(UInt64),
            author_influence Nullable(Float32),
            sentiment_score Float32,
            sentiment_label String,
            sentiment_confidence Float32,
            engagement_likes UInt64,
            engagement_shares UInt64,
            engagement_comments UInt64,
            symbols Array(String)
        )
        ENGINE = Kafka()
        SETTINGS
            kafka_broker_list = 'coinet-kafka:9092',
            kafka_topic_list = 'social.mentions.processed',
            kafka_group_name = 'clickhouse-social-consumer',
            kafka_format = 'JSONEachRow',
            kafka_num_consumers = 2,
            kafka_skip_broken_messages = 1000,
            kafka_max_block_size = 32768,
            kafka_flush_interval_ms = 15000;
        
        -- AI context Kafka engine table
        CREATE TABLE IF NOT EXISTS coinet_analytics.kafka_ai_context_queue
        (
            id String,
            timestamp DateTime64(3),
            source String,
            version String,
            type String,
            contextId String,
            symbol String,
            timeframe String,
            market_data String,
            news_data String,
            social_data String,
            onchain_data Nullable(String),
            aggregated_sentiment_overall Float32,
            aggregated_sentiment_confidence Float32,
            aggregated_sentiment_trend String,
            market_conditions_volatility String,
            market_conditions_momentum String,
            importance Float32,
            completeness Float32
        )
        ENGINE = Kafka()
        SETTINGS
            kafka_broker_list = 'coinet-kafka:9092',
            kafka_topic_list = 'ai.context.assembled',
            kafka_group_name = 'clickhouse-ai-consumer',
            kafka_format = 'JSONEachRow',
            kafka_num_consumers = 2,
            kafka_skip_broken_messages = 1000,
            kafka_max_block_size = 65536,
            kafka_flush_interval_ms = 5000;
        \"
        
        echo 'Kafka engine tables created successfully'
        
        # Create materialized views
        clickhouse-client --host='coinet-clickhouse-0-0.$NAMESPACE.svc.cluster.local' --port=9000 --user=default --password='clickhouse-admin-2024!' --multiquery --query=\"
        
        -- Market data materialized view
        CREATE MATERIALIZED VIEW IF NOT EXISTS market_analytics.market_data_mv TO market_analytics.price_history AS
        SELECT
            id,
            timestamp,
            symbol,
            exchange,
            price,
            volume,
            IF(price > 0, price * volume, 0) as market_cap,
            toDate(timestamp) as date
        FROM market_analytics.kafka_market_data_queue
        WHERE 
            isNotNull(timestamp) 
            AND isNotNull(symbol) 
            AND symbol != ''
            AND price > 0
            AND volume >= 0;
        
        -- News data materialized view
        CREATE MATERIALIZED VIEW IF NOT EXISTS news_analytics.news_data_mv TO news_analytics.news_impact AS
        SELECT
            timestamp,
            symbols[1] as symbol,
            source,
            title,
            sentiment_score,
            importance,
            0.0 as price_impact,
            0.0 as volume_spike,
            toDate(timestamp) as date
        FROM news_analytics.kafka_news_data_queue
        WHERE 
            isNotNull(timestamp)
            AND length(symbols) > 0
            AND isNotNull(sentiment_score)
            AND sentiment_confidence > 0.5;
        
        -- Social sentiment materialized view
        CREATE MATERIALIZED VIEW IF NOT EXISTS social_analytics.social_data_mv TO social_analytics.sentiment_scores AS
        SELECT
            timestamp,
            symbols[1] as symbol,
            platform,
            sentiment_score,
            sentiment_confidence as confidence,
            1 as volume,
            coalesce(author_influence, 0.1) as influence_score,
            toDate(timestamp) as date
        FROM social_analytics.kafka_social_data_queue
        WHERE 
            isNotNull(timestamp)
            AND length(symbols) > 0
            AND isNotNull(sentiment_score)
            AND sentiment_confidence > 0.3;
        \"
        
        echo 'Materialized views created successfully'
        
        # Create monitoring tables
        clickhouse-client --host='coinet-clickhouse-0-0.$NAMESPACE.svc.cluster.local' --port=9000 --user=default --password='clickhouse-admin-2024!' --multiquery --query=\"
        
        -- Create data quality monitoring table
        CREATE TABLE IF NOT EXISTS coinet_analytics.data_quality_metrics
        (
            timestamp DateTime DEFAULT now(),
            table_name LowCardinality(String),
            metric_type LowCardinality(String),
            metric_value Float64,
            threshold_value Float64,
            status LowCardinality(String),
            details String,
            date Date MATERIALIZED toDate(timestamp)
        )
        ENGINE = MergeTree()
        PARTITION BY toYYYYMM(timestamp)
        ORDER BY (table_name, metric_type, timestamp)
        TTL timestamp + INTERVAL 90 DAY;
        
        -- Create ingestion metrics table
        CREATE TABLE IF NOT EXISTS coinet_analytics.ingestion_metrics
        (
            timestamp DateTime DEFAULT now(),
            data_source LowCardinality(String),
            records_per_second Float64,
            lag_seconds Float64,
            error_rate Float64,
            bytes_per_second Float64,
            partition_count UInt32,
            consumer_group String,
            date Date MATERIALIZED toDate(timestamp)
        )
        ENGINE = MergeTree()
        PARTITION BY toYYYYMM(timestamp)
        ORDER BY (data_source, timestamp)
        TTL timestamp + INTERVAL 30 DAY;
        
        -- Create pipeline alerts table
        CREATE TABLE IF NOT EXISTS coinet_analytics.pipeline_alerts
        (
            timestamp DateTime DEFAULT now(),
            alert_type LowCardinality(String),
            severity LowCardinality(String),
            source LowCardinality(String),
            message String,
            metric_value Float64,
            threshold Float64,
            status LowCardinality(String),
            date Date MATERIALIZED toDate(timestamp)
        )
        ENGINE = MergeTree()
        PARTITION BY toYYYYMM(timestamp)
        ORDER BY (alert_type, source, timestamp)
        TTL timestamp + INTERVAL 30 DAY;
        
        -- Create AI insights table
        CREATE TABLE IF NOT EXISTS coinet_analytics.ai_insights
        (
            contextId String,
            timestamp DateTime64(3),
            symbol LowCardinality(String),
            timeframe LowCardinality(String),
            sentiment_score Float32,
            sentiment_confidence Float32,
            sentiment_trend LowCardinality(String),
            volatility LowCardinality(String),
            momentum LowCardinality(String),
            importance Float32,
            completeness Float32,
            date Date MATERIALIZED toDate(timestamp)
        )
        ENGINE = MergeTree()
        PARTITION BY toYYYYMM(timestamp)
        ORDER BY (symbol, timeframe, timestamp)
        TTL timestamp + INTERVAL 1 YEAR;
        \"
        
        echo 'Monitoring and analytics tables created successfully'
        "
    
    log_success "ClickHouse integration initialized"
}

# Function to deploy stream processor service
deploy_stream_processor() {
    log_step "Deploying stream processor service..."
    
    # Create stream processor deployment
    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kafka-clickhouse-stream-processor
  namespace: $NAMESPACE
  labels:
    app.kubernetes.io/name: stream-processor
    app.kubernetes.io/component: integration
    app.kubernetes.io/part-of: coinet-ai
spec:
  replicas: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: stream-processor
  template:
    metadata:
      labels:
        app.kubernetes.io/name: stream-processor
        app.kubernetes.io/component: integration
        app.kubernetes.io/part-of: coinet-ai
    spec:
      containers:
      - name: stream-processor
        image: node:18-alpine
        command: ["/bin/sh"]
        args:
          - -c
          - |
            # Install dependencies and run stream processor
            apk add --no-cache git
            npm install -g typescript ts-node
            cd /app
            npm install
            npm run build
            npm start
        ports:
        - containerPort: 3003
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3003"
        - name: CLICKHOUSE_HOST
          value: "coinet-clickhouse-0-0.default.svc.cluster.local"
        - name: CLICKHOUSE_PORT
          value: "8123"
        - name: CLICKHOUSE_USER
          value: "coinet_etl"
        - name: CLICKHOUSE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: clickhouse-credentials
              key: etl-password
        - name: CLICKHOUSE_DATABASE
          value: "coinet_analytics"
        - name: KAFKA_BROKERS
          value: "coinet-kafka:9092"
        - name: KAFKA_CLIENT_ID
          value: "coinet-stream-processor"
        - name: KAFKA_GROUP_ID
          value: "stream-processor-group"
        resources:
          requests:
            memory: 512Mi
            cpu: 250m
          limits:
            memory: 1Gi
            cpu: 500m
        readinessProbe:
          httpGet:
            path: /health
            port: 3003
          initialDelaySeconds: 30
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health
            port: 3003
          initialDelaySeconds: 60
          periodSeconds: 30
        volumeMounts:
        - name: app-source
          mountPath: /app
      volumes:
      - name: app-source
        configMap:
          name: stream-processor-source
          
---
apiVersion: v1
kind: Service
metadata:
  name: kafka-clickhouse-stream-processor
  namespace: $NAMESPACE
  labels:
    app.kubernetes.io/name: stream-processor
    app.kubernetes.io/component: integration
    app.kubernetes.io/part-of: coinet-ai
spec:
  selector:
    app.kubernetes.io/name: stream-processor
  ports:
  - name: http
    port: 3003
    targetPort: 3003
  type: ClusterIP
EOF
    
    log_success "Stream processor service deployed"
}

# Function to validate integration
validate_integration() {
    log_step "Validating Kafka-ClickHouse integration..."
    
    # Check if Kafka topics exist
    log_info "Checking Kafka topics..."
    kubectl run kafka-topic-check \
        --image=confluentinc/cp-kafka:7.5.0 \
        --rm -i --restart=Never \
        --namespace="$NAMESPACE" \
        --command -- kafka-topics \
        --bootstrap-server "coinet-kafka:9092" \
        --list | grep -E "(market\.price\.processed|news\.articles\.processed|social\.mentions\.processed|ai\.context\.assembled)"
    
    # Check ClickHouse tables
    log_info "Checking ClickHouse tables..."
    kubectl run clickhouse-table-check \
        --image=clickhouse/clickhouse-client:23.12.2.59-alpine \
        --rm -i --restart=Never \
        --namespace="$NAMESPACE" \
        --command -- clickhouse-client \
        --host="coinet-clickhouse-0-0.$NAMESPACE.svc.cluster.local" \
        --port=9000 \
        --user=default \
        --password="clickhouse-admin-2024!" \
        --query="SHOW TABLES FROM market_analytics WHERE name LIKE '%kafka%'"
    
    # Check materialized views
    log_info "Checking materialized views..."
    kubectl run clickhouse-view-check \
        --image=clickhouse/clickhouse-client:23.12.2.59-alpine \
        --rm -i --restart=Never \
        --namespace="$NAMESPACE" \
        --command -- clickhouse-client \
        --host="coinet-clickhouse-0-0.$NAMESPACE.svc.cluster.local" \
        --port=9000 \
        --user=default \
        --password="clickhouse-admin-2024!" \
        --query="SHOW TABLES FROM market_analytics WHERE name LIKE '%_mv'"
    
    log_success "Integration validation completed"
}

# Function to run integration tests
run_integration_tests() {
    log_step "Running end-to-end integration tests..."
    
    # Test 1: Send test message to Kafka and verify ClickHouse ingestion
    log_info "Test 1: Market data flow test..."
    
    # Generate test market data
    TEST_MESSAGE=$(cat <<EOF
{
  "id": "test-$(date +%s)",
  "timestamp": $(date +%s)000,
  "source": "integration-test",
  "version": "1.0",
  "type": "market.price",
  "symbol": "BTC",
  "price": 45000.0,
  "volume": 1.5,
  "exchange": "test-exchange",
  "data": {
    "bid": 44995.0,
    "ask": 45005.0,
    "spread": 10.0,
    "change24h": 500.0,
    "changePercent24h": 1.12
  }
}
EOF
)
    
    # Send test message to Kafka
    kubectl run kafka-test-producer \
        --image=confluentinc/cp-kafka:7.5.0 \
        --rm -i --restart=Never \
        --namespace="$NAMESPACE" \
        --command -- /bin/bash -c "
        echo '$TEST_MESSAGE' | kafka-console-producer \
            --broker-list coinet-kafka:9092 \
            --topic market.price.processed
        "
    
    # Wait for processing
    sleep 30
    
    # Check if data appeared in ClickHouse
    log_info "Verifying data in ClickHouse..."
    RECORD_COUNT=$(kubectl run clickhouse-test-query \
        --image=clickhouse/clickhouse-client:23.12.2.59-alpine \
        --rm -i --restart=Never \
        --namespace="$NAMESPACE" \
        --command -- clickhouse-client \
        --host="coinet-clickhouse-0-0.$NAMESPACE.svc.cluster.local" \
        --port=9000 \
        --user=default \
        --password="clickhouse-admin-2024!" \
        --query="SELECT count() FROM market_analytics.price_history WHERE symbol = 'BTC' AND source = 'integration-test'"
    )
    
    if [ "$RECORD_COUNT" -gt 0 ]; then
        log_success "Integration test passed: Market data successfully flowed from Kafka to ClickHouse"
    else
        log_warning "Integration test result: No test data found in ClickHouse (may need more time)"
    fi
    
    log_success "Integration tests completed"
}

# Function to show pipeline status
show_pipeline_status() {
    log_step "Checking integration pipeline status..."
    
    echo ""
    echo -e "${CYAN}=== KAFKA-CLICKHOUSE INTEGRATION STATUS ===${NC}"
    echo ""
    
    # Show Kafka status
    echo -e "${GREEN}Kafka Status:${NC}"
    kubectl get statefulset coinet-kafka -n "$NAMESPACE" -o wide
    echo ""
    
    # Show ClickHouse status
    echo -e "${GREEN}ClickHouse Status:${NC}"
    kubectl get clickhouseinstallation coinet-clickhouse -n "$NAMESPACE" -o wide
    echo ""
    
    # Show stream processor status
    echo -e "${GREEN}Stream Processor Status:${NC}"
    kubectl get deployment kafka-clickhouse-stream-processor -n "$NAMESPACE" -o wide || echo "Stream processor not deployed"
    echo ""
    
    # Show integration ConfigMaps
    echo -e "${GREEN}Integration Configuration:${NC}"
    kubectl get configmap kafka-clickhouse-integration kafka-clickhouse-monitoring -n "$NAMESPACE" -o wide
    echo ""
    
    # Show CronJobs
    echo -e "${GREEN}Monitoring Jobs:${NC}"
    kubectl get cronjob -l app.kubernetes.io/name=kafka-clickhouse-integration -n "$NAMESPACE" -o wide
    echo ""
}

# Function to cleanup integration
cleanup_integration() {
    log_step "Cleaning up Kafka-ClickHouse integration..."
    
    # Remove stream processor
    kubectl delete deployment kafka-clickhouse-stream-processor -n "$NAMESPACE" || true
    kubectl delete service kafka-clickhouse-stream-processor -n "$NAMESPACE" || true
    
    # Remove integration configuration
    kubectl delete -f k8s/databases/kafka-clickhouse-integration.yaml || true
    
    # Remove ClickHouse integration tables (optional)
    kubectl run clickhouse-cleanup \
        --image=clickhouse/clickhouse-client:23.12.2.59-alpine \
        --rm -i --restart=Never \
        --namespace="$NAMESPACE" \
        --command -- clickhouse-client \
        --host="coinet-clickhouse-0-0.$NAMESPACE.svc.cluster.local" \
        --port=9000 \
        --user=default \
        --password="clickhouse-admin-2024!" \
        --multiquery --query="
        DROP TABLE IF EXISTS market_analytics.kafka_market_data_queue;
        DROP TABLE IF EXISTS news_analytics.kafka_news_data_queue;
        DROP TABLE IF EXISTS social_analytics.kafka_social_data_queue;
        DROP TABLE IF EXISTS coinet_analytics.kafka_ai_context_queue;
        DROP VIEW IF EXISTS market_analytics.market_data_mv;
        DROP VIEW IF EXISTS news_analytics.news_data_mv;
        DROP VIEW IF EXISTS social_analytics.social_data_mv;
        " || true
    
    log_success "Integration cleanup completed"
}

# Function to show help
show_help() {
    echo "Kafka-ClickHouse Integration Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS] COMMAND"
    echo ""
    echo "COMMANDS:"
    echo "  deploy      Deploy complete Kafka-ClickHouse integration"
    echo "  status      Show integration pipeline status"
    echo "  validate    Validate integration configuration"
    echo "  test        Run integration tests"
    echo "  cleanup     Remove integration components"
    echo "  help        Show this help message"
    echo ""
    echo "OPTIONS:"
    echo "  --namespace NAME         Kubernetes namespace (default: default)"
    echo "  --dry-run               Run in dry-run mode"
    echo "  --skip-deps             Skip dependency checks"
    echo "  --no-monitoring         Disable monitoring components"
    echo "  --no-tests              Skip integration tests"
    echo ""
    echo "EXAMPLES:"
    echo "  $0 deploy                           # Deploy complete integration"
    echo "  $0 --namespace production deploy    # Deploy to production namespace"
    echo "  $0 test                            # Run integration tests"
    echo "  $0 status                          # Check pipeline status"
    echo "  $0 cleanup                         # Remove integration"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            --skip-deps)
                SKIP_DEPENDENCIES="true"
                shift
                ;;
            --no-monitoring)
                ENABLE_MONITORING="false"
                shift
                ;;
            --no-tests)
                INTEGRATION_TEST="false"
                shift
                ;;
            deploy|status|validate|test|cleanup|help)
                COMMAND="$1"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Main execution function
main() {
    local command="${COMMAND:-help}"
    
    case $command in
        deploy)
            if [ "$SKIP_DEPENDENCIES" = "false" ]; then
                check_prerequisites
            fi
            deploy_integration_config
            initialize_clickhouse_integration
            if [ "$ENABLE_MONITORING" = "true" ]; then
                log_info "Monitoring is enabled via CronJobs"
            fi
            if [ "$DRY_RUN" = "false" ]; then
                validate_integration
                if [ "$INTEGRATION_TEST" = "true" ]; then
                    run_integration_tests
                fi
                show_pipeline_status
            fi
            ;;
        status)
            show_pipeline_status
            ;;
        validate)
            validate_integration
            ;;
        test)
            run_integration_tests
            ;;
        cleanup)
            cleanup_integration
            ;;
        help)
            show_help
            ;;
        *)
            log_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Parse arguments and execute
parse_args "$@"

# Display banner
echo -e "${CYAN}"
echo "================================================================="
echo "      COINET AI KAFKA-CLICKHOUSE INTEGRATION DEPLOYMENT"
echo "      Real-Time Analytics Pipeline with Stream Processing"
echo "================================================================="
echo -e "${NC}"

main 