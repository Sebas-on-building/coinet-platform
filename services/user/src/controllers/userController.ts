/**
 * User Controller - Industry-Leading User Management
 * Comprehensive user operations with security, analytics, and admin features
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createLogger } from 'winston';

const prisma = new PrismaClient();
const logger = createLogger({
  level: 'info',
  defaultMeta: { service: 'user-controller' }
});

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tier?: string;
  };
  id?: string;
}

export class UserController {
  /**
   * Get current user profile
   */
  static async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          tier: true,
          avatar: true,
          isVerified: true,
          isTwoFactorEnabled: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          preferences: true,
          settings: true
        }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        success: true,
        data: user,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Get current user error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        requestId: req.id 
      });
    }
  }

  /**
   * Update current user profile
   */
  static async updateCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { name, avatar, bio, timezone, language } = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          name,
          avatar,
          bio,
          timezone,
          language,
          updatedAt: new Date()
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          bio: true,
          timezone: true,
          language: true,
          updatedAt: true
        }
      });

      logger.info('User profile updated', { userId, requestId: req.id });

      res.json({
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      logger.error('Update user error:', error);
      res.status(500).json({ 
        error: 'Failed to update profile',
        requestId: req.id 
      });
    }
  }

  /**
   * Delete current user account
   */
  static async deleteCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { password, confirmDelete } = req.body;

      if (confirmDelete !== 'DELETE_MY_ACCOUNT') {
        res.status(400).json({ 
          error: 'Account deletion not confirmed',
          message: 'Please confirm deletion by sending confirmDelete: "DELETE_MY_ACCOUNT"'
        });
        return;
      }

      // Verify password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true }
      });

      if (!user || !await bcrypt.compare(password, user.password)) {
        res.status(400).json({ error: 'Invalid password' });
        return;
      }

      // Soft delete (mark as deleted but keep data for compliance)
      await prisma.user.update({
        where: { id: userId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          email: `deleted_${userId}@deleted.coinet.ai` // Anonymize email
        }
      });

      logger.warn('User account deleted', { userId, requestId: req.id });

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      logger.error('Delete user error:', error);
      res.status(500).json({ 
        error: 'Failed to delete account',
        requestId: req.id 
      });
    }
  }

  /**
   * Get all users (admin only)
   */
  static async getAllUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden: Admin access required' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search as string;
      const role = req.query.role as string;
      const tier = req.query.tier as string;

      const where: any = {
        isDeleted: false
      };

      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (role) where.role = role;
      if (tier) where.tier = tier;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            tier: true,
            isVerified: true,
            isTwoFactorEnabled: true,
            isActive: true,
            createdAt: true,
            lastLoginAt: true
          },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
      ]);

      res.json({
        success: true,
        data: users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Get all users error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch users',
        requestId: req.id 
      });
    }
  }

  /**
   * Get user by ID (admin only)
   */
  static async getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden: Admin access required' });
        return;
      }

      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          preferences: true,
          settings: true,
          sessions: {
            where: { isActive: true },
            select: {
              id: true,
              deviceInfo: true,
              ipAddress: true,
              lastActivity: true,
              createdAt: true
            }
          },
          auditLogs: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: {
              action: true,
              details: true,
              ipAddress: true,
              createdAt: true
            }
          }
        }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      logger.error('Get user by ID error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch user',
        requestId: req.id 
      });
    }
  }

  /**
   * Update user role (admin only)
   */
  static async updateUserRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden: Admin access required' });
        return;
      }

      const { id } = req.params;
      const { role, tier } = req.body;

      const validRoles = ['user', 'premium', 'admin', 'moderator'];
      const validTiers = ['free', 'premium', 'enterprise'];

      if (role && !validRoles.includes(role)) {
        res.status(400).json({ error: 'Invalid role' });
        return;
      }

      if (tier && !validTiers.includes(tier)) {
        res.status(400).json({ error: 'Invalid tier' });
        return;
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          role,
          tier,
          updatedAt: new Date()
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          tier: true
        }
      });

      // Log the role change
      await prisma.auditLog.create({
        data: {
          userId: id,
          action: 'ROLE_UPDATED',
          details: { oldRole: req.user.role, newRole: role, newTier: tier },
          performedBy: req.user.id,
          ipAddress: req.ip || 'unknown'
        }
      });

      logger.info('User role updated', { 
        targetUserId: id, 
        newRole: role, 
        newTier: tier, 
        adminId: req.user.id,
        requestId: req.id 
      });

      res.json({
        success: true,
        data: updatedUser,
        message: 'User role updated successfully'
      });
    } catch (error) {
      logger.error('Update user role error:', error);
      res.status(500).json({ 
        error: 'Failed to update user role',
        requestId: req.id 
      });
    }
  }

  /**
   * Suspend user account (admin only)
   */
  static async suspendUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden: Admin access required' });
        return;
      }

      const { id } = req.params;
      const { reason, duration } = req.body;

      const suspensionEnd = duration ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : null;

      await prisma.user.update({
        where: { id },
        data: {
          isSuspended: true,
          suspensionReason: reason,
          suspensionEnd,
          updatedAt: new Date()
        }
      });

      // Log the suspension
      await prisma.auditLog.create({
        data: {
          userId: id,
          action: 'USER_SUSPENDED',
          details: { reason, duration, suspensionEnd },
          performedBy: req.user.id,
          ipAddress: req.ip || 'unknown'
        }
      });

      logger.warn('User suspended', { 
        userId: id, 
        reason, 
        duration, 
        adminId: req.user.id,
        requestId: req.id 
      });

      res.json({
        success: true,
        message: 'User suspended successfully',
        data: { suspensionEnd }
      });
    } catch (error) {
      logger.error('Suspend user error:', error);
      res.status(500).json({ 
        error: 'Failed to suspend user',
        requestId: req.id 
      });
    }
  }

  /**
   * Unsuspend user account (admin only)
   */
  static async unsuspendUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden: Admin access required' });
        return;
      }

      const { id } = req.params;

      await prisma.user.update({
        where: { id },
        data: {
          isSuspended: false,
          suspensionReason: null,
          suspensionEnd: null,
          updatedAt: new Date()
        }
      });

      // Log the unsuspension
      await prisma.auditLog.create({
        data: {
          userId: id,
          action: 'USER_UNSUSPENDED',
          details: {},
          performedBy: req.user.id,
          ipAddress: req.ip || 'unknown'
        }
      });

      logger.info('User unsuspended', { 
        userId: id, 
        adminId: req.user.id,
        requestId: req.id 
      });

      res.json({
        success: true,
        message: 'User unsuspended successfully'
      });
    } catch (error) {
      logger.error('Unsuspend user error:', error);
      res.status(500).json({ 
        error: 'Failed to unsuspend user',
        requestId: req.id 
      });
    }
  }

  /**
   * Get user analytics (admin only)
   */
  static async getUserAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden: Admin access required' });
        return;
      }

      const [
        totalUsers,
        activeUsers,
        verifiedUsers,
        twoFactorUsers,
        suspendedUsers,
        usersByTier,
        usersByRole,
        recentRegistrations
      ] = await Promise.all([
        prisma.user.count({ where: { isDeleted: false } }),
        prisma.user.count({ where: { active: true, isDeleted: false } }),
        prisma.user.count({ where: { isVerified: true, isDeleted: false } }),
        prisma.user.count({ where: { isTwoFactorEnabled: true, isDeleted: false } }),
        prisma.user.count({ where: { isSuspended: true, isDeleted: false } }),
        prisma.user.groupBy({
          by: ['tier'],
          _count: true,
          where: { isDeleted: false }
        }),
        prisma.user.groupBy({
          by: ['role'],
          _count: true,
          where: { isDeleted: false }
        }),
        prisma.user.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            isDeleted: false
          }
        })
      ]);

      const analytics = {
        overview: {
          totalUsers,
          activeUsers,
          verifiedUsers,
          twoFactorUsers,
          suspendedUsers,
          recentRegistrations
        },
        distribution: {
          byTier: usersByTier.reduce((acc: any, item) => {
            acc[item.tier || 'unknown'] = item._count;
            return acc;
          }, {}),
          byRole: usersByRole.reduce((acc: any, item) => {
            acc[item.role] = item._count;
            return acc;
          }, {})
        },
        security: {
          verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers * 100).toFixed(2) : '0',
          twoFactorAdoption: totalUsers > 0 ? (twoFactorUsers / totalUsers * 100).toFixed(2) : '0',
          suspensionRate: totalUsers > 0 ? (suspendedUsers / totalUsers * 100).toFixed(2) : '0'
        }
      };

      res.json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Get user analytics error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch analytics',
        requestId: req.id 
      });
    }
  }
}

export default UserController;
