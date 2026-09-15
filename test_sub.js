import fs from 'node:fs';
import { probeEmbeddedSubtitles, extractEmbeddedSubtitle } from './server/src/subtitles.js';

(async () => {
    try {
        const file = '/media/anime/Sousou no Frieren/[SubsPlease] Sousou no Frieren - 01 (1080p).mkv';
        console.log("Probing...");
        const tracks = await probeEmbeddedSubtitles(file);
        console.log("Tracks:", JSON.stringify(tracks, null, 2));
        
        if (tracks.length > 0 && tracks[0].trackIndex !== undefined) {
             console.log("Extracting track", tracks[0].trackIndex);
             const out = await extractEmbeddedSubtitle(file, tracks[0].trackIndex);
             console.log("Extracted to:", out);
             const stat = fs.statSync(out);
             console.log("Size:", stat.size);
             const head = fs.readFileSync(out, 'utf8').slice(0, 100);
             console.log("Head:", head);
        }
    } catch(e) {
        console.error(e);
    }
})();
