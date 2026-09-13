import path from 'node:path';
import fs from 'node:fs';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from './config.js';

const execAsync = promisify(exec);

// Language code detector for subtitle filenames
const LANG_MAP = {
  id: 'Indonesian',
  ind: 'Indonesian',
  indo: 'Indonesian',
  en: 'English',
  eng: 'English',
  ja: 'Japanese',
  jpn: 'Japanese',
  jp: 'Japanese',
  es: 'Spanish',
  spa: 'Spanish',
  fr: 'French',
  fra: 'French',
  de: 'German',
  ger: 'German',
  zh: 'Chinese',
  chi: 'Chinese',
  ko: 'Korean',
  kor: 'Korean',
  ar: 'Arabic',
  ara: 'Arabic',
  ru: 'Russian',
  rus: 'Russian',
  pt: 'Portuguese',
  por: 'Portuguese',
};

/**
 * Parses language code and label from subtitle filename
 */
export function detectSubtitleLanguage(subFilename, videoBasename = '') {
  let nameWithoutExt = subFilename.replace(/\.(ass|ssa|srt|vtt)$/i, '');
  if (videoBasename && nameWithoutExt.startsWith(videoBasename)) {
    nameWithoutExt = nameWithoutExt.slice(videoBasename.length);
  }

  const clean = nameWithoutExt.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
  const tokens = clean.split(/\s+/);

  for (const token of tokens) {
    if (LANG_MAP[token]) {
      return { lang: token, label: LANG_MAP[token] };
    }
  }

  // Regex patterns for e.g. .en.ass or _ind.ass or [Eng]
  const match = nameWithoutExt.match(/(?:[._\-\[\(])([a-z]{2,4})(?:[\]\)]|$)/i);
  if (match && LANG_MAP[match[1].toLowerCase()]) {
    const code = match[1].toLowerCase();
    return { lang: code, label: LANG_MAP[code] };
  }

  return { lang: 'und', label: 'Default / External' };
}

/**
 * Finds external companion subtitle files for a given video file
 */
export function findExternalSubtitles(videoFullPath, videoRelPath) {
  const dir = path.dirname(videoFullPath);
  const ext = path.extname(videoFullPath);
  const baseName = path.basename(videoFullPath, ext);

  const subtitles = [];

  try {
    if (!fs.existsSync(dir)) return subtitles;
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const fileExt = path.extname(file).toLowerCase();
      if (!config.ALLOWED_SUBTITLE_EXTENSIONS.includes(fileExt)) continue;

      // Check if file starts with the same base name or matches
      const subBase = path.basename(file, fileExt);
      if (subBase === baseName || subBase.startsWith(baseName)) {
        const { lang, label } = detectSubtitleLanguage(file, baseName);
        const subRelPath = path.posix.join(path.dirname(videoRelPath), file);

        subtitles.push({
          label: `${label} (${fileExt.replace('.', '').toUpperCase()})`,
          lang,
          format: fileExt.replace('.', '').toLowerCase(),
          filename: file,
          url: `/api/subtitles?path=${encodeURIComponent(subRelPath)}`,
          isDefault: subtitles.length === 0,
        });
      }
    }
  } catch (err) {
    console.error('Error finding subtitles for', videoFullPath, err);
  }

  return subtitles;
}

/**
 * Checks whether ffmpeg is available for subtitle-only extraction
 */
let isFfmpegAvailableCached = null;
export async function checkFfmpegAvailable() {
  if (isFfmpegAvailableCached !== null) return isFfmpegAvailableCached;
  try {
    await execAsync('ffmpeg -version');
    isFfmpegAvailableCached = true;
  } catch {
    isFfmpegAvailableCached = false;
  }
  return isFfmpegAvailableCached;
}

/**
 * Extract embedded subtitle from MKV (zero transcode: purely text stream dump)
 */
export async function extractEmbeddedSubtitle(videoFullPath, streamIndex = 0) {
  const hasFfmpeg = await checkFfmpegAvailable();
  if (!hasFfmpeg) {
    throw new Error('FFmpeg not installed on host for embedded subtitle extraction.');
  }

  const stat = fs.statSync(videoFullPath);
  const cacheKey = `${path.basename(videoFullPath)}_${stat.size}_${stat.mtimeMs}_s${streamIndex}.ass`;
  const cacheSubDir = path.join(config.CACHE_DIR, 'subtitles');
  
  if (!fs.existsSync(cacheSubDir)) {
    fs.mkdirSync(cacheSubDir, { recursive: true });
  }

  const outPath = path.join(cacheSubDir, cacheKey);
  if (fs.existsSync(outPath)) {
    return outPath;
  }

  // Pure text stream copy (-c:s copy), takes <50ms with 0% CPU overhead
  const cmd = `ffmpeg -nostdin -loglevel error -y -i "${videoFullPath}" -map 0:s:${streamIndex} -c:s copy "${outPath}"`;
  await execAsync(cmd);
  return outPath;
}
