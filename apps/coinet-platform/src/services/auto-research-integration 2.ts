/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔄 AUTO-RESEARCH INTEGRATION - Trigger Research from User Queries        ║
 * ║                                                                               ║
 * ║   This service automatically triggers web research when:                      ║
 * ║   1. User asks about a project with no knowledge base data                   ║
 * ║   2. Knowledge base data is old (>30 days)                                   ║
 * ║   3. User explicitly requests updated information                            ║
 * ║                                                                               ║
 * ║   The system learns and improves with every query!                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../utils/logger';
import {
  getProjectKnowledge,
  researchAndSaveProject,
  type ResearchRequest,
} from './project-web-researcher';

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-RESEARCH LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a project needs research
 */
export async function shouldResearchProject(
  projectId: string,
  forceUpdate: boolean = false
): Promise<{ shouldResearch: boolean; reason: string }> {
  try {
    const knowledge = await getProjectKnowledge(projectId);
    
    if (!knowledge) {
      return {
        shouldResearch: true,
        reason: 'no_knowledge',
      };
    }
    
    if (forceUpdate) {
      return {
        shouldResearch: true,
        reason: 'force_update',
      };
    }
    
    // Check if data is stale (>30 days old)
    const daysSinceResearch = (Date.now() - knowledge.lastResearchedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceResearch > 30) {
      return {
        shouldResearch: true,
        reason: 'stale_data',
      };
    }
    
    // Check if data quality is low
    if (knowledge.dataQuality && knowledge.dataQuality < 0.3) {
      return {
        shouldResearch: true,
        reason: 'low_quality',
      };
    }
    
    return {
      shouldResearch: false,
      reason: 'up_to_date',
    };
    
  } catch (error) {
    logger.error('[AutoResearch] Error checking if research needed:', error);
    return {
      shouldResearch: false,
      reason: 'error',
    };
  }
}

/**
 * Trigger research for a project if needed
 * This runs asynchronously - doesn't block the user's request
 */
export async function triggerResearchIfNeeded(
  projectId: string,
  userId?: string,
  forceUpdate: boolean = false
): Promise<void> {
  try {
    const { shouldResearch, reason } = await shouldResearchProject(projectId, forceUpdate);
    
    if (!shouldResearch) {
      logger.debug(`[AutoResearch] Skipping research for ${projectId}: ${reason}`);
      return;
    }
    
    logger.info(`[AutoResearch] 🔍 Triggering research for ${projectId}: ${reason}`);
    
    // Determine research type based on reason
    let researchType: 'initial' | 'update' | 'deep_dive' = 'initial';
    if (reason === 'stale_data' || reason === 'force_update') {
      researchType = 'update';
    } else if (reason === 'low_quality') {
      researchType = 'deep_dive';
    }
    
    const request: ResearchRequest = {
      projectId,
      researchType,
      triggeredBy: 'user_query',
      userId,
    };
    
    // Run research asynchronously (don't await)
    researchAndSaveProject(request)
      .then(() => {
        logger.info(`[AutoResearch] ✅ Research completed for ${projectId}`);
      })
      .catch((error) => {
        logger.error(`[AutoResearch] ❌ Research failed for ${projectId}:`, error);
      });
    
  } catch (error) {
    logger.error('[AutoResearch] Error triggering research:', error);
  }
}

/**
 * Get or research project
 * This WAITS for research to complete before returning
 */
export async function getOrResearchProject(
  projectId: string,
  userId?: string,
  forceUpdate: boolean = false
) {
  const { shouldResearch, reason } = await shouldResearchProject(projectId, forceUpdate);
  
  if (shouldResearch) {
    logger.info(`[AutoResearch] 🔍 Researching ${projectId} (${reason})...`);
    
    const request: ResearchRequest = {
      projectId,
      researchType: reason === 'no_knowledge' ? 'initial' : 'update',
      triggeredBy: 'user_query',
      userId,
    };
    
    await researchAndSaveProject(request);
  }
  
  return getProjectKnowledge(projectId);
}

/**
 * Batch research multiple projects
 * Useful for OmniScore comparisons
 */
export async function batchResearchProjects(
  projectIds: string[],
  userId?: string
): Promise<void> {
  logger.info(`[AutoResearch] 🔍 Batch researching ${projectIds.length} projects`);
  
  const researchTasks = projectIds.map(projectId => 
    triggerResearchIfNeeded(projectId, userId)
  );
  
  await Promise.allSettled(researchTasks);
}

/**
 * Format knowledge base data for AI consumption
 */
export function formatKnowledgeForAI(knowledge: any): string {
  if (!knowledge) {
    return '';
  }
  
  let output = `\n═══════════════════════════════════════════════════════════════
📚 RESEARCHED PROJECT KNOWLEDGE (from ${knowledge.researchDepth} research session${knowledge.researchDepth > 1 ? 's' : ''})
Last updated: ${new Date(knowledge.lastResearchedAt).toLocaleDateString()}
Data quality: ${Math.round((knowledge.dataQuality || 0) * 100)}%
═══════════════════════════════════════════════════════════════\n`;
  
  if (knowledge.description) {
    output += `\n📄 Description:\n${knowledge.description}\n`;
  }
  
  if (knowledge.teamInfo) {
    output += `\n👥 Team:\n`;
    if (knowledge.teamInfo.founders && knowledge.teamInfo.founders.length > 0) {
      output += `Founders:\n`;
      knowledge.teamInfo.founders.forEach((f: any) => {
        output += `  • ${f.name}${f.role ? ` (${f.role})` : ''}${f.background ? ` - ${f.background}` : ''}\n`;
      });
    }
  }
  
  if (knowledge.backers) {
    output += `\n🤝 Backers & Partners:\n`;
    if (knowledge.backers.tier1 && knowledge.backers.tier1.length > 0) {
      output += `  Top-tier VCs: ${knowledge.backers.tier1.join(', ')}\n`;
    }
    if (knowledge.backers.tier2 && knowledge.backers.tier2.length > 0) {
      output += `  Major exchanges: ${knowledge.backers.tier2.join(', ')}\n`;
    }
  }
  
  if (knowledge.audits && knowledge.audits.length > 0) {
    output += `\n🔒 Security Audits (${knowledge.audits.length}):\n`;
    knowledge.audits.forEach((audit: any) => {
      output += `  • ${audit.auditor}${audit.date ? ` (${audit.date})` : ''}${audit.url ? `\n    ${audit.url}` : ''}\n`;
    });
  }
  
  if (knowledge.governanceType) {
    output += `\n🏛️ Governance:\n`;
    output += `  Type: ${knowledge.governanceType}\n`;
    if (knowledge.votingPlatform) {
      output += `  Platform: ${knowledge.votingPlatform}\n`;
    }
  }
  
  if (knowledge.socialLinks) {
    output += `\n🌐 Social:\n`;
    if (knowledge.socialLinks.twitter) output += `  Twitter: ${knowledge.socialLinks.twitter}\n`;
    if (knowledge.socialLinks.github) output += `  GitHub: ${knowledge.socialLinks.github}\n`;
  }
  
  output += `\n⚠️ Note: This data was automatically researched from ${knowledge.sourcesUsed?.length || 0} web sources.\n`;
  output += `═══════════════════════════════════════════════════════════════\n`;
  
  return output;
}

export default {
  shouldResearchProject,
  triggerResearchIfNeeded,
  getOrResearchProject,
  batchResearchProjects,
  formatKnowledgeForAI,
};
