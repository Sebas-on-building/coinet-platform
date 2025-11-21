export interface AIProvider {
  name: 'openai' | 'gemini' | 'anthropic';
  model: string;
  apiKey?: string;
  endpoint?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  context?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIResponse {
  content: string;
  provider: AIProvider['name'];
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, unknown>;
}

export interface PromptTemplate {
  id: string;
  name: string;
  template: string;
  variables: string[];
  category: string;
  description?: string;
}

export interface AIAnalysis {
  id: string;
  type: 'sentiment' | 'technical' | 'fundamental' | 'risk';
  symbol: string;
  result: Record<string, unknown>;
  confidence: number;
  timestamp: Date;
  provider: AIProvider['name'];
} 