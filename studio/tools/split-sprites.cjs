// Split a 2×4 sprite sheet (after removing the background, e.g. `uvx rembg i sheet.png sheet-nobg.png`) into clean, trimmed sprites by connected components of alpha.
// Each component goes to the grid cell holding its centre, so slivers of a neighbour stay with the neighbour.
// node studio/tools/split-sprites.cjs <sheet-nobg.png> <outdir> <name1,...,name8> [COLSxROWS]
// The grid defaults to 2 columns x 4 rows; pass 4x2 for a landscape sheet (names go left to right, top to bottom).
const sharp = require(require.resolve('sharp', { paths: [process.cwd()] }));
const fs = require('fs');
const [sheet, outdir, names, grid = '2x4'] = process.argv.slice(2); const list = names.split(','); const [COLS, ROWS] = grid.split('x').map(Number);
fs.mkdirSync(outdir, { recursive: true });
(async () => {
  const { data, info } = await sharp(sheet).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H, lab = new Int32Array(N).fill(-1), comps = [];
  for (let s = 0; s < N; s++) {
    if (lab[s] !== -1 || data[s * 4 + 3] < 24) continue;
    const id = comps.length, st = [s]; lab[s] = id; let n = 0, sx = 0, sy = 0;
    while (st.length) { const p = st.pop(), x = p % W, y = (p / W) | 0; n++; sx += x; sy += y;
      for (const q of [p - 1, p + 1, p - W, p + W]) { if (q < 0 || q >= N) continue; if ((q === p - 1 && x === 0) || (q === p + 1 && x === W - 1)) continue;
        if (lab[q] === -1 && data[q * 4 + 3] >= 24) { lab[q] = id; st.push(q); } } }
    comps.push({ n, cx: sx / n, cy: sy / n });
  }
  const cellOf = c => Math.min(ROWS - 1, Math.floor(c.cy / (H / ROWS))) * COLS + Math.min(COLS - 1, Math.floor(c.cx / (W / COLS)));
  for (let cell = 0; cell < 8; cell++) {
    const keep = new Set(comps.map((c, i) => [c, i]).filter(([c]) => c.n >= 30 && cellOf(c) === cell).map(([, i]) => i));
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let p = 0; p < N; p++) if (keep.has(lab[p])) { const x = p % W, y = (p / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const pad = 6; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
    const w = x1 - x0 + 1, h = y1 - y0 + 1, out = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = (y + y0) * W + (x + x0), o = (y * w + x) * 4;
      if (lab[p] === -1 || keep.has(lab[p])) { data.copy(out, o, p * 4, p * 4 + 4); if (lab[p] === -1 && data[p * 4 + 3] >= 24) out[o + 3] = 0; } }
    const file = `${outdir}/${list[cell]}.png`;
    await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toFile(file);
    console.log(file, `${w}x${h}`, `${keep.size} part(s)`);
  }
})();
