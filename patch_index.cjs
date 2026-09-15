const fs = require('fs');

let code = fs.readFileSync('server/src/index.js', 'utf8');

code = code.replace(
  "const trackIndex = parseInt(req.query.track || '0', 10);",
  "const trackIndex = parseInt(req.query.track || '0', 10);\n  const format = req.query.format || 'ass';"
);

code = code.replace(
  "const extractedFile = await extractEmbeddedSubtitle(fullPath, trackIndex);",
  "const extractedFile = await extractEmbeddedSubtitle(fullPath, trackIndex, format);"
);

fs.writeFileSync('server/src/index.js', code);
