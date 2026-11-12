// Hears every voice take back: transcribes it with ElevenLabs speech-to-text (Scribe) and prints what came back next to
// the script, so a word the voice broke or mispronounced shows up before rendering.
//   npm run voice:check -- src/<slug> [--only 06b,07] [--take a]
// A word that comes back different is a word to listen to first, and often to reword in voice.md. Numbers come back as
// digits ("पंद्रह" → 15) and English words in Roman; both are fine. Uses a little speech-to-text allowance per run.
import fs from 'node:fs';
import path from 'node:path';
import { loadEnv, requireKey, args } from './env.mjs';

const a = args(), dir = a._[0] && path.resolve(a._[0]);
if (!dir || !fs.existsSync(path.join(dir, 'voice-generation.json'))) { console.error('Usage: el-check.mjs src/<slug> [--only 01,02] [--take a]  (run voice:make first)'); process.exit(1); }
loadEnv(); const key = requireKey('ELEVENLABS_API_KEY');
const gen = JSON.parse(fs.readFileSync(path.join(dir, 'voice-generation.json'), 'utf8'));
const only = a.only ? String(a.only).split(',') : null, take = a.take || 'a';
const takes = (gen.takes || []).filter(t => t.take === take && (!only || only.includes(t.id)));

// The script as sent, from voice.md rows: | id | speaker | `tagged text` | caption |
const script = {};
for (const line of fs.readFileSync(path.join(dir, 'voice.md'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\|\s*([\w-]+)\s*\|\s*[\w-]+\s*\|\s*`([^`]+)`/);
  if (m) script[m[1]] = m[2].replace(/\[[^\]]*\]\s*/g, '').trim();
}

for (const t of takes) {
  const fd = new FormData(); fd.append('model_id', 'scribe_v1'); fd.append('file', new Blob([fs.readFileSync(path.join(dir, t.file))]), path.basename(t.file));
  const r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': key }, body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { console.error(`${t.id}: speech-to-text failed (${r.status}) ${(j.detail && (j.detail.message || j.detail.status)) || ''}`); process.exitCode = 1; continue; }
  console.log(`${t.id.padEnd(4)} heard: ${j.text}`);
  if (script[t.id]) console.log(`     sent:  ${script[t.id]}`);
}
console.log('Compare each pair. Listen to any line that differs, and reword a word the voice keeps getting wrong.');
