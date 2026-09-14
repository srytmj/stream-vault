import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from './config.js';

const execFileAsync = promisify(execFile);

const FOLDERS_META_PATH = path.join(config.DATA_DIR, 'folders_meta.json');

// Ensure directories exist
function ensureDirs() {
  if (!fs.existsSync(config.CACHE_DIR)) {
    fs.mkdirSync(config.CACHE_DIR, { recursive: true });
  }
  if (!fs.existsSync(config.THUMBNAILS_DIR)) {
    fs.mkdirSync(config.THUMBNAILS_DIR, { recursive: true });
  }
  if (!fs.existsSync(config.FOLDER_THUMBS_DIR)) {
    fs.mkdirSync(config.FOLDER_THUMBS_DIR, { recursive: true });
  }
  if (!fs.existsSync(config.DATA_DIR)) {
    fs.mkdirSync(config.DATA_DIR, { recursive: true });
  }
}
ensureDirs();

/**
 * Load folders metadata from folders_meta.json
 */
export function loadFoldersMeta() {
  ensureDirs();
  if (!fs.existsSync(FOLDERS_META_PATH)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(FOLDERS_META_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse folders_meta.json:', err.message);
    return {};
  }
}

/**
 * Save folders metadata
 */
export function saveFoldersMeta(data) {
  ensureDirs();
  fs.writeFileSync(FOLDERS_META_PATH, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Get configuration for a specific folder
 */
export function getFolderConfig(folderRelPath) {
  const meta = loadFoldersMeta();
  const normalized = (folderRelPath || '').replace(/\\/g, '/').replace(/^\//, '').replace(/\/$/, '');
  return meta[normalized] || { mode: 'auto', customImage: null };
}

/**
 * Set configuration for a specific folder
 */
export function setFolderConfig(folderRelPath, { mode, customImage }) {
  const meta = loadFoldersMeta();
  const normalized = (folderRelPath || '').replace(/\\/g, '/').replace(/^\//, '').replace(/\/$/, '');
  
  meta[normalized] = {
    mode: mode || 'auto', // 'auto' | 'custom' | 'none'
    customImage: customImage !== undefined ? customImage : (meta[normalized]?.customImage || null),
    updatedAt: new Date().toISOString(),
  };

  saveFoldersMeta(meta);
  return meta[normalized];
}

/**
 * Find exact companion image matching the video's basename
 * e.g., video: "Your Name.mp4" -> companion: "Your Name.jpg" or "Your Name.svg"
 * NEVER matches other videos or general posters!
 */
export function findExactCompanionPoster(videoFullPath) {
  if (!fs.existsSync(videoFullPath)) return null;

  const dir = path.dirname(videoFullPath);
  const ext = path.extname(videoFullPath);
  const baseName = path.basename(videoFullPath, ext);

  // Exact matching extensions
  for (const imgExt of config.ALLOWED_POSTER_EXTENSIONS) {
    const exactFile = path.join(dir, `${baseName}${imgExt}`);
    if (fs.existsSync(exactFile)) {
      return exactFile;
    }
    const thumbFile = path.join(dir, `${baseName}-thumb${imgExt}`);
    if (fs.existsSync(thumbFile)) {
      return thumbFile;
    }
  }

  return null;
}

/**
 * Quick search for the first video file inside a directory (shallow or deep)
 */
export function findFirstVideoInFolder(folderFullPath, maxDepth = 3, currentDepth = 0) {
  if (!fs.existsSync(folderFullPath) || currentDepth > maxDepth) return null;

  try {
    const entries = fs.readdirSync(folderFullPath, { withFileTypes: true });

    // Priority 1: check files in current directory first
    for (const entry of entries) {
      if (entry.isFile() && !entry.name.startsWith('.')) {
        const ext = path.extname(entry.name).toLowerCase();
        if (config.ALLOWED_VIDEO_EXTENSIONS.includes(ext)) {
          return path.join(folderFullPath, entry.name);
        }
      }
    }

    // Priority 2: check subdirectories
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const subResult = findFirstVideoInFolder(path.join(folderFullPath, entry.name), maxDepth, currentDepth + 1);
        if (subResult) return subResult;
      }
    }
  } catch (err) {
    // ignore
  }

  return null;
}

/**
 * Resolve the thumbnail/poster URL for a folder according to the 3 modes:
 * Mode 1 ('auto'):
 *   - Use explicit folder poster (poster.jpg/poster.svg/cover.jpg) if present
 *   - Otherwise pick a video inside the folder and use its thumbnail!
 * Mode 2 ('custom'):
 *   - Use user's uploaded custom image
 * Mode 3 ('none'):
 *   - Return null (displays empty folder icon)
 */
export function resolveFolderPoster(folderFullPath, folderRelPath) {
  const normRel = (folderRelPath || '').replace(/\\/g, '/').replace(/^\//, '').replace(/\/$/, '');
  const cfg = getFolderConfig(normRel);

  // Mode 3: None / Biarin Kosong
  if (cfg.mode === 'none') {
    return null;
  }

  // Mode 2: Custom uploaded thumbnail
  if (cfg.mode === 'custom' && cfg.customImage) {
    const customFullPath = path.join(config.FOLDER_THUMBS_DIR, cfg.customImage);
    if (fs.existsSync(customFullPath)) {
      return `/api/folders/thumbnail/image?folder=${encodeURIComponent(normRel)}`;
    }
  }

  // Mode 1: Auto (Default)
  // Check standard folder poster: poster.*, cover.*, folder.*, thumb.*
  const standardNames = ['poster', 'cover', 'folder', 'thumb', 'artwork'];
  try {
    if (fs.existsSync(folderFullPath)) {
      const entries = fs.readdirSync(folderFullPath);
      for (const f of entries) {
        const ext = path.extname(f).toLowerCase();
        if (config.ALLOWED_POSTER_EXTENSIONS.includes(ext)) {
          const nameNoExt = path.basename(f, ext).toLowerCase();
          if (standardNames.includes(nameNoExt)) {
            const relPoster = path.relative(config.MEDIA_ROOT, path.join(folderFullPath, f));
            return `/api/poster?path=${encodeURIComponent(relPoster.replace(/\\/g, '/'))}`;
          }
        }
      }
    }
  } catch {}

  // Fallback in auto mode: pick any video inside this folder
  const firstVideo = findFirstVideoInFolder(folderFullPath);
  if (firstVideo) {
    const relVideo = path.relative(config.MEDIA_ROOT, firstVideo);
    return `/api/thumbnail?path=${encodeURIComponent(relVideo.replace(/\\/g, '/'))}`;
  }

  return null;
}

/**
 * Generate or get cached video frame thumbnail using ffmpeg
 */
export async function getOrGenerateVideoThumbnail(videoFullPath, seekTime = '00:00:03') {
  ensureDirs();

  if (!fs.existsSync(videoFullPath)) {
    throw new Error('Video file not found');
  }

  // 1. Check exact companion poster first
  const companion = findExactCompanionPoster(videoFullPath);
  if (companion) {
    return { filePath: companion, isCompanion: true };
  }

  // 2. Build cache hash based on path + size + mtime
  const stat = fs.statSync(videoFullPath);
  const hash = crypto
    .createHash('sha256')
    .update(`${videoFullPath}-${stat.size}-${stat.mtimeMs}`)
    .digest('hex');

  const cacheFile = path.join(config.THUMBNAILS_DIR, `${hash}.jpg`);

  if (fs.existsSync(cacheFile) && fs.statSync(cacheFile).size > 100) {
    return { filePath: cacheFile, isCompanion: false };
  }

  // 3. Extract frame using ffmpeg
  try {
    const args = [
      '-ss', seekTime,
      '-i', videoFullPath,
      '-frames:v', '1',
      '-q:v', '2',
      '-vf', 'scale=480:-1',
      cacheFile,
      '-y',
    ];

    await execFileAsync('ffmpeg', args, { timeout: 10000 });

    if (fs.existsSync(cacheFile) && fs.statSync(cacheFile).size > 100) {
      return { filePath: cacheFile, isCompanion: false };
    }
  } catch (err) {
    // Retry at 1 second if 3 seconds failed (e.g. short video)
    try {
      const fallbackArgs = [
        '-ss', '00:00:01',
        '-i', videoFullPath,
        '-frames:v', '1',
        '-q:v', '2',
        '-vf', 'scale=480:-1',
        cacheFile,
        '-y',
      ];
      await execFileAsync('ffmpeg', fallbackArgs, { timeout: 10000 });
      if (fs.existsSync(cacheFile) && fs.statSync(cacheFile).size > 100) {
        return { filePath: cacheFile, isCompanion: false };
      }
    } catch (fallbackErr) {
      console.warn(`FFmpeg thumbnail generation failed for ${path.basename(videoFullPath)}:`, fallbackErr.message);
    }
  }

  // 4. If ffmpeg failed or unsupported, generate SVG placeholder thumbnail
  const svgPlaceholder = generateSvgThumbnail(path.basename(videoFullPath));
  const svgCacheFile = path.join(config.THUMBNAILS_DIR, `${hash}.svg`);
  fs.writeFileSync(svgCacheFile, svgPlaceholder, 'utf8');
  return { filePath: svgCacheFile, isCompanion: false };
}

/**
 * Generate a clean, branded SVG video thumbnail if video frame extraction fails
 */
function generateSvgThumbnail(filename) {
  const cleanName = filename
    .replace(/\.[^/.]+$/, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^)]*\)/g, '')
    .trim() || filename;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" width="480" height="270">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f111a" />
      <stop offset="100%" stop-color="#1a1f36" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f47521" />
      <stop offset="100%" stop-color="#ff934b" />
    </linearGradient>
  </defs>
  <rect width="480" height="270" fill="url(#bg)" />
  <circle cx="240" cy="115" r="38" fill="url(#accent)" opacity="0.15" />
  <circle cx="240" cy="115" r="30" fill="url(#accent)" opacity="0.25" />
  <polygon points="232,100 256,115 232,130" fill="#f47521" />
  <text x="240" y="195" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" fill="#e2e8f0" text-anchor="middle">
    ${escapeXml(cleanName.slice(0, 45))}
  </text>
  <text x="240" y="222" font-family="monospace" font-size="10" fill="#64748b" text-anchor="middle">
    StreamVault Direct Play
  </text>
</svg>`;
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}
