# 03 · Living set: one shot that can blink and change mood

For: the owner in Codex. One base frame per shot, then edits of that exact base. File names: `<shot>-<pose>.png`, `<shot>-<pose>-eyes-closed.png` (and, only if you use lip-sync, `<shot>-<pose>-mouth-open.png`, `<shot>-<pose>-mouth-wide.png`). After saving, run `node studio/tools/check-set.mjs src/<slug>/assets/art/<shot>-<pose>.png`.

Characters speak in balloons by default, so B and C are optional.

## A. The base frame (a new generation)

```text
[STYLE LOCK — prompts/01]
Attach: [character sheet(s)], the style reference.

[CHARACTER] from the attached sheet, identical face, hair and clothes.
Camera: [lens feel, e.g. 50 mm], [height, e.g. seated eye level], [angle, e.g. slight three-quarter from the left],
[framing, e.g. medium close-up, head and shoulders, face in the middle third of the frame].
Action and feeling: [what they're doing], [the one emotion, played small: e.g. jaw set, eyes wet at the rims].
Props that tell the story: [foreground object slightly out of focus], [midground prop in their hands], [background
detail that says time and place].
Light: [motivated source and direction], [colour of the shadows].
Living rules: the mouth and both eyes fully visible and unobstructed (no hand, phone, hair strand, steam or glasses
chain crossing them); the mouth closed and relaxed; eyes open, looking [where]; hands away from the face;
some empty wall, lamp or shadow beside the head for a speech bubble.
```

## B. Mouth open (an edit of A, optional)

```text
Edit the attached image. Keep every pixel identical except the mouth: same face, same head position, same light,
same background, same framing and size.
Change only the lips: slightly parted, about a finger's width, a hint of the upper teeth, as when saying the "a" in
"cat". No other change anywhere.
```

## C. Mouth wide (an edit of A, optional)

```text
Edit the attached image. Keep every pixel identical except the mouth and jaw line.
The mouth open on a long "aa" as in "father": jaw dropped a little, teeth and a little tongue visible, natural, not
cartoonish. No other change anywhere.
```

## D. Eyes closed (an edit of A)

```text
Edit the attached image. Keep every pixel identical except the eyes.
Both eyes gently closed as in a blink: lids fully down, lashes visible, brows unchanged, no squint lines added.
Glasses, if any, stay exactly where they are. No other change anywhere.
```

## E. A second expression (an edit of A), then D again on it

```text
Edit the attached image. Same person, same pose, same framing, same light and background.
Change the expression only: [e.g. relief: brows lift, the corners of the mouth rise, shoulders drop a little,
eyes soft]. Keep hair, clothes, jewellery and hands where they are.
```

Reject an edit when `check-set.mjs` marks it ✗, when the face shifts, or when the region looks pasted on.
