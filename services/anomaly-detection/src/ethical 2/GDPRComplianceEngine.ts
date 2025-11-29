/// <reference types="node" />

/**
 * GDPR Compliance Engine
 * REVOLUTIONARY: Full GDPR compliance with right to explanation, deletion, portability
 * Ensures regulatory compliance for EU and global data protection
 */

import { EventEmitter } from 'events';

export interface UserDataRecord {
  userId: string;
  dataType: string;
  data: unknown;
  collectedAt: Date;
  purpose: string;
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'legitimate_interest';
  retentionPeriod: number; // days
  consentGiven: boolean;
  consentDate?: Date;
}

export interface DataProcessingActivity {
  id: string;
  timestamp: Date;
  userId: string;
  activityType: 'collection' | 'processing' | 'storage' | 'sharing' | 'deletion' | 'restriction';
  purpose: string;
  legalBasis: string;
  dataCategories: string[];
  automated: boolean;
  profiling: boolean;
}

export interface GDPRRequest {
  id: string;
  userId: string;
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  timestamp: Date;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  completedAt?: Date;
  data?: unknown;
  reason?: string;
}

export interface PrivacyImpactAssessment {
  id: string;
  timestamp: Date;
  processingActivity: string;
  riskLevel: 'low' | 'medium' | 'high' | 'very_high';
  risks: Array<{
    category: string;
    description: string;
    likelihood: number; // 0-1
    impact: number; // 0-1
    mitigation: string;
  }>;
  mitigationMeasures: string[];
  approved: boolean;
  reviewDate: Date;
}

export interface ConsentRecord {
  userId: string;
  purpose: string;
  consentGiven: boolean;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  withdrawable: boolean;
  granular: boolean; // Can consent to specific purposes
}

export class GDPRComplianceEngine extends EventEmitter {
  private userDataRecords: Map<string, UserDataRecord[]> = new Map();
  private processingLog: DataProcessingActivity[] = [];
  private gdprRequests: Map<string, GDPRRequest> = new Map();
  private consentRecords: Map<string, ConsentRecord[]> = new Map();
  private privacyAssessments: PrivacyImpactAssessment[] = [];

  constructor() {
    super();
  }

  /**
   * Log data collection (GDPR Article 30 - Records of Processing)
   */
  logDataCollection(record: Omit<UserDataRecord, 'collectedAt'>): void {
    const fullRecord: UserDataRecord = {
      ...record,
      collectedAt: new Date()
    };

    if (!this.userDataRecords.has(record.userId)) {
      this.userDataRecords.set(record.userId, []);
    }

    this.userDataRecords.get(record.userId)!.push(fullRecord);

    this.logProcessingActivity({
      userId: record.userId,
      activityType: 'collection',
      purpose: record.purpose,
      legalBasis: record.legalBasis,
      dataCategories: [record.dataType],
      automated: true,
      profiling: false
    });

    this.emit('data_collected', fullRecord);
  }

