/**
 * Graph Neural Network Analyzer
 * REVOLUTIONARY: Analyzes wallet relationships and fund flows using GNN principles
 * Detects money laundering, Sybil attacks, and hidden connections
 */

import { EventEmitter } from 'events';

export interface WalletNode {
  address: string;
  balance: number;
  transactionCount: number;
  firstSeen: Date;
  lastActive: Date;
  labels: string[]; // 'exchange', 'whale', 'suspicious', etc.
  features: number[]; // Embedding vector
  riskScore: number; // 0-1
}

export interface TransactionEdge {
  from: string;
  to: string;
  value: number;
  timestamp: Date;
  gasPrice?: number;
  successful: boolean;
  metadata?: Record<string, unknown>;
}

export interface WalletCluster {
  id: string;
  wallets: string[];
  totalValue: number;
  cohesion: number; // How tightly connected
  purpose: 'exchange' | 'whale_group' | 'mixer' | 'sybil' | 'normal' | 'suspicious';
  confidence: number;
  centerNodes: string[]; // Most influential wallets
}

export interface FundFlow {
  id: string;
  path: string[]; // Chain of wallet addresses
  totalValue: number;
  hops: number;
  startTime: Date;
  endTime: Date;
  suspicionLevel: 'clean' | 'questionable' | 'suspicious' | 'high_risk';
  indicators: string[];
}

export interface SybilDetection {
  id: string;
  suspectedController: string;
  sybilWallets: string[];
  confidence: number;
  evidence: {
    commonFundingSource: boolean;
    synchronizedActivity: boolean;
    similarBehavior: boolean;
    clusteredCreation: boolean;
  };
  estimatedRealWallets: number;
}

export class GraphNeuralNetworkAnalyzer extends EventEmitter {
  private graph: Map<string, WalletNode> = new Map();
  private edges: TransactionEdge[] = [];
  private adjacencyList: Map<string, Set<string>> = new Map();
  private clusters: WalletCluster[] = [];

  constructor() {
    super();
  }

  /**
   * Add wallet to graph
   */
  addWallet(wallet: Partial<WalletNode> & { address: string }): WalletNode {
    const node: WalletNode = {
      balance: wallet.balance || 0,
      transactionCount: wallet.transactionCount || 0,
      firstSeen: wallet.firstSeen || new Date(),
      lastActive: wallet.lastActive || new Date(),
      labels: wallet.labels || [],
      features: wallet.features || this.initializeFeatures(),
      riskScore: wallet.riskScore || 0,
      ...wallet
    };

    this.graph.set(wallet.address, node);
    
    if (!this.adjacencyList.has(wallet.address)) {
      this.adjacencyList.set(wallet.address, new Set());
    }

    return node;
  }

  /**
   * Add transaction to graph
   */
  addTransaction(tx: TransactionEdge): void {
    // Ensure both nodes exist
    if (!this.graph.has(tx.from)) {
      this.addWallet({ address: tx.from });
    }
    if (!this.graph.has(tx.to)) {
      this.addWallet({ address: tx.to });
    }

    this.edges.push(tx);
    
    // Update adjacency list
    this.adjacencyList.get(tx.from)!.add(tx.to);
    
    // Update node features
    this.updateNodeFeatures(tx.from);
    this.updateNodeFeatures(tx.to);
  }

