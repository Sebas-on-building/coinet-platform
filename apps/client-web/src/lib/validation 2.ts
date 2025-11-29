/**
 * ✅ Validation Layer - Input Validation & Sanitization
 * 
 * Divine validation system to ensure data integrity and security.
 */

import { z } from 'zod';

// ============================================================================
// CHAT VALIDATION SCHEMAS
// ============================================================================

export const ChatMessageRequestSchema = z.object({
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(10000, 'Message too long (max 10,000 characters)'),
  conversationId: z.string().optional(),
  agentId: z.string().optional(),
  context: z.object({
    includeSources: z.boolean().optional(),
    includeCharts: z.boolean().optional(),
    analysisDepth: z.enum(['quick', 'standard', 'deep']).optional(),
  }).optional(),
});

export const RegenerateMessageSchema = z.object({
  conversationId: z.string().min(1),
  messageId: z.string().min(1),
});

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export function validateChatMessage(data: unknown) {
  return ChatMessageRequestSchema.parse(data);
}

export function sanitizeUserInput(input: string): string {
  // Remove dangerous characters and normalize
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 10000); // Enforce max length
}

export function isValidConversationId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && id.length < 100;
}

export function isValidAgentId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && id.length < 100;
}

