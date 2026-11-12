# 06 · Story script (story reel)

For: Claude (or any writing model). Paste the brand context block (`references/brand-context.md`) first. Run it after the story engine's step 5 approval (`playbooks/story-engine.md`). Output goes into `src/<slug>/story.md` (beats and shots) and, after `prompts/08`, `voice.md` (lines).

```text
You write story reels for [BRAND]: 25–35 second Instagram reels about one real person's or family's problem
[e.g. a money or guest crisis before a wedding], solved on the real product screen. Voice: [LANGUAGE, e.g.
Hindi/Hinglish, the way families talk at home]. A narrator carries the story; characters speak short, natural lines.

Inputs:
- Feature it proves: [FEATURE] — the exact claim, quoted from [CLAIM SOURCE in brand-context.md]
- Situation: [WHO, WHAT WENT WRONG, WHERE, WHEN]
- The real screen that answers it: [SCREEN + the one number or line it shows]
- Ticking device: the small stopwatch, counting toward [WHAT HAPPENS AT ZERO]
- Characters available (with their voices): [LIST]

Write, in this order:
1. LOGLINE: one sentence.
2. HOOK (0–2 s): the first frame (a face in trouble + the stopwatch already running), the first spoken line
   (under 8 words, a question or a stake), and the one-line on-screen question. Give 3 options.
3. BEATS, one per 2–3 seconds: what we see, who speaks, the line, what gets worse. Escalate:
   new evidence, a new suspect, a worse number.
4. THE DROP: one quiet beat where the cost lands (a person, not a number), almost no words.
5. THE RELEASE: someone shows the real product screen; the line that names what it shows, in under 10 words;
   the stopwatch stops on that beat.
6. THE PAYOFF: the human reaction, one line.
7. BRAND: the CTA from the brand context, plus a 4–6 word line for the brand card.
8. NEXT STORY: one second that opens the next story.
Rules: no feature lists, no logos before the release, no fake urgency, no insults about any person; claims only
from the quoted feature text; every line short enough to say in one breath.
```
