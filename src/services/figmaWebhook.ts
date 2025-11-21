import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { TokenVersioningService, DesignTokens } from './tokenVersioning';
import { errorManager, ServiceError } from '../lib/errors/ErrorManager';
import { Request, Response } from 'express';

const router = express.Router();
const WEBHOOK_SECRET = process.env.FIGMA_WEBHOOK_SECRET || 'changeme';
const SKETCH_WEBHOOK_SECRET = process.env.SKETCH_WEBHOOK_SECRET || 'changeme';
const TOKENS_PATH = path.resolve(__dirname, '../design-system/tokens/index.ts');

export interface TokenUpdate {
  id: string;
  name: string;
  value: string | number;
  type: 'color' | 'spacing' | 'typography' | 'shadow' | 'border' | 'motion';
  category: string;
  description?: string;
  tags?: string[];
}

export interface WebhookPayload {
  secret: string;
  tokens: TokenUpdate[];
  user?: string;
  timestamp?: string;
  version?: string;
  metadata?: Record<string, any>;
}

export interface SketchPayload {
  secret: string;
  symbols: any[];
  styles: any[];
  user?: string;
  timestamp?: string;
  version?: string;
  metadata?: Record<string, any>;
}

export interface WebhookAuditLog {
  id: string;
  timestamp: string;
  source: 'figma' | 'sketch';
  user: string;
  action: 'token_update' | 'symbol_update' | 'style_update';
  success: boolean;
  error?: string;
  payload: any;
  diff?: any;
}

class DesignWebhookService {
  private static instance: DesignWebhookService;
  private auditLog: WebhookAuditLog[] = [];
  private webhookHooks: Map<string, Function[]> = new Map();

  private constructor() {
    this.setupHooks();
  }

  static getInstance(): DesignWebhookService {
    if (!DesignWebhookService.instance) {
      DesignWebhookService.instance = new DesignWebhookService();
    }
    return DesignWebhookService.instance;
  }

  private setupHooks(): void {
    // Register default hooks
    this.addHook('token_update', this.updateTokenFiles.bind(this));
    this.addHook('token_update', this.notifyDevelopers.bind(this));
    this.addHook('symbol_update', this.updateSymbolFiles.bind(this));
  }

