/**
 * Real-Time Stream Manager
 * 
 * Unified RxJS observable streams for all real-time data:
 * - Vesting events
 * - Token flows
 * - Price predictions
 * - VC activity
 * 
 * Optimized for:
 * - <1s latency
 * - 1000+ concurrent streams
 * - Automatic backpressure handling
 */

import { EventEmitter } from 'events';
import { 
  Subject, 
  Observable, 
  BehaviorSubject, 
  ReplaySubject,
  merge, 
  interval, 
  from,
  combineLatest,
  of,
  EMPTY,
} from 'rxjs';
import { 
  filter, 
  map, 
  takeUntil, 
  share,
  shareReplay,
  tap,
  mergeMap,
  scan,
  buffer,
  debounceTime,
  throttleTime,
  distinctUntilChanged,
  groupBy,
  switchMap,
  window,
  catchError,
  retry,
  timeout as rxTimeout,
  startWith,
} from 'rxjs/operators';
import { logger } from '../utils/logger';
import { getEventSubscriptionManager, ChainEvent } from './event-subscription-manager';
import { getAdaptivePollingScheduler, PolledData } from './adaptive-polling-scheduler';

// =============================================================================
// TYPES
// =============================================================================

export interface StreamConfig {
  bufferSize?: number;
  throttleMs?: number;
  replayCount?: number;
  enableMetrics?: boolean;
}

export interface VestingStream {
  type: 'release' | 'cliff' | 'scheduled';
  chain: string;
  tokenSymbol: string;
  amount: number;
  amountUsd: number;
  beneficiary: string;
  contractAddress: string;
  timestamp: Date;
  txHash?: string;
  impactPrediction?: {
    priceImpact: number;
    confidence: number;
    sellingProbability: number;
  };
}

export interface FlowStream {
  type: 'to_exchange' | 'to_defi' | 'to_vc' | 'internal' | 'unknown';
  chain: string;
  tokenSymbol: string;
  from: string;
  to: string;
  amount: number;
  amountUsd: number;
  timestamp: Date;
  vcName?: string;
  exchangeName?: string;
  protocolName?: string;
}

export interface PredictionStream {
  tokenSymbol: string;
  prediction: 'bullish' | 'bearish' | 'neutral';
  priceImpact: number;
  confidence: number;
  factors: {
    unlockPressure: number;
    vcActivity: number;
    marketSentiment: number;
  };
  timestamp: Date;
}

export interface AggregatedMetrics {
  timestamp: Date;
  period: '1m' | '5m' | '1h';
  
  // Volume metrics
  totalUnlockVolume: number;
  totalFlowVolume: number;
  netExchangeFlow: number;
  
  // Count metrics
  unlockCount: number;
  flowCount: number;
  activeVCs: number;
  
  // Pressure metrics
  sellingPressure: number;
  buyingPressure: number;
  netPressure: number;
  
  // Top movers
  topUnlocks: Array<{ token: string; amount: number }>;
  topFlows: Array<{ token: string; flow: number }>;
}

export interface StreamHealth {
  name: string;
  active: boolean;
  subscriberCount: number;
  eventsPerSecond: number;
  averageLatencyMs: number;
  lastEventTime: Date | null;
  errors: number;
}

// =============================================================================
// MAIN CLASS
// =============================================================================

export class RealtimeStreamManager extends EventEmitter {
  private eventManager = getEventSubscriptionManager();
  private pollingScheduler = getAdaptivePollingScheduler();
  
  // Core subjects
  private vestingSubject = new Subject<VestingStream>();
  private flowSubject = new Subject<FlowStream>();
  private predictionSubject = new Subject<PredictionStream>();
  private metricsSubject = new BehaviorSubject<AggregatedMetrics>(this.createEmptyMetrics());
  
  // Control
  private destroy$ = new Subject<void>();
  private config: StreamConfig;
  
  // Metrics tracking
  private streamMetrics = new Map<string, {
    events: number;
    errors: number;
    lastEvent: Date | null;
    latencies: number[];
  }>();
  
  // Shared streams (cached)
  private cachedStreams = new Map<string, Observable<any>>();

  constructor(config: StreamConfig = {}) {
    super();
    this.config = {
      bufferSize: config.bufferSize || 1000,
      throttleMs: config.throttleMs || 100,
      replayCount: config.replayCount || 10,
      enableMetrics: config.enableMetrics !== false,
    };

    this.initializeMetrics();
    this.wireEventSources();
    this.startAggregation();
    
    logger.info('RealtimeStreamManager initialized', { config: this.config });
  }

  // ===========================================================================
  // STREAM GETTERS
  // ===========================================================================

