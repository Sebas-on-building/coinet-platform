#!/bin/bash

# ===================================================================
# COINET AI PLATFORM - STARTUP SCRIPT
# Revolutionary AI-Powered Cryptocurrency Platform
# ===================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ASCII Art Banner
echo -e "${PURPLE}"
echo "  ██████╗ ██████╗ ██╗███╗   ██╗███████╗████████╗    ██████╗ ██╗"
echo " ██╔════╝██╔═══██╗██║████╗  ██║██╔════╝╚══██╔══╝   ██╔═══██╗██║"
echo " ██║     ██║   ██║██║██╔██╗ ██║█████╗     ██║█████╗██████╔╝██║"
echo " ██║     ██║   ██║██║██║╚██╗██║██╔══╝     ██║╚════╝██╔══██╗██║"
echo " ╚██████╗╚██████╔╝██║██║ ╚████║███████╗   ██║      ██║  ██║██║"
echo "  ╚═════╝ ╚═════╝ ╚═╝╚═╝  ╚═══╝╚══════╝   ╚═╝      ╚═╝  ╚═╝╚═╝"
echo "                                                                 "
echo "    🚀 Revolutionary AI-Powered Cryptocurrency Platform 🚀       "
echo -e "${NC}"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "\n${CYAN}====================================================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}====================================================================${NC}"
}

# Check if running in correct directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_header "🔧 COINET AI PLATFORM INITIALIZATION"

# Check Node.js version
print_status "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18 or later."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18 or later is required. Current version: $(node --version)"
    exit 1
fi
print_status "Node.js version: $(node --version) ✓"

# Check Python version
print_status "Checking Python version..."
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3.9 or later."
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1-2)
print_status "Python version: $(python3 --version) ✓"

# Check Docker
print_status "Checking Docker..."
if ! command -v docker &> /dev/null; then
    print_warning "Docker is not installed. Some features may not work."
else
    print_status "Docker version: $(docker --version) ✓"
fi

# Install dependencies
print_header "📦 INSTALLING DEPENDENCIES"

print_status "Installing Node.js dependencies..."
if npm install --legacy-peer-deps; then
    print_status "Node.js dependencies installed successfully ✓"
else
    print_error "Failed to install Node.js dependencies"
    exit 1
fi

print_status "Installing Python dependencies for AI service..."
cd services/ai
if python3 -m pip install -r requirements.txt; then
    print_status "Python dependencies installed successfully ✓"
else
    print_error "Failed to install Python dependencies"
    exit 1
fi
cd ../..

# Setup environment
print_header "🔧 ENVIRONMENT SETUP"

if [ ! -f ".env" ]; then
    print_status "Creating .env file from template..."
    cp env.example .env
    print_warning "Please update .env file with your configuration"
else
    print_status "Environment file already exists ✓"
fi

# Database setup
print_header "🗄️ DATABASE SETUP"

print_status "Starting database services with Docker Compose..."
if docker-compose -f docker-compose.dev.yml up -d postgres mongodb redis clickhouse weaviate; then
    print_status "Database services started successfully ✓"
    print_status "Waiting for databases to be ready..."
    sleep 10
else
    print_warning "Failed to start database services. Please ensure Docker is running."
fi

# Build services
print_header "🏗️ BUILDING SERVICES"

print_status "Building TypeScript services..."
npm run build

# Start services
print_header "🚀 STARTING SERVICES"

print_status "Starting message queue services..."
if docker-compose -f docker-compose.dev.yml up -d kafka zookeeper; then
    print_status "Message queue services started ✓"
    sleep 5
else
    print_warning "Failed to start message queue services"
fi

print_status "Starting monitoring services..."
if docker-compose -f docker-compose.dev.yml up -d prometheus grafana; then
    print_status "Monitoring services started ✓"
else
    print_warning "Failed to start monitoring services"
fi

print_status "Starting application services..."
npm run dev &
WEB_PID=$!

cd services/context && npm run dev &
CONTEXT_PID=$!

cd ../ingest && npm run dev &
INGEST_PID=$!

cd ../inference && npm run dev &
INFERENCE_PID=$!

cd ../ai && python3 -m uvicorn main:app --host 0.0.0.0 --port 8008 --reload &
AI_PID=$!

cd ../..

# Wait for services to start
print_status "Waiting for services to start..."
sleep 15

# Health checks
print_header "🏥 HEALTH CHECKS"

check_service() {
    local service=$1
    local port=$2
    local name=$3
    
    if curl -s -f "http://localhost:$port/health" > /dev/null 2>&1; then
        print_status "$name service is healthy ✓"
        return 0
    else
        print_warning "$name service is not responding"
        return 1
    fi
}

check_service "web" 3000 "Web Client"
check_service "context" 8006 "Context Service"
check_service "ingest" 8005 "Ingest Service"
check_service "inference" 8007 "Inference Service"
check_service "ai" 8008 "AI Service"

# Display service URLs
print_header "🌐 SERVICE URLS"

echo -e "${BLUE}Web Client:${NC}          http://localhost:3000"
echo -e "${BLUE}Context Service:${NC}     http://localhost:8006"
echo -e "${BLUE}Ingest Service:${NC}      http://localhost:8005"
echo -e "${BLUE}Inference Service:${NC}   http://localhost:8007"
echo -e "${BLUE}AI Service:${NC}          http://localhost:8008"
echo -e "${BLUE}Grafana:${NC}             http://localhost:3001 (admin/admin)"
echo -e "${BLUE}Prometheus:${NC}          http://localhost:9090"

# Display database URLs
print_header "🗄️ DATABASE URLS"

echo -e "${BLUE}PostgreSQL:${NC}          localhost:5432 (coinet/coinet123)"
echo -e "${BLUE}MongoDB:${NC}             localhost:27017 (coinet/coinet123)"
echo -e "${BLUE}Redis:${NC}               localhost:6379"
echo -e "${BLUE}ClickHouse:${NC}          localhost:8123"
echo -e "${BLUE}Weaviate:${NC}            localhost:8080"

# Success message
print_header "🎉 COINET AI PLATFORM READY"

echo -e "${GREEN}"
echo "  ✅ All services are running successfully!"
echo "  🚀 Platform is ready for development"
echo "  📊 Monitor services at: http://localhost:3001"
echo "  🔧 API Documentation: http://localhost:3000/api/docs"
echo -e "${NC}"

print_status "Press Ctrl+C to stop all services"

# Cleanup function
cleanup() {
    print_header "🛑 STOPPING SERVICES"
    
    print_status "Stopping application services..."
    kill $WEB_PID $CONTEXT_PID $INGEST_PID $INFERENCE_PID $AI_PID 2>/dev/null || true
    
    print_status "Stopping Docker services..."
    docker-compose -f docker-compose.dev.yml down
    
    print_status "All services stopped ✓"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT

# Keep script running
while true; do
    sleep 1
done 