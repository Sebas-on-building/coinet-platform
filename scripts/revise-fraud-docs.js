#!/usr/bin/env node

/**
 * Fraud Detection Documentation Review Script
 * 
 * This script reviews fraud detection documentation files for:
 * - Exaggerated accuracy claims (e.g., "99.99%")
 * - Placeholder text or TODOs
 * - Uninitialized/missing component references
 * - Unrealistic performance claims
 * 
 * Creates backups and generates a report with suggestions.
 */

const fs = require('fs');
const path = require('path');

// Files to review
const FRAUD_DOCS = [
  'services/alchemy-whales/ULTIMATE_FRAUD_DETECTION_99.99.md',
  'services/alchemy-whales/FINAL_VERIFICATION.md',
  'services/alchemy-whales/RAILWAY_VARIABLES_VERIFICATION.md',
  'services/alchemy-whales/RAILWAY_ULTIMATE_SETUP.md',
];

const CODE_FILES = [
  'services/alchemy-whales/src/ai/UltimateFraudDetector.ts',
  'services/alchemy-whales/src/ai/FraudMLModel.ts',
  'services/alchemy-whales/examples/ultimate-fraud-detection.ts',
];

// Patterns to detect exaggerated claims
const EXAGGERATED_PATTERNS = [
  {
    pattern: /99\.9{2,}%/gi,
    description: 'Extremely high accuracy claim (99.99%+)',
    suggestion: 'Consider using more realistic ranges like "high accuracy" or ">95%"',
  },
  {
    pattern: /100%\s+(accuracy|precision|recall|detection)/gi,
    description: 'Perfect accuracy claim',
    suggestion: 'Perfect accuracy is unrealistic - consider "near-perfect" or ">99%"',
  },
  {
    pattern: /zero\s+(false\s+)?(negatives|positives)/gi,
    description: 'Zero false positives/negatives claim',
    suggestion: 'Zero false rates are unrealistic - consider "extremely low" or "<0.1%"',
  },
  {
    pattern: /never\s+(misses|fails|miss)/gi,
    description: 'Absolute guarantee claim',
    suggestion: 'Avoid absolute guarantees - use "rarely" or "extremely unlikely"',
  },
  {
    pattern: /most\s+advanced.*ever\s+created/gi,
    description: 'Hyperbolic superiority claim',
    suggestion: 'Use more measured language like "highly advanced" or "state-of-the-art"',
  },
];

// Patterns to detect placeholders/TODOs
const PLACEHOLDER_PATTERNS = [
  {
    pattern: /TODO|FIXME|XXX|HACK/gi,
    description: 'TODO/FIXME marker',
  },
  {
    pattern: /placeholder|dummy|example\s+value|your_.*_here/gi,
    description: 'Placeholder text',
  },
  {
    pattern: /\[.*\]/g,
    description: 'Bracket notation (may indicate placeholder)',
  },
];

// Patterns to detect unrealistic performance claims
const PERFORMANCE_PATTERNS = [
  {
    pattern: /< 1\s*second|instant(aneous)?/gi,
    description: 'Sub-second performance claim',
    suggestion: 'Specify conditions (e.g., "typically < 1 second" or "under normal load")',
  },
  {
    pattern: /real-?time|instant(aneous)?\s+analysis/gi,
    description: 'Real-time claim',
    suggestion: 'Clarify what "real-time" means (e.g., "near real-time" or "within X seconds")',
  },
];

/**
 * Review a file for issues
 */
function reviewFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    return {
      file: filePath,
      exists: false,
      issues: [],
    };
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');
  const issues = [];

  // Check for exaggerated claims
  EXAGGERATED_PATTERNS.forEach(({ pattern, description, suggestion }) => {
    const matches = [...content.matchAll(new RegExp(pattern.source, 'gi'))];
    matches.forEach(match => {
      const lineNum = content.substring(0, match.index).split('\n').length;
      issues.push({
        type: 'exaggerated_claim',
        severity: 'high',
        line: lineNum,
        description,
        match: match[0],
        suggestion,
        context: lines[lineNum - 1]?.trim() || '',
      });
    });
  });

  // Check for placeholders
  PLACEHOLDER_PATTERNS.forEach(({ pattern, description }) => {
    const matches = [...content.matchAll(new RegExp(pattern.source, 'gi'))];
    matches.forEach(match => {
      const lineNum = content.substring(0, match.index).split('\n').length;
      issues.push({
        type: 'placeholder',
        severity: 'medium',
        line: lineNum,
        description,
        match: match[0],
        context: lines[lineNum - 1]?.trim() || '',
      });
    });
  });

  // Check for performance claims
  PERFORMANCE_PATTERNS.forEach(({ pattern, description, suggestion }) => {
    const matches = [...content.matchAll(new RegExp(pattern.source, 'gi'))];
    matches.forEach(match => {
      const lineNum = content.substring(0, match.index).split('\n').length;
      issues.push({
        type: 'performance_claim',
        severity: 'medium',
        line: lineNum,
        description,
        match: match[0],
        suggestion,
        context: lines[lineNum - 1]?.trim() || '',
      });
    });
  });

  return {
    file: filePath,
    exists: true,
    issues,
    totalIssues: issues.length,
    highSeverity: issues.filter(i => i.severity === 'high').length,
  };
}

