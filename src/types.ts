export type Environment = 'Production' | 'Staging' | 'Development' | 'Sandbox';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'HEALTHY';
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';
export type CertificateStatus = 'VALID' | 'EXPIRING_SOON' | 'CRITICAL' | 'EXPIRED' | 'REVOKED';
export type CipherStatus = 'STRONG' | 'ACCEPTABLE' | 'WEAK' | 'CRITICAL' | 'UNKNOWN';
export type FindingStatus = 'Open' | 'Acknowledged' | 'In Progress' | 'Resolved' | 'Ignored';
export type AlertStatus = 'Open' | 'Acknowledged' | 'Resolved';
export type JobStatus = 'Queued' | 'Running' | 'Completed' | 'Failed';
export type UserRole = 'Administrator' | 'Security Analyst';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface SecurityPolicy {
  expiryThresholds: {
    expiredDays: number;
    criticalDays: number;
    highDays: number;
    mediumDays: number;
    lowDays: number;
  };
  cipherPolicy: {
    minimumTlsVersion: string;
    prohibitedCiphers: string[];
    requireForwardSecrecy: boolean;
    minimumKeySizeRsa: number;
  };
  riskWeights: {
    expiredWeight: number;
    criticalExpiryWeight: number;
    highExpiryWeight: number;
    mediumExpiryWeight: number;
    lowExpiryWeight: number;
    criticalCipherWeight: number;
    weakCipherWeight: number;
    acceptableCipherWeight: number;
    productionMultiplier: number;
    stagingMultiplier: number;
    developmentMultiplier: number;
    sandboxMultiplier: number;
  };
}

export interface CertificateInfo {
  subject: string;
  commonName: string;
  sans: string[];
  issuer: string;
  issuerOrg: string;
  serialNumber: string;
  fingerprintSha256: string;
  signatureAlgorithm: string;
  publicKeyAlgorithm: string;
  keySize: number;
  validFrom: string;
  validUntil: string;
  daysRemaining: number;
  status: CertificateStatus;
  isSelfSigned: boolean;
  ocspStapling: boolean;
  transparencyLogs: boolean;
  chain: Array<{
    level: 'Root' | 'Intermediate' | 'Leaf';
    name: string;
    issuer: string;
    validUntil: string;
    status: 'VALID' | 'WARNING' | 'EXPIRED';
  }>;
}

export interface CipherObservation {
  tlsVersion: string;
  cipherSuite: string;
  cipherStrength: number;
  forwardSecrecy: boolean;
  keyExchange: string;
  authentication: string;
  encryption: string;
  integrity: string;
  status: CipherStatus;
  matchedRule: string;
  explanation: string;
}

export interface ContributingFactor {
  title: string;
  points: number;
  category: 'EXPIRY' | 'CIPHER' | 'ENVIRONMENT' | 'KEY_STRENGTH';
  detail: string;
}

export interface RiskAssessment {
  riskScore: number;
  severity: Severity;
  priority: Priority;
  priorityReason: string;
  contributingFactors: ContributingFactor[];
  summary: string;
  calculatedAt: string;
}

export interface LifecycleEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'ISSUED' | 'MONITORED' | 'WARNING' | 'CRITICAL' | 'EXPIRED' | 'RENEWED' | 'CONFIG_CHANGED';
}

export interface Endpoint {
  id: string;
  hostname: string;
  port: number;
  protocol: 'https' | 'tls' | 'smtps' | 'imaps';
  environment: Environment;
  owner: string;
  businessService: string;
  description: string;
  monitoringEnabled: boolean;
  isSandbox: boolean;
  authorizedConfirmed: boolean;
  lastChecked: string;
  certificate: CertificateInfo;
  cipher: CipherObservation;
  risk: RiskAssessment;
  lifecycle: LifecycleEvent[];
}

export interface Finding {
  id: string;
  endpointId: string;
  hostname: string;
  environment: Environment;
  findingType: 'CERTIFICATE_EXPIRY' | 'WEAK_CIPHER' | 'DEPRECATED_TLS' | 'SHORT_KEY_LENGTH' | 'CHAIN_INVALID';
  title: string;
  severity: Severity;
  riskScore: number;
  priority: Priority;
  detectedAt: string;
  status: FindingStatus;
  assignedTo?: string;
  evidence: {
    observedValue: string;
    policyThreshold: string;
    riskContribution: number;
    explanation: string;
    rawDetails: Record<string, any>;
  };
  recommendation: {
    title: string;
    summary: string;
    actionSteps: string[];
    remediationCommand?: string;
  };
  statusHistory: Array<{
    status: FindingStatus;
    timestamp: string;
    user: string;
    note?: string;
  }>;
}

export interface Alert {
  id: string;
  findingId?: string;
  endpointId: string;
  hostname: string;
  environment: Environment;
  severity: Severity;
  title: string;
  message: string;
  triggeredAt: string;
  status: AlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  channel: 'IN_APP' | 'EMAIL_DIGEST' | 'WEBHOOK';
}

export interface RecommendationItem {
  id: string;
  endpointId: string;
  hostname: string;
  environment: Environment;
  priority: Priority;
  severity: Severity;
  category: 'Immediate Actions' | 'Upcoming Actions' | 'Configuration Improvements' | 'Resolved Actions';
  issue: string;
  recommendation: string;
  steps: string[];
  commandSnippet?: string;
  status: 'Pending' | 'Applied' | 'In Progress';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  userRole: UserRole;
  action: string;
  target: string;
  targetId?: string;
  previousValue?: string;
  newValue?: string;
  ipAddress: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
}

export interface DashboardSummary {
  totalEndpoints: number;
  healthy: number;
  expiringSoon: number;
  expired: number;
  criticalFindings: number;
  highFindings: number;
  weakCipherFindings: number;
  openAlerts: number;
}

export interface DashboardCharts {
  riskDistribution: Array<{ name: string; value: number; color: string }>;
  expiryTimeline: Array<{ bucket: string; count: number }>;
  cipherDistribution: Array<{ name: string; count: number; fill: string }>;
  topRiskyEndpoints: Array<{
    id: string;
    hostname: string;
    environment: Environment;
    daysRemaining: number;
    cipherStatus: CipherStatus;
    riskScore: number;
    severity: Severity;
    priority: Priority;
  }>;
  findingsTimeline: Array<{
    date: string;
    critical: number;
    high: number;
    medium: number;
  }>;
}

export interface BackgroundJob {
  id: string;
  type: string;
  target: string;
  status: JobStatus;
  progress: number;
  startedAt: string;
  completedAt?: string;
  details?: string;
  error?: string;
}
