# Codex prompt: the designed cover for "{{TITLE}}"

## What the cover is for
The Instagram cover of `reels/{{SLUG}}/{{SLUG}}-vN.mp4`. It shows full size (9:16) when the reel opens, as the **centre 1024×1280 crop** on the profile grid, and small in the feed. One job: say the reel's promise in under a second, in the film's own look. The caption lives in `reels/{{SLUG}}/caption.md` (no Codex needed).

**Codex paints the picture only, with no text.** Claude sets the title in code (`src/{{SLUG}}/cover/cover.html` → `node studio/tools/cover.mjs src/{{SLUG}} --version v1`): a small mono kicker, a small serif line, a big italic keyword in maroon.

## Paste into Codex (opened in your project folder)
```text
Open the project folder. Use IMAGE GENERATION to make ONE new picture: the Instagram cover art for the reel "{{TITLE}}". Portrait 1024×1536. Save it as src/{{SLUG}}/assets/art/cover-art.png and record the prompt, attachments and tries in src/{{SLUG}}/image-generation.json. Don't commit or push.

CONTEXT
<two lines: what your brand is, what this reel says, its look>

ATTACH
<the reel's own art that sets the look; the real product screenshot if a phone appears>

THE PICTURE
<one hero object or moment from the film, on lots of calm space; your brand palette (skills/reel-studio/references/brand-context.md)>

LAYOUT (code sets the title)
- Keep the TOP ~28% calm and plain for the title.
- Everything important inside the centre 1024×1280 (grid crop); nothing important within 128 px of the top or bottom edge.
- Keep the right-hand edge quiet (Instagram's buttons).

NO TEXT: no letters, numbers, logos, watermarks, app interface or religious symbols. Phones only with the attached real screen painted in.

CHECK (up to 3 tries): matches the attached look, the top is calm, no text anywhere. Reply with the file name, the tries and anything that didn't match.
```
