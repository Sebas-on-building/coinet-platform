/**
 * Data Residency Controller - GDPR Data Localization Compliance
 *
 * Manages data residency requirements and ensures compliance with:
 * - GDPR data residency requirements (Article 5)
 * - EU data protection adequacy decisions
 * - Cross-border data transfer restrictions
 * - Data sovereignty requirements
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/Logger';
import { AuditService } from '../services/AuditService';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId?: string;
  };
  id?: string;
}

export class DataResidencyController {
  private prisma: PrismaClient;
  private auditService: AuditService;

  constructor(prisma: PrismaClient, auditService: AuditService) {
    this.prisma = prisma;
    this.auditService = auditService;
  }

  async getResidencyRules(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const tenantId = req.user?.tenantId || 'default';

      const rules = await this.prisma.dataResidencyRule.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        data: rules,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString(),
          count: rules.length
        }
      });
    } catch (error) {
      logger.error('Get residency rules error:', error, { requestId: req.id });
      res.status(500).json({
        error: 'Failed to retrieve residency rules',
        requestId: req.id
      });
    }
  }

  async createResidencyRule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const {
        name,
        description,
        userRegion,
        requiredResidency,
        allowedRegions,
        dataCategories,
        enforceStrictly = true,
        fallbackRegion
      } = req.body;

      if (!name || !userRegion || !requiredResidency || !allowedRegions || !dataCategories) {
        res.status(400).json({
          error: 'Name, user region, required residency, allowed regions, and data categories are required'
        });
        return;
      }

      const validResidencies = ['EU', 'US', 'UK', 'GLOBAL', 'USER_CHOICE'];
      if (!validResidencies.includes(requiredResidency)) {
        res.status(400).json({ error: 'Invalid required residency' });
        return;
      }

      const rule = await this.prisma.dataResidencyRule.create({
        data: {
          name,
          description,
          userRegion,
          requiredResidency: requiredResidency as any,
          allowedRegions,
          dataCategories,
          enforceStrictly,
          fallbackRegion,
          isActive: true,
          createdBy: req.user?.id || 'system',
          tenantId: req.user?.tenantId || 'default'
        }
      });

      await this.auditService.createAuditLog({
        userId: req.user?.id || 'system',
        action: 'RESIDENCY_RULE_CREATED',
        category: 'rule_management',
        description: `Data residency rule "${name}" created`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.id,
        tenantId: req.user?.tenantId || 'default'
      });

      logger.info('Data residency rule created', {
        ruleId: rule.id,
        name,
        userRegion,
        requiredResidency,
        requestId: req.id
      });

      res.status(201).json({
        success: true,
        data: rule,
        message: 'Data residency rule created successfully'
      });
    } catch (error) {
      logger.error('Create residency rule error:', error, { requestId: req.id });
      res.status(500).json({
        error: 'Failed to create residency rule',
        requestId: req.id
      });
    }
  }

  async updateResidencyRule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const { ruleId } = req.params;
      const updates = req.body;

      if (!ruleId) {
        res.status(400).json({ error: 'Rule ID is required' });
        return;
      }

      const rule = await this.prisma.dataResidencyRule.update({
        where: { id: ruleId },
        data: {
          ...updates,
          updatedAt: new Date()
        }
      });

      await this.auditService.createAuditLog({
        userId: req.user?.id || 'system',
        action: 'RESIDENCY_RULE_UPDATED',
        category: 'rule_management',
        description: `Data residency rule "${rule.name}" updated`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.id,
        tenantId: req.user?.tenantId || 'default'
      });

      logger.info('Data residency rule updated', {
        ruleId,
        name: rule.name,
        requestId: req.id
      });

      res.json({
        success: true,
        data: rule,
        message: 'Data residency rule updated successfully'
      });
    } catch (error) {
      logger.error('Update residency rule error:', error, { requestId: req.id });
      res.status(500).json({
        error: 'Failed to update residency rule',
        requestId: req.id
      });
    }
  }

  async deleteResidencyRule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const { ruleId } = req.params;

      if (!ruleId) {
        res.status(400).json({ error: 'Rule ID is required' });
        return;
      }

      const rule = await this.prisma.dataResidencyRule.findUnique({
        where: { id: ruleId }
      });

      if (!rule) {
        res.status(404).json({ error: 'Residency rule not found' });
        return;
      }

      await this.prisma.dataResidencyRule.delete({
        where: { id: ruleId }
      });

      await this.auditService.createAuditLog({
        userId: req.user?.id || 'system',
        action: 'RESIDENCY_RULE_DELETED',
        category: 'rule_management',
        description: `Data residency rule "${rule.name}" deleted`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.id,
        tenantId: req.user?.tenantId || 'default'
      });

      logger.info('Data residency rule deleted', {
        ruleId,
        name: rule.name,
        requestId: req.id
      });

      res.json({
        success: true,
        message: 'Data residency rule deleted successfully'
      });
    } catch (error) {
      logger.error('Delete residency rule error:', error, { requestId: req.id });
      res.status(500).json({
        error: 'Failed to delete residency rule',
        requestId: req.id
      });
    }
  }

  async checkUserResidencyCompliance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const userRegion = await this.getUserRegion(userId);

      const rules = await this.prisma.dataResidencyRule.findMany({
        where: {
          OR: [
            { userRegion },
            { userRegion: 'GLOBAL' }
          ],
          isActive: true,
          tenantId: req.user?.tenantId || 'default'
        }
      });

      const complianceResults = [];

      for (const rule of rules) {
        const compliance = await this.checkDataResidencyCompliance(
          userId,
          rule,
          userRegion
        );
        complianceResults.push(compliance);
      }

      const summary = {
        userRegion,
        totalRules: rules.length,
        compliantRules: complianceResults.filter(r => r.isCompliant).length,
        nonCompliantRules: complianceResults.filter(r => !r.isCompliant).length,
        warnings: complianceResults.flatMap(r => r.warnings)
      };

      res.json({
        success: true,
        data: {
          userRegion,
          applicableRules: rules,
          complianceResults,
          summary
        },
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Check user residency compliance error:', error, { requestId: req.id });
      res.status(500).json({
        error: 'Failed to check residency compliance',
        requestId: req.id
      });
    }
  }

  async getResidencyReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const tenantId = req.user?.tenantId || 'default';
      const { days = 30 } = req.query;

      const startDate = new Date(Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000);

      const [
        totalRules,
        activeRules,
        rulesByRegion,
        rulesByResidency,
        complianceViolations,
        crossBorderTransfers
      ] = await Promise.all([
        this.prisma.dataResidencyRule.count({ where: { tenantId } }),
        this.prisma.dataResidencyRule.count({
          where: { tenantId, isActive: true }
        }),
        this.prisma.dataResidencyRule.groupBy({
          by: ['userRegion'],
          _count: true,
          where: { tenantId }
        }),
        this.prisma.dataResidencyRule.groupBy({
          by: ['requiredResidency'],
          _count: true,
          where: { tenantId }
        }),
        this.prisma.privacyAuditLog.count({
          where: {
            tenantId,
            action: 'RESIDENCY_VIOLATION_DETECTED',
            createdAt: { gte: startDate }
          }
        }),
        this.prisma.privacyAuditLog.count({
          where: {
            tenantId,
            action: 'CROSS_BORDER_TRANSFER',
            createdAt: { gte: startDate }
          }
        })
      ]);

      const report = {
        period: {
          startDate,
          endDate: new Date(),
          days: parseInt(days as string)
        },
        summary: {
          totalRules,
          activeRules,
          complianceViolations,
          crossBorderTransfers
        },
        byUserRegion: rulesByRegion.reduce((acc: Record<string, number>, item: { userRegion: string; _count: number }) => {
          acc[item.userRegion] = item._count;
          return acc;
        }, {} as Record<string, number>),
        byRequiredResidency: rulesByResidency.reduce((acc: Record<string, number>, item: { requiredResidency: string; _count: number }) => {
          acc[item.requiredResidency] = item._count;
          return acc;
        }, {} as Record<string, number>),
        complianceStatus: {
          rulesConfigured: totalRules > 0,
          euComplianceEnabled: rulesByResidency.some((r: any) => r.requiredResidency === 'EU'),
          strictEnforcement: activeRules > 0,
          recentViolations: complianceViolations > 0
        },
        generatedAt: new Date().toISOString()
      };

      res.json({
        success: true,
        data: report,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Get residency report error:', error, { requestId: req.id });
      res.status(500).json({
        error: 'Failed to generate residency report',
        requestId: req.id
      });
    }
  }

  async validateDataTransfer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const {
        userId,
        targetRegion,
        dataCategories,
        transferReason,
        legalBasis
      } = req.body;

      if (!userId || !targetRegion || !dataCategories || !transferReason) {
        res.status(400).json({
          error: 'User ID, target region, data categories, and transfer reason are required'
        });
        return;
      }

      const userRegion = await this.getUserRegion(userId);

      const rules = await this.prisma.dataResidencyRule.findMany({
        where: {
          OR: [
            { userRegion },
            { userRegion: 'GLOBAL' }
          ],
          isActive: true,
          dataCategories: { hasSome: dataCategories },
          tenantId: req.user?.tenantId || 'default'
        }
      });

      const transferValidation: any = {
        userId,
        userRegion,
        targetRegion,
        dataCategories,
        transferReason,
        legalBasis,
        applicableRules: rules.length,
        isAllowed: true,
        restrictions: [],
        recommendations: [],
        requiredActions: []
      };

      for (const rule of rules) {
        if (!rule.allowedRegions.includes(targetRegion)) {
          transferValidation.isAllowed = false;
          transferValidation.restrictions.push({
            ruleName: rule.name,
            ruleId: rule.id,
            restriction: `Data cannot be transferred to ${targetRegion}`,
            requiredResidency: rule.requiredResidency as string,
            allowedRegions: rule.allowedRegions
          });
        }

        if (rule.enforceStrictly && rule.requiredResidency !== 'GLOBAL') {
          transferValidation.requiredActions.push({
            action: 'STRICT_RESIDENCY_ENFORCEMENT',
            description: `Data must remain in ${rule.requiredResidency} region`,
            ruleId: rule.id
          });
        }
      }

      if (!transferValidation.isAllowed) {
        transferValidation.recommendations.push({
          type: 'ALTERNATIVE_REGION',
          suggestion: 'Consider using an allowed region for data storage',
          alternatives: rules.flatMap((r: any) => r.allowedRegions).filter((r: string) => r !== targetRegion)
        });

        if (legalBasis === 'ADEQUACY_DECISION' || legalBasis === 'BINDING_CORPORATE_RULES') {
          transferValidation.recommendations.push({
            type: 'LEGAL_BASIS',
            suggestion: 'Ensure proper legal basis for cross-border transfer'
          });
        }
      }

      await this.auditService.createAuditLog({
        userId: req.user?.id || 'system',
        action: 'DATA_TRANSFER_VALIDATED',
        category: 'transfer_validation',
        description: `Data transfer validation for user ${userId} to ${targetRegion}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.id,
        tenantId: req.user?.tenantId || 'default'
      });

      logger.info('Data transfer validated', {
        userId,
        targetRegion,
        isAllowed: transferValidation.isAllowed,
        requestId: req.id
      });

      res.json({
        success: true,
        data: transferValidation,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Validate data transfer error:', error, { requestId: req.id });
      res.status(500).json({
        error: 'Failed to validate data transfer',
        requestId: req.id
      });
    }
  }

  private async getUserRegion(userId: string): Promise<string> {
    return 'EU'; // Placeholder
  }

  private async checkDataResidencyCompliance(
    userId: string,
    rule: any,
    userRegion: string
  ): Promise<any> {
    const compliance: any = {
      ruleId: rule.id,
      ruleName: rule.name,
      isCompliant: true,
      issues: [],
      warnings: [],
      recommendations: []
    };

    if (!rule.allowedRegions.includes(userRegion)) {
      compliance.isCompliant = false;
      compliance.issues.push({
        type: 'REGION_MISMATCH',
        description: `User data is in ${userRegion} but rule requires ${rule.allowedRegions.join(' or ')}`,
        severity: 'HIGH'
      });
    }

    if (rule.enforceStrictly && rule.requiredResidency !== 'GLOBAL') {
      if (userRegion !== rule.requiredResidency) {
        compliance.warnings.push({
          type: 'STRICT_ENFORCEMENT',
          description: `Strict residency enforcement may restrict data access`,
          actionRequired: 'Consider data migration or rule adjustment'
        });
      }
    }

    if (!compliance.isCompliant) {
      compliance.recommendations.push({
        type: 'DATA_MIGRATION',
        description: 'Migrate user data to compliant region',
        priority: 'HIGH'
      });
    }

    return compliance;
  }
}
