// Finds the flat mid-grey phone screens Codex leaves in pictures, so real screens can be mapped onto them.
//   node studio/tools/find-screens.mjs src/<slug>/assets/art/<image>.png [...more] [--out src/<slug>/screens.json]
// For each image: every grey region larger than ~0.15% of the frame, with its four corners in source pixels
// ordered top-left, top-right, bottom-right, bottom-left (as seen on screen, so tilted phones work too).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { args } from './env.mjs';

const a = args(), files = a._;
if (!files.length) { console.error('Usage: find-screens.mjs <image.png> [...] [--out screens.json]'); process.exit(1); }
const result = fs.existsSync(a.out || '') ? JSON.parse(fs.readFileSync(a.out, 'utf8')) : {};

for (const file of files) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, grey = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) {
    const i = p * 3, r = data[i], g = data[i + 1], b = data[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    // Low saturation and mid brightness (screens catch a little lamp light). --tint widens the saturation limit for a
    // warm-lit screen; --dark looks for a switched-off black screen instead.
    grey[p] = a.dark ? (mx < 58 && mx - mn < 26 ? 1 : 0) : (mx - mn < Number(a.tint || 22) && mx > 70 && mx < 200 ? 1 : 0);
  }
  // Keep only grey pixels whose neighbours are grey too (flat areas, not grey edges or hair).
  const flat = new Uint8Array(W * H);
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) { const p = y * W + x; flat[p] = grey[p] & grey[p - 2] & grey[p + 2] & grey[p - 2 * W] & grey[p + 2 * W]; }
  const seen = new Uint8Array(W * H), screens = [], stack = [];
  for (let s = 0; s < W * H; s++) {
    if (!flat[s] || seen[s]) continue;
    let n = 0; const ext = { a: [0, 0, -Infinity], b: [0, 0, -Infinity], c: [0, 0, -Infinity], d: [0, 0, -Infinity] };
    stack.push(s); seen[s] = 1;
    while (stack.length) {
      const p = stack.pop(), x = p % W, y = (p / W) | 0; n++;
      // Corner candidates: the extremes of x+y and x−y give the four corners of a (possibly rotated) rectangle.
      if (-x - y > ext.a[2]) ext.a = [x, y, -x - y]; if (x - y > ext.b[2]) ext.b = [x, y, x - y];
      if (x + y > ext.c[2]) ext.c = [x, y, x + y]; if (y - x > ext.d[2]) ext.d = [x, y, y - x];
      for (const q of [p - 1, p + 1, p - W, p + W]) if (q >= 0 && q < W * H && flat[q] && !seen[q]) { seen[q] = 1; stack.push(q); }
    }
    if (n < W * H * 0.0015) continue;
    const corners = [ext.a, ext.b, ext.c, ext.d].map(([x, y]) => [x, y]);
    const box = corners.reduce((o, [x, y]) => ({ x0: Math.min(o.x0, x), y0: Math.min(o.y0, y), x1: Math.max(o.x1, x), y1: Math.max(o.y1, y) }), { x0: W, y0: H, x1: 0, y1: 0 });
    // Fill ratio: a screen fills most of its corner quad; a grey wall or shadow does not.
    const area = Math.abs(corners.reduce((s2, [x, y], i) => { const [x2, y2] = corners[(i + 1) % 4]; return s2 + x * y2 - x2 * y; }, 0) / 2);
    if (area > 0 && n / area > 0.75 && n / area < 1.6) screens.push({ corners, pixels: n, box, fill: +(n / area).toFixed(2) });
  }
  screens.sort((s1, s2) => s2.pixels - s1.pixels);
  const key = path.basename(file, '.png');
  result[key] = { size: [W, H], screens: screens.map(({ corners, pixels, fill }) => ({ corners, pixels, fill })) };
  console.log(`${key}: ${screens.length} screen(s)` + screens.map(s => `\n  corners ${JSON.stringify(s.corners)} · ${s.pixels} px · fill ${s.fill}`).join(''));
}
if (a.out) { fs.writeFileSync(a.out, JSON.stringify(result, null, 1) + '\n'); console.log('wrote', a.out); }
