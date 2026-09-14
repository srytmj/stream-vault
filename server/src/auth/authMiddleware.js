import { config } from '../config.js';
import { verifyToken } from './tokenService.js';
import { getUserById } from './userStore.js';

const PUBLIC_PREFIXES = [
  '/api/health',
  '/api/auth/login',
  '/api/auth/status',
  '/api/auth/providers',
  '/api/auth/oidc/login',
  '/api/auth/oidc/callback',
];

/**
 * Extract auth token from Authorization header, query param, or cookies
 */
export function extractToken(request) {
  // 1. Authorization header: "Bearer <token>"
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  // 2. Query param "?token=<token>" (useful for media streams and image tags)
  if (request.query && request.query.token) {
    return request.query.token;
  }

  // 3. Cookie header "sv_token=<token>"
  const cookieHeader = request.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/sv_token=([^;]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
}

/**
 * Fastify preHandler hook for authentication
 */
export async function authenticate(request, reply) {
  // Pass non-API routes (Vite frontend, static assets)
  if (!request.url.startsWith('/api')) {
    return;
  }

  // Check if auth is disabled in config
  if (!config.AUTH_ENABLED) {
    request.user = { id: 'guest', username: 'guest', role: 'admin' };
    return;
  }

  const cleanPath = request.url.split('?')[0];

  // Allow public endpoints
  if (PUBLIC_PREFIXES.some((prefix) => cleanPath === prefix || cleanPath.startsWith(prefix + '/'))) {
    return;
  }

  // Extract and verify token
  const token = extractToken(request);
  if (!token) {
    return reply.code(401).send({
      error: 'Unauthorized: Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return reply.code(401).send({
      error: 'Unauthorized: Invalid or expired session token',
      code: 'AUTH_EXPIRED',
    });
  }

  const user = getUserById(payload.sub);
  if (!user) {
    return reply.code(401).send({
      error: 'Unauthorized: User account not found',
      code: 'AUTH_USER_NOT_FOUND',
    });
  }

  request.user = {
    id: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    role: user.role,
  };
}
