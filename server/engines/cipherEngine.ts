import { CipherObservation, CipherStatus, SecurityPolicy, Severity } from '../types.ts';

export interface CipherEvaluation {
  status: CipherStatus;
  severity: Severity;
  riskPoints: number;
  matchedRule: string;
  explanation: string;
  forwardSecrecy: boolean;
  cipherStrength: number;
  keyExchange: string;
  authentication: string;
  encryption: string;
  integrity: string;
}

export function evaluateCipher(
  tlsVersion: string,
  cipherSuite: string,
  policy: SecurityPolicy
): CipherEvaluation {
  const normalizedCipher = cipherSuite.toUpperCase();
  const normalizedTls = tlsVersion.toUpperCase();
  const weights = policy.riskWeights;

  // Extract cipher components
  let forwardSecrecy = false;
  let keyExchange = 'RSA';
  let authentication = 'RSA';
  let encryption = 'AES-128-CBC';
  let integrity = 'SHA256';
  let cipherStrength = 128;

  if (normalizedCipher.includes('ECDHE') || normalizedCipher.includes('DHE') || normalizedTls === 'TLSV1.3') {
    forwardSecrecy = true;
    keyExchange = normalizedCipher.includes('ECDHE') || normalizedTls === 'TLSV1.3' ? 'ECDH (X25519)' : 'DHE (Diffie-Hellman)';
  } else {
    forwardSecrecy = false;
    keyExchange = 'Static RSA (No Forward Secrecy)';
  }

  if (normalizedCipher.includes('ECDSA')) {
    authentication = 'ECDSA (Elliptic Curve)';
  } else if (normalizedCipher.includes('RSA')) {
    authentication = 'RSA';
  }

  if (normalizedCipher.includes('256')) {
    cipherStrength = 256;
  } else if (normalizedCipher.includes('128')) {
    cipherStrength = 128;
  } else if (normalizedCipher.includes('3DES') || normalizedCipher.includes('DES-EDE3')) {
    cipherStrength = 112; // effective 112-bit
  } else if (normalizedCipher.includes('RC4')) {
    cipherStrength = 128; // broken RC4
  } else if (normalizedCipher.includes('DES') || normalizedCipher.includes('56')) {
    cipherStrength = 56;
  }

  if (normalizedCipher.includes('GCM')) {
    encryption = cipherStrength === 256 ? 'AES-256-GCM (AEAD)' : 'AES-128-GCM (AEAD)';
    integrity = 'AEAD';
  } else if (normalizedCipher.includes('CHACHA20')) {
    encryption = 'CHACHA20-POLY1305 (AEAD)';
    integrity = 'AEAD';
    cipherStrength = 256;
  } else if (normalizedCipher.includes('3DES') || normalizedCipher.includes('DES-CBC3')) {
    encryption = '3DES-EDE-CBC (Sweet32 Vulnerable)';
    integrity = 'SHA1';
  } else if (normalizedCipher.includes('RC4')) {
    encryption = 'RC4 Stream Cipher (Broken)';
    integrity = 'MD5 / SHA1';
  } else if (normalizedCipher.includes('CBC')) {
    encryption = cipherStrength === 256 ? 'AES-256-CBC' : 'AES-128-CBC';
    integrity = normalizedCipher.includes('SHA384') ? 'SHA384' : normalizedCipher.includes('SHA256') ? 'SHA256' : 'SHA1';
  }

  // Check critical cipher vulnerabilities
  const isDeprecatedTls = normalizedTls === 'SSLV3' || normalizedTls === 'TLSV1.0' || normalizedTls === 'TLSV1.1';
  const hasSweet32orRC4 = normalizedCipher.includes('RC4') || normalizedCipher.includes('3DES') || normalizedCipher.includes('DES-EDE3') || normalizedCipher.includes('NULL') || normalizedCipher.includes('EXPORT');

  if (hasSweet32orRC4 || normalizedTls === 'SSLV3') {
    return {
      status: 'CRITICAL',
      severity: 'CRITICAL',
      riskPoints: weights.criticalCipherWeight,
      matchedRule: `Critical Cipher Violation: Prohibited cipher suite detected (${normalizedCipher}) or obsolete SSLv3`,
      explanation: `Observed cipher suite contains known broken cryptography (e.g., Sweet32 CVE-2016-2183 or RC4 stream bias CVE-2015-2808). Immediate vulnerability to plaintext recovery attacks.`,
      forwardSecrecy,
      cipherStrength,
      keyExchange,
      authentication,
      encryption,
      integrity,
    };
  }

  if (isDeprecatedTls) {
    return {
      status: 'WEAK',
      severity: 'HIGH',
      riskPoints: weights.weakCipherWeight,
      matchedRule: `Deprecated Protocol: Protocol ${normalizedTls} is below minimum allowed (${policy.cipherPolicy.minimumTlsVersion})`,
      explanation: `TLS 1.0 and TLS 1.1 are officially deprecated by IETF RFC 8996 and fail PCI-DSS 4.0 / NIST compliance due to known protocol weaknesses (BEAST, POODLE, Lucky13).`,
      forwardSecrecy,
      cipherStrength,
      keyExchange,
      authentication,
      encryption,
      integrity,
    };
  }

  if (policy.cipherPolicy.requireForwardSecrecy && !forwardSecrecy) {
    return {
      status: 'WEAK',
      severity: 'HIGH',
      riskPoints: weights.weakCipherWeight,
      matchedRule: `Policy Violation: Forward Secrecy required, but static RSA key exchange observed (${cipherSuite})`,
      explanation: `Without Perfect Forward Secrecy (PFS), an adversary who records encrypted traffic today can decrypt all historical communications if the private key is later compromised.`,
      forwardSecrecy,
      cipherStrength,
      keyExchange,
      authentication,
      encryption,
      integrity,
    };
  }

  if (normalizedCipher.includes('CBC') || normalizedCipher.includes('SHA1')) {
    return {
      status: 'ACCEPTABLE',
      severity: 'MEDIUM',
      riskPoints: weights.acceptableCipherWeight,
      matchedRule: `Legacy Mode: Cipher uses CBC mode or SHA-1 MAC in place of AEAD (GCM/CHACHA20)`,
      explanation: `CBC mode ciphers in TLS 1.2 are susceptible to timing attacks if not padded precisely. Upgrade to AEAD cipher suites (AES-GCM or ChaCha20-Poly1305) is recommended.`,
      forwardSecrecy,
      cipherStrength,
      keyExchange,
      authentication,
      encryption,
      integrity,
    };
  }

  // Strong Modern Configuration
  return {
    status: 'STRONG',
    severity: 'HEALTHY',
    riskPoints: 0,
    matchedRule: `Modern Cryptographic Profile: ${normalizedTls} with ${cipherSuite} satisfies modern NIST SP 800-52r2 standards`,
    explanation: `Configuration utilizes forward secret key exchange (ECDHE/X25519) and authenticated encryption (AEAD). Exceeds baseline enterprise security posture.`,
    forwardSecrecy,
    cipherStrength,
    keyExchange,
    authentication,
    encryption,
    integrity,
  };
}
