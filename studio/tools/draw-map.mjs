// Turns a black-on-white line drawing into a "draw-on" map: every ink pixel gets the moment (0–1) the pen reaches it,
// found by flooding along the lines from the top of each stroke (geodesic distance), so in the reel the lines grow
// along their own paths like a pen drawing them, not like a wipe.
//   node studio/tools/draw-map.mjs <line-art.png> <out.js> [--height 620] [--thicken 1] [--name RAM_MAP] [--overlap 0.5] [--trim]
// --trim crops the white margin first, so --height is the drawing's own height (a 4 px pad stays round it).
// Output: a script that sets window[<name>] = { w, h, idx, ink, time } (base64 typed arrays of the ink pixels only).
// A script, not a PNG, because a canvas can't read pixels back from a file:// image (it is treated as cross-origin).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const [src, out] = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
if (!src || !out) { console.error('Usage: draw-map.mjs <line-art.png> <out.js> [--height 620] [--thicken 1] [--name RAM_MAP] [--overlap 0.5] [--trim]'); process.exit(1); }
const TRIM = argv.includes('--trim'), H = +opt('height', 620), R = +opt('thicken', 1), NAME = opt('name', 'RAM_MAP'), OVERLAP = +opt('overlap', 0.5);

let img = sharp(src).flatten({ background: '#ffffff' }).greyscale();
if (TRIM) img = sharp(await img.trim({ threshold: 40 }).extend({ top: 8, bottom: 8, left: 8, right: 8, background: '#ffffff' }).toBuffer()).greyscale();
const { data, info } = await img.resize({ height: H, kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true });
const w = info.width, h = info.height, n = w * h;
let ink = new Uint8Array(n); for (let i = 0; i < n; i++) ink[i] = 255 - data[i];
// Thicken: each pixel takes the darkest ink within radius R (lines lose weight when the drawing is scaled down).
if (R > 0) { const o = new Uint8Array(n); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let m = 0;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { if (dx * dx + dy * dy > R * R + R) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; m = Math.max(m, ink[yy * w + xx]); }
  o[y * w + x] = m; } ink = o; }
const mask = new Uint8Array(n); for (let i = 0; i < n; i++) mask[i] = ink[i] > 70 ? 1 : 0;

// Components, ordered by their top-most pixel; each floods from that pixel. Later strokes start before earlier ones end.
const dist = new Float32Array(n).fill(-1), comp = new Int32Array(n).fill(-1), comps = [];
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const s = y * w + x; if (!mask[s] || comp[s] >= 0) continue;
  const id = comps.length, q = [s]; comp[s] = id; dist[s] = 0; let max = 0, size = 0;
  for (let qi = 0; qi < q.length; qi++) { const p = q[qi], px = p % w, py = (p - px) / w; size++; max = Math.max(max, dist[p]);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = px + dx, yy = py + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const k = yy * w + xx; if (!mask[k] || comp[k] >= 0) continue; comp[k] = id; dist[k] = dist[p] + 1; q.push(k); } }
  comps.push({ top: y, max, size }); }
const keep = comps.map(c => c.size >= 6); // drop specks
let cursor = 0; const start = comps.map((c, i) => { if (!keep[i]) return 0; const s = cursor; cursor += Math.max(8, c.max) * OVERLAP; return s; });
let end = 0; comps.forEach((c, i) => { if (keep[i]) end = Math.max(end, start[i] + c.max); });

// Anti-aliased edge pixels (ink but under the mask threshold) take the time of their nearest masked neighbour.
const time = new Float32Array(n).fill(-1);
for (let i = 0; i < n; i++) if (mask[i] && keep[comp[i]]) time[i] = (start[comp[i]] + dist[i]) / end;
for (let pass = 0; pass < 3; pass++) for (let i = 0; i < n; i++) { if (time[i] >= 0 || ink[i] < 12) continue; const x = i % w, y = (i - x) / w; let best = -1;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const v = time[yy * w + xx]; if (v >= 0 && (best < 0 || v < best)) best = v; }
  if (best >= 0) time[i] = best; }

const ids = []; for (let i = 0; i < n; i++) if (time[i] >= 0 && ink[i] >= 12) ids.push(i);
const idx = new Uint32Array(ids), inkA = new Uint8Array(ids.map(i => ink[i])), timeA = new Uint16Array(ids.map(i => Math.round(time[i] * 65535)));
const b64 = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `// Draw-on map made by studio/tools/draw-map.mjs from ${path.basename(src)} (${w}×${h}, ${ids.length} ink pixels, ${comps.filter((c, i) => keep[i]).length} strokes).\nwindow.${NAME} = { w: ${w}, h: ${h}, idx: "${b64(idx)}", ink: "${b64(inkA)}", time: "${b64(timeA)}" };\n`);
console.log(`wrote ${out}: ${w}×${h}, ${ids.length} ink pixels, ${comps.filter((c, i) => keep[i]).length} strokes, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
