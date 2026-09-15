import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import multipart from '@fastify/multipart';
import mime from 'mime-types';
import { config } from './config.js';
import { ffmpegQueue } from './processQueue.js';
import { scanMediaLibrary } from './scanner.js';
import { handleByteRangeStream, handleRemuxStream, resolveSafePath } from './streamer.js';
import {
  checkFfmpegAvailable,
  extractEmbeddedSubtitle,
  findCompanionSubtitles,
  probeEmbeddedSubtitles,
} from './subtitles.js';
import {
  loadLibraries,
  addLibrary,
  deleteLibrary,
  getLibraryById,
} from './libraries.js';
import { browseFolder } from './explorer.js';
import { browseSystemDirectories } from './systemExplorer.js';
import {
  getOrGenerateVideoThumbnail,
  getFolderConfig,
  setFolderConfig,
  findFirstVideoInFolder,
} from './thumbnails.js';
import {
  initDefaultUsers,
  getUserByUsername,
  getUserById,
  verifyPassword,
  updateUserPassword,
} from './auth/userStore.js';
import { signToken } from './auth/tokenService.js';
import { oidcProvider } from './auth/oidcProvider.js';
import { authenticate } from './auth/authMiddleware.js';

// Initialize user store with default admin
initDefaultUsers();

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'warn',
  },
});

// Enable CORS for client-side fetches and canvas subtitle rendering
await app.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'DELETE', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Range', 'Content-Type', 'Accept', 'Authorization'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Type'],
});

// Multipart support for folder thumbnail uploads (10MB limit)
await app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

// Authentication middleware hook
app.addHook('preHandler', authenticate);

// In-memory media cache to avoid repeated disk reads
let cachedLibrary = null;
let lastScanTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute auto refresh

import { loadLibraries as getOrLoadLibraries } from './libraries.js';

function getMediaLibrary(forceRefresh = false) {
  const now = Date.now();
  if (forceRefresh || !cachedLibrary || now - lastScanTime > CACHE_TTL_MS) {
    const libs = getOrLoadLibraries();
    
    let merged = { items: [], series: [], allItems: [], totalFiles: 0, totalSizeBytes: 0, scannedAt: new Date().toISOString() };
    
    const baseScan = scanMediaLibrary(config.MEDIA_ROOT);
    mergeScans(merged, baseScan);
    
    for (const l of libs) {
      if (l.path !== config.MEDIA_ROOT) {
         try {
           mergeScans(merged, scanMediaLibrary(l.path));
         } catch(e) {}
      }
    }
    
    merged.series.sort((a,b) => b.latestModified.localeCompare(a.latestModified));
    merged.items.sort((a,b) => b.modifiedAt.localeCompare(a.modifiedAt));
    
    cachedLibrary = merged;
    lastScanTime = now;
    
    // Trigger background thumbnails for all aggregated items
    setTimeout(() => {
       import('./scanner.js').then(m => {
          if (m.preGenerateThumbnails) m.preGenerateThumbnails(merged.allItems);
       });
    }, 5000);
  }
  return cachedLibrary;
}

function mergeScans(merged, scanObj) {
  merged.items.push(...scanObj.items);
  merged.series.push(...scanObj.series);
  merged.allItems.push(...scanObj.allItems);
  merged.totalFiles += scanObj.totalFiles;
  merged.totalSizeBytes += scanObj.totalSizeBytes;
}

// ==========================================
// 1. Authentication & SSO / OIDC Endpoints
// ==========================================

// Auth Status & Current Session
app.get('/api/auth/status', async (req) => {
  return {
    authEnabled: config.AUTH_ENABLED,
    user: req.user || null,
    oidcEnabled: oidcProvider.isEnabled(),
  };
});

// Available Auth Providers (Local, OIDC)
app.get('/api/auth/providers', async () => {
  return {
    local: true,
    oidc: {
      enabled: oidcProvider.isEnabled(),
      name: config.OIDC.name,
      loginUrl: '/api/auth/oidc/login',
    },
  };
});

