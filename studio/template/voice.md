# Voice script: {{TITLE}}

One row per spoken line. `el-voice.mjs` sends the backticked text to ElevenLabs exactly as written, so format it with
the Hindi formatter prompt first (`skills/reel-studio/prompts/08-elevenlabs-hindi-formatter.md`):
Hindi in Devanagari, English words in Roman, one or two [audio tags] per sentence, pauses as "…" not tags.
The caption column is what appears on screen, word by word (Roman Hinglish reads fastest on Instagram). Leave it
empty to show the spoken words.

| id | speaker | line sent to the voice | caption on screen |
|---|---|---|---|
| 01 | narrator | `[serious] केस नंबर चार… [slowly for emphasis] रात के दो बज रहे हैं।` | Case number four… raat ke do baj rahe hain. |
| 02 | papa | `[tired] [softly] बस… एक पन्ना और।` | Bas… ek panna aur. |

Speakers must match the keys in `cast.json`. Keep each line under 250 characters; split long ones.
