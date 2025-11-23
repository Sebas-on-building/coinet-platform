/**
 * Advanced NLP Processor - TypeScript Interface
 * Simplified version for the LLM Gateway
 */

export interface NLPAnalysisResult {
  entities: any[];
  confidence_scores: any;
  domain_concepts: any[];
  contextual_insights: any;
}

export class AdvancedNLPProcessor {
  async initialize(): Promise<void> {
    // Initialize would load models and prepare for processing
    console.log('AdvancedNLPProcessor initialized');
  }

  async analyzeText(text: string): Promise<NLPAnalysisResult> {
    // Simplified NLP analysis for the gateway
    return {
      entities: this.extractEntities(text),
      confidence_scores: { overall: 0.8 },
      domain_concepts: this.extractDomainConcepts(text),
      contextual_insights: this.generateContextualInsights(text)
    };
  }

  private extractEntities(text: string): any[] {
    // Simple entity extraction
    const entities = [];

    // Crypto entities
    const cryptoPatterns = [
      { pattern: /\$[A-Z]{2,10}/g, type: 'CRYPTOCURRENCY' },
      { pattern: /\bBitcoin\b/gi, type: 'CRYPTOCURRENCY' },
      { pattern: /\bEthereum\b/gi, type: 'CRYPTOCURRENCY' },
      { pattern: /\bBinance\b/gi, type: 'EXCHANGE' }
    ];

    for (const { pattern, type } of cryptoPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          entities.push({
            text: match,
            type,
            confidence: 0.8,
            start: text.indexOf(match),
            end: text.indexOf(match) + match.length
          });
        }
      }
    }

    return entities;
  }

  private extractDomainConcepts(text: string): any[] {
    const concepts = [];

    // Simple concept extraction
    const cryptoConcepts = ['blockchain', 'cryptocurrency', 'defi', 'nft'];
    const financeConcepts = ['market', 'trading', 'volatility', 'price'];
    const psychConcepts = ['fomo', 'fud', 'sentiment', 'bias'];

    for (const concept of [...cryptoConcepts, ...financeConcepts, ...psychConcepts]) {
      if (text.toLowerCase().includes(concept)) {
        concepts.push({
          name: concept,
          category: cryptoConcepts.includes(concept) ? 'crypto' :
                   financeConcepts.includes(concept) ? 'finance' : 'psychology',
          confidence: 0.7
        });
      }
    }

    return concepts;
  }

  private generateContextualInsights(text: string): any {
    return {
      domain: this.determineDomain(text),
      sentiment: this.analyzeSentiment(text),
      complexity: this.calculateComplexity(text),
      urgency: this.determineUrgency(text)
    };
  }

  private determineDomain(text: string): string {
    const cryptoTerms = ['bitcoin', 'ethereum', 'crypto', 'blockchain'];
    const financeTerms = ['market', 'trading', 'price', 'volatility'];
    const psychTerms = ['fomo', 'fud', 'sentiment', 'psychology'];

    let scores = { crypto: 0, finance: 0, psychology: 0 };

    for (const term of cryptoTerms) {
      if (text.toLowerCase().includes(term)) scores.crypto++;
    }
    for (const term of financeTerms) {
      if (text.toLowerCase().includes(term)) scores.finance++;
    }
    for (const term of psychTerms) {
      if (text.toLowerCase().includes(term)) scores.psychology++;
    }

    const maxScore = Math.max(scores.crypto, scores.finance, scores.psychology);
    if (maxScore === 0) return 'general';

    if (scores.crypto === maxScore) return 'cryptocurrency';
    if (scores.finance === maxScore) return 'finance';
    return 'psychology';
  }

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['bullish', 'good', 'great', 'positive', 'optimistic'];
    const negativeWords = ['bearish', 'bad', 'terrible', 'negative', 'pessimistic'];

    let positive = 0, negative = 0;

    for (const word of positiveWords) {
      if (text.toLowerCase().includes(word)) positive++;
    }
    for (const word of negativeWords) {
      if (text.toLowerCase().includes(word)) negative++;
    }

    if (positive > negative) return 'positive';
    if (negative > positive) return 'negative';
    return 'neutral';
  }

  private calculateComplexity(text: string): number {
    const words = text.split(' ').length;
    const sentences = text.split(/[.!?]+/).length;
    const uniqueWords = new Set(text.toLowerCase().split(' ')).size;

    const lengthFactor = Math.min(words / 100, 1);
    const diversityFactor = uniqueWords / words;
    const structureFactor = sentences > 1 ? 0.3 : 0.1;

    return Math.min(lengthFactor * 0.4 + diversityFactor * 0.4 + structureFactor, 1);
  }

  private determineUrgency(text: string): 'low' | 'medium' | 'high' {
    const urgentWords = ['urgent', 'now', 'immediately', 'asap', 'critical'];
    return urgentWords.some(word => text.toLowerCase().includes(word)) ? 'high' : 'medium';
  }
}
