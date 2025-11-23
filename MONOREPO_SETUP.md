# 🏗️ Coinet AI Monorepo Setup Guide

**Revolutionary AI-Powered Cryptocurrency Platform - Complete Monorepo Structure**

## 📁 Repository Structure

```
coinet-ai/
├── apps/                          # Frontend Applications
│   ├── web-client/               # Next.js web application
│   └── mobile-client/            # React Native mobile app
├── services/                      # Backend Microservices  
│   ├── ingest/                   # Data ingestion service
│   ├── context/                  # Prompt builder service
│   ├── inference/                # LLM orchestration service
│   └── feedback/                 # Feedback & ML optimization
├── packages/                      # Shared Libraries
│   ├── shared-models/            # TypeScript interfaces & schemas
│   ├── shared-ui/                # React UI components
│   └── shared-utils/             # Utility functions
├── infra/                        # Infrastructure as Code
│   ├── terraform/                # Cloud infrastructure
│   │   ├── main.tf              # Main configuration
│   │   ├── variables.tf         # Variables
│   │   └── modules/             # Terraform modules
│   │       ├── k8s/            # EKS cluster
│   │       ├── databases/       # RDS, Redis, etc.
│   │       └── monitoring/      # Prometheus, Grafana
│   └── helm/                    # Kubernetes deployments
│       └── charts/              # Helm charts
│           ├── ai-services/     # Backend services
│           ├── web-client/      # Frontend app
│           └── monitoring-stack/ # Monitoring
└── scripts/                      # Deployment & utility scripts
    ├── deploy-advanced-platform.sh
    └── deploy-k8s.sh
```

## 🚀 Quick Start

### Prerequisites

```bash
# Install required tools
brew install node npm docker kubectl helm terraform
# or on Linux:
# apt-get install nodejs npm docker.io kubectl helm terraform

# Verify installations
node --version    # >= 18.0.0
npm --version     # >= 9.0.0
docker --version
kubectl version --client
helm version
terraform --version
```

### 1. Initial Setup

```bash
# Clone the repository
git clone https://github.com/your-org/coinet-ai.git
cd coinet-ai

# Install dependencies for all packages and services
npm install

# Build shared packages
npm run build
```

### 2. Development Environment

```bash
# Start all services in development mode
npm run dev

# Or start individual services
npm run dev --workspace=apps/web-client
npm run dev --workspace=services/ingest
npm run dev --workspace=services/context
npm run dev --workspace=services/inference
npm run dev --workspace=services/feedback
```

### 3. Production Deployment

```bash
# Build all services
npm run build

# Deploy infrastructure with Terraform
npm run infra:plan
npm run infra:apply

# Deploy to Kubernetes
npm run k8s:deploy

# Or use the comprehensive deployment script
./scripts/deploy-advanced-platform.sh
```

## 🏗️ Architecture Overview

### Frontend Applications

#### Web Client (`apps/web-client`)
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: SWR
- **Charts**: Recharts

#### Mobile Client (`apps/mobile-client`)
- **Framework**: React Native 0.72
- **Navigation**: React Navigation 6
- **State Management**: Zustand
- **Platform**: iOS & Android

### Backend Microservices

#### Ingest Service (`services/ingest`)
- **Purpose**: Real-time market & on-chain data ingestion
- **Port**: 8001
- **Tech**: Fastify, WebSockets, Kafka
- **Data Sources**: Crypto exchanges, blockchain APIs

#### Context Service (`services/context`)
- **Purpose**: AI prompt building & context assembly
- **Port**: 8002
- **Tech**: Fastify, Template engines
- **Features**: Dynamic prompt generation, context optimization

#### Inference Service (`services/inference`)
- **Purpose**: LLM orchestration & AI reasoning
- **Port**: 8003
- **Tech**: Fastify, OpenAI, Anthropic, Google AI
- **Features**: Multi-LLM support, response optimization

#### Feedback Service (`services/feedback`)
- **Purpose**: ML optimization & user feedback processing
- **Port**: 8004
- **Tech**: Fastify, ML algorithms
- **Features**: Bandit algorithms, recommendation tuning

### Shared Libraries

#### Shared Models (`packages/shared-models`)
- TypeScript interfaces and types
- Zod validation schemas
- API contracts
- Database models

#### Shared UI (`packages/shared-ui`)
- React components library
- Tailwind CSS styling
- Storybook documentation
- Design system tokens

#### Shared Utils (`packages/shared-utils`)
- Common utility functions
- API clients
- Data transformations
- Helper libraries

## 🔧 Development Workflow

### 1. Package Management

```bash
# Add dependency to specific workspace
npm install axios --workspace=services/ingest

# Add dev dependency
npm install -D @types/node --workspace=packages/shared-models

# Add shared package dependency
npm install @coinet-ai/shared-models --workspace=services/ingest
```

### 2. Building & Testing

