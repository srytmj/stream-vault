import path from 'node:path';
import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from './config.js';

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

  if (!fs.existsSync(dir)) return { tracks: [], requiresRemux: false };

  let files;
  try {
    files = fs.readdirSync(dir);
  } catch {
    return { tracks: [], requiresRemux: false };
  }

  const subtitles = [];
  const videoFiles = files.filter(f => config.ALLOWED_VIDEO_EXTENSIONS.includes(path.extname(f).toLowerCase()));

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!config.ALLOWED_SUBTITLE_EXTENSIONS.includes(ext)) continue;

    const fileBase = path.basename(file, ext);
    // Match if file starts with videoBase, or matches exactly, or if folder has only 1 video
    const isMatch = file.startsWith(videoBase) ||
      fileBase.toLowerCase() === videoBase.toLowerCase() ||
      (videoFiles.length === 1);

    if (isMatch) {
      const subFullPath = path.join(dir, file);
      const subSuffix = file.slice(videoBase.length, -ext.length);
      const lang = parseLanguageCode(subSuffix || fileBase) || 'External';
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
 * Probe embedded subtitle tracks inside MKV/MP4 containers via single-thread ffprobe
 */
export async function probeEmbeddedSubtitles(videoFullPath) {
  if (!fs.existsSync(videoFullPath)) return { tracks: [], requiresRemux: false };

  let stat;
  try {
    stat = fs.statSync(videoFullPath);
  } catch {
    return { tracks: [], requiresRemux: false };
  }

  const cacheKey = `${videoFullPath}-${stat.mtimeMs}-${stat.size}`;
  if (probeCache.has(cacheKey)) {
    const cached = probeCache.get(cacheKey);
    if (cached && cached.tracks) return cached;
  }

  const hasFfmpeg = await checkFfmpegAvailable();
  if (!hasFfmpeg) return { tracks: [], requiresRemux: false };

  try {
    const stdout = await (async () => {
      const args = [
        '-v', 'error',
        '-threads', '1',
        '-select_streams', 'a,s',
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
      const fallback = { tracks: [], requiresRemux: false };
      probeCache.set(cacheKey, fallback);
      return fallback;
    }

    const relPath = path.relative(config.MEDIA_ROOT, videoFullPath).replace(/\\/g, '/');
    const encodedPath = encodeURIComponent(relPath);

    let requiresRemux = false;
    let foundDefault = false;
    const tracks = [];
    
    // Check audio streams for unsupported formats requiring web remux
    const audioStreams = data.streams.filter((s) => s.codec_type === 'audio');
    if (audioStreams.length > 0) {
      // Check if ALL audio streams are unsupported (ac3, dts, flac, truehd, eac3)
      const unsupported = ['ac3', 'eac3', 'dts', 'truehd', 'flac'];
      const hasSupportedAudio = audioStreams.some(s => !unsupported.includes(s.codec_name?.toLowerCase()));
      if (!hasSupportedAudio) {
        requiresRemux = true;
      }
    }

    const subStreams = data.streams.filter((s) => s.codec_type === 'subtitle');

    subStreams.forEach((stream, idx) => {
      const streamIndex = stream.index;
      const langTag = stream.tags?.language || '';
      const titleTag = stream.tags?.title || '';
      const lang = parseLanguageCode(langTag) || 'Track ' + (idx + 1);
      const format = (stream.codec_name || 'ass').toLowerCase();
      const isBitmap = ['hdmv_pgs_subtitle', 'dvd_subtitle', 'dvbsub'].includes(format);

      let label;
      if (isBitmap) {
        label = titleTag
          ? `${titleTag} [Blu-Ray PGS Image]`
          : `${lang} [Blu-Ray PGS Image] (Track ${idx + 1})`;
      } else {
        label = titleTag
          ? `${titleTag} [Softsub ${format.toUpperCase()}]`
          : `${lang} [Softsub ${format.toUpperCase()}] (Track ${idx + 1})`;
      }

      const isDefault = !isBitmap && !foundDefault;
      if (isDefault) foundDefault = true;

      tracks.push({
        label,
        lang: lang.toLowerCase().slice(0, 2),
        format,
        isBitmap,
        trackIndex: streamIndex,
        isEmbedded: true,
        url: isBitmap ? null : `/api/subtitles/extract?path=${encodedPath}&track=${streamIndex}&format=${format}`, 
        isDefault,
      });
    });

    const result = { tracks, requiresRemux };
    probeCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn(`[Subtitles] FFprobe inspection failed for ${path.basename(videoFullPath)}:`, err.message);
    probeCache.set(cacheKey, []);
    return [];
  }
}

/**
 * Extract embedded subtitle stream using copy or transcode to ASS
 */
export async function extractEmbeddedSubtitle(videoFullPath, trackIndex = 0, codec = "ass") {
  const hashName = Buffer.from(videoFullPath + trackIndex + 'v2').toString('hex').slice(0, 24);
  const subCacheDir = path.join(config.CACHE_DIR, 'subtitles');

  if (!fs.existsSync(subCacheDir)) {
    fs.mkdirSync(subCacheDir, { recursive: true });
  }

  const cacheFile = path.join(subCacheDir, `${hashName}.ass`);

  if (fs.existsSync(cacheFile) && fs.statSync(cacheFile).size > 0) {
    return cacheFile;
  }

  const isAss = codec === 'ass' || codec === 'ssa';

  let success = false;
  
  if (isAss) {
    try {
      await execFileAsync('ffmpeg', [
        '-nostdin', '-threads', '1', '-loglevel', 'error', '-y',
        '-i', videoFullPath, '-map', `0:${trackIndex}`,
        '-c:s', 'copy', cacheFile,
      ], { timeout: 30000, killSignal: 'SIGKILL', maxBuffer: 1024 * 1024 });
      success = true;
    } catch (err) {
      success = false;
    }
  }

  if (!success) {
    try {
      await execFileAsync('ffmpeg', [
        '-nostdin', '-threads', '1', '-loglevel', 'error', '-y',
        '-i', videoFullPath, '-map', `0:${trackIndex}`,
        '-c:s', 'ass', cacheFile,
      ], { timeout: 30000, killSignal: 'SIGKILL', maxBuffer: 1024 * 1024 });
    } catch (err) {
      throw new Error('FFmpeg failed to extract and transcode subtitle: ' + err.message);
    }
  }

  if (!fs.existsSync(cacheFile) || fs.statSync(cacheFile).size === 0) {
    if (fs.existsSync(cacheFile)) {
      try { fs.unlinkSync(cacheFile); } catch {}
    }
    throw new Error('Extracted subtitle file was empty or corrupted');
  }

  return cacheFile;
}
