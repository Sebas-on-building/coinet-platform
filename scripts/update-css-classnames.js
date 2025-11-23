const fs = require('fs');
const path = require('path');
const glob = require('glob');

const classMap = {
  askAI: 'ask-ai',
  aiResponse: 'ai-response',
  pluginListRoot: 'plugin-list-root',
  pluginListHeader: 'plugin-list-header',
  pluginListGrid: 'plugin-list-grid',
  pluginCard: 'plugin-card',
  auditDate: 'audit-date',
  // ...add all other mappings here
};

const exts = ['js', 'jsx', 'ts', 'tsx'];

Object.entries(classMap).forEach(([oldClass, newClass]) => {
  exts.forEach(ext => {
    glob.sync(`src/**/*.${ext}`).forEach(file => {
      let content = fs.readFileSync(file, 'utf8');
      const regex = new RegExp(`(['"\`])${oldClass}\\1`, 'g');
      content = content.replace(regex, `$1${newClass}$1`);
      fs.writeFileSync(file, content, 'utf8');
    });
  });
});
console.log('Class names updated!'); 