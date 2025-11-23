# Portfolio Service API

This service manages user portfolios, provides analytics, and publishes events to Kafka.

## Endpoints
- `GET /portfolios` - List all portfolios
- `POST /portfolios` - Create a new portfolio
- `GET /portfolios/{id}` - Get a portfolio by ID
- `PUT /portfolios/{id}` - Update a portfolio
- `DELETE /portfolios/{id}` - Delete a portfolio
- `GET /portfolios/{id}/analytics` - Get analytics for a portfolio

See [openapi.yaml](./openapi.yaml) for full API documentation. 