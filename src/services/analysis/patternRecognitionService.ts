interface PricePoint {
  timestamp: string;
  price: number;
  volume: number;
}

interface Pattern {
  type: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  description: string;
  prediction: {
    direction: "up" | "down" | "sideways";
    target: number;
    stopLoss: number;
  };
}

interface HarmonicPattern extends Pattern {
  type: "Gartley" | "Butterfly" | "Bat" | "Crab" | "Shark";
  ratios: {
    XA: number;
    AB: number;
    BC: number;
    CD: number;
  };
}

export class PatternRecognitionService {
  private static instance: PatternRecognitionService;
  private readonly MIN_PATTERN_POINTS = 5;
  private readonly MAX_PATTERN_POINTS = 100;

  private constructor() {}

  public static getInstance(): PatternRecognitionService {
    if (!PatternRecognitionService.instance) {
      PatternRecognitionService.instance = new PatternRecognitionService();
    }
    return PatternRecognitionService.instance;
  }

  public findPatterns(data: PricePoint[]): Pattern[] {
    const patterns: Pattern[] = [];

    // Find double tops and bottoms
    patterns.push(...this.findDoublePatterns(data));

    // Find head and shoulders
    patterns.push(...this.findHeadAndShoulders(data));

    // Find triangles
    patterns.push(...this.findTriangles(data));

    // Find flags and pennants
    patterns.push(...this.findFlagsAndPennants(data));

    return patterns;
  }

  private findDoublePatterns(data: PricePoint[]): Pattern[] {
    const patterns: Pattern[] = [];
    const windowSize = 20;

    for (let i = windowSize; i < data.length - windowSize; i++) {
      const window = data.slice(i - windowSize, i + windowSize);
      const peaks = this.findPeaks(window);

      if (peaks.length >= 2) {
        const peak1 = peaks[0];
        const peak2 = peaks[1];

        // Check for double top
        if (this.isDoubleTop(window, peak1, peak2)) {
          patterns.push({
            type: "double_top",
            confidence: this.calculateConfidence(window, peak1, peak2),
            startIndex: i - windowSize + peak1,
            endIndex: i - windowSize + peak2,
            description: "Double Top Pattern",
            prediction: {
              direction: "down",
              target: this.calculateTarget(window, peak2, "down"),
              stopLoss: this.calculateStopLoss(window, peak2, "down"),
            },
          });
        }

        // Check for double bottom
        if (this.isDoubleBottom(window, peak1, peak2)) {
          patterns.push({
            type: "double_bottom",
            confidence: this.calculateConfidence(window, peak1, peak2),
            startIndex: i - windowSize + peak1,
            endIndex: i - windowSize + peak2,
            description: "Double Bottom Pattern",
            prediction: {
              direction: "up",
              target: this.calculateTarget(window, peak2, "up"),
              stopLoss: this.calculateStopLoss(window, peak2, "up"),
            },
          });
        }
      }
    }

    return patterns;
  }

  private findHeadAndShoulders(data: PricePoint[]): Pattern[] {
    const patterns: Pattern[] = [];
    const windowSize = 30;

    for (let i = windowSize; i < data.length - windowSize; i++) {
      const window = data.slice(i - windowSize, i + windowSize);
      const peaks = this.findPeaks(window);

      if (peaks.length >= 3) {
        const leftShoulder = peaks[0];
        const head = peaks[1];
        const rightShoulder = peaks[2];

        if (
          this.isHeadAndShoulders(window, leftShoulder, head, rightShoulder)
        ) {
          patterns.push({
            type: "head_and_shoulders",
            confidence: this.calculateConfidence(
              window,
              leftShoulder,
              rightShoulder,
            ),
            startIndex: i - windowSize + leftShoulder,
            endIndex: i - windowSize + rightShoulder,
            description: "Head and Shoulders Pattern",
            prediction: {
              direction: "down",
              target: this.calculateTarget(window, rightShoulder, "down"),
              stopLoss: this.calculateStopLoss(window, rightShoulder, "down"),
            },
          });
        }
      }
    }

    return patterns;
  }

