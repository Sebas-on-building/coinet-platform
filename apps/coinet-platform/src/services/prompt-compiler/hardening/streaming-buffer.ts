/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📡 STREAMING BUFFER — VALIDATE BEFORE YOU STREAM                         ║
 * ║                                                                               ║
 * ║   NEVER stream raw model output. Generate → Validate → Then stream.          ║
 * ║   This prevents leaking violations to users.                                 ║
 * ║                                                                               ║
 * ║   PATTERN:                                                                    ║
 * ║   1. Generate Pass-2 into buffer                                             ║
 * ║   2. Validate buffer (guardrails)                                            ║
 * ║   3. If passed: stream the validated content                                 ║
 * ║   4. If failed: regenerate or send fallback                                  ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Production hardening                                      ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface StreamChunk {
  type: 'text' | 'metadata' | 'error' | 'done';
  content: string;
  timestamp: number;
}

export interface BufferedResponse {
  rawContent: string;
  validatedContent: string | null;
  isValid: boolean;
  validationErrors: string[];
  processingTimeMs: number;
}

export interface StreamingConfig {
  chunkSize: number;            // Characters per chunk
  chunkDelayMs: number;         // Delay between chunks for "typing" effect
  maxBufferSize: number;        // Max characters to buffer
  validationTimeoutMs: number;  // Max time for validation
}

export type StreamHandler = (chunk: StreamChunk) => void | Promise<void>;

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_STREAMING_CONFIG: StreamingConfig = {
  chunkSize: 20,            // ~20 chars per chunk
  chunkDelayMs: 30,         // 30ms between chunks (~33 chars/sec)
  maxBufferSize: 5000,      // Max 5000 chars
  validationTimeoutMs: 5000, // 5 second validation timeout
};

// ============================================================================
// RESPONSE BUFFER
// ============================================================================

export class ResponseBuffer {
  private buffer: string = '';
  private isComplete: boolean = false;
  private startTime: number = Date.now();
  private config: StreamingConfig;
  
  constructor(config: Partial<StreamingConfig> = {}) {
    this.config = { ...DEFAULT_STREAMING_CONFIG, ...config };
  }
  
  /**
   * Append content to buffer
   */
  append(content: string): void {
    if (this.isComplete) {
      throw new Error('Cannot append to completed buffer');
    }
    
    if (this.buffer.length + content.length > this.config.maxBufferSize) {
      throw new Error(`Buffer overflow: ${this.buffer.length + content.length} > ${this.config.maxBufferSize}`);
    }
    
    this.buffer += content;
  }
  
  /**
   * Mark buffer as complete
   */
  complete(): void {
    this.isComplete = true;
  }
  
  /**
   * Get buffer content
   */
  getContent(): string {
    return this.buffer;
  }
  
  /**
   * Check if complete
   */
  isDone(): boolean {
    return this.isComplete;
  }
  
  /**
   * Get elapsed time
   */
  getElapsedMs(): number {
    return Date.now() - this.startTime;
  }
  
  /**
   * Reset buffer
   */
  reset(): void {
    this.buffer = '';
    this.isComplete = false;
    this.startTime = Date.now();
  }
}

// ============================================================================
// VALIDATED STREAMER
// ============================================================================

export class ValidatedStreamer {
  private config: StreamingConfig;
  private validator: (content: string) => { isValid: boolean; errors: string[] };
  
  constructor(
    validator: (content: string) => { isValid: boolean; errors: string[] },
    config: Partial<StreamingConfig> = {}
  ) {
    this.config = { ...DEFAULT_STREAMING_CONFIG, ...config };
    this.validator = validator;
  }
  
  /**
   * Buffer, validate, then stream
   * This is the main entry point
   */
  async bufferValidateStream(
    generateFn: () => Promise<string>,
    onChunk: StreamHandler,
    onError?: (error: Error) => void
  ): Promise<BufferedResponse> {
    const startTime = Date.now();
    let rawContent = '';
    let validatedContent: string | null = null;
    let validationErrors: string[] = [];
    
    try {
      // Step 1: Generate into buffer
      rawContent = await generateFn();
      
      // Step 2: Validate
      const validation = this.validator(rawContent);
      validationErrors = validation.errors;
      
      if (!validation.isValid) {
        logger.warn('📡 Buffer validation failed', { 
          errors: validation.errors.slice(0, 3),
          contentPreview: rawContent.substring(0, 100),
        });
        
        // Send error chunk
        await onChunk({
          type: 'error',
          content: 'Response validation failed',
          timestamp: Date.now(),
        });
        
        if (onError) {
          onError(new Error(`Validation failed: ${validation.errors.join(', ')}`));
        }
        
        return {
          rawContent,
          validatedContent: null,
          isValid: false,
          validationErrors,
          processingTimeMs: Date.now() - startTime,
        };
      }
      
      validatedContent = rawContent;
      
      // Step 3: Stream the validated content
      await this.streamContent(validatedContent, onChunk);
      
      // Send done chunk
      await onChunk({
        type: 'done',
        content: '',
        timestamp: Date.now(),
      });
      
      return {
        rawContent,
        validatedContent,
        isValid: true,
        validationErrors: [],
        processingTimeMs: Date.now() - startTime,
      };
      
    } catch (error: any) {
      logger.error('📡 Streaming error', { error: error.message });
      
      await onChunk({
        type: 'error',
        content: error.message,
        timestamp: Date.now(),
      });
      
      if (onError) {
        onError(error);
      }
      
      return {
        rawContent,
        validatedContent: null,
        isValid: false,
        validationErrors: [error.message],
        processingTimeMs: Date.now() - startTime,
      };
    }
  }
  
