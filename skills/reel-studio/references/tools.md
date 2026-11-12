# Tools: what each one does in a reel

`npm run studio:doctor` checks all of it on your machine. Renders are heavy: on a laptop with little free memory, close other apps before a final render.

## npm scripts

| Script | Runs | Job |
|---|---|---|
| `studio:doctor` | `doctor.mjs` | Checks the machine; changes nothing (`-- --online` tests the ElevenLabs key, no credits spent) |
| `reel:new` | `new-reel.mjs` | Scaffolds `src/<slug>/` from `studio/template/` and `reels/<slug>/` |
| `voice:find` | `el-voices.mjs` | Search, add and list ElevenLabs voices; `credits` shows what's left |
| `voice:make` | `el-voice.mjs` | Generates voice takes plus word timings (`--dry-run` first) |
| `voice:check` | `el-check.mjs` | Hears every take back with speech-to-text, printed next to the script |
| `audio:make` | `el-audio.mjs` | ElevenLabs sound effects and music beds |
| `reel:mix` | `mix.mjs` | Builds the soundtrack and the timing data the animation reads |
| `reel:assign-sfx` | `assign-sfx.mjs` | Ranks the sound library against the visible events in `scene.js` |
| `reel:render` | `render.mjs` | Checks and renders, lays the mix in, writes the quality report |
| `prompts:studio` | `build-prompt-studio.mjs` | Builds a page of every prompt in this skill with copy buttons |

## The stack we use

| Tool | Job in a reel | Installed as | Notes |
|---|---|---|---|
| **Codex image generation** (owner) | Every picture: character sheets, scenes, living-illustration edit sets, props, cover art | The owner's Codex app | Claude can't generate images. Claude writes the prompts (`prompts/01`–`05`) and checks the results. See `codex-guide.md`. |
| **HyperFrames** | The renderer: HTML + canvas + GSAP seeked frame by frame in Chrome, encoded by FFmpeg. Same input, same video | `devDependencies.hyperframes` (pinned); the hyperframes, hyperframes-cli, hyperframes-registry and media-use skills | Apache-2.0, free, local. Reels are one canvas driven by the `hf-seek` event (`scene.js`), plus one mastered audio track. Preview: `npx hyperframes preview` inside `src/<slug>`. |
| **GSAP** | Timelines and eases for anything DOM-based (title cards, overlays, registry blocks) | `dependencies.gsap`, copied into each reel's `assets/lib`; the gsap-core, gsap-timeline and gsap-performance skills | Free incl. commercial use (Webflow "standard no-charge licence"); don't use it inside a no-code animation builder that competes with Webflow. Always paused timelines, `fromTo`, absolute positions. |
| **FFmpeg** | Encoding (HyperFrames), mixing, ducking, mastering, frame grabs, loudness and silence checks | System FFmpeg on PATH (Windows: `winget install --id Gyan.FFmpeg -e`); project: `ffmpeg-static` | The studio tools use `ffmpeg-static` for repeatable audio; HyperFrames needs the system one on PATH. |
| **ElevenLabs** | Narrator and character voices (Eleven v3 with audio tags), word timing (forced alignment), sound effects, music beds | REST from `studio/tools/el-*.mjs`; the text-to-speech, speech-to-text, sound-effects, music and setup-api-key skills | Key in `.env` only. A paid plan for commercial use. Test a newer model on one line before switching (`--model <id>`). |
| **Edge voices** (`edge-voice.mjs`) | Free neural voices, no key, for drafts and timing | `node studio/tools/edge-voice.mjs src/<slug> [--only 03,07] [--dry-run]` | Writes the same files as `el-voice.mjs`, so the mix and captions work unchanged. |
| **`frames.mjs`** | Single frames of a scene in a headless browser, to check without a full render | `node studio/tools/frames.mjs src/<slug> .build/<prefix> <t1> <t2> …` | 25–40 moments before every render. |
| **`list-art.mjs`** | Writes `assets/generated/art-ready.js`, so `scene.js` loads only art and captures that exist | `node studio/tools/list-art.mjs src/<slug>` | Run again after saving new art. |
| **`find-screens.mjs`** | Finds the grey phone screens Codex leaves in a picture and writes their corners | `node studio/tools/find-screens.mjs <image.png> --out src/<slug>/screens.json` | `--tint 40` for a warm-lit screen; check a phone beside other grey things by eye. |
| **`bake-screens.mjs`** | Bakes real screens into Codex phones: perspective warp, a mask from the art's own grey pixels (rounded corners kept), room light, reflection, grain | `node studio/tools/bake-screens.mjs src/<slug>/screens-bake.json` (corners from `find-screens.mjs`) | Use when Codex's own screen edit redraws the words. Render the screen at the phone's own proportions. |
| **`check-set.mjs`** | Checks a living set: did each Codex edit change only its region? | `node studio/tools/check-set.mjs src/<slug>/assets/art/<base>.png` | Prints each edit's changed box and a suggested region. |
| **`split-sprites.cjs`** | Splits a cut-out sprite sheet into clean, trimmed sprites | `node studio/tools/split-sprites.cjs <sheet-nobg.png> <outdir> <name1,…> [COLSxROWS]` | Cut the background out first (`npx hyperframes remove-background`). |
| **`grow-stages.mjs`** | Grows any drawing (tree, vine, mehendi line, signature) along its own strokes | `node studio/tools/grow-stages.mjs <drawing.png> <out-dir> [--stages 24]` | Used with `K.grown(...)` in the motion kit. |
| **`draw-map.mjs`** | Turns a line drawing into a "draw-on" map so lines grow like a pen, not a wipe | `node studio/tools/draw-map.mjs <line-art.png> <out.js> [--height 620] [--trim]` | For self-drawing doodles. |
| **`cover.mjs`** | Renders a designed cover from `src/<slug>/cover/cover.html` (Codex art, title set in code) and its grid crop | `node studio/tools/cover.mjs src/<slug> --version v1` | Writes `reels/<slug>/cover-designed-<v>.png` and `-grid.png`; refuses to overwrite. |
| **`render.mjs --cover-at`** | Picks the cover frame in seconds instead of frame 0 | `npm run reel:render -- src/<slug> --version v1 --cover-at 9.3` | For a reel whose strongest frame comes later. |
| **`carousel.mjs`** | Renders an HTML carousel (`src/<slug>/carousel.html`, one `<section class="slide">` per slide) to 1080×1350 PNGs and a contact sheet | `node studio/tools/carousel.mjs src/<slug> --version v1` | Output `campaigns/<slug>/<v>/`; refuses to overwrite. Prompt: `prompts/13-carousel.md`. |
| **`judge-pack.mjs`** | Builds the viewer judge's pack (frames, spoken lines, earshot summary) | `node studio/tools/judge-pack.mjs <slug> [--film …]` | `playbooks/viewer-judge.md`. |
| **Playwright + sharp** | Real product screen captures, image checks, contact sheets | Project dependencies | |
| **Living-illustration runtime** | Blinks, breath, sway, mood takes, narrator captions, speech bubbles and thought clouds (no lip-sync), real screens mapped onto phones, pen marks | `studio/lib/living.js` | `living-illustration.md`. |
| **Motion kit** | Easy Ease cameras, text animator, depth of field, light leaks, growth, captions | `studio/shared/motion-kit.js` | `playbooks/premium-motion.md` §3. |
| **Stopwatch** | The small ticking device | `studio/shared/stopwatch.js` | Small, in a corner. |
| **Sound kit** `studio/sfx/` + **`sfx-library.mjs`** | Sound effects filed by role (whoosh, riser, impact, money, paper…), with an audition page `studio/sfx/index.html` | `find <words>`, `catalog`, `fetch` (restores git-ignored packs), `openverse "<query>" --cat <c>` (CC0 only, no key) | Sources and licences: `studio/sfx/README.md`. Don't put a downloaded song in a reel. |
| **`sfx-synth.mjs`** | Your own signature sounds (whooshes, risers, hits, a ding, dhol, manjira, ka-ching), seeded | `node studio/tools/sfx-synth.mjs` | Owned outright. |
| **`mix.mjs` options** | Stereo mix (`"channels": 2`, use it for every new reel), per effect `dur` (trim), `from` (start partway in), `pan` (−1…1) | `timeline.json` | Mono is the default. |
| **earshot** (MIT) | Lets an agent hear: event timeline against the cuts (finds cuts with no sound), match a sound to a description, find the best trim in a long recording, LUFS | `uv tool install --python 3.12 "earshot[mcp] @ git+https://github.com/Leonxlnx/earshot"`; models download on first run (~1 GB) | **Never `earshot llm`** (it uploads audio to a cloud model). It reads mono files about 3 LU louder than ffmpeg does, which is one more reason to mix in stereo. |

