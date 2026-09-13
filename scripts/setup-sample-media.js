import fs from 'node:fs';
import path from 'node:path';

// Valid 1-frame WebM/MKV file bytes
const webmHex =
  '1a45dfa39f4286810142f7810142f2810442f381084282847765626d4287810242858102' +
  '18538067a3' +
  '1549a966902ad7b1830f424044898440a00000' +
  '1654ae6b9aae98d7810173c587424153455130318381018683565038e08ab0820040ba820040' +
  '1f43b6758de78100' +
  'a38981000080' +
  '1000009d012a40004000004708858588858488';

const webmBuffer = Buffer.from(webmHex, 'hex');

function generateAssSubtitle(title, lang = 'Indonesian') {
  const isIndo = lang.toLowerCase().includes('indo');
  return `[Script Info]
Title: ${title} - StreamVault ASS
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Trebuchet MS,55,&H00FFFFFF,&H000000FF,&H00101010,&H80000000,1,0,0,0,100,100,0,0,1,2.8,1.5,2,40,40,45,1
Style: TopBanner,Arial,48,&H002DF8FF,&H000000FF,&H00090A0F,&H90000000,1,0,0,0,100,100,0,0,1,2.5,1.2,8,40,40,40,1
Style: Karaoke,Arial,65,&H0000E1FF,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,3.2,2.0,2,40,40,70,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.50,0:00:06.00,TopBanner,,0,0,0,,{\\fad(400,400)\\b1}StreamVault: Zero Server Transcode (100% Client-Side Playback){\\b0}
Dialogue: 0,0:00:01.00,0:00:05.50,Default,,0,0,0,,{\\fad(300,300)}${
    isIndo
      ? 'Halo! Subtitle ASS ini di-render langsung di HTML5 canvas via JASSUB WebAssembly!'
      : 'Hello! This ASS subtitle is rendered directly on HTML5 canvas via JASSUB WebAssembly!'
  }
Dialogue: 0,0:00:06.00,0:00:11.50,Default,,0,0,0,,{\\fad(300,300)\\c&H00D4FF&}${
    isIndo
      ? 'CPU Server tetap 0% karena streaming berjalan via HTTP 206 Byte-Range RFC 7233.'
      : 'Server CPU remains at 0% because streaming runs via HTTP 206 Byte-Range RFC 7233.'
  }{\\c}
Dialogue: 0,0:00:12.00,0:00:18.00,Karaoke,,0,0,0,,{\\k20}STREAM{\\k25}VAULT{\\k30} SELF{\\k35}HOSTED{\\k40} HOMELAB!
`;
}

function generateSrtSubtitle(title) {
  return `1
0:00:01,000 --> 0:00:05,000
StreamVault: Zero Server-Side Transcode Media Player

2
0:00:05,500 --> 0:00:10,000
100% Client-Side Playback with HTTP 206 Byte-Range Streaming

3
0:00:10,500 --> 0:00:16,000
Instant seeking without waiting for server transcoding!
`;
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

    for (let ep = 1; ep <= 4; ep++) {
      const epStr = String(ep).padStart(2, '0');
      const baseName = `[SubsPlease] Sousou no Frieren - ${epStr} (1080p)`;
      
      fs.writeFileSync(path.join(frierenDir, `${baseName}.mkv`), webmBuffer);
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
    for (let ep = 1; ep <= 2; ep++) {
      const epStr = String(ep).padStart(2, '0');
      const baseName = `[Erai-raws] Oshi no Ko - ${epStr} [1080p]`;
      fs.writeFileSync(path.join(oshiDir, `${baseName}.mkv`), webmBuffer);
      fs.writeFileSync(
        path.join(oshiDir, `${baseName}.id.ass`),
        generateAssSubtitle(`Oshi no Ko Episode ${epStr}`, 'Indonesian')
      );
    }

    // 3. Movies: Your Name & Suzume
    const moviesDir = path.join(base, 'movies');
    fs.mkdirSync(moviesDir, { recursive: true });

    const yourNameBase = 'Your Name (2016) [1080p BluRay]';
    fs.writeFileSync(path.join(moviesDir, `${yourNameBase}.mp4`), webmBuffer);
    fs.writeFileSync(
      path.join(moviesDir, `${yourNameBase}.id.ass`),
      generateAssSubtitle('Your Name (2016)', 'Indonesian')
    );
    fs.writeFileSync(
      path.join(moviesDir, `${yourNameBase}.en.srt`),
      generateSrtSubtitle('Your Name (2016)')
    );

    const suzumeBase = 'Suzume (2022) [1080p WEB-DL]';
    fs.writeFileSync(path.join(moviesDir, `${suzumeBase}.mkv`), webmBuffer);
    fs.writeFileSync(
      path.join(moviesDir, `${suzumeBase}.id.ass`),
      generateAssSubtitle('Suzume (2022)', 'Indonesian')
    );

    // 4. TV: Shogun
    const tvDir = path.join(base, 'tv', 'Shogun', 'Season 1');
    fs.mkdirSync(tvDir, { recursive: true });
    for (let ep = 1; ep <= 2; ep++) {
      const epStr = String(ep).padStart(2, '0');
      const baseName = `Shogun.S01E${epStr}.1080p`;
      fs.writeFileSync(path.join(tvDir, `${baseName}.mkv`), webmBuffer);
      fs.writeFileSync(path.join(tvDir, `${baseName}.en.srt`), generateSrtSubtitle(`Shogun S01E${epStr}`));
      fs.writeFileSync(path.join(tvDir, `${baseName}.id.ass`), generateAssSubtitle(`Shogun S01E${epStr}`, 'Indonesian'));
    }

    console.log(`Successfully created sample media library at ${base}`);
  } catch (err) {
    console.warn(`Could not setup media at ${base}:`, err.message);
  }
}
