// =============================================================================
// COINET AI SHARED MODELS - INTERFACES
// =============================================================================

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ServiceConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https';
  version?: string;
}

export interface DatabaseConnection {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface LLMProvider {
  name: string;
  apiKey: string;
  baseURL?: string;
  model: string;
} 