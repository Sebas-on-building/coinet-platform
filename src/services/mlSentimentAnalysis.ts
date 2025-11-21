import * as tf from "@tensorflow/tfjs";
import * as tfn from "@tensorflow/tfjs-node";
import { SocialPost } from "./socialMedia";

export interface MLSentimentScore {
  score: number;
  confidence: number;
  language: string;
  predictions: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

export class MLSentimentAnalysisService {
  private static instance: MLSentimentAnalysisService;
  private model: tf.LayersModel | null = null;
  private tokenizer: any = null; // Will be loaded from saved model
  private readonly supportedLanguages = ["en", "es", "fr", "de", "it", "pt"];
  private readonly maxSequenceLength = 100;

  private constructor() {
    this.initializeModel();
  }

  public static getInstance(): MLSentimentAnalysisService {
    if (!MLSentimentAnalysisService.instance) {
      MLSentimentAnalysisService.instance = new MLSentimentAnalysisService();
    }
    return MLSentimentAnalysisService.instance;
  }

  private async initializeModel() {
    try {
      // Load the model and tokenizer
      this.model = await tf.loadLayersModel(
        "file://./models/sentiment_model/model.json",
      );
      this.tokenizer = await this.loadTokenizer();
    } catch (error) {
      console.error("Error loading ML model:", error);
      throw error;
    }
  }

  private async loadTokenizer() {
    try {
      // Load the tokenizer configuration from a JSON file
      const tokenizerConfig = await import(
        "../models/sentiment_model/tokenizer.json"
      );
      return tokenizerConfig;
    } catch (error) {
      console.error("Error loading tokenizer:", error);
      throw error;
    }
  }

  public async analyzeSentiment(
    text: string,
    language: string = "en",
  ): Promise<MLSentimentScore> {
    if (!this.supportedLanguages.includes(language)) {
      throw new Error(`Language ${language} is not supported`);
    }

    if (!this.model || !this.tokenizer) {
      throw new Error("Model or tokenizer not initialized");
    }

    try {
      // Preprocess the text
      const processedText = this.preprocessText(text);
      const tokenized = this.tokenizeText(processedText);

      // Convert to tensor and pad sequence
      const inputTensor = tf.tensor2d([tokenized], [1, this.maxSequenceLength]);

      // Get model predictions
      const predictions = (await this.model.predict(inputTensor)) as tf.Tensor;
      const [positive, negative, neutral] = Array.from(
        await predictions.data(),
      );

      // Calculate overall sentiment score (-1 to 1)
      const score = positive - negative;

      // Calculate confidence based on prediction distribution
      const confidence = Math.max(positive, negative, neutral);

      return {
        score,
        confidence,
        language,
        predictions: {
          positive,
          negative,
          neutral,
        },
      };
    } catch (error) {
      console.error("Error analyzing sentiment:", error);
      throw error;
    }
  }

  public async analyzeMultilingualPosts(posts: SocialPost[]): Promise<{
    posts: (SocialPost & { mlAnalysis: MLSentimentScore })[];
    aggregatedScore: number;
    languageBreakdown: Record<string, number>;
  }> {
    const analyzedPosts = await Promise.all(
      posts.map(async (post) => {
        const detectedLanguage = await this.detectLanguage(post.content);
        const mlAnalysis = await this.analyzeSentiment(
          post.content,
          detectedLanguage,
        );
        return { ...post, mlAnalysis };
      }),
    );

    // Calculate aggregated score
    const aggregatedScore =
      analyzedPosts.reduce(
        (acc, post) => acc + post.mlAnalysis.score * post.mlAnalysis.confidence,
        0,
      ) / posts.length;

    // Calculate language breakdown
    const languageBreakdown = analyzedPosts.reduce(
      (acc, post) => {
        const lang = post.mlAnalysis.language;
        acc[lang] = (acc[lang] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      posts: analyzedPosts,
      aggregatedScore,
      languageBreakdown,
    };
  }

  private preprocessText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private tokenizeText(text: string): number[] {
    // Convert text to token IDs using the loaded tokenizer
    const tokens = text
      .split(" ")
      .map(
        (word) =>
          this.tokenizer.wordIndex[word] || this.tokenizer.wordIndex["<UNK>"],
      );

    // Pad or truncate to maxSequenceLength
    return tokens.length > this.maxSequenceLength
      ? tokens.slice(0, this.maxSequenceLength)
      : [
          ...tokens,
          ...new Array(this.maxSequenceLength - tokens.length).fill(0),
        ];
  }

  private async detectLanguage(text: string): Promise<string> {
    try {
      // Use a language detection library or API
      // For now, returning 'en' as default
      return "en";
    } catch (error) {
      console.error("Error detecting language:", error);
      return "en";
    }
  }
}
