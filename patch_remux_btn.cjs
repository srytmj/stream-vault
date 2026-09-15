const fs = require('fs');

let code = fs.readFileSync('client/src/components/VideoPlayer.jsx', 'utf8');

// Add "Web Remux" button next to "External App" button on the header
// Instead of a button, let's just make it a toggle or an explicit button.

const externalAppBtn = `          <button
            onClick={() => setShowExternalModal(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-vault-900/80 hover:bg-vault-800 border border-white/10 text-slate-200 hover:text-white transition backdrop-blur-md text-xs font-semibold"
            title="Play in External App (VLC / Infuse / MPV)"
          >
            <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">External App</span>
          </button>`;

const remuxAndExternal = `          <button
            onClick={() => {
              const remuxUrl = appendAuthToken(\`/api/stream/remux?path=\${encodeURIComponent(mediaItem.relativePath)}\`);
              artRef.current?.switchUrl(remuxUrl);
              setVideoResolution('Web Remux (AAC Audio)');
            }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-fuchsia-600/80 hover:bg-fuchsia-500 border border-fuchsia-500/50 text-white transition backdrop-blur-md text-xs font-semibold"
            title="Fix unsupported audio (AC3/DTS) by remuxing on the server"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Fix Audio</span>
          </button>
` + externalAppBtn;

code = code.replace(externalAppBtn, remuxAndExternal);

fs.writeFileSync('client/src/components/VideoPlayer.jsx', code);
