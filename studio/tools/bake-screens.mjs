// Bakes real screens into the flat grey phone screens of a Codex picture so they look photographed, not pasted.
//   node studio/tools/bake-screens.mjs src/<slug>/screens-bake.json
// Config: { "base": "assets/art/x.png", "out": "assets/art/x-screen.png", "screens": [ { "src": "ui/screen.png",
//   "corners": [[x,y]×4 TL,TR,BR,BL] (from find-screens.mjs), "grow": 3, "tint": 22,
//   "gain": [r,g,b], "contrast": 0.9, "falloff": 0.12, "reflection": 0.1, "blur": 0.5, "grain": 4, "glow": 0.1, "glowRadius": 40 } ] }
// Paths are relative to the config file. What it does, per screen:
//  1. a true perspective warp (homography) of the screen onto the quad, supersampled 3×3 per pixel;
//  2. the mask comes from the picture's own grey pixels, so the rounded corners and the bezel stay exactly as painted,
//     with soft edge alpha where grey blends into the bezel; skin and other coloured pixels are never covered;
//  3. the room's light: colour gain, slightly lifted blacks, a fall-off toward the bottom, a soft diagonal reflection,
//     a touch of blur and grain to match the painting;
//  4. the screen's light spilling onto nearby fingers and faces (additive, outside the screen).
// The screen's pixels themselves are never redrawn: only warped, graded and lit.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const cfgFile = path.resolve(process.argv[2] || '');
if (!fs.existsSync(cfgFile)) { console.error('Usage: bake-screens.mjs <screens-bake.json>'); process.exit(1); }
const cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8')), dir = path.dirname(cfgFile), at = p => path.resolve(dir, p);

// Solve the 3×3 homography mapping the unit square (0,0),(1,0),(1,1),(0,1) onto four points.
function homography(pts) {
  const src = [[0, 0], [1, 0], [1, 1], [0, 1]], A = [], b = [];
  for (let i = 0; i < 4; i++) { const [u, v] = src[i], [x, y] = pts[i];
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); b.push(x); A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); b.push(y); }
  for (let c = 0; c < 8; c++) { let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < 8; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; } }
  const h = b.map((v, i) => v / A[i][i]); return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}
function invert3(m) {
  const [a, b, c, d, e, f, g, h, i] = m, A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}
const insidePoly = (x, y, P) => { let s = false; for (let i = 0, j = 3; i < 4; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) s = !s; } return s; };

