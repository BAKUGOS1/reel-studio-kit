# Codex guide: art that looks expensive and moves

The owner makes every picture with Codex's built-in image generation. Claude writes the prompts and checks the results. This guide is for both: the owner running Codex, and Codex itself when it reads this skill.

## How to run a Codex session

1. **Open Codex in the project folder**, so it reads the project's `AGENTS.md` and this skill and can save files with exact names into `src/<slug>/assets/art/`.
2. **Paste one prompt at a time** from `src/<slug>/codex-prompts.md`, in the given order. Each prompt starts with the **style lock** (`prompts/01-style-lock.md`), so every image shares the finish.
3. **Attach the references the prompt names**, every time: the character sheet, the style reference, and for an edit, the image being edited. Codex keeps faces consistent when it sees them; it drifts when it only reads words.
4. **Ask Codex to record provenance:** prompt, attached references and the output file in `src/<slug>/image-generation.json`.
5. **Then ask Codex to check its own set:** `node studio/tools/check-set.mjs src/<slug>/assets/art/<base>.png` compares a living set and flags any edit that changed more than its region.

## Order matters

1. **Style lock**, then **character sheets** (one per new person, with explicit contrasts so two people can't merge: different height, build, hairline, facial hair, glasses).
2. **Base frames:** one per shot, with the character in the planned framing.
3. **Living sets:** *edits* of each base (eyes closed, and any second expression). Never fresh generations: a new generation moves everything. Mouth edits aren't needed: characters speak in balloons, not with moving lips.
4. **Plates and props:** empty backgrounds for parallax shots, transparent props (a notepad, a diary, a phone with a grey screen).
5. **Cover art**, last, when the story is final.

## The anatomy of a prompt that works

```
[STYLE LOCK]   painterly graphic-novel finish, the palette, the light, the "no text" rules
[CAST LOCK]    who is in frame, matching the attached character sheet exactly
[SHOT]         camera (lens feel, height, angle), framing, the subject's action and expression,
               what the light is doing and why, foreground/midground/background objects that tell the story
[LIVING RULES] face in the middle third, eyes unobstructed, hands away from the face,
               calm top 168 px, no faces under the right-hand rail
[CHECK]        what makes this image a reject
```

## What makes Codex art look impressive, not generic

- **Name the cinematography:** "35 mm lens feel, camera at seated eye height, slight three-quarter angle, shallow depth of field, the lamp as the only warm source, cool window light from the left". Vague words ("cinematic, beautiful") give average pictures.
- **One emotion, played small:** "eyes red at the rims, jaw set, trying not to cry" beats "sad". Micro-expressions animate better too.
- **Props tell the story:** the diary held together with a rubber band, a stack of receipts, a cold chai cup with a skin on it. Each prop should answer "what has been happening here?".
- **Depth in three layers:** a foreground object slightly out of focus, the character in the middle, the room behind. It gives the camera something to push past.
- **Motivated light and time:** pick the hour (2 am, golden afternoon) and keep it for the whole reel. Name where the light comes from.
- **Local specificity without stereotype:** real homes for your audience (for an Indian family: steel glasses, a calendar from the local jeweller, a TV under a lace cover), real clothes for the age and the occasion. No deities, ritual symbols or flags as decoration.
- **A colour story per beat:** warm and safe at the start, desaturated in the fear beat, warm again at the release. Codex follows this if each prompt says it.

## Living-set rules (why the motion looks real)

- **Same picture, one change.** Each edit prompt says: "Edit the attached image. Keep every pixel identical except the eyes" (or the expression). Reject edits that move hair, jewellery, background or framing.
- **Eyes closed** = lids fully down, lashes visible, brows unchanged. A second expression (shocked, relieved) is a full-face edit with its own eyes-closed edit.
- **Keep the face clear:** no hand, phone, hair strand, glasses chain or steam crossing the eyes. Glasses are fine if the eyes behind them are visible.
- **Face in the middle third**, three-quarter or frontal, with some empty wall, lamp or shadow beside the head for a speech bubble.
- **Phone screens flat mid-grey and unobstructed**, so the real screen can be mapped on, or attach the real capture and have Codex paint it in. Prefer phones facing the camera; a phone lying flat works too.
- **Size:** portrait 1024×1536 (the film crops to 9:16; keep faces and key props inside the middle 80% of the width). Landscape close-ups are fine for eyes-only shots.
- **Transparent cutouts** (PNG with real alpha) only when a shot needs parallax: the character alone on transparency, and the plate generated empty with the same light. Otherwise use full frames: they never misregister.

## Rejects

Regenerate or re-edit when: there is any lettering, number, logo or app interface; a face differs from its sheet; an edit changed more than its region; there are extra or merged fingers; a pure-black shadow (the darkest tone is a warm near-black, about #1E1A16); the face is under the top 168 px or the right rail; a phone screen that should be mapped isn't flat mid-grey.

## What Claude does with the art

Measures each living set's eye regions (`living-illustration.md`), builds the rig, and checks it on a draft render. Words, numbers, bubbles, the stopwatch and the product screen are all drawn or captured in code, never asked of Codex.
