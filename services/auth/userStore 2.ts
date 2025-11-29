import { PrismaClient, User } from '../../src/generated/prisma-client';
import { getRedisClient } from '../../src/lib/data/redisClient';
import { Kafka, logLevel } from 'kafkajs';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const redis = getRedisClient();

const kafka = new Kafka({
  clientId: 'coient-auth',
  brokers: [process.env.KAFKA_BROKER || 'localhost:29092'],
  logLevel: logLevel.ERROR,
});
const producer = kafka.producer();
producer.connect();

async function logAudit(userId: string, event: string, details?: string) {
  await producer.send({
    topic: 'auth_audit',
    messages: [{
      value: JSON.stringify({ userId, event, details, timestamp: new Date().toISOString() })
    }],
  });
}

export async function getUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUser(profile: any): Promise<User> {
  // Accepts Google/Apple profile or email/password
  let user = await prisma.user.findUnique({ where: { email: profile.emails?.[0]?.value || profile.email } });
  if (user) return user;
  user = await prisma.user.create({
    data: {
      email: profile.emails?.[0]?.value || profile.email,
      passwordHash: profile.password ? await bcrypt.hash(profile.password, 10) : undefined,
      isVerified: true,
    },
  });
  await logAudit(user.id, 'user_created', 'SSO or email signup');
  return user;
}

export async function updateUserRole(id: string, role: string): Promise<User> {
  throw new Error('Role management not implemented: add a role field to the User model in schema.prisma');
}

export function requireRole(role: string) {
  return (req: any, res: any, next: any) => {
    if (req.user && req.user.role === role) return next();
    res.status(403).json({ error: 'Forbidden' });
  };
}

export async function storeSession(sessionId: string, userId: string) {
  await redis.set(`session:${sessionId}`, userId, 'EX', 60 * 60 * 24 * 7); // 7 days
}

export async function getSession(sessionId: string): Promise<string | null> {
  return redis.get(`session:${sessionId}`);
} 