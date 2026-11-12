// Generates every voice line of a reel with ElevenLabs, then aligns it word by word for captions and lip-sync.
//   node studio/tools/el-voice.mjs src/<reel> --dry-run          plan, character count, no key needed
//   node studio/tools/el-voice.mjs src/<reel> [--takes 2] [--only 03,07] [--force] [--model eleven_v4]
// Reads src/<reel>/voice.md (the tagged script) and src/<reel>/cast.json (who speaks with which voice).
// Writes src/<reel>/vo/<id>-<take>.wav (48 kHz mono, outer silence trimmed), <id>-<take>.align.json,
// and a provenance ledger src/<reel>/voice-generation.json. Finished takes are skipped unless --force.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { args, loadEnv, requireKey, ROOT } from './env.mjs';

const require = createRequire(import.meta.url);
const ffmpeg = require('ffmpeg-static');
const API = 'https://api.elevenlabs.io';
const a = args();
const reel = path.resolve(ROOT, a._[0] || '');
if (!a._[0] || !fs.existsSync(path.join(reel, 'voice.md'))) { console.error('Usage: el-voice.mjs src/<reel> [--dry-run]. The folder needs voice.md and cast.json.'); process.exit(1); }

// voice.md rows: | id | speaker | `tagged text sent to the voice` | caption shown on screen (optional) |
function parseScript(md) {
  const rows = [];
  for (const line of md.split(/\r?\n/)) {
    const m = line.match(/^\|\s*([\w-]+)\s*\|\s*([\w-]+)\s*\|\s*`([^`]+)`\s*\|\s*([^|]*)\|?/);
    if (m) rows.push({ id: m[1], speaker: m[2], text: m[3].trim(), caption: m[4].trim() || null });
  }
  return rows;
}
// What the listener hears, without [audio tags]: used for alignment and the default caption.
const spoken = text => text.replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();

const lines = parseScript(fs.readFileSync(path.join(reel, 'voice.md'), 'utf8'));
// --cast picks another cast file, e.g. a free-plan draft cast with standard voices (cast-draft.json).
const cast = JSON.parse(fs.readFileSync(path.join(reel, a.cast || 'cast.json'), 'utf8'));
const only = a.only ? new Set(String(a.only).split(',')) : null;
const todo = lines.filter(l => !only || only.has(l.id));
const takes = Number(a.takes || cast.takes || 2);
loadEnv();
const model = a.model || cast.model || process.env.ELEVENLABS_MODEL || 'eleven_v3';

for (const l of todo) if (!cast.voices?.[l.speaker]) { console.error(`Line ${l.id}: speaker "${l.speaker}" has no voice in cast.json`); process.exit(1); }
const chars = todo.reduce((s, l) => s + l.text.length, 0) * takes;
console.log(`${todo.length} lines × ${takes} takes, ${chars} characters, model ${model}.`);
if (a['dry-run']) {
  for (const l of todo) console.log(`  ${l.id} ${l.speaker.padEnd(10)} ${l.text.length.toString().padStart(4)} ch  ${spoken(l.text)}`);
  console.log('Dry run: nothing generated. Credits are roughly one per character on Eleven v3 (check your plan).');
  process.exit(0);
}

const key = requireKey();
const out = path.join(reel, 'vo');
fs.mkdirSync(out, { recursive: true });
const ledgerPath = path.join(reel, 'voice-generation.json');
const ledger = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, 'utf8')) : { provider: 'ElevenLabs REST API', script: 'voice.md', cast: 'cast.json', takes: [] };
const save = () => fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n');
const run = argv => { const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...argv], { encoding: 'utf8' }); if (r.status !== 0) throw new Error(r.stderr); };

async function tts(l, take, seed) {
  const v = cast.voices[l.speaker];
  const body = { text: l.text, model_id: v.model || model, seed, voice_settings: { stability: 0.5, similarity_boost: 0.75, ...(v.settings || {}) } };
  if (v.language) body.language_code = v.language;
  const res = await fetch(`${API}/v1/text-to-speech/${v.voice_id}?output_format=mp3_44100_128`, { method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`TTS ${l.id}: ${res.status} ${(await res.text()).slice(0, 300)}`);
  return { audio: Buffer.from(await res.arrayBuffer()), requestId: res.headers.get('request-id'), characters: Number(res.headers.get('x-character-count')) || l.text.length, body };
}

// Forced alignment gives word timings for any language, so captions and mouths follow the real take.
async function align(file, text) {
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(file)], { type: 'audio/wav' }), path.basename(file));
  form.append('text', text);
  const res = await fetch(`${API}/v1/forced-alignment`, { method: 'POST', headers: { 'xi-api-key': key }, body: form });
  if (!res.ok) throw new Error(`Alignment ${path.basename(file)}: ${res.status} ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  // The API returns the spaces between words as entries of their own; captions need only the words.
  return { words: (j.words || []).filter(w => w.text.trim()).map(w => ({ text: w.text.trim(), start: +w.start.toFixed(3), end: +w.end.toFixed(3) })), loss: j.loss };
}

for (const l of todo) {
  for (let k = 0; k < takes; k++) {
    const take = 'abcdefgh'[k], name = `${l.id}-${take}`, wav = path.join(out, name + '.wav');
    if (fs.existsSync(wav) && !a.force) { console.log(`skip ${name} (exists)`); continue; }
    const seed = 1000 + Number.parseInt(l.id.replace(/\D/g, '') || '0', 10) * 10 + k;
    const r = await tts(l, take, seed);
    const mp3 = path.join(out, name + '.mp3');
    fs.writeFileSync(mp3, r.audio);
    const trim = 'silenceremove=start_periods=1:start_duration=0.02:start_threshold=-55dB:start_silence=0.06:detection=peak';
    // Inside the line, pauses longer than cast.tighten seconds (default 0.3) shrink to about that, before alignment,
    // so the takes keep their rhythm without dead air. "tighten": false keeps the take as delivered.
    const tight = cast.tighten === false ? '' : `,silenceremove=stop_periods=-1:stop_duration=${cast.tighten ?? 0.3}:stop_threshold=-42dB:stop_silence=${((cast.tighten ?? 0.3) * 0.8).toFixed(2)}:detection=rms`;
    run(['-i', mp3, '-af', `${trim},areverse,${trim.replace('0.06', '0.14')},areverse${tight}`, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
    fs.rmSync(mp3);
    const al = await align(wav, spoken(l.text));
    fs.writeFileSync(path.join(out, name + '.align.json'), JSON.stringify({ id: l.id, take, speaker: l.speaker, text: l.text, spoken: spoken(l.text), caption: l.caption, ...al }, null, 1) + '\n');
    ledger.takes = ledger.takes.filter(t => t.file !== `vo/${name}.wav`);
    ledger.takes.push({ file: `vo/${name}.wav`, id: l.id, take, speaker: l.speaker, voice_id: cast.voices[l.speaker].voice_id, model: r.body.model_id, seed, settings: r.body.voice_settings, language: r.body.language_code || 'auto', characters: r.characters, requestId: r.requestId, generatedAt: new Date().toISOString(), listeningReview: 'pending' });
    save();
    console.log(`saved ${name}  (${al.words.length} words aligned)`);
  }
}
console.log('Done. Listen to every take before choosing; record picks in timeline.json.');
