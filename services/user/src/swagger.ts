/**
 * Coinet User Service - Swagger/OpenAPI Documentation Configuration
 */

import swaggerJSDoc from 'swagger-jsdoc';
import * as swaggerUiExpress from 'swagger-ui-express';

/**
 * Get server URL based on environment
 * Priority: SWAGGER_SERVER_URL > RAILWAY_PUBLIC_DOMAIN > API_URL > localhost
 */
function getServerUrl(): string {
  // Check for explicit Swagger server URL
  if (process.env.SWAGGER_SERVER_URL) {
    return process.env.SWAGGER_SERVER_URL.startsWith('http') 
      ? process.env.SWAGGER_SERVER_URL 
      : `https://${process.env.SWAGGER_SERVER_URL}`;
  }
  
  // Check for Railway public domain
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  
  // Check for API URL
  if (process.env.API_URL) {
    return process.env.API_URL.startsWith('http') 
      ? process.env.API_URL 
      : `https://${process.env.API_URL}`;
  }
  
  // Default to localhost for development
  return 'http://localhost:8005';
}

/**
 * Build servers array for Swagger
 */
function getServers() {
  const servers = [];
  const serverUrl = getServerUrl();
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Add primary server
  servers.push({
    url: serverUrl,
    description: isProduction ? 'Production Server' : 'Development Server'
  });
  
  // Add localhost server for development
  if (!isProduction && !serverUrl.includes('localhost')) {
    servers.push({
      url: 'http://localhost:8005',
      description: 'Local Development Server'
    });
  }
  
  return servers;
}

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Coinet User Service',
    version: '1.0.0',
    description: `
# Coinet User Service API

The **Coinet User Service** is the comprehensive user management system for the Coinet AI platform, providing:

- **🔐 Advanced Authentication**: JWT-based auth with 2FA support
- **👤 User Management**: Complete profile and account management
- **🔑 API Key Management**: Secure API key generation and management
- **📊 Session Management**: Device tracking and session control
- **🛡️ Security Features**: Account locking, audit logging, password reset
- **👑 Admin Operations**: Complete user administration and analytics
- **🎯 Enterprise Features**: RBAC, compliance, and audit trails

## Authentication

Most endpoints require a valid JWT token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Test Accounts

For development and testing:

- **Admin**: admin@coinet.ai / admin123
- **User**: user@coinet.ai / admin123

## Features

### 🔐 **Authentication & Security**
- JWT-based authentication with refresh tokens
- Two-factor authentication (TOTP) with QR codes
- Password reset and email verification
- Account locking after failed attempts
- Session management with device tracking

### 👤 **User Management**
- User registration and profile management
- Role-based access control (RBAC)
- User tiers (FREE, PREMIUM, ENTERPRISE, VIP)
- Account deletion with GDPR compliance

### 🔑 **API Key Management**
- Secure API key generation and storage
- Granular permissions and scopes
- Rate limiting per key
- Usage tracking and analytics

### 👑 **Admin Operations**
- Complete user management suite
- User suspension and restoration
- Comprehensive audit log access
- Advanced user analytics and insights

### 📊 **Monitoring & Analytics**
- Real-time health and readiness checks
- Comprehensive service metrics
- Request tracking with unique IDs
- Performance monitoring

## Rate Limiting

- **Default**: 1000 requests per 15 minutes per IP
- **Authenticated Users**: Higher limits based on tier
- **API Keys**: Custom rate limits per key

## Error Handling

All errors follow a consistent format with request tracking:

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
  servers: getServers(),
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from login endpoint'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Unique user identifier' },
          email: { type: 'string', format: 'email', description: 'User email address' },
          name: { type: 'string', description: 'User display name' },
          role: { 
            type: 'string', 
            enum: ['ADMIN', 'MODERATOR', 'USER', 'AUTHOR', 'DEVELOPER', 'ANALYST'],
            description: 'User role for access control'
          },
          tier: { 
            type: 'string', 
            enum: ['FREE', 'PREMIUM', 'ENTERPRISE', 'VIP'],
            description: 'User subscription tier'
          },
          active: { type: 'boolean', description: 'Whether the account is active' },
          isVerified: { type: 'boolean', description: 'Whether email is verified' },
          isTwoFactorEnabled: { type: 'boolean', description: 'Whether 2FA is enabled' },
          createdAt: { type: 'string', format: 'date-time' },
          lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
          avatar: { type: 'string', format: 'uri', nullable: true },
          bio: { type: 'string', nullable: true },
          timezone: { type: 'string', default: 'UTC' },
          language: { type: 'string', default: 'en' }
        }
      },
      Session: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          deviceInfo: { type: 'string', nullable: true },
          ipAddress: { type: 'string', nullable: true },
          userAgent: { type: 'string', nullable: true },
          lastActivity: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          isCurrent: { type: 'boolean' }
        }
      },
      ApiKey: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          keyPreview: { type: 'string', description: 'Masked preview of the key' },
          permissions: { type: 'array', items: { type: 'string' } },
          scopes: { type: 'array', items: { type: 'string' } },
          rateLimit: { type: 'number', description: 'Requests per hour limit' },
          lastUsed: { type: 'string', format: 'date-time', nullable: true },
          usageCount: { type: 'number' },
          expiresAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      AuditLog: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid', nullable: true },
          action: { type: 'string', description: 'Action performed' },
          resource: { type: 'string', nullable: true, description: 'Resource affected' },
          resourceId: { type: 'string', nullable: true },
          details: { type: 'string', description: 'Detailed description of the action' },
          ipAddress: { type: 'string', nullable: true },
          userAgent: { type: 'string', nullable: true },
          signature: { type: 'string', description: 'Cryptographic signature for tamper-proofing' },
          severity: { type: 'string', enum: ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'] },
          createdAt: { type: 'string', format: 'date-time' },
          user: {
            type: 'object',
            nullable: true,
            properties: {
              email: { type: 'string' },
              name: { type: 'string' }
            }
          }
        }
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['healthy', 'unhealthy'] },
          timestamp: { type: 'string', format: 'date-time' },
          version: { type: 'string' },
          uptime: { type: 'number', description: 'Service uptime in seconds' },
          service: { type: 'string' },
          mode: { type: 'string', enum: ['database', 'standalone'] },
          environment: { type: 'string' },
          features: { type: 'array', items: { type: 'string' } },
          metrics: {
            type: 'object',
            properties: {
              totalRequests: { type: 'number' },
              successfulRequests: { type: 'number' },
              failedRequests: { type: 'number' },
              registrations: { type: 'number' },
              logins: { type: 'number' },
              twoFactorSetups: { type: 'number' },
              apiKeysCreated: { type: 'number' }
            }
          },
          database: { type: 'string' },
          dependencies: { type: 'object' },
          testUsers: { type: 'object' }
        }
      },
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object' },
          message: { type: 'string' },
          requestId: { type: 'string', format: 'uuid' }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          requestId: { type: 'string', format: 'uuid' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      PaginationResponse: {
        type: 'object',
        properties: {
          page: { type: 'number' },
          limit: { type: 'number' },
          total: { type: 'number' },
          pages: { type: 'number' }
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
              message: 'User not found',
              requestId: 'req_123',
              timestamp: '2024-12-12T10:00:00.000Z'
            }
          }
        }
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              error: 'Validation Error',
              message: 'Email and password are required',
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
      name: 'Health',
      description: 'Service health and monitoring endpoints'
    },
    {
      name: 'Authentication',
      description: 'User authentication and authorization'
    },
    {
      name: 'Two-Factor Auth',
      description: 'Two-factor authentication management'
    },
    {
      name: 'User Profile',
      description: 'User profile and account management'
    },
    {
      name: 'Security',
      description: 'Security settings and session management'
    },
    {
      name: 'API Keys',
      description: 'API key management and authentication'
    },
    {
      name: 'Admin',
      description: 'Administrative operations (admin only)'
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
