import path from 'node:path';
import fs from 'node:fs';
import mime from 'mime-types';
import { config } from './config.js';
import { loadLibraries } from './libraries.js';

/**
 * Validates that requested relative path stays strictly within MEDIA_ROOT
 */
export function resolveSafePath(requestedPath) {
  // requestedPath could be relative to config.MEDIA_ROOT (e.g. "anime/video.mkv")
  // or it could be a traversal going into another library (e.g. "../hostfs/mnt/...")
  const absolutePath = path.resolve(config.MEDIA_ROOT, requestedPath);

  const allowedRoots = [path.resolve(config.MEDIA_ROOT)];
  try {
    const libs = loadLibraries();
    libs.forEach(l => {
      if (fs.existsSync(l.path)) {
        allowedRoots.push(path.resolve(l.path));
      }
    });
  } catch (err) {
    console.error('Failed to load libraries for path validation:', err.message);
  }

  const isAllowed = allowedRoots.some(
    (root) =>
      absolutePath === root || absolutePath.startsWith(root + path.sep)
  );
  
  if (!isAllowed) {
    throw new Error(`Access denied: Path ${absolutePath} is outside authorized libraries`);
  }

  return absolutePath;
}

/**
 * Resolve correct MIME type for client-side HTML5 player playback.
 * Inspects initial magic bytes to handle files that may have .mkv extension but MP4 container,
 * or true Matroska / WebM EBML containers.
 */
export function getMediaMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(16);
    const bytesRead = fs.readSync(fd, buf, 0, 16, 0);
    fs.closeSync(fd);

    if (bytesRead >= 8) {
      if (buf.toString('utf8', 4, 8) === 'ftyp') {
        return 'video/mp4';
      }
      if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
        return ext === '.webm' ? 'video/webm' : 'video/x-matroska';
      }
    }
  } catch {}

  if (ext === '.mp4' || ext === '.m4v') return 'video/mp4';
  if (ext === '.webm') return 'video/webm';
  if (ext === '.mkv') return 'video/x-matroska';
  if (ext === '.mov') return 'video/quicktime';

  return mime.lookup(filePath) || 'video/mp4';
}

/**
 * Ultra-efficient Zero Server-Side Transcode HTTP 206 Partial Content Streamer
 * Supports both GET and HEAD requests, with full RFC 7233 byte range semantics.
 */
export async function handleByteRangeStream(req, reply) {
  const queryPath = req.query.path;
  if (!queryPath) {
    return reply.status(400).send({ error: 'Missing path query parameter' });
  }

  let fullPath;
  try {
    fullPath = resolveSafePath(queryPath);
  } catch (err) {
    return reply.status(403).send({ error: err.message });
  }

  if (!fs.existsSync(fullPath)) {
    return reply.status(404).send({ error: 'Media file not found' });
  }

  let stat;
  try {
    stat = fs.statSync(fullPath);
  } catch (err) {
    return reply.status(500).send({ error: 'Unable to read file stat' });
  }

  const fileSize = stat.size;
  const range = req.headers.range;
  const contentType = getMediaMimeType(fullPath);
  const isHead = req.method === 'HEAD';

  // If no range header is present, serve full file headers (HTTP 200)
  if (!range) {
    reply.code(200);
    reply.header('Content-Length', fileSize);
    reply.header('Content-Type', contentType);
    reply.header('Accept-Ranges', 'bytes');
    reply.header('Cache-Control', 'no-cache');
    reply.header('Access-Control-Allow-Origin', '*');

    if (isHead) {
      return reply.send();
    }

    const stream = fs.createReadStream(fullPath);
    return reply.send(stream);
  }

  // Parse Range header: "bytes=start-end"
  const parts = range.replace(/bytes=/, '').split('-');
  const partialStart = parts[0];
  const partialEnd = parts[1];

  let start = parseInt(partialStart, 10);
  let end = partialEnd ? parseInt(partialEnd, 10) : fileSize - 1;

  // Handle suffix range e.g. "bytes=-500"
  if (isNaN(start)) {
    start = fileSize - end;
    end = fileSize - 1;
  }

  // Validate range bounds
  if (start >= fileSize || end >= fileSize || start > end) {
    reply.code(416);
    reply.header('Content-Range', `bytes */${fileSize}`);
    reply.header('Accept-Ranges', 'bytes');
    return reply.send();
  }

  // Fast chunk seeking: allow client to request whatever chunk size it needs
  const chunkSize = end - start + 1;

  reply.code(206);
  reply.header('Content-Range', `bytes ${start}-${end}/${fileSize}`);
  reply.header('Accept-Ranges', 'bytes');
  reply.header('Content-Length', chunkSize);
  reply.header('Content-Type', contentType);
  reply.header('Cache-Control', 'no-cache');
  reply.header('Access-Control-Allow-Origin', '*');

  if (isHead) {
    return reply.send();
  }

  const stream = fs.createReadStream(fullPath, { start, end });
  return reply.send(stream);
}