```bash
# Build everything
npm run build

# Test everything
npm run test

# Run specific tests
npm run test:unit
npm run test:integration
npm run test:e2e

# Type checking
npm run typecheck

# Linting
npm run lint
```

### 3. Docker Development

```bash
# Build Docker images
npm run docker:build

# Run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f
```

## 🚀 Deployment Guide

### Environment Setup

Create environment-specific configuration files:

```bash
# Development
cp env.example .env.development

# Staging  
cp env.example .env.staging

# Production
cp env.example .env.production
```

### Infrastructure Deployment

```bash
# 1. Deploy AWS infrastructure
cd infra/terraform
terraform init
terraform plan -var-file="environments/dev/terraform.tfvars"
terraform apply -var-file="environments/dev/terraform.tfvars"

# 2. Configure kubectl
aws eks update-kubeconfig --region us-west-2 --name coinet-ai-dev-cluster

# 3. Deploy applications
./scripts/deploy-k8s.sh
```

### Blue-Green Deployment

```bash
# Deploy to green environment
ENVIRONMENT=green ./scripts/deploy-k8s.sh

# Switch traffic (after validation)
kubectl patch service coinet-ai-web \
  -p '{"spec":{"selector":{"version":"green"}}}'

# Cleanup blue environment
ENVIRONMENT=blue kubectl delete deployment coinet-ai-services
```

## 📊 Monitoring & Observability

### Access Dashboards

```bash
# Prometheus
kubectl port-forward -n monitoring svc/prometheus-server 9090:80

# Grafana  
kubectl port-forward -n monitoring svc/grafana 3000:80
# Default login: admin/admin123

# Jaeger (Distributed Tracing)
kubectl port-forward -n monitoring svc/jaeger-query 16686:16686
```

### Health Checks

```bash
# Check service health
curl http://localhost:8001/health  # Ingest service
curl http://localhost:8002/health  # Context service  
curl http://localhost:8003/health  # Inference service
curl http://localhost:8004/health  # Feedback service

# Check Kubernetes pods
kubectl get pods -n coinet-ai
kubectl describe pod <pod-name> -n coinet-ai
```

## 🔐 Security & Compliance

### Secret Management

```bash
# Create Kubernetes secrets
kubectl create secret generic api-keys \
  --from-literal=openai-key=$OPENAI_API_KEY \
  --from-literal=anthropic-key=$ANTHROPIC_API_KEY \
  -n coinet-ai

# Database credentials
kubectl create secret generic db-credentials \
  --from-literal=username=$DB_USERNAME \
  --from-literal=password=$DB_PASSWORD \
  -n coinet-ai
```

### Security Scanning

```bash
# Run security scans (included in CI/CD)
npm audit --audit-level=high
snyk test
trivy image coinet-ai/web-client:latest
```

## 📝 Development Guidelines

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration with custom rules
- **Prettier**: Automatic code formatting
- **Husky**: Pre-commit hooks for quality checks

### Git Workflow

```bash
# Feature development
git checkout -b feature/ai-recommendations
git add .
git commit -m "feat: add AI recommendation engine"
git push origin feature/ai-recommendations

# Create pull request via GitHub UI
# Automated CI/CD will run tests and deploy to staging
```

### Testing Strategy

- **Unit Tests**: Jest for all packages and services
- **Integration Tests**: Supertest for API testing
- **E2E Tests**: Playwright for web, Detox for mobile
- **Performance Tests**: k6 for load testing

## 🛠️ Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear caches and rebuild
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### Kubernetes Issues
```bash
# Check cluster connection
kubectl cluster-info

# Debug pod issues
kubectl logs <pod-name> -n coinet-ai
kubectl describe pod <pod-name> -n coinet-ai

# Check resource usage
kubectl top nodes
kubectl top pods -n coinet-ai
```

#### Database Connection Issues
```bash
# Test database connectivity
kubectl exec -it <pod-name> -n coinet-ai -- /bin/sh
npm run db:test-connection
```

### Getting Help

- **Documentation**: See `/docs` directory for detailed guides
- **Issues**: Create GitHub issues for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Team Chat**: Internal Slack channels for team communication

## 📈 Performance Optimization

### Frontend Optimization
- Bundle analysis: `npm run analyze:bundle`
- Lighthouse CI integration
- Image optimization with Next.js
- Code splitting by routes

### Backend Optimization
- Connection pooling for databases
- Redis caching for frequent queries
- Horizontal pod autoscaling
- Load balancing with NGINX ingress

### Infrastructure Optimization
- Spot instances for cost savings
- Auto-scaling based on metrics
- Resource requests and limits
- Node affinity rules

---

## 🎯 Next Steps

1. **Set up CI/CD**: Configure GitHub Actions workflows
2. **Add Monitoring**: Set up Prometheus, Grafana, and alerting
3. **Security Hardening**: Implement security best practices
4. **Performance Testing**: Set up automated performance testing
5. **Documentation**: Expand API documentation and guides

**Ready to build the future of AI-powered cryptocurrency analysis! 🚀** 