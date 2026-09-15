const fs = require('fs');
let code = fs.readFileSync('server/src/subtitles.js', 'utf8');

code = code.replace(
  "if (cached && cached.length > 0) return cached;",
  "if (cached && cached.tracks) return cached;"
);
code = code.replace(
  "return [];",
  "return { tracks: [], requiresRemux: false };"
);
code = code.replace(
  "return [];",
  "return { tracks: [], requiresRemux: false };"
);
code = code.replace(
  "probeCache.set(cacheKey, []);\\n    return [];",
  "probeCache.set(cacheKey, { tracks: [], requiresRemux: false });\\n    return { tracks: [], requiresRemux: false };"
);

fs.writeFileSync('server/src/subtitles.js', code);
