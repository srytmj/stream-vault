import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { formatBytes } from './scanner.js';
import { findCompanionSubtitles } from './subtitles.js';
import {
  findExactCompanionPoster,
  resolveFolderPoster,
  getFolderConfig,
} from './thumbnails.js';

/**
 * Browses a specific subfolder within a library root path
 */
export function browseFolder(libraryRoot, relativeSubpath = '') {
  // Normalize and prevent directory traversal
  let cleanSubpath = relativeSubpath
    ? path.normalize(relativeSubpath).replace(/^(\.\.[\/\\])+/, '').replace(/^\//, '')
    : '';
  if (cleanSubpath === '.') cleanSubpath = '';

  const targetDir = path.resolve(libraryRoot, cleanSubpath);

  if (!targetDir.startsWith(path.resolve(libraryRoot))) {
    throw new Error('Access denied: Cannot browse outside library boundary');
  }

  if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    throw new Error(`Directory not found: ${cleanSubpath}`);
  }

  const entries = fs.readdirSync(targetDir, { withFileTypes: true });

  // Build breadcrumbs
  const breadcrumbs = [];
  const parts = cleanSubpath ? cleanSubpath.split(path.sep).filter((p) => p && p !== '.') : [];
  let currentAccum = '';
  for (const part of parts) {
    currentAccum = currentAccum ? path.join(currentAccum, part) : part;
    breadcrumbs.push({
      name: part,
      subpath: currentAccum.replace(/\\/g, '/'),
    });
  }

  // Resolve current folder's poster according to 3 modes
  const currentRelToMedia = path.relative(config.MEDIA_ROOT, targetDir).replace(/\\/g, '/');
  const folderPosterUrl = resolveFolderPoster(targetDir, currentRelToMedia);
  const currentFolderConfig = getFolderConfig(currentRelToMedia);

  const folders = [];
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const fullPath = path.join(targetDir, entry.name);
    const itemSubpath = cleanSubpath
      ? path.join(cleanSubpath, entry.name).replace(/\\/g, '/')
      : entry.name;

    if (entry.isDirectory()) {
      // Calculate item count and discover folder thumbnail inside subfolder
      let childCount = 0;
      let hasVideos = false;

      try {
        const subEntries = fs.readdirSync(fullPath, { withFileTypes: true });
        for (const sub of subEntries) {
          if (sub.name.startsWith('.')) continue;
          childCount++;
          if (sub.isFile()) {
            const ext = path.extname(sub.name).toLowerCase();
            if (config.ALLOWED_VIDEO_EXTENSIONS.includes(ext)) {
              hasVideos = true;
            }
          }
        }
      } catch {}

      // Resolve subfolder poster according to 3 modes:
      // Mode 1: Auto (picks folder poster or video thumbnail from inside)
      // Mode 2: Custom (custom uploaded image)
      // Mode 3: None (empty / default folder icon)
      const subfolderRelToMedia = path.relative(config.MEDIA_ROOT, fullPath).replace(/\\/g, '/');
      const subfolderPosterUrl = resolveFolderPoster(fullPath, subfolderRelToMedia);
      const subfolderConfig = getFolderConfig(subfolderRelToMedia);

      folders.push({
        name: entry.name,
        subpath: itemSubpath,
        childCount,
        hasVideos,
        posterUrl: subfolderPosterUrl,
        thumbnailMode: subfolderConfig.mode || 'auto',
      });
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!config.ALLOWED_VIDEO_EXTENSIONS.includes(ext)) continue;

      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        continue;
      }

      const relToMedia = path.relative(config.MEDIA_ROOT, fullPath).replace(/\\/g, '/');
      const encodedMedia = encodeURIComponent(relToMedia);
      const subtitles = findCompanionSubtitles(fullPath);

      // Check ONLY for exact file-specific companion poster (e.g. videoName.jpg / videoName.svg)
      let filePosterUrl = null;
      const companion = findExactCompanionPoster(fullPath);
      if (companion) {
        const relPoster = path.relative(config.MEDIA_ROOT, companion).replace(/\\/g, '/');
        filePosterUrl = `/api/poster?path=${encodeURIComponent(relPoster)}`;
      }

      // Thumbnail URL for this specific video (using high-performance server ffmpeg/cache)
      const thumbnailUrl = `/api/thumbnail?path=${encodedMedia}`;

      // Clean display title
      const baseNoExt = path.basename(entry.name, ext);
      const cleanTitle = baseNoExt
        .replace(/\[[^\]]*\]/g, '')
        .replace(/\([^\)]*\)/g, '')
        .replace(/\./g, ' ')
        .replace(/_+/g, ' ')
        .trim();

      files.push({
        id: Buffer.from(itemSubpath).toString('base64url'),
        filename: entry.name,
        subpath: itemSubpath,
        relativePath: relToMedia,
        title: cleanTitle || baseNoExt,
        extension: ext,
        size: stat.size,
        sizeFormatted: formatBytes(stat.size),
        modifiedAt: stat.mtime.toISOString(),
        streamUrl: `/api/stream?path=${encodedMedia}`,
        posterUrl: filePosterUrl,
        thumbnailUrl: thumbnailUrl,
        subtitles,
      });
    }
  }

  // Sort folders alphabetically, files alphabetically
  folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  files.sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: 'base' }));

  return {
    currentSubpath: cleanSubpath.replace(/\\/g, '/'),
    breadcrumbs,
    posterUrl: folderPosterUrl,
    folderConfig: currentFolderConfig,
    folders,
    files,
    totalFolders: folders.length,
    totalFiles: files.length,
  };
}
