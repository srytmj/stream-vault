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

# Optional: Install ffmpeg solely for zero-transcode subtitle extraction (-c:s copy)
# Server video/audio transcode is strictly 0% (disabled by architecture)
RUN apk add --no-cache ffmpeg

ENV NODE_ENV=production
ENV PORT=8090
ENV HOST=0.0.0.0
ENV MEDIA_ROOT=/media

# Copy production node_modules and server source
COPY --from=server-builder /app/server/node_modules ./server/node_modules
COPY server/package.json ./server/
COPY server/src ./server/src

# Copy built frontend assets
COPY --from=client-builder /app/client/dist ./client/dist

# Default mount directory for homelab storage
RUN mkdir -p /media /app/.cache

EXPOSE 8090

WORKDIR /app/server
CMD ["node", "src/index.js"]
