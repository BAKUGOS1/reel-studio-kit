# Premium motion reels: the playbook

This is the standard for every **concept reel** and every **product reel**, the motion-graphics kind, whether it's built from a reference the owner sends or from our own idea. The model film is your best motion reel so far. When in doubt, open its `scene.js` and do it that way.

## What we want, in one paragraph

- **Look:** premium and minimal, at After Effects level. It should look like a top SaaS launch film, made unmistakably yours: your story, your brand colours from `references/brand-context.md`, real product screens.
- **Pace:** calm. One idea at a time, with breathing room. A 31 s cut of a 45 s story felt "too fast"; the 45 s voiced cut with room to breathe was the one that worked.
- **Sound:** one sound per visible moment, a calm music bed, and a narrator whose words drive the cuts.
- **The owner's part:** they make the Codex pictures and approve. We do everything else, and we ask only when a choice really is theirs.

## 1. Start: story, format, reference

1. **Run the story engine** (`playbooks/story-engine.md`). Write three lines first (problem → turn → payoff) and show them before any art. Name the format and the test question (`references/instagram-system.md`).
2. **If there's a reference**, download it, then measure it: a contact sheet, plus `earshot timeline <film> --video <film> --json`, which gives its cuts and every sound event. Save the cues as `src/<slug>/reference-cues.json` and write a shot map, *their shot → our shot*. Keep the mechanic; the story, pictures and words are ours. Never use their pictures or logos. Credit the creator in the caption.
3. **If there's no reference** (our own concept or product reel), build from the shot library below. Pick 5–8 shots that tell the three lines.
4. **Then ask the owner only the real choices**, in one batch: pace and length, voice or none, audio route. Everything else is ours to decide.

## 2. The look (premium and minimal)

- **Palette:** your brand colours from `references/brand-context.md`, used like this:
  - a dark night colour (never pure black) for the problem;
  - a light paper colour for the answer;
  - your one accent colour, used sparingly; thin hairlines in a metallic or muted tone; one or two warm "life" colours for flowers, light and growth;
  - one flip from dark to light is the turn.
- **Type** (fonts in `studio/template/assets/fonts`, or your brand fonts):
  - a light serif for the small connector words, with the keyword 2–3× bigger in italic;
  - a clean sans for labels and the CTA; a mono for data and file-name fragments; a Devanagari face (Tiro) for ₹ and Hindi;
  - no other display fonts.
- **Space:** one idea per frame, with plenty of empty space. Words and screens stay between 168 and 1330 px; nothing readable under the right rail.
- **Real product:** real product screens with demonstration data, in phones or in a burst of cards. Windows drawn in code (like an expenses table) use the same demonstration numbers and are never labelled "actual screen".
- **Photo plates and 3D objects come from Codex** (§6). Lines, icons, type, UI, particles and growth are drawn in code.

## 3. Motion (After Effects level, in code)

