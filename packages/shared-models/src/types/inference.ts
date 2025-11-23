export interface InferenceRequest {
  id: string;
  userId: string;
  prompt: string;
  context?: string;
  provider?: 'openai' | 'gemini' | 'anthropic';
  model?: string;
  parameters?: InferenceParameters;
  timestamp: Date;
}

export interface InferenceParameters {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
}

export interface InferenceResponse {
  id: string;
  requestId: string;
  content: string;
  provider: 'openai' | 'gemini' | 'anthropic';
  model: string;
  usage: TokenUsage;
  finishReason: string;
  timestamp: Date;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ModelConfig {
  provider: 'openai' | 'gemini' | 'anthropic';
  model: string;
  maxTokens: number;
  temperature: number;
  isDefault: boolean;
  costPerToken: number;
} 