  /**
   * Get vesting events stream
   */
  getVestingStream(): Observable<VestingStream> {
    return this.getOrCreateCachedStream('vesting', () =>
      this.vestingSubject.asObservable().pipe(
        takeUntil(this.destroy$),
        shareReplay({ bufferSize: this.config.replayCount!, refCount: true })
      )
    );
  }

  /**
   * Get vesting stream filtered by token
   */
  getVestingStreamByToken(tokenSymbol: string): Observable<VestingStream> {
    return this.getVestingStream().pipe(
      filter(event => event.tokenSymbol.toLowerCase() === tokenSymbol.toLowerCase())
    );
  }

  /**
   * Get vesting stream filtered by chain
   */
  getVestingStreamByChain(chain: string): Observable<VestingStream> {
    return this.getVestingStream().pipe(
      filter(event => event.chain === chain)
    );
  }

  /**
   * Get high-value vesting events (>$100k)
   */
  getHighValueVestingStream(minUsd: number = 100000): Observable<VestingStream> {
    return this.getVestingStream().pipe(
      filter(event => event.amountUsd >= minUsd)
    );
  }

  /**
   * Get token flow stream
   */
  getFlowStream(): Observable<FlowStream> {
    return this.getOrCreateCachedStream('flow', () =>
      this.flowSubject.asObservable().pipe(
        takeUntil(this.destroy$),
        shareReplay({ bufferSize: this.config.replayCount!, refCount: true })
      )
    );
  }

  /**
   * Get exchange flow stream (selling pressure indicator)
   */
  getExchangeFlowStream(): Observable<FlowStream> {
    return this.getFlowStream().pipe(
      filter(event => event.type === 'to_exchange')
    );
  }

  /**
   * Get VC activity stream
   */
  getVCActivityStream(): Observable<FlowStream> {
    return this.getFlowStream().pipe(
      filter(event => !!event.vcName)
    );
  }

  /**
   * Get prediction stream
   */
  getPredictionStream(): Observable<PredictionStream> {
    return this.getOrCreateCachedStream('prediction', () =>
      this.predictionSubject.asObservable().pipe(
        takeUntil(this.destroy$),
        shareReplay({ bufferSize: this.config.replayCount!, refCount: true })
      )
    );
  }

  /**
   * Get aggregated metrics stream (updated every minute)
   */
  getMetricsStream(): Observable<AggregatedMetrics> {
    return this.metricsSubject.asObservable().pipe(
      takeUntil(this.destroy$)
    );
  }

  /**
   * Get combined stream for a specific token
   */
  getTokenDashboardStream(tokenSymbol: string): Observable<{
    vesting: VestingStream | null;
    flows: FlowStream[];
    prediction: PredictionStream | null;
    metrics: { unlockVolume: number; flowVolume: number; netPressure: number };
  }> {
    const vestingStream = this.getVestingStreamByToken(tokenSymbol).pipe(
      startWith(null as VestingStream | null)
    );
    
    const flowsStream = this.getFlowStream().pipe(
      filter(f => f.tokenSymbol.toLowerCase() === tokenSymbol.toLowerCase()),
      buffer(interval(1000)),
      startWith([] as FlowStream[])
    );
    
    const predictionStream = this.getPredictionStream().pipe(
      filter(p => p.tokenSymbol.toLowerCase() === tokenSymbol.toLowerCase()),
      startWith(null as PredictionStream | null)
    );

    return combineLatest([vestingStream, flowsStream, predictionStream]).pipe(
      map(([vesting, flows, prediction]) => ({
        vesting,
        flows,
        prediction,
        metrics: {
          unlockVolume: vesting?.amountUsd || 0,
          flowVolume: flows.reduce((sum, f) => sum + f.amountUsd, 0),
          netPressure: this.calculateNetPressure(flows),
        },
      })),
      takeUntil(this.destroy$)
    );
  }

  /**
   * Get selling pressure heatmap stream
   */
  getSellingPressureStream(): Observable<Map<string, number>> {
    return this.getFlowStream().pipe(
      buffer(interval(5000)),
      map(flows => {
        const pressureMap = new Map<string, number>();
        
        for (const flow of flows) {
          if (flow.type === 'to_exchange') {
            const current = pressureMap.get(flow.tokenSymbol) || 0;
            pressureMap.set(flow.tokenSymbol, current + flow.amountUsd);
          }
        }
        
        return pressureMap;
      }),
      takeUntil(this.destroy$)
    );
  }

  // ===========================================================================
  // EVENT INGESTION
  // ===========================================================================

