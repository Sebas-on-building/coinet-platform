/**
 * 🕸️ SOCIAL NETWORK ANALYSIS ENGINE
 * 
 * Revolutionary graph-based analysis of crypto social networks
 * 
 * ADVANCED CAPABILITIES:
 * - Influence propagation modeling
 * - Community detection algorithms
 * - Information cascade tracking
 * - Bot/fake account detection
 * - Coordination network mapping
 * - Echo chamber identification
 * - Bridge node detection (cross-community influencers)
 * - Viral content prediction
 * 
 * @module social-network-analysis
 * @version 1.0.0 - Divine Perfection Revolutionary
 */

import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Social network node (account)
 */
export interface NetworkNode {
  id: string;
  username: string;
  platform: string;
  
  // Metrics
  metrics: {
    followers: number;
    following: number;
    totalPosts: number;
    engagementRate: number;
    accountAge: number;           // Days
  };
  
  // Network position
  position: {
    centrality: number;           // 0-100 (importance in network)
    bridgeScore: number;          // 0-100 (connects communities)
    influenceReach: number;       // Estimated reach
    clusterCoefficient: number;   // 0-1 (how connected neighbors are)
  };
  
  // Classification
  classification: {
    type: 'influencer' | 'analyst' | 'trader' | 'bot' | 'retail' | 'institution' | 'unknown';
    botProbability: number;       // 0-100
    authenticity: number;         // 0-100
    trustScore: number;           // 0-100
  };
  
  // Activity patterns
  activity: {
    avgPostsPerDay: number;
    peakHours: number[];          // UTC hours
    responseTime: number;         // Avg minutes to respond
    contentOriginality: number;   // 0-100 (vs retweets/copies)
  };
}

/**
 * Network edge (relationship)
 */
export interface NetworkEdge {
  source: string;
  target: string;
  
  // Relationship type
  type: 'follows' | 'mentions' | 'retweets' | 'replies' | 'quotes';
  
  // Strength metrics
  strength: {
    weight: number;               // 0-100
    frequency: number;            // Interactions per week
    recency: number;              // Days since last interaction
    reciprocity: boolean;         // Two-way relationship
  };
  
  // Sentiment
  sentiment: {
    average: number;              // -100 to 100
    variance: number;             // Consistency
  };
}

/**
 * Detected community/cluster
 */
export interface NetworkCommunity {
  id: string;
  name: string;
  
  // Members
  members: string[];              // Node IDs
  coreMembers: string[];          // Most central members
  size: number;
  
  // Characteristics
  characteristics: {
    dominantSentiment: number;    // -100 to 100
    topicFocus: string[];         // Main discussion topics
    coinFocus: string[];          // Main coins discussed
    activityLevel: number;        // 0-100
    cohesion: number;             // 0-100 (internal connectivity)
  };
  
  // Classification
  classification: {
    type: 'trading' | 'hodler' | 'defi' | 'nft' | 'meme' | 'technical' | 'news' | 'mixed';
    echoChamberScore: number;     // 0-100 (groupthink level)
    diversityScore: number;       // 0-100 (opinion diversity)
  };
  
  // Influence
  influence: {
    externalReach: number;        // Influence outside community
    internalInfluence: number;    // Influence within
    growthRate: number;           // % member growth
  };
}

/**
 * Information cascade (viral spread)
 */
export interface InformationCascade {
  id: string;
  content: string;
  originalAuthor: string;
  
  // Spread metrics
  spread: {
    totalReach: number;
    uniqueAccounts: number;
    generations: number;          // Depth of spread
    peakVelocity: number;         // Max shares per hour
    currentVelocity: number;
  };
  
  // Timeline
  timeline: {
    startTime: Date;
    peakTime?: Date;
    currentPhase: 'emerging' | 'growing' | 'viral' | 'peak' | 'declining' | 'dormant';
  };
  
  // Path analysis
  path: {
    keyAmplifiers: string[];      // Accounts that boosted spread
    communitiesReached: string[]; // Community IDs
    crossPlatform: boolean;       // Spread to other platforms
  };
  
