# Voices with ElevenLabs (Hindi, Hinglish and English)

Voices come from ElevenLabs: **a narrator plus a separate voice per character**, generated through the API with the key in `.env`. For drafts and timing, the free Edge voices (`studio/tools/edge-voice.mjs`) write the same files.

## Model and settings

- **Model:** `eleven_v3` (default): expressive, understands inline [audio tags], Hindi supported, up to 5,000 characters a request. Newer models may take only `stability` and `similarity_boost`; A/B one line with `--model <id>` before switching a whole reel.
- **Stability:** about 0.35–0.45 for drama (more feeling, more variation between takes); 0.5–0.6 for the narrator's steady lines. **Similarity boost:** 0.75–0.85.
- **language:** leave it out for Hinglish lines (the model reads English words as English); set `"language": "hi"` on a voice only when it mispronounces pure Hindi lines.
- **Takes:** 2 per line (`takes` in `cast.json`), different seeds. The owner listens and picks; picks go in `timeline.json`.
- **Pauses:** "…" and commas, not tags. SSML `<break>` is not supported on v3 (check the text-to-speech skill for the current rules).
- **English narrator:** a warm premade voice on `eleven_v3` works on the free plan for tests.

## Writing the line (what `voice.md` sends)

Run `prompts/08-elevenlabs-hindi-formatter.md` on the raw script. Its rules:
- Hindi words in **Devanagari** (मैंने, बताऊँगा, चाहिए), and so are the English words families say inside Hindi (व्हाट्सऐप, एंट्री, चेक, सेव, फ़्री, ऐप): switching script mid-sentence makes the voice break and mispronounce. Roman only for a whole English sentence on its own, like the CTA.
- **One or two tags per sentence, before the words they colour:** `[whispers]`, `[tired]`, `[softly]`, `[serious]`, `[nervous]`, `[rushed]`, `[slowly for emphasis]`, `[sighs]`, `[gulps]`, `[laughs]`, `[relieved]`, `[warmly]`, `[annoyed]`, `[sarcastic]`, `[excited]`. Tags work best when the voice can already do that delivery: cast for it.
- **The energy follows the story engine, not a creator vlog:** tense hook → rising pressure → the quiet drop (soft, slow) → release (relieved, warm) → brand line calm and confident. Tempo changes are deliberate: `[rushed]` for panic, `[slowly for emphasis]` for the line that lands.
- **The brand name:** if the voice can't say it cleanly (test it with `voice:check`), no line speaks it; the end card shows it. Otherwise spell it the way it is said (see `brand-context.md`).
- Keep each row under about 250 characters. A character's line is short and natural, like they'd say it at home; the narrator carries the story's voice.
- Avoid words the voice can't say cleanly; reword instead.

## What the free plan allows (check the current terms)

- **Works on free:** the standard ("premade") voices through the API, Eleven v3 speaking Hindi through them (English-accented), forced alignment, searching the Voice Library and adding library voices to the account.
- **Paid only:** *using* a Voice Library voice through the API (402 `paid_plan_required`) and Voice Design through the API.
- **Licence:** free output is for non-commercial use with attribution; marketing reels need a paid plan, generated while subscribed. Check elevenlabs.io/pricing. Using free voices in posted work is the owner's call and the owner's risk.

## Casting

```
npm run voice:find -- search --lang hi --gender female --age middle_aged --q "warm mother"
npm run voice:find -- search --lang hi --gender male --age old --use narrative_story
npm run voice:find -- add <public_owner_id> <voice_id> --name "Mummy"
npm run voice:find -- mine
```
Listen to every preview URL first. Prefer voices recorded in the target language. Give each character a clearly different voice (age, pitch, pace), and keep the same voice for the same character across the series: once cast, record the `voice_id` in `brand-context.md` ("Voices cast so far").

## Cost

`npm run voice:make -- src/<slug> --dry-run` prints the characters to be spent (about one credit per character on v3, times the takes). `npm run voice:find -- credits` shows what's left this month. Ask before spending a large share of the month's credits.

## Timing for captions and cuts

`el-voice.mjs` trims outer silence and runs ElevenLabs **forced alignment** on each take (the spoken text with the tags removed), so every word has a start and end. `mix.mjs` turns those into word-by-word captions (the Roman caption column is spread over the spoken words) and the cue times the scene reads. Check the first reel's timings closely.

## Listening

Machine checks can't hear a bad take. `npm run voice:check -- src/<slug>` catches broken words; before posting, the owner plays the reel with sound on. Note in the reel README which takes were chosen and that listening was done.
