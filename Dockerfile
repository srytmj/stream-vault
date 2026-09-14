# ==========================================
# STAGE 1: Static FFmpeg Source (Fast, No Alpine Package Bloat)
# ==========================================
FROM mwader/static-ffmpeg:7.1 AS ffmpeg-source

# ==========================================
# STAGE 2: Build Frontend (Vite + React)
# ==========================================
FROM node:22-alpine AS client-builder

WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ==========================================
# STAGE 3: Install Server Dependencies
# ==========================================
FROM node:22-alpine AS server-builder

WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci --omit=dev

# ==========================================
# STAGE 4: Production Runner (Ultra-Lightweight & Blazing Fast Rebuild)
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

# Copy statically linked FFmpeg & FFprobe directly (Zero Alpine library dependencies, 100x faster build)
COPY --from=ffmpeg-source /ffmpeg /ffprobe /usr/local/bin/

# Install only tini as PID 1 init reaper (1 tiny package, ~30KB, installs in 0.2s)
RUN apk add --no-cache tini

ENV NODE_ENV=production
ENV PORT=8090
ENV HOST=0.0.0.0
ENV MEDIA_ROOT=/media
ENV CACHE_DIR=/app/.cache
ENV DATA_DIR=/app/data
ENV FFMPEG_MAX_CONCURRENCY=1
ENV FFMPEG_TIMEOUT_MS=15000

# Copy production node_modules and server source
COPY --from=server-builder /app/server/node_modules ./server/node_modules
COPY server/package.json ./server/
COPY server/src ./server/src

# Copy built frontend assets
COPY --from=client-builder /app/client/dist ./client/dist

# Default mount directories for homelab storage & persistent cache
RUN mkdir -p /media /app/.cache /app/data

EXPOSE 8090

WORKDIR /app/server
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/index.js"]
