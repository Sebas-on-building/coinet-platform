/**
 * Coinet Platform - Database Seeder
 * 
 * This script seeds the database with initial data for development and testing.
 * It creates users, roles, permissions, and sample data for all platform services.
 */

import { PrismaClient, UserRole, UserTier, PluginStatus } from './generated/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Utility functions
const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 12);
};

const generateApiKey = (): { key: string; hash: string; preview: string } => {
  const key = `ck_${crypto.randomBytes(32).toString('hex')}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const preview = `${key.substring(0, 8)}...${key.substring(-4)}`;
  return { key, hash, preview };
};

// Sample data generators
const sampleUsers = [
  {
    email: 'admin@coinet.ai',
    name: 'Coinet Administrator',
    role: UserRole.ADMIN,
    tier: UserTier.ENTERPRISE,
    password: 'admin123',
    isVerified: true,
    bio: 'Platform administrator with full system access'
  },
  {
    email: 'moderator@coinet.ai',
    name: 'Content Moderator',
    role: UserRole.MODERATOR,
    tier: UserTier.PREMIUM,
    password: 'mod123',
    isVerified: true,
    bio: 'Content moderator for plugin reviews and user support'
  },
  {
    email: 'developer@coinet.ai',
    name: 'Plugin Developer',
    role: UserRole.DEVELOPER,
    tier: UserTier.PREMIUM,
    password: 'dev123',
    isVerified: true,
    bio: 'Plugin developer and marketplace contributor'
  },
  {
    email: 'analyst@coinet.ai',
    name: 'Data Analyst',
    role: UserRole.ANALYST,
    tier: UserTier.PREMIUM,
    password: 'analyst123',
    isVerified: true,
    bio: 'Platform analytics and insights specialist'
  },
  {
    email: 'user@coinet.ai',
    name: 'Test User',
    role: UserRole.USER,
    tier: UserTier.FREE,
    password: 'user123',
    isVerified: true,
    bio: 'Standard platform user for testing'
  },
  {
    email: 'premium@coinet.ai',
    name: 'Premium User',
    role: UserRole.USER,
    tier: UserTier.PREMIUM,
    password: 'premium123',
    isVerified: true,
    bio: 'Premium subscriber with advanced features'
  }
];

const sampleRoles = [
  {
    name: 'Super Admin',
    description: 'Full system access with all permissions',
    isSystem: true,
    permissions: [
      { resource: 'users', action: 'read' },
      { resource: 'users', action: 'write' },
      { resource: 'users', action: 'delete' },
      { resource: 'plugins', action: 'read' },
      { resource: 'plugins', action: 'write' },
      { resource: 'plugins', action: 'delete' },
      { resource: 'plugins', action: 'approve' },
      { resource: 'portfolios', action: 'read' },
      { resource: 'portfolios', action: 'write' },
      { resource: 'analytics', action: 'read' },
      { resource: 'system', action: 'admin' }
    ]
  },
  {
    name: 'Content Moderator',
    description: 'Plugin and content moderation permissions',
    isSystem: true,
    permissions: [
      { resource: 'plugins', action: 'read' },
      { resource: 'plugins', action: 'approve' },
      { resource: 'reviews', action: 'read' },
      { resource: 'reviews', action: 'moderate' },
      { resource: 'users', action: 'read' }
    ]
  },
  {
    name: 'Plugin Developer',
    description: 'Plugin creation and management permissions',
    isSystem: true,
    permissions: [
      { resource: 'plugins', action: 'read' },
      { resource: 'plugins', action: 'write' },
      { resource: 'analytics', action: 'read' }
    ]
  },
  {
    name: 'Data Analyst',
    description: 'Analytics and reporting permissions',
    isSystem: true,
    permissions: [
      { resource: 'analytics', action: 'read' },
      { resource: 'users', action: 'read' },
      { resource: 'plugins', action: 'read' },
      { resource: 'portfolios', action: 'read' }
    ]
  },
  {
    name: 'Standard User',
    description: 'Basic user permissions',
    isSystem: true,
    permissions: [
      { resource: 'portfolios', action: 'read' },
      { resource: 'portfolios', action: 'write' },
      { resource: 'plugins', action: 'read' },
      { resource: 'reviews', action: 'write' }
    ]
  }
];

const samplePlugins = [
  {
    name: 'Advanced Portfolio Tracker',
    slug: 'advanced-portfolio-tracker',
    description: 'Track your cryptocurrency portfolio with advanced analytics and insights',
    category: 'Portfolio Management',
    tags: ['portfolio', 'tracking', 'analytics'],
    version: '1.2.0',
    status: PluginStatus.APPROVED,
    featured: true,
    price: 29.99,
    readme: '# Advanced Portfolio Tracker\n\nA comprehensive portfolio tracking solution...',
    sourceUrl: 'https://github.com/coinet/advanced-portfolio-tracker',
    docsUrl: 'https://docs.coinet.ai/plugins/portfolio-tracker'
  },
  {
    name: 'DeFi Yield Calculator',
    slug: 'defi-yield-calculator',
    description: 'Calculate potential yields from various DeFi protocols',
    category: 'DeFi Tools',
    tags: ['defi', 'yield', 'calculator', 'farming'],
    version: '2.1.0',
    status: PluginStatus.APPROVED,
    featured: true,
    price: 19.99,
    readme: '# DeFi Yield Calculator\n\nMaximize your DeFi returns...',
    sourceUrl: 'https://github.com/coinet/defi-yield-calculator'
  },
  {
    name: 'Technical Analysis Suite',
    slug: 'technical-analysis-suite',
    description: 'Advanced technical analysis tools and indicators',
    category: 'Trading Tools',
    tags: ['trading', 'technical-analysis', 'indicators'],
    version: '1.5.3',
    status: PluginStatus.APPROVED,
    featured: false,
    price: 49.99,
    readme: '# Technical Analysis Suite\n\nProfessional trading tools...'
  },
  {
    name: 'News Sentiment Analyzer',
    slug: 'news-sentiment-analyzer',
    description: 'Analyze market sentiment from crypto news and social media',
    category: 'Market Intelligence',
    tags: ['news', 'sentiment', 'ai', 'analysis'],
    version: '1.0.0',
    status: PluginStatus.PENDING,
    featured: false,
    price: 15.99,
    readme: '# News Sentiment Analyzer\n\nAI-powered sentiment analysis...'
  }
];

async function seedUsers() {
  console.log('🔄 Seeding users...');
  
  for (const userData of sampleUsers) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (!existingUser) {
      const hashedPassword = await hashPassword(userData.password);
      
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          password: hashedPassword,
          role: userData.role,
          tier: userData.tier,
          isVerified: userData.isVerified,
          bio: userData.bio,
          timezone: 'UTC',
          language: 'en',
          metadata: {
            seedData: true,
            createdBy: 'seed-script'
          }
        }
      });

      console.log(`✅ Created user: ${user.email}`);

      // Create API key for developers and analysts
      if (userData.role === UserRole.DEVELOPER || userData.role === UserRole.ANALYST) {
        const apiKeyData = generateApiKey();
        
        await prisma.apiKey.create({
          data: {
            userId: user.id,
            name: 'Development API Key',
            keyHash: apiKeyData.hash,
            keyPreview: apiKeyData.preview,
            permissions: userData.role === UserRole.DEVELOPER 
              ? ['plugins:read', 'plugins:write', 'analytics:read']
              : ['analytics:read', 'users:read'],
            scopes: ['api:access']
          }
        });

        console.log(`🔑 Created API key for: ${user.email}`);
      }

      // Create sample portfolio for users
      if (userData.tier !== UserTier.FREE) {
        const portfolio = await prisma.portfolio.create({
          data: {
            userId: user.id,
            name: 'Main Portfolio',
            description: 'Primary cryptocurrency portfolio',
            isDefault: true,
            currency: 'USD'
          }
        });

        // Add sample holdings
        await prisma.portfolioHolding.createMany({
          data: [
            {
              portfolioId: portfolio.id,
              symbol: 'BTC',
              quantity: 0.5,
              avgCost: 45000,
              currentPrice: 50000,
              totalValue: 25000
            },
            {
              portfolioId: portfolio.id,
              symbol: 'ETH',
              quantity: 10,
              avgCost: 3000,
              currentPrice: 3500,
              totalValue: 35000
            }
          ]
        });

        console.log(`💼 Created portfolio for: ${user.email}`);
      }
    }
  }
}

async function seedRolesAndPermissions() {
  console.log('🔄 Seeding roles and permissions...');

  for (const roleData of sampleRoles) {
    const existingRole = await prisma.roleModel.findUnique({
      where: { name: roleData.name }
    });

    if (!existingRole) {
      // Create permissions first
      const permissionIds: string[] = [];
      
      for (const permData of roleData.permissions) {
        let permission = await prisma.permission.findUnique({
          where: {
            resource_action: {
              resource: permData.resource,
              action: permData.action
            }
          }
        });

        if (!permission) {
          permission = await prisma.permission.create({
            data: {
              name: `${permData.resource}:${permData.action}`,
              resource: permData.resource,
              action: permData.action,
              description: `${permData.action} access to ${permData.resource}`
            }
          });
        }

        permissionIds.push(permission.id);
      }

      // Create role with permissions
      const role = await prisma.roleModel.create({
        data: {
          name: roleData.name,
          description: roleData.description,
          isSystem: roleData.isSystem,
          permissions: {
            connect: permissionIds.map(id => ({ id }))
          }
        }
      });

      console.log(`✅ Created role: ${role.name} with ${permissionIds.length} permissions`);
    }
  }
}

async function seedPlugins() {
  console.log('🔄 Seeding plugins...');

  // Get a developer user to assign as plugin author
  const developer = await prisma.user.findUnique({
    where: { email: 'developer@coinet.ai' }
  });

  if (!developer) {
    console.log('⚠️  No developer user found, skipping plugin seeding');
    return;
  }

  for (const pluginData of samplePlugins) {
    const existingPlugin = await prisma.plugin.findUnique({
      where: { slug: pluginData.slug }
    });

    if (!existingPlugin) {
      const plugin = await prisma.plugin.create({
        data: {
          name: pluginData.name,
          slug: pluginData.slug,
          description: pluginData.description,
          authorId: developer.id,
          category: pluginData.category,
          tags: pluginData.tags,
          version: pluginData.version,
          status: pluginData.status,
          approved: pluginData.status === PluginStatus.APPROVED,
          featured: pluginData.featured,
          price: pluginData.price,
          currency: 'USD',
          readme: pluginData.readme,
          sourceUrl: pluginData.sourceUrl,
          docsUrl: pluginData.docsUrl,
          downloads: Math.floor(Math.random() * 1000),
          publishedAt: pluginData.status === PluginStatus.APPROVED ? new Date() : undefined,
          metadata: {
            seedData: true,
            category: pluginData.category
          }
        }
      });

      // Create plugin registry entry
      await prisma.pluginRegistry.create({
        data: {
          pluginId: plugin.id,
          versions: [
            {
              version: pluginData.version,
              hash: crypto.randomBytes(32).toString('hex'),
              uploadedAt: new Date().toISOString(),
              size: Math.floor(Math.random() * 1000000)
            }
          ],
          current: pluginData.version,
          manifest: {
            name: plugin.name,
            version: pluginData.version,
            main: 'index.js',
            dependencies: {}
          }
        }
      });

      console.log(`✅ Created plugin: ${plugin.name}`);

      // Add sample reviews for approved plugins
      if (plugin.status === PluginStatus.APPROVED) {
        const users = await prisma.user.findMany({
          where: { 
            role: UserRole.USER,
            tier: { not: UserTier.FREE }
          },
          take: 3
        });

        for (const user of users) {
          await prisma.review.create({
            data: {
              pluginId: plugin.id,
              authorId: user.id,
              rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
              title: `Great plugin!`,
              text: `This plugin has been very helpful for my ${pluginData.category.toLowerCase()} needs.`,
              status: 'APPROVED',
              helpful: Math.floor(Math.random() * 20)
            }
          });
        }

        console.log(`📝 Added reviews for: ${plugin.name}`);
      }
    }
  }
}

async function seedAnalyticsAndNotifications() {
  console.log('🔄 Seeding analytics and notifications...');

  const users = await prisma.user.findMany();

  for (const user of users) {
    // Create notification preferences
    await prisma.notificationPreference.create({
      data: {
        userId: user.id,
        email: true,
        push: user.tier !== UserTier.FREE,
        sms: user.tier === UserTier.ENTERPRISE,
        inApp: true,
        categories: ['alerts', 'portfolio', 'security']
      }
    });

    // Create sample analytics events
    const events = ['login', 'portfolio_view', 'plugin_install', 'trade_executed'];
    for (let i = 0; i < 5; i++) {
      await prisma.analyticsEvent.create({
        data: {
          userId: user.id,
          event: events[Math.floor(Math.random() * events.length)],
          category: 'user_action',
          timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      });
    }

    // Create audit logs for important actions
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_REGISTERED',
        resource: 'users',
        resourceId: user.id,
        details: `User ${user.email} registered successfully`,
        signature: crypto.createHash('sha256').update(`${user.id}:USER_REGISTERED:${Date.now()}`).digest('hex'),
        severity: 'INFO'
      }
    });

    console.log(`📊 Created analytics data for: ${user.email}`);
  }
}

async function seedAlerts() {
  console.log('🔄 Seeding alerts...');

  const users = await prisma.user.findMany({
    where: { tier: { not: UserTier.FREE } }
  });

  const symbols = ['BTC', 'ETH', 'ADA', 'DOT', 'LINK'];
  const conditions = ['PRICE', 'VOLUME', 'CHANGE_24H'];
  const operators = ['GREATER_THAN', 'LESS_THAN', 'CROSSES_ABOVE'];

  for (const user of users) {
    for (let i = 0; i < 3; i++) {
      await prisma.alert.create({
        data: {
          userId: user.id,
          name: `${symbols[i]} Price Alert`,
          symbol: symbols[i],
          condition: conditions[Math.floor(Math.random() * conditions.length)] as any,
          operator: operators[Math.floor(Math.random() * operators.length)] as any,
          threshold: Math.floor(Math.random() * 50000) + 1000,
          isActive: Math.random() > 0.3,
          notifyEmail: true,
          notifyPush: user.tier !== UserTier.FREE
        }
      });
    }

    console.log(`🚨 Created alerts for: ${user.email}`);
  }
}

async function main() {
  console.log('🌱 Starting database seeding...');
  console.log('=====================================');

  try {
    await seedUsers();
    await seedRolesAndPermissions();
    await seedPlugins();
    await seedAnalyticsAndNotifications();
    await seedAlerts();

    // Print summary
    const counts = await Promise.all([
      prisma.user.count(),
      prisma.plugin.count(),
      prisma.review.count(),
      prisma.portfolioHolding.count(),
      prisma.alert.count(),
      prisma.analyticsEvent.count()
    ]);

    console.log('=====================================');
    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Users: ${counts[0]}`);
    console.log(`   Plugins: ${counts[1]}`);
    console.log(`   Reviews: ${counts[2]}`);
    console.log(`   Portfolio Holdings: ${counts[3]}`);
    console.log(`   Alerts: ${counts[4]}`);
    console.log(`   Analytics Events: ${counts[5]}`);
    console.log('');
    console.log('🔐 Test Accounts:');
    console.log('   Admin: admin@coinet.ai / admin123');
    console.log('   Moderator: moderator@coinet.ai / mod123');
    console.log('   Developer: developer@coinet.ai / dev123');
    console.log('   Analyst: analyst@coinet.ai / analyst123');
    console.log('   User: user@coinet.ai / user123');
    console.log('   Premium: premium@coinet.ai / premium123');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
