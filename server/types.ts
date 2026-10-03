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
    expiredDays: number; // <= 0 -> CRITICAL
    criticalDays: number; // <= 7 -> CRITICAL
    highDays: number; // <= 14 -> HIGH
    mediumDays: number; // <= 30 -> MEDIUM
    lowDays: number; // <= 90 -> LOW
  };
  cipherPolicy: {
    minimumTlsVersion: string; // e.g. "TLSv1.2"
    prohibitedCiphers: string[]; // ["RC4", "3DES", "DES", "MD5", "EXPORT", "NULL", "CBC"]
    requireForwardSecrecy: boolean;
    minimumKeySizeRsa: number; // 2048
  };
  riskWeights: {
    expiredWeight: number; // 100
    criticalExpiryWeight: number; // 90
    highExpiryWeight: number; // 70
    mediumExpiryWeight: number; // 40
    lowExpiryWeight: number; // 10
    criticalCipherWeight: number; // 100
    weakCipherWeight: number; // 70
    acceptableCipherWeight: number; // 20
    productionMultiplier: number; // 1.3
    stagingMultiplier: number; // 1.0
    developmentMultiplier: number; // 0.8
    sandboxMultiplier: number; // 0.6
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
  validFrom: string; // ISO string
  validUntil: string; // ISO string
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
  tlsVersion: string; // e.g., "TLSv1.3", "TLSv1.2", "TLSv1.0"
  cipherSuite: string; // e.g., "TLS_AES_256_GCM_SHA384"
  cipherStrength: number; // bits (e.g. 256, 128, 56)
  forwardSecrecy: boolean; // PFS enabled
  keyExchange: string; // e.g., "ECDH (X25519)" or "RSA"
  authentication: string; // e.g., "RSA" or "ECDSA"
  encryption: string; // e.g., "AES-256-GCM" or "3DES-EDE-CBC"
  integrity: string; // e.g., "AEAD" or "SHA1"
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
  riskScore: number; // 0 - 100
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

export interface BackgroundJob {
  id: string;
  type: 'ENDPOINT_SCAN' | 'FLEET_SCAN' | 'SIMULATION_APPLY' | 'POLICY_UPDATE';
  target: string;
  status: JobStatus;
  progress: number; // 0-100
  startedAt: string;
  completedAt?: string;
  error?: string;
  details?: string;
}

export interface SimulationScenario {
  id: string;
  endpointId: string;
  targetDaysRemaining?: number;
  targetCipherSuite?: string;
  targetTlsVersion?: string;
  targetEnvironment?: Environment;
  notes?: string;
}