  private findTriangles(data: PricePoint[]): Pattern[] {
    const patterns: Pattern[] = [];
    const windowSize = 20;

    for (let i = windowSize; i < data.length - windowSize; i++) {
      const window = data.slice(i - windowSize, i + windowSize);
      const upperTrendline = this.calculateUpperTrendline(window);
      const lowerTrendline = this.calculateLowerTrendline(window);

      if (this.isTriangle(upperTrendline, lowerTrendline)) {
        patterns.push({
          type: "triangle",
          confidence: this.calculateTriangleConfidence(
            upperTrendline,
            lowerTrendline,
          ),
          startIndex: i - windowSize,
          endIndex: i + windowSize,
          description: "Triangle Pattern",
          prediction: {
            direction: this.predictTriangleDirection(
              upperTrendline,
              lowerTrendline,
            ),
            target: this.calculateTriangleTarget(
              window,
              upperTrendline,
              lowerTrendline,
            ),
            stopLoss: this.calculateTriangleStopLoss(
              window,
              upperTrendline,
              lowerTrendline,
            ),
          },
        });
      }
    }

    return patterns;
  }

  private findFlagsAndPennants(data: PricePoint[]): Pattern[] {
    const patterns: Pattern[] = [];
    const windowSize = 15;

    for (let i = windowSize; i < data.length - windowSize; i++) {
      const window = data.slice(i - windowSize, i + windowSize);
      const trend = this.calculateTrend(window);

      if (this.isFlag(window, trend)) {
        patterns.push({
          type: "flag",
          confidence: this.calculateFlagConfidence(window, trend),
          startIndex: i - windowSize,
          endIndex: i + windowSize,
          description: "Flag Pattern",
          prediction: {
            direction: trend > 0 ? "up" : "down",
            target: this.calculateFlagTarget(window, trend),
            stopLoss: this.calculateFlagStopLoss(window, trend),
          },
        });
      }

      if (this.isPennant(window, trend)) {
        patterns.push({
          type: "pennant",
          confidence: this.calculatePennantConfidence(window, trend),
          startIndex: i - windowSize,
          endIndex: i + windowSize,
          description: "Pennant Pattern",
          prediction: {
            direction: trend > 0 ? "up" : "down",
            target: this.calculatePennantTarget(window, trend),
            stopLoss: this.calculatePennantStopLoss(window, trend),
          },
        });
      }
    }

    return patterns;
  }

  findHarmonicPatterns(prices: PricePoint[]): HarmonicPattern[] {
    const patterns: HarmonicPattern[] = [];
    const swingPoints = this.findSwingPoints(prices);

    for (let i = 0; i < swingPoints.length - 4; i++) {
      const X = swingPoints[i];
      const A = swingPoints[i + 1];
      const B = swingPoints[i + 2];
      const C = swingPoints[i + 3];
      const D = swingPoints[i + 4];

      const ratios = this.calculateHarmonicRatios(X, A, B, C, D);
      const pattern = this.identifyHarmonicPattern(ratios);

      if (pattern) {
        patterns.push({
          type: pattern,
          confidence: this.calculateHarmonicConfidence(ratios, pattern),
          startIndex: i,
          endIndex: i + 4,
          description: `Harmonic ${pattern} pattern detected`,
          prediction: this.calculateHarmonicPrediction(pattern, D.price),
          ratios,
        });
      }
    }

    return patterns;
  }

  // Helper methods
  private findPeaks(data: PricePoint[]): number[] {
    const peaks: number[] = [];
    for (let i = 2; i < data.length - 2; i++) {
      if (
        data[i].price > data[i - 1].price &&
        data[i].price > data[i + 1].price
      ) {
        peaks.push(i);
      }
    }
    return peaks;
  }

  private isDoubleTop(
    data: PricePoint[],
    peak1: number,
    peak2: number,
  ): boolean {
    const price1 = data[peak1].price;
    const price2 = data[peak2].price;
    const threshold = 0.02; // 2% threshold

    return Math.abs(price1 - price2) / price1 < threshold;
  }

  private isDoubleBottom(
    data: PricePoint[],
    peak1: number,
    peak2: number,
  ): boolean {
    const price1 = data[peak1].price;
    const price2 = data[peak2].price;
    const threshold = 0.02; // 2% threshold

    return Math.abs(price1 - price2) / price1 < threshold;
  }

  private isHeadAndShoulders(
    data: PricePoint[],
    leftShoulder: number,
    head: number,
    rightShoulder: number,
  ): boolean {
    const leftPrice = data[leftShoulder].price;
    const headPrice = data[head].price;
    const rightPrice = data[rightShoulder].price;
    const threshold = 0.02; // 2% threshold

    return (
      headPrice > leftPrice &&
      headPrice > rightPrice &&
      Math.abs(leftPrice - rightPrice) / leftPrice < threshold
    );
  }

