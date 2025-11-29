import { PrismaClient, User } from '@prisma/client';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export const OAuthService = {
  async handleGoogle(idToken: string) {
    const ticket = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`).then(res => res.json());
    if (!ticket.email) throw new Error('Invalid Google token');
    let user = await prisma.user.findUnique({ where: { email: ticket.email } });
    if (!user) {
      user = await prisma.user.create({ data: { email: ticket.email, passwordHash: '', oauthAccounts: { create: { provider: 'google', providerId: ticket.sub } } } });
    }
    return user;
  },
  async handleGithub(code: string) {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID!,
        client_secret: process.env.GITHUB_CLIENT_SECRET!,
        code,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('Invalid GitHub code');
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `token ${tokenData.access_token}` },
    });
    const userData = await userRes.json();
    if (!userData.email && userData.id) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `token ${tokenData.access_token}` },
      });
      const emails = await emailsRes.json();
      userData.email = emails.find((e: any) => e.primary)?.email;
    }
    if (!userData.email) throw new Error('No email from GitHub');
    let user = await prisma.user.findUnique({ where: { email: userData.email } });
    if (!user) {
      user = await prisma.user.create({ data: { email: userData.email, passwordHash: '', oauthAccounts: { create: { provider: 'github', providerId: String(userData.id) } } } });
    }
    return user;
  },
  async issueTokens(user: User) {
    const sessionId = uuidv4();
    const accessToken = jwt.sign({ sub: user.id, role: user.role, sessionId }, process.env.ACCESS_SECRET!, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ sub: user.id, sessionId }, process.env.REFRESH_SECRET!, { expiresIn: '7d' });
    return { accessToken, refreshToken, sessionId };
  }
}; 