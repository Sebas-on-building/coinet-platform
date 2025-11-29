# =============================================================================
# COINET AI - ML SERVICE DOCKERFILE
# AI/ML microservice for cryptocurrency analysis and prediction
# =============================================================================

# Use lightweight Python slim image
FROM python:3.11-slim AS base

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8005

# Install system dependencies and security updates
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        wget \
        git \
        pkg-config \
        libpq-dev \
        gcc \
        g++ && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r coinet && useradd -r -g coinet coinet

# Copy requirements first for better layer caching
COPY requirements-core.txt requirements.txt ./

# Upgrade pip and install dependencies
RUN pip install --upgrade pip && \
    pip install -r requirements-core.txt && \
    pip install gunicorn uvloop httptools && \
    pip cache purge

# Copy source code
COPY src/ ./src/
COPY pyproject.toml README.md ./

# Install the package in development mode
RUN pip install -e .

# Remove build dependencies to reduce image size
RUN apt-get remove -y build-essential gcc g++ pkg-config && \
    apt-get autoremove -y && \
    apt-get clean

# Change ownership to non-root user
RUN chown -R coinet:coinet /app

# Switch to non-root user
USER coinet

# Expose port
EXPOSE 8005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8005/health || exit 1

# Start the service with gunicorn for production
CMD ["gunicorn", "coinet_ai_ml.main:app", \
     "--bind", "0.0.0.0:8005", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--timeout", "120", \
     "--keep-alive", "2", \
     "--log-level", "info"] 