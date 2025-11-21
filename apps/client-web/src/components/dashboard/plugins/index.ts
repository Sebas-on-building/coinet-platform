import { registerExamplePlugin } from './registerExamplePlugin';

export function registerAllPlugins() {
  registerExamplePlugin();
  // Add more plugin registrations here
}

// Auto-register on load
if (typeof window !== 'undefined') {
  registerAllPlugins();
} 