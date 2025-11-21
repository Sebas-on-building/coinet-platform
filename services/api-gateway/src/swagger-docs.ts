/**
 * Coinet API Gateway - Swagger/OpenAPI Route Documentation
 */

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Gateway]
 *     summary: Gateway health check
 *     description: Returns the health status of the API Gateway and all connected services
 *     responses:
 *       200:
 *         description: Gateway is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *             example:
 *               status: "healthy"
 *               timestamp: "2024-12-12T10:00:00.000Z"
 *               version: "1.0.0"
 *               uptime: 3600
 *               services:
 *                 user-service:
 *                   status: "healthy"
 *                   url: "http://user-service:8005"
 *                   responseTime: 45
 *                 auth-service:
 *                   status: "healthy"
 *                   url: "http://auth-service:8001"
 *                   responseTime: 32
 */

/**
 * @swagger
 * /ready:
 *   get:
 *     tags: [Gateway]
 *     summary: Gateway readiness probe
 *     description: Kubernetes readiness probe endpoint
 *     responses:
 *       200:
 *         description: Gateway is ready to serve traffic
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [ready, not_ready]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */

/**
 * @swagger
 * /metrics:
 *   get:
 *     tags: [Gateway]
 *     summary: Gateway metrics
 *     description: Prometheus-compatible metrics for monitoring
 *     responses:
 *       200:
 *         description: Gateway metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requests:
 *                   type: object
 *                   properties:
 *                     total: { type: number }
 *                     successful: { type: number }
 *                     failed: { type: number }
 *                 responseTime:
 *                   type: object
 *                   properties:
 *                     avg: { type: number }
 *                     p95: { type: number }
 *                     p99: { type: number }
 *                 services:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       requests: { type: number }
 *                       errors: { type: number }
 *                       avgResponseTime: { type: number }
 */

/**
 * @swagger
 * /api/v1/users/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: User login
 *     description: Authenticate user and receive JWT token (proxied to User Service)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             basic_login:
 *               summary: Basic login
 *               value:
 *                 email: "admin@coinet.ai"
 *                 password: "admin123"
 *             two_factor_login:
 *               summary: Login with 2FA
 *               value:
 *                 email: "admin@coinet.ai"
 *                 password: "admin123"
 *                 twoFactorCode: "123456"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */

/**
 * @swagger
 * /api/v1/users/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: User registration
 *     description: Register a new user account (proxied to User Service)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: User's password (minimum 8 characters)
 *               name:
 *                 type: string
 *                 description: User's display name
 *           example:
 *             email: "user@example.com"
 *             password: "securePassword123"
 *             name: "John Doe"
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/v1/users/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: User logout
 *     description: Logout user and invalidate session (proxied to User Service)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/users/me:
 *   get:
 *     tags: [User Management]
 *     summary: Get current user profile
 *     description: Retrieve the authenticated user's profile information (proxied to User Service)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *   put:
 *     tags: [User Management]
 *     summary: Update current user profile
 *     description: Update the authenticated user's profile information (proxied to User Service)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               avatar: { type: string, format: uri }
 *               bio: { type: string, maxLength: 500 }
 *               timezone: { type: string }
 *               language: { type: string }
 *           example:
 *             name: "John Doe"
 *             bio: "Cryptocurrency enthusiast and trader"
 *             timezone: "America/New_York"
 *             language: "en"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/users/me/api-keys:
 *   get:
 *     tags: [User Management]
 *     summary: List user's API keys
 *     description: Get all active API keys for the authenticated user (proxied to User Service)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: API keys retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           name: { type: string }
 *                           keyPreview: { type: string }
 *                           permissions: { type: array, items: { type: string } }
 *                           scopes: { type: array, items: { type: string } }
 *                           lastUsed: { type: string, format: date-time, nullable: true }
 *                           createdAt: { type: string, format: date-time }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *   post:
 *     tags: [User Management]
 *     summary: Create new API key
 *     description: Create a new API key with specified permissions (proxied to User Service)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 description: Human-readable name for the API key
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of permissions for this key
 *                 default: ["read"]
 *               scopes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: API scopes for this key
 *                 default: ["api:access"]
 *               expiresInDays:
 *                 type: number
 *                 description: Number of days until key expires (optional)
 *               rateLimit:
 *                 type: number
 *                 description: Requests per hour limit
 *                 default: 1000
 *           example:
 *             name: "Trading Bot API Key"
 *             permissions: ["read", "write", "trade"]
 *             scopes: ["api:access", "trading:execute"]
 *             expiresInDays: 90
 *             rateLimit: 5000
 *     responses:
 *       201:
 *         description: API key created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         id: { type: string }
 *                         name: { type: string }
 *                         key: { type: string, description: "Full API key (only shown once)" }
 *                         keyPreview: { type: string }
 *                         permissions: { type: array, items: { type: string } }
 *                         expiresAt: { type: string, format: date-time, nullable: true }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/users/auth/2fa/setup:
 *   post:
 *     tags: [Authentication]
 *     summary: Setup two-factor authentication
 *     description: Initialize 2FA setup and receive QR code (proxied to User Service)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA setup initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         secret: { type: string, description: "Base32 secret for manual entry" }
 *                         qrCode: { type: string, description: "QR code data URL" }
 *                         manualEntryKey: { type: string, description: "Manual entry key" }
 *                         backupCodes: { type: array, items: { type: string } }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users
 *     description: Get paginated list of all users (admin only, proxied to User Service)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Number of users per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search users by email or name
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page: { type: number }
 *                         limit: { type: number }
 *                         total: { type: number }
 *                         pages: { type: number }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */

