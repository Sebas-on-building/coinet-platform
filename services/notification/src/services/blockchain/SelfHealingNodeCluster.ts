import { BlockchainNodeManager, BlockchainType, BlockchainNode, RPCProvider } from './BlockchainNodeManager';
import { Logger } from '../../utils/Logger';

export interface NodeHealthMetrics {
  nodeId: string;
  blockchain: BlockchainType;
  cpuUsage: number; // 0-100%
  memoryUsage: number; // 0-100%
  diskUsage: number; // 0-100%
  networkLatency: number; // milliseconds
  errorRate: number; // errors per minute
  uptime: number; // milliseconds
  lastHealthCheck: Date;
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
}

export interface ClusterConfig {
  minNodesPerBlockchain: number;
  maxNodesPerBlockchain: number;
  autoScalingEnabled: boolean;
  healthCheckInterval: number; // milliseconds
  nodeReplacementThreshold: number; // 0-100 health score
  loadBalancingStrategy: 'round_robin' | 'least_loaded' | 'weighted_random';
  failoverTimeout: number; // milliseconds
  backupProviderPool: RPCProvider[];
  // Enhanced self-healing features
  globalDeployment: boolean; // Deploy nodes across multiple regions
  autoRepairEnabled: boolean; // Automatically repair degraded nodes
  compromisedNodeDetection: boolean; // Detect and replace compromised nodes
  predictiveScaling: boolean; // Use AI to predict scaling needs
  costOptimization: boolean; // Optimize for cost while maintaining performance
  securityMonitoring: boolean; // Monitor for security threats
}

export interface NodeDeployment {
  nodeId: string;
  blockchain: BlockchainType;
  type: 'full' | 'light' | 'archive';
  region: string;
  provider: string;
  deploymentTime: Date;
  costPerHour: number;
  maxCapacity: number;
  currentLoad: number;
  // Enhanced deployment features
  securityScore: number; // 0-100 security assessment
  performanceScore: number; // 0-100 performance rating
  reliabilityScore: number; // 0-100 uptime reliability
  lastSecurityScan: Date;
  backupNodes: string[]; // Backup nodes for this deployment
  autoRepairHistory: AutoRepairEvent[];
  status?: 'healthy' | 'degraded' | 'critical' | 'offline';
}

export interface AutoRepairEvent {
  id: string;
  nodeId: string;
  eventType: 'restart' | 'redeploy' | 'configuration_update' | 'security_patch';
  timestamp: Date;
  duration: number; // milliseconds
  success: boolean;
  errorMessage?: string;
  cost: number; // Cost of repair operation
}

export interface GlobalDeploymentStrategy {
  targetRegions: string[]; // List of target regions for deployment
  regionSelection: 'cost_optimized' | 'performance_optimized' | 'latency_optimized' | 'redundancy_optimized';
  providerDiversification: boolean; // Use multiple providers per region
  disasterRecovery: boolean; // Enable disaster recovery across regions
  loadDistribution: 'even' | 'weighted' | 'dynamic';
}

export interface CompromisedNodeDetection {
  enabled: boolean;
  securityScans: {
    frequency: number; // milliseconds
    depth: 'basic' | 'comprehensive' | 'deep';
    externalTools: string[]; // External security scanning tools
  };
  intrusionDetection: {
    enabled: boolean;
    signatures: string[]; // Known attack signatures
    behavioralAnalysis: boolean; // AI-based behavioral analysis
  };
  responseActions: {
    isolation: boolean; // Isolate compromised nodes
    dataWiping: boolean; // Wipe data from compromised nodes
    forensicAnalysis: boolean; // Perform forensic analysis
    notificationChannels: string[]; // Alert channels
  };
}

export interface PredictiveScalingModel {
  modelType: 'linear_regression' | 'lstm' | 'prophet' | 'ensemble';
  accuracy: number; // 0-100 prediction accuracy
  trainingDataPoints: number;
  lastTrained: Date;
  predictionHorizon: number; // hours to predict ahead
  features: string[]; // Features used for prediction
}

export interface ScalingRecommendation {
  blockchain: BlockchainType;
  currentNodes: number;
  recommendedNodes: number;
  confidence: number; // 0-100
  reasoning: string;
  expectedCost: number;
  expectedPerformance: number;
}

export class SelfHealingNodeCluster {
  private logger: Logger;
  private nodeManager: BlockchainNodeManager;
  private config: ClusterConfig;
  private deployments: Map<string, NodeDeployment> = new Map();
  private healthMetrics: Map<string, NodeHealthMetrics> = new Map();
  private autoScalingRules: Map<BlockchainType, { minNodes: number; maxNodes: number; scaleUpThreshold: number; scaleDownThreshold: number }> = new Map();

  // Enhanced self-healing features
  private globalDeploymentStrategy: GlobalDeploymentStrategy;
  private compromisedNodeDetection: CompromisedNodeDetection;
  private securityMetrics: Map<string, { threats: number; vulnerabilities: string[]; lastScan: Date }> = new Map();
  private repairHistory: Map<string, AutoRepairEvent[]> = new Map();
  private predictiveScalingModel: PredictiveScalingModel | null = null;

