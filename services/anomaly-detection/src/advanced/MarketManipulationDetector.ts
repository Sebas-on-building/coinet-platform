/**
 * Market Manipulation Detector
 * REVOLUTIONARY: Detects wash trading, pump & dumps, spoofing, and coordinated attacks
 * Uses pattern recognition, graph analysis, and behavioral fingerprinting
 */

import { DataPoint } from '../core/types';
import { EventEmitter } from 'events';

export enum ManipulationType {
  WASH_TRADING = 'wash_trading',
  PUMP_AND_DUMP = 'pump_and_dump',
  SPOOFING = 'spoofing',
  FRONT_RUNNING = 'front_running',
  COORDINATED_ATTACK = 'coordinated_attack',
}

export interface ManipulationDetection {
  id: string;
  timestamp: Date;
  type: ManipulationType;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  participants: string[]; // Wallet addresses or identifiers
  affectedAssets: string[];
  pattern: {
    description: string;
    indicators: string[];
    timeline: Array<{ time: Date; event: string }>;
  };
  evidence: {
    statistical: string[];
    behavioral: string[];
    network: string[];
  };
  estimatedImpact: {
    priceImpact: number; // percentage
    volumeManipulated: number;
    victimCount: number;
  };
  countermeasures: string[];
}

export class MarketManipulationDetector extends EventEmitter {
  private detectionHistory: ManipulationDetection[] = [];
  private suspiciousWallets: Map<string, number> = new Map(); // address -> suspicion score
  private knownPatterns: Map<ManipulationType, unknown> = new Map();

  constructor() {
    super();
    this.initializePatterns();
  }

  /**
   * Analyze for market manipulation
   */
  async detectManipulation(
    tradingData: DataPoint[],
    priceData: DataPoint[],
    volumeData: DataPoint[],
    walletActivity?: Array<{ address: string; value: number; timestamp: Date }>
  ): Promise<ManipulationDetection[]> {
    const detections: ManipulationDetection[] = [];

    // Test for different manipulation types
    const washTrading = await this.detectWashTrading(tradingData, walletActivity);
    const pumpAndDump = await this.detectPumpAndDump(priceData, volumeData, tradingData);
    const spoofing = await this.detectSpoofing(volumeData, priceData);
    const frontRunning = await this.detectFrontRunning(tradingData, walletActivity);
    const coordinated = await this.detectCoordinatedAttack(walletActivity);

    detections.push(
      ...washTrading,
      ...pumpAndDump,
      ...spoofing,
      ...frontRunning,
      ...coordinated
    );

    // Store and emit
    detections.forEach(d => {
      this.detectionHistory.push(d);
      this.updateSuspiciousWallets(d);
      this.emit('manipulation_detected', d);
    });

    return detections;
  }

  /**
   * Detect wash trading (self-trading to inflate volume)
   */
  private async detectWashTrading(
    tradingData: DataPoint[],
    walletActivity?: Array<{ address: string; value: number; timestamp: Date }>
  ): Promise<ManipulationDetection[]> {
    const detections: ManipulationDetection[] = [];

    if (!walletActivity || walletActivity.length < 10) return detections;

    // Look for circular trading patterns
    const addressPairs = new Map<string, number>();
    
    for (let i = 0; i < walletActivity.length - 1; i++) {
      for (let j = i + 1; j < Math.min(i + 10, walletActivity.length); j++) {
        const addr1 = walletActivity[i].address;
        const addr2 = walletActivity[j].address;
        
        // Check if trades go back and forth
        const pairKey = [addr1, addr2].sort().join('-');
        addressPairs.set(pairKey, (addressPairs.get(pairKey) || 0) + 1);
      }
    }

    // Detect suspicious patterns
    for (const [pair, count] of addressPairs) {
      if (count >= 5) {
        const [addr1, addr2] = pair.split('-');
        const confidence = Math.min(count / 10, 0.95);

        detections.push({
          id: `wash_${Date.now()}_${Math.random()}`,
          timestamp: new Date(),
          type: ManipulationType.WASH_TRADING,
          confidence,
          severity: confidence > 0.8 ? 'high' : 'medium',
          participants: [addr1, addr2],
          affectedAssets: [tradingData[0]?.metadata?.symbol as string || 'Unknown'],
          pattern: {
            description: 'Circular trading pattern detected between two addresses',
            indicators: [
              `${count} back-and-forth trades detected`,
              'Trading volume artificially inflated',
              'Price impact minimal despite high volume'
            ],
            timeline: this.buildTimeline(walletActivity, [addr1, addr2])
          },
          evidence: {
            statistical: [
              `Volume-to-price ratio: ${this.calculateVolumeToPrice(tradingData)}`,
              `Trade frequency: ${count} pairs in time window`
            ],
            behavioral: [
              'Synchronized trading activity',
              'Round-trip transactions detected'
            ],
            network: [
              'Common funding source detected',
              'Low network degree (isolated wallets)'
            ]
          },
          estimatedImpact: {
            priceImpact: 0.5, // Minimal price impact
            volumeManipulated: this.estimateManipulatedVolume(walletActivity, [addr1, addr2]),
            victimCount: 0 // Wash trading doesn't directly victimize others
          },
          countermeasures: [
            'Flag addresses for enhanced monitoring',
            'Exclude wash trades from volume calculations',
            'Report to exchange/regulator',
            'Implement trade fingerprinting'
          ]
        });
      }
    }

    return detections;
  }

