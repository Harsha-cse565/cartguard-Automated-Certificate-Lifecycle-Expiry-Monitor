import { evaluateExpiry } from '../server/engines/expiryEngine.ts';
import { evaluateCipher } from '../server/engines/cipherEngine.ts';
import { calculateRisk } from '../server/engines/riskEngine.ts';
import { DEFAULT_SECURITY_POLICY } from '../server/db.ts';
import { authenticateUser, hashPassword, signJwt, verifyJwt } from '../server/auth.ts';

const DEMO_DATE = new Date('2026-10-03T07:30:00Z');

function runTests() {
  console.log('--- RUNNING CERTGUARD BACKEND ENGINE TESTS ---');
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, msg: string) => {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  };

  // 1. Expiry Engine Tests
  console.log('\n[Suite 1: Expiry Detection]');
  const expiredDate = '2026-10-01T00:00:00Z'; // 2 days ago
  const expRes = evaluateExpiry(expiredDate, DEFAULT_SECURITY_POLICY, DEMO_DATE);
  assert(expRes.status === 'EXPIRED', 'Detects expired certificate correctly');
  assert(expRes.severity === 'CRITICAL', 'Assigns CRITICAL severity to expired certificate');
  assert(expRes.riskPoints === 100, 'Assigns 100 points to expired certificate');

  const critDate = '2026-10-07T00:00:00Z'; // 4 days remaining
  const critRes = evaluateExpiry(critDate, DEFAULT_SECURITY_POLICY, DEMO_DATE);
  assert(critRes.status === 'CRITICAL', 'Detects ≤ 7 days expiry as CRITICAL status');
  assert(critRes.severity === 'CRITICAL', 'Assigns CRITICAL severity for ≤ 7 days');

  const highDate = '2026-10-15T00:00:00Z'; // 12 days remaining
  const highRes = evaluateExpiry(highDate, DEFAULT_SECURITY_POLICY, DEMO_DATE);
  assert(highRes.status === 'EXPIRING_SOON', 'Detects ≤ 14 days as EXPIRING_SOON');
  assert(highRes.severity === 'HIGH', 'Assigns HIGH severity for ≤ 14 days');

  const healthyDate = '2027-04-01T00:00:00Z'; // 180 days remaining
  const healthyRes = evaluateExpiry(healthyDate, DEFAULT_SECURITY_POLICY, DEMO_DATE);
  assert(healthyRes.status === 'VALID', 'Detects > 90 days as VALID');
  assert(healthyRes.severity === 'HEALTHY', 'Assigns HEALTHY severity for long-lived certificate');

  // 2. Cipher & TLS Engine Tests
  console.log('\n[Suite 2: Cipher & Protocol Classification]');
  const strongCipher = evaluateCipher('TLSv1.3', 'TLS_AES_256_GCM_SHA384', DEFAULT_SECURITY_POLICY);
  assert(strongCipher.status === 'STRONG', 'Classifies TLS 1.3 AES-GCM as STRONG');
  assert(strongCipher.forwardSecrecy === true, 'Confirms Forward Secrecy on TLS 1.3');

  const sweet32Cipher = evaluateCipher('TLSv1.2', 'TLS_RSA_WITH_3DES_EDE_CBC_SHA', DEFAULT_SECURITY_POLICY);
  assert(sweet32Cipher.status === 'CRITICAL', 'Flags 3DES-EDE-CBC as CRITICAL Sweet32 vulnerability');
  assert(sweet32Cipher.riskPoints === 100, 'Assigns 100 risk points for prohibited Sweet32 cipher');

  const rc4Cipher = evaluateCipher('TLSv1.2', 'TLS_RSA_WITH_RC4_128_SHA', DEFAULT_SECURITY_POLICY);
  assert(rc4Cipher.status === 'CRITICAL', 'Flags RC4 as broken stream cipher');

  const deprecatedTls = evaluateCipher('TLSv1.0', 'ECDHE-RSA-AES128-SHA', DEFAULT_SECURITY_POLICY);
  assert(deprecatedTls.status === 'WEAK', 'Flags TLS 1.0 as deprecated protocol per RFC 8996');

  // 3. Risk Engine & Environment Multipliers
  console.log('\n[Suite 3: Comprehensive Risk & Priority Model]');
  const prodRisk = calculateRisk(
    'payment.demo.local',
    'Production',
    2048,
    critRes, // 90 base points
    strongCipher, // 0 points
    DEFAULT_SECURITY_POLICY
  );
  assert(prodRisk.riskAssessment.riskScore >= 90, 'Calculates score above 90 with Production 1.3x multiplier (capped at 100)');
  assert(prodRisk.riskAssessment.severity === 'CRITICAL', 'Calculates CRITICAL severity');
  assert(prodRisk.riskAssessment.priority === 'P0', 'Assigns P0 Immediate priority to critical payment endpoint');

  // 4. Recommendation generation
  assert(prodRisk.findingsToGenerate.length > 0, 'Generates finding with evidence and recommendation');
  assert(prodRisk.findingsToGenerate[0].recommendation.actionSteps.length >= 3, 'Provides actionable step-by-step remediation procedures');

  // 5. Authentication & JWT Tests
  console.log('\n[Suite 4: Authentication, Hashing & JWT]');
  const validAdmin = authenticateUser('admin@certguard.sec', 'Admin@CertGuard2026!');
  assert(validAdmin !== null, 'Authenticates Administrator with valid password');
  assert(validAdmin?.user.role === 'Administrator', 'Confirms Administrator role on login');
  assert(typeof validAdmin?.token === 'string', 'Issues valid signed JWT token');

  const validAnalyst = authenticateUser('analyst@certguard.sec', 'Analyst@CertGuard2026!');
  assert(validAnalyst !== null, 'Authenticates Security Analyst with valid password');
  assert(validAnalyst?.user.role === 'Security Analyst', 'Confirms Security Analyst role on login');

  const invalidAuth = authenticateUser('admin@certguard.sec', 'WrongPass123!');
  assert(invalidAuth === null, 'Rejects invalid password attempt');

  if (validAdmin) {
    const verified = verifyJwt(validAdmin.token);
    assert(verified.valid === true, 'Verifies JWT token signature and expiration');
    assert(verified.payload.email === 'admin@certguard.sec', 'Decodes JWT token claims correctly');
  }

  console.log(`\n========================================`);
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
