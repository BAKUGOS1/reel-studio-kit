// Checks a living-illustration set: did each Codex edit change only its mouth or eyes?
//   node studio/tools/check-set.mjs src/<slug>/assets/art/mummy-calm.png
// Compares the base with every sibling named <base>-mouth-open, -mouth-wide, -eyes-closed (any .png starting with the
// base name) and writes <base>.diff.png: changed pixels in red, so the edited region shows as one tight blob.
// It also prints the changed area's bounding box in source pixels: a ready starting point for the rig regions.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const base = path.resolve(process.argv[2] || '');
if (!fs.existsSync(base)) { console.error('Usage: check-set.mjs <path to the base PNG>'); process.exit(1); }
const dir = path.dirname(base), stem = path.basename(base, '.png');
const variants = fs.readdirSync(dir).filter(f => f.startsWith(stem + '-') && f.endsWith('.png') && !f.endsWith('.diff.png'));
if (!variants.length) { console.error(`No edits named ${stem}-*.png next to the base.`); process.exit(1); }
const read = async f => sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const b = await read(base);
let worst = 0;
for (const v of variants) {
  const e = await read(path.join(dir, v));
  if (e.info.width !== b.info.width || e.info.height !== b.info.height) { console.log(`✗ ${v}: size ${e.info.width}×${e.info.height} differs from the base. Re-edit at the same size.`); worst = 1; continue; }
  const { width: W, height: H } = b.info, out = Buffer.alloc(W * H * 3);
  let changed = 0, x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let i = 0, p = 0; p < W * H; p++, i += 3) {
    const d = Math.abs(b.data[i] - e.data[i]) + Math.abs(b.data[i + 1] - e.data[i + 1]) + Math.abs(b.data[i + 2] - e.data[i + 2]);
    const g = (b.data[i] + b.data[i + 1] + b.data[i + 2]) / 9;
    if (d > 60) { changed++; out[i] = 255; out[i + 1] = 40; out[i + 2] = 40; const x = p % W, y = (p / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    else { out[i] = out[i + 1] = out[i + 2] = g; }
  }
  const pct = changed / (W * H) * 100, boxPct = x1 < 0 ? 0 : (x1 - x0) * (y1 - y0) / (W * H) * 100;
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toFile(path.join(dir, v.replace(/\.png$/, '.diff.png')));
  const verdict = pct < 4 && boxPct < 12 ? '✓' : '✗';
  if (verdict === '✗') worst = 1;
  console.log(`${verdict} ${v}: ${pct.toFixed(2)}% of pixels changed; changed box x ${x0}–${x1}, y ${y0}–${y1} (${boxPct.toFixed(1)}% of the frame).` +
    (verdict === '✗' ? ' Too much moved: re-edit and say "keep every pixel identical except the mouth/eyes".' : ` Region ≈ [${(x0 + x1) >> 1}, ${(y0 + y1) >> 1}, ${Math.ceil((x1 - x0) / 2 * 1.15)}, ${Math.ceil((y1 - y0) / 2 * 1.25)}]`));
}
process.exitCode = worst;
