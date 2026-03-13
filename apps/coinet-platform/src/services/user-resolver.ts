/**
 * User Resolver - Maps auth identifiers (Clerk ID, demo UUID) to internal User
 *
 * Portfolio and other features require User.id (UUID). Auth provides
 * Clerk ID (user_xxx) or demo UUID. This service resolves to the internal User.
 */

import { createClerkClient } from '@clerk/backend';
import * as bcrypt from 'bcryptjs';
import { prisma } from '../db/client';
import { logger } from '../utils/logger';

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_EMAIL = 'demo@coinet.ai';
const CLERK_PASSWORD_PLACEHOLDER = 'clerk_oauth_no_password';

const clerkClient = process.env.CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  : null;

export interface ResolvedUser {
  id: string;
  email: string;
}

/**
 * Resolve auth userId to internal User. Creates user if not found (Clerk or demo).
 */
export async function resolveUserForAuth(authUserId: string): Promise<ResolvedUser | null> {
  if (!authUserId) return null;

  // Demo user (UUID)
  if (authUserId === DEMO_USER_ID) {
    let user = await prisma.user.findUnique({ where: { id: DEMO_USER_ID } });
    if (!user) {
      user = await createDemoUser();
    }
    return { id: user.id, email: user.email };
  }

  // Clerk user (user_xxx)
  if (authUserId.startsWith('user_')) {
    let user = await prisma.user.findUnique({ where: { clerkId: authUserId } });
    if (!user && clerkClient) {
      user = await createUserFromClerk(authUserId);
    }
    return user ? { id: user.id, email: user.email } : null;
  }

  // Legacy: might be internal User.id (e.g. API key)
  const user = await prisma.user.findUnique({ where: { id: authUserId } });
  return user ? { id: user.id, email: user.email } : null;
}

async function createDemoUser() {
  const passwordHash = await bcrypt.hash(CLERK_PASSWORD_PLACEHOLDER, 10);
  const user = await prisma.user.create({
    data: {
      id: DEMO_USER_ID,
      email: DEMO_EMAIL,
      name: 'Demo User',
      password: passwordHash,
    },
  });
  logger.info('Created demo user for portfolio access', { userId: user.id });
  return user;
}

async function createUserFromClerk(clerkUserId: string) {
  if (!clerkClient) {
    logger.warn('Clerk not configured - cannot create user from Clerk ID', { clerkUserId });
    return null;
  }
  try {
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const email =
      clerkUser.emailAddresses?.[0]?.emailAddress ||
      `clerk_${clerkUserId.replace(/[^a-zA-Z0-9]/g, '_')}@placeholder.coinet.ai`;
    const name = clerkUser.firstName
      ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim()
      : undefined;

    const passwordHash = await bcrypt.hash(CLERK_PASSWORD_PLACEHOLDER, 10);

    // If user exists by email, link clerkId
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { clerkId: clerkUserId },
      });
      logger.info('Linked Clerk ID to existing user', { userId: existing.id, clerkId: clerkUserId });
      return existing;
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        password: passwordHash,
        clerkId: clerkUserId,
      },
    });
    logger.info('Created user from Clerk', { userId: user.id, clerkId: clerkUserId });
    return user;
  } catch (err) {
    logger.error('Failed to create user from Clerk', { clerkUserId, error: err });
    return null;
  }
}
