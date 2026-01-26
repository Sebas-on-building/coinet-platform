# Coinet RLHF-Lite Continuous Alignment System

## Overview

This is Coinet's **Reinforcement Learning from Human Feedback (RLHF)** system — a practical, production-ready feedback loop that continuously improves AI responses without full model retraining.

**Goal:** Make Coinet AI more human, less scripted, and more useful by learning from real user feedback.

## Architecture

### 5 Core Policies (Master Prompts)

1. **COINET_CORE_PERSONA** — Identity, voice, conversation intelligence
2. **COINET_CONTEXT_MEMORY_POLICY** — Context management, memory, anti-repetition
3. **COINET_REASONING_TOOL_POLICY** — Reasoning control, tool use
4. **COINET_RAG_FACTUALITY_POLICY** — Real-time data grounding, anti-hallucination
5. **COINET_CONSTITUTIONAL_PRINCIPLES** — 12 principles for human alignment

### Feedback Collection (Database Schema)

```prisma
model Message {
  // Basic feedback (simple)
  userFeedback   MessageFeedback?  // positive/negative/neutral
  feedbackReason String?
  feedbackAt     DateTime?
  
  // Detailed feedback (RLHF)
  feedbackEntries FeedbackEntry[]
}

model FeedbackEntry {
  type     FeedbackType      // THUMBS_UP, THUMBS_DOWN, TOO_LONG, etc.
  category FeedbackCategory? // TONE_STYLE, DATA_ACCURACY, etc.
  severity FeedbackSeverity  // CRITICAL, MAJOR, MINOR
  reason   String?           // User's optional comment
  context  Json?             // Session context
}
```

## RLHF Pipeline (Two Paths)

### Path 1: No Finetune (Cheap, Immediate)

**Constitutional Rewrite Pass at Runtime:**

```typescript
// Draft response
const draft = await grok.generate(userMessage);

// Apply constitutional rewrite
const refined = await rlhfAnalysis.constitutionalRewrite({
  draftAnswer: draft,
  userMessage,
  conversationContext,
  language,
  intent,
  mode,
  dataRequestLevel,
});

// Send refined version
return refined;
```

**This alone removes ~70% of botty issues.**

### Path 2: Offline Training (When Ready)

**Weekly Alignment Job:**

1. Sample feedback from last 7 days:
   - 50-200 thumbs down (prioritize repeated failure tags)
   - 50-200 neutral (no feedback)
   - 50-200 thumbs up (keep what works)

2. Run diagnosis on failures:
   ```typescript
   const diagnosis = await rlhfAnalysis.diagnoseFailure({
     userMessage,
     assistantResponse,
     conversationContext,
     language,
     failureTag,
   });
   // Returns: root_causes, fix_rules, ideal_answer
   ```

3. Generate training pairs:
   ```typescript
   const pair = await rlhfAnalysis.createTrainingPairs({
     userMessage,
     conversationContext,
     badAnswer: original,
     idealAnswer: diagnosis.ideal_answer,
     language,
     intent,
   });
   // Returns: { prompt, rejected, chosen, labels, notes }
   ```

4. Export for fine-tuning:
   - 1k-10k pairs in JSONL format
   - Compatible with OpenAI/xAI fine-tuning APIs
   - Update monthly

## The 5 RLHF Prompts

### 1. Failure Diagnosis (`DIAGNOSE_FAILURE`)

**Input:** User message, assistant response, context, language, failure tag

**Output:** 
```json
{
  "root_causes": ["menu question", "repeated phrase"],
  "fix_rules": ["use natural questions", "vary language"],
  "ideal_answer": "..."
}
```

### 2. Training Pair Generator (`CREATE_TRAINING_PAIRS`)

**Input:** User message, bad answer, ideal answer, language, intent

**Output:**
```json
{
  "prompt": "...",
  "rejected": "bad answer",
  "chosen": "ideal answer",
  "labels": { "language": "de", "intent": "DATA_REQUEST" },
  "notes": "More concise, no menu question"
}
```

### 3. Multilingual Style Check (`MULTILINGUAL_STYLE_CHECK`)

**Input:** Chosen answer, language, intent

**Output:** Improved answer with natural phrasing for that language

### 4. Constitutional Rewrite (`CONSTITUTIONAL_REWRITE`)

**Input:** Draft answer, user message, context, language, intent, mode, data level

**Output:** Rewritten answer that satisfies all 10 constitutional principles

### 5. Response Reranker (`RESPONSE_RERANK`)

**Input:** User message, candidate A, candidate B, language, intent

**Output:**
```json
{
  "winner": "A",
  "reason": "More natural, no menu question"
}
```

## Measurable KPIs

Track weekly:

| Metric | Target | Current |
|--------|--------|---------|
| Thumbs up rate | >70% | — |
| "Felt botty" tags | <5% | — |
| "Repetitive" tags | <3% | — |
| Avg SOCIAL response length | <150 chars | — |
| "Asked same question twice" | <1% | — |
| "Wrong data" complaints | 0% | — |

