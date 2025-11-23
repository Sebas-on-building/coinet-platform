#!/bin/bash

# Revolutionary API Gateway - Test Runner
# Comprehensive testing script for all test types

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}================================${NC}\n"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    print_error "This script must be run from the services/api-gateway directory"
    exit 1
fi

print_header "Revolutionary API Gateway - Test Suite"

# Check if Redis is running (for integration tests)
check_redis() {
    print_status "Checking Redis connection..."
    if command -v redis-cli >/dev/null 2>&1; then
        if redis-cli ping >/dev/null 2>&1; then
            print_success "Redis is running and accessible"
            return 0
        else
            print_warning "Redis is not responding to ping"
            return 1
        fi
    else
        print_warning "redis-cli not found in PATH"
        return 1
    fi
}

# Install dependencies if needed
install_deps() {
    if [ ! -d "node_modules" ]; then
        print_status "Installing dependencies..."
        npm install
        print_success "Dependencies installed"
    else
        print_status "Dependencies already installed"
    fi
}

# Build the project
build_project() {
    print_status "Building TypeScript project..."
    npm run build
    print_success "Project built successfully"
}

# Run linting
run_lint() {
    print_header "Running Linting"
    print_status "Checking code style and quality..."
    
    if npm run lint; then
        print_success "Linting passed"
    else
        print_error "Linting failed - please fix the issues before running tests"
        exit 1
    fi
}

# Run unit tests
run_unit_tests() {
    print_header "Running Unit Tests"
    print_status "Executing unit tests with coverage..."
    
    # Run unit tests specifically
    if npm run test:unit -- --coverage --testPathPattern=tests/unit; then
        print_success "Unit tests passed"
    else
        print_error "Unit tests failed"
        return 1
    fi
}

# Run integration tests
run_integration_tests() {
    print_header "Running Integration Tests"
    
    # Check Redis first
    if ! check_redis; then
        print_warning "Redis not available - skipping integration tests"
        print_warning "To run integration tests, ensure Redis is running on localhost:6379"
        return 0
    fi
    
    print_status "Executing integration tests..."
    
    # Set test environment
    export NODE_ENV=test
    export LOG_LEVEL=error
    
    if npm run test:integration -- --testPathPattern=tests/integration; then
        print_success "Integration tests passed"
    else
        print_error "Integration tests failed"
        return 1
    fi
}

# Run performance tests
run_performance_tests() {
    print_header "Running Performance Tests"
    print_warning "Performance tests may take several minutes to complete..."
    
    # Set performance test environment
    export NODE_ENV=test
    export LOG_LEVEL=error
    
    print_status "Executing performance benchmarks..."
    
    if npm test -- --testPathPattern=tests/performance --testTimeout=300000; then
        print_success "Performance tests completed"
    else
        print_error "Performance tests failed"
        return 1
    fi
}

