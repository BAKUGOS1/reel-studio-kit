// Builds a "judge pack" for the viewer judge (playbooks/viewer-judge.md): everything a fresh agent needs to watch a finished
// reel the way a viewer would, without its source code.
//   node studio/tools/judge-pack.mjs <slug> [--film reels/<slug>/<file>.mp4] [--no-earshot]
// Writes .build/judge/<slug>/:
//   first3.jpg      the first 3 s at 5 frames a second (the thumb-stop window), with timestamps
//   sheet-N.jpg     the whole film at 1 frame a second, 12 frames a sheet, with timestamps
//   pack.md         the reel's length and format, the spoken lines with their times (from the mix data, exactly what the
//                   voice says), the earshot summary (loudness, silences, cuts without a sound), the posting test and
//                   the caption's first lines. It lists the images in reading order.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { args, ROOT } from './env.mjs';

const a = args();
const slug = a._[0];
if (!slug) { console.error('Usage: node studio/tools/judge-pack.mjs <slug> [--film <mp4>] [--no-earshot]'); process.exit(2); }
const reelDir = path.join(ROOT, 'reels', slug), srcDir = path.join(ROOT, 'src', slug);
const pickFilm = () => {
  if (a.film) return path.resolve(ROOT, a.film);
  const v = fs.readdirSync(reelDir).filter(f => new RegExp(`^${slug}-v(\\d+)\\.mp4$`).test(f)).sort((x, y) => +y.match(/v(\d+)/)[1] - +x.match(/v(\d+)/)[1]);
  return v.length ? path.join(reelDir, v[0]) : null;
};
const film = pickFilm();
if (!film || !fs.existsSync(film)) { console.error(`No film found for ${slug}. Pass --film.`); process.exit(1); }
const out = path.join(ROOT, '.build', 'judge', slug);
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const run = (cmd, argv) => { const r = spawnSync(cmd, argv, { encoding: 'utf8', maxBuffer: 64e6 }); if (r.status !== 0) throw new Error(`${cmd} failed: ${(r.stderr || '').slice(-400)}`); return r.stdout; };
const dur = +run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', film]).trim();
// On Windows this ffmpeg has no fontconfig file, so drawtext fails unless the font is named (12 Nov 2026).
const FONT = process.platform === 'win32' && fs.existsSync('C:/Windows/Fonts/arial.ttf') ? "fontfile='C\\:/Windows/Fonts/arial.ttf':" : '';
const stamp = (size) => `drawtext=${FONT}text='%{pts\\:hms}':x=6:y=6:fontcolor=yellow:fontsize=${size}:box=1:boxcolor=black@0.65`;

// The thumb-stop window: 0-3 s at 5 fps (15 frames, 5 x 3).
run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-t', '3', '-i', film, '-vf', `fps=5,scale=300:-2,${stamp(18)},tile=5x3`, '-frames:v', '1', '-q:v', '3', path.join(out, 'first3.jpg')]);
// The whole film at 1 fps, 12 frames a sheet (6 x 2).
const sheets = Math.max(1, Math.ceil((dur - .999) / 12));   // a last sheet under 1 s would hold no frame at 1 fps (ffmpeg fails)
for (let i = 0; i < sheets; i++) {
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(i * 12), '-t', '12', '-i', film, '-vf', `fps=1,scale=300:-2,setpts=PTS+${i * 12}/TB,${stamp(18)},tile=6x2`, '-frames:v', '1', '-q:v', '3', path.join(out, `sheet-${i + 1}.jpg`)]);
}

// The spoken lines, exactly as mixed (window.REEL from mix.mjs), else none.
let lines = [];
const rd = path.join(srcDir, 'assets', 'generated', 'reel-data.js');
if (fs.existsSync(rd)) {
  const ctx = { window: {} }; new Function('window', fs.readFileSync(rd, 'utf8'))(ctx.window);
  lines = (ctx.window.REEL?.captions || []).map(c => `${c.a.toFixed(1)}–${c.b.toFixed(1)} s: ${c.words.map(w => w.w).join(' ')}`);
}
// The posting notes' test and the caption's opening.
const cap = fs.existsSync(path.join(reelDir, 'caption.md')) ? fs.readFileSync(path.join(reelDir, 'caption.md'), 'utf8') : '';
const captionTop = cap.split('\n---')[0].trim().split('\n').slice(0, 4).join('\n');
const test = (cap.match(/\*\*Test:\*\*\s*(.+)/) || [])[1] || '';
const format = (cap.match(/\*\*Format:\*\*\s*(.+)/) || [])[1] || '';
// Sound: the earshot summary and the lines that matter (gaps, cuts without a sound).
let sound = 'earshot not run (--no-earshot).';
if (!a['no-earshot']) {
  const r = spawnSync(process.env.EARSHOT || 'earshot', ['timeline', film, '--video', film], { encoding: 'utf8', env: { ...process.env, EARSHOT_OFFLINE: '1' }, maxBuffer: 64e6 });
  const txt = (r.stdout || '') + (r.stderr || '');
  const first = txt.split('\n')[0].replace(/^[^:]*:\s*/, '');
  const keep = txt.split('\n').slice(1).filter(l => /^\s*\d+:\d+\.\d+\s+(GAP|CUT)/.test(l)).map(l => l.trim());
  sound = [first, ...keep].join('\n');
}

const imgs = ['first3.jpg', ...Array.from({ length: sheets }, (_, i) => `sheet-${i + 1}.jpg`)];
const md = `# Judge pack: ${slug}

- **Film:** \`${path.relative(ROOT, film).replace(/\\/g, '/')}\`, ${dur.toFixed(1)} s, 9:16. This is the film as posted on Instagram (no music bed; a song is added in the app at upload).
- **Format (from the posting notes):** ${format || 'not stated'}
- **What this reel is meant to teach us (its test):** ${test || 'not stated'}

## Look at these images, in this order
${imgs.map(f => `- \`.build/judge/${slug}/${f}\``).join('\n')}

\`first3.jpg\` is the first 3 seconds at 5 frames a second. Read it first: it is all a scrolling viewer sees before deciding.
The sheets are the whole film at one frame a second, timestamps in yellow.

## What is spoken, with times (exactly as mixed; there are no subtitles on screen)
${lines.length ? lines.map(l => `- ${l}`).join('\n') : '- (no voice: this reel is words on screen, motion and sound only)'}

## Sound (earshot, measured)
\`\`\`
${sound}
\`\`\`

## The caption's opening (what the viewer may read under the reel)
\`\`\`
${captionTop}
\`\`\`
`;
fs.writeFileSync(path.join(out, 'pack.md'), md);
console.log(`judge pack: ${path.relative(ROOT, out)} (${imgs.length} images, ${lines.length} spoken lines, ${dur.toFixed(1)} s)`);
