const fs = require('fs');

let code = fs.readFileSync('server/src/subtitles.js', 'utf8');

code = code.replace(
  "const hashName = Buffer.from(videoFullPath + trackIndex).toString('hex').slice(0, 24);",
  "const hashName = Buffer.from(videoFullPath + trackIndex + 'v2').toString('hex').slice(0, 24);"
);

fs.writeFileSync('server/src/subtitles.js', code);
