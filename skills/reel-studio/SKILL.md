---
name: reel-studio
description: The one skill for all marketing video and creative work. Use it automatically, without being asked, whenever the request touches a reel, short, video, motion graphics, animation, concept reel, product reel, story reel, promo, launch film, festival greeting, carousel, cover, thumbnail, caption, hook, voice-over or dubbing, sound effects, SFX, background music or a song, a reference reel or Instagram link to study, Codex image prompts, HyperFrames or GSAP scenes, a render, or the Instagram content plan, in English, Hindi or Hinglish ("reel bana", "ye dekh", "motion", "voice daal", "cover prompt"). It holds the premium motion playbook (After Effects-level motion in code, the motion kit, branch-growth, the shot library), the story engine, the story-reel loop, the viewer judge, the sound, voice and music rules, and the Codex prompt patterns.
---

# Reel studio

One skill for everything from an idea or a reference link to a posted reel. Claude (or Codex in code mode) plans, writes, builds, renders and checks. **The owner makes the Codex pictures and approves** every commit, push, post and spend.

Read first, in this order:
1. `references/brand-context.md`: the brand you make reels for. **If it still has `[FILL IN]` fields, ask the owner to fill them before writing any script, caption or prompt.**
2. This page.
3. The playbook for the format.

## Pick the playbook

| The request is… | Read | Model |
|---|---|---|
| A **concept reel or product reel**: motion graphics, a premium/minimal "After Effects" look, a reference to recreate, our own product idea | **`playbooks/premium-motion.md`** | Your best motion reel so far |
| A **story reel** with characters, voices and a real-screen release | `playbooks/story-reel-living.md` + `references/living-illustration.md` | Your best story reel so far |
| A **festival greeting** | `playbooks/premium-motion.md` (a photo, doodles drawing themselves, a card, no voice) | Your best greeting so far |
| A **carousel** | `prompts/13-carousel.md`, `studio/tools/carousel.mjs` | Your best carousel so far |
| Only a **cover or caption** | `playbooks/premium-motion.md` §8, `prompts/05`, `prompts/09` | Your best cover so far |
| **Judge a finished reel as a viewer would** (will it stop people, be understood muted, be sent): before posting, or to rank a batch | **`playbooks/viewer-judge.md`** (pack: `node studio/tools/judge-pack.mjs <slug>`, then a fresh agent judges) | |
| **Metrics, the weekly loop, tests** | `references/instagram-system.md`, `prompts/12-metrics-audit.md` | Your reel log |

The first time a format works, write its slug into this table as the model. When in doubt, open that reel's `scene.js` and do it that way.

## Use the whole kit without being told

