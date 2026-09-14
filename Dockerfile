# ==========================================
# STAGE 1: Build Frontend (Vite + React)
# ==========================================
FROM node:22-alpine AS client-builder

WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ==========================================
# STAGE 2: Install Server Dependencies
# ==========================================
FROM node:22-alpine AS server-builder

WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci --omit=dev

# ==========================================
# STAGE 3: Production Runner (Ultra-Lightweight)
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

# 1. FFmpeg is installed strictly for lightweight zero-transcode helpers (max concurrency 1)
# 2. Tini is installed as PID 1 init reaper to automatically harvest child exit codes and prevent zombie processes
RUN apk add --no-cache ffmpeg tini

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
