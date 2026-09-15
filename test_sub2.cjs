const fs = require('fs');
const { spawnSync } = require('child_process');

console.log("Checking ffmpeg fallback output formatting when trying to use -c:s ass on a file with subrip...");

const testSrtPath = 'test.srt';
fs.writeFileSync(testSrtPath, `1
00:00:01,000 --> 00:00:05,000
Test subtitle
`);

const testMkvPath = 'test.mkv';
// Create an MKV with a subrip stream
spawnSync('ffmpeg', ['-f', 'lavfi', '-i', 'color=c=black:s=16x16:d=1', '-i', testSrtPath, '-c:v', 'libx264', '-c:s', 'srt', testMkvPath, '-y']);

const res = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 's', '-show_entries', 'stream=codec_name', '-of', 'json', testMkvPath]);
console.log("ffprobe:", res.stdout ? res.stdout.toString() : '');

console.log("Running extraction...");
// What happens if we transcode to ASS?
spawnSync('ffmpeg', ['-i', testMkvPath, '-map', '0:s:0', '-c:s', 'ass', 'out.ass', '-y']);
console.log("File size 1:", fs.existsSync('out.ass') ? fs.statSync('out.ass').size : 'missing');
if (fs.existsSync('out.ass')) console.log(fs.readFileSync('out.ass', 'utf8').slice(0, 100));

// What happens if we copy?
spawnSync('ffmpeg', ['-i', testMkvPath, '-map', '0:s:0', '-c:s', 'copy', 'out_copy.ass', '-y']);
console.log("File size 2:", fs.existsSync('out_copy.ass') ? fs.statSync('out_copy.ass').size : 'missing');
if (fs.existsSync('out_copy.ass')) console.log(fs.readFileSync('out_copy.ass', 'utf8').slice(0, 100));