  constructor(nodeManager: BlockchainNodeManager, config?: Partial<ClusterConfig>) {
    this.logger = Logger.getInstance();
    this.nodeManager = nodeManager;
    this.config = {
      minNodesPerBlockchain: 2,
      maxNodesPerBlockchain: 10,
      autoScalingEnabled: true,
      healthCheckInterval: 30000,
      nodeReplacementThreshold: 70,
      loadBalancingStrategy: 'least_loaded',
      failoverTimeout: 10000,
      backupProviderPool: [],
      globalDeployment: true,
      autoRepairEnabled: true,
      compromisedNodeDetection: true,
      predictiveScaling: true,
      costOptimization: true,
      securityMonitoring: true,
      ...config
    };

    // Initialize enhanced features
    this.globalDeploymentStrategy = {
      targetRegions: ['us-east-1', 'eu-west-1', 'ap-southeast-1', 'us-west-2'],
      regionSelection: 'performance_optimized',
      providerDiversification: true,
      disasterRecovery: true,
      loadDistribution: 'dynamic'
    };

    this.compromisedNodeDetection = {
      enabled: this.config.compromisedNodeDetection,
      securityScans: {
        frequency: 3600000, // 1 hour
        depth: 'comprehensive',
        externalTools: ['nmap', 'nessus', 'qualys']
      },
      intrusionDetection: {
        enabled: true,
        signatures: ['DDoS', 'SQL Injection', 'XSS', 'RCE'],
        behavioralAnalysis: true
      },
      responseActions: {
        isolation: true,
        dataWiping: true,
        forensicAnalysis: true,
        notificationChannels: ['slack', 'email', 'pagerduty']
      }
    };

    // Initialize auto-scaling rules for each blockchain
    this.initializeAutoScalingRules();

    // Start health monitoring
    this.startHealthMonitoring();

    // Initialize predictive scaling if enabled
    if (this.config.predictiveScaling) {
      this.initializePredictiveScaling();
    }

    // Start compromised node detection if enabled
    if (this.config.compromisedNodeDetection) {
      this.startCompromisedNodeDetection();
    }

    this.initializeCluster();
  }

  /**
   * Initialize self-healing cluster
   */
  private async initializeCluster(): Promise<void> {
    this.logger.info('Initializing self-healing node cluster');

    // Initialize auto-scaling rules for each blockchain
    const supportedChains = this.nodeManager.getSupportedBlockchains();
    for (const blockchain of supportedChains) {
      this.autoScalingRules.set(blockchain, {
        minNodes: this.config.minNodesPerBlockchain,
        maxNodes: this.config.maxNodesPerBlockchain,
        scaleUpThreshold: 80, // Scale up when 80% capacity
        scaleDownThreshold: 30 // Scale down when 30% capacity
      });
    }

    // Start health monitoring
    this.startHealthMonitoring();

    // Start auto-scaling
    if (this.config.autoScalingEnabled) {
      this.startAutoScaling();
    }

    this.logger.info(`Self-healing cluster initialized for ${supportedChains.length} blockchains`);
  }