| When the owner… | Do, unasked |
|---|---|
| asks for any reel, post, greeting or "next reel" | **Run the story engine first** (`playbooks/story-engine.md`): insight, 8+ concepts (ideas 1-3 are warm-ups), the three lines (problem → turn → payoff) with one planned silence, 6 hooks, narration written for the ear, then the rubric (28+/36). Show the owner the three lines, the format and one **test question** (`references/instagram-system.md`) before any art. |
| sends a reference link | **Download and measure it** with a downloader such as gallery-dl or yt-dlp, logged in only through the owner's own browser session. Never ask for, store or commit a password, cookie file or session id; if a temporary cookies file is needed, delete it right after. Make a contact sheet; run `earshot timeline --json`, which gives the cuts and sound events. Write the shot map and what becomes ours, note it in `research/reference-reels/<platform>/<creator>/INDEX.md`, and credit the creator in the caption. Never copy their pictures, logos or words. |
| wants visuals | The premium look and the motion kit (`studio/shared/motion-kit.js`): Easy Ease cameras with drift, letters that blur up, depth of field, light leaks, real screens, your brand colours from `references/brand-context.md`. Draw in code whatever code can draw. Check 25–40 frames with `studio/tools/frames.mjs` before every render. |
| needs pictures | Write the Codex prompts with the exact file names, each picture's use and its time in the film (premium-motion §6). Attach the real screenshot for any phone. Cut out sprites with `npx hyperframes remove-background <file>` (or ask Codex for a transparent PNG), then `studio/tools/split-sprites.cjs` for a sprite sheet. |
| needs sound | **One sound per visible moment, chosen by hand from the whole library** (`studio/sfx/`). Pick one house pack and use it first, so the brand sounds the same in every reel. No dense tick carpets. Swells: trim the lead-in so the peak lands on the cut. earshot: no NO HIT. |
| needs voice | ElevenLabs (`eleven_v3`), English or Hindi per `references/voice-hindi.md`; free Edge voices (`studio/tools/edge-voice.mjs`) for drafts. Dry run, two takes, then `npm run voice:check`. **Cuts and keywords land on the spoken words** (align.json → the scene's `T`). Transcribe the finished film once more to check every word is heard. |
| needs music | Our own bed (`src/<slug>/make-music.mjs`), calm, ducked under the voice. A voiced reel posts with original audio; a library song goes on the `-ig.mp4` at 10–15%, or is added in Instagram at upload. Never bake a downloaded song in. |
| says "bana do" / "ready karo" | The whole loop to a final: `npm run reel:render` (both films), frames, earshot, a speech-to-text check, `caption.md`, a Codex cover prompt, the reel's `README.md`. Report what was measured and what the owner must still watch and hear. Commit only on their yes. |
| is unclear on a real choice | Ask in one batch, with a recommended option first. Don't block on what you can decide. |

## Always (every format)

- **A story, never an explainer.** Product claims only from the source named in `references/brand-context.md`. The CTA is the one written there.
- **Safe zones (1080×1920):** nothing in the top 168 px; words and the product between 168 and 1330 px; nothing readable under the right rail.
- **Codex pictures carry no text, numbers, logos, UI or religious symbols.** Words, numbers and UI are drawn in code; phones show the real screen.
- **Keys live in `.env` only.** Never print, log, commit or paste them. Every generation is recorded (`image-generation.json`, `voice-generation.json`).
- **Versions, not overwrites, and keep them all.** Every final (`<slug>-vN.mp4`, `-vN-ig.mp4`) stays in `reels/<slug>/` next to the newer one, posted or not. Never delete it or move it to `old/`. `old/` (git-ignored) is only for files that must never be in git, such as a copy with a baked-in song. The tools refuse to overwrite without `--force`.
- **Render locally** with `npm run reel:render -- src/<slug> --draft`, then `--version vN`. Close heavy apps before a final render.
- **Viewer judge once on every final, unasked; not on drafts:** `node studio/tools/judge-pack.mjs <slug>`, then a fresh agent with only `playbooks/viewer-judge.md` and the pack writes `reels/<slug>/viewer-judge-vN.md`. Below 32, or 1–2 on Thumb-stop or Muted clarity, means fix and judge again once; if it is still low, show the owner the report instead of looping. Judge again only after a big change. On a launch or showcase reel, read the hook, muted, pace, readability and look scores, not the total. Build to pass it: a readable frame 0, punch lines on screen, labels of 40 px or more, short end cards.
- **Measured is not heard.** Report numbers as measured; the owner watches and listens on a phone before posting.
- **Ask before you commit, push, post or spend** (credits, paid plans, paid tools). Publishing, deleting and pushing are the owner's calls.

## Project layout (keep it this way)

| Where | What |
|---|---|
| `src/<slug>/` | One reel's source: `story.md`, `voice.md`, `cast.json`, `codex-prompts.md`, `codex-cover-prompt.md`, `scene.js`, `timeline.json`, `make-music.mjs`, `make-sound.mjs`, `ui/` (screen captures), `assets/art/` (Codex), `assets/generated/` (built) |
| `reels/<slug>/` | Finals and records only: `<slug>-vN.mp4`, `-ig.mp4`, cover, contact sheet, quality report, `caption.md`, `viewer-judge-vN.md`, `README.md`. Every version's films stay here. `old/` (local) holds only files that must not be in git |
| `studio/shared/` | Code every reel shares: `motion-kit.js`, `stopwatch.js` |
| `studio/lib/` | `living.js`, the living-illustration runtime |
| `studio/tools/` | Every tool (list in `references/tools.md`) |
| `studio/sfx/` | The sound library by category (`README.md`, `sources.json`) |
| `studio/template/` | What `npm run reel:new` copies into a new `src/<slug>/` |
| `research/reference-reels/<platform>/<creator>/` | Downloaded references with `INDEX.md` and frames (study only, never posted) |

Reel folders stay flat (never nested by season or series): the tools read `src/<slug>` and `reels/<slug>`.

## Companion skills (installed separately)

These are not inside this skill. The kit's setup script installs them with `npx skills add <repo>`. Where this skill says "the <name> skill", use that skill.

| Need | Skill | Repo |
|---|---|---|
| GSAP tweens, timelines, performance | `gsap-core`, `gsap-timeline`, `gsap-performance` | `greensock/gsap-skills` |
| HyperFrames render contract, CLI, ready-made blocks; media (music, sfx, images, cut-outs, grading) | `hyperframes`, `hyperframes-cli`, `hyperframes-registry`, `media-use` | `heygen-com/hyperframes` |
| ElevenLabs voice, speech-to-text, music, sound effects, API key | `text-to-speech`, `speech-to-text`, `music`, `sound-effects`, `setup-api-key` | `elevenlabs/skills` |
| Motion design principles (timing, easing, choreography) | `motion-design` | `lottiefiles/motion-design-skill` |
| Motion principles for interfaces | `design-motion-principles` | `kylezantos/design-motion-principles` |

Review any third-party skill before installing it: skills run with full agent permissions.

## Guides inside this skill (vendored, partial)

| Need | Guide |
|---|---|
| Ideas, insight, tension, story structures, emotion tiers (from smixs/creative-director-skill, CC BY 4.0) | `guides/creative-director/GUIDE.md`, used through `playbooks/story-engine.md` |
| The first 2 seconds: the triad, hook archetypes, competitor test (from mbfinotti/advertising-skills, MIT) | `guides/hooks/GUIDE.md` |

Licences and sources: `ATTRIBUTION.md` in each folder.

## Our own references

| Need | File |
|---|---|
| **Story engine: idea → insight → 8+ concepts → 3 lines → hooks → narration for the ear → rubric** | `playbooks/story-engine.md` |
| **Viewer judge: four viewers, ten scores, top 3 fixes, before posting** | `playbooks/viewer-judge.md` |
| Tools, and what we chose not to use | `references/tools.md` |
| Commands, start to finish | `references/workflow.md` |
| Codex art quality and consistency | `references/codex-guide.md` |
| Hindi voices, tags, casting | `references/voice-hindi.md` |
| Living-illustration rigs | `references/living-illustration.md` |
| Brand context block for prompts (fill in once) | `references/brand-context.md` |
| The Instagram loop | `references/instagram-system.md` |
| The sound kit | `studio/sfx/README.md` |
| Copy-ready prompts | `prompts/` (page: `npm run prompts:studio`) |
