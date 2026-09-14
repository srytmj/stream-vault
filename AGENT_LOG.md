# 🛡️ Agent Activity & Concurrency Lock Log (`AGENT_LOG.md`)

This log tracks multi-agent concurrency locks and task execution states for `stream-vault`. Concurrent AI agents must consult and update this file before and after touching any code or documentation.

---

## 🔒 Concurrency Protocol & Lock States

- `[IN PROGRESS] - <Brief Description of the Task>`:  
  Indicates an agent is actively modifying specific files or features. **Other agents MUST NOT touch conflicting components until unlocked.**
- `[COMPLETED] - <Brief Description of the Task>`:  
  Indicates task completion, testing, and unlocking.

---

## 📝 Activity & Lock Register

- **2026-09-13T15:54:36Z** | Agent: Antigravity | Status: `[COMPLETED]` - Initialize Concurrent Workflow Guardrails framework
  - Created `AGENT_LOG.md` tracking register
  - Configured multi-agent locking rules in `.cursorrules`
  - Configured workflow protocols in `CLAUDE.md`

- **2026-09-13T15:55:41Z** | Agent: Antigravity | Status: `[COMPLETED]` - Setup real open-source demo media videos and styled ASS subtitles
  - Downloaded real open-source H.264 video sample (Big Buck Bunny, Creative Commons)
  - Populated `/media/anime`, `/media/movies`, and `/media/tv` with realistic MKV and MP4 files
  - Created customized `.ass` anime subtitles with karaoke tags, colors, and fonts
  - Created high-res SVG poster artworks for anime, movie, and TV series
  - Added `.svg` support to scanner and poster streamer in `config.js`
  - Verified HTTP 206 Byte-Range streaming and JASSUB WebAssembly subtitle rendering

- **2026-09-13T16:00:43Z** | Agent: Antigravity | Status: `[COMPLETED]` - Push commits to remote origin (`https://github.com/srytmj/stream-vault`)
  - Successfully pushed `main` branch to upstream repository
  - Working tree clean, all features and demo files synchronized

- **2026-09-13T16:22:49Z** | Agent: Antigravity | Status: `[COMPLETED]` - Custom libraries, hierarchical folder view, file explorer modes, and softsub discovery
  - Built custom dynamic library manager (`server/src/libraries.js`) with persistent JSON storage and CRUD APIs (`/api/libraries`)
  - Implemented hierarchical folder explorer (`server/src/explorer.js`) with interactive breadcrumbs and recursive directory traversal (`/api/browse`)
  - Built front-end Folder Explorer component (`FolderExplorer.jsx`) and Add Library modal (`AddLibraryModal.jsx`)
  - Added multi-mode File Explorer display switcher: Poster Grid (Large), Compact Icons (Medium), and Details Table with file size, modified date, format, and subtitle badges
  - Implemented embedded MKV/MP4 softsub probe and extraction (`subtitles.js`)
  - Added "Direct Play: Original (Hardware Accelerated)" quality and zero-transcode badge to player controls

- **2026-09-13T16:44:11Z** | Agent: Antigravity | Status: `[COMPLETED]` - Full UI/UX audit and bugfix: modal auto-opening, click interception, overlay z-index, keyboard shortcut collisions
  - Added `isOpen` guard clauses to `StatsModal.jsx` and `KeyboardShortcutsModal.jsx` to stop premature rendering on page load
  - Implemented backdrop click-outside-to-close handlers on all modals (`StatsModal`, `KeyboardShortcutsModal`, `SeriesModal`, `AddLibraryModal`) with `stopPropagation()` on dialog containers
  - Added global `Escape` keyboard listener to effortlessly dismiss any active modal
  - Passed `mediaStats` correctly to `StatsModal`
  - Rebuilt client bundle and verified clean boot

- **2026-09-13T17:03:45Z** | Agent: Antigravity | Status: `[COMPLETED]` - Visual thumbnails per folder and per video file (0% server transcode)
  - Enhanced `server/src/explorer.js` to discover folder artwork and companion file poster images
  - Built `VideoThumbnail.jsx` with zero-transcode client-side HTML5 canvas snapshot generator and in-memory caching
  - Updated `FolderExplorer.jsx` to show visual subfolder poster cards with badge counts and 16:9 video thumbnails
  - Added Grid, Compact, and Details Table view switchers inside `FolderExplorer.jsx`
  - Integrated `VideoThumbnail` into `MediaCard.jsx` and `MediaGrid.jsx` Details table

- **2026-09-14T05:50:30Z** | Agent: Antigravity | Status: `[COMPLETED]` - Fix OOM crash-loop: FFmpeg concurrency queue, hard timeouts, stream/thread flags, negative cache, persistent cache volumes, and doc/banner alignment
  - Created lightweight asynchronous process queue (`server/src/processQueue.js`) with configurable concurrency (`FFMPEG_MAX_CONCURRENCY=1`) and low-memory pre-spawn safeguards
  - Updated `server/src/thumbnails.js` with request deduplication (`inFlightGenerations`), strict FFmpeg flags (`-nostdin`, `-threads 1`, `-sn`, `-an`, `-dn`), 15s hard timeout with `SIGKILL`, and persistent SVG negative caching (`knownFailedHashes`) to permanently eliminate restart crash-loops
  - Updated `server/src/subtitles.js` with guarded queue execution for `ffprobe` (15s timeout, single thread) and `ffmpeg -c:s copy` (30s timeout, single thread) plus in-memory probe caching
  - Updated `server/src/config.js` to properly resolve `CACHE_DIR` and `DATA_DIR` across container and host environments
  - Updated `docker-compose.yml` and `Dockerfile` to increase memory limit to 512M (128M reservation), map persistent volumes for `/app/.cache` and `/app/data`, and configure concurrency environment variables
  - Aligned server startup banner and `/api/health` metrics to transparently report subprocess helper status and memory requirements
  - Created `docs/services.md` and updated `README.md` for homelab service inventory registration
  - Rebuilt client assets and verified with synthetic tests (0ms negative cache hit, zero runaway processes)

- **2026-09-14T07:16:10Z** | Agent: Antigravity | Status: `[COMPLETED]` - Add Zombie Process Protection: tini init daemon, docker init: true, and pids_limit cgroup guard
  - Added `tini` to Alpine runner image in `Dockerfile` and configured `ENTRYPOINT ["/sbin/tini", "--"]` to act as PID 1 zombie reaper
  - Added `init: true` and `pids_limit: 100` (`deploy.resources.limits.pids: 100`) to `docker-compose.yml` to prevent fork bombs and guarantee PID table safety on the host LXC
  - Updated `docs/services.md` to document zombie process reaping and process limits
