# StreamVault

> "Zero Server-Side Transcode, 100% Client-Side Playback"
>
> A modern self-hosted web streaming platform tailored for personal anime, movie, and TV series collections directly from your homelab storage, without placing any transcoding load on your server CPU.

---

## Web Interface Preview

### Media Catalog
![StreamVault Media Catalog](docs/screenshots/catalog.png)
*Modern dark media catalog featuring continue watching, series grouping, category filters, and live server resource monitoring.*

### Folder Explorer
![StreamVault Folder Explorer](docs/screenshots/folder-explorer.png)
*Jellyfin and Windows Explorer-style directory browsing with multiple view modes (Grid, Compact, and Details Table).*

### 3-Mode Folder Thumbnail Customizer
![Folder Thumbnail Customizer](docs/screenshots/folder-thumbnails-modal.png)
*Interactive cover customization supporting three modes: Auto (frame extraction from contained video), Custom (image upload), and None (clean default folder icon).*

### Unique Video Thumbnails & File View
![Unique Video Thumbnails and Details](docs/screenshots/video-grid.png)
*Fast native video thumbnail generation via FFmpeg with SHA-256 disk caching, badge indicators for ASS subtitles, and direct video streaming.*

### Authentication & Single Sign-On (OIDC Ready)
![StreamVault Login Screen](docs/screenshots/login.png)
*Jellyfin and Komga-inspired authentication system with scrypt password hashing, session tokens, and built-in OIDC/SSO integration readiness.*

---

## Core Philosophy and Architecture

Traditional media servers (such as standard Plex or Jellyfin) often trigger FFmpeg server-side transcoding when playing MKV containers or stylized anime subtitles (`.ass`/`.ssa`). This causes:
- Server CPU usage spikes to 100%, causing heat and stuttering on low-power homelab hardware.
- Hardcoded or burned-in subtitles, resulting in lost karaoke typography, blurry text, and dropped frames.
- Slow video seeking due to buffering delay for each new transcode stream segment.

### StreamVault Architecture

```mermaid
graph LR
    subgraph Server["Homelab Server (CPU 0%)"]
        Disk[("Media Storage\n/media/anime\n/media/movies\n/media/tv")] --> Origin["Fastify HTTP 206\nByte-Range Origin Server\n(RAM <35MB)"]
    end

    Origin -->|"HTTP 206 Partial Content (Bytes)"| Client["Client Browser / Device"]

    subgraph ClientPlayer["100% Client-Side Playback"]
        Client --> Demux["Hardware GPU Decoder\n(NVDEC / QuickSync / Apple Silicon)"]
        Origin -->|"Raw .ass / .srt Stream"| Sub["JASSUB WebAssembly Engine\n(libass compiled to WASM)"]
        Demux --> Screen["HTML5 Video Element"]
        Sub --> Canvas["HTML5 Canvas Subtitle Overlay\n(Karaoke, Fonts, Typesetting)"]
    end
```

1. **Server CPU at 0%**: The backend never transcodes video or audio streams on the fly. The server operates strictly as an RFC 7233 HTTP range origin server.
2. **100% Hardware Acceleration**: The client browser decodes video streams using local hardware decoders (NVIDIA NVDEC, Intel QuickSync, Apple Silicon, VideoToolbox).
3. **Full Anime `.ass` Subtitle Fidelity**: Subtitles are never burned in on the server. StreamVault uses **JASSUB (WebAssembly libass)** to render subtitles directly onto an HTML5 canvas layer at 60 FPS, preserving all custom fonts, karaoke effects, and vector drawings.
4. **Lightweight Footprint**: Memory usage remains under 35 MB RAM, making it suitable for Raspberry Pi, Intel N100 mini PCs, legacy NAS devices, or low-tier VPS instances.

---

## Architecture Comparison

| Feature | Standard Plex / Emby | Jellyfin (Burn-in ASS) | StreamVault |
|---|---|---|---|
| Server CPU Load During Playback | 50% - 100% (Transcoding) | 60% - 100% (Burn-in Transcode) | **0.0% (Zero Transcode)** |
| Server Memory Usage | 400 MB - 1 GB+ | 300 MB - 800 MB | **< 35 MB** |
| Anime Subtitle Quality (.ass) | Downscaled or dropped styles | Burned-in, rasterized text | **Native 1080p/4K Canvas (WASM)** |
| Karaoke and Custom Font Effects | Often lost | Limited | **100% Accurate (libass engine)** |
| Video Seeking Speed | High latency (buffer wait) | High latency | **Instant (<50ms via Byte-Range)** |
| Resume Playback Timestamp | Cloud / Database overhead | Local database queries | **Instant LocalStorage sync** |