# Generate comprehensive coverage report
generate_coverage() {
    print_header "Generating Coverage Report"
    print_status "Creating comprehensive coverage report..."
    
    # Run all tests with coverage
    npm run test:coverage -- --testPathIgnorePatterns=tests/performance
    
    print_status "Coverage report generated in ./coverage directory"
    
    # Check coverage thresholds
    if [ -f "coverage/coverage-summary.json" ]; then
        print_status "Coverage Summary:"
        node -e "
            const fs = require('fs');
            const coverage = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
            const total = coverage.total;
            console.log(\`  Lines: \${total.lines.pct}%\`);
            console.log(\`  Functions: \${total.functions.pct}%\`);
            console.log(\`  Branches: \${total.branches.pct}%\`);
            console.log(\`  Statements: \${total.statements.pct}%\`);
        "
    fi
}

# Clean up test artifacts
cleanup() {
    print_status "Cleaning up test artifacts..."
    
    # Remove test logs if they exist
    [ -f "logs/api-gateway-error.log" ] && rm -f logs/api-gateway-error.log
    [ -f "logs/api-gateway.log" ] && rm -f logs/api-gateway.log
    
    # Clean up any test databases or temporary files
    [ -d "test-temp" ] && rm -rf test-temp
    
    print_success "Cleanup completed"
}

# Main execution
main() {
    local test_type="${1:-all}"
    local skip_build="${2:-false}"
    
    print_status "Starting test execution for: $test_type"
    
    # Always install dependencies and run linting
    install_deps
    
    if [ "$skip_build" != "true" ]; then
        build_project
    fi
    
    run_lint
    
    # Track test results
    local unit_result=0
    local integration_result=0
    local performance_result=0
    
    case "$test_type" in
        "unit")
            run_unit_tests || unit_result=1
            ;;
        "integration")
            run_integration_tests || integration_result=1
            ;;
        "performance")
            run_performance_tests || performance_result=1
            ;;
        "all")
            print_status "Running complete test suite..."
            
            run_unit_tests || unit_result=1
            run_integration_tests || integration_result=1
            
            # Only run performance tests if previous tests passed
            if [ $unit_result -eq 0 ] && [ $integration_result -eq 0 ]; then
                print_status "Core tests passed - running performance tests..."
                run_performance_tests || performance_result=1
            else
                print_warning "Skipping performance tests due to previous failures"
            fi
            
            generate_coverage
            ;;
        *)
            print_error "Invalid test type: $test_type"
            print_status "Usage: $0 [unit|integration|performance|all] [skip-build]"
            exit 1
            ;;
    esac
    
    cleanup
    
    # Summary
    print_header "Test Results Summary"
    
    if [ $unit_result -eq 0 ]; then
        print_success "✓ Unit Tests: PASSED"
    else
        print_error "✗ Unit Tests: FAILED"
    fi
    
    if [ "$test_type" = "all" ] || [ "$test_type" = "integration" ]; then
        if [ $integration_result -eq 0 ]; then
            print_success "✓ Integration Tests: PASSED"
        else
            print_error "✗ Integration Tests: FAILED"
        fi
    fi
    
    if [ "$test_type" = "all" ] || [ "$test_type" = "performance" ]; then
        if [ $performance_result -eq 0 ]; then
            print_success "✓ Performance Tests: PASSED"
        else
            print_error "✗ Performance Tests: FAILED"
        fi
    fi
    
    # Overall result
    local total_failures=$((unit_result + integration_result + performance_result))
    
    if [ $total_failures -eq 0 ]; then
        print_success "🎉 All tests passed successfully!"
        exit 0
    else
        print_error "❌ $total_failures test suite(s) failed"
        exit 1
    fi
}

# Help function
show_help() {
    echo "Revolutionary API Gateway - Test Runner"
    echo ""
    echo "Usage: $0 [OPTIONS] [TEST_TYPE]"
    echo ""
    echo "TEST_TYPE:"
    echo "  unit         Run only unit tests"
    echo "  integration  Run only integration tests (requires Redis)"
    echo "  performance  Run only performance tests"
    echo "  all          Run all test types (default)"
    echo ""
    echo "OPTIONS:"
    echo "  -h, --help   Show this help message"
    echo "  --skip-build Skip the TypeScript build step"
    echo ""
    echo "Examples:"
    echo "  $0                    # Run all tests"
    echo "  $0 unit              # Run only unit tests"
    echo "  $0 integration       # Run only integration tests"
    echo "  $0 all --skip-build  # Run all tests without building"
    echo ""
    echo "Environment Variables:"
    echo "  CI=true              # Enable CI mode (stricter checks)"
    echo "  REDIS_URL            # Redis connection URL (default: redis://localhost:6379)"
    echo ""
}

# Handle command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    *)
        if [ "$1" = "--skip-build" ]; then
            main "all" "true"
        elif [ "$2" = "--skip-build" ]; then
            main "$1" "true"
        else
            main "$1" "false"
        fi
        ;;
esac 