  /**
   * Deploy new node for blockchain
   */
  async deployNode(blockchain: BlockchainType, type: 'full' | 'light' | 'archive' = 'full'): Promise<string> {
    try {
      this.logger.info(`Deploying new ${type} node for ${blockchain}`);

      // Select optimal region and provider
      const region = await this.selectOptimalRegion(blockchain);
      const provider = await this.selectOptimalProvider(blockchain, type);

      // Create deployment record
      const deploymentId = `${blockchain}-${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const deployment: NodeDeployment = {
        nodeId: deploymentId,
        blockchain,
        type,
        region,
        provider: provider.name,
        deploymentTime: new Date(),
        costPerHour: this.calculateDeploymentCost(type, region),
        maxCapacity: this.getNodeCapacity(type),
        currentLoad: 0,
        securityScore: 95,
        performanceScore: 90,
        reliabilityScore: 98,
        lastSecurityScan: new Date(),
        backupNodes: [],
        autoRepairHistory: []
      };

      this.deployments.set(deploymentId, deployment);

      // Connect node through node manager
      const nodeId = await this.nodeManager.connectBlockchain(blockchain);

      // Update deployment with actual node ID
      deployment.nodeId = nodeId;

      this.logger.info(`Node deployed successfully`, {
        deploymentId,
        blockchain,
        type,
        region,
        provider: provider.name,
        nodeId
      });

      return deploymentId;

    } catch (error) {
      this.logger.error('Failed to deploy node', { error, blockchain, type });
      throw error;
    }
  }

  /**
   * Select optimal region for deployment based on strategy
   */
  private async selectOptimalRegion(blockchain: BlockchainType): Promise<string> {
    // Strategy-based region selection
    switch (this.globalDeploymentStrategy.regionSelection) {
      case 'cost_optimized':
        return this.selectCostOptimizedRegion();
      case 'performance_optimized':
        return this.selectPerformanceOptimizedRegion(blockchain);
      case 'latency_optimized':
        return this.selectLatencyOptimizedRegion();
      case 'redundancy_optimized':
        return this.selectRedundancyOptimizedRegion();
      default:
        return 'us-east-1';
    }
  }

  /**
   * Select optimal provider for deployment
   */
  private async selectOptimalProvider(blockchain: BlockchainType, type: 'full' | 'light' | 'archive'): Promise<RPCProvider> {
    const providers = this.nodeManager.getSupportedBlockchains().includes(blockchain)
      ? this.nodeManager.getNodesByBlockchain(blockchain).flatMap(node => node.providers)
      : [];

    if (providers.length === 0) {
      throw new Error(`No providers available for ${blockchain}`);
    }

    // Select provider with lowest error rate and best response time
    const sortedProviders = providers.sort((a, b) => {
      const aScore = a.errorCount * 1000 + a.responseTime;
      const bScore = b.errorCount * 1000 + b.responseTime;
      return aScore - bScore;
    });

    return sortedProviders[0]!;
  }

  /**
   * Calculate deployment cost
   */
  private calculateDeploymentCost(type: string, region: string): number {
    const baseCosts = {
      full: 0.50,
      light: 0.20,
      archive: 1.00
    };

    const regionMultipliers = {
      'us-east-1': 1.0,
      'eu-west-1': 1.2,
      'ap-northeast-1': 1.3,
      'us-west-2': 0.9
    };

    return (baseCosts[type as keyof typeof baseCosts] || 0.50) *
           (regionMultipliers[region as keyof typeof regionMultipliers] || 1.0);
  }

  /**
   * Get node capacity based on type
   */
  private getNodeCapacity(type: string): number {
    const capacities = {
      full: 1000000,    // 1M transactions/hour
      light: 500000,    // 500K transactions/hour
      archive: 2000000  // 2M transactions/hour
    };

    return capacities[type as keyof typeof capacities] || 500000;
  }


  /**
   * Perform health checks on all nodes
   */
  private async performHealthChecks(): Promise<void> {
    const nodes = this.nodeManager.getAllNodes();

    for (const node of nodes) {
      try {
        const healthMetrics = await this.assessNodeHealth(node);
        this.healthMetrics.set(node.id, healthMetrics);

        // Check if node needs repair or replacement
        if (healthMetrics.status === 'critical' || healthMetrics.status === 'offline') {
          await this.handleUnhealthyNode(node, healthMetrics);
        }

      } catch (error) {
        this.logger.error('Health check failed', { error, nodeId: node.id });
      }
    }
  }

  /**
   * Assess node health
   */
  private async assessNodeHealth(node: BlockchainNode): Promise<NodeHealthMetrics> {
    const metrics: NodeHealthMetrics = {
      nodeId: node.id,
      blockchain: node.blockchain,
      cpuUsage: await this.getNodeCPUUsage(node),
      memoryUsage: await this.getNodeMemoryUsage(node),
      diskUsage: await this.getNodeDiskUsage(node),
      networkLatency: await this.getNodeNetworkLatency(node),
      errorRate: this.calculateNodeErrorRate(node),
      uptime: node.uptime,
      lastHealthCheck: new Date(),
      status: 'healthy'
    };

    // Calculate overall health score
    const healthScore = this.calculateHealthScore(metrics);

    if (healthScore < 30) {
      metrics.status = 'offline';
    } else if (healthScore < 60) {
      metrics.status = 'critical';
    } else if (healthScore < 80) {
      metrics.status = 'degraded';
    } else {
      metrics.status = 'healthy';
    }

    return metrics;
  }

  /**
   * Get node CPU usage (simulated)
   */
  private async getNodeCPUUsage(node: BlockchainNode): Promise<number> {
    // In production, this would query actual node metrics
    return Math.random() * 100;
  }

  /**
   * Get node memory usage (simulated)
   */
  private async getNodeMemoryUsage(node: BlockchainNode): Promise<number> {
    // In production, this would query actual node metrics
    return Math.random() * 100;
  }

  /**
   * Get node disk usage (simulated)
   */
  private async getNodeDiskUsage(node: BlockchainNode): Promise<number> {
    // In production, this would query actual node metrics
    return Math.random() * 100;
  }

  /**
   * Get node network latency
   */
  private async getNodeNetworkLatency(node: BlockchainNode): Promise<number> {
    return node.providers.reduce((sum, provider) => sum + provider.responseTime, 0) / node.providers.length;
  }

  /**
   * Calculate node error rate
   */
  private calculateNodeErrorRate(node: BlockchainNode): number {
    const totalRequests = node.connectionCount;
    const errors = node.errorCount;
    return totalRequests > 0 ? (errors / totalRequests) * 100 : 0;
  }

  /**
   * Calculate overall health score
   */
  private calculateHealthScore(metrics: NodeHealthMetrics): number {
    const weights = {
      cpu: 0.25,
      memory: 0.25,
      disk: 0.15,
      latency: 0.20,
      errorRate: 0.15
    };

    const cpuScore = Math.max(0, 100 - metrics.cpuUsage) * weights.cpu;
    const memoryScore = Math.max(0, 100 - metrics.memoryUsage) * weights.memory;
    const diskScore = Math.max(0, 100 - metrics.diskUsage) * weights.disk;
    const latencyScore = Math.max(0, 100 - Math.min(100, (metrics.networkLatency / 1000) * 100)) * weights.latency;
    const errorScore = Math.max(0, 100 - metrics.errorRate) * weights.errorRate;

    return cpuScore + memoryScore + diskScore + latencyScore + errorScore;
  }

  /**
   * Handle unhealthy node
   */
  private async handleUnhealthyNode(node: BlockchainNode, metrics: NodeHealthMetrics): Promise<void> {
    this.logger.warn('Unhealthy node detected', {
      nodeId: node.id,
      blockchain: node.blockchain,
      status: metrics.status,
      healthScore: this.calculateHealthScore(metrics)
    });

    if (metrics.status === 'offline' || this.calculateHealthScore(metrics) < this.config.nodeReplacementThreshold) {
      // Replace the node
      await this.replaceNode(node);
    } else if (metrics.status === 'critical') {
      // Attempt to repair the node
      await this.repairNode(node);
    }
  }

  /**
   * Replace unhealthy node
   */
  private async replaceNode(node: BlockchainNode): Promise<void> {
    try {
      this.logger.info(`Replacing unhealthy node ${node.id}`);

      // Disconnect the old node
      await this.nodeManager.disconnectNode(node.id);

      // Deploy a new node
      const deploymentId = await this.deployNode(node.blockchain, node.type as 'full' | 'light');

      this.logger.info(`Node replacement completed`, {
        oldNodeId: node.id,
        newNodeId: deploymentId,
        blockchain: node.blockchain
      });

    } catch (error) {
      this.logger.error('Failed to replace node', { error, nodeId: node.id });
    }
  }

  /**
   * Repair unhealthy node
   */
  private async repairNode(node: BlockchainNode): Promise<void> {
    try {
      this.logger.info(`Repairing node ${node.id}`);

      // Restart connection
      await this.nodeManager.disconnectNode(node.id);
      await this.nodeManager.connectBlockchain(node.blockchain);

      this.logger.info(`Node repair completed`, { nodeId: node.id });

    } catch (error) {
      this.logger.error('Failed to repair node', { error, nodeId: node.id });
      // If repair fails, mark for replacement
      await this.replaceNode(node);
    }
  }

  /**
   * Start auto-scaling monitoring
   */
  private startAutoScaling(): void {
    setInterval(async () => {
      await this.performAutoScaling();
    }, 60000); // Check every minute
  }

  /**
   * Perform auto-scaling based on load
   */
  private async performAutoScaling(): Promise<void> {
    for (const [blockchain, rules] of Array.from(this.autoScalingRules.entries())) {
      try {
        const currentNodes = this.nodeManager.getNodesByBlockchain(blockchain);
        const activeNodes = currentNodes.filter(node => node.status === 'connected');

        // Calculate current load
        const totalCapacity = activeNodes.reduce((sum, node) => {
          const deployment = Array.from(this.deployments.values())
            .find(d => d.nodeId === node.id);
          return sum + (deployment?.maxCapacity || 100000);
        }, 0);

        const currentLoad = activeNodes.reduce((sum, node) => {
          const deployment = Array.from(this.deployments.values())
            .find(d => d.nodeId === node.id);
          return sum + (deployment?.currentLoad || 0);
        }, 0);

        const loadPercentage = totalCapacity > 0 ? (currentLoad / totalCapacity) * 100 : 0;

        this.logger.debug('Auto-scaling check', {
          blockchain,
          activeNodes: activeNodes.length,
          loadPercentage: loadPercentage.toFixed(1),
          rules
        });

        // Scale up if needed
        if (loadPercentage > rules.scaleUpThreshold && activeNodes.length < rules.maxNodes) {
          await this.scaleUp(blockchain);
        }

        // Scale down if needed
        if (loadPercentage < rules.scaleDownThreshold && activeNodes.length > rules.minNodes) {
          await this.scaleDown(blockchain);
        }

      } catch (error) {
        this.logger.error('Auto-scaling failed', { error, blockchain });
      }
    }
  }

  /**
   * Scale up blockchain nodes
   */
  private async scaleUp(blockchain: BlockchainType): Promise<void> {
    try {
      const rules = this.autoScalingRules.get(blockchain)!;
      const currentNodes = this.nodeManager.getNodesByBlockchain(blockchain).length;

      if (currentNodes >= rules.maxNodes) {
        this.logger.warn(`Cannot scale up ${blockchain}: already at maximum nodes`);
        return;
      }

      this.logger.info(`Scaling up ${blockchain} nodes`);

      // Deploy additional nodes
      const nodesToDeploy = Math.min(2, rules.maxNodes - currentNodes); // Deploy 1-2 nodes at a time
      const deploymentPromises = [];

      for (let i = 0; i < nodesToDeploy; i++) {
        deploymentPromises.push(this.deployNode(blockchain));
      }

      await Promise.all(deploymentPromises);

      this.logger.info(`Scale up completed for ${blockchain}: deployed ${nodesToDeploy} nodes`);

    } catch (error) {
      this.logger.error('Scale up failed', { error, blockchain });
    }
  }

  /**
   * Scale down blockchain nodes
   */
  private async scaleDown(blockchain: BlockchainType): Promise<void> {
    try {
      const rules = this.autoScalingRules.get(blockchain)!;
      const currentNodes = this.nodeManager.getNodesByBlockchain(blockchain);

      if (currentNodes.length <= rules.minNodes) {
        this.logger.warn(`Cannot scale down ${blockchain}: already at minimum nodes`);
        return;
      }

      this.logger.info(`Scaling down ${blockchain} nodes`);

      // Remove least loaded nodes
      const sortedNodes = currentNodes
        .filter(node => node.status === 'connected')
        .sort((a, b) => {
          const aLoad = this.deployments.get(a.id)?.currentLoad || 0;
          const bLoad = this.deployments.get(b.id)?.currentLoad || 0;
          return aLoad - bLoad;
        });

      const nodesToRemove = Math.min(1, sortedNodes.length - rules.minNodes);

      for (let i = 0; i < nodesToRemove; i++) {
        await this.nodeManager.disconnectNode(sortedNodes[i]!.id);
      }

      this.logger.info(`Scale down completed for ${blockchain}: removed ${nodesToRemove} nodes`);

    } catch (error) {
      this.logger.error('Scale down failed', { error, blockchain });
    }
  }

  /**
   * Get cluster statistics
   */
  getClusterStats(): Record<string, any> {
    const stats: Record<string, any> = {
      totalDeployments: this.deployments.size,
      totalHealthChecks: this.healthMetrics.size,
      deployments: Array.from(this.deployments.values()).map(d => ({
        id: d.nodeId,
        blockchain: d.blockchain,
        type: d.type,
        region: d.region,
        costPerHour: d.costPerHour,
        currentLoad: d.currentLoad,
        capacity: d.maxCapacity,
        utilization: d.maxCapacity > 0 ? (d.currentLoad / d.maxCapacity) * 100 : 0
      })),
      healthMetrics: Array.from(this.healthMetrics.values()).map(m => ({
        nodeId: m.nodeId,
        blockchain: m.blockchain,
        status: m.status,
        healthScore: this.calculateHealthScore(m),
        cpuUsage: m.cpuUsage,
        memoryUsage: m.memoryUsage,
        networkLatency: m.networkLatency,
        errorRate: m.errorRate
      }))
    };

    return stats;
  }

  /**
   * Get node health metrics
   */
  getNodeHealth(nodeId: string): NodeHealthMetrics | undefined {
    return this.healthMetrics.get(nodeId);
  }

  /**
   * Get all deployments
   */
  getDeployments(): NodeDeployment[] {
    return Array.from(this.deployments.values());
  }

  /**
   * Update deployment load
   */
  updateDeploymentLoad(nodeId: string, load: number): void {
    const deployment = this.deployments.get(nodeId);
    if (deployment) {
      deployment.currentLoad = load;
      this.deployments.set(nodeId, deployment);
    }
  }

  // === ENHANCED SELF-HEALING FEATURES ===

  /**
   * Deploy nodes globally across multiple regions
   */
  async deployNodesGlobally(blockchain: BlockchainType, nodeCount: number): Promise<string[]> {
    this.logger.info(`Deploying ${nodeCount} nodes globally for ${blockchain}`);

    const deployedNodes: string[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const region = await this.selectOptimalRegion(blockchain);
      const nodeId = await this.deployNodeInRegion(blockchain, region);

      if (nodeId) {
        deployedNodes.push(nodeId);
        this.logger.info(`Successfully deployed node ${nodeId} in region ${region}`);
      }
    }

    return deployedNodes;
  }


  /**
   * Auto-repair degraded nodes
   */
  async performAutoRepair(nodeId: string): Promise<boolean> {
    if (!this.config.autoRepairEnabled) {
      return false;
    }

    const deployment = this.deployments.get(nodeId);
    if (!deployment) {
      return false;
    }

    const repairEvent: AutoRepairEvent = {
      id: `repair_${Date.now()}_${nodeId}`,
      nodeId,
      eventType: 'restart', // Start with restart
      timestamp: new Date(),
      duration: 0,
      success: false,
      cost: 0
    };

    try {
      this.logger.info(`Starting auto-repair for node ${nodeId}`);

      // Attempt restart first
      const restartSuccess = await this.restartNode(nodeId);

      if (restartSuccess) {
        repairEvent.eventType = 'restart';
        repairEvent.success = true;
        repairEvent.duration = Date.now() - repairEvent.timestamp.getTime();
        repairEvent.cost = this.calculateRepairCost(repairEvent.eventType);

        this.recordRepairEvent(nodeId, repairEvent);
        this.logger.info(`Successfully restarted node ${nodeId}`);
        return true;
      }

      // If restart fails, try redeployment
      const redeploySuccess = await this.redeployNode(nodeId);

      if (redeploySuccess) {
        repairEvent.eventType = 'redeploy';
        repairEvent.success = true;
        repairEvent.duration = Date.now() - repairEvent.timestamp.getTime();
        repairEvent.cost = this.calculateRepairCost(repairEvent.eventType);

        this.recordRepairEvent(nodeId, repairEvent);
        this.logger.info(`Successfully redeployed node ${nodeId}`);
        return true;
      }

      // If both fail, mark as failed
      repairEvent.errorMessage = 'Both restart and redeployment failed';
      repairEvent.duration = Date.now() - repairEvent.timestamp.getTime();
      repairEvent.cost = this.calculateRepairCost('restart');

      this.recordRepairEvent(nodeId, repairEvent);
      this.logger.error(`Auto-repair failed for node ${nodeId}`);

      return false;

    } catch (error) {
      repairEvent.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      repairEvent.duration = Date.now() - repairEvent.timestamp.getTime();

      this.recordRepairEvent(nodeId, repairEvent);
      this.logger.error(`Auto-repair error for node ${nodeId}`, { error });

      return false;
    }
  }

  /**
   * Detect and handle compromised nodes
   */
  async detectCompromisedNodes(): Promise<string[]> {
    if (!this.config.compromisedNodeDetection) {
      return [];
    }

    const compromisedNodes: string[] = [];

    for (const [nodeId, deployment] of Array.from(this.deployments.entries())) {
      const isCompromised = await this.performSecurityScan(nodeId);

      if (isCompromised) {
        compromisedNodes.push(nodeId);
        await this.handleCompromisedNode(nodeId);
      }
    }

    return compromisedNodes;
  }

  /**
   * Get predictive scaling recommendations
   */
  async getScalingRecommendations(): Promise<ScalingRecommendation[]> {
    if (!this.config.predictiveScaling || !this.predictiveScalingModel) {
      return [];
    }

    const recommendations: ScalingRecommendation[] = [];

    for (const blockchain of this.nodeManager.getSupportedBlockchains()) {
      const currentNodes = this.getActiveNodesForBlockchain(blockchain);
      const predictedLoad = await this.predictBlockchainLoad(blockchain);

      const recommendation = this.generateScalingRecommendation(blockchain, currentNodes, predictedLoad);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  /**
   * Initialize auto-scaling rules
   */
  private initializeAutoScalingRules(): void {
    const blockchains = this.nodeManager.getSupportedBlockchains();

    for (const blockchain of blockchains) {
      this.autoScalingRules.set(blockchain, {
        minNodes: this.config.minNodesPerBlockchain,
        maxNodes: this.config.maxNodesPerBlockchain,
        scaleUpThreshold: 80, // Scale up when load > 80%
        scaleDownThreshold: 30 // Scale down when load < 30%
      });
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    setInterval(async () => {
      await this.performHealthChecks();
      await this.performAutoScaling();
      await this.performSecurityMonitoring();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform security monitoring
   */
  private async performSecurityMonitoring(): Promise<void> {
    if (!this.config.securityMonitoring) return;

    try {
      // Perform security scans on all deployments
      for (const [nodeId, deployment] of Array.from(this.deployments.entries())) {
        const isCompromised = await this.performSecurityScan(nodeId);
        if (isCompromised) {
          this.logger.warn(`Compromised node detected: ${nodeId}`);
          await this.handleCompromisedNode(nodeId);
        }
      }
    } catch (error) {
      this.logger.error('Security monitoring failed', { error });
    }
  }

  /**
   * Initialize predictive scaling
   */
  private async initializePredictiveScaling(): Promise<void> {
    this.predictiveScalingModel = {
      modelType: 'lstm',
      accuracy: 85,
      trainingDataPoints: 10000,
      lastTrained: new Date(),
      predictionHorizon: 24,
      features: ['historical_load', 'network_activity', 'gas_prices', 'block_times']
    };

    this.logger.info('Predictive scaling model initialized');
  }

  /**
   * Start compromised node detection
   */
  private startCompromisedNodeDetection(): void {
    setInterval(async () => {
      const compromisedNodes = await this.detectCompromisedNodes();
      if (compromisedNodes.length > 0) {
        this.logger.warn(`Detected ${compromisedNodes.length} compromised nodes`, { compromisedNodes });
      }
    }, this.compromisedNodeDetection.securityScans.frequency);
  }

  /**
   * Select cost-optimized region
   */
  private selectCostOptimizedRegion(): string {
    const regionCosts = {
      'us-east-1': 0.10,
      'eu-west-1': 0.12,
      'ap-southeast-1': 0.15,
      'us-west-2': 0.11
    };

    let cheapestRegion = 'us-east-1';
    let lowestCost = regionCosts['us-east-1'];

    for (const [region, cost] of Object.entries(regionCosts)) {
      if (cost < lowestCost) {
        lowestCost = cost;
        cheapestRegion = region;
      }
    }

    return cheapestRegion;
  }

  /**
   * Select performance-optimized region
   */
  private selectPerformanceOptimizedRegion(blockchain: BlockchainType): string {
    // For performance, prefer regions with high-speed connections
    const performanceRegions = ['us-east-1', 'eu-west-1', 'ap-northeast-1'];
    return performanceRegions[Math.floor(Math.random() * performanceRegions.length)]!;
  }

  /**
   * Select latency-optimized region
   */
  private selectLatencyOptimizedRegion(): string {
    // For latency, prefer geographically closer regions
    return 'us-east-1'; // Default, could be enhanced with user location detection
  }

  /**
   * Remove node from cluster
   */
  private async removeNode(nodeId: string): Promise<void> {
    const deployment = this.deployments.get(nodeId);
    if (deployment) {
      this.deployments.delete(nodeId);
      this.logger.info(`Removed node ${nodeId} from cluster`);
    }
  }

  /**
   * Select redundancy-optimized region
   */
  private selectRedundancyOptimizedRegion(): string {
    // For redundancy, prefer regions with existing nodes
    const existingRegions = new Set(Array.from(this.deployments.values()).map(d => d.region));
    const availableRegions = this.globalDeploymentStrategy.targetRegions.filter(r => !existingRegions.has(r));

    return availableRegions.length > 0 ? availableRegions[0]! : 'us-east-1';
  }

  /**
   * Deploy node in specific region
   */
  private async deployNodeInRegion(blockchain: BlockchainType, region: string): Promise<string | null> {
    try {
      // Enhanced deployment with region-specific configuration
      const nodeId = `node_${blockchain}_${region}_${Date.now()}`;

      const deployment: NodeDeployment = {
        nodeId,
        blockchain,
        type: 'full',
        region,
        provider: 'infura', // Default provider, will be updated by manager
        deploymentTime: new Date(),
        costPerHour: this.calculateDeploymentCost('full', region),
        maxCapacity: 1000,
        currentLoad: 0,
        securityScore: 95,
        performanceScore: 90,
        reliabilityScore: 98,
        lastSecurityScan: new Date(),
        backupNodes: [],
        autoRepairHistory: []
      };

      this.deployments.set(nodeId, deployment);
      await this.nodeManager.connectBlockchain(blockchain);

      return nodeId;

    } catch (error) {
      this.logger.error(`Failed to deploy node in region ${region}`, { error, blockchain });
      return null;
    }
  }


  /**
   * Restart node
   */
  private async restartNode(nodeId: string): Promise<boolean> {
    try {
      // Simulate node restart
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second restart time

      const deployment = this.deployments.get(nodeId);
      if (deployment) {
        deployment.lastSecurityScan = new Date();
        deployment.performanceScore = Math.min(100, deployment.performanceScore + 5);
        this.deployments.set(nodeId, deployment);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Redeploy node
   */
  private async redeployNode(nodeId: string): Promise<boolean> {
    try {
      // Simulate node redeployment
      await new Promise(resolve => setTimeout(resolve, 15000)); // 15 second redeployment time

      const deployment = this.deployments.get(nodeId);
      if (deployment) {
        deployment.deploymentTime = new Date();
        deployment.performanceScore = 95;
        deployment.reliabilityScore = Math.min(100, deployment.reliabilityScore + 2);
        this.deployments.set(nodeId, deployment);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Calculate repair cost
   */
  private calculateRepairCost(eventType: string): number {
    const costs = {
      'restart': 0.01,
      'redeploy': 0.05,
      'configuration_update': 0.02,
      'security_patch': 0.03
    };

    return costs[eventType as keyof typeof costs] || 0.01;
  }

  /**
   * Record repair event
   */
  private recordRepairEvent(nodeId: string, event: AutoRepairEvent): void {
    const history = this.repairHistory.get(nodeId) || [];
    history.push(event);
    this.repairHistory.set(nodeId, history);

    const deployment = this.deployments.get(nodeId);
    if (deployment) {
      deployment.autoRepairHistory.push(event);
      this.deployments.set(nodeId, deployment);
    }
  }

  /**
   * Perform security scan
   */
  private async performSecurityScan(nodeId: string): Promise<boolean> {
    try {
      // Simulate security scanning
      const threats = Math.random() * 10; // 0-10 threats
      const vulnerabilities = threats > 5 ? ['high_cpu', 'unusual_connections'] : [];

      this.securityMetrics.set(nodeId, {
        threats: threats,
        vulnerabilities,
        lastScan: new Date()
      });

      return threats > 7; // Compromised if more than 7 threats

    } catch (error) {
      this.logger.error(`Security scan failed for node ${nodeId}`, { error });
      return false;
    }
  }

  /**
   * Handle compromised node
   */
  private async handleCompromisedNode(nodeId: string): Promise<void> {
    this.logger.warn(`Handling compromised node ${nodeId}`);

    if (this.compromisedNodeDetection.responseActions.isolation) {
      await this.isolateNode(nodeId);
    }

    if (this.compromisedNodeDetection.responseActions.dataWiping) {
      await this.wipeNodeData(nodeId);
    }

    if (this.compromisedNodeDetection.responseActions.forensicAnalysis) {
      await this.performForensicAnalysis(nodeId);
    }

    // Replace the compromised node
    await this.replaceCompromisedNode(nodeId);
  }

  /**
   * Isolate compromised node
   */
  private async isolateNode(nodeId: string): Promise<void> {
    this.logger.info(`Isolating compromised node ${nodeId}`);

    const deployment = this.deployments.get(nodeId);
    if (deployment) {
      deployment.securityScore = 0;
      deployment.status = 'critical';
      this.deployments.set(nodeId, deployment);
    }

    // Remove from load balancer
    // Implementation would depend on load balancer setup
  }

  /**
   * Wipe node data
   */
  private async wipeNodeData(nodeId: string): Promise<void> {
    this.logger.info(`Wiping data from compromised node ${nodeId}`);

    // Simulate data wiping
    await new Promise(resolve => setTimeout(resolve, 3000));

    const deployment = this.deployments.get(nodeId);
    if (deployment) {
      deployment.securityScore = 50; // Partial recovery
      this.deployments.set(nodeId, deployment);
    }
  }

  /**
   * Perform forensic analysis
   */
  private async performForensicAnalysis(nodeId: string): Promise<void> {
    this.logger.info(`Performing forensic analysis on node ${nodeId}`);

    // Simulate forensic analysis
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Log findings
    this.logger.info(`Forensic analysis completed for node ${nodeId}`);
  }

  /**
   * Replace compromised node
   */
  private async replaceCompromisedNode(nodeId: string): Promise<void> {
    const deployment = this.deployments.get(nodeId);
    if (!deployment) return;

    this.logger.info(`Replacing compromised node ${nodeId}`);

    // Deploy replacement node
    const newNodeId = await this.deployNodeInRegion(deployment.blockchain, deployment.region);

    if (newNodeId) {
      // Migrate load to new node
      await this.migrateLoadToNode(nodeId, newNodeId);

      // Remove old node
      await this.removeNode(nodeId);

      this.logger.info(`Successfully replaced node ${nodeId} with ${newNodeId}`);
    }
  }

  /**
   * Migrate load to new node
   */
  private async migrateLoadToNode(oldNodeId: string, newNodeId: string): Promise<void> {
    // Load migration logic would go here
    this.logger.info(`Migrating load from ${oldNodeId} to ${newNodeId}`);
  }

  /**
   * Get active nodes for blockchain
   */
  private getActiveNodesForBlockchain(blockchain: BlockchainType): number {
    return Array.from(this.deployments.values())
      .filter(d => d.blockchain === blockchain && d.currentLoad > 0).length;
  }

  /**
   * Predict blockchain load
   */
  private async predictBlockchainLoad(blockchain: BlockchainType): Promise<number> {
    // AI-based load prediction
    // For demo, return a random prediction between 40-90%
    return Math.random() * 50 + 40;
  }

  /**
   * Generate scaling recommendation
   */
  private generateScalingRecommendation(blockchain: BlockchainType, currentNodes: number, predictedLoad: number): ScalingRecommendation | null {
    const rules = this.autoScalingRules.get(blockchain);
    if (!rules) return null;

    let recommendedNodes = currentNodes;
    let reasoning = '';

    if (predictedLoad > rules.scaleUpThreshold && currentNodes < rules.maxNodes) {
      recommendedNodes = Math.min(currentNodes + 1, rules.maxNodes);
      reasoning = `Predicted load ${predictedLoad}% exceeds threshold ${rules.scaleUpThreshold}%`;
    } else if (predictedLoad < rules.scaleDownThreshold && currentNodes > rules.minNodes) {
      recommendedNodes = Math.max(currentNodes - 1, rules.minNodes);
      reasoning = `Predicted load ${predictedLoad}% below threshold ${rules.scaleDownThreshold}%`;
    }

    if (recommendedNodes === currentNodes) {
      return null; // No scaling needed
    }

    return {
      blockchain,
      currentNodes,
      recommendedNodes,
      confidence: 85,
      reasoning,
      expectedCost: this.calculateScalingCost(blockchain, recommendedNodes - currentNodes),
      expectedPerformance: 90
    };
  }

  /**
   * Calculate scaling cost
   */
  private calculateScalingCost(blockchain: BlockchainType, nodeDelta: number): number {
    const baseCost = 0.10; // $0.10 per hour per node
    return Math.abs(nodeDelta) * baseCost;
  }
}
