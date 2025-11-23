export interface MetricLabels {
  [key: string]: string;
}

export class MetricsCollector {
  private static instance: MetricsCollector;
  private counters: Map<string, Map<string, number>> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private gauges: Map<string, number> = new Map();

  private constructor() { }

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  incrementCounter(name: string, labels: MetricLabels = {}): void {
    const labelKey = this.serializeLabels(labels);

    if (!this.counters.has(name)) {
      this.counters.set(name, new Map());
    }

    const counter = this.counters.get(name)!;
    const currentValue = counter.get(labelKey) || 0;
    counter.set(labelKey, currentValue + 1);
  }

  recordHistogram(name: string, value: number): void {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, []);
    }

    const histogram = this.histograms.get(name)!;
    histogram.push(value);

    // Keep only last 1000 values
    if (histogram.length > 1000) {
      histogram.shift();
    }
  }

  setGauge(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  getCounterValue(name: string, labels: MetricLabels = {}): number {
    const labelKey = this.serializeLabels(labels);
    const counter = this.counters.get(name);
    return counter?.get(labelKey) || 0;
  }

  getHistogramStats(name: string): { min: number; max: number; avg: number; count: number } | null {
    const histogram = this.histograms.get(name);
    if (!histogram || histogram.length === 0) {
      return null;
    }

    const min = Math.min(...histogram);
    const max = Math.max(...histogram);
    const avg = histogram.reduce((a, b) => a + b, 0) / histogram.length;
    const count = histogram.length;

    return { min, max, avg, count };
  }

  getGaugeValue(name: string): number | null {
    return this.gauges.get(name) || null;
  }

  getAllMetrics(): {
    counters: Record<string, Record<string, number>>;
    histograms: Record<string, number[]>;
    gauges: Record<string, number>;
  } {
    return {
      counters: Object.fromEntries(
        Array.from(this.counters.entries()).map(([name, counter]) => [
          name,
          Object.fromEntries(counter)
        ])
      ),
      histograms: Object.fromEntries(this.histograms),
      gauges: Object.fromEntries(this.gauges)
    };
  }

  reset(): void {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
  }

  private serializeLabels(labels: MetricLabels): string {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join(',');
  }
} 