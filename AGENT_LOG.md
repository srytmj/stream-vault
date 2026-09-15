# StreamVault Agent Activity Log

This log tracks tasks, concurrent modifications, and critical architectural updates across autonomous subagents working on StreamVault.

## Log Entries

- **2026-09-13T16:00:00Z** | Agent: Antigravity | Status: `[COMPLETED]` - Initial architecture review and repo bootstrap
- **2026-09-13T16:45:00Z** | Agent: Antigravity | Status: `[COMPLETED]` - Multi-library support, folder explorer with breadcrumbs, and 3-mode folder thumbnails
- **2026-09-13T17:30:00Z** | Agent: Antigravity | Status: `[COMPLETED]` - Authentication system, OIDC/SSO, and user profiles
- **2026-09-14T06:50:00Z** | Agent: Antigravity | Status: `[COMPLETED]` - Subprocess guard queue, RAM safety, and homelab documentation
  - Created `server/src/processQueue.js` with bounded concurrency (default 1 concurrent subprocess) and memory checks before spawn
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

- **2026-09-14T17:25:00Z** | Agent: Antigravity | Status: `[COMPLETED]` - Fix video playback bug across mobile/PC and build Jellyfin-style Home page (Libraries, Continue Watching, Recently Added in {library})
  - Replaced corrupted 131-byte stub `anime/Sousou no Frieren/[SubsPlease] Sousou no Frieren - 04 (1080p).mkv` with valid media buffer; updated `scripts/setup-sample-media.js`
  - Fixed video stream delivery in `server/src/streamer.js` and `server/src/index.js`: added magic byte container sniffing (`ftyp` detection for MP4 inside MKV wrapper) and support for `HEAD` requests (critical for mobile Safari / iOS Range preflights)
  - Fixed client authentication handling for HTML5 video tags in `client/src/utils/api.js` (`setStoredToken` sets cookie `sv_token` and `appendAuthToken` attaches token parameter)
  - Upgraded `client/src/components/VideoPlayer.jsx`: added `appendAuthToken` for stream and custom type handlers, mobile unmuted autoplay fallback notice, direct play error boundary, and "Play in External App" modal (VLC, Infuse, Android Intent, and Direct Link copy)
  - Fixed watch history data format mismatch in `client/src/utils/storage.js`: added `getWatchHistoryList()` returning an array sorted by `updatedAt` descending
  - Upgraded `client/src/components/ContinueWatching.jsx`: converted to horizontal responsive Jellyfin carousel with time remaining badge, progress bar, quick remove, and smooth scrolling
  - Created `client/src/components/JellyfinHome.jsx`: Jellyfin-styled landing page with top "My Media" library cards (Anime, Movies, TV Series, custom folders), "Continue Watching" strip, and dedicated "Recently Added in {Library Name}" carousels
  - Integrated Jellyfin Home into `client/src/App.jsx` and `client/src/components/Navbar.jsx` with default home route and URL state synchronization
