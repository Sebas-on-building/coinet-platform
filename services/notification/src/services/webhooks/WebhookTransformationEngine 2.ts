import Handlebars from 'handlebars';
import * as xml2js from 'xml2js';
import { WebhookTransformationTemplate } from '@/types';
import { Logger } from '@/utils/Logger';

export interface TransformationResult {
  transformedPayload: string;
  outputFormat: 'json' | 'xml' | 'form-data';
  warnings?: string[];
  errors?: string[];
}

export class WebhookTransformationEngine {
  private static instance: WebhookTransformationEngine;
  private logger: Logger;
  private templates: Map<string, WebhookTransformationTemplate> = new Map();

  private constructor() {
    this.logger = Logger.getInstance();
    this.setupDefaultTemplates();
  }

  static getInstance(): WebhookTransformationEngine {
    if (!WebhookTransformationEngine.instance) {
      WebhookTransformationEngine.instance = new WebhookTransformationEngine();
    }
    return WebhookTransformationEngine.instance;
  }

  /**
   * Register a transformation template
   */
  registerTemplate(template: WebhookTransformationTemplate): void {
    this.templates.set(template.id, template);
    this.logger.info(`Registered webhook transformation template: ${template.name} (${template.id})`);
  }

  /**
   * Unregister a transformation template
   */
  unregisterTemplate(templateId: string): boolean {
    const deleted = this.templates.delete(templateId);
    if (deleted) {
      this.logger.info(`Unregistered webhook transformation template: ${templateId}`);
    }
    return deleted;
  }

