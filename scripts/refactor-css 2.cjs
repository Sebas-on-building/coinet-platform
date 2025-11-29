// This script is now refactor-css.cjs for CommonJS compatibility in a type: module project.
// Usage: node scripts/refactor-css.cjs
const fs = require('fs');
const path = require('path');

const kebabCase = str =>
  str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/_/g, '-').toLowerCase();

function refactorCssFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Convert class selectors to kebab-case
  content = content.replace(/\.(\w+)/g, (match, p1) => {
    if (p1 === kebabCase(p1)) return match;
    return '.' + kebabCase(p1);
  });

  // Convert keyframes to kebab-case
  content = content.replace(/@keyframes\s+([a-zA-Z0-9_]+)/g, (match, p1) => {
    return `@keyframes ${kebabCase(p1)}`;
  });
  content = content.replace(/animation:\s*([a-zA-Z0-9_]+)/g, (match, p1) => {
    return `animation: ${kebabCase(p1)}`;
  });

  // Modern color-function and alpha-value notation
  content = content.replace(
    /rgba?\((\d+),\s*(\d+),\s*(\d+),\s*(0?\.\d+)\)/g,
    (match, r, g, b, a) => `rgb(${r} ${g} ${b} / ${Math.round(a * 100)}%)`
  );

  // Enforce :not() complex notation
  content = content.replace(/:not\((:[\w-]+)\)/g, (match, p1) => `:not(${p1})`);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Refactored: ${filePath}`);
}

function walkDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.css') || fullPath.endsWith('.scss')) {
      refactorCssFile(fullPath);
    }
  });
}

// Run on your src/components and any other relevant directories
walkDir(path.join(__dirname, '../src/components'));
walkDir(path.join(__dirname, '../packages')); 