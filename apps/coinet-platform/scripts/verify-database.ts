#!/usr/bin/env ts-node
/**
 * Database Connection Verification Script
 * 
 * Verifies database connection and provides detailed status information.
 * Run with: npm run db:verify
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
// Try multiple locations: current dir, parent dir, and project root
const envPaths = [
  path.join(__dirname, '../.env'),      // apps/coinet-platform/.env
  path.join(__dirname, '../../.env'),   // Root .env
  path.join(process.cwd(), '.env'),      // Current working directory
];

for (const envPath of envPaths) {
  dotenv.config({ path: envPath });
}

const prisma = new PrismaClient();

interface DatabaseStatus {
  connected: boolean;
  latency?: number;
  conversationCount?: number;
  messageCount?: number;
  userCount?: number;
  error?: string;
  databaseUrl?: string;
}

async function verifyDatabase(): Promise<DatabaseStatus> {
  const status: DatabaseStatus = {
    connected: false,
  };

  // Mask database URL for security (show only host and database name)
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    try {
      const url = new URL(dbUrl);
      status.databaseUrl = `${url.protocol}//${url.hostname}:${url.port || '5432'}/${url.pathname.split('/').pop()}`;
    } catch {
      status.databaseUrl = 'Unable to parse DATABASE_URL';
    }
  } else {
    status.databaseUrl = 'DATABASE_URL not set';
  }

  console.log('🔍 Verifying database connection...\n');
  console.log(`📊 Database: ${status.databaseUrl}\n`);

  try {
    // Test connection with timing
    const startTime = Date.now();
    await prisma.$connect();
    const latency = Date.now() - startTime;
    
    status.connected = true;
    status.latency = latency;

    console.log(`✅ Connection successful! (${latency}ms)\n`);

    // Get database statistics
    console.log('📈 Database Statistics:\n');

    try {
      const conversationCount = await prisma.conversation.count();
      status.conversationCount = conversationCount;
      console.log(`   Conversations: ${conversationCount.toLocaleString()}`);
    } catch (error: any) {
      console.log(`   Conversations: Error - ${error.message}`);
    }

    try {
      const messageCount = await prisma.message.count();
      status.messageCount = messageCount;
      console.log(`   Messages: ${messageCount.toLocaleString()}`);
    } catch (error: any) {
      console.log(`   Messages: Error - ${error.message}`);
    }

    try {
      // Count unique users from conversations (more reliable)
      const uniqueUsers = await prisma.conversation.groupBy({
        by: ['userId'],
      });
      status.userCount = uniqueUsers.length;
      console.log(`   Unique Users: ${status.userCount}`);
    } catch (error: any) {
      console.log(`   Users: Error - ${error.message}`);
    }

    // Check recent activity
    console.log('\n📅 Recent Activity:\n');
    
    try {
      const recentConversations = await prisma.conversation.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          updatedAt: true,
          _count: { select: { messages: true } },
        },
      });

      if (recentConversations.length > 0) {
        recentConversations.forEach((conv, index) => {
          const date = new Date(conv.updatedAt).toLocaleString();
          console.log(`   ${index + 1}. ${conv.title || 'Untitled'} (${conv._count.messages} messages) - ${date}`);
        });
      } else {
        console.log('   No conversations found');
      }
    } catch (error: any) {
      console.log(`   Error fetching recent conversations: ${error.message}`);
    }

    // Schema verification
    console.log('\n🔧 Schema Verification:\n');
    
    // Use Prisma model names (camelCase), not table names
    const models = [
      { name: 'Conversation', prismaName: 'conversation', tableName: 'conversations' },
      { name: 'Message', prismaName: 'message', tableName: 'messages' },
      { name: 'Agent', prismaName: 'agent', tableName: 'agents' },
      { name: 'Alert', prismaName: 'alert', tableName: 'alerts' },
      { name: 'AlertHistory', prismaName: 'alertHistory', tableName: 'alert_history' },
      { name: 'Insight', prismaName: 'insight', tableName: 'insights' },
      { name: 'UserPreferences', prismaName: 'userPreferences', tableName: 'user_preferences' },
      { name: 'UserMemory', prismaName: 'userMemory', tableName: 'user_memories' },
      { name: 'UserPortfolio', prismaName: 'userPortfolio', tableName: 'user_portfolios' },
      { name: 'UserWatchlist', prismaName: 'userWatchlist', tableName: 'user_watchlists' },
    ];

    for (const model of models) {
      try {
        // Try to query using Prisma model name
        await (prisma as any)[model.prismaName].findFirst({ take: 1 });
        console.log(`   ✅ ${model.name} (${model.tableName})`);
      } catch (error: any) {
        if (error.message.includes('does not exist') || error.message.includes('Cannot read properties')) {
          console.log(`   ❌ ${model.name} - Model not accessible`);
        } else {
          console.log(`   ⚠️  ${model.name} - ${error.message.substring(0, 50)}`);
        }
      }
    }

  } catch (error: any) {
    status.connected = false;
    status.error = error.message;
    
    console.log(`❌ Connection failed!\n`);
    console.log(`Error: ${error.message}\n`);
    
    if (error.message.includes('P1001')) {
      console.log('💡 Tip: Check if your database server is running');
      console.log('💡 Tip: Verify DATABASE_URL is correct');
    } else if (error.message.includes('P1000')) {
      console.log('💡 Tip: Check database authentication credentials');
    } else if (error.message.includes('P1003')) {
      console.log('💡 Tip: Database does not exist - run migrations first');
    }
  } finally {
    await prisma.$disconnect();
  }

  return status;
}

// Run verification
verifyDatabase()
  .then((status) => {
    console.log('\n' + '='.repeat(50));
    if (status.connected) {
      console.log('✅ Database verification complete!');
      process.exit(0);
    } else {
      console.log('❌ Database verification failed!');
      console.log(`Error: ${status.error || 'Unknown error'}`);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });

