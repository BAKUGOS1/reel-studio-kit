// Motion kit: the premium motion-graphics helpers shared so every new
// concept or product reel starts at that level. Canvas 2D, every function a pure function of t. Load after living.js:
//   <script src="assets/lib/living.js"></script> <script src="../shared/motion-kit.js"></script>   (or copy into assets/lib)
//   const K = window.MotionKit; K.setTime(t) at the top of renderAt; then K.animText(ctx, 'one place.', 540, 990, 17.5, {...}).
// Rules for using it: skills/reel-studio/playbooks/premium-motion.md.
(function () {
  const W = 1080, H = 1920;
  const L = window.Living;
  const clamp = v => Math.max(0, Math.min(1, v)), lerp = (a, b, t) => a + (b - a) * t, prog = (t, a, b) => clamp((t - a) / (b - a));
  let NOW = 0;
  // Easing: inOut = After Effects "Easy Ease" (cubic in-out). Cameras, wipes and reveals use it; nothing starts or stops abruptly.
  const inOut = v => { v = clamp(v); return v < .5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2; };
  const ease = v => 1 - (1 - clamp(v)) ** 3, easeIn = v => clamp(v) ** 3;
  const backOut = (v, s = 1.3) => { v = clamp(v) - 1; return 1 + v * v * ((s + 1) * v + s); };   // a soft overshoot for pops
  const bump = (t, at, amt, k = 8) => { const age = t - at; return age >= 0 ? amt * Math.exp(-age * k) : 0; };
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${clamp(a).toFixed(3)})`; };
  const mixHex = (a, b, q) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16), c = k => Math.round(lerp((A >> k) & 255, (B >> k) & 255, clamp(q))); return `rgb(${c(16)},${c(8)},${c(0)})`; };
  const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

  function text(ctx, s, x, y, { font, color = '#1E1A16', align = 'center', alpha = 1, base = 'alphabetic', spacing = 0, blur = 0 } = {}) {
    if (alpha <= 0) return; ctx.save(); ctx.globalAlpha *= clamp(alpha); ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base;
    if (spacing) ctx.letterSpacing = spacing + 'px'; if (blur > .3) ctx.filter = `blur(${blur.toFixed(1)}px)`;
    ctx.fillText(s, x, y); ctx.restore();
  }
  // Text animator (AE "Fade Up Characters"): each letter rises 26 px, sharpens from a 10 px blur and fades in, staggered.
  // `out` (a time) blurs the letters away upward. Start `at` ~0.1 s before the spoken word.
  function animText(ctx, s, x, y, at, { font, color = '#1E1A16', align = 'center', alpha = 1, stagger = .028, dur = .42, out = null } = {}) {
    if (alpha <= 0) return; ctx.save(); ctx.font = font; const total = ctx.measureText(s).width;
    let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i], cw = ctx.measureText(ch).width, q = inOut(prog(NOW, at + i * stagger, at + i * stagger + dur));
      const o = out ? 1 - inOut(prog(NOW, out + i * stagger * .5, out + i * stagger * .5 + .3)) : 1;
      if (q > 0 && ch !== ' ') text(ctx, ch, cx + cw / 2, y + (1 - q) * 26 - (1 - o) * 20, { font, color, alpha: alpha * q * o, blur: (1 - q) * 10 + (1 - o) * 8 });
      cx += cw;
    }
    ctx.restore();
  }
  function grain(ctx, t, amt = .035) { const r = L.rng(7 + Math.floor(t * 12)); ctx.save(); for (let i = 0; i < 600; i++) { ctx.fillStyle = r() < .5 ? `rgba(255,255,255,${amt * r()})` : `rgba(0,0,0,${amt * r()})`; ctx.fillRect(r() * W, r() * H, 2, 2); } ctx.restore(); }
  function vignette(ctx, a = .22) { const g = ctx.createRadialGradient(W / 2, H * .48, 380, W / 2, H * .48, 1250); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(20,8,10,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  // A warm light leak sweeping across a transition (screen blend). Start it ~0.2 s before the cut.
  function leak(ctx, t, at, dur = .9, a = .45) {
    const q = prog(t, at, at + dur); if (q <= 0 || q >= 1) return; const x = lerp(-400, W + 400, inOut(q)), s = Math.sin(Math.PI * q);
    ctx.save(); ctx.globalCompositeOperation = 'screen'; const g = ctx.createRadialGradient(x, H * .35, 0, x, H * .35, 900);
    g.addColorStop(0, `rgba(255,190,120,${a * s})`); g.addColorStop(.5, `rgba(242,120,90,${a * .45 * s})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  // A soft dip to light on a hit (never a hard white frame except frame 0's boom).
  const dip = (ctx, t, at, dur = .3, a = .5, col = '255,248,235') => { const f = Math.sin(Math.PI * prog(t, at - dur / 2, at + dur / 2)); if (f > 0) { ctx.fillStyle = `rgba(${col},${f * a})`; ctx.fillRect(0, 0, W, H); } };
  function glow(ctx, x, y, r, color, a = 1) {
    if (a <= 0) return; ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, 0, x, y, r * 7);
    g.addColorStop(0, rgba(color, .55 * a)); g.addColorStop(1, rgba(color, 0)); ctx.fillStyle = g; ctx.fillRect(x - r * 7, y - r * 7, r * 14, r * 14); ctx.restore();
    ctx.fillStyle = rgba('#FFF4DC', a); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  // Camera: zoom about a point with a slow handheld drift (no shakes). camKeys: [[t, {x,y,z}], …] with Easy Ease between keys.
  function cam(ctx, { x = W / 2, y = H / 2, z = 1, dx = 0, dy = 0, rot = 0 } = {}, fn, drift = 1) {
    const t = NOW, ddx = Math.sin(t * .5) * 6 * drift, ddy = Math.cos(t * .37) * 5 * drift, dr = Math.sin(t * .29) * .004 * drift;
    ctx.save(); ctx.translate(x + dx + ddx, y + dy + ddy); ctx.rotate(rot + dr); ctx.scale(z, z); ctx.translate(-x, -y); fn(); ctx.restore();
  }
  function camKeys(keys, t) { let a = keys[0]; for (const k of keys) if (t >= k[0]) a = k; const b = keys[Math.min(keys.length - 1, keys.indexOf(a) + 1)]; const q = b === a ? 1 : inOut(prog(t, a[0], b[0])); const o = {}; for (const k in a[1]) o[k] = lerp(a[1][k], b[1][k] ?? a[1][k], q); return o; }
  // A photo plate (Codex) with depth-of-field blur and a slow parallax push.
  function plate(ctx, im, t, t0, { zoom = 1.06, dof = 2.5, fy = .5 } = {}) { if (!im) return false; ctx.save(); if (dof) ctx.filter = `blur(${dof}px)`; L.cover(ctx, im, { zoom: zoom + (t - t0) * .006, fy, dx: Math.sin(t * .3) * 8 }); ctx.restore(); ctx.filter = 'none'; return true; }
  // Grown drawing (studio/tools/grow-stages.mjs): stage images cross-faded by growth g (0..1), then the full drawing.
  function grown(ctx, stages, full, g, x, y, w, h, fullFade = 0) {
    const n = stages.length, f = clamp(g) * n, k = Math.min(n - 1, Math.floor(f)), r = f - k;
    if (g <= 0) return; if (stages[k]) ctx.drawImage(stages[k], x, y, w, h);
    if (r > 0 && k < n - 1 && stages[k + 1]) { ctx.save(); ctx.globalAlpha = r; ctx.drawImage(stages[k + 1], x, y, w, h); ctx.restore(); }
    if (full && fullFade > 0) { ctx.save(); ctx.globalAlpha = clamp(fullFade); ctx.drawImage(full, x, y, w, h); ctx.restore(); }
  }
  // Word-by-word captions from window.REEL (mix.mjs). opts.y per line id, opts.skip = line ids that already show on screen.
  function captions(ctx, t, { y = {}, skip = [] } = {}) {
    const R = window.REEL; if (!R || !R.captions) return; const c = R.captions.find(c => t >= c.a - .05 && t < c.b + .5); if (!c || skip.includes(c.line)) return;
    const a = clamp((t - c.a + .05) / .2) * (1 - prog(t, c.b + .2, c.b + .5));
    ctx.save(); ctx.font = `600 38px Outfit, sans-serif`; const words = c.words, space = ctx.measureText(' ').width, widths = words.map(w => ctx.measureText(w.w).width);
    const lines = [[]]; let lw = 0; words.forEach((w, i) => { if (lw + widths[i] > 820 && lines.at(-1).length) { lines.push([]); lw = 0; } lines.at(-1).push(i); lw += widths[i] + space; });
    const y0 = y[c.line] ?? 1300 - (lines.length - 1) * 50;
    lines.forEach((ln, li) => { const tw = ln.reduce((s, i) => s + widths[i] + space, -space); let x = W / 2 - tw / 2; ln.forEach(i => { ctx.globalAlpha = a * (t >= words[i].a ? 1 : .45); ctx.fillStyle = '#FFFFFF'; ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 14; ctx.fillText(words[i].w, x, y0 + li * 50); x += widths[i] + space; }); });
    ctx.restore();
  }
  window.MotionKit = { W, H, setTime: t => { NOW = t; }, clamp, lerp, prog, inOut, ease, easeIn, backOut, bump, rgba, mixHex, rr, text, animText, grain, vignette, leak, dip, glow, cam, camKeys, plate, grown, captions };
})();