  private calculateConfidence(
    data: PricePoint[],
    peak1: number,
    peak2: number,
  ): number {
    // Implement confidence calculation based on pattern characteristics
    return 0.8; // Placeholder
  }

  private calculateTarget(
    data: PricePoint[],
    peak: number,
    direction: "up" | "down",
  ): number {
    const patternHeight = Math.abs(
      data[peak].price - Math.min(...data.map((d) => d.price)),
    );
    return direction === "up"
      ? data[peak].price + patternHeight
      : data[peak].price - patternHeight;
  }

  private calculateStopLoss(
    data: PricePoint[],
    peak: number,
    direction: "up" | "down",
  ): number {
    const patternHeight = Math.abs(
      data[peak].price - Math.min(...data.map((d) => d.price)),
    );
    return direction === "up"
      ? data[peak].price - patternHeight * 0.5
      : data[peak].price + patternHeight * 0.5;
  }

  // Additional helper methods for triangles, flags, and pennants
  private calculateUpperTrendline(data: PricePoint[]): number[] {
    // Implement upper trendline calculation
    return [];
  }

  private calculateLowerTrendline(data: PricePoint[]): number[] {
    // Implement lower trendline calculation
    return [];
  }

  private isTriangle(
    upperTrendline: number[],
    lowerTrendline: number[],
  ): boolean {
    // Implement triangle pattern detection
    return false;
  }

  private calculateTriangleConfidence(
    upperTrendline: number[],
    lowerTrendline: number[],
  ): number {
    // Implement triangle confidence calculation
    return 0.8;
  }

  private predictTriangleDirection(
    upperTrendline: number[],
    lowerTrendline: number[],
  ): "up" | "down" | "sideways" {
    // Implement triangle direction prediction
    return "sideways";
  }

  private calculateTriangleTarget(
    data: PricePoint[],
    upperTrendline: number[],
    lowerTrendline: number[],
  ): number {
    // Implement triangle target calculation
    return 0;
  }

  private calculateTriangleStopLoss(
    data: PricePoint[],
    upperTrendline: number[],
    lowerTrendline: number[],
  ): number {
    // Implement triangle stop loss calculation
    return 0;
  }

  private calculateTrend(data: PricePoint[]): number {
    // Implement trend calculation
    return 0;
  }

  private isFlag(data: PricePoint[], trend: number): boolean {
    // Implement flag pattern detection
    return false;
  }

  private calculateFlagConfidence(data: PricePoint[], trend: number): number {
    // Implement flag confidence calculation
    return 0.8;
  }

  private calculateFlagTarget(data: PricePoint[], trend: number): number {
    // Implement flag target calculation
    return 0;
  }

  private calculateFlagStopLoss(data: PricePoint[], trend: number): number {
    // Implement flag stop loss calculation
    return 0;
  }

  private isPennant(data: PricePoint[], trend: number): boolean {
    // Implement pennant pattern detection
    return false;
  }

  private calculatePennantConfidence(
    data: PricePoint[],
    trend: number,
  ): number {
    // Implement pennant confidence calculation
    return 0.8;
  }

  private calculatePennantTarget(data: PricePoint[], trend: number): number {
    // Implement pennant target calculation
    return 0;
  }

  private calculatePennantStopLoss(data: PricePoint[], trend: number): number {
    // Implement pennant stop loss calculation
    return 0;
  }

  private calculateHarmonicRatios(
    X: PricePoint,
    A: PricePoint,
    B: PricePoint,
    C: PricePoint,
    D: PricePoint,
  ) {
    const XA = Math.abs(A.price - X.price);
    const AB = Math.abs(B.price - A.price);
    const BC = Math.abs(C.price - B.price);
    const CD = Math.abs(D.price - C.price);

    return {
      XA: 1,
      AB: AB / XA,
      BC: BC / AB,
      CD: CD / BC,
    };
  }

