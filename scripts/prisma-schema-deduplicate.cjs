const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, '../services/marketplace-registry/prisma/schema.prisma');
const BACKUP_PATH = path.join(__dirname, '../services/marketplace-registry/prisma/schema.prisma.bak');

const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
const lines = schema.split('\n');

// Remove stray closing braces at the top
while (lines.length && lines[0].trim() === '}') {
  lines.shift();
}

let inPluginModel = false;
let inSupportModel = false;
let supportModelName = '';
let pluginModelLines = [];
let cleanedLines = [];
let foundBilling = false;
let foundSupportFeature = false;
let insideModel = false;
let insideEnum = false;
let enumLines = [];
let foundGenerator = false;
let foundDatasource = false;
let generatorBlock = [];
let datasourceBlock = [];

function isWhitespaceOrComment(line) {
  return /^\s*$/.test(line) || line.trim().startsWith('//');
}

// Helper: Move enum values from models to enums
function extractEnumFromModel(modelLines, enumName, enumValues) {
  const newModelLines = [];
  let foundEnum = false;
  for (const line of modelLines) {
    if (enumValues.includes(line.trim())) {
      foundEnum = true;
      continue;
    }
    newModelLines.push(line);
  }
  return { newModelLines, foundEnum };
}

// Known enums to fix
const enumsToFix = [
  { name: 'PluginStatus', values: ['DRAFT', 'PUBLISHED', 'SUSPENDED', 'ARCHIVED'] },
  { name: 'OrgRole', values: ['OWNER', 'ADMIN', 'MEMBER', 'GUEST'] },
  { name: 'CollaboratorRole', values: ['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'] },
  { name: 'PluginListingStatus', values: ['PENDING', 'APPROVED', 'REJECTED', 'DELISTED'] },
  { name: 'MediaType', values: ['IMAGE', 'VIDEO', 'GIF', 'SVG', 'OTHER'] },
  { name: 'CompatibilityStatus', values: ['COMPATIBLE', 'INCOMPATIBLE', 'PARTIAL', 'UNKNOWN'] },
];
const enumsFound = {};

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];

  // Detect generator block
  if (line.match(/^generator /)) {
    foundGenerator = true;
    generatorBlock = [line];
    i++;
    while (i < lines.length && !lines[i].match(/^}/)) {
      generatorBlock.push(lines[i]);
      i++;
    }
    if (i < lines.length) generatorBlock.push(lines[i]);
    continue;
  }
  // Detect datasource block
  if (line.match(/^datasource /)) {
    foundDatasource = true;
    datasourceBlock = [line];
    i++;
    while (i < lines.length && !lines[i].match(/^}/)) {
      datasourceBlock.push(lines[i]);
      i++;
    }
    if (i < lines.length) datasourceBlock.push(lines[i]);
    continue;
  }

  // Detect start of any model
  if (line.match(/^model \w+\b/)) {
    insideModel = true;
  }
  // Detect end of any model
  if (insideModel && line.match(/^}/)) {
    insideModel = false;
    cleanedLines.push(line);
    continue;
  }

  // Remove orphaned field blocks (lines that look like model fields but are not inside a model)
  if (!insideModel && line.match(/^\s*\w+\s+\w+/)) {
    // Skip orphaned field lines
    continue;
  }

  // Detect start of enum
  if (line.match(/^enum \w+\b/)) {
    insideEnum = true;
    enumLines = [line];
    continue;
  }
  // Collect enum lines
  if (insideEnum) {
    if (line.match(/^}/)) {
      insideEnum = false;
      enumLines.push(line);
      cleanedLines.push(...enumLines);
    } else {
      enumLines.push(line);
    }
    continue;
  }

  // Remove all PluginSupport* models except PluginSupportFeature
  if (line.match(/^model PluginSupport/)) {
    const match = line.match(/^model (PluginSupport\w+)/);
    if (!match) {
      // Not a valid PluginSupport* model line, skip
      continue;
    }
    supportModelName = match[1];
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

  // Detect start of Plugin model
  if (line.match(/^model Plugin\b/)) {
    inPluginModel = true;
    pluginModelLines = [];
  }
  // Detect end of Plugin model
  if (inPluginModel && line.match(/^}/)) {
    inPluginModel = false;
    // Remove enum values from Plugin model
    let result = pluginModelLines;
    enumsToFix.forEach(e => {
      const { newModelLines, foundEnum } = extractEnumFromModel(result, e.name, e.values);
      result = newModelLines;
      if (foundEnum) enumsFound[e.name] = true;
    });
    // Filter support* fields except supportFeatures and supportFeaturesJson
    result = result.filter(l => {
      if (l.trim().startsWith('support') && !l.includes('supportFeatures') && !l.includes('supportFeaturesJson')) {
        return false;
      }
      return true;
    });
    cleanedLines.push(...result);
    cleanedLines.push(line);
    continue;
  }
  // Collect Plugin model lines
  if (inPluginModel) {
    pluginModelLines.push(line);
    continue;
  }

  // Check for Billing model
  if (line.match(/^model Billing\b/)) {
    foundBilling = true;
  }

  // Only keep lines inside model/enum/generator/datasource blocks, or comments/whitespace
  if (!insideModel && !insideEnum && !inPluginModel && !inSupportModel && !isWhitespaceOrComment(line)) {
    continue;
  }

  cleanedLines.push(line);
}

