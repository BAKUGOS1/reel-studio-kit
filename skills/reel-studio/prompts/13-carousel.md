# 13 · Editorial carousel (Codex image generation or HTML)

For: the owner in Codex (route A), or Claude in code (route B). A 5–7 slide Instagram carousel at the level of the best editorial, cinematic carousel accounts: one big idea per slide. Never copy their pictures, people or words.

**Before either route:** Claude writes the 5–7 slide story with the story engine arc (`playbooks/story-engine.md`): hook, rising pain, the truth, then the product. Product claims come only from the claim source in `references/brand-context.md`. Every format ends on the real product screen and the CTA.

## Route B: HTML (Claude, fastest, every word exact)

Build `src/<slug>/carousel.html` with one `<section class="slide">` per slide, Codex art as backgrounds, all words set in code. Render with `node studio/tools/carousel.mjs src/<slug> --version v1` → `campaigns/<slug>/v1/` (1080×1350 PNGs and a contact sheet). Read every word at full size before the owner sees it.

## Route A: Codex image generation, finished by Claude

**After Codex:**
1. Claude runs `node studio/tools/find-screens.mjs` on every slide with a grey phone.
2. Claude puts the real screens on the phones: best, a Codex image edit that paints the real capture into the phone (rounded corners, perspective, warm room light, a glass reflection, grain); fallback, `node studio/tools/bake-screens.mjs`.
3. Claude crops each slide to 4:5 (1080×1350) and adds the logo in code.
4. Claude reads every word at full size before the owner sees it.

**Phone screens: make them look photographed.** A flat mapped screenshot looks pasted on. When Codex edits a screen in:
1. Read every word on the edited screen against the capture.
2. Take only the phone from the edit. Codex's edit also shifts colours and redraws lettering elsewhere, so everything else stays from the checked original.
3. If the edit changed any word on the screen, bake the capture instead.

```text
Open the project folder. Use IMAGE GENERATION (not HTML or code) to make [N] slides for a [BRAND] Instagram carousel titled "[TITLE]". The level we want is a top editorial carousel: cinematic, premium, one big idea per slide. Don't copy anyone's pictures, people or words. [If a reference set exists: match the reference set in campaigns/<earlier-slug>/<folder>/ (open it first).]

STYLE LOCK (paste at the top of every slide prompt)
Premium editorial Instagram carousel slide in the style of a high-end magazine.
- Photoreal cinematic still-life photography: directional window or lamp light, deep shadows, photographic depth, shallow depth of field, gentle film grain. Vary the camera angle and composition from slide to slide; one clear visual idea per slide.
- Set in [SETTING, e.g. a tasteful contemporary Indian middle-class home].
- Palette: [BRAND COLOURS from brand-context.md: paper colour, one strong accent #______, natural materials], soft shadows. No neon, no plastic look.
- Typography set into the design:
  - Headlines in a tall, condensed, high-contrast upright serif, with ONE word per headline in a flowing italic with swashes for emphasis.
  - A clean, readable sans-serif for everything else.
  - Light headlines on dark areas.
- Search phrases and lists sit on physical torn paper slips or cards inside the photograph. A late-night slide may use a panel in the accent colour with light text.
- Write EXACTLY the words given for this slide, spelled exactly, and nothing else anywhere: no extra words, letters, numbers, logos, watermarks or brand names.
- Keep all text and key objects inside the middle 1024×1280 area of the 1024×1536 portrait canvas; the top and bottom 128 px will be cropped. Leave at least 60 px of space above the headline.
- Leave the bottom-left corner (220×90 px, inside the safe area) calm and empty for the logo, which is added later.
- No real or famous person's likeness. No other app's logo or colours.
- Any phone that should show the product has a PERFECTLY FLAT PLAIN MID-GREY screen, with fingers clear of it (real screens are added later).

SLIDES (portrait 1024×1536 each)
[For each slide: the file name, the scene (objects, light, angle), and the exact words: headline, any search card or list rows, tags, line, pills, button.]

QUALITY CHECK (do this for every slide)
- Zoom into every word. If ANY letter is wrong, missing or extra, regenerate that slide (up to 3 tries) or edit just that word.
- Same style lock and the same light family across all slides, so it reads as one series.

OUTPUT
- Save to campaigns/[SLUG]/codex-img-v1/ with the file names given.
- Write campaigns/[SLUG]/codex-img-v1/NOTES.md with each slide's final prompt, the number of tries, and any word you couldn't get right.
- Don't add logos or app screens yourself, and don't modify other folders. Don't commit or push.
```

**Formats that suit this look** (one per carousel):
- search history;
- receipt ("What we paid for / what it actually cost");
- "if [things in your world] could talk";
- a definition card ("[word] (noun)");
- a starter pack;
- terms and conditions;
- a numbers card ("₹1,101. No name.").

Every format ends on the real product screen and the CTA.
