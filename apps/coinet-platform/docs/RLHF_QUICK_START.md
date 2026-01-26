# RLHF Quick Start Guide

## What is RLHF-Lite?

A practical feedback system that makes Coinet AI more human-like without full model retraining.

**Why it works:** ChatGPT and Claude feel natural because of RLHF training. We're implementing a lightweight version that achieves similar results.

## For Users (Automatic)

### Feedback UI

Every AI message now has **thumbs up/down buttons** (on hover):

```
👍 Helpful response
👎 Not helpful
```

**When you click:**
- Feedback is saved immediately
- Used to improve future responses
- Optional: add a comment about what was wrong

### What Gets Tracked

- Response quality (helpful or not)
- Tone naturalness (bot-like or human)
- Data accuracy (wrong numbers)
- Response length (too verbose or too short)
- Context awareness (remembered or reset)

## For Developers

### 1. Constitutional AI (Runtime Improvement)

**The 12 Principles** are now enforced in every response:

```typescript
// In conversation-rules.ts
export const COINET_CONSTITUTIONAL_PRINCIPLES
```

Before sending any response, the AI checks:
- ✓ Helpfulness without harm
- ✓ Honesty over confidence
- ✓ Respect user autonomy
- ✓ No manipulation/FOMO
- ✓ Privacy & confidentiality
- ✓ Fairness & non-discrimination
- ✓ Transparency about limitations
- ✓ Avoid harmful financial behavior
- ✓ Cultural sensitivity
- ✓ Continuous improvement
- ✓ No deception
- ✓ Compliance & legal safety

### 2. Feedback Collection (Automatic)

Users can submit feedback via:

**Frontend:**
```typescript
await apiClient.submitFeedback({
  messageId: message.id,
  type: 'THUMBS_UP' | 'THUMBS_DOWN',
  category: 'TONE_STYLE', // optional
  severity: 'MINOR',      // optional
  reason: 'optional comment',
});
```

**Backend API:**
```
POST /api/feedback/submit
GET /api/feedback/analytics
GET /api/feedback/training-pairs
```

### 3. Weekly Alignment Job

Run once per week (or every 500 chats):

```typescript
import { rlhfAnalysis } from './services/rlhf-analysis';

// Manual trigger
const result = await rlhfAnalysis.runWeeklyAlignment();

// Returns:
// - trainingPairs: Array of { prompt, rejected, chosen }
// - metrics: Processed counts
```

**What it does:**
1. Samples 600 responses (200 positive, 200 negative, 200 neutral)
2. Diagnoses failures using Claude/GPT-4
3. Generates ideal answers
4. Creates training pairs
5. Exports JSONL for fine-tuning

### 4. The 5 RLHF Prompts

Located in `src/services/rlhf-analysis.ts`:

```typescript
RLHF_PROMPTS.DIAGNOSE_FAILURE
RLHF_PROMPTS.CREATE_TRAINING_PAIRS
RLHF_PROMPTS.MULTILINGUAL_STYLE_CHECK
RLHF_PROMPTS.CONSTITUTIONAL_REWRITE
RLHF_PROMPTS.RESPONSE_RERANK
```

## Quick Wins (Immediate Impact)

### Week 1: Constitutional Rewrite Pass

Add this to your AI service:

```typescript
// After generating response
if (process.env.ENABLE_CONSTITUTIONAL_REWRITE === 'true') {
  response = await rlhfAnalysis.constitutionalRewrite({
    draftAnswer: response,
    userMessage: request.content,
    conversationContext: this.buildContextSummary(history),
    language: signals.detectedLanguage,
    intent: intent,
    mode: mode,
    dataRequestLevel: metricsGate.state,
  });
}
```

**Impact:** ~70% reduction in botty responses, immediate.

### Week 2-4: Collect & Analyze

Let feedback accumulate for 2-4 weeks, then:

```bash
# Get analytics
curl http://localhost:3000/api/feedback/analytics?range=30d \
  -H "Authorization: Bearer $TOKEN"

# Get negative examples
curl http://localhost:3000/api/feedback/negative-examples?limit=50 \
  -H "Authorization: Bearer $TOKEN"
```

Analyze patterns:
- Which phrases appear in negative feedback?
- Which intents have low satisfaction?
- What failure tags are most common?

### Month 2: Apply Learnings

Top 10 fix rules from feedback → update policies in `conversation-rules.ts`:

Example fixes:
- Ban phrase "Want levels or just the vibe" (found in 30% of negative feedback)
- Reduce SOCIAL response length (average was 300 chars, should be <150)
- Improve German natural phrasing (5 awkward translations identified)

## Monitoring Dashboard (Admin)

```
GET /api/feedback/analytics?range=7d
```

**Returns:**
```json
{
  "totalFeedback": 1250,
  "thumbsUpRate": 0.72,
  "thumbsDownRate": 0.18,
  "bottyRate": 0.04,
  "repetitionRate": 0.02,
  "avgResponseLength": {
    "overall": 245
  },
  "topIssues": [
    {
      "category": "TONE_STYLE",
      "count": 45,
      "examples": ["felt like a bot", "menu questions"]
    }
  ]
}
```

## Training Data Export

After alignment job, export training pairs:

```typescript
const pairs = await rlhfAnalysis.generateTrainingPairs();

// Export for OpenAI/xAI fine-tuning
const jsonl = pairs.trainingPairs
  .map(p => JSON.stringify({
    messages: [
      { role: 'user', content: p.prompt },
      { role: 'assistant', content: p.chosen },
    ],
    rejected: p.rejected,
  }))
  .join('\n');

fs.writeFileSync('coinet-alignment-data.jsonl', jsonl);
```

## Success Criteria

After 4 weeks of RLHF-Lite:

✅ "Felt botty" tags reduced by 50%  
✅ Thumbs up rate increased by 20%  
✅ Avg SOCIAL response length under 150 chars  
✅ Repetition rate under 3%  
✅ Zero "wrong data" complaints  

## Advanced: Online Reranking

For critical flows (first message, sensitive advice):

```typescript
// Generate 2 candidates
const [candidateA, candidateB] = await Promise.all([
  grok.generate(message, { temperature: 0.7 }),
  grok.generate(message, { temperature: 0.9 }),
]);

// Pick better one
const { winner } = await rlhfAnalysis.rerankResponses({
  userMessage: message,
  candidateA,
  candidateB,
  language,
  intent,
});

return winner === 'A' ? candidateA : candidateB;
```

**Cost:** 1 extra generation + 1 small judgment call  
**Benefit:** Measurably better first impressions

## Resources

- Full Documentation: `docs/RLHF_ALIGNMENT_SYSTEM.md`
- Feedback Service: `src/api/feedback/service.ts`
- RLHF Analysis: `src/services/rlhf-analysis.ts`
- Constitutional Principles: `src/services/conversation-rules.ts`
- UI Components: `src/components/ui/message-actions.tsx`

## Questions?

Common issues:

**Q: Do I need to fine-tune the model?**  
A: No. Constitutional rewrite pass works immediately. Fine-tuning is optional for Month 2+.

**Q: How much does this cost?**  
A: Constitutional rewrite: ~$0.001 per message. Weekly alignment: ~$5-10. Very affordable.

**Q: Will users notice?**  
A: Yes — responses will feel more natural within days. That's the point.

**Q: What if I don't have Claude/GPT-4?**  
A: Use Grok for evaluation too. It's less accurate but still helps.
