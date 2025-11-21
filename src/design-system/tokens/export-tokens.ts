import fs from 'fs';
import path from 'path';
let tokens: any = {};
let themeColors: any = {};
try {
  // Try to import using require for compatibility
  const indexModule = require('./index');
  tokens = indexModule.default || indexModule;
  themeColors = indexModule.themeColors || {};
} catch (e) {
  console.error('Failed to import tokens or themeColors:', e);
}

// ========== Versioning ==========
let version = '0.0.0';
try {
  version = require('../../package.json').version;
} catch (e) {
  version = '0.0.0';
}
const timestamp: string = new Date().toISOString();

// ========== Multi-Theme Export ==========
function exportThemeTokens(themeName: string, themeTokens: Record<string, any>): void {
  const css = tokensToCSS(themeTokens, `--co-${themeName}-`);
  const json = tokensToJSON(themeTokens);
  const cssPath = path.resolve(__dirname, `../../styles/tokens/tokens-${themeName}.css`);
  const jsonPath = path.resolve(__dirname, `./tokens-${themeName}.json`);
  fs.writeFileSync(cssPath, css);
  fs.writeFileSync(jsonPath, json);
}

// ========== Token to CSS ==========
function tokensToCSS(tokens: Record<string, any>, prefix = '--co-'): string {
  let css = `:root {\n  /* Version: ${version} | Timestamp: ${timestamp} */\n`;
  for (const [group, values] of Object.entries(tokens)) {
    if (typeof values === 'object' && values !== null) {
      for (const [key, value] of Object.entries(values as Record<string, any>)) {
        css += `  ${prefix}${group}-${key}: ${value};\n`;
      }
    }
  }
  css += '}\n';
  return css;
}

// ========== Token to JSON ==========
function tokensToJSON(tokens: Record<string, any>): string {
  return JSON.stringify({ version, timestamp, tokens }, null, 2);
}

// ========== Audit ==========
function auditTokens(tokens: Record<string, any>): string[] {
  const issues: string[] = [];
  for (const [group, values] of Object.entries(tokens)) {
    if (typeof values === 'object' && values !== null) {
      for (const [key, value] of Object.entries(values as Record<string, any>)) {
        if (group === 'colors' && typeof value === 'string' && value.startsWith('#')) {
          if (value.length !== 7) issues.push(`Color ${key} in ${group} is not a valid hex.`);
        }
        if (!/^[a-z0-9-]+$/i.test(key)) {
          issues.push(`Token key '${key}' in group '${group}' does not follow naming conventions.`);
        }
      }
    }
  }
  return issues;
}

// ========== Plugin System ==========
type ExportPlugin = (tokens: Record<string, any>, themeName: string, meta: { version: string; timestamp: string }) => void;
const exportPlugins: ExportPlugin[] = [];
function registerExportPlugin(plugin: ExportPlugin): void {
  exportPlugins.push(plugin);
}
function runExportPlugins(tokens: Record<string, any>, themeName: string): void {
  for (const plugin of exportPlugins) {
    plugin(tokens, themeName, { version, timestamp });
  }
}

// ========== Live Sync Hooks ==========
function onDesignToolSync(callback: (event: { event: string; tokens: Record<string, any> }) => void): void {
  // Placeholder for Figma/Sketch webhook integration
  // In production, connect to webhook/event bus
  // callback({ event: 'tokens-updated', tokens })
}

// ========== Main Export ==========
const themes = ['light', 'dark', 'solana'];
themes.forEach(theme => {
  if (themeColors && themeColors[theme]) {
    exportThemeTokens(theme, themeColors[theme]);
    runExportPlugins(themeColors[theme], theme);
  }
});

// Export default tokens as well
const css = tokensToCSS(tokens);
const json = tokensToJSON(tokens);
const cssPath = path.resolve(__dirname, '../../styles/tokens/tokens.css');
const jsonPath = path.resolve(__dirname, './tokens.json');
fs.writeFileSync(cssPath, css);
fs.writeFileSync(jsonPath, json);

// ========== Audit Report ==========
const auditIssues = auditTokens(tokens);
if (auditIssues.length) {
  console.warn('Token audit issues:', auditIssues);
} else {
  console.log('All tokens passed audit checks.');
}

console.log('Design tokens exported to CSS and JSON for all themes. Version:', version, 'Timestamp:', timestamp);

/**
 * Usage:
 *   npx ts-node src/design-system/tokens/export-tokens.ts
 *
 * Extensible: Add new token groups or formats as needed.
 * Integrate in CI/CD for automatic design token sync.
 */ 