# SFX library

Every sound effect the studio edits with, filed by what it does in an edit. **Open [index.html](index.html) in a browser to audition**: search box, a play button per sound, "copy path".

```
studio/sfx/<category>/<source>-<name>.<ext>
```

| Command | What it does |
|---|---|
| `node studio/tools/sfx-library.mjs find whoosh fast` | Search by name, category or tag |
| `node studio/tools/sfx-library.mjs catalog` | Re-measure everything → `catalog.json` + `index.html` (after adding files) |
| `node studio/tools/sfx-library.mjs fetch` | On a new machine: download the Mixkit files listed listed in `sources.json` |
| `node studio/tools/sfx-synth.mjs` | Rebuild our own sounds (`own-*`) |
| `node studio/tools/sfx-library.mjs openverse "indian wedding dhol" --cat wedding [--pick 0,2] [--from 30] [--max 12] [--dry]` | Add CC0 recordings from Openverse (no key); creator and page go in `sources.json` |

In a reel's `timeline.json`, point an effect at the library directly: `{ "file": "../../studio/sfx/whoosh/own-whoosh-fast.wav", "at": 2.1, "gain": -10 }`.

## Sources and licences

| Prefix | Source | Licence | In git? |
|---|---|---|---|
| `own-` | Synthesized by `studio/tools/sfx-synth.mjs` | Ours, free to use | Yes |
| `kenney-` | kenney.nl audio packs (Interface, UI, Impact, Casino, RPG, Digital, Sci-fi) | CC0, no attribution | Yes |
| `mixkit-` | Hand-picked from mixkit.co | Mixkit Sound Effects Free License: commercial use in videos, no attribution; never redistribute the files on their own | No (git-ignored; `fetch` restores) |
| `openverse-` | CC0 recordings found through Openverse (mostly Freesound): real dhol, shehnai, tabla, harmonium, cash registers, coins, crowds, page turns, a pressure cooker | CC0, no attribution (creator recorded anyway) | Yes |

Music is not in here. Posted reels take music from Instagram's own library at upload, or an original bed made in code. Never put a downloaded song in a reel.

## Categories

`whoosh` transitions and swipes · `riser` builds and reverse swells (end dead on the cut) · `impact` hits, thuds, booms · `cinematic` trailer hits and textures · `glitch` digital breaks, tape stop · `ui` clicks, ticks, toggles · `pop` caption and card pops · `tone` dings, chimes, error · `digital` game blips · `phone` buzz and rings · `money` coins, ka-ching, note counter · `paper` page turns, cards, crumple, pen · `typing` keyboard and typewriter · `camera` shutters · `clock` ticks, alarms · `crowd` laughs, applause, chatter · `comedy` drum rolls, joke stings · `heartbeat` · `wedding` dhol, manjira, ghungroo (own + CC0) · `foley` steps, cloth, doors.

## How the pros use them

1. **Few, meaningful hits.** One impact per act (title, turn, payoff), not on every cut. A whoosh only when something moves.
2. **Riser → hard cut.** A riser ends exactly on the cut frame; the hit lands on that frame. Never let a riser fade out.
3. **Silence is a sound.** Cut the music for 0.5–3 s on the turn or the punchline, and under the end logo.
4. **On-screen sounds beat stock SFX.** If a phone buzzes on screen, use the buzz; if a page turns, the page.
5. **Levels under a voice:** whooshes −14 to −10 dB, impacts −8 to −4 dB, UI clicks −18 to −14 dB, ambience −26 to −20 dB. Without a voice, raise each about 4 dB. The mix tool masters the total to −14 LUFS.
6. **Pan movement.** Whooshes travel left to right with the motion on screen; UI and dialogue stay centre.

## Listening with earshot

earshot (github.com/Leonxlnx/earshot, MIT) lets an agent check sounds it cannot hear. Install it with uv (`uv tool install earshot`); its models are cached in `~/.cache/earshot`. Set it to offline with `EARSHOT_OFFLINE=1`.
- `earshot timeline <film.mp4> --video <film.mp4>`: every sound event against the picture cuts, and the cuts with no hit.
- `earshot match <file> "dhol hit"`: does this file sound like that description.
- `earshot find <long-recording> "dhol groove"`: the best trim inside a long file (use it with the Openverse recordings).
- `earshot realness <file>`: a real recording, or synthesized.
- `earshot critique`: a scorecard against reference films.
- **Never** run `earshot llm`: it uploads audio to Gemini.
- **Mono vs stereo:** earshot reads our mono reels about 3 LU louder than ffmpeg does, because a mono file plays on both speakers. Reels should be mixed in stereo (`"channels": 2` in the mix settings).
