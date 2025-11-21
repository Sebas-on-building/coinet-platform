import Handlebars from 'handlebars';
import * as i18next from 'i18next';
import { EmailTemplate, TemplateVariable } from '@/types';
import { Logger } from '@/utils/Logger';

export interface TemplateRenderOptions {
  locale?: string;
  timezone?: string;
  format?: 'html' | 'text' | 'both';
  fallbackLocale?: string;
}

export interface TemplateRenderResult {
  subject?: string;
  html?: string;
  text?: string;
  errors?: string[];
}

export class TemplateEngine {
  private static instance: TemplateEngine;
  private logger: Logger;
  private templates: Map<string, EmailTemplate> = new Map();
  private i18n!: i18next.i18n; // Use definite assignment assertion

  private constructor() {
    this.logger = Logger.getInstance();
    this.i18n = i18next.createInstance();
    this.setupI18n();
  }

  static getInstance(): TemplateEngine {
    if (!TemplateEngine.instance) {
      TemplateEngine.instance = new TemplateEngine();
    }
    return TemplateEngine.instance;
  }

  private async setupI18n(): Promise<void> {
    this.i18n = i18next.createInstance();

    await this.i18n.init({
      lng: 'en',
      fallbackLng: 'en',
      ns: 'email',
      defaultNS: 'email',
      resources: {
        en: {
          email: {
            // Default English translations - can be extended
            greeting: 'Hello',
            goodbye: 'Best regards',
            unsubscribe: 'Unsubscribe',
            viewInBrowser: 'View in browser',
            footer: 'This email was sent to {{email}}. If you no longer wish to receive these emails, please {{unsubscribeLink}}.',
          }
        },
        es: {
          email: {
            greeting: 'Hola',
            goodbye: 'Saludos cordiales',
            unsubscribe: 'Darse de baja',
            viewInBrowser: 'Ver en el navegador',
            footer: 'Este correo fue enviado a {{email}}. Si ya no desea recibir estos correos, por favor {{unsubscribeLink}}.',
          }
        },
        fr: {
          email: {
            greeting: 'Bonjour',
            goodbye: 'Cordialement',
            unsubscribe: 'Se désabonner',
            viewInBrowser: 'Voir dans le navigateur',
            footer: 'Cet email a été envoyé à {{email}}. Si vous ne souhaitez plus recevoir ces emails, veuillez {{unsubscribeLink}}.',
          }
        }
      },
      interpolation: {
        prefix: '{{',
        suffix: '}}'
      }
    });

    // Register Handlebars helpers and partials
    this.registerHelpers();
    this.registerPartials();
  }

  /**
   * Register a template with the engine
   */
  registerTemplate(template: EmailTemplate): void {
    this.templates.set(template.id, template);
    this.logger.info(`Registered email template: ${template.name} (${template.id})`);
  }

  /**
   * Unregister a template
   */
  unregisterTemplate(templateId: string): boolean {
    const deleted = this.templates.delete(templateId);
    if (deleted) {
      this.logger.info(`Unregistered email template: ${templateId}`);
    }
    return deleted;
  }

