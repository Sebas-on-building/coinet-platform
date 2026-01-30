// Atomic stub for device session utilities

export interface UserDevice {
  id: string;
  name: string;
  lastActive: string;
  browser?: string;
  os?: string;
  ip?: string;
}

export async function listUserDevices(userId: string): Promise<UserDevice[]> {
  // TODO: Implement real device listing logic (DB, Redis, etc.)
  // For now, return empty array
  // eslint-disable-next-line no-console
  console.log(`[listUserDevices] userId=${userId}`);
  return [];
}

export async function revokeDevice(userId: string, deviceId: string): Promise<void> {
  // TODO: Implement real device revocation logic (DB, Redis, etc.)
  // For now, just log for atomic extensibility
  // eslint-disable-next-line no-console
  console.log(`[revokeDevice] userId=${userId}, deviceId=${deviceId}`);
} 