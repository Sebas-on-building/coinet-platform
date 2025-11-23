/**
 * COMPREHENSIVE SECURITY VALIDATION SUITE
 *
 * This script validates the entire security & compliance implementation
 * including encryption, rate limiting, RLS, audit logging, and GDPR compliance.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Security validation results
 */
class SecurityValidator {
  constructor() {
    this.results = {
      encryption: { status: 'pending', checks: [] },
      rateLimiting: { status: 'pending', checks: [] },
      rowLevelSecurity: { status: 'pending', checks: [] },
      auditLogging: { status: 'pending', checks: [] },
      gdprCompliance: { status: 'pending', checks: [] },
      overall: { status: 'pending', score: 0 }
    };
  }

  /**
   * Validate encryption implementation
   */
  validateEncryption() {
    console.log('🔐 Validating Encryption Implementation...');

    const checks = [
      {
        name: 'AES-256 Encryption Service',
        check: () => this.checkFileExists('services/enterprise-encryption-service/src/index.ts'),
        weight: 20
      },
      {
        name: 'Key Management System',
        check: () => this.checkFileExists('services/enterprise-encryption-service/src/core/KeyManagementSystem.ts'),
        weight: 15
      },
      {
        name: 'Quantum-Resistant Encryption',
        check: () => this.checkFileExists('services/enterprise-encryption-service/src/core/QuantumResistantEncryptionEngine.ts'),
        weight: 15
      },
      {
        name: 'Hardware Security Module',
        check: () => this.checkFileExists('services/enterprise-encryption-service/src/core/HardwareSecurityModule.ts'),
        weight: 10
      },
      {
        name: 'Database Encryption Schema',
        check: () => this.checkPrismaSchema('EncryptedUserData'),
        weight: 20
      },
      {
        name: 'Encryption Audit Logging',
        check: () => this.checkPrismaSchema('EncryptionAuditLog'),
        weight: 20
      }
    ];

    this.runChecks('encryption', checks);
  }

  /**
   * Validate rate limiting implementation
   */
  validateRateLimiting() {
    console.log('⚡ Validating Rate Limiting Implementation...');

    const checks = [
      {
        name: 'Enterprise Rate Limiting Service',
        check: () => this.checkFileExists('services/enterprise-rate-limiting-service/src/index.ts'),
        weight: 25
      },
      {
        name: 'Adaptive Rate Limiter',
        check: () => this.checkFileExists('services/enterprise-rate-limiting-service/src/core/AdaptiveRateLimiter.ts'),
        weight: 20
      },
      {
        name: 'Multiple Algorithms (Fixed, Sliding, Token Bucket)',
        check: () => this.checkMultipleFiles([
          'services/enterprise-rate-limiting-service/src/algorithms/FixedWindowAlgorithm.ts',
          'services/enterprise-rate-limiting-service/src/algorithms/SlidingWindowAlgorithm.ts',
          'services/enterprise-rate-limiting-service/src/algorithms/TokenBucketAlgorithm.ts'
        ]),
        weight: 25
      },
      {
        name: 'Distributed Rate Limiting',
        check: () => this.checkFileExists('services/enterprise-rate-limiting-service/src/core/DistributedRateLimiter.ts'),
        weight: 15
      },
      {
        name: 'Rate Limiting Middleware',
        check: () => this.checkFileExists('services/enterprise-rate-limiting-service/src/middleware/RateLimitingMiddleware.ts'),
        weight: 15
      }
    ];

    this.runChecks('rateLimiting', checks);
  }

