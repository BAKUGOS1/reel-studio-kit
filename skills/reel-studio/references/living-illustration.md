# Living illustrations

Still Codex art that acts. The runtime is `studio/lib/living.js` (copied into each reel as `assets/lib/living.js`), drawn on one canvas that HyperFrames seeks frame by frame.

## What moves, and from what

| Life | Source | Runtime |
|---|---|---|
| Blink | an *eyes closed* edit of the same picture | seeded schedule every 2.2–5 s, sometimes a double blink, 0.16 s each |
| Speech | nothing in the picture | a comic balloon: `Living.bubble()` (speech) or `Living.thought()` (a thought, a whisper to oneself), its words inking in on that line's aligned words. No mouth movement: lip-sync on still art looks odd. |
| Breath | the picture itself | about 0.6% vertical scale from a chest pivot, 3.6 s cycle |
| Sway | the picture itself | about 0.45° rotation from the hips, 5.4 s cycle, offset from the breath |
| Mood change | a second full expression (with its own eye edit) | a take: 0.14 s dissolve plus a small squash, keyed `[[0,'calm'],[6.2,'shocked']]` |
| Camera | any picture | `Living.cover()` with zoom and focus keyed over time, `Living.drift()` for a handheld float |
| Parallax | a transparent cutout over an empty plate | draw the plate and the cutout with different drift and zoom |

## Rig spec

```js
const papa = Living.rig({
  speaker: 'papa', seed: 4,                                     // speaker = the key in cast.json and voice.md
  poses: { tired: 'papa-tired', relieved: 'papa-relieved' },    // <img> ids, identical framing
  eyes:  { at: [510, 520, 160, 42],                             // [centre x, centre y, radius x, radius y], source pixels
           closed: { tired: 'papa-tired-eyes-closed', relieved: 'papa-relieved-eyes-closed' } },
  // mouth: {...} and lipSync: true still work, but lip-sync is off by default. Don't use them.
  breath: { pivot: [512, 1150] }, sway: { pivot: [512, 1536] },
});
papa.draw(ctx, t, place, { keys: [[0, 'tired'], [cue('09').at, 'relieved']],
  inside: c => Living.screen(c, 'ui', [[560, 708], [654, 708], [654, 925], [561, 925]]) });  // a phone in his hand
```

`inside` draws in the picture's source pixels, under the same breath and sway, so a mapped phone screen moves with the character.

## Balloons

```js
const c = cue('06');   // from window.REEL.cues
Living.bubble(ctx, t, 'Papa, ab aapko akele nahi likhna.', { x: 60, y: 250, maxW: 580, a: c.at - .12, b: c.end + .55, tail: mouthInFrame, line: '06' });
Living.thought(ctx, t, 'Koi ek baar… saath likh deta.', { x: 50, y: 215, maxW: 700, a, b, tail: headInFrame, line: '05' });
```

- Speech bubble for words said aloud to someone; thought cloud for a thought or a whisper to oneself.
- `line` makes the words ink in as they're spoken (the line's aligned caption words); without it the balloon shows all at once.
- Place balloons on wall, lamp or shadow, never over a face, the hands, the phone, or the stopwatch and chit (top right, y < 520). The tail points at the mouth; a thought cloud's puffs point at the head.
- Captions for the narrator only: `Living.captions(ctx, t, { speakers: ['narrator'], sentences: true })`. `sentences` shows one sentence of a long line at a time.

## Phone screens

Codex leaves phone screens flat mid-grey. Every one that shows in a shot gets a screen; a blank phone reads as unfinished.

1. `node studio/tools/find-screens.mjs src/<slug>/assets/art/<image>.png --out src/<slug>/screens.json` finds each grey screen's corners (top-left, top-right, bottom-right, bottom-left). `--tint 40` for a warm-lit screen. A phone lying beside a calculator or on a shadowed table can merge with them; read its corners from a crop instead, and check them on a draft frame.
2. For a phone lying sideways, the screen's "top-left" is at the earpiece end: order the corners as the screen's own content would sit.
3. `Living.screen(ctx, src, quad, { glow, sheen, dim })` maps an image or canvas onto the quad (two affine triangles, clipped). `Living.toFrame(quad, place, iw, ih)` turns source-pixel corners into frame pixels for a picture drawn with `cover()`.
4. Show the real product screen (captured with demo data, never a real login) when the story is in the app, or a code-drawn lock screen with the family's messages when it isn't. No other app's interface or logo.
5. A flat mapped screen can look pasted on. For a photographed look, attach the real capture to the Codex prompt and have Codex paint it in, or bake it with `node studio/tools/bake-screens.mjs src/<slug>/screens-bake.json`. Read every word on the result against the capture.

`place` is where the whole source image lands on the frame (`{x, y, w, h}`); use the rectangle `Living.cover()` returns.

## Measuring regions

`node studio/tools/check-set.mjs src/<slug>/assets/art/<base>.png` prints each edit's changed box and a suggested region. Start from it, then render a draft and look: the patch should cover the eyes and lids with a little margin. If a seam shows, enlarge the radius slightly; if skin outside the eyes flickers, the edit changed too much, so re-edit it.

## Motion rules

- **Offset everything:** never move two characters, both eyes or a crowd on the same curve. Seeds differ per rig.
- **No mouths move.** Every character blinks and breathes; the speaker's words are in their balloon. Each line's speaker comes from `voice.md`.
- **Act the mood change** with a small anticipation (a dip in the push-in, a tick of silence) before the new pose, then hold the reaction.
- **Keep something moving every second** (push, drift, blink, stopwatch), but no shot needs more than one big move.
- **Never move the frame's safe-zone furniture:** a series line near the top (y≈186), the stopwatch (top-right), narrator words (y≈1250–1330).

## Shot helpers (also in living.js)

`Living.captions(ctx, t, { y: 1300, hot: /lakh|nahi|four/i })` word-by-word captions (a `::` in a caption makes the words after it a big bold second line, for the line that has to land) · `Living.bubble(ctx, t, text, { x, y, a, b, tail, line })` handwritten speech bubbles · `Living.thought(...)` thought clouds · `Living.screen(ctx, src, quad)` a real screen on a phone in the art · `Living.pen(ctx, cx, cy, rx, ry, progress)` pen circles · `Living.grade(ctx, t)` vignette, lifted blacks, grain · `Living.scrim(ctx, 0, 380)` the top shade · `Living.keyed(keys, t)` eased keyframes · `Living.rng(seed)` deterministic randomness.
