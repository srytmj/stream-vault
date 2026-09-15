const fs = require('fs');
let code = fs.readFileSync('client/src/components/VideoPlayer.jsx', 'utf8');

const fetchLogicOld = `    if (itemPath) {
      fetchSubtitleTracks(itemPath)
        .then((tracks) => {
          if (Array.isArray(tracks) && tracks.length > 0) {
            setAvailableSubtitles(tracks);
            const def = tracks.find((t) => t.isDefault) || tracks[0];
            if (def) setActiveSubtitle(def);
          }
        })
        .catch(() => {});
    }`;

const fetchLogicNew = `    if (itemPath) {
      fetchSubtitleTracks(itemPath)
        .then((data) => {
          // Backward compatibility check
          const tracks = Array.isArray(data) ? data : data.tracks || [];
          const requiresRemux = data.requiresRemux || false;

          if (tracks.length > 0) {
            setAvailableSubtitles(tracks);
            const def = tracks.find((t) => t.isDefault) || tracks[0];
            if (def) setActiveSubtitle(def);
          }

          if (requiresRemux && artRef.current) {
            const remuxUrl = appendAuthToken(\`/api/stream/remux?path=\${encodeURIComponent(mediaItem.relativePath)}\`);
            artRef.current.switchUrl(remuxUrl);
            setVideoResolution('Web Remux (Auto Fixed Audio)');
          }
        })
        .catch(() => {});
    }`;

code = code.replace(fetchLogicOld, fetchLogicNew);

// And we ALSO NEED TO FIX THE DOUBLE TAP CHAOS!
// Remove the manual click listener for double tap, and change it to ONLY use Artplayer's double click logic or remove it if not needed?
// No, the user LIKES the double tap, they just didn't like play/pause interference.
// But earlier I learned I didn't prevent 'click' properly, AND artplayer catches double clicks!
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
    });`;

// Let's replace the click listener with a touchstart listener specifically for avoiding conflict with click play/pause, 
// OR just leave it and disable Artplayer's click play/pause?
// Artplayer click play/pause can be disabled via plugin or CSS?
// Actually if I use \`dblclick\` listener directly via \`art.template.$video.addEventListener('dblclick', ...)\`
const improvedDblClickLogic = `    // Prevent double tap zoom on mobile
    if (art.template.$video) {
        art.template.$video.style.touchAction = 'manipulation';
        
        // Native double click event to cleanly catch double-taps on both mobile & desktop
        art.template.$video.addEventListener('dblclick', (e) => {
          const rect = art.template.$video.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const width = rect.width;
          
          if (x < width * 0.3) {
            art.seek = Math.max(0, art.currentTime - 5);
            art.notice.show = '-5s (Rewind)';
          } else if (x > width * 0.7) {
            art.seek = Math.min(art.duration, art.currentTime + 5);
            art.notice.show = '+5s (Forward)';
          } else {
            art.fullscreen = !art.fullscreen;
          }
        });
    }`;

code = code.replace(doubleTapLogic, improvedDblClickLogic);

fs.writeFileSync('client/src/components/VideoPlayer.jsx', code);
