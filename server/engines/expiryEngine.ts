import { CertificateStatus, SecurityPolicy, Severity } from '../types.ts';

export interface ExpiryEvaluation {
  status: CertificateStatus;
  severity: Severity;
  riskPoints: number;
  policyRule: string;
  evidenceText: string;
  daysRemaining: number;
}

export function evaluateExpiry(
  validUntilDate: string | Date,
  policy: SecurityPolicy,
  referenceDate: Date = new Date()
): ExpiryEvaluation {
  const expiry = new Date(validUntilDate);
  const now = referenceDate;
  
  // Calculate day difference
  const diffTime = expiry.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const { expiredDays, criticalDays, highDays, mediumDays, lowDays } = policy.expiryThresholds;
  const weights = policy.riskWeights;

  if (daysRemaining <= expiredDays) {
    return {
      status: 'EXPIRED',
      severity: 'CRITICAL',
      riskPoints: weights.expiredWeight,
      policyRule: `Certificate Expired (≤ ${expiredDays} days) = CRITICAL (+${weights.expiredWeight} pts)`,
      evidenceText: `Certificate expired ${Math.abs(daysRemaining)} days ago on ${expiry.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}. Immediate outage risk active.`,
      daysRemaining,
    };
  }

  if (daysRemaining <= criticalDays) {
    return {
      status: 'CRITICAL',
      severity: 'CRITICAL',
      riskPoints: weights.criticalExpiryWeight,
      policyRule: `Certificate Expiry ≤ ${criticalDays} days = CRITICAL (+${weights.criticalExpiryWeight} pts)`,
      evidenceText: `Only ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remain before certificate expiration (${expiry.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}). Emergency renewal required.`,
      daysRemaining,
    };
  }

  if (daysRemaining <= highDays) {
    return {
      status: 'EXPIRING_SOON',
      severity: 'HIGH',
      riskPoints: weights.highExpiryWeight,
      policyRule: `Certificate Expiry ≤ ${highDays} days = HIGH (+${weights.highExpiryWeight} pts)`,
      evidenceText: `Certificate will expire in ${daysRemaining} days. Approaching critical escalation threshold within ${daysRemaining - criticalDays} days.`,
      daysRemaining,
    };
  }

  if (daysRemaining <= mediumDays) {
    return {
      status: 'EXPIRING_SOON',
      severity: 'MEDIUM',
      riskPoints: weights.mediumExpiryWeight,
      policyRule: `Certificate Expiry ≤ ${mediumDays} days = MEDIUM (+${weights.mediumExpiryWeight} pts)`,
      evidenceText: `Certificate validity window has entered standard rotation cycle (${daysRemaining} days remaining).`,
      daysRemaining,
    };
  }

  if (daysRemaining <= lowDays) {
    return {
      status: 'VALID',
      severity: 'LOW',
      riskPoints: weights.lowExpiryWeight,
      policyRule: `Certificate Expiry ≤ ${lowDays} days = LOW (+${weights.lowExpiryWeight} pts)`,
      evidenceText: `Certificate is valid with ${daysRemaining} days remaining. Scheduled review recommended.`,
      daysRemaining,
    };
  }

  return {
    status: 'VALID',
    severity: 'HEALTHY',
    riskPoints: 0,
    policyRule: `Certificate Expiry > ${lowDays} days = HEALTHY (0 pts)`,
    evidenceText: `Certificate is fully active with ${daysRemaining} days remaining. Well within operational parameters.`,
    daysRemaining,
  };
}
