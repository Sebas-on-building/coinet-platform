// Atomic stub for device session utilities
export async function revokeDevice(userId: string, deviceId: string): Promise<void> {
  // TODO: Implement real device revocation logic (DB, Redis, etc.)
  // For now, just log for atomic extensibility
  // eslint-disable-next-line no-console
  console.log(`[revokeDevice] userId=${userId}, deviceId=${deviceId}`);
} 