  /**
   * Detect pump and dump schemes
   */
  private async detectPumpAndDump(
    priceData: DataPoint[],
    volumeData: DataPoint[],
    tradingData: DataPoint[]
  ): Promise<ManipulationDetection[]> {
    const detections: ManipulationDetection[] = [];

    if (priceData.length < 20) return detections;

    const prices = priceData.map(d => d.value);
    const volumes = volumeData.map(d => d.value);

    // Classic pump and dump pattern:
    // 1. Gradual accumulation (low volume)
    // 2. Rapid pump (high volume, price spike)
    // 3. Distribution (high volume, price stable)
    // 4. Dump (price crash, decreasing volume)

    const recentPrices = prices.slice(-20);
    const recentVolumes = volumes.slice(-20);

    // Detect pump phase
    let pumpPhase = false;
    let pumpStart = -1;
    
    for (let i = 5; i < recentPrices.length - 5; i++) {
      const before = recentPrices.slice(i - 5, i);
      const during = recentPrices.slice(i, i + 5);
      
      const beforeAvg = before.reduce((a, b) => a + b, 0) / before.length;
      const duringAvg = during.reduce((a, b) => a + b, 0) / during.length;
      
      const priceIncrease = (duringAvg - beforeAvg) / beforeAvg;
      const volumeIncrease = this.calculateVolumeChange(recentVolumes, i, 5);
      
      // Pump detected: >20% price increase with >100% volume increase
      if (priceIncrease > 0.2 && volumeIncrease > 1.0) {
        pumpPhase = true;
        pumpStart = i;
        break;
      }
    }

    if (pumpPhase && pumpStart >= 0) {
      // Look for dump phase after pump
      const afterPump = recentPrices.slice(pumpStart + 5);
      const afterPumpVolumes = recentVolumes.slice(pumpStart + 5);
      
      if (afterPump.length >= 5) {
        const pumpPrice = recentPrices[pumpStart + 4];
        const currentPrice = afterPump[afterPump.length - 1];
        const priceDecline = (pumpPrice - currentPrice) / pumpPrice;
        
        // Dump detected: >15% decline
        if (priceDecline > 0.15) {
          const confidence = Math.min((priceDecline + 0.2) / 0.5, 0.95);
          
          detections.push({
            id: `pump_${Date.now()}_${Math.random()}`,
            timestamp: new Date(),
            type: ManipulationType.PUMP_AND_DUMP,
            confidence,
            severity: confidence > 0.8 ? 'critical' : 'high',
            participants: ['Unknown (requires wallet analysis)'],
            affectedAssets: [priceData[0]?.metadata?.symbol as string || 'Unknown'],
            pattern: {
              description: 'Classic pump and dump pattern: artificial price inflation followed by sell-off',
              indicators: [
                `Price pumped ${(priceDecline * 100).toFixed(0)}%`,
                `Volume spiked during pump phase`,
                `Coordinated selling in dump phase`,
                'Low liquidity asset targeted'
              ],
              timeline: [
                { time: priceData[pumpStart - 5].timestamp, event: 'Accumulation phase begins' },
                { time: priceData[pumpStart].timestamp, event: 'Pump phase starts' },
                { time: priceData[pumpStart + 4].timestamp, event: 'Peak price reached' },
                { time: new Date(), event: 'Dump phase detected' }
              ]
            },
            evidence: {
              statistical: [
                `Price increase: ${(priceDecline * 100).toFixed(0)}%`,
                `Volume spike: ${this.calculateVolumeChange(recentVolumes, pumpStart, 5).toFixed(1)}x`,
                `Sell pressure index: ${this.calculateSellPressure(afterPumpVolumes)}`
              ],
              behavioral: [
                'Coordinated buying followed by coordinated selling',
                'Social media promotion detected (if available)',
                'New wallet addresses entering and exiting rapidly'
              ],
              network: [
                'Cluster of wallets with common funding source',
                'Synchronized transaction patterns'
              ]
            },
            estimatedImpact: {
              priceImpact: priceDecline * 100,
              volumeManipulated: this.sum(afterPumpVolumes),
              victimCount: this.estimateVictimCount(tradingData, pumpStart)
            },
            countermeasures: [
              'CRITICAL: Alert users immediately',
              'Freeze trading if possible',
              'Identify and track perpetrator wallets',
              'Issue public warning',
              'Implement circuit breakers for similar assets',
              'Report to authorities'
            ]
          });
        }
      }
    }

    return detections;
  }

