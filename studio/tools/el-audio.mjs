// Sound effects and music from ElevenLabs, saved as WAV into a reel's assets.
//   node studio/tools/el-audio.mjs sfx src/<reel> tick "single mechanical stopwatch tick, close, dry" --seconds 0.6
//   node studio/tools/el-audio.mjs music src/<reel> bed "tense minimal tabla pulse, 92 bpm, building, no vocals" --seconds 36
// Output: src/<reel>/assets/sfx/<name>.wav or assets/music/<name>.wav, logged in audio-generation.json.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { args, requireKey, ROOT } from './env.mjs';

const ffmpeg = createRequire(import.meta.url)('ffmpeg-static');
const a = args();
const [kind, reelArg, name, prompt] = a._;
if (!['sfx', 'music'].includes(kind) || !reelArg || !name || !prompt) { console.error('Usage: el-audio.mjs sfx|music src/<reel> <name> "<prompt>" [--seconds N]'); process.exit(1); }
const key = requireKey();
const reel = path.resolve(ROOT, reelArg), dir = path.join(reel, 'assets', kind === 'sfx' ? 'sfx' : 'music');
fs.mkdirSync(dir, { recursive: true });
const seconds = Number(a.seconds || (kind === 'sfx' ? 2 : 30));
const req = kind === 'sfx'
  ? { url: '/v1/sound-generation', body: { text: prompt, duration_seconds: seconds, prompt_influence: Number(a.influence || 0.5), model_id: 'eleven_text_to_sound_v2' } }
  : { url: '/v1/music', body: { prompt, music_length_ms: Math.round(seconds * 1000), model_id: a.model || 'music_v2_5', force_instrumental: true } };
const res = await fetch(`https://api.elevenlabs.io${req.url}?output_format=mp3_44100_128`, { method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify(req.body) });
if (!res.ok) { console.error(`${res.status}: ${(await res.text()).slice(0, 300)}`); process.exit(1); }
const mp3 = path.join(dir, name + '.mp3'), wav = path.join(dir, name + '.wav');
fs.writeFileSync(mp3, Buffer.from(await res.arrayBuffer()));
const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', mp3, '-ar', '48000', '-c:a', 'pcm_s16le', wav], { encoding: 'utf8' });
if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
fs.rmSync(mp3);
const logPath = path.join(reel, 'audio-generation.json'), log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : [];
log.push({ file: path.relative(reel, wav).replaceAll('\\', '/'), kind, prompt, seconds, requestId: res.headers.get('request-id'), generatedAt: new Date().toISOString() });
fs.writeFileSync(logPath, JSON.stringify(log, null, 2) + '\n');
console.log('saved', path.relative(ROOT, wav));