/**
 * Create backup of a file
 */
function createBackup(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) return null;

  const backupPath = `${fullPath}.bak`;
  fs.copyFileSync(fullPath, backupPath);
  return backupPath;
}

/**
 * Generate report
 */
function generateReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: results.length,
      filesWithIssues: results.filter(r => r.exists && r.totalIssues > 0).length,
      totalIssues: results.reduce((sum, r) => sum + (r.totalIssues || 0), 0),
      highSeverityIssues: results.reduce((sum, r) => sum + (r.highSeverity || 0), 0),
    },
    files: results,
  };

  return report;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Fraud Detection Documentation Review\n');
  console.log('Reviewing files for exaggerated claims, placeholders, and unrealistic performance claims...\n');

  const allFiles = [...FRAUD_DOCS, ...CODE_FILES];
  const results = [];

  // Review each file
  allFiles.forEach(file => {
    console.log(`📄 Reviewing: ${file}`);
    const result = reviewFile(file);
    results.push(result);

    if (!result.exists) {
      console.log(`   ⚠️  File not found\n`);
    } else if (result.totalIssues === 0) {
      console.log(`   ✅ No issues found\n`);
    } else {
      console.log(`   ⚠️  Found ${result.totalIssues} issue(s) (${result.highSeverity} high severity)\n`);
    }
  });

  // Generate report
  const report = generateReport(results);
  const reportPath = path.join(process.cwd(), 'fraud-docs-review-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total files reviewed: ${report.summary.totalFiles}`);
  console.log(`Files with issues: ${report.summary.filesWithIssues}`);
  console.log(`Total issues found: ${report.summary.totalIssues}`);
  console.log(`High severity issues: ${report.summary.highSeverityIssues}`);
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  // Print detailed issues
  if (report.summary.totalIssues > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('⚠️  DETAILED ISSUES');
    console.log('='.repeat(60));

    results.forEach(result => {
      if (result.exists && result.issues.length > 0) {
        console.log(`\n📄 ${result.file}`);
        console.log('-'.repeat(60));

        // Group by type
        const byType = {};
        result.issues.forEach(issue => {
          if (!byType[issue.type]) byType[issue.type] = [];
          byType[issue.type].push(issue);
        });

        Object.entries(byType).forEach(([type, issues]) => {
          console.log(`\n  ${type.toUpperCase()} (${issues.length}):`);
          issues.slice(0, 5).forEach(issue => {
            console.log(`    Line ${issue.line}: ${issue.description}`);
            console.log(`    Match: "${issue.match}"`);
            if (issue.suggestion) {
              console.log(`    💡 Suggestion: ${issue.suggestion}`);
            }
            if (issue.context) {
              console.log(`    Context: ${issue.context.substring(0, 80)}...`);
            }
            console.log('');
          });
          if (issues.length > 5) {
            console.log(`    ... and ${issues.length - 5} more`);
          }
        });
      }
    });
  }

  // Create backups
  console.log('\n' + '='.repeat(60));
  console.log('💾 CREATING BACKUPS');
  console.log('='.repeat(60));

  allFiles.forEach(file => {
    const backupPath = createBackup(file);
    if (backupPath) {
      console.log(`✅ Backup created: ${backupPath}`);
    }
  });

  console.log('\n✅ Review complete!');
  console.log('\nNext steps:');
  console.log('1. Review the detailed report: fraud-docs-review-report.json');
  console.log('2. Review files with high severity issues');
  console.log('3. Consider updating claims to be more realistic');
  console.log('4. Add unit tests with realistic AUC/F1 values');
  console.log('5. Add docblock notes with actual performance metrics');
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { reviewFile, generateReport };