// Local Username & Password Login
app.post('/api/auth/login', async (req, reply) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return reply.status(400).send({ error: 'Username and password are required' });
  }

  const user = getUserByUsername(username);
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return reply.status(401).send({ error: 'Invalid username or password' });
  }

  const token = signToken(user);
  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      authProvider: user.authProvider,
    },
  };
});

// Current Authenticated User Profile
app.get('/api/auth/me', async (req, reply) => {
  if (!req.user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }
  return { user: req.user };
});

// Change Password
app.post('/api/auth/change-password', async (req, reply) => {
  if (!req.user) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 4) {
    return reply.status(400).send({ error: 'New password must be at least 4 characters' });
  }

  const user = getUserById(req.user.id);
  if (!user) {
    return reply.status(404).send({ error: 'User account not found' });
  }

  if (user.authProvider === 'local') {
    if (!verifyPassword(currentPassword || '', user.passwordHash)) {
      return reply.status(400).send({ error: 'Current password is incorrect' });
    }
  }

  updateUserPassword(user.id, newPassword);
  return { success: true, message: 'Password updated successfully' };
});

// OIDC SSO Login Redirection
app.get('/api/auth/oidc/login', async (req, reply) => {
  if (!oidcProvider.isEnabled()) {
    return reply.status(400).send({
      error: 'OIDC / SSO is not yet enabled or configured on this server.',
      instructions: 'Configure OIDC_ENABLED=true, OIDC_ISSUER_URL, OIDC_CLIENT_ID in environment or config.',
    });
  }

  try {
    const authUrl = await oidcProvider.getAuthorizationUrl();
    return reply.redirect(authUrl);
  } catch (err) {
    return reply.status(500).send({ error: err.message });
  }
});

// OIDC SSO Callback Handler
app.get('/api/auth/oidc/callback', async (req, reply) => {
  const code = req.query.code;
  if (!code) {
    return reply.status(400).send({ error: 'Missing authorization code from OIDC provider' });
  }

  try {
    const result = await oidcProvider.handleCallback(code);
    // Redirect to frontend root passing the session token
    return reply.redirect(`/?token=${encodeURIComponent(result.token)}`);
  } catch (err) {
    return reply.status(500).send({ error: err.message });
  }
});

// Logout
app.post('/api/auth/logout', async () => {
  return { success: true };
});

// ==========================================
// 2. Health & System Metrics
// ==========================================
app.get('/api/health', async () => {
  const memUsage = process.memoryUsage();
  const hasFfmpeg = await checkFfmpegAvailable();

  return {
    status: 'online',
    appName: 'stream-vault',
    version: '1.2.0',
    philosophy: 'Zero Server-Side Video Transcode (Direct Play Only)',
    serverCpuUsage: '0% Transcode Load (Pure Origin Range Streaming)',
    memory: {
      rssMb: Math.round(memUsage.rss / 1024 / 1024),
      heapUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024),
    },
    processQueue: ffmpegQueue.getStats(),
    uptimeSeconds: Math.floor(process.uptime()),
    mediaRoot: config.MEDIA_ROOT,
    mediaRootExists: fs.existsSync(config.MEDIA_ROOT),
    cacheDir: config.CACHE_DIR,
    dataDir: config.DATA_DIR,
    ffmpegConcurrencyLimit: config.FFMPEG_MAX_CONCURRENCY,
    embeddedSubtitleExtractionAvailable: hasFfmpeg,
  };
});

// ==========================================
// 3. Media Library APIs
// ==========================================
app.get('/api/media', async (req) => {
  const refresh = req.query.refresh === 'true';
  const library = getMediaLibrary(refresh);
  return library;
});

app.post('/api/media/scan', async () => {
  getMediaLibrary(true);
  // cachedLibrary is handled by getMediaLibrary(true);
  lastScanTime = Date.now();
  return {
    success: true,
    totalFiles: cachedLibrary.totalFiles,
    totalSeries: cachedLibrary.series.length,
    scannedAt: cachedLibrary.scannedAt,
  };
});

// ==========================================
// 4. Libraries Management API
// ==========================================
app.get('/api/libraries', async () => {
  return loadLibraries();
});