Use `studio/shared/motion-kit.js` (`window.MotionKit`; the runtime copies it into every reel's `assets/lib`). Call `K.setTime(t)` first in `renderAt`.

| Effect | How | Rule |
|---|---|---|
| Easy Ease | `K.inOut`, `K.camKeys([[t,{x,y,z}],…], t)` | Every camera move, wipe and reveal eases in *and* out. No linear moves, no camera shakes. |
| Camera drift | `K.cam(ctx, {x,y,z}, fn)` | A slow handheld drift is always on; zoom pushes are 1.0 → 1.06 over a shot, and ease into close-ups (≤1.2×) on a spoken word. |
| Text animator | `K.animText(ctx, s, x, y, at, {font, out})` | Letters rise 26 px out of a 10 px blur, staggered 28 ms. Start about 0.1 s before the spoken word. `out` blurs them away. |
| Depth of field | `K.plate(ctx, img, t, t0, {dof})` | Photo plates sit 2–5 px soft behind sharp UI and type, with a slow parallax push. |
| Light leak | `K.leak(ctx, t, cutTime - .2)` | A warm sweep across every scene change. Never hard white frames, except frame 0's boom. |
| Soft dip | `K.dip(ctx, t, at)` | A gentle light dip on a hit (a payment recorded, the turn). |
| Pops | `K.backOut` (s ≈ 1.3) | A small overshoot for labels and cards; nothing bouncy. |
| Growth | `studio/tools/grow-stages.mjs <drawing> <out>` + `K.grown(...)` | Any drawing (tree, vine, mehendi line, rangoli, signature) grows *along its own strokes*, then `full.png` crossfades in. Blooms and sparkles follow `points.js` in growth order. |
| Self-drawing doodles | `studio/tools/draw-map.mjs` | Line art draws itself like a pen, not a wipe. Good for festival greetings. |
| Captions | `K.captions(ctx, t, {y, skip})` | Small, word by word, for viewers with the sound off. Move them to the top over busy screens; skip lines the screen already says. Leave them off when on-screen words already carry the story. |

**Pacing** (a 45 s reel of 8 shots works well):
- Each shot gets 3–6 s, and every cut lands on a spoken word or a beat.
- Reveal one element at a time; the eye is never asked to read two things at once.
- One planned silence (about 1 s) before the turn.

**Concept-reel grammar:** two-weight type (small serif, big italic keyword, a swash capital), one accent colour, frame 0 is a BOOM (never beeps), one hit per act, silence once as the punchline.

**Festival greetings:** a photo, doodles drawing themselves, a card, no voice.

## 4. The shot library (reusable)

| Shot | What it says | Reuse for |
|---|---|---|
| Hairline open | One thin line and "too many *X*", the keyword changing on each spoken word | Any "problem" hook |
| Thread fan | One point branches into labelled pieces of mess, each popping on its word | Any "it's scattered" problem |
| Collapse to ring | The pieces gather into a ring of dots, then silence | The turn's setup |
| Glossy ring flip | A dark disc in a Codex glossy ring, "one place." on the word, the rings open into the light colour | The turn / the brand moment |
| Logo on grid | The wordmark revealed across a construction grid | The brand beat |
| Search burst | A search box types the spoken words, the camera eases into the button, then a spiral of cards and real screens | "Find it in seconds" |
| Window fix | A drawn app window over a misty plate; rows tick; one goes red on the problem word and is fixed on the answer word | Any feature that catches a mistake |
| Growth tree | Labels float in depth, a painted tree grows along its branches, the labels settle, and florets bloom | "Everything connected / family together" |
| Field ending | "One place to *plan / track / celebrate*", one word per beat, then the logo and the CTA | The ending for every product reel |
| "Everything evolved, except…" | A montage of things that changed (invites, venues, payments), the one that didn't (the old notebook), a black **"Until now."** beat, then the logo | A launch-style argument |
| Question pill | Frame 0: a white chat-pill caption asking a real question, over a real product screen | SaaS demo hooks |
| Toggle on | One switch flips the "before" world into the "after" | Any feature demo turn |
| Form as story | A form fills itself line by line; each field is a beat of the story | Setup / onboarding features |
| Torch reveal | Torch beams reveal one feature word at a time in two-weight type, then the logo; 9 s, loops | A short feature list between big reels |
| Mixed-media personal | A new material every 2–4 s (chat bubbles, paper, cut-out letters, neon word, red-string board) under a first-person story; ends on a lead magnet and the profile | Personal / POV reels |

New shots join this table when they work.

**Story beats polish.** In studied references, the story-led reels had 5–30× the likes of the pure motion showcases. Every reel needs one argument or one personal pain; the motion serves it.

## 5. Sound, voice and music

**Voice (when the reel has one):**
- Write it in `voice.md`, run `npm run voice:make -- src/<slug> --dry-run` for the cost, then generate two takes.
- Run `npm run voice:check -- src/<slug>` (speech-to-text) and reword any word it gets wrong.
- English: a warm premade ElevenLabs narrator on `eleven_v3`. Hindi follows `references/voice-hindi.md`. Free-plan voices in posted work are the owner's call.
- If the voice can't say the brand name cleanly, no line speaks it; the end card shows it.
- Word timings (`vo/*.align.json`) go into the scene's `T` table, and **every cut and keyword lands on its word**.

**Effects:**
- One sound per *visible* moment, about 35–45 in a 45 s reel. Never a reference's 130 ticks: too many sounds feel odd.
- Choose by hand, from the whole library, the best per moment (`node studio/tools/sfx-library.mjs find <words>`; audition `studio/sfx/index.html`; ranked suggestions with `npm run reel:assign-sfx -- src/<slug>`).
- **Pick one house pack and use it first**, by role:
  - premium pops on reveals;
  - cinematic whooshes on transitions;
  - a premium riser on growth;
  - typing on typed words;
  - glitch click and flicker on errors;
  - money on a payment;
  - granular select on logo builds.
- Plus a trailer boom (frame 0, end card), a sub drop (the turn) and a card fan for card bursts.
- Keep the list in `src/<slug>/make-sound.mjs`. It writes `timeline.json` and `REEL_EVENTS`.
- **Swells have soft attacks.** On a cut, trim the lead-in (`from`) so the peak lands on the cut, and add a crisp tick on the cut. earshot must show no cut without a sound.

**Music:**
- Our own bed in `src/<slug>/make-music.mjs`, following the sections: a drone or pulse for the problem, silence before the turn, a calm groove under the product, a pad and bells under the ending. About −16 dB, ducked under the voice by `mix.mjs`.
- A voiced reel posts on Instagram with original audio. A library song, if wanted, goes on the `-ig.mp4` at about 10–15%, or is added in Instagram at upload.
- Never bake a downloaded song in. If the owner chooses to use a reference's audio at their own risk, use Instagram's "Use audio" and keep any baked copy in `reels/<slug>/old/` (git-ignored).

**Mix and QA:**
- Stereo mix at −14 LUFS, true peak ≤ −2.
- `earshot timeline` on both films: no NO HIT, and 90% or more of cuts within 100 ms.
- Transcribe the finished film (the speech-to-text skill, or Whisper if you have it): every word must be heard over the music.

## 6. Codex pictures (the owner runs them)

Write `src/<slug>/codex-prompts.md`. For every picture, give its exact file name, its use, and the shot and time it's for. Every prompt says **no text, letters, numbers, logos, phones, screens or religious symbols**, and uses your palette.

| Kind | Pattern | Then |
|---|---|---|
| Photo plate | Portrait 2:3, a soft, premium location (a courtyard, a misty garden, a flower field) with an empty, evenly lit centre for UI | Used with depth of field |
| Glossy 3D object | Square, centred on pure white (ring, gift box, coin, envelope), a high-end product render | Ring-like art: `multiply` blend. Objects: `npx hyperframes remove-background <file>` → `<name>-cut.png` |
| Sprite | Square, one object on pure white (a flower head, a petal), or a sprite sheet | Cut out → `-cut.png`; sheets: `studio/tools/split-sprites.cjs` |
| Card or stationery | Portrait 2:3, flat front view on white, no text | Card bursts |
| Drawing to grow | A painted or inked shape on plain paper (bare tree, vine, mehendi line) | `grow-stages.mjs` |
| Cover art | See §8 | Title set in code |

Phones in Codex art always get the real screenshot attached and painted in. Never a blank grey screen left blank.

## 7. Build and render

1. Run `npm run reel:new -- <slug> "<title>"`; the template already loads the motion kit.
2. Write `scene.js` with a `T` table of times at the top (spoken words, cuts), one function per shot, and `SHOTS`.
3. Put pictures the film always needs as `<img>` tags in `index.html`. Load the rest with `list-art.mjs`.
4. Check frames with `node studio/tools/frames.mjs src/<slug> .build/<p> <times…>`: 25–40 moments, before every render. Look for cropping, overlap, unreadable text and anything out of the safe zone.
5. Render with `npm run reel:render -- src/<slug> --draft`, then `--version vN`.

## 8. Cover and caption

- **Caption** (`caption.md`, fixed shape): the hook line, one or two plain lines, one question, the CTA from `brand-context.md` (link in bio), credits, five hashtags. Then the pinned comment, the alt text (describe the film for a blind viewer), and the posting notes: film, audio, cover, test, format, AI label, claims, credit, time.
- **Cover:**
  - Write a Codex prompt for the art only, with no type, in `src/<slug>/codex-cover-prompt.md`.
  - The title is set in code (`studio/tools/cover.mjs`): the two-weight serif title plus a small brand-name kicker in mono.
  - Make it readable in the profile-grid crop and the 4:5 feed crop.
  - One strong object or moment from the film, on lots of calm space.

## 9. Finish

- Run the viewer judge (`playbooks/viewer-judge.md`).
- Write `reels/<slug>/README.md` (versions, what changed, measured) and log the reel in your reel log.
- Send the owner the film, and say plainly what was measured and what they still need to watch and hear.
- Commit by path only on the owner's yes; push and post only on their yes.