  /**
   * Stream content in chunks
   */
  private async streamContent(content: string, onChunk: StreamHandler): Promise<void> {
    const { chunkSize, chunkDelayMs } = this.config;
    
    for (let i = 0; i < content.length; i += chunkSize) {
      const chunk = content.substring(i, i + chunkSize);
      
      await onChunk({
        type: 'text',
        content: chunk,
        timestamp: Date.now(),
      });
      
      if (chunkDelayMs > 0 && i + chunkSize < content.length) {
        await sleep(chunkDelayMs);
      }
    }
  }
}

// ============================================================================
// SENTENCE-AWARE STREAMING
// ============================================================================

/**
 * Stream content sentence by sentence for more natural feel
 */
export class SentenceStreamer {
  private config: StreamingConfig;
  private validator: (content: string) => { isValid: boolean; errors: string[] };
  
  constructor(
    validator: (content: string) => { isValid: boolean; errors: string[] },
    config: Partial<StreamingConfig> = {}
  ) {
    this.config = { ...DEFAULT_STREAMING_CONFIG, ...config };
    this.validator = validator;
  }
  
  /**
   * Split into sentences and stream each
   */
  async streamBySentence(
    content: string,
    onChunk: StreamHandler
  ): Promise<void> {
    // Validate first
    const validation = this.validator(content);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Split by sentence boundaries
    const sentences = content.match(/[^.!?]+[.!?]+\s*/g) || [content];
    
    for (const sentence of sentences) {
      // Stream sentence character by character
      for (let i = 0; i < sentence.length; i += this.config.chunkSize) {
        const chunk = sentence.substring(i, i + this.config.chunkSize);
        
        await onChunk({
          type: 'text',
          content: chunk,
          timestamp: Date.now(),
        });
        
        if (this.config.chunkDelayMs > 0) {
          await sleep(this.config.chunkDelayMs);
        }
      }
      
      // Small pause between sentences
      await sleep(50);
    }
    
    await onChunk({
      type: 'done',
      content: '',
      timestamp: Date.now(),
    });
  }
}

// ============================================================================
// STREAMING WITH RETRY
// ============================================================================

export interface StreamWithRetryOptions {
  maxRetries: number;
  regenerateFn: (errors: string[]) => Promise<string>;
}

/**
 * Stream with automatic retry on validation failure
 */
export async function streamWithRetry(
  streamer: ValidatedStreamer,
  generateFn: () => Promise<string>,
  onChunk: StreamHandler,
  options: StreamWithRetryOptions
): Promise<BufferedResponse> {
  let lastResult: BufferedResponse | null = null;
  let attempts = 0;
  
  while (attempts <= options.maxRetries) {
    const generator = attempts === 0 
      ? generateFn 
      : () => options.regenerateFn(lastResult?.validationErrors || []);
    
    lastResult = await streamer.bufferValidateStream(
      generator,
      onChunk,
      undefined // Don't call error handler on retry attempts
    );
    
    if (lastResult.isValid) {
      return lastResult;
    }
    
    attempts++;
    logger.warn('📡 Stream retry', { attempt: attempts, errors: lastResult.validationErrors.slice(0, 2) });
  }
  
  // All retries failed
  logger.error('📡 All stream retries failed', { 
    attempts, 
    lastErrors: lastResult?.validationErrors 
  });
  
  return lastResult || {
    rawContent: '',
    validatedContent: null,
    isValid: false,
    validationErrors: ['All retries exhausted'],
    processingTimeMs: 0,
  };
}

// ============================================================================
// SAFE STREAM WRAPPER (FOR SSE/WEBSOCKET)
// ============================================================================

export interface SafeStreamOptions {
  onStart?: () => void;
  onComplete?: (result: BufferedResponse) => void;
  onError?: (error: Error) => void;
  fallbackMessage?: string;
}

/**
 * Wrap streaming for SSE/WebSocket with safety guarantees
 */
export function createSafeStream(
  validator: (content: string) => { isValid: boolean; errors: string[] },
  options: SafeStreamOptions = {}
): {
  stream: (generateFn: () => Promise<string>, send: (data: string) => void) => Promise<void>;
} {
  const streamer = new ValidatedStreamer(validator);
  
  return {
    stream: async (generateFn, send) => {
      options.onStart?.();
      
      const result = await streamer.bufferValidateStream(
        generateFn,
        async (chunk) => {
          if (chunk.type === 'text') {
            send(chunk.content);
          } else if (chunk.type === 'error' && options.fallbackMessage) {
            send(options.fallbackMessage);
          }
        },
        options.onError
      );
      
      options.onComplete?.(result);
    },
  };
}

// ============================================================================
// PRE-STREAM CHECKS
// ============================================================================

/**
 * Quick checks before streaming to fail fast
 */
export function preStreamChecks(content: string): { 
  canStream: boolean; 
  reason?: string 
} {
  // Check for JSON structure leaks
  if (content.includes('"output_language"') || content.includes('"final_answer"')) {
    return { canStream: false, reason: 'Raw JSON structure detected' };
  }
  
  // Check for obvious thinking leaks
  if (/^\[thinking\]|\[reasoning\]|\[analysis\]/i.test(content)) {
    return { canStream: false, reason: 'Internal thinking leaked' };
  }
  
  // Check for empty content
  if (content.trim().length === 0) {
    return { canStream: false, reason: 'Empty content' };
  }
  
  // Check for excessive length (likely error dump)
  if (content.length > 10000) {
    return { canStream: false, reason: 'Content too long' };
  }
  
  return { canStream: true };
}

// ============================================================================
// UTILITIES
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  ResponseBuffer,
  ValidatedStreamer,
  SentenceStreamer,
  streamWithRetry,
  createSafeStream,
  preStreamChecks,
};
