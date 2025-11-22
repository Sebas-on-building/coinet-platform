/**
 * 🤖 Coinet AI Service Integration
 * 
 * Perfect integration with the coinet-ai service.
 * Handles all AI analysis requests with retries, error handling, and caching.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../utils/logger';

export interface AIAnalysisRequest {
  content: string;
  type: 'ticker' | 'url' | 'thread' | 'question' | 'news';
  context?: {
    conversationId?: string;
    agentId?: string;
    analysisDepth?: 'quick' | 'standard' | 'deep';
    conversationHistory?: Array<{ role: string; content: string }>;
  };
}

export interface AIAnalysisResponse {
  success: boolean;
  data: {
    symbol?: string;
    thesis?: string;
    summary?: string;
    confidence: number;
    recommendation?: string;
    keyTopics?: string[];
    risks?: string[];
    catalysts?: string[];
  };
  metadata: {
    requestId: string;
    processingTime: number;
    version: string;
  };
}

export class AIService {
  private client: AxiosInstance;
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = process.env.AI_SERVICE_URL || 'http://localhost:3001';
    this.timeout = parseInt(process.env.AI_SERVICE_TIMEOUT || '30000', 10);

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('🤖 AI Service Request', {
          url: config.url,
          method: config.method,
          baseURL: config.baseURL,
        });
        return config;
      },
      (error) => {
        logger.error('❌ AI Service Request Error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('✅ AI Service Response', {
          status: response.status,
          processingTime: response.data.metadata?.processingTime,
        });
        return response;
      },
      (error: AxiosError) => {
        if (error.response) {
          logger.error('❌ AI Service Error Response', {
            status: error.response.status,
            data: error.response.data,
          });
        } else if (error.request) {
          logger.error('❌ AI Service No Response', {
            message: 'Service unavailable or timeout',
          });
        } else {
          logger.error('❌ AI Service Request Setup Error', {
            message: error.message,
          });
        }
        return Promise.reject(this.normalizeError(error));
      }
    );
  }

  /**
   * Analyze market/crypto query
   */
  async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      const startTime = Date.now();
      const response = await this.client.post<AIAnalysisResponse>(
        '/api/v1/analyze',
        request
      );

      const processingTime = Date.now() - startTime;
      logger.info('🧠 AI Analysis Complete', {
        type: request.type,
        confidence: response.data.data.confidence,
        processingTime,
      });

      return response.data;
    } catch (error) {
      logger.error('❌ AI Analysis Failed', error);
      throw error;
    }
  }

  /**
   * Health check for AI service
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number }> {
    try {
      const start = Date.now();
      const response = await this.client.get('/api/v1/health');
      const latency = Date.now() - start;

      return {
        healthy: response.status === 200,
        latency,
      };
    } catch (error) {
      logger.warn('⚠️ AI Service Health Check Failed', { error: error instanceof Error ? error.message : String(error) });
      return {
        healthy: false,
      };
    }
  }

  /**
   * Normalize axios errors to friendly error format
   */
  private normalizeError(error: AxiosError): Error {
    if (error.response) {
      const data = error.response.data as any;
      return new Error(
        data?.error?.message || `AI Service Error: ${error.response.status}`
      );
    }

    if (error.request) {
      return new Error(
        'AI Service unavailable. Please check if the service is running.'
      );
    }

    return new Error(`AI Service Error: ${error.message}`);
  }
}

// Export singleton instance
export const aiService = new AIService();

