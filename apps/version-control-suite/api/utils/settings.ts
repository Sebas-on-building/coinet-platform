let settings = { theme: 'dark', notifications: true };
export async function getUserSettings() {
  return settings;
}
export async function setUserSettings(newSettings: any) {
  settings = newSettings;
  return settings;
} 