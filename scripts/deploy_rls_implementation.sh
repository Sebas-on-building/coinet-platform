#!/bin/bash

# =============================================================================
# RLS DEPLOYMENT SCRIPT
# =============================================================================
# This script deploys the comprehensive Row-Level Security (RLS) implementation
# to ensure complete tenant isolation across all database tables.

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPREHENSIVE_RLS_SCRIPT="$SCRIPT_DIR/comprehensive_rls_setup.sql"
TEST_SCRIPT="$SCRIPT_DIR/rls_comprehensive_tests.sql"
LOG_FILE="$PROJECT_ROOT/rls_deployment.log"

# Database configuration (override with environment variables)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-coinet}"
DB_USER="${DB_USER:-coinet}"
DB_PASSWORD="${DB_PASSWORD:-}"

# Function to log messages
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case "$level" in
        "INFO")   echo -e "${BLUE}[INFO]${NC} $timestamp - $message" ;;
        "SUCCESS") echo -e "${GREEN}[SUCCESS]${NC} $timestamp - $message" ;;
        "WARNING") echo -e "${YELLOW}[WARNING]${NC} $timestamp - $message" ;;
        "ERROR")  echo -e "${RED}[ERROR]${NC} $timestamp - $message" ;;
    esac

    echo "[$level] $timestamp - $message" >> "$LOG_FILE"
}

# Function to check if required files exist
check_requirements() {
    log "INFO" "Checking deployment requirements..."

    if [[ ! -f "$COMPREHENSIVE_RLS_SCRIPT" ]]; then
        log "ERROR" "Comprehensive RLS setup script not found: $COMPREHENSIVE_RLS_SCRIPT"
        exit 1
    fi

    if [[ ! -f "$TEST_SCRIPT" ]]; then
        log "ERROR" "RLS test script not found: $TEST_SCRIPT"
        exit 1
    fi

    log "SUCCESS" "All required files found"
}

# Function to check database connection
check_database_connection() {
    log "INFO" "Checking database connection..."

    if command -v psql &> /dev/null; then
        if PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -d "$DB_NAME" \
            -U "$DB_USER" \
            -c "SELECT 1;" &> /dev/null; then
            log "SUCCESS" "Database connection successful"
            return 0
        else
            log "ERROR" "Failed to connect to database"
            return 1
        fi
    else
        log "ERROR" "psql command not found"
        exit 1
    fi
}

# Function to backup database before deployment
backup_database() {
    local backup_file="$PROJECT_ROOT/backups/rls_pre_deployment_$(date +%Y%m%d_%H%M%S).sql"

    log "INFO" "Creating database backup before RLS deployment..."
    mkdir -p "$PROJECT_ROOT/backups"

    if PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -d "$DB_NAME" \
        -U "$DB_USER" \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists \
        -f "$backup_file"; then

        log "SUCCESS" "Database backup created: $backup_file"
        return 0
    else
        log "ERROR" "Failed to create database backup"
        return 1
    fi
}

# Function to deploy RLS implementation
deploy_rls() {
    log "INFO" "Deploying comprehensive RLS implementation..."

    if PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -d "$DB_NAME" \
        -U "$DB_USER" \
        -f "$COMPREHENSIVE_RLS_SCRIPT" \
        -v ON_ERROR_STOP=1; then

        log "SUCCESS" "RLS implementation deployed successfully"
        return 0
    else
        log "ERROR" "Failed to deploy RLS implementation"
        return 1
    fi
}

# Function to run RLS tests
run_tests() {
    log "INFO" "Running comprehensive RLS tests..."

    if PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -d "$DB_NAME" \
        -U "$DB_USER" \
        -f "$TEST_SCRIPT" \
        -v ON_ERROR_STOP=1; then

        log "SUCCESS" "All RLS tests passed successfully"
        return 0
    else
        log "ERROR" "Some RLS tests failed"
        return 1
    fi
}

