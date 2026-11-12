// The reel's shots. Edit this file; index.html stays as it is.
// Times come from the voice: cue('03').at is when line 03 starts, cue('03').end when it ends (window.REEL, made by mix.mjs).
// Every visible thing is a function of t, so any frame renders on its own.
(function () {
  const W = 1080, H = 1920, L = window.Living;

  // 1. Pictures: id → file in assets/. Codex art goes in assets/art/ (see codex-prompts.md).
  const IMAGES = {
    // 'mummy-calm': 'assets/art/mummy-calm.png',
    // 'mummy-calm-open': 'assets/art/mummy-calm-mouth-open.png',
    // 'mummy-calm-wide': 'assets/art/mummy-calm-mouth-wide.png',
    // 'mummy-calm-blink': 'assets/art/mummy-calm-eyes-closed.png',
  };
  for (const [id, src] of Object.entries(IMAGES)) { const im = new Image(); im.id = id; im.src = src; im.style.display = 'none'; document.body.appendChild(im); }

  // 2. Living characters. Regions are [centre x, centre y, radius x, radius y] in the picture's own pixels.
  const RIGS = {
    // mummy: L.rig({ speaker: 'mummy', seed: 3,
    //   poses: { calm: 'mummy-calm' },
    //   mouth: { at: [512, 700, 60, 36], open: { calm: 'mummy-calm-open' }, wide: { calm: 'mummy-calm-wide' } },
    //   eyes: { at: [512, 520, 150, 40], closed: { calm: 'mummy-calm-blink' } },
    //   breath: { pivot: [512, 1200] }, sway: { pivot: [512, 1536] } }),
  };

  const R = () => window.REEL || { duration: 10, cues: [], captions: [], mouths: {}, fps: 30 };
  const cue = line => R().cues.find(c => c.line === line) || { at: 0, end: 0 };

  // 3. Shots in order. Each draws the full frame for its window [a, b).
  const SHOTS = [
    { id: 'hook', a: () => 0, b: () => R().duration,
      draw(ctx, t) {
        // Replace with the first shot. Frame 0 is the cover: a face in trouble and the ticking device, never black.
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3A2A20'); g.addColorStop(1, '#1E1A16'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.fillStyle = '#F6F5F2'; ctx.font = '700 84px "Cormorant Garamond"'; ctx.textAlign = 'center'; ctx.fillText('New reel', W / 2, 760); ctx.restore();
      } },
  ];

  // 4. The stopwatch (small, top-right) runs until the real product screen answers the question.
  const DEVICE = { label: 'FINAL COUNT', stopLabel: 'SORTED', total: () => R().duration * .7, stopAt: () => R().duration * .7 };

  window.Scene = {
    renderAt(ctx, t) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
      const shot = SHOTS.find(s => t >= s.a() && t < s.b()) || SHOTS[SHOTS.length - 1];
      shot.draw(ctx, t, t - shot.a());
      L.grade(ctx, t);
      L.scrim(ctx, 0, 380, .5);
      const stopAt = DEVICE.stopAt(), left = Math.max(0, DEVICE.total() - Math.min(t, stopAt));
      if (window.ReelStopwatch && !shot.noDevice) ReelStopwatch.draw(ctx, { t, left, total: DEVICE.total(), stopped: t >= stopAt, stopAge: t - stopAt, label: DEVICE.label, stopLabel: DEVICE.stopLabel });
      L.captions(ctx, t, { y: 1300 });
    },
    RIGS,
  };
})();
