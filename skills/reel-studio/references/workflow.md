# Workflow: from idea to posted reel

Run from the project root. Each step names its output file. Nothing here posts or pushes.

## 0. Once per machine
```
npm ci
npm run studio:doctor            # add -- --online to test the ElevenLabs key (no credits spent)
```
Fill in `references/brand-context.md` before the first reel.

## 1. Story
Pick the problem or the feature the reel proves. Run the story engine (`playbooks/story-engine.md`). Use `prompts/06-story-script.md` for the script and `prompts/07-hooks.md` for hook options; pick one with the owner.

## 2. Scaffold
```
npm run reel:new -- dads-diary "Dad's diary"
```
Creates `src/dads-diary/` (a HyperFrames project) and `reels/dads-diary/`. Fill `story.md`: cast, shot list, the real screen.

## 3. Pictures (owner, in Codex)
Write `src/<slug>/codex-prompts.md` from `prompts/01`–`05`: style lock first, then character sheets, then one **living set** per shot (base, eyes closed, and any second expression), then empty plates and props. Give exact file names; Codex saves to `src/<slug>/assets/art/`. Then check them: contact sheet plus full size, same face across the set, no text, no extra fingers. Measure the eye regions (`living-illustration.md`). Run `node studio/tools/list-art.mjs src/<slug>` after saving new art.

## 4. Voice
1. Write the lines in `voice.md` with `prompts/08-elevenlabs-hindi-formatter.md` (one row per line: id, speaker, tagged text, Roman caption).
2. Cast: `npm run voice:find -- search --lang hi --gender male --age old --q "tired warm father"`. Listen to the previews, then `npm run voice:find -- add <owner_id> <voice_id> --name "Dad"`. Put each `voice_id` in `cast.json`.
3. `npm run voice:make -- src/<slug> --dry-run` (cost), then `npm run voice:make -- src/<slug>` (2 takes per line). Each take lands in `vo/` with its `.align.json`. For free draft voices: `node studio/tools/edge-voice.mjs src/<slug>`.
   Then `npm run voice:check -- src/<slug>`: ElevenLabs speech-to-text hears each take back, printed next to the script. Reword any word that comes back wrong and remake just that line with `--only <id> --force`.
4. Owner listens and picks takes; write them into `timeline.json`.

## 5. Sound
The library first: `node studio/tools/sfx-library.mjs find <words>` (audition page `studio/sfx/index.html`), your own synths from `node studio/tools/sfx-synth.mjs`. Rank matches against the scene's events with `npm run reel:assign-sfx -- src/<slug>`. ElevenLabs only when the library has nothing:
```
npm run audio:make -- sfx src/<slug> tick "a single dry mechanical stopwatch tick, close" --seconds 0.5
npm run audio:make -- music src/<slug> bed "slow tense drone with soft tabla, 80 bpm, no vocals" --seconds 36
```
Effects go only on visible actions; music sits under the voices (ducked automatically).

## 6. Mix
Edit `timeline.json` (cues `after`/`gap` or `at`; sfx and music times in seconds or relative to a line, e.g. `{ "cue": "07", "edge": "start", "offset": -0.9 }`; music `gain` and `fadeIn`; `"channels": 2` for stereo), then:
```
npm run reel:mix -- src/<slug>
```
Writes `assets/generated/mix.wav` (−14 LUFS, TP −1.5) and `reel-data.js` (cues, captions), and sets the composition's length.

## 7. Real screen
Capture the product screen that answers the hook, with matching demo data and never a real login (see `references/brand-context.md`). Save it to `src/<slug>/ui/`.

## 8. Shots
Write `scene.js`: images, rigs, shots timed from `cue('03').at`, the stopwatch's stop beat on the real screen, captions. Check frames: `node studio/tools/frames.mjs src/<slug> .build/<p> <times…>`. Preview live: `cd src/<slug> && npx hyperframes preview`.

## 9. Render and check
```
npm run reel:render -- src/<slug> --draft
npm run reel:render -- src/<slug> --version v1
```
Read `reels/<slug>/quality-report-v1.json` and the contact sheet; run earshot on both films; fix and re-render as `v2`, never overwriting an earlier file. Then the viewer judge (`playbooks/viewer-judge.md`).

## 10. Package
Cover (`prompts/05-reel-cover.md` and `node studio/tools/cover.mjs src/<slug> --version v1`, or frame 0), caption and hashtags (`prompts/09`), alt text, `reels/<slug>/README.md`. Commit by path only on the owner's yes; ask before pushing; the owner posts.

## 11. Learn
48 h after posting, the owner sends Insights screenshots. Run `prompts/12-metrics-audit.md`, log the result in your reel log, and change one variable in the next reel.