  /**
   * Analyze fund flows using graph traversal
   */
  async analyzeFundFlows(
    startAddress: string,
    minValue: number = 1000,
    maxHops: number = 5
  ): Promise<FundFlow[]> {
    const flows: FundFlow[] = [];
    const visited = new Set<string>();
    
    // DFS to trace fund flows
    const dfs = (
      current: string,
      path: string[],
      totalValue: number,
      startTime: Date
    ) => {
      if (path.length > maxHops || visited.has(current)) {
        return;
      }

      visited.add(current);
      path.push(current);

      const neighbors = this.adjacencyList.get(current) || new Set();
      
      for (const neighbor of neighbors) {
        const transactions = this.getTransactionsBetween(current, neighbor);
        const flowValue = transactions.reduce((sum, tx) => sum + tx.value, 0);
        
        if (flowValue >= minValue) {
          const endTime = transactions[transactions.length - 1].timestamp;
          
          const flow: FundFlow = {
            id: `flow_${Date.now()}_${Math.random()}`,
            path: [...path, neighbor],
            totalValue: totalValue + flowValue,
            hops: path.length,
            startTime,
            endTime,
            suspicionLevel: this.assessFlowSuspicion([...path, neighbor], totalValue + flowValue),
            indicators: this.identifyFlowIndicators([...path, neighbor])
          };

          flows.push(flow);
          
          // Continue traversal
          dfs(neighbor, [...path], totalValue + flowValue, startTime);
        }
      }

      visited.delete(current);
    };

    dfs(startAddress, [], 0, new Date());
    
    return flows.sort((a, b) => b.totalValue - a.totalValue);
  }

  /**
   * Detect wallet clusters using community detection
   */
  async detectClusters(): Promise<WalletCluster[]> {
    this.clusters = [];
    const visited = new Set<string>();

    // Louvain-style community detection (simplified)
    for (const [_address, _node_unused] of this.graph) {
      if (visited.has(_address)) continue;

      const cluster = this.expandCluster(_address, visited);
      
      if (cluster.wallets.length >= 3) {
        this.clusters.push(cluster);
        this.emit('cluster_detected', cluster);
      }
    }

    return this.clusters;
  }

  /**
   * Expand cluster from seed node
   */
  private expandCluster(seedAddress: string, visited: Set<string>): WalletCluster {
    const clusterWallets = new Set<string>([seedAddress]);
    const queue = [seedAddress];
    visited.add(seedAddress);

    let totalValue = this.graph.get(seedAddress)?.balance || 0;

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = this.adjacencyList.get(current) || new Set();

      for (const neighbor of neighbors) {
        if (visited.has(neighbor)) continue;

        // Check if neighbor should be in cluster
        const similarity = this.calculateWalletSimilarity(current, neighbor);
        
        if (similarity > 0.6) {
          clusterWallets.add(neighbor);
          queue.push(neighbor);
          visited.add(neighbor);
          totalValue += this.graph.get(neighbor)?.balance || 0;
        }
      }
    }

    const wallets = Array.from(clusterWallets);
    