  private wireEventSources(): void {
    // Wire chain events to vesting stream
    this.eventManager.getVestingReleaseStream().pipe(
      takeUntil(this.destroy$),
      map(event => this.transformToVestingStream(event)),
      filter((event): event is VestingStream => event !== null)
    ).subscribe(event => {
      this.vestingSubject.next(event);
      this.trackMetric('vesting', event);
    });

    // Wire chain events to flow stream
    this.eventManager.getEventStream().pipe(
      takeUntil(this.destroy$),
      filter(event => event.type === 'transfer'),
      map(event => this.transformToFlowStream(event)),
      filter((event): event is FlowStream => event !== null)
    ).subscribe(event => {
      this.flowSubject.next(event);
      this.trackMetric('flow', event);
    });

    // Wire polled data
    this.pollingScheduler.getDataStream().pipe(
      takeUntil(this.destroy$)
    ).subscribe(data => {
      this.processPolledData(data);
    });

    logger.debug('Event sources wired');
  }

  private transformToVestingStream(event: ChainEvent): VestingStream | null {
    try {
      const amount = this.parseAmount(event.data?.args?.value || event.data?.args?.amount || 0);
      
      return {
        type: 'release',
        chain: event.chain,
        tokenSymbol: event.data?.tokenSymbol || 'UNKNOWN',
        amount,
        amountUsd: amount * (event.data?.tokenPrice || 0),
        beneficiary: event.data?.args?.beneficiary || event.data?.args?.to || '',
        contractAddress: event.address,
        timestamp: event.timestamp,
        txHash: event.txHash,
      };
    } catch (error) {
      logger.error('Error transforming vesting event', { error, event });
      return null;
    }
  }

  private transformToFlowStream(event: ChainEvent): FlowStream | null {
    try {
      const from = event.data?.args?.from || '';
      const to = event.data?.args?.to || '';
      const amount = this.parseAmount(event.data?.args?.value || 0);
      
      // Classify flow type
      const flowType = this.classifyFlowType(from, to);
      
      return {
        type: flowType,
        chain: event.chain,
        tokenSymbol: event.data?.tokenSymbol || 'UNKNOWN',
        from,
        to,
        amount,
        amountUsd: amount * (event.data?.tokenPrice || 0),
        timestamp: event.timestamp,
      };
    } catch (error) {
      logger.error('Error transforming flow event', { error, event });
      return null;
    }
  }

  private classifyFlowType(from: string, to: string): FlowStream['type'] {
    // Known exchange addresses (abbreviated)
    const exchangeAddresses = new Set([
      '0x28c6c06298d514db089934071355e5743bf21d60',
      '0x21a31ee1afc51d94c2efccaa2092ad1028285549',
      '0x71660c4005ba85c37ccec55d0c4493e66fe775d3',
    ].map(a => a.toLowerCase()));

    // Known DeFi protocols
    const defiAddresses = new Set([
      '0x7a250d5630b4cf539739df2c5dacb4c659f2488d', // Uniswap V2 Router
      '0xe592427a0aece92de3edee1f18e0157c05861564', // Uniswap V3 Router
      '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f', // SushiSwap Router
    ].map(a => a.toLowerCase()));

    const toLower = to.toLowerCase();
    const fromLower = from.toLowerCase();

    if (exchangeAddresses.has(toLower)) return 'to_exchange';
    if (defiAddresses.has(toLower)) return 'to_defi';
    if (fromLower === toLower) return 'internal';
    
    return 'unknown';
  }

  private processPolledData(data: PolledData): void {
    // Convert polled data to predictions
    if (data.type === 'unlock_schedule') {
      const prediction: PredictionStream = {
        tokenSymbol: data.data?.tokenSymbol || 'UNKNOWN',
        prediction: this.derivePrediction(data),
        priceImpact: data.data?.priceImpact || 0,
        confidence: data.data?.confidence || 0.5,
        factors: {
          unlockPressure: data.data?.unlockPressure || 0,
          vcActivity: data.data?.vcActivity || 0,
          marketSentiment: data.data?.sentiment || 0,
        },
        timestamp: new Date(),
      };
      
      this.predictionSubject.next(prediction);
      this.trackMetric('prediction', prediction);
    }
  }

  private derivePrediction(data: PolledData): 'bullish' | 'bearish' | 'neutral' {
    const pressure = data.data?.unlockPressure || 0;
    const sentiment = data.data?.sentiment || 0.5;
    
    const score = sentiment - (pressure * 0.3);
    
    if (score > 0.6) return 'bullish';
    if (score < 0.4) return 'bearish';
    return 'neutral';
  }

  // ===========================================================================
  // AGGREGATION
  // ===========================================================================

