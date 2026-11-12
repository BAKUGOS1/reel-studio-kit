# Story reels with living illustrations (character reels)

This is the loop for reels with painted characters, voices and a real product screen as the release: one real problem, then how the product helps. Motion-graphics concept and product reels follow `playbooks/premium-motion.md` instead. The always-rules are in `SKILL.md`. Wedding and Indian-family examples below are examples; use your own world.

## The look: living illustrations

Painterly graphic-novel stills from Codex that **move in code**: they blink, breathe, sway, change mood with a small take, and move through the frame with camera push and parallax. No video-generation service is needed. Motion comes from a few Codex *edits* of each picture (eyes closed, a second expression) that `studio/lib/living.js` swaps in small feathered regions. **Characters talk in comic balloons, not with moving mouths** (lip-sync on still art looks odd): a speech bubble or a thought cloud whose words ink in as they're spoken; narrator words are for the narrator. **No phone screen is ever blank:** the real product screen or a drawn lock screen is on every phone in the art. Read `references/living-illustration.md`.

## The loop

| # | Step | Who | Tool / file | Read |
|---|---|---|---|---|
| 1 | Pick the story and the feature it proves (or the concept, or the festival) | Claude, owner approves | `playbooks/story-engine.md`, `prompts/06-story-script.md` | `references/brand-context.md` |
| 2 | Scaffold the reel | Claude | `npm run reel:new -- <slug> "<title>"` → `src/<slug>/` | `references/workflow.md` |
| 3 | Brief and shot list | Claude | `src/<slug>/story.md` | Story engine |
| 4 | Codex prompts: style lock, character sheet, living sets, plates, props | Claude writes, **owner runs in Codex** | `src/<slug>/codex-prompts.md` from `prompts/01`–`05` | `references/codex-guide.md` |
| 5 | Script, formatted with audio tags | Claude | `src/<slug>/voice.md` via `prompts/08` | `references/voice-hindi.md` |
| 6 | Cast the voices | Claude proposes, owner listens and picks | `npm run voice:find -- search --lang hi …`, `cast.json` | `references/voice-hindi.md` |
| 7 | Generate takes and word timings | Claude | `npm run voice:make -- src/<slug>` (try `--dry-run` first), then `npm run voice:check -- src/<slug>` | |
| 8 | Effects and music | Claude | The sound kit first: `node studio/tools/sfx-library.mjs find <words>` (CC0 additions with `openverse`); own synths in `studio/tools/sfx-synth.mjs`; `npm run reel:assign-sfx -- src/<slug>`; an original music bed in code (`src/<slug>/make-music.mjs`). ElevenLabs `audio:make` only when the kit has nothing | `studio/sfx/README.md`, `references/tools.md` |
| 9 | Place takes, mix in **stereo**, master to −14 LUFS | Claude | `timeline.json` with `"channels": 2` (per effect: `dur`, `from`, `pan`), `npm run reel:mix -- src/<slug>` | |
| 10 | Real product screen with demo data, never a real login; attached to the Codex prompt so Codex paints it on the phone | Claude | `studio/tools/bake-screens.mjs` only if Codex garbles the words | |
| 11 | Shots, rigs, balloons, stopwatch | Claude | `src/<slug>/scene.js` | `references/living-illustration.md`, the hyperframes and gsap-timeline skills |
| 12 | Draft, look, **listen with earshot**, fix, then final | Claude | `npm run reel:render -- src/<slug> --draft`, `earshot timeline <mix> --video <film>`, then `--version v1` | QA below |
| 13 | Viewer judge on the final | A fresh agent | `node studio/tools/judge-pack.mjs <slug>` | `playbooks/viewer-judge.md` |
| 14 | Cover, caption, hashtags, pinned comment | Claude | `prompts/05`, `prompts/09`, `studio/tools/cover.mjs` | |
| 15 | Commit by path; push and post only with the owner's yes | Claude, owner | | |
| 16 | 48 h later: metrics in, lesson out | Owner sends Insights, Claude logs | `prompts/12-metrics-audit.md`, your reel log | |

## Non-negotiables

- **A story, never an explainer.** A face in trouble and a visible threat in frame 1, an open question, something new every 2–3 s, one quiet drop, the release on the *real* product screen, a next story at the end. Product claims only from the source in `references/brand-context.md`.
- **The ticking device is small:** the drawn stopwatch in the top-right corner (`studio/shared/stopwatch.js`), with at most a small paper chit. Never a big card or a bar across the top or bottom; judge the whole frame.
- **Safe zones (1080×1920):** nothing in the top 168 px; words and the product inside 168–1330 px; narrator words about y 1250–1330; nothing readable under the right-hand action rail or below 1330 px.
- **Codex pictures carry no text, numbers, logos or app UI.** Words and numbers are drawn in code. Phones show the real app screen: attach the capture to the prompt and have Codex paint it in (a blank screen filled in later looks pasted on).
- **Voice language follows the audience** (`references/brand-context.md`). For Hindi: Devanagari, and the English words families say inside Hindi in Devanagari too (व्हाट्सऐप, एंट्री, चेक, सेव, फ़्री): a script switch mid-sentence makes the voice break. Roman only for a whole English sentence such as the CTA. Avoid words the voice can't say cleanly; reword instead. On-screen words in Roman Hinglish unless the owner asks otherwise. The CTA is the one in `brand-context.md`.
- **No bottom voice-subtitle strip** unless the owner asks for it: the words drawn on screen (balloons, labels, punch lines) carry the story for muted viewers.
- **Keys live in `.env` only** (`ELEVENLABS_API_KEY`). Never print, log, commit or paste them. Every generation is recorded in the reel's provenance JSON.
- **Versions, not overwrites, and keep them all.** A published export is never replaced; renders refuse to overwrite without `--force`.
- **Measured is not heard.** Report loudness and checks as measured; the owner listens on a phone before posting. Publishing, deleting and pushing are the owner's calls.

## QA before calling a reel done

1. `npm run reel:render -- src/<slug> --draft`, then look at `reels/<slug>/contact-sheet-draft.png` and at full-size frames of the hook, every cut, the busiest frame, the real screen and the end (`studio/tools/frames.mjs`).
2. Check what moves: blink rhythm, every balloon clear of faces and the top-right stopwatch, its words inking in with the voice, no swapped region visibly off its face, mood changes as a take, the stopwatch stopping on the release beat. Check every phone in every shot: none blank, the screen filling its glass.
   Run `npm run voice:check -- src/<slug>` (speech-to-text of every take, next to the script): a word that comes back wrong is a word to listen to, and usually to reword.
3. Quality report: 1080×1920, 30 fps, H.264 + **stereo** AAC 48 kHz, about −14 LUFS, true peak ≤ −1.5 dBFS, no silence over 0.6 s except a planned drop.
   **earshot:** `earshot timeline <film> --video <film>`. Every cut needs a sound (no "NO HIT"), and the hits should land within about 100 ms. Never `earshot llm` (it uploads audio).
   **Instagram file:** when the reel has a music bed, the report's `instagram` block must show `<slug>-vN-ig.mp4` (no bed, about −14 LUFS). Run earshot on it too: with the bed gone, every cut must still have a hit.
4. `prompts/11-reel-qc.md` on the script and the edit; fix every dead second.
5. The viewer judge (`playbooks/viewer-judge.md`) on the final.
6. Update the reel's `README.md` and your reel log.
