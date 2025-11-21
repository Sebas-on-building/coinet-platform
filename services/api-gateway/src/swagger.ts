/**
 * Coinet API Gateway - Swagger/OpenAPI Documentation Configuration
 */

import swaggerJSDoc from 'swagger-jsdoc';
import * as swaggerUiExpress from 'swagger-ui-express';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Coinet API Gateway',
    version: '1.0.0',
    description: `
# Coinet AI Platform API Gateway

The **Coinet API Gateway** is the central entry point for all platform services, providing:

- **🔐 Authentication & Authorization**: JWT-based security with role-based access
- **🚀 Service Routing**: Intelligent routing to microservices
- **📊 Rate Limiting**: Advanced rate limiting with circuit breakers
- **💾 Response Caching**: Redis-backed caching for performance
- **📈 Monitoring**: Comprehensive metrics and health checks
- **🛡️ Security**: Helmet, CORS, compression, and security headers

## Services Integrated

- **User Service** (Port 8005): Authentication, profiles, 2FA, API keys
- **Auth Service** (Port 8001): Legacy authentication endpoints
- **Data Service** (Port 8004): Market data aggregation
- **Context Service** (Port 8002): AI context assembly
- **Ingest Service** (Port 8001): Data ingestion pipelines
- **Inference Service** (Port 8003): AI inference and predictions
- **Feedback Service** (Port 8004): User feedback and analytics

## Authentication

Most endpoints require a valid JWT token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

Get your token by logging in through the User Service:

\`\`\`bash
curl -X POST /api/v1/users/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@coinet.ai","password":"admin123"}'
\`\`\`

## Rate Limiting

- **Default**: 1000 requests per 15 minutes per IP
- **Authenticated**: Higher limits based on user tier
- **API Keys**: Custom rate limits per key

## Error Handling

All errors follow a consistent format:

\`\`\`json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "requestId": "unique-request-id",
  "timestamp": "2024-12-12T10:00:00.000Z"
}
\`\`\`
    `,
    contact: {
      name: 'Coinet Engineering Team',
      email: 'engineering@coinet.ai',
      url: 'https://coinet.ai'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:8000',
      description: 'Development Server'
    },
    {
      url: 'https://api.coinet.ai',
      description: 'Production Server'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from login endpoint'
      },
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for service-to-service authentication'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'MODERATOR', 'USER', 'AUTHOR', 'DEVELOPER', 'ANALYST'] },
          tier: { type: 'string', enum: ['FREE', 'PREMIUM', 'ENTERPRISE', 'VIP'] },
          isVerified: { type: 'boolean' },
          isTwoFactorEnabled: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          lastLoginAt: { type: 'string', format: 'date-time', nullable: true }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          twoFactorCode: { type: 'string', minLength: 6, maxLength: 6 }
        }
      },
      LoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
              token: { type: 'string' },
              expiresIn: { type: 'string' }
            }
          },
          message: { type: 'string' },
          requestId: { type: 'string' }
        }
      },
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object' },
          message: { type: 'string' },
          requestId: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          requestId: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['healthy', 'unhealthy'] },
          timestamp: { type: 'string', format: 'date-time' },
          version: { type: 'string' },
          uptime: { type: 'number' },
          services: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                url: { type: 'string' },
                responseTime: { type: 'number' }
              }
            }
          }
        }
      }
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              error: 'Unauthorized',
              message: 'Access token required',
              requestId: 'req_123',
              timestamp: '2024-12-12T10:00:00.000Z'
            }
          }
        }
      },
      ForbiddenError: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              error: 'Forbidden',
              message: 'Admin access required',
              requestId: 'req_123',
              timestamp: '2024-12-12T10:00:00.000Z'
            }
          }
        }
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              error: 'Not Found',
              message: 'The requested resource was not found',
              requestId: 'req_123',
              timestamp: '2024-12-12T10:00:00.000Z'
            }
          }
        }
      },
      RateLimitError: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              error: 'Too Many Requests',
              message: 'Rate limit exceeded. Please try again later.',
              requestId: 'req_123',
              timestamp: '2024-12-12T10:00:00.000Z'
            }
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'Gateway',
      description: 'API Gateway health and monitoring endpoints'
    },
    {
      name: 'Authentication',
      description: 'User authentication and authorization (proxied to User Service)'
    },
    {
      name: 'User Management',
      description: 'User profile and account management (proxied to User Service)'
    },
    {
      name: 'Admin',
      description: 'Administrative operations (proxied to User Service)'
    },
    {
      name: 'Data',
      description: 'Market data and analytics (proxied to Data Service)'
    },
    {
      name: 'AI',
      description: 'AI inference and context assembly (proxied to AI Services)'
    }
  ]
};

const options = {
  definition: swaggerDefinition,
  apis: [
    './src/index.ts',
    './src/swagger-docs.ts'
  ]
};

export const swaggerSpec = swaggerJSDoc(options);
export const swaggerUi = swaggerUiExpress;
