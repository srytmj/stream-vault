import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const DEMO_VIDEO_URL =
  'https://raw.githubusercontent.com/cseitz/sample-files/main/assets/video/mp4/bbb_short.mp4';
const CACHE_FILE = '/tmp/demo-video.mp4';

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 100000) {
      return resolve(fs.readFileSync(dest));
    }
    const file = fs.createWriteStream(dest);
    https
      .get(url, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve(fs.readFileSync(dest)));
        });
      })
      .on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
}

function generateSvgPoster(title, subtitle, category, bgGradientStart, bgGradientEnd, accentColor) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="600" height="900">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgGradientStart}" />
      <stop offset="50%" stop-color="#0f111a" />
      <stop offset="100%" stop-color="${bgGradientEnd}" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="30%" r="60%">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="600" height="900" fill="url(#grad)" />
  <rect width="600" height="900" fill="url(#glow)" />
  <rect x="30" y="30" width="540" height="840" rx="20" fill="none" stroke="${accentColor}" stroke-width="2" stroke-opacity="0.2" />
  
  <rect x="50" y="50" width="100" height="30" rx="8" fill="${accentColor}" fill-opacity="0.2" stroke="${accentColor}" stroke-width="1.5" />
  <text x="100" y="70" font-family="Inter, sans-serif" font-size="14" font-weight="bold" fill="${accentColor}" text-anchor="middle" letter-spacing="2">${category.toUpperCase()}</text>
  
  <circle cx="300" cy="380" r="110" fill="${accentColor}" fill-opacity="0.1" stroke="${accentColor}" stroke-width="2" stroke-dasharray="8 6" />
  <polygon points="280,330 350,380 280,430" fill="${accentColor}" />
  
  <text x="300" y="620" font-family="Inter, sans-serif" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle">
    ${title}
  </text>
  <text x="300" y="665" font-family="Inter, sans-serif" font-size="18" font-weight="500" fill="#94a3b8" text-anchor="middle">
    ${subtitle}
  </text>
  
  <rect x="180" y="720" width="240" height="42" rx="12" fill="#1e293b" stroke="#334155" />
  <text x="300" y="747" font-family="Inter, monospace" font-size="13" font-weight="bold" fill="#f47521" text-anchor="middle">STREAMVAULT DEMO</text>
  
  <text x="300" y="830" font-family="Inter, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">
    100% Client Hardware Playback • Zero Transcode
  </text>
</svg>`;
}

function generateAssSubtitle(title, lang = 'Indonesian') {
  const isIndo = lang.toLowerCase().includes('indo');
  return `[Script Info]
Title: ${title} - StreamVault Anime Styled Subtitle
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Trebuchet MS,55,&H00FFFFFF,&H000000FF,&H00151824,&H80000000,1,0,0,0,100,100,0,0,1,3.0,1.8,2,40,40,45,1
Style: TopBanner,Arial,46,&H002DF8FF,&H000000FF,&H00090A0F,&H90000000,1,0,0,0,100,100,0,0,1,2.5,1.2,8,40,40,40,1
Style: Karaoke,Arial,65,&H0000D4FF,&H000000FF,&H00000000,&H90000000,1,0,0,0,100,100,0,0,1,3.5,2.0,2,40,40,70,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.30,0:00:03.50,TopBanner,,0,0,0,,{\\fad(300,300)\\b1}StreamVault Demo: Zero Server Transcode{\\b0}
Dialogue: 0,0:00:01.00,0:00:04.20,Default,,0,0,0,,{\\fad(250,250)}${
    isIndo
      ? 'Halo penonton! Subtitle styled .ass ini di-render langsung di browser canvas Anda.'
      : 'Welcome! This styled .ass anime subtitle is rendered directly on your browser canvas.'
  }
Dialogue: 0,0:00:04.50,0:00:07.50,Default,,0,0,0,,{\\fad(250,250)\\c&H00D4FF&}${
    isIndo
      ? 'CPU Server homelab tetap 0.0% karena streaming via HTTP 206 Byte-Range!'
      : 'Homelab server CPU remains at 0.0% thanks to HTTP 206 Byte-Range streaming!'
  }{\\c}
Dialogue: 0,0:00:07.80,0:00:09.90,Karaoke,,0,0,0,,{\\k20}STREAM{\\k25}VAULT{\\k30} HOMELAB{\\k35} EXPERIENCE!
`;
}

function generateSrtSubtitle(title) {
  return `1
0:00:00,500 --> 0:00:03,500
StreamVault: Zero Server-Side Transcode Media Player

2
0:00:04,000 --> 0:00:07,000
100% Client-Side Playback with HTTP 206 Byte-Range Streaming