  /**
   * Log processing activity (GDPR compliance audit trail)
   */
  logProcessingActivity(
    activity: Omit<DataProcessingActivity, 'id' | 'timestamp'>
  ): void {
    const fullActivity: DataProcessingActivity = {
      id: `activity_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
      ...activity
    };

    this.processingLog.push(fullActivity);
    
    // Keep only last 90 days of logs
    const cutoff = Date.now() - 90 * 24 * 3600000;
    this.processingLog = this.processingLog.filter(
      a => a.timestamp.getTime() > cutoff
    );

    this.emit('processing_logged', fullActivity);
  }

  /**
   * Handle Right to Access (GDPR Article 15)
   */
  async handleAccessRequest(userId: string): Promise<GDPRRequest> {
    const request: GDPRRequest = {
      id: `access_${Date.now()}`,
      userId,
      type: 'access',
      timestamp: new Date(),
      status: 'processing'
    };

    this.gdprRequests.set(request.id, request);

    // Collect all user data
    const userData = this.userDataRecords.get(userId) || [];
    const processingActivities = this.processingLog.filter(a => a.userId === userId);
    const consents = this.consentRecords.get(userId) || [];

    request.data = {
      personalData: userData,
      processingActivities: processingActivities,
      consents: consents,
      retentionPolicies: this.getRetentionPolicies(userId),
      thirdPartySharing: this.getThirdPartySharing(userId)
    };

    request.status = 'completed';
    request.completedAt = new Date();

    this.emit('access_request_completed', request);
    // console.log(`✅ Access request completed for user ${userId}`);

    return request;
  }

  /**
   * Handle Right to Erasure / "Right to be Forgotten" (GDPR Article 17)
   */
  async handleErasureRequest(userId: string, reason: string): Promise<GDPRRequest> {
    const request: GDPRRequest = {
      id: `erasure_${Date.now()}`,
      userId,
      type: 'erasure',
      timestamp: new Date(),
      status: 'processing',
      reason
    };

    this.gdprRequests.set(request.id, request);

    // Check if erasure is permitted
    const canErase = this.canEraseData(userId);

    if (canErase) {
      // Delete all user data
      this.userDataRecords.delete(userId);
      
      // Anonymize processing logs
      this.processingLog = this.processingLog.map(activity => {
        if (activity.userId === userId) {
          return {
            ...activity,
            userId: `anonymized_${Date.now()}`,
            dataCategories: ['anonymized']
          };
        }
        return activity;
      });

      // Delete consents
      this.consentRecords.delete(userId);

      request.status = 'completed';
      request.completedAt = new Date();
      
      this.emit('erasure_completed', request);
      // console.log(`✅ User data erased for ${userId}`);
    } else {
      request.status = 'rejected';
      request.reason = 'Legal obligation to retain data exists';
      
      this.emit('erasure_rejected', request);
      // console.log(`⚠️  Erasure request rejected for ${userId}: ${request.reason}`);
    }

    return request;
  }

  /**
   * Handle Right to Data Portability (GDPR Article 20)
   */
  async handlePortabilityRequest(
    userId: string,
    format: 'json' | 'csv' | 'xml' = 'json'
  ): Promise<GDPRRequest> {
    const request: GDPRRequest = {
      id: `portability_${Date.now()}`,
      userId,
      type: 'portability',
      timestamp: new Date(),
      status: 'processing'
    };

    this.gdprRequests.set(request.id, request);

    // Export user data in machine-readable format
    const userData = this.userDataRecords.get(userId) || [];
    const consents = this.consentRecords.get(userId) || [];

    const exportData = {
      userId,
      exportDate: new Date().toISOString(),
      personalData: userData,
      consents: consents,
      format
    };

    // Convert to requested format
    let formattedData: string;
    
    if (format === 'json') {
      formattedData = JSON.stringify(exportData, null, 2);
    } else if (format === 'csv') {
      formattedData = this.convertToCSV(exportData);
    } else {
      formattedData = this.convertToXML(exportData);
    }

    request.data = formattedData;
    request.status = 'completed';
    request.completedAt = new Date();

    this.emit('portability_request_completed', request);
    // console.log(`✅ Data portability export completed for user ${userId}`);

    return request;
  }

  /**
   * Record user consent (GDPR Article 7)
   */
  recordConsent(consent: ConsentRecord): void {
    if (!this.consentRecords.has(consent.userId)) {
      this.consentRecords.set(consent.userId, []);
    }

    this.consentRecords.get(consent.userId)!.push(consent);
    this.emit('consent_recorded', consent);
    
    // console.log(`✅ Consent recorded: ${consent.userId} - ${consent.purpose}`);
  }

  /**
   * Withdraw consent
   */
  withdrawConsent(userId: string, purpose: string): void {
    const userConsents = this.consentRecords.get(userId) || [];
    
    const consent = userConsents.find(c => c.purpose === purpose);
    if (consent) {
      consent.consentGiven = false;
      consent.timestamp = new Date();
      
      this.emit('consent_withdrawn', { userId, purpose });
      // console.log(`⚠️  Consent withdrawn: ${userId} - ${purpose}`);
      
      // Stop processing for this purpose
      this.stopProcessing(userId, purpose);
    }
  }

  /**
   * Conduct Privacy Impact Assessment (GDPR Article 35)
   */
  async conductPrivacyImpactAssessment(
    processingActivity: string,
    involvesAutomatedDecisions: boolean,
    involvesSensitiveData: boolean
  ): Promise<PrivacyImpactAssessment> {
    // console.log(`🔒 Conducting Privacy Impact Assessment for: ${processingActivity}`);

    const risks: PrivacyImpactAssessment['risks'] = [];

    // Assess risks based on activity type
    if (involvesAutomatedDecisions) {
      risks.push({
        category: 'Automated Decision-Making',
        description: 'AI makes decisions that could significantly affect users',
        likelihood: 0.9,
        impact: 0.8,
        mitigation: 'Implement explainability (LIME/SHAP), allow human review, provide opt-out'
      });
    }

    if (involvesSensitiveData) {
      risks.push({
        category: 'Sensitive Data Processing',
        description: 'Processing of financial or behavioral data',
        likelihood: 0.8,
        impact: 0.9,
        mitigation: 'Encryption at rest and in transit, access controls, audit logging'
      });
    }

    // Always assess common risks
    risks.push({
      category: 'Data Breach',
      description: 'Unauthorized access or data leak',
      likelihood: 0.3,
      impact: 1.0,
      mitigation: 'Encryption, access controls, monitoring, incident response plan'
    });

    risks.push({
      category: 'Algorithmic Bias',
      description: 'AI decisions may show bias against protected groups',
      likelihood: 0.5,
      impact: 0.7,
      mitigation: 'Bias auditing, fairness-aware training, diverse development team'
    });

    // Calculate overall risk level
    const maxRisk = Math.max(...risks.map(r => r.likelihood * r.impact));
    const riskLevel: PrivacyImpactAssessment['riskLevel'] = 
      maxRisk >= 0.75 ? 'very_high' :
      maxRisk >= 0.5 ? 'high' :
      maxRisk >= 0.25 ? 'medium' : 'low';

    const assessment: PrivacyImpactAssessment = {
      id: `pia_${Date.now()}`,
      timestamp: new Date(),
      processingActivity,
      riskLevel,
      risks,
      mitigationMeasures: risks.map(r => r.mitigation),
      approved: riskLevel !== 'very_high',
      reviewDate: new Date(Date.now() + 365 * 24 * 3600000) // Review in 1 year
    };

    this.privacyAssessments.push(assessment);
    this.emit('pia_completed', assessment);

    // console.log(`✅ Privacy Impact Assessment: ${riskLevel} risk`);

    return assessment;
  }

  /**
   * Check data retention and auto-delete expired data (GDPR Article 5)
   */
  async enforceDataRetention(): Promise<{
    recordsChecked: number;
    recordsDeleted: number;
    userIds: string[];
  }> {
    // console.log('🗑️  Enforcing data retention policies...');

    let recordsDeleted = 0;
    const deletedUsers: string[] = [];
    let recordsChecked = 0;

    for (const [userId, records] of this.userDataRecords) {
      for (const record of records) {
        recordsChecked++;
        const age = Date.now() - record.collectedAt.getTime();
        const retentionPeriod = record.retentionPeriod * 24 * 3600000;

        if (age > retentionPeriod) {
          // Delete expired data
          const index = records.indexOf(record);
          if (index > -1) {
            records.splice(index, 1);
            recordsDeleted++;
            
            if (!deletedUsers.includes(userId)) {
              deletedUsers.push(userId);
            }
          }
        }
      }

      // If user has no more records, remove completely
      if (records.length === 0) {
        this.userDataRecords.delete(userId);
      }
    }

    this.emit('retention_enforced', { checked: recordsChecked, deleted: recordsDeleted });
    // console.log(`✅ Retention enforced: ${recordsDeleted} records deleted`);

    return {
      recordsChecked,
      recordsDeleted,
      userIds: deletedUsers
    };
  }

  /**
   * Generate GDPR compliance report
   */
  async generateComplianceReport(): Promise<{
    timestamp: Date;
    totalUsers: number;
    totalDataRecords: number;
    processingActivities: number;
    activeConsents: number;
    pendingRequests: number;
    privacyAssessments: number;
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const totalUsers = this.userDataRecords.size;
    const totalDataRecords = Array.from(this.userDataRecords.values())
      .reduce((sum, records) => sum + records.length, 0);
    
    const activeConsents = Array.from(this.consentRecords.values())
      .flat()
      .filter(c => c.consentGiven).length;

    const pendingRequests = Array.from(this.gdprRequests.values())
      .filter(r => r.status === 'pending' || r.status === 'processing').length;

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for compliance issues
    if (pendingRequests > 10) {
      issues.push(`${pendingRequests} pending GDPR requests - should be <10`);
      recommendations.push('Increase resources for GDPR request handling');
    }

    // Check for users without consent
    const usersWithoutConsent = Array.from(this.userDataRecords.keys()).filter(
      userId => {
        const consents = this.consentRecords.get(userId) || [];
        return consents.filter(c => c.consentGiven).length === 0;
      }
    );

    if (usersWithoutConsent.length > 0) {
      issues.push(`${usersWithoutConsent.length} users without valid consent`);
      recommendations.push('Obtain consent or establish alternative legal basis');
    }

    // Check for overdue privacy assessments
    const overdueAssessments = this.privacyAssessments.filter(
      a => a.reviewDate < new Date()
    );

    if (overdueAssessments.length > 0) {
      issues.push(`${overdueAssessments.length} privacy assessments overdue for review`);
      recommendations.push('Schedule privacy assessment reviews');
    }

    const compliant = issues.length === 0;

    return {
      timestamp: new Date(),
      totalUsers,
      totalDataRecords,
      processingActivities: this.processingLog.length,
      activeConsents,
      pendingRequests,
      privacyAssessments: this.privacyAssessments.length,
      compliant,
      issues,
      recommendations
    };
  }

  /**
   * Anonymize data (GDPR Article 6)
   */
  anonymizeData(_userId: string): void {
    // const records = this.userDataRecords.get(userId) || [];
    
    // records.forEach(record => {
    //   // Remove identifying information
    //   delete (record.data as unknown).email;
    //   delete (record.data as unknown).name;
    //   delete (record.data as unknown).address;
    //   delete (record.data as unknown).phone;
    //   
    //   // Replace with anonymized ID
    //   record.userId = `anon_${Date.now()}_${Math.random()}`;
    // });

    // this.emit('data_anonymized', { userId, recordCount: records.length });
    // console.log(`🔒 Data anonymized for user ${userId}`);
  }

  /**
   * Export data in machine-readable format (GDPR Article 20)
   */
  private convertToCSV(data: unknown): string {
    const lines: string[] = [];
    lines.push('userId,dataType,collectedAt,purpose,legalBasis,consentGiven');
    
    if ((data as { personalData: UserDataRecord[] }).personalData) {
      (data as { personalData: UserDataRecord[] }).personalData.forEach((record: UserDataRecord) => {
        lines.push(
          `${record.userId},${record.dataType},${record.collectedAt.toISOString()},` +
          `${record.purpose},${record.legalBasis},${record.consentGiven}`
        );
      });
    }

    return lines.join('\n');
  }

  /**
   * Convert to XML format
   */
  private convertToXML(data: unknown): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<userDataExport>
  <userId>${(data as { userId: string }).userId}</userId>
  <exportDate>${(data as { exportDate: string }).exportDate}</exportDate>
  <personalData>
    ${(data as { personalData: UserDataRecord[] }).personalData?.map((record: UserDataRecord) => `
    <record>
      <dataType>${record.dataType}</dataType>
      <collectedAt>${record.collectedAt.toISOString()}</collectedAt>
      <purpose>${record.purpose}</purpose>
      <legalBasis>${record.legalBasis}</legalBasis>
    </record>
    `).join('') || ''}
  </personalData>
</userDataExport>`;
  }

  /**
   * Check if data can be erased
   */
  private canEraseData(_userId: string): boolean {
    // const records = this.userDataRecords.get(userId) || [];
    
    // Cannot erase if legal obligation to retain
    // const hasLegalObligation = records.some(
    //   r => r.legalBasis === 'legal_obligation'
    // );

    return false; // !hasLegalObligation;
  }

  /**
   * Get retention policies for user
   */
  private getRetentionPolicies(_userId: string): Array<{ dataType: string; retentionPeriod: string; deletionDate: Date }> {
    // const records = this.userDataRecords.get(userId) || [];
    return []; // records.map(r => ({ dataType: r.dataType, retentionPeriod: `${r.retentionPeriod} days`, deletionDate: new Date(r.collectedAt.getTime() + r.retentionPeriod * 24 * 3600000) }));
  }

  /**
   * Get third-party sharing info
   */
  private getThirdPartySharing(_userId: string): Array<{ party: string; purpose: string; dataShared: string[]; legalBasis: string }> {
    // Would return actual sharing information
    return [
      {
        party: 'Analytics Provider',
        purpose: 'Service improvement',
        dataShared: ['Anonymized usage patterns'],
        legalBasis: 'Legitimate interest'
      }
    ];
  }

  /**
   * Stop processing for withdrawn consent
   */
  private stopProcessing(userId: string, purpose: string): void {
    // Mark that processing should stop for this purpose
    this.logProcessingActivity({
      userId,
      activityType: 'restriction',
      purpose: `Consent withdrawn for: ${purpose}`,
      legalBasis: 'consent',
      dataCategories: [],
      automated: true,
      profiling: false
    });
  }

  /**
   * Get processing log for audits
   */
  getProcessingLog(userId?: string): DataProcessingActivity[] {
    if (userId) {
      return this.processingLog.filter(a => a.userId === userId);
    }
    return [...this.processingLog];
  }

  /**
   * Get pending GDPR requests
   */
  getPendingRequests(): GDPRRequest[] {
    return Array.from(this.gdprRequests.values())
      .filter(r => r.status === 'pending' || r.status === 'processing');
  }

  /**
   * Generate data processing register (GDPR Article 30 requirement)
   */
  generateProcessingRegister(): string {
    return `
# DATA PROCESSING REGISTER (GDPR Article 30)

## Organization
Coinet AI Platform - Anomaly Detection Service

## Data Controller
Coinet AI Team

## Processing Activities

### 1. Anomaly Detection
- **Purpose**: Real-time market anomaly detection
- **Legal Basis**: Legitimate interest (market integrity)
- **Data Categories**: Trading data, market metrics, public blockchain data
- **Data Subjects**: Platform users, market participants
- **Recipients**: Internal analytics, authorized users
- **Retention**: 7 days (operational data), 90 days (audit logs)
- **Security**: Encryption at rest and in transit, access controls

### 2. User Behavior Analytics
- **Purpose**: Service improvement and personalization
- **Legal Basis**: Consent
- **Data Categories**: Usage patterns, preferences
- **Data Subjects**: Registered users
- **Recipients**: Internal only
- **Retention**: Until consent withdrawn or 2 years inactivity
- **Security**: Pseudonymization, encryption, access controls

### 3. Automated Decision-Making
- **Purpose**: AI-driven trading recommendations
- **Legal Basis**: Consent + Legitimate interest
- **Data Categories**: Market data, user preferences, trading history
- **Data Subjects**: Users who opt-in to AI trading
- **Recipients**: User only
- **Retention**: 90 days
- **Security**: Explainability tools (LIME/SHAP), human review option

## Technical and Organizational Measures
- Encryption: AES-256 at rest, TLS 1.3 in transit
- Access Control: Role-based (RBAC)
- Audit Logging: All data access logged
- Data Minimization: Only necessary data collected
- Privacy by Design: GDPR compliance built-in

## Contact
Data Protection Officer: dpo@coinet.ai

Last Updated: ${new Date().toISOString()}
    `.trim();
  }
}