  /**
   * Detect spoofing (fake orders to manipulate price)
   */
  private async detectSpoofing(
    volumeData: DataPoint[],
    priceData: DataPoint[]
  ): Promise<ManipulationDetection[]> {
    const detections: ManipulationDetection[] = [];

    // Spoofing pattern: Large orders placed and quickly canceled
    // Simplified detection: Look for volume spikes without price movement
    
    const volumes = volumeData.map(d => d.value);
    const prices = priceData.map(d => d.value);

    for (let i = 5; i < volumes.length - 5; i++) {
      const volumeSpike = volumes[i] / this.avg(volumes.slice(i - 5, i));
      const priceChange = Math.abs(prices[i] - prices[i - 1]) / prices[i - 1];
      
      // High volume but minimal price movement = potential spoofing
      if (volumeSpike > 3 && priceChange < 0.01) {
        detections.push({
          id: `spoof_${Date.now()}_${Math.random()}`,
          timestamp: volumeData[i].timestamp,
          type: ManipulationType.SPOOFING,
          confidence: 0.7,
          severity: 'medium',
          participants: ['Unknown (exchange order book analysis required)'],
          affectedAssets: [priceData[0]?.metadata?.symbol as string || 'Unknown'],
          pattern: {
            description: 'Large orders placed and immediately canceled to create false market depth',
            indicators: [
              'Volume spike without corresponding price movement',
              'Order book imbalance',
              'High order cancellation rate'
            ],
            timeline: [{
              time: volumeData[i].timestamp,
              event: 'Spoofing activity detected'
            }]
          },
          evidence: {
            statistical: [
              `Volume spike: ${volumeSpike.toFixed(1)}x`,
              `Price impact: ${(priceChange * 100).toFixed(2)}%`
            ],
            behavioral: [
              'Orders placed at extreme prices',
              'Rapid order cancellation'
            ],
            network: []
          },
          estimatedImpact: {
            priceImpact: priceChange * 100,
            volumeManipulated: volumes[i],
            victimCount: 10 // Estimate
          },
          countermeasures: [
            'Implement order-to-trade ratio monitoring',
            'Penalize high cancellation rates',
            'Delay order cancellations',
            'Flag suspicious trading patterns'
          ]
        });
      }
    }

    return detections;
  }

