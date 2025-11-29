import { NewsItem } from "../../types/news";

/**
 * Service for verifying and fact-checking news items
 * to ensure accuracy and trustworthiness
 */
export class VerificationService {
  private trustedSources: string[] = [
    "coindesk",
    "cointelegraph",
    "bloomberg",
    "wsj",
    "reuters",
    "theblock",
    "decrypt",
  ];

  private officialSources: string[] = [
    "bitcoin.org",
    "ethereum.org",
    "blog.coinbase.com",
    "binance.com",
    "kraken.com",
  ];

  private knownFakeNewsSources: string[] = [
    "cryptoscam.news",
    "bitcoinmanipulation.com",
    "fakenewscrypto.com",
  ];

  /**
   * Verify a batch of news items in parallel
   */
  public async verifyNewsBatch(newsItems: NewsItem[]): Promise<NewsItem[]> {
    // For a simplified implementation, we'll just return the news items
    // with basic verification flags based on source
    const verifiedNews = await Promise.all(
      newsItems.map((item) => this.verifyNewsItem(item)),
    );
    return verifiedNews;
  }

  /**
   * Verify a single news item
   */
  public async verifyNewsItem(item: NewsItem): Promise<NewsItem> {
    const sourceDomain = new URL(item.url).hostname;
    const isTrustedSource = this.trustedSources.some((source) =>
      sourceDomain.includes(source),
    );
    const isOfficialSource = this.officialSources.some((source) =>
      sourceDomain.includes(source),
    );

    // Simple verification based on source
    return {
      ...item,
      verified: isTrustedSource || isOfficialSource,
      verification_sources: isTrustedSource
        ? ["trusted_source_list"]
        : isOfficialSource
          ? ["official_entity"]
          : [],
    };
  }