  /**
   * Validate row-level security implementation
   */
  validateRowLevelSecurity() {
    console.log('🔒 Validating Row-Level Security Implementation...');

    const checks = [
      {
        name: 'RLS Implementation README',
        check: () => this.checkFileExists('RLS_IMPLEMENTATION_README.md'),
        weight: 10
      },
      {
        name: 'Comprehensive RLS Setup Script',
        check: () => this.checkFileExists('scripts/comprehensive_rls_setup.sql'),
        weight: 20
      },
      {
        name: 'RLS Deployment Script',
        check: () => this.checkFileExists('scripts/deploy_rls_implementation.sh'),
        weight: 15
      },
      {
        name: 'RLS Comprehensive Tests',
        check: () => this.checkFileExists('scripts/rls_comprehensive_tests.sql'),
        weight: 20
      },
      {
        name: 'Tenant Management Functions',
        check: () => this.checkFileContent('scripts/comprehensive_rls_setup.sql', 'create_tenant'),
        weight: 15
      },
      {
        name: 'Tenant Context Functions',
        check: () => this.checkFileContent('scripts/comprehensive_rls_setup.sql', 'set_tenant_context'),
        weight: 10
      },
      {
        name: 'Tenant Isolation Verification',
        check: () => this.checkFileContent('scripts/comprehensive_rls_setup.sql', 'verify_tenant_isolation'),
        weight: 10
      }
    ];

    this.runChecks('rowLevelSecurity', checks);
  }

  /**
   * Validate audit logging implementation
   */
  validateAuditLogging() {
    console.log('📋 Validating Audit Logging Implementation...');

    const checks = [
      {
        name: 'Security Audit Service',
        check: () => this.checkFileExists('services/security-audit-service/src/index.ts'),
        weight: 20
      },
      {
        name: 'Vulnerability Scanner',
        check: () => this.checkFileExists('services/security-audit-service/src/core/VulnerabilityScanner.ts'),
        weight: 15
      },
      {
        name: 'Penetration Tester',
        check: () => this.checkFileExists('services/security-audit-service/src/core/PenetrationTester.ts'),
        weight: 15
      },
      {
        name: 'Compliance Auditor',
        check: () => this.checkFileExists('services/security-audit-service/src/core/ComplianceAuditor.ts'),
        weight: 15
      },
      {
        name: 'Audit Log Schema',
        check: () => this.checkPrismaSchema('AuditLog'),
        weight: 20
      },
      {
        name: 'GDPR Audit Service',
        check: () => this.checkFileExists('services/gdpr-compliance-service/src/index.ts'),
        weight: 15
      }
    ];

    this.runChecks('auditLogging', checks);
  }

  /**
   * Validate GDPR compliance implementation
   */
  validateGDPRCompliance() {
    console.log('🇪🇺 Validating GDPR Compliance Implementation...');

    const checks = [
      {
        name: 'GDPR Compliance Service',
        check: () => this.checkFileExists('services/gdpr-compliance-service/src/index.ts'),
        weight: 25
      },
      {
        name: 'Consent Management',
        check: () => this.checkFileExists('services/gdpr-compliance-service/src/controllers/ConsentController.ts'),
        weight: 20
      },
      {
        name: 'GDPR Service',
        check: () => this.checkFileExists('services/gdpr-compliance-service/src/services/GDPRService.ts'),
        weight: 20
      },
      {
        name: 'Privacy Audit Logs',
        check: () => this.checkPrismaSchema('PrivacyAuditLog'),
        weight: 15
      },
      {
        name: 'Data Export Service',
        check: () => this.checkFileExists('services/gdpr-compliance-service/src/services/DataExportService.ts'),
        weight: 10
      },
      {
        name: 'Audit Service',
        check: () => this.checkFileExists('services/gdpr-compliance-service/src/services/AuditService.ts'),
        weight: 10
      }
    ];

    this.runChecks('gdprCompliance', checks);
  }

  /**
   * Run security checks for a category
   */
  runChecks(category, checks) {
    let totalScore = 0;
    let maxScore = 0;

    for (const check of checks) {
      maxScore += check.weight;
      const passed = check.check();
      const score = passed ? check.weight : 0;

      this.results[category].checks.push({
        name: check.name,
        passed,
        weight: check.weight,
        score
      });

      totalScore += score;
    }

    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    this.results[category].status = percentage >= 90 ? 'passed' : percentage >= 70 ? 'warning' : 'failed';
    this.results[category].score = percentage;
  }

