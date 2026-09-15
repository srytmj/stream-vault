import path from 'node:path';
import fs from 'node:fs';
import { config } from './config.js';
import { findExternalSubtitles } from './subtitles.js';
import { findExactCompanionPoster, getOrGenerateVideoThumbnail } from './thumbnails.js';
import { ffmpegQueue } from './processQueue.js';

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
 * Clean up anime, TV, and movie release names into readable titles.
 * Prioritizes folder-based series/show names over messy filename regex guessing.
 */
export function parseMediaInfo(filename, seriesFolderName = '', seasonFolder = '') {
  const ext = path.extname(filename);
  let raw = path.basename(filename, ext);

  // Strip release groups: [SubsPlease], [Erai-raws], (1080p), [HEVC], etc.
  let clean = raw
    .replace(/\[[a-zA-Z0-9_\-\s.]+\]/g, '')
    .replace(/\([a-zA-Z0-9_\-\s.]+\)/g, '')
    .trim();

  let season = 1;
  let episode = null;
  let year = null;

  // Detect season from folder e.g. "Season 1", "Season 02", "S2"
  if (seasonFolder) {
    const sFolderMatch = seasonFolder.match(/(?:season|s)\s*(\d+)/i);
    if (sFolderMatch) {
      season = parseInt(sFolderMatch[1], 10);
    }
  }

  // Check for Year in parens or boundary, e.g. "Your Name (2016)"
  const yearMatch = raw.match(/\b(19\d\d|20\d\d)\b/);
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
  }

  // Check for SxxExx or Sxx.Exx in filename
  const seMatch = clean.match(/s(\d+)[\.\s_-]*e(\d+)/i);
  if (seMatch) {
    season = parseInt(seMatch[1], 10);
    episode = parseInt(seMatch[2], 10);
  } else {
    // Check for " - 01" or " - Episode 01" or "E01" or standalone number at end
    const epMatch = clean.match(/[\s_\.\-]+(?:ep|episode)?\s*(\d{1,4})(?:\s*v\d)?$/i);
    if (epMatch) {
      episode = parseInt(epMatch[1], 10);
    }
  }

  const showName = seriesFolderName || clean.replace(/[\._\-]+/g, ' ').trim() || raw;

  // Format final readable display title
  let displayTitle = showName;
  if (seriesFolderName && episode !== null) {
    const epStr = String(episode).padStart(2, '0');
    displayTitle = season > 1
      ? `${seriesFolderName} - S${String(season).padStart(2, '0')}E${epStr}`
      : `${seriesFolderName} - E${epStr}`;
  } else if (episode !== null) {
    const epStr = String(episode).padStart(2, '0');
    displayTitle = `${showName} - E${epStr}`;
  } else if (year) {
    displayTitle = `${showName} (${year})`;
  } else {
    displayTitle = clean.replace(/[\._\-]+/g, ' ').trim() || raw;
  }

  return {
    showName,
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
        const target = `${name}${ext}`.toLowerCase();
        const found = files.find((f) => f.toLowerCase() === target);
        if (found) return found;
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
 * Recursively scans mediaRoot directory for media files.
 * Groups TV and Anime series STRICTLY based on folder hierarchy.
 */
export function scanMediaLibrary(mediaRoot) {
  const result = {
    items: [],      // Standalone items (movies, single videos NOT part of any series)
    series: [],     // TV & Anime series folders with grouped episodes
    allItems: [],   // All video items (both standalone and series episodes)
    totalFiles: 0,
    totalSizeBytes: 0,
    scannedAt: new Date().toISOString(),
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

        // Folder-based Series determination:
        // When category is anime or tv, the folder directly under the category is the series folder!
        // E.g., "anime/Sousou no Frieren/..." -> Series is "Sousou no Frieren"
        // E.g., "tv/Shogun/Season 1/..." -> Series is "Shogun" (with season folder "Season 1")
        let seriesFolderName = null;
        let seriesRelPath = null;
        let seriesFullPath = null;
        let seasonFolder = '';

        if (category === 'anime' || category === 'tv') {
          if (parts.length > 2) {
            // File is inside a subfolder under category
            seriesFolderName = parts[1];
            seriesRelPath = path.posix.join(parts[0], parts[1]);
            seriesFullPath = path.join(mediaRoot, parts[0], parts[1]);

            if (parts.length > 3) {
              seasonFolder = parts[2];
            }
          }
        } else if (category !== 'movies' && parts.length > 2) {
          // Mixed library: if file is in a folder, group by that folder
          seriesFolderName = parts[parts.length - 2];
          seriesRelPath = parts.slice(0, parts.length - 1).join('/');
          seriesFullPath = path.join(mediaRoot, seriesRelPath);
        }

        const meta = parseMediaInfo(entry.name, seriesFolderName, seasonFolder);
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
          absolutePath: fullPath,
          absolutePath: fullPath,
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

        result.totalFiles += 1;
        result.totalSizeBytes += stat.size;
        result.allItems.push(mediaItem);

        // Group into Series if it belongs to a series folder
        if (seriesFolderName) {
          const seriesKey = `${category}::${seriesFolderName.toLowerCase()}`;
          if (!seriesMap.has(seriesKey)) {
            // Find poster in the series root folder
            const seriesPosterFile = findPosterImage(seriesFullPath, seriesFolderName);
            let seriesPosterUrl = null;
            if (seriesPosterFile) {
              const relSeriesPoster = path.posix.join(seriesRelPath, seriesPosterFile);
              seriesPosterUrl = `/api/poster?path=${encodeURIComponent(relSeriesPoster)}`;
            }

            seriesMap.set(seriesKey, {
              id: Buffer.from(seriesKey).toString('base64url'),
              category,
              title: seriesFolderName,
              folderName: seriesFolderName,
              relativePath: seriesRelPath,
              posterUrl: seriesPosterUrl || dirPosterUrl || thumbnailUrl,
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
          if (new Date(stat.mtime) > new Date(s.latestModified)) {
            s.latestModified = stat.mtime.toISOString();
          }

          mediaItem.seriesId = s.id;
          mediaItem.seriesTitle = s.title;
          mediaItem.isEpisode = true;
          s.episodes.push(mediaItem);
        } else {
          // Standalone Movie or Single Video
          mediaItem.seriesId = null;
          mediaItem.seriesTitle = null;
          mediaItem.isEpisode = false;
          result.items.push(mediaItem);
        }
      }
    }
  }

  traverse(mediaRoot);

  // Sort episodes within each series by Season and Episode number
  for (const s of seriesMap.values()) {
    s.episodes.sort((a, b) => {
      if (a.season !== b.season) return a.season - b.season;
      if (a.episode !== null && b.episode !== null) return a.episode - b.episode;
      return a.filename.localeCompare(b.filename, undefined, { numeric: true });
    });
    result.series.push(s);
  }

  // Sort overall series by latest activity
  result.series.sort((a, b) => b.latestModified.localeCompare(a.latestModified));

  // Sort standalone items by modified time descending
  result.items.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));

  // Start background thumbnail generation so users don't wait when entering folders
  setTimeout(() => preGenerateThumbnails(result.allItems), 5000);

  return result;
}

let isBgGeneratorRunning = false;
export async function preGenerateThumbnails(allItems) {
  if (isBgGeneratorRunning) return;
  isBgGeneratorRunning = true;
  console.log(`[Background] Starting pre-generation of ${allItems.length} thumbnails...`);
  
  try {
    for (const item of allItems) {
      if (!item.absolutePath) continue;
      
      // Throttle if the system queue is already busy with user requests
      while (ffmpegQueue.queue.length > 10) {
        await new Promise(r => setTimeout(r, 2000));
      }
      
      try {
        // Enqueue generation
        await getOrGenerateVideoThumbnail(item.absolutePath).catch(() => {});
      } catch (err) {}
      
      // tiny sleep to let event loop breathe and allow user requests to jump the queue
      await new Promise(r => setTimeout(r, 200)); 
    }
    console.log('[Background] Thumbnail pre-generation completed.');
  } finally {
    isBgGeneratorRunning = false;
  }
}