app.post('/api/libraries', async (req, reply) => {
  const { name, path: libPath, type } = req.body || {};
  if (!name || !libPath) {
    return reply.status(400).send({ error: 'Library name and directory path are required' });
  }

  try {
    const newLib = addLibrary({ name, path: libPath, type });
    cachedLibrary = null;
    return newLib;
  } catch (err) {
    return reply.status(400).send({ error: err.message });
  }
});

app.delete('/api/libraries/:id', async (req, reply) => {
  const { id } = req.params;
  const deleted = deleteLibrary(id);
  if (!deleted) {
    return reply.status(404).send({ error: 'Library not found' });
  }
  cachedLibrary = null;
  return { success: true };
});

// ==========================================
// System Folder Browser API (for Library setup)

app.get('/api/system-directories', async (req, reply) => {
  const reqPath = req.query.path || '';
  try {
    const result = browseSystemDirectories(reqPath);
    return result;
  } catch (err) {
    return reply.status(500).send({ error: err.message });
  }
});

// ==========================================
// 5. Hierarchical Folder Explorer API
// ==========================================
app.get('/api/browse', async (req, reply) => {
  const libraryId = req.query.libraryId;
  const subpath = req.query.subpath || '';

  let libraryRoot = config.MEDIA_ROOT;
  let libraryMeta = null;

  if (libraryId) {
    libraryMeta = getLibraryById(libraryId);
    if (libraryMeta && fs.existsSync(libraryMeta.path)) {
      libraryRoot = libraryMeta.path;
    }
  }

  try {
    const result = browseFolder(libraryRoot, subpath);
    return {
      library: libraryMeta || { id: 'default', name: 'Media Root', path: libraryRoot },
      ...result,
    };
  } catch (err) {
    return reply.status(400).send({ error: err.message });
  }
});

// ==========================================
// 6. Thumbnail & Folder Thumbnail APIs (3 Modes)
// ==========================================

// Video Thumbnail Endpoint (Per-video specific thumbnail)
app.get('/api/thumbnail', async (req, reply) => {
  const videoPath = req.query.path;
  if (!videoPath) {
    return reply.status(400).send({ error: 'Missing path parameter' });
  }

  let fullPath;
  try {
    fullPath = resolveSafePath(videoPath);
  } catch (err) {
    return reply.status(403).send({ error: err.message });
  }

  if (!fs.existsSync(fullPath)) {
    return reply.status(404).send({ error: 'Video file not found' });
  }

  try {
    const thumb = await getOrGenerateVideoThumbnail(fullPath);
    const mimeType = mime.lookup(thumb.filePath) || 'image/jpeg';
    reply.header('Content-Type', mimeType);
    reply.header('Cache-Control', 'public, max-age=86400');
    return fs.createReadStream(thumb.filePath);
  } catch (err) {
    return reply.status(500).send({ error: err.message });
  }
});

// Folder Thumbnail Image Endpoint (Serves custom uploaded folder thumbnail)
app.get('/api/folders/thumbnail/image', async (req, reply) => {
  const folderRel = req.query.folder;
  if (!folderRel) {
    return reply.status(400).send({ error: 'Missing folder parameter' });
  }

  const cfg = getFolderConfig(folderRel);
  if (!cfg.customImage) {
    return reply.status(404).send({ error: 'No custom thumbnail set for this folder' });
  }

  const imgPath = path.join(config.FOLDER_THUMBS_DIR, cfg.customImage);
  if (!fs.existsSync(imgPath)) {
    return reply.status(404).send({ error: 'Custom image file not found' });
  }

  const mimeType = mime.lookup(imgPath) || 'image/jpeg';
  reply.header('Content-Type', mimeType);
  reply.header('Cache-Control', 'public, max-age=86400');
  return fs.createReadStream(imgPath);
});