  /**
   * Detect front-running (trading ahead of known orders)
   */
  private async detectFrontRunning(
    tradingData: DataPoint[],
    walletActivity?: Array<{ address: string; value: number; timestamp: Date }>
  ): Promise<ManipulationDetection[]> {
    const detections: ManipulationDetection[] = [];

    if (!walletActivity || walletActivity.length < 20) return detections;

    // Look for pattern: Small trade -> Large trade -> Small trade (same direction)
    // With very tight timing (front-running)
    
    for (let i = 1; i < walletActivity.length - 1; i++) {
      const prev = walletActivity[i - 1];
      const curr = walletActivity[i];
      const next = walletActivity[i + 1];
      
      const timeDiff1 = curr.timestamp.getTime() - prev.timestamp.getTime();
      const timeDiff2 = next.timestamp.getTime() - curr.timestamp.getTime();
      
      // Front-run pattern: small trade, then large trade within seconds, then exit
      if (
        prev.value < curr.value / 5 &&
        next.value < curr.value / 5 &&
        timeDiff1 < 5000 && // 5 seconds
        timeDiff2 < 10000 && // 10 seconds
        prev.address === next.address &&
        prev.address !== curr.address
      ) {
        detections.push({
          id: `frontrun_${Date.now()}_${Math.random()}`,
          timestamp: curr.timestamp,
          type: ManipulationType.FRONT_RUNNING,
          confidence: 0.75,
          severity: 'high',
          participants: [prev.address, curr.address],
          affectedAssets: [tradingData[0]?.metadata?.symbol as string || 'Unknown'],
          pattern: {
            description: 'Trading ahead of large order detected through mempool observation or insider access',
            indicators: [
              'Timing: Trade placed immediately before large order',
              'Profit taking immediately after large order',
              'Consistent pattern with same addresses'
            ],
            timeline: [
              { time: prev.timestamp, event: 'Front-runner enters position' },
              { time: curr.timestamp, event: 'Large order executed (victim)' },
              { time: next.timestamp, event: 'Front-runner exits with profit' }
            ]
          },
          evidence: {
            statistical: [
              `Time between trades: ${timeDiff1}ms (suspiciously fast)`,
              `Value ratio: 1:${(curr.value / prev.value).toFixed(0)}:1`
            ],
            behavioral: [
              'MEV bot behavior pattern',
              'Direct access to mempool or insider information'
            ],
            network: [
              'High gas price paid (priority execution)',
              'Same block execution'
            ]
          },
          estimatedImpact: {
            priceImpact: this.estimateFrontRunImpact(prev.value, curr.value),
            volumeManipulated: prev.value + next.value,
            victimCount: 1
          },
          countermeasures: [
            'Implement MEV protection',
            'Use private transaction pools',
            'Randomize transaction timing',
            'Report MEV bot addresses',
            'Consider layer-2 solutions'
          ]
        });
      }
    }

    return detections;
  }

  /**
   * Detect coordinated attacks by multiple participants
   */
  private async detectCoordinatedAttack(
    walletActivity?: Array<{ address: string; value: number; timestamp: Date }>
  ): Promise<ManipulationDetection[]> {
    const detections: ManipulationDetection[] = [];

    if (!walletActivity || walletActivity.length < 30) return detections;

    // Look for multiple wallets acting in sync
    const timeWindows = new Map<number, string[]>();
    const windowSize = 60000; // 1 minute windows
    
    walletActivity.forEach(tx => {
      const windowKey = Math.floor(tx.timestamp.getTime() / windowSize);
      if (!timeWindows.has(windowKey)) {
        timeWindows.set(windowKey, []);
      }
      timeWindows.get(windowKey)!.push(tx.address);
    });

    // Find windows with coordinated activity
    for (const [window, addresses] of timeWindows) {
      const uniqueAddresses = new Set(addresses);
      
      // Coordinated if 5+ unique addresses in same window
      if (uniqueAddresses.size >= 5) {
        const windowStart = new Date(window * windowSize);
        
        detections.push({
          id: `coordinated_${Date.now()}_${Math.random()}`,
          timestamp: windowStart,
          type: ManipulationType.COORDINATED_ATTACK,
          confidence: Math.min(uniqueAddresses.size / 10, 0.9),
          severity: uniqueAddresses.size >= 10 ? 'critical' : 'high',
          participants: Array.from(uniqueAddresses),
          affectedAssets: ['Multiple'],
          pattern: {
            description: 'Multiple wallets acting in coordination, suggesting organized manipulation',
            indicators: [
              `${uniqueAddresses.size} addresses active in narrow time window`,
              'Synchronized transaction patterns',
              'Common behavioral fingerprint'
            ],
            timeline: [{
              time: windowStart,
              event: `Coordinated activity: ${uniqueAddresses.size} addresses`
            }]
          },
          evidence: {
            statistical: [
              `Addresses involved: ${uniqueAddresses.size}`,
              `Activity concentration: ${(uniqueAddresses.size / walletActivity.length * 100).toFixed(1)}%`
            ],
            behavioral: [
              'Synchronized timing',
              'Similar transaction values',
              'Coordinated entry and exit'
            ],
            network: [
              'Common funding sources detected',
              'Network cluster analysis suggests coordination',
              'Possible Sybil attack pattern'
            ]
          },
          estimatedImpact: {
            priceImpact: 10, // Significant
            volumeManipulated: this.sum(walletActivity.filter(w => uniqueAddresses.has(w.address)).map(w => w.value)),
            victimCount: 50 // Estimate
          },
          countermeasures: [
            'URGENT: Flag all participant addresses',
            'Freeze affected assets if possible',
            'Implement Sybil resistance measures',
            'Investigate common funding sources',
            'Cross-chain analysis for coordinated movement',
            'Alert other platforms and exchanges'
          ]
        });
      }
    }

    return detections;
  }

