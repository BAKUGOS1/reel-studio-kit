# Viewer judge: how a finished reel will feel to the people scrolling past it

Our other checks prove the reel was **built right**:
- frames show what is on screen;
- earshot shows every cut has a sound;
- speech-to-text shows every line is heard;
- `prompts/11-reel-qc.md` covers the script.

This playbook asks the other question: **will a real viewer stop, understand, stay and send it?**

**What it is:** an AI's forecast, never a measurement. The truth is the Insights at 48 hours (the retention graph, shares, saves). Use the judge before posting to catch weak spots, then compare its forecast with the Insights in your reel log, so you learn how far to trust it.

## When to run it

- Once on every final, unasked, after the final render and before the owner watches on the phone. It finds what to fix while fixing is cheap. Not on drafts.
- On a draft, only when a reel feels "off" and nobody can say why.
- On a batch, to rank which reel should post first or be pinned.

## How to run it

1. **Build the pack:** `node studio/tools/judge-pack.mjs <slug>` (or `--film reels/<slug>/<file>.mp4`). It writes `.build/judge/<slug>/`:
   - `first3.jpg`: the first 3 seconds at 5 frames a second;
   - `sheet-N.jpg`: the whole film at 1 frame a second, timestamped;
   - `pack.md`: the spoken lines with times, the earshot summary, the reel's test and the caption's opening.
2. **Give the judging to a fresh agent** (the Agent tool, general-purpose), one per reel.
   - It must **not** be the agent that built the reel, and must not see `story.md`, `scene.js` or the build notes. A judge who knows what the reel *meant* forgives what it *shows*.
   - Hand it only this playbook, the brand's one-line description and audience from `references/brand-context.md`, and the pack.
   - Ask it to write `reels/<slug>/viewer-judge-vN.md` (N = the film's version) in the shape below.
3. **Read the report against the film yourself.** Fix only what you agree with, re-render, and judge again if the change was big. Tell the owner the scores, the top three fixes, and what was changed.

**Thresholds:** below 32, or a 1–2 on Thumb-stop or Muted clarity, means fix and judge again once; if it is still low, show the owner the report instead of looping. On a launch or showcase reel, read the hook, muted, pace, readability and look scores, not the total.

## The judge's instructions (give these to the agent word for word, with the pack path)

Before handing this over, fill the two brackets from `references/brand-context.md`, and replace the four viewers with your own audience if it differs (keep one sound-on viewer, one muted viewer, one stranger and one creative director).

> You are judging a 9:16 Instagram reel by **[BRAND: one line on what it is]**. Its audience is **[AUDIENCE: who, where, which language]**, on their phones, not designers. You have never seen this reel or its plan. Watch it only through the pack: read `pack.md`, then look at every image it lists, in order (use the Read tool on each). `first3.jpg` is all a scrolling viewer sees before deciding.
>
> **Sound and words:**
> - The reel may have no subtitles. Spoken lines are listed with their times, so you can tell when a viewer with sound on hears them.
> - About half of viewers watch muted. For them, only the words drawn on screen exist.
> - A song may be added in Instagram at upload, so silence in the film may be filled.
>
> **Judge it as four real people, one after another, each in their own voice (2–4 sentences each):**
> 1. **An older parent, 56,** scrolling at 11 pm, sound on, impatient with anything that looks like an ad.
> 2. **A younger family member, 26,** sound off on the metro, quick to send good things to the family group.
> 3. **A stranger** who has never heard of the brand, not in the market, scrolling for fun.
> 4. **A sharp creative director** who has seen ten thousand reels.
>
> For each person, say:
> - at what second they would scroll away, if they do, and why;
> - what they understood the reel to be about;
> - whether they would send it, and to whom.
>
> **Then score each item 1–5 (5 = excellent), with one line of evidence that names a timestamp or a frame:**
>
> | # | Question |
> |---|---|
> | 1 | **Thumb-stop:** does something in the first 1.5 s make you stop? (Look at `first3.jpg`.) |
> | 2 | **The question:** by 3 s, is there a question or tension you want answered? |
> | 3 | **Muted clarity:** with sound off, from the on-screen words and pictures alone, do you understand the story? |
> | 4 | **Pace:** does something new arrive every 2–3 s? Name every stretch over 3 s where nothing changes. |
> | 5 | **Readability:** can every word on screen be read in time, at phone size? Name any word too small, too fast or on a busy background. |
> | 6 | **The turn:** is there one clear moment where the reel changes direction, and does it land? |
> | 7 | **The payoff:** does the ending give more than it promised? Is the product moment clear without being an ad? |
> | 8 | **Look:** does it look premium and consistent, never cheap, cluttered or "template"? |
> | 9 | **Relatability:** would the audience say "this is exactly what happens at our place"? |
> | 10 | **Shareability:** would someone send it to a friend or the family group, or save it? Why, or why not? |
>
> **Then predict:**
> - where the retention graph drops hardest, in seconds;
> - one sentence a viewer might comment.
>
> **Then list fixes:** the top 3, most valuable first. Each fix gives a timestamp, what is wrong, a concrete change, and whether it needs a re-render or only a caption/cover change. Don't suggest adding subtitles if the reel has none on purpose. Don't suggest changing the brand colours.
>
> **Be honest and specific.** Praise only what earns it. If you can't tell something from the frames (motion smoothness, sound quality), say so instead of guessing.

## The report's shape (`reels/<slug>/viewer-judge-vN.md`)

```markdown
# Viewer judge: <slug> vN (<date>)
Film: <path> · <length> · judged from the pack (frames at 1 fps, first 3 s at 5 fps, spoken lines, earshot). An AI forecast, not Insights.

## Verdict
<two sentences: will it stop people, and will they stay>
**Score: NN/50** · Thumb-stop N · Question N · Muted N · Pace N · Readability N · Turn N · Payoff N · Look N · Relatable N · Shareable N

## Four viewers
- **Older parent, 56:** …
- **Younger family member, 26 (muted):** …
- **Stranger:** …
- **Creative director:** …

## Scores with evidence
| # | Item | Score | Evidence (timestamp) |
|---|---|---|---|

## Predicted retention
<where it drops, and why> · Likely comment: "…"

## Top 3 fixes
1. **<t> s:** <problem> → <change> (re-render / caption / cover)
2. …
3. …
```

## Reading the scores

| Score | Meaning |
|---|---|
| **40+ / 50** | Post it. |
| **32–39** | Post, after the top fix if it's cheap. |
| **Below 32, or a 1 or 2 on Thumb-stop or Muted clarity** | Fix before posting: those two decide whether anyone sees the rest. |

After the 48-hour Insights arrive, add one line to the reel's row in your reel log: the judge's predicted drop next to the real one.
