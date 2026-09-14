import path from 'node:path';
import fs from 'node:fs';

// Resolve media root directory with smart fallbacks
function resolveMediaRoot() {
  if (process.env.MEDIA_ROOT && fs.existsSync(process.env.MEDIA_ROOT)) {
    return path.resolve(process.env.MEDIA_ROOT);
  }
  
  const standardMount = '/media';
  if (fs.existsSync(standardMount)) {
    return standardMount;
  }
  
  const localRelative = path.resolve(process.cwd(), '../media');
  if (fs.existsSync(localRelative)) {
    return localRelative;
  }

  const currentMedia = path.resolve(process.cwd(), 'media');
  if (fs.existsSync(currentMedia)) {
    return currentMedia;
  }

  return path.resolve(process.cwd(), '../media');
}

// Resolve cache directory with Docker and local path support
function resolveCacheDir() {
  if (process.env.CACHE_DIR) {
    return path.resolve(process.env.CACHE_DIR);
  }
  if (fs.existsSync('/app/.cache')) {
    return '/app/.cache';
  }
  return path.resolve(process.cwd(), '.cache');
}

// Resolve persistent data directory with Docker and local path support
function resolveDataDir() {
  if (process.env.DATA_DIR) {
    return path.resolve(process.env.DATA_DIR);
  }
  if (fs.existsSync('/app/data')) {
    return '/app/data';
  }
  return path.resolve(process.cwd(), 'data');
}

const resolvedCacheDir = resolveCacheDir();
const resolvedDataDir = resolveDataDir();

export const config = {
  PORT: parseInt(process.env.PORT || '8090', 10),
  HOST: process.env.HOST || '0.0.0.0',
  MEDIA_ROOT: resolveMediaRoot(),
  CACHE_DIR: resolvedCacheDir,
  THUMBNAILS_DIR: path.join(resolvedCacheDir, 'thumbnails'),
  DATA_DIR: resolvedDataDir,
  FOLDER_THUMBS_DIR: path.join(resolvedDataDir, 'folder_thumbnails'),
  FFMPEG_MAX_CONCURRENCY: Math.max(1, parseInt(process.env.FFMPEG_MAX_CONCURRENCY || '1', 10)),
  FFMPEG_TIMEOUT_MS: parseInt(process.env.FFMPEG_TIMEOUT_MS || '15000', 10),
  AUTH_SECRET: process.env.AUTH_SECRET || 'streamvault-dev-secret-key-change-in-production',
  AUTH_ENABLED: process.env.AUTH_ENABLED !== 'false', // Default enabled
  OIDC: {
    enabled: process.env.OIDC_ENABLED === 'true',
    name: process.env.OIDC_NAME || 'Single Sign-On (OIDC)',
    issuerUrl: process.env.OIDC_ISSUER_URL || '',
    clientId: process.env.OIDC_CLIENT_ID || '',
    clientSecret: process.env.OIDC_CLIENT_SECRET || '',
    redirectUri: process.env.OIDC_REDIRECT_URI || 'http://localhost:8090/api/auth/oidc/callback',
    scopes: process.env.OIDC_SCOPES || 'openid profile email',
  },
  ALLOWED_VIDEO_EXTENSIONS: ['.mkv', '.mp4', '.webm', '.m4v', '.mov', '.avi', '.ts'],
  ALLOWED_SUBTITLE_EXTENSIONS: ['.ass', '.ssa', '.srt', '.vtt'],
  ALLOWED_POSTER_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.svg'],
};