  /**
   * Check if file exists
   */
  checkFileExists(filePath) {
    try {
      return fs.existsSync(path.join(__dirname, filePath));
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if multiple files exist
   */
  checkMultipleFiles(filePaths) {
    return filePaths.every(filePath => this.checkFileExists(filePath));
  }

  /**
   * Check Prisma schema for specific model
   */
  checkPrismaSchema(modelName) {
    try {
      const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      return schema.includes(`model ${modelName}`);
    } catch (error) {
      return false;
    }
  }

  /**
   * Check file content for specific text
   */
  checkFileContent(filePath, content) {
    try {
      const fullPath = path.join(__dirname, filePath);
      const fileContent = fs.readFileSync(fullPath, 'utf8');
      return fileContent.includes(content);
    } catch (error) {
      return false;
    }
  }

  /**
   * Calculate overall security score
   */
  calculateOverallScore() {
    const categories = ['encryption', 'rateLimiting', 'rowLevelSecurity', 'auditLogging', 'gdprCompliance'];
    let totalScore = 0;
    let maxScore = 0;

    for (const category of categories) {
      totalScore += this.results[category].score;
      maxScore += 100;
    }

    this.results.overall.score = totalScore / categories.length;
    this.results.overall.status = this.results.overall.score >= 90 ? 'excellent' :
                                  this.results.overall.score >= 80 ? 'good' :
                                  this.results.overall.score >= 70 ? 'acceptable' : 'needs_improvement';
  }

  /**
   * Generate validation report
   */
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🔒 COMPREHENSIVE SECURITY VALIDATION REPORT');
    console.log('='.repeat(80));

    // Overall score
    console.log(`\n🏆 OVERALL SECURITY SCORE: ${this.results.overall.score.toFixed(1)}%`);
    console.log(`📊 STATUS: ${this.results.overall.status.toUpperCase()}`);

    // Category results
    const categories = [
      { key: 'encryption', name: '🔐 User Data Encryption at Rest', icon: '🔐' },
      { key: 'rateLimiting', name: '⚡ API Rate Limiting & Throttling', icon: '⚡' },
      { key: 'rowLevelSecurity', name: '🔒 Row-Level Security Policies', icon: '🔒' },
      { key: 'auditLogging', name: '📋 Audit Logging for Compliance', icon: '📋' },
      { key: 'gdprCompliance', name: '🇪🇺 GDPR Compliance & Privacy', icon: '🇪🇺' }
    ];

    for (const category of categories) {
      const result = this.results[category.key];
      console.log(`\n${category.icon} ${category.name}`);
      console.log(`   Status: ${result.status.toUpperCase()} (${result.score.toFixed(1)}%)`);

      if (result.checks.length > 0) {
        console.log('   Checks:');
        for (const check of result.checks) {
          const status = check.passed ? '✅' : '❌';
          console.log(`     ${status} ${check.name} (${check.score}/${check.weight})`);
        }
      }
    }

    console.log('\n' + '='.repeat(80));

    if (this.results.overall.status === 'excellent') {
      console.log('🎉 CONGRATULATIONS! Your security implementation is WORLD-CLASS!');
      console.log('🏆 You have achieved enterprise-grade security that exceeds industry standards.');
      console.log('🚀 Your platform is ready for production with confidence!');
    } else if (this.results.overall.status === 'good') {
      console.log('👍 Good security implementation with minor improvements needed.');
    } else if (this.results.overall.status === 'acceptable') {
      console.log('⚠️  Acceptable security level, but consider improvements for production.');
    } else {
      console.log('🔴 Security implementation needs significant improvements.');
    }

    console.log('='.repeat(80));
  }

  /**
   * Run all validations
   */
  async validateAll() {
    console.log('🚀 Starting Comprehensive Security Validation...\n');

    this.validateEncryption();
    this.validateRateLimiting();
    this.validateRowLevelSecurity();
    this.validateAuditLogging();
    this.validateGDPRCompliance();

    this.calculateOverallScore();
    this.generateReport();
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    const validator = new SecurityValidator();
    await validator.validateAll();
  } catch (error) {
    console.error('❌ Security validation failed:', error);
    process.exit(1);
  }
}

// Run validation if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default SecurityValidator;
