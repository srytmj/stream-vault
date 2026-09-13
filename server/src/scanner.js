import path from 'node:path';
import fs from 'node:fs';
import { config } from './config.js';
import { findExternalSubtitles } from './subtitles.js';

/**
 * Format bytes to readable string (e.g., 1.45 GB)
 */
export function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Clean up anime and movie release names into readable titles
 * Example: "[SubsPlease] Sousou no Frieren - 01 (1080p) [9876FEDC].mkv"
 *   -> Show: "Sousou no Frieren", Episode: 1, Title: "Sousou no Frieren - Episode 01"
 */
export function parseMediaInfo(filename, parentFolderName = '') {
  const ext = path.extname(filename);
  let raw = path.basename(filename, ext);

  // Remove release groups like [SubsPlease], [Erai-raws], (1080p), [HEVC], etc.
  let clean = raw
    .replace(/^\[[^\]]+\]\s*/g, '') // remove leading [Group]
    .replace(/\s*\[[^\]]+\]/g, '')   // remove trailing [Hash] or [Info]
    .replace(/\s*\([^)]*(?:1080p|720p|4k|2160p|bluray|web-dl|x264|x265|hevc|aac)[^)]*\)/gi, '') // remove technical info in ()
    .trim();

  // Try parsing Season and Episode: S01E02, S1 E2, etc.
  let season = 1;
  let episode = null;
  let showName = parentFolderName;

  const sxxExxMatch = clean.match(/^(.+?)[._\s]+S(\d{1,2})[._\s]*E(\d{1,3})(?:[._\s]+(.*))?$/i);
  if (sxxExxMatch) {
    showName = sxxExxMatch[1].replace(/[._]/g, ' ').trim() || parentFolderName;
    season = parseInt(sxxExxMatch[2], 10);
    episode = parseInt(sxxExxMatch[3], 10);
  } else {
    // Try anime style: "Show Name - 01" or "Show Name - Episode 01"
    const epMatch = clean.match(/^(.+?)\s*-\s*(?:Episode\s*|Ep\s*|#)?(\d{1,3})(?:\s*-\s*(.*))?$/i);
    if (epMatch) {
      showName = epMatch[1].replace(/[._]/g, ' ').trim() || parentFolderName;
      episode = parseInt(epMatch[2], 10);
    } else {
      // Standalone episode number at the end
      const standaloneMatch = clean.match(/^(.+?)[._\s]+(?:E|EP|Episode)[._\s]*(\d{1,3})$/i);
      if (standaloneMatch) {
        showName = standaloneMatch[1].replace(/[._]/g, ' ').trim() || parentFolderName;
        episode = parseInt(standaloneMatch[2], 10);
      }
    }
  }

  // Detect release year in title e.g. "Your Name (2016)"
  const yearMatch = raw.match(/\b(19\d\d|20\d\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : null;

  if (!showName && parentFolderName) {
    showName = parentFolderName;
  }
  if (!showName) {
    showName = clean.replace(/[._]/g, ' ').trim();
  }

  // Final display title
  let displayTitle = clean;
  if (episode !== null) {
    displayTitle = `${showName} - Episode ${String(episode).padStart(2, '0')}`;
  }

  return {
    rawName: raw,
    cleanName: clean,
    displayTitle,
    showName,
    season,
    episode,
    year,
  };
}

/**
 * Find poster/thumbnail image in directory
 */
function findPosterImage(fullDir, baseName = '') {
  try {
    if (!fs.existsSync(fullDir)) return null;
    const files = fs.readdirSync(fullDir);

    // 1. Look for specific baseName image e.g. "Frieren.jpg"
    if (baseName) {
      for (const f of files) {
        const ext = path.extname(f).toLowerCase();
        if (config.ALLOWED_POSTER_EXTENSIONS.includes(ext)) {
          if (path.basename(f, ext).toLowerCase() === baseName.toLowerCase()) {
            return f;
          }
        }
      }
    }

    // 2. Look for standard poster files: poster, cover, folder, thumb
    const standardNames = ['poster', 'cover', 'folder', 'thumb', 'artwork'];
    for (const f of files) {
      const ext = path.extname(f).toLowerCase();
      if (config.ALLOWED_POSTER_EXTENSIONS.includes(ext)) {
        const nameWithoutExt = path.basename(f, ext).toLowerCase();
        if (standardNames.includes(nameWithoutExt)) {
          return f;
        }
      }
    }
  } catch (err) {
    // ignore
  }
  return null;
}

/**
 * Recursively scans directory for video files
 */
export function scanMediaLibrary(mediaRoot = config.MEDIA_ROOT) {
  const result = {
    scannedAt: new Date().toISOString(),
    mediaRoot,
    totalFiles: 0,
    totalSizeBytes: 0,
    categories: ['all', 'anime', 'movies', 'tv'],
    items: [],
    series: [], // Grouped view for Anime & TV Shows
  };

  if (!fs.existsSync(mediaRoot)) {
    console.warn(`Media root does not exist: ${mediaRoot}`);
    return result;
  }

  const seriesMap = new Map();

  function traverse(currentDir, relativePrefix = '') {
    let entries = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (err) {
      console.error(`Error reading ${currentDir}:`, err.message);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.posix.join(relativePrefix, entry.name);

      if (entry.isDirectory()) {
        traverse(fullPath, relPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!config.ALLOWED_VIDEO_EXTENSIONS.includes(ext)) continue;

        let stat;
        try {
          stat = fs.statSync(fullPath);
        } catch {
          continue;
        }

        // Determine category: anime, movies, tv, or default
        let category = 'anime';
        const parts = relPath.split('/');
        if (parts.length > 1) {
          const topDir = parts[0].toLowerCase();
          if (['anime', 'movies', 'tv'].includes(topDir)) {
            category = topDir;
          }
        }

        const parentFolder = parts.length > 2 ? parts[parts.length - 2] : (parts.length === 2 ? parts[0] : '');
        const meta = parseMediaInfo(entry.name, parentFolder);
        const externalSubs = findExternalSubtitles(fullPath, relPath);

        // Poster detection
        const posterFile = findPosterImage(currentDir, meta.showName);
        let posterUrl = null;
        if (posterFile) {
          const posterRelPath = path.posix.join(path.dirname(relPath), posterFile);
          posterUrl = `/api/poster?path=${encodeURIComponent(posterRelPath)}`;
        }

        const mediaItem = {
          id: Buffer.from(relPath).toString('base64url'),
          filename: entry.name,
          relativePath: relPath,
          streamUrl: `/api/stream?path=${encodeURIComponent(relPath)}`,
          category,
          title: meta.displayTitle,
          showName: meta.showName,
          season: meta.season,
          episode: meta.episode,
          year: meta.year,
          extension: ext,
          size: stat.size,
          sizeFormatted: formatBytes(stat.size),
          modifiedAt: stat.mtime.toISOString(),
          posterUrl,
          subtitles: externalSubs,
        };

        result.items.push(mediaItem);
        result.totalFiles += 1;
        result.totalSizeBytes += stat.size;

        // Group into Series if Anime or TV Show
        if (category === 'anime' || category === 'tv') {
          const seriesKey = `${category}::${meta.showName.toLowerCase()}`;
          if (!seriesMap.has(seriesKey)) {
            seriesMap.set(seriesKey, {
              id: Buffer.from(seriesKey).toString('base64url'),
              category,
              title: meta.showName,
              posterUrl,
              totalEpisodes: 0,
              totalSizeBytes: 0,
              totalSizeFormatted: '0 B',
              latestModified: stat.mtime.toISOString(),
              episodes: [],
            });
          }

          const s = seriesMap.get(seriesKey);
          s.totalEpisodes += 1;
          s.totalSizeBytes += stat.size;
          s.totalSizeFormatted = formatBytes(s.totalSizeBytes);
          if (posterUrl && !s.posterUrl) {
            s.posterUrl = posterUrl;
          }
          if (new Date(stat.mtime) > new Date(s.latestModified)) {
            s.latestModified = stat.mtime.toISOString();
          }
          s.episodes.push(mediaItem);
        }
      }
    }
  }

  traverse(mediaRoot);

  // Sort episodes within each series
  for (const s of seriesMap.values()) {
    s.episodes.sort((a, b) => {
      if (a.season !== b.season) return a.season - b.season;
      if (a.episode !== null && b.episode !== null) return a.episode - b.episode;
      return a.filename.localeCompare(b.filename, undefined, { numeric: true });
    });
    result.series.push(s);
  }

  // Sort overall series by title or latest activity
  result.series.sort((a, b) => b.latestModified.localeCompare(a.latestModified));

  // Sort raw items by modified time descending (newest first)
  result.items.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));

  return result;
}