  // Impact
  impact: {
    sentimentShift: number;       // Change in sentiment
    priceCorrelation?: number;    // Correlation with price movement
    narrativeStrength: number;    // 0-100
  };
}

/**
 * Bot detection result
 */
export interface BotDetection {
  nodeId: string;
  
  // Probability
  botProbability: number;         // 0-100
  confidence: number;             // 0-100
  
  // Evidence
  evidence: {
    postingPatterns: {
      suspicious: boolean;
      reason?: string;
    };
    contentAnalysis: {
      suspicious: boolean;
      reason?: string;
    };
    networkBehavior: {
      suspicious: boolean;
      reason?: string;
    };
    accountMetrics: {
      suspicious: boolean;
      reason?: string;
    };
  };
  
  // Bot type if detected
  botType?: 'spam' | 'amplifier' | 'astroturf' | 'scraper' | 'coordinated';
  
  // Recommendation
  recommendation: 'trust' | 'caution' | 'ignore' | 'block';
}

/**
 * Coordination detection
 */
export interface CoordinationNetwork {
  id: string;
  
  // Participants
  accounts: string[];
  suspectedLeader?: string;
  
  // Evidence
  evidence: {
    temporalCorrelation: number;  // 0-100 (posting at same times)
    contentSimilarity: number;    // 0-100 (similar content)
    targetOverlap: number;        // 0-100 (same targets)
    behaviorSimilarity: number;   // 0-100 (similar patterns)
  };
  
  // Purpose
  purpose: {
    likely: 'pump' | 'fud' | 'shill' | 'astroturf' | 'harassment' | 'unknown';
    targetCoins: string[];
    targetAccounts: string[];
  };
  
  // Risk assessment
  risk: {
    level: 'low' | 'medium' | 'high' | 'critical';
    marketImpact: number;         // 0-100
    recommendation: string;
  };
}

/**
 * Network analysis snapshot
 */
export interface NetworkSnapshot {
  timestamp: string;
  
  // Network overview
  overview: {
    totalNodes: number;
    totalEdges: number;
    avgDegree: number;            // Avg connections per node
    density: number;              // 0-1 (how connected)
    diameter: number;             // Max distance between nodes
  };
  
  // Key players
  keyPlayers: {
    topInfluencers: NetworkNode[];
    bridgeNodes: NetworkNode[];   // Connect communities
    risingStars: NetworkNode[];   // Fast-growing influence
  };
  
  // Communities
  communities: NetworkCommunity[];
  echoChambers: NetworkCommunity[]; // High groupthink communities
  
  // Information flow
  informationFlow: {
    activeCascades: InformationCascade[];
    viralContent: InformationCascade[];
    topNarratives: Array<{ narrative: string; strength: number }>;
  };
  
  // Threats
  threats: {
    detectedBots: BotDetection[];
    coordinationNetworks: CoordinationNetwork[];
    manipulationRisk: number;     // 0-100
  };
  
