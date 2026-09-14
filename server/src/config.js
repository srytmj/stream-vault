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

export const config = {
  PORT: parseInt(process.env.PORT || '8090', 10),
  HOST: process.env.HOST || '0.0.0.0',
  MEDIA_ROOT: resolveMediaRoot(),
  CACHE_DIR: path.resolve(process.cwd(), '.cache'),
  THUMBNAILS_DIR: path.resolve(process.cwd(), '.cache/thumbnails'),
  DATA_DIR: path.resolve(process.cwd(), 'data'),
  FOLDER_THUMBS_DIR: path.resolve(process.cwd(), 'data/folder_thumbnails'),
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
