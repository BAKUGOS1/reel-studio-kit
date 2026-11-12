# Reel Studio Kit

Make Instagram reels, shorts and motion videos **in code**, with Claude Code doing the work. You describe the reel; Claude writes the story, builds the scenes, makes the voice, mixes the sound and renders the MP4.

The kit has three parts:

| Part | What it is |
|---|---|
| `skills/` | Two Claude Code skills: **reel-studio** (the full reel method: story engine, premium motion, voice, sound, viewer judge) and **video-studio** (general videos, promos and explainers with HyperFrames, Remotion or fal.ai) |
| `studio/` | The tools those skills use: new-reel, voice, mix, render, frames, SFX library (650 free sounds in 22 categories), motion kit, fonts, reel template |
| `setup/` | One script that installs the skills and the companion skills for you |

---

## Quick start (jaldi shuru)

1. Install the software in **Step 1** below.
2. Run these in a terminal:
   ```bash
   git clone https://github.com/BAKUGOS1/reel-studio-kit.git
   cd reel-studio-kit
   npm install
   npm run setup:skills
   cp .env.example .env
   npm run studio:doctor
   ```
3. Put your own ElevenLabs key in `.env` (optional: there is a free voice too).
4. Open Claude Code **in this folder** and say: *"ek reel bana: <your idea>"*.

When `studio:doctor` prints **Ready.**, you are set.

---

## Step 1: Software to install

