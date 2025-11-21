# Coinet Marketplace API Documentation

Welcome to the Coinet Marketplace API! This API is atomic, modular, and infinitely extensible, inspired by the best of Apple, Canva, TradingView, and Solana.

## Features
- Atomic, modular endpoints for plugins, reviews, analytics, monetization, support, and more
- REST (OpenAPI) and GraphQL interfaces
- Auto-generated docs and playgrounds
- World-class developer experience

## OpenAPI (Swagger UI)
- **Spec:** [`openapi.yaml`](./openapi.yaml)
- **Swagger UI:** `/api/docs` (local) or `https://api.coinet.com/docs`

## GraphQL Playground
- **SDL:** [`graphql-schema.graphql`](./graphql-schema.graphql)
- **Playground:** `/api/graphql` (local) or `https://api.coinet.com/graphql`

## Example Usage

### REST
```http
GET /api/plugins
POST /api/plugins/{pluginId}/reviews
GET /api/plugins/{pluginId}/analytics
```

### GraphQL
```graphql
query {
  plugins(filter: { tag: "analytics" }) {
    id
    name
    status
    reviews { rating comment }
  }
}
```

## Philosophy
- **Atomic:** Every feature and sub-feature is its own endpoint or resolver.
- **Extensible:** Add new features without breaking existing clients.
- **Modular:** Shared logic, validation, and error handling.
- **Beautiful:** Clear, delightful, and accessible for all developers.

---

For more, see the [Coinet Technical Blueprint](https://chatgpt.com/s/dr_6831e75bf3f08191a3922617f0a73c99). 