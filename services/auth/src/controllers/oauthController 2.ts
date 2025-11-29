import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import fetch from 'node-fetch';
import { OAuthService } from '../../services/oauthService';
// For Apple, use apple-signin-auth or similar package

const prisma = new PrismaClient();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function googleLogin(req: Request, res: Response) {
  try {
    const { idToken } = req.body;
    const user = await OAuthService.handleGoogle(idToken);
    const tokens = await OAuthService.issueTokens(user);
    res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, secure: true });
    res.json({ accessToken: tokens.accessToken });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function githubLogin(req: Request, res: Response) {
  try {
    const { code } = req.body;
    const user = await OAuthService.handleGithub(code);
    const tokens = await OAuthService.issueTokens(user);
    res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, secure: true });
    res.json({ accessToken: tokens.accessToken });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function githubLogin(req: Request, res: Response) {
  const { code } = req.body;
  // Exchange code for access token
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
  if (!tokenData.access_token) return res.status(400).json({ error: 'Invalid GitHub code' });
  // Get user info
  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `token ${tokenData.access_token}` },
  });
  const userData = await userRes.json();
  if (!userData.email && userData.id) {
    // Fetch emails if not public
    const emailsRes = await fetch('https://api.github.com/user/emails', {
      headers: { Authorization: `token ${tokenData.access_token}` },
    });
    const emails = await emailsRes.json();
    userData.email = emails.find((e: any) => e.primary)?.email;
  }
  if (!userData.email) return res.status(400).json({ error: 'No email from GitHub' });
  let user = await prisma.user.findUnique({ where: { email: userData.email } });
  if (!user) {
    user = await prisma.user.create({ data: { email: userData.email, passwordHash: '', oauthAccounts: { create: { provider: 'github', providerId: String(userData.id) } } } });
  }
  await prisma.oAuthAccount.upsert({
    where: { provider_providerId: { provider: 'github', providerId: String(userData.id) } },
    update: { userId: user.id },
    create: { provider: 'github', providerId: String(userData.id), userId: user.id },
  });
  const accessToken = jwt.sign({ sub: user.id, role: user.role }, process.env.ACCESS_SECRET!, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ sub: user.id }, process.env.REFRESH_SECRET!, { expiresIn: '7d' });
  res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true });
  res.json({ accessToken });
}

export async function facebookLogin(req: Request, res: Response) {
  const { accessToken: fbToken } = req.body;
  // Get user info from Facebook
  const userRes = await fetch(`https://graph.facebook.com/me?fields=id,email&access_token=${fbToken}`);
  const userData = await userRes.json();
  if (!userData.email) return res.status(400).json({ error: 'No email from Facebook' });
  let user = await prisma.user.findUnique({ where: { email: userData.email } });
  if (!user) {
    user = await prisma.user.create({ data: { email: userData.email, passwordHash: '', oauthAccounts: { create: { provider: 'facebook', providerId: userData.id } } } });
  }
  await prisma.oAuthAccount.upsert({
    where: { provider_providerId: { provider: 'facebook', providerId: userData.id } },
    update: { userId: user.id },
    create: { provider: 'facebook', providerId: userData.id, userId: user.id },
  });
  const accessToken = jwt.sign({ sub: user.id, role: user.role }, process.env.ACCESS_SECRET!, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ sub: user.id }, process.env.REFRESH_SECRET!, { expiresIn: '7d' });
  res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true });
  res.json({ accessToken });
}

// Apple SSO would be similar, using apple-signin-auth 