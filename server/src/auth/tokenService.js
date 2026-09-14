import crypto from 'node:crypto';
import { config } from '../config.js';

const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Sign a stateless token (similar to JWT)
 */
export function signToken(user) {
  const payload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    displayName: user.displayName || user.username,
    exp: Date.now() + TOKEN_EXPIRY_MS,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', config.AUTH_SECRET)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Verify and decode token
 */
export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;

  const expectedSignature = crypto
    .createHmac('sha256', config.AUTH_SECRET)
    .update(payloadB64)
    .digest('base64url');

  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (Date.now() > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch (err) {
    return null;
  }
}
