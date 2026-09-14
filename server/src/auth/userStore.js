import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';

const USERS_FILE = path.join(config.DATA_DIR, 'users.json');

function ensureDataDir() {
  if (!fs.existsSync(config.DATA_DIR)) {
    fs.mkdirSync(config.DATA_DIR, { recursive: true });
  }
}

/**
 * Hash password securely using Node.js crypto.scrypt
 */
export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify password against stored hash (salt:hash)
 */
export function verifyPassword(password, storedCombined) {
  if (!storedCombined || !storedCombined.includes(':')) return false;
  const [salt, originalHash] = storedCombined.split(':');
  const checkHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(checkHash, 'hex'), Buffer.from(originalHash, 'hex'));
}

/**
 * Read all users from data/users.json
 */
export function readUsers() {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading users.json:', err.message);
    return [];
  }
}

/**
 * Write users to data/users.json
 */
export function writeUsers(users) {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

/**
 * Initialize default admin account if no users exist
 */
export function initDefaultUsers() {
  const users = readUsers();
  if (users.length === 0) {
    const defaultAdmin = {
      id: crypto.randomUUID(),
      username: 'admin',
      passwordHash: hashPassword('admin'),
      role: 'admin',
      authProvider: 'local',
      displayName: 'Administrator',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    users.push(defaultAdmin);
    writeUsers(users);
    console.log('[Auth] Initialized default admin account (admin / admin)');
  }
}

/**
 * Find user by username
 */
export function getUserByUsername(username) {
  const users = readUsers();
  return users.find((u) => u.username.toLowerCase() === (username || '').toLowerCase()) || null;
}

/**
 * Find user by ID
 */
export function getUserById(id) {
  const users = readUsers();
  return users.find((u) => u.id === id) || null;
}

/**
 * Create or link an OIDC user
 */
export function findOrCreateOidcUser({ sub, email, name, preferred_username }) {
  const users = readUsers();
  const username = preferred_username || (email ? email.split('@')[0] : `user_${sub.slice(0, 8)}`);

  let user = users.find((u) => u.oidcSub === sub || u.username.toLowerCase() === username.toLowerCase());

  if (!user) {
    user = {
      id: crypto.randomUUID(),
      username,
      displayName: name || username,
      email: email || '',
      role: users.length === 0 ? 'admin' : 'user',
      authProvider: 'oidc',
      oidcSub: sub,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    users.push(user);
    writeUsers(users);
  } else if (!user.oidcSub) {
    // Link existing user to OIDC
    user.oidcSub = sub;
    user.authProvider = 'oidc';
    user.updatedAt = new Date().toISOString();
    writeUsers(users);
  }

  return user;
}

/**
 * Update user password
 */
export function updateUserPassword(userId, newPassword) {
  const users = readUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) return false;

  users[index].passwordHash = hashPassword(newPassword);
  users[index].updatedAt = new Date().toISOString();
  writeUsers(users);
  return true;
}