// Add generator and datasource blocks at the top if missing
const finalLines = [];
if (!foundGenerator) {
  finalLines.push('generator client {');
  finalLines.push('  provider = "prisma-client-js"');
  finalLines.push('}');
  finalLines.push('');
} else {
  finalLines.push(...generatorBlock);
  finalLines.push('');
}
if (!foundDatasource) {
  finalLines.push('datasource db {');
  finalLines.push('  provider = "postgresql"');
  finalLines.push('  url      = env("DATABASE_URL")');
  finalLines.push('}');
  finalLines.push('');
} else {
  finalLines.push(...datasourceBlock);
  finalLines.push('');
}
finalLines.push(...cleanedLines);

// Add minimal Billing model if not present
if (!foundBilling) {
  finalLines.push('\nmodel Billing {');
  finalLines.push('  id             String   @id @default(uuid())');
  finalLines.push('  organizationId String   @unique');
  finalLines.push('  plan           String');
  finalLines.push('  status         String');
  finalLines.push('  renewalDate    DateTime?');
  finalLines.push('  createdAt      DateTime @default(now())');
  finalLines.push('  updatedAt      DateTime @updatedAt');
  finalLines.push('  organization   Organization @relation(fields: [organizationId], references: [id])');
  finalLines.push('}');
}

// Add PluginSupportFeature model if not present
if (!foundSupportFeature) {
  finalLines.push('\nmodel PluginSupportFeature {');
  finalLines.push('  id        String   @id @default(uuid())');
  finalLines.push('  pluginId  String');
  finalLines.push('  type      String   // e.g., \'UX\', \'UI\', \'Godlike\', etc.');
  finalLines.push('  value     String?  // e.g., description, label, etc.');
  finalLines.push('  meta      Json?    // extensible metadata for sub-features');
  finalLines.push('  createdAt DateTime @default(now())');
  finalLines.push('  updatedAt DateTime @updatedAt');
  finalLines.push('  plugin    Plugin   @relation(fields: [pluginId], references: [id])');
  finalLines.push('}');
}

// At the end, append any missing enums
Object.entries(enumsToFix).forEach(([idx, e]) => {
  if (!enumsFound[e.name]) {
    finalLines.push(`\nenum ${e.name} {`);
    e.values.forEach(v => finalLines.push(`  ${v}`));
    finalLines.push('}');
  }
});

// Remove stray closing braces not inside a block
function isBlockStart(line) {
  return line.match(/^(model|enum|generator|datasource) \w+/);
}

let blockStack = [];
let finalCleanedLines = [];
for (let i = 0; i < finalLines.length; i++) {
  const line = finalLines[i];
  if (isBlockStart(line)) {
    blockStack.push(true);
    finalCleanedLines.push(line);
    continue;
  }
  if (line.trim() === '}') {
    if (blockStack.length > 0) {
      blockStack.pop();
      finalCleanedLines.push(line);
    }
    // else: stray closing brace, skip
    continue;
  }
  finalCleanedLines.push(line);
}

// Backup and write cleaned schema
fs.copyFileSync(SCHEMA_PATH, BACKUP_PATH);
fs.writeFileSync(SCHEMA_PATH, finalCleanedLines.join('\n'), 'utf8');

console.log('Schema deduplication, block, and stray brace fix complete. Backup saved as schema.prisma.bak.'); 