# Codex image prompts: {{TITLE}}

For you to run in Codex (or any image model), opened in your project folder. Save every result to `src/{{SLUG}}/assets/art/`
with the exact file name given, and ask Codex to record each prompt and its attachments in
`src/{{SLUG}}/image-generation.json`. Guide: `skills/reel-studio/references/codex-guide.md`.

## Order
1. Character sheets for anyone new (prompts/02).
2. One base frame per shot (prompts/03 A).
3. That shot's edits: mouth open, mouth wide, eyes closed, any second expression (prompts/03 B–E).
   Then: `node studio/tools/check-set.mjs src/{{SLUG}}/assets/art/<shot>-<pose>.png`
4. Plates, cutouts and props (prompts/04).

## Attach to every prompt with a person in it
- the series character sheets: your character sheet, e.g. `src/<series>/assets/00-character-sheet.png` (and any new sheet below)
- the style reference: one finished picture from the same series, e.g. `src/<series>/assets/01-hook.png`

## Style lock (paste first)
<!-- Paste prompts/01-style-lock.md here with this reel's [LIGHT] line. -->

## Shots
<!-- One section per shot: file names, then the base prompt (03 A) and its edits (03 B–E). -->
