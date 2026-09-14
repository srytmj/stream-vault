import path from 'node:path';
import fs from 'node:fs';
import { config } from './config.js';
import { findExternalSubtitles } from './subtitles.js';
import { findExactCompanionPoster } from './thumbnails.js';

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

  // Strip release groups: [SubsPlease], [Erai-raws], (1080p), [HEVC], etc.
  let clean = raw
    .replace(/\[[a-zA-Z0-9_\-\s.]+\]/g, '')
    .replace(/\([a-zA-Z0-9_\-\s.]+\)/g, '')
    .trim();

  // Pattern: "Show Name - 01" or "Show Name S01E01"
  let showName = parentFolderName || 'Unknown';
  let season = 1;
  let episode = null;
  let year = null;

  // Check for Year in parens, e.g. "Your Name (2016)"
  const yearMatch = raw.match(/\b(19\d\d|20\d\d)\b/);
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
  }

  // Check for SxxExx or Sxx.Exx
  const seMatch = clean.match(/s(\d+)[\.\s_-]*e(\d+)/i);
  if (seMatch) {
    season = parseInt(seMatch[1], 10);
    episode = parseInt(seMatch[2], 10);
    const beforeSe = clean.slice(0, seMatch.index).trim();
    if (beforeSe) {
      showName = beforeSe.replace(/[\._\-]+/g, ' ').trim();
    }
  } else {
    // Check for " - 01" or " - Episode 01" or "E01"
    const epMatch = clean.match(/[\s_\.\-]+(?:ep|episode)?\s*(\d{1,4})(?:\s*v\d)?$/i);
    if (epMatch) {
      episode = parseInt(epMatch[1], 10);
      const beforeEp = clean.slice(0, epMatch.index).trim();
      if (beforeEp) {
        showName = beforeEp.replace(/[\._\-]+/g, ' ').trim();
      }
    } else {
      // Fallback: use raw clean name as title
      showName = clean.replace(/[\._\-]+/g, ' ').trim() || parentFolderName || raw;
    }
  }

  // Format final readable display title
  let displayTitle = showName;
  if (episode !== null) {
    const epStr = String(episode).padStart(2, '0');
    displayTitle = `${showName} - E${epStr}`;
  } else if (year) {
    displayTitle = `${showName} (${year})`;
  }

  return {
    showName: showName || 'Unknown Show',
    displayTitle,
    season,
    episode,
    year,
    rawBaseName: raw,
  };
}

/**
 * Searches for poster/cover artwork in the current directory or show name
 */
export function findPosterImage(dirPath, showName) {
  try {
    const files = fs.readdirSync(dirPath);
    // Prioritize standard cover/poster names
    const preferredNames = ['poster', 'cover', 'folder', 'thumb', 'artwork'];

    for (const name of preferredNames) {
      for (const ext of config.ALLOWED_POSTER_EXTENSIONS) {
        const target = `${name}${ext}`;
        if (files.some((f) => f.toLowerCase() === target)) {
          return files.find((f) => f.toLowerCase() === target);
        }
      }
    }

    // Match show name directly
    if (showName) {
      const cleanShow = showName.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const f of files) {
        const ext = path.extname(f).toLowerCase();
        if (config.ALLOWED_POSTER_EXTENSIONS.includes(ext)) {
          const fBase = path.basename(f, ext).toLowerCase().replace(/[^a-z0-9]/g, '');
          if (fBase === cleanShow || fBase.includes(cleanShow)) {
            return f;
          }
        }
      }
    }
  } catch (err) {
    // ignore
  }

  return null;
}

/**
 * Recursively scans mediaRoot directory for media files
 */
export function scanMediaLibrary(mediaRoot) {
  const result = {
    items: [],
    series: [],
    totalFiles: 0,
    totalSizeBytes: 0,
  };

  const seriesMap = new Map();

  function traverse(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (err) {
      console.warn(`Could not read dir: ${currentDir}`, err.message);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip hidden dot directories
        if (!entry.name.startsWith('.')) {
          traverse(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!config.ALLOWED_VIDEO_EXTENSIONS.includes(ext)) {
          continue;
        }

        const relPath = path.relative(mediaRoot, fullPath).replace(/\\/g, '/');

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

        // Poster detection: check directory poster for show/series
        const dirPosterFile = findPosterImage(currentDir, meta.showName);
        let dirPosterUrl = null;
        if (dirPosterFile) {
          const posterRelPath = path.posix.join(path.dirname(relPath), dirPosterFile);
          dirPosterUrl = `/api/poster?path=${encodeURIComponent(posterRelPath)}`;
        }

        // Check for exact companion poster for this specific file only
        const companion = findExactCompanionPoster(fullPath);
        let itemPosterUrl = null;
        if (companion) {
          const compRelPath = path.relative(config.MEDIA_ROOT, companion).replace(/\\/g, '/');
          itemPosterUrl = `/api/poster?path=${encodeURIComponent(compRelPath)}`;
        } else if (category === 'movies' && dirPosterUrl) {
          // For standalone movies, dir poster can be used if no exact match
          itemPosterUrl = dirPosterUrl;
        }

        const thumbnailUrl = `/api/thumbnail?path=${encodeURIComponent(relPath)}`;

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
          posterUrl: itemPosterUrl,
          thumbnailUrl,
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
              posterUrl: dirPosterUrl || thumbnailUrl,
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
          if (dirPosterUrl && !s.posterUrl) {
            s.posterUrl = dirPosterUrl;
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
