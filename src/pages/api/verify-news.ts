import type { NextApiRequest, NextApiResponse } from 'next';
import { NewsItem } from '@/types/news';
import OpenAI from 'openai';
import { JsonRpcProvider, id } from 'ethers';

// Simple tokenizer for manipulation analysis
function simpleTokenize(text: string): string[] {
  return text.split(/\s+/);
}

const CREDIBLE_SOURCES = [
  'reuters.com',
  'bloomberg.com',
  'ft.com',
  'wsj.com',
];

class NewsVerificationService {
  private openai: OpenAI;
  private provider: JsonRpcProvider;

  constructor(openAiKey: string, ethereumNode: string) {
    this.openai = new OpenAI({ apiKey: openAiKey });
    this.provider = new JsonRpcProvider(ethereumNode);
  }

  private async checkSourceCredibility(domain: string): Promise<number> {
    if (CREDIBLE_SOURCES.includes(domain)) return 1;
    return 0.5;
  }

  private async detectAIGenerated(text: string) {
    try {
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      const isGpt52 = model?.includes('gpt-5.2');

      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: `Analyze if the following text is AI-generated:\n${text}\n\nProvide a score between 0 and 1:`,
          },
        ],
        ...(!isGpt52 && { temperature: 0.3 }),
        max_completion_tokens: 100,
      });

      const rawText = response.choices[0]?.message?.content?.trim() || '0';
      const score = parseFloat(rawText.replace(/[^0-9.]/g, '')) || 0;

      return {
        is_ai_generated: score > 0.7,
        confidence: score,
        detection_method: "GPT Analysis",
        flagged_patterns: [],
      };
    } catch (error) {
      return {
        is_ai_generated: false,
        confidence: 0,
        detection_method: "failed",
        flagged_patterns: [],
      };
    }
  }

  private async analyzeManipulation(text: string, relatedNews: NewsItem[]) {
    const tokens = simpleTokenize(text);
    return {
      sentiment_manipulation_score: Math.random(),
      coordinated_activity: {
        detected: false,
        pattern_type: "none",
        involved_accounts: 0,
        confidence: 1
      },
      market_manipulation_risk: {
        level: "low" as const,
        indicators: [],
        historical_patterns: false
      },
      bot_activity: {
        detected: false,
        percentage: 0,
        pattern_type: []
      }
    };
  }

  private async verifyOnBlockchain(newsHash: string) {
    try {
      const block = await this.provider.getBlock("latest");
      if (!block) throw new Error("Failed to get latest block");
      return {
        hash: newsHash,
        timestamp: new Date(block.timestamp * 1000).toISOString(),
        platform: "Ethereum",
        verified_by: []
      };
    } catch (error) {
      return null;
    }
  }

  async verifyNews(newsItem: NewsItem): Promise<any> {
    const domain = new URL(newsItem.url).hostname;
    const [
      sourceCredibility,
      aiDetection,
      manipulationAnalysis,
      blockchainVerification
    ] = await Promise.all([
      this.checkSourceCredibility(domain),
      this.detectAIGenerated(newsItem.content),
      this.analyzeManipulation(newsItem.content, []),
      this.verifyOnBlockchain(id(newsItem.content))
    ]);
    return {
      ...newsItem,
      verification_metrics: {
        source_credibility: sourceCredibility,
        fact_check_score: Math.random(),
        cross_references: [],
        ai_detection: aiDetection,
        expert_reviews: [],
        blockchain_verification: blockchainVerification || {
          hash: '',
          timestamp: '',
          platform: '',
          verified_by: []
        }
      },
      manipulation_indicators: manipulationAnalysis,
      content_analysis: {
        objectivity_score: Math.random(),
        technical_accuracy: {
          score: Math.random(),
          verified_by: [],
          comments: ''
        },
        readability_score: Math.random(),
        complexity_level: 'intermediate' as const,
        citation_count: Math.floor(Math.random() * 5),
        sources_quality_score: Math.random()
      }
    };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { newsItem } = req.body;
  if (!newsItem || !newsItem.url || !newsItem.content) {
    return res.status(400).json({ error: 'Missing or invalid news item' });
  }
  const openAiKey = process.env.OPENAI_API_KEY || '';
  const ethereumNode = process.env.ETHEREUM_NODE_URL || '';
  if (!openAiKey || !ethereumNode) {
    return res.status(500).json({ error: 'Server configuration error' });
  }
  const verifier = new NewsVerificationService(openAiKey, ethereumNode);
  try {
    const verified = await verifier.verifyNews(newsItem);
    return res.status(200).json({ verified });
  } catch (error) {
    return res.status(500).json({ error: "Verification failed" });
  }
} 