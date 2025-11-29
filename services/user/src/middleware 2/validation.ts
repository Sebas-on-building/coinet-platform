/**
 * Validation Middleware - Industry-Leading Input Validation
 * Comprehensive validation with security checks and sanitization
 */

import { Request, Response, NextFunction } from 'express';
import { body, validationResult, param, query } from 'express-validator';
import { createLogger } from 'winston';

const logger = createLogger({
  level: 'info',
  defaultMeta: { service: 'validation-middleware' }
});

/**
 * Handle validation errors
 */
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.type === 'field' ? (error as any).path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? (error as any).value : undefined
    }));

    logger.warn('Validation failed', {
      requestId: (req as any).id,
      errors: errorDetails,
      path: req.path
    });

    res.status(400).json({
      error: 'Validation failed',
      message: 'Please check your input and try again',
      details: errorDetails,
      requestId: (req as any).id
    });
    return;
  }
  
  next();
};

export const validationMiddleware = {
  /**
   * User registration validation
   */
  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
    
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters')
      .matches(/^[a-zA-Z\s\-'\.]+$/)
      .withMessage('Name can only contain letters, spaces, hyphens, apostrophes, and periods'),
    
    body('referralCode')
      .optional()
      .isAlphanumeric()
      .isLength({ min: 6, max: 20 })
      .withMessage('Referral code must be 6-20 alphanumeric characters'),
    
    handleValidationErrors
  ],

  /**
   * User login validation
   */
  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    
    body('twoFactorCode')
      .optional()
      .isNumeric()
      .isLength({ min: 6, max: 6 })
      .withMessage('Two-factor code must be 6 digits'),
    
    body('deviceInfo')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Device info is too long'),
    
    handleValidationErrors
  ],

  /**
   * Email validation
   */
  email: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    
    handleValidationErrors
  ],

  /**
   * Password reset validation
   */
  resetPassword: [
    body('token')
      .isUUID()
      .withMessage('Invalid reset token format'),
    
    body('newPassword')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
    
    handleValidationErrors
  ],

  /**
   * Profile update validation
   */
  updateProfile: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters')
      .matches(/^[a-zA-Z\s\-'\.]+$/)
      .withMessage('Name can only contain letters, spaces, hyphens, apostrophes, and periods'),
    
    body('avatar')
      .optional()
      .isURL()
      .withMessage('Avatar must be a valid URL'),
    
    body('bio')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Bio must be less than 500 characters'),
    
    body('timezone')
      .optional()
      .isString()
      .isLength({ max: 50 })
      .withMessage('Invalid timezone'),
    
    body('language')
      .optional()
      .isIn(['en', 'es', 'fr', 'de', 'ja', 'ko', 'zh'])
      .withMessage('Unsupported language'),
    
    handleValidationErrors
  ],

  /**
   * Role update validation (admin only)
   */
  updateRole: [
    body('role')
      .optional()
      .isIn(['user', 'premium', 'admin', 'moderator'])
      .withMessage('Invalid role'),
    
    body('tier')
      .optional()
      .isIn(['free', 'premium', 'enterprise'])
      .withMessage('Invalid tier'),
    
    handleValidationErrors
  ],

  /**
   * Two-factor authentication validation
   */
  verify2FA: [
    body('code')
      .isNumeric()
      .isLength({ min: 6, max: 6 })
      .withMessage('Two-factor code must be 6 digits'),
    
    handleValidationErrors
  ],

  /**
   * Change password validation
   */
  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    
    body('newPassword')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character')
      .custom((value, { req }) => {
        if (value === req.body.currentPassword) {
          throw new Error('New password must be different from current password');
        }
        return true;
      }),
    
    handleValidationErrors
  ],

  /**
   * Preferences validation
   */
  preferences: [
    body('theme')
      .optional()
      .isIn(['light', 'dark', 'auto'])
      .withMessage('Theme must be light, dark, or auto'),
    
    body('language')
      .optional()
      .isIn(['en', 'es', 'fr', 'de', 'ja', 'ko', 'zh'])
      .withMessage('Unsupported language'),
    
    body('timezone')
      .optional()
      .isString()
      .isLength({ max: 50 })
      .withMessage('Invalid timezone'),
    
    body('currency')
      .optional()
      .isIn(['USD', 'EUR', 'GBP', 'JPY', 'BTC', 'ETH'])
      .withMessage('Unsupported currency'),
    
    body('dateFormat')
      .optional()
      .isIn(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'])
      .withMessage('Invalid date format'),
    
    body('timeFormat')
      .optional()
      .isIn(['12h', '24h'])
      .withMessage('Time format must be 12h or 24h'),
    
    body('notifications')
      .optional()
      .isObject()
      .withMessage('Notifications must be an object'),
    
    body('trading')
      .optional()
      .isObject()
      .withMessage('Trading preferences must be an object'),
    
    body('dashboard')
      .optional()
      .isObject()
      .withMessage('Dashboard preferences must be an object'),
    
    handleValidationErrors
  ],

  /**
   * Settings validation
   */
  settings: [
    body('privacy')
      .optional()
      .isObject()
      .withMessage('Privacy settings must be an object'),
    
    body('security')
      .optional()
      .isObject()
      .withMessage('Security settings must be an object'),
    
    body('api')
      .optional()
      .isObject()
      .withMessage('API settings must be an object'),
    
    body('advanced')
      .optional()
      .isObject()
      .withMessage('Advanced settings must be an object'),
    
    handleValidationErrors
  ],

  /**
   * Notification preferences validation
   */
  notifications: [
    body('email.enabled')
      .optional()
      .isBoolean()
      .withMessage('Email enabled must be boolean'),
    
    body('push.enabled')
      .optional()
      .isBoolean()
      .withMessage('Push enabled must be boolean'),
    
    body('sms.enabled')
      .optional()
      .isBoolean()
      .withMessage('SMS enabled must be boolean'),
    
    handleValidationErrors
  ],

  /**
   * API key creation validation
   */
  createApiKey: [
    body('name')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('API key name must be between 3 and 50 characters')
      .matches(/^[a-zA-Z0-9\s\-_]+$/)
      .withMessage('API key name can only contain letters, numbers, spaces, hyphens, and underscores'),
    
    body('permissions')
      .optional()
      .isArray()
      .withMessage('Permissions must be an array')
      .custom((value) => {
        const validPermissions = ['read', 'write', 'admin', 'trade'];
        if (value.some((perm: string) => !validPermissions.includes(perm))) {
          throw new Error('Invalid permission. Valid permissions: read, write, admin, trade');
        }
        return true;
      }),
    
    body('expiresInDays')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Expiration must be between 1 and 365 days'),
    
    handleValidationErrors
  ]
};

/**
 * Sanitization middleware
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Remove potentially dangerous characters from string inputs
  const sanitizeString = (str: any): string => {
    if (typeof str !== 'string') return str;
    
    return str
      .replace(/[<>]/g, '') // Remove HTML brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  };

  // Recursively sanitize object properties
  const sanitizeObject = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    
    return typeof obj === 'string' ? sanitizeString(obj) : obj;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

export default validationMiddleware;
