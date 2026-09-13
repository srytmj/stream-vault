import path from 'node:path';
import fs from 'node:fs';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from './config.js';

const execAsync = promisify(exec);

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
      const encodedPath = encodeURIComponent(relPath);

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
    await execAsync('ffmpeg -version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Probe embedded subtitle tracks inside MKV/MP4 containers via ffprobe or ffmpeg
 */
export async function probeEmbeddedSubtitles(videoFullPath) {
  const hasFfmpeg = await checkFfmpegAvailable();
  if (!hasFfmpeg) return [];

  try {
    // ffprobe json inspection for subtitle streams
    const { stdout } = await execAsync(
      `ffprobe -v error -select_streams s -show_entries stream=index,codec_name:stream_tags=language,title -of json "${videoFullPath}"`
    );
    const data = JSON.parse(stdout);
    if (!data.streams || !Array.isArray(data.streams)) return [];

    const relPath = path.relative(config.MEDIA_ROOT, videoFullPath);
    const encodedPath = encodeURIComponent(relPath);

    return data.streams.map((stream, idx) => {
      const streamIndex = stream.index;
      const langTag = stream.tags?.language || '';
      const titleTag = stream.tags?.title || '';
      const lang = parseLanguageCode(langTag) || 'Track ' + (idx + 1);
      const format = (stream.codec_name || 'ass').toLowerCase();
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
    });
  } catch (err) {
    return [];
  }
}

/**
 * Extract embedded subtitle stream using raw copy (-c:s copy)
 */
export async function extractEmbeddedSubtitle(videoFullPath, trackIndex = 0) {
  const hashName = Buffer.from(videoFullPath + trackIndex).toString('hex').slice(0, 24);
  const cacheFile = path.join(config.CACHE_DIR, 'subtitles', `${hashName}.ass`);

  if (fs.existsSync(cacheFile) && fs.statSync(cacheFile).size > 0) {
    return cacheFile;
  }

  const subCacheDir = path.join(config.CACHE_DIR, 'subtitles');
  if (!fs.existsSync(subCacheDir)) {
    fs.mkdirSync(subCacheDir, { recursive: true });
  }

  const cmd = `ffmpeg -y -i "${videoFullPath}" -map 0:${trackIndex} -c:s copy "${cacheFile}"`;
  await execAsync(cmd);
  return cacheFile;
}
