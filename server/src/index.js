import path from 'node:path';
import fs from 'node:fs';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import mime from 'mime-types';
import { config } from './config.js';
import { scanMediaLibrary } from './scanner.js';
import { handleByteRangeStream, resolveSafePath } from './streamer.js';
import { checkFfmpegAvailable, extractEmbeddedSubtitle } from './subtitles.js';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'warn',
  },
});

// Enable CORS for client-side fetches and canvas subtitle rendering
await app.register(cors, {
  origin: true,
  methods: ['GET', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Range', 'Content-Type', 'Accept'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Type'],
});

// In-memory media cache to avoid repeated disk reads
let cachedLibrary = null;
let lastScanTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute auto refresh

function getMediaLibrary(forceRefresh = false) {
  const now = Date.now();
  if (forceRefresh || !cachedLibrary || now - lastScanTime > CACHE_TTL_MS) {
    cachedLibrary = scanMediaLibrary(config.MEDIA_ROOT);
    lastScanTime = now;
  }
  return cachedLibrary;
}

// 1. Health check & Server Status
app.get('/api/health', async () => {
  const memUsage = process.memoryUsage();
  const hasFfmpeg = await checkFfmpegAvailable();

  return {
    status: 'online',
    appName: 'stream-vault',
    version: '1.0.0',
    philosophy: 'Zero Server-Side Transcode, 100% Client-Side Playback',
    serverCpuUsage: '0% Transcode Load (Pure Origin Range Streaming)',
    memory: {
      rssMb: Math.round(memUsage.rss / 1024 / 1024),
      heapUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024),
    },
    uptimeSeconds: Math.floor(process.uptime()),
    mediaRoot: config.MEDIA_ROOT,
    mediaRootExists: fs.existsSync(config.MEDIA_ROOT),
    embeddedSubtitleExtractionAvailable: hasFfmpeg,
  };
});

// 2. Scan / List Media Library
app.get('/api/media', async (req) => {
  const refresh = req.query.refresh === 'true';
  const library = getMediaLibrary(refresh);
  return library;
});

// 3. Force Re-scan Endpoint
app.post('/api/media/scan', async () => {
  cachedLibrary = scanMediaLibrary(config.MEDIA_ROOT);
  lastScanTime = Date.now();
  return {
    success: true,
    totalFiles: cachedLibrary.totalFiles,
    totalSeries: cachedLibrary.series.length,
    scannedAt: cachedLibrary.scannedAt,
  };
});

// 4. HTTP Range Video Streaming (Zero Server-Side Transcoding)
app.get('/api/stream', async (req, reply) => {
  return handleByteRangeStream(req, reply);
});

// 5. Subtitles Serving (.ass, .ssa, .srt, .vtt)
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

// 6. Extract embedded MKV subtitle track (Instant text dump, 0% video transcode)
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

// 7. Poster / Artwork Serving
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

// 8. Serve Frontend Static Build if present (Production / Docker build)
const clientDistPath = path.resolve(process.cwd(), '../client/dist');
const localClientDist = path.resolve(process.cwd(), 'client/dist');
const resolvedDist = fs.existsSync(clientDistPath) ? clientDistPath : (fs.existsSync(localClientDist) ? localClientDist : null);

if (resolvedDist) {
  app.register(fastifyStatic, {
    root: resolvedDist,
    prefix: '/',
  });

  // SPA fallback
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
    // Ensure cache directory exists
    if (!fs.existsSync(config.CACHE_DIR)) {
      fs.mkdirSync(config.CACHE_DIR, { recursive: true });
    }

    await app.listen({ port: config.PORT, host: config.HOST });
    console.log(`
============================================================
🚀 StreamVault Server Started Successfully!
📡 Philosophy: Zero Server-Side Transcode, 100% Client Playback
🌐 URL: http://${config.HOST}:${config.PORT}
📁 Media Root: ${config.MEDIA_ROOT}
💾 Memory Footprint: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB RAM
============================================================
`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
