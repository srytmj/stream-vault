import path from 'node:path';
import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from './config.js';
import { ffmpegQueue } from './processQueue.js';

const execFileAsync = promisify(execFile);

const LANGUAGE_MAP = {
  id: 'Indonesian',
  ind: 'Indonesian',
  indo: 'Indonesian',
  en: 'English',
  eng: 'English',
  ja: 'Japanese',
  jpn: 'Japanese',
  es: 'Spanish',
  spa: 'Spanish',
  fr: 'French',
  fra: 'French',
  de: 'German',
  ger: 'German',
  it: 'Italian',
  ita: 'Italian',
  pt: 'Portuguese',
  por: 'Portuguese',
  ru: 'Russian',
  rus: 'Russian',
  ko: 'Korean',
  kor: 'Korean',
  zh: 'Chinese',
  chi: 'Chinese',
  zho: 'Chinese',
  ara: 'Arabic',
};

// In-memory cache for probed embedded tracks to avoid repeating ffprobe on identical files
const probeCache = new Map();

/**
 * Extract human language label from subtitle filename or tag
 */
export function parseLanguageCode(str) {
  if (!str) return 'Default';
  const lower = str.toLowerCase();

  for (const [code, label] of Object.entries(LANGUAGE_MAP)) {
    const boundaryRegex = new RegExp(`(^|[^a-z0-9])${code}([^a-z0-9]|$)`, 'i');
    if (boundaryRegex.test(lower)) {
      return label;
    }
  }

  return 'Unknown';
}

/**
 * Find external companion subtitle files matching video basename
 */
export function findCompanionSubtitles(videoFullPath) {
  const dir = path.dirname(videoFullPath);
  const videoExt = path.extname(videoFullPath);
  const videoBase = path.basename(videoFullPath, videoExt);

  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir);
  const subtitles = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!config.ALLOWED_SUBTITLE_EXTENSIONS.includes(ext)) continue;

    // Match files that start with same base name
    if (file.startsWith(videoBase)) {
      const subFullPath = path.join(dir, file);
      const subSuffix = file.slice(videoBase.length, -ext.length);
      const lang = parseLanguageCode(subSuffix) || 'Default';
      const format = ext.replace('.', '').toUpperCase();

      const relPath = path.relative(config.MEDIA_ROOT, subFullPath);
      const encodedPath = encodeURIComponent(relPath.replace(/\\/g, '/'));

      subtitles.push({
        label: `${lang} (${format}) - External`,
        lang: lang.toLowerCase().slice(0, 2),
        format: format.toLowerCase(),
        filename: file,
        url: `/api/subtitles?path=${encodedPath}`,
        isEmbedded: false,
        isDefault: subtitles.length === 0,
      });
    }
  }

  return subtitles;
}

// Backward compatibility alias for scanner.js
export const findExternalSubtitles = findCompanionSubtitles;

/**
 * Check if ffmpeg/ffprobe is installed on host/container
 */
export async function checkFfmpegAvailable() {
  try {
    await execFileAsync('ffmpeg', ['-version'], { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Probe embedded subtitle tracks inside MKV/MP4 containers via guarded single-thread ffprobe
 */
export async function probeEmbeddedSubtitles(videoFullPath) {
  if (!fs.existsSync(videoFullPath)) return [];

  let stat;
  try {
    stat = fs.statSync(videoFullPath);
  } catch {
    return [];
  }

  const cacheKey = `${videoFullPath}-${stat.mtimeMs}-${stat.size}`;
  if (probeCache.has(cacheKey)) {
    return probeCache.get(cacheKey);
  }

  const hasFfmpeg = await checkFfmpegAvailable();
  if (!hasFfmpeg) return [];

  try {
    const stdout = await (async () => {
        const args = [
          '-v', 'error',
          '-probesize', '1000000',
          '-analyzeduration', '1000000',
          '-threads', '1',
          '-select_streams', 's',
          '-show_entries', 'stream=index,codec_name:stream_tags=language,title',
          '-of', 'json',
          videoFullPath,
        ];

        const { stdout: probeOut } = await execFileAsync('ffprobe', args, {
          timeout: config.FFMPEG_TIMEOUT_MS,
          killSignal: 'SIGKILL',
          maxBuffer: 1024 * 1024,
        });

        return probeOut;
      })();

    const data = JSON.parse(stdout);
    if (!data.streams || !Array.isArray(data.streams)) {
      probeCache.set(cacheKey, []);
      return [];
    }

    const relPath = path.relative(config.MEDIA_ROOT, videoFullPath).replace(/\\/g, '/');
    const encodedPath = encodeURIComponent(relPath);

    const tracks = data.streams.map((stream, idx) => {
      const streamIndex = stream.index;
      const langTag = stream.tags?.language || '';
      const titleTag = stream.tags?.title || '';
      const lang = parseLanguageCode(langTag) || 'Track ' + (idx + 1);
      const format = (stream.codec_name || 'ass').toLowerCase();
      // JASSUB only supports text-based subtitles. Filter out image/bitmap subs.
      if (['hdmv_pgs_subtitle', 'dvd_subtitle', 'dvbsub'].includes(format)) {
        return null;
      }
      const label = titleTag
        ? `${titleTag} [Softsub ${format.toUpperCase()}]`
        : `${lang} [Softsub ${format.toUpperCase()}] (Track ${idx + 1})`;

      return {
        label,
        lang: lang.toLowerCase().slice(0, 2),
        format,
        trackIndex: streamIndex,
        isEmbedded: true,
        url: `/api/subtitles/extract?path=${encodedPath}&track=${streamIndex}`,
        isDefault: false,
      };
    }).filter(t => t !== null);

    probeCache.set(cacheKey, tracks);
    return tracks;
  } catch (err) {
    console.warn(`[Subtitles] FFprobe inspection skipped/failed for ${path.basename(videoFullPath)}:`, err.message);
    probeCache.set(cacheKey, []);
    return [];
  }
}

/**
 * Extract embedded subtitle stream using guarded single-thread copy (-c:s copy)
 */
export async function extractEmbeddedSubtitle(videoFullPath, trackIndex = 0) {
  const hashName = Buffer.from(videoFullPath + trackIndex).toString('hex').slice(0, 24);
  const subCacheDir = path.join(config.CACHE_DIR, 'subtitles');

  if (!fs.existsSync(subCacheDir)) {
    fs.mkdirSync(subCacheDir, { recursive: true });
  }

  const cacheFile = path.join(subCacheDir, `${hashName}.ass`);

  if (fs.existsSync(cacheFile) && fs.statSync(cacheFile).size > 0) {
    return cacheFile;
  }

  await (async () => {
      if (fs.existsSync(cacheFile) && fs.statSync(cacheFile).size > 0) {
        return;
      }

      const args = [
        '-nostdin',
        '-threads', '1',
        '-loglevel', 'error',
        '-y',
        '-i', videoFullPath,
        '-map', `0:${trackIndex}`,
        '-c:s', 'ass',
        cacheFile,
      ];

      await execFileAsync('ffmpeg', args, {
        timeout: 30000,
        killSignal: 'SIGKILL',
        maxBuffer: 1024 * 1024,
      });
    })();

  return cacheFile;
}
