# 05 · Reel cover

Build: Claude sets the title in `src/<slug>/cover/cover.html` and renders it with `node studio/tools/cover.mjs src/<slug> --version v1`. For: the owner in Codex, when a designed cover should beat frame 0 (test it, `references/instagram-system.md`). Attach a reference cover you like (for its layout and light only) and the reel's key character frame. Codex draws the picture; Claude adds the title in code so it is spelled right, unless the owner wants Codex's lettering and checks every letter.

```text
Create a premium 9:16 vertical Instagram Reel cover (1080×1920) from two attachments:
1. REFERENCE COVER: study only its visual language: composition, where the subject sits, the hierarchy, the
   direction and softness of light, colour grade, contrast, depth and mood. Ignore its words, brand and people.
2. OUR CHARACTER: [file], the subject of the cover.

Make a new cover that has the reference's quality and design language but is entirely ours:
- Keep our character exactly as drawn: same face, hair, clothes, expression and pose, same painterly
  graphic-novel finish. Do not redraw them in another style, beautify them or make them photographic.
- Allowed: a clean cutout of the character, a new background, lighting matched to the background, colour grading
  in our palette ([BRAND COLOURS from references/brand-context.md]), soft depth of field, subtle grain.
- Background for the story "[ONE-LINE STORY]": [e.g. a dark dining room at 2 am, one lamp, stacks of receipts].
- Composition: the character's face is the focal point, in the middle third; leave a calm band at
  [top / bottom] for the title "[TITLE, 2–5 words]", and keep everything important inside the profile-grid crop
  (the centre 1080×1350 of the frame).
- [TEXT OPTION A] No text at all; we add the title. [TEXT OPTION B] Set the title "[TITLE]" in a bold editorial
  serif, in the light brand colour with a soft shadow, every letter correct.
The result should look like a professionally designed cover, not an AI image: no plastic skin, no HDR glow,
no extra fingers, no watermark.
```
