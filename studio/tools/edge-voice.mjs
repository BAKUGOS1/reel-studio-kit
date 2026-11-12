// Generates a reel's voice lines with Microsoft Edge's neural voices (free, no key) and writes the same files as
// el-voice.mjs, so mix.mjs and the captions work unchanged:
//   node studio/tools/edge-voice.mjs src/<reel> [--only 03,07] [--force] [--dry-run]
// Reads voice.md (| id | speaker | `text` | caption |) and cast.json → "edge": { "<speaker>": { "voice": "hi-IN-SwaraNeural",
// "rate": "+0%", "pitch": "+0Hz" } }. Writes vo/<id>-a.wav (as cast) and vo/<id>-b.wav (a touch warmer: −4% rate,
// +4 Hz pitch), each 48 kHz mono with the outer silence trimmed, plus <id>-<take>.align.json with Edge's own word
// timings (no forced alignment needed). Audio tags in [brackets] are dropped: Edge has no acting control.
// Why: the ElevenLabs free plan only offers American-English premade voices, which made Hindi sound
// foreign; Edge's hi-IN voices are native Hindi (Swara, Madhur; Madhur says "फेरे" correctly).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { args, ROOT } from './env.mjs';

const require = createRequire(import.meta.url);
const ffmpeg = require('ffmpeg-static');
const a = args(), reel = path.resolve(ROOT, a._[0] || '');
if (!a._[0] || !fs.existsSync(path.join(reel, 'voice.md'))) { console.error('Usage: edge-voice.mjs src/<reel> [--only 01,02] [--force] [--dry-run]'); process.exit(1); }
const cast = JSON.parse(fs.readFileSync(path.join(reel, 'cast.json'), 'utf8')).edge || {};
const lines = fs.readFileSync(path.join(reel, 'voice.md'), 'utf8').split('\n')
  .map(l => l.match(/^\|\s*([\w-]+)\s*\|\s*([\w-]+)\s*\|\s*`([^`]+)`\s*\|\s*([^|]*)\|?/)).filter(Boolean)
  .map(m => ({ id: m[1], speaker: m[2], text: m[3], spoken: m[3].replace(/\[[^\]]*\]\s*/g, '').trim(), caption: m[4].trim() || null }));
const only = a.only ? String(a.only).split(',') : null;
const todo = lines.filter(l => !only || only.includes(l.id));
for (const l of todo) if (!cast[l.speaker]?.voice) { console.error(`cast.json has no "edge" voice for speaker "${l.speaker}" (line ${l.id})`); process.exit(1); }
if (a['dry-run']) { for (const l of todo) console.log(`${l.id} ${l.speaker.padEnd(10)} ${cast[l.speaker].voice}  ${l.spoken}`); console.log('Dry run: nothing generated. Edge is free and needs no key.'); process.exit(0); }

const { EdgeTTS } = require('@andresaya/edge-tts');
const voDir = path.join(reel, 'vo'); fs.mkdirSync(voDir, { recursive: true });
const ledgerPath = path.join(reel, 'voice-generation.json');
const ledger = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) : { takes: [] };
ledger.takes ||= [];
const run = argv => { const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...argv], { encoding: 'utf8' }); if (r.status) throw new Error(r.stderr); };
const TAKES = { a: { rate: 0, pitch: 0 }, b: { rate: -4, pitch: 4 } };
const tts = new EdgeTTS();
for (const l of todo) {
  for (const [take, d] of Object.entries(TAKES)) {
    const wav = path.join(voDir, `${l.id}-${take}.wav`), alignFile = wav.replace(/\.wav$/, '.align.json');
    if (fs.existsSync(wav) && !a.force) { console.log(`skip ${l.id}-${take} (exists; --force to remake)`); continue; }
    const v = cast[l.speaker], rate = (parseFloat(v.rate) || 0) + d.rate, pitch = (parseFloat(v.pitch) || 0) + d.pitch;
    const settings = { rate: `${rate >= 0 ? '+' : ''}${rate}%`, pitch: `${pitch >= 0 ? '+' : ''}${pitch}Hz`, volume: '+0%', outputFormat: 'audio-24khz-96kbitrate-mono-mp3' };
    const r = await tts.generate(l.spoken, v.voice, settings);
    if (!r.audio?.length || !r.wordBoundaries?.length) throw new Error(`No speech for ${l.id}-${take}`);
    const words = r.wordBoundaries.filter(w => w.type === 'WordBoundary').map(w => ({ text: w.text, start: w.offset / 1e7, end: (w.offset + w.duration) / 1e7 }));
    // Trim to 60 ms before the first word and 150 ms after the last, and move the word times with the cut.
    const from = Math.max(0, words[0].start - 0.06), to = words.at(-1).end + 0.15;
    const mp3 = path.join(voDir, `${l.id}-${take}.edge.mp3`); fs.writeFileSync(mp3, r.audio);
    run(['-ss', from.toFixed(3), '-i', mp3, '-t', (to - from).toFixed(3), '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
    fs.rmSync(mp3);
    const shifted = words.map(w => ({ text: w.text, start: +(w.start - from).toFixed(3), end: +(w.end - from).toFixed(3) }));
    fs.writeFileSync(alignFile, JSON.stringify({ id: l.id, take, speaker: l.speaker, text: l.text, spoken: l.spoken, caption: l.caption, words: shifted }, null, 1) + '\n');
    const entry = { file: path.relative(reel, wav).replaceAll('\\', '/'), provider: 'Microsoft Edge neural TTS via @andresaya/edge-tts', voice: v.voice, settings, text: l.spoken, madeAt: new Date().toISOString() };
    const i = ledger.takes.findIndex(t => t.file === entry.file); if (i >= 0) ledger.takes[i] = entry; else ledger.takes.push(entry);
    console.log(`saved ${l.id}-${take}  ${v.voice} ${settings.rate} ${settings.pitch}  ${shifted.length} words, ${(to - from).toFixed(2)} s`);
  }
}
fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n');
console.log('Done. Check every take: npm run voice:check -- ' + path.relative(ROOT, reel).replaceAll('\\', '/'));