## Optional, for particular shots

| Tool | When it earns its place | How |
|---|---|---|
| **Blender** (GPL, free) | A 2.5D "diorama" shot: Codex layers on planes at different depths, a real camera move with depth of field | Render headless: `blender -b scene.blend -o //frames/f_#### -F PNG -s 1 -e 240 -a`. Bring frames in as an image sequence. Heavy for daily reels. |
| **HyperFrames `remove-background`** | Cutting a character or object out of a Codex frame | `npx hyperframes remove-background <image>`; the first run downloads a model and is slow on CPU. Prefer asking Codex for a transparent cutout. |
| **HyperFrames registry** | Ready-made transitions, kinetic type, film grain, caption styles | The hyperframes-registry skill, `npx hyperframes catalog --json`. Restyle to the brand before using. |
| **Remotion** | Only when a React video is clearly better | Free for small teams; larger teams and agencies need a company licence. Check before starting. |

## Looked at and not used now

| Tool | Why not, today |
|---|---|
| **Cloud video-generation studios** | Every model routes through a paid key, with no character-consistency mechanism. Revisit if real image-to-video is wanted: it would turn a Codex still into a short clip that we composite like any picture. |
| **Motion Canvas** (MIT) | Good editor, but no documented headless render, so an agent can't render it reliably. HyperFrames covers the same ground. |
| **HyperFrames local TTS and HeyGen voices** | We use ElevenLabs for drama voices. |

## Fonts

Fonts live in `studio/template/assets/fonts` with their OFL licence files: Outfit, Kalam, Bodoni Moda, Cormorant Garamond, Instrument Serif (regular and italic), Pinyon Script (swash capitals), Anton, JetBrains Mono, Tiro Devanagari Hindi (regular and italic). Only Anton and Tiro have ₹. Your brand fonts go here too, with their licence. Trial and demo fonts are never used in posted work.
