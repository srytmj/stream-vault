const fs = require('fs');

let code = fs.readFileSync('server/src/subtitles.js', 'utf8');

// Change ffprobe to probe both audio and subtitles: 'a,s'
code = code.replace(
  "'-select_streams', 's',",
  "'-select_streams', 'a,s',"
);

// We need to change the parsing logic
// Instead of returning `tracks`, we return an object { tracks, requiresRemux }
const probeLogicOld = `    const data = JSON.parse(stdout);
    if (!data.streams || !Array.isArray(data.streams)) {
      probeCache.set(cacheKey, []);
      return [];
    }

    const relPath = path.relative(config.MEDIA_ROOT, videoFullPath).replace(/\\\\/g, '/');
    const encodedPath = encodeURIComponent(relPath);

    let foundDefault = false;
    const tracks = data.streams.map((stream, idx) => {
      const streamIndex = stream.index;
      const langTag = stream.tags?.language || '';
      const titleTag = stream.tags?.title || '';
      const lang = parseLanguageCode(langTag) || 'Track ' + (idx + 1);
      const format = (stream.codec_name || 'ass').toLowerCase();
      const isBitmap = ['hdmv_pgs_subtitle', 'dvd_subtitle', 'dvbsub'].includes(format);

      let label;
      if (isBitmap) {
        label = titleTag
          ? \`\${titleTag} [Blu-Ray PGS Image]\`
          : \`\${lang} [Blu-Ray PGS Image] (Track \${idx + 1})\`;
      } else {
        label = titleTag
          ? \`\${titleTag} [Softsub \${format.toUpperCase()}]\`
          : \`\${lang} [Softsub \${format.toUpperCase()}] (Track \${idx + 1})\`;
      }

      const isDefault = !isBitmap && !foundDefault;
      if (isDefault) foundDefault = true;

      return {
        label,
        lang: lang.toLowerCase().slice(0, 2),
        format,
        isBitmap,
        trackIndex: streamIndex,
        isEmbedded: true,
        url: isBitmap ? null : \`/api/subtitles/extract?path=\${encodedPath}&track=\${streamIndex}&format=\${format}\`, 
        isDefault,
      };
    });

    probeCache.set(cacheKey, tracks);
    return tracks;`;

const probeLogicNew = `    const data = JSON.parse(stdout);
    if (!data.streams || !Array.isArray(data.streams)) {
      const fallback = { tracks: [], requiresRemux: false };
      probeCache.set(cacheKey, fallback);
      return fallback;
    }

    const relPath = path.relative(config.MEDIA_ROOT, videoFullPath).replace(/\\\\/g, '/');
    const encodedPath = encodeURIComponent(relPath);

    let requiresRemux = false;
    let foundDefault = false;
    const tracks = [];
    
    // Check audio streams for unsupported formats requiring web remux
    const audioStreams = data.streams.filter((s) => s.codec_type === 'audio');
    if (audioStreams.length > 0) {
      // Check if ALL audio streams are unsupported (ac3, dts, flac, truehd, eac3)
      const unsupported = ['ac3', 'eac3', 'dts', 'truehd', 'flac'];
      const hasSupportedAudio = audioStreams.some(s => !unsupported.includes(s.codec_name?.toLowerCase()));
      if (!hasSupportedAudio) {
        requiresRemux = true;
      }
    }

    const subStreams = data.streams.filter((s) => s.codec_type === 'subtitle');

    subStreams.forEach((stream, idx) => {
      const streamIndex = stream.index;
      const langTag = stream.tags?.language || '';
      const titleTag = stream.tags?.title || '';
      const lang = parseLanguageCode(langTag) || 'Track ' + (idx + 1);
      const format = (stream.codec_name || 'ass').toLowerCase();
      const isBitmap = ['hdmv_pgs_subtitle', 'dvd_subtitle', 'dvbsub'].includes(format);

      let label;
      if (isBitmap) {
        label = titleTag
          ? \`\${titleTag} [Blu-Ray PGS Image]\`
          : \`\${lang} [Blu-Ray PGS Image] (Track \${idx + 1})\`;
      } else {
        label = titleTag
          ? \`\${titleTag} [Softsub \${format.toUpperCase()}]\`
          : \`\${lang} [Softsub \${format.toUpperCase()}] (Track \${idx + 1})\`;
      }

      const isDefault = !isBitmap && !foundDefault;
      if (isDefault) foundDefault = true;

      tracks.push({
        label,
        lang: lang.toLowerCase().slice(0, 2),
        format,
        isBitmap,
        trackIndex: streamIndex,
        isEmbedded: true,
        url: isBitmap ? null : \`/api/subtitles/extract?path=\${encodedPath}&track=\${streamIndex}&format=\${format}\`, 
        isDefault,
      });
    });

    const result = { tracks, requiresRemux };
    probeCache.set(cacheKey, result);
    return result;`;

code = code.replace(probeLogicOld, probeLogicNew);

// Wait, the cache empty fallback returns `[]` originally, now it returns `{ tracks: [], requiresRemux: false }`
code = code.replace(
  "return [];",
  "return { tracks: [], requiresRemux: false };"
);
code = code.replace(
  "return [];",
  "return { tracks: [], requiresRemux: false };"
);
code = code.replace(
  "return [];",
  "return { tracks: [], requiresRemux: false };"
);

fs.writeFileSync('server/src/subtitles.js', code);
