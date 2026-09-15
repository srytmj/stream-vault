const fs = require('fs');
let code = fs.readFileSync('server/src/index.js', 'utf8');

code = code.replace(
  "const embeddedSubs = await probeEmbeddedSubtitles(fullPath);\\n\\n  const combined = [...companionSubs, ...embeddedSubs];",
  `const embeddedData = await probeEmbeddedSubtitles(fullPath);
  const embeddedSubs = embeddedData.tracks || [];
  const requiresRemux = embeddedData.requiresRemux || false;

  const combined = [...companionSubs, ...embeddedSubs];`
);

code = code.replace(
  "return reply.send(combined);",
  "return reply.send({ tracks: combined, requiresRemux });"
);

fs.writeFileSync('server/src/index.js', code);