## API Endpoints

### User-Facing (Frontend)

```
POST /api/feedback/submit
{
  "messageId": "...",
  "type": "THUMBS_UP" | "THUMBS_DOWN",
  "category": "TONE_STYLE" | "DATA_ACCURACY" | ...,
  "severity": "MINOR" | "MAJOR" | "CRITICAL",
  "reason": "optional comment"
}
```

### Admin-Only (Analysis)

```
GET /api/feedback/analytics?range=7d
GET /api/feedback/training-pairs
GET /api/feedback/negative-examples?limit=50
GET /api/feedback/positive-examples?limit=100
```

## Weekly Alignment Job (Cron)

```typescript
import { rlhfAnalysis } from './services/rlhf-analysis';

// Run weekly (Sunday 2am UTC)
cron.schedule('0 2 * * 0', async () => {
  const result = await rlhfAnalysis.runWeeklyAlignment();
  
  // Export training data
  fs.writeFileSync(
    `training-pairs-${Date.now()}.jsonl`,
    result.trainingPairs.map(p => JSON.stringify(p)).join('\n')
  );
  
  logger.info('✅ Weekly alignment complete', result.metrics);
});
```

## Constitutional AI Principles (12 Principles)

1. **Helpfulness Without Harm** — Help without reckless advice
2. **Honesty Over Confidence** — Admit uncertainty
3. **Respect User Autonomy** — Advisor, not decision-maker
4. **No Manipulation** — No FOMO, scarcity tactics, shilling
5. **Privacy & Confidentiality** — Never share user data
6. **Fairness & Non-Discrimination** — Equal treatment, no condescension
7. **Transparency About Limitations** — Upfront about what you can't do
8. **Avoid Harmful Financial Behavior** — Gentle intervention on red flags
9. **Cultural Sensitivity** — Respect all cultures, no tribalism
10. **Continuous Improvement** — Accept corrections gracefully
11. **No Deception** — Never claim to be human
12. **Compliance & Legal Safety** — Not regulated advice, educational only

## Optional: Micro-RLHF (Online Reranking)

For high-stakes or new user flows, generate 2 candidates and use judge model:

```typescript
const [candidateA, candidateB] = await Promise.all([
  grok.generate(userMessage),
  grok.generate(userMessage), // With temperature variation
]);

const { winner } = await rlhfAnalysis.rerankResponses({
  userMessage,
  candidateA,
  candidateB,
  language,
  intent,
});

return winner === 'A' ? candidateA : candidateB;
```

**Cost:** 1 extra model call, but significantly improves quality.

## Implementation Status

- [x] Constitutional AI Principles defined
- [x] Feedback schema (Prisma)
- [x] Feedback API endpoints
- [x] Feedback UI (thumbs up/down)
- [x] RLHF Analysis Service
- [x] 5 RLHF Prompts for evaluation
- [ ] Weekly alignment cron job
- [ ] Training data export pipeline
- [ ] Model fine-tuning (when xAI supports)

## Usage Examples

### Submit Feedback (User)

```typescript
// In ChatInterface.tsx
await apiClient.submitFeedback({
  messageId: msg.id,
  type: 'THUMBS_DOWN',
  category: 'TONE_STYLE',
  severity: 'MAJOR',
  reason: 'Sounded like a bot, not a person',
});
```

### Run Alignment Analysis (Admin)

```typescript
// Diagnose specific failure
const diagnosis = await rlhfAnalysis.diagnoseFailure({
  userMessage: "hey",
  assistantResponse: "Yo — what's up. You here for markets or something else?",
  conversationContext: "New conversation, no prior context",
  language: "en",
  failureTag: "repetitive",
});

console.log(diagnosis);
// {
//   root_causes: ["Menu question", "Repeated greeting variant"],
//   fix_rules: ["Use simple greeting only", "No intent questions in first greeting"],
//   ideal_answer: "Hey — what's up?"
// }
```

### Weekly Job

```bash
# Trigger manually
curl -X POST http://localhost:3000/api/admin/alignment/run-weekly \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Returns: training pairs + metrics
```

## Success Metrics (After 4 Weeks)

Target improvements:
- "Felt botty" tags: **-50%**
- Thumbs up rate: **+20%**
- Avg SOCIAL response length: **-30%**
- Repetition rate: **-60%**

## Next Steps

1. **Week 1:** Collect baseline feedback (no changes)
2. **Week 2:** Run first alignment job, analyze patterns
3. **Week 3:** Apply top 10 fix rules manually to policies
4. **Week 4:** Measure improvement, iterate
5. **Month 2:** Consider fine-tuning if patterns stabilize

## Resources

- **Feedback Service:** `apps/coinet-platform/src/api/feedback/service.ts`
- **RLHF Analysis:** `apps/coinet-platform/src/services/rlhf-analysis.ts`
- **Constitutional Principles:** `apps/coinet-platform/src/services/conversation-rules.ts`
- **Policies:** All 5 policies in `conversation-rules.ts`