  private validateWebhookSecret(providedSecret: string, expectedSecret: string): boolean {
    if (!providedSecret || !expectedSecret) {
      return false;
    }

    // Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(providedSecret),
      Buffer.from(expectedSecret)
    );
  }

  private validateTokens(tokens: TokenUpdate[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(tokens)) {
      errors.push('Tokens must be an array');
      return { valid: false, errors };
    }

    for (const [index, token] of tokens.entries()) {
      if (!token.id) {
        errors.push(`Token at index ${index} missing required field: id`);
      }

      if (!token.name) {
        errors.push(`Token at index ${index} missing required field: name`);
      }

      if (token.value === undefined || token.value === null) {
        errors.push(`Token at index ${index} missing required field: value`);
      }

      if (!token.type) {
        errors.push(`Token at index ${index} missing required field: type`);
      }

      const validTypes = ['color', 'spacing', 'typography', 'shadow', 'border', 'motion'];
      if (token.type && !validTypes.includes(token.type)) {
        errors.push(`Token at index ${index} has invalid type: ${token.type}. Valid types: ${validTypes.join(', ')}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private async updateTokenFiles(tokens: TokenUpdate[]): Promise<void> {
    try {
      // Generate TypeScript token definitions
      const tokenDefinitions = this.generateTokenDefinitions(tokens);

      // Ensure directory exists
      const tokensDir = path.dirname(TOKENS_PATH);
      await fs.mkdir(tokensDir, { recursive: true });

      // Write tokens to file
      await fs.writeFile(TOKENS_PATH, tokenDefinitions, 'utf8');

      // Update package.json build scripts if needed
      await this.updateBuildScripts();

    } catch (error) {
      errorManager.handleError(error as Error, {
        operation: 'updateTokenFiles',
        component: 'design_webhook_service',
        metadata: { tokenCount: tokens.length }
      });
      throw new ServiceError('TOKEN_FILE_UPDATE_FAILED', 'Failed to update token files', error as Error);
    }
  }

  private generateTokenDefinitions(tokens: TokenUpdate[]): string {
    const tokensByType = tokens.reduce((acc, token) => {
      if (!acc[token.type]) {
        acc[token.type] = [];
      }
      acc[token.type].push(token);
      return acc;
    }, {} as Record<string, TokenUpdate[]>);

    let output = `// Auto-generated design tokens from Figma\n// Last updated: ${new Date().toISOString()}\n\n`;

    for (const [type, typeTokens] of Object.entries(tokensByType)) {
      output += `export const ${type}Tokens = {\n`;

      for (const token of typeTokens) {
        const safeName = token.name.replace(/[^a-zA-Z0-9]/g, '_');
        output += `  ${safeName}: {\n`;
        output += `    id: '${token.id}',\n`;
        output += `    name: '${token.name}',\n`;
        output += `    value: ${typeof token.value === 'string' ? `'${token.value}'` : token.value},\n`;
        output += `    type: '${token.type}',\n`;
        output += `    category: '${token.category}',\n`;

        if (token.description) {
          output += `    description: '${token.description}',\n`;
        }

        if (token.tags && token.tags.length > 0) {
          output += `    tags: [${token.tags.map(tag => `'${tag}'`).join(', ')}],\n`;
        }

        output += `  },\n`;
      }

      output += `};\n\n`;
    }

    // Export all tokens
    output += `export const allTokens = {\n`;
    for (const type of Object.keys(tokensByType)) {
      output += `  ${type}: ${type}Tokens,\n`;
    }
    output += `};\n`;

    return output;
  }

  private async updateBuildScripts(): Promise<void> {
    try {
      const packageJsonPath = path.resolve(process.cwd(), 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

      // Ensure build scripts include token processing
      if (!packageJson.scripts) {
        packageJson.scripts = {};
      }

      if (!packageJson.scripts['build:tokens']) {
        packageJson.scripts['build:tokens'] = 'node scripts/build-tokens.js';
      }

      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    } catch (error) {
      // Non-critical error, just log it
      errorManager.handleError(error as Error, {
        operation: 'updateBuildScripts',
        component: 'design_webhook_service'
      });
    }
  }

  private async updateSymbolFiles(symbols: any[]): Promise<void> {
    try {
      const symbolsPath = path.resolve(__dirname, '../design-system/symbols/index.ts');
      const symbolsDir = path.dirname(symbolsPath);

      await fs.mkdir(symbolsDir, { recursive: true });

      const symbolDefinitions = this.generateSymbolDefinitions(symbols);
      await fs.writeFile(symbolsPath, symbolDefinitions, 'utf8');

    } catch (error) {
      errorManager.handleError(error as Error, {
        operation: 'updateSymbolFiles',
        component: 'design_webhook_service',
        metadata: { symbolCount: symbols.length }
      });
      throw new ServiceError('SYMBOL_FILE_UPDATE_FAILED', 'Failed to update symbol files', error as Error);
    }
  }

  private generateSymbolDefinitions(symbols: any[]): string {
    let output = `// Auto-generated design symbols from Sketch\n// Last updated: ${new Date().toISOString()}\n\n`;

    output += `export const symbols = {\n`;

    for (const symbol of symbols) {
      const safeName = symbol.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'unnamed';
      output += `  ${safeName}: {\n`;
      output += `    id: '${symbol.id}',\n`;
      output += `    name: '${symbol.name}',\n`;
      output += `    type: '${symbol.type}',\n`;
      if (symbol.description) {
        output += `    description: '${symbol.description}',\n`;
      }
      output += `  },\n`;
    }

    output += `};\n`;

    return output;
  }

  private async notifyDevelopers(tokens: TokenUpdate[]): Promise<void> {
    // This would integrate with Slack, email, or other notification systems
    console.log(`Design tokens updated: ${tokens.length} tokens processed`);
  }

  private logWebhookActivity(log: Omit<WebhookAuditLog, 'id' | 'timestamp'>): void {
    const auditEntry: WebhookAuditLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...log
    };

    this.auditLog.push(auditEntry);

    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog.shift();
    }

    // Log to central system
    errorManager.handleError(
      new Error(`Webhook activity: ${log.action} from ${log.source}`),
      {
        operation: 'webhook_audit_log',
        component: 'design_webhook_service',
        metadata: auditEntry
      }
    );
  }

  public addHook(event: string, handler: Function): void {
    if (!this.webhookHooks.has(event)) {
      this.webhookHooks.set(event, []);
    }
    this.webhookHooks.get(event)!.push(handler);
  }

  public removeHook(event: string, handler: Function): void {
    const handlers = this.webhookHooks.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private async executeHooks(event: string, data: any): Promise<void> {
    const handlers = this.webhookHooks.get(event) || [];

    for (const handler of handlers) {
      try {
        await handler(data);
      } catch (error) {
        errorManager.handleError(error as Error, {
          operation: 'webhook_hook_execution',
          component: 'design_webhook_service',
          metadata: { event, handlerName: handler.name }
        });
      }
    }
  }

  private convertTokensToDesignTokens(tokens: TokenUpdate[]): DesignTokens {
    const designTokens: DesignTokens = {
      colors: {},
      spacing: {},
      typography: {},
      radius: {},
      shadows: {},
      motion: {},
      gradients: {},
      zIndex: {},
      breakpoints: {},
    };

    for (const token of tokens) {
      const groupKey = token.type === 'shadow' ? 'shadows' :
        token.type === 'border' ? 'radius' :
          token.type === 'color' ? 'colors' :
            token.type === 'spacing' ? 'spacing' :
              token.type === 'typography' ? 'typography' :
                token.type === 'motion' ? 'motion' : 'colors';

      const tokenKey = token.name.replace(/[^a-zA-Z0-9]/g, '_');
      designTokens[groupKey as keyof DesignTokens][tokenKey] = String(token.value);
    }

    return designTokens;
  }

  public async handleFigmaTokenUpdate(req: Request, res: Response): Promise<void> {
    const auditLog: Omit<WebhookAuditLog, 'id' | 'timestamp'> = {
      source: 'figma',
      user: req.body.user || 'figma-webhook',
      action: 'token_update',
      success: false,
      payload: req.body
    };

    try {
      const { secret, tokens, user = 'figma-webhook' }: WebhookPayload = req.body;

      // Validate webhook secret
      if (!this.validateWebhookSecret(secret, WEBHOOK_SECRET)) {
        res.status(401).json({ error: 'Invalid webhook secret' });
        auditLog.error = 'Invalid webhook secret';
        this.logWebhookActivity(auditLog);
        return;
      }

      // Validate required fields
      if (!tokens) {
        res.status(400).json({ error: 'Missing tokens in request body' });
        auditLog.error = 'Missing tokens in request body';
        this.logWebhookActivity(auditLog);
        return;
      }

      // Validate token structure
      const validation = this.validateTokens(tokens);
      if (!validation.valid) {
        res.status(400).json({ error: 'Invalid token structure', details: validation.errors });
        auditLog.error = `Invalid token structure: ${validation.errors.join(', ')}`;
        this.logWebhookActivity(auditLog);
        return;
      }

      // Convert tokens to DesignTokens format
      const designTokens = this.convertTokensToDesignTokens(tokens);

      // Get current tokens and calculate diff
      const oldTokens = TokenVersioningService.getCurrentTokens();
      const diff = TokenVersioningService.diffTokens(oldTokens, designTokens);

      // Save tokens and create version
      TokenVersioningService.saveTokens(designTokens);
      TokenVersioningService.createVersion(user, 'figma-update', designTokens, diff);

      // Execute hooks
      await this.executeHooks('token_update', tokens);

      // Plugin hooks for backward compatibility - register callback if needed
      // TokenVersioningService.onTokenUpdate((updatedTokens) => {
      //   console.log('Tokens updated via plugin hook:', updatedTokens);
      // });

      auditLog.success = true;
      auditLog.diff = diff;
      this.logWebhookActivity(auditLog);

      res.json({
        status: 'success',
        updated: true,
        diff,
        tokensProcessed: tokens.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      auditLog.error = (error as Error).message;
      this.logWebhookActivity(auditLog);

      errorManager.handleError(error as Error, {
        operation: 'handleFigmaTokenUpdate',
        component: 'design_webhook_service',
        metadata: { payload: req.body }
      });

      res.status(500).json({
        error: 'Internal server error processing token update',
        timestamp: new Date().toISOString()
      });
    }
  }

  public async handleSketchTokenUpdate(req: Request, res: Response): Promise<void> {
    const auditLog: Omit<WebhookAuditLog, 'id' | 'timestamp'> = {
      source: 'sketch',
      user: req.body.user || 'sketch-webhook',
      action: 'symbol_update',
      success: false,
      payload: req.body
    };

    try {
      const { secret, symbols, styles, user = 'sketch-webhook' }: SketchPayload = req.body;

      // Validate webhook secret
      if (!this.validateWebhookSecret(secret, SKETCH_WEBHOOK_SECRET)) {
        res.status(401).json({ error: 'Invalid webhook secret' });
        auditLog.error = 'Invalid webhook secret';
        this.logWebhookActivity(auditLog);
        return;
      }

      // Validate required fields
      if (!symbols && !styles) {
        res.status(400).json({ error: 'Missing symbols or styles in request body' });
        auditLog.error = 'Missing symbols or styles in request body';
        this.logWebhookActivity(auditLog);
        return;
      }

      // Process symbols if provided
      if (symbols && Array.isArray(symbols)) {
        await this.executeHooks('symbol_update', symbols);
      }

      // Process styles if provided
      if (styles && Array.isArray(styles)) {
        await this.executeHooks('style_update', styles);
      }

      auditLog.success = true;
      this.logWebhookActivity(auditLog);

      res.json({
        status: 'success',
        updated: true,
        symbolsProcessed: symbols?.length || 0,
        stylesProcessed: styles?.length || 0,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      auditLog.error = (error as Error).message;
      this.logWebhookActivity(auditLog);

      errorManager.handleError(error as Error, {
        operation: 'handleSketchTokenUpdate',
        component: 'design_webhook_service',
        metadata: { payload: req.body }
      });

      res.status(500).json({
        error: 'Internal server error processing Sketch update',
        timestamp: new Date().toISOString()
      });
    }
  }

  public getAuditLog(): WebhookAuditLog[] {
    return [...this.auditLog];
  }

  public getWebhookStats(): {
    totalWebhooks: number;
    successfulWebhooks: number;
    failedWebhooks: number;
    webhooksBySource: Record<string, number>;
    webhooksByAction: Record<string, number>;
  } {
    const totalWebhooks = this.auditLog.length;
    const successfulWebhooks = this.auditLog.filter(log => log.success).length;
    const failedWebhooks = totalWebhooks - successfulWebhooks;

    const webhooksBySource = this.auditLog.reduce((acc, log) => {
      acc[log.source] = (acc[log.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const webhooksByAction = this.auditLog.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalWebhooks,
      successfulWebhooks,
      failedWebhooks,
      webhooksBySource,
      webhooksByAction,
    };
  }
}

// Create singleton instance
const designWebhookService = DesignWebhookService.getInstance();

// Setup routes
router.post('/api/webhooks/figma', express.json(), (req, res) => {
  designWebhookService.handleFigmaTokenUpdate(req, res);
});

router.post('/api/webhooks/sketch', express.json(), (req, res) => {
  designWebhookService.handleSketchTokenUpdate(req, res);
});

// Health check endpoint
router.get('/api/webhooks/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    stats: designWebhookService.getWebhookStats()
  });
});

// Audit log endpoint (for debugging/monitoring)
router.get('/api/webhooks/audit', (req, res) => {
  res.json({
    auditLog: designWebhookService.getAuditLog(),
    stats: designWebhookService.getWebhookStats()
  });
});

export { designWebhookService };
export default router; 