  /**
   * Get a transformation template by ID
   */
  getTemplate(templateId: string): WebhookTransformationTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get all registered transformation templates
   */
  getAllTemplates(): WebhookTransformationTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Transform webhook payload using template
   */
  async transformPayload(
    templateId: string,
    inputPayload: Record<string, any>,
    variables?: Record<string, any>
  ): Promise<TransformationResult> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Transformation template not found: ${templateId}`);
    }

    try {
      // Prepare template data
      const templateData = {
        ...inputPayload,
        ...variables,
        // Add utility functions
        formatDate: (date: Date | string, format: string) => {
          const dateObj = typeof date === 'string' ? new Date(date) : date;
          return this.formatDate(dateObj, format);
        },
        formatCurrency: (amount: number, currency: string = 'USD') => {
          return this.formatCurrency(amount, currency);
        },
        formatNumber: (num: number, decimals: number = 2) => {
          return this.formatNumber(num, decimals);
        },
        jsonStringify: (obj: any) => JSON.stringify(obj, null, 2),
        xmlEscape: (text: string) => this.escapeXml(text),
      };

      // Render template
      const renderedTemplate = Handlebars.compile(template.template);
      let transformedPayload: string;

      switch (template.outputFormat) {
        case 'json':
          transformedPayload = renderedTemplate(templateData);
          break;

        case 'xml':
          transformedPayload = await this.renderXmlTemplate(renderedTemplate, templateData);
          break;

        case 'form-data':
          transformedPayload = this.renderFormDataTemplate(renderedTemplate, templateData);
          break;

        default:
          throw new Error(`Unsupported output format: ${template.outputFormat}`);
      }

      this.logger.info(`Webhook payload transformed successfully: ${templateId}`, {
        outputFormat: template.outputFormat,
        payloadLength: transformedPayload.length,
      });

      return {
        transformedPayload,
        outputFormat: template.outputFormat,
      };

    } catch (error) {
      this.logger.error(`Webhook payload transformation failed for ${templateId}`, { error, inputPayload });
      throw new Error(`Transformation failed: ${error}`);
    }
  }

  /**
   * Validate transformation template
   */
  validateTemplate(template: WebhookTransformationTemplate): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!template.name) {
      errors.push('Template name is required');
    }

    if (!template.template) {
      errors.push('Template content is required');
    }

    if (!template.outputFormat) {
      errors.push('Output format is required');
    }

    // Validate Handlebars syntax
    try {
      Handlebars.compile(template.template);
    } catch (error) {
      errors.push(`Invalid Handlebars template: ${error}`);
    }

    // Validate output format
    if (template.outputFormat && !['json', 'xml', 'form-data'].includes(template.outputFormat)) {
      errors.push('Invalid output format. Must be json, xml, or form-data');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create transformation template from content
   */
  createTemplateFromContent(
    name: string,
    description: string,
    template: string,
    outputFormat: 'json' | 'xml' | 'form-data',
    variables: Record<string, any> = {}
  ): WebhookTransformationTemplate {
    return {
      id: `transform-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      template,
      variables,
      outputFormat,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
    };
  }

  /**
   * Set up default transformation templates
   */
  private setupDefaultTemplates(): void {
    // Slack webhook template
    const slackTemplate = this.createTemplateFromContent(
      'Slack Webhook',
      'Slack notification template',
      `{
  "text": "{{eventType}}",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "{{#if eventType}}{{eventType}}{{else}}Notification{{/if}}"
      }
    },
    {{#if payload.message}}
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "{{payload.message}}"
      }
    },
    {{/if}}
    {{#if payload.metadata}}
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": "*Metadata:* {{jsonStringify payload.metadata}}"
        }
      ]
    },
    {{/if}}
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": "Sent at: {{formatDate timestamp 'datetime'}}"
        }
      ]
    }
  ]
}`,
      'json',
      {
        eventType: 'The event type',
        payload: 'The webhook payload',
        timestamp: 'Event timestamp',
      }
    );

    this.registerTemplate(slackTemplate);

    // Discord webhook template
    const discordTemplate = this.createTemplateFromContent(
      'Discord Webhook',
      'Discord notification template',
      `{
  "embeds": [
    {
      "title": "{{eventType}}",
      "description": "{{#if payload.message}}{{payload.message}}{{else}}Event notification{{/if}}",
      "color": {{#if eventType}}300000{{else}}3447003{{/if}},
      "fields": [
        {{#if payload.metadata}}
        {
          "name": "Metadata",
          "value": "{{jsonStringify payload.metadata}}",
          "inline": false
        },
        {{/if}}
        {
          "name": "Timestamp",
          "value": "{{formatDate timestamp 'datetime'}}",
          "inline": true
        }
      ],
      "timestamp": "{{timestamp}}"
    }
  ]
}`,
      'json',
      {
        eventType: 'The event type',
        payload: 'The webhook payload',
        timestamp: 'Event timestamp',
      }
    );

    this.registerTemplate(discordTemplate);

    // Generic JSON template
    const jsonTemplate = this.createTemplateFromContent(
      'Generic JSON',
      'Generic JSON payload template',
      `{
  "event": "{{eventType}}",
  "timestamp": "{{formatDate timestamp 'datetime'}}",
  "data": {{jsonStringify payload}}
}`,
      'json',
      {
        eventType: 'The event type',
        payload: 'The webhook payload',
        timestamp: 'Event timestamp',
      }
    );

    this.registerTemplate(jsonTemplate);

    // XML template
    const xmlTemplate = this.createTemplateFromContent(
      'Generic XML',
      'Generic XML payload template',
      `<?xml version="1.0" encoding="UTF-8"?>
<notification>
  <event>{{eventType}}</event>
  <timestamp>{{formatDate timestamp 'datetime'}}</timestamp>
  <data>{{jsonStringify payload}}</data>
</notification>`,
      'xml',
      {
        eventType: 'The event type',
        payload: 'The webhook payload',
        timestamp: 'Event timestamp',
      }
    );

    this.registerTemplate(xmlTemplate);

    this.logger.info('Default webhook transformation templates registered');
  }

  /**
   * Render XML template
   */
  private async renderXmlTemplate(template: Handlebars.TemplateDelegate, data: any): Promise<string> {
    const jsonResult = template(data);

    try {
      const parsed = JSON.parse(jsonResult);
      const builder = new xml2js.Builder({
        rootName: 'root',
        xmldec: { version: '1.0', encoding: 'UTF-8' },
      });

      return builder.buildObject(parsed);
    } catch (error) {
      // If JSON parsing fails, return the template result as-is
      return jsonResult;
    }
  }

  /**
   * Render form-data template
   */
  private renderFormDataTemplate(template: Handlebars.TemplateDelegate, data: any): string {
    const result = template(data);

    // Convert JSON-like structure to form data format
    try {
      const parsed = JSON.parse(result);
      const formData: string[] = [];

      const flattenObject = (obj: any, prefix: string = ''): void => {
        for (const [key, value] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}[${key}]` : key;

          if (typeof value === 'object' && value !== null) {
            flattenObject(value, fullKey);
          } else {
            formData.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`);
          }
        }
      };

      flattenObject(parsed);
      return formData.join('&');

    } catch (error) {
      // If JSON parsing fails, return the template result as-is
      return result;
    }
  }

  /**
   * Format date for templates
   */
  private formatDate(date: Date, format: string): string {
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
      case 'iso':
        return date.toISOString();
      default:
        return date.toLocaleDateString();
    }

    return date.toLocaleDateString(undefined, options);
  }

  /**
   * Format currency for templates
   */
  private formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  /**
   * Format number for templates
   */
  private formatNumber(num: number, decimals: number): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  }

  /**
   * Escape XML characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Register Handlebars helpers for webhook transformations
   */
  private registerHelpers(): void {
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
      return new Handlebars.SafeString(this.formatDate ? this.formatDate(date, format) : date);
    });

    // Helper for currency formatting
    Handlebars.registerHelper('formatCurrency', function(this: any, amount: number, currency?: string) {
      return new Handlebars.SafeString(this.formatCurrency ? this.formatCurrency(amount, currency) : amount);
    });

    // Helper for number formatting
    Handlebars.registerHelper('formatNumber', function(this: any, num: number, decimals?: number) {
      return new Handlebars.SafeString(this.formatNumber ? this.formatNumber(num, decimals) : num);
    });

    // Helper for JSON stringification
    Handlebars.registerHelper('jsonStringify', function(this: any, obj: any) {
      return new Handlebars.SafeString(JSON.stringify(obj, null, 2));
    });

    // Helper for XML escaping
    Handlebars.registerHelper('xmlEscape', function(this: any, text: string) {
      return new Handlebars.SafeString(this.xmlEscape ? this.xmlEscape(text) : text);
    });
  }
}