  /**
   * Get a template by ID
   */
  getTemplate(templateId: string): EmailTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get all registered templates
   */
  getAllTemplates(): EmailTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Render a template with provided data
   */
  async renderTemplate(
    templateId: string,
    data: Record<string, any>,
    options: TemplateRenderOptions = {}
  ): Promise<TemplateRenderResult> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const locale = options.locale || 'en';
    const format = options.format || 'both';

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
        // Helper for generating unsubscribe URLs
        unsubscribeUrl: this.generateUnsubscribeUrl(data),
        // Helper for generating tracking URLs
        trackUrl: (url: string, type: string = 'click') => this.generateTrackingUrl(url, type, data),
      };

      const result: TemplateRenderResult = {};
      const errors: string[] = [];

      // Render subject
      if (template.subject) {
        try {
          const subjectTemplate = Handlebars.compile(template.subject);
          result.subject = subjectTemplate(templateData);
        } catch (error) {
          errors.push(`Subject render error: ${error}`);
          this.logger.error(`Subject render error for template ${templateId}`, { error, data });
        }
      }

      // Render HTML content
      if ((format === 'html' || format === 'both') && template.htmlContent) {
        try {
          const htmlTemplate = Handlebars.compile(template.htmlContent);
          result.html = htmlTemplate(templateData);
        } catch (error) {
          errors.push(`HTML render error: ${error}`);
          this.logger.error(`HTML render error for template ${templateId}`, { error, data });
        }
      }

      // Render text content
      if ((format === 'text' || format === 'both') && template.textContent) {
        try {
          const textTemplate = Handlebars.compile(template.textContent);
          result.text = textTemplate(templateData);
        } catch (error) {
          errors.push(`Text render error: ${error}`);
          this.logger.error(`Text render error for template ${templateId}`, { error, data });
        }
      }

      if (errors.length > 0) {
        result.errors = errors;
      }

      this.logger.info(`Template rendered successfully: ${templateId}`, {
        locale,
        format,
        hasSubject: !!result.subject,
        hasHtml: !!result.html,
        hasText: !!result.text,
        errors: errors.length
      });

      return result;

    } catch (error) {
      this.logger.error(`Template rendering failed for ${templateId}`, { error, data, options });
      throw new Error(`Template rendering failed: ${error}`);
    }
  }

  /**
   * Validate template data against template variables
   */
  validateTemplateData(templateId: string, data: Record<string, any>): { valid: boolean; errors: string[] } {
    const template = this.templates.get(templateId);
    if (!template) {
      return { valid: false, errors: [`Template not found: ${templateId}`] };
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
    this.i18n.addResourceBundle(locale, 'email', resources, true, true);
    this.logger.info(`Added localization resources for locale: ${locale}`);
  }

  /**
   * Get available locales
   */
  private getAvailableLocales(): string[] {
    return this.i18n.languages.slice(); // Return a copy of the array
  }

  /**
   * Create a template from content
   */
  createTemplateFromContent(
    name: string,
    subject: string,
    htmlContent: string,
    textContent: string,
    variables: TemplateVariable[] = [],
    locale: string = 'en',
    category: string = 'general'
  ): EmailTemplate {
    return {
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      subject,
      htmlContent,
      textContent,
      variables,
      locale,
      category,
      version: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      tags: []
    };
  }

  private validateVariableValue(variable: TemplateVariable, value: any): string[] {
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

      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push(`${variable.name} must be an object`);
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`${variable.name} must be an array`);
        }
        break;
    }

    if (variable.validation?.enum && !variable.validation.enum.includes(value)) {
      errors.push(`${variable.name} must be one of: ${variable.validation.enum.join(', ')}`);
    }

    return errors;
  }

  private formatDate(date: Date, format: string, timezone?: string): string {
    // Simple date formatting - can be enhanced with a proper date library
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

  private generateUnsubscribeUrl(data: Record<string, any>): string {
    // Generate unsubscribe URL based on configuration
    const baseUrl = process.env.UNSUBSCRIBE_BASE_URL || 'https://coinet.com/unsubscribe';
    const email = data.email || data.user?.email;
    const campaignId = data.campaignId;

    const params = new URLSearchParams();
    if (email) params.set('email', email);
    if (campaignId) params.set('campaign', campaignId);

    return `${baseUrl}?${params.toString()}`;
  }

  private generateTrackingUrl(url: string, type: string, data: Record<string, any>): string {
    // Generate tracking URL for click tracking
    const baseUrl = process.env.TRACKING_BASE_URL || 'https://coinet.com/track';
    const email = data.email || data.user?.email;
    const campaignId = data.campaignId;
    const templateId = data.templateId;

    const params = new URLSearchParams({
      url: url,
      type,
      ...(email && { email }),
      ...(campaignId && { campaign: campaignId }),
      ...(templateId && { template: templateId }),
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers(): void {
    const templateEngine = this;

    // Helper for conditional content
    Handlebars.registerHelper('if_eq', function(this: any, a: any, b: any, options: any) {
      if (a === b) {
        return options.fn(this);
      }
      return options.inverse(this);
    });

    // Helper for iterating with index
    Handlebars.registerHelper('each_with_index', function(this: any, array: any[], options: any) {
      let result = '';
      for (let i = 0; i < array.length; i++) {
        result += options.fn({ ...array[i], index: i });
      }
      return result;
    });

    // Helper for date formatting
    Handlebars.registerHelper('formatDate', function(this: any, date: any, format: string) {
      return new Handlebars.SafeString(templateEngine.formatDate(date, format, undefined));
    });

    // Helper for currency formatting
    Handlebars.registerHelper('formatCurrency', function(this: any, amount: number, currency?: string) {
      return new Handlebars.SafeString(templateEngine.formatCurrency(amount, currency || 'USD', 'en'));
    });

    // Helper for number formatting
    Handlebars.registerHelper('formatNumber', function(this: any, num: number, decimals?: number) {
      return new Handlebars.SafeString(templateEngine.formatNumber(num, decimals || 2, 'en'));
    });
  }

  /**
   * Register Handlebars partials
   */
  private registerPartials(): void {
    // Email signature partial
    Handlebars.registerPartial('signature', `
      <br><br>
      <p>Best regards,<br>
      The {{platformName}} Team</p>
      <p><a href="https://{{platformName}}.com">Visit our website</a></p>
    `);

    // Email footer partial
    Handlebars.registerPartial('footer', `
      <br><br>
      <hr style="border: none; border-top: 1px solid #eee;">
      <p style="font-size: 12px; color: #666; text-align: center;">
        {{t "footer" email=user.email unsubscribeLink=(trackUrl unsubscribeUrl "unsubscribe")}}
      </p>
    `);
  }
}