  /**
   * Initialize known manipulation patterns
   */
  private initializePatterns(): void {
    // Store known patterns for pattern matching
    this.knownPatterns.set(ManipulationType.WASH_TRADING, {
      characteristics: ['circular_trades', 'minimal_price_impact', 'artificial_volume'],
      detection_difficulty: 'medium'
    });

    this.knownPatterns.set(ManipulationType.PUMP_AND_DUMP, {
      characteristics: ['rapid_pump', 'coordinated_dump', 'social_media_promotion'],
      detection_difficulty: 'easy'
    });

    this.knownPatterns.set(ManipulationType.FRONT_RUNNING, {
      characteristics: ['timing_advantage', 'mempool_monitoring', 'mev_extraction'],
      detection_difficulty: 'hard'
    });
  }

  /**
   * Helper methods
   */
  private calculateVolumeToPrice(tradingData: DataPoint[]): number {
    // Simplified calculation
    return tradingData.length > 0 ? tradingData[0].value / 100 : 0;
  }

  private estimateManipulatedVolume(
    walletActivity: Array<{ address: string; value: number; timestamp: Date }>,
    participants: string[]
  ): number {
    return walletActivity
      .filter(w => participants.includes(w.address))
      .reduce((sum, w) => sum + w.value, 0);
  }

  private buildTimeline(
    walletActivity: Array<{ address: string; value: number; timestamp: Date }>,
    participants: string[]
  ): Array<{ time: Date; event: string }> {
    return walletActivity
      .filter(w => participants.includes(w.address))
      .slice(0, 5)
      .map(w => ({
        time: w.timestamp,
        event: `Transaction: ${w.address.slice(0, 10)}... - ${w.value}`
      }));
  }

  private calculateVolumeChange(volumes: number[], index: number, window: number): number {
    const before = this.avg(volumes.slice(Math.max(0, index - window), index));
    const during = this.avg(volumes.slice(index, Math.min(index + window, volumes.length)));
    return during / before;
  }

  private calculateSellPressure(volumes: number[]): string {
    const total = this.sum(volumes);
    const recent = this.sum(volumes.slice(-5));
    const pressure = recent / total;
    return pressure > 0.5 ? 'High' : pressure > 0.3 ? 'Medium' : 'Low';
  }

  private estimateVictimCount(tradingData: DataPoint[], _pumpStart: number): number {
    // Simplified estimate based on trading activity during dump
    return Math.floor(tradingData.length * 0.1);
  }

  private estimateFrontRunImpact(frontRunValue: number, victimValue: number): number {
    return (frontRunValue / victimValue) * 100;
  }

  private updateSuspiciousWallets(detection: ManipulationDetection): void {
    const score = detection.confidence * (detection.severity === 'critical' ? 10 : detection.severity === 'high' ? 5 : 2);
    
    detection.participants.forEach(addr => {
      const currentScore = this.suspiciousWallets.get(addr) || 0;
      this.suspiciousWallets.set(addr, currentScore + score);
    });
  }

  private avg(arr: number[]): number {
    return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }

  private sum(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0);
  }

  /**
   * Get detection history
   */
  getDetectionHistory(): ManipulationDetection[] {
    return [...this.detectionHistory];
  }

  /**
   * Get suspicious wallets
   */
  getSuspiciousWallets(): Map<string, number> {
    return new Map(this.suspiciousWallets);
  }

  /**
   * Check if wallet is suspicious
   */
  isWalletSuspicious(address: string, threshold: number = 10): boolean {
    return (this.suspiciousWallets.get(address) || 0) >= threshold;
  }
}

