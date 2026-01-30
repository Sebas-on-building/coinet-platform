/**
 * COINET SECURITY HEADERS MIDDLEWARE
 * 
 * Implements security best practices for HTTP headers to protect
 * against common web vulnerabilities (XSS, clickjacking, etc.)
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Security headers middleware
 * Sets various HTTP headers to enhance security
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // =============================================================================
  // CONTENT SECURITY POLICY
  // =============================================================================
  
  // Define allowed sources for different resource types
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.coingecko.com https://api.coinglass.com https://api.birdeye.so https://api.dexscreener.com https://pro-api.coinmarketcap.com https://api.x.ai wss: https:",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');

  res.setHeader('Content-Security-Policy', cspDirectives);

  // =============================================================================
  // CROSS-ORIGIN HEADERS
  // =============================================================================
  
  // Prevent clickjacking attacks
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS filter in browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy (formerly Feature-Policy)
  res.setHeader('Permissions-Policy', [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()',
  ].join(', '));

  // =============================================================================
  // STRICT TRANSPORT SECURITY (HSTS)
  // =============================================================================
  
  // Only enable HSTS in production with HTTPS
  if (process.env.NODE_ENV === 'production') {
    // max-age: 1 year, includeSubDomains, preload
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // =============================================================================
  // CROSS-ORIGIN RESOURCE SHARING HEADERS (Additional)
  // =============================================================================
  
  // Cross-Origin-Opener-Policy
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  
  // Cross-Origin-Resource-Policy
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  // =============================================================================
  // CACHE CONTROL FOR API RESPONSES
  // =============================================================================
  
  // For API endpoints, set appropriate cache control
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }

  // =============================================================================
  // REMOVE POTENTIALLY SENSITIVE HEADERS
  // =============================================================================
  
  // Remove X-Powered-By header (Express default)
  res.removeHeader('X-Powered-By');

  next();
}

/**
 * CORS preflight handler for security headers
 * Used to handle OPTIONS requests properly
 */
export function handleCorsPreflightSecurity(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'OPTIONS') {
    // Set security headers even for preflight requests
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  }
  next();
}

/**
 * API-specific security headers
 * More restrictive headers for API endpoints
 */
export function apiSecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Ensure API responses are treated as JSON
  if (req.path.startsWith('/api/')) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  next();
}

/**
 * Rate limit headers helper
 * Sets standard rate limit headers
 */
export function setRateLimitHeaders(
  res: Response,
  limit: number,
  remaining: number,
  resetTime: number
): void {
  res.setHeader('X-RateLimit-Limit', limit.toString());
  res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining).toString());
  res.setHeader('X-RateLimit-Reset', resetTime.toString());
}

export default securityHeaders;