  private identifyHarmonicPattern(ratios: {
    XA: number;
    AB: number;
    BC: number;
    CD: number;
  }): HarmonicPattern["type"] | null {
    // Gartley Pattern
    if (
      this.isInRange(ratios.AB, 0.618, 0.786) &&
      this.isInRange(ratios.BC, 0.382, 0.886) &&
      this.isInRange(ratios.CD, 1.272, 1.618)
    ) {
      return "Gartley";
    }

    // Butterfly Pattern
    if (
      this.isInRange(ratios.AB, 0.786, 0.886) &&
      this.isInRange(ratios.BC, 0.382, 0.886) &&
      this.isInRange(ratios.CD, 1.618, 2.618)
    ) {
      return "Butterfly";
    }

    // Bat Pattern
    if (
      this.isInRange(ratios.AB, 0.382, 0.5) &&
      this.isInRange(ratios.BC, 0.382, 0.886) &&
      this.isInRange(ratios.CD, 1.618, 2.618)
    ) {
      return "Bat";
    }

    // Crab Pattern
    if (
      this.isInRange(ratios.AB, 0.382, 0.618) &&
      this.isInRange(ratios.BC, 0.382, 0.886) &&
      this.isInRange(ratios.CD, 2.618, 3.618)
    ) {
      return "Crab";
    }

    // Shark Pattern
    if (
      this.isInRange(ratios.AB, 0.5, 0.618) &&
      this.isInRange(ratios.BC, 1.13, 1.618) &&
      this.isInRange(ratios.CD, 1.618, 2.24)
    ) {
      return "Shark";
    }

    return null;
  }

  private isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  }

  private calculateHarmonicConfidence(
    ratios: { XA: number; AB: number; BC: number; CD: number },
    pattern: HarmonicPattern["type"],
  ): number {
    let confidence = 0;
    const idealRatios = this.getIdealHarmonicRatios(pattern);

    // Calculate confidence based on how close the ratios are to ideal values
    confidence += this.calculateRatioConfidence(ratios.AB, idealRatios.AB);
    confidence += this.calculateRatioConfidence(ratios.BC, idealRatios.BC);
    confidence += this.calculateRatioConfidence(ratios.CD, idealRatios.CD);

    return confidence / 3;
  }

  private getIdealHarmonicRatios(pattern: HarmonicPattern["type"]): {
    AB: number;
    BC: number;
    CD: number;
  } {
    switch (pattern) {
      case "Gartley":
        return { AB: 0.618, BC: 0.618, CD: 1.272 };
      case "Butterfly":
        return { AB: 0.786, BC: 0.618, CD: 1.618 };
      case "Bat":
        return { AB: 0.382, BC: 0.618, CD: 1.618 };
      case "Crab":
        return { AB: 0.618, BC: 0.618, CD: 2.618 };
      case "Shark":
        return { AB: 0.618, BC: 1.13, CD: 1.618 };
    }
  }

  private calculateRatioConfidence(actual: number, ideal: number): number {
    const difference = Math.abs(actual - ideal);
    return Math.max(0, 1 - difference / ideal);
  }

  private calculateHarmonicPrediction(
    pattern: HarmonicPattern["type"],
    currentPrice: number,
  ): { direction: "up" | "down"; target: number; stopLoss: number } {
    const direction =
      pattern === "Gartley" || pattern === "Butterfly" ? "down" : "up";
    const target = currentPrice * (direction === "up" ? 1.618 : 0.618);
    const stopLoss = currentPrice * (direction === "up" ? 0.618 : 1.618);

    return { direction, target, stopLoss };
  }

  private findSwingPoints(prices: PricePoint[]): PricePoint[] {
    const swingPoints: PricePoint[] = [];
    const volatilityThreshold = this.calculateVolatilityThreshold(prices);

    for (let i = 1; i < prices.length - 1; i++) {
      if (
        this.isSwingHigh(prices, i, volatilityThreshold) ||
        this.isSwingLow(prices, i, volatilityThreshold)
      ) {
        swingPoints.push(prices[i]);
      }
    }

    return swingPoints;
  }

  private calculateVolatilityThreshold(prices: PricePoint[]): number {
    const returns = prices
      .slice(1)
      .map(
        (price, i) => Math.abs(price.price - prices[i].price) / prices[i].price,
      );
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    return avgReturn * 2; // Adjust multiplier as needed
  }

  private isSwingHigh(
    prices: PricePoint[],
    index: number,
    threshold: number,
  ): boolean {
    const current = prices[index];
    const left = prices[index - 1];
    const right = prices[index + 1];

    return (
      current.price > left.price &&
      current.price > right.price &&
      Math.abs(current.price - left.price) > threshold &&
      Math.abs(current.price - right.price) > threshold
    );
  }

  private isSwingLow(
    prices: PricePoint[],
    index: number,
    threshold: number,
  ): boolean {
    const current = prices[index];
    const left = prices[index - 1];
    const right = prices[index + 1];

    return (
      current.price < left.price &&
      current.price < right.price &&
      Math.abs(current.price - left.price) > threshold &&
      Math.abs(current.price - right.price) > threshold
    );
  }
}
