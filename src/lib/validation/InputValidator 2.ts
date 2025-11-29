import { z } from 'zod';

export class InputValidator {
  // Email validation
  static readonly emailSchema = z.string()
    .email('Invalid email format')
    .max(254, 'Email too long')
    .transform(email => email.toLowerCase().trim());

  // Password validation
  static readonly passwordSchema = z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number, and special character');

  // Cryptocurrency symbol validation
  static readonly symbolSchema = z.string()
    .regex(/^[A-Z]{2,10}$/, 'Invalid symbol format')
    .transform(symbol => symbol.toUpperCase());

  // Amount validation (for trades)
  static readonly amountSchema = z.number()
    .positive('Amount must be positive')
    .max(1000000000, 'Amount too large')
    .refine(val => Number.isFinite(val), 'Amount must be finite');

  // User ID validation
  static readonly userIdSchema = z.string()
    .uuid('Invalid user ID format');

  // API key validation
  static readonly apiKeySchema = z.string()
    .min(32, 'API key too short')
    .max(128, 'API key too long')
    .regex(/^[A-Za-z0-9_-]+$/, 'Invalid API key format');

  // HTML content sanitization (server-side safe)
  static sanitizeHTML(content: string): string {
    if (typeof content !== 'string') {
      return '';
    }

    // Remove all HTML tags and potential XSS vectors
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // Remove object tags
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '') // Remove embed tags
      .replace(/javascript:/gi, '') // Remove javascript: urls
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/<[^>]*>/g, '') // Remove all remaining HTML tags
      .trim();
  }

  // For client-side with DOMPurify (when available)
  static sanitizeHTMLClient(content: string): string {
    if (typeof window === 'undefined') {
      // Server-side fallback
      return this.sanitizeHTML(content);
    }

    // Check if DOMPurify is available
    if (typeof (window as any).DOMPurify !== 'undefined') {
      return (window as any).DOMPurify.sanitize(content, {
        ALLOWED_TAGS: ['p', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'br'],
        ALLOWED_ATTR: ['href'],
        FORBID_SCRIPTS: true,
        FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input']
      });
    }

    // Fallback to server-side sanitization
    return this.sanitizeHTML(content);
  }

  // SQL injection prevention
  static sanitizeSQL(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Remove potentially dangerous SQL characters
    return input
      .replace(/[';\\]/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '')
      .replace(/xp_/gi, '')
      .replace(/sp_/gi, '')
      .trim();
  }

  // General string sanitization
  static sanitizeString(input: string, maxLength: number = 255): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .replace(/[<>\"']/g, '') // Remove potential XSS characters
      .slice(0, maxLength)
      .trim();
  }

  // Validate file upload
  static validateFile(file: { name: string; size: number; type: string }): {
    isValid: boolean;
    error?: string;
  } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/csv',
      'application/json'
    ];

    if (file.size > maxSize) {
      return { isValid: false, error: 'File size exceeds 10MB limit' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'File type not allowed' };
    }

    // Check for dangerous file extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.js', '.vbs'];
    const hasExtension = dangerousExtensions.some(ext =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (hasExtension) {
      return { isValid: false, error: 'Dangerous file extension detected' };
    }

    return { isValid: true };
  }

  // Validate URL
  static validateURL(url: string): boolean {
    try {
      const urlObj = new URL(url);

      // Only allow HTTP and HTTPS
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }

      // Block localhost and private IP ranges in production
      if (process.env.NODE_ENV === 'production') {
        const hostname = urlObj.hostname;
        if (
          hostname === 'localhost' ||
          hostname.startsWith('127.') ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
        ) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  // Rate limiting validation
  static validateRateLimit(
    identifier: string,
    limit: number,
    windowMs: number,
    storage: Map<string, { count: number; resetTime: number }> = new Map()
  ): { allowed: boolean; resetTime: number } {
    const now = Date.now();
    const key = identifier;
    const entry = storage.get(key);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      const resetTime = now + windowMs;
      storage.set(key, { count: 1, resetTime });
      return { allowed: true, resetTime };
    }

    if (entry.count >= limit) {
      // Rate limit exceeded
      return { allowed: false, resetTime: entry.resetTime };
    }

    // Increment counter
    entry.count++;
    storage.set(key, entry);
    return { allowed: true, resetTime: entry.resetTime };
  }

  // Validate cryptocurrency address
  static validateCryptoAddress(address: string, type: 'bitcoin' | 'ethereum'): boolean {
    if (typeof address !== 'string') {
      return false;
    }

    switch (type) {
      case 'bitcoin':
        // Bitcoin address validation (simplified)
        return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/.test(address);

      case 'ethereum':
        // Ethereum address validation
        return /^0x[a-fA-F0-9]{40}$/.test(address);

      default:
        return false;
    }
  }

  // Validate trading parameters
  static validateTradeParams(params: {
    symbol: string;
    amount: number;
    price?: number;
    side: 'buy' | 'sell';
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      this.symbolSchema.parse(params.symbol);
    } catch {
      errors.push('Invalid symbol format');
    }

    try {
      this.amountSchema.parse(params.amount);
    } catch {
      errors.push('Invalid amount');
    }

    if (params.price !== undefined && (params.price <= 0 || !Number.isFinite(params.price))) {
      errors.push('Invalid price');
    }

    if (!['buy', 'sell'].includes(params.side)) {
      errors.push('Invalid trade side');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 