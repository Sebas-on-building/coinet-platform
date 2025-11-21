# Coinet AI ML Service

AI/ML microservice for cryptocurrency analysis and prediction using FastAPI.

## Features

- **LLM Integration**: OpenAI, Anthropic, Google Generative AI
- **Vector Databases**: Pinecone, Weaviate
- **Speech Processing**: Deepgram SDK
- **ML Libraries**: scikit-learn, PyTorch, Transformers
- **Database Support**: PostgreSQL, MongoDB, ClickHouse, Redis

## Installation

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -e .

# Development dependencies
pip install -e ".[dev]"
```

## Usage

```bash
# Start development server
python -m coinet_ai_ml.main

# Or using uvicorn directly
uvicorn coinet_ai_ml.main:app --reload
```

## API Documentation

Visit `/docs` for Swagger UI documentation when running in development mode.

## Environment Variables

See the main project's `.env.example` for required environment variables.

## Development

```bash
# Run tests
pytest

# Code formatting
black src/
isort src/

# Type checking
mypy src/
``` 