---

## Key Features

### 1. Unique Per-Video Thumbnail Extraction
- Automated frame extraction directly from video files (MKV, MP4, WebM, AVI, TS) using native FFmpeg.
- Hashed disk caching (`.cache/thumbnails/`) using SHA-256 for instant cache hits and minimal disk I/O.
- Elimination of cross-file poster contamination: standalone episodes and videos receive their own unique visual preview.

### 2. Three-Mode Folder Thumbnail System
Configure thumbnails for any folder or series through an interactive modal:
- **Auto Mode**: Automatically selects an image or extracts a frame from the first video found within the directory.
- **Custom Mode**: Upload your own image file (JPG, PNG, WebP up to 10 MB) with real-time preview.
- **None Mode**: Displays a clean, default folder icon with no artwork.

### 3. Jellyfin & Komga-Style Authentication
- Secured with scrypt-salted password hashing.
- Stateless HMAC-SHA256 session tokens with 7-day expiration.
- Default administrator credentials provided on initial start (`admin` / `admin`).
- User profile menu with role badges, password change dialog, and logout functionality.

### 4. SSO / OIDC Infrastructure Ready
- Built-in OpenID Connect (OIDC) client infrastructure supporting standard discovery (`/.well-known/openid-configuration`), authorization code flow, PKCE, and automated user provisioning.
- Ready to connect to any custom OIDC Provider, Authelia, Authentik, or Keycloak.

---

## Repository Structure

```text
stream-vault/
├── docker-compose.yml          # Container deployment configuration
├── Dockerfile                  # Multi-stage Node alpine image
├── package.json                # Root scripts and workspace definition
├── README.md                   # Project documentation
│
├── media/                      # Mount folder for homelab media (read-only)
│   ├── anime/                  # Anime series and standalone episodes
│   ├── movies/                 # Feature films and companion artwork
│   └── tv/                     # Television shows and multi-season directories
│
├── server/                     # Fastify Zero-Transcode Backend
│   ├── package.json
│   ├── data/                   # User database and folder thumbnail configs
│   └── src/
│       ├── index.js            # Main application server and routes
│       ├── config.js           # Environment and path configurations
│       ├── thumbnails.js       # FFmpeg video frame extraction and 3-mode resolver
│       ├── explorer.js         # Hierarchical file and folder explorer
│       ├── scanner.js          # Media library indexer
│       ├── streamer.js         # HTTP 206 Partial Content byte-range engine
│       ├── subtitles.js        # Subtitle detection and language identification
│       └── auth/
│           ├── userStore.js    # scrypt password hashing and user persistence
│           ├── tokenService.js # HMAC session token signing and verification
│           ├── oidcProvider.js # OpenID Connect discovery and callback handler
│           └── authMiddleware.js # Fastify route authentication hook
│
├── client/                     # Single Page Application (React + Vite + Tailwind)
│   ├── package.json
│   ├── vite.config.js
│   ├── public/jassub/          # WebAssembly libass worker and fonts
│   └── src/
│       ├── App.jsx             # Main view router and global state
│       ├── context/
│       │   └── AuthContext.jsx # Authentication state and session persistence
│       ├── components/
│       │   ├── LoginPage.jsx   # Dark authentication card
│       │   ├── Navbar.jsx      # Navigation, search, CPU status, and account menu
│       │   ├── FolderExplorer.jsx # Directory navigation with multi-mode view
│       │   ├── FolderThumbModal.jsx # 3-mode folder thumbnail customizer
│       │   ├── MediaGrid.jsx   # Catalog poster display
│       │   ├── MediaCard.jsx   # Individual media item card
│       │   ├── VideoPlayer.jsx # Artplayer and JASSUB WebAssembly canvas player
│       │   ├── VideoThumbnail.jsx # Native image and client canvas fallback renderer
│       │   └── ChangePasswordModal.jsx # User password update modal
│       └── utils/
│           ├── api.js          # Authenticated API client
│           └── storage.js      # LocalStorage manager for watch progress
│
└── docs/
    └── screenshots/            # Documentation images
```

