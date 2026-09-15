const fs = require('fs');

let code = fs.readFileSync('server/src/subtitles.js', 'utf8');

// 1. Append &format= to url
code = code.replace(
  'url: isBitmap ? null : `/api/subtitles/extract?path=${encodedPath}&track=${streamIndex}`,',
  'url: isBitmap ? null : `/api/subtitles/extract?path=${encodedPath}&track=${streamIndex}&format=${format}`, '
);

// 2. Change extractEmbeddedSubtitle to take format
const oldExtractDef = 'export async function extractEmbeddedSubtitle(videoFullPath, trackIndex = 0) {';
const newExtractDef = 'export async function extractEmbeddedSubtitle(videoFullPath, trackIndex = 0, codec = "ass") {';
code = code.replace(oldExtractDef, newExtractDef);

// 3. Change extraction logic to avoid invalid -c:s copy
code = code.replace(/  \/\/ 1. Try direct stream copy[\s\S]*?throw new Error\('Extracted subtitle file was empty or corrupted'\);\n  }/g, 
`  const isAss = codec === 'ass' || codec === 'ssa';

  let success = false;
  
  if (isAss) {
    try {
      await execFileAsync('ffmpeg', [
        '-nostdin', '-threads', '1', '-loglevel', 'error', '-y',
        '-i', videoFullPath, '-map', \`0:\${trackIndex}\`,
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
        '-i', videoFullPath, '-map', \`0:\${trackIndex}\`,
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
  }`);

fs.writeFileSync('server/src/subtitles.js', code);