// Folder Thumbnail Configuration Inspector
app.get('/api/folders/config', async (req, reply) => {
  const subpath = req.query.subpath || '';
  const cfg = getFolderConfig(subpath);

  let targetDir;
  try {
    targetDir = resolveSafePath(subpath);
  } catch {
    targetDir = path.resolve(config.MEDIA_ROOT, subpath);
  }

  const firstVideo = findFirstVideoInFolder(targetDir);
  let autoThumbnailUrl = null;
  if (firstVideo) {
    const relVideo = path.relative(config.MEDIA_ROOT, firstVideo).replace(/\\/g, '/');
    autoThumbnailUrl = `/api/thumbnail?path=${encodeURIComponent(relVideo)}`;
  }

  return {
    subpath,
    mode: cfg.mode || 'auto',
    customImage: cfg.customImage || null,
    customThumbnailUrl: cfg.customImage
      ? `/api/folders/thumbnail/image?folder=${encodeURIComponent(subpath)}`
      : null,
    autoThumbnailUrl,
  };
});

// Update Folder Thumbnail (3 Modes: 'auto', 'custom', 'none')
app.post('/api/folders/thumbnail', async (req, reply) => {
  let subpath = '';
  let mode = 'auto'; // 'auto' | 'custom' | 'none'
  let customImageFilename = null;

  if (req.isMultipart()) {
    const parts = req.parts();
    for await (const part of parts) {
      if (part.type === 'file' && part.fieldname === 'file') {
        const ext = path.extname(part.filename || '.jpg').toLowerCase() || '.jpg';
        const hash = crypto.randomUUID();
        customImageFilename = `${hash}${ext}`;
        const destPath = path.join(config.FOLDER_THUMBS_DIR, customImageFilename);
        await pipeline(part.file, fs.createWriteStream(destPath));
      } else if (part.fieldname === 'subpath') {
        subpath = part.value;
      } else if (part.fieldname === 'mode') {
        mode = part.value;
      }
    }
  } else {
    const body = req.body || {};
    subpath = body.subpath || '';
    mode = body.mode || 'auto';
    if (body.imageBase64) {
      const matches = body.imageBase64.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
      const ext = matches ? `.${matches[1]}` : '.jpg';
      const data = matches ? matches[2] : body.imageBase64;
      const hash = crypto.randomUUID();
      customImageFilename = `${hash}${ext}`;
      const destPath = path.join(config.FOLDER_THUMBS_DIR, customImageFilename);
      fs.writeFileSync(destPath, Buffer.from(data, 'base64'));
    }
  }

  const updated = setFolderConfig(subpath, {
    mode,
    customImage: customImageFilename !== null ? customImageFilename : undefined,
  });

  return {
    success: true,
    subpath,
    config: updated,
  };
});

// ==========================================
// 7. HTTP Range Video Streaming (Zero Transcode)
// ==========================================
app.route({
  method: ['GET', 'HEAD'],
  url: '/api/stream',
  handler: async (req, reply) => handleByteRangeStream(req, reply),
});

app.route({
  method: ['GET'],
  url: '/api/stream/remux',
  handler: async (req, reply) => handleRemuxStream(req, reply),
});

// ==========================================
// 8. Subtitles APIs
// ==========================================
app.get('/api/subtitles/tracks', async (req, reply) => {
  const queryPath = req.query.path;
  if (!queryPath) {
    return reply.status(400).send({ error: 'Missing path query parameter' });
  }

  let fullPath;
  try {
    fullPath = resolveSafePath(queryPath);
  } catch (err) {
    return reply.status(403).send({ error: err.message });
  }

  if (!fs.existsSync(fullPath)) {
    return reply.status(404).send({ error: 'Video file not found' });
  }

  const companionSubs = findCompanionSubtitles(fullPath);
  const embeddedSubs = await probeEmbeddedSubtitles(fullPath);

  const combined = [...companionSubs, ...embeddedSubs];
  if (combined.length > 0 && !combined.some((s) => s.isDefault)) {
    combined[0].isDefault = true;
  }

  return combined;
});

