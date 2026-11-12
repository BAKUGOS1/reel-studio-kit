// Grows any drawn shape (a tree, a vine, a mehendi line, a rangoli stroke, a signature) along its own strokes, After Effects style.
// Every "ink" pixel (darker than the paper) gets its distance from a start corner measured *along the ink* (a breadth-first walk),
// and stage k shows the ink nearer than k/N of the longest walk, with a soft edge. The paper becomes transparent.
// Also writes <out>/full.png (the whole drawing, paper transparent, full resolution) and <out>/points.js (seeded points on the
// ink with their walk distance, for blooms, sparkles or particles that follow the growth).
//   node studio/tools/grow-stages.mjs <drawing.png> <out-dir> [--stages 24] [--start bottom-left|bottom|left|top-left] [--paper 228] [--points 1600]
// Draw it in the scene with ready('stage'+k) cross-faded, then full.png.
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { createRequire } from 'node:module';
import { args } from './env.mjs';
const a = args(), [src, outDir] = a._;
if (!src || !outDir) { console.error('Usage: node studio/tools/grow-stages.mjs <drawing.png> <out-dir> [--stages 24] [--start bottom-left] [--paper 228] [--points 1600]'); process.exit(2); }
const ffmpeg = createRequire(import.meta.url)('ffmpeg-static');
const N = +(a.stages || 24), PAPER = +(a.paper || 228), NPTS = +(a.points || 1600), start = a.start || 'bottom-left';
fs.mkdirSync(outDir, { recursive: true });
const probe = spawnSync(ffmpeg, ['-hide_banner', '-i', src], { encoding: 'utf8' }).stderr.match(/, (\d+)x(\d+)/);
const FW = +probe[1], FH = +probe[2], W = Math.round(FW / 2), H = Math.round(FH / 2);
const read = (w, h) => spawnSync(ffmpeg, ['-v', 'error', '-i', src, '-vf', `scale=${w}:${h}:flags=lanczos,format=rgba`, '-f', 'rawvideo', '-'], { maxBuffer: 2e9 }).stdout;
const write = (buf, w, h, file) => spawnSync(ffmpeg, ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`, '-i', '-', '-frames:v', '1', file], { input: buf });
const inkOf = (raw, i) => Math.max(0, Math.min(1, (PAPER - (.299 * raw[i * 4] + .587 * raw[i * 4 + 1] + .114 * raw[i * 4 + 2])) / 70));

const raw = read(W, H), ink = new Float32Array(W * H); for (let i = 0; i < W * H; i++) ink[i] = inkOf(raw, i);
const dist = new Float32Array(W * H).fill(Infinity), q = new Int32Array(W * H); let head = 0, tail = 0;
const seed = (x, y) => { const i = y * W + x; if (ink[i] > .3 && dist[i] === Infinity) { dist[i] = 0; q[tail++] = i; } };
if (start === 'bottom-left') for (let y = H - 6; y < H; y++) for (let x = 0; x < W * .3; x++) seed(x, y);
if (start === 'bottom') for (let y = H - 6; y < H; y++) for (let x = 0; x < W; x++) seed(x, y);
if (start === 'left') for (let y = 0; y < H; y++) for (let x = 0; x < 6; x++) seed(x, y);
if (start === 'top-left') for (let y = 0; y < 6; y++) for (let x = 0; x < W * .3; x++) seed(x, y);
if (!tail) { console.error(`No ink found at the start edge (${start}). Try another --start or a higher --paper.`); process.exit(1); }
while (head < tail) {
  const i = q[head++], x = i % W, y = (i / W) | 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    const j = ny * W + nx; if (ink[j] < .12 || dist[j] !== Infinity) continue; dist[j] = dist[i] + (dx && dy ? 1.414 : 1); q[tail++] = j;
  }
}
let max = 0; for (let i = 0; i < W * H; i++) if (dist[i] !== Infinity) max = Math.max(max, dist[i]);
const soft = max * .05, buf = Buffer.alloc(W * H * 4);
for (let k = 0; k < N; k++) {
  const lim = max * (k + 1) / N;
  for (let i = 0; i < W * H; i++) { const d = dist[i], al = d === Infinity ? 0 : Math.max(0, Math.min(1, (lim - d) / soft)) * ink[i]; buf[i * 4] = raw[i * 4]; buf[i * 4 + 1] = raw[i * 4 + 1]; buf[i * 4 + 2] = raw[i * 4 + 2]; buf[i * 4 + 3] = Math.round(al * 255); }
  write(buf, W, H, path.join(outDir, `stage-${String(k).padStart(2, '0')}.png`));
}
const full = read(FW, FH); for (let i = 0; i < FW * FH; i++) full[i * 4 + 3] = Math.round(inkOf(full, i) * 255); write(full, FW, FH, path.join(outDir, 'full.png'));
// seeded points on the ink (in full-resolution pixels) with their walk distance, nearest first; thin strokes are favoured
let s = 77; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647, pts = [];
for (let i = 0; i < W * H; i++) { if (dist[i] === Infinity) continue; const thin = ink[i] < .7; if (rnd() < (thin ? .5 : .07)) pts.push([(i % W) * 2, ((i / W) | 0) * 2, Math.round(dist[i] * 2)]); }
for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
const keep = pts.slice(0, NPTS).sort((p, r) => p[2] - r[2]);
fs.writeFileSync(path.join(outDir, 'points.js'), `window.GROW_POINTS = ${JSON.stringify({ size: [FW, FH], longest: Math.round(max * 2), points: keep })};\n`);
console.log(`${N} stages (${W}×${H}), full.png (${FW}×${FH}), ${keep.length} points; longest walk ${Math.round(max * 2)} px; ink reached ${tail} px`);
