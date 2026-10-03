import crypto from 'crypto';
import { User, UserRole } from './types.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'certguard_secret_production_key_2026_super_secure';

export interface UserCredential {
  user: User;
  passwordHash: string;
  salt: string;
}

// PBKDF2 password hashing
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Initial salts and hashes for seeded demo users
const adminSalt = 'a1f8e3d92b7c4051';
const analystSalt = 'b9c2e4f71a3d8062';

export const USER_CREDENTIALS: UserCredential[] = [
  {
    user: {
      id: 'usr_admin',
      name: 'Alex Rivera',
      email: 'admin@certguard.sec',
      role: 'Administrator',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80',
    },
    salt: adminSalt,
    passwordHash: hashPassword('Admin@CertGuard2026!', adminSalt),
  },
  {
    user: {
      id: 'usr_analyst',
      name: 'Sarah Chen',
      email: 'analyst@certguard.sec',
      role: 'Security Analyst',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=128&q=80',
    },
    salt: analystSalt,
    passwordHash: hashPassword('Analyst@CertGuard2026!', analystSalt),
  },
];

// Lightweight JWT implementation using Node's native crypto
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf8');
}

export function signJwt(payload: Record<string, any>, expiresInSeconds: number = 86400): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp, iat: Math.floor(Date.now() / 1000) };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyJwt(token: string): { valid: boolean; payload?: any; error?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, error: 'Malformed token' };

    const [headerB64, payloadB64, signatureB64] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (signatureB64 !== expectedSignature) {
      return { valid: false, error: 'Invalid token signature' };
    }

    const payload = JSON.parse(base64UrlDecode(payloadB64));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return { valid: false, error: 'Token expired' };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

export function authenticateUser(email: string, passwordPlain: string): { user: User; token: string } | null {
  const normalizedEmail = email.trim().toLowerCase();
  const cred = USER_CREDENTIALS.find((c) => c.user.email.toLowerCase() === normalizedEmail);
  if (!cred) return null;

  const testHash = hashPassword(passwordPlain, cred.salt);
  if (testHash !== cred.passwordHash) return null;

  const token = signJwt({
    sub: cred.user.id,
    email: cred.user.email,
    role: cred.user.role,
    name: cred.user.name,
  });

  return { user: cred.user, token };
}
