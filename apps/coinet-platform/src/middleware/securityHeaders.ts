/**
 * 🔒 Security Headers Middleware
 * 
 * Adds security headers to all responses to prevent common attacks.
 * Should be applied early in the middleware chain.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Security headers configuration.
 * Modify based on your security requirements.
 */
const SECURITY_HEADERS = {
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // XSS protection (legacy, but still useful for older browsers)
  'X-XSS-Protection': '1; mode=block',
  
  // Referrer policy - don't leak full URL to external sites
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions policy - disable dangerous features
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',
  
  // Content Security Policy - prevent XSS
  // Customize based on your frontend needs
  // Note: This is a restrictive policy - adjust for your app's requirements
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.coingecko.com https://api.github.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
};

/**
 * Apply security headers to all responses.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Apply all security headers
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(header, value);
  }
  
  // Remove potentially dangerous headers
  res.removeHeader('X-Powered-By');
  
  next();
}

/**
 * CORS configuration for production.
 * Import and use with the cors middleware.
 */
export const CORS_OPTIONS = {
  // Restrict to your frontend domain(s)
  origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173',
  ],
  
  // Allow credentials (cookies, authorization headers)
  credentials: true,
  
  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  
  // Allowed headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-ID',
    'X-Requested-With',
  ],
  
  // Expose these headers to the client
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'Retry-After',
  ],
  
  // Cache preflight requests for 24 hours
  maxAge: 86400,
};