  /**
   * Verify the source of a news item
   */
  private async verifySource(newsItem: NewsItem): Promise<{
    sourceVerified: boolean;
    reliabilityScore: number;
    verificationSources: string[];
  }> {
    // Check if source is in trusted sources list
    const sourceId = newsItem.source_id.toLowerCase();
    const sourceDomain = this.extractDomain(newsItem.url);

    const isTrustedSource =
      this.trustedSources.includes(sourceId) ||
      this.trustedSources.some((trusted) => sourceDomain.includes(trusted));

    const isOfficialSource =
      this.officialSources.includes(sourceId) ||
      this.officialSources.some((official) => sourceDomain.includes(official));

    const isFakeNewsSource =
      this.knownFakeNewsSources.includes(sourceId) ||
      this.knownFakeNewsSources.some((fake) => sourceDomain.includes(fake));

    // Calculate reliability score
    let reliabilityScore = 0.5; // Default neutral score

    if (isTrustedSource) reliabilityScore = 0.8;
    if (isOfficialSource) reliabilityScore = 0.9;
    if (isFakeNewsSource) reliabilityScore = 0.1;

    // Use the source's reliability if available and higher than calculated
    if (newsItem.impact && newsItem.impact.credibility > reliabilityScore) {
      reliabilityScore = newsItem.impact.credibility;
    }

    // Verification sources
    const verificationSources: string[] = [];
    if (isTrustedSource) verificationSources.push("Trusted News Source");
    if (isOfficialSource) verificationSources.push("Official Organization");

    return {
      sourceVerified: isTrustedSource || isOfficialSource,
      reliabilityScore,
      verificationSources,
    };
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const domain = new URL(url).hostname;
      return domain.startsWith("www.") ? domain.substring(4) : domain;
    } catch (e) {
      return url;
    }
  }

  /**
   * Verify the content of a news item for accuracy
   */
  private async verifyContent(newsItem: NewsItem): Promise<{
    contentVerified: boolean;
    accuracyScore: number;
    verificationSources: string[];
    disputedClaims: Array<{
      claim: string;
      refutation: string;
      source: string;
    }>;
  }> {
    // In a real implementation, this would use fact-checking APIs, NLP, etc.
    // For this demo, we'll do some basic checks and generate mock data

    const content = newsItem.content.toLowerCase();
    const title = newsItem.title.toLowerCase();

    // Check for suspicious language patterns
    const clickbaitTerms = [
      "shocking",
      "you won't believe",
      "surprising",
      "explosive",
      "secret",
      "revealed",
    ];
    const hasClickbaitTitle = clickbaitTerms.some((term) =>
      title.includes(term),
    );

    const extremeClaimTerms = [
      "guaranteed",
      "100%",
      "always",
      "never",
      "all",
      "none",
      "forever",
      "completely",
    ];
    const hasExtremeClaims = extremeClaimTerms.some((term) =>
      content.includes(term),
    );

    // Check for citation or reference markers
    const hasCitations =
      content.includes("according to") ||
      content.includes("reported by") ||
      content.includes("stated") ||
      content.includes("announced");

    // Calculate accuracy score
    let accuracyScore = 0.7; // Start with a reasonable default

    if (hasClickbaitTitle) accuracyScore -= 0.2;
    if (hasExtremeClaims) accuracyScore -= 0.1;
    if (hasCitations) accuracyScore += 0.2;

    // Clamp score between 0 and 1
    accuracyScore = Math.max(0, Math.min(1, accuracyScore));

    // Mock disputed claims for demonstration
    const disputedClaims: Array<{
      claim: string;
      refutation: string;
      source: string;
    }> = [];

    if (hasExtremeClaims && accuracyScore < 0.6) {
      disputedClaims.push({
        claim: "Contains unverifiable absolute claims",
        refutation:
          "Financial markets and cryptocurrency behavior cannot be predicted with absolute certainty",
        source: "Financial Analysis Standards",
      });
    }

    if (hasClickbaitTitle && accuracyScore < 0.5) {
      disputedClaims.push({
        claim: "Sensationalist headline not supported by content",
        refutation:
          "The article content does not provide evidence for the dramatic claims in the headline",
        source: "Journalism Ethics Guidelines",
      });
    }

    return {
      contentVerified: accuracyScore > 0.7,
      accuracyScore,
      verificationSources: hasCitations ? ["Content cites sources"] : [],
      disputedClaims,
    };
  }

  /**
   * Cross-reference news with other sources to validate
   */
  private async crossReferenceWithOtherSources(newsItem: NewsItem): Promise<{
    confirmationScore: number;
    verificationSources: string[];
    disputedClaims: Array<{
      claim: string;
      refutation: string;
      source: string;
    }>;
  }> {
    // In a real implementation, this would search for similar news in other sources
    // and compare the claims for validation
    // For this demo, we'll generate mock data

    // Mock confirmation level
    const confirmationLevel = Math.random();
    let confirmationScore = 0;
    const verificationSources: string[] = [];
    const disputedClaims: Array<{
      claim: string;
      refutation: string;
      source: string;
    }> = [];

    if (confirmationLevel > 0.8) {
      // High confirmation - multiple trusted sources report the same news
      confirmationScore = 0.9;
      verificationSources.push("Confirmed by multiple sources");
      verificationSources.push("Consistent with industry reports");
    } else if (confirmationLevel > 0.5) {
      // Medium confirmation - some sources report similar news
      confirmationScore = 0.7;
      verificationSources.push("Partially confirmed by other sources");
    } else if (confirmationLevel > 0.2) {
      // Low confirmation - only this source reports this news
      confirmationScore = 0.5;
    } else {
      // Contradicted by other sources
      confirmationScore = 0.3;
      disputedClaims.push({
        claim: "Information contradicted by other sources",
        refutation:
          "Multiple reputable sources contradict key aspects of this story",
        source: "Consensus Check",
      });
    }

    return {
      confirmationScore,
      verificationSources,
      disputedClaims,
    };
  }

  /**
   * Calculate overall accuracy score from multiple checks
   */
  private calculateAccuracyScore(
    sourceReliability: number,
    contentAccuracy: number,
    confirmationScore: number,
  ): number {
    // Weighted average of the different scores
    return (
      sourceReliability * 0.4 + contentAccuracy * 0.4 + confirmationScore * 0.2
    );
  }
}