const base = await sharp(at(cfg.base)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = base.info.width, H = base.info.height, img = new Float32Array(base.data);
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

for (const s of cfg.screens) {
  const grow = s.grow ?? 3, tint = s.tint ?? 22;
  // The detected corners sit inside the rounded arcs (and the detector erodes 2 px); push each corner out by `grow`
  // along both of its edges, so every side of the quad moves outward by `grow` whatever the phone's proportions.
  const C = s.corners, unit = (a, b) => { const dx = a[0] - b[0], dy = a[1] - b[1], L = Math.hypot(dx, dy) || 1; return [dx / L, dy / L]; };
  const quad = C.map((p, i) => { const e1 = unit(p, C[(i + 1) % 4]), e2 = unit(p, C[(i + 3) % 4]); return [p[0] + (e1[0] + e2[0]) * grow, p[1] + (e1[1] + e2[1]) * grow]; });
  const Hm = homography(quad), Hi = invert3(Hm);
  const qw = Math.hypot(quad[1][0] - quad[0][0], quad[1][1] - quad[0][1]), qh = Math.hypot(quad[3][0] - quad[0][0], quad[3][1] - quad[0][1]);
  // Downscale the screen once to about 4× the target size, then sample it bilinearly.
  const scr = await sharp(at(s.src)).removeAlpha().resize(Math.round(qw * 4), Math.round(qh * 4), { fit: 'fill', kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true });
  const SW = scr.info.width, SH = scr.info.height, sd = scr.data;
  const samp = (u, v, ch) => { const x = Math.min(SW - 1.001, Math.max(0, u * SW - .5)), y = Math.min(SH - 1.001, Math.max(0, v * SH - .5)), x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = (y0 * SW + x0) * 3 + ch;
    return sd[i] * (1 - fx) * (1 - fy) + sd[i + 3] * fx * (1 - fy) + sd[i + SW * 3] * (1 - fx) * fy + sd[i + SW * 3 + 3] * fx * fy; };
  // Bounding box of the grown quad, padded for the glow.
  const R = s.glowRadius ?? 40, xs = quad.map(p => p[0]), ys = quad.map(p => p[1]);
  const X0 = Math.max(0, Math.floor(Math.min(...xs)) - R), X1 = Math.min(W - 1, Math.ceil(Math.max(...xs)) + R), Y0 = Math.max(0, Math.floor(Math.min(...ys)) - R), Y1 = Math.min(H - 1, Math.ceil(Math.max(...ys)) + R);
  const BW = X1 - X0 + 1, BH = Y1 - Y0 + 1, alpha = new Float32Array(BW * BH), layer = new Float32Array(BW * BH * 3);
  // Grey level of this screen: the median brightness of its flat interior.
  const inner = []; for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) if (insidePoly(x, y, s.corners)) { const i = (y * W + x) * 3; inner.push((img[i] + img[i + 1] + img[i + 2]) / 3); }
  inner.sort((p, q) => p - q); const greyL = inner[inner.length >> 1] || 140, bezelL = 35;
  const gain = s.gain || [1, 1, 1], contrast = s.contrast ?? .92, fall = s.falloff ?? .12, refl = s.reflection ?? .1, grain = s.grain ?? 4;
  let sum = [0, 0, 0], cnt = 0;
  for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
    const k = (y - Y0) * BW + (x - X0), i = (y * W + x) * 3, r = img[i], g = img[i + 1], b = img[i + 2];
    if (!insidePoly(x, y, quad)) continue;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), L = (r + g + b) / 3;
    // Coverage: grey-like pixels only, softened where the grey fades into the dark bezel.
    alpha[k] = mx - mn > tint + 12 ? 0 : Math.max(0, Math.min(1, (L - bezelL) / (greyL - bezelL)));
    let acc = [0, 0, 0];
    for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 3; sx++) {
      const px = x + (sx + .5) / 3 - .5, py = y + (sy + .5) / 3 - .5, w = Hi[6] * px + Hi[7] * py + Hi[8];
      const u = (Hi[0] * px + Hi[1] * py + Hi[2]) / w, v = (Hi[3] * px + Hi[4] * py + Hi[5]) / w;
      for (let ch = 0; ch < 3; ch++) acc[ch] += samp(u, v, ch) / 9;
    }
    const pw = Hi[6] * x + Hi[7] * y + Hi[8], u = (Hi[0] * x + Hi[1] * y + Hi[2]) / pw, v = (Hi[3] * x + Hi[4] * y + Hi[5]) / pw;
    // The room's light on the glass: gain, lifted blacks, fall-off down the screen, a soft diagonal reflection band.
    const shade = 1 - fall * Math.max(0, v), band = Math.exp(-Math.pow((u + v * .55 - .32) / .16, 2)) * refl * 255;
    for (let ch = 0; ch < 3; ch++) layer[k * 3 + ch] = (acc[ch] * contrast + 255 * (1 - contrast) * .35) * gain[ch] * shade + band;
    if (alpha[k] > .9) { for (let ch = 0; ch < 3; ch++) sum[ch] += layer[k * 3 + ch]; cnt++; }
  }
  // Match the painting's softness: blur the screen layer slightly, then add grain.
  const blurred = s.blur ? await sharp(Buffer.from(Uint8ClampedArray.from(layer)), { raw: { width: BW, height: BH, channels: 3 } }).blur(Math.max(.3, s.blur)).raw().toBuffer() : null;
  const mean = sum.map(v => v / Math.max(1, cnt));
  for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
    const k = (y - Y0) * BW + (x - X0), i = (y * W + x) * 3, a = alpha[k];
    if (a > 0) { const n = (rnd() - .5) * 2 * grain; for (let ch = 0; ch < 3; ch++) { const v = (blurred ? blurred[k * 3 + ch] : layer[k * 3 + ch]) + n; img[i + ch] = img[i + ch] * (1 - a) + v * a; } }
    else if (s.glow) {
      // The lit screen's spill on fingers and faces nearby: additive, fading with distance from the screen's edge.
      let d = Infinity; for (let j = 0, m = 3; j < 4; m = j++) { const [x1, y1] = quad[m], [x2, y2] = quad[j], dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy))); d = Math.min(d, Math.hypot(x - x1 - t * dx, y - y1 - t * dy)); }
      if (d < R) { const f = s.glow * Math.pow(1 - d / R, 2); for (let ch = 0; ch < 3; ch++) img[i + ch] += mean[ch] * f * (img[i + ch] / 255 + .25); }
    }
  }
  console.log(`${path.basename(s.src)} → quad ${JSON.stringify(quad.map(p => p.map(Math.round)))} · grey ${greyL.toFixed(0)}`);
}
await sharp(Buffer.from(Uint8ClampedArray.from(img)), { raw: { width: W, height: H, channels: 3 } }).png().toFile(at(cfg.out));
console.log('wrote', path.relative(process.cwd(), at(cfg.out)));
