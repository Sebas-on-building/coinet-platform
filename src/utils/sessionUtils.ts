/**
 * Device session utilities — Clerk-backed implementation
 *
 * Uses Clerk Backend API for session management when CLERK_SECRET_KEY is set.
 * Falls back to empty/success when Clerk is not configured.
 */

import { createClerkClient } from '@clerk/backend';

export const SESSION_UTILS_IMPLEMENTED = !!process.env.CLERK_SECRET_KEY;

const clerkClient = SESSION_UTILS_IMPLEMENTED
  ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })
  : null;

export interface UserDevice {
  id: string;
  name: string;
  lastActive: string;
  browser?: string;
  os?: string;
  ip?: string;
}

/**
 * List user devices/sessions via Clerk Backend API.
 * Maps Clerk sessions to UserDevice format.
 */
export async function listUserDevices(userId: string): Promise<UserDevice[]> {
  if (!clerkClient) {
    return [];
  }
  try {
    const { data: sessions } = await clerkClient.sessions.getSessionList({ userId });
    return (sessions ?? []).map((s: { id: string; lastActiveAt?: number; createdAt?: number }) => ({
      id: s.id,
      name: 'Browser session',
      lastActive: new Date((s as any).lastActiveAt ?? (s as any).createdAt ?? 0).toISOString(),
    }));
  } catch (err) {
    console.error('[sessionUtils] listUserDevices failed:', err);
    return [];
  }
}

/**
 * Revoke a device session via Clerk Backend API.
 */
export async function revokeDevice(_userId: string, deviceId: string): Promise<void> {
  if (!clerkClient) {
    return;
  }
  try {
    await clerkClient.sessions.revokeSession(deviceId);
  } catch (err) {
    console.error('[sessionUtils] revokeDevice failed:', err);
    throw err;
  }
}
