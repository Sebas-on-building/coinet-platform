import { z } from 'zod';

export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
  timestamp: z.date(),
  metadata: z.record(z.any()).optional(),
});

export const InferenceRequestSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  prompt: z.string().min(1),
  context: z.string().optional(),
  provider: z.enum(['openai', 'gemini', 'anthropic']).optional(),
  model: z.string().optional(),
  timestamp: z.date(),
});

export const AIAnalysisSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['sentiment', 'technical', 'fundamental', 'risk']),
  symbol: z.string().min(1),
  result: z.record(z.any()),
  confidence: z.number().min(0).max(1),
  timestamp: z.date(),
  provider: z.enum(['openai', 'gemini', 'anthropic']),
}); 