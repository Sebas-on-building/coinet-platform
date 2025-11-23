import Handlebars from 'handlebars';
import * as i18next from 'i18next';
import { SmsTemplate, SmsTemplateVariable } from '@/types';
import { Logger } from '@/utils/Logger';

export interface SmsRenderOptions {
  locale?: string;
  timezone?: string;
  maxLength?: number;
  fallbackLocale?: string;
}

export interface SmsRenderResult {
  body: string;
  segments?: number;
  estimatedCost?: number;
  warnings?: string[];
  errors?: string[];
}

export class SmsTemplateEngine {
  private static instance: SmsTemplateEngine;
  private logger: Logger;
  private templates: Map<string, SmsTemplate> = new Map();
  private i18n!: i18next.i18n; // Use definite assignment assertion

  private constructor() {
    this.logger = Logger.getInstance();
    this.i18n = i18next.createInstance(); // Initialize i18n here
    this.setupI18n();
  }

  static getInstance(): SmsTemplateEngine {
    if (!SmsTemplateEngine.instance) {
      SmsTemplateEngine.instance = new SmsTemplateEngine();
    }
    return SmsTemplateEngine.instance;
  }

  private async setupI18n(): Promise<void> {
    this.i18n = i18next.createInstance();

    await this.i18n.init({
      lng: 'en',
      fallbackLng: 'en',
      ns: 'sms',
      defaultNS: 'sms',
      resources: {
        en: {
          sms: {
            // Default English SMS translations
            greeting: 'Hi',
            goodbye: 'Thanks',
            urgent: 'URGENT',
            verification: 'Your verification code is',
            confirmation: 'Confirmed',
            notification: 'Notification',
            alert: 'Alert',
            update: 'Update',
            reminder: 'Reminder',
          }
        },
        es: {
          sms: {
            greeting: 'Hola',
            goodbye: 'Gracias',
            urgent: 'URGENTE',
            verification: 'Tu código de verificación es',
            confirmation: 'Confirmado',
            notification: 'Notificación',
            alert: 'Alerta',
            update: 'Actualización',
            reminder: 'Recordatorio',
          }
        },
        fr: {
          sms: {
            greeting: 'Bonjour',
            goodbye: 'Merci',
            urgent: 'URGENT',
            verification: 'Votre code de vérification est',
            confirmation: 'Confirmé',
            notification: 'Notification',
            alert: 'Alerte',
            update: 'Mise à jour',
            reminder: 'Rappel',
          }
        }
      },
      interpolation: {
        prefix: '{{',
        suffix: '}}'
      }
    });

    // Register Handlebars helpers
    this.registerHelpers();
  }

  /**
   * Register a SMS template with the engine
   */
  registerTemplate(template: SmsTemplate): void {
    this.templates.set(template.id, template);
    this.logger.info(`Registered SMS template: ${template.name} (${template.id})`);
  }

  /**
   * Unregister a SMS template
   */
  unregisterTemplate(templateId: string): boolean {
    const deleted = this.templates.delete(templateId);
    if (deleted) {
      this.logger.info(`Unregistered SMS template: ${templateId}`);
    }
    return deleted;
  }

