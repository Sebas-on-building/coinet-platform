const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, '../services/marketplace-registry/prisma/schema.prisma');
const BACKUP_PATH = path.join(__dirname, '../services/marketplace-registry/prisma/schema.prisma.bak');

const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
const lines = schema.split('\n');

let inPluginModel = false;
let inSupportModel = false;
let supportModelName = '';
let pluginModelLines = [];
let cleanedLines = [];
let foundBilling = false;
let foundSupportFeature = false;

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];

  // Detect start of Plugin model
  if (line.match(/^model Plugin\b/)) {
    inPluginModel = true;
    pluginModelLines = [];
  }

  // Detect end of Plugin model
  if (inPluginModel && line.match(/^}/)) {
    inPluginModel = false;
    // Filter support* fields except supportFeatures and supportFeaturesJson
    pluginModelLines = pluginModelLines.filter(l => {
      if (l.trim().startsWith('support') && !l.includes('supportFeatures') && !l.includes('supportFeaturesJson')) {
        return false;
      }
      return true;
    });
    cleanedLines.push(...pluginModelLines);
    cleanedLines.push(line);
    continue;
  }

  // Collect Plugin model lines
  if (inPluginModel) {
    pluginModelLines.push(line);
    continue;
  }

  // Remove all PluginSupport* models except PluginSupportFeature
  if (line.match(/^model PluginSupport/)) {
    supportModelName = line.match(/^model (PluginSupport\w+)/)[1];
    if (supportModelName === 'PluginSupportFeature') {
      inSupportModel = true;
      foundSupportFeature = true;
      cleanedLines.push(line);
    } else {
      inSupportModel = true;
    }
    continue;
  }
  if (inSupportModel) {
    if (line.match(/^}/)) {
      if (supportModelName === 'PluginSupportFeature') {
        cleanedLines.push(line);
      }
      inSupportModel = false;
      supportModelName = '';
    } else if (supportModelName === 'PluginSupportFeature') {
      cleanedLines.push(line);
    }
    continue;
  }

  // Check for Billing model
  if (line.match(/^model Billing\b/)) {
    foundBilling = true;
  }

  cleanedLines.push(line);
}

// Add minimal Billing model if not present
if (!foundBilling) {
  cleanedLines.push('\nmodel Billing {');
  cleanedLines.push('  id             String   @id @default(uuid())');
  cleanedLines.push('  organizationId String   @unique');
  cleanedLines.push('  plan           String');
  cleanedLines.push('  status         String');
  cleanedLines.push('  renewalDate    DateTime?');
  cleanedLines.push('  createdAt      DateTime @default(now())');
  cleanedLines.push('  updatedAt      DateTime @updatedAt');
  cleanedLines.push('  organization   Organization @relation(fields: [organizationId], references: [id])');
  cleanedLines.push('}');
}

// Add PluginSupportFeature model if not present
if (!foundSupportFeature) {
  cleanedLines.push('\nmodel PluginSupportFeature {');
  cleanedLines.push('  id        String   @id @default(uuid())');
  cleanedLines.push('  pluginId  String');
  cleanedLines.push('  type      String   // e.g., \'UX\', \'UI\', \'Godlike\', etc.');
  cleanedLines.push('  value     String?  // e.g., description, label, etc.');
  cleanedLines.push('  meta      Json?    // extensible metadata for sub-features');
  cleanedLines.push('  createdAt DateTime @default(now())');
  cleanedLines.push('  updatedAt DateTime @updatedAt');
  cleanedLines.push('  plugin    Plugin   @relation(fields: [pluginId], references: [id])');
  cleanedLines.push('}');
}

// Backup and write cleaned schema
fs.copyFileSync(SCHEMA_PATH, BACKUP_PATH);
fs.writeFileSync(SCHEMA_PATH, cleanedLines.join('\n'), 'utf8');

console.log('Schema deduplication complete. Backup saved as schema.prisma.bak.'); 