| Need | Why | Windows | Mac |
|---|---|---|---|
| **Claude Code** (paid Claude plan) | Runs the skills | [claude.com/claude-code](https://claude.com/claude-code) or the Claude desktop app | same |
| **Node.js 22 or newer** | Runs every tool | `winget install OpenJS.NodeJS.LTS` | `brew install node` |
| **Git** | Clone this repo | `winget install Git.Git` | comes with Xcode tools |
| **FFmpeg** | Encodes the video | `winget install --id Gyan.FFmpeg -e` | `brew install ffmpeg` |
| **Google Chrome** | HyperFrames renders in it | chrome.com | chrome.com |

Optional:

| Tool | Why | Install |
|---|---|---|
| **earshot** | Lets Claude "hear" whether sounds land on the cuts | install [uv](https://docs.astral.sh/uv/) then `uv tool install earshot` |
| **Codex** or any image model | Paints the illustrations and cover art (the skill writes the prompts) | codex / ChatGPT |
| Background removal | Cuts out sprites from a picture | built in: `npx hyperframes remove-background` (or `uvx rembg i in.png out.png`) |
| **Blender** | 2.5D diorama shots | blender.org |

After installing, **open a new terminal** so the new commands are found.

## Step 2: Install the kit

```bash
npm install
```

This installs HyperFrames, GSAP, Playwright, sharp, ffmpeg-static and the free Edge voice. The `allowScripts` block in `package.json` lets ffmpeg-static, sharp and esbuild finish their setup on npm 11.

## Step 3: Install the skills

```bash
npm run setup:skills
```

It does two things:

1. Copies `skills/reel-studio` and `skills/video-studio` into `~/.claude/skills/`.
2. Installs the companion skills straight from their authors' GitHub repos with `npx skills add`:

| Companion | Repo | Needed? |
|---|---|---|
| hyperframes, hyperframes-cli, hyperframes-registry, media-use | `heygen-com/hyperframes` | **Required** |
| gsap-core, gsap-timeline, gsap-performance | `greensock/gsap-skills` | **Required** |
| text-to-speech, speech-to-text, music, sound-effects, setup-api-key | `elevenlabs/skills` | **Required** |
| motion-design | `lottiefiles/motion-design-skill` | Recommended |
| design-motion-principles | `kylezantos/design-motion-principles` | Recommended |
| animate, choreograph, review-animations, improve-animations, animation-performance, emil-design-eng | `emilkowalski/skills` | Recommended |

Options:

```bash
npm run setup:skills -- --core     # only the required ones
npm run setup:skills -- --codex    # also install for Codex (~/.agents/skills)
```

**Restart Claude Code** after this, so it sees the new skills.

Optional, for Remotion or AI footage (video-studio uses them when present):

```bash
npx skills add remotion-dev/skills -g
npx skills add fal-ai-community/skills -g
```

Remotion is free for individuals and small companies; bigger companies need a licence. fal.ai is paid per generation.

## Step 4: API keys (your own, never someone else's)

```bash
cp .env.example .env
```

| Key | Needed for | Where to get it | Free? |
|---|---|---|---|
| `ELEVENLABS_API_KEY` | Best voices (Hindi and English), music, SFX | elevenlabs.io → Settings → API keys | Free plan has a small monthly limit and only premade voices; commercial use needs a paid plan |
| `FAL_KEY` | AI-generated footage (video-studio only) | fal.ai | Paid |

No key at all? Use the free voice: `npm run voice:free -- src/<slug>` (Microsoft Edge neural voices, good Hindi: `hi-IN-MadhurNeural`, `hi-IN-SwaraNeural`). It may say "429" when you make many lines quickly; wait a minute and run it again, finished lines are kept.

Rules: keys go **only** in `.env` (git-ignored). Never paste them into chat, a prompt or a commit.

## Step 5: Check

```bash
npm run studio:doctor
npm run studio:doctor -- --online    # also tests the ElevenLabs key, spends nothing
```

Every ✓ means ready. Each ✗ prints the command that fixes it.

## Step 6: Set up your brand (once)

Open `skills/reel-studio/references/brand-context.md` (and the copy in `~/.claude/skills/reel-studio/`) and fill in your brand: name, what you sell, audience, colours, fonts, tone, call to action. Every script, prompt and cover reads it. Then run `npm run setup:skills` again so the installed copy matches.

---

## Making a reel

Open Claude Code in this folder and just talk:

- *"Ek reel bana: shaadi mein budget kaise bigadta hai"*
- *"Ye reference dekh aur apna version bana: <link>"*
- *"Premium motion reel for my product launch"*
- *"Cover aur caption likh do"*

Claude follows the reel-studio skill: story first (three lines: problem → turn → payoff), then you approve, then pictures, voice, sound, render, checks. **You approve every commit, post and spend.**

The commands it uses (you can run them yourself too):

| Step | Command |
|---|---|
| Start a reel | `npm run reel:new -- <slug> "<Title>"` → `src/<slug>/` |
| Find ElevenLabs voices | `npm run voice:find -- search --lang hi --gender female` |
| Make voice (ElevenLabs) | `npm run voice:make -- src/<slug> --dry-run`, then without `--dry-run` |
| Make voice (free) | `npm run voice:free -- src/<slug>` |
| Check the voice | `npm run voice:check -- src/<slug>` |
| SFX or music (ElevenLabs) | `npm run audio:make -- sfx src/<slug> tick "dry stopwatch tick" --seconds 0.5` |
| Find a sound in the library | `npm run sfx:find -- whoosh fast` (audition page: `studio/sfx/index.html`) |
| Pull a new free sound | `npm run sfx:pull -- "rain on window" --cat ambience` shows results, then add `--pick 0,2` |
| Pull a whole sound pack | `npm run sfx:pull -- --pack universal` (packs live in `studio/sfx/packs/`) |
| Mix and master | `npm run reel:mix -- src/<slug>` |
| Live preview | `cd src/<slug>` then `npx hyperframes preview` |
| Check frames | `npm run reel:frames -- src/<slug>` |
| Draft render | `npm run reel:render -- src/<slug> --draft` |
| Final render | `npm run reel:render -- src/<slug> --version v1` |
| Viewer-judge pack | `npm run reel:judge -- <slug>` |
| Prompt cards page | `npm run prompts:studio` → `studio/prompt-studio.html` |

Files:

| Folder | What goes in it |
|---|---|
| `src/<slug>/` | One reel's source: `story.md`, `voice.md`, `cast.json`, `timeline.json`, `scene.js`, `assets/art/` (your pictures) |
| `reels/<slug>/` | Finished films (`<slug>-v1.mp4`, `-v1-ig.mp4`), cover, contact sheet, caption |
| `studio/` | The tools. Don't put reels here |

---

## Sounds

650 sounds come with the kit, all free to use without credit (own, Kenney CC0, Openverse CC0). Categories: whoosh, riser, impact, cinematic, glitch, ui, pop, tone, digital, phone, money, paper, typing, camera, clock, crowd, comedy, heartbeat, wedding, fireworks, foley, ambience.

- **Listen:** open `studio/sfx/index.html` in a browser (search box, play button, copy path).
- **Search:** `npm run sfx:find -- door knock`
- **Get more:** `npm run sfx:pull -- "glass break" --cat foley` lists free CC0 results from Openverse (no key). Add the ones you like with `--pick 0,3`. Long recordings are cut to 12 s; use `--max 20` for more, `--from 30` to start later.
- **Packs:** `studio/sfx/packs/universal.json` is the everyday pack (camera, clock, typing, phone, applause, laughs, heartbeat, whooshes, risers, cinematic booms, rain, birds, traffic, wind, drum roll, record scratch, door knocks, dings). Make your own pack file the same way and run `npm run sfx:pull -- --pack <name>`.
- **Use one in a reel:** in `timeline.json`, `{ "file": "../../studio/sfx/whoosh/own-whoosh-fast.wav", "at": 2.1, "gain": -10 }`.
- **Make one with AI:** `npm run audio:make -- sfx src/<slug> tick "dry stopwatch tick" --seconds 0.5` (ElevenLabs key).

## Limits to know

- Rendering uses Chrome and a lot of memory: close heavy apps before a final render.
- ElevenLabs free plan: small monthly limit, premade voices only, no commercial use.
- Measured is not heard: always watch and listen on a phone before posting.
- Instagram music: add the song inside Instagram at upload. Never bake a downloaded song into the film.

## Troubleshooting

| Problem | Fix |
|---|---|
| `ffmpeg not found` | Install FFmpeg (Step 1), then open a new terminal |
| `npm install` warns about scripts | Run `npm approve-scripts ffmpeg-static sharp esbuild`, then `npm install` again |
| Claude doesn't use the skill | Restart Claude Code; check `~/.claude/skills/reel-studio/SKILL.md` exists; say "reel-studio skill use kar" |
| `Missing assets/generated/mix.wav` | Run `npm run reel:mix -- src/<slug>` before rendering |
| `Missing take vo/01-a.wav` | Make the voice first (`voice:make` or `voice:free`) |
| Edge voice `429` | Wait a minute and run it again |
| `ELEVENLABS_API_KEY is not set` | Put it in `.env` in this folder |

## Credits and licences

- Sounds: `own-*` are made by `studio/tools/sfx-synth.mjs` (free to use). `kenney-*` are from kenney.nl (CC0). `openverse-*` are CC0 recordings found through Openverse; creators are listed in `studio/sfx/sources.json`. `npm run sfx:fetch` downloads extra Mixkit sounds (Mixkit free licence: use in videos, don't redistribute the files), which stay out of git.
- Fonts in `studio/template/assets/fonts/` are under the SIL Open Font License (licence files next to them).
- `skills/reel-studio/guides/creative-director` comes from smixs/creative-director-skill (CC BY 4.0); `guides/hooks` from mbfinotti/advertising-skills (MIT).
- Companion skills are installed from their own repos under their own licences; this kit does not include copies.
- HyperFrames (Apache-2.0), GSAP (free, GreenSock licence), Playwright (Apache-2.0), sharp (Apache-2.0), FFmpeg (LGPL/GPL).
