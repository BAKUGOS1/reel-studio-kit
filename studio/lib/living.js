// Living illustrations for HyperFrames reels: still Codex art that blinks, breathes and sways. Characters speak in
// comic speech bubbles and thought clouds (lip-sync looked odd), so rigs have no mouth movement
// unless a spec sets lipSync: true.
// Everything is a pure function of time t (seconds), so HyperFrames can seek any frame (hf-seek).
//
// A rig is one character picture (a full scene frame or a transparent cutout) plus a few Codex edits of that same
// picture: mouth open, mouth wide, eyes closed, and optionally whole-pose expressions. Only small feathered regions
// (mouth, eyes) are swapped from the edits, so tiny differences elsewhere in an edit never flicker.
//
//   const mummy = Living.rig({ speaker: 'mummy',
//     poses: { calm: 'mummy-calm', shocked: 'mummy-shocked' },          // <img> ids, same framing
//     mouth: { at: [512, 640, 70, 42], open: { calm: 'mummy-calm-open' }, wide: { calm: 'mummy-calm-wide' } },
//     eyes:  { at: [512, 470, 170, 48], closed: { calm: 'mummy-calm-blink', shocked: 'mummy-shocked-blink' } },
//     breath: { pivot: [512, 1300] }, sway: { pivot: [512, 1500] }, seed: 7 });
//   mummy.draw(ctx, t, { x, y, w, h, keys: [[0, 'calm'], [6.2, 'shocked']] });
//
// Region numbers are in the source image's own pixels: [centre x, centre y, radius x, radius y].
(function () {
  const clamp = v => Math.max(0, Math.min(1, v)), smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };
  const ease = v => 1 - (1 - clamp(v)) ** 3, lerp = (a, b, t) => a + (b - a) * t, prog = (t, a, b) => clamp((t - a) / (b - a));
  const img = id => typeof id === 'string' ? document.getElementById(id) : id;
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // Cover-fit an image to the 1080×1920 frame with a focus point, zoom and drift. Returns where it landed.
  function cover(ctx, im, { fx = .5, fy = .5, zoom = 1, dx = 0, dy = 0, alpha = 1, filter } = {}) {
    im = img(im); const W = ctx.canvas.width, H = ctx.canvas.height;
    const s = Math.max(W / im.naturalWidth, H / im.naturalHeight) * zoom, w = im.naturalWidth * s, h = im.naturalHeight * s;
    const px = Math.min(0, Math.max(W - w, W / 2 - fx * w + dx)), py = Math.min(0, Math.max(H - h, H / 2 - fy * h + dy));
    ctx.save(); if (filter) ctx.filter = filter; ctx.globalAlpha = alpha; ctx.drawImage(im, px, py, w, h); ctx.restore();
    return { x: px, y: py, w, h, scale: s };
  }
  const drift = (t, k = 1, amp = 1) => ({ dx: Math.sin(t * .9 + k) * 7 * amp, dy: Math.cos(t * .7 + k * 2) * 6 * amp });

  // Keyed values: keys [[t0, v0], [t1, v1], ...], eased between. Numbers or {x,y,zoom} objects.
  function keyed(keys, t, e = smooth) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) {
      const [a, va] = keys[i - 1], [b, vb] = keys[i], p = e((t - a) / (b - a));
      if (typeof va === 'number') return lerp(va, vb, p);
      const o = {}; for (const k in va) o[k] = lerp(va[k], vb[k] ?? va[k], p); return o;
    }
    return keys[keys.length - 1][1];
  }
  // The state of a step key list at t, and how long ago it changed.
  function stepAt(keys, t) { let cur = keys[0], prev = null; for (const k of keys) if (t >= k[0]) { prev = cur === k ? prev : cur; cur = k; } return { value: cur[1], since: t - cur[0], previous: prev && prev !== cur ? prev[1] : null }; }

  // Blink times for a seed: every 2.2–5 s, sometimes a double blink.
  function blinkSchedule(seed, until = 120) { const r = rng(seed), out = []; let t = .6 + r() * 1.5; while (t < until) { out.push(t); if (r() < .18) out.push(t + .28); t += 2.2 + r() * 2.8; } return out; }
  function eyeClosure(times, t) { for (const b of times) { const d = t - b; if (d >= 0 && d < .16) return d < .05 ? d / .05 : d < .11 ? 1 : 1 - (d - .11) / .05; if (b > t) break; } return 0; }

  // Mouth openness for a speaker at t from window.REEL.mouths (per-frame 0–1), lightly smoothed.
  function mouthLevel(speaker, t) {
    const R = window.REEL, m = R && R.mouths && R.mouths[speaker]; if (!m) return 0;
    const f = t * R.fps, i = Math.floor(f), at = k => m[Math.max(0, Math.min(m.length - 1, k))] || 0;
    return Math.max(at(i), at(i + 1) * (f - i), .6 * at(i - 1));
  }

  // Draws a feathered ellipse of `src` over the same place of the base picture (source-pixel coords).
  const SCRATCH = document.createElement('canvas'), sx = SCRATCH.getContext('2d');
  function patch(ctx, src, [cx, cy, rx, ry], alpha = 1, feather = .35) {
    if (alpha <= 0) return; src = img(src);
    const w = Math.ceil(rx * 2), h = Math.ceil(ry * 2); if (SCRATCH.width < w || SCRATCH.height < h) { SCRATCH.width = Math.max(SCRATCH.width, w); SCRATCH.height = Math.max(SCRATCH.height, h); }
    sx.clearRect(0, 0, w, h); sx.globalCompositeOperation = 'source-over'; sx.drawImage(src, cx - rx, cy - ry, w, h, 0, 0, w, h);
    sx.globalCompositeOperation = 'destination-in'; sx.save(); sx.translate(rx, ry); sx.scale(1, ry / rx);
    const g = sx.createRadialGradient(0, 0, rx * (1 - feather), 0, 0, rx); g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    sx.fillStyle = g; sx.beginPath(); sx.arc(0, 0, rx, 0, 7); sx.fill(); sx.restore(); sx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.globalAlpha *= alpha; ctx.drawImage(SCRATCH, 0, 0, w, h, cx - rx, cy - ry, w, h); ctx.restore();
  }

  function rig(spec) {
    const blinks = blinkSchedule(spec.seed || 1), sway = spec.sway || {}, breath = spec.breath || {};
    const poseImg = pose => img(spec.poses[pose] || Object.values(spec.poses)[0]);
    function drawPose(ctx, t, pose, alpha, talk) {
      const base = poseImg(pose); ctx.save(); ctx.globalAlpha *= alpha; ctx.drawImage(base, 0, 0);
      if (spec.eyes && spec.eyes.closed && spec.eyes.closed[pose]) { const c = eyeClosure(blinks, t); if (c > 0) patch(ctx, spec.eyes.closed[pose], spec.eyes.at, c, spec.eyes.feather); }
      if (spec.mouth && talk > 0) {
        const open = spec.mouth.open && spec.mouth.open[pose], wide = spec.mouth.wide && spec.mouth.wide[pose];
        if (wide && talk > .62) patch(ctx, wide, spec.mouth.at, smooth((talk - .62) / .2), spec.mouth.feather);
        if (open && talk > .22 && !(wide && talk > .82)) patch(ctx, open, spec.mouth.at, smooth((talk - .22) / .15), spec.mouth.feather);
      }
      ctx.restore();
    }
    return {
      spec,
      // place: {x, y, w, h} in frame pixels for the whole source image; keys: [[t, pose], ...].
      // inside(ctx, t): drawn after the picture, in its source pixels and under the same breath and sway, so a phone
      // screen mapped onto the picture moves with it.
      draw(ctx, t, place, { keys, talk = null, alpha = 1, inside = null } = {}) {
        const base = poseImg(spec.poses && Object.keys(spec.poses)[0]), iw = base.naturalWidth, ih = base.naturalHeight;
        const st = stepAt(keys || [[0, Object.keys(spec.poses)[0]]], t), level = talk ?? (spec.lipSync && spec.speaker ? mouthLevel(spec.speaker, t) : 0);
        ctx.save(); ctx.translate(place.x, place.y); ctx.scale(place.w / iw, place.h / ih);
        // Idle life: breathing from the chest, a slow sway from the hips. Never both on the same curve.
        const [bx, by] = breath.pivot || [iw / 2, ih * .8], [wx, wy] = sway.pivot || [iw / 2, ih];
        const b = 1 + (breath.amount ?? .006) * Math.sin(t * 2 * Math.PI / (breath.period || 3.6) + (spec.seed || 0));
        const r = (sway.deg ?? .45) * Math.PI / 180 * Math.sin(t * 2 * Math.PI / (sway.period || 5.4) + 1.3 * (spec.seed || 0));
        ctx.translate(wx, wy); ctx.rotate(r); ctx.translate(-wx, -wy);
        ctx.translate(bx, by); ctx.scale(1, b); ctx.translate(-bx, -by);
        // A mood change is a take: a small squash on the new pose and a 0.14 s dissolve from the old one.
        if (st.previous && st.since < .14) { drawPose(ctx, t, st.previous, 1 - st.since / .14, level); }
        if (st.since < .3) { const q = 1 - .02 * Math.sin(Math.PI * prog(st.since, 0, .3)); ctx.translate(bx, ih); ctx.scale(1 / q, q); ctx.translate(-bx, -ih); }
        drawPose(ctx, t, st.value, st.previous && st.since < .14 ? st.since / .14 : 1, level);
        if (inside) inside(ctx, t);
        ctx.restore();
      },
    };
  }

  // Word-by-word captions from window.REEL.captions, inside the 168–1330 px band.
  // speakers: only these speakers' lines, e.g. ['narrator'] when the characters talk in balloons.
  // sentences: show one sentence of a long line at a time (a word ending in . ? or ! closes a sentence), so a long
  // narrator line never stacks four lines of words over the picture.
  function captions(ctx, t, { y = 1300, size = 64, maxW = 860, hot = null, font = 'Outfit', color = '#F6F5F2', hotColor = '#FF5A6E', speakers = null, sentences = false } = {}) {
    const R = window.REEL; if (!R) return; let cap = R.captions.find(c => t >= c.a - .05 && t <= c.b + .35 && (!speakers || speakers.includes(c.speaker))); if (!cap) return;
    if (sentences) { const groups = [[]]; cap.words.forEach((o, i) => { groups[groups.length - 1].push(o); if (/[.?!]$/.test(o.w) && i < cap.words.length - 1) groups.push([]); });
      const g = groups.reduce((cur, gr) => (t >= gr[0].a - .08 ? gr : cur), groups[0]); cap = { ...cap, words: g }; }
    const fade = 1 - smooth((t - cap.b - .15) / .2); ctx.save(); ctx.font = `800 ${size}px "${font}"`; ctx.textBaseline = 'alphabetic';
    // Words marked big ("::" in the caption, see mix.mjs) start their own line at 1.6× size: the line that has to land.
    const fontFor = o => o.big ? `900 ${Math.round(size * 1.6)}px "${font}"` : `800 ${size}px "${font}"`;
    const lines = []; let line = [], lw = 0;
    cap.words.forEach((o, i) => { ctx.font = fontFor(o); const ww = ctx.measureText(o.w).width, space = ctx.measureText(' ').width, startsBig = o.big && line.length && !line[line.length - 1].big;
      if ((lw + ww > maxW && line.length) || startsBig) { lines.push(line); line = []; lw = 0; } line.push({ ...o, i, ww, space }); lw += ww + space; }); lines.push(line);
    const lhOf = ln => (ln.some(o => o.big) ? size * 1.6 : size) * 1.22;
    let yy = y - lines.reduce((s, ln) => s + lhOf(ln), 0);
    lines.forEach(ln => { const lh = lhOf(ln), tot = ln.reduce((s, o) => s + o.ww + o.space, 0) - ln[ln.length - 1].space; let px = ctx.canvas.width / 2 - tot / 2;
      for (const o of ln) { ctx.font = fontFor(o); const p = ease(prog(t, o.a - .03, o.a + .1)); if (p > 0) { ctx.globalAlpha = p * fade; ctx.fillStyle = hot && hot.test(o.w) ? hotColor : color; ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 18; ctx.fillText(o.w, px, yy + lh * .8 + (1 - p) * 16); } px += o.ww + o.space; }
      yy += lh; });
    ctx.restore();
  }

  // Finishing passes shared by every shot.
  const NOISE = [0, 1, 2, 3].map(k => { const n = document.createElement('canvas'); n.width = 540; n.height = 960; const g = n.getContext('2d'), d = g.createImageData(540, 960), r = rng(91 + k); for (let i = 0; i < d.data.length; i += 4) { const v = 96 + r() * 64; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); return n; });
  function grade(ctx, t, { vignette = .5, grain = .16, lift = '#1E1A16' } = {}) {
    const W = ctx.canvas.width, H = ctx.canvas.height; ctx.save();
    const g = ctx.createRadialGradient(W / 2, H * .45, H * .22, W / 2, H * .5, H * .78); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(16,11,8,${vignette})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighten'; ctx.fillStyle = lift; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = grain; ctx.drawImage(NOISE[Math.floor(t * 24) % 4], 0, 0, W, H); ctx.restore();
  }
  // A shade that is darkest at `from` and clear at `to`: scrim(ctx, 0, 380) shades the top, scrim(ctx, 1920, 1080) the bottom.
  function scrim(ctx, from, to, a = .7) { const g = ctx.createLinearGradient(0, from, 0, to); g.addColorStop(0, `rgba(22,16,12,${a})`); g.addColorStop(1, 'rgba(22,16,12,0)'); ctx.fillStyle = g; ctx.fillRect(0, Math.min(from, to), ctx.canvas.width, Math.abs(to - from)); }

  // Comic balloons, hand-lettered in Kalam: bubble() is speech (rounded box, pointed tail), thought() is a cloud with
  // trailing puffs. Both pop in at `a` and fade out by `b`. With `line` (a voice line id such as '05') the balloon is
  // sized for the whole text at once and each word inks in as it is spoken, from that line's aligned caption words.
  function lettering(ctx, text, line, maxW, size, font) {
    ctx.font = `700 ${size}px "${font}"`;
    const cap = line && window.REEL && window.REEL.captions.find(c => c.line === line);
    const words = cap ? cap.words.map(o => ({ w: o.w, a: o.a })) : text.split(' ').map(w => ({ w, a: -Infinity }));
    const sp = ctx.measureText(' ').width, lines = []; let cur = [], cw = 0;
    for (const o of words) { const ww = ctx.measureText(o.w).width; if (cw + ww > maxW && cur.length) { lines.push(cur); cur = []; cw = 0; } cur.push({ ...o, ww }); cw += ww + sp; }
    lines.push(cur); const widths = lines.map(l => l.reduce((n, o) => n + o.ww + sp, 0) - sp);
    return { lines, widths, sp, lh: size * 1.25, tw: Math.max(...widths) };
  }
  function inkWords(ctx, t, T, ink, ga) {
    ctx.save(); ctx.fillStyle = ink; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    T.lines.forEach((ln, i) => { let x = -T.widths[i] / 2; const y = -(T.lines.length * T.lh) / 2 + T.lh / 2 + i * T.lh;
      for (const o of ln) { const q = o.a === -Infinity ? 1 : ease((t - o.a + .04) / .14); if (q > 0) { ctx.globalAlpha = q * ga; ctx.fillText(o.w, x, y + (1 - q) * 6); } x += o.ww + T.sp; } });
    ctx.restore();
  }
  function bubble(ctx, t, text, { x, y, maxW = 640, a = 0, b = Infinity, tail = null, size = 46, font = 'Kalam', ink = '#141414', paper = '#F6F5F2', line = null }) {
    if (t < a || t > b) return; const p = ease((t - a) / .16), out = 1 - smooth((t - b + .2) / .2); ctx.save();
    const T = lettering(ctx, text, line, maxW - 60, size, font), w = T.tw + 60, h = T.lines.length * T.lh + 36, cx = x + w / 2, cy = y + h / 2;
    ctx.translate(cx, cy); ctx.scale(.84 + .16 * p, .84 + .16 * p); const ga = Math.min(1, p * 1.6) * out; ctx.globalAlpha = ga;
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 30);
    if (tail) { const tx = tail[0] - cx, ty = tail[1] - cy, ex = Math.max(-w / 2 + 50, Math.min(w / 2 - 50, tx * .5)), ey = ty > 0 ? h / 2 - 2 : -h / 2 + 2, d = Math.hypot(tx - ex, ty - ey) || 1, k = Math.min(110, d * .7); ctx.moveTo(ex - 24, ey); ctx.lineTo(ex + (tx - ex) / d * k, ey + (ty - ey) / d * k); ctx.lineTo(ex + 24, ey); }
    ctx.fillStyle = paper; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.stroke();
    inkWords(ctx, t, T, ink, ga); ctx.restore();
  }
  // A thought cloud: a ring of puffs round the words, outlined as one shape, and three shrinking puffs toward `tail`.
  function thought(ctx, t, text, { x, y, maxW = 640, a = 0, b = Infinity, tail = null, size = 44, font = 'Kalam', ink = '#141414', paper = '#F6F5F2', line = null }) {
    if (t < a || t > b) return; const p = ease((t - a) / .22), out = 1 - smooth((t - b + .25) / .25); ctx.save();
    const T = lettering(ctx, text, line, maxW - 110, size, font), rx = T.tw / 2 + 70, ry = (T.lines.length * T.lh) / 2 + 52, cx = x + rx, cy = y + ry;
    const pr = Math.min(44, ry * .5), n = Math.max(10, Math.round(Math.PI * (rx + ry) / (pr * 1.35))), puffs = [];
    for (let i = 0; i < n; i++) { const k = i / n * Math.PI * 2, j = 1 + .16 * Math.sin(i * 2.3); puffs.push([Math.cos(k) * (rx - pr * .6), Math.sin(k) * (ry - pr * .55), pr * j]); }
    const trail = [];
    if (tail) { const tx = tail[0] - cx, ty = tail[1] - cy, d = Math.hypot(tx, ty) || 1, ux = tx / d, uy = ty / d, edge = 1 / Math.hypot(ux / rx, uy / ry);
      [[.15, 22], [.48, 15], [.82, 10]].forEach(([q, r]) => { const at = edge + 14 + (d - edge - 14) * q; trail.push([ux * at, uy * at, r]); }); }
    ctx.translate(cx, cy); ctx.scale(.8 + .2 * p, .8 + .2 * p); const ga = Math.min(1, p * 1.5) * out; ctx.globalAlpha = ga;
    const shape = () => { ctx.beginPath(); ctx.ellipse(0, 0, rx - pr * .6, ry - pr * .55, 0, 0, 7); for (const [px, py, r] of puffs) { ctx.moveTo(px + r, py); ctx.arc(px, py, r, 0, 7); } };
    // Outline trick: fill (with the shadow), stroke every puff in ink, fill again in paper, so only the outer edge stays inked.
    ctx.fillStyle = paper; ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10; shape(); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = ink; ctx.lineWidth = 8; shape(); ctx.stroke(); shape(); ctx.fill();
    trail.forEach(([px, py, r], i) => { const q = ease((t - a - .05 - i * .07) / .14); if (q <= 0) return; ctx.save(); ctx.globalAlpha = ga * q; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fillStyle = paper; ctx.fill(); ctx.lineWidth = 4; ctx.stroke(); ctx.restore(); });
    inkWords(ctx, t, T, ink, ga); ctx.restore();
  }

  // Maps a picture (a captured app screen, or a drawn canvas) onto a phone screen in the art. quad: the screen's four
  // corners in the current coordinates (top-left, top-right, bottom-right, bottom-left, from studio/tools/find-screens.mjs).
  // crop: the part of the source to show, [sx, sy, sw, sh] (default all of it). Two affine triangles clipped to the quad,
  // then a little glass: a soft night glow so the screen reads as lit, and a sheen.
  function screen(ctx, src, quad, { crop = null, alpha = 1, glow = .35, sheen = .1, dim = 0 } = {}) {
    // Before the art has loaded, a place (and so the quad) can be NaN: draw nothing rather than throw.
    src = img(src); const sw0 = src && (src.naturalWidth || src.width); if (!sw0 || alpha <= 0 || !quad.flat().every(Number.isFinite)) return;
    const [sx, sy, sw, sh] = crop || [0, 0, sw0, src.naturalHeight || src.height], S = [[0, 0], [sw, 0], [sw, sh], [0, sh]];
    const tri = (i, j, k) => { const [u0, v0] = S[i], [u1, v1] = S[j], [u2, v2] = S[k], [x0, y0] = quad[i], [x1, y1] = quad[j], [x2, y2] = quad[k];
      const den = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0);
      const A = ((x1 - x0) * (v2 - v0) - (x2 - x0) * (v1 - v0)) / den, C = ((x2 - x0) * (u1 - u0) - (x1 - x0) * (u2 - u0)) / den;
      const B = ((y1 - y0) * (v2 - v0) - (y2 - y0) * (v1 - v0)) / den, D = ((y2 - y0) * (u1 - u0) - (y1 - y0) * (u2 - u0)) / den;
      // Grow each triangle a hair past the shared diagonal so no seam shows.
      const gx = (x0 + x1 + x2) / 3, gy = (y0 + y1 + y2) / 3, g = (x, y) => [x + (x - gx) * .015, y + (y - gy) * .015];
      ctx.save(); ctx.beginPath(); ctx.moveTo(...g(x0, y0)); ctx.lineTo(...g(x1, y1)); ctx.lineTo(...g(x2, y2)); ctx.closePath(); ctx.clip();
      ctx.transform(A, B, C, D, x0 - A * u0 - C * v0, y0 - B * u0 - D * v0); ctx.drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh); ctx.restore(); };
    const path = () => { ctx.beginPath(); quad.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); };
    ctx.save(); ctx.globalAlpha *= alpha;
    if (glow > 0) { ctx.save(); ctx.globalAlpha *= glow; ctx.shadowColor = 'rgba(235,240,255,.9)'; ctx.shadowBlur = 40; path(); ctx.fillStyle = 'rgba(235,240,255,.5)'; ctx.fill(); ctx.restore(); }
    ctx.save(); path(); ctx.clip(); tri(0, 1, 2); tri(0, 2, 3);
    if (dim > 0) { ctx.fillStyle = `rgba(10,8,6,${dim})`; path(); ctx.fill(); }
    if (sheen > 0) { const [p0, , p2] = quad, g = ctx.createLinearGradient(p0[0], p0[1], p2[0], p2[1]); g.addColorStop(0, `rgba(255,255,255,${sheen})`); g.addColorStop(.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.08)'); ctx.fillStyle = g; path(); ctx.fill(); }
    ctx.restore(); ctx.restore();
  }
  // A quad in a picture's source pixels → frame pixels, for a picture drawn at place {x, y, w, h} (e.g. from cover()).
  const toFrame = (quad, place, iw, ih) => quad.map(([x, y]) => [place.x + x * place.w / iw, place.y + y * place.h / ih]);

  // A red-pen ellipse drawn on over 0–1 progress.
  function pen(ctx, cx, cy, rx, ry, p, { width = 8, color = '#D0213B', rot = -.06 } = {}) {
    if (p <= 0) return; const len = 2 * Math.PI * Math.sqrt((rx * rx + ry * ry) / 2) * 1.12; ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.setLineDash([len * clamp(p), len]); ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, -.4, Math.PI * 2 + .35); ctx.stroke(); ctx.restore();
  }

  window.Living = { rng, cover, drift, keyed, stepAt, rig, patch, mouthLevel, blinkSchedule, captions, bubble, thought, screen, toFrame, pen, grade, scrim, clamp, smooth, ease, lerp, prog };
})();
