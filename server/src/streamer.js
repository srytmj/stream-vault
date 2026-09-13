import path from 'node:path';
import fs from 'node:fs';
import mime from 'mime-types';
import { config } from './config.js';

/**
 * Validates that requested relative path stays strictly within MEDIA_ROOT
 */
export function resolveSafePath(relativeFilePath, root = config.MEDIA_ROOT) {
  const safeRel = path.normalize(relativeFilePath).replace(/^(\.\.[\/\\])+/, '');
  const absolutePath = path.resolve(root, safeRel);

  if (!absolutePath.startsWith(path.resolve(root))) {
    throw new Error('Access denied: Path outside media directory');
  }

  return absolutePath;
}

/**
 * Resolve correct MIME type for client-side HTML5 player playback
 */
export function getMediaMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.mkv') {
    // Note: video/mp4 or video/webm enables native Chromium Matroska hardware decoding
    return 'video/mp4';
  }
  
  return mime.lookup(filePath) || 'video/mp4';
}

/**
 * Ultra-efficient Zero Server-Side Transcode HTTP 206 Partial Content Streamer
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

  // If no range header is present, serve full file (HTTP 200)
  if (!range) {
    reply.code(200);
    reply.header('Content-Length', fileSize);
    reply.header('Content-Type', contentType);
    reply.header('Accept-Ranges', 'bytes');
    reply.header('Cache-Control', 'no-cache');
    reply.header('Access-Control-Allow-Origin', '*');

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
  const chunkSize = (end - start) + 1;

  reply.code(206);
  reply.header('Content-Range', `bytes ${start}-${end}/${fileSize}`);
  reply.header('Accept-Ranges', 'bytes');
  reply.header('Content-Length', chunkSize);
  reply.header('Content-Type', contentType);
  reply.header('Cache-Control', 'no-cache');
  reply.header('Access-Control-Allow-Origin', '*');

  const stream = fs.createReadStream(fullPath, { start, end });
  return reply.send(stream);
}