/**
 * @swagger
 * /api/v1/admin/users/{id}/suspend:
 *   post:
 *     tags: [Admin]
 *     summary: Suspend user account
 *     description: Suspend a user account with reason and optional duration (admin only, proxied to User Service)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID to suspend
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for suspension
 *               duration:
 *                 type: number
 *                 description: Suspension duration in days (optional, permanent if not specified)
 *           example:
 *             reason: "Violation of terms of service"
 *             duration: 7
 *     responses:
 *       200:
 *         description: User suspended successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/v1/data/market/{symbol}:
 *   get:
 *     tags: [Data]
 *     summary: Get market data for symbol
 *     description: Retrieve real-time market data for a cryptocurrency symbol (proxied to Data Service)
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Cryptocurrency symbol (e.g., BTC, ETH)
 *         example: BTC
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [1m, 5m, 15m, 1h, 4h, 1d]
 *           default: 1h
 *         description: Data interval
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *           maximum: 1000
 *         description: Number of data points to return
 *     responses:
 *       200:
 *         description: Market data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */

/**
 * @swagger
 * /api/v1/ai/inference:
 *   post:
 *     tags: [AI]
 *     summary: AI inference request
 *     description: Submit data for AI analysis and predictions (proxied to Inference Service)
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, data]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [price_prediction, sentiment_analysis, risk_assessment]
 *                 description: Type of AI analysis to perform
 *               data:
 *                 type: object
 *                 description: Input data for analysis
 *               parameters:
 *                 type: object
 *                 description: Optional parameters for the analysis
 *           example:
 *             type: "price_prediction"
 *             data:
 *               symbol: "BTC"
 *               timeframe: "24h"
 *               historical_data: []
 *             parameters:
 *               confidence_threshold: 0.8
 *     responses:
 *       200:
 *         description: AI analysis completed
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         prediction: { type: object }
 *                         confidence: { type: number }
 *                         metadata: { type: object }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */

/**
 * @swagger
 * /api/v1/admin/audit-logs:
 *   get:
 *     tags: [Admin]
 *     summary: Get audit logs
 *     description: Retrieve system audit logs with filtering (admin only, proxied to User Service)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Number of logs per page
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific user ID
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs until this date
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           userId: { type: string, nullable: true }
 *                           action: { type: string }
 *                           resource: { type: string, nullable: true }
 *                           details: { type: string }
 *                           ipAddress: { type: string, nullable: true }
 *                           signature: { type: string }
 *                           createdAt: { type: string, format: date-time }
 *                           user: 
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               email: { type: string }
 *                               name: { type: string }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