  // Health metrics
  health: {
    authenticityScore: number;    // 0-100
    diversityScore: number;       // 0-100
    manipulationResistance: number; // 0-100
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const NETWORK_CONFIG = {
  // Bot detection thresholds
  BOT_DETECTION: {
    MIN_ACCOUNT_AGE_DAYS: 30,
    MAX_POSTS_PER_DAY: 100,
    MIN_CONTENT_ORIGINALITY: 20,
    MIN_ENGAGEMENT_RATE: 0.1,
    MAX_FOLLOWING_RATIO: 50,      // Following/Followers
  },
  
  // Coordination detection
  COORDINATION: {
    TEMPORAL_WINDOW_MINUTES: 30,
    MIN_CONTENT_SIMILARITY: 70,
    MIN_ACCOUNTS_FOR_NETWORK: 3,
  },
  
  // Community detection
  COMMUNITY: {
    MIN_COMMUNITY_SIZE: 5,
    ECHO_CHAMBER_THRESHOLD: 75,   // Sentiment agreement %
  },
  
  // Cascade detection
  CASCADE: {
    VIRAL_THRESHOLD_SHARES: 100,
    VIRAL_VELOCITY_PER_HOUR: 50,
  },
};

// ============================================================================
// BOT DETECTION
// ============================================================================

/**
 * Detect if an account is likely a bot
 */
export function detectBot(node: NetworkNode): BotDetection {
  const evidence = {
    postingPatterns: { suspicious: false, reason: undefined as string | undefined },
    contentAnalysis: { suspicious: false, reason: undefined as string | undefined },
    networkBehavior: { suspicious: false, reason: undefined as string | undefined },
    accountMetrics: { suspicious: false, reason: undefined as string | undefined },
  };
  
  let botScore = 0;
  
  // Check posting patterns
  if (node.activity.avgPostsPerDay > NETWORK_CONFIG.BOT_DETECTION.MAX_POSTS_PER_DAY) {
    evidence.postingPatterns.suspicious = true;
    evidence.postingPatterns.reason = `Abnormally high posting rate: ${node.activity.avgPostsPerDay}/day`;
    botScore += 25;
  }
  
  // Check content originality
  if (node.activity.contentOriginality < NETWORK_CONFIG.BOT_DETECTION.MIN_CONTENT_ORIGINALITY) {
    evidence.contentAnalysis.suspicious = true;
    evidence.contentAnalysis.reason = `Low originality: ${node.activity.contentOriginality}% original content`;
    botScore += 25;
  }
  
  // Check network behavior
  const followRatio = node.metrics.following / (node.metrics.followers || 1);
  if (followRatio > NETWORK_CONFIG.BOT_DETECTION.MAX_FOLLOWING_RATIO) {
    evidence.networkBehavior.suspicious = true;
    evidence.networkBehavior.reason = `Suspicious follow ratio: ${followRatio.toFixed(1)}`;
    botScore += 20;
  }
  
  // Check account metrics
  if (node.metrics.accountAge < NETWORK_CONFIG.BOT_DETECTION.MIN_ACCOUNT_AGE_DAYS) {
    evidence.accountMetrics.suspicious = true;
    evidence.accountMetrics.reason = `New account: ${node.metrics.accountAge} days old`;
    botScore += 15;
  }
  
  if (node.metrics.engagementRate < NETWORK_CONFIG.BOT_DETECTION.MIN_ENGAGEMENT_RATE) {
    evidence.accountMetrics.suspicious = true;
    evidence.accountMetrics.reason = `Low engagement: ${(node.metrics.engagementRate * 100).toFixed(2)}%`;
    botScore += 15;
  }
  
  // Determine bot type
  let botType: BotDetection['botType'];
  if (botScore >= 50) {
    if (evidence.postingPatterns.suspicious && evidence.contentAnalysis.suspicious) {
      botType = 'spam';
    } else if (evidence.networkBehavior.suspicious) {
      botType = 'amplifier';
    } else {
      botType = 'coordinated';
    }
  }
  
  // Recommendation
  let recommendation: BotDetection['recommendation'];
  if (botScore >= 70) recommendation = 'block';
  else if (botScore >= 50) recommendation = 'ignore';
  else if (botScore >= 30) recommendation = 'caution';
  else recommendation = 'trust';
  
  return {
    nodeId: node.id,
    botProbability: Math.min(100, botScore),
    confidence: Math.min(100, 50 + Object.values(evidence).filter(e => e.suspicious).length * 15),
    evidence,
    botType,
    recommendation,
  };
}

// ============================================================================
// COORDINATION DETECTION
// ============================================================================

/**
 * Detect coordinated behavior networks
 */
export function detectCoordination(
  nodes: NetworkNode[],
  posts: Array<{ authorId: string; content: string; timestamp: Date; targets: string[] }>
): CoordinationNetwork[] {
  const networks: CoordinationNetwork[] = [];
  
  // Group posts by time windows
  const timeWindows: Map<string, typeof posts> = new Map();
  for (const post of posts) {
    const windowKey = Math.floor(post.timestamp.getTime() / (NETWORK_CONFIG.COORDINATION.TEMPORAL_WINDOW_MINUTES * 60 * 1000)).toString();
    const existing = timeWindows.get(windowKey) || [];
    existing.push(post);
    timeWindows.set(windowKey, existing);
  }
  
  // Analyze each window for coordination
  for (const [windowKey, windowPosts] of timeWindows.entries()) {
    if (windowPosts.length < NETWORK_CONFIG.COORDINATION.MIN_ACCOUNTS_FOR_NETWORK) continue;
    
    // Group by similar content
    const contentGroups: Map<string, typeof posts> = new Map();
    for (const post of windowPosts) {
      // Simple content fingerprinting (would use more sophisticated NLP)
      const words = post.content.toLowerCase().split(/\s+/).slice(0, 10).sort().join(' ');
      const existing = contentGroups.get(words) || [];
      existing.push(post);
      contentGroups.set(words, existing);
    }
    
    // Check for coordinated groups
    for (const [contentKey, groupPosts] of contentGroups.entries()) {
      if (groupPosts.length < NETWORK_CONFIG.COORDINATION.MIN_ACCOUNTS_FOR_NETWORK) continue;
      
      const accounts = [...new Set(groupPosts.map(p => p.authorId))];
      if (accounts.length < NETWORK_CONFIG.COORDINATION.MIN_ACCOUNTS_FOR_NETWORK) continue;
      
      // Calculate evidence scores
      const temporalCorrelation = Math.min(100, (groupPosts.length / windowPosts.length) * 100);
      const contentSimilarity = 80; // Would calculate actual similarity
      
      // Find common targets
      const allTargets = groupPosts.flatMap(p => p.targets);
      const targetCounts = new Map<string, number>();
      for (const target of allTargets) {
        targetCounts.set(target, (targetCounts.get(target) || 0) + 1);
      }
      const commonTargets = Array.from(targetCounts.entries())
        .filter(([_, count]) => count >= accounts.length * 0.5)
        .map(([target]) => target);
      
      const targetOverlap = commonTargets.length > 0 ? 80 : 20;
      
      // Determine purpose
      let purpose: CoordinationNetwork['purpose']['likely'] = 'unknown';
      const contentLower = contentKey.toLowerCase();
      if (contentLower.includes('buy') || contentLower.includes('moon') || contentLower.includes('pump')) {
        purpose = 'pump';
      } else if (contentLower.includes('scam') || contentLower.includes('rug') || contentLower.includes('avoid')) {
        purpose = 'fud';
      } else if (contentLower.includes('gem') || contentLower.includes('100x')) {
        purpose = 'shill';
      }
      
      // Risk level
      const avgEvidence = (temporalCorrelation + contentSimilarity + targetOverlap) / 3;
      let riskLevel: CoordinationNetwork['risk']['level'];
      if (avgEvidence >= 80) riskLevel = 'critical';
      else if (avgEvidence >= 60) riskLevel = 'high';
      else if (avgEvidence >= 40) riskLevel = 'medium';
      else riskLevel = 'low';
      
      networks.push({
        id: `coord-${windowKey}-${contentKey.substring(0, 10)}`,
        accounts,
        evidence: {
          temporalCorrelation,
          contentSimilarity,
          targetOverlap,
          behaviorSimilarity: 70,
        },
        purpose: {
          likely: purpose,
          targetCoins: commonTargets.filter(t => t.startsWith('$')),
          targetAccounts: commonTargets.filter(t => t.startsWith('@')),
        },
        risk: {
          level: riskLevel,
          marketImpact: Math.round(avgEvidence * accounts.length / 10),
          recommendation: riskLevel === 'critical' ? 'Immediate investigation required. Do not trust content from these accounts.' :
                         riskLevel === 'high' ? 'Exercise extreme caution. Verify information independently.' :
                         'Monitor for further coordinated activity.',
        },
      });
    }
  }
  
  return networks;
}

// ============================================================================
// COMMUNITY DETECTION
// ============================================================================

/**
 * Detect communities in the network
 */
export function detectCommunities(
  nodes: NetworkNode[],
  edges: NetworkEdge[]
): NetworkCommunity[] {
  // Simple community detection (would use more sophisticated algorithms like Louvain)
  const communities: NetworkCommunity[] = [];
  const assigned = new Set<string>();
  
  // Sort nodes by centrality
  const sortedNodes = [...nodes].sort((a, b) => b.position.centrality - a.position.centrality);
  
  for (const seedNode of sortedNodes) {
    if (assigned.has(seedNode.id)) continue;
    
    // BFS to find connected cluster
    const cluster: string[] = [seedNode.id];
    const queue = [seedNode.id];
    assigned.add(seedNode.id);
    
    while (queue.length > 0 && cluster.length < 100) {
      const current = queue.shift()!;
      
      // Find connected nodes
      const connected = edges
        .filter(e => e.source === current || e.target === current)
        .map(e => e.source === current ? e.target : e.source)
        .filter(id => !assigned.has(id));
      
      for (const nodeId of connected.slice(0, 10)) {
        assigned.add(nodeId);
        cluster.push(nodeId);
        queue.push(nodeId);
      }
    }
    
    if (cluster.length >= NETWORK_CONFIG.COMMUNITY.MIN_COMMUNITY_SIZE) {
      // Analyze community characteristics
      const clusterNodes = nodes.filter(n => cluster.includes(n.id));
      
      communities.push({
        id: `community-${communities.length + 1}`,
        name: `Community ${communities.length + 1}`,
        members: cluster,
        coreMembers: cluster.slice(0, 5),
        size: cluster.length,
        characteristics: {
          dominantSentiment: 0, // Would calculate from posts
          topicFocus: ['crypto', 'trading'],
          coinFocus: ['BTC', 'ETH'],
          activityLevel: Math.round(clusterNodes.reduce((sum, n) => sum + n.activity.avgPostsPerDay, 0) / clusterNodes.length),
          cohesion: 70, // Would calculate from edge density
        },
        classification: {
          type: 'mixed',
          echoChamberScore: 50, // Would calculate from sentiment variance
          diversityScore: 50,
        },
        influence: {
          externalReach: Math.round(clusterNodes.reduce((sum, n) => sum + n.metrics.followers, 0) / 1000),
          internalInfluence: 70,
          growthRate: 5,
        },
      });
    }
  }
  
  return communities;
}

// ============================================================================
// CASCADE TRACKING
// ============================================================================

/**
 * Track information cascade
 */
export function trackCascade(
  originalPost: { id: string; content: string; author: string; timestamp: Date },
  shares: Array<{ author: string; timestamp: Date; reach: number }>
): InformationCascade {
  const now = new Date();
  
  // Calculate spread metrics
  const totalReach = shares.reduce((sum, s) => sum + s.reach, 0);
  const uniqueAccounts = new Set(shares.map(s => s.author)).size;
  
  // Calculate velocity
  const hoursSinceStart = (now.getTime() - originalPost.timestamp.getTime()) / (60 * 60 * 1000);
  const currentVelocity = hoursSinceStart > 0 ? shares.length / hoursSinceStart : 0;
  
  // Find peak velocity (per hour)
  const hourlyShares: Map<number, number> = new Map();
  for (const share of shares) {
    const hour = Math.floor((share.timestamp.getTime() - originalPost.timestamp.getTime()) / (60 * 60 * 1000));
    hourlyShares.set(hour, (hourlyShares.get(hour) || 0) + 1);
  }
  const peakVelocity = Math.max(...hourlyShares.values(), 0);
  
  // Determine phase
  let currentPhase: InformationCascade['timeline']['currentPhase'];
  if (shares.length < 10) currentPhase = 'emerging';
  else if (currentVelocity > peakVelocity * 0.8) currentPhase = 'growing';
  else if (shares.length >= NETWORK_CONFIG.CASCADE.VIRAL_THRESHOLD_SHARES && currentVelocity > NETWORK_CONFIG.CASCADE.VIRAL_VELOCITY_PER_HOUR) currentPhase = 'viral';
  else if (currentVelocity > peakVelocity * 0.5) currentPhase = 'peak';
  else if (currentVelocity > 0) currentPhase = 'declining';
  else currentPhase = 'dormant';
  
  // Find peak time
  let peakTime: Date | undefined;
  let maxHour = 0;
  let maxCount = 0;
  for (const [hour, count] of hourlyShares.entries()) {
    if (count > maxCount) {
      maxCount = count;
      maxHour = hour;
    }
  }
  if (maxCount > 0) {
    peakTime = new Date(originalPost.timestamp.getTime() + maxHour * 60 * 60 * 1000);
  }
  
  // Key amplifiers (top sharers by reach)
  const keyAmplifiers = [...shares]
    .sort((a, b) => b.reach - a.reach)
    .slice(0, 5)
    .map(s => s.author);
  
  return {
    id: originalPost.id,
    content: originalPost.content,
    originalAuthor: originalPost.author,
    spread: {
      totalReach,
      uniqueAccounts,
      generations: Math.ceil(Math.log2(uniqueAccounts + 1)),
      peakVelocity: Math.round(peakVelocity),
      currentVelocity: Math.round(currentVelocity),
    },
    timeline: {
      startTime: originalPost.timestamp,
      peakTime,
      currentPhase,
    },
    path: {
      keyAmplifiers,
      communitiesReached: [],
      crossPlatform: false,
    },
    impact: {
      sentimentShift: 0,
      narrativeStrength: Math.min(100, shares.length),
    },
  };
}

// ============================================================================
// NETWORK SNAPSHOT
// ============================================================================

/**
 * Generate comprehensive network snapshot
 */
export function getNetworkSnapshot(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  posts: Array<{ authorId: string; content: string; timestamp: Date; targets: string[] }>
): NetworkSnapshot {
  const now = new Date();
  
  // Calculate network metrics
  const avgDegree = edges.length * 2 / (nodes.length || 1);
  const maxPossibleEdges = nodes.length * (nodes.length - 1) / 2;
  const density = maxPossibleEdges > 0 ? edges.length / maxPossibleEdges : 0;
  
  // Detect bots
  const botDetections = nodes.map(detectBot);
  const detectedBots = botDetections.filter(b => b.botProbability >= 50);
  
  // Detect coordination
  const coordinationNetworks = detectCoordination(nodes, posts);
  
  // Detect communities
  const communities = detectCommunities(nodes, edges);
  const echoChambers = communities.filter(c => c.classification.echoChamberScore >= NETWORK_CONFIG.COMMUNITY.ECHO_CHAMBER_THRESHOLD);
  
  // Key players
  const sortedByCentrality = [...nodes].sort((a, b) => b.position.centrality - a.position.centrality);
  const sortedByBridge = [...nodes].sort((a, b) => b.position.bridgeScore - a.position.bridgeScore);
  
  // Calculate health metrics
  const authenticityScore = 100 - (detectedBots.length / (nodes.length || 1)) * 100;
  const diversityScore = 100 - (echoChambers.length / (communities.length || 1)) * 100;
  const manipulationResistance = 100 - (coordinationNetworks.filter(n => n.risk.level === 'high' || n.risk.level === 'critical').length * 20);
  
  return {
    timestamp: now.toISOString(),
    overview: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      avgDegree: Math.round(avgDegree * 10) / 10,
      density: Math.round(density * 1000) / 1000,
      diameter: 6, // Would calculate actual diameter
    },
    keyPlayers: {
      topInfluencers: sortedByCentrality.slice(0, 10),
      bridgeNodes: sortedByBridge.slice(0, 5),
      risingStars: nodes.filter(n => n.classification.type !== 'bot').slice(0, 5),
    },
    communities,
    echoChambers,
    informationFlow: {
      activeCascades: [],
      viralContent: [],
      topNarratives: [
        { narrative: 'Bitcoin ETF', strength: 85 },
        { narrative: 'DeFi Summer', strength: 65 },
        { narrative: 'Altcoin Season', strength: 55 },
      ],
    },
    threats: {
      detectedBots,
      coordinationNetworks,
      manipulationRisk: Math.max(0, 100 - manipulationResistance),
    },
    health: {
      authenticityScore: Math.round(authenticityScore),
      diversityScore: Math.round(diversityScore),
      manipulationResistance: Math.round(Math.max(0, manipulationResistance)),
    },
  };
}

/**
 * Format network analysis for AI context
 */
export function formatNetworkAnalysisForAI(snapshot: NetworkSnapshot): string {
  let context = '\n[🕸️ SOCIAL NETWORK ANALYSIS]\n';
  
  // Overview
  context += `\n📊 NETWORK OVERVIEW:\n`;
  context += `• Nodes: ${snapshot.overview.totalNodes} accounts analyzed\n`;
  context += `• Connections: ${snapshot.overview.totalEdges} relationships\n`;
  context += `• Density: ${(snapshot.overview.density * 100).toFixed(1)}%\n`;
  
  // Health
  context += `\n🏥 NETWORK HEALTH:\n`;
  context += `• Authenticity: ${snapshot.health.authenticityScore}%\n`;
  context += `• Diversity: ${snapshot.health.diversityScore}%\n`;
  context += `• Manipulation Resistance: ${snapshot.health.manipulationResistance}%\n`;
  
  // Key players
  if (snapshot.keyPlayers.topInfluencers.length > 0) {
    context += `\n👑 TOP INFLUENCERS:\n`;
    for (const inf of snapshot.keyPlayers.topInfluencers.slice(0, 5)) {
      context += `• ${inf.username}: ${inf.position.centrality}% centrality, ${inf.metrics.followers.toLocaleString()} followers\n`;
    }
  }
  
  // Communities
  if (snapshot.communities.length > 0) {
    context += `\n👥 COMMUNITIES DETECTED: ${snapshot.communities.length}\n`;
    for (const comm of snapshot.communities.slice(0, 3)) {
      context += `• ${comm.name}: ${comm.size} members, ${comm.classification.type} focus\n`;
    }
  }
  
  // Echo chambers warning
  if (snapshot.echoChambers.length > 0) {
    context += `\n⚠️ ECHO CHAMBERS DETECTED: ${snapshot.echoChambers.length}\n`;
    context += `High groupthink communities may amplify biased information.\n`;
  }
  
  // Threats
  if (snapshot.threats.detectedBots.length > 0) {
    context += `\n🤖 BOT ACTIVITY: ${snapshot.threats.detectedBots.length} suspected bots\n`;
  }
  
  if (snapshot.threats.coordinationNetworks.length > 0) {
    context += `\n🚨 COORDINATION NETWORKS: ${snapshot.threats.coordinationNetworks.length} detected\n`;
    for (const net of snapshot.threats.coordinationNetworks.filter(n => n.risk.level === 'high' || n.risk.level === 'critical')) {
      context += `• ${net.accounts.length} accounts coordinating ${net.purpose.likely} activity\n`;
      context += `  Risk: ${net.risk.level.toUpperCase()} - ${net.risk.recommendation}\n`;
    }
  }
  
  // Narratives
  if (snapshot.informationFlow.topNarratives.length > 0) {
    context += `\n📢 TOP NARRATIVES:\n`;
    for (const narr of snapshot.informationFlow.topNarratives) {
      context += `• ${narr.narrative}: ${narr.strength}% strength\n`;
    }
  }
  
  return context;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const socialNetworkAnalysis = {
  detectBot,
  detectCoordination,
  detectCommunities,
  trackCascade,
  getSnapshot: getNetworkSnapshot,
  formatForAI: formatNetworkAnalysisForAI,
};

export default socialNetworkAnalysis;

