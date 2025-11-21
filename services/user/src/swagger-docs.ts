/**
 * Coinet User Service - Swagger/OpenAPI Route Documentation
 */

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Service health check
 *     description: Returns comprehensive health information about the User Service
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *             example:
 *               status: "healthy"
 *               timestamp: "2024-12-12T10:00:00.000Z"
 *               version: "1.0.0-Production-Ready"
 *               uptime: 3600
 *               service: "user-service"
 *               mode: "database"
 *               environment: "production"
 *               features: ["authentication", "2fa", "profiles", "roles", "api-keys", "admin", "analytics"]
 *               database: "postgresql"
 *               testUsers:
 *                 admin: "admin@coinet.ai / admin123"
 *                 user: "user@coinet.ai / admin123"
 */

/**
 * @swagger
 * /ready:
 *   get:
 *     tags: [Health]
 *     summary: Service readiness probe
 *     description: Kubernetes readiness probe - checks database connectivity
 *     responses:
 *       200:
 *         description: Service is ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, enum: [ready, not_ready] }
 *                 timestamp: { type: string, format: date-time }
 *                 database: { type: string, enum: [healthy, unhealthy] }
 *                 mode: { type: string }
 */

/**
 * @swagger
 * /metrics:
 *   get:
 *     tags: [Health]
 *     summary: Service metrics
 *     description: Comprehensive service metrics for monitoring and analytics
 *     responses:
 *       200:
 *         description: Service metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalRequests: { type: number }
 *                 successfulRequests: { type: number }
 *                 failedRequests: { type: number }
 *                 registrations: { type: number }
 *                 logins: { type: number }
 *                 twoFactorSetups: { type: number }
 *                 apiKeysCreated: { type: number }
 *                 uptime: { type: number }
 *                 memory: { type: object }
 *                 users: { type: object }
 *                 sessions: { type: object }
 *                 apiKeys: { type: object }
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register new user
 *     description: Create a new user account with email verification
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
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user: { $ref: '#/components/schemas/User' }
 *                         token: { type: string }
 *                         expiresIn: { type: string }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: User login
 *     description: Authenticate user with email/password and optional 2FA code
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
 *               password:
 *                 type: string
 *                 minLength: 8
 *               twoFactorCode:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 description: 2FA code (required if 2FA is enabled)
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
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user: { $ref: '#/components/schemas/User' }
 *                         token: { type: string, description: 'JWT access token' }
 *                         expiresIn: { type: string, description: 'Token expiration time' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       423:
 *         description: Account locked
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ErrorResponse'
 *                 - type: object
 *                   properties:
 *                     lockedUntil: { type: string, format: date-time }
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: User logout
 *     description: Logout user and invalidate current session
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
 * /auth/2fa/setup:
 *   post:
 *     tags: [Two-Factor Auth]
 *     summary: Setup two-factor authentication
 *     description: Initialize 2FA setup and receive QR code for authenticator app
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
 *       400:
 *         description: 2FA already enabled
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /auth/2fa/verify:
 *   post:
 *     tags: [Two-Factor Auth]
 *     summary: Verify and enable 2FA
 *     description: Verify 2FA code and enable two-factor authentication
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 description: 6-digit code from authenticator app
 *           example:
 *             code: "123456"
 *     responses:
 *       200:
 *         description: 2FA enabled successfully
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
 *                         backupCodes: { type: array, items: { type: string } }
 *                         enabled: { type: boolean }
 *       400:
 *         description: Invalid verification code
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /users/me:
 *   get:
 *     tags: [User Profile]
 *     summary: Get current user profile
 *     description: Retrieve the authenticated user's complete profile information
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
 *                     data: { $ref: '#/components/schemas/User' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   put:
 *     tags: [User Profile]
 *     summary: Update user profile
 *     description: Update the authenticated user's profile information
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, description: "User's display name" }
 *               avatar: { type: string, format: uri, description: "Avatar image URL" }
 *               bio: { type: string, maxLength: 500, description: "User biography" }
 *               timezone: { type: string, description: "User's timezone" }
 *               language: { type: string, description: "Preferred language" }
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
 *   delete:
 *     tags: [User Profile]
 *     summary: Delete user account
 *     description: Permanently delete the user's account (requires confirmation)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password, confirmDelete]
 *             properties:
 *               password:
 *                 type: string
 *                 description: Current password for verification
 *               confirmDelete:
 *                 type: string
 *                 enum: ["DELETE_MY_ACCOUNT"]
 *                 description: Explicit confirmation phrase
 *           example:
 *             password: "currentPassword123"
 *             confirmDelete: "DELETE_MY_ACCOUNT"
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid password or missing confirmation
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /users/me/security:
 *   get:
 *     tags: [Security]
 *     summary: Get security information
 *     description: Retrieve security status and score for the authenticated user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Security information retrieved successfully
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
 *                         twoFactorEnabled: { type: boolean }
 *                         lastLogin: { type: string, format: date-time, nullable: true }
 *                         activeSessions: { type: number }
 *                         accountAge: { type: string, format: date-time }
 *                         securityScore: { type: number, minimum: 0, maximum: 100 }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /users/me/sessions:
 *   get:
 *     tags: [Security]
 *     summary: List active sessions
 *     description: Get all active sessions for the authenticated user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Session' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /users/me/sessions/{sessionId}:
 *   delete:
 *     tags: [Security]
 *     summary: Terminate session
 *     description: Terminate a specific session by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Session ID to terminate
 *     responses:
 *       200:
 *         description: Session terminated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /users/me/api-keys:
 *   get:
 *     tags: [API Keys]
 *     summary: List user's API keys
 *     description: Get all active API keys for the authenticated user
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
 *                       items: { $ref: '#/components/schemas/ApiKey' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *   post:
 *     tags: [API Keys]
 *     summary: Create new API key
 *     description: Generate a new API key with specified permissions and scopes
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
 *                 items: { type: string }
 *                 description: List of permissions for this key
 *                 default: ["read"]
 *               scopes:
 *                 type: array
 *                 items: { type: string }
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
 *                       allOf:
 *                         - $ref: '#/components/schemas/ApiKey'
 *                         - type: object
 *                           properties:
 *                             key: { type: string, description: "Full API key (only shown once)" }
 *       400:
 *         description: API key limit reached or validation error
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /users/me/api-keys/{keyId}:
 *   delete:
 *     tags: [API Keys]
 *     summary: Revoke API key
 *     description: Revoke an API key by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: API key ID to revoke
 *     responses:
 *       200:
 *         description: API key revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users
 *     description: Get paginated list of all users (admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Users per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by email or name
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
 *                       items: { $ref: '#/components/schemas/User' }
 *                     pagination: { $ref: '#/components/schemas/PaginationResponse' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */

/**
 * @swagger
 * /admin/audit-logs:
 *   get:
 *     tags: [Admin]
 *     summary: Get audit logs
 *     description: Retrieve system audit logs with filtering and pagination (admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by user ID
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
 *         description: Filter from date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter to date
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
 *                       items: { $ref: '#/components/schemas/AuditLog' }
 *                     pagination: { $ref: '#/components/schemas/PaginationResponse' }
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