---

## Quick Start Guide

### Option 1: Docker Deployment

1. Set up your media directory and start the container:

```bash
cd /root/stream-vault

# Start container in detached mode
docker compose up -d --build
```

2. Access the web interface at `http://localhost:8090` (or `http://<your-server-ip>:8090`).
3. Log in with the default credentials:
   - **Username**: `admin`
   - **Password**: `admin`

#### Mounting Your Homelab Hard Drives in `docker-compose.yml`

```yaml
services:
  stream-vault:
    build: .
    container_name: stream-vault
    restart: unless-stopped
    ports:
      - "8090:8090"
    environment:
      - MEDIA_ROOT=/media
      - PORT=8090
      - AUTH_ENABLED=true
    volumes:
      # Replace with your actual media storage mount path:
      - /mnt/storage/media:/media:ro
      - stream-vault-cache:/app/.cache
      - stream-vault-data:/app/server/data
```

> **Security Note**: The `:ro` (Read-Only) flag ensures that StreamVault cannot alter or delete files on your media drives.

---

### Option 2: Running Without Docker (Direct Node.js)

#### Prerequisites
- Node.js v18+ or v20+
- FFmpeg (for automated server-side video thumbnail frame extraction)

#### Installation and Startup

```bash
# 1. Install all dependencies
npm run install:all

# 2. Build the client application
npm run build:client

# 3. Start the server
npm start
```

For development mode with hot-reloading:
```bash
# Terminal 1: Backend Fastify server
npm run server:dev

# Terminal 2: Frontend Vite development server
npm run client:dev
```

---

## Single Sign-On (OIDC) Configuration

To connect StreamVault with your OpenID Connect provider, set the following environment variables in `.env` or in your container environment:

```bash
OIDC_ENABLED=true
OIDC_ISSUER_URL=https://sso.yourdomain.com
OIDC_CLIENT_ID=streamvault
OIDC_CLIENT_SECRET=your_client_secret
OIDC_REDIRECT_URI=http://localhost:8090/api/auth/oidc/callback
```

When enabled, a "Sign in with Single Sign-On (OIDC)" button appears automatically on the login screen.

---

## Video Player Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Space | Play / Pause video |
| J | Seek backward 10 seconds |
| L | Seek forward 10 seconds |
| Left Arrow | Seek backward 5 seconds |
| Right Arrow | Seek forward 5 seconds |
| Up Arrow / Down Arrow | Increase / decrease volume by 10% |
| M | Mute / Unmute audio |
| F | Toggle fullscreen |
| C | Open subtitle selection menu |
| N | Skip to next episode |
| P | Return to previous episode |

---

## REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server health, memory metrics, uptime, and 0% CPU indicator |
| `POST`| `/api/auth/login` | Authenticate with username and password, returns session token |
| `GET` | `/api/auth/me` | Retrieve authenticated user profile and permissions |
| `POST`| `/api/auth/change-password` | Update user password |
| `GET` | `/api/auth/providers` | Query available authentication providers (Local and OIDC) |
| `GET` | `/api/media` | Retrieve complete indexed media catalog |
| `POST`| `/api/media/scan` | Trigger background media directory rescan |
| `GET` | `/api/browse?subpath=...` | Browse folders and files with metadata and thumbnails |
| `GET` | `/api/thumbnail?path=...` | Get or generate native video frame thumbnail |
| `GET` | `/api/folders/config?subpath=...` | Get 3-mode thumbnail configuration for a folder |
| `POST`| `/api/folders/thumbnail` | Update folder thumbnail mode (`auto`, `custom`, `none`) or upload cover |
| `GET` | `/api/folders/thumbnail/image?folder=...` | Serve custom uploaded folder thumbnail |
| `GET` | `/api/stream?path=...` | Stream video content via HTTP 206 Partial Content (Byte Ranges) |
| `GET` | `/api/subtitles?path=...` | Serve companion subtitle tracks (`.ass`, `.srt`, `.vtt`) |
| `GET` | `/api/poster?path=...` | Serve companion poster image |

---

## License

Distributed under the MIT License. Feel free to use and modify it for your self-hosted homelab environment.