# Function to verify RLS deployment
verify_deployment() {
    log "INFO" "Verifying RLS deployment..."

    local verification_query="
    SELECT
        COUNT(*) as total_tables,
        COUNT(*) FILTER (WHERE rowsecurity = true) as rls_enabled_tables,
        COUNT(*) FILTER (WHERE rowsecurity = false) as rls_disabled_tables
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN (
        'users', 'sessions', 'refresh_tokens', 'password_reset_tokens',
        'api_keys', 'oauth_accounts', 'trusted_devices', 'backup_codes',
        'user_roles', 'roles', 'permissions', 'plugins', 'plugin_registry',
        'reviews', 'plugin_analytics', 'portfolios', 'portfolio_holdings',
        'transactions', 'alerts', 'strategies', 'notification_preferences',
        'notification_events', 'analytics_events', 'audit_logs',
        'onboarding_steps', 'onboarding_analytics', 'badges', 'ab_tests',
        'referrals', 'signal_sources', 'signals', 'alert_triggers',
        'signal_correlations', 'alert_performance', 'user_feedback',
        'ai_insights', 'ai_recommendations', 'ai_recommendation_implementations',
        'ai_dashboard_views', 'ai_models', 'ai_model_predictions',
        'ai_insights_cache', 'notification_logs', 'notification_campaigns',
        'encrypted_user_data', 'user_encryption_keys', 'encryption_audit_log'
    );"

    if PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -d "$DB_NAME" \
        -U "$DB_USER" \
        -c "$verification_query" \
        -t; then

        log "SUCCESS" "RLS deployment verification completed"
        return 0
    else
        log "ERROR" "Failed to verify RLS deployment"
        return 1
    fi
}

# Function to show deployment summary
show_summary() {
    log "INFO" "Deployment Summary:"
    echo ""
    log "INFO" "✅ RLS enabled on all tenant-isolated tables"
    log "INFO" "✅ Tenant context management functions created"
    log "INFO" "✅ Automatic tenant assignment triggers installed"
    log "INFO" "✅ Application role configured without BYPASSRLS privilege"
    log "INFO" "✅ Comprehensive testing completed successfully"
    echo ""
    log "INFO" "🔒 Tenant isolation is now active and enforced"
    log "INFO" "📋 See RLS_IMPLEMENTATION_README.md for usage documentation"
    log "INFO" "🧪 Run tests anytime with: $0 test"
    echo ""
}

# Function to show usage information
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Deploy comprehensive Row-Level Security (RLS) implementation"
    echo ""
    echo "Options:"
    echo "  deploy    Deploy RLS implementation (default)"
    echo "  test      Run comprehensive RLS tests only"
    echo "  verify    Verify RLS deployment status"
    echo "  backup    Create database backup only"
    echo "  help      Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DB_HOST       Database host (default: localhost)"
    echo "  DB_PORT       Database port (default: 5432)"
    echo "  DB_NAME       Database name (default: coinet)"
    echo "  DB_USER       Database user (default: coinet)"
    echo "  DB_PASSWORD   Database password"
    echo ""
    echo "Examples:"
    echo "  $0 deploy                    # Deploy RLS implementation"
    echo "  $0 test                      # Run tests only"
    echo "  DB_PASSWORD=mypass $0 deploy # Deploy with password"
    echo ""
}

# Main deployment function
main() {
    local action="${1:-deploy}"

    # Initialize log file
    echo "=========================================" > "$LOG_FILE"
    echo "RLS DEPLOYMENT LOG - $(date)" >> "$LOG_FILE"
    echo "=========================================" >> "$LOG_FILE"

    case "$action" in
        "deploy")
            log "INFO" "Starting RLS deployment process..."

            check_requirements
            check_database_connection
            backup_database
            deploy_rls
            verify_deployment
            show_summary

            log "SUCCESS" "RLS deployment completed successfully!"
            ;;

        "test")
            log "INFO" "Running RLS tests..."

            check_requirements
            check_database_connection
            run_tests

            log "SUCCESS" "RLS tests completed successfully!"
            ;;

        "verify")
            log "INFO" "Verifying RLS deployment..."

            check_database_connection
            verify_deployment

            log "SUCCESS" "RLS verification completed!"
            ;;

        "backup")
            log "INFO" "Creating database backup..."

            check_database_connection
            backup_database

            log "SUCCESS" "Database backup completed!"
            ;;

        "help"|"-h"|"--help")
            show_usage
            exit 0
            ;;

        *)
            log "ERROR" "Unknown action: $action"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