app.get('/api/subtitles', async (req, reply) => {
  const subPath = req.query.path;
  if (!subPath) {
    return reply.status(400).send({ error: 'Missing path query parameter' });
  }

  let fullPath;
  try {
    fullPath = resolveSafePath(subPath);
  } catch (err) {
    return reply.status(403).send({ error: err.message });
  }

  if (!fs.existsSync(fullPath)) {
    return reply.status(404).send({ error: 'Subtitle file not found' });
  }

  const ext = path.extname(fullPath).toLowerCase();
  let contentType = 'text/plain; charset=utf-8';
  if (ext === '.ass' || ext === '.ssa') {
    contentType = 'text/x-ssa; charset=utf-8';
  } else if (ext === '.vtt') {
    contentType = 'text/vtt; charset=utf-8';
  }

  reply.header('Content-Type', contentType);
  reply.header('Cache-Control', 'public, max-age=86400');
  reply.header('Access-Control-Allow-Origin', '*');

  return fs.createReadStream(fullPath);
});

app.get('/api/subtitles/extract', async (req, reply) => {
  const videoPath = req.query.path;
  const trackIndex = parseInt(req.query.track || '0', 10);

  if (!videoPath) {
    return reply.status(400).send({ error: 'Missing path query parameter' });
  }

  let fullPath;
  try {
    fullPath = resolveSafePath(videoPath);
  } catch (err) {
    return reply.status(403).send({ error: err.message });
  }

  try {
    const extractedFile = await extractEmbeddedSubtitle(fullPath, trackIndex);
    reply.header('Content-Type', 'text/x-ssa; charset=utf-8');
    reply.header('Access-Control-Allow-Origin', '*');
    return fs.createReadStream(extractedFile);
  } catch (err) {
    return reply.status(500).send({ error: err.message });
  }
});

// ==========================================
// 9. Poster / Artwork Serving
// ==========================================
app.get('/api/poster', async (req, reply) => {
  const posterPath = req.query.path;
  if (!posterPath) {
    return reply.status(400).send({ error: 'Missing path parameter' });
  }

  let fullPath;
  try {
    fullPath = resolveSafePath(posterPath);
  } catch (err) {
    return reply.status(403).send({ error: err.message });
  }

  if (!fs.existsSync(fullPath)) {
    return reply.status(404).send({ error: 'Poster not found' });
  }

  const mimeType = mime.lookup(fullPath) || 'image/jpeg';
  reply.header('Content-Type', mimeType);
  reply.header('Cache-Control', 'public, max-age=86400');
  return fs.createReadStream(fullPath);
});

// ==========================================
// 10. Serve Frontend Static Build
// ==========================================
const clientDistPath = path.resolve(process.cwd(), '../client/dist');
const localClientDist = path.resolve(process.cwd(), 'client/dist');
const resolvedDist = fs.existsSync(clientDistPath)
  ? clientDistPath
  : fs.existsSync(localClientDist)
  ? localClientDist
  : null;

if (resolvedDist) {
  app.register(fastifyStatic, {
    root: resolvedDist,
    prefix: '/',
  });

  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url && req.raw.url.startsWith('/api')) {
      return reply.status(404).send({ error: 'API endpoint not found' });
    }
    return reply.sendFile('index.html');
  });
} else {
  app.get('/', async () => {
    return {
      message: 'StreamVault API Server Running',
      docs: '/api/media',
      status: '/api/health',
      frontend: 'Run frontend via Vite dev server or build client',
    };
  });
}

// Start Server
async function start() {
  try {
    // Ensure all data and cache directories exist
    const dirsToEnsure = [
      config.CACHE_DIR,
      config.THUMBNAILS_DIR,
      config.DATA_DIR,
      config.FOLDER_THUMBS_DIR,
    ];
    for (const dir of dirsToEnsure) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    await app.listen({ port: config.PORT, host: config.HOST });
    console.log(`
============================================================
🚀 StreamVault Server Started Successfully!
📡 Philosophy: Zero Server-Side Video Transcoding (Direct Play)
⚡ Subprocess Guard: FFmpeg Queue (Concurrency=${config.FFMPEG_MAX_CONCURRENCY}, Timeout=${config.FFMPEG_TIMEOUT_MS / 1000}s)
🌐 URL: http://${config.HOST}:${config.PORT}
📁 Media Root: ${config.MEDIA_ROOT}
💾 Base Memory: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB RAM (Recommended Container Limit: 512 MB)
🔐 Auth: ${config.AUTH_ENABLED ? 'Enabled' : 'Disabled'} | Default Admin: admin / admin
============================================================
`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
