const fs = require('fs');
let code = fs.readFileSync('client/src/components/VideoPlayer.jsx', 'utf8');

code = code.replace(
  /autoMini: true,[\s\S]*?fastForward: true,[\s\S]*?lock: true,/,
  'autoMini: true,'
);
fs.writeFileSync('client/src/components/VideoPlayer.jsx', code);
