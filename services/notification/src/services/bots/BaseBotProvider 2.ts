import { BotProvider, BotMessageData, BotMessageResult, BotError, BotProviderConfig } from '@/types';
import { Logger } from '@/utils/Logger';

export abstract class BaseBotProvider implements BotProvider {
  public readonly name: string;
  public readonly type: 'discord' | 'telegram';
  public readonly config: BotProviderConfig;
  public readonly priority: number;
  public readonly rateLimit: { maxRequests: number; windowMs: number } | undefined;

  protected logger: Logger;
  protected healthStatus: boolean = true;
  protected lastHealthCheck: Date = new Date();

  constructor(
    name: string,
    type: 'discord' | 'telegram',
    config: BotProviderConfig,
    priority: number = 1,
    rateLimit?: { maxRequests: number; windowMs: number }
  ) {
    this.name = name;
    this.type = type;
    this.config = config;
    this.priority = priority;
    this.rateLimit = rateLimit;
    this.logger = Logger.getInstance();
  }

  abstract sendMessage(messageData: BotMessageData): Promise<BotMessageResult>;

  async healthCheck(): Promise<boolean> {
    try {
      this.healthStatus = await this.performHealthCheck();
      this.lastHealthCheck = new Date();

      if (!this.healthStatus) {
        this.logger.warn(`Health check failed for bot provider ${this.name}`);
      }

      return this.healthStatus;
    } catch (error) {
      this.logger.error(`Health check error for bot provider ${this.name}`, { error });
      this.healthStatus = false;
      return false;
    }
  }

  protected abstract performHealthCheck(): Promise<boolean>;

  protected createError(code: string, message: string, retryable: boolean = false): BotError {
    return {
      code,
      message,
      platform: this.type,
      retryable
    };
  }

  protected createSuccessResult(messageId: string): BotMessageResult {
    return {
      success: true,
      messageId,
      platform: this.type,
      timestamp: new Date()
    };
  }

  protected createErrorResult(error: BotError): BotMessageResult {
    return {
      success: false,
      error,
      platform: this.type,
      timestamp: new Date()
    };
  }

  public getHealthInfo(): { status: boolean; lastCheck: Date; name: string; type: string } {
    return {
      status: this.healthStatus,
      lastCheck: this.lastHealthCheck,
      name: this.name,
      type: this.type
    };
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected validateMessageData(messageData: BotMessageData): void {
    if (!messageData.content || messageData.content.trim().length === 0) {
      throw this.createError('INVALID_CONTENT', 'Message content is required', false);
    }

    if (!messageData.platform) {
      throw this.createError('INVALID_PLATFORM', 'Platform must be specified', false);
    }

    if (messageData.platform !== this.type) {
      throw this.createError('PLATFORM_MISMATCH', `Message platform ${messageData.platform} doesn't match provider type ${this.type}`, false);
    }
  }

  protected formatMessage(content: string, formatting: BotMessageData['formatting']): string {
    if (!formatting.markdown) {
      return content;
    }

    // Basic markdown formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '**$1**') // Bold
      .replace(/\*(.*?)\*/g, '*$1*') // Italic
      .replace(/`(.*?)`/g, '`$1`') // Code
      .replace(/```([\s\S]*?)```/g, '```$1```'); // Code blocks
  }
}
