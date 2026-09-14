# StreamVault Service Specification & Homelab Integration

Dokumentasi spesifikasi container dan integrasi homelab untuk layanan `stream-vault`. Dokumen ini siap dimasukkan/direferensikan ke dalam inventori layanan utama homelab (`docs/services.md`).

---

## 📋 Ikhtisar Layanan

| Atribut | Detail |
|---|---|
| **Service Name** | StreamVault |
| **Container Name** | `stream-vault` |
| **Docker Image** | `stream-vault-stream-vault` |
| **Host / Target** | LXC `docker-host` (Proxmox LXC 4 vCPU / 12GB RAM) |
| **Port Mapping** | `8090:8090` |
| **Healthcheck URL** | `http://localhost:8090/api/health` |
| **Restart Policy** | `unless-stopped` |
| **Default Creds** | `admin` / `admin` (Segera ganti setelah deployment) |

---

## ⚡ Filosofi & Arsitektur Resource

- **Video/Audio Playback**: **100% Direct Play / Zero Server-Side Transcode**. Backend Node.js murni bertindak sebagai RFC 7233 HTTP 206 Byte-Range streaming origin. CPU server 0% untuk transcode video playback. Subtitle `.ass` dirender 100% di sisi browser client via WebAssembly (JASSUB/libass).
- **Server Subprocess Helpers**:
  FFmpeg & FFprobe digunakan **hanya** untuk:
  1. **Single-frame thumbnail snapshot** (`ffmpeg -frames:v 1`).
  2. **Softsub extraction stream copying** (`ffmpeg -c:s copy` tanpa re-encoding).
  3. **Embedded subtitle metadata probing** (`ffprobe -select_streams s`).
- **Resource & Zombie Process Guard**:
  - **Init Process Daemon (`tini` / `init: true`)**: Berjalan sebagai PID 1 di dalam container untuk memanen (`reap`) seluruh exit status child process yang telah mati secara otomatis, mencegah terbentuknya zombie / defunct process.
  - **PID Table Limiter (`pids_limit: 100`)**: Membatasi cgroup container maksimal 100 proses. Mencegah kemungkinan fork bomb atau kehabisan slot PID pada host LXC (kejadian 25k tasks tidak akan bisa terulang).
  - **Process Queue / Concurrency Limiter**: Maksimal 1 child process FFmpeg/FFprobe simultan (`FFMPEG_MAX_CONCURRENCY=1`).
  - **Hard Timeout**: 15 detik untuk thumbnail & ffprobe, 30 detik untuk subtitle copy. Proses di-kill paksa (`SIGKILL`) bila melebihi batas.
  - **Single Thread Flag**: `-threads 1` membatasi thread decoder agar tidak melipatgandakan buffer memori.
  - **No Font Demuxing**: `-sn -an -dn` mencegah FFmpeg membaca puluhan font attachment `.ttf` pada container MKV.
  - **Negative Cache & Circuit Breaker**: File yang rusak/gagal otomatis menghasilkan SVG placeholder permanen dan di-blacklist dari pemanggilan ulang FFmpeg.
  - **Memory Safeguard Check**: Proses dibatalkan jika memori sistem tersisa `< 45MB`.

---

## 💾 Rekomendasi Alokasi Resource Homelab

| Parameter | Minimum | Rekomendasi Homelab (Production) | Catatan |
|---|---|---|---|
| **RAM Container (`limits.memory`)** | 256 MB | **512 MB** | 75MB Node.js runtime + 1 worker FFmpeg single-thread (100–180MB) + OS buffer |
| **RAM Reservation (`reservations.memory`)** | 64 MB | **128 MB** | Menjamin alokasi dasar tidak tergusur proses lain di LXC |
| **PIDs Limit (`pids_limit`)** | 50 | **100** | Melindungi kernel host dari fork exhaustion |
| **CPU Limit** | 1 Core | **2 Cores** (Shared) | Digunakan secara singkat (<1s) saat ekstraksi frame thumbnail awal |

---

## 📂 Volume & Mount Storage

```yaml
volumes:
  # Media Storage (Wajib :ro / Read-Only untuk keamanan koleksi)
  - /mnt/storage/media:/media:ro

  # Persistent Cache (Mencegah regenerasi thumbnail & ekstraksi ulang subtitle saat container restart)
  - stream-vault-cache:/app/.cache

  # Persistent Data (Database user lokal, folder customization, bookmark)
  - stream-vault-data:/app/data
```

---

## 🔧 Environment Variables Penting

| Variable | Default | Keterangan |
|---|---|---|
| `PORT` | `8090` | Port listening server Fastify |
| `MEDIA_ROOT` | `/media` | Path direktori media yang dimount |
| `CACHE_DIR` | `/app/.cache` | Direktori cache frame thumbnail (`thumbnails/`) dan subtitle (`subtitles/`) |
| `DATA_DIR` | `/app/data` | Direktori data persistent (metadata folder, sqlite/json store) |
| `FFMPEG_MAX_CONCURRENCY` | `1` | Batas proses FFmpeg/FFprobe paralel (Disarankan `1` untuk container 512MB) |
| `FFMPEG_TIMEOUT_MS` | `15000` | Timeout keras child process dalam milidetik |
| `AUTH_ENABLED` | `true` | Aktifkan autentikasi pengguna |
| `OIDC_ENABLED` | `false` | Integrasi SSO (Authelia, Authentik, Keycloak) |

---

## 🚀 Perintah Operasional Homelab

```bash
# Start/update container
cd /root/stream-vault
docker compose up -d --build

# Cek health & resource usage
curl -s http://localhost:8090/api/health | jq .

# Cek log runtime
docker logs -f stream-vault --tail 100

# Bersihkan cache thumbnail bila perlu
docker compose exec stream-vault rm -rf /app/.cache/thumbnails/*
```
