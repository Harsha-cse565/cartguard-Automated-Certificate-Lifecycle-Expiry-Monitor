import { ContributingFactor, Environment, Priority, RiskAssessment, SecurityPolicy, Severity } from '../types.ts';
import { ExpiryEvaluation } from './expiryEngine.ts';
import { CipherEvaluation } from './cipherEngine.ts';

export interface ComprehensiveRiskResult {
  riskAssessment: RiskAssessment;
  findingsToGenerate: Array<{
    type: 'CERTIFICATE_EXPIRY' | 'WEAK_CIPHER' | 'DEPRECATED_TLS' | 'SHORT_KEY_LENGTH';
    title: string;
    severity: Severity;
    riskScore: number;
    priority: Priority;
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
  }>;
}

export function calculateRisk(
  hostname: string,
  environment: Environment,
  keySize: number,
  expiryEval: ExpiryEvaluation,
  cipherEval: CipherEvaluation,
  policy: SecurityPolicy
): ComprehensiveRiskResult {
  const contributingFactors: ContributingFactor[] = [];
  let baseScore = 0;

  // 1. Expiry Contribution
  if (expiryEval.riskPoints > 0) {
    baseScore += expiryEval.riskPoints;
    contributingFactors.push({
      title: `Certificate Expiry: ${expiryEval.daysRemaining <= 0 ? 'Expired' : `${expiryEval.daysRemaining} days remaining`}`,
      points: expiryEval.riskPoints,
      category: 'EXPIRY',
      detail: expiryEval.policyRule,
    });
  }

  // 2. Cipher / TLS Contribution
  if (cipherEval.riskPoints > 0) {
    baseScore += cipherEval.riskPoints;
    contributingFactors.push({
      title: `TLS / Cipher: ${cipherEval.matchedRule.split(':')[0]}`,
      points: cipherEval.riskPoints,
      category: 'CIPHER',
      detail: cipherEval.matchedRule,
    });
  }

  // 3. Key Size Check
  if (keySize > 0 && keySize < policy.cipherPolicy.minimumKeySizeRsa) {
    const keyPoints = 60;
    baseScore += keyPoints;
    contributingFactors.push({
      title: `Weak RSA Key Length (${keySize} bits < ${policy.cipherPolicy.minimumKeySizeRsa} bits)`,
      points: keyPoints,
      category: 'KEY_STRENGTH',
      detail: `RSA keys below 2048 bits fail cryptographic standards (NIST SP 800-57) due to vulnerability to factorization attacks.`,
    });
  }

  // 4. Environment Multiplier
  let envMultiplier = 1.0;
  if (environment === 'Production') {
    envMultiplier = policy.riskWeights.productionMultiplier;
  } else if (environment === 'Staging') {
    envMultiplier = policy.riskWeights.stagingMultiplier;
  } else if (environment === 'Development') {
    envMultiplier = policy.riskWeights.developmentMultiplier;
  } else if (environment === 'Sandbox') {
    envMultiplier = policy.riskWeights.sandboxMultiplier;
  }

  let finalScore = Math.round(baseScore * envMultiplier);
  // Cap at 100 max
  finalScore = Math.min(100, Math.max(0, finalScore));

  if (envMultiplier !== 1.0 && baseScore > 0) {
    contributingFactors.push({
      title: `${environment} Environment Multiplier (${envMultiplier}x)`,
      points: finalScore - baseScore,
      category: 'ENVIRONMENT',
      detail: `Risk weighted by business impact of ${environment} environment tier.`,
    });
  }

  // Determine Severity
  let severity: Severity = 'HEALTHY';
  if (finalScore >= 80 || expiryEval.status === 'EXPIRED' || expiryEval.status === 'CRITICAL' || cipherEval.status === 'CRITICAL') {
    severity = 'CRITICAL';
  } else if (finalScore >= 60 || expiryEval.severity === 'HIGH' || cipherEval.severity === 'HIGH') {
    severity = 'HIGH';
  } else if (finalScore >= 35) {
    severity = 'MEDIUM';
  } else if (finalScore > 0) {
    severity = 'LOW';
  }

  // Determine Priority
  let priority: Priority = 'P3';
  let priorityReason = 'Standard operational posture; no immediate risks identified.';

  if (expiryEval.status === 'EXPIRED') {
    priority = 'P0';
    priorityReason = `Certificate is EXPIRED in ${environment}. Traffic encountering SSL_ERROR_EXPIRED_CERTIFICATE causing immediate service disruption.`;
  } else if (expiryEval.daysRemaining <= policy.expiryThresholds.criticalDays && (environment === 'Production' || environment === 'Staging')) {
    priority = 'P0';
    priorityReason = `Certificate expires within ${expiryEval.daysRemaining} days on a critical ${environment} endpoint. Emergency renewal required before SLA breach.`;
  } else if (cipherEval.status === 'CRITICAL' && environment === 'Production') {
    priority = 'P0';
    priorityReason = `Observed cipher configuration contains severe active vulnerabilities in Production environment.`;
  } else if (expiryEval.daysRemaining <= policy.expiryThresholds.highDays || cipherEval.severity === 'HIGH') {
    priority = 'P1';
    priorityReason = `Urgent renewal or cryptographic remediation required within standard escalation cycle.`;
  } else if (expiryEval.daysRemaining <= policy.expiryThresholds.mediumDays || cipherEval.status === 'ACCEPTABLE') {
    priority = 'P2';
    priorityReason = `Planned routine maintenance: certificate expires in ${expiryEval.daysRemaining} days or cipher suite requires scheduled hardening.`;
  }

  const findingsToGenerate: ComprehensiveRiskResult['findingsToGenerate'] = [];

  // Finding 1: Expiry
  if (expiryEval.severity !== 'HEALTHY') {
    findingsToGenerate.push({
      type: 'CERTIFICATE_EXPIRY',
      title: expiryEval.status === 'EXPIRED' ? `Certificate Expired on ${hostname}` : `Certificate Expiring Soon (${expiryEval.daysRemaining} days remaining)`,
      severity: expiryEval.severity,
      riskScore: finalScore,
      priority,
      evidence: {
        observedValue: `${expiryEval.daysRemaining <= 0 ? 'Expired' : `${expiryEval.daysRemaining} days`} until expiry`,
        policyThreshold: `≤ ${expiryEval.severity === 'CRITICAL' ? policy.expiryThresholds.criticalDays : policy.expiryThresholds.highDays} days`,
        riskContribution: expiryEval.riskPoints,
        explanation: expiryEval.evidenceText,
        rawDetails: {
          daysRemaining: expiryEval.daysRemaining,
          policyRule: expiryEval.policyRule,
          environment,
          multiplier: envMultiplier,
        },
      },
      recommendation: {
        title: expiryEval.status === 'EXPIRED' ? 'Immediate Emergency Certificate Re-issuance' : 'Automate TLS Certificate Renewal',
        summary: expiryEval.status === 'EXPIRED'
          ? 'Certificate has expired. Request and install a new X.509 certificate immediately to restore secure client connections.'
          : `Renew certificate before the ${expiryEval.daysRemaining}-day grace window closes. Verify automated ACME/Certbot renewal pipelines.`,
        actionSteps: [
          'Verify DNS authorization and CAA records for domain',
          'Execute certificate renewal via ACME / Let\'s Encrypt / AWS Certificate Manager',
          'Deploy new leaf and intermediate chain to ingress reverse proxy',
          'Validate OCSP stapling and reload TLS terminator (nginx/haproxy/traefik)',
        ],
        remediationCommand: `certbot renew --cert-name ${hostname} --dry-run && systemctl reload nginx`,
      },
    });
  }

  // Finding 2: Cipher / Protocol
  if (cipherEval.severity !== 'HEALTHY') {
    const isTls = cipherEval.matchedRule.includes('Deprecated Protocol');
    findingsToGenerate.push({
      type: isTls ? 'DEPRECATED_TLS' : 'WEAK_CIPHER',
      title: isTls ? `Deprecated TLS Protocol Detected (${cipherEval.matchedRule.split(':')[1]?.trim() || 'TLS 1.0/1.1'})` : `Weak Cipher Suite Configuration (${cipherEval.matchedRule.split(':')[0]})`,
      severity: cipherEval.severity,
      riskScore: finalScore,
      priority: priority === 'P0' ? 'P0' : 'P1',
      evidence: {
        observedValue: `${cipherEval.matchedRule}`,
        policyThreshold: `Enforce TLS 1.2+ and AEAD Cipher Suites (PFS enabled)`,
        riskContribution: cipherEval.riskPoints,
        explanation: cipherEval.explanation,
        rawDetails: {
          forwardSecrecy: cipherEval.forwardSecrecy,
          cipherStrength: cipherEval.cipherStrength,
          encryption: cipherEval.encryption,
          policy: policy.cipherPolicy,
        },
      },
      recommendation: {
        title: 'Modernize TLS Server Configuration and Disable Insecure Ciphers',
        summary: 'Update the server TLS cipher suite configuration to disable legacy CBC/3DES/RC4 suites and enforce TLSv1.2 and TLSv1.3 with Ephemeral Diffie-Hellman (PFS).',
        actionSteps: [
          'Update web server or load balancer SSL protocol directive to "TLSv1.2 TLSv1.3"',
          'Configure modern cipher suite list: ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384',
          'Enforce server cipher order (ssl_prefer_server_ciphers on)',
          'Test configuration with SSL Labs / testssl.sh prior to production cutover',
        ],
        remediationCommand: `ssl_protocols TLSv1.2 TLSv1.3;\nssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';\nssl_prefer_server_ciphers on;`,
      },
    });
  }

  const riskAssessment: RiskAssessment = {
    riskScore: finalScore,
    severity,
    priority,
    priorityReason,
    contributingFactors,
    summary:
      finalScore === 0
        ? 'Endpoint complies with all security policies. Certificate and cipher suites are healthy.'
        : `Overall Risk Score ${finalScore}/100 (${severity}). Primary drivers: ${contributingFactors.map((f) => f.title).join('; ')}.`,
    calculatedAt: new Date().toISOString(),
  };

  return {
    riskAssessment,
    findingsToGenerate,
  };
}