3
0:00:07,500 --> 0:00:09,800
Instant seeking with zero server CPU overhead!
`;
}

async function run() {
  console.log('Fetching open-source demo video buffer...');
  let videoBuffer;
  try {
    videoBuffer = await downloadFile(DEMO_VIDEO_URL, CACHE_FILE);
    console.log(`Demo video ready: ${(videoBuffer.length / 1024).toFixed(1)} KB`);
  } catch (err) {
    console.error('Failed to download demo video, using fallback:', err.message);
    videoBuffer = Buffer.from(
      '1a45dfa39f4286810142f7810142f2810442f381084282847765626d428781024285810218538067a31549a966902ad7b1830f424044898440a000001654ae6b9aae98d7810173c587424153455130318381018683565038e08ab0820040ba8200401f43b6758de78100a389810000801000009d012a40004000004708858588858488',
      'hex'
    );
  }

  const targetDirs = [
    path.resolve('/root/stream-vault/media'),
    path.resolve('/media'),
  ];

  for (const base of targetDirs) {
    try {
      if (!fs.existsSync(base)) {
        fs.mkdirSync(base, { recursive: true });
      }

      // 1. Anime: Sousou no Frieren
      const frierenDir = path.join(base, 'anime', 'Sousou no Frieren');
      fs.mkdirSync(frierenDir, { recursive: true });
      fs.writeFileSync(
        path.join(frierenDir, 'poster.svg'),
        generateSvgPoster('Sousou no Frieren', 'Frieren: Beyond Journey\'s End', 'Anime', '#1e1b4b', '#0f172a', '#38bdf8')
      );

      for (let ep = 1; ep <= 4; ep++) {
        const epStr = String(ep).padStart(2, '0');
        const baseName = `[SubsPlease] Sousou no Frieren - ${epStr} (1080p)`;
        fs.writeFileSync(path.join(frierenDir, `${baseName}.mkv`), videoBuffer);
        fs.writeFileSync(
          path.join(frierenDir, `${baseName}.id.ass`),
          generateAssSubtitle(`Sousou no Frieren Episode ${epStr}`, 'Indonesian')
        );
        fs.writeFileSync(
          path.join(frierenDir, `${baseName}.en.ass`),
          generateAssSubtitle(`Sousou no Frieren Episode ${epStr}`, 'English')
        );
      }

      // 2. Anime: Oshi no Ko
      const oshiDir = path.join(base, 'anime', 'Oshi no Ko');
      fs.mkdirSync(oshiDir, { recursive: true });
      fs.writeFileSync(
        path.join(oshiDir, 'poster.svg'),
        generateSvgPoster('Oshi no Ko', 'My Star / Idol Drama', 'Anime', '#831843', '#1e1b4b', '#f43f5e')
      );

      for (let ep = 1; ep <= 2; ep++) {
        const epStr = String(ep).padStart(2, '0');
        const baseName = `[Erai-raws] Oshi no Ko - ${epStr} [1080p]`;
        fs.writeFileSync(path.join(oshiDir, `${baseName}.mkv`), videoBuffer);
        fs.writeFileSync(
          path.join(oshiDir, `${baseName}.id.ass`),
          generateAssSubtitle(`Oshi no Ko Episode ${epStr}`, 'Indonesian')
        );
      }

      // 3. Movies: Your Name & Suzume
      const moviesDir = path.join(base, 'movies');
      fs.mkdirSync(moviesDir, { recursive: true });

      const yourNameBase = 'Your Name (2016) [1080p BluRay]';
      fs.writeFileSync(path.join(moviesDir, `${yourNameBase}.mp4`), videoBuffer);
      fs.writeFileSync(
        path.join(moviesDir, `${yourNameBase}.svg`),
        generateSvgPoster('Your Name (2016)', 'Kimi no Na wa by Makoto Shinkai', 'Movie', '#0c4a6e', '#1e293b', '#0ea5e9')
      );
      fs.writeFileSync(
        path.join(moviesDir, `${yourNameBase}.id.ass`),
        generateAssSubtitle('Your Name (2016)', 'Indonesian')
      );
      fs.writeFileSync(
        path.join(moviesDir, `${yourNameBase}.en.srt`),
        generateSrtSubtitle('Your Name (2016)')
      );

      const suzumeBase = 'Suzume (2022) [1080p WEB-DL]';
      fs.writeFileSync(path.join(moviesDir, `${suzumeBase}.mkv`), videoBuffer);
      fs.writeFileSync(
        path.join(moviesDir, `${suzumeBase}.svg`),
        generateSvgPoster('Suzume (2022)', 'Suzume no Tojimari', 'Movie', '#14532d', '#0f172a', '#22c55e')
      );
      fs.writeFileSync(
        path.join(moviesDir, `${suzumeBase}.id.ass`),
        generateAssSubtitle('Suzume (2022)', 'Indonesian')
      );

      // 4. TV: Shogun
      const tvDir = path.join(base, 'tv', 'Shogun', 'Season 1');
      fs.mkdirSync(tvDir, { recursive: true });
      fs.writeFileSync(
        path.join(path.dirname(tvDir), 'poster.svg'),
        generateSvgPoster('Shogun', 'Feudal Japan Historical Drama', 'TV Show', '#7c2d12', '#18181b', '#f97316')
      );

      for (let ep = 1; ep <= 2; ep++) {
        const epStr = String(ep).padStart(2, '0');
        const baseName = `Shogun.S01E${epStr}.1080p`;
        fs.writeFileSync(path.join(tvDir, `${baseName}.mkv`), videoBuffer);
        fs.writeFileSync(path.join(tvDir, `${baseName}.en.srt`), generateSrtSubtitle(`Shogun S01E${epStr}`));
        fs.writeFileSync(path.join(tvDir, `${baseName}.id.ass`), generateAssSubtitle(`Shogun S01E${epStr}`, 'Indonesian'));
      }

      console.log(`Successfully populated media library at ${base}`);
    } catch (err) {
      console.warn(`Could not setup media at ${base}:`, err.message);
    }
  }
}

run();
