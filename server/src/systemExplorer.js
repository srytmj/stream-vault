import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

const VIDEO_EXTS = new Set([
  '.mp4',
  '.mkv',
  '.webm',
  '.avi',
  '.mov',
  '.m4v',
  '.ts',
  '.wmv',
  '.flv',
]);

/**
 * Interactive filesystem directory browser for homelab storage & external drives.
 * Allows effortless folder selection without memorizing absolute paths.
 */
export function browseSystemDirectories(requestedPath = '') {
  let target = requestedPath
    ? path.resolve(requestedPath)
    : fs.existsSync(config.MEDIA_ROOT)
    ? config.MEDIA_ROOT
    : fs.existsSync('/media')
    ? '/media'
    : '/';

  if (!fs.existsSync(target)) {
    target = fs.existsSync('/media') ? '/media' : '/';
  }

  try {
    const stat = fs.statSync(target);
    if (!stat.isDirectory()) {
      target = path.dirname(target);
    }
  } catch {
    target = '/';
  }

  // Common homelab root storage locations
  const potentialRoots = [
    config.MEDIA_ROOT,
    '/hostfs',
    '/media',
    '/mnt',
    '/data',
    '/storage',
    '/root',
    '/home',
    '/',
  ].filter(Boolean);

  const seenRoots = new Set();
  const quickRoots = [];
  for (const r of potentialRoots) {
    const resolved = path.resolve(r);
    if (!seenRoots.has(resolved) && fs.existsSync(resolved)) {
      seenRoots.add(resolved);
      let label = resolved;
      if (resolved === '/') label = 'Root (/)';
      else if (resolved === config.MEDIA_ROOT) label = `Media (${resolved})`;
      else label = `${path.basename(resolved)} (${resolved})`;
      quickRoots.push({ name: label, path: resolved });
    }
  }

  // Breadcrumbs
  const parts = target.split(path.sep).filter(Boolean);
  const breadcrumbs = [{ name: 'Root', path: '/' }];
  let currentAcc = '';
  for (const part of parts) {
    currentAcc += '/' + part;
    breadcrumbs.push({ name: part, path: currentAcc });
  }

  const parentPath = target === '/' ? null : path.dirname(target);
  const folders = [];
  let videoFilesCount = 0;
  const videoSamples = [];

  try {
    const entries = fs.readdirSync(target, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.name.startsWith('.') && ent.name !== '.media') continue;
      // Skip Linux virtual filesystems at root
      if (
        target === '/' &&
        ['proc', 'sys', 'dev', 'run', 'boot', 'lost+found'].includes(ent.name)
      ) {
        continue;
      }

      const fullEntryPath = path.join(target, ent.name);
      try {
        const s = fs.statSync(fullEntryPath);
        if (s.isDirectory()) {
          let subCount = 0;
          let vCount = 0;
          try {
            const childEntries = fs.readdirSync(fullEntryPath, { withFileTypes: true });
            for (const c of childEntries) {
              if (c.name.startsWith('.')) continue;
              if (c.isDirectory()) {
                subCount++;
              } else if (VIDEO_EXTS.has(path.extname(c.name).toLowerCase())) {
                vCount++;
              }
            }
          } catch {}

          folders.push({
            name: ent.name,
            path: fullEntryPath,
            subfolderCount: subCount,
            videoCount: vCount,
          });
        } else if (VIDEO_EXTS.has(path.extname(ent.name).toLowerCase())) {
          videoFilesCount++;
          if (videoSamples.length < 5) {
            videoSamples.push(ent.name);
          }
        }
      } catch {}
    }
  } catch {}

  folders.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  );

  return {
    currentPath: target,
    parentPath,
    breadcrumbs,
    quickRoots,
    folders,
    videoFilesCount,
    videoSamples,
  };
}