    return {
      id: `cluster_${Date.now()}_${Math.random()}`,
      wallets,
      totalValue,
      cohesion: this.calculateClusterCohesion(wallets),
      purpose: this.classifyClusterPurpose(wallets),
      confidence: this.calculateClusterConfidence(wallets),
      centerNodes: this.identifyCenterNodes(wallets)
    };
  }

  /**
   * Calculate wallet similarity (GNN-style)
   */
  private calculateWalletSimilarity(addr1: string, addr2: string): number {
    const node1 = this.graph.get(addr1);
    const node2 = this.graph.get(addr2);

    if (!node1 || !node2) return 0;

    // Cosine similarity of feature vectors
    const similarity = this.cosineSimilarity(node1.features, node2.features);
    
    // Adjust based on transaction patterns
    const sharedNeighbors = this.countSharedNeighbors(addr1, addr2);
    const neighborBonus = Math.min(sharedNeighbors / 10, 0.3);

    return Math.min(similarity + neighborBonus, 1);
  }

  /**
   * Cosine similarity between feature vectors
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }

    const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Detect Sybil attacks (fake wallet networks)
   */
  async detectSybilAttacks(): Promise<SybilDetection[]> {
    const detections: SybilDetection[] = [];
    const clusters = await this.detectClusters();

    for (const cluster of clusters) {
      if (cluster.wallets.length < 5) continue;

      // Check for Sybil patterns
      const evidence = {
        commonFundingSource: this.hasCommonFundingSource(cluster.wallets),
        synchronizedActivity: this.hasSynchronizedActivity(cluster.wallets),
        similarBehavior: cluster.cohesion > 0.8,
        clusteredCreation: this.hasClusteredCreation(cluster.wallets)
      };

      const confidence = this.calculateSybilConfidence(evidence);

      if (confidence > 0.6) {
        const controller = this.identifyPotentialController(cluster.wallets);
        
        detections.push({
          id: `sybil_${Date.now()}_${Math.random()}`,
          suspectedController: controller,
          sybilWallets: cluster.wallets.filter(w => w !== controller),
          confidence,
          evidence,
          estimatedRealWallets: Math.ceil(cluster.wallets.length * (1 - confidence))
        });

        this.emit('sybil_detected', detections[detections.length - 1]);
      }
    }

    return detections;
  }

  /**
   * Calculate centrality scores (identify influential wallets)
   */
  calculateCentrality(address: string): {
    degree: number;
    betweenness: number;
    pageRank: number;
    influence: number;
  } {
    // Degree centrality
    const degree = (this.adjacencyList.get(address)?.size || 0) / this.graph.size;

    // Simplified betweenness (paths passing through node)
    const betweenness = this.calculateBetweenness(address);

    // Simplified PageRank
    const pageRank = this.calculatePageRank(address);

    // Combined influence score
    const influence = (degree * 0.3 + betweenness * 0.3 + pageRank * 0.4);

    return { degree, betweenness, pageRank, influence };
  }

  /**
   * Initialize node features for GNN
   */
  private initializeFeatures(): number[] {
    // Feature vector: [balance_log, tx_count_log, age_days_log, neighbors_count, avg_tx_value, ...]
    return new Array(10).fill(0);
  }

  /**
   * Update node features based on transactions
   */
  private updateNodeFeatures(address: string): void {
    const _node = this.graph.get(address);
    if (!_node) return;

    const incomingTxs = this.edges.filter(e => e.to === address);
    const outgoingTxs = this.edges.filter(e => e.from === address);
    const neighbors = this.adjacencyList.get(address)?.size || 0;

    const avgIncoming = incomingTxs.length > 0
      ? incomingTxs.reduce((sum, tx) => sum + tx.value, 0) / incomingTxs.length
      : 0;
    
    const avgOutgoing = outgoingTxs.length > 0
      ? outgoingTxs.reduce((sum, tx) => sum + tx.value, 0) / outgoingTxs.length
      : 0;

    const age = (Date.now() - _node.firstSeen.getTime()) / (24 * 3600000); // days

    _node.features = [
      Math.log10(_node.balance + 1),
      Math.log10(_node.transactionCount + 1),
      Math.log10(age + 1),
      neighbors / 100,
      Math.log10(avgIncoming + 1),
      Math.log10(avgOutgoing + 1),
      incomingTxs.length / 100,
      outgoingTxs.length / 100,
      (outgoingTxs.length / (incomingTxs.length + outgoingTxs.length + 1)),
      _node.riskScore
    ];
  }

  /**
   * Helper methods
   */
  private getTransactionsBetween(from: string, to: string): TransactionEdge[] {
    return this.edges.filter(e => e.from === from && e.to === to);
  }

  private assessFlowSuspicion(path: string[], totalValue: number): FundFlow['suspicionLevel'] {
    // Multiple hops = more suspicious
    if (path.length > 4) return 'high_risk';
    
    // Check if path goes through known mixers
    const throughMixer = path.some(addr => {
      const node = this.graph.get(addr);
      return node?.labels.includes('mixer');
    });
    
    if (throughMixer) return 'suspicious';
    
    // Large value + many hops = suspicious
    if (totalValue > 100000 && path.length > 3) return 'questionable';
    
    return 'clean';
  }

  private identifyFlowIndicators(path: string[]): string[] {
    const indicators: string[] = [];
    
    if (path.length > 3) indicators.push('Multiple intermediaries');
    if (path.length > 5) indicators.push('Potential mixing/laundering');
    
    const uniqueLabels = new Set(
      path.flatMap(addr => this.graph.get(addr)?.labels || [])
    );
    
    if (uniqueLabels.has('mixer')) indicators.push('Passes through mixer');
    if (uniqueLabels.has('exchange')) indicators.push('Exchange involved');
    if (uniqueLabels.has('suspicious')) indicators.push('Suspicious wallet in chain');
    
    return indicators;
  }

  private calculateClusterCohesion(wallets: string[]): number {
    if (wallets.length < 2) return 0;

    let totalConnections = 0;
    let possibleConnections = 0;

    for (let i = 0; i < wallets.length; i++) {
      for (let j = i + 1; j < wallets.length; j++) {
        possibleConnections++;
        const connected = this.getTransactionsBetween(wallets[i], wallets[j]).length > 0 ||
                         this.getTransactionsBetween(wallets[j], wallets[i]).length > 0;
        if (connected) totalConnections++;
      }
    }

    return possibleConnections > 0 ? totalConnections / possibleConnections : 0;
  }

  private classifyClusterPurpose(wallets: string[]): WalletCluster['purpose'] {
    const labels = wallets.flatMap(w => this.graph.get(w)?.labels || []);
    const labelCounts = new Map<string, number>();
    
    labels.forEach(label => {
      labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
    });

    if (labelCounts.get('exchange') || 0 > wallets.length * 0.3) return 'exchange';
    if (labelCounts.get('mixer') || 0 > wallets.length * 0.2) return 'mixer';
    if (labelCounts.get('whale') || 0 > wallets.length * 0.3) return 'whale_group';
    if (labelCounts.get('suspicious') || 0 > wallets.length * 0.2) return 'suspicious';
    
    // Check for Sybil pattern
    const avgTxCount = wallets.reduce((sum, w) => 
      sum + (this.graph.get(w)?.transactionCount || 0), 0) / wallets.length;
    
    if (avgTxCount < 10 && wallets.length > 10) return 'sybil';
    
    return 'normal';
  }

  private calculateClusterConfidence(wallets: string[]): number {
    const cohesion = this.calculateClusterCohesion(wallets);
    const sizeBonus = Math.min(wallets.length / 20, 0.3);
    return Math.min(cohesion + sizeBonus, 1);
  }

  private identifyCenterNodes(wallets: string[]): string[] {
    return wallets
      .map(w => ({
        address: w,
        centrality: this.calculateCentrality(w).influence
      }))
      .sort((a, b) => b.centrality - a.centrality)
      .slice(0, Math.max(3, wallets.length / 10))
      .map(w => w.address);
  }

  private countSharedNeighbors(addr1: string, addr2: string): number {
    const neighbors1 = this.adjacencyList.get(addr1) || new Set();
    const neighbors2 = this.adjacencyList.get(addr2) || new Set();
    
    let shared = 0;
    for (const n of neighbors1) {
      if (neighbors2.has(n)) shared++;
    }
    
    return shared;
  }

  private hasCommonFundingSource(wallets: string[]): boolean {
    const fundingSources = new Map<string, number>();
    
    wallets.forEach(wallet => {
      const incoming = this.edges.filter(e => e.to === wallet);
      incoming.forEach(tx => {
        fundingSources.set(tx.from, (fundingSources.get(tx.from) || 0) + 1);
      });
    });

    // If >50% of wallets funded by same source
    for (const [_source, count] of fundingSources) {
      if (count > wallets.length * 0.5) return true;
    }

    return false;
  }

  private hasSynchronizedActivity(wallets: string[]): boolean {
    const timestamps = wallets.flatMap(w => {
      const node = this.graph.get(w);
      return node ? [node.lastActive.getTime()] : [];
    });

    if (timestamps.length < 2) return false;

    // Check if activities are clustered in time
    timestamps.sort((a, b) => a - b);
    const timeSpan = timestamps[timestamps.length - 1] - timestamps[0];
    const avgGap = timeSpan / timestamps.length;

    // Synchronized if most activity within short time window
    return avgGap < 3600000; // 1 hour
  }

  private hasClusteredCreation(wallets: string[]): boolean {
    const creationTimes = wallets.flatMap(w => {
      const node = this.graph.get(w);
      return node ? [node.firstSeen.getTime()] : [];
    });

    if (creationTimes.length < 2) return false;

    creationTimes.sort((a, b) => a - b);
    const timeSpan = creationTimes[creationTimes.length - 1] - creationTimes[0];

    // Created within 24 hours
    return timeSpan < 86400000;
  }

  private calculateSybilConfidence(evidence: SybilDetection['evidence']): number {
    let confidence = 0;
    if (evidence.commonFundingSource) confidence += 0.3;
    if (evidence.synchronizedActivity) confidence += 0.3;
    if (evidence.similarBehavior) confidence += 0.2;
    if (evidence.clusteredCreation) confidence += 0.2;
    return confidence;
  }

  private identifyPotentialController(wallets: string[]): string {
    // Controller likely has highest centrality
    return wallets.reduce((best, current) => {
      const bestCentrality = this.calculateCentrality(best).influence;
      const currentCentrality = this.calculateCentrality(current).influence;
      return currentCentrality > bestCentrality ? current : best;
    });
  }

  private calculateBetweenness(address: string): number {
    // Simplified: fraction of shortest paths through this node
    let pathsThrough = 0;
    let totalPaths = 0;

    // Sample random pairs
    const addresses = Array.from(this.graph.keys());
    for (let i = 0; i < Math.min(100, addresses.length); i++) {
      const source = addresses[Math.floor(Math.random() * addresses.length)];
      const target = addresses[Math.floor(Math.random() * addresses.length)];
      
      if (source === target || source === address || target === address) continue;
      
      const path = this.shortestPath(source, target);
      if (path && path.includes(address)) pathsThrough++;
      if (path) totalPaths++;
    }

    return totalPaths > 0 ? pathsThrough / totalPaths : 0;
  }

  private calculatePageRank(_address: string, iterations: number = 10): number {
    const dampingFactor = 0.85;
    const ranks = new Map<string, number>();
    
    // Initialize
    for (const addr of this.graph.keys()) {
      ranks.set(addr, 1 / this.graph.size);
    }

    // Iterate
    for (let iter = 0; iter < iterations; iter++) {
      const newRanks = new Map<string, number>();
      
      for (const addr of this.graph.keys()) {
        let rank = (1 - dampingFactor) / this.graph.size;
        
        // Add contributions from incoming links
        for (const [_source_unused, targets] of this.adjacencyList) {
          if (targets.has(addr)) {
            rank += dampingFactor * (ranks.get(_source_unused) || 0) / targets.size;
          }
        }
        
        newRanks.set(addr, rank);
      }
      
      newRanks.forEach((rank, addr) => ranks.set(addr, rank));
    }

    return ranks.get(_address) || 0;
  }

  private shortestPath(source: string, target: string): string[] | null {
    const queue: Array<{ node: string; path: string[] }> = [{ node: source, path: [source] }];
    const visited = new Set<string>([source]);

    while (queue.length > 0) {
      const { node, path } = queue.shift()!;
      
      if (node === target) return path;

      const neighbors = this.adjacencyList.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ node: neighbor, path: [...path, neighbor] });
        }
      }
    }

    return null;
  }

  /**
   * Get graph statistics
   */
  getGraphStats(): {
    totalNodes: number;
    totalEdges: number;
    avgDegree: number;
    density: number;
  } {
    const totalNodes = this.graph.size;
    const totalEdges = this.edges.length;
    const avgDegree = totalNodes > 0 ? totalEdges / totalNodes : 0;
    const maxPossibleEdges = totalNodes * (totalNodes - 1);
    const density = maxPossibleEdges > 0 ? totalEdges / maxPossibleEdges : 0;

    return { totalNodes, totalEdges, avgDegree, density };
  }
}

