import { Express, Router } from 'express';
import { examplePlugin } from './examplePlugin';

export function loadPlugins(app: Express) {
  // Load all plugins here
  examplePlugin(app);
}

export function pluginAuthHooks(router: Router) {
  // Allow plugins to add auth routes
} 