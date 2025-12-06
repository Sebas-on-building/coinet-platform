#!/usr/bin/env ts-node
/**
 * Chat History Backup Script
 * 
 * Backs up all conversations and messages to a SQL file.
 * Run with: npm run db:backup
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

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

interface BackupStats {
  conversations: number;
  messages: number;
  users: number;
  filePath: string;
  fileSize: string;
  timestamp: string;
}

async function backupChatHistory(): Promise<BackupStats> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const backupDir = path.join(__dirname, '../../../backups');
  const backupFile = path.join(backupDir, `chat-history-${timestamp}.sql`);

  console.log('💾 Starting chat history backup...\n');

  // Create backups directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`📁 Created backup directory: ${backupDir}\n`);
  }

  // Get database URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  try {
    // Verify connection first
    await prisma.$connect();
    console.log('✅ Database connection verified\n');

    // Get statistics before backup
    const conversationCount = await prisma.conversation.count();
    const messageCount = await prisma.message.count();
    const uniqueUsers = await prisma.conversation.groupBy({
      by: ['userId'],
    });
    const userCount = uniqueUsers.length;

    console.log('📊 Current Database Statistics:');
    console.log(`   Conversations: ${conversationCount.toLocaleString()}`);
    console.log(`   Messages: ${messageCount.toLocaleString()}`);
    console.log(`   Unique Users: ${userCount}\n`);

    if (conversationCount === 0 && messageCount === 0) {
      console.log('⚠️  Warning: Database appears to be empty');
      console.log('   Creating backup anyway...\n');
    }

    // Use pg_dump to create SQL backup
    console.log('📦 Creating SQL backup...');
    
    try {
      // Create backup using pg_dump
      execSync(`pg_dump "${databaseUrl}" > "${backupFile}"`, {
        stdio: 'inherit',
        shell: '/bin/bash',
      });

      // Get file size
      const stats = fs.statSync(backupFile);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      const fileSize = `${fileSizeMB} MB`;

      console.log(`✅ Backup created successfully!\n`);
      console.log(`📄 File: ${backupFile}`);
      console.log(`📊 Size: ${fileSize}\n`);

      // Create a summary JSON file
      const summaryFile = path.join(backupDir, `backup-summary-${timestamp}.json`);
      const summary: BackupStats = {
        conversations: conversationCount,
        messages: messageCount,
        users: userCount,
        filePath: backupFile,
        fileSize,
        timestamp: new Date().toISOString(),
      };

      fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
      console.log(`📋 Summary saved: ${summaryFile}\n`);

      // List recent backups
      console.log('📚 Recent Backups:');
      const backups = fs.readdirSync(backupDir)
        .filter((file) => file.startsWith('chat-history-') && file.endsWith('.sql'))
        .sort()
        .reverse()
        .slice(0, 5);

      if (backups.length > 0) {
        backups.forEach((file, index) => {
          const filePath = path.join(backupDir, file);
          const stats = fs.statSync(filePath);
          const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
          const date = stats.mtime.toLocaleString();
          console.log(`   ${index + 1}. ${file} (${sizeMB} MB) - ${date}`);
        });
      } else {
        console.log('   No previous backups found');
      }

      return summary;

    } catch (error: any) {
      // If pg_dump fails, try alternative method
      console.log('⚠️  pg_dump failed, trying alternative method...\n');
      
      // Alternative: Export data as JSON
      const jsonBackupFile = path.join(backupDir, `chat-history-${timestamp}.json`);
      
      const conversations = await prisma.conversation.findMany({
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      const backupData = {
        timestamp: new Date().toISOString(),
        conversations: conversations.length,
        messages: conversations.reduce((sum, conv) => sum + conv.messages.length, 0),
        data: conversations,
      };

      fs.writeFileSync(jsonBackupFile, JSON.stringify(backupData, null, 2));
      
      const stats = fs.statSync(jsonBackupFile);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      console.log(`✅ JSON backup created: ${jsonBackupFile}`);
      console.log(`📊 Size: ${fileSizeMB} MB\n`);

      return {
        conversations: conversations.length,
        messages: backupData.messages,
        users: userCount,
        filePath: jsonBackupFile,
        fileSize: `${fileSizeMB} MB`,
        timestamp: new Date().toISOString(),
      };
    }

  } catch (error: any) {
    console.error('❌ Backup failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run backup
backupChatHistory()
  .then((stats) => {
    console.log('\n' + '='.repeat(50));
    console.log('✅ Backup completed successfully!');
    console.log(`📊 Backed up ${stats.conversations} conversations and ${stats.messages} messages`);
    console.log(`💾 Backup file: ${stats.filePath}`);
    console.log(`📏 File size: ${stats.fileSize}`);
    console.log('\n💡 Tip: Store backups in a safe location (cloud storage, external drive)');
    console.log('💡 Tip: Set up automated backups using cron or scheduled tasks');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Backup failed:', error);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Verify DATABASE_URL is set correctly');
    console.log('   2. Ensure pg_dump is installed (or use JSON backup)');
    console.log('   3. Check database connection: npm run db:verify');
    process.exit(1);
  });

