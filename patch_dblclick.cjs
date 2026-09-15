const fs = require('fs');

let code = fs.readFileSync('client/src/components/VideoPlayer.jsx', 'utf8');

// 1. Inject double tap logic after art.on('ready')
const injectPoint = "    art.on('ready', () => {";
const doubleTapLogic = `    // Custom Double Tap / Double Click to Seek & Fullscreen
    let lastTapTime = 0;
    art.template.$video.addEventListener('click', (e) => {
      const now = Date.now();
      if (now - lastTapTime < 300) {
        // It's a double tap!
        const rect = art.template.$video.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        
        if (x < width * 0.3) {
          art.seek = Math.max(0, art.currentTime - 5);
          art.notice.show = '-5s';
        } else if (x > width * 0.7) {
          art.seek = Math.min(art.duration, art.currentTime + 5);
          art.notice.show = '+5s';
        } else {
          art.fullscreen = !art.fullscreen;
        }
        lastTapTime = 0; // reset
      } else {
        lastTapTime = now;
      }
    });

    art.on('ready', () => {`;

code = code.replace(injectPoint, doubleTapLogic);

// 2. Disable default double touch toggle in artplayer config
code = code.replace(
  'autoMini: true,',
  'autoMini: true,\n        fastForward: true,\n        lock: true,'
);
// wait, doubleClick is not disabled. We can block default doubleClick by returning false on the doubleClick event.
code = code.replace(
  "art.on('video:loadedmetadata', () => {",
  "art.on('dblclick', () => { return false; });\n    art.on('video:loadedmetadata', () => {"
);

fs.writeFileSync('client/src/components/VideoPlayer.jsx', code);