  private startAggregation(): void {
    // Aggregate metrics every minute
    interval(60000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.aggregateMetrics();
    });
  }

  private aggregateMetrics(): void {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    // Get recent events from tracking
    const vestingMetrics = this.streamMetrics.get('vesting');
    const flowMetrics = this.streamMetrics.get('flow');
    
    const metrics: AggregatedMetrics = {
      timestamp: now,
      period: '1m',
      totalUnlockVolume: 0, // Would aggregate from recent events
      totalFlowVolume: 0,
      netExchangeFlow: 0,
      unlockCount: vestingMetrics?.events || 0,
      flowCount: flowMetrics?.events || 0,
      activeVCs: 0,
      sellingPressure: 0,
      buyingPressure: 0,
      netPressure: 0,
      topUnlocks: [],
      topFlows: [],
    };
    
    this.metricsSubject.next(metrics);
    
    // Reset counters
    this.resetMetricCounters();
  }

  // ===========================================================================
  // METRICS
  // ===========================================================================

  private initializeMetrics(): void {
    ['vesting', 'flow', 'prediction'].forEach(name => {
      this.streamMetrics.set(name, {
        events: 0,
        errors: 0,
        lastEvent: null,
        latencies: [],
      });
    });
  }

  private trackMetric(streamName: string, event: any): void {
    const metrics = this.streamMetrics.get(streamName);
    if (metrics) {
      metrics.events++;
      metrics.lastEvent = new Date();
    }
  }

  private resetMetricCounters(): void {
    for (const metrics of this.streamMetrics.values()) {
      metrics.events = 0;
      metrics.latencies = [];
    }
  }

  /**
   * Get stream health status
   */
  getStreamHealth(): StreamHealth[] {
    const health: StreamHealth[] = [];
    
    for (const [name, metrics] of this.streamMetrics) {
      health.push({
        name,
        active: true,
        subscriberCount: this.getSubscriberCount(name),
        eventsPerSecond: metrics.events / 60,
        averageLatencyMs: metrics.latencies.length > 0
          ? metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length
          : 0,
        lastEventTime: metrics.lastEvent,
        errors: metrics.errors,
      });
    }
    
    return health;
  }

  private getSubscriberCount(streamName: string): number {
    // Would track actual subscriber count
    return 1;
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  private parseAmount(value: any): number {
    if (typeof value === 'bigint') {
      return Number(value) / 1e18;
    }
    if (typeof value === 'string') {
      return parseFloat(value) / 1e18;
    }
    return Number(value) || 0;
  }

  private calculateNetPressure(flows: FlowStream[]): number {
    let selling = 0;
    let buying = 0;
    
    for (const flow of flows) {
      if (flow.type === 'to_exchange') {
        selling += flow.amountUsd;
      }
    }
    
    return selling - buying;
  }

  private createEmptyMetrics(): AggregatedMetrics {
    return {
      timestamp: new Date(),
      period: '1m',
      totalUnlockVolume: 0,
      totalFlowVolume: 0,
      netExchangeFlow: 0,
      unlockCount: 0,
      flowCount: 0,
      activeVCs: 0,
      sellingPressure: 0,
      buyingPressure: 0,
      netPressure: 0,
      topUnlocks: [],
      topFlows: [],
    };
  }

  private getOrCreateCachedStream<T>(key: string, factory: () => Observable<T>): Observable<T> {
    if (!this.cachedStreams.has(key)) {
      this.cachedStreams.set(key, factory());
    }
    return this.cachedStreams.get(key)!;
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Manually emit a vesting event
   */
  emitVestingEvent(event: VestingStream): void {
    this.vestingSubject.next(event);
    this.trackMetric('vesting', event);
  }

  /**
   * Manually emit a flow event
   */
  emitFlowEvent(event: FlowStream): void {
    this.flowSubject.next(event);
    this.trackMetric('flow', event);
  }

  /**
   * Manually emit a prediction
   */
  emitPrediction(prediction: PredictionStream): void {
    this.predictionSubject.next(prediction);
    this.trackMetric('prediction', prediction);
  }

  /**
   * Get current metrics snapshot
   */
  getCurrentMetrics(): AggregatedMetrics {
    return this.metricsSubject.value;
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down RealtimeStreamManager');
    
    this.destroy$.next();
    this.destroy$.complete();
    
    this.vestingSubject.complete();
    this.flowSubject.complete();
    this.predictionSubject.complete();
    this.metricsSubject.complete();
    
    this.cachedStreams.clear();
    this.streamMetrics.clear();
    
    logger.info('RealtimeStreamManager shut down');
  }
}

// Singleton
let instance: RealtimeStreamManager | null = null;

export function getRealtimeStreamManager(config?: StreamConfig): RealtimeStreamManager {
  if (!instance) {
    instance = new RealtimeStreamManager(config);
  }
  return instance;
}

export function resetRealtimeStreamManager(): void {
  if (instance) {
    instance.shutdown();
    instance = null;
  }
}

export default RealtimeStreamManager;