  /**
   * Get a SMS template by ID
   */
  getTemplate(templateId: string): SmsTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get all registered SMS templates
   */
  getAllTemplates(): SmsTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Render a SMS template with provided data
   */
  async renderTemplate(
    templateId: string,
    data: Record<string, any>,
    options: SmsRenderOptions = {}
  ): Promise<SmsRenderResult> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`SMS template not found: ${templateId}`);
    }

    const locale = options.locale || 'en';
    const maxLength = options.maxLength || template.maxLength || 160;

    try {
      // Set locale for i18n
      await this.i18n.changeLanguage(locale);

      // Prepare template data with i18n helpers
      const templateData = {
        ...data,
        t: (key: string, options?: any) => this.i18n.t(key, options),
        locale,
        format: (date: Date | string, format: string) => {
          const dateObj = typeof date === 'string' ? new Date(date) : date;
          return this.formatDate(dateObj, format, options.timezone);
        },
        currency: (amount: number, currency: string = 'USD') => {
          return this.formatCurrency(amount, currency, locale);
        },
        number: (num: number, decimals: number = 2) => {
          return this.formatNumber(num, decimals, locale);
        },
        // SMS-specific helpers
        truncate: (text: string, length: number) => this.truncateText(text, length),
        estimateSegments: (text: string) => this.estimateMessageSegments(text),
        isPromotional: (text: string) => this.isPromotionalContent(text),
      };

      // Render template body
      const bodyTemplate = Handlebars.compile(template.body);
      let renderedBody = bodyTemplate(templateData);

      const result: SmsRenderResult = {
        body: renderedBody,
        warnings: [],
        errors: [],
      };

      // Validate message length
      if (renderedBody.length > maxLength) {
        result.warnings?.push(`Message exceeds ${maxLength} characters and may be split into multiple segments`);
        result.segments = this.estimateMessageSegments(renderedBody);
      }

      // Check for promotional content in transactional templates
      if (this.isPromotionalContent(renderedBody) && template.category !== 'promotional') {
        result.warnings?.push('Message contains promotional content but template is not marked as promotional');
      }

      // Estimate cost
      result.estimatedCost = this.estimateCost(renderedBody);

      this.logger.info(`SMS template rendered successfully: ${templateId}`, {
        locale,
        bodyLength: renderedBody.length,
        segments: result.segments,
        estimatedCost: result.estimatedCost,
      });

      return result;

    } catch (error) {
      this.logger.error(`SMS template rendering failed for ${templateId}`, { error, data, options });
      throw new Error(`SMS template rendering failed: ${error}`);
    }
  }

  /**
   * Validate template data against template variables
   */
  validateTemplateData(templateId: string, data: Record<string, any>): { valid: boolean; errors: string[] } {
    const template = this.templates.get(templateId);
    if (!template) {
      return { valid: false, errors: [`SMS template not found: ${templateId}`] };
    }

    const errors: string[] = [];

    for (const variable of template.variables) {
      if (variable.required && !(variable.name in data)) {
        errors.push(`Missing required variable: ${variable.name}`);
        continue;
      }

      if (variable.name in data) {
        const value = data[variable.name];
        const validationErrors = this.validateVariableValue(variable, value);
        errors.push(...validationErrors);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Add localization resources
   */
  async addLocalization(locale: string, resources: Record<string, Record<string, string>>): Promise<void> {
    this.i18n.addResourceBundle(locale, 'sms', resources, true, true);
    this.logger.info(`Added SMS localization resources for locale: ${locale}`);
  }

  /**
   * Get available locales
   */
  getAvailableLocales(): string[] {
    return this.i18n.languages.slice(); // Return a copy of the array
  }

  /**
   * Create a SMS template from content
   */
  createTemplateFromContent(
    name: string,
    body: string,
    variables: string[] | SmsTemplateVariable[] = [],
    locale: string = 'en',
    category: string = 'general',
    maxLength?: number
  ): SmsTemplate {
    const templateVariables: SmsTemplateVariable[] = variables.map(v =>
      typeof v === 'string'
        ? { name: v, type: 'string', required: true, description: `Variable ${v}` }
        : v
    );

    return {
      id: `sms-template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      body,
      variables: templateVariables,
      locale,
      category,
      version: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      maxLength: maxLength || 160,
      tags: []
    };
  }

  private validateVariableValue(variable: SmsTemplateVariable, value: any): string[] {
    const errors: string[] = [];

    if (value === null || value === undefined) {
      return errors; // Already checked for required above
    }

    switch (variable.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${variable.name} must be a string`);
        } else {
          if (variable.validation?.min && value.length < variable.validation.min) {
            errors.push(`${variable.name} must be at least ${variable.validation.min} characters`);
          }
          if (variable.validation?.max && value.length > variable.validation.max) {
            errors.push(`${variable.name} must be at most ${variable.validation.max} characters`);
          }
          if (variable.validation?.pattern && !new RegExp(variable.validation.pattern).test(value)) {
            errors.push(`${variable.name} format is invalid`);
          }
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`${variable.name} must be a number`);
        } else {
          if (variable.validation?.min !== undefined && value < variable.validation.min) {
            errors.push(`${variable.name} must be at least ${variable.validation.min}`);
          }
          if (variable.validation?.max !== undefined && value > variable.validation.max) {
            errors.push(`${variable.name} must be at most ${variable.validation.max}`);
          }
        }
        break;

      case 'date':
        if (!(value instanceof Date) && isNaN(Date.parse(value))) {
          errors.push(`${variable.name} must be a valid date`);
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`${variable.name} must be a boolean`);
        }
        break;
    }

    if (variable.validation?.enum && !variable.validation.enum.includes(value)) {
      errors.push(`${variable.name} must be one of: ${variable.validation.enum.join(', ')}`);
    }

    return errors;
  }

  private formatDate(date: Date, format: string, timezone?: string): string {
    // Simple date formatting for SMS - can be enhanced with a proper date library
    const options: Intl.DateTimeFormatOptions = {};

    switch (format) {
      case 'short':
        options.year = 'numeric';
        options.month = 'short';
        options.day = 'numeric';
        break;
      case 'long':
        options.year = 'numeric';
        options.month = 'long';
        options.day = 'numeric';
        break;
      case 'time':
        options.hour = '2-digit';
        options.minute = '2-digit';
        break;
      case 'datetime':
        options.year = 'numeric';
        options.month = 'short';
        options.day = 'numeric';
        options.hour = '2-digit';
        options.minute = '2-digit';
        break;
      default:
        return date.toLocaleDateString();
    }

    return date.toLocaleDateString(undefined, options);
  }

  private formatCurrency(amount: number, currency: string, locale: string): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  private formatNumber(num: number, decimals: number, locale: string): string {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  }

  private truncateText(text: string, length: number): string {
    if (text.length <= length) {
      return text;
    }

    // Try to truncate at word boundary
    const truncated = text.substring(0, length - 3);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > length * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
  }

  private estimateMessageSegments(message: string): number {
    // SMS segmentation: 160 chars for single message, 153 for multi-part
    const singleMessageLength = 160;
    const multiMessageLength = 153;

    if (message.length <= singleMessageLength) {
      return 1;
    }

    return Math.ceil(message.length / multiMessageLength);
  }

  private estimateCost(message: string): number {
    const segments = this.estimateMessageSegments(message);

    // Average SMS cost per segment across providers
    return segments * 0.007; // ~$0.007 per segment
  }

  private isPromotionalContent(message: string): boolean {
    const promotionalKeywords = [
      'sale', 'discount', 'offer', 'promo', 'coupon', 'free', 'win', 'prize',
      'congratulations', 'special offer', 'limited time', 'exclusive', 'deal',
      'save', 'off', 'reduced', 'clearance', 'promotion', 'buy now', 'order now'
    ];

    const lowerMessage = message.toLowerCase();
    return promotionalKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Register Handlebars helpers for SMS
   */
  private registerHelpers(): void {
    // Helper for conditional content
    Handlebars.registerHelper('if_eq', function(this: any, a: any, b: any, options: any) {
      if (a === b) {
        return options.fn(this);
      }
      return options.inverse(this);
    });

    // Helper for SMS-specific formatting
    Handlebars.registerHelper('sms_format', function(this: any, text: string, options: any) {
      const maxLength = options.hash.maxLength || 160;
      return new Handlebars.SafeString(this.truncate ? this.truncate(text, maxLength) : text);
    });

    // Helper for date formatting in SMS context
    Handlebars.registerHelper('sms_date', function(this: any, date: any, format: string) {
      return new Handlebars.SafeString(this.format ? this.format(date, format) : date);
    });

    // Helper for currency formatting in SMS context
    Handlebars.registerHelper('sms_currency', function(this: any, amount: number, currency?: string) {
      return new Handlebars.SafeString(this.currency ? this.currency(amount, currency) : amount);
    });

    // Helper for number formatting in SMS context
    Handlebars.registerHelper('sms_number', function(this: any, num: number, decimals?: number) {
      return new Handlebars.SafeString(this.number ? this.number(num, decimals) : num);
    });

    // Helper for checking if content is promotional
    Handlebars.registerHelper('is_promotional', function(this: any, text: string, options: any) {
      const isPromo = this.isPromotional ? this.isPromotional(text) : false;
      return isPromo ? options.fn(this) : options.inverse(this);
    });